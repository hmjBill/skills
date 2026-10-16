# 前端 JavaScript/TypeScript Web 安全规范（原生浏览器 JS/TS、现代浏览器）

本文档是一份**安全规范**，用于支持：

1. 为新前端 JavaScript/TypeScript 进行**默认安全的代码生成**（不假定特定框架）。
2. 对既有前端代码进行**安全审查 / 漏洞挖掘**（被动式“边工作边注意问题”，以及主动式“扫描仓库并报告发现”）。

本文档有意写成一套**规范性要求**（“MUST/SHOULD/MAY”）加**审计规则**（坏模式长什么样、如何检测、如何修复/缓解）。

---

## 0) 安全、边界与反滥用约束（必须遵守）

* MUST NOT 请求、输出、记录、硬编码或提交机密（本应保密的 API key、私钥、密码、OAuth 刷新 token、会话 token、cookie）。
  注意：

  * 前端代码天然对最终用户可见。如果某个值必须保密，它就不能出现在交付给浏览器的代码里。
  * 如果项目使用“公开”密钥（例如可公开的分析密钥），它们 MUST 被当作非机密并相应限定范围。

* MUST NOT 通过关闭防护来“修复”安全问题（例如没有正当理由就用 `unsafe-inline`/`unsafe-eval` 削弱 CSP、移除 `postMessage` 的来源检查、为了省事改用 `innerHTML`、接受任意重定向/URL，或关闭净化）。

* MUST 在审计中给出**基于证据的发现**：引用能支撑结论的文件路径、代码片段和相关 HTML/CSP/配置值。

* MUST 诚实对待不确定性：

  * 安全响应头（CSP、frame-ancestors 等）可能由服务器/边缘/CDN 设置而不是仓库代码。若不可见，报告为“此处不可见；需在运行时/边缘配置核实”。（另注意 `<meta http-equiv=...>` 只能模拟头部的一个子集；不要因为存在 meta 标签就假定其他安全响应头存在。）([MDN Web Docs][1])

---

## 1) 工作模式

### 1.1 生成模式（默认）

当被要求编写新前端 JS/TS 代码或修改既有代码时：

* MUST 遵循本规范中的每一条 **MUST** 要求。
* SHOULD 遵循每一条 **SHOULD** 要求，除非用户明确另有指示。
* MUST 优先使用默认安全的浏览器 API 和经过验证的库，而不是自研安全代码（HTML 净化尤其如此）。
* MUST 避免引入新的危险汇点（sink）（`innerHTML` 等 DOM XSS 注入汇点、导航到 `javascript:` URL、经 `eval`/`Function` 动态执行代码、不安全 `postMessage`、不安全的第三方脚本加载等）。([OWASP Cheat Sheet Series][2])

### 1.2 被动审查模式（编辑期间始终开启）

在前端仓库的任何位置工作时（即使用户没有要求安全扫描）：

* MUST “注意”所触及/邻近代码中违反本规范的地方。
* SHOULD 在问题出现时提及，并附简要说明 + 安全的修复方式。

### 1.3 主动审计模式（明确要求扫描时）

当用户要求“扫描”、“审计”或“挖漏洞”时：

* MUST 系统性地在代码库中搜索违反本规范的地方。
* MUST 以结构化格式输出发现（见 §2.3）。

推荐审计顺序：

1. HTML 入口（`index.html`、服务端渲染模板）、脚本/样式引入，以及 CSP 的交付方式（响应头 vs meta）。([W3C][3])
2. DOM XSS 汇点（`innerHTML`、`document.write`、`insertAdjacentHTML`、事件处理器属性）及其数据来源（URL 参数/hash、存储、postMessage、API 响应）。([OWASP Cheat Sheet Series][2])
3. 导航/重定向处理（`window.location*`、链接目标、URL 白名单），包括 `javascript:` URL 危害。([MDN Web Docs][4])
4. 跨源通信（`postMessage`、iframe 嵌入模式、沙箱）。([MDN Web Docs][5])
5. 敏感数据的存储（localStorage/sessionStorage）与信任假设。([OWASP Cheat Sheet Series][6])
6. 第三方脚本 / 标签管理器 / CDN，以及完整性控制（SRI）与策略控制（CSP）。([OWASP Cheat Sheet Series][7])
7. DOM clobbering gadget 及对 `window`/`document` 命名属性的不安全依赖。([OWASP Cheat Sheet Series][8])

---

## 2) 定义与审查指引

### 2.1 不可信输入（除非证明否则按攻击者可控处理）

示例包括：

* 来自 URL 的数据：`location.href`、`location.search`、`location.hash`、`document.baseURI`、`new URLSearchParams(location.search)`、路由片段。([OWASP Cheat Sheet Series][2])
* 可能包含用户控制标记的 DOM 内容（评论、资料、CMS 内容、markdown 转 HTML 输出等），尤其是动态插入的。([OWASP Cheat Sheet Series][2])
* 来自其他窗口/框架的 `postMessage` 事件数据（`event.data`）和元数据（`event.origin`）。([MDN Web Docs][5])
* 浏览器存储：`localStorage`、`sessionStorage`、IndexedDB（内容可经 XSS 或本机访问被攻击者影响；绝不当作“可信”）。([OWASP Cheat Sheet Series][6])
* 网络调用返回的任何数据（即使来自“你自己的 API”），因为它可能包含存储型攻击者内容，只有在插入 DOM 时才变得危险。([OWASP Cheat Sheet Series][2])

### 2.2 危险汇点（DOM XSS / 代码执行汇点）

汇点（sink）是指任何能执行脚本，或以安全敏感方式把攻击者可控字符串解释为 HTML/JS/URL 的 API/操作。高信号汇点包括：

* HTML 解析 / 插入：`innerHTML`、`outerHTML`、`insertAdjacentHTML`、`document.write`、`document.writeln`。([OWASP Cheat Sheet Series][2])
* 动态代码执行：`eval`、`new Function`、`setTimeout("...")`、`setInterval("...")`。([MDN Web Docs][10])
* 经 `Location.href`/`window.location` 之类的 setter（以及攻击者可控时的链接 `href`）导航到含脚本的 URL（例如 `javascript:`）。([MDN Web Docs][4])
* 从字符串设置事件处理器属性，例如 `setAttribute("onclick", "...")`。([OWASP Cheat Sheet Series][2])

### 2.3 要求的审计发现格式

对每个发现的问题，输出：

* 规则 ID：
* 严重程度：严重（Critical）/ 高（High）/ 中（Medium）/ 低（Low）
* 位置：文件路径 + 函数/类/模块 + 行号
* 证据：确切的代码/配置片段
* 影响：可能出什么问题、谁能够利用
* 修复：安全的改动（优先最小 diff）
* 缓解：当立即修复困难时的纵深防御措施
* 误报说明：不确定时需要核实什么

---

## 3) 安全基线：最低生产配置（生产环境 MUST）

这是能防止常见前端 JS/TS 安全配置错误的最小基线。有些条目在“仓库内”（HTML/JS），有些可能在服务器/边缘。

### 3.1 内容安全策略（CSP）基线（SHOULD；高风险应用 MUST）

* SHOULD 尽可能经 HTTP 响应头交付 CSP。
* 无法设置响应头时（例如纯静态托管限制），MAY 经 HTML `<meta http-equiv="Content-Security-Policy" ...>` 标签交付 CSP。([MDN Web Docs][1])
* 如果经 `<meta http-equiv>` 使用 CSP，MUST 理解其局限：

  * 策略只作用于 meta 元素之后的内容（因此必须出现在非常靠前的位置，位于你想约束的所有脚本/资源之前）。([W3C][3])
  * 以下指令在 meta 交付的策略中**不受支持**，会被忽略：`report-uri`、`frame-ancestors`、`sandbox`。([W3C][3])
  * “Report-only” CSP 无法经 meta 元素设置。([W3C][3])

实际基线目标：

* 避免脚本来源使用 `unsafe-inline` 和 `unsafe-eval`（它们会显著削弱 CSP 对抗 XSS 的价值）。([MDN Web Docs][10])
* 如需内联脚本，优先使用基于 nonce 或哈希的脚本策略。([MDN Web Docs][10])
* 可行时考虑启用 Trusted Types 强制。([MDN Web Docs][11])

### 3.2 第三方脚本基线（SHOULD）

* SHOULD 最小化第三方脚本执行，并把它当作与第一方 JS 同级的特权（它以你的源的权限运行）。([OWASP Cheat Sheet Series][7])
* SHOULD 对从 CDN 加载的第三方脚本/样式使用子资源完整性（SRI）。([MDN Web Docs][12])

### 3.3 跨窗口通信基线（SHOULD）

* SHOULD 把 `postMessage` 通信限制到显式来源，并校验来源和消息结构。([MDN Web Docs][5])

---

## 4) 规则（生成 + 审计）

每条规则包含：要求的做法、不安全模式、检测提示与修复方法。

### JS-XSS-001：不要把不可信 HTML 注入 DOM（避免 `innerHTML` 及同类方法）

严重程度：若能证明攻击者可控输入可达这些 API 则为严重；否则为中


要求：

* MUST 把 `innerHTML`、`outerHTML`、`insertAdjacentHTML` 当作危险汇点（当其输入可能包含不可信数据时）。([OWASP Cheat Sheet Series][2])
* MUST 优先使用不解析 HTML 的安全 DOM API：

  * 文本用 `textContent`。([OWASP Cheat Sheet Series][2])
  * 非事件处理器属性用 `document.createElement`、`appendChild`、`setAttribute`。([OWASP Cheat Sheet Series][2])
* 如果确实需要插入 HTML，SHOULD 用经过良好评审的 HTML 净化器净化，并强烈考虑强制 Trusted Types，把用法限定在经审计的代码路径内。([MDN Web Docs][11])

不安全模式：

* `el.innerHTML = userInput`
* `el.insertAdjacentHTML('beforeend', userInput)`
* `el.outerHTML = userInput`

检测提示：

* 搜索：`.innerHTML`、`.outerHTML`、`insertAdjacentHTML(`。
* 追踪被插入字符串的来源：URL 参数/hash、postMessage、存储、API 响应、DOM 属性。([OWASP Cheat Sheet Series][2])

修复：

* 纯文本替换为 `textContent`。([OWASP Cheat Sheet Series][2])
* 结构化 UI 显式构建 DOM 节点。
* 对“富文本”需求：

  * 使用基于白名单的净化器净化。
  * 优先返回安全的“组件”而不是任意 HTML 字符串。
  * 在受支持场景用 Trusted Types 强制，确保只有 `TrustedHTML` 到达汇点。([MDN Web Docs][11])

缓解：

* 部署严格 CSP 并考虑 Trusted Types 强制（`require-trusted-types-for 'script'`）。([MDN Web Docs][10])

误报说明：

* 如果字符串可证明是常量或完全由受信常量生成，可能是安全的。但仍应优先更安全的 API。

---

### JS-XSS-002：避免 `document.write` / `document.writeln`（XSS + document clobbering 危害）

严重程度：若能证明攻击者可控输入可达这些 API 则为严重；否则为中 

要求：

* MUST 避免在生产代码中使用 `document.write()` 和 `document.writeln()`（它们是 XSS 载体，即使某些浏览器在特定情况下会阻止注入的 `<script>`，仍可被构造的 HTML 滥用）。([MDN Web Docs][13])
* 如果遗留用法不可避免，MUST 确保没有不可信输入到达这些 API，并在受支持场景 SHOULD 强制 Trusted Types（`TrustedHTML`）。([MDN Web Docs][14])

不安全模式：

* `document.write(userInput)`
* `document.writeln(getParam('q'))`

检测提示：

* 搜索 `document.write(`、`document.writeln(`。([OWASP Cheat Sheet Series][2])

修复：

* 替换为 DOM 操作（`createElement`、`appendChild`）或安全文本插入（`textContent`）。([OWASP Cheat Sheet Series][2])

缓解：

* 若汇点仍存在，严格 CSP + Trusted Types 强制可缩小波及范围。([MDN Web Docs][10])

---

### JS-XSS-003：不要用字符串转代码执行（`eval`、`new Function`、字符串定时器）

严重程度：若能证明攻击者可控输入可达这些 API 则为严重；否则为中

要求：

* MUST NOT 把不可信数据传给：

  * `eval()`
  * `new Function(...)`
  * 接受字符串参数的 `setTimeout("...")` / `setInterval("...")` ([MDN Web Docs][10])
* SHOULD 在现代前端代码中完全避免这些 API；重构为非 eval 逻辑。([MDN Web Docs][10])
* MUST NOT 通过添加 `unsafe-eval` 来“修复 CSP 报错”，除非有书面、经评审的理由和补偿控制。([MDN Web Docs][10])

不安全模式：

* `eval(userInput)`
* `new Function("return " + userInput)()`
* `setTimeout(userInput, 0)` 而 userInput 是字符串

检测提示：

* 搜索 `eval(`、`new Function`、`setTimeout("`、`setInterval("`。
* 同时搜索后续被使用的代码字符串构造。

修复：

* 把动态代码替换为：

  * 结构化数据 + 显式分支/处理器，
  * JSON 用 `JSON.parse` 而不是 `eval`。([OWASP Cheat Sheet Series][2])

缓解：

* 默认阻止 `eval()` 类 API 的 CSP，并避免 `unsafe-eval`。([MDN Web Docs][10])
* 在受控场景考虑 Trusted Types，但把它当作加固层，而不是保留 eval 模式的许可证。([MDN Web Docs][10])

---

### JS-XSS-004：不要从字符串设置事件处理器属性（例如 `setAttribute("onclick", "...")`）

严重程度：高

要求：

* MUST NOT 对不可信数据使用 `setAttribute("on…", string)` 或类似模式；这会把字符串强制转成事件处理器上下文中的可执行代码。([OWASP Cheat Sheet Series][2])
* SHOULD 优先使用带函数引用的 `addEventListener`。

不安全模式：

* `el.setAttribute("onclick", userInput)`
* `el.onclick = userControlledString`（字符串赋值）

检测提示：

* 搜索 `.setAttribute("on`、`.onclick =`、`.onmouseover =` 等。
* 追踪右侧值是否可被 URL/hash/存储/postMessage 影响。([OWASP Cheat Sheet Series][2])

修复：

* 替换为 `addEventListener("click", () => { ... })`。
* 如果需要动态分发，用标识符到函数的白名单映射（不做字符串 eval）。([OWASP Cheat Sheet Series][2])

---

### JS-URL-001：导航前净化并对 URL 做白名单（尤其 `window.location` / `location.replace`）

严重程度：低（若能证明攻击者可完全控制 URL 则为高）

重要：这条可能产生大量误报。请做额外分析判断 URL 是否完全攻击者可控。若非完全可控，则至多算提示信息。

注意：能够重定向到任意 URL 可能是重要功能。如果这是功能目标，那么至少要检查 scheme，即使 origin 允许为任意值。

要求：

* MUST 把对导航目标的任何赋值当作安全敏感：

  * `window.location = ...`
  * `location.href = ...`
  * `location.assign(...)`
  * `location.replace(...)` ([MDN Web Docs][4])
* MUST 阻止导航到 `javascript:` URL（以及一般的其他含脚本/活动 scheme），尤其当输入来自 URL 参数、存储或消息时。([MDN Web Docs][4])。只允许 `http:` 和 `https:`。
* SHOULD 校验/白名单目的地。安全基线是：

  * 只允许同源相对路径，或
  * 只允许严格的来源与协议白名单（通常 `https:`，本地开发可选 `http:`）。([OWASP Cheat Sheet Series][8])

不安全模式：

* `location.replace(getParam("next"))`
* `window.location = userSuppliedUrl`
* `location.assign(window.redirectTo || "/")` 而 `redirectTo` 可被 clobber 或由攻击者设置 ([OWASP Cheat Sheet Series][8])

检测提示：

* 搜索 `window.location`、`location.href`、`location.assign`、`location.replace`。
* 搜索常见重定向参数：`next`、`returnTo`、`redirect`、`url`、`continue`。
* 搜索 `javascript:` 字面量用法。([MDN Web Docs][4])

修复：

* 用 `new URL(value, location.origin)` 解析并校验，然后强制：

  * `url.protocol` 属于 `{ "https:" }`（`http:` 只出现在显式的仅开发代码路径中），
  * 内部重定向要求 `url.origin` 等于 `location.origin`，外部重定向要求在严格白名单内，
  * 可选只允许特定路径前缀。([MDN Web Docs][4])
* 校验失败时导航到安全默认值（首页/仪表盘）。

缓解：

* 部署严格 CSP 与 Trusted Types 强制以降低 DOM XSS 汇点的影响，但注意 Trusted Types 本身并不能阻止所有不安全导航场景。([W3C][15])

误报说明：

重要：这条可能产生大量误报。请做额外分析判断 URL 是否完全攻击者可控。若非完全可控，则至多算提示信息。

* 有些应用有意支持外部重定向（SSO、支付流程）。那些 MUST 白名单化并写入文档。

---

### JS-URL-002：插入 DOM URL 上下文（`href`、`src` 等）前净化 URL

严重程度：低（若能证明攻击者可完全控制 URL 则为高）

重要：这条可能产生大量误报。请做额外分析判断 URL 是否完全攻击者可控。若非完全可控，则至多算提示信息。

要求：

* MUST 把设置含 URL 的 DOM 属性/特性当作安全敏感，尤其是：

  * `a.href`、`img.src`、`script.src`、`iframe.src`、`form.action`、`link.href`。
* MUST 在值可能受攻击者影响时阻止含脚本的 scheme（`javascript:` 和其他活动 scheme）。([MDN Web Docs][4])
* SHOULD 在解析和校验之后再设置属性（例如 `a.href = url.toString()`），而不是字符串拼接。

不安全模式：

* `link.href = getParam("u")`
* `el.setAttribute("href", userInput)` 未校验
* 用不可信片段拼接构造 URL

检测提示：

* 搜索 `.href =`、`.src =`、`.action =`、`setAttribute("href"`、`setAttribute("src"`。
* 搜索 URL 中的 `javascript:` / `data:` 用法。([MDN Web Docs][4])

重要：这条可能产生大量误报。请做额外分析判断 URL 是否完全攻击者可控。若非完全可控，则至多算提示信息。

修复：

* 使用 `new URL(...)` 并校验：

  * 协议白名单
  * 完全不要把用户提供的值传入 `<script src>`（视为代码执行）。([OWASP Cheat Sheet Series][8])

---

### JS-CSP-001：使用 CSP；允许经 meta 交付

严重程度：中至高（取决于威胁模型；处理不可信内容时为高）

注意：最重要的是设置 CSP 的 script-src。其他指令重要性较低，为便于开发通常可以省略。

要求：

* SHOULD 部署 CSP 作为对抗 XSS 的主要纵深防御。([MDN Web Docs][10])
* 响应头不可用时，MAY 经 `<meta http-equiv="Content-Security-Policy" ...>` 提供 CSP。([MDN Web Docs][1])
* 如果 CSP 经 meta 交付，MUST：

  * 放在靠前位置（位于你想约束的脚本/资源之前），且
  * 不依赖 meta 策略中不受支持的指令（`report-uri`、`frame-ancestors`、`sandbox`）。([W3C][3])
* MUST 避免把添加 `unsafe-inline` 当作 CSP 问题的“快速修复”，除非明确需要并经评审（它会废掉 CSP 的大部分意义）。([MDN Web Docs][10])
* MUST 避免添加 `unsafe-eval`，除非明确需要并经评审（它会放开常被滥用的 eval 类 API）。([MDN Web Docs][10])

不安全模式：

* 渲染不可信内容的应用在任何位置（仓库 HTML 或服务器/边缘）都没有 CSP。
* CSP 包含 `script-src 'unsafe-inline'` 和/或 `script-src 'unsafe-eval'` 而没有充分理由。([MDN Web Docs][10])
* CSP 经 meta 交付却包含 `frame-ancestors`（meta 中会被忽略）。([W3C][3])

检测提示：

* 在 HTML 中搜索 `<meta http-equiv="Content-Security-Policy"`。
* 在服务器/边缘配置中搜索 `Content-Security-Policy` 头。
* 如果 CSP 只在 meta 中，检查它是否出现在你想约束的所有 `<script>` 标签之前。([W3C][3])

修复：

* 优先在服务器/边缘经响应头交付 CSP。
* 如果只能用 meta，保持强白名单 CSP 并记录其局限；在服务器/边缘实现点击劫持防护（例如 `frame-ancestors`），不要放 meta 里。([W3C][3])

---

### JS-CSP-002：优先严格 CSP（nonce/哈希）；代码中避免内联/eval 模式

严重程度：中

注意：最重要的是设置 CSP 的 script-src。其他指令重要性较低，为便于开发通常可以省略。

要求：

* SHOULD 让前端代码设计成在严格 CSP 下可运行：

  * 避免内联脚本和内联事件处理器，
  * 避免 eval 类 API（见 JS-XSS-003），
  * 需要时经 nonce 或哈希放行脚本。([MDN Web Docs][10])

不安全模式：

* 大量内联 script 块和内联 `onclick="..."` 处理器。
* 需要 `unsafe-eval` 的库。

检测提示：

* 搜索带内联代码的 `<script>` 块、`onclick="`、`onload="` 等。
* 搜索包含 `unsafe-inline` 或 `unsafe-eval` 的 CSP 指令。([MDN Web Docs][10])

修复：

* 把内联脚本移到外部 JS 文件（同源）。
* 对无法避免的内联块使用 nonce/哈希。([MDN Web Docs][10])

---

### JS-TT-001：在受支持场景使用 Trusted Types 缩小 DOM XSS 攻击面

严重程度：低

要求：

* SHOULD 考虑配合 CSP `require-trusted-types-for 'script'` 启用 Trusted Types 强制，使许多 DOM XSS 汇点拒绝原始字符串。([MDN Web Docs][11])
* 如果使用 Trusted Types，SHOULD 同时使用 CSP `trusted-types` 指令限制可创建的策略（减少策略蔓延、提高可审计性）。([MDN Web Docs][16])
* MUST 保持 Trusted Types 策略代码短小、经严格评审，并作为产生汇点受信任值的唯一路径。([W3C][15])

不安全模式：

* “启用了 Trusted Types”但策略只是原样返回输入（无净化/校验）。
* 代码库中无限制地创建大量临时策略。
* 认为 Trusted Types 单独就能阻止所有不安全导航或所有 XSS 类别。（它针对 DOM 注入汇点；不是通用沙箱。）([W3C][15])

检测提示：

* 搜索 CSP 指令：`require-trusted-types-for` 和 `trusted-types`。
* 在代码中搜索 `trustedTypes.createPolicy(` 并检查策略实现。([MDN Web Docs][11])

修复：

* 增加少量经良好评审的策略（例如执行净化的 `createHTML`）。
* 经 `trusted-types <policyName...>` 限制允许的策略。
* 迁移汇点以按需要求 `TrustedHTML` / `TrustedScriptURL`。([MDN Web Docs][11])

---

### JS-MSG-001：`postMessage` 必须做严格来源校验并显式指定 targetOrigin

严重程度：中（若经 postMessage 可触发危险行为则为高）

要求：

* 发送消息时，MUST 设置显式的 `targetOrigin`（不要用 `*`），避免在重定向或窗口源变化后把数据发给意外的源。([MDN Web Docs][5])
* 接收消息时，MUST：

  * 把 `event.origin` 与预期来源白名单做精确比对（不做子串匹配）。([OWASP Cheat Sheet Series][6])
  * 适用时考虑校验 `event.source`（预期的窗口引用）。([MDN Web Docs][5])
  * 校验 `event.data` 的结构（schema/形状），并把它纯粹当数据（绝不当代码求值，也绝不经 `innerHTML` 插入 DOM）。([OWASP Cheat Sheet Series][6])

不安全模式：

* `otherWindow.postMessage(payload, "*")`
* `window.addEventListener("message", (e) => { doSomething(e.data) })` 而无 `origin` 检查
* `if (e.origin.includes("trusted.com"))`（子串检查）
* `el.innerHTML = e.data` ([OWASP Cheat Sheet Series][6])

检测提示：

* 搜索 `postMessage(`、`addEventListener("message"`、`onmessage =`。
* 审计所有处理器是否对 `event.origin` 做了显式白名单检查。([OWASP Cheat Sheet Series][6])

修复：

* 定义白名单：

  * `const ALLOWED = new Set(["https://app.example.com", "https://accounts.example.com"]);`
  注意：为便于开发，可以用当前页面的源 `window.location.origin` 作为安全的默认来源。
* 接收时：

  * `if (!ALLOWED.has(event.origin)) return;`
  * 用严格 schema 校验 `event.data`，拒绝未知/多余字段。
* 发送时：

  * 把确切的预期来源字符串用作 `targetOrigin`。([OWASP Cheat Sheet Series][6])

缓解：

* 与严格 CSP 配合，并避免消息路径中的 DOM 汇点。([MDN Web Docs][10])

---

### JS-STORAGE-001：Web Storage 不是存机密的安全场所（且可被攻击者影响）

严重程度：低

要求：

* 若失守会有影响，MUST NOT 把敏感机密或会话标识符存进 `localStorage`（或 `sessionStorage`）；一次 XSS 就能把存储中的所有内容外带。([OWASP Cheat Sheet Series][6])
* MUST 把从存储中读到的值当作不可信输入（攻击者可经 XSS 把恶意值写进存储）。([OWASP Cheat Sheet Series][6])
* SHOULD 会话标识符优先使用服务端设置的 `HttpOnly` cookie（JS 无法设置 `HttpOnly`，所以避免把会话 ID 存进 JS 可访问的存储）。([OWASP Cheat Sheet Series][6])
* 如果应用依赖存储隔离，SHOULD 避免在同一源上托管多个互不相关的应用（存储是源级的）。([OWASP Cheat Sheet Series][6])

不安全模式：

* `localStorage.setItem("access_token", token)`
* `localStorage.setItem("session", sessionId)`
* 假定 `localStorage` “因为同源所以可信”。

检测提示：

* 搜索 `localStorage.getItem`、`localStorage.setItem`、`sessionStorage.*`。
* 标记名为 `token`、`jwt`、`session`、`auth`、`refresh` 的存储键。([OWASP Cheat Sheet Series][6])

修复：

* 使用服务端管理的会话，或安全交付并轮换的短时 token，并配合严格的 XSS 防御（CSP/Trusted Types）和最小的 JS 暴露。
* 如果存储必须用于非敏感状态，保持其与鉴权无关，并在使用前校验/转义。

---

### JS-SUPPLY-001：第三方 JavaScript 是主要供应链风险；最小化并管控它

严重程度：低

要求：

* MUST 把第三方 JS 的特权当作与第一方 JS 等同（它可以在你的源内执行任意代码并访问 DOM 数据）。([OWASP Cheat Sheet Series][7])
* SHOULD 最小化第三方脚本，并优先：

  * 自托管 / 脚本镜像，
  * 严格 CSP 白名单，
  * 对任何 CDN 托管脚本使用 SRI，
  * 持续监控意外变更。([OWASP Cheat Sheet Series][7])

不安全模式：

* 未经评审就从众多厂商加载任意远程脚本。
* 使用能动态注入脚本且无完整性控制的标签管理器。
* 在 CSP 中允许宽泛通配符的脚本来源（例如 `script-src *`）。([MDN Web Docs][10])

检测提示：

* 在 HTML 中搜索 `<script src="https://...">` 和 `tag manager` 代码片段。
* 检查 CSP `script-src` 来源中的通配符或过宽域名。
* 搜索动态脚本注入：`document.createElement("script")`、`script.src = ...`、`appendChild(script)`。([OWASP Cheat Sheet Series][8])

修复：

* 移除不必要的第三方标签。
* 尽可能自托管或镜像脚本。
* 把 CSP `script-src` 锁定到最小的受信来源集合。
* 为 CDN 脚本/样式增加 SRI。([OWASP Cheat Sheet Series][7])

---

### JS-SRI-001：对第三方脚本/样式使用子资源完整性（SRI）

严重程度：低

要求：

* SHOULD 使用 SRI，确保浏览器只在第三方资源匹配预期加密哈希时才加载。([MDN Web Docs][12])
* 底层资源变化时 MUST 更新 SRI 哈希（锁定版本；避免 “latest” URL）。

不安全模式：

* `<script src="https://cdn.example.com/lib.js"></script>` 没有 `integrity`。
* 加载 `latest` 或未锁定版本的第三方资源。

检测提示：

* 搜索没有 `integrity=` 的 `<script src="https://` 和 `<link rel="stylesheet" href="https://`。
* 检查 `integrity` 是否存在并使用强哈希（sha256/384/512 是典型选择）。([MDN Web Docs][12])

修复：

* 添加 `integrity="sha384-..."`（或合适的哈希），并在需要时确保正确的 CORS 模式。
* 关键库优先自托管。

---

### FS-DOMC-001：防止 DOM clobbering（避免依赖 `window`/`document` 命名属性）

严重程度：中至高（若可导致脚本加载或 `javascript:` 导航则为严重）

要求：

* MUST NOT 依赖可能被注入的、带匹配 `id`/`name` 的 HTML 元素 clobber 的隐式全局变量或 `window.someName` / `document.someName` 查找。([OWASP Cheat Sheet Series][8])
* MUST 避免形如 `let x = window.redirectTo || "/safe"; location.assign(x);` 的模式——`redirectTo` 可能被 clobber 成一个 `href` 攻击者可控（包括 `javascript:`）的 `<a>` 元素。([OWASP Cheat Sheet Series][8])
* SHOULD 使用显式变量声明、局部作用域和显式 DOM 查询（`getElementById`），而不是命名属性访问。([OWASP Cheat Sheet Series][8])
* 如果应用插入用户控制的标记（即使已净化），SHOULD 确保净化策略考虑 `id`/`name` 冲突。([OWASP Cheat Sheet Series][8])

不安全模式：

* `const cfg = window.config || {};` 用于安全敏感的 URL。
* `const redirect = window.redirectTo || "/"; location.assign(redirect);` ([OWASP Cheat Sheet Series][8])
* 从 `window.*` 配置值加载脚本而没有严格校验。

检测提示：

* 搜索当作配置存储使用的 `window.` 和 `document.`（尤其是 `||` 回退模式）。
* 搜索把来自 `window`/`document` 属性的变量用于 `location.assign/replace` 的用法。
* 搜索动态创建脚本（`createElement('script')`）且 `.src` 来自非局部变量的代码。([OWASP Cheat Sheet Series][8])

修复：

* 把配置存放在模块级常量中（不要放 `window`/`document`），并显式传递。
* 用协议/来源白名单校验任何类 URL 配置（见 FEJS-URL-001）。([OWASP Cheat Sheet Series][8])
* 考虑加固：净化、CSP，以及（有限场景）冻结敏感对象，但把这些当纵深防御，而不是安全编码模式的替代品。([OWASP Cheat Sheet Series][8])

---

## 5) 实用扫描启发式（如何“挖”）

主动扫描时，使用这些高信号模式：

* DOM XSS 汇点：

  * `.innerHTML`、`.outerHTML`、`insertAdjacentHTML(`
  * `document.write(`、`document.writeln(` ([OWASP Cheat Sheet Series][2])

* 危险导航 / URL 汇点：

  * `window.location`、`location.href`、`location.assign`、`location.replace`
  * `javascript:` 字面量（及其他可疑 scheme 如 `data:text/html`）([MDN Web Docs][4])

* 字符串转代码执行：

  * `eval(`、`new Function`、`setTimeout("`、`setInterval("` ([MDN Web Docs][10])

* 事件处理器字符串注入：

  * `.setAttribute("on`、`.onclick =`、`.onload =` 配字符串 ([OWASP Cheat Sheet Series][2])

* `postMessage`：

  * `postMessage(` 使用 `"*"` 作为 targetOrigin
  * `addEventListener("message"` 而没有严格的 `event.origin` 白名单检查 ([MDN Web Docs][5])

* 存储：

  * `localStorage.setItem(` / `getItem(`、`sessionStorage.*`
  * 包含 `token`、`jwt`、`session`、`auth`、`refresh` 的键 ([OWASP Cheat Sheet Series][6])

* CSP 及相关：

  * `Content-Security-Policy` 头配置（服务器/边缘）
  * `<meta http-equiv="Content-Security-Policy" ...>`
  * 包含 `unsafe-inline` 或 `unsafe-eval` 的 CSP
  * `require-trusted-types-for` / `trusted-types` 指令 ([MDN Web Docs][1])

* 第三方脚本：

  * 没有 `integrity=` 的 `<script src="https://...">`
  * 标签管理器片段和动态脚本注入代码路径 ([MDN Web Docs][12])


* DOM clobbering gadget：

  * `window.<name> || ...` 和 `document.<name> || ...` 模式
  * 把 `window`/`document` 属性当配置来源的安全敏感用法 ([OWASP Cheat Sheet Series][8])

始终尝试确认：

* 数据来源（不可信 vs 可信），
* 汇点类型（HTML 解析、导航、代码执行、消息处理、存储），
* 已有的防护措施（CSP、Trusted Types、净化器、严格白名单、schema 校验）。

---

## 6) 参考资料（访问于 2026-01-27）

主要标准 / 平台文档：

* W3C Content Security Policy Level 2（HTML `<meta>` 交付限制；meta CSP 中不受支持的指令）：`https://www.w3.org/TR/CSP2/` ([W3C][3])
* MDN：CSP 指南（严格 CSP、nonce/哈希、`unsafe-inline`/`unsafe-eval`、阻止 eval）：`https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CSP` ([MDN Web Docs][10])
* MDN：`<meta http-equiv>`（经 meta 设置 CSP 及对基于 meta 的安全头的警告）：`https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/meta/http-equiv` ([MDN Web Docs][1])
* MDN：`frame-ancestors`（并注明 `<meta>` 中不受支持）：`https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/frame-ancestors` ([MDN Web Docs][18])

DOM XSS 与危险汇点：

* OWASP：DOM Based XSS Prevention Cheat Sheet（危险汇点 + `textContent` 等安全模式）：`https://cheatsheetseries.owasp.org/cheatsheets/DOM_based_XSS_Prevention_Cheat_Sheet.html` ([OWASP Cheat Sheet Series][2])
* MDN：`innerHTML`（安全注意事项）：`https://developer.mozilla.org/en-US/docs/Web/API/Element/innerHTML` ([MDN Web Docs][19])
* MDN：`insertAdjacentHTML`（安全注意事项）：`https://developer.mozilla.org/en-US/docs/Web/API/Element/insertAdjacentHTML` ([MDN Web Docs][20])
* MDN：`document.write()` / `document.writeln()`（安全注意事项）：`https://developer.mozilla.org/en-US/docs/Web/API/Document/write` 与 `https://developer.mozilla.org/en-US/docs/Web/API/Document/writeln` ([MDN Web Docs][13])

URL scheme 危害：

* MDN：`javascript:` URL（导航时执行；不建议使用；引用 `window.location`）：`https://developer.mozilla.org/en-US/docs/Web/URI/Reference/Schemes/javascript` ([MDN Web Docs][4])

Trusted Types：

* W3C：Trusted Types 规范（DOM XSS 汇点包括 `Element.innerHTML` 和 `Location.href` setter；目标与局限）：`https://www.w3.org/TR/trusted-types/` ([W3C][15])
* MDN：`require-trusted-types-for` 指令：`https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/require-trusted-types-for` ([MDN Web Docs][11])
* MDN：`trusted-types` 指令：`https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/trusted-types` ([MDN Web Docs][16])

跨窗口消息：

* MDN：`window.postMessage`（安全指引：指定 targetOrigin；校验来源）：`https://developer.mozilla.org/en-US/docs/Web/API/Window/postMessage` ([MDN Web Docs][5])
* OWASP：HTML5 Security Cheat Sheet（Web Messaging 指引：显式来源、严格检查、不用 `innerHTML`）：`https://cheatsheetseries.owasp.org/cheatsheets/HTML5_Security_Cheat_Sheet.html` ([OWASP Cheat Sheet Series][6])

第三方脚本与完整性：

* OWASP：Third Party JavaScript Management Cheat Sheet（风险与缓解，包括 SRI/镜像）：`https://cheatsheetseries.owasp.org/cheatsheets/Third_Party_Javascript_Management_Cheat_Sheet.html` ([OWASP Cheat Sheet Series][7])
* MDN：Subresource Integrity 概览：`https://developer.mozilla.org/en-US/docs/Web/Security/Defenses/Subresource_Integrity` ([MDN Web Docs][12])
* W3C：Subresource Integrity 规范：`https://www.w3.org/TR/sri-2/` ([W3C][21])

DOM clobbering：

* OWASP：DOM Clobbering Prevention Cheat Sheet（命名属性访问风险；涉及 `location.assign` 和 `javascript:` 的攻击示例）：`https://cheatsheetseries.owasp.org/cheatsheets/DOM_Clobbering_Prevention_Cheat_Sheet.html` ([OWASP Cheat Sheet Series][8])

[1]: https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/meta/http-equiv "https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/meta/http-equiv"
[2]: https://cheatsheetseries.owasp.org/cheatsheets/DOM_based_XSS_Prevention_Cheat_Sheet.html "https://cheatsheetseries.owasp.org/cheatsheets/DOM_based_XSS_Prevention_Cheat_Sheet.html"
[3]: https://www.w3.org/TR/CSP2/ "Content Security Policy Level 2"
[4]: https://developer.mozilla.org/en-US/docs/Web/URI/Reference/Schemes/javascript "javascript: URLs - URIs | MDN"
[5]: https://developer.mozilla.org/en-US/docs/Web/API/Window/postMessage "https://developer.mozilla.org/en-US/docs/Web/API/Window/postMessage"
[6]: https://cheatsheetseries.owasp.org/cheatsheets/HTML5_Security_Cheat_Sheet.html "https://cheatsheetseries.owasp.org/cheatsheets/HTML5_Security_Cheat_Sheet.html"
[7]: https://cheatsheetseries.owasp.org/cheatsheets/Third_Party_Javascript_Management_Cheat_Sheet.html "https://cheatsheetseries.owasp.org/cheatsheets/Third_Party_Javascript_Management_Cheat_Sheet.html"
[8]: https://cheatsheetseries.owasp.org/cheatsheets/DOM_Clobbering_Prevention_Cheat_Sheet.html "https://cheatsheetseries.owasp.org/cheatsheets/DOM_Clobbering_Prevention_Cheat_Sheet.html"
[9]: https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Attributes/rel/noopener "https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Attributes/rel/noopener"
[10]: https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CSP "https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CSP"
[11]: https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/require-trusted-types-for "https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/require-trusted-types-for"
[12]: https://developer.mozilla.org/en-US/docs/Web/Security/Defenses/Subresource_Integrity "https://developer.mozilla.org/en-US/docs/Web/Security/Defenses/Subresource_Integrity"
[13]: https://developer.mozilla.org/en-US/docs/Web/API/Document/write "https://developer.mozilla.org/en-US/docs/Web/API/Document/write"
[14]: https://developer.mozilla.org/en-US/docs/Web/API/Document/writeln "https://developer.mozilla.org/en-US/docs/Web/API/Document/writeln"
[15]: https://www.w3.org/TR/trusted-types/ "https://www.w3.org/TR/trusted-types/"
[16]: https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/trusted-types "https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/trusted-types"
[18]: https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/frame-ancestors "https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/frame-ancestors"
[19]: https://developer.mozilla.org/en-US/docs/Web/API/Element/innerHTML "https://developer.mozilla.org/en-US/docs/Web/API/Element/innerHTML"
[20]: https://developer.mozilla.org/en-US/docs/Web/API/Element/insertAdjacentHTML "https://developer.mozilla.org/en-US/docs/Web/API/Element/insertAdjacentHTML"
[21]: https://www.w3.org/TR/sri-2/ "https://www.w3.org/TR/sri-2/"
