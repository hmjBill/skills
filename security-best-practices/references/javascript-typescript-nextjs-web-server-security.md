# Next.js（TypeScript/JavaScript）Web 安全规范（Next.js 16.1.x、Node.js 20.9+）

本文档是一份**安全规范**，用于支持：

1. 为新 Next.js 后端代码（Route Handlers、API Routes、Server Actions、Proxy/Middleware）进行**默认安全的代码生成**。
2. 对既有 Next.js 仓库进行**安全审查 / 漏洞挖掘**（被动式“边工作边注意问题”，以及主动式“扫描仓库并报告发现”）。

本文档有意写成一套**规范性要求**（“MUST/SHOULD/MAY”）加**审计规则**（坏模式长什么样、如何检测、如何修复/缓解）。

目标范围：Next.js **16.1.x**（App Router 文档展示的最新线）([Next.js][1])，运行于 Node.js **20.9+**（按 Next.js 系统要求）。([Next.js][2])

---

## 0) 安全、边界与反滥用约束（必须遵守）

* MUST NOT 请求、输出、记录或提交机密（API key、密码、私钥、会话 cookie、OAuth token、`process.env` 转储、带凭据的数据库 URL）。
* MUST NOT 通过关闭防护来“修复”安全问题（例如禁用来源校验、把 CORS 放宽为 `*`、跳过授权检查、关闭 cookie 安全标志、因为 CSP “难搞”就关掉它）。
* MUST 在审计中给出**基于证据的发现**：引用能支撑每条结论的文件路径、代码片段和配置值。
* MUST 诚实对待不确定性：如果某项防护可能存在于基础设施层（反向代理、CDN、WAF、平台响应头），应报告为“应用代码中不可见；需在运行时/配置中核实”。
* MUST 假设所有面向请求的服务端代码攻击者都可达，除非存在明确强制执行的鉴权边界（而不只是“UI 没有链接到它”）。
* MUST 把 TypeScript 类型视为**非安全边界**：类型不校验运行时输入；必须做运行时检查。([Next.js][3])

---

## 1) 工作模式

### 1.1 生成模式（默认）

当被要求编写新 Next.js 代码或修改既有代码时：

* MUST 遵循本规范中的每一条 **MUST** 要求。
* SHOULD 遵循每一条 **SHOULD** 要求，除非用户明确另有指示。
* MUST 优先使用默认安全的 API 和经过验证的库，而不是自研安全代码。
* MUST 避免引入新的危险汇点（sink）（动态代码执行、不安全重定向、把用户文件当 HTML 提供、可 SSRF 的 URL 抓取、拼接 SQL 字符串等）。

### 1.2 被动审查模式（编辑期间始终开启）

在 Next.js 仓库的任何位置工作时（即使用户没有要求安全扫描）：

* MUST “注意”所触及/邻近代码中违反本规范的地方。
* SHOULD 在问题出现时提及，并附简要说明 + 安全的修复方式。

### 1.3 主动审计模式（明确要求扫描时）

当用户要求“扫描”、“审计”或“挖漏洞”时：

* MUST 系统性地在代码库中搜索违反本规范的地方。
* MUST 以结构化格式输出发现（见 §2.3）。

推荐审计顺序：

1. 部署入口与环境（Dockerfile、`package.json` 脚本、托管配置）。
2. Next.js 配置（`next.config.*`）、Proxy/Middleware、路由模式。
3. 鉴权、会话、cookie。
4. CSRF 防护与改状态端点（Server Actions、Route Handlers、API Routes）。
5. XSS（React + CSP）与不安全的 HTML 渲染。
6. 缓存/数据泄露风险（静态渲染 + 缓存 + “use cache”）。
7. 文件处理（上传/下载）与路径穿越。
8. 注入类（SQL/ORM 误用、命令执行、不安全反序列化）。
9. 出站请求（SSRF）。
10. 重定向处理（开放重定向）。
11. CORS 与安全响应头。

---

## 2) 定义与审查指引

### 2.1 不可信输入（除非证明否则按攻击者可控处理）

在 Next.js 后端中，不可信输入包括：

App Router：

* Route Handler 参数与请求数据：

  * `context.params`（动态段）、search params（`request.url`、`new URL(request.url).searchParams`）
  * `request.headers`、`request.cookies`
  * `await request.json()`、`await request.formData()`、`await request.text()`
* Server Components/Server Functions 中使用的 Dynamic APIs：

  * `headers()` 和 `cookies()` 的值 ([Next.js][4])

Pages Router：

* `pages/api/*` 处理器中的 `req.query`、`req.cookies`、`req.body` ([Next.js][3])

此外：

* 来自外部系统的任何数据（webhook、第三方 API、消息队列）
* 任何源自用户的持久化内容（数据库行）

### 2.2 改状态请求

如果请求能够创建/更新/删除数据、改变鉴权/会话状态、触发副作用（购买、发送邮件、发送 webhook）或发起特权操作，则该请求属于改状态请求。

Next.js 特别说明：

* **Server Actions** 经网络请求调用且可改变状态；把它们当作改状态端点对待。([Next.js][5])

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

这是能防止常见 Next.js 后端配置错误的“最小生产基线”。

### 3.1 以生产模式运行 Next.js（MUST）

* MUST 运行 `next build` + `next start`（或托管平台的等价方式），而不是 `next dev`。开发模式有不同的错误/报告行为，且并非为生产暴露而设计。([Next.js][6])
* MUST 确保生产环境中 `NODE_ENV=production`（Next.js 按命令设置 `NODE_ENV` 默认值；请核实运行环境）。([Next.js][7])

### 3.2 自托管时在前面放置反向代理 / 边缘层（面向公网时 MUST）

* 如果自托管，MUST 在 Next.js 服务器前面放置反向代理（例如 nginx）或等价的边缘层，以处理畸形请求、慢速攻击、载荷大小限制、速率限制等。([Next.js][8])

### 3.3 基线响应头/cookie 状况（SHOULD）

* SHOULD 全局设置基线安全响应头（CSP、`X-Content-Type-Options`、经 CSP `frame-ancestors` 和/或 `X-Frame-Options` 的点击劫持防御等）。Next.js 提供了经 Proxy/headers 实现 CSP 的指引。([Next.js][7])
* MUST 确保鉴权/会话 cookie 按需使用安全属性（`Secure`、`HttpOnly`、`SameSite`）。([Next.js][9])
重要提示：仅在生产环境中设置 `Secure`。在通过 HTTP 运行的本地开发环境中，不要给 cookie 设置 `Secure` 属性。应根据应用是否运行在生产模式来条件化处理。还应提供一个类似 `SESSION_COOKIE_SECURE` 的属性，以便在通过 HTTP 测试时能禁用 `Secure` cookie。

### 3.4 服务端专用代码与客户端代码清晰分离（MUST）

* MUST 防止机密和特权逻辑被打包进客户端代码。
* MUST 把 `NEXT_PUBLIC_*` 环境变量当作公开信息（浏览器可见，构建期内联）。([Next.js][7])

---

## 4) 规则（生成 + 审计）

每条规则包含：要求的做法、不安全模式、检测提示与修复方法。

### NEXT-DEPLOY-001：不要在生产环境运行 `next dev`；确保生产行为

严重程度：高（若用于生产）

注意：如果部署到特定的 Next.js 托管服务商，则无需担心这一点。

要求：

* MUST NOT 把 `next dev` 或任何开发服务器模式部署到生产。
* MUST 确保任何公开部署都使用生产构建和生产运行时。([Next.js][6])

不安全模式：

* Docker `CMD`、Procfile、平台启动命令中使用 `next dev`。
* 生产环境配置中 `NODE_ENV=development`。
* 公开暴露的调试/仅开发端点或标志。

检测提示：

* 在 `package.json` 脚本和部署清单中搜索 `next dev`。
* 在基础设施中搜索 `NODE_ENV=development` 或缺失 `NODE_ENV`。
* 检查 Kubernetes/PM2/systemd 入口中的 `next dev`。

修复：

* CI/构建时用 `next build`，运行时用 `next start`（或平台原生的构建/运行方式）。
* 确保环境设置 `NODE_ENV=production`。

注意：

* 开发模式用于本地开发没有问题。只有当它被用作生产入口时才标记。

---

### NEXT-SUPPLY-001：停留在受支持的 Next.js 版本线上；安全通告出现时尽快修补

严重程度：高（存在已知漏洞版本时为严重）

要求：

* MUST 运行受支持的 Next.js 版本线并及时应用安全更新。Next.js 有 LTS/支持策略文档。([Next.js][10])
* MUST 把已发布的通告当作紧急升级信号（例如升级到已修复版本）。([GitHub][11])

不安全模式：

* 运行没有向后移植安全修复的 EOL Next.js 大/小版本。
* 忽略通告，或把 `next` 锁定在受影响版本区间。

检测提示：

* 检查 `package.json` 和 lockfile 中的 `next` 版本。
* 与 Next.js 支持策略和通告对比。

重要：低于这些次要版本的任何版本都易受 "react2shell" 漏洞影响（https://nextjs.org/blog/CVE-2025-66478）：
15.0.5
15.1.9
15.2.6
15.3.6
15.4.8
15.5.7
16.0.7

修复：

* 把 `next` 升级到受支持且已修复的版本。
* 建立依赖更新流程 + CI 检查。


---

### NEXT-SECRETS-001：机密 MUST NOT 被提交或暴露给浏览器

严重程度：高（机密暴露给客户端时为严重）

要求：

* MUST 把机密存进环境变量或密钥管理器；MUST NOT 提交 `.env*` 文件。
* MUST 把 `.env*` 当作敏感文件；Next.js 警告你“几乎永远不想提交这些文件”。([Next.js][7])
* MUST 把任何 `NEXT_PUBLIC_*` 环境变量当作公开且浏览器可见（构建期内联进客户端 bundle）。([Next.js][7])

不安全模式：

* `.env`、`.env.local`、`.env.production` 提交到 git。
* `NEXT_PUBLIC_API_KEY`、`NEXT_PUBLIC_SECRET`、`NEXT_PUBLIC_DATABASE_URL` 等。
* 把 `process.env` 的值渲染进 HTML，或从 API 路由返回。

检测提示：

* 扫描 git 历史和仓库文件中的 `.env` 内容、`DB_PASS=`、`API_KEY=`、`SECRET=`。
* 搜索 `NEXT_PUBLIC_` 并审查任何看起来敏感的名字。
* 在 Client Components（`"use client"`）和共享模块中搜索 `process.env` 用法。

修复：

* 把机密移到服务端专用环境变量（不加 `NEXT_PUBLIC_` 前缀）。
* 确保 `.env*` 被忽略，机密在部署时注入。
* 轮换已泄露的密钥。

---

### NEXT-SECRETS-002：避免 server-only → client 打包错误（服务端/客户端边界就是安全边界）

严重程度：高

要求：

* MUST 确保 server-only 模块（数据库客户端、依赖机密的代码）不被导入 Client Components 或其他客户端打包路径。
* SHOULD 使用 server-only 模式/分层（例如专用 DAL 和 server-only 模块），并把边界违规当作安全缺陷。Next.js 明确讨论了敏感模块的 “server-only” 概念。([Next.js][6])

不安全模式：

* 把数据库客户端、admin SDK 或读取机密的模块导入 `"use client"` 组件。
* 被服务端和客户端代码共同导入且引用机密的共享 `lib/` 模块。

检测提示：

* 搜索 `"use client"` 并检查其导入中是否有 server-only 依赖。
* 查找从 `components/` 或其他客户端路径导入的数据库客户端包（`pg`、`mysql2`、`mongoose`、`prisma`、admin SDK）。
* 在 UI 组件中搜索 `process.env` 访问。

修复：

* 重构到 `lib/server/*`，只从服务端上下文（Route Handlers、Server Components、Server Actions）导入。
* 增加显式的 “server-only” 守护模式（和/或测试）防止意外导入。

---

### NEXT-AUTH-001：每个受保护操作的鉴权/授权 MUST 在服务端强制执行

严重程度：高

要求：

* MUST 在服务端代码中为以下对象强制执行认证/授权：

  * Route Handlers（`app/**/route.ts`）([Next.js][1])
  * API Routes（`pages/api/**`）([Next.js][3])
  * Server Actions（被客户端调用的 `"use server"` 函数）([Next.js][6])
* MUST NOT 把客户端检查（隐藏 UI、客户端路由守卫）当作唯一保护。

不安全模式：

* 没有会话校验的敏感 Route Handler。
* 改变数据却不校验用户身份/权限的 Server Action。
* 只在 React 组件中做的“授权”检查。

检测提示：

* 枚举所有 Route Handler 和 API Route；逐一判断是否需要鉴权。
* 搜索 `"use server"` 并审查所有导出 action 的鉴权检查。
* 搜索由查询参数/表单提交触发的管理操作。

修复：

* 集中封装鉴权辅助函数，并在每个受保护端点/action 中调用。
* 按 action 实现最小权限的授权检查（角色/资源所有权）。

---

### NEXT-AUTH-002：基于 Proxy/Middleware 的鉴权 MUST NOT 留下路由覆盖缺口

严重程度：高

要求：

* 如果用 **Proxy** 或 **Middleware** 做鉴权检查，MUST 确保它覆盖每一条需要保护的路由。
* Next.js 文档说明 Proxy 可以用 `matcher`，做鉴权时建议 Proxy 在所有路由上运行。([Next.js][12])
* MUST 把 `matcher` 配置错误视为鉴权绕过风险。

不安全模式：

* Proxy/Middleware 只匹配“页面”而不匹配 `/api/*`，或只匹配部分路由组。
* 会漏掉替代请求形式的“黑名单”式 matcher（框架内部变体、RSC 导航等）。

检测提示：

* 检查 `proxy.ts` / `middleware.ts` 及其 `matcher`。
* 把 matcher 与完整路由集合对比（包括 `app/api/**` 和 `pages/api/**`）。
* 确保静态资源和 Next 内部路径只是有意排除，且敏感路由已被包含。

修复：

* 优先对受保护路由前缀做白名单，或全局运行 Proxy 并在内部做允许/拒绝逻辑。
* 增加集成测试：不带凭据请求受保护路由并断言被拒绝。

注意：

* Proxy 常用于“乐观检查”；它本身不是一个完整的授权系统。([Next.js][12])

---

### NEXT-CSRF-001：cookie 鉴权的改状态端点 MUST 有 CSRF 防护

严重程度：高

- 重要提示：如果不使用 cookie 做鉴权（即鉴权通过 Authentication 头或其他传递的 token 完成），则不存在 CSRF 风险。

要求：

* MUST 保护每个依赖 cookie 鉴权的改状态端点（POST/PUT/PATCH/DELETE）。
* 对 **Server Actions**，Next.js 会做 Origin/Host 比对以帮助防止 CSRF；不要禁用或削弱它。([Next.js][5])
* 如果 Server Actions 必须能从额外的受信源调用（例如受信代理域名），MUST 使用严格白名单的 `allowedOrigins`。([Next.js][5])
* 对 **Route Handlers** 和 **API Routes**，MUST 显式实现 CSRF 防护（token 和/或严格的 Origin/Referer + SameSite + 自定义头）。Route Handlers 是“逃生舱口”，需要应用层的安全决策。([Next.js][6])

不安全模式：

* 改变状态却接受跨站请求且无 token/来源检查的 POST 端点（包括 Server Actions）。
* `allowedOrigins: ['*']`（或宽泛通配符）或“反射 Origin”逻辑。
* 用 GET 请求改状态。

检测提示：

* 枚举所有改状态端点并确定鉴权机制。
* 搜索 `allowedOrigins` 并确认列表短小、具体、有依据。([Next.js][5])
* 在 Route Handlers/API Routes 中：查找缺失的 CSRF token 校验或缺失的 Origin/Referer 检查。

修复：

* 为 cookie 鉴权端点实现 CSRF token 策略。
* 兼容时保持 cookie `SameSite=Lax` 或 `Strict`；不要认为仅靠 SameSite 就足够。
* 对 JSON API 端点做严格的 Origin 校验，尤其在不使用 CSRF token 时。

注意：

* XSS 能够击穿 CSRF 防护；CSRF 防御不能替代 XSS 防范。

---

### NEXT-SESS-001：生产环境中会话 cookie MUST 使用安全属性

严重程度：中

要求（生产环境、HTTPS）：

* MUST 为会话/鉴权 cookie 设置：

  * `Secure: true`（仅 HTTPS）重要提示：仅在生产环境中设置 `Secure`。在通过 HTTP 运行的本地开发环境中，不要给 cookie 设置 `Secure` 属性。应根据应用是否运行在生产模式来条件化处理。还应提供一个类似 `SESSION_COOKIE_SECURE` 的属性，以便在通过 HTTP 测试时能禁用 `Secure` cookie。
  * `HttpOnly: true`（JS 不可读）
  * `SameSite: 'Lax'`（推荐）或兼容时用 `'Strict'`
* 只有确实需要跨站 cookie 时才用 `SameSite: 'none'`，且此时 MUST 同时设置 `Secure`。Next.js 的 cookie API 支持这些 cookie 选项。([Next.js][9])

不安全模式：

* 生产环境中 `secure: false`。
* 鉴权 cookie `httpOnly: false`。
* 没有明确需要就设置 `sameSite: 'none'`，尤其是在 cookie 鉴权的改状态端点上。

检测提示：

* 搜索设置 cookie 的位置（`cookies().set(...)`、`Set-Cookie` 头、鉴权库的 cookie 配置）。
* 审查 Route Handlers 和 Server Actions 中使用的 cookie 选项。([Next.js][9])

修复：

* 在鉴权/会话层设置安全的 cookie 属性。
* 缩小 cookie 范围：除非明确需要跨子域 cookie，避免过宽的 `domain`。

---

### NEXT-SESS-002：会话 MUST 有界，并能抵抗会话固定/重放

严重程度：低

要求：

* SHOULD 设置与应用相称的、有上限的会话生命周期。
* SHOULD 在登录和权限变更时轮换会话标识符。
* MUST NOT 把敏感机密直接存进客户端可读的存储（包括未加密的 cookie）。

不安全模式：

* 不轮换的长生命周期管理员会话。
* 特权角色使用“永久记住我”而没有额外风险控制。
* 把访问 token/刷新 token 存进非 HttpOnly cookie 或 localStorage。

检测提示：

* 审查鉴权库配置中的过期与轮换。
* 搜索 `localStorage.setItem('token'...)` 和非 HttpOnly cookie 用法。

修复：

* 特权会话用短生命周期；刷新时轮换。
* cookie 中只存不透明的会话 ID；敏感材料保存在服务端。

---

### NEXT-INPUT-001：运行时输入校验是强制的（TypeScript 不是校验）

严重程度：高

要求：

* MUST 在运行时校验并规范化所有攻击者可控输入（schema、类型检查、边界）。
* Next.js API Routes 明确指出 `req.body` 是 `any`，使用前必须校验。([Next.js][3])
* MUST 校验 Server Action 参数（按敌意输入对待）。([Next.js][6])

不安全模式：

* 直接信任 `req.body` 的形状。
* 把 `params.id`/`searchParams` 直接传入数据库查询或文件路径。
* 解析 JSON 后不做校验就假定类型。

检测提示：

* 识别接受 JSON/表单输入的端点并检查是否有 schema 校验。
* 搜索 `req.body.` 用法和 Route Handlers 中的 `await request.json()` 用法；确认存在校验。

修复：

* 增加 schema 校验（例如 zod/yup/valibot），对无效输入返回 4xx。
* 把 ID 校验为严格类型（UUID/int），并强制长度/字符集约束。

---

### NEXT-HEADERS-001：必要的安全响应头 MUST 被设置（应用内或边缘）

严重程度：低

要求（典型 Web 应用）：

* SHOULD 设置：

  * CSP（`Content-Security-Policy`）（见 NEXT-CSP-001）
  * `X-Content-Type-Options: nosniff`
  * 点击劫持防御（CSP 的 `frame-ancestors` 和/或 `X-Frame-Options`）
  * 适当时设置 `Referrer-Policy` 和 `Permissions-Policy`
* MUST 确保 cookie 使用安全属性设置（见 NEXT-SESS-001）。([Next.js][9])

不安全模式：

* 任何位置（应用或边缘）都没有安全响应头。
* 无意允许被 iframe 嵌入。
* 缺少 `nosniff` 导致 `Content-Type` 嗅探成为可能。

检测提示：

* 检查 `proxy.ts` / middleware 中的 `response.headers.set(...)`。([Next.js][7])
* 若应用代码中不可见，标记为“需在边缘/CDN 核实”。

修复：

* 集中设置响应头（Proxy/Middleware 或其他集中机制）。
* 确保各路由的响应头一致。

---

### NEXT-CSP-001：使用 CSP 降低 XSS 影响；脚本优先用 nonce

严重程度：中

注意：最重要的是设置 CSP 的 script-src。其他指令重要性较低，为便于开发通常可以省略。

要求：

* SHOULD 部署 CSP，理想情况下脚本使用 nonce。
* SHOULD 按 Next.js 指引实现 CSP（包括 nonce 生成和响应头应用）。([Next.js][7])
* MUST NOT 在没有明确风险接受的情况下把放松 CSP 当作“修复”（例如 `script-src 'unsafe-inline'`）。

不安全模式：

* 展示用户生成 HTML/markdown 的应用缺少 CSP。
* 没有严格理由就大范围启用内联脚本或 eval 的 CSP。

检测提示：

* 搜索 `Content-Security-Policy` 头的设置并检查其指令。
* 检查 `next/script` 的使用，以及 CSP 要求时是否提供了 nonce。

修复：

* 按 Next.js 指引实现 CSP；使用 nonce 并一致应用。
* 减少内联脚本；避免 `eval`。

注意：

* CSP 是纵深防御；它不能替代正确的输出编码和净化。

---

### NEXT-XSS-001：防止 React/Next 渲染中的反射型/存储型 XSS

严重程度：高

要求：

* MUST 依赖 React 的默认转义；MUST NOT 未经净化就把不可信 HTML 插入 DOM。
* MUST 把以下内容视为高风险汇点：

  * `dangerouslySetInnerHTML`
  * 把用户控制的字符串渲染进 `<script>` 标签或事件处理器属性
* MUST 避免把上传的 HTML 当作可活动的 HTML 提供（作为附件提供，或净化/转换）。

不安全模式：

* `<div dangerouslySetInnerHTML={{ __html: userContent }} />` 而没有净化器。
* 配置为允许原始 HTML 且没有净化器的 markdown 渲染器。
* Route Handler 以 `Content-Type: text/html` 返回用户内容。

检测提示：

* 搜索 `dangerouslySetInnerHTML`、`__html:`。
* 搜索拼接 HTML 的模板字符串。
* 审查任何“渲染 HTML”或“预览”功能。

修复：

* 用维护良好的净化器净化不可信 HTML；优先使用严格白名单。
* 优先把用户内容作为文本渲染，而不是 HTML。
* 增加 CSP 以降低影响。

---

### NEXT-ACTION-001：Server Actions MUST 按公开端点对待

严重程度：高（特权操作为严重）

要求：

* MUST 应用与 Route Handlers 相同的控制：

  * 认证/授权
  * 输入校验
  * CSRF/来源防护
  * 敏感操作的速率限制
* MUST NOT 假设 Server Actions “不可达”或“是内部的”。
* MUST 理解 Server Action 的请求防护：

  * Next.js 会比对 Origin 与 host 以缓解 CSRF；额外来源必须通过 `allowedOrigins` 显式白名单。([Next.js][5])

不安全模式：

* 无鉴权检查就更新数据库状态的 `"use server"` 函数。
* 为了“让它能跑”而设置过宽的 `allowedOrigins`。

检测提示：

* 搜索 `"use server"` 并盘点所有导出的 action。
* 识别任何执行特权写入的 action；确认它检查了身份和权限。

修复：

* 用授权辅助函数包裹 action（fail closed）。
* 保持 `allowedOrigins` 最小化并纳入审计。

---

### NEXT-ACTION-002：不要通过 Server Action 闭包/绑定模式意外泄露机密

严重程度：中（重要机密暴露时为高）

要求：

* MUST 把 Server Action 闭包捕获的值当作敏感内容，并有意识地设计。
* Next.js 指出闭包捕获的值会被加密/签名，但经 `.bind` 传递的值不会被加密；不要依赖 `.bind` 保护机密。([Next.js][6])
* 如果跨部署为 Server Actions 使用稳定的加密密钥，MUST 把它当作机密并安全存储（不要提交/记录）。([Next.js][6])

不安全模式：

* `myAction.bind(null, process.env.SECRET)`，或绑定不应受客户端影响的敏感 token/ID。
* 记录包含机密的 action 参数。

检测提示：

* 在 Server Action 函数上搜索 `.bind(`。
* 在 Server Actions 附近搜索 `process.env` 用法。

修复：

* 避免把机密绑定进 action；在 action 内部从服务端获取机密。
* 保持 action 参数最小化并经过校验。

---

### NEXT-CACHE-001：防止经静态渲染与共享缓存的数据泄露

严重程度：高（跨用户数据泄露时为严重）

要求：

* MUST 确保返回用户特定或敏感数据的页面/端点不被静态生成或以共享方式缓存。
* Route Handlers 默认不缓存，但 GET handler 可以选择进入缓存/静态行为；不要对按用户数据这样做。([Next.js][1])
* MUST 把 `use cache` 和类似缓存机制视为可能跨用户，除非明确证明是私有的；不要把按用户的数据库结果缓存进共享缓存。([Next.js][1])
* SHOULD 为敏感响应（鉴权/会话/用户数据 API）显式设置 `Cache-Control: no-store` / `private`。

不安全模式：

* 在返回用户特定数据的路由上 `export const dynamic = 'force-static'`。([Next.js][1])
* 在查询用户特定数据的函数周围使用 `use cache` 而没有按用户的缓存键。([Next.js][1])
* 从启用了缓存的 GET 端点返回鉴权/会话响应。

检测提示：

* 搜索 `dynamic = 'force-static'`、`revalidate`、`use cache`、`cacheLife`、`unstable_cache`。
* 检查所有被缓存/静态化的 GET Route Handler，确认它们只返回公开数据。
* 确认 `cookies()`/`headers()`（Dynamic API）的使用没有被以使路由静态化的方式意外移除。([Next.js][1])

修复：

* 把敏感路由标记为动态，并设置 `Cache-Control: no-store`。
* 确实需要缓存时，确保缓存键包含用户身份（并存放在用户私有的缓存中）。

---

### NEXT-FILES-001：用户上传 MUST 校验、安全存储并安全提供

严重程度：中

要求：

* MUST 在边缘和应用逻辑中执行上传大小限制。
* MUST 使用白名单和内容检查校验文件类型（不能只看扩展名）。
* MUST 把上传内容存放在 `public/` 目录之外（`public/` 下的任何内容默认都作为静态内容提供）。
* MUST 安全地提供可能有活动内容的格式（`Content-Disposition: attachment`），除非明确有此意图。

不安全模式：

* 接受任意文件类型并以内联方式回传。
* 把用户提供的文件名用作存储路径。
* 把上传内容写入 `public/uploads/` 并直接提供。

检测提示：

* 搜索 `formData()` / multipart 解析、`fs.writeFile`、存储 SDK 用法。
* 查找 `public/` 下的任何写入路径。
* 查找设置 `Content-Type: text/html` 或内联提供用户文件的“下载”端点。

修复：

* 使用专用对象存储（S3/GCS）或静态根之外的安全服务端目录。
* 在服务端生成随机文件名；元数据单独存储。

---

### NEXT-PATH-001：防止路径穿越与不安全的文件访问

严重程度：高

要求：

* MUST NOT 把用户控制的字符串当作文件系统路径。
* MUST 校验并规范化标识符；使用白名单和安全基目录。
* MUST 避免根据请求参数读取任意文件。

不安全模式：

* `fs.readFile(request.nextUrl.searchParams.get('path'))`
* `path.join(base, userPath)` 而没有规范化 + 边界检查

检测提示：

* 在 Route Handlers/API Routes 中搜索 `fs.` 用法。
* 搜索由请求参数喂入的 `path.join`/`path.resolve`。

修复：

* 使用映射到服务端存储路径的不透明 ID。
* 强制解析后的路径仍在预期的基目录内。
* 构造 URL 时净化并禁止使用 `..`

---

### NEXT-SSRF-001：使用受用户影响 URL 的出站请求 MUST 受到限制

严重程度：中（内网环境中为高）

注意：这条主要只适用于部署在云/局域网环境、或同一台机器上还有其他 http 服务的应用。有时功能本身不可避免地需要该能力（webhook）。

要求：

* MUST 把任何对用户提供 URL 的服务端 `fetch()` 视为高风险。
* SHOULD 为 URL 抓取功能对目标（主机/域名）做白名单。
* SHOULD 阻止：

  * localhost / 私有 IP 段 / 链路本地地址
  * 云元数据端点
* MUST 把协议限制为 `http:` 和 `https:`。
* SHOULD 设置严格超时并限制重定向。

不安全模式：

* `await fetch(req.query.url)` 或 `await fetch((await request.json()).url)`
* 抓取任意 URL 的“URL 预览”端点。

检测提示：

* 在服务端代码中搜索 `fetch(` 并追踪 URL 来源。
* 查找“webhook 测试器”、“预览”、“从 URL 导入”类功能。

修复：

* 解析 URL，强制 `http/https`，白名单主机名，重新解析 DNS/IP 以阻止私有网段。
* 设置超时（AbortSignal）并限制重定向。

---

### NEXT-REDIRECT-001：防止开放重定向（包括鉴权流程）

严重程度：低

要求：

* MUST 校验来自不可信输入的重定向目标（例如 `next`、`redirect`、`returnTo`）。
* SHOULD 优先只重定向到同站相对路径。
* MUST 用白名单校验任何绝对 URL。
* MUST 确保 URL 为 `http` 或 `https:` scheme，禁止 `javascript:` scheme

不安全模式：

* `redirect(searchParams.get('next')!)`
* `NextResponse.redirect(new URL(req.nextUrl.searchParams.get('to')!, req.url))` 而无检查

检测提示：

* 搜索 `redirect(`（服务端组件/action）和 `NextResponse.redirect`。
* 在 API Routes 中搜索 `res.redirect(`。([Next.js][3])

修复：

* 只允许相对路径（`/path`），拒绝协议相对（`//evil.com`）或绝对 URL。
* 无效时回退到安全默认值（首页/仪表盘）。

---

### NEXT-CORS-001：CORS 必须显式声明并遵循最小权限

严重程度：中（若与凭据搭配配置错误则为高）

要求：

* 如果不需要 CORS，MUST 保持禁用。
* Next.js API Routes 默认不设置 CORS 头，即默认同源；只有确实需要时才启用 CORS。([Next.js][3])
* 如果启用 CORS：

  * MUST 对受信来源做白名单（不反射任意 Origin）
  * MUST 谨慎处理带凭据请求（cookie）；绝不把宽松来源与凭据组合。
  * SHOULD 限制方法和头。

不安全模式：

* `Access-Control-Allow-Origin: *` 搭配 `Access-Control-Allow-Credentials: true`
* 不校验就反射 `Origin`。

检测提示：

* 搜索 `Access-Control-Allow-Origin`、`cors`、“CORS” 中间件/封装。
* 审查预检 `OPTIONS` 处理器。

修复：

* 实现严格的来源白名单和最小的方法/头集合。
* 确保除非必要且经过评审，cookie 不跨源暴露。

---

### NEXT-WEBHOOK-001：Webhook 端点 MUST 使用原始请求体验证真实性

严重程度：中

要求：

* MUST 使用**原始请求体**验证 webhook 签名（而不是重新序列化的解析对象）。
* Next.js 指出禁用 body 解析的一个用例就是验证 webhook 请求的原始请求体。([Next.js][3])

不安全模式：

* 对 `JSON.stringify(req.body)` 验证 webhook 签名（格式可能改变）。
* 接受没有签名验证也没有白名单的 webhook。

检测提示：

* 找到 webhook 端点（`/api/webhook`、`/app/api/**/webhook`）。
* 检查它们是否使用原始请求体验证。

修复：

* 只对这些 webhook 路由禁用 Next.js 自动 body 解析，安全读取原始字节，验证签名，然后再解析。

---

### NEXT-INJECT-001：防止 SQL 注入（使用参数化查询 / ORM）

严重程度：高

要求：

* MUST 使用参数化查询或底层做了参数化的 ORM。
* MUST NOT 用字符串拼接 / 模板字符串配合不可信输入构造 SQL。

不安全模式：

* ``db.query(`SELECT * FROM users WHERE id = ${id}`)``
* `"WHERE name = '" + user + "'"`

检测提示：

* 搜索 `SELECT`、`INSERT`、`UPDATE`、`DELETE` 字符串。
* 追踪不可信输入（`params`、`searchParams`、`req.query`、`req.body`、`request.json()`）是否进入数据库调用。

修复：

* 使用预编译语句 / ORM 查询 API。
* 查询前校验并转换类型。

---

### NEXT-INJECT-002：防止操作系统命令注入与不安全的 subprocess 使用

严重程度：严重至高

要求：

* MUST 避免用攻击者可控输入执行操作系统命令。
* 如果必须使用 subprocess：

  * MUST 以数组传参（不要用单个 shell 字符串）
  * MUST NOT 对受攻击者影响的字符串使用 `shell: true`
  * SHOULD 对任何可变部分使用严格白名单

不安全模式：

* `exec("convert " + filename)`
* `spawn("bash", ["-c", userInput])`
* `spawn(userInput, ["foo"])`

检测提示：

* 搜索 `child_process`、`exec`、`spawn`、`shell: true`。

修复：

* 用库 API 代替 shell 命令。
* 硬编码命令并对参数做白名单校验（支持处用 `--` 分隔开关）。

---

### NEXT-INJECT-003：避免动态代码执行与不安全反序列化

严重程度：高至严重

要求：

* MUST NOT 对不可信字符串使用 `eval`、`new Function`、`vm.runIn*`。
* MUST 把反序列化复杂格式（YAML、XML、自定义序列化）视为有风险；使用安全的解析器和严格 schema。

不安全模式：

* `eval(req.body.code)`
* 用非安全 schema 解析用户输入的 YAML。

检测提示：

* 搜索 `eval(`、`new Function`、`vm.`、`require(` 接非常量。
* 搜索对不可信输入使用 `js-yaml`、XML 解析器、自定义序列化器。

修复：

* 移除动态执行；使用安全的解释器或严格解析器。
* 校验并约束输入。

---

### NEXT-LOG-001：日志 MUST NOT 泄露机密或敏感头

严重程度：中

要求：

* MUST NOT 记录：

  * `Authorization` 头
  * cookie / 会话 token
  * 含凭据的请求体
  * 环境变量或配置转储
* SHOULD 实现带脱敏的结构化日志。

不安全模式：

* 鉴权端点中 `console.log(req.headers)`
* 服务端代码中 `console.log(process.env)`

检测提示：

* 在服务端路由/action 中搜索 `console.log(`、`logger.info(`、`debug(`。
* 检查是否有记录头/cookie/请求体的日志。

修复：

* 脱敏敏感字段；只记录调试所需内容。
* 给客户端使用安全的错误消息；细节只留在服务端。

---

### NEXT-ERROR-001：错误处理 MUST 避免在生产环境泄露实现细节

严重程度：低

要求：

* MUST NOT 在生产环境向最终用户暴露堆栈跟踪或内部错误细节。
* 确保生产模式行为（Next.js 生产环境的错误处理与开发环境不同）。([Next.js][6])

不安全模式：

* 在 JSON 响应中返回 `err.stack`。
* 向未认证用户展示详细异常数据。

检测提示：

* 搜索 `res.status(500).json(err)` 或 `return Response.json(err)`。
* 验证错误响应已脱敏。

修复：

* 给客户端返回通用错误消息；细节在服务端脱敏后记录。

---

### NEXT-PROXY-001：Proxy/Middleware 不得引入头走私或不安全的头转发

严重程度：中

要求：

* 复制/向上游转发请求头时必须小心：

  * 除非有受信任的代理链，否则不要转发攻击者可控的 `x-forwarded-*` 头。
  * 不要把 `Authorization`/cookie 转发给无关的出站服务。
* Next.js 的 Proxy 模式经常修改头；确保这不会制造安全问题。

不安全模式：

* 盲目把所有请求头克隆到出站 `fetch()` 调用。
* 未经白名单就信任 `x-forwarded-host` 或 `host` 来构造敏感的绝对 URL。

检测提示：

* 搜索 `headers()` 和 `request.headers` 用法（尤其是用于构造 URL 时）。([Next.js][4])
* 在 Proxy/Middleware 中搜索头改写。

修复：

* 显式对转发的头做白名单。
* 在用主机名构造回调 URL 或重定向前先校验。

---

### NEXT-HOST-001：基于 Host/Origin 构造 URL MUST 使用白名单

严重程度：中

要求：

* MUST NOT 直接用未校验的 `Host` 头生成安全敏感的绝对 URL（密码重置链接、OAuth 回调 URL、邮箱验证链接）。
* 对 Server Actions，Origin/Host 匹配是 CSRF 缓解的一部分；不要削弱它。([Next.js][5])

不安全模式：

* `const base = "https://" + request.headers.get("host")`
* 用未校验的 `x-forwarded-host` 生成绝对 URL。

检测提示：

* 搜索 `.get('host')`、`.get('x-forwarded-host')` 和绝对 URL 构造。
* 审查鉴权相关邮件链接的生成代码。

修复：

* 使用配置好的、白名单内的规范应用源（例如 `APP_ORIGIN=https://example.com`）。
* 对主机名做白名单；失败即拒绝（fail closed）。

---

### NEXT-DOS-001：易被滥用的端点 MUST 具备速率限制与资源控制

严重程度：中

要求：

* SHOULD 为以下对象实现速率限制/节流：

  * 登录、密码重置、注册
  * 高开销的 Server Actions
  * webhook 接入
* MUST 实现请求大小限制（见 NEXT-LIMITS-001）。
* 如果自托管，MUST 依赖反向代理提供额外保护。([Next.js][8])

不安全模式：

* 登录/重置端点没有节流。
* 高开销 action 无需鉴权或可不限频率调用。

检测提示：

* 识别鉴权端点并检查速率限制。
* 搜索“发送邮件”、“扣款”、“生成报表”类流程。

修复：

* 增加边缘速率限制和应用级用户/IP 节流。
* 重活放进任务队列；适当时返回 202。

---

## 5) 实用扫描启发式（如何“挖”）

主动扫描时，使用这些高信号模式：

* 生产配置错误：

  * `next dev`、`NODE_ENV=development`、仅开发用的启动命令 ([Next.js][7])
* 机密暴露：

  * 提交入库的 `.env`、敏感变量带 `NEXT_PUBLIC_` ([Next.js][7])
  * `"use client"` 模块中使用 `process.env`
* 鉴权覆盖：

  * 无鉴权检查的 `app/**/route.ts` 或 `pages/api/**` ([Next.js][1])
  * 有数据库写入却无授权的 `"use server"` action ([Next.js][6])
  * 排除了敏感路由的 `proxy.ts` / `middleware.ts` matcher ([Next.js][12])
* CSRF：

  * 无 token/来源检查的 cookie 鉴权 POST/PUT/PATCH/DELETE
  * 过宽的 `serverActions.allowedOrigins` ([Next.js][5])
* XSS：

  * `dangerouslySetInnerHTML`、原始 HTML 的 markdown 渲染
  * 缺失 CSP / 过于宽松的 CSP ([Next.js][7])
* 缓存/数据泄露：

  * 敏感 GET handler 上的 `dynamic = 'force-static'` ([Next.js][1])
  * 包住用户特定数据的 `use cache`、`cacheLife`、`unstable_cache` ([Next.js][1])
* 文件：

  * 把上传内容写入 `public/` 之下
  * 使用请求输入的 `fs.readFile` / `path.join`
* SSRF：

  * 来自 Route Handlers / Server Actions 的 `fetch(userProvidedUrl)`
* 重定向：

  * `redirect(searchParams.get('next'))`、`NextResponse.redirect(...)`、`res.redirect(req.query.next)` ([Next.js][3])
* CORS：

  * 通配符来源、来源反射、凭据 + 宽松来源 ([Next.js][3])
* 限制：

  * 设置了 `bodyParser: false` 却没有对 webhook 做原始请求体验证的 API 路由 ([Next.js][3])
  * 无正当理由就调高的 `serverActions.bodySizeLimit` ([Next.js][5])
* 依赖卫生：

  * 与支持策略/通告冲突的旧 `next` 版本 ([Next.js][10])

始终尝试确认：

* 数据来源（不可信 vs 可信）
* 汇点类型（HTML/DOM、SQL、subprocess、文件、重定向、出站 HTTP）
* 已有的防护措施（schema 校验、白名单、中间件/proxy 检查、授权辅助、边缘防护）

---

## 6) 参考资料（访问于 2026-01-27）

框架主要文档（Next.js）：

* Next.js 文档：安装（系统要求 / Node 版本）— `https://nextjs.org/docs/app/getting-started/installation`
* Next.js 文档：Route Handlers — `https://nextjs.org/docs/app/getting-started/route-handlers`
* Next.js 文档：API Routes（Pages Router）— `https://nextjs.org/docs/pages/building-your-application/routing/api-routes`
* Next.js 文档：环境变量 — `https://nextjs.org/docs/pages/guides/environment-variables`
* Next.js 文档：数据安全 — `https://nextjs.org/docs/app/guides/data-security`
* Next.js 文档：Content Security Policy — `https://nextjs.org/docs/app/guides/content-security-policy`
* Next.js 文档：Proxy — `https://nextjs.org/docs/app/getting-started/proxy`
* Next.js 文档：`serverActions.allowedOrigins` 与 `serverActions.bodySizeLimit` — `https://nextjs.org/docs/app/api-reference/config/next-config-js/serverActions`
* Next.js 文档：`cookies()` — `https://nextjs.org/docs/app/api-reference/functions/cookies`
* Next.js 文档：`headers()` — `https://nextjs.org/docs/app/api-reference/functions/headers`
* Next.js 文档：自托管（反向代理指引）— `https://nextjs.org/docs/pages/guides/self-hosting`
* Next.js 文档：支持策略（受支持版本/LTS）— `https://nextjs.org/docs/support-policy`

Next.js 安全指引与通告：

* Next.js 博客：如何看待 Next.js 中的安全 — `https://nextjs.org/blog/security-nextjs-server-components-actions`
* GitHub Security Advisory：经 Server Components / Server Actions 的 Next.js DoS（CVE-2026-23864）— `https://github.com/advisories/GHSA-fq29-rrrv-cq2m`
* Next.js 博客：安全更新（安全通告背景示例）— `https://nextjs.org/blog/security-update`

通用 Web 安全参考（推荐基线）：

* OWASP Cheat Sheet Series（CSRF、会话管理、XSS 防御、SSRF 防御、文件上传、HTTP 头）— `https://cheatsheetseries.owasp.org/`

[1]: https://nextjs.org/docs/app/getting-started/route-handlers "Getting Started: Route Handlers | Next.js"
[2]: https://nextjs.org/docs/app/getting-started/deploying?utm_source=chatgpt.com "Getting Started: Deploying"
[3]: https://nextjs.org/docs/pages/building-your-application/routing/api-routes "Routing: API Routes | Next.js"
[4]: https://nextjs.org/docs/app/api-reference/functions/headers "Functions: headers | Next.js"
[5]: https://nextjs.org/docs/app/api-reference/config/next-config-js/serverActions "next.config.js: serverActions | Next.js"
[6]: https://nextjs.org/blog/security-nextjs-server-components-actions "How to Think About Security in Next.js | Next.js"
[7]: https://nextjs.org/docs/pages/guides/environment-variables "Guides: Environment Variables | Next.js"
[8]: https://nextjs.org/docs/pages/guides/self-hosting?utm_source=chatgpt.com "Guides: Self-Hosting"
[9]: https://nextjs.org/docs/app/api-reference/functions/cookies "Functions: cookies | Next.js"
[10]: https://nextjs.org/blog/next-16?utm_source=chatgpt.com "Next.js 16"
[11]: https://github.com/vercel/next.js/security/advisories/GHSA-9g9p-9gw9-jx7f?utm_source=chatgpt.com "Denial of Service in Image Optimizer · Advisory"
[12]: https://nextjs.org/docs/pages/guides/authentication "Guides: Authentication | Next.js"
