# jQuery 前端安全规范（jQuery 4.0.x、现代浏览器）

本文档是一份**安全规范**，用于支持：

1. 为新基于 jQuery 的前端代码进行**默认安全的代码生成**。
2. 对既有基于 jQuery 的代码进行**安全审查 / 漏洞挖掘**（被动式“边工作边注意问题”，以及主动式“扫描仓库并报告发现”）。

本文档有意写成一套**规范性要求**（“MUST/SHOULD/MAY”）加**审计规则**（坏模式长什么样、如何检测、如何修复/缓解）。

---

## 0) 安全、边界与反滥用约束（必须遵守）

* MUST NOT 请求、输出、记录或提交机密（API key、密码、私钥、会话 token、刷新 token、CSRF token、会话 cookie）。
* MUST 把浏览器当作攻击者可控的环境：

  * 前端检查（UI 门禁、“禁用按钮”、隐藏字段、客户端校验）MUST NOT 被当作授权或安全边界。
  * 即使前端“正确”，服务端授权和校验也 MUST 存在。
* MUST NOT 通过关闭防护来“修复”安全问题（例如放宽 CSP 以允许 `unsafe-inline`、“因为它能跑”就启用 JSONP、增加宽泛 CORS、禁用净化、压制安全检查）。
* MUST 在审计中给出基于证据的发现：引用文件路径、代码片段和相关配置值。
* MUST 诚实对待不确定性：如果某项防护可能存在于边缘层（CDN/WAF/反向代理的 CSP 之类响应头），应报告为“仓库中不可见；需在运行时/配置中核实”。

---

## 1) 工作模式

### 1.1 生成模式（默认）

当被要求编写新 jQuery 代码或修改既有 jQuery 代码时：

* MUST 遵循本规范中的每一条 **MUST** 要求。
* SHOULD 遵循每一条 **SHOULD** 要求，除非用户明确另有指示。
* MUST 优先使用默认安全的模式：文本插入、DOM 节点构造、白名单和经过验证的净化库，而不是自写转义。
* MUST 避免引入新的危险汇点（sink）（拼 HTML 字符串、动态加载脚本、JSONP、内联脚本/事件处理器属性、不安全 URL 赋值、不安全对象合并）。

### 1.2 被动审查模式（编辑期间始终开启）

在使用 jQuery 的仓库的任何位置工作时（即使用户没有要求安全扫描）：

* MUST “注意”所触及/邻近代码中违反本规范的地方。
* SHOULD 在问题出现时提及，并附简要说明 + 安全的修复方式。

### 1.3 主动审计模式（明确要求扫描时）

当用户要求“扫描”、“审计”或“挖漏洞”时：

* MUST 系统性地在代码库中搜索违反本规范的地方。
* MUST 以结构化格式输出发现（见 §2.3）。

推荐审计顺序：

1. jQuery 来源、版本与依赖卫生（script 标签、lockfile、CDN 使用、SRI）。
2. CSP / Trusted Types / 安全响应头状况（仓库内及可观察时的运行时）。
3. DOM XSS：不可信来源 → jQuery 汇点（`.html`、`.append`、`$("<…>")`、`.load` 等）。
4. 脚本执行汇点：JSONP、`dataType:"script"`、`$.getScript`、动态 `<script>` 插入。
5. URL/属性赋值（`href`、`src`、`style`、`on*` 属性）。
6. 原型污染 / 不安全对象合并（`$.extend` 模式）。
7. AJAX 鉴权模式 + 基于 cookie 会话的 CSRF。
8. 第三方插件与不可信内容渲染路径（评论、所见即所得编辑器、markdown 转 HTML）。

---

## 2) 定义与审查指引

### 2.1 不可信输入（除非证明否则按攻击者可控处理）

示例包括：

* 任何源自用户的服务端数据（用户资料、评论、“显示名”、富文本、文件名）。
* 来自第三方 API 或服务的数据。
* 浏览器控制的来源：

  * `location.href`、`location.search`、`location.hash`
  * `document.URL`、`document.baseURI`、`document.referrer`
  * `window.name`
  * `localStorage` / `sessionStorage`
  * `postMessage` 事件数据（除非存在严格的来源和 schema 校验）
  * 任何此前可能被注入过的 DOM 内容（存储型 XSS）

### 2.2 jQuery 上下文中的高风险“汇点”

汇点（sink）是指不可信输入可能被解释为可执行代码或 HTML 的代码路径。

jQuery 的关键汇点类别：

* HTML 插入 / 解析：

  * 接受 HTML 字符串的 DOM 操作方法，如 `.html()`、`.append()` 及相关方法（见下文 CVE 说明）。([NVD][1])
  * `$(htmlString)`（当参数可能被解释为 HTML 标记时）。
  * `jQuery.parseHTML(html, …, keepScripts)`，尤其是 `keepScripts=true` 时。([jQuery API][2])
  * `.load(url)`（把 HTML 加载进 DOM；有特殊的脚本执行行为）。([jQuery API][3])
* 脚本执行 / 动态代码加载：

  * `$.getScript()` / `$.ajax({ dataType: "script" })`（执行取回的 JavaScript）。([jQuery API][4])
  * JSONP（`dataType: "jsonp"` 或隐式 JSONP 行为）（把远程 JavaScript 当响应执行）。([jQuery API][5])
  * `eval`、`new Function`、`setTimeout("…")`、`setInterval("…")`、`$.globalEval`（如存在）
* 危险属性赋值：

  * 把不可信字符串赋给 `href`、`src`、`srcdoc`、`style` 或事件处理器属性（`onload`、`onclick` 等）
  * `javascript:` URL 尤其危险，不建议使用。([MDN Web Docs][6])

### 2.3 要求的审计发现格式

对每个发现的问题，输出：

* 规则 ID：
* 严重程度：严重（Critical）/ 高（High）/ 中（Medium）/ 低（Low）
* 位置：文件路径 + 函数/组件 + 行号
* 证据：确切的代码/配置片段
* 影响：可能出什么问题、谁能够利用
* 修复：安全的改动（优先最小 diff）
* 缓解：当立即修复困难时的纵深防御措施
* 误报说明：不确定时需要核实什么

---

## 3) 安全基线：最低生产配置（生产环境 MUST）

这是能防止常见 jQuery 相关安全失败的“最小生产基线”。

### 3.1 使用受支持、已修补的 jQuery 版本（MUST）

* MUST 使用受支持的 jQuery 大版本并保持更新。
* 截至 2026-01-27，jQuery 项目发布的最新大版本是 jQuery 4.0.0。([blog.jquery.com][7])
* 如果必须支持非常老的浏览器（尤其是 IE < 11），jQuery 4 不支持它们，你可能需要停留在 jQuery 3.x；应把这当作更高风险的状态并积极修补。([blog.jquery.com][7])

### 3.2 安全地加载 jQuery（MUST）

* MUST 只从以下来源加载 jQuery：

  * 你自己的构建管线（经 npm/yarn + lockfile 打包），或
  * 官方 jQuery CDN / 启用了子资源完整性（SRI）的可信 CDN。
* 如果从 CDN 加载，SHOULD 使用 SRI（`integrity`）和正确的 `crossorigin` 设置；jQuery 项目在其 CDN 上明确支持并推荐 SRI。（取自 [jquery.com][8]）

### 3.3 CSP + Trusted Types（SHOULD；在可用/策略要求时 MUST）

* SHOULD 部署能降低 XSS 影响的内容安全策略（CSP）（尤其是 `script-src` 限制并避免 `unsafe-inline`）。如果不经 HTTP 服务器设置，也可以通过 `<meta http-equiv="Content-Security-Policy" content="...">` 标签完成。([OWASP Cheat Sheet Series][9]) 注意：最重要的是设置 CSP 的 script-src。其他指令重要性较低，为便于开发通常可以省略。
* SHOULD 考虑把 Trusted Types 作为对抗 DOM XSS 的强纵深防御。([W3C][10])
* 如果你部署了 CSP 指令 `require-trusted-types-for`，那么代码 MUST 让 DOM 注入经由 Trusted Types 策略。([MDN Web Docs][11])
* 注意：jQuery 4.0 明确加入了对 Trusted Types 的支持，使 TrustedHTML 可以配合 jQuery 的操作方法使用而不违反 `require-trusted-types-for`。([blog.jquery.com][7])

### 3.4 安全响应头与 cookie 状况（纵深防御；SHOULD）

尽管这些通常在服务端设置，但它们能实质缩小 jQuery 相关失误的波及范围。不过如果上下文只是前端 Web 应用，则无法对此采取行动。

* SHOULD 设置常见安全响应头（CSP、`X-Content-Type-Options: nosniff`、经 `frame-ancestors` / `X-Frame-Options` 的点击劫持防护、`Referrer-Policy`）。([OWASP Cheat Sheet Series][12])
* SHOULD 避免把长效机密/token 存在 JS 可访问的位置（如 `localStorage`），除非威胁模型明确接受“XSS == 账户被接管”。这不是 jQuery 特有的问题，但重度依赖 jQuery 的 DOM 操作会提高 DOM XSS 回归的概率；要减少攻击收益。

---

## 4) 规则（生成 + 审计）

每条规则包含：要求的做法、不安全模式、检测提示与修复方法。

### JQ-SUPPLY-001：jQuery MUST 修补；不要运行已知易受攻击的版本

严重程度：中（面向互联网的应用且版本已知易受攻击时为高）

注意：执行升级前，先征得用户同意，并尽量了解他们是否有保留旧版本的理由。升级可能以意料之外的方式破坏应用。应报告并建议升级，而不是直接执行。

要求：

* MUST NOT 在存在已修复版本时继续使用带有已知高危漏洞的 jQuery 版本。
* MUST 升级越过：

  * CVE-2019-11358（jQuery 3.4.0 之前的原型污染）。([NVD][13])
  * CVE-2020-11022 / CVE-2020-11023（DOM 操作方法在处理不可信 HTML 时的 XSS 风险；3.5.0 修复）。([NVD][1])

不安全模式：

* 引用旧 jQuery 的 script 标签或包清单（例如 `jquery-1.*`、`jquery-2.*`、`jquery-3.3.*`、`jquery-3.4.*`、`jquery-3.4.1` 等）。
* 包含旧压缩版 jQuery 且没有升级路径的 vendor 目录。

检测提示：

* 在 HTML/模板中搜索 `jquery-` 并解析版本字符串。
* 检查 `package.json`、`package-lock.json`、`yarn.lock`、`pnpm-lock.yaml`。
* 在 `vendor/`、`public/`、`static/`、`assets/`、`wwwroot/` 中查找 `jquery*.js`。

修复：

* 升级到当前 jQuery（优先最新稳定大版本；截至 2026-01-27，当前为 4.0.0）。([blog.jquery.com][7])
* 如果升级受限，至少升级越过 CVE 阈值，并增加补偿控制（强 CSP、严格净化、移除 JSONP 等危险 API、移除对不可信对象的深合并）。

注意：

* 如果产品需求迫使使用旧版本，报告为“需补偿控制的已接受风险”。

---

### JQ-SUPPLY-002：第三方脚本加载 SHOULD 使用完整性与受信来源

严重程度：高

要求：

* MUST 只从受信来源加载 jQuery 和插件。
* 如果从 CDN 加载，SHOULD 使用 SRI（`integrity`）和正确的 `crossorigin` 处理。([jquery.com][8])

不安全模式：

* `<script src="https://…/jquery.min.js"></script>` 没有 `integrity`。
* 没有明确信任决策就从随机第三方 CDN 加载 jQuery。

检测提示：

* 扫描 HTML 中的 `<script src=` 并检查 `integrity=` + `crossorigin=`。
* 识别用不可信 URL 的动态脚本插入（见 JQ-EXEC-001）。

修复：

* 优先经 npm + lockfile 打包。
* 如果使用 CDN，复制官方 script 标签（jQuery CDN 支持 SRI）。([jquery.com][8])

注意：如果拿不到正确的 SRI 标签，可跳过这一步但要告知用户。用错 SRI 会导致应用无法运行。此时应移除它并告知用户。

---

### JQ-XSS-001：不可信数据 MUST NOT 经 jQuery DOM 操作方法作为 HTML 插入

严重程度：高（若攻击者可控内容到达这些汇点）

要求：

* MUST 把任何 HTML 字符串插入当作代码执行边界。
* MUST 对不可信文本使用安全替代：

  * `.text(untrusted)`（文本，不是 HTML）。([jQuery API][14])
  * 表单字段用 `.val(untrusted)`。([jQuery API][15])
  * 创建元素并安全地设置文本/属性，而不是拼接 HTML 字符串。

不安全模式（示例）：

* `$(selector).html(untrusted)`
* `$(selector).append(untrusted)`
* `$(selector).before(untrusted)` / `.after(untrusted)` / `.replaceWith(untrusted)` / `.wrap(untrusted)`（及类似方法）
* 构造标记：`"<div>" + untrusted + "</div>"` 然后传给 jQuery

检测提示：

* 搜索：`.html(`、`.append(`、`.prepend(`、`.before(`、`.after(`、`.replaceWith(`、`.wrap(`、`.wrapAll(`、`.wrapInner(`
* 追踪 §2.1 中的来源到这些调用的数据流。

修复：

* 换成 `.text()` / `.val()` 或节点构造：

  * `const $el = $("<span>").text(untrusted); container.append($el);`
* 如果输出必须包含有限标记，见 JQ-XSS-002（净化）。

注意：

* 即使尝试净化，旧版 jQuery 仍有额外的边界情况；3.5.0+ 已修复。尽管如此：绝不要只依赖“字符串净化”——优先结构化创建或经验证的净化器。([GitHub][16])

---

### JQ-XSS-002：如果必须渲染用户控制的 HTML，MUST 用经过验证的 HTML 净化器净化

严重程度：中（富 HTML 攻击者可控且净化器薄弱/配置错误时为高）

要求：

* MUST NOT 用正则“自己造”HTML 净化器。
* 如果必须展示用户控制的 HTML（例如富文本评论），MUST 使用维护良好的 HTML 净化器和限制性白名单净化。

  * DOMPurify 是常见选择；使用保守配置并保持更新。([GitHub][17])
  * 在可用场景，MAY 考虑浏览器 HTML Sanitizer API（注意：浏览器支持有限）。([MDN Web Docs][18])
* SHOULD 把净化与 CSP 配合，并在可行时配合 Trusted Types 做纵深防御。([OWASP Cheat Sheet Series][9])

不安全模式：

* 基于正则的“剥除 `<script>`”或“转义 `<`”尝试，然后 `.html()` 插入。
* DOMPurify（或类似）配置为允许过宽的标签/属性，或配置未经评审。

检测提示：

* 搜索“sanitize”辅助函数、正则替换 `<`/`>` 的模式，或“允许所有标签”的配置。
* 识别渲染用户生成“富文本”或“自定义 HTML”的功能。
* 检查净化结果是否经 `.html()` 或等价汇点插入。

修复：

* 引入带严格白名单的净化器。
* 把“净化后注入”模式集中到单一经评审的模块。
* 增加覆盖典型恶意输入的回归测试（不要把 payload 存进日志或遥测）。

误报说明：

* 如果内容保证可信（例如你发布的编译模板），记录信任边界及其不受攻击者控制的理由。

---

### JQ-XSS-003：`$(untrustedString)` 与 `jQuery.parseHTML` MUST NOT 处理攻击者可控标记

严重程度：高（若攻击者可控）

要求：

* MUST NOT 把可能被解释为 HTML 的攻击者可控字符串传给 `$()`。
* MUST 把 `jQuery.parseHTML(html, …, keepScripts)` 当作高风险原语；对任何不可信输入 keepScripts MUST 为 `false`。([jQuery API][2])

不安全模式：

* `const $node = $(untrusted);`
* `$.parseHTML(untrusted, /* context */, true)`（保留脚本）

检测提示：

* 搜索 `$(` 调用中参数不是静态选择器或静态标记的情况。
* 搜索 `$.parseHTML(` 并检查 `keepScripts` 参数。

修复：

* 用常量标签名创建 DOM，并对不可信值使用 `.text()`。
* 如果必须解析 HTML，先净化（JQ-XSS-002）并禁用脚本。

---

### JQ-XSS-004：`.load()` MUST 被当作 HTML+脚本注入面对待

严重程度：中（URL/内容攻击者可控时为高）

要求：

* MUST NOT 把 `.load()` 用于攻击者可控的 URL 或攻击者可控的 HTML 片段。
* MUST 理解 jQuery `.load()` 的脚本行为：

  * URL 中不带选择器时，内容在移除脚本之前先传入 `.html()`，这会执行脚本。([jQuery API][3])
* SHOULD 优先用 `fetch()`/XHR 取数据，再用安全的 DOM 创建渲染或显式净化。

不安全模式：

* `$("#target").load(untrustedUrl)`
* `$("#target").load("/path?param=" + untrusted)`

检测提示：

* 在 JS/TS 文件中搜索 `.load(`。
* 判断 URL 是否追加了选择器（行为不同）。([jQuery API][3])
* 追踪 URL 是否可被用户输入影响。

修复：

* 把 `.load()` 替换为：

  * `fetch()` 取 JSON，然后经 `.text()` / 节点构造渲染，或
  * `fetch()` 取 HTML，净化后再注入。
* 如果 `.load()` 必须保留，确保 URL 是常量或严格白名单内，且返回内容可信。

---

### JQ-EXEC-001：动态脚本执行与脚本获取 MUST NOT 可由不可信输入触达

严重程度：高

要求：

* MUST NOT 从不可信或受用户影响的 URL 取回并执行脚本。
* MUST 把以下内容当作代码执行原语：

  * `$.getScript(url)` 在全局上下文执行取回的脚本。([jQuery API][4])
  * `$.ajax({ dataType: "script" })` 及其他会执行响应的 script 类型请求。
* SHOULD 移除这些模式，除非有强有力且经评审的理由。

不安全模式：

* `$.getScript(untrustedUrl)`
* `$.ajax({ url: untrustedUrl, dataType: "script" })`
* `src` 来自不可信输入的动态 `<script src=...>` 注入。

检测提示：

* 搜索 `getScript(`、`dataType: "script"`、`globalEval`、`eval`、`new Function`。
* 查找接受 URL 的“插件加载器”或“主题加载器”功能。

修复：

* 在构建期打包脚本。
* 如果需要运行时加载，限制为白名单内、有版本锁定、经完整性校验的资源（理想情况下仍应避免运行时代码加载）。

---

### JQ-AJAX-001：除非端点完全受信，JSONP MUST 禁用（即便如此也应避免）

严重程度：中（攻击者可影响 URL/端点时为高）

要求：

* MUST NOT 对不可信端点使用 JSONP，因为它会执行 JavaScript 响应。
* 使用 `$.ajax` 时，MUST 对非完全受信目标显式禁用 JSONP；jQuery 自己的文档建议在不信任目标时出于“安全原因”设置 `jsonp: false`。([jQuery API][5])
* SHOULD 优先用 CORS + JSON（`dataType: "json"`）并在服务端做显式来源白名单。

不安全模式：

* `dataType: "jsonp"`
* 包含 `callback=?` 或会触发 JSONP 行为的模式的 URL。callback 参数历来是 XSS 载体。
* `$.get(untrustedUrl)` 而不锁定 `dataType` 并禁用 JSONP（风险取决于选项和 jQuery 行为）

检测提示：

* 搜索 `jsonp`、`dataType: "jsonp"`、`callback=?`。
* 搜索 URL 非硬编码或非白名单的跨域 AJAX。

修复：

* 使用 HTTPS 上的 JSON，并在服务端配置 CORS。
* 设置：

  * `dataType: "json"`
  * `jsonp: false`（URL 可能含糊时的纵深防御）([jQuery API][5])

---

### JQ-AJAX-002：使用 cookie 鉴权的改状态 AJAX 请求 MUST 有 CSRF 防护

严重程度：高

注意：只有使用基于 cookie 的鉴权时才有意义。如果请求使用 Authorization 头，则不存在 CSRF 可能。

要求：

* 如果鉴权使用 cookie，MUST 保护改状态请求（POST/PUT/PATCH/DELETE）免受 CSRF。
* SHOULD 使用服务端验证的 CSRF token；AJAX 调用中 token 通常经自定义头发送。([OWASP Cheat Sheet Series][19])
* MUST NOT 把“这是 AJAX 请求”本身当作 CSRF 防护。

不安全模式：

* `$.post("/transfer", {...})` 或 `$.ajax({ method: "POST", ... })` 使用 cookie 鉴权却没有 CSRF token/头。
* 只检查 `X-Requested-With` 的“CSRF 防护”（仅纵深防御，不是主要防线）。

检测提示：

* 枚举改状态的 AJAX 调用，确认它们是否携带 CSRF token。
* 确认服务端期望的 CSRF 校验方式（meta 标签、cookie-to-header 双提交、同步 token 等）。

修复：

* 在集中位置加 CSRF token，例如 `$.ajaxSetup({ headers: { "X-CSRF-Token": token } })`，并确保服务端校验。
* 按 OWASP CSRF 指南处理 token 属性与校验。([OWASP Cheat Sheet Series][19])

误报说明：

* 如果鉴权不是基于 cookie（例如 Authorization 头 bearer token），CSRF 风险不同；核实实际鉴权机制。

---

### JQ-ATTR-001：不可信值 MUST NOT 未经校验/白名单就写入危险属性

严重程度：低（onclick 等事件类为高）

要求：

* MUST 校验/白名单写入 `href`、`src`、`action` 等的 URL。
* MUST 阻止危险 scheme；`javascript:` URL 可以执行代码，不建议使用。([MDN Web Docs][6])
* MUST NOT 从字符串设置事件处理器属性（`onclick`、`onerror` 等）。
* SHOULD 避免把不可信字符串写进 `style` 属性；优先切换预定义 CSS 类。

不安全模式：

* `$("a").attr("href", untrustedUrl)`
* `$("img").attr("src", untrustedUrl)`
* `$(el).attr("style", untrustedCss)`
* `$(el).attr("onclick", untrustedJs)`

检测提示：

* 搜索 `.attr("href"`、`.attr("src"`、`.attr("style"`、`.prop("href"`、`.prop("src"`。
* 追踪输入是否来自 URL 参数、服务端 JSON、DOM 或存储。

修复：

* 用 `new URL(value, location.origin)` 解析并校验 URL，按需对协议（`https:` 等）和主机名做白名单。
* 导航目标优先用你构造的相对路径而不是完整 URL。
* 用预定义类名的 `addClass/removeClass` 替换 `style` 字符串。

---

### JQ-SELECTOR-001：用户控制的选择器片段 MUST 用 `jQuery.escapeSelector` 转义

严重程度：中（若导致安全相关 UI 选错元素则为高）

要求：

* 如果必须按可能包含特殊 CSS 字符的 ID/类选择，SHOULD 使用 `jQuery.escapeSelector()`（jQuery 3.0+ 可用）。([jQuery API][20])
* MUST NOT 把原始攻击者可控字符串拼接进选择器表达式。

不安全模式：

* `$("#" + untrustedId)`
* `$("[data-id='" + untrusted + "']")`（尤其在没有严格引号/转义时）

检测提示：

* 搜索 `$(` 选择器内的 `"#" +`、`". " +` 或模板字符串。
* 查找“按用户提供的 id 选择”。

修复：

* `$("#" + $.escapeSelector(untrustedId))` ([jQuery API][20])
* 优先用稳定的内部 ID 而不是用户派生的选择器。

注意：

* 这通常属于“健壮性”，但如果选择错误导致 UI 展示/修改了错误数据，或跳过了安全相关提示，它就与安全相关。

---

### JQ-PROTOTYPE-001：不要深合并不可信对象；防止原型污染

严重程度：中

要求：

* MUST NOT 在不过滤危险键的情况下把攻击者可控对象深合并（`$.extend(true, …)`）进应用对象。
* MUST 确保 jQuery >= 3.4.0，以避免 CVE-2019-11358 原型污染行为。([NVD][13])

不安全模式：

* `$.extend(true, target, untrustedObj)`
* `$.extend(true, {}, defaults, untrustedObj)` 而 untrustedObj 来自 URL/JSON/存储

检测提示：

* 搜索 `$.extend(true` 并检查被合并对象的来源。
* 搜索使用不可信 JSON 的“合并选项”/“应用配置”模式。

修复：

* 优先：

  * 带键白名单的浅合并，或
  * 显式拒绝 `__proto__`、`prototype`、`constructor` 及其嵌套出现的安全合并辅助函数。
* 保持 jQuery 已修补。

---

### JQ-CSP-001：SHOULD 使用 CSP 与 Trusted Types，使 DOM XSS 更难引入和利用

严重程度：中

要求：

* SHOULD 部署 CSP 作为对抗 XSS 的纵深防御。([OWASP Cheat Sheet Series][9])
* 如果启用 Trusted Types（`require-trusted-types-for`），MUST 确保 DOM 注入经由 Trusted Types 策略。([MDN Web Docs][11])
* 使用 jQuery 4 时，SHOULD 利用其 Trusted Types 支持（TrustedHTML 输入）。([blog.jquery.com][7])

不安全模式：

* 通过削弱 CSP（`script-src 'unsafe-inline'` / `'unsafe-eval'`）来“修复”某个 jQuery 功能，且没有补偿方案。
* 渲染用户内容或重度操作 DOM 的应用没有 CSP。

检测提示：

* 查找 CSP 头（服务器配置、框架中间件、meta 标签）。
* 若仓库中不可见，标记为“需在边缘/运行时核实”。

修复：

* 渐进增加 CSP；先消除内联脚本和内联事件处理器，再收紧 `script-src`。
* 在受支持且可行的位置增加 Trusted Types。

---

## 5) 实用扫描启发式（如何“挖”）

主动扫描时，使用这些高信号模式：

* jQuery 版本 / 来源：

  * `vendor/` 或 `static/` 中的 `jquery-*.js`
  * `package.json` 中 `jquery` 依赖锁定在旧版本
  * 缺少 `integrity`/`crossorigin` 的 CDN script 标签 ([jquery.com][8])
* HTML 注入汇点（DOM XSS）：

  * `.html(`、`.append(`、`.prepend(`、`.before(`、`.after(`、`.replaceWith(`、`.wrap(`
  * 参数可能是 HTML / 模板字符串的 `$(`
  * `$.parseHTML(`，尤其配合 `keepScripts=true` ([jQuery API][2])
  * `.load(`（以及是否追加了选择器；脚本行为不同）([jQuery API][3])
* 脚本执行 / 动态代码：

  * `$.getScript(`、`dataType: "script"` ([jQuery API][4])
  * `dataType: "jsonp"` 或 `jsonp:` 用法；`callback=?` 模式 ([jQuery API][5])
  * `eval`、`new Function`、`setTimeout("…")`、`$.globalEval`
* 危险属性写入：

  * `.attr("href", …)`、`.attr("src", …)`、`.attr("style", …)`
  * 任何 `javascript:` 类 scheme 赋值或可疑的 URL 构造 ([MDN Web Docs][6])
* 选择器构造：

  * `$("#" + user)` 及类似写法；用 `$.escapeSelector` 修复 ([jQuery API][20])
* 原型污染：

  * `$.extend(true, …, userObj)`；确保 jQuery >= 3.4.0 并过滤危险键 ([NVD][13])
* AJAX 的 CSRF 状况：

  * 带 cookie 却没有 CSRF token/头的 `$.post(` / `$.ajax({ method: ... })` ([OWASP Cheat Sheet Series][19])
* 纵深防御：

  * 配置中缺少 CSP/安全响应头（或不可见；需运行时核实）([OWASP Cheat Sheet Series][12])

始终尝试确认：

* 数据来源（不可信 vs 可信）
* 汇点类型（HTML 插入 / 脚本执行 / 属性 / 选择器 / 对象合并）
* 已有的防护措施（净化器、白名单、CSP、Trusted Types、CSRF 校验）

---

## 6) 参考资料（访问于 2026-01-27）

jQuery 项目主要文档与发布说明：

* jQuery 4.0.0 发布说明（Trusted Types/CSP 变更；版本信息）：`https://blog.jquery.com/2026/01/17/jquery-4-0-0/`。([blog.jquery.com][7])
* Download jQuery（最新版本信息；CDN + SRI 指引）：`https://jquery.com/download/`。([jquery.com][8])
* jQuery API：`.html()`：`https://api.jquery.com/html/`。([jQuery API][21])
* jQuery API：`.text()`：`https://api.jquery.com/text/`。([jQuery API][14])
* jQuery API：`.append()`：`https://api.jquery.com/append/`。([jQuery API][22])
* jQuery API：`.load()`（脚本执行行为）：`https://api.jquery.com/load/`。([jQuery API][3])
* jQuery API：`jQuery.parseHTML(…, keepScripts)`：`https://api.jquery.com/jQuery.parseHTML/`。([jQuery API][2])
* jQuery API：`$.ajax()`（`jsonp: false` 安全说明）：`https://api.jquery.com/jQuery.ajax/`。([jQuery API][5])
* jQuery API：`$.getScript()`（执行脚本）：`https://api.jquery.com/jQuery.getScript/`。([jQuery API][4])
* jQuery API：`jQuery.escapeSelector()`：`https://api.jquery.com/jQuery.escapeSelector/`。([jQuery API][20])

jQuery 漏洞 / 通告：

* NVD CVE-2019-11358（原型污染；jQuery < 3.4.0）：`https://nvd.nist.gov/vuln/detail/CVE-2019-11358`。([NVD][13])
* NVD CVE-2020-11022（DOM 操作方法的 XSS 风险；3.5.0 修复）：`https://nvd.nist.gov/vuln/detail/CVE-2020-11022`。([NVD][1])
* NVD CVE-2020-11023（涉及 `<option>` 的 XSS 风险；3.5.0 修复）：`https://nvd.nist.gov/vuln/detail/CVE-2020-11023`。([NVD][23])
* GitHub Security Advisory GHSA-gxr4-xjj5-5px2（jQuery htmlPrefilter XSS；3.5.0 修复）：`https://github.com/jquery/jquery/security/advisories/GHSA-gxr4-xjj5-5px2`。([GitHub][16])

OWASP Cheat Sheet Series（与 jQuery 使用相关的 Web 应用安全基础）：

* XSS Prevention：`https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html`。([OWASP Cheat Sheet Series][24])
* DOM-based XSS Prevention：`https://cheatsheetseries.owasp.org/cheatsheets/DOM_based_XSS_Prevention_Cheat_Sheet.html`。([OWASP Cheat Sheet Series][25])
* CSRF Prevention：`https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html`。([OWASP Cheat Sheet Series][19])
* HTTP Security Headers：`https://cheatsheetseries.owasp.org/cheatsheets/HTTP_Headers_Cheat_Sheet.html`。([OWASP Cheat Sheet Series][12])
* Content Security Policy Cheat Sheet：`https://cheatsheetseries.owasp.org/cheatsheets/Content_Security_Policy_Cheat_Sheet.html`。([OWASP Cheat Sheet Series][9])

浏览器/平台参考（SRI、CSP、Trusted Types 与危险 URL scheme）：

* MDN：Subresource Integrity（SRI）：`https://developer.mozilla.org/en-US/docs/Web/Security/Defenses/Subresource_Integrity`。([MDN Web Docs][26])
* W3C：SRI 规范：`https://www.w3.org/TR/sri-2/`。([W3C][27])
* MDN：CSP 指南：`https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CSP`。([MDN Web Docs][28])
* MDN：`require-trusted-types-for` 指令：`https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/require-trusted-types-for`。([MDN Web Docs][11])
* MDN：Trusted Types API：`https://developer.mozilla.org/en-US/docs/Web/API/Trusted_Types_API`。([MDN Web Docs][29])
* W3C：Trusted Types 规范：`https://www.w3.org/TR/trusted-types/`。([W3C][10])
* MDN：`javascript:` URL scheme 警告：`https://developer.mozilla.org/en-US/docs/Web/URI/Reference/Schemes/javascript`。([MDN Web Docs][6])
* DOMPurify 项目文档：`https://github.com/cure53/DOMPurify`。([GitHub][17])

[1]: https://nvd.nist.gov/vuln/detail/cve-2020-11022?utm_source=chatgpt.com "CVE-2020-11022 Detail - NVD"
[2]: https://api.jquery.com/jQuery.parseHTML/?utm_source=chatgpt.com "jQuery.parseHTML()"
[3]: https://api.jquery.com/load/?utm_source=chatgpt.com ".load() | jQuery API Documentation"
[4]: https://api.jquery.com/jQuery.getScript/?utm_source=chatgpt.com "jQuery.getScript()"
[5]: https://api.jquery.com/jQuery.ajax/?utm_source=chatgpt.com "jQuery.ajax()"
[6]: https://developer.mozilla.org/en-US/docs/Web/URI/Reference/Schemes/javascript?utm_source=chatgpt.com "javascript: URLs - URIs - MDN Web Docs"
[7]: https://blog.jquery.com/2026/01/17/jquery-4-0-0/ "jQuery 4.0.0 | Official jQuery Blog"
[8]: https://jquery.com/download/ "Download jQuery | jQuery"
[9]: https://cheatsheetseries.owasp.org/cheatsheets/Content_Security_Policy_Cheat_Sheet.html?utm_source=chatgpt.com "Content Security Policy - OWASP Cheat Sheet Series"
[10]: https://www.w3.org/TR/trusted-types/?utm_source=chatgpt.com "Trusted Types"
[11]: https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/require-trusted-types-for?utm_source=chatgpt.com "Content-Security-Policy: require-trusted-types-for directive"
[12]: https://cheatsheetseries.owasp.org/cheatsheets/HTTP_Headers_Cheat_Sheet.html?utm_source=chatgpt.com "HTTP Security Response Headers Cheat Sheet"
[13]: https://nvd.nist.gov/vuln/detail/cve-2019-11358?utm_source=chatgpt.com "CVE-2019-11358 Detail - NVD"
[14]: https://api.jquery.com/text/?utm_source=chatgpt.com ".text() | jQuery API Documentation"
[15]: https://api.jquery.com/val/?utm_source=chatgpt.com ".val() | jQuery API Documentation"
[16]: https://github.com/jquery/jquery/security/advisories/GHSA-gxr4-xjj5-5px2 "Potential XSS vulnerability in jQuery.htmlPrefilter and related methods · Advisory · jquery/jquery · GitHub"
[17]: https://github.com/cure53/DOMPurify?utm_source=chatgpt.com "DOMPurify - a DOM-only, super-fast, uber-tolerant XSS ..."
[18]: https://developer.mozilla.org/en-US/docs/Web/API/HTML_Sanitizer_API?utm_source=chatgpt.com "HTML Sanitizer API - MDN Web Docs"
[19]: https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html?utm_source=chatgpt.com "Cross-Site Request Forgery Prevention Cheat Sheet"
[20]: https://api.jquery.com/jQuery.escapeSelector/?utm_source=chatgpt.com "jQuery.escapeSelector()"
[21]: https://api.jquery.com/html/?utm_source=chatgpt.com ".html() | jQuery API Documentation"
[22]: https://api.jquery.com/append/?utm_source=chatgpt.com ".append() | jQuery API Documentation"
[23]: https://nvd.nist.gov/vuln/detail/cve-2020-11023?utm_source=chatgpt.com "CVE-2020-11023 Detail - NVD"
[24]: https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html?utm_source=chatgpt.com "Cross Site Scripting Prevention - OWASP Cheat Sheet Series"
[25]: https://cheatsheetseries.owasp.org/cheatsheets/DOM_based_XSS_Prevention_Cheat_Sheet.html?utm_source=chatgpt.com "DOM based XSS Prevention Cheat Sheet"
[26]: https://developer.mozilla.org/en-US/docs/Web/Security/Defenses/Subresource_Integrity?utm_source=chatgpt.com "Subresource Integrity - Security - MDN Web Docs"
[27]: https://www.w3.org/TR/sri-2/?utm_source=chatgpt.com "Subresource Integrity"
[28]: https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CSP?utm_source=chatgpt.com "Content Security Policy (CSP) - HTTP - MDN Web Docs"
[29]: https://developer.mozilla.org/en-US/docs/Web/API/Trusted_Types_API?utm_source=chatgpt.com "Trusted Types API - MDN Web Docs"
