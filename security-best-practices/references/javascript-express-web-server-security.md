# Express（Node.js）Web 安全规范（Express 5.x / 4.19.2+、Node.js LTS）

本文档是一份**安全规范**，用于支持：

1. 为新 Express 应用和路由进行**默认安全的代码生成**。
2. 对既有 Express 代码进行**安全审查 / 漏洞挖掘**（被动式“边工作边注意问题”，以及主动式“扫描仓库并报告发现”）。

本文档有意写成一套**规范性要求**（“MUST/SHOULD/MAY”）加**审计规则**（坏模式长什么样、如何检测、如何修复/缓解）。

---

## 0) 安全、边界与反滥用约束（必须遵守）

* MUST NOT 请求、输出、记录或提交机密（API key、密码、私钥、会话机密、cookie、token）。
* MUST NOT 通过关闭防护来“修复”安全问题（例如削弱 cookie 标志、给 cookie 鉴权应用禁用 CSRF 防护、启用宽松 CORS、信任来自公网的代理头、在生产开启调试/堆栈跟踪、没有替代方案就关闭 TLS）。
* MUST 在审计中给出**基于证据的发现**：引用能支撑结论的文件路径、代码片段、中间件/配置值和运行时假设。
* MUST 诚实对待不确定性：如果某项防护可能存在于基础设施层（反向代理、网关、WAF、CDN），应报告为“应用代码中不可见；需在运行时/配置中核实。”
* MUST 优先使用经过审查的库和平台控制，而不是“自己造”加密/鉴权/会话/CSRF。Express 明确期望应用自己正确校验/处理用户输入；它不会自动完成这些。([Express][1])

---

## 1) 工作模式

### 1.1 生成模式（默认）

当被要求编写新 Express 代码或修改既有代码时：

* MUST 遵循本规范中的每一条 **MUST** 要求。
* SHOULD 遵循每一条 **SHOULD** 要求，除非用户明确另有指示。
* MUST 优先使用默认安全的 API 和经过验证的库，而不是自研安全代码。
* MUST 避免引入新的危险汇点（sink）（执行 shell、动态代码求值、不安全重定向、把用户文件当 HTML 提供、用不可信字符串渲染模板、不安全文件系统路径、可 SSRF 的 URL 抓取端点等）。

### 1.2 被动审查模式（编辑期间始终开启）

在 Express 仓库的任何位置工作时（即使用户没有要求安全扫描）：

* MUST “注意”所触及/邻近代码中违反本规范的地方。
* SHOULD 在问题出现时提及，并附简要说明 + 安全的修复方式。

### 1.3 主动审计模式（明确要求扫描时）

当用户要求“扫描”、“审计”或“挖漏洞”时：

* MUST 系统性地在代码库中搜索违反本规范的地方。
* MUST 以结构化格式输出发现（见 §2.3）。

推荐审计顺序：

1. 入口（服务器/应用引导）、部署清单、Dockerfile、进程管理器配置、CI/CD。
2. Express 设置 + 中间件栈顺序（helmet、解析器、鉴权、会话、CSRF、CORS）。
3. 代理信任（`trust proxy`）与 IP/协议/主机处理。([Express][2])
4. 鉴权流程、会话、cookie、密码重置链接、重定向处理。([Express][1])
5. 改状态路由 + CSRF 防护（cookie 鉴权应用）。([OWASP Cheat Sheet Series][3])
6. 模板渲染与 XSS 防御（HTML 生成、CSP、`res.locals`）。([OWASP Cheat Sheet Series][4])
7. 文件处理（上传 + 下载 + 静态文件）与路径穿越。([Express][5])
8. 注入类（SQL、NoSQL、命令执行、不安全反序列化）。([OWASP Cheat Sheet Series][6])
9. 出站请求（SSRF）与 webhook/回调投递。([OWASP Cheat Sheet Series][7])
10. 速率限制 / 暴力破解防御 / 滥用控制。([Express][1])
11. 依赖卫生 / lockfile / npm audit / 存在漏洞的 Express 版本。([Express][1])

---

## 2) 定义与审查指引

### 2.1 不可信输入（除非证明否则按攻击者可控处理）

在 Express 中，常见不可信输入包括：

* `req.params`（路由参数）
* `req.query`（查询字符串参数；依解析设置不同可能是字符串/数组/对象）([OWASP Cheat Sheet Series][8])
* 来自 `express.json()`、`express.urlencoded()`、`express.text()`、`express.raw()` 的 `req.body` ([Express][5])
* `req.headers` / `req.get(...)`
* `req.cookies` / `req.signedCookies`（如果使用了 cookie 解析中间件）
* 上传元数据和文件名（例如 multer 的 `file.originalname`、`file.mimetype`）
* 来自外部系统的任何数据（webhook、第三方 API、消息队列）
* 任何源自用户的持久化内容（数据库行）

关于代理的特别说明：

* 如果启用了 `trust proxy`，`req.ip`、`req.hostname`、`req.protocol` 等值可能派生自 `X-Forwarded-*` 头；如果你的代理链没有正确覆写/移除它们，这些值**可能被攻击者控制**。([Express][2])

### 2.2 改状态请求

如果请求能够创建/更新/删除数据、改变鉴权/会话状态、触发副作用（购买、发送邮件、发送 webhook）或发起特权操作，则该请求属于改状态请求。

### 2.3 要求的审计发现格式

对每个发现的问题，输出：

* 规则 ID：
* 严重程度：严重（Critical）/ 高（High）/ 中（Medium）/ 低（Low）
* 位置：文件路径 + 函数/路由/中间件名 + 行号
* 证据：确切的代码/配置片段
* 影响：可能出什么问题、谁能够利用
* 修复：安全的改动（优先最小 diff）
* 缓解：当立即修复困难时的纵深防御措施
* 误报说明：不确定时需要核实什么

---

## 3) 安全基线：最低生产配置（生产环境 MUST）

这是能防止常见 Express 配置错误的“最小生产基线”。

最低基线目标：

* 使用并配置 `helmet()`（尤其是适用的 CSP），并降低指纹特征（禁用 `x-powered-by`）。([Express][1])
* 存在自定义 404 处理器和自定义错误处理器，且生产环境不泄露内部堆栈跟踪。([Express][1])
* cookie/会话的使用是有意识的：

  * 不使用默认会话 cookie 名
  * cookie 按需使用安全属性（`Secure`、`HttpOnly`、`SameSite`）
  * 基于 cookie 的会话绝不存机密（客户端可读）
  * 服务端会话在生产环境绝不使用 MemoryStore。([Express][1])
* 请求体解析有显式限制（`express.json({ limit })`、`express.urlencoded({ limit, parameterLimit, depth })`）。([Express][5])
* `trust proxy` 被显式配置以匹配你的代理拓扑；不要盲目设 `true`。([Express][2])
* 登录/鉴权端点有暴力破解防护和速率限制。([Express][1])
* 依赖定期审计/更新（`npm audit` + 通告响应）。([Express][1])

---

## 4) 规则（生成 + 审计）

每条规则包含：要求的做法、不安全模式、检测提示与修复方法。

### EXPRESS-INPUT-001：把所有用户输入当作不可信并加以校验

严重程度：高

要求：

* MUST 在把不可信输入用于安全敏感逻辑或危险汇点（数据库查询、重定向、文件系统、HTML 输出、shell 命令）之前校验并规范化。确保不可信输入在使用或继续传递前经过类型检查和结构检查。
* SHOULD 在可行时使用白名单（已知良好值）而不是黑名单。
* MUST 拒绝或安全处理 `req.query`、`req.params`、`req.body` 中意外的类型/形状。

不安全模式：

* 把 `req.query`、`req.params`、`req.body` 直接传入数据库/查询构造器、重定向、文件系统路径或模板。
* 假设 `req.query.foo` 一定是字符串（依解析设置可能是数组/对象）。([OWASP Cheat Sheet Series][8])

检测提示：

* 识别“不可信输入到汇点”的流：请求 → 汇点（`res.redirect`、SQL 执行、`sendFile`、`child_process`、模板渲染、出站 fetch）。
* 搜索敏感调用中直接使用 `req.query.*`、`req.body.*`、`req.params.*` 的地方。

修复：

* 在路由边界增加 schema 校验（例如 zod/joi/express-validator）。
* 规范化类型（例如把 ID 强制为整数；期望标量时拒绝数组）。

注意：

* Express 生产安全指引明确说明输入校验/处理是应用自己的责任。([Express][1])

---

### EXPRESS-REDIRECT-001：防止开放重定向；校验重定向目标

严重程度：中

要求：

* MUST 校验来自不可信输入的重定向目的地（`next`、`return_to`、`url`）。
* SHOULD 只允许同站相对路径（推荐）或严格的域名白名单。
* MUST 校验失败时回退到安全默认值。

不安全模式：

* `res.redirect(req.query.next)` 且不校验。
* `res.redirect(req.body.url)` 或使用不可信 URL 的 `res.location(...)`。

检测提示：

* 搜索 `res.redirect(` 和 `res.location(` 并追踪目标来源。
* 查找名为 `next`、`redirect`、`return`、`url` 的查询参数。

修复：

* 只允许相对路径（以 `/` 开头），禁止 `//`、反斜杠和编码变体。
* 如果需要跨域重定向，白名单精确主机并强制 `https`。

注意：

* Express 文档把开放重定向列为危险的用户输入，并展示了重定向前校验主机的做法。([Express][1])
* 保持 Express 更新：Express 曾有影响部分版本的开放重定向相关 CVE，升级是缓解态势的一部分。([NVD][9])

---

### EXPRESS-HEADERS-001：使用 Helmet（或等价物）设置必要的安全响应头

严重程度：中

要求：

* SHOULD 使用 `helmet()` 设置常见安全响应头。
* SHOULD 为渲染受用户影响内容的页面现实地配置 CSP（尽量避免 `unsafe-inline`）。
* SHOULD 设置 `X-Content-Type-Options: nosniff`、点击劫持防御（`X-Frame-Options` 或 CSP `frame-ancestors`）和合适的 referrer 策略。

注意：最重要的是设置 CSP 的 script-src。其他指令重要性较低，为便于开发通常可以省略。

不安全模式：

* 应用代码没有设置任何安全响应头，也没有证据表明边缘有设置。
* 展示用户内容的应用缺少 CSP。
* 框架相关响应头配置错误，无意中允许点击劫持。

检测提示：

* 搜索 `helmet(` 的使用；检查 CSP 是否被配置或禁用。
* 搜索设置安全响应头的 `res.setHeader(` / `res.set(`。
* 若应用代码中不可见，检查 nginx/CDN 配置；否则标记“需在边缘核实。”

修复：

* 把 `helmet()` 加在中间件顺序靠前的位置并配置：

  * CSP（`contentSecurityPolicy`）
  * 框架防护（`frameguard` 或 CSP `frame-ancestors`）
  * `X-Content-Type-Options`（`noSniff`）

注意：

* Express 生产安全最佳实践推荐 Helmet，并列出 Helmet 默认设置的响应头。([Express][1])
* OWASP HTTP 头指引是调整策略时的有用参考。([OWASP Cheat Sheet Series][10])

---

### EXPRESS-FINGERPRINT-001：通过禁用 `x-powered-by` 和自定义错误/404 响应来降低指纹特征

严重程度：低（纵深防御）

要求：

* SHOULD 使用 `app.disable('x-powered-by')` 禁用 `X-Powered-By`。
* SHOULD 提供自定义 404 处理器和自定义错误处理器，以避免独特的默认响应并控制信息泄露。

不安全模式：

* 默认的 `X-Powered-By: Express` 头保持启用。
* 生产环境使用可识别格式的默认 Express 404/错误响应和/或堆栈跟踪。

检测提示：

* 搜索 `app.disable('x-powered-by')`。
* 检查中间件尾部是否有自定义 404（`app.use((req,res)=>...)`）和自定义错误处理器（`app.use((err,req,res,next)=>...)`）。
* 检查 `NODE_ENV` 是否为生产行为正确设置（见 EXPRESS-ERROR-001）。([Express][11])

修复：

* 添加：

  * `app.disable('x-powered-by')`
  * 自定义 404 处理器
  * 服务端记录细节、客户端返回通用消息的自定义错误处理器

注意：

* Express 文档明确建议禁用 `x-powered-by` 并添加自己的 not-found 和错误处理器。([Express][1])

---

### EXPRESS-COOKIE-001：cookie 必须使用安全属性和最小作用域

严重程度：中

要求：

* MUST 为任何鉴权/会话 cookie 恰当设置 cookie 标志：

  * HTTPS（生产）时设置 `Secure` 重要提示：仅在已配置 TLS 的生产环境中才设置 `Secure`。在通过 HTTP 运行的本地开发环境中，不要给 cookie 设置 `Secure` 属性。应根据应用是否运行在生产模式来条件化处理。还应提供一个类似 `SESSION_COOKIE_SECURE` 的属性，以便在通过 HTTP 测试时能禁用 `Secure` cookie。
  * 鉴权/会话 cookie 设置 `HttpOnly`
  * 有意识地设置 `SameSite`（`Lax` 是常见基线；兼容时用 `Strict`；`None` 只能搭配 `Secure` 且有正当跨站需求）
* SHOULD 避免把 `domain` 设得过宽（除非必需，避免“所有子域”）。
* SHOULD 按风险和 UX 设置有上限的过期时间。

不安全模式：

* 鉴权/会话 cookie 没有 `HttpOnly`。
* 生产 HTTPS 下 cookie 没有 `Secure`。
* `SameSite=None` + cookie 鉴权的改状态端点却没有 CSRF 防护。

检测提示：

* 搜索 `res.cookie(`、`Set-Cookie`、`cookie: { ... }`、`express-session`、`cookie-session`。
* 核实会话中间件配置中的 cookie 标志。

修复：

* 在会话/cookie 中间件配置中集中设置这些属性。

注意：

* Express 生产安全指引列出了 cookie 安全选项（`secure`、`httpOnly` 等）。([Express][1])
* `res.cookie()` 最终按选项设置 `Set-Cookie`；省略选项时默认遵循 RFC 6265 行为。([Express][5])
* OWASP 会话管理指引对选择标志和生命周期有参考价值。([OWASP Cheat Sheet Series][12])

---

### EXPRESS-SESS-001：不要使用默认会话 cookie 名；避免会话指纹特征

严重程度：低（纵深防御）

要求：

* SHOULD 覆盖默认会话 cookie 名（例如使用 `express-session` 时不要保留 `connect.sid`）。
* SHOULD 使用通用名称（例如 `sessionId`），除非有兼容性原因。

不安全模式：

* 使用 `express-session` 却没配置 `name:`（默认 cookie 名）。
* 同一域上的多个应用意外共用 cookie 名。

检测提示：

* 搜索 `express-session` 配置块；检查 `name:`。

修复：

* 在 `express-session` 选项中设置 `name: 'sessionId'`（或类似值）。

注意：

* Express 文档明确建议不使用默认会话 cookie 名以降低指纹特征。([Express][1])

---

### EXPRESS-SESS-002：会话存储与生命周期必须生产安全

严重程度：高

要求：

* MUST NOT 在生产环境使用 `MemoryStore`（它不是为生产使用设计的）。
* MUST 把会话机密保存在版本控制之外并安全轮换。
* SHOULD 在登录/权限变更时重新生成会话，以降低会话固定风险。
* MUST NOT 把敏感机密存进客户端可读的 cookie 会话。

不安全模式：

* `app.use(session({ store: new MemoryStore(), ... }))` 或缺少 store（默认 MemoryStore）。
* 仓库中硬编码例如：`secret: 'keyboard cat'` / `secret: 's3Cur3'`。
* 用 `cookie-session` 存访问 token、刷新 token 或 PII。

检测提示：

* 搜索 `express-session` 并查找 `MemoryStore` 用法或缺失 `store`。
* 在会话配置中搜索 `secret:` 并检查是否硬编码。
* 查找 `req.session = ...` 模式以及是否存了敏感数据。

修复：

* 使用生产级会话存储（Redis、数据库后端等）。
* 从环境变量/密钥管理器加载机密。
* 登录时：`req.session.regenerate(...)` 或等价流程，并安全重绑定权限。

注意：

* `express-session` 明确警告 `MemoryStore` 不为生产设计。([Express][1])
* `express-session` 文档说明了轮换机密和重新生成会话以防固定。([Express][1])
* Express 说明基于 cookie 的会话会把数据序列化进 cookie，且 cookie 数据对客户端可见；保持小体积且不含机密。([Express][1])

---

### EXPRESS-CSRF-001：cookie 鉴权的改状态请求 MUST 有 CSRF 防护

严重程度：高

- 重要提示：如果不使用 cookie 做鉴权（即鉴权通过 Authentication 头或其他传递的 token 完成），则不存在 CSRF 风险。

要求：

* MUST 保护所有依赖 cookie 鉴权的改状态端点（POST/PUT/PATCH/DELETE）。
* SHOULD 使用广为人知的 CSRF 缓解手段（基于 token 是典型基线）。
* MAY 增加纵深防御：Origin/Referer 校验、Fetch Metadata 强制、SameSite cookie、XHR/fetch 的自定义头要求——**但除非经过明确设计和论证，不要把这些当成完全替代品**。
* 如果基于表单的 CRSF token 不切实际，MUST 至少要求一个自定义 HTTP 头，这是第二强的做法。

重要提示：

* 如果鉴权经 `Authorization: Bearer ...` 头（而非 cookie）完成，经典的浏览器 CSRF 通常不适用； 

不安全模式：

* 使用 cookie 鉴权却没有任何 CSRF 防护的改状态端点。
* 用 GET 执行改状态操作（放大 CSRF 风险）。
* 只检查一个用户可控字段的“CSRF 防护”。

检测提示：

* 枚举非 GET/HEAD 方法的路由，判断鉴权是否由 cookie 门控。
* 查看 CSRF 中间件和 token 检查的有无。
* 也要检查 JSON API，而不只是 HTML 表单。

修复：

* 为 cookie 鉴权流程实现 CSRF token。
* 在可行处增加 Origin/Referer 检查，并确保正确设置 SameSite。

注意：

* OWASP CSRF 指引和 OWASP Node.js 指引都推荐把反 CSRF token 作为 Web 应用的标准控制。([OWASP Cheat Sheet Series][3])

---

### EXPRESS-CORS-001：CORS 必须显式声明并遵循最小权限

严重程度：中（若与凭据搭配配置错误则为高）

要求：

* 如果不需要 CORS，MUST 保持禁用。
* 如果需要 CORS：

  * MUST 对受信来源做白名单（未经校验不要反射任意 `Origin`）。
  * MUST NOT 把宽松来源与带凭据 cookie（`Access-Control-Allow-Credentials: true`）组合。
  * SHOULD 把方法、头和暴露的头限制到必需范围。

不安全模式：

* `Access-Control-Allow-Origin: *` 搭配 `Access-Control-Allow-Credentials: true`。
* 对所有请求反射 `Origin` 而无白名单校验。
* 只有部分路由需要跨源访问却全局应用宽松 CORS 中间件。

检测提示：

* 搜索 `cors(`、`Access-Control-Allow-Origin`、`Access-Control-Allow-Credentials`。
* 检查跨源暴露的端点是否用 cookie 鉴权。

修复：

* 实现严格来源白名单，确保只为预期来源开启带凭据请求。
* 考虑按路由组拆分 CORS 配置，而不是全局设置。

注意：

* OWASP HTTP 头指引涵盖了响应头的安全影响（包括影响浏览器行为的头）；审查响应头态势时可作参考。([OWASP Cheat Sheet Series][10])

---

### EXPRESS-PROXY-001：反向代理信任（`trust proxy`）必须配置正确

严重程度：中（使用基于 IP 的鉴权时为高）

要求：

* 如果部署在反向代理/LB 之后，MUST 配置 `app.set('trust proxy', ...)` 以匹配真实的代理链。
* MUST NOT 盲目设置 `trust proxy = true`，除非你完全控制代理行为和头改写。
* MUST 确保最后一个受信代理覆写/移除 `X-Forwarded-For`、`X-Forwarded-Host` 和 `X-Forwarded-Proto`，使客户端无法伪造。

不安全模式：

* 直接暴露公网或位于未知代理之后的应用设置 `app.set('trust proxy', true)`。
* 在代理信任配置不正确的情况下用 `req.ip`、`req.protocol`、`req.hostname` 做安全决策。
* 以 `req.ip` 为键做速率限制而 forwarded 头可被伪造。

检测提示：

* 搜索 `app.set('trust proxy'`。
* 检查基础设施文档（nginx/LB）中的头改写行为。
* 识别使用 `req.ip`、`req.ips`、`req.protocol`、`req.hostname` 的安全逻辑。

修复：

* 把 `trust proxy` 设为跳数、显式 IP/子网列表，或匹配你网络的自定义函数。
* 确保代理覆写 forwarded 头。

注意：

* Express 明确警告：当 `trust proxy` 为 `true` 时客户端 IP 派生自 `X-Forwarded-For`，如果代理不覆写 forwarded 头，客户端可以提供任意值。它还说明启用 trust proxy 会影响派生自 forwarded 头的 `req.hostname` 和 `req.protocol`。([Express][2])

---

### EXPRESS-BODY-001：请求体大小与解析限制 MUST 设置得当

严重程度：低

要求：

* SHOULD 为以下对象设置显式请求体大小限制：

  * `express.json({ limit })`
  * `express.urlencoded({ limit, parameterLimit, depth })`
* SHOULD 只启用需要的解析器；不要默认为所有路由解析大请求体。
* SHOULD 在反向代理 / 网关层执行额外限制。

不安全模式：

* 没有显式请求体限制（接受任意大的 JSON/urlencoded）。
* 只有部分路由需要请求体却对所有路由应用全局解析器。
* 没有正当理由就把 `parameterLimit` 设得很高（DoS 风险）。

检测提示：

* 搜索 `express.json(` 并确认设置了 `limit`（或有意识地接受）。
* 搜索 `express.urlencoded(` 并检查 `limit`、`parameterLimit`、`depth`。
* 审查上传/webhook 端点的特殊解析需求。

修复：

* 以保守默认值配置解析器，需要时按路由组覆盖。

注意：

* Express 文档说明了 `express.json` 选项（包括 `limit`，默认 100kb），并明确指出 `req.body` 不可信、应予校验。([Express][5])
* Express 文档说明了 `express.urlencoded` 选项，包括 `limit`、`parameterLimit`、`depth`。([Express][5])
* OWASP Node.js 指引也建议设置请求大小限制。([OWASP Cheat Sheet Series][8])

---

### EXPRESS-INPUT-002：防止 `req.query` 中的 HTTP 参数污染与类型混淆

严重程度：中

要求：

* MUST 把 `req.query` 的值当作潜在多值（数组/对象）对待，取决于查询解析设置。
* SHOULD 对安全敏感字段拒绝含糊的多值参数（例如 `role`、`isAdmin`、`redirect`、`amount`、`userId`）。
* 如果参数污染是关注点，SHOULD 考虑显式解析或专用中间件。

不安全模式：

* `if (req.query.admin) { ... }` 没有类型检查（数组/对象可能被强转为真值）。
* 把 `req.query` 直接传进 ORM/NoSQL 查询对象。

检测提示：

* 搜索对 `req.query.*` 做安全敏感比较却没有类型强制的代码。
* 查找假设查询参数是字符串的代码。

修复：

* 校验形状：对特定参数强制仅字符串并拒绝数组/对象。
* 在适用且有文档的场景规范化查询解析设置（simple vs extended）。

注意：

* OWASP Node.js 速查表明确指出 Express 的查询解析可能产生字符串、数组或对象，并建议防止 HTTP 参数污染。([OWASP Cheat Sheet Series][8])

---

### EXPRESS-XSS-001：防止 HTML 响应与模板中的反射型/存储型 XSS

严重程度：高

要求：

* MUST 在 HTML 输出中转义不可信内容（模板应默认自动转义；不要绕过）。
* MUST NOT 未经转义/净化就把不可信字符串注入 HTML。
* SHOULD 为渲染用户控制内容的应用设置 CSP（经 Helmet）。
* SHOULD 保持 `res.locals` 不含用于模板的用户控制输入，除非已校验/转义。

不安全模式：

* `res.send("<div>" + req.query.q + "</div>")`
* 经模板的“safe”标志/过滤器传递不可信 HTML。
* 把不可信字符串写进 `res.locals` 然后不经转义渲染。

检测提示：

* 搜索字符串含用户输入的 `res.send(`。
* 搜索模板的“safe”标志（因引擎而异）并追踪数据来源。
* 搜索对 `res.locals` 的赋值，以及它们是否可能含不可信数据。

修复：

* 使用带自动转义的模板引擎；只传经过校验的数据。
* 对必须含 HTML 的富文本，使用可信净化器和白名单策略。
* 增加指令现实的 CSP。

注意：

* Express API 文档明确警告 `res.locals` “不应包含用户控制的输入”，它常用于向模板暴露 CSRF token 之类的值。([Express][5])
* OWASP XSS 防御指引提供了标准的输出编码与策略建议。([OWASP Cheat Sheet Series][4])
* Helmet 可以经 CSP 等头缓解部分 XSS 类别。([Express][1])

---

### EXPRESS-TEMPLATE-001：绝不渲染不可信模板或模板路径（SSTI / LFI 风险）

严重程度：严重（若能证明模板字符串/路径由用户/攻击者控制）

要求：

* MUST NOT 渲染内容或模板路径/名称受不可信输入影响的模板。
* MUST NOT 从用户控制的文件系统位置加载模板。
* SHOULD 把“邮件模板编辑器”、“主题引擎”、“类 CMS 模板存储”视为需要沙箱和隔离的高风险设计。

不安全模式：

* `res.render(req.query.view, data)` 而 `view` 不在白名单内。
* 从包含用户输入的字符串渲染模板（因引擎而异）。
* 从上传目录加载模板。

检测提示：

* 搜索第一个参数来自请求/数据库且无白名单的 `res.render(`。
* 搜索由用户内容喂入的模板编译 API（因引擎而异）。

修复：

* 使用白名单内的模板名和固定的模板目录。
* 如果确需用户自定义模板，实现严格沙箱并隔离执行。

注意：

* Express 的模板系统取决于所选引擎；如果用户输入影响模板选择或来源，应假定不安全。

---

### EXPRESS-FILES-001：防止路径穿越与不安全的文件服务（sendFile/download）

严重程度：高

要求：

* MUST NOT 把用户控制的文件系统路径直接传给 `res.sendFile()` / `res.download()` / 文件系统 API。
* SHOULD 在从目录提供用户选择的文件时，使用带固定 `root` 和严格选项（例如拒绝 dotfiles）的 `res.sendFile`。
* MUST 在提供用户特定文件之前执行授权检查。

不安全模式：

* `res.sendFile(req.query.path)` 或 `res.download(req.params.file)` 没有 root 限制。
* 接受 `..` 片段、编码穿越或绝对路径的文件服务路由。

检测提示：

* 搜索 `res.sendFile(` 并追踪 `path` 参数来源。
* 搜索 `res.download(` 并追踪 `path` 参数来源。
* 查找对来自请求的路径使用 `fs.readFile`/`createReadStream` 的代码。

修复：

* 使用服务端存储（数据库）的标识符到路径映射，而不是客户端的原始路径。
* 在合适场景使用 `root: <trusted_base_dir>` 和 `dotfiles: 'deny'`；严格校验文件名部分。

注意：

* Express 的 `res.sendFile` 文档展示了使用 `root` 选项和 `dotfiles: 'deny'` 作为安全服务配置的一部分。([Express][5])
* `res.download` 以附件形式传输文件，但你仍必须控制/校验底层 `path`。([Express][5])

---

### EXPRESS-STATIC-001：加固 `express.static` / serve-static，绝不把不可信上传当活动内容提供

严重程度：中（如果对外提供不可信用户文件且对文件扩展名没有强健限制）

要求：

* MUST NOT 把用户上传内容从公共静态目录当活动内容提供（尤其是 HTML/JS/SVG），除非明确有意且已沙箱化。如果确定内容无活动性（png、jpg 等图片），则可能安全。在提供图片前校验其扩展名在白名单内可能是个好做法。
* SHOULD 把静态服务配置为：

  * 拒绝/忽略 dotfiles
  * 非必需时不产生意外的目录索引
  * 对不可变资源施加合适的缓存控制

不安全模式：

* 用户可以上传任意文件的 `app.use(express.static('uploads'))`。
* 从与应用相同的源内联提供上传的 HTML 或 SVG。

检测提示：

* 搜索 `express.static(` 并识别被服务的目录。
* 对比被服务目录与上传存储位置。
* 检查静态中间件中的 `dotfiles` 和 `index` 选项。

修复：

* 把上传内容存在任何静态 Web 根之外，经受控路由提供服务，并在合适时设置安全的 `Content-Type` 和 `Content-Disposition: attachment`。
* 配置 `express.static(root, { dotfiles: 'deny'|'ignore', index: false (如需) })`。

注意：

* Express 文档说明了 `express.static` 选项，包括 `dotfiles` 行为和 `index`。([Express][5])

---

### EXPRESS-UPLOAD-001：文件上传必须校验、安全存储并安全提供

严重程度：低 - 中

要求：

* SHOULD 执行上传大小限制（应用 + 边缘）。
* MUST 使用白名单和内容检查校验文件类型（不能只看文件名扩展名）。
* MUST 尽可能把上传内容存放在可执行/静态根目录之外。
* SHOULD 在服务端生成文件名（随机 ID）；不要信任原始文件名。
* MUST 安全地提供可能有活动内容的格式（下载附件），除非明确有此意图。

不安全模式：

* 接受任意文件类型并以内联方式回传。
* 把 `file.originalname` 用作存储路径。
* 缺少大小/类型校验。

检测提示：

* 查找 multer/busboy/formidable 的使用并检查 `limits`。
* 检查上传文件的写入位置和提供方式。
* 检查上传内容是否最终落在 `public/` 或任何 `express.static` 根目录下。

修复：

* 按 OWASP 上传指引实现白名单校验 + 安全存储 + 安全提供。

注意：

* OWASP File Upload 指引覆盖了白名单、内容校验、存储和安全提供模式。([OWASP Cheat Sheet Series][13])

---

### EXPRESS-INJECT-001：防止 SQL 注入（使用参数化查询 / ORM）

严重程度：高

要求：

* MUST 使用参数化查询或底层做了参数化的 ORM/查询构造器。
* MUST NOT 用字符串拼接/模板字面量配合不可信输入构造 SQL。

不安全模式：

* ``db.query(`SELECT * FROM users WHERE id = ${req.query.id}`)``
* `"SELECT ... WHERE name = '" + req.body.name + "'"`

检测提示：

* 在 JS/TS 中搜索 `SELECT`、`INSERT`、`UPDATE`、`DELETE` 字符串。
* 追踪不可信输入是否进入 `.query(...)`、`.execute(...)` 或原始 SQL API。

修复：

* 替换为参数化查询（占位符）或 ORM 查询 API。
* 查询前校验类型（例如整数 ID）。

注意：

* OWASP SQL 注入防御指引强烈推荐参数化查询。([OWASP Cheat Sheet Series][6])

---

### EXPRESS-INJECT-002：防止 NoSQL 注入 / 操作符注入（Mongo 类）

严重程度：高（取决于应用）

要求：

* MUST 对任何由不可信输入构造的查询对象校验类型和 schema。
* 如果用户输入被合并进查询对象，MUST 防止操作符注入（例如 `$ne`、`$gt`、`$where`）。
* SHOULD 在合适场景考虑防御性库/中间件。

不安全模式：

* `collection.find(req.body)` 而 body 攻击者可控。
* 把 `req.query`/`req.body` 合并进 Mongo 查询而没有 schema 校验。

检测提示：

* 搜索参数来自请求的 `find(`、`findOne(`、`aggregate(` 调用。
* 检查形如 `{ ...req.query }` 或 `Object.assign(query, req.body)` 的模式。

修复：

* 在边界做 schema 校验；只用经过校验的字段显式构造查询对象。

注意：

* OWASP Node.js 速查表讨论了输入校验，并提到 NoSQL 场景中常用的净化模块。([OWASP Cheat Sheet Series][8])

---

### EXPRESS-CMD-001：防止操作系统命令注入（child_process）

严重程度：严重至高（取决于暴露面），请证明其由用户/攻击者控制

要求：

* MUST 避免用不可信输入执行 shell 命令。
* 如果必须使用 subprocess：

  * MUST 避免对受攻击者影响的字符串使用 `exec()` / `execSync()`
  * MUST NOT 对受攻击者影响的数据使用 `shell: true`
  * SHOULD 使用带参数数组和严格白名单的 `spawn()`。确保可执行文件是硬编码或在白名单内的，不要使用用户提供的命令名。
  * SHOULD 在子命令支持时把用户控制的值放在 `--` 之后，以避免开关注入

不安全模式：

* `exec(req.query.cmd)`
* `exec(`convert ${userPath} ...`)`
* `spawn('sh', ['-c', userString])`
* `spawn(userString, ['foo'])`

检测提示：

* 搜索 `child_process`、`exec(`、`execSync(`、`spawn(`、`fork(`。
* 追踪请求/数据库数据是否进入命令构造。

修复：

* 可能的话，用 JavaScript 或库实现该功能，而不是 subprocess。
* 无法避免时，硬编码命令并严格白名单参数。

注意：

* OWASP 操作系统命令注入防御指引覆盖了避免 shell 和白名单模式。([OWASP Cheat Sheet Series][14])

---

### EXPRESS-SSRF-001：防止出站 HTTP 中的服务端请求伪造（SSRF）

严重程度：中（云/局域网部署中为高）

注意：这条主要只适用于部署在云/局域网环境、或同一台机器上还有其他 http 服务的应用。有时功能本身不可避免地需要该能力（webhook）。

要求：

* 如果存在其他可达的私有 http 端点，MUST 把对用户提供 URL 的出站请求视为高风险。
* SHOULD 对任何受用户影响的 URL 抓取校验并限制目标（主机/域名白名单）。
* SHOULD 阻止访问：

  * localhost / 私有 IP 段 / 链路本地地址
  * 云元数据端点
* MUST 把 URL 抓取功能限制为仅 `http`/`https`（以避免 `file:`、`javascript:` 等 scheme）
* SHOULD 设置超时并限制重定向。

不安全模式：

* `fetch(req.query.url)`
* 接受任意 URL 的“URL 预览” / “从 URL 导入”端点。

检测提示：

* 搜索 URL 来自用户/数据库的 `fetch(`、`axios(`、`got(`、`request(`、`node-fetch` 用法。
* 审查 webhook 测试器、预览器、图片抓取器。

修复：

* 强制 scheme 白名单、主机白名单、DNS/IP 解析检查、超时和重定向策略。
* 考虑在基础设施层做网络出口控制。

注意：

* OWASP SSRF 防御指引提供了标准控制和常见陷阱。([OWASP Cheat Sheet Series][7])

---

### EXPRESS-ERROR-001：错误处理 MUST 不在生产环境泄露敏感细节

严重程度：低

要求：

* SHOULD 在中间件末尾定义集中式错误处理器（`app.use((err, req, res, next) => ...)`）。
* MUST 避免在生产环境向客户端返回堆栈跟踪、内部错误消息或机密。
* SHOULD 在服务端记录错误并适当脱敏。
* SHOULD 确保应用以生产设置运行，使默认行为不泄露细节。
* MUST 避免在生产环境的错误消息中记录或返回机密、环境变量、会话、cookie 等敏感信息。

不安全模式：

* 向客户端返回 `err.stack`。
* 在生产环境使用仅开发用的错误中间件。
* `NODE_ENV` 保持 development，导致冗长的错误响应。

检测提示：

* 核实存在最终的错误处理中间件。
* 搜索 `res.status(500).send(err)` 或类似写法。
* 检查生产环境变量和启动脚本。

修复：

* 增加生产安全的错误处理器：返回通用消息并在内部记录细节。
* 确保环境按生产行为配置。

注意：

* Express 生产安全指引推荐自定义错误处理。([Express][1])
* Express 错误处理文档描述了默认错误处理器行为，以及生产模式如何影响暴露内容。([Express][11])

---

### EXPRESS-AUTH-001：防止针对鉴权端点的暴力破解

严重程度：中

注意：这一点高度依赖应用本身；提醒用户注意是好的，但没有额外复杂配置很难修复。建议先告知用户，如果他们要求帮助实现方案，再引导他们了解可能的解决办法。

要求：

* SHOULD 保护登录/鉴权端点免受暴力破解。
* SHOULD 按以下维度限速：

  1. 每个用户名+IP 的连续失败次数
  2. 每个IP 在时间窗口内的失败次数

不安全模式：

* 不限制登录尝试次数。

检测提示：

* 识别所有鉴权端点并检查是否有速率限制/节流。
* 搜索 `rate-limiter-flexible`、`express-rate-limit` 或网关策略。

修复：

* 实现速率限制/节流（应用或边缘）。Express 文档把 `rate-limiter-flexible` 列为适用工具。([Express][1])

注意：

* OWASP Node.js 速查表也建议防范暴力破解。([OWASP Cheat Sheet Series][8])

---

### EXPRESS-DEPS-001：依赖与补丁卫生（Express + Node + 关键中间件）

严重程度：中 / 低

注意：`npm audit` 常常返回大量实际无关紧要的“漏洞”。你应只关注 Express 或其他极其关键的包，忽略开发工具、打包器等列出的条目。

未经用户同意不要升级包。这可能以意料之外的方式破坏现有代码。应改为告知他们哪些包过时了。

要求：

* MUST 保持 Express 在受维护的版本线上（避免 EOL 大版本）。
* MAY 在 CI 和维护工作中使用 `npm audit`。
* SHOULD 经 lockfile 固定依赖，并仔细评审大版本更新。

不安全模式：

* 运行 EOL 的 Express 版本（例如非常老的大版本线）。
* 不做分诊就忽略 `npm audit` 的发现。
* 未固定的依赖范围自动升级到不安全版本。

检测提示：

* 检查 `package.json` 和 lockfile 中 `express` 版本及其他关键中间件版本。
* 检查 CI 流水线中的 `npm audit`/SCA 步骤。

修复：

* 升级到最新稳定 Express 并应用补丁。
* 增加自动化依赖扫描和升级流程。

注意：

* Express 生产安全指引强调依赖漏洞可能危及应用，并推荐 `npm audit`。([Express][1])
* 追踪影响 Express 版本的安全问题（包括已知的开放重定向相关 CVE）。([NVD][9])

---

### EXPRESS-DOS-001：配置 DoS 防护（超时、限制、反向代理）

严重程度：低

注意：仅凭给定的应用上下文可能难以判断应用是否运行在反向代理之后。你可以告知用户或建议使用一个，但不要在用户未主动提出时擅自配置。这一点高度依赖部署方式。

要求：

* SHOULD 在可行时使用反向代理提供缓存、负载均衡和过滤控制。
* MAY 配置服务器/代理超时和连接限制，以降低 Slowloris 等类似 DoS 模式的暴露。
* MUST 确保服务器/socket 错误得到处理，使畸形连接不会弄崩进程。（Express 应能处理异常，但存在边界情况）

不安全模式：

* 公网 Node 服务器前面没有反向代理，且处处使用默认值。
* 服务器/socket 对象缺少错误处理器。
* 超时极其宽松且请求体大小不限。

检测提示：

* 检查服务器创建（`http.createServer`、`https.createServer`）以及是否设置了超时。
* 检查代理/网关配置中的超时和最大请求体大小。

修复：

* 说明如何配置反向代理和超时，设置请求大小限制
* 增加健壮的错误处理中间件

注意：

* Node 的 HTTP DoS 安全指引讨论了使用反向代理和正确配置服务器超时。([Node.js][15])

---

### EXPRESS-NODE-INSPECT-001：不要在生产环境暴露 Node 调试器

严重程度：严重

注意：确认该检测点确实位于生产路径，而不是只用于本地调试。

要求：

* MUST NOT 在生产环境以 `--inspect`（尤其是绑定到非回环地址）运行 Node。
* MUST 确保 `NODE_OPTIONS` 或启动脚本不在生产启用 inspector。
* SHOULD 只在本地做防火墙内调试。

不安全模式：

* 生产环境中 `node --inspect=0.0.0.0:9229 app.js`。
* 容器/PM2/systemd 配置启用 inspector。

检测提示：

* 在 Dockerfile、Procfile、systemd unit、PM2 配置、npm 脚本中搜索 `--inspect`。
* 检查 `NODE_OPTIONS`。

修复：

* 从生产启动命令中移除 inspector 标志；限制为本地开发使用。

注意：

* Node 安全指引讨论了 inspector 暴露的风险（例如 DNS rebinding），并建议不要在生产运行 inspector。([Node.js][15])

---

### EXPRESS-NODE-HTTP-001：不要在生产环境启用不安全的 HTTP 解析

严重程度：高

注意：确认该检测点确实位于生产路径，而不是只用于本地开发。

要求：

* MUST NOT 在生产环境使用 Node 的 `insecureHTTPParser`。
* MAY 建议配置前置代理对歧义请求做规范化，以降低请求走私风险。

不安全模式：

* 以 `{ insecureHTTPParser: true }` 创建 HTTP 服务器。

检测提示：

* 在服务器创建代码中搜索 `insecureHTTPParser`。

修复：

* 移除不安全解析；依赖符合规范的解析，并在边缘做规范化。

注意：

* Node 安全指引明确建议不要使用 `insecureHTTPParser`。([Node.js][15])

---

## 5) 实用扫描启发式（如何“挖”）

主动扫描 Express 仓库时，这些模式是高信号的：

* TLS / 传输：

  * `app.listen(80` 而未提及反向代理；缺少 `helmet`；cookie 缺少 `secure` ([Express][1])（注意这只适用于面向 Web 的应用，内部应用通常没有 TLS）
* 代理信任：

  * `app.set('trust proxy', true)`；使用 `req.ip`/`req.protocol`/`req.hostname` 的逻辑 ([Express][2])
* 安全响应头 / 指纹特征：

  * 缺少 `helmet(`；缺少 `app.disable('x-powered-by')` ([Express][1])
* Cookie / 会话：

  * `express-session` 缺少 `store`（MemoryStore 风险）、硬编码 `secret:`、缺少 `cookie: { secure/httpOnly/sameSite }` ([Express][1])
  * `cookie-session` 存大对象或机密 ([Express][1])
* 请求体解析限制：

  * 没有 `limit`/`parameterLimit`/`depth` 的 `express.json()` 或 `express.urlencoded()` ([Express][5])
* CSRF：

  * 使用 cookie 鉴权却没有 CSRF token/来源检查的 POST/PUT/PATCH/DELETE 路由 ([OWASP Cheat Sheet Series][3])
* 开放重定向：

  * `res.redirect(req.query.next)` 或类似写法 ([Express][1])
* XSS / HTML 输出：

  * 用用户输入拼 HTML 的 `res.send(`；模板“safe”标志；`res.locals` 中的不可信值 ([Express][5])
* 文件处理：

  * 路径来自请求的 `res.sendFile(` / `res.download(`；`express.static('uploads')` ([Express][5])
* 注入：

  * SQL 字符串 + 模板字面量进入数据库调用 ([OWASP Cheat Sheet Series][6])
  * `child_process.exec` / `execSync` / `shell: true` ([OWASP Cheat Sheet Series][14])
* SSRF：

  * 对用户提供 URL 的出站 `fetch/axios/got` ([OWASP Cheat Sheet Series][7])
* 暴力破解 / 滥用：

  * 缺少节流的鉴权端点；没有速率限制中间件 ([Express][1])
* 供应链：

  * 过时的 Express 版本；没有 lockfile；没有 `npm audit` 流程 ([Express][1])
* Node 运行时风险：

  * 生产脚本中的 `--inspect`；`insecureHTTPParser` 用法 ([Node.js][15])

始终尝试确认：

* 数据来源（不可信 vs 可信）
* 汇点类型（HTML/模板、SQL/NoSQL、subprocess、文件系统、重定向、出站 HTTP）
* 已有的防护措施（校验、白名单、中间件、代理配置、响应头策略）
* 防护是在边缘还是应用代码内

---

## 6) 参考资料（访问于 2026-01-27）

Express 主要文档：

* Express：生产最佳实践 — 安全：`https://expressjs.com/en/advanced/best-practice-security.html` ([Express][1])
* Express：位于代理之后（`trust proxy`）：`https://expressjs.com/en/guide/behind-proxies.html` ([Express][2])
* Express 5.x API 参考（解析器、static、sendFile、redirect、cookies）：`https://expressjs.com/en/5x/api.html` ([Express][5])
* Express：错误处理：`https://expressjs.com/en/guide/error-handling.html` ([Express][11])

会话中间件文档：

* express-session 文档（cookie 标志、机密轮换、固定缓解、MemoryStore 警告）：`https://expressjs.com/en/resources/middleware/session.html` ([Express][1])

Node.js 与 npm 官方参考：

* Node.js — 安全最佳实践（DoS、代理指引、inspector 风险、请求走私说明）：`https://nodejs.org/en/learn/getting-started/security-best-practices` ([Node.js][15])
* npm 文档 — `npm audit`：`https://docs.npmjs.com/cli/v9/commands/npm-audit/` ([npm Docs][16])

OWASP Cheat Sheet Series：

* Session Management：`https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html` ([OWASP Cheat Sheet Series][12])
* CSRF Prevention：`https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html` ([OWASP Cheat Sheet Series][3])
* XSS Prevention：`https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html` ([OWASP Cheat Sheet Series][4])
* Input Validation：`https://cheatsheetseries.owasp.org/cheatsheets/Input_Validation_Cheat_Sheet.html` ([OWASP Cheat Sheet Series][17])
* SQL Injection Prevention：`https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html` ([OWASP Cheat Sheet Series][6])
* OS Command Injection Defense：`https://cheatsheetseries.owasp.org/cheatsheets/OS_Command_Injection_Defense_Cheat_Sheet.html` ([OWASP Cheat Sheet Series][14])
* SSRF Prevention：`https://cheatsheetseries.owasp.org/cheatsheets/Server_Side_Request_Forgery_Prevention_Cheat_Sheet.html` ([OWASP Cheat Sheet Series][7])
* File Upload：`https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html` ([OWASP Cheat Sheet Series][13])
* Unvalidated Redirects：`https://cheatsheetseries.owasp.org/cheatsheets/Unvalidated_Redirects_and_Forwards_Cheat_Sheet.html` ([OWASP Cheat Sheet Series][18])
* HTTP Headers：`https://cheatsheetseries.owasp.org/cheatsheets/HTTP_Headers_Cheat_Sheet.html` ([OWASP Cheat Sheet Series][10])

版本 / 通告：

* Express 包版本（npm）：`https://www.npmjs.com/package/express`
* Express 开放重定向通告（CVE）：`https://nvd.nist.gov/vuln/detail/CVE-2024-29041` ([NVD][9])

[1]: https://expressjs.com/en/advanced/best-practice-security.html "Security Best Practices for Express in Production"
[2]: https://expressjs.com/en/guide/behind-proxies.html "Express behind proxies"
[3]: https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html "Cross-Site Request Forgery Prevention - OWASP Cheat Sheet Series"
[4]: https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html "Cross Site Scripting Prevention - OWASP Cheat Sheet Series"
[5]: https://expressjs.com/en/5x/api.html "Express 5.x - API Reference"
[6]: https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html "SQL Injection Prevention - OWASP Cheat Sheet Series"
[7]: https://cheatsheetseries.owasp.org/cheatsheets/Server_Side_Request_Forgery_Prevention_Cheat_Sheet.html "Server Side Request Forgery Prevention - OWASP Cheat Sheet Series"
[8]: https://cheatsheetseries.owasp.org/cheatsheets/Nodejs_Security_Cheat_Sheet.html "Nodejs Security - OWASP Cheat Sheet Series"
[9]: https://nvd.nist.gov/vuln/detail/cve-2024-29041?utm_source=chatgpt.com "CVE-2024-29041 Detail - NVD"
[10]: https://cheatsheetseries.owasp.org/cheatsheets/HTTP_Headers_Cheat_Sheet.html "HTTP Headers - OWASP Cheat Sheet Series"
[11]: https://expressjs.com/en/guide/error-handling.html "Express error handling"
[12]: https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html "Session Management - OWASP Cheat Sheet Series"
[13]: https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html "File Upload - OWASP Cheat Sheet Series"
[14]: https://cheatsheetseries.owasp.org/cheatsheets/OS_Command_Injection_Defense_Cheat_Sheet.html "OS Command Injection Defense - OWASP Cheat Sheet Series"
[15]: https://nodejs.org/en/learn/getting-started/security-best-practices "Node.js — Security Best Practices"
[16]: https://docs.npmjs.com/cli/v9/commands/npm-audit/ "npm-audit | npm Docs"
[17]: https://cheatsheetseries.owasp.org/cheatsheets/Input_Validation_Cheat_Sheet.html "Input Validation - OWASP Cheat Sheet Series"
[18]: https://cheatsheetseries.owasp.org/cheatsheets/Unvalidated_Redirects_and_Forwards_Cheat_Sheet.html "Unvalidated Redirects and Forwards - OWASP Cheat Sheet Series"
