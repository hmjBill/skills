# Flask（Python）Web 安全规范（Flask 3.1.x、Python 3.x）

本文档是一份**安全规范**，用于支持：
1) 为新 Flask 代码进行**默认安全的代码生成**。
2) 对既有 Flask 代码进行**安全审查 / 漏洞挖掘**（被动式“边工作边注意问题”，以及主动式“扫描仓库并报告发现”）。

本文档有意写成一套**规范性要求**（“MUST/SHOULD/MAY”）加**审计规则**（坏模式长什么样、如何检测、如何修复/缓解）。

--------------------------------------------------------------------

## 0) 安全、边界与反滥用约束（必须遵守）

- MUST NOT 请求、输出、记录或提交机密（API key、密码、私钥、会话 cookie、SECRET_KEY）。
- MUST NOT 通过关闭防护来“修复”安全问题（例如关闭 CSRF、放宽 CORS、禁用转义、禁用鉴权检查）。
- MUST 在审计中给出**基于证据的发现**：引用能支撑结论的文件路径、代码片段和配置值。
- MUST 诚实对待不确定性：如果某项防护可能存在于基础设施层（反向代理、WAF、CDN），应报告为“应用代码中不可见；需在运行时/配置中核实”。

--------------------------------------------------------------------

## 1) 工作模式

### 1.1 生成模式（默认）
当被要求编写新 Flask 代码或修改既有代码时：
- MUST 遵循本规范中的每一条 **MUST** 要求。
- SHOULD 遵循每一条 **SHOULD** 要求，除非用户明确另有指示。
- MUST 优先使用默认安全的 API 和经过验证的库，而不是自研安全代码。
- MUST 避免引入新的危险汇点（sink）（从字符串渲染模板、执行 shell、动态导入、不安全重定向、把用户文件当 HTML 提供，等等）。

### 1.2 被动审查模式（编辑期间始终开启）
在 Flask 仓库的任何位置工作时（即使用户没有要求安全扫描）：
- MUST “注意”所触及/邻近代码中违反本规范的地方。
- SHOULD 在问题出现时提及，并附简要说明 + 安全的修复方式。

### 1.3 主动审计模式（明确要求扫描时）
当用户要求“扫描”、“审计”或“挖漏洞”时：
- MUST 系统性地在代码库中搜索违反本规范的地方。
- MUST 以结构化格式输出发现（见 §2.3）。

推荐审计顺序：
1) 应用入口 / 部署脚本 / Dockerfile / Procfile。
2) Flask 配置与环境变量处理。
3) 鉴权 + 会话 + cookie。
4) CSRF 防护与改状态路由。
5) 模板渲染与 XSS/SSTI。
6) 文件处理（上传 + 下载）与路径穿越。
7) 注入类（SQL、命令执行、不安全反序列化）。
8) 出站请求（SSRF）。
9) 重定向处理（开放重定向）。
10) CORS 与安全响应头。

--------------------------------------------------------------------

## 2) 定义与审查指引

### 2.1 不可信输入（除非证明否则按攻击者可控处理）
示例包括：
- `request.args`, `request.form`, `request.values`
- `request.get_json()`, `request.json`, `request.data`
- `request.headers`, `request.cookies`
- URL 路径参数（例如 `/user/<id>`）
- 来自外部系统的任何数据（webhook、第三方 API、消息队列）
- 任何源自用户的持久化内容（数据库行）

### 2.2 改状态请求
如果请求能够创建/更新/删除数据、改变鉴权/会话状态、触发副作用（购买、发送邮件、发送 webhook）或发起特权操作，则该请求属于改状态请求。

### 2.3 要求的审计发现格式
对每个发现的问题，输出：

- 规则 ID：
- 严重程度：严重（Critical）/ 高（High）/ 中（Medium）/ 低（Low）
- 位置：文件路径 + 函数/路由名 + 行号
- 证据：确切的代码/配置片段
- 影响：可能出什么问题、谁能够利用
- 修复：安全的改动（优先最小 diff）
- 缓解：当立即修复困难时的纵深防御措施
- 误报说明：不确定时需要核实什么

--------------------------------------------------------------------

## 3) 安全基线：最低生产配置（生产环境 MUST）

这是能防止常见 Flask 配置错误的“最小生产基线”。

### 3.1 应用初始化模式（SHOULD）
SHOULD 使用应用工厂和基于环境的配置，使生产配置不被硬编码。

示例骨架（仅作说明；按项目实际情况调整）：
- 从环境变量 / 密钥存储加载配置。
- 生产环境中关键设置缺失时直接失败（fail closed）。

关键基线配置项：
- 设置 `SECRET_KEY` 且不提交入库
- `SESSION_COOKIE_SECURE=True`（HTTPS 时）重要提示：仅在已配置 TLS 的生产环境中才设置 `Secure`。在通过 HTTP 运行的本地开发环境中，不要给 cookie 设置 `Secure` 属性。应根据应用是否运行在生产模式来条件化处理。还应提供一个类似 `SESSION_COOKIE_SECURE` 的属性，以便在通过 HTTP 测试时能禁用 `Secure` cookie。
- `SESSION_COOKIE_HTTPONLY=True`
- `SESSION_COOKIE_SAMESITE='Lax'`（或兼容时用 `'Strict'`）
- 生产环境中设置 `TRUSTED_HOSTS`
- 在应用内或边缘设置安全响应头（CSP 等）

--------------------------------------------------------------------

## 4) 规则（生成 + 审计）

每条规则包含：要求的做法、不安全模式、检测提示与修复方法。

### FLASK-DEPLOY-001：不要在生产环境使用 Flask 的开发服务器
严重程度：高（若用于生产）

要求：
- MUST NOT 把内置开发服务器部署为生产服务器。
- MUST 运行在生产级 WSGI 服务器或托管平台之后（例如 gunicorn）

不安全模式：
- 在生产入口中使用 `app.run(...)`。
- 在生产中使用 `flask run` 的部署文档/脚本。

检测提示：
- 搜索 `app.run(`、`flask run`、`--debug`、`FLASK_DEBUG`、`FLASK_ENV=development`。
- 检查 Docker CMD/ENTRYPOINT、Procfile、systemd unit、shell 脚本。

修复：
- 使用生产级 WSGI 服务器（Flask 继续作为应用对象）。
- 确保开发服务器只用于本地开发。

注意：
- 这些写法常用于开发模式或本地测试，这是允许的。只有当明确它被用作生产入口时才标记

---

### FLASK-DEPLOY-002：生产环境 MUST 禁用调试模式
严重程度：严重

要求：
- MUST NOT 在生产环境启用调试模式。
- MUST 把暴露的交互式调试器视为等同于远程代码执行。

不安全模式：
- `app.run(debug=True)`
- 生产环境使用 `flask run --debug`。
- 生产环境通过环境变量/配置设置 `DEBUG=True`。

检测提示：
- 查找 `debug=True`、`FLASK_DEBUG=1`、`DEBUG = True`、`app.debug = True`。
- 查找在非测试上下文中启用的 `TRAP_HTTP_EXCEPTIONS`/调试器设置。

修复：
- 确保调试模式只在本地开发/测试中启用。
- 优先使用基于环境的开关和安全默认值。

注意：
- 这些写法常用于开发模式或本地测试，这是允许的。只有当明确它被用作生产入口时才标记

---

### FLASK-CONFIG-001：SECRET_KEY 必须足够强、保密并安全轮换
严重程度：高（若生产环境缺少该键且使用了会话或签名，则为严重）

要求：
- MUST 在生产环境设置强随机的 `SECRET_KEY`。
- MUST 让 `SECRET_KEY` 不进入版本控制，也不出现在日志中。
- MAY 定期轮换密钥；MAY 使用 `SECRET_KEY_FALLBACKS` 支持轮换而不立即让既有会话失效，并在轮换窗口结束后移除旧密钥。小型应用通常不需要这样做，但对大型应用是良好实践。由于这会让部署复杂化，建议以建议的形式提出，而不是默认直接实现。

不安全模式：
- 生产环境缺少 `SECRET_KEY`。
- 仓库中硬编码 `SECRET_KEY`（包括测试密钥被意外用于生产）。
- 记录或打印 `SECRET_KEY`。

检测提示：
- 搜索 `SECRET_KEY =`、`app.secret_key =`、`SECRET_KEY_FALLBACKS =`。
- 检查提交到仓库的 `.env` 文件。
- 检查配置模块中的常量。

修复：
- 从密钥管理器或环境变量加载。
- 增加轮换流程：
  - 设置新的 `SECRET_KEY`
  - 旧密钥暂时保留在 `SECRET_KEY_FALLBACKS` 中
  - 在安全窗口结束后移除旧密钥。

注意：
- 如果应用使用 Flask 会话（默认基于 cookie），`SECRET_KEY` 直接关系到安全性。

---

### FLASK-SESS-001：生产环境中会话 cookie 必须使用安全属性
严重程度：中

要求（生产环境、HTTPS）：
- MUST 设置 `SESSION_COOKIE_SECURE=True`（cookie 仅经 HTTPS 传输）。提示：仅在已配置 TLS 的生产环境中才设置 `Secure`。在通过 HTTP 运行的本地开发环境中，不要给 cookie 设置 `Secure` 属性。应根据应用是否运行在生产模式来条件化处理。还应提供一个类似 `SESSION_COOKIE_SECURE` 的属性，以便在通过 HTTP 测试时能禁用 `Secure` cookie。
- MUST 确保 `SESSION_COOKIE_HTTPONLY=True`（防止 JS 访问）。
- SHOULD 设置 `SESSION_COOKIE_SAMESITE='Lax'`（推荐），或在与用户体验兼容时用 `'Strict'`。
- SHOULD 保持 `SESSION_COOKIE_DOMAIN=None`，除非明确需要跨子域共享 cookie。
- 若需要被第三方页面内嵌/iframe 使用，MAY 考虑 `SESSION_COOKIE_PARTITIONED=True`（要求 HTTPS）。

不安全模式：
- 生产环境 `SESSION_COOKIE_SECURE=False`。
- `SESSION_COOKIE_HTTPONLY=False`。
- 使用 cookie 鉴权的改状态端点却设置 `SESSION_COOKIE_SAMESITE=None`（CSRF 风险更高）。

检测提示：
- 检查 `app.config.update(...)` 块和配置类。
- 同时关注非会话 cookie 上的 `set_cookie(..., secure=..., httponly=..., samesite=...)` 用法。

修复：
- 在生产配置中显式设置这些配置值。

注意：
- SameSite 属于纵深防御；不要把它当成 CSRF token 的完全替代品。

---

### FLASK-SESS-002：会话必须有界，并能抵抗会话固定/重放
严重程度：中

要求：
- SHOULD 设置与应用相称的、有上限的会话生命周期。
- SHOULD 仅在确实需要持久会话时设置 `session.permanent = True`，并把 `PERMANENT_SESSION_LIFETIME` 设为有依据的值。
- SHOULD 在登录和权限变更时清空会话，以降低会话固定风险。
- MUST NOT 在默认 Flask 会话 cookie 中存储敏感机密。默认会话是签名的，不是加密的。

不安全模式：
- 特权会话生命周期极长或不设上限。
- 登录时不清空会话。
- 使用默认 cookie 会话时把机密（密码、访问令牌、PII）直接存进 `session[...]`。

检测提示：
- 搜索 `PERMANENT_SESSION_LIFETIME`、`session.permanent`、`session[...] =`。
- 判断是否使用了服务端会话存储；如果没有，则按默认 cookie 会话处理。

修复：
- 设置合适的生命周期。
- 登录时清空/轮换会话。
- 敏感数据存服务端；会话 cookie 中只存标识符。

---

### FLASK-CSRF-001：使用 cookie 鉴权的改状态请求 MUST 有 CSRF 防护
严重程度：高

- 重要提示：如果不使用 cookie 做鉴权（即鉴权通过 Authentication 头或其他传递的 token 完成），则不存在 CSRF 风险。

要求：
- MUST 保护所有依赖 cookie 鉴权的改状态端点（POST/PUT/PATCH/DELETE）。
- MAY 使用经过充分测试的 CSRF 库/集成（表单框架或中间件），而不是自己造轮子。
- MAY 使用额外防线（Origin/Referer 检查、SameSite cookie、Fetch Metadata 头、AJAX/API 自定义头），但对 cookie 鉴权应用而言 token 仍是主要防线。
如果 token 不切实际，或对小型应用：
* MUST 至少要求设置一个自定义请求头，并把会话 cookie 设为 SESSION_COOKIE_SAMESITE=lax；这是除要求表单 token 之外最强的做法，而且通常更容易实现。

不安全模式：
- 使用 cookie 鉴权却没有任何 CSRF 防护的改状态端点。
- 用 GET 执行改状态操作（放大 CSRF 风险）。

检测提示：
- 枚举非 GET 方法的路由并识别其鉴权机制。
- 查找 CSRF 集成（例如 Flask-WTF、全局 CSRF 中间件）。若缺失，视为可疑。
- 也要检查 JSON API 端点，而不只是 HTML 表单。

修复：
- 为所有改状态请求加上 CSRF 防护。
- 如果应用是纯 API、使用 Authorization 头（bearer token）而非 cookie，记录这一选择并确保不把 cookie 用于鉴权。不使用 cookie 鉴权就没有 CSRF 风险。

注意：
- XSS 能够击穿 CSRF 防护；CSRF 防御不能替代 XSS 防范。

---

### FLASK-XSS-001：防止模板与 HTML 生成中的反射型/存储型 XSS
严重程度：高

要求：
- MUST 依赖 Jinja 对 HTML 模板的自动转义。
- MUST NOT 把不可信内容标记为安全：
  - 避免对用户数据使用 `Markup(...)`。
  - 避免对用户控制的内容使用 Jinja 的 `|safe`。
- MUST 给包含 Jinja 表达式的 HTML 属性加引号（`value="{{ x }}"` 而不是 `value={{ x }}`）。
- MUST NOT 把上传的 HTML 当作可活动的 HTML 提供；应作为下载提供（`Content-Disposition: attachment`）或转换为安全格式。注意：仅当应用允许上传 html、js、css 等文档类内容时才相关；如果纯粹是图片文件，则无需担心。
- SHOULD 部署内容安全策略（CSP）以缓解各类 XSS（包括 `href` 中的 `javascript:`）。

不安全模式：
- `Markup(request.args.get(...))`
- 模板过滤器：`{{ user_html|safe }}`
- 模板中未加引号的属性
- 以 `text/html` 或内联渲染方式直接提供用户上传内容

检测提示：
- 搜索 `Markup(` 并追查数据来源。
- 在模板文件中搜索 `|safe`、`|tojson` 的误用以及未加引号的属性。
- 审查可能在未带 `as_attachment=True` 的情况下返回用户上传的文件服务路由。注意：仅当应用允许上传 html、js、css 等文档类内容时才相关；如果纯粹是图片文件，则无需担心。

修复：
- 移除不安全的标记；仅在确有必要时使用可信的 HTML 净化器进行净化。
- 始终给属性加引号。
- 增加 CSP 并减少内联脚本。

---

### FLASK-SSTI-001：绝不渲染不可信模板（服务端模板注入）
严重程度：严重

要求：
- MUST NOT 渲染包含用户控制的模板语法的模板。
- 当模板字符串受不可信输入影响时，MUST 把 `render_template_string` 和 `Environment.from_string(...).render(...)` 视为危险操作。
- MUST NOT 对用户控制的字符串使用 `.format()`
- 如果确实必须使用不可信模板，应把它当作特殊的高风险设计：
  - MUST 使用沙箱化的模板方案并限制能力。
  - MUST 保持 Jinja 更新，并假设沙箱逃逸是可能的；做进一步隔离。

不安全模式：
- `render_template_string(request.args["tmpl"], ...)`
- 把用户模板存入数据库，再用普通 Jinja 环境渲染。
- `request.args["tmpl"].format(...)`

检测提示：
- 搜索 `render_template_string`、`from_string`、`.render(` 接动态字符串的用法。
- 追查模板字符串的来源（数据库、请求、上传、管理后台）。

修复：
- 用不求值代码的安全模板替代方案（如 string.Template、str.replace）。
- 如果模板必须由用户定义，则使用沙箱 + 严格白名单 + 强隔离。

---

### FLASK-HEADERS-001：设置必要的安全响应头（应用内或边缘）
严重程度：中

要求（典型 Web 应用）：
- SHOULD 设置：
  - CSP（`Content-Security-Policy`）
  - `X-Content-Type-Options: nosniff`
  - 点击劫持防护（`X-Frame-Options: SAMEORIGIN` 和/或 CSP `frame-ancestors`）（某些场景下用户可能希望自己的站点被别处 iframe 引用；若是这种情况，与其协作以安全地放行）
- SHOULD 根据应用考虑额外的加固头（Referrer-Policy、Permissions-Policy）。
- MUST 确保 cookie 使用安全属性（见 FLASK-SESS-001）。

注意：安全响应头也可能由代理或其他云服务商设置。请核实是否存在这类证据。

不安全模式：
- 任何位置（应用或边缘）都没有安全响应头。
- 展示不可信内容的应用缺少 CSP。

检测提示：
- 搜索 `after_request` 钩子、Flask-Talisman 的使用、反向代理配置。
- 若应用代码中不可见，标记为“需在边缘核实”。

修复：
- 集中设置响应头（中间件 / after_request）或通过反向代理/CDN。
- 保持 CSP 现实且兼容；尽量避免 `unsafe-inline`。

---

### FLASK-LIMITS-001：请求体大小与表单解析限制 MUST 设置得当
严重程度：低（若存在文件上传/大请求体则为中）

要求：
- SHOULD 设置并说明依据：
  - `MAX_CONTENT_LENGTH`（全局请求字节数上限）
  - `MAX_FORM_MEMORY_SIZE`（multipart 中每个非文件表单字段的上限）
  - `MAX_FORM_PARTS`（multipart 字段数量上限）
- MUST 尽可能同时在反向代理 / WSGI / 平台层面执行额外限制。

不安全模式：
- 处理上传或用户内容时不限制请求体大小。
- 接受任意大的 multipart 表单或过多字段。

检测提示：
- 检查 Flask 配置中的这些键。
- 检查上传路由和接受大 JSON 的 API。

修复：
- 设置保守默认值，仅在需要时按路由覆盖。
- 确保大文件上传使用专门的上传机制。

---

### FLASK-HOST-001：生产环境必须校验 Host 头
严重程度：低（取决于应用对外部 URL 的使用）

要求：
- MUST 在生产环境设置 `TRUSTED_HOSTS`，限制可接受的 Host 值。
- MUST NOT 把 `SERVER_NAME` 当作主机限制机制。

不安全模式：
- 生产环境未设置 `TRUSTED_HOSTS`。
- 为邮件/密码重置生成外部 URL 却不校验主机的代码。

检测提示：
- 查找 `TRUSTED_HOSTS` 配置的使用。
- 查找 `url_for(..., _external=True)` 并检查主机如何确定。

修复：
- 把 `TRUSTED_HOSTS` 设为预期域名（及所需子域）。
- 确保外部 URL 生成使用可信的 host/scheme。

---

### FLASK-PROXY-001：反向代理信任必须配置正确
严重程度：中（若依赖 IP 做鉴权则为高）

要求：
- 若部署在反向代理之后，MUST 配置 Flask/Werkzeug 只信任来自预期代理的 forwarded 头。
- MUST NOT 盲目信任来自公网的 `X-Forwarded-*` 头。

不安全模式：
- `ProxyFix` 配置的信任范围过宽，或不清楚前面有几层代理就使用。
- 未经验证就依赖 forwarded 头决定 scheme/host。

检测提示：
- 搜索 `ProxyFix`。
- 搜索 `request.remote_addr`、`request.scheme`、`request.host` 在安全敏感逻辑中的使用。

修复：
- 按正确的跳数配置 `ProxyFix`（或平台特定设置）。
- 即使在代理之后也要保留 `TRUSTED_HOSTS`。

---

### FLASK-PATH-001：防止路径穿越与不安全的文件服务
严重程度：高

要求：
- MUST NOT 把用户控制的文件路径传给 `send_file` 或直接文件 I/O。
- MUST 使用安全的文件服务模式：
  - 受信基目录下用户指定的路径用 `send_from_directory`
  - 把受信基目录与不可信路径组件拼接时用 `safe_join`
  - 上传文件名用 `secure_filename`（并且仍要自行生成唯一的存储名）
- MUST 确保用户上传内容不会作为可执行/活动内容提供（尤其是 HTML）。
- SHOULD 在几乎所有文件系统路径计算中优先用 `safe_join` 而非 `os.path.join`。

不安全模式：
- `send_file(request.args["path"])`
- `open(os.path.join(base_dir, user_path))`，其中 `user_path` 不可信
- 无限制地从静态 Web 根目录内提供上传文件

检测提示：
- 在文件路由中搜索 `send_file(`、`open(`、`os.path.join(`、`pathlib.Path(...)/...`。
- 确认文件名来自哪里（请求参数、数据库、请求头）。

修复：
- 只从不受用户控制的目录基提供服务。
- 上传内容存放在静态根目录之外；通过受控路由提供。
- 始终校验并规范化文件标识。

注意：`safe_join` 从 `werkzeug.security` 导入

---

### FLASK-UPLOAD-001：文件上传必须校验、安全存储并安全提供
严重程度：高

要求：
- MUST 执行上传大小限制（应用 + 边缘）。
- MUST 使用白名单和内容检查校验文件类型（不能只看扩展名）。
- MUST 尽可能把上传内容存放在可执行/静态根目录之外。
- SHOULD 在服务端生成文件名（随机 ID），不要信任原始文件名。
- MUST 安全地提供可能有活动内容的格式（作为下载附件），除非明确有此意图。

不安全模式：
- 接受任意文件类型并以内联方式回传。
- 把用户提供的文件名用作存储路径。
- 缺少大小/类型校验。

检测提示：
- 查找 `request.files[...]` 处理器。
- 检查 `secure_filename` 的使用（以及是否结合了唯一性）。
- 检查文件存储位置和提供方式。

修复：
- 实现白名单校验 + 安全存储 + 安全提供。
- 适用时增加扫描 / 隔离。

---

### FLASK-INJECT-001：防止 SQL 注入（使用参数化查询 / ORM）
严重程度：高

要求：
- MUST 使用参数化查询或底层做了参数化的 ORM。
- MUST NOT 用字符串拼接 / f-string 配合不可信输入构造 SQL。

不安全模式：
- `f"SELECT ... WHERE id={request.args['id']}"`
- `"... WHERE name = '%s'" % user_input`

检测提示：
- 在 Python 代码中搜索 `SELECT`、`INSERT`、`UPDATE`、`DELETE` 字符串。
- 追踪不可信数据是否进入数据库 execute 调用。

修复：
- 改为参数化查询或 ORM 查询 API。
- 查询前校验类型（例如 int 型 ID）。

---

### FLASK-INJECT-002：防止操作系统命令注入
严重程度：严重至高（取决于暴露面）

要求：
- MUST 避免用不可信输入执行 shell 命令。
- 如果必须使用 subprocess：
  - MUST 以列表形式传参（不要用字符串）
  - MUST NOT 对受攻击者影响的字符串使用 `shell=True`
  - SHOULD 对任何可变部分使用严格白名单
- 可能的话，优先用纯 Python 或 Python 库，而不是 subprocess 或系统命令
- 即使 `shell=False`，也不要假设命令参数天然安全。命令可能把这些参数错误地当作命令行开关或其他受信值处理。

不安全模式：
- `os.system(user_input)`
- `subprocess.run(f"cmd {user}", shell=True)`
- 把用户字符串传入 `bash -c`、`sh -c`、PowerShell 等。

检测提示：
- 搜索 `os.system`、`subprocess`、`Popen`、`shell=True`。
- 追踪来自请求/数据库的数据是否进入这些调用。

修复：
- 用库 API 代替 shell 命令。
- 无法避免时，硬编码命令本身并对参数做白名单校验。若子命令支持，尽量把用户值放在 `--` 之后，防止被当作命令行开关处理。

---

### FLASK-SSRF-001：防止出站 HTTP 中的服务端请求伪造（SSRF）
严重程度：中

- 注意：对小型独立项目而言重要性较低。当部署到局域网内或同一服务器上还有其他服务监听时最为重要。

要求：
- MUST 把对用户提供 URL 的出站请求视为高风险。
- SHOULD 对任何受用户影响的 URL 抓取校验并限制目标（主机/域名白名单）。
- SHOULD 阻止访问：
  - localhost / 私有 IP 段 / 链路本地地址
  - 云元数据端点
- MUST NOT 允许非 http/https 协议（即 file: 等）
- SHOULD 设置超时并限制重定向。



不安全模式：
- `requests.get(request.args["url"])`
- 接受任意 URL 的 webhook/预览/抓取端点。

检测提示：
- 搜索 `requests.get/post`、`httpx`、`urllib`、`aiohttp` 配合不可信 URL 来源的用法。
- 识别 URL 抓取类功能（预览、导入、webhook 测试器）。

修复：
- 确保 URL 为 http 或 https（禁止 file: 等其他协议）
- 执行白名单和网络出口控制。
- 增加严格解析和 IP 解析检查；设置超时；不需要时禁用重定向。

---

### FLASK-REDIRECT-001：防止开放重定向
严重程度：低

要求：
- MUST 校验来自不可信输入的重定向目标（例如 `next`、`redirect`、`return_to`）。
- SHOULD 使用内部路径或已知域名的白名单。
- SHOULD 优先只重定向到同站相对路径。

不安全模式：
- `redirect(request.args.get("next"))` 且不校验。

检测提示：
- 搜索 `redirect(` 并检查 `location` 来自哪里。

修复：
- 只允许相对路径或白名单域名。
- 校验失败时回退到安全默认值。

---

### FLASK-HTTP-001：安全使用 HTTP 方法；不要用 GET 改状态；避免在 URL 中放机密
严重程度：中

要求：
- MUST NOT 通过 GET 执行改状态操作。
- MUST NOT 把机密放进 URL（查询字符串经常被记录日志，并会经 referrer 泄露）。
- SHOULD 要求用 POST/PUT/PATCH/DELETE 做状态变更，并在 cookie 鉴权时应用 CSRF 防护。

不安全模式：
- 以 GET 实现的 `/delete?id=...`
- 查询参数中的密码重置 token 或 API key

检测提示：
- 枚举 GET 路由并检查是否改变状态。
- 查找名为 `token`、`key`、`secret`、`password` 等的 URL 参数。

修复：
- 把状态变更移到非 GET 方法。
- 把敏感值移到安全通道（POST body、请求头）并加以保护。

---

### FLASK-CORS-001：CORS 必须显式声明并遵循最小权限
严重程度：中（若与凭据搭配配置错误则为高）

要求：
- 如果不需要 CORS，MUST 保持禁用。
- 如果需要 CORS：
  - MUST 对受信来源做白名单（不要反射任意 Origin）。
  - MUST 谨慎处理带凭据的请求；不要把宽松来源与 cookie 组合。
  - SHOULD 限制允许的方法和头。

不安全模式：
- `Access-Control-Allow-Origin: *` 与带凭据 cookie 或过宽的访问并存。
- 不校验就反射 `Origin`。
- `flask_cors.CORS(app)` 使用宽松默认值。

检测提示：
- 搜索 `flask_cors`、`CORS(`、`Access-Control-Allow-Origin`。
- 检查 `supports_credentials=True` 和通配符来源。

修复：
- 使用严格的来源白名单和最小的方法/头集合。
- 确保除非必要，cookie 鉴权端点不跨源暴露。

---

### FLASK-SUPPLY-001：依赖与补丁卫生（聚焦安全相关依赖）
严重程度：低

要求：
- SHOULD 固定版本并定期更新安全关键依赖（Flask、Werkzeug、Jinja2、itsdangerous）。
- MUST 及时响应已知安全通告。

审计关注点示例：
- 如果在 Windows 上运行并使用带不可信路径的文件服务，确保 Werkzeug 的 `safe_join` 行为不易受 Windows 设备名边界情况影响。

检测提示：
- 检查 `requirements.txt`、lockfile 和运行环境。
- 确认安全辅助函数的使用位置（safe_join、send_from_directory）。

修复：
- 升级到已修复版本，并为受影响行为补充回归测试。

--------------------------------------------------------------------

## 5) 实用扫描启发式（如何“挖”）

主动扫描时，使用这些高信号模式：

- 开发服务器 / 调试：
  - `app.run(`、`flask run`、`--debug`、`DEBUG=True`、`FLASK_DEBUG`
- 机密：
  - `SECRET_KEY`、`secret_key`、提交入库的 `.env`、`print(config)`
- Cookie / 会话：
  - `SESSION_COOKIE_SECURE`、`SESSION_COOKIE_HTTPONLY`、`SESSION_COOKIE_SAMESITE`
  - `session[...] =` 存敏感值
- CSRF：
  - cookie 鉴权应用中没有 CSRF 检查的 POST/PUT/PATCH/DELETE 处理器
- XSS/SSTI：
  - `Markup(`、`|safe`、未加引号的属性、`render_template_string`
- 文件：
  - `send_file(` 使用用户控制的路径；对用户路径 `open(`；`os.path.join` 拼接不可信内容
  - 用用户文件名作路径的上传处理器
- 注入：
  - SQL 字符串 + 字符串格式化后传入 `.execute(...)`
  - `subprocess.*`、`shell=True`、`os.system`
- SSRF：
  - `requests.get/post` 或 `httpx` 使用来自请求/数据库的 URL
- 重定向：
  - `redirect(request.args.get("next"))`
- CORS：
  - `flask_cors.CORS` 宽松配置；通配符来源配合凭据

始终尝试确认：
- 数据来源（不可信 vs 可信）
- 汇点类型（模板/SQL/subprocess/文件/重定向/http）
- 已有的防护措施（校验、白名单、中间件）

--------------------------------------------------------------------

## 6) 参考资料（访问于 2026-01-26）

主要框架文档：
- Flask 文档：部署到生产环境 — https://flask.palletsprojects.com/en/stable/deploying/
- Flask 文档：调试应用错误 — https://flask.palletsprojects.com/en/stable/debugging/
- Flask 文档：配置处理 — https://flask.palletsprojects.com/en/stable/config/
- Flask 文档：安全注意事项 — https://flask.palletsprojects.com/en/stable/web-security/
- Flask 文档：告知 Flask 其处于代理之后 — https://flask.palletsprojects.com/en/stable/deploying/proxy_fix/
- Flask API 文档：会话（Sessions）— https://flask.palletsprojects.com/en/stable/api/#sessions

Werkzeug 文档与安全通告：
- Werkzeug 文档：实用工具（send_file / send_from_directory / safe_join / secure_filename / 密码哈希）— https://werkzeug.palletsprojects.com/en/stable/utils/
- GitHub Advisory：CVE-2025-66221（Werkzeug safe_join 的 Windows 设备名问题）— https://github.com/advisories/GHSA-hgf8-39gv-g3f2

OWASP Cheat Sheet 系列：
- 会话管理 — https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html
- CSRF 防御 — https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html
- XSS 防御 — https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html
- 输入校验 — https://cheatsheetseries.owasp.org/cheatsheets/Input_Validation_Cheat_Sheet.html
- SQL 注入防御 — https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html
- 注入防御 — https://cheatsheetseries.owasp.org/cheatsheets/Injection_Prevention_Cheat_Sheet.html
- 操作系统命令注入防御 — https://cheatsheetseries.owasp.org/cheatsheets/OS_Command_Injection_Defense_Cheat_Sheet.html
- SSRF 防御 — https://cheatsheetseries.owasp.org/cheatsheets/Server_Side_Request_Forgery_Prevention_Cheat_Sheet.html
- 文件上传 — https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html
- 未校验的重定向 — https://cheatsheetseries.owasp.org/cheatsheets/Unvalidated_Redirects_and_Forwards_Cheat_Sheet.html
- HTTP 头 — https://cheatsheetseries.owasp.org/cheatsheets/HTTP_Headers_Cheat_Sheet.html

模板安全参考资料：
- Jinja：沙箱（渲染不可信模板）— https://jinja.palletsprojects.com/en/stable/sandbox/
- OWASP WSTG：服务端模板注入测试 — https://owasp.org/www-project-web-security-testing-guide/v41/4-Web_Application_Security_Testing/07-Input_Validation_Testing/18-Testing_for_Server_Side_Template_Injection
- PortSwigger Web Security Academy：服务端模板注入 — https://portswigger.net/web-security/server-side-template-injection

HTTP 语义：
- RFC 9110：HTTP 语义（safe methods）— https://www.rfc-editor.org/rfc/rfc9110