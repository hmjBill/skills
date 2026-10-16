# FastAPI（Python）Web 安全规范（FastAPI 0.128.x、Python 3.x）([PyPI][1])

本文档是一份**安全规范**，用于支持：

1. 为新 FastAPI 代码进行**默认安全的代码生成**。
2. 对既有 FastAPI 代码进行**安全审查 / 漏洞挖掘**（被动式“边工作边注意问题”，以及主动式“扫描仓库并报告发现”）。

本文档有意写成一套**规范性要求**（“MUST/SHOULD/MAY”）加**审计规则**（坏模式长什么样、如何检测、如何修复/缓解）。

FastAPI 通常与 ASGI 服务器（如 Uvicorn）一起部署，并构建在 Starlette + Pydantic 之上，因此本规范也覆盖这些层级中影响安全的部分。([PyPI][1])

---

## 0) 安全、边界与反滥用约束（必须遵守）

* MUST NOT 请求、输出、记录或提交机密（API key、密码、私钥、会话 cookie、签名密钥、带凭据的数据库 URL）。
* MUST NOT 通过关闭防护来“修复”安全问题（例如削弱鉴权、放宽 CORS、跳过签名校验、禁用校验、关闭 TLS 验证、给凭据请求配 `allow_origins=["*"]`）。
* MUST 在审计中给出**基于证据的发现**：引用能支撑结论的文件路径、代码片段和配置值。
* MUST 诚实对待不确定性：如果某项防护可能存在于基础设施层（反向代理、WAF、CDN、服务网格），应报告为“应用代码中不可见；需在运行时/配置中核实”。
* MUST 正确对待浏览器侧控制：

  * CORS **不是**鉴权机制；它只影响浏览器。
  * CSRF 防护适用于浏览器自动附带凭据（cookie）的场景；对纯头部 token 的 API 通常不适用。([OWASP Cheat Sheet Series][2])

---

## 1) 工作模式

### 1.1 生成模式（默认）

当被要求编写新 FastAPI 代码或修改既有代码时：

* MUST 遵循本规范中的每一条 **MUST** 要求。
* SHOULD 遵循每一条 **SHOULD** 要求，除非用户明确另有指示。
* MUST 优先使用默认安全的 API 和经过验证的库，而不是自研安全代码。
* MUST 避免引入新的危险汇点（sink）（执行 shell、不安全反序列化、动态 eval、渲染不可信模板、不安全的文件服务、不安全重定向、任意的出站抓取）。

### 1.2 被动审查模式（编辑期间始终开启）

在 FastAPI 仓库的任何位置工作时（即使用户没有要求安全扫描）：

* MUST “注意”所触及/邻近代码中违反本规范的地方。
* SHOULD 在问题出现时提及，并附简要说明 + 安全的修复方式。

### 1.3 主动审计模式（明确要求扫描时）

当用户要求“扫描”、“审计”或“挖漏洞”时：

* MUST 系统性地在代码库中搜索违反本规范的地方。
* MUST 以结构化格式输出发现（见 §2.3）。

推荐审计顺序：

1. 应用入口 / 部署脚本 / Dockerfile / Procfile / Helm/terraform。
2. ASGI 服务器配置（Uvicorn/Gunicorn）、代理设置、debug/reload 设置。
3. FastAPI 应用配置（docs 暴露、中间件、受信主机、CORS）。
4. 认证/授权（Authn/Authz）设计（依赖项、JWT/会话处理、密码存储）。
5. cookie/会话使用 + CSRF（如果使用 cookie）。
6. 输入校验与输出塑形（Pydantic 模型、mass assignment、过度数据暴露）。
7. 模板渲染与 XSS/SSTI（如果提供 HTML）。
8. 文件处理（上传 + 下载）、StaticFiles、Range 支持。
9. 注入类（SQL、命令执行、不安全反序列化）。
10. 出站请求（SSRF）、重定向处理、WebSocket 安全。

---

## 2) 定义与审查指引

### 2.1 不可信输入（除非证明否则按攻击者可控处理）

示例包括：

* 查询参数 / 路径参数
* JSON 请求体（包括嵌套字段）
* 请求头（包括 `Host`、`Origin`、`X-Forwarded-*`）
* Cookie（包括会话 cookie）
* 文件上传（multipart 分段）
* WebSocket 消息、握手期间的查询参数和请求头 ([Starlette][3])
* 来自外部系统的任何数据（webhook、第三方 API、消息队列）
* 任何源自用户的持久化内容（数据库行）

### 2.2 改状态请求

如果请求能够创建/更新/删除数据、改变鉴权/会话状态、触发副作用（购买、发送邮件、发送 webhook）或发起特权操作，则该请求属于改状态请求。

### 2.3 要求的审计发现格式

对每个发现的问题，输出：

* 规则 ID：
* 严重程度：严重（Critical）/ 高（High）/ 中（Medium）/ 低（Low）
* 位置：文件路径 + 函数/路由名 + 行号
* 证据：确切的代码/配置片段
* 影响：可能出什么问题、谁能够利用
* 修复：安全的改动（优先最小 diff）
* 缓解：当立即修复困难时的纵深防御措施
* 误报说明：不确定时需要核实什么

---

## 3) 安全基线：最低生产配置（生产环境 MUST）

这是能防止常见 FastAPI/ASGI 配置错误的“最小生产基线”。

基线目标：

* 生产环境没有调试回溯或自动重载。([PyPI][4])
* 以生产级 ASGI 服务器配置运行（worker、超时、资源控制）。([PyPI][4])
* 启用 Host 头校验（TrustedHostMiddleware 或等价物）。([PyPI][5])
* 除非明确需要，否则禁用 CORS；启用时必须严格且最小权限。([OWASP Cheat Sheet Series][6])
* 通过依赖项一致地强制执行鉴权（不会出现“哎呀，这条路由忘了鉴权”）。([FastAPI][7])
* 如果使用 cookie/会话，cookie 标志必须安全，且 CSRF 已被处理。([OWASP Cheat Sheet Series][8])
* 在边缘存在请求大小限制和 multipart 限制，并在应用内按需校验（以缓解内存/CPU DoS）。([advisories.gitlab.com][9])
* 依赖项及时修补，尤其是 Starlette/python-multipart（历史上存在多个 DoS 和路径穿越通告）。([advisories.gitlab.com][10])

---

## 4) 规则（生成 + 审计）

每条规则包含：要求的做法、不安全模式、检测提示与修复方法。

### FASTAPI-DEPLOY-001：不要在生产环境使用自动重载 / 仅开发服务器模式

严重程度：高（若用于生产）

要求：

* MUST NOT 用自动重载/监视模式运行生产（例如 Uvicorn reload）。
* MUST 以生产进程模型运行（例如适当时使用多个 worker）并使用稳定的服务器设置。([PyPI][4])

不安全模式：

* 生产入口中使用 `uvicorn ... --reload`（或等价的 “reload=True” 配置）。
* 生产中以 `--reload` 运行的 Docker/Procfile/systemd 命令。

检测提示：

* 搜索 `--reload`、`reload=True`、`watchfiles`、`fastapi dev`、“development” 运行脚本。
* 检查 Docker CMD/ENTRYPOINT、Procfile、systemd unit、shell 脚本。

修复：

* 生产环境移除 reload；以稳定设置和显式 worker 配置运行 Uvicorn/Gunicorn。([PyPI][4])

注意：

* Reload 用于本地开发没有问题。只有当明确它被用作生产入口时才标记。

---

### FASTAPI-DEPLOY-002：生产环境 MUST 禁用调试模式

严重程度：严重

要求：

* MUST NOT 在生产环境启用调试回溯（FastAPI/Starlette 的 debug 模式会暴露敏感内部信息，并让某些利用链更容易）。([PyPI][5])
* MUST 把任何向客户端返回详细堆栈跟踪的配置视为敏感。

不安全模式：

* `app = FastAPI(debug=True)`（或 Starlette 的 `debug=True`），或等价的在生产环境开启调试的环境开关。([PyPI][5])
* 向最终用户暴露回溯的服务器/日志配置。

检测提示：

* 搜索 `debug=True`、`DEBUG = True`、映射到调试开关的环境标志。
* 审查异常中间件和错误处理器的设置。

修复：

* 确保调试只在本地开发/测试中启用。
* 向客户端返回通用错误响应；细节只在内部记录。

---

### FASTAPI-OPENAPI-001：生产环境 MUST 禁用或保护 OpenAPI 与交互式文档

严重程度：中（在敏感/内部应用中可为高）

要求：

* 对面向公众的服务，SHOULD 在生产环境禁用 `/docs`、`/redoc` 和 `/openapi.json`，除非有明确的业务需要。
* 如果启用，MUST 保护它们（例如鉴权、网络白名单或仅内部路由）。
* MUST NOT 依赖“隐晦即安全”；把文档暴露视为信息泄露放大器。

不安全模式：

* 内部/管理 API 的 `/docs` 和 `/openapi.json` 可被公网访问。
* 与生产同一主机名上启用文档且无访问控制。

检测提示：

* 查找 `FastAPI(docs_url=..., redoc_url=..., openapi_url=...)` 或默认值。
* 检查反向代理路由和白名单。

修复：

* 在生产中禁用文档端点（`docs_url=None`、`redoc_url=None`、`openapi_url=None`）或在边缘限制访问。

---

### FASTAPI-AUTH-001：鉴权 MUST 显式声明，并通过依赖项一致地强制执行

严重程度：高

要求：

* MUST 把鉴权实现为依赖项（或路由器级依赖项），使受保护端点不会“忘记”鉴权。
* MUST 对特权路由器/端点默认“拒绝”；显式标记真正公开的路由。
* SHOULD 把鉴权执行集中在路由器边界（例如为需鉴权端点使用受保护的 `APIRouter`）。([FastAPI][7])

不安全模式：

* 处理器中散落逐路由的临时鉴权检查（容易遗漏）。
* 受保护/未受保护端点混杂且没有清晰策略。

检测提示：

* 识别路由器和端点；检查受保护者是否包含 `Depends(...)`/`Security(...)`。
* 搜索处理器内部形如 `if user is None: raise ...` 的模式（而不是依赖项）。

修复：

* 把鉴权移入依赖项，并用 `Depends()`/`Security()` 一致地挂到路由器/端点上。([FastAPI][7])

---

### FASTAPI-AUTH-002：使用标准鉴权传输方式；避免在 URL 中放机密

严重程度：高

要求：

* SHOULD 使用 `Authorization: Bearer <token>` 头做 token 鉴权，而不是查询参数。([FastAPI][11])
* MUST NOT 在可避免时把机密（token、含长效机密的重置链接、API key）放进查询字符串。

不安全模式：

* 用 `?token=...`、`?api_key=...`、`?auth=...` 做主要鉴权。
* URL 中内嵌长效访问 token（经日志、referrer、缓存泄露）。

检测提示：

* 搜索形如 `token`、`api_key`、`key`、`secret`、`password` 的参数名。
* 查找无正当理由就使用查询参数 API key 的安全方案。

修复：

* 把 token 移到 Authorization 头；轮换/缩短生命周期；敏感值用 POST body 传。

---

### FASTAPI-AUTH-003：密码存储 MUST 使用强哈希；绝不存明文密码

严重程度：严重

要求：

* MUST 使用强且慢的密码哈希方案存储密码（例如 Argon2id、bcrypt）。
* MUST NOT 存储明文密码，或把可逆加密作为主要保护。
* SHOULD 使用成熟的库做哈希与校验（不要自己造轮子）。

不安全模式：

* 在数据库中存明文密码。
* 使用快速哈希（如 SHA256）而没有合适的密码哈希 KDF。
* 在 API 响应中返回密码哈希。

检测提示：

* 搜索持久化的 `password=` 字段，并查找对密码使用 `hashlib.md5/sha1/sha256` 的情况。
* 检查响应模型中的 password/hash 字段。

修复：

* 迁移到合适的密码哈希库；增加登录时重新哈希的升级路径。

---

### FASTAPI-AUTH-004：JWT 校验 MUST 严格；JWT MUST NOT 携带机密

严重程度：高

要求：

* MUST 校验 JWT 签名并强制算法白名单。
* MUST 校验适合你系统的标准 claims（至少 `exp`；多服务或多租户时通常还要 `iss`/`aud`）。
* MUST 把 JWT 内容视为客户端可读；不要把机密放进 JWT payload。([FastAPI][12])

不安全模式：

* `jwt.decode(..., options={"verify_signature": False})` 或等价物。
* 接受 `alg=none` / 算法混淆。
* 用 JWT payload 存敏感机密（API key、密码）。

检测提示：

* 搜索 `jwt.decode`、`python-jose`、`PyJWT`、`verify_signature`。
* 检查缺失 exp 校验或过期时间过长。

修复：

* 执行严格校验（签名、允许的算法、exp，以及任何必需的签发者/受众约束）。
* 只存你愿意暴露给客户端的标识符/claims。([FastAPI][12])

---

### FASTAPI-AUTHZ-001：授权 MUST 逐对象、逐属性地强制执行

严重程度：高

要求：

* 每当通过用户控制的标识符（路径/查询/请求体中的 ID）访问资源时，MUST 执行对象级授权。
* MUST 执行属性级授权和响应塑形，防止“过度数据暴露”（例如仅管理员可见的字段）。([OWASP Foundation][13])

不安全模式：

* `GET /users/{id}` 不校验调用者能否访问该 `id` 就返回用户记录。
* 响应模型包含内部字段（角色、权限、账单数据、密码哈希）。

检测提示：

* 枚举接受 ID 的端点；追踪是否执行了授权检查。
* 对比公开与内部字段的响应模型。

修复：

* 增加对象级检查（所有权、ACL、租户边界）。
* 使用只包含允许字段的专用响应模型。

---

### FASTAPI-SESS-001：若使用基于 cookie 的会话和 TLS，生产环境中 cookie 属性 MUST 安全

严重程度：高（仅当启用 TLS 时）

要求（生产环境、HTTPS）：

* MUST 设置会话 cookie 仅经 HTTPS 传输（secure）。重要提示：仅在已配置 TLS 的生产环境中才设置 `Secure`。在通过 HTTP 运行的本地开发环境中，不要给 cookie 设置 `Secure` 属性。应根据应用是否运行在生产模式来条件化处理。还应提供一个类似 `SESSION_COOKIE_SECURE` 的属性，以便在通过 HTTP 测试时能禁用 `Secure` cookie。
* MUST 为会话 cookie 设置 HttpOnly（JS 不可访问）。
* SHOULD 使用 `SameSite=Lax`（或 UX 允许时的 `Strict`）；如果需要跨站 cookie，记录 CSRF 影响并增加补偿控制。([OWASP Cheat Sheet Series][8])
* 如果使用 Starlette 的 `SessionMiddleware`，生产环境 MUST 设置 `https_only=True` 并选择合适的 `same_site`。([PyPI][5])

不安全模式：

* 会话 cookie 缺少 Secure/HttpOnly。
* 已鉴权的改状态端点使用 `SameSite=None` cookie 且没有 CSRF 防护。

检测提示：

* 搜索 `SessionMiddleware(` 并检查 `https_only`、`same_site` 等参数。
* 搜索 `set_cookie(` 的使用及 cookie 标志。

修复：

* 设置安全的 cookie 属性；高特权会话优先使用短生命周期。([OWASP Cheat Sheet Series][8])

---

### FASTAPI-SESS-002：不要把敏感机密存进签名会话 cookie

严重程度：高

要求：

* MUST 假设基于 cookie 的会话数据客户端可读（签名 ≠ 加密）；除非在服务端加密，否则不要存机密/PII。
* cookie 中只存不透明标识符（例如会话 ID）或非敏感状态；敏感会话状态存服务端。([OWASP Cheat Sheet Series][8])

不安全模式：

* 把访问 token、刷新 token 或 PII 直接存进 cookie 会话 payload。
* 把“签名 cookie”当成保密存储。

检测提示：

* 搜索 `request.session[...] =` 或等价的 `session[...] =` 模式；确认存了什么。
* 确认是否使用了 `SessionMiddleware` 或其他 cookie 会话机制。

修复：

* 把敏感值移到服务端存储；保持 cookie 最小化。

---

### FASTAPI-CSRF-001：使用 cookie 鉴权的改状态请求 MUST 有 CSRF 防护

严重程度：高

注意：仅当使用基于 cookie 的鉴权时适用。如果应用使用头部或 token 鉴权（如 Authorization 头），则 CSRF 不是问题。

要求：

* MUST 保护所有依赖 cookie 鉴权的改状态端点（POST/PUT/PATCH/DELETE）。
* SHOULD 使用经过验证的 CSRF 方案（同步 token 模式或经过良好评审的中间件），而不是自己造轮子。([OWASP Cheat Sheet Series][2])
* MAY 增加纵深防御（Origin/Referer 检查、SameSite cookie、Fetch Metadata），但对 cookie 鉴权应用而言 token 仍是主要防线。([OWASP Cheat Sheet Series][2])
* 重要提示：如果不使用 cookie 鉴权（鉴权经 `Authorization` 头），CSRF 通常不适用。([FastAPI][11])

不安全模式：

* 使用 cookie 鉴权却没有任何 CSRF 校验的改状态端点。
* 用 GET 执行改状态操作（放大 CSRF 风险）。

检测提示：

* 枚举非 GET 方法的路由；确认是否用 cookie 鉴权。
* 查找 CSRF token 生成/校验或中间件。

修复：

* 使用 cookie 鉴权时，为改状态操作加上 CSRF token（并校验）。([OWASP Cheat Sheet Series][2])

---

### FASTAPI-VALID-001：请求解析与校验 MUST 由 schema 驱动；防止 mass assignment

严重程度：中（对写数据库的 API 尤其如此）

要求：

* SHOULD 用 Pydantic 模型接收请求体，而不是接受任意 `dict`/`Any`。
* SHOULD 在合适时配置模型拒绝意外字段（防止“mass assignment”类缺陷）。
* MUST 在把标识符（ID、email、URL）用于访问控制或副作用之前校验并规范化。([OWASP Cheat Sheet Series][14])

不安全模式：

* `payload = await request.json()` 之后接 `Model(**payload)` 或直接用 `payload` 写数据库（无白名单）。
* 写端点的模型静默接受未知字段。

检测提示：

* 搜索 `await request.json()`、`request.body()`、`dict` 类型请求体、`Any` 类型请求体。
* 查找用未过滤输入执行 `db.update(**payload)` 或 `Model(**payload)` 的端点。

修复：

* 使用带字段白名单的显式 Pydantic 模型；写端点拒绝多余字段。([OWASP Cheat Sheet Series][14])

---

### FASTAPI-RESP-001：通过响应模型与显式序列化防止过度数据暴露

严重程度：中

要求：

* MUST 定义只包含预期字段的响应模型（尤其是用户对象、鉴权相关对象、账单对象）。
* SHOULD 为“创建输入”、“数据库/内部”和“公开输出”使用不同模型，避免泄露敏感字段。([FastAPI][15])

不安全模式：

* 返回包含内部列的 ORM 对象或 dict。
* 把“数据库模型”直接当作响应模型复用（包含 `password_hash`、`is_admin` 等）。

检测提示：

* 查找 `return user` 而 `user` 是 ORM 实例的端点。
* 检查返回敏感资源的端点是否遗漏 `response_model`。

修复：

* 增加显式响应模型；创建排除敏感字段的“公开”schema。([FastAPI][15])

---

### FASTAPI-XSS-001：防止 HTML 响应与模板中的反射型/存储型 XSS

严重程度：高（如果服务提供 HTML）

要求：

* MUST 使用开启自动转义的模板来生成 HTML。
* MUST NOT 把不可信内容标记为安全（不要对用户控制的数据做不安全的“原始 HTML”渲染）。
* SHOULD 在提供含任何用户内容的 HTML 时部署 CSP。([OWASP Cheat Sheet Series][16])

不安全模式：

* 未经转义/净化就把用户内容直接渲染进 HTML。
* 关闭自动转义或未经净化就使用“原始 HTML”特性。

检测提示：

* 搜索模板渲染和拼接 HTML 的字符串操作。
* 审查模板中的“不安全”过滤器/构造和未加引号的属性。

修复：

* 保持自动转义开启；仅在绝对必要时用可信净化器净化用户 HTML；增加 CSP。([OWASP Cheat Sheet Series][16])

注意：

* 如果应用是纯 JSON API，XSS 通常是客户端/应用侧的问题，但错误页/文档页仍可能渲染 HTML。

---

### FASTAPI-SSTI-001：绝不渲染不可信模板（服务端模板注入）

严重程度：严重

要求：

* MUST NOT 渲染包含用户控制的模板语法的模板。
* 当受不可信输入影响时，MUST 把“从字符串构造模板”的渲染视为危险。
* 如果确实必须使用不可信模板（罕见、高风险）：

  * MUST 使用沙箱化的模板方案并限制能力。
  * MUST 假设沙箱逃逸是可能的；增加隔离和严格白名单。([OWASP Foundation][17])

不安全模式：

* 用普通 Jinja 环境渲染来自用户输入或数据库的模板。
* 用用户控制的字符串动态构造模板。

检测提示：

* 搜索 Jinja 的 `Environment.from_string`、`Template(...)` 或类似用法。
* 追查模板字符串的来源（请求、数据库、上传、管理后台）。

修复：

* 用不可执行代码的模板替代（简单字符串替换）。
* 确有必要时，使用 Jinja 的沙箱环境并做强隔离。([jinja.palletsprojects.com][18])

---

### FASTAPI-HEADERS-001：设置必要的安全响应头（应用内或边缘）

严重程度：中

要求（典型 API/Web 应用）：

* SHOULD 设置：

  * `X-Content-Type-Options: nosniff`
  * 若提供 HTML，设置点击劫持防护（`X-Frame-Options` 和/或 CSP `frame-ancestors`）
  * 按需设置 `Referrer-Policy` 和 `Permissions-Policy`

注意：

* 响应头也可能由代理/CDN 设置。若应用代码中不可见，标记为“需在边缘核实”。([OWASP Cheat Sheet Series][6])

不安全模式：

* 提供 HTML 或敏感 API 的应用在任何位置（应用或边缘）都没有安全响应头。

检测提示：

* 搜索设置响应头的中间件；检查反向代理配置。

修复：

* 集中设置响应头（中间件）或通过反向代理/CDN。

---

### FASTAPI-CORS-001：CORS MUST 显式声明并遵循最小权限

严重程度：中（若与凭据搭配配置错误则为高）

要求：

* 如果不需要 CORS，MUST 保持禁用。
* 如果需要 CORS：

  * MUST 对受信来源做白名单（不要反射任意 Origin）。
  * MUST NOT 把带凭据请求与通配符来源组合（这不安全，合规的中间件通常也会拒绝）。([OWASP Cheat Sheet Series][6])
  * SHOULD 限制允许的方法和头。

不安全模式：

* `allow_origins=["*"]` 与 `allow_credentials=True` 并存。
* 不校验就反射 `Origin`。
* 大范围使用 `allow_origin_regex=".*"`。

检测提示：

* 搜索 `CORSMiddleware` 配置。
* 查找 `allow_origins=["*"]`、`allow_credentials=True`、`allow_origin_regex`。

修复：

* 使用显式来源白名单和最小的方法/头集合；除非必需，否则不开启凭据。([OWASP Cheat Sheet Series][6])

---

### FASTAPI-HOST-001：生产环境 MUST 校验 Host 头

严重程度：低

要求：

* SHOULD 使用 `TrustedHostMiddleware`（或边缘等价物）限制可接受的 Host 值。([PyPI][5])
* MUST NOT 未经校验就把 `Host` 头用于安全敏感决策。

不安全模式：

* 用请求主机生成外部 URL（密码重置链接、回调 URL）却不校验 Host。
* 在宽松代理之后的应用允许任意 Host 头。

检测提示：

* 搜索 `TrustedHostMiddleware` 的使用。
* 搜索用 `request.url`、`request.base_url` 或主机衍生值构造外部 URL 的逻辑。

修复：

* 在生产环境配置严格的允许主机列表；可能的话在边缘同样强制。

---

### FASTAPI-PROXY-001：反向代理信任 MUST 配置正确

严重程度：高（处于代理之后时）

要求：

* 若部署在反向代理之后，MUST 正确配置 forwarded 头信任。
* MUST NOT 盲目信任来自公网的 `X-Forwarded-*` 头。
* 如果使用 Uvicorn 的代理头支持，MUST 限制哪些 IP 可以提供 forwarded 头。([PyPI][4])

不安全模式：

* 不限制受信代理 IP 就大范围启用代理头。
* 用 forwarded 头决定“是否安全”/“是否内部”/“客户端 IP”却没有正确的信任边界。

检测提示：

* 搜索 `--proxy-headers`、`--forwarded-allow-ips` 或等价配置。
* 搜索安全敏感地使用 `request.client.host`、`request.url.scheme`、`request.headers["x-forwarded-for"]` 的地方。

修复：

* 仅在已知代理之后才为 Uvicorn 启用代理头，并把 `forwarded_allow_ips` 限制为该代理。([PyPI][4])
* 即使在代理之后也保留 Host 白名单。

---

### FASTAPI-LIMITS-001：MUST 强制请求与 multipart 限制以防 DoS

严重程度：低

要求：

* MUST 在边缘（反向代理/负载均衡器）强制请求大小限制，并在应用内按需校验。
* MUST 对 multipart/form-data 处理做特别审查；历史漏洞包括无界缓冲与 DoS 向量。([advisories.gitlab.com][9])
* SHOULD 对高开销端点做速率限制和/或按 IP/按用户限流。

不安全模式：

* 接受任意大的 JSON 请求体或 multipart 表单。
* 解析 multipart 表单却没有大小/字段数控制。

检测提示：

* 识别文件上传端点和 `multipart/form-data` 的使用。
* 查找缺失的代理层限制（nginx `client_max_body_size`、ALB 限制等）和缺失的应用层检查。

修复：

* 执行严格的请求体限制和 multipart 约束；保持 Starlette 和 python-multipart 为已修复版本。([advisories.gitlab.com][9])

---

### FASTAPI-FILES-001：防止路径穿越与不安全的静态文件暴露

严重程度：高

要求：

* MUST NOT 在没有严格校验和安全基目录的情况下把用户控制的文件路径传给 `FileResponse`/文件系统调用。
* 如果使用 `StaticFiles`，MUST 保持 Starlette 更新并了解其安全历史（旧版本存在路径穿越通告）。([advisories.gitlab.com][10])
* MUST NOT 在没有安全处理的情况下把用户上传内容作为可执行/活动内容（尤其是 HTML/JS）从静态根目录提供。

不安全模式：

* `FileResponse(request.query_params["path"])`
* 挂载 `StaticFiles(directory="uploads")`，而 uploads 中包含 HTML/JS/SVG 且被内联提供。

检测提示：

* 在路由中搜索 `FileResponse(`、`StaticFiles(`、`open(`。
* 追踪路径是否来自不可信输入。

修复：

* 文件使用不透明 ID；把 ID 映射到服务端存储路径。
* 在合适场景把不可信内容作为附件下载提供。

---

### FASTAPI-FILES-002：缓解文件服务端点上的 Range 头 DoS

严重程度：低（若版本受影响且启用了文件服务）

要求：

* 如果使用 `FileResponse`/`StaticFiles`，MUST 保持 Starlette 已修复已知文件服务 DoS 问题。
* MUST 把异常的 `Range` 头处理和文件服务视为 DoS 攻击面。([advisories.gitlab.com][19])

不安全模式：

* 用含漏洞的 Starlette 版本提供大文件下载。
* 文件端点没有速率限制 / CDN 防护。

检测提示：

* 确认 Starlette 版本；若在受影响区间内则标记。
* 找出 `FileResponse` 和 `StaticFiles` 的使用。

修复：

* 按通告指引把 Starlette 升级到已修复版本。([advisories.gitlab.com][19])
* 在合适场景为文件端点增加边缘缓存/速率限制。

---

### FASTAPI-UPLOAD-001：文件上传 MUST 校验、安全存储并安全提供

严重程度：中

要求：

* MUST 执行上传大小限制（应用 + 边缘）。
* MUST 使用白名单和内容检查校验文件类型（不能只看扩展名）。([OWASP Cheat Sheet Series][20])
* SHOULD 在服务端生成文件名（随机 ID），不要信任原始文件名。
* MUST 安全地提供可能有活动内容的格式（作为下载附件），除非明确有此意图。

不安全模式：

* 接受任意文件类型并以内联方式回传。
* 把用户提供的文件名用作存储路径。

检测提示：

* 查找上传处理器以及文件的写入位置/方式。
* 查找上传目录被直接暴露的情况。

修复：

* 实现白名单校验 + 安全存储 + 安全提供；适用时增加扫描/隔离。([OWASP Cheat Sheet Series][20])

---

### FASTAPI-INJECT-001：防止 SQL 注入（使用参数化查询 / ORM）

严重程度：高

要求：

* MUST 使用参数化查询或底层做了参数化的 ORM。
* MUST NOT 用字符串拼接 / f-string 配合不可信输入构造 SQL。([OWASP Cheat Sheet Series][21])

不安全模式：

* `f"SELECT ... WHERE id={user_id}"`
* `"... WHERE name = '%s'" % user_input`

检测提示：

* 在 `.execute(...)` 附近的 Python 字符串中搜索 SQL 关键字。
* 追踪不可信数据是否进入数据库调用。

修复：

* 改为参数化查询 / ORM 查询 API；查询前校验类型。([OWASP Cheat Sheet Series][21])

---

### FASTAPI-INJECT-002：防止操作系统命令注入

严重程度：严重至高（取决于暴露面）

要求：

* MUST 避免用不可信输入执行 shell 命令。
* 如果必须使用 subprocess：

  * MUST 以列表形式传参（不要用字符串）
  * MUST NOT 对受攻击者影响的字符串使用 `shell=True`
  * SHOULD 对任何可变部分使用严格白名单 ([OWASP Cheat Sheet Series][22])

不安全模式：

* `os.system(user_input)`
* `subprocess.run(f"cmd {user}", shell=True)`
* 把用户字符串传入 `bash -c`、`sh -c`、PowerShell 等。

检测提示：

* 搜索 `os.system`、`subprocess`、`Popen`、`shell=True`。
* 追踪来自请求/数据库的数据是否进入这些调用。

修复：

* 用库 API 代替 shell 命令。
* 无法避免时，硬编码命令本身并对参数做白名单校验；在支持处使用 `--` 分隔符。([OWASP Cheat Sheet Series][22])

---

### FASTAPI-SSRF-001：防止出站 HTTP 中的服务端请求伪造（SSRF）

严重程度：中（在云/VPC 环境中可为高）

- 注意：对小型独立项目而言重要性较低。当部署到局域网内或同一服务器上还有其他服务监听时最为重要。

要求：

* MUST 把对用户提供 URL 的出站请求视为高风险。
* SHOULD 对任何受用户影响的 URL 抓取校验并限制目标（主机/域名白名单）。
* SHOULD 阻止访问 localhost/私有 IP 段/链路本地地址和云元数据端点。
* MUST 把协议限制为 http/https。
* SHOULD 设置超时并严格控制重定向。([OWASP Cheat Sheet Series][23])

不安全模式：

* `httpx.get(request.query_params["url"])`
* 接受任意 URL 的“URL 预览/导入/webhook 测试器”功能。

检测提示：

* 搜索 URL 来自请求/数据库的 `requests`、`httpx`、`urllib`、`aiohttp` 调用。
* 识别名为 `fetch`、`preview`、`proxy`、`webhook`、`import` 的端点。

修复：

* 实现严格的 URL 解析 + 白名单；增加出口控制；设置短超时；非必需时禁用重定向。([OWASP Cheat Sheet Series][23])

---

### FASTAPI-REDIRECT-001：防止开放重定向

严重程度：低

要求：

* MUST 校验来自不可信输入的重定向目标（`next`、`redirect`、`return_to`）。
* SHOULD 优先只重定向到同站相对路径或域名白名单。([OWASP Cheat Sheet Series][24])

不安全模式：

* 返回 `RedirectResponse(next)` 而 `next` 用户可控且无校验。

检测提示：

* 搜索 `RedirectResponse(` 或重定向逻辑，检查目标来源。

修复：

* 只允许相对路径或白名单域名；失败时回退到安全默认值。([OWASP Cheat Sheet Series][24])

---

### FASTAPI-WS-001：WebSocket 端点 MUST 鉴权并防御跨站滥用

严重程度：中至高（取决于数据/特权）

要求：

* MUST 对任何非公开频道鉴权 WebSocket 连接（WebSocket 本身不提供鉴权）。([OWASP Cheat Sheet Series][25])
* SHOULD 对基于浏览器的 WebSocket 客户端实施适当的 origin/CSRF 类防护（Origin 校验是常用控制）。
* SHOULD 对消息频率和连接尝试做速率限制；关闭空闲/滥用连接。

不安全模式：

* `@app.websocket(...)` 接受并信任连接，无任何鉴权检查。
* 用查询字符串 token 做鉴权而不考虑泄露/轮换。

检测提示：

* 搜索 `@app.websocket` / `websocket_endpoint`，检查敏感操作前是否执行鉴权。
* 审查 origin 检查、token 解析和每连接授权。

修复：

* 在握手阶段要求鉴权（例如 token 或会话），并对操作/消息执行授权。
* 在合适场景为浏览器客户端校验 Origin；应用速率限制和超时。([OWASP Cheat Sheet Series][25])

---

### FASTAPI-SUPPLY-001：依赖与补丁卫生（聚焦安全相关依赖）

严重程度：低

要求：

* SHOULD 固定版本并定期更新安全关键依赖（FastAPI、Starlette、Uvicorn、Pydantic、python-multipart、鉴权/JWT 库）。
* MUST 及时响应已知安全通告。
* 由于历史 CVE，MUST 把文件服务和 multipart 解析相关依赖当作安全敏感。([advisories.gitlab.com][10])

审计关注点示例（历史）：

* Starlette StaticFiles 路径穿越（0.27.0 修复）。([advisories.gitlab.com][10])
* Starlette multipart/form-data DoS（0.40.0 修复）。([advisories.gitlab.com][9])
* Starlette FileResponse Range 头 DoS（0.49.1 修复）。([advisories.gitlab.com][19])

检测提示：

* 检查 `requirements.txt`、lockfile、容器镜像和运行环境中的实际安装版本。
* 把文件上传/文件服务功能与依赖版本对应起来。

修复：

* 按通告升级到已修复版本；围绕受影响行为补充回归测试。

---

## 5) 实用扫描启发式（如何“挖”）

主动扫描时，使用这些高信号模式：

* 开发服务器 / 调试：

  * `--reload`、`reload=True`、`debug=True`、`FastAPI(debug=True)` ([PyPI][4])
* OpenAPI/文档暴露：

  * `/docs`、`/redoc`、`/openapi.json`、`docs_url=`、`openapi_url=`
* 鉴权执行缺口：

  * 预期有鉴权的端点缺失 `Depends()`/`Security()`；没有一致依赖边界的路由器 ([FastAPI][7])
  * 查询参数中的 token（`token=`、`api_key=`、`key=`）([FastAPI][11])
* 会话/cookie + CSRF：

  * `SessionMiddleware(` 及 cookie 标志（`https_only`、`same_site`）([PyPI][5])
  * 使用 cookie 鉴权且无 CSRF 检查的 POST/PUT/PATCH/DELETE 处理器 ([OWASP Cheat Sheet Series][2])
* 输入校验与 mass assignment：

  * `await request.json()` 和直接用 dict 写数据库；模型接受多余字段 ([OWASP Cheat Sheet Series][14])
* 过度数据暴露：

  * 无 `response_model` 就返回 ORM 对象或 dict；响应包含 password/role/内部字段 ([FastAPI][15])
* CORS：

  * `CORSMiddleware` 配 `allow_origins=["*"]`、`allow_origin_regex=".*"`、`allow_credentials=True` ([OWASP Cheat Sheet Series][6])
* 文件：

  * `FileResponse(` 使用用户控制路径；`StaticFiles(` 暴露上传目录 ([advisories.gitlab.com][10])
* 上传 / multipart：

  * 无大小/字段约束的 `multipart/form-data` 端点；过时的 Starlette/python-multipart ([advisories.gitlab.com][9])
* 注入：

  * SQL 字符串用 f-string/拼接后传入 `.execute(...)` ([OWASP Cheat Sheet Series][21])
  * `subprocess.*`、`shell=True`、`os.system` ([OWASP Cheat Sheet Series][22])
* SSRF：

  * `httpx.get/post` 或 `requests.*` 使用来自请求/数据库的 URL，且无白名单/超时 ([OWASP Cheat Sheet Series][23])
* 重定向：

  * `RedirectResponse(next)` 无校验 ([OWASP Cheat Sheet Series][24])
* WebSocket：

  * 无鉴权/origin 检查的 `@app.websocket` 处理器；生产配置中使用 `ws://` ([FastAPI][27])

始终尝试确认：

* 数据来源（不可信 vs 可信）
* 汇点类型（SQL/subprocess/文件/模板/http/重定向/ws）
* 已有的防护措施（校验、白名单、中间件、边缘控制）
* 已安装依赖版本 vs 受影响版本区间 ([advisories.gitlab.com][10])

---

## 6) 参考资料（访问于 2026-01-27）

主要框架文档：

* FastAPI（PyPI 元数据、版本信息）— `https://pypi.org/project/fastapi/` ([PyPI][1])
* FastAPI 文档：安全“第一步”（Authorization Bearer 头约定）— `https://fastapi.tiangolo.com/tutorial/security/first-steps/` ([FastAPI][11])
* FastAPI 参考：依赖项（`Depends`、`Security`）— `https://fastapi.tiangolo.com/reference/dependencies/` ([FastAPI][7])
* FastAPI 参考：APIRouter（路由器级依赖）— `https://fastapi.tiangolo.com/reference/apirouter/` ([FastAPI][28])
* FastAPI 文档：WebSockets — `https://fastapi.tiangolo.com/advanced/websockets/` ([FastAPI][27])

ASGI/服务器栈文档：

* Starlette（PyPI、总体能力）— `https://pypi.org/project/starlette/` ([PyPI][5])
* Starlette 文档：WebSockets — `https://starlette.dev/websockets/` ([Starlette][3])
* Uvicorn（PyPI 元数据）— `https://pypi.org/project/uvicorn/` ([PyPI][4])
* Pydantic 文档（v2.12.x）— `https://docs.pydantic.dev/latest/` ([Pydantic][29])

安全标准与速查表：

* OWASP Cheat Sheet Series：会话管理 — `https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html` ([OWASP Cheat Sheet Series][8])
* OWASP Cheat Sheet Series：CSRF 防御 — `https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html` ([OWASP Cheat Sheet Series][2])
* OWASP Cheat Sheet Series：XSS 防御 — `https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html` ([OWASP Cheat Sheet Series][16])
* OWASP Cheat Sheet Series：Mass Assignment — `https://cheatsheetseries.owasp.org/cheatsheets/Mass_Assignment_Cheat_Sheet.html` ([OWASP Cheat Sheet Series][14])
* OWASP API Security Top 10（2023）— `https://owasp.org/API-Security/editions/2023/en/0x11-t10/` ([OWASP Foundation][13])
* OWASP Cheat Sheet Series：SQL 注入防御 — `https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html` ([OWASP Cheat Sheet Series][21])
* OWASP Cheat Sheet Series：操作系统命令注入防御 — `https://cheatsheetseries.owasp.org/cheatsheets/OS_Command_Injection_Defense_Cheat_Sheet.html` ([OWASP Cheat Sheet Series][22])
* OWASP Cheat Sheet Series：SSRF 防御 — `https://cheatsheetseries.owasp.org/cheatsheets/Server_Side_Request_Forgery_Prevention_Cheat_Sheet.html` ([OWASP Cheat Sheet Series][23])
* OWASP Cheat Sheet Series：文件上传 — `https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html` ([OWASP Cheat Sheet Series][20])
* OWASP Cheat Sheet Series：未校验的重定向与转发 — `https://cheatsheetseries.owasp.org/cheatsheets/Unvalidated_Redirects_and_Forwards_Cheat_Sheet.html` ([OWASP Cheat Sheet Series][24])
* OWASP Cheat Sheet Series：HTTP 安全响应头 — `https://cheatsheetseries.owasp.org/cheatsheets/HTTP_Headers_Cheat_Sheet.html` ([OWASP Cheat Sheet Series][6])
* OWASP Cheat Sheet Series：WebSocket 安全 — `https://cheatsheetseries.owasp.org/cheatsheets/WebSocket_Security_Cheat_Sheet.html` ([OWASP Cheat Sheet Series][25])
* OWASP WSTG：服务端模板注入测试 — `https://owasp.org/www-project-web-security-testing-guide/v41/4-Web_Application_Security_Testing/07-Input_Validation_Testing/18-Testing_for_Server_Side_Template_Injection` ([OWASP Foundation][17])
* OWASP WSTG：WebSocket 测试 — `https://owasp.org/www-project-web-security-testing-guide/latest/4-Web_Application_Security_Testing/11-Client-side_Testing/10-Testing_WebSockets` ([OWASP Foundation][26])

模板安全参考资料：

* Jinja：沙箱 — `https://jinja.palletsprojects.com/en/stable/sandbox/` ([jinja.palletsprojects.com][18])

供应链/通告参考资料选编（Starlette 示例）：

* CVE-2023-29159（StaticFiles 路径穿越；0.27.0 修复）— `https://advisories.gitlab.com/pkg/pypi/starlette/CVE-2023-29159/` ([advisories.gitlab.com][10])
* CVE-2024-47874（multipart/form-data DoS；0.40.0 修复）— `https://advisories.gitlab.com/pkg/pypi/starlette/CVE-2024-47874/` ([advisories.gitlab.com][9])
* CVE-2025-62727（FileResponse Range 头 DoS；0.49.1 修复）— `https://advisories.gitlab.com/pkg/pypi/starlette/CVE-2025-62727/` ([advisories.gitlab.com][19])

[1]: https://pypi.org/project/fastapi/ "https://pypi.org/project/fastapi/"
[2]: https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html "https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html"
[3]: https://starlette.dev/websockets/?utm_source=chatgpt.com "Websockets"
[4]: https://pypi.org/project/uvicorn/ "https://pypi.org/project/uvicorn/"
[5]: https://pypi.org/project/starlette/ "https://pypi.org/project/starlette/"
[6]: https://cheatsheetseries.owasp.org/cheatsheets/HTTP_Headers_Cheat_Sheet.html?utm_source=chatgpt.com "HTTP Security Response Headers Cheat Sheet"
[7]: https://fastapi.tiangolo.com/reference/dependencies/?utm_source=chatgpt.com "Dependencies - Depends() and Security() - FastAPI"
[8]: https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html "https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html"
[9]: https://advisories.gitlab.com/pkg/pypi/starlette/CVE-2024-47874/ "Starlette Denial of service (DoS) via multipart/form-data | GitLab Advisory Database"
[10]: https://advisories.gitlab.com/pkg/pypi/starlette/CVE-2023-29159/ "Starlette has Path Traversal vulnerability in StaticFiles | GitLab Advisory Database"
[11]: https://fastapi.tiangolo.com/tutorial/security/first-steps/?utm_source=chatgpt.com "Security - First Steps - FastAPI"
[12]: https://fastapi.tiangolo.com/tutorial/response-model/ "https://fastapi.tiangolo.com/tutorial/response-model/"
[13]: https://owasp.org/API-Security/editions/2023/en/0x11-t10/ "https://owasp.org/API-Security/editions/2023/en/0x11-t10/"
[14]: https://cheatsheetseries.owasp.org/cheatsheets/Mass_Assignment_Cheat_Sheet.html "https://cheatsheetseries.owasp.org/cheatsheets/Mass_Assignment_Cheat_Sheet.html"
[15]: https://fastapi.tiangolo.com/tutorial/extra-models/ "https://fastapi.tiangolo.com/tutorial/extra-models/"
[16]: https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html "https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html"
[17]: https://owasp.org/www-project-web-security-testing-guide/v41/4-Web_Application_Security_Testing/07-Input_Validation_Testing/18-Testing_for_Server_Side_Template_Injection?utm_source=chatgpt.com "Testing for Server Side Template Injection"
[18]: https://jinja.palletsprojects.com/en/stable/sandbox/?utm_source=chatgpt.com "Sandbox — Jinja Documentation (3.1.x)"
[19]: https://advisories.gitlab.com/pkg/pypi/starlette/CVE-2025-62727/ "Starlette vulnerable to O(n^2) DoS via Range header merging in ``starlette.responses.FileResponse`` | GitLab Advisory Database"
[20]: https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html "https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html"
[21]: https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html "https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html"
[22]: https://cheatsheetseries.owasp.org/cheatsheets/OS_Command_Injection_Defense_Cheat_Sheet.html "https://cheatsheetseries.owasp.org/cheatsheets/OS_Command_Injection_Defense_Cheat_Sheet.html"
[23]: https://cheatsheetseries.owasp.org/cheatsheets/Server_Side_Request_Forgery_Prevention_Cheat_Sheet.html "https://cheatsheetseries.owasp.org/cheatsheets/Server_Side_Request_Forgery_Prevention_Cheat_Sheet.html"
[24]: https://cheatsheetseries.owasp.org/cheatsheets/Unvalidated_Redirects_and_Forwards_Cheat_Sheet.html?utm_source=chatgpt.com "Unvalidated Redirects and Forwards Cheat Sheet"
[25]: https://cheatsheetseries.owasp.org/cheatsheets/WebSocket_Security_Cheat_Sheet.html?utm_source=chatgpt.com "WebSocket Security - OWASP Cheat Sheet Series"
[26]: https://owasp.org/www-project-web-security-testing-guide/latest/4-Web_Application_Security_Testing/11-Client-side_Testing/10-Testing_WebSockets?utm_source=chatgpt.com "WSTG - Latest | OWASP Foundation"
[27]: https://fastapi.tiangolo.com/advanced/websockets/?utm_source=chatgpt.com "WebSockets - FastAPI"
[28]: https://fastapi.tiangolo.com/reference/apirouter/?utm_source=chatgpt.com "APIRouter class - FastAPI"
[29]: https://docs.pydantic.dev/latest/ "https://docs.pydantic.dev/latest/"
