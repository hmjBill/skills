# React（JavaScript/TypeScript）Web 安全规范（React 19.x、TypeScript 5.x）

本文档是一份**安全规范**，用于支持：

1. 为新 React 代码进行**默认安全的代码生成**。
2. 对既有 React 代码进行**安全审查 / 漏洞挖掘**（被动式“边工作边注意问题”，以及主动式“扫描仓库并报告发现”）。

本文档有意写成一套**规范性要求**（“MUST/SHOULD/MAY”）加**审计规则**（坏模式长什么样、如何检测、如何修复/缓解）。

---

## 0) 安全、边界与反滥用约束（必须遵守）

* MUST NOT 请求、输出、记录或提交机密（API key、OAuth client secret、私钥、会话 cookie、JWT、签名密钥）。

  * 前端注意：任何发布到浏览器的内容最终用户和攻击者都能看到（查看源码、devtools、代理）；绝不把客户端代码或“bundle 里的 env 变量”当作机密。([create-react-app.dev][1])
* MUST NOT 通过关闭防护来“修复”安全问题（例如为了让“它能跑”而关掉 CSP、在没有书面且受限的方案时加 `unsafe-inline`/`unsafe-eval`、使用 cookie 时禁用 CSRF 防护、放宽 CORS、跳过净化，或带着上线的“临时”绕过）。([OWASP Cheat Sheet Series][2])
* MUST 在审计中给出**基于证据的发现**：引用能支撑结论的文件路径、代码片段和配置值。
* MUST 诚实对待不确定性：如果某项防护可能存在于基础设施层（CDN/WAF/反向代理），应报告为“应用代码中不可见；需经运行时响应头 / 边缘配置核实”。
* MUST 假设任何跨越信任边界的数据（URL、存储、网络、postMessage、第三方脚本）都可能被攻击者影响，除非证明否则（见 §2.1）。

---

## 1) 工作模式

### 1.1 生成模式（默认）

当被要求编写新 React 代码或修改既有代码时：

* MUST 遵循本规范中的每一条 **MUST** 要求。
* SHOULD 遵循每一条 **SHOULD** 要求，除非用户明确另有指示。
* MUST 优先使用默认安全的 API 和经过验证的库，而不是自研安全代码。
* MUST 避免引入新的危险汇点（sink）（插入原始 HTML、`innerHTML` 等直接 DOM 汇点、动态代码执行、不可信重定向/导航、第三方脚本注入、不安全的 token 存储等）。([MDN Web Docs][3])

### 1.2 被动审查模式（编辑期间始终开启）

在 React 仓库的任何位置工作时（即使用户没有要求安全扫描）：

* MUST “注意”所触及/邻近代码中违反本规范的地方。
* SHOULD 在问题出现时提及，并附简要说明 + 安全的修复方式。

### 1.3 主动审计模式（明确要求扫描时）

当用户要求“扫描”、“审计”或“挖漏洞”时：

* MUST 系统性地在代码库中搜索违反本规范的地方。
* MUST 以结构化格式输出发现（见 §2.3）。

推荐审计顺序：

1. 应用入口、构建工具链（Vite/Webpack/CRA/Next）、部署配置、CDN/静态托管配置。
2. 机密与配置暴露（env 变量、运行时配置注入、source map）。
3. 不可信数据的渲染（XSS/DOM XSS），尤其是 `dangerouslySetInnerHTML`、markdown/HTML 渲染器、URL 属性。
4. 直接 DOM 使用与危险的 JS 执行（`innerHTML`、`eval`、`new Function`、`document.write` 等）。
5. 鉴权与会话模式（token 存储、cookie、CSRF 交互、OAuth 流程）。
6. 网络层（axios/fetch 封装、动态 baseURL、带凭据请求、数据外带风险）。
7. 导航与重定向处理（开放重定向、`window.location`、`target=_blank`、`window.open`）。
8. 第三方脚本/标签/统计与完整性控制（CSP、SRI）。
9. Service worker/PWA 行为（HTTPS、缓存规则、更新策略）。
10. 应用内或边缘的安全响应头状况（CSP、点击劫持、nosniff、referrer policy）。([OWASP Cheat Sheet Series][2])

---

## 2) 定义与审查指引

### 2.1 不可信输入（除非证明否则按攻击者可控处理）

示例包括：

* 来自 URL 的数据：`window.location`、查询参数、hash 片段、路由参数。
* 来自浏览器存储的任何数据：`localStorage`、`sessionStorage`、`IndexedDB`（包括应用之前写入的数据——因为 XSS 或浏览器扩展可能篡改它）。([OWASP Cheat Sheet Series][4])
* 来自跨窗口消息的任何数据：`window.postMessage` 载荷。([OWASP Cheat Sheet Series][4])
* 来自远程 API、代理到客户端的 webhook、GraphQL 响应、CMS 内容、特性开关服务的任何数据。
* UI 中渲染的任何持久化用户内容（资料、评论、富文本、markdown）。
* 第三方脚本或标签管理器产生的任何数据（除非强受控，否则按不可信处理）。([OWASP Cheat Sheet Series][5])

### 2.2 改状态请求（前端视角）

如果请求能够创建/更新/删除数据、改变鉴权/会话状态、触发副作用（购买、发送邮件、webhook）或发起特权操作，则该请求属于改状态请求。

前端特有说明：

* 改状态操作通常由 `fetch/axios` 调用或表单提交触发。如果鉴权基于 cookie，这些调用就可能与 CSRF 相关（§4 REACT-CSRF-001）。([OWASP Cheat Sheet Series][6])

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

这是能防止常见 React 前端配置错误的“最小生产基线”。

### 3.1 生产构建与配置卫生（MUST）

* MUST 发布生产构建（压缩、无仅开发用的覆盖层/工具、正确的模式标志）。
* MUST 确保构建期配置不会把机密嵌入发布的 JS/HTML/CSS。构建期“环境变量”不是机密；按公开信息对待。([create-react-app.dev][1])
* SHOULD 把 source map 当作敏感的运维产物：

  * 要么不公开发布，要么只在预期位置发布（例如放在鉴权之后或发给错误上报服务商），因为它们会暴露代码结构和内部 URL。

### 3.2 浏览器侧防护（SHOULD，但这是现代应用的基线要求）

* SHOULD 部署 CSP 作为对抗 XSS 的纵深防御，并与你的 React 构建保持兼容（除非严格必要且有书面说明，避免 `unsafe-inline` 和 `unsafe-eval`）。([OWASP Cheat Sheet Series][2])
* SHOULD 对从 CDN 加载的任何第三方脚本/样式使用子资源完整性（SRI）（或改为自托管）。([MDN Web Docs][7])
* SHOULD 通过 `frame-ancestors`（CSP）和/或 `X-Frame-Options` 启用点击劫持防御，除非嵌入是明确的产品需求。([MDN Web Docs][8])

### 3.3 高风险特性基线（使用时 MUST）

* 如果渲染任何用户提供的 HTML/markdown/富文本：

  * MUST 在插入前净化，并避免原始 DOM 汇点。([OWASP Cheat Sheet Series][9])
* 如果使用 service worker / PWA：

  * MUST 经 HTTPS 提供，并实现安全的缓存/更新策略（service worker 是强大的请求/响应代理）。([MDN Web Docs][10])

---

## 4) 规则（生成 + 审计）

每条规则包含：要求的做法、不安全模式、检测提示与修复方法。

### REACT-CONFIG-001：绝不把机密嵌入客户端 bundle（env 变量是公开的）

严重程度：严重（若机密暴露）

要求：

* MUST NOT 把机密放进 React 代码、`public/` 资源，或供客户端使用的构建期环境变量。
* MUST 假设 React 应用在运行时能拿到的任何值都可以被攻击者提取。

不安全模式：

* 用构建期 env 变量存机密：

  * `process.env.REACT_APP_*` 存放私钥或凭据。
  * `import.meta.env.VITE_*` 存放机密。
* 在 JS/TS 中硬编码机密、提交 `.env`，或把机密放进向所有用户提供的 `public/config.json`。

检测提示：

* 搜索：

  * `REACT_APP_`、`VITE_`、`NEXT_PUBLIC_`、`process.env.`、`import.meta.env.`
  * `apiKey`、`secret`、`token`、`private`、`password`、`client_secret`
* 检查 `public/` 中的运行时配置 JSON。

修复：

* 把机密移到服务端（API、BFF、serverless 函数）。
* 如果浏览器需要调用第三方 API，用后端铸造短时、限范围的 token。

注意：

* CRA 明确警告不要存机密，并指出 env 变量会嵌入构建产物，任何检查文件的人都可见。([create-react-app.dev][1])
* Vite 明确指出暴露给客户端代码的变量会进入客户端 bundle，不应包含敏感信息。([vitejs][11])

---

### REACT-XSS-001：不要把不可信内容交给 `dangerouslySetInnerHTML`（净化或避免）

严重程度：高（仅当能证明攻击者可控 HTML 会到达此处）

要求：

* MUST 避免 `dangerouslySetInnerHTML`，除非绝对必要。
* 如果必须使用：

  * MUST 用经过验证的净化器（如 DOMPurify）和面向白名单的配置净化不可信 HTML。
  * MUST 把净化逻辑集中管理并严格评审。
  * SHOULD 增加 CSP 并考虑 Trusted Types（见 REACT-TT-001）。

不安全模式：

* `<div dangerouslySetInnerHTML={{ __html: userHtml }} />` 而 `userHtml` 来自 API/URL/存储。
* 用正则、临时剥离或不完整的白名单做“净化”。

检测提示：

* 搜索：`dangerouslySetInnerHTML`、`__html:`
* 追查 HTML 字符串的来源（API/CMS/URL/localStorage）。

修复：

* 换成安全渲染：

  * 把结构化数据渲染为 React 元素/组件，而不是 HTML 字符串。
  * 如果需要富文本，用 DOMPurify（或等价物）净化后渲染净化结果。
* 增加 CSP；尽可能移除危险汇点。

注意：

* React 明确警告 `dangerouslySetInnerHTML` 是危险的，误用会引入 XSS。([React][12])
* OWASP 明确把未经净化的 React `dangerouslySetInnerHTML` 列为常见的框架“逃生舱口”陷阱。([OWASP Cheat Sheet Series][9])
* DOMPurify 自述为面向 HTML/SVG/MathML 的 XSS 净化器。([GitHub][13])

---

### REACT-XSS-002：依赖 React 默认转义的行为；不要绕过它

严重程度：高（被绕过时）

要求：

* MUST 经普通 JSX 插值（`{value}`）和 React props 渲染不可信字符串，它们默认会被转义。
* MUST NOT 用不可信数据构造 HTML 字符串再以任何方式注入 DOM。
* SHOULD 把任何“逃生舱口”当作高风险并要求评审。

不安全模式：

* 把不可信文本转成 HTML 再注入：

  * `element.innerHTML = userValue`
  * `document.write(userValue)`
  * `insertAdjacentHTML(..., userValue)`

检测提示：

* 搜索 DOM 汇点：`innerHTML`、`outerHTML`、`insertAdjacentHTML`、`document.write`、`DOMParser`、`createContextualFragment`。

修复：

* 让文本内容经由 React（JSX）渲染，从而被转义。
* 确实需要 HTML 时，净化并应用 REACT-XSS-001 + REACT-TT-001。

注意：

* React 文档（JSX）说明 React DOM 会在渲染前转义嵌入 JSX 的值，以帮助防止注入攻击。([React][14])

---

### REACT-DOM-001：避免 React 代码中的 DOM XSS 注入汇点（使用安全替代）

严重程度：高

要求：

* MUST 避免直接 DOM 注入汇点，即使在 React 渲染之外，除非强受控。
* 如果必须使用 DOM 汇点：

  * MUST 确保输入可信/已校验/已净化。
  * SHOULD 强制 Trusted Types（REACT-TT-001）。

不安全模式：

* `someEl.innerHTML = untrusted`
* `document.write(untrusted)`
* `new DOMParser().parseFromString(untrusted, 'text/html')` 之后插入

检测提示：

* 搜索：`innerHTML`、`outerHTML`、`document.write`、`DOMParser`、`Range().createContextualFragment`、`insertAdjacentHTML`

修复：

* 优先使用：

  * 文本插入用 `textContent`。
  * 用 React 渲染而不是手工 DOM 操作。
  * 必须解析 HTML 时使用经过审定的净化器。

注意：

* Trusted Types 文档把 `Element.innerHTML`、`document.write()` 等 HTML 汇点定义为注入汇点：给定攻击者可控输入时可以执行脚本。([MDN Web Docs][3])
* OWASP HTML5 指南建议给不可信数据赋值时用 `textContent` 代替 `innerHTML`。([OWASP Cheat Sheet Series][4])

---

### REACT-URL-001：校验并约束用于 `href`、`src`、导航和重定向的不可信 URL

严重程度：高 仅当能证明其攻击者可控时

要求：

* MUST 把任何来自不可信输入的 URL 视为危险。
* MUST 对 scheme（以及适用时的主机）做白名单：

  * 通常只允许 `https:`（本地/开发环境或可允许 `http:`）和应用内导航的相对 URL。
  * MUST 显式阻止 `javascript:` 和危险的 `data:` 用法，除非你有专门的校验和明确用例。
* SHOULD 优先用同站相对路径（例如 `/settings`）而不是绝对 URL。
* MUST 校验 “returnTo/next/redirect” 参数（见 REACT-REDIRECT-001）。

不安全模式：

* `<img src={userProvidedUrl}>...`（可用于跟踪/数据外带；用于脚本/iframe 时也有风险）
* `window.location = next`
* `navigate(next)` 而 `next` 来自查询参数且未校验

检测提示：

* 搜索：

  * `href={`、`src={`、`window.location`、`location.href`、`window.open`、`navigate(`、`redirectTo`、`returnTo`、`next=`
* 追踪该值是否来自 URL/查询/存储/API。

修复：

* 实现共享的 `safeUrl()` 工具：

  * 用 `new URL(value, base)` 解析
  * 强制 scheme 白名单和主机白名单（或强制同源）
  * 对重定向：只允许相对路径（以 `/` 开头）或严格的绝对来源白名单。
* 校验失败时回退到安全默认值。

注意：

* OWASP 明确指出 React `dangerouslySetInnerHTML` 的风险，并说明 React 无法在不做专门校验的情况下安全处理 `javascript:` 或 `data:` URL。([OWASP Cheat Sheet Series][9])

---

### REACT-MARKUP-001：Markdown / 富文本渲染必须安全配置

严重程度：中

要求：

* MUST 假设来自用户或 CMS 的 markdown/富文本可能是攻击者可控的。
* MUST 确保未经净化的原始 HTML 不被渲染。
* SHOULD 优先选择满足以下条件的 markdown 渲染器：

  * 默认不允许原始 HTML，或
  * 可配置为禁止原始 HTML，或
  * 在渲染前净化 HTML 输出。

不安全模式：

* 开启“原始 HTML 透传”的 Markdown 渲染（例如允许 HTML 的选项/插件）。
* 未经净化就内联渲染用户提供的 SVG/MathML/HTML。

检测提示：

* 搜索常见库和危险选项：

  * `marked`、`markdown-it`、`react-markdown`、`rehype-raw`、`sanitize: false`、`allowDangerousHtml` 等。
* 查找与“markdown 输出”一起使用的 `dangerouslySetInnerHTML`。

修复：

* 关闭原始 HTML 透传。
* 渲染前用经过验证的净化器（如 DOMPurify）净化输出。

注意：

* OWASP XSS 指南强调：框架逃生舱口需要输出编码和/或 HTML 净化。([OWASP Cheat Sheet Series][9])

---

### REACT-TT-001：可行时使用 Trusted Types（配合 CSP）加固 DOM XSS 汇点

严重程度：低

要求：

* SHOULD 考虑先以 report-only 模式启用 Trusted Types，处理完违规后再强制执行。
* SHOULD 集中管理 Trusted Types 策略，并把它当作需要评审的高风险代码。
* MUST NOT 创建只是把不可信字符串“原样放行”的宽松策略。

不安全模式：

* 对 HTML 汇点不做净化、直接返回原始字符串的 Trusted Types 策略。
* 代码库中散落大量策略（难以审计）。

检测提示：

* 搜索：

  * `trustedTypes.createPolicy`
  * CSP 指令：`require-trusted-types-for`、`trusted-types`
* 搜索仍然存在的 DOM 汇点（REACT-DOM-001）。

修复：

* 实现少量作用域收紧的策略：

  * HTML 策略使用净化器（DOMPurify 或等价物）。
  * 脚本 URL 策略使用严格白名单。
* 先以 report-only 运行，修复违规后再强制执行。

注意：

* MDN 把 Trusted Types 描述为一种确保输入在被传入注入汇点前先被转换（通常是净化）的机制，并点出 HTML 汇点（`innerHTML`、`document.write`）和 JS URL 汇点（`script.src`）。([MDN Web Docs][3])
* W3C Trusted Types 规范将其定位为：通过把汇点锁定为由经评审策略创建的类型化值来降低 DOM XSS 风险。([W3C][15])

---

### REACT-CSP-001：部署并维护 CSP 作为纵深防御（渲染不可信内容时尤其重要）

严重程度：中至高

要求：

* SHOULD 在生产环境部署 CSP；对渲染不可信内容或集成第三方脚本的应用 MUST 部署。
* SHOULD 尽可能避免 `unsafe-inline` 和 `unsafe-eval`。
* SHOULD 在需要时为内联脚本使用 CSP nonce/哈希，并保持策略现实可行。
* SHOULD 在合适场景用 CSP 要求/鼓励 SRI。

不安全模式：

* 应用外壳（SPA 入口 HTML）完全没有 CSP。
* CSP 大范围依赖 `unsafe-inline`/`unsafe-eval` 且无正当理由。
* `script-src *` 或过宽的来源。

检测提示：

* 查找 CSP 配置：

  * 服务器/CDN 配置、`index.html` 响应中的头，或框架配置。
* 若仓库中不存在，标记为“需在边缘核实”。

修复：

* 通过 HTTP 响应头添加 CSP（推荐）。
* 先以 report-only 起步以减少破坏，然后再强制执行。

注意：

* OWASP 把 CSP 描述为对抗 XSS 的“纵深防御”，并指出它即使在静态站点上也能帮助强制 SRI，但不应是唯一防线。([OWASP Cheat Sheet Series][2])

---

### REACT-SRI-001：对第三方脚本和样式使用子资源完整性（SRI）（或自托管）

严重程度：低

要求：

* MUST 把第三方 JS 视为等同于在你的源内执行任意代码。
* 如果从 CDN 或第三方加载：

  * SHOULD 在适用场景使用 SRI（`integrity=...`）和 `crossorigin`。
  * SHOULD 锁定精确版本（避免 “latest” URL）。
  * SHOULD 关键代码优先自托管。

不安全模式：

* `<script src="https://cdn.example.com/lib/latest.js"></script>` 没有 integrity。
* 可动态加载任意脚本且无治理的标签管理器。

检测提示：

* 在 `public/index.html`、模板或 SSR 封装中搜索：

  * `<script src=`、`<link rel="stylesheet" href=`
  * 标签管理器代码片段（GTM、Segment 等）
* 识别运行时 JS 中动态加载的脚本。

修复：

* 为稳定的第三方资源添加 SRI 哈希，或改为自托管。
* 对标签管理器实施治理控制（见 REACT-3P-001）。

注意：

* MDN 把 SRI 描述为一种安全特性：浏览器通过校验加密哈希来确认获取的资源（例如来自 CDN）未被篡改。([MDN Web Docs][7])
* OWASP CSP 指南指出 CSP 可以强制 SRI，且对静态站点同样有用。([OWASP Cheat Sheet Series][2])

---

### REACT-3P-001：第三方 JavaScript 与标签管理器必须最小化并受治理

严重程度：高

要求：

* MUST 最小化第三方脚本，并把每一个都当作供应链风险。
* MUST 确切知道有哪些第三方 JS 在你的源内执行、为什么。
* SHOULD 实施治理：

  * 评审并锁定版本（或在内部镜像）。
  * 限制数据访问（数据层方案）。
  * 使用 SRI 和 CSP；尽可能把不可信 UI 放进 iframe 沙箱。

不安全模式：

* 未经评审的统计/广告脚本，却拥有对 DOM、cookie、存储和用户数据的完全访问权。
* 非工程角色可以随意更改且无变更控制的标签管理器。

检测提示：

* 在 HTML/JS 中搜索常见厂商代码片段：

  * GTM、Segment、Hotjar、FullStory 等。
* 查找动态脚本插入：

  * `document.createElement('script')`、`.src = ...`、`.appendChild(script)`

修复：

* 削减到只保留必要的厂商。
* 可行时：

  * 自托管或镜像脚本。
  * 使用 SRI。
  * 通过受控数据层限制数据暴露。

注意：

* OWASP 指出第三方 JS 的服务端被攻破时可注入恶意 JS，并强调任意代码执行、向第三方泄露敏感信息等风险。([OWASP Cheat Sheet Series][5])

---

### REACT-AUTH-001：token 与会话处理必须能抵抗 XSS（避免把敏感内容存入 Web Storage）

严重程度：中

要求：

* SHOULD 避免把会话标识符或长效 token 存进 `localStorage`（一般也包括 Web Storage），因为 XSS 可以把它们外带。
* 如果 token 必须存在于客户端：

  * SHOULD 优先使用短生命周期的内存存储并配合刷新机制。
  * MUST 限定 token 范围并轮换；避免把长效 bearer token 放进持久化存储。
* SHOULD 尽可能给会话 token 使用 HTTPOnly cookie（需要 CSRF 策略：见 REACT-CSRF-001）。

不安全模式：

* 用 `localStorage.setItem('token', ...)` / `sessionStorage.setItem('token', ...)` 存鉴权 token。
* 把刷新 token 持久化到 `localStorage`。
* 把来自 Web Storage 的数据当作可信。

检测提示：

* 搜索：`localStorage.`、`sessionStorage.`、`setItem(`、`getItem(`、`token`、`jwt`、`refresh`
* 在鉴权代码中搜索把 token 持久化的“记住我”功能。

修复：

* 改用 HTTPOnly cookie（服务端改动）+ CSRF 防护，或使用短生命周期内存 token。
* 缩小 token 范围和生命周期。

注意：

* OWASP HTML5 指南建议避免把敏感信息和会话标识符放进本地存储，并警告一次 XSS 就能窃取 Web Storage 中的全部数据。([OWASP Cheat Sheet Series][4])
* OAuth 浏览器应用指南讨论了存放在 localStorage 等持久化浏览器存储中的 token 可被恶意 JS（例如经 XSS）访问。([IETF Datatracker][16])

---

### REACT-CSRF-001：cookie 鉴权的改状态请求 MUST 有 CSRF 防护

严重程度：高

注意：如果应用不使用基于 cookie 的鉴权（例如使用 Authentication 头），则无需考虑 CSRF。

要求：

* 如果应用依赖 cookie 鉴权：

  * MUST 保护改状态请求（POST/PUT/PATCH/DELETE）免受 CSRF。
  * SHOULD 加入 CSRF token 机制（同步 token 或 double-submit cookie）或适合后端的其他健壮模式。
  * SHOULD 把 SameSite cookie 用作纵深防御，而不是唯一防线。

不安全模式：

* `fetch('/api/transfer', { method: 'POST', credentials: 'include' })` 没有 CSRF token/头，只依赖 cookie。
* 用 GET 执行改状态操作。

检测提示：

* 枚举改状态的网络调用并检查：

  * 是否使用了 `credentials: 'include'` 或 `withCredentials: true`？
  * 是否包含 CSRF token 头（例如 `X-CSRF-Token`）？
* 搜索 “csrf” 工具；若缺失，视为可疑。

修复：

* 增加 CSRF token 流程：

  * 从安全端点获取 token，并附加到改状态请求上。
  * 在服务端校验。
* 保持 SameSite cookie 和 Origin/Referer 校验作为纵深防御。

注意：

* OWASP CSRF 指南把 SameSite 行为（Lax/Strict/None）解释为一种纵深防御技术，并说明 Lax 常是可用性/安全的平衡点，但它不能完全替代 CSRF 防护。([OWASP Cheat Sheet Series][6])

---

### REACT-AUTHZ-001：不要依赖仅前端的授权

严重程度：高（仅当它被当作主要防护时）

要求：

* MUST 把所有前端授权检查只当作 UX。
* MUST 在服务端对任何受保护资源或操作执行授权。

不安全模式：

* 在 UI 中隐藏的“受保护”操作，但可以不经服务端检查直接调用 API。
* 形如 `if (user.isAdmin) { showAdminPanel(); }` 的客户端检查而没有服务端强制。

检测提示：

* 查找围绕敏感操作的 UI 门禁，并核实服务端端点是否执行授权。
* 在仅前端审计中，报告为“客户端检查不是安全；需核实后端”。

修复：

* 增加/确认服务端授权检查。
* 前端门禁仅作为便利保留。

注意：

* 这是 Web 应用安全的通用属性；React 无法独自保护服务端资源。

---

### REACT-NET-001：防止经动态出站请求的数据外带与凭据泄露

严重程度：中至高

要求：

* MUST 避免向攻击者可控的源发起已鉴权请求。
* SHOULD 避免让用户输入控制请求目的地（scheme/host/port）。
* SHOULD 集中管理网络客户端（fetch/axios），做到：

  * 固定 `baseURL`（或严格白名单），
  * 严格处理重定向，
  * 显式使用 `credentials`。

不安全模式：

* `fetch(userProvidedUrl, { credentials: 'include' })`
* `axios.create({ baseURL: userProvidedBase })`
* 客户端里带着敏感头请求任意域名的“URL 抓取/预览”功能。

检测提示：

* 搜索第一个参数或 `baseURL` 来自以下来源的 `fetch(` / `axios(`：

  * 查询参数、localStorage、API 响应、postMessage
* 搜索 `credentials: 'include'`、`withCredentials: true`。

修复：

* 强制目的地白名单；除非明确需要，禁止跨源请求。
* 对任何非白名单目的地剥除凭据/Authorization 头。

注意：

* 即使浏览器限制了某些跨源行为，把 token/头泄露给不可信端点仍是常见的失败模式。

---

### REACT-REDIRECT-001：防止开放重定向与不可信导航

严重程度：中

要求：

* MUST 校验来自不可信输入的重定向/导航目标（`next`、`returnTo`、`redirect`）。
* SHOULD 只允许同站相对路径，或对绝对 URL 使用受信任源的严格白名单。

不安全模式：

* `window.location.href = new URLSearchParams(location.search).get('next')`
* `navigate(next)` 而 `next` 来自查询参数。

检测提示：

* 搜索：`next`、`returnTo`、`redirect`、`window.location`、`navigate(`
* 追查重定向目标的来源。

修复：

* 只允许相对路径（`/^\/[^\s]*$/`）或白名单来源。
* 无效时回退到安全默认值（例如 `/`）。

注意：

* 开放重定向常被用于钓鱼，并可破坏 SSO/OAuth 流程。

---

### REACT-SW-001：Service worker 权限很高；要求 HTTPS 与安全的缓存/更新规则

严重程度：中

要求：

* MUST 经 HTTPS 提供 service worker（`localhost` 开发除外），且只在安全上下文部署。
* MUST 避免缓存敏感的已鉴权 API 响应，除非经过专门设计和威胁建模。
* SHOULD 实现安全的更新策略（提示重载、版本化缓存、激活时清理旧缓存）。

不安全模式：

* 给已鉴权应用注册 service worker 并不加区分地缓存“一切”。
* 缓存中长期保留跨账户共享的 PII 或用户特定内容。

检测提示：

* 搜索：

  * `navigator.serviceWorker.register`
  * `workbox`、`precacheAndRoute`、自定义 `fetch` 处理器
* 检查缓存模式（`caches.open`、`cache.put`、`respondWith`）。

修复：

* 只缓存静态资源（JS/CSS/图片），除非有设计好的离线模型。
* 如果必须缓存用户特定数据，确保缓存键按用户隔离。
* 提供清晰的更新机制。

注意：

* MDN 指出出于安全原因 service worker 要求 HTTPS，且其行为类似请求/响应代理。([MDN Web Docs][10])
* “安全上下文”的存在是为了防止 MITM 攻击者访问强大的 API；service worker 正是这类强大特性的例子。([MDN Web Docs][18])

---

### REACT-HEADERS-001：确保为 React 应用外壳设置必要的安全响应头（应用或边缘）

严重程度：中

要求（从某个源提供的典型 SPA）：

* SHOULD 设置：

  * CSP（`Content-Security-Policy`）
  * `X-Content-Type-Options: nosniff`
  * 点击劫持防护（CSP 的 `frame-ancestors` 和/或 `X-Frame-Options`）
  * `Referrer-Policy`
  * 按需设置 `Permissions-Policy`
* MUST 确保这些头在某处被设置（CDN/边缘/服务器），即使仓库中没有。

不安全模式：

* 任何位置（应用或边缘）都没有安全响应头。
* 渲染不可信内容或使用第三方脚本的应用缺少 CSP。

检测提示：

* 检查仓库中的服务器/CDN 配置（nginx、Cloudflare、Vercel 配置等）。
* 若不存在，标记为“需在运行时/边缘核实”。

修复：

* 在边缘集中设置响应头。
* 保持 CSP 现实且迭代推进（report-only → 强制）。

注意：

* MDN 点击劫持指南讨论了包括 `X-Frame-Options` 和 CSP `frame-ancestors` 在内的防御手段。([MDN Web Docs][8])
* OWASP CSP 指南说明了经响应头交付的方式，并推荐响应头作为首选机制。([OWASP Cheat Sheet Series][2])

---

### REACT-POSTMSG-001：`postMessage` 必须校验来源，并把载荷当作不可信数据

严重程度：中至高（取决于消息能做什么）

要求：

* MUST 在发送消息时指定精确的 `targetOrigin`（不要用 `*`），除非有严格理由。
* MUST 在接收时校验 `event.origin` 并校验消息结构。
* MUST NOT 把消息数据当代码求值，或作为 HTML 插入 DOM。

不安全模式：

* 向未知目标 `window.postMessage(data, '*')`。
* 接收端：

  * `window.addEventListener('message', (e) => { eval(e.data) })`
  * `element.innerHTML = e.data`

检测提示：

* 搜索：`postMessage(`、`addEventListener('message'`
* 检查是否有来源校验和安全处理。

修复：

* 增加严格的来源白名单和 schema 校验（例如 zod）。
* 把消息载荷严格当数据；经 React 安全渲染。

注意：

* OWASP HTML5 指南建议为 `postMessage` 指定预期来源、检查发送方来源、校验数据，并避免对消息内容用 eval/innerHTML。([OWASP Cheat Sheet Series][4])

---

### REACT-FILE-001：文件上传与预览不得制造客户端活动内容漏洞

严重程度：中（若可能存储型 XSS 则为高）

要求：

* MUST 把用户上传的文件和预览当作潜在恶意内容。
* MUST NOT 内联渲染上传的 HTML/SVG/其他活动内容，除非已净化且明确需要。
* SHOULD 在客户端为 UX 校验文件类型，但 MUST 依赖服务端校验保证安全。

不安全模式：

* 把用户上传的 HTML 当内容渲染。
* 未经净化就通过 `dangerouslySetInnerHTML` 或 `<iframe srcdoc=...>` 内联渲染不可信 SVG/HTML。

检测提示：

* 搜索上传组件和预览逻辑：

  * `input type="file"`、`FileReader`、`URL.createObjectURL`、`<iframe>`、`<object>`、`<embed>`。
* 追踪上传内容后续在哪里被展示。

修复：

* 限制接受的类型，按需净化，高风险类型优先走下载/附件流程。
* 确保服务端执行真正的策略（类型检查、重命名、扫描、存到 webroot 之外）。

注意：

* OWASP 文件上传指南强调：扩展名白名单、校验文件类型、生成文件名、限制大小、存到 webroot 之外，并在文件可被公开获取时考虑“客户端活动内容（XSS、CSRF 等）”。([OWASP Cheat Sheet Series][19])

---

### REACT-SUPPLY-001：依赖与供应链卫生（前端 + 构建工具链）

严重程度：低

要求：

* MUST 使用 lockfile 并在 CI 中强制可复现安装。
* SHOULD 定期审计依赖并对以下内容的通告快速响应：

  * React、react-dom、路由库、构建工具链（Vite/Webpack）、净化器、鉴权库等。
* SHOULD 降低安装期脚本攻击和 typosquatting 风险的暴露。

审计关注点：

* CI 应使用 `npm ci`（或 Yarn frozen lockfile / pnpm 等价物）防止漂移。
* 使用漏洞扫描（`npm audit`、GitHub Dependabot/alerts 等）。

不安全模式：

* 没有 lockfile，或 CI 中忽略 lockfile。
* CI 中 `npm install` 产生不可复现的构建。
* 未锁定或未经评审的高风险依赖；未评审就突然大版本升级。
* 盲目运行第三方包的安装脚本。

检测提示：

* 检查 lockfile：`package-lock.json`、`yarn.lock`、`pnpm-lock.yaml`。
* 检查 CI 脚本用 `npm install` 还是 `npm ci`。
* 搜索 `postinstall` 脚本和可疑的构建步骤。

修复：

* 使用 lockfile 并在 CI 中强制（例如 `npm ci`）。
* 定期审计；负责任地锁定/升级。
* 可行时考虑限制安装脚本。

注意：

* npm 文档把 `npm audit` 描述为把项目依赖树提交给 registry 以获得已知漏洞报告，并（可选）通过 `npm audit fix` 应用修复，同时指出部分漏洞需要人工评审。([npm Docs][20])
* npm 文档把 `npm ci` 描述为面向自动化/CI 环境：要求已有 lockfile，且 `package.json` 与 lockfile 不一致时会失败。([npm Docs][21])
* OWASP NPM 安全指南建议强制使用 lockfile，并明确点名 `npm ci` / `yarn install --frozen-lockfile` 在不一致时中止；同时强调安装期脚本的风险，以及用 `--ignore-scripts` 减少攻击面的选项。([OWASP Cheat Sheet Series][22])

---

## 5) 实用扫描启发式（如何“挖”）

主动扫描时，使用这些高信号模式：

* 原始 HTML / XSS 逃生舱口：

  * `dangerouslySetInnerHTML`、`__html:`
  * Markdown HTML 透传标志：`rehype-raw`、`allowDangerousHtml`、`sanitize: false`
* DOM XSS 汇点：

  * `innerHTML`、`outerHTML`、`insertAdjacentHTML`、`document.write`、`DOMParser`、`createContextualFragment`
* 危险 JS 执行：

  * `eval(`、`new Function(`、`setTimeout("`、`setInterval("`
* 不可信 URL 注入 / 导航：

  * 值不可信的 `href={` / `src={`
  * `window.location`、`location.href`、`window.open`、`navigate(`
  * 查询参数：`next`、`returnTo`、`redirect`
* token/会话风险：

  * `localStorage.setItem`、`sessionStorage.setItem`、`getItem(` 配合 `token`、`jwt`、`refresh`
* cookie/CSRF 耦合：

  * 改状态请求使用 `credentials: 'include'`、`withCredentials: true` 却没有 CSRF 头
* 第三方脚本：

  * `public/index.html` 中的 `<script src=...>`
  * 标签管理器片段和动态脚本插入
* Service worker：

  * `navigator.serviceWorker.register`、Workbox 用法、自定义 `fetch` 处理器
* postMessage：

  * `postMessage(` 使用 `*`、缺少 `event.origin` 检查
* 供应链：

  * 缺少 lockfile、CI 用 `npm install`、没有审计步骤、危险的 postinstall 脚本

始终尝试确认：

* 数据来源（不可信 vs 可信）
* 汇点类型（React 逃生舱口 vs DOM 汇点 vs 导航 vs 存储）
* 已有的防护措施（净化、白名单、CSP/Trusted Types、CSRF token、响应头、治理）

---

## 6) 参考资料（访问于 2026-01-26）

React 主要文档：

* React 19 稳定版发布公告 — `https://react.dev/blog/2024/12/05/react-19` ([React][23])
* React DOM 文档：`dangerouslySetInnerHTML` 警告 — `https://react.dev/reference/react-dom/components/common#dangerouslysetting-the-inner-html` ([React][12])
* React（旧版）JSX 转义说明 — `https://legacy.reactjs.org/docs/introducing-jsx.html` ([React][14])

OWASP Cheat Sheet Series：

* Cross Site Scripting Prevention（框架逃生舱口；React `dangerouslySetInnerHTML`；URL 校验说明）— `https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html` ([OWASP Cheat Sheet Series][9])
* Content Security Policy — `https://cheatsheetseries.owasp.org/cheatsheets/Content_Security_Policy_Cheat_Sheet.html` ([OWASP Cheat Sheet Series][2])
* Cross-Site Request Forgery Prevention — `https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html` ([OWASP Cheat Sheet Series][6])
* HTML5 Security（Web Storage、postMessage、tabnabbing、沙箱框架）— `https://cheatsheetseries.owasp.org/cheatsheets/HTML5_Security_Cheat_Sheet.html` ([OWASP Cheat Sheet Series][4])
* Third Party JavaScript Management — `https://cheatsheetseries.owasp.org/cheatsheets/Third_Party_Javascript_Management_Cheat_Sheet.html` ([OWASP Cheat Sheet Series][5])
* File Upload — `https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html` ([OWASP Cheat Sheet Series][19])
* NPM Security best practices — `https://cheatsheetseries.owasp.org/cheatsheets/NPM_Security_Cheat_Sheet.html` ([OWASP Cheat Sheet Series][22])

浏览器 / 平台参考（MDN、W3C）：

* Trusted Types API — `https://developer.mozilla.org/en-US/docs/Web/API/Trusted_Types_API` ([MDN Web Docs][3])
* W3C Trusted Types 规范 — `https://www.w3.org/TR/trusted-types/` ([W3C][15])
* Subresource Integrity — `https://developer.mozilla.org/en-US/docs/Web/Security/Subresource_Integrity` ([MDN Web Docs][7])
* 点击劫持防御概览 — `https://developer.mozilla.org/en-US/docs/Web/Security/Attacks/Clickjacking` ([MDN Web Docs][8])
* Using Service Workers（HTTPS 要求；类代理行为）— `https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API/Using_Service_Workers` ([MDN Web Docs][10])
* Secure contexts（强大 API 限 HTTPS）— `https://developer.mozilla.org/en-US/docs/Web/Security/Defenses/Secure_Contexts` ([MDN Web Docs][18])
* Link `rel` 值（noopener/noreferrer）— `https://developer.mozilla.org/en-US/docs/Web/HTML/Attributes/rel` ([MDN Web Docs][17])

构建工具链 / env 暴露参考：

* Create React App 环境变量警告 — `https://create-react-app.dev/docs/adding-custom-environment-variables/` ([create-react-app.dev][1])
* Vite 环境变量安全说明 — `https://vite.dev/guide/env-and-mode` ([vitejs][11])

鉴权/token 存储指南：

* OAuth 2.0 for Browser-Based Apps（token 存储讨论）— `https://datatracker.ietf.org/doc/html/draft-ietf-oauth-browser-based-apps` ([IETF Datatracker][16])

依赖工具参考：

* npm audit 文档 — `https://docs.npmjs.com/cli/v10/commands/npm-audit/` ([npm Docs][20])
* npm ci 文档 — `https://docs.npmjs.com/cli/v10/commands/npm-ci/` ([npm Docs][21])

净化器参考：

* DOMPurify — `https://github.com/cure53/DOMPurify` ([GitHub][13])

[1]: https://create-react-app.dev/docs/adding-custom-environment-variables/ "Adding Custom Environment Variables | Create React App"
[2]: https://cheatsheetseries.owasp.org/cheatsheets/Content_Security_Policy_Cheat_Sheet.html "Content Security Policy - OWASP Cheat Sheet Series"
[3]: https://developer.mozilla.org/en-US/docs/Web/API/Trusted_Types_API "Trusted Types API - Web APIs | MDN"
[4]: https://cheatsheetseries.owasp.org/cheatsheets/HTML5_Security_Cheat_Sheet.html "HTML5 Security - OWASP Cheat Sheet Series"
[5]: https://cheatsheetseries.owasp.org/cheatsheets/Third_Party_Javascript_Management_Cheat_Sheet.html "Third Party Javascript Management - OWASP Cheat Sheet Series"
[6]: https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html "Cross-Site Request Forgery Prevention - OWASP Cheat Sheet Series"
[7]: https://developer.mozilla.org/en-US/docs/Web/Security/Defenses/Subresource_Integrity "Subresource Integrity - Security | MDN"
[8]: https://developer.mozilla.org/en-US/docs/Web/Security/Attacks/Clickjacking "Clickjacking - Security | MDN"
[9]: https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html "Cross Site Scripting Prevention - OWASP Cheat Sheet Series"
[10]: https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API/Using_Service_Workers "Using Service Workers - Web APIs | MDN"
[11]: https://vite.dev/guide/env-and-mode "Env Variables and Modes | Vite"
[12]: https://react.dev/reference/react-dom/components/common "Common components (e.g. <div>) – React"
[13]: https://github.com/cure53/DOMPurify "GitHub - cure53/DOMPurify: DOMPurify - a DOM-only, super-fast, uber-tolerant XSS sanitizer for HTML, MathML and SVG. DOMPurify works with a secure default, but offers a lot of configurability and hooks. Demo:"
[14]: https://legacy.reactjs.org/docs/introducing-jsx.html "Introducing JSX – React"
[15]: https://www.w3.org/TR/trusted-types/ "Trusted Types"
[16]: https://datatracker.ietf.org/doc/html/draft-ietf-oauth-browser-based-apps "
            
                draft-ietf-oauth-browser-based-apps-26
            
        "
[17]: https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Attributes/rel "HTML attribute: rel - HTML | MDN"
[18]: https://developer.mozilla.org/en-US/docs/Web/Security/Defenses/Secure_Contexts "Secure contexts - Security | MDN"
[19]: https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html "File Upload - OWASP Cheat Sheet Series"
[20]: https://docs.npmjs.com/cli/v10/commands/npm-audit "npm-audit | npm Docs"
[21]: https://docs.npmjs.com/cli/v10/commands/npm-ci "npm-ci | npm Docs"
[22]: https://cheatsheetseries.owasp.org/cheatsheets/NPM_Security_Cheat_Sheet.html "NPM Security - OWASP Cheat Sheet Series"
[23]: https://react.dev/blog/2024/12/05/react-19 "React v19 – React"
