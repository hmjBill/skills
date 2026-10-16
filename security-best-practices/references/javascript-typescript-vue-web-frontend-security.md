# Vue.js Web 安全规范（Vue 3.x、TypeScript/JavaScript、常用工具链：Vite）

本文档是一份**安全规范**，用于支持：

1. 为新 Vue 代码进行**默认安全的代码生成**。
2. 对既有 Vue 代码进行**安全审查 / 漏洞挖掘**（被动式“边工作边注意问题”，以及主动式“扫描仓库并报告发现”）。

本文档有意写成一套**规范性要求**（“MUST/SHOULD/MAY”）加**审计规则**（坏模式长什么样、如何检测、如何修复/缓解）。

---

## 0) 安全、边界与反滥用约束（必须遵守）

* MUST NOT 请求、输出、记录或提交机密（API key、密码、私钥、会话 cookie、鉴权 token）。
* MUST NOT 通过关闭防护来“修复”安全问题（例如削弱 CSP、开启不安全的模板编译、把 `v-html` 当捷径、绕过后端鉴权，或“直接把 token 存 localStorage”）。
* MUST 在审计中给出**基于证据的发现**：引用能支撑结论的文件路径、代码片段和配置值。
* MUST 诚实对待不确定性：如果某项防护可能存在于边缘层（CDN、反向代理、WAF、服务器响应头），应报告为“仓库中不可见；需核实运行时/基础设施配置”。
* MUST 记住前端信任模型：**任何发布到浏览器的代码攻击者都可读也可改**。机密与“安全强制”不能只依赖前端逻辑。

---

## 1) 工作模式

### 1.1 生成模式（默认）

当被要求编写新 Vue 代码或修改既有代码时：

* MUST 遵循本规范中的每一条 **MUST** 要求。
* SHOULD 遵循每一条 **SHOULD** 要求，除非用户明确另有指示。
* MUST 优先使用默认安全的框架特性和经过验证的库，而不是自研安全代码。
* MUST 避免引入新的危险汇点（sink）（运行时模板编译、`v-html` / `innerHTML`、不安全 URL 导航、动态脚本注入等）。([Vue.js][1])

### 1.2 被动审查模式（编辑期间始终开启）

在 Vue 仓库的任何位置工作时（即使用户没有要求安全扫描）：

* MUST “注意”所触及/邻近代码中违反本规范的地方。
* SHOULD 在问题出现时提及，并附简要说明 + 安全的修复方式。

### 1.3 主动审计模式（明确要求扫描时）

当用户要求“扫描”、“审计”或“挖漏洞”时：

* MUST 系统性地在代码库中搜索违反本规范的地方。
* MUST 以结构化格式输出发现（见 §2.3）。

推荐审计顺序：

1. 构建/部署入口与托管配置（Docker、CI、静态托管、SSR 服务器）。
2. 机密暴露（env 使用、`.env*`、硬编码密钥）。([vitejs][2])
3. XSS 攻击面：模板、`v-html` / `innerHTML`、URL/样式注入、DOM API。([Vue.js][1])
4. 浏览器中的鉴权/会话处理（token 存储、带凭据请求、CSRF 集成）。([Vue.js][1])
5. 路由/导航（开放重定向、“return_to/next”、不安全的外部导航）。([Vue.js][1])
6. 第三方脚本与内容（CDN 资源、统计、挂件、iframe）。([Vue.js][1])
7. 安全响应头与浏览器加固要求（CSP、点击劫持）。([Vue.js][1])
8. SSR 特有问题（状态序列化、模板边界）（如适用）。([Vue.js][1])

---

## 2) 定义与审查指引

### 2.1 不可信输入（除非证明否则按攻击者可控处理）

在 Vue 应用中，不可信输入包括（不限于）：

* 来自 API 的任何内容：`fetch`、`axios`、GraphQL 响应、webhook、第三方 SDK。
* 路由控制的数据：`route.params`、`route.query`、`route.hash`，以及任何从 `window.location` 派生的值。
* 用户控制的持久化内容：UI 中展示的数据库内容（评论、资料、CMS 内容）。
* 浏览器控制的存储：`localStorage`、`sessionStorage`、`IndexedDB`。
* 跨窗口消息：`postMessage` 输入。
* 任何可能被攻击者通过 DOM clobbering 或注入 HTML 影响的内容（尤其是 Vue 挂载到非无菌 DOM 上时）。([Vue.js][1])

### 2.2 改状态操作（前端视角）

满足以下任一条件的操作属于改状态操作：

* 经 API 调用创建/更新/删除数据。
* 改变鉴权/会话状态（登录、登出、刷新 token）。
* 触发特权操作（支付、管理员操作）。
* 产生副作用（发邮件、触发 webhook、修改账户设置）。

### 2.3 要求的审计发现格式

对每个发现的问题，输出：

* 规则 ID：
* 严重程度：严重（Critical）/ 高（High）/ 中（Medium）/ 低（Low）
* 位置：文件路径 + 组件/函数 + 行号
* 证据：确切的代码/配置片段
* 影响：可能出什么问题、谁能够利用
* 修复：安全的改动（优先最小 diff）
* 缓解：当立即修复困难时的纵深防御措施
* 误报说明：不确定时需要核实什么

---

## 3) 安全基线：最低生产配置（生产环境 MUST）

这是能防止常见 Vue/前端配置错误的“最小生产基线”。

* MUST 发布**生产构建**（而不是开发构建或开发服务器）。([Vue.js][3])
* MUST NOT 在前端 bundle 中携带机密；把所有暴露给客户端的 env 变量当作公开信息。([vitejs][2])
* MUST NOT 渲染非受信模板或允许用户提供 Vue 模板（等同于任意 JS 执行）。([Vue.js][1])
* SHOULD 避免原始 HTML 注入（`v-html`、`innerHTML`），除非内容可信或已强沙箱化。([Vue.js][1])
* SHOULD 在服务器/CDN 层部署基线安全响应头（尤其是 CSP 和点击劫持防御）。([OWASP Cheat Sheet Series][4])
* SHOULD 使用安全的鉴权模式（会话 token 优先用 HttpOnly cookie；与后端协作处理 CSRF）。([Vue.js][1])

---

## 4) 规则（生成 + 审计）

每条规则包含：要求的做法、不安全模式、检测提示与修复方法。

### VUE-DEPLOY-001：不要在生产环境运行 dev/preview 服务器

严重程度：高

要求：

* MUST NOT 把 Vite/Vue 开发服务器（`vite`、`npm run dev`、HMR）部署为生产服务器。
* MUST NOT 用 `vite preview` 充当生产服务器。([vitejs][5])
* MUST 构建（`vite build`）并用生产级静态服务器/CDN 提供构建产物；如果做 SSR，则使用生产级 SSR 服务器。([vitejs][6])

不安全模式：

* Docker/Procfile/systemd 以 `vite`、`npm run dev` 或 `vite preview` 作为生产入口。
* HMR 端点暴露到公网。

检测提示：

* 搜索：`vite`、`npm run dev`、`pnpm dev`、`yarn dev`、`vite preview`、`vue-cli-service serve`。
* 检查 Docker `CMD`、`ENTRYPOINT`、CI 部署脚本、平台配置。

修复：

* 用 `vite build` 生成构建产物。
* 用加固的托管（CDN/静态服务器）提供 `dist/`，或作为静态资源接入后端服务器。

注意：

* 本地使用 dev/preview 服务器没有问题；只有当它是生产入口时才标记。

---

### VUE-DEPLOY-002：使用 Vue 生产构建，并确保生产环境关闭 devtools

严重程度：中（若生产启用了 devtools/调试钩子则为高）

要求：

* 如果不经打包器、从 CDN/自托管加载 Vue，生产环境 MUST 使用 `.prod.js` 构建。([Vue.js][3])
* SHOULD 确保生产 bundle 不启用 Vue devtools，SHOULD 不有意开启生产 devtools 标志。([Vue.js][7])

不安全模式：

* 生产环境包含开发构建产物。
* 显式启用生产 devtools/诊断钩子。

检测提示：

* 使用 CDN 构建时，在 HTML 中搜索 `vue.global.js` / 非 `.prod.js` 变体。
* 在构建配置中搜索 `__VUE_PROD_DEVTOOLS__` 等 Vue 特性标志。([Vue.js][7])

修复：

* 切换到生产构建产物，并确保编译期标志为生产环境正确配置。

---

### VUE-SECRETS-001：绝不把机密放进前端代码或环境变量

严重程度：高（若暴露真实凭据则为严重）

要求：

* MUST 把所有前端代码和配置当作公开信息。
* MUST NOT 把机密嵌入：

  * 源代码
  * 提交到仓库的 `.env` 文件
  * 会进入 bundle 的 `import.meta.env.*` 变量
* MUST 假设任何进入客户端 bundle 的环境变量攻击者都可读。([vitejs][2])

不安全模式：

* `VITE_API_KEY=...` 存放真正的机密（而不只是公开标识符）。
* 在 JS/TS 中硬编码 API key、私有 token、服务凭据、签名密钥。

检测提示：

* 搜索：`VITE_`、`import.meta.env`、`.env`、`.env.production`、`.env.*.local`。
* 搜索 `API_KEY`、`SECRET`、`TOKEN`、`PRIVATE_KEY`、`BEGIN`、`sk-`、`AKIA` 等。

修复：

* 把机密移到后端/边缘函数。
* 需要时给浏览器下发由后端铸造的短时 token。

注意：

* Vite 特别警告 `.env.*.local` 应被 gitignore，且 `VITE_*` 变量会进入客户端 bundle，因此不得包含敏感信息。([vitejs][2])

---

### VUE-SECRETS-002：不要放宽 Vite 的 env 暴露范围

严重程度：高

要求：

* MUST NOT 配置 Vite 把所有环境变量暴露给客户端。
* SHOULD 保持 `envPrefix` 严格且明确。

不安全模式：

* 为了“让环境变量能用”把 `envPrefix` 设得过宽（或设为 `''`）。
* 自定义脚本在构建时把服务端机密注入 HTML 中的全局变量。

检测提示：

* 检查 `vite.config.*` 中的 `envPrefix`。
* 查找 `define: { 'process.env': ... }` 或手工注入 `window.__CONFIG__`。

修复：

* 机密保存在服务端。
* 只暴露有意设计为公开的非敏感值。

注意：

* Vite 文档说明只有带前缀的变量才会暴露，且被暴露的变量会进入客户端 bundle。([vitejs][2])

---

### VUE-XSS-001：优先使用 Vue 的默认转义；避免原始 HTML 注入

严重程度：高

要求：

* MUST 尽可能依赖 Vue 对文本插值和属性绑定的自动转义。([Vue.js][1])
* MUST NOT 通过以下方式渲染用户提供的 HTML：

  * `v-html`
  * 渲染函数 / JSX 中的 `innerHTML`
  * 直接 DOM API（`element.innerHTML`、`insertAdjacentHTML`）
    除非 HTML 可信或经过可靠净化，且明确接受该风险。([Vue.js][1])

不安全模式：

* `<div v-html="userProvidedHtml"></div>`
* `h('div', { innerHTML: userProvidedHtml })`
* `<div innerHTML={userProvidedHtml}></div>`
* `el.innerHTML = untrusted`

检测提示：

* 搜索：`v-html`、`innerHTML`、`insertAdjacentHTML`、`DOMParser`、`document.write`。

修复：

* 把不可信内容作为文本渲染（插值）。
* 如果必须渲染 HTML（例如 Markdown），用维护良好的 HTML 净化器净化，并施加纵深防御（CSP、Trusted Types）。([Vue.js][1])

注意：

* Vue 文档明确警告：除非沙箱化或严格限定为仅自己可见，用户提供的 HTML 绝不是“100% 安全”的。([Vue.js][1])

---

### VUE-XSS-002：绝不使用非受信模板（客户端模板/代码注入）

严重程度：严重

要求：

* MUST NOT 把非受信内容用作 Vue 组件模板。
* MUST 把“用户可以编写 Vue 模板”视为“用户可以在你的应用中执行任意 JavaScript”，在 SSR 场景下甚至可能波及服务端。([Vue.js][1])
* SHOULD 优先使用仅运行时构建（模板在构建期编译），除非经过评估确有需要，否则不要附带运行时编译器。

不安全模式：

* `createApp({ template: '<div>' + userProvidedString + '</div>' }).mount(...)`
* 把模板存入数据库，再在浏览器中编译/渲染。
* 允许输入 Vue 模板语法的后台/CMS 功能。

检测提示：

* 搜索值不是静态字符串的 `template:`。
* 搜索 `@vue/compiler-dom`、`compile(`、“runtime compiler” 构建选择、动态 SFC 编译。
* 搜索“模板编辑器”、“自定义模板”、“主题 HTML”类功能。

修复：

* 把模板当代码对待：保持由开发者控制。
* 如果确实需要终端用户自定义，使用安全格式（受限的 Markdown 子集）经净化后渲染，或在沙箱 iframe 中隔离。

---

### VUE-XSS-003：不要把 Vue 挂载到可能含用户提供的 SSR HTML 的 DOM 上

严重程度：中

要求：

* MUST NOT 把 Vue 挂载到可能包含服务端渲染且由用户提供内容的节点上（因为“作为 HTML 安全”的攻击者可控 HTML，作为 Vue 模板时可能变得不安全）。([Vue.js][1])
* SHOULD 把 Vue 挂载到“无菌”的根元素上，由 Vue 控制的模板/组件来渲染应用的 DOM。

不安全模式：

* 服务端把用户内容渲染进 `#app`，然后 Vue 挂载到 `#app`，把该 DOM 当模板编译/解释。
* 在包含用户生成内容的大型服务端渲染页面上“撒 Vue”。

检测提示：

* 检查服务端模板（如 Rails/Django/Express 模板）是否把用户 HTML 插入 Vue 挂载根内部。
* 查找 `mount('#app')` 而 `#app` 中含服务端渲染的 UGC。

修复：

* 把用户渲染的 HTML 移出 Vue 挂载根，或在 Vue 组件中以安全方式（文本/净化后的 HTML）渲染。

---

### VUE-XSS-004：防止绑定与导航中的 URL 注入

严重程度：高

要求：

* MUST 在把任何受用户影响的 URL 绑定到导航汇点（`href`、`src`、`action`、`window.location`、`window.open`、跳转外部的路由导航）之前校验/净化。
* MUST 特别防止 `javascript:` URL 在 `<a :href="userProvidedUrl">` 这类绑定中执行。([Vue.js][1])
* SHOULD 校验协议与目标（白名单 `https:` 和预期主机；仅在有意为之时允许 `mailto:`/`tel:`）。

不安全模式：

* `<iframe :src="userProvidedUrl">`
* `window.location = route.query.next`
* `window.open(userProvidedUrl)`

检测提示：

* 搜索配合不可信输入使用的 `:href=`、`:src=`、`window.location`、`location.href`、`window.open`、`router.push(`。
* 查找 `next`、`return_to`、`redirect` 查询参数。

修复：

* 优先通过你控制的路由名/路径做内部导航。
* 对外部 URL：用 `new URL(...)` 解析，白名单协议/主机，拒绝 `javascript:` 等危险 scheme。
* 用户 URL 在存储前由后端净化并校验（Vue 文档明确建议后端净化）。([Vue.js][1])

---

### VUE-XSS-005：防止样式/CSS 注入与 UI 伪装

严重程度：低

要求：

* MUST NOT 大范围绑定攻击者可控的 CSS 字符串（例如 `:style="userProvidedStyles"`）。
* SHOULD 使用 Vue 的样式对象语法；如果需要用户自定义，只允许安全、具体的属性。([Vue.js][1])
* SHOULD 把“用户可控制布局/CSS”的功能隔离在沙箱 iframe 内。

不安全模式：

* `:style="userProvidedStyles"` 且样式攻击者可控。
* 渲染用户提供的 `<style>` 内容（即使 Vue 拦截了某些模式，也不要试图绕过它）。

检测提示：

* 搜索绑定到来自 API/用户内容的非常量变量的 `:style="`。
* 搜索“自定义 CSS”、“主题编辑器”、“个人主页 CSS”。

修复：

* 白名单属性和值；避免原始样式字符串。
* 富用户自定义用沙箱 iframe。

---

### VUE-XSS-006：绝不把用户提供的 JavaScript 绑定进事件处理器属性

严重程度：严重

要求：

* MUST NOT 把攻击者提供的字符串绑定进事件处理器属性（例如 `onclick`、`onfocus` 等）。
* MUST 把“用户提供的 JS”视为不安全，除非已沙箱化且保证仅自己可见。([Vue.js][1])

不安全模式：

* `<div :onclick="userProvidedString">`
* `<a :onmouseenter="userProvidedString">`

检测提示：

* 搜索 `:on` 后接事件属性名（`:onclick`、`:onload` 等）。
* 搜索 `setAttribute('on` 模式。

修复：

* 使用真实事件监听器和开发者控制的处理器。
* 确实需要用户脚本时做隔离（沙箱 iframe + 严格边界）。

---

### VUE-ROUTER-001：不要把客户端路由守卫当作授权

严重程度：高

要求：

* MUST NOT 依赖 Vue Router 守卫、UI 隐藏或客户端检查来执行授权。
* MUST 在后端为每个特权操作和敏感数据响应执行授权。([OWASP Cheat Sheet Series][8])

不安全模式：

* “admin 路由受保护是因为 `beforeEach` 检查了 `user.isAdmin`。”
* 假设“前端不被允许就不会调用”的敏感 API 端点。

检测提示：

* 检查 `router.beforeEach` 中基于角色的门禁，并确认后端是否同样在强制执行。
* 查找“用 route meta 做安全”的模式（`meta.requiresAdmin`）而无服务端佐证。

修复：

* 路由守卫只用于 UX（减少误入），真正的检查在服务端强制执行。

---

### VUE-ROUTER-002：防止开放重定向和不安全的“return_to/next”处理

严重程度：低

要求：

* MUST 校验来自不可信输入的重定向目的地（`next`、`return_to`、`redirect`）。
* SHOULD 只允许同站相对路径或明确的目的地白名单。
* MUST NOT 允许非 `http` / `https` 协议（例如 `javascript:`）

不安全模式：

* `router.push(route.query.next as string)`
* `window.location.href = route.query.redirect`

检测提示：

* 搜索 `route.query.next`、`route.query.redirect`、`return_to`、`continue`、`callback`。
* 追踪该值是否流入 router/window 导航汇点。

修复：

* 只允许以 `/` 开头的相对路径（拒绝 `//host`、`javascript:` 等）。
* 优先重定向到你控制的命名路由。

注意：

* Vue 文档也指出：经过净化的 URL 仍不能保证目的地安全。([Vue.js][1])

---

### VUE-AUTH-001：token 存储必须假设 XSS 可能发生

严重程度：低

要求：

* MUST 假设任何 JS 可访问的 token 都可能经 XSS 被窃取。
* SHOULD 会话 token 优先使用（后端设置的）HttpOnly cookie，并在相关场景配合 CSRF 防护。([Vue.js][1])
* SHOULD 避免把长效 token（尤其是刷新 token）存在 `localStorage`/`sessionStorage`。

不安全模式：

* 用 `localStorage.setItem('token', ...)` 存长效 bearer token。
* 把刷新 token 存进 JS 可访问的存储。

检测提示：

* 搜索：`localStorage`、`sessionStorage`、`indexedDB`、`persist`、`pinia-plugin-persistedstate`。
* 确认所存内容是否为鉴权/会话材料。

修复：

* 优先用 HttpOnly cookie 的后端托管会话。
* bearer token 无法避免时，保持短生命周期、只存内存、频繁轮换；并配合强 XSS 缓解（CSP、Trusted Types、严格净化）。([OWASP Cheat Sheet Series][4])

---

### VUE-CSRF-001：使用 cookie 时与后端协作处理 CSRF

严重程度：高（对 cookie 鉴权的改状态请求）

注意：如果应用不使用基于 cookie 的鉴权（例如传 Authorization 头），则无需考虑 CSRF

要求：

* 如果 API 请求携带 cookie（`credentials: 'include'` / `withCredentials: true`）且 cookie 用于鉴别用户，MUST 加入与后端协作的 CSRF 防护（token/头模式、Origin 检查、SameSite cookie 作为纵深防御）。([Vue.js][1])
* MUST NOT 通过在后端关闭防护或在前端使用 `mode: 'no-cors'` 来“解决 CORS/CSRF 报错”。

不安全模式：

* `fetch(url, { credentials: 'include', method: 'POST', body: ... })` 且任何地方都没有 CSRF token/头。
* 后端开启跨源带凭据请求却没有严格的来源白名单。

检测提示：

* 搜索：`credentials: 'include'`、`withCredentials`、`xsrf`、`csrf`、`X-CSRF-Token`、`X-XSRF-TOKEN`。
* 查看 API 封装模块中的请求头和 cookie 设置。

修复：

* 实现后端签发的 CSRF token，并要求改状态请求携带。
* 在兼容场景保持 cookie `SameSite=Lax/Strict`，并视情况校验 Origin/Referer（由后端驱动）。([OWASP Cheat Sheet Series][9])

注意：

* Vue 文档明确说 CSRF 主要由后端解决，但建议在 CSRF token 提交上做好协作。([Vue.js][1])

---

### VUE-HTTP-001：不要把机密放进 URL；避免在导航/日志中泄露敏感数据

严重程度：中

要求：

* MUST NOT 把 token/机密放进查询字符串或 fragment（它们会经日志、referrer、浏览器历史泄露）。
* SHOULD 避免在生产环境把敏感值打印到控制台。

不安全模式：

* `/?token=...`、`/#access_token=...` 用在短时 OAuth 交接之外。
* `console.log(userSession)` 包含 token/PII。

检测提示：

* 在路由解析、鉴权回调处理器和统计日志中搜索 `token=`。
* 在鉴权代码附近搜索 `console.log(`。

修复：

* 使用 Authorization 头或 HttpOnly cookie。
* 清理日志；调试日志放在仅开发环境生效的开关后面。

---

### VUE-HEADERS-001：在部署层要求安全响应头

严重程度：中

要求：

* SHOULD 部署适合你的 Vue 应用的 CSP（`Content-Security-Policy`）。
* SHOULD 部署点击劫持防御（CSP `frame-ancestors` 和/或 `X-Frame-Options`），除非有意要求被嵌入。
* SHOULD 部署 `X-Content-Type-Options: nosniff`，并按需部署其他头（Referrer-Policy、Permissions-Policy）。([OWASP Cheat Sheet Series][4])

不安全模式：

* 有 UGC 或富 HTML 渲染的应用，其服务器/CDN 配置中看不到响应头的痕迹。
* CSP 包含 `unsafe-inline`/`unsafe-eval` 而没有充分理由。

检测提示：

* 查找托管配置：nginx、Netlify/Vercel 头配置、CloudFront/Cloudflare 规则。
* 若仓库中不存在，标记为“需在边缘核实”。

修复：

* 在边缘或服务器设置响应头。从保守的 CSP 开始再逐步收紧。

---

### VUE-CSP-001：可行时使用 Trusted Types 与 DOM XSS 加固

严重程度：低

要求：

* 对有显著 DOM 注入面的应用（富文本、插件、`v-html`），SHOULD 考虑启用 Trusted Types 以降低 DOM XSS 风险。([web.dev][10])
* SHOULD 把 Trusted Types 当作纵深防御，而不是净化的替代品。

不安全模式：

* 频繁使用 `innerHTML`/`v-html` 却无净化或 CSP 加固。

检测提示：

* 搜索：`v-html`、`innerHTML`、`insertAdjacentHTML`。
* 检查 CSP 中的 `require-trusted-types-for 'script'` 用法（若头配置在仓库内）。

修复：

* 减少/集中 HTML 注入，净化输入，并在合适位置添加 Trusted Types 策略。

---

### VUE-THIRDPARTY-001：避免动态注入第三方脚本；优先静态、经审定的加载方式

严重程度：低

要求：

* MUST NOT 注入 URL 由用户控制的 `<script src="...">`。
* SHOULD 把第三方挂件/统计当作供应链风险；只从经审定、已锁定的来源加载。

不安全模式：

* `const s=document.createElement('script'); s.src = userProvidedUrl; ...`
* 加载任意远程脚本的“插件市场”。

检测提示：

* 搜索：`createElement('script')`、`.src =`、`appendChild(script)`。
* 搜索 “loadExternalScript”、“injectScript”、“cdnUrl”。

修复：

* 依赖打包进构建，或严格白名单来源并强制完整性（见 SRI 规则）。
* 不可信的第三方 UI 考虑放进沙箱 iframe。

---

### VUE-SRI-001：对 CDN 托管的脚本/样式使用子资源完整性（SRI）

严重程度：低

要求：

* 如果从 CDN 加载脚本/样式，SHOULD 使用子资源完整性（`integrity` 属性）并配合合适的 `crossorigin` 配置。([MDN Web Docs][11])
* 对安全关键代码，SHOULD 优先自托管或打包，而不是运行时依赖 CDN。

不安全模式：

* `<script src="https://cdn.example/...">` 没有 `integrity`。
* 远程脚本 URL 可在无版本锁定的情况下改变内容。

检测提示：

* 在 `index.html` 和服务端模板中搜索 `https://` 的 script/style 标签。
* 检查是否有 `integrity=`。

修复：

* 增加 SRI 哈希（并锁定版本），或把资源打包进构建。

---

### VUE-SUPPLY-001：依赖与补丁卫生是强制要求

严重程度：低

要求：

* SHOULD 保持 Vue 及官方配套库更新；Vue 明确建议使用最新版本以尽可能保持安全。([Vue.js][1])
* MUST 及时响应安全通告。
* SHOULD 固定依赖版本并提交 lockfile（减少生产产物的漂移）。

不安全模式：

* 带已知 CVE 的过时大版本。
* 仓库没有 lockfile；关键依赖用很宽的 semver 范围。
* 忽略模板/渲染/编译器包的安全通告。

检测提示：

* 检查 `package.json`、lockfile、CI 安装命令。
* 搜索被禁用的 `npm audit`、“ignore vulnerabilities” 类脚本。

修复：

* 升级依赖，并为受影响行为补充回归测试。
* 在 CI 中加入依赖扫描。

---

### VUE-SSR-001：SSR 增加额外信任边界；把状态注入当作 XSS 敏感点

严重程度：中

要求：

* 使用 SSR 时，MUST 把注入 HTML 文档的任何内容（初始状态、序列化数据、内联脚本）当作 XSS 敏感点。
* MUST 更严格地执行“只用受信模板”规则，因为不安全的模板可能在渲染过程中导致服务端代码执行。([Vue.js][1])
* SHOULD 在 SSR 安全上遵循 Vue SSR 文档和最佳实践。([Vue.js][1])

不安全模式：

* 把不可信字符串拼接进 SSR 模板。
* 向 `<script>` 块注入 JSON 而没有健壮的转义/序列化控制。

检测提示：

* 在服务端代码中搜索 `__INITIAL_STATE__`、`window.__*STATE__`、模板拼接和 SSR 渲染管线。
* 追踪不可信数据是否流入这些汇点。

修复：

* 使用你的 SSR 技术栈推荐的安全序列化模式。
* 避免渲染不可信 HTML；净化或隔离。

---

## 5) 实用扫描启发式（如何“挖”）

主动扫描时，使用这些高信号模式：

* 生产中的 dev/preview 服务器：

  * `npm run dev`、`vite`、`vite preview`、`vue-cli-service serve` ([vitejs][5])
* 机密暴露：

  * `.env`、`.env.production`、`.env.*.local`、`VITE_`、`import.meta.env`、硬编码的 `API_KEY` / `SECRET` ([vitejs][2])
* XSS 汇点：

  * `v-html`、`innerHTML`、`insertAdjacentHTML`、`DOMParser`、`document.write` ([Vue.js][1])
* 客户端模板注入：

  * `template:` 拼接、`compile(`、使用运行时编译器、挂载到非无菌 DOM ([Vue.js][1])
* URL 注入 / 开放重定向：

  * 来自用户数据的 `:href="..."` / `:src="..."`
  * 出现 `javascript:`
  * `route.query.next` / `redirect` / `return_to` 流入 `router.push` 或 `window.location` ([Vue.js][1])
* 样式注入：

  * `:style="userProvidedStyles"` 或用户驱动的主题 CSS ([Vue.js][1])
* token 存储：

  * `localStorage.setItem('token'...)`、持久化的鉴权 store、存于 JS 可访问存储的刷新 token
* CSRF 集成红旗：

  * `credentials: 'include'` / `withCredentials: true` 却没有任何 CSRF 头/token 处理 ([Vue.js][1])
* 第三方脚本：

  * 动态脚本注入（`createElement('script')`）、无 SRI 的 CDN 脚本 ([MDN Web Docs][11])
* 外链安全：

  * `target="_blank"` 而无 `rel="noopener"`/`noreferrer`（出于兼容旧浏览器和明确性仍建议保留）([MDN Web Docs][12])

始终尝试确认：

* 数据来源（不可信 vs 可信）
* 汇点类型（HTML/DOM 插入、模板编译、URL 导航、样式注入、脚本注入）
* 已有的防护措施（净化、白名单、CSP/Trusted Types、后端校验）

---

## 6) 参考资料（访问于 2026-01-27）

Vue 主要文档：

* Vue 文档：安全 — `https://vuejs.org/guide/best-practices/security` ([Vue.js][1])
* Vue 文档：模板语法（关于 in-DOM 模板的安全警告）— `https://vuejs.org/guide/essentials/template-syntax` ([Vue.js][13])
* Vue 文档：生产部署 — `https://vuejs.org/guide/best-practices/production-deployment` ([Vue.js][3])
* Vue 文档：特性标志 — `https://link.vuejs.org/feature-flags` ([Vue.js][7])

Vite 文档（Vue 常用工具链）：

* Vite 文档：环境变量与模式（VITE_* 暴露 + 安全说明）— `https://vite.dev/guide/env-and-mode` ([vitejs][2])
* Vite 文档：CLI（`vite preview` 并非为生产设计）— `https://vite.dev/guide/cli` ([vitejs][5])
* Vite 文档：服务器选项（`server.host` 可监听公网地址）— `https://vite.dev/config/server-options` ([vitejs][14])

OWASP 与 Web 平台加固参考：

* OWASP Cheat Sheet Series：XSS 防御 — `https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html` ([Vue.js][1])
* OWASP Cheat Sheet Series：CSRF 防御 — `https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html` ([OWASP Cheat Sheet Series][9])
* OWASP Cheat Sheet Series：授权 — `https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html` ([OWASP Cheat Sheet Series][8])
* OWASP Cheat Sheet Series：HTTP 头 — `https://cheatsheetseries.owasp.org/cheatsheets/HTTP_Headers_Cheat_Sheet.html` ([OWASP Cheat Sheet Series][4])
* HTML5 Security Cheat Sheet（Vue 引用）— `https://html5sec.org/` ([Vue.js][1])

浏览器/平台参考：

* MDN：`rel="noopener"` — `https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Attributes/rel/noopener` ([MDN Web Docs][12])
* MDN：子资源完整性（Subresource Integrity）— `https://developer.mozilla.org/en-US/docs/Web/Security/Subresource_Integrity` ([MDN Web Docs][11])
* web.dev：Trusted Types — `https://web.dev/trusted-types/` ([web.dev][10])

[1]: https://vuejs.org/guide/best-practices/security "https://vuejs.org/guide/best-practices/security"
[2]: https://vite.dev/guide/env-and-mode "https://vite.dev/guide/env-and-mode"
[3]: https://vuejs.org/guide/best-practices/production-deployment "https://vuejs.org/guide/best-practices/production-deployment"
[4]: https://cheatsheetseries.owasp.org/cheatsheets/HTTP_Headers_Cheat_Sheet.html "https://cheatsheetseries.owasp.org/cheatsheets/HTTP_Headers_Cheat_Sheet.html"
[5]: https://vite.dev/guide/cli "https://vite.dev/guide/cli"
[6]: https://vite.dev/guide/build "https://vite.dev/guide/build"
[7]: https://vuejs.org/guide/best-practices/production-deployment?utm_source=chatgpt.com "Production Deployment"
[8]: https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html "https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html"
[9]: https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html "https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html"
[10]: https://web.dev/articles/trusted-types "https://web.dev/articles/trusted-types"
[11]: https://developer.mozilla.org/en-US/docs/Web/Security/Defenses/Subresource_Integrity?utm_source=chatgpt.com "Subresource Integrity - Security - MDN Web Docs"
[12]: https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Attributes/rel/noopener "https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Attributes/rel/noopener"
[13]: https://vuejs.org/guide/essentials/template-syntax "Template Syntax | Vue.js"
[14]: https://vite.dev/config/server-options "https://vite.dev/config/server-options"
