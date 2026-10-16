# Go（Golang）安全规范（Go 1.25.x、标准库、net/http）

本文档是一份**安全规范**，用于支持：
1) 为新 Go 代码进行**默认安全的代码生成**。
2) 对既有 Go 代码进行**安全审查 / 漏洞挖掘**（被动式“边工作边注意问题”，以及主动式“扫描仓库并报告发现”）。

本文档有意写成一套**规范性要求**（“MUST/SHOULD/MAY”）加**审计规则**（坏模式长什么样、如何检测、如何修复/缓解）。

--------------------------------------------------------------------

## 0) 安全、边界与反滥用约束（必须遵守）

- MUST NOT 请求、输出、记录或提交机密（API key、密码、私钥、会话 cookie、JWT、带凭据的数据库 URL、签名密钥、client secret）。
- MUST NOT 通过关闭防护来“修复”安全问题（例如 `InsecureSkipVerify`、对公共模块设置 `GOSUMDB=off`、通配符 CORS + 凭据、移除鉴权检查、给 cookie 鉴权应用禁用 CSRF 防护）。
- MUST 在审计中给出**基于证据的发现**：引用能支撑结论的文件路径、代码片段、构建/部署配置和具体值。
- MUST 诚实对待不确定性：如果某项控制可能存在于基础设施层（反向代理、WAF、服务网格、平台配置），应报告为“应用代码中不可见；需在运行时/配置中核实。”
- MUST 保持修复最小、正确且生产安全；避免在未警告的情况下引入破坏性变更（尤其是鉴权/会话流程和代理相关）。

--------------------------------------------------------------------

## 1) 工作模式

### 1.1 生成模式（默认）
当被要求编写新 Go 代码或修改既有代码时：
- MUST 遵循本规范中的每一条 **MUST** 要求。
- SHOULD 遵循每一条 **SHOULD** 要求，除非用户明确另有指示。
- MUST 优先使用默认安全的 API 和经过验证的库，而不是自研安全代码。
- MUST 避免引入新的危险汇点（sink）（执行 shell、动态执行模板、把用户文件当 HTML 提供、不安全重定向、弱加密、无界解析等）。

### 1.2 被动审查模式（编辑期间始终开启）
在 Go 仓库的任何位置工作时（即使用户没有要求安全扫描）：
- MUST “注意”所触及/邻近代码中违反本规范的地方。
- SHOULD 在问题出现时提及，并附简要说明 + 安全的修复方式。

### 1.3 主动审计模式（明确要求扫描时）
当用户要求“扫描”、“审计”或“挖漏洞”时：
- MUST 系统性地在代码库中搜索违反本规范的地方。
- MUST 以结构化格式输出发现（见 §2.3）。

推荐审计顺序：
1) 构建/部署入口：`main.go`、`cmd/*`、Dockerfile、Kubernetes 清单、systemd unit、CI workflow。
2) Go 工具链与依赖策略：Go 版本、模块、`go.mod/go.sum`、proxy/sumdb 设置、govulncheck 使用情况。
3) 机密管理与配置加载（环境变量、文件、密钥存储）+ 日志模式。
4) HTTP 服务器配置（超时、请求体限制、代理信任、安全响应头）。
5) 认证/授权（AuthN/AuthZ）边界、会话/cookie 设置、token 校验。
6) cookie 鉴权改状态端点的 CSRF 防护。
7) 模板使用与输出编码（XSS），以及任何“从字符串渲染模板”的行为（SSTI）。
8) 文件处理（上传/下载/路径穿越/临时文件）、静态文件服务。
9) 注入汇点：SQL、操作系统命令执行、SSRF/出站抓取、开放重定向。
10) 并发/资源耗尽（无界 goroutine/队列、缺失超时/context）。
11) 安全敏感路径中 `unsafe` / `cgo` / `reflect` 的使用。
12) 调试/诊断端点（pprof/expvar/metrics）暴露。
13) 密码学使用（随机数、密码哈希）。

--------------------------------------------------------------------

## 2) 定义与审查指引

### 2.1 不可信输入（除非证明否则按攻击者可控处理）
示例包括：
- `*http.Request` 字段：`r.URL.Path`、`r.URL.RawQuery`、`r.Form`、`r.PostForm`、请求头、cookie、`r.Body`
- 来自路由器的路径参数（包括从 URL 路径提取的值）
- JSON/XML/YAML 请求体、multipart 表单分段、上传文件
- 来自外部系统的任何数据（webhook、第三方 API、消息队列）
- 任何源自用户的持久化内容（数据库行）
- 在某些部署中可能受攻击者影响的配置值（上游代理设置的头、多租户系统中的环境变量）

### 2.2 改状态请求
如果请求能够创建/更新/删除数据、改变鉴权/会话状态、触发副作用（购买、发送邮件、发送 webhook）或发起特权操作，则该请求属于改状态请求。

### 2.3 要求的审计发现格式
对每个发现的问题，输出：

- 规则 ID：
- 严重程度：严重（Critical）/ 高（High）/ 中（Medium）/ 低（Low）
- 位置：文件路径 + 函数/handler 名 + 行号
- 证据：确切的代码/配置片段
- 影响：可能出什么问题、谁能够利用
- 修复：安全的改动（优先最小 diff）
- 缓解：当立即修复困难时的纵深防御措施
- 误报说明：不确定时需要核实什么（边缘配置、代理行为、鉴权假设）

--------------------------------------------------------------------

## 3) 安全基线：最低生产配置（生产环境 MUST）

这是能防止常见 Go 配置错误的“最小生产基线”。

### 3.1 工具链、补丁与依赖卫生（MUST）
- MUST 运行受支持的 Go 大版本并保持最新补丁版本。
- MUST 把 Go 标准库补丁版本当作安全相关（许多安全修复落在 `net/http`、`crypto/*`、解析包等标准库组件中）。
- MUST 使用 Go modules 并提交 `go.mod` 和 `go.sum`。
- MUST NOT 对公共模块禁用模块真实性机制（校验和数据库），除非你有受控且有文档的替代方案。
- MUST 在 CI 中运行 `govulncheck`（源码扫描和/或二进制扫描）并处理其发现。

### 3.2 HTTP 服务器基线（面向网络的服务 MUST）
如果程序提供 HTTP 服务（直接或经由构建在 `net/http` 之上的框架）：
- MUST 配置带显式超时和头限制的 `http.Server`。
- MUST 设置请求体大小限制（全局及按需的按路由限制）。
- MUST 避免公开暴露诊断端点（pprof/expvar）。
- SHOULD 设置一致的安全响应头集合（或核实它们已在边缘设置）。
- MUST 为你签发的任何 cookie 设置安全属性。
- SHOULD 为鉴权和高开销端点实现速率限制和滥用控制。

示例基线骨架（按项目调整）：
- 创建专用的 mux（除非有意管理，避免隐式的全局默认值）。
- 用以下能力包裹 handler：panic 安全的错误处理、请求 ID、日志、鉴权和限制。

--------------------------------------------------------------------

## 4) 规则（生成 + 审计）

每条规则包含：要求的做法、不安全模式、检测提示与修复方法。

### GO-DEPLOY-001：保持 Go 工具链与标准库更新（安全版本）
严重程度：中

注意：升级依赖和核心 Go 版本可能以意料之外的方式破坏项目。只聚焦安全关键依赖；如发现问题，应告知用户而不是自动升级。

要求：
- MUST 运行受支持的 Go 大版本并及时应用补丁版本。
- SHOULD 把补丁版本当作安全相关，即使你的应用代码没有变化。

不安全模式：
- 生产构建锁定在旧 Go 版本且没有补丁流程。
- 形如 `golang:1.xx` 的 Docker 镜像或未定期更新的自定义基础镜像。
- 有意压制 Go 更新的 CI 流水线。

检测提示：
- 检查 CI（`.github/workflows`、`gitlab-ci.yml` 等）中的 `go-version:` 或工具链设置。
- 检查 Dockerfile 中的 `FROM golang:` 标签。
- 检查 `go.mod` 的 `go` 指令和任何工具链锁定。

修复：
- 升级到受支持 Go 版本的最新补丁。
- 增加自动化检查（CI），当 Go 低于批准的最低版本时失败。

注意：
- Go 定期发布的小版本经常包含跨标准库包的安全修复。

---

### GO-SUPPLY-001：公共依赖的 Go 模块真实性校验 MUST NOT 被禁用
严重程度：高

要求：
- MUST 保持公共模块的模块校验和验证开启。
- SHOULD 提交 `go.sum` 并把其变更当作安全敏感。
- MUST NOT 对公共模块使用不安全的模块获取设置。
- MAY 用 `GOPRIVATE`/`GONOSUMDB` 为私有仓库配置私有模块行为，但必须收窄范围、有意为之。

不安全模式：
- CI 或生产构建环境中对公共模块设置 `GOSUMDB=off`。
- `GONOSUMDB=*` 或实际上会禁用验证的过宽模式。
- 公共模块使用 `GOINSECURE=*` 或过宽的 `GOINSECURE` 模式。
- 没有明确策略就到处使用 `GOPROXY=direct`。

检测提示：
- 在构建配置中搜索 `GOSUMDB`、`GONOSUMDB`、`GOINSECURE`、`GOPROXY`、`GOPRIVATE`。
- 查找建议“为了让构建能跑”而禁用校验和数据库的文档/脚本。

修复：
- 恢复公共模块验证的默认设置。
- 私有模块：
  - 设置 `GOPRIVATE=your.private.domain/*`
  - 配置内部代理或直接获取，并把 `GONOSUMDB` 限制为仅私有模式。

注意：
- 禁用校验和验证会移除抵御定向攻击或上游投递被攻陷的重要完整性层。

---

### GO-CONFIG-001：机密必须外部化，绝不记录或提交
严重程度：高（凭据被提交时为严重）

要求：
- MUST 从环境变量、密钥管理器或权限受限的安全配置文件加载机密。
- MUST NOT 在 Go 源码、可能进入生产的测试夹具或构建参数中硬编码机密。
- MUST NOT 记录机密或完整的含凭据连接字符串。
- SHOULD 在生产环境中必需的机密缺失时 fail closed。

不安全模式：
- 含 token/密钥/密码的字符串常量。
- 含机密的 `.env` 文件或配置文件被提交到仓库。
- 记录 `os.Environ()`、转储完整配置或打印 DSN。

检测提示：
- 搜索可疑字面量（`API_KEY`、`SECRET`、`PASSWORD`、`Authorization:`）。
- 检查配置加载器和日志语句。
- 检查 CI 日志或调试打印路径。

修复：
- 把机密移到密钥存储 / 环境变量。
- 对日志中的敏感字段脱敏。
- 在 CI 和 pre-commit 中增加机密扫描。

---

### GO-HTTP-001：HTTP 服务器 MUST 设置超时和 MaxHeaderBytes
严重程度：高（DoS 风险）

要求：
- MUST 设置 `ReadHeaderTimeout`，并 SHOULD 视服务情况设置 `ReadTimeout`、`WriteTimeout`、`IdleTimeout`。
- MUST 为你的应用把 `MaxHeaderBytes` 设为有依据的限值。
- MUST NOT 在生产环境的公网服务器上依赖超时的默认零值。

不安全模式：
- 使用默认 `http.Server` 的 `http.ListenAndServe(":8080", handler)`（无显式超时）。
- `&http.Server{}` 超时保持为零。
- 缺少 `MaxHeaderBytes`。

检测提示：
- 搜索 `http.ListenAndServe(`、`ListenAndServeTLS(`、`Server{` 并检查配置的字段。
- 检查是否有反向代理；即使有代理，应用层超时仍然重要。

修复：
- 使用 `http.Server{ReadHeaderTimeout: ..., ReadTimeout: ..., WriteTimeout: ..., IdleTimeout: ..., MaxHeaderBytes: ...}`。
- 按端点类型校准超时（流式 vs JSON API）。

注意：
- net/http 文档说明了这些超时的存在，且零值/负值意味着“无超时”；生产服务应选择显式值。

---

### GO-HTTP-002：请求体与 multipart 解析 MUST 有大小上限
严重程度：中（DoS 风险；上传密集型应用可为高）

要求：
- MUST 对接受请求体的端点强制全局最大请求体大小。
- MUST 强制严格的 multipart 上传限制，避免无界的表单解析。
- SHOULD 在部分端点确需更大请求体时执行按路由限制。
- SHOULD 把上游（代理）限制作为纵深防御。

不安全模式：
- 用 `io.ReadAll(r.Body)` 读取 `r.Body` 而没有大小上限。
- 以过大的限制调用 `r.ParseMultipartForm(...)`（或忘了大小控制）。
- 接受文件上传却不限制文件大小、分段数量或请求体总大小。

检测提示：
- 搜索 `io.ReadAll(r.Body)`、`json.NewDecoder(r.Body)`、`ParseMultipartForm`、`FormFile`、`multipart`。
- 查找缺失的 `http.MaxBytesReader` 或等价的按 handler 限制。
- 查找“上传”端点并检查限制。

修复：
- 解析前用 `http.MaxBytesReader(w, r.Body, maxBytes)` 包裹请求体。
- 对 multipart，设置保守限制并显式校验文件大小/分段数量。
- 在应用限制之外，再设置代理限制（例如在 ingress 处）。

注意：
- 存在与 multipart/表单解析过度资源消耗相关的已知漏洞类别和通告；把无界解析当作安全问题对待。

---

### GO-DEPLOY-002：诊断端点（pprof/expvar/metrics）MUST NOT 公开暴露
严重程度：高

注意：这只适用于生产配置。这些端点常用于调试或开发端点。如果发现，应确认它在实际生产部署中是否可达。

要求：
- MUST NOT 在面向公网的监听上暴露 `net/http/pprof` 处理器，除非有强访问控制。
- SHOULD 把诊断运行在单独的、仅内部的监听上（仅回环/VPC）并要求鉴权。
- MUST 审查诊断端点会暴露什么（堆栈跟踪、内存、命令行、环境、内部 URL）。

不安全模式：
- 在带公共 mux 的服务器二进制中做副作用导入 `import _ "net/http/pprof"`。
- `/debug/pprof/*` 无需鉴权即可访问。
- `/debug/vars`（expvar）无需鉴权即可访问。

检测提示：
- 搜索 `net/http/pprof` 导入（包括空白导入）。
- 搜索路由前缀 `/debug/pprof`、`/debug/vars`。
- 检查是否使用了 `http.DefaultServeMux`，以及是否有调试 handler 全局注册。

修复：
- 从生产构建移除诊断功能，或绑定到仅内部的监听。
- 增加强认证/授权（且理想情况下还有网络层限制）。

注意：
- pprof 通常是为了它在 `/debug/pprof/` 下注册 HTTP 处理器的副作用而被导入的。

---

### GO-HTTP-003：反向代理与 forwarded 头信任 MUST 显式声明
严重程度：高（鉴权、URL 生成、日志/审计的正确性）

要求：
- 如果部署在反向代理之后，MUST 定义哪个代理受信，以及客户端 IP/scheme/host 如何派生。
- MUST NOT 信任来自公网的 `X-Forwarded-For`、`X-Forwarded-Proto`、`Forwarded` 或类似头。
- MUST 确保“安全 cookie”逻辑、重定向和绝对 URL 生成不依赖可伪造的头。

不安全模式：
- 未经校验代理边界就把 `r.Header.Get("X-Forwarded-For")` 当作客户端 IP。
- 不确认 `X-Forwarded-Proto` 来自受信代理就从它派生“是否 HTTPS”。
- 未经白名单就用 forwarded 的 `Host` 值生成密码重置链接。

检测提示：
- 搜索 `X-Forwarded-For`、`X-Forwarded-Proto`、`Forwarded`、`Real-IP` 和任何自定义“客户端 IP”辅助函数。
- 检查 ingress/代理配置；若不可见，标记为“需在边缘核实”。

修复：
- 在边缘和应用内同时强制代理信任：
  - 只接受来自已知代理 IP 段的 forwarded 头。
  - 有平台提供机制时优先使用。
- 生成外部链接时，使用配置好的白名单规范源（而不是请求的 Host 头）。

---

### GO-HTTP-004：SHOULD 设置安全响应头（应用内或边缘）
严重程度：中

要求（面向浏览器的典型 Web 应用）：
- SHOULD 设置：
  - 适合应用的 `Content-Security-Policy`（CSP）。注意：最重要的是设置 CSP 的 script-src。其他指令重要性较低，为便于开发通常可以省略。
  - `X-Content-Type-Options: nosniff`
  - 点击劫持防护（`X-Frame-Options` 和/或 CSP `frame-ancestors`）
  - 适当时设置 `Referrer-Policy` 和 `Permissions-Policy`
- MUST 确保 cookie 带安全属性（见 GO-HTTP-005）。

注意：
- 这些响应头可能由反向代理/CDN 设置；若应用代码中不可见，报告为“需在边缘核实”。

不安全模式：
- 面向浏览器的应用在任何位置（应用或边缘）都没有安全响应头。
- 渲染不可信内容的应用缺少 CSP。

检测提示：
- 搜索设置响应头的中间件：`w.Header().Set("Content-Security-Policy", ...)` 等。
- 搜索设置响应头的反向代理配置。

修复：
- 在 Go 中增加集中的响应头中间件，或在边缘配置。
- 保持 CSP 现实；尽量避免 `unsafe-inline`。

---

### GO-HTTP-005：生产环境 cookie MUST 使用安全属性
严重程度：中

要求（生产环境、HTTPS）：
- MUST 为承载鉴权/会话状态的 cookie 设置 `Secure`。重要提示：仅在已配置 TLS 的生产环境中才设置 `Secure`。在通过 HTTP 运行的本地开发环境中，不要给 cookie 设置 `Secure` 属性。应根据应用是否运行在生产模式来条件化处理。还应提供一个类似 `SESSION_COOKIE_SECURE` 的属性，以便在通过 HTTP 测试时能禁用 `Secure` cookie。
- MUST 为鉴权/会话 cookie 设置 `HttpOnly`。
- SHOULD 默认设置 `SameSite=Lax`（或兼容时用 `Strict`），仅在必要时使用 `None`（且必须配合 `Secure`）。
- SHOULD 设置适合应用的有上限生命周期（`Max-Age`/`Expires`）。

不安全模式：
- HTTPS 部署中设置鉴权/会话 cookie 却不带 `Secure`。
- 会话标识符 cookie 没有 `HttpOnly`。
- cookie 鉴权应用使用 `SameSite=None` 却没有强 CSRF 策略。

检测提示：
- 搜索 `http.SetCookie`、`&http.Cookie{`、`Set-Cookie`。
- 检查鉴权/会话代码中的 cookie 标志。

修复：
- 在 `http.Cookie` 上设置正确字段，并集中管理 cookie 创建。

注意：
- SameSite 是纵深防御，不能替代 cookie 鉴权应用的 CSRF 防护。

---

### GO-HTTP-006：cookie 鉴权的改状态端点 MUST 有 CSRF 防护
严重程度：高

- 重要提示：如果不使用 cookie 做鉴权（例如 Authorization 头中的纯 bearer token 且无环境 cookie），这些端点不存在 CSRF 风险。

要求：
- MUST 保护所有依赖 cookie 鉴权的改状态端点（POST/PUT/PATCH/DELETE）。
- SHOULD 使用经过充分测试的 CSRF 库/中间件，而不是自己造轮子。
- MAY 使用额外防线（Origin/Referer 检查、Fetch Metadata、SameSite cookie），但对 cookie 鉴权应用而言 token 仍是主要防线。
如果 token 不切实际，或对小型应用：
* MUST 至少要求设置一个自定义请求头，并把会话 cookie 设为 SESSION_COOKIE_SAMESITE=lax；这是除要求表单 token 之外最强的做法，而且通常更容易实现。


不安全模式：
- 没有任何 CSRF 检查却改变状态的 cookie 鉴权 JSON 端点。
- 用 GET 执行改状态操作。

检测提示：
- 枚举所有非 GET 路由并识别鉴权机制。
- 查找 CSRF 中间件的使用；若缺失，在面向浏览器的应用中视为可疑。

修复：
- 增加 CSRF 中间件，确保覆盖所有改状态路由。
- 如果该服务是面向非浏览器客户端的 API，避免 cookie 鉴权；改用 Authorization 头。

---

### GO-HTTP-007：CORS 必须显式声明并遵循最小权限
严重程度：中（若与凭据搭配配置错误则为高）

要求：
- 如果不需要 CORS，MUST 保持禁用。
- 如果需要 CORS：
  - MUST 对受信来源做白名单（不反射任意来源）
  - MUST 谨慎处理带凭据请求；不要把宽松来源与 cookie 组合
  - SHOULD 限制允许的方法/头

不安全模式：
- `Access-Control-Allow-Origin: *` 搭配 cookie（`Access-Control-Allow-Credentials: true`）。
- 不校验就反射 `Origin`。

检测提示：
- 搜索 `Access-Control-Allow-` 头的设置。
- 搜索 CORS 中间件配置。

修复：
- 实现严格的来源白名单和最小的方法/头集合。
- 确保除非必需，cookie 鉴权端点不跨源暴露。

---

### GO-XSS-001：使用 html/template，避免用不可信数据绕过自动转义
严重程度：高

要求：
- MUST 使用 `html/template` 做 HTML 渲染（不要用 `text/template`）。
- MUST NOT 把不可信数据转换成“受信”模板类型（`template.HTML`、`template.JS`、`template.URL` 等）。
- SHOULD 保持模板静态且由开发者控制；把动态模板当作高风险。
- MUST NOT 把用户上传的 HTML/JS 当活动内容提供，除非明确有意且已安全沙箱化。

不安全模式：
- 用 `text/template` 生成 HTML。
- 使用 `template.HTML(userInput)` 或类似的类型包装。
- 把未转义的用户内容直接写进 HTML 响应。

检测提示：
- 搜索 `text/template`、`template.New(...).Parse(...)`，以及 `template.HTML(` 之类的类型包装。
- 检查用字符串拼接返回 HTML 的 handler。

修复：
- 使用 `html/template`，把不可信数据作为数据传入，而不是标记。
- 如果必须允许有限 HTML，使用经过审查的 HTML 净化器，并对属性/URL 仍然小心。

---

### GO-SSTI-001：绝不解析/执行来自不可信输入的模板（SSTI）
严重程度：严重

要求：
- MUST NOT 对受不可信输入影响的模板文本调用 `template.Parse` / `template.ParseFiles` / `template.New(...).Parse(...)`。
- MUST 把“用户自定义模板”视为特殊的高风险设计：
  - MUST 使用重度沙箱和严格白名单
  - 确有必要时 MUST 隔离执行（进程/容器边界）

不安全模式：
- `tmpl := template.Must(template.New("x").Parse(r.FormValue("tmpl")))`
- 从上传/数据库条目读取模板，并在与服务端代码相同的信任域内执行。

检测提示：
- 搜索 `.Parse(` 并追查模板字符串的来源。
- 查找“自定义邮件模板”、“用户主题模板”等。

修复：
- 换成安全的替换机制（不执行代码）。
- 如果模板必须由用户控制，激进地隔离和沙箱化。

---

### GO-PATH-001：防止路径穿越与不安全的文件服务
严重程度：高

要求：
- MUST NOT 在没有严格校验和基目录约束的情况下把用户控制的路径传给 `os.Open`、`os.ReadFile`、`http.ServeFile` 或 `http.FileServer`。
- MUST 把 `..`、绝对路径和操作系统特有的路径技巧当作敌意输入。
- SHOULD 把用户上传内容存在任何静态 Web 根之外；经受控 handler 提供。
- MUST 避免对敏感文件树开放目录列表。

不安全模式：
- `http.ServeFile(w, r, r.URL.Query().Get("path"))`
- `os.Open(filepath.Join(baseDir, userPath))` 而不检查结果仍在 `baseDir` 之内
- `http.FileServer(http.Dir("."))` 服务项目根目录或用户可写目录

检测提示：
- 搜索 `ServeFile(`、`FileServer(`、`http.Dir(`、`os.Open(`、`ReadFile(`、`filepath.Join(`。
- 追踪路径组件是否来自请求/数据库。

修复：
- 使用文件标识符（例如数据库 ID）到服务端路径的白名单映射。
- 在清理和拼接之后强制基目录约束。
- 除非明确有意，把活动格式作为下载提供（`Content-Disposition: attachment`）。

---

### GO-UPLOAD-001：文件上传必须校验、安全存储并安全提供
严重程度：高

要求：
- MUST 执行上传大小限制（应用 + 边缘）。
- MUST 使用白名单和内容检查校验文件类型（不能只看扩展名）。
- MUST 尽可能把上传内容存放在可执行/静态根目录之外。
- SHOULD 在服务端生成文件名（随机 ID），不要信任原始文件名。
- MUST 安全地提供可能有活动内容的格式（下载附件），除非明确有此意图。

不安全模式：
- 接受任意文件类型并以内联方式回传。
- 把用户提供的文件名用作存储路径。
- 缺少大小/类型校验。

检测提示：
- 搜索 `multipart`、`FormFile`、`ParseMultipartForm`、向磁盘的 `io.Copy`。
- 检查文件存储位置和提供方式。

修复：
- 实现白名单校验 + 安全存储 + 安全提供。
- 适用时增加扫描/隔离流程。

---

### GO-INJECT-001：防止 SQL 注入（参数化查询 / ORM）
严重程度：高

要求：
- MUST 使用参数化查询或底层做了参数化的 ORM。
- MUST NOT 用字符串拼接 / `fmt.Sprintf` / 字符串插值配合不可信输入构造 SQL。

不安全模式：
- `fmt.Sprintf("SELECT ... WHERE id=%s", r.URL.Query().Get("id"))`
- `query := "UPDATE users SET role='" + role + "' WHERE id=" + id`

检测提示：
- 搜索 `SELECT`、`INSERT`、`UPDATE`、`DELETE` 并检查查询字符串如何构造。
- 追踪不可信数据是否进入 `db.Query`、`db.Exec`、`QueryRow` 等。

修复：
- 替换为占位符（`?`、`$1` 等）并单独传参。
- 使用前校验并做类型检查 ID。

---

### GO-INJECT-002：防止操作系统命令注入；避免用不可信输入调用 shell
严重程度：严重至高（取决于暴露面）

要求：
- MUST 避免用攻击者可控字符串执行外部命令。
- 如果必须使用 subprocess：
  - MUST 使用带参数列表的 `exec.CommandContext`（不要用 `sh -c`）。
  - MUST NOT 把不可信输入传给 shell（`bash -c`、`sh -c`、PowerShell）。
  - SHOULD 对任何可变部分（子命令、标志、文件名）使用严格白名单。
- MUST 假设 CLI 工具可能把攻击者可控参数解释为标志或特殊值。

不安全模式：
- `exec.Command("sh", "-c", userString)`
- `exec.Command("bash", "-c", fmt.Sprintf("tool %s", user))`
- 调用 shell 来为用户提供的 glob 做展开。

检测提示：
- 搜索 `os/exec`、`exec.Command(`、`CommandContext(`、`"sh"`、`"bash"`、`"-c"`。
- 追踪不可信输入是否进入命令名/参数。

修复：
- 用库 API 代替子进程。
- 硬编码命令并对参数做白名单/校验。
- 如果 shell 无法避免，稳健转义并按高风险对待（优先避免）。

注意：
- Go 的 `os/exec` 包刻意避免调用 shell；一旦引入 `sh -c` 就会重新引入 shell 注入危害。

---

### GO-SSRF-001：防止出站 HTTP 请求中的 SSRF
严重程度：中（云/局域网环境中为高）

- 注意：对小型独立项目而言重要性较低。当部署到局域网内或同一服务器上还有其他服务监听时最为重要。

要求：
- MUST 把对用户提供 URL 的出站请求视为高风险。
- SHOULD 对任何受用户影响的 URL 抓取对主机/域名做白名单。
- SHOULD 阻止访问 localhost/私有 IP 段/链路本地地址和云元数据端点。
- MUST 把 scheme 限制为 `http`/`https`（禁止 `file:`、`gopher:` 等）。
- MUST 设置客户端超时并限制重定向。

不安全模式：
- `http.Get(r.URL.Query().Get("url"))`
- 抓取任意 URL 的“URL 预览” / “webhook 测试”端点。

检测提示：
- 搜索 `http.Get`、`client.Do`，以及来自请求/数据库的 URL 值。
- 识别抓取远程资源的功能。

修复：
- 严格解析 URL；强制 scheme 和白名单主机名。
- 解析 DNS 并强制 IP 段限制（注意 DNS rebinding）。
- 设置超时，非必需时禁用重定向，并限制响应大小。

---

### GO-HTTPCLIENT-001：出站 HTTP 客户端 MUST 设置超时并关闭响应体
严重程度：高（DoS 与资源耗尽）

要求：
- MUST 为 `http.Client` 的使用设置整体超时（或经 context + transport 超时实现等价的按请求截止时间）。
- MUST 确保所有成功请求都调用 `resp.Body.Close()`（通常在错误检查后立即 `defer resp.Body.Close()`）。
- SHOULD 限制响应体读取（不要对响应做无界的 `io.ReadAll`）。
- SHOULD 对安全敏感的抓取（SSRF、鉴权流程）限制重定向。

不安全模式：
- 对受用户影响的目的地使用 `http.DefaultClient` / `http.Get` 而没有任何超时策略。
- 缺少 `defer resp.Body.Close()` 导致资源泄漏。
- 无限制的 `io.ReadAll(resp.Body)`。

检测提示：
- 搜索 `http.Get(`、`http.Post(`、没有 `Timeout` 的 `client := &http.Client{}`、`client.Do(` 以及缺失的关闭调用。
- 搜索 `io.ReadAll(resp.Body)`。

修复：
- 使用配置了超时的客户端。
- 始终关闭响应体。
- 对大响应/不可信响应使用有界读取器（`io.LimitReader`）。

注意：
- net/http 包把 `DefaultClient` 暴露为零值的 `http.Client`，若不配置很容易变成“无超时”行为。

---

### GO-REDIRECT-001：防止开放重定向
严重程度：中（与鉴权流程组合时可为高）

要求：
- MUST 校验来自不可信输入的重定向目标（`next`、`redirect`、`return_to`）。
- SHOULD 优先只重定向到同站相对路径。
- SHOULD 校验失败时回退到安全默认值。

不安全模式：
- `http.Redirect(w, r, r.URL.Query().Get("next"), http.StatusFound)` 且不校验。

检测提示：
- 搜索 `http.Redirect(` 并检查 location 的来源。

修复：
- 对内部路径或已知域名做白名单。
- 除非明确需要且在白名单内，拒绝绝对 URL。

---

### GO-CRYPTO-001：加密随机数 MUST 来自 crypto/rand
严重程度：高（用于鉴权/会话 token 或密钥时为严重）

要求：
- MUST 对以下对象使用 `crypto/rand`：
  - 会话 ID、密码重置 token、API key、CSRF token、nonce
  - 需要时的加密密钥、签名密钥、盐
- MUST NOT 对任何安全敏感值使用 `math/rand`。
- SHOULD 在可用时使用能产生足够强度 token 的内建辅助函数。

不安全模式：
- 先 `math/rand.Seed(time.Now().UnixNano())` 再为鉴权或会话生成 token。
- 用 `math/rand` 构造类 UUIDv4 的结构。

检测提示：
- 在涉及鉴权/会话/token 流程的代码中搜索 `math/rand`、`rand.Seed`、`rand.Intn`。
- 搜索自定义 token 生成器。

修复：
- 改用 `crypto/rand`（`rand.Reader`、`rand.Read` 或安全的 token 辅助函数）。
- 确保足够的熵并使用 URL 安全编码。

注意：
- crypto/rand 包提供了安全的随机数 API 和 token 生成辅助函数。

---

### GO-AUTH-001：密码存储 MUST 使用自适应哈希（bcrypt/argon2id）和安全比较
严重程度：高

要求：
- MUST 使用自适应密码哈希函数（bcrypt 或 argon2id）哈希密码。
- MUST NOT 存储明文密码或可逆加密的密码。
- 相关场景（token、MAC、API key）中 MUST 以常数时间比较机密，以减少时序泄露。
- SHOULD 确保密码策略不超过算法约束（例如 bcrypt 有输入长度限制；要恰当处理长口令短语）。

不安全模式：
- 把 `sha256(password)` 存作密码哈希。
- 明文存储密码。
- 在时序敏感场景用 `==` 比较机密。

检测提示：
- 搜索对密码使用 `sha1`、`sha256`、`md5`。
- 搜索 `bcrypt`/`argon2` 的使用；若缺失则可疑。
- 搜索对 token/API key 的 `==` 比较。

修复：
- 使用 `bcrypt.GenerateFromPassword` / `CompareHashAndPassword`，或带推荐参数的 argon2id。
- 比较 MAC/token 时使用常数时间比较辅助函数。

注意：
- Go 在 `golang.org/x/crypto/bcrypt` 提供 bcrypt，在 `crypto/subtle` 提供常数时间比较。

---

### GO-CONC-001：数据竞争与并发危害 MUST 被当作安全相关问题
严重程度：中至高（取决于竞争影响什么）

要求：
- MUST 在 CI 中对安全敏感服务用竞态检测器运行测试（`go test -race`）。
- MUST 修复检测到的竞争；没有深入理由不要压制。
- SHOULD 把 handler 中的共享可变状态当作高风险；强制同步或避免共享可变性。

不安全模式：
- 多个 goroutine 无互斥锁地修改全局 map/slice。
- 缓存或鉴权/会话状态存在全局变量中且无并发保护。
- 对授权状态的竞态访问（可导致绕过或执行不一致）。

检测提示：
- 搜索在 handler 中使用的 `var someMap = map[...]...`。
- 查找缺失的 `sync.Mutex`、`sync.Map`、channel 或其他同步手段。
- 确保 CI 包含 `-race` 且运行相关测试。

修复：
- 增加恰当的同步或重新设计以避免共享可变状态。
- 增加竞态测试并持续运行。

注意：
- Go 竞态检测器只能发现已执行代码路径中的竞争；提升测试覆盖率，并在可行时用 `-race` 运行真实负载。

---

### GO-UNSAFE-001：unsafe/cgo 的使用 MUST 最小化，并像内存不安全代码一样审计
严重程度：高（高风险代码路径中为严重）

要求：
- SHOULD 避免在应用代码中导入 `unsafe`，除非绝对必要。
- 如果使用 `unsafe`，MUST 把它当作需要仔细评审和测试覆盖的“手动内存安全”。
- 如果使用 `cgo`，MUST 把 C/C++ 边界当作内存不安全；在 C 侧应用安全编码实践，并尽可能隔离。

不安全模式：
- 在解析、序列化、鉴权或网络代码中大范围使用 `unsafe.Pointer` 强转。
- 把 `cgo` 用于解析或安全边界而没有沙箱。

检测提示：
- 搜索 `import "unsafe"`、`unsafe.Pointer`、`// #cgo`、`import "C"`。
- 优先评审 unsafe 触及不可信输入的位置。

修复：
- 尽可能用安全的标准库替代 unsafe/cgo 用法。
- 把 unsafe 代码隔离到小型、充分测试的模块中，并配 fuzz/竞态测试。

注意：
- unsafe 包明确提供了绕过 Go 类型安全保证的操作。

--------------------------------------------------------------------

## 5) 实用扫描启发式（如何“挖”）

主动扫描时，使用这些高信号模式：

工具链与依赖：
- `FROM golang:`（Dockerfile）、`go-version:`（CI）、`toolchain go`（go.mod）、锁定在旧版本
- `GOSUMDB=off`、`GOINSECURE`、`GONOSUMDB`、`GOPROXY=direct`
- `go.mod` 中指向 fork/路径的 `replace` 指令
- CI 中缺少 `govulncheck`

HTTP 服务器加固：
- 缺少超时的 `http.ListenAndServe(`、`ListenAndServeTLS(`、`&http.Server{`
- `ReadHeaderTimeout: 0`、`ReadTimeout: 0`、`WriteTimeout: 0`、`IdleTimeout: 0`、缺少 `MaxHeaderBytes`

请求体解析 / DoS：
- 没有大小上限的 `io.ReadAll(r.Body)`、`json.NewDecoder(r.Body)`
- 没有显式限制的 `ParseMultipartForm`、`FormFile`、`multipart.NewReader`
- 缺少 `http.MaxBytesReader`

调试暴露：
- `import _ "net/http/pprof"`
- `/debug/pprof`、`/debug/vars`

模板 / XSS / SSTI：
- 用 `text/template` 输出 HTML
- 配合用户控制数据的 `template.HTML(`、`template.JS(`、`template.URL(`
- 对用户控制字符串调用 `.Parse(`

文件：
- 使用用户路径的 `http.ServeFile(`
- 指向仓库根或 uploads 的 `http.FileServer(http.Dir(`
- 没有包含性检查的 `os.Open(filepath.Join(base, user))`

注入：
- `db.Query/Exec` 附近用 `fmt.Sprintf`、字符串拼接构造 SQL
- `exec.Command("sh","-c", ...)`、`exec.Command("bash","-c", ...)`

SSRF / 出站 HTTP：
- URL 来自请求/数据库的 `http.Get(userURL)`、`client.Do(req)`
- 缺少客户端超时、缺少 `resp.Body.Close()`、无界的 `io.ReadAll(resp.Body)`

密码学：
- token/会话生成中使用 `math/rand`
- `InsecureSkipVerify: true`
- 用 `sha256`/`md5` 做密码哈希而不是 bcrypt/argon2

并发：
- handler 中无锁修改共享 map/slice
- CI 缺少 `go test -race`

始终尝试确认：
- 数据来源（不可信 vs 可信）
- 汇点类型（模板/SQL/subprocess/文件/http）
- 已有的防护措施（限制、校验、白名单、中间件、网络控制）

--------------------------------------------------------------------

## 6) 参考资料（访问于 2026-01-28）

Go 主要文档：
- Go 安全策略 — https://go.dev/doc/security/policy
- Go 发布历史（补丁版本中的安全修复）— https://go.dev/doc/devel/release
- Go 1.25 发布说明 — https://go.dev/doc/go1.25
- net/http（服务器超时、MaxHeaderBytes、DefaultClient）— https://pkg.go.dev/net/http
- html/template（自动转义与受信模板假设）— https://pkg.go.dev/html/template
- crypto/tls（MinVersion 默认值、InsecureSkipVerify 警告）— https://pkg.go.dev/crypto/tls
- crypto/rand（安全随机数、token 辅助函数）— https://pkg.go.dev/crypto/rand
- crypto/subtle（常数时间比较）— https://pkg.go.dev/crypto/subtle
- os/exec（默认不经 shell；命令执行指引）— https://pkg.go.dev/os/exec
- unsafe（绕过类型安全）— https://go.dev/src/unsafe/unsafe.go
- net/http/pprof（调试端点）— https://pkg.go.dev/net/http/pprof
- cmd/go（经 go.sum/校验和数据库的模块认证；GOINSECURE 等环境变量）— https://pkg.go.dev/cmd/go
- Module Mirror and Checksum Database Launched（Go 博客）— https://go.dev/blog/module-mirror-launch
- govulncheck 文档 — https://pkg.go.dev/golang.org/x/vuln/cmd/govulncheck
- Go 竞态检测器文档 — https://go.dev/doc/articles/race_detector
- bcrypt（密码哈希）— https://pkg.go.dev/golang.org/x/crypto/bcrypt
- Go 漏洞条目示例（multipart 资源消耗）— https://pkg.go.dev/vuln/GO-2023-1569

OWASP Cheat Sheet Series（通用 Web 安全）：
- Session Management — https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html
- CSRF Prevention — https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html
- SSRF Prevention — https://cheatsheetseries.owasp.org/cheatsheets/Server_Side_Request_Forgery_Prevention_Cheat_Sheet.html
- XSS Prevention — https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html
- HTTP Security Response Headers — https://cheatsheetseries.owasp.org/cheatsheets/HTTP_Headers_Cheat_Sheet.html