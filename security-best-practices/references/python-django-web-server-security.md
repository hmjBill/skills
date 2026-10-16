# Django（Python）Web 安全规范（Django 6.0.x、Python 3.x）

本文档是一份**安全规范**，用于支持：

1. 为新 Django 代码进行**默认安全的代码生成**。
2. 对既有 Django 代码进行**安全审查 / 漏洞挖掘**（被动式“边工作边注意问题”，以及主动式“扫描仓库并报告发现”）。

本文档有意写成一套**规范性要求**（“MUST/SHOULD/MAY”）加**审计规则**（坏模式长什么样、如何检测、如何修复/缓解）。

---

## 0) 安全、边界与反滥用约束（必须遵守）

* MUST NOT 请求、输出、记录或提交机密（API key、密码、私钥、会话 cookie、`SECRET_KEY`、`SECRET_KEY_FALLBACKS`、数据库密码）。
* MUST NOT 通过关闭防护来“修复”安全问题（例如移除 `CsrfViewMiddleware`、到处加 `@csrf_exempt`、把 `ALLOWED_HOSTS` 放宽为 `['*']`、禁用 `SecurityMiddleware`、禁用模板自动转义、禁用权限检查）。
* MUST 在审计中给出**基于证据的发现**：引用能支撑结论的文件路径、代码片段和具体配置值。
* MUST 诚实对待不确定性：如果某项防护可能存在于基础设施层（反向代理、WAF、CDN、ingress 控制器），应报告为“应用代码中不可见；需在运行时 / 边缘配置中核实”。
* MUST 保持修复与 Django 既定的安全模型兼容：尽可能优先使用 Django 内建能力（中间件、auth、forms、ORM）而不是自研安全逻辑。Django 的部署检查清单和系统检查是该模型的一部分。([Django Project][1])

---

## 1) 工作模式

### 1.1 生成模式（默认）

当被要求编写新 Django 代码或修改既有代码时：

* MUST 遵循本规范中的每一条 **MUST** 要求。
* SHOULD 遵循每一条 **SHOULD** 要求，除非用户明确另有指示。
* MUST 优先使用默认安全的 Django API 和经过验证的库，而不是自研安全代码。
* MUST 避免引入新的危险汇点（sink）（用不可信字符串动态渲染模板、不安全重定向、不安全的文件服务、执行 shell、原始 SQL 字符串格式化、用不可信输入做可 SSRF 的 URL 抓取）。

### 1.2 被动审查模式（编辑期间始终开启）

在 Django 仓库的任何位置工作时（即使用户没有要求安全扫描）：

* MUST “注意”所触及/邻近代码中违反本规范的地方。
* SHOULD 在问题出现时提及，并附简要说明 + 安全的修复方式。

### 1.3 主动审计模式（明确要求扫描时）

当用户要求“扫描”、“审计”或“挖漏洞”时：

* MUST 系统性地在代码库中搜索违反本规范的地方。
* MUST 以结构化格式输出发现（见 §2.3）。

推荐审计顺序：

1. 部署入口（ASGI/WSGI）、Dockerfile、Procfile、systemd unit、平台清单。
2. `settings.py` 和分环境的 settings 模块。
3. 中间件顺序与已启用的防护。
4. 认证/授权（登录、会话管理、权限、admin）。
5. CSRF 防护与改状态端点。
6. 模板与 XSS。
7. 文件处理（上传/下载/static/media）与路径穿越。
8. 注入类（SQL、命令执行、不安全反序列化）。
9. 出站请求（SSRF）。
10. 重定向处理（开放重定向）+ CORS + 安全响应头（CSP、HSTS 等）。
11. 依赖/版本固定与补丁状况。

---

## 2) 定义与审查指引

### 2.1 不可信输入（除非证明否则按攻击者可控处理）

示例包括：

* `request.GET`, `request.POST`, `request.FILES`
* `request.body`、JSON 请求体（例如 `json.loads(request.body)`）、DRF 的 `request.data`
* URL 路径参数（例如 `<int:id>`、`<slug:...>`）
* `request.headers` / `request.META`（包括 `HTTP_HOST`、`HTTP_ORIGIN`、`HTTP_REFERER`、`HTTP_X_FORWARDED_*`）
* `request.COOKIES`
* 来自外部系统的任何数据（webhook、第三方 API、消息队列）
* 任何源自用户的持久化内容（数据库行、缓存内容、文件上传）

Django 明确强调“绝不信任用户控制的数据”，并建议使用 forms/校验。([Django Project][2])

### 2.2 改状态请求

如果请求能够创建/更新/删除数据、改变鉴权/会话状态、触发副作用（购买、发送邮件、发送 webhook）或发起特权操作，则该请求属于改状态请求。

### 2.3 要求的审计发现格式

对每个发现的问题，输出：

* 规则 ID：
* 严重程度：严重（Critical）/ 高（High）/ 中（Medium）/ 低（Low）
* 位置：文件路径 + 函数/类/视图名 + 行号
* 证据：确切的代码/配置片段
* 影响：可能出什么问题、谁能够利用
* 修复：安全的改动（优先最小 diff）
* 缓解：当立即修复困难时的纵深防御措施
* 误报说明：不确定时需要核实什么

---

## 3) 安全基线：最低生产配置（生产环境 MUST）

这是能防止常见 Django 配置错误的“最小生产基线”。Django 提供“部署检查清单”，建议对生产 settings 运行 `manage.py check --deploy`。([Django Project][1])

### 3.1 设置管理模式（SHOULD）

* SHOULD 使用基于环境的配置（或密钥管理器），使生产设置不被硬编码。
* MUST 把敏感设置当作机密（例如 `SECRET_KEY`、数据库密码），且不进入版本控制。Django 的检查清单明确建议从环境变量或文件加载 `SECRET_KEY`，而不是硬编码。([Django Project][1])
* SHOULD 区分开发与生产的 settings 模块，生产使用安全默认值（关键设置缺失时 fail closed）。([Django Project][1])

### 3.2 最低基线目标（生产）

* MUST NOT 用 `manage.py runserver` 作为生产入口；使用生产级 WSGI 或 ASGI 服务器。([Django Project][1])
* MUST 在生产环境设置 `DEBUG = False`。([Django Project][1])
* MUST 设置强且保密的 `SECRET_KEY` 并保守机密；MAY 用 `SECRET_KEY_FALLBACKS` 做安全轮换。([Django Project][1])
* MUST 把 `ALLOWED_HOSTS` 设为预期主机（除非自行做主机校验，否则不用通配符）。([Django Project][1])
* MUST 对已鉴权区域强制 HTTPS（对任何支持登录的应用最好是全站），并在使用 HTTPS 时设置 `CSRF_COOKIE_SECURE=True` 和 `SESSION_COOKIE_SECURE=True`。([Django Project][1])
* SHOULD 启用关键的 `SecurityMiddleware` 头/设置：HSTS、Referrer-Policy、COOP、nosniff、SSL 重定向（配合正确的代理配置）。([Django Project][3])
* MUST 把用户上传当作不可信；确保 Web 服务器绝不把它们解释为可执行内容；`MEDIA_ROOT` 与 `STATIC_ROOT` 保持分离。([Django Project][1])

---

## 4) 规则（生成 + 审计）

每条规则包含：要求的做法、不安全模式、检测提示与修复方法。

### DJANGO-DEPLOY-001：不要在生产环境使用 Django 的开发服务器

严重程度：高（若用于生产）

要求：

* MUST NOT 把 `manage.py runserver` 部署为生产服务器。
* MUST 运行在生产级 WSGI 或 ASGI 服务器之后。([Django Project][1])

不安全模式：

* 使用 `python manage.py runserver 0.0.0.0:8000` 的生产文档/脚本。
* Docker `CMD`/entrypoint 使用 `runserver`。
* Kubernetes/Procfile/systemd unit 调用 `runserver`。

检测提示：

* 搜索 `manage.py runserver`、`runserver 0.0.0.0`、`--insecure`。
* 检查 Docker `CMD/ENTRYPOINT`、Procfile、systemd unit 文件、Helm chart。

修复：

* 按 Django 部署检查清单的建议使用生产服务器（WSGI/ASGI）。([Django Project][1])

注意：

* `runserver` 用于本地开发没有问题。只有当它被用作生产入口时才标记。

---

### DJANGO-DEPLOY-002：生产环境 `DEBUG` MUST 禁用

严重程度：高

要求：

* MUST 在生产环境设置 `DEBUG = False`。
* MUST 把任何向不可信用户暴露调试页/回溯的机制视为严重的信息泄露风险。Django 的检查清单明确警告 `DEBUG=True` 会泄露源码片段、局部变量、设置等。([Django Project][1])

不安全模式：

* 生产 settings 中 `DEBUG = True`。
* 环境默认 `DEBUG=True`，除非显式覆盖。

检测提示：

* 搜索 `DEBUG = True`、`DEBUG=os.environ.get(..., True)`、`DJANGO_DEBUG`、`.env` 文件。
* 查找从开发默认值导入的“production” settings 模块。

修复：

* 在生产 settings 中设置 `DEBUG=False`；使用显式的环境配置。
* 确保错误报告走安全的日志/监控，而不是调试页。([Django Project][1])

---

### DJANGO-CONFIG-001：`SECRET_KEY` 必须足够强、保密并安全轮换

严重程度：高（若生产环境缺少该键且使用了签名/会话，则为严重）

要求：

* MUST 在生产环境设置大随机 `SECRET_KEY` 并保守机密。([Django Project][1])
* MUST NOT 提交到版本控制或打印/记录它。([Django Project][1])
* SHOULD 从环境变量或文件/密钥存储加载（不要硬编码）。([Django Project][1])
* MAY 使用 `SECRET_KEY_FALLBACKS` 轮换密钥，避免立即让所有签名数据失效；MUST 及时从 fallbacks 中移除旧密钥。([Django Project][1])

不安全模式：

* 仓库中为生产硬编码 `SECRET_KEY = "..."`。
* `SECRET_KEY` 跨环境复用。
* `SECRET_KEY_FALLBACKS` 无限期保留早已过期的密钥。

检测提示：

* 搜索 `SECRET_KEY =`、`SECRET_KEY_FALLBACKS`、提交入库的 `.env` 文件、`print(settings.SECRET_KEY)`。

修复：

* 从密钥管理器 / 环境变量加载。
* 轮换时：

  * 设置新的 `SECRET_KEY`
  * 旧密钥暂时保留在 `SECRET_KEY_FALLBACKS` 中
  * 在轮换窗口结束后移除旧密钥。([Django Project][1])

---

### DJANGO-HOST-001：必须校验 Host 头（`ALLOWED_HOSTS` 必须严格）

严重程度：中

要求：

* MUST 在生产环境把 `ALLOWED_HOSTS` 设为预期域名/主机。([Django Project][1])
* MUST NOT 在生产环境设置 `ALLOWED_HOSTS = ['*']`，除非你同时自行实现健壮的 `Host` 校验（Django 警告通配符需要自行校验以避免 CSRF 类攻击）。([Django Project][1])
* SHOULD 配置前置 Web 服务器尽早拒绝未知主机（纵深防御）。([Django Project][1])

不安全模式：

* 生产环境中 `ALLOWED_HOSTS = ['*']`（或环境变量展开为 `*`）。
* `DEBUG=False` 时 `ALLOWED_HOSTS = []`（站点无法运行，或误配置的部署尝试各种变通）。

检测提示：

* 搜索 `ALLOWED_HOSTS`。
* 检查会覆盖 `ALLOWED_HOSTS` 的平台环境设置。

修复：

* 生产环境设置 `ALLOWED_HOSTS = ['example.com', 'www.example.com', ...]`。
* 开发主机单独维护。

注意：

* Django 使用 Host 头构造 URL；伪造 Host 会导致 CSRF、缓存污染和被投毒的邮件链接（Django 安全文档专门指出这一点）。([Django Project][2])

---

### DJANGO-HTTPS-001：若使用 TLS，cookie 传输必须加固

严重程度：高（对启用鉴权的应用为严重）

注意：仅当启用了 TLS 时才强制执行，否则会破坏非 TLS 应用

如果使用 TLS：
* MUST 设置：

  * `CSRF_COOKIE_SECURE = True` ([Django Project][1])
  * `SESSION_COOKIE_SECURE = True` ([Django Project][1])
* SHOULD 考虑启用：

  * `SECURE_SSL_REDIRECT = True`（配合正确的代理配置）([Django Project][3])
  * 经 `SECURE_HSTS_SECONDS` 启用 HSTS（视情况加 includeSubDomains/preload）。([Django Project][3])

不安全模式：

* 登录页走 HTTP，或同一会话 cookie 混用 HTTP/HTTPS。
* 生产 HTTPS 下 `CSRF_COOKIE_SECURE=False` 或 `SESSION_COOKIE_SECURE=False`。
* HSTS 配置错误（可能在一段时间内搞挂站点）。

检测提示：

* 检查 `settings.py` 中的 `CSRF_COOKIE_SECURE`、`SESSION_COOKIE_SECURE`、`SECURE_SSL_REDIRECT`、`SECURE_HSTS_SECONDS`。
* 检查代理/ingress 配置的 HTTP->HTTPS 重定向行为。

修复：

* 启用 HTTPS 重定向和安全 cookie。
* 谨慎增加 HSTS（先小值、验证后再增大）。Django 警告配置错误可能在 HSTS 时效内搞挂站点。([Django Project][3])

---

### DJANGO-PROXY-001：反向代理信任必须配置正确（`SECURE_PROXY_SSL_HEADER`）

严重程度：中（处于 TLS 代理之后时）

要求：

* 若部署在终结 TLS 的反向代理之后，MUST 配置 Django 使 `request.is_secure()` 反映*外部* scheme，否则 CSRF 等逻辑会出问题。Django 文档说明此时应使用 `SECURE_PROXY_SSL_HEADER`。([Django Project][3])
* 只有在你控制该代理（或有保证）且它会剥除入站的伪造头时，MUST 才设置 `SECURE_PROXY_SSL_HEADER`。Django 明确警告配置错误会危及安全，并列出了必需条件。([Django Project][3])

不安全模式：

* 在代理不剥除用户提供的 `X-Forwarded-Proto` 的环境中设置 `SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")`。
* 设置 `SECURE_SSL_REDIRECT=True` 后出现无限重定向循环（通常说明代理的 HTTPS 判定有问题）。([Django Project][3])

检测提示：

* 搜索 `SECURE_PROXY_SSL_HEADER`、`SECURE_SSL_REDIRECT`。
* 检查 ingress/代理是否剥除 forwarded 头。

修复：

* 仅当代理会正确剥除并设置该头时（符合 Django 文档的前置条件）才设置 `SECURE_PROXY_SSL_HEADER`。([Django Project][3])

---

### DJANGO-SESS-001：生产环境中会话 cookie 必须使用安全属性

严重程度：中（仅当启用 TLS 时）

要求（生产环境、HTTPS）：

* MUST 设置 `SESSION_COOKIE_SECURE=True`（仅经 HTTPS 传输）。([Django Project][3])
* MUST 保持 `SESSION_COOKIE_HTTPONLY=True`（Django 默认为 `True`）。([Django Project][3])
* SHOULD 保持 `SESSION_COOKIE_SAMESITE='Lax'`（Django 默认为 `Lax`），除非有正当的跨站流程需要 `None`。([Django Project][3])
* SHOULD 避免设置 `SESSION_COOKIE_DOMAIN`，除非确实需要跨子域 cookie（子域级 cookie 会扩大攻击面）。

不安全模式：

* 生产 HTTPS 下 `SESSION_COOKIE_SECURE=False`。

重要提示：仅在已配置 TLS 的生产环境中才设置 `Secure`。在通过 HTTP 运行的本地开发环境中，不要给 cookie 设置 `Secure` 属性。应根据应用是否运行在生产模式来条件化处理。还应提供一个类似 `SESSION_COOKIE_SECURE` 的属性，以便在通过 HTTP 测试时能禁用 `Secure` cookie。

* `SESSION_COOKIE_HTTPONLY=False`。
* `SESSION_COOKIE_SAMESITE=None` 与 cookie 鉴权的改状态端点组合（CSRF 风险更高）。

检测提示：

* 搜索 `SESSION_COOKIE_` 设置、`response.set_cookie(..., httponly=..., secure=..., samesite=...)`。

修复：

* 在生产设置中显式配置上述项。
* 校验与鉴权流程的兼容性。([Django Project][3])

---

### DJANGO-SESS-002：CSRF cookie 设置必须审慎（HttpOnly 有权衡）

严重程度：中

要求：

* 使用 HTTPS/TLS 时 SHOULD 设置 `CSRF_COOKIE_SECURE=True`。([Django Project][3])
* SHOULD 保持 `CSRF_COOKIE_SAMESITE='Lax'`，除非有跨站需求。Django 默认为 `Lax`。([Django Project][3])
* 如果前端不需要读取 CSRF cookie，MAY 设置 `CSRF_COOKIE_HTTPONLY=True`（默认为 `False`）。启用后，JS 必须改为从 DOM 读取 CSRF token（Django 文档有说明）。([Django Project][3])

不安全模式：

* 生产 HTTPS/TLS 下 `CSRF_COOKIE_SECURE=False`。
* 设置了 `CSRF_COOKIE_HTTPONLY=True` 却仍依赖“在 JS 中读 csrftoken cookie”的模式（破坏 AJAX 的 CSRF）。
* 没有明确理由就设置 `CSRF_COOKIE_SAMESITE=None`。

检测提示：

* 搜索 `CSRF_COOKIE_` 设置。
* 在 JS 中搜索用于获取 `csrftoken` 的 `document.cookie` 用法。

修复：

* 按 Django 的描述，让 cookie 设置与你的 CSRF token 获取方式（cookie vs DOM）保持一致。([Django Project][4])

---

### DJANGO-CSRF-001：使用 cookie 鉴权的改状态请求 MUST 有 CSRF 防护

严重程度：高

要求：

* MUST 保持 `django.middleware.csrf.CsrfViewMiddleware` 启用（默认已激活）。([Django Project][4])
* MUST 在内部 POST 表单中包含 `{% csrf_token %}`；MUST NOT 在 POST 到外部 URL 的表单中包含它（Django 警告这会泄露 token）。([Django Project][4])
* MUST 保护所有依赖 cookie 鉴权的改状态端点（POST/PUT/PATCH/DELETE）。
* 对 AJAX/SPA 调用，MUST 按文档通过 `X-CSRFToken` 头（或配置的头名）发送 CSRF token。([Django Project][4])
* MUST 非常谨慎地对待 `@csrf_exempt`，只在绝对必要时使用；如果使用，MUST 用合适的替代控制替换 CSRF（例如 webhook 的请求签名）。Django 明确警告过 `csrf_exempt`。([Django Project][2])

不安全模式：

* `MIDDLEWARE` 中缺少 `CsrfViewMiddleware`。
* 通用已鉴权视图上使用 `@csrf_exempt`。
* 使用会话鉴权却没有 CSRF token 的 POST/PUT/PATCH/DELETE 端点。
* 用 GET 执行改状态操作（放大 CSRF 风险）。

检测提示：

* 检查 `settings.py` 的 `MIDDLEWARE` 中 `CsrfViewMiddleware` 及其顺序（Django 提示它应位于假定 CSRF 已处理的中间件之前）。([Django Project][4])
* 搜索 `csrf_exempt`、`csrf_protect`、`ensure_csrf_cookie`。
* 枚举非 GET 方法的 URL 模式；确认 CSRF 覆盖情况。

修复：

* 重新启用 `CsrfViewMiddleware`，为表单加 CSRF token，并补上 AJAX 头处理。
* 关于缓存装饰器：如果缓存需要 CSRF token 的视图，按 Django 文档应用 `@csrf_protect`，避免缓存不含 CSRF cookie/Vary 头的响应。([Django Project][4])

注意：

* 以 HTTPS 部署时，Django 的 CSRF 中间件还会为同源检查 Referer 头（Django 安全文档提到这一点）。([Django Project][2])

---

### DJANGO-XSS-001：防止模板与 HTML 生成中的反射型/存储型 XSS

严重程度：高

要求：

* MUST 依赖 Django 模板的自动转义（默认安全）处理 HTML 模板。Django 安全文档强调 Django 模板会转义危险字符，但也存在局限。([Django Project][2])
* MUST NOT 大范围关闭自动转义（`{% autoescape off %}`），除非内容可信或已经安全净化。([Django Project][5])
* MUST NOT 把不可信内容标记为安全：

  * 避免对用户数据使用 `mark_safe(...)`。
  * 避免对用户控制的内容使用 `|safe`。
* MUST 注意 HTML 上下文陷阱（例如未加引号的属性）；Django 明确给过一个例子：转义无法保护未加引号的属性上下文。([Django Project][2])
* SHOULD 优先使用安全的 HTML 构造辅助函数（例如 `format_html`），而不是容易漏掉转义的手工拼接。([Django Project][6])

不安全模式：

* `{% autoescape off %}{{ user_input }}{% endautoescape %}`
* `{{ user_input|safe }}`
* `mark_safe(request.GET["q"])`
* 未加引号的属性注入：`<style class={{ var }}>...`（Django 自己的例子）。([Django Project][2])

检测提示：

* 在模板中搜索 `|safe`、`autoescape off`、`safeseq`。
* 在 Python 中搜索 `mark_safe`、`SafeString`，或用请求/数据库值直接拼接 HTML。
* 审查任何返回 `HttpResponse(user_value)` 且 `user_value` 含 HTML 的代码。

修复：

* 移除不安全的标记；仅在确有必要时净化（使用基于白名单的 HTML 净化器）。
* 给属性加引号，避免把不可信值放进危险上下文。
* 增加 CSP 作为纵深防御（见 DJANGO-CSP-001）。([Django Project][2])

---

### DJANGO-TEMPLATE-001：绝不渲染不可信的模板源字符串

严重程度：高至严重（取决于上下文与暴露面）

要求：

* MUST NOT 渲染模板源字符串受不可信输入（请求、用户内容、不可信用户可编辑的数据库行）影响的模板。
* MUST 把“从字符串构造模板”的模式视为危险，即使 Django 模板比某些其他引擎更受限：它仍然能从上下文泄露数据、绕过转义、制造 XSS 或内容注入。

不安全模式：

* `Template(request.GET["tmpl"]).render(Context(...))`
* 把用户模板存入数据库，再以普通权限/上下文渲染。

检测提示：

* 搜索 `django.template.Template(`、`Engine.from_string`、`.render(Context(` 接非常量字符串的用法。
* 追查模板字符串的来源（管理后台、数据库、上传、请求）。

修复：

* 换成不执行代码的格式化方式（例如 `string.Template`、显式占位符），或严格的白名单渲染模型。
* 如果*必须*支持用户自定义模板，要做重度隔离（独立服务/租户上下文、严格白名单，并假设绕过是可能的）。

---

### DJANGO-SQL-001：防止 SQL 注入（使用 ORM 或参数化原始 SQL）

严重程度：高

要求：

* MUST 使用 Django ORM/queryset 做常规数据库访问；Django 说明 queryset 在典型用法下做了参数化、可防 SQL 注入。([Django Project][2])
* MUST 非常谨慎地对待原始 SQL；如果使用 `raw()`、`cursor.execute()`、`extra()` 或 `RawSQL`，MUST 单独传参（例如 `params=`），MUST NOT 把不可信输入以字符串插值方式拼进 SQL。Django 的原始 SQL 文档警告要用 `params` 处理用户控制的参数。([Django Project][7])
* MUST NOT 给 SQL 模板中的占位符加引号（Django 文档明确警告给 `%s` 占位符加引号会不安全）。([Django Project][8])
* SHOULD 避免使用 `extra()` 和 `RawSQL`，除非确有必要；Django 安全文档要求谨慎。([Django Project][2])

不安全模式：

* `cursor.execute(f"SELECT ... WHERE id={request.GET['id']}")`
* `Model.objects.raw("... %s" % user_input)`（字符串格式化）
* `extra(where=[f"headline='{q}'"])`
* 给占位符加引号：`WHERE othercol = '%s'`（文档明确标注为不安全）。([Django Project][8])

检测提示：

* 搜索 `.raw(`、`.extra(`、`RawSQL(`、`connection.cursor()`、`.execute(`。
* 在 Python 字符串中搜索 SQL 关键字（`SELECT`、`UPDATE`、`DELETE`、`INSERT`）。
* 追踪不可信输入是否进入这些调用点。

修复：

* 优先使用 ORM 查询。
* 原始 SQL 无法避免时，使用参数（`params`、DB-API 参数绑定），且不要给占位符加引号。([Django Project][7])

---

### DJANGO-CMD-001：防止操作系统命令注入

严重程度：严重至高（取决于暴露面）

要求：

* MUST 避免用受攻击者影响的输入执行系统命令。
* 如果必须使用 subprocess：

  * MUST 以列表形式传参（不要用 shell 字符串）。
  * MUST NOT 对受攻击者影响的内容使用 `shell=True`。
  * SHOULD 对可变部分使用严格白名单。
* SHOULD 优先用纯 Python 库，而不是调用 shell。

不安全模式：

* `os.system(request.GET["cmd"])`
* `subprocess.run(f"convert {path}", shell=True)`，其中 `path` 用户可控。

检测提示：

* 搜索 `os.system`、`subprocess`、`Popen`、`shell=True`。
* 追踪请求/数据库输入是否进入这些调用。

修复：

* 换成库 API；无法避免时，硬编码可执行文件并对参数做白名单校验。

---

### DJANGO-UPLOAD-001：文件上传必须校验、安全存储并安全提供

严重程度：高

要求：

* MUST 把所有用户上传当作不可信。Django 明确警告“Media files are uploaded by your users. They’re untrusted!”（用户上传的媒体文件不可信！）([Django Project][1])
* MUST 确保 Web 服务器绝不把用户上传解释为可执行代码（例如不允许上传的 `.php` 或 HTML 被执行/内联为活动内容）。([Django Project][1])
* MUST 执行大小限制（至少在 Web 服务器层；Django 安全文档建议在服务器层限制上传大小以防 DoS）。([Django Project][2])
* SHOULD 使用白名单和内容检查校验文件类型（不能只看扩展名）。
* SHOULD 把上传内容存在应用代码目录之外、任何静态根目录之外。
* SHOULD 考虑用独立的顶级/二级域名提供上传内容，以缩小同源影响面；Django 安全文档建议使用不同域名，并指出子域对某些防护可能不够。([Django Project][2])
* MUST 了解多形态（polyglot）上传风险：Django 记录了利用合法 PNG 头把 HTML“伪装成图片”上传的案例（且根据 Web 服务器不同可能被当作 HTML 提供）。([Django Project][2])

不安全模式：

* 以 `text/html` 内联提供上传内容，或对可能有活动内容的格式不强制下载。
* 上传白名单只看扩展名。
* 上传内容存在静态根目录或代码根目录内。

检测提示：

* 搜索 `request.FILES`、`FileField`、`ImageField`、上传表单/视图。
* 检查上传内容的服务路径和 Nginx/Apache 配置（media 处理）。
* 检查 `MEDIA_URL`、`MEDIA_ROOT` 和静态配置。

修复：

* 配置 Web 服务器把上传内容当作惰性字节提供（不执行），并对高风险类型考虑强制 `Content-Disposition: attachment`。
* 有必要时为用户内容使用独立域名。([Django Project][2])

---

### DJANGO-PATH-001：防止路径穿越与不安全的文件服务（static/media 分离）

严重程度：高

要求：

* MUST NOT 把用户输入当作读/写/服务的文件系统路径。
* MUST 保持 `MEDIA_ROOT` 与 `STATIC_ROOT` 不同；Django 设置文档明确警告二者必须取不同值以避免安全影响。([Django Project][3])
* SHOULD 优先使用以服务端标识为键的 Django storage API，而不是接受用户提供的任意相对路径。

不安全模式：

* `open(os.path.join(MEDIA_ROOT, request.GET["path"]))`
* 接受 `?file=../../...` 类参数的下载端点。
* 错误配置的 `MEDIA_ROOT == STATIC_ROOT`。

检测提示：

* 搜索配合请求值使用的 `open(`、`Path(`、`os.path.join(`。
* 检查设置中的 `MEDIA_ROOT`、`STATIC_ROOT`。([Django Project][3])

修复：

* 使用映射到已知文件的服务端 ID。
* 保持 static 与 media 分离，并确保 Web 服务器把 media 当作不可信。([Django Project][3])

---

### DJANGO-REDIRECT-001：防止开放重定向（`next`、`return_to`、`redirect`）

严重程度：中（与鉴权流程组合时为高）

要求：

* MUST 校验来自不可信输入的重定向目标（例如 `next`、`return_to`）。
* SHOULD 限制为同站相对路径或白名单主机/scheme。
* SHOULD 使用 Django 的安全 URL 辅助函数（例如 `django.utils.http.url_has_allowed_host_and_scheme`），而不是自行解析。

不安全模式：

* `return redirect(request.GET.get("next"))` 且不校验。
* 用朴素的字符串检查实现重定向白名单。

检测提示：

* 搜索 `redirect(` 并追踪目标来源。
* 搜索名为 `next`、`return_to`、`redirect`、`url` 的参数。

修复：

* 用白名单校验，失败时默认跳转到安全的内部路径。
* 确保经由 `ALLOWED_HOSTS` 的主机校验保持严格（见 DJANGO-HOST-001）。([Django Project][3])

---

### DJANGO-HEADERS-001：启用必要的安全响应头（SecurityMiddleware + 点击劫持防护）

严重程度：中至高

要求：

* SHOULD 使用 `django.middleware.security.SecurityMiddleware` 并在生产环境恰当配置：

  * `X-Content-Type-Options: nosniff`（Django 设置 `SECURE_CONTENT_TYPE_NOSNIFF`，默认 `True`）。([Django Project][3])
  * `Referrer-Policy`（Django 设置 `SECURE_REFERRER_POLICY`，默认 `'same-origin'`）。([Django Project][3])
  * COOP（Django 设置 `SECURE_CROSS_ORIGIN_OPENER_POLICY`，默认 `'same-origin'`）。([Django Project][3])
  * 视情况启用 HTTPS 重定向和 HSTS（见 DJANGO-HTTPS-001）。([Django Project][3])
* SHOULD 通过 X-Frame-Options 中间件启用点击劫持防护；Django 安全文档强烈建议不需要第三方嵌帧的站点启用它。([Django Project][2])

不安全模式：

* 缺少 SecurityMiddleware。
* 缺少点击劫持防护（或全局禁用）且没有明确的嵌帧需求。
* 对敏感端点放行过宽的嵌帧。

检测提示：

* 检查 `MIDDLEWARE` 中的 SecurityMiddleware 和 XFrameOptionsMiddleware。
* 搜索按视图禁用嵌帧/CSRF 防护的代码。

修复：

* 增加/启用中间件并有意识地配置相关设置。([Django Project][3])

注意：

* 部分响应头可能在边缘设置（CDN/反向代理）。若应用代码中不可见，标记为“需在边缘核实”。

---

### DJANGO-CSP-001：部署内容安全策略（CSP）作为纵深防御

严重程度：中（对渲染不可信内容的应用为高） 

注意：最重要的是设置 CSP 的 script-src。其他指令重要性较低，为便于开发通常可以省略。

要求：

* SHOULD 部署 CSP 以缓解 XSS 和内容注入类问题；Django 安全文档推荐 CSP，并指出它是 Django 6.0 的新特性。([Django Project][2])
* MUST 理解 CSP 的局限：

  * 避免把某些路由排除在 CSP 覆盖之外；Django 警告由于同源策略，一个未受保护的页面可能削弱受保护页面的防护。([Django Project][2])
* MAY 先用 `SECURE_CSP_REPORT_ONLY` 安全地迭代（Django 提供 report-only 支持）。([Django Project][3])

不安全模式：

* 渲染用户控制内容的应用没有 CSP。
* CSP 只排除“个别几个页面”（削弱整体防护），尤其是有任何注入面的页面。([Django Project][2])
* CSP 使用过宽的指令（例如大范围 `unsafe-inline`）且无正当理由。

检测提示：

* 搜索 `SECURE_CSP`、`SECURE_CSP_REPORT_ONLY` 和 CSP 中间件配置。
* 检查反向代理/CDN 配置中的 CSP 头。

修复：

* 实现一个现实的 CSP，理想路径是先 report-only 再强制。([Django Project][3])

---

### DJANGO-AUTH-001：密码存储必须使用 Django 的安全哈希器；密码策略必须配置

严重程度：高

要求：

* MUST 使用 Django 内建的密码哈希（绝不存明文或可逆加密的密码）。
* SHOULD 优先使用现代哈希器并保持默认值更新；Django 文档说明了 `PASSWORD_HASHERS` 并包含现代选项（Argon2、bcrypt、scrypt、PBKDF2 变体）。([Django Project][3])
* SHOULD 配置 `AUTH_PASSWORD_VALIDATORS`（默认为空）作为生产密码策略。([Django Project][3])

不安全模式：

* 自行实现密码存储或哈希。
* 明文密码存在数据库字段里。
* 面向消费者的应用没有任何密码校验。

检测提示：

* 搜索 `.set_password(` 的使用与手工哈希的对比。
* 检查设置中的 `PASSWORD_HASHERS` 和 `AUTH_PASSWORD_VALIDATORS`。([Django Project][3])

修复：

* 使用 Django auth 用户模型 API。
* 按产品风险状况启用合适的密码校验器。([Django Project][3])

---

### DJANGO-AUTHZ-001：授权必须显式且一致

严重程度：高

要求：

* MUST 对每个特权操作（查看、修改、类管理操作）执行授权检查。
* MUST NOT 只依赖 UI 层限制（例如隐藏按钮）而没有服务端权限检查。
* SHOULD 在适用场景使用 Django 的 permissions/groups 和逐对象授权模式。

不安全模式：

* 假设“用户已登录”就等于“用户可以执行该操作”的视图。
* 更新/删除端点缺少授权检查。

检测提示：

* 枚举改变状态的视图；确认它们校验所有权/权限。
* 查找只检查 `is_authenticated` 或只检查 `is_staff` 而不做对象级访问检查的代码。

修复：

* 增加显式权限检查，并为未授权访问补充测试。

---

### DJANGO-ADMIN-001：Django admin 必须当作高价值目标对待

严重程度：高

要求：

* MUST 确保 admin 受强鉴权和仅 HTTPS 传输保护（见 DJANGO-HTTPS-001）。([Django Project][1])
* SHOULD 尽可能限制 admin 的暴露面（网络白名单、VPN、SSO 或额外的鉴权控制）。
* SHOULD 审计已安装的 admin 扩展和第三方应用的 XSS/CSRF 暴露。

不安全模式：

* admin 以弱鉴权暴露到公网。
* admin 通过 HTTP 提供。

检测提示：

* 在 `urlpatterns` 中搜索 `admin.site.urls`。
* 检查部署配置中的 IP 白名单或鉴权网关。

修复：

* 增加网络控制并强制 HTTPS。

---

### DJANGO-LOG-001：日志与错误报告不得泄露机密

严重程度：中至高

要求：

* MUST NOT 记录机密（包括 `SECRET_KEY`、会话 cookie、鉴权头、密码重置 token）。
* MUST 有意识地配置生产日志；Django 的部署检查清单明确要求上线前检查日志配置。([Django Project][1])
* MUST 确保生产环境 `DEBUG=False`，避免异常带着敏感上下文渲染。([Django Project][1])

不安全模式：

* 生产环境记录完整请求头或 cookie。
* 打印 settings 字典。
* 调试错误页。

检测提示：

* 检查 `LOGGING` 配置；搜索记录请求头/cookie 的中间件。
* 搜索 `print(settings` / `logging.info(request.META)` 模式。

修复：

* 脱敏敏感值；记录 ID 而非机密。
* 使用结构化日志和安全的错误监控工具。([Django Project][1])

---

### DJANGO-SUPPLY-001：依赖与补丁卫生（Django + 安全关键依赖）

严重程度：中（存在已知漏洞版本时为高）

要求：

* SHOULD 固定版本并定期更新 Django 和安全关键依赖。
* MUST 及时响应 Django 安全版本。

检测提示：

* 检查 `requirements.txt`、lockfile、构建镜像。
* 确认 Django 版本；与最新支持版本对比（Django 下载页会发布当前稳定版和受支持分支）。([Django Project][9])

修复：

* 升级到已修复版本；为既往漏洞类别补充回归测试。

---

## 5) 实用扫描启发式（如何“挖”）

主动扫描时，使用这些高信号模式：

* 部署/开发服务器：

  * `manage.py runserver`、`runserver 0.0.0.0`、`--insecure` ([Django Project][1])
* 调试 / 设置：

  * `DEBUG = True` ([Django Project][1])
  * `SECRET_KEY =`、`SECRET_KEY_FALLBACKS` ([Django Project][1])
* Host 校验：

  * `ALLOWED_HOSTS = ['*']` ([Django Project][3])
* HTTPS 与代理：

  * `SECURE_SSL_REDIRECT`、`SECURE_HSTS_SECONDS`、`SECURE_PROXY_SSL_HEADER` ([Django Project][3])
* Cookie / 会话：

  * `SESSION_COOKIE_SECURE`、`SESSION_COOKIE_HTTPONLY`、`SESSION_COOKIE_SAMESITE` ([Django Project][3])
  * `CSRF_COOKIE_SECURE`、`CSRF_COOKIE_HTTPONLY`、`CSRF_COOKIE_SAMESITE` ([Django Project][3])
* CSRF 绕过：

  * `csrf_exempt`、缺少 `CsrfViewMiddleware`、没有 `{% csrf_token %}` 的 POST 表单 ([Django Project][4])
* XSS：

  * `|safe`、`autoescape off`、`mark_safe(`、HTML 字符串拼接 ([Django Project][5])
* SQL 注入：

  * `.raw(`、`.extra(`、`RawSQL(`、`cursor.execute(` 配格式化的 SQL 字符串 ([Django Project][7])
* 用户上传 / media：

  * `request.FILES`、`MEDIA_ROOT`、`MEDIA_URL`、内联提供 media；`MEDIA_ROOT == STATIC_ROOT` ([Django Project][1])
* 重定向：

  * `redirect(request.GET.get("next"))` 模式；缺少白名单校验
* 安全响应头与 CSP：

  * 缺少 `SecurityMiddleware`、缺少 X-Frame-Options 防护、未采用 `SECURE_CSP`（在适用场景）([Django Project][2])

始终尝试确认：

* 数据来源（不可信 vs 可信）
* 汇点类型（模板/SQL/subprocess/文件/重定向/http）
* 已有的防护措施（中间件、校验、白名单、授权检查）
* 安全响应头/控制在应用内还是边缘设置

---

## 6) 参考资料（访问于 2026-01-27）

Django 主要文档：

```text
- Django Downloads (current stable & supported branches): https://www.djangoproject.com/download/
- Django 6.0 Release Notes: https://docs.djangoproject.com/en/6.0/releases/6.0/
- Django: Deployment checklist (incl. check --deploy, runserver warning, HTTPS/cookies guidance): https://docs.djangoproject.com/en/6.0/howto/deployment/checklist/
- Django: Settings reference (SecurityMiddleware settings, cookies, SECRET_KEY_FALLBACKS, CSP settings): https://docs.djangoproject.com/en/6.0/ref/settings/
- Django: Security in Django (XSS/CSRF/SQLi/clickjacking/HTTPS/host header validation/uploads/CSP): https://docs.djangoproject.com/en/6.0/topics/security/
- Django: CSRF how-to (middleware, csrf_token usage, AJAX header patterns, csrf_exempt cautions): https://docs.djangoproject.com/en/6.0/howto/csrf/
- Django: Performing raw SQL queries (parameterization guidance): https://docs.djangoproject.com/en/6.0/topics/db/sql/
- Django: QuerySet API reference (extra() cautions; “do not quote placeholders” guidance): https://docs.djangoproject.com/en/6.0/ref/models/querysets/
- Django: Template built-ins (autoescape tag): https://docs.djangoproject.com/en/6.0/ref/templates/builtins/
- Django: Template language reference (turning off autoescape & risks): https://docs.djangoproject.com/en/6.0/ref/templates/language/
- Django: Utilities reference (e.g., format_html): https://docs.djangoproject.com/en/6.0/ref/utils/
```

OWASP:

```text
- OWASP Cheat Sheet Series: Django Security Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/Django_Security_Cheat_Sheet.html
```

[1]: https://docs.djangoproject.com/en/6.0/howto/deployment/checklist/ "https://docs.djangoproject.com/en/6.0/howto/deployment/checklist/"
[2]: https://docs.djangoproject.com/en/6.0/topics/security/ "Security in Django | Django documentation | Django"
[3]: https://docs.djangoproject.com/en/6.0/ref/settings/ "Settings | Django documentation | Django"
[4]: https://docs.djangoproject.com/en/6.0/howto/csrf/ "How to use Django’s CSRF protection | Django documentation | Django"
[5]: https://docs.djangoproject.com/en/6.0/ref/templates/builtins/ "https://docs.djangoproject.com/en/6.0/ref/templates/builtins/"
[6]: https://docs.djangoproject.com/en/6.0/ref/utils/ "https://docs.djangoproject.com/en/6.0/ref/utils/"
[7]: https://docs.djangoproject.com/en/6.0/topics/db/sql/ "https://docs.djangoproject.com/en/6.0/topics/db/sql/"
[8]: https://docs.djangoproject.com/en/6.0/ref/models/querysets/ "https://docs.djangoproject.com/en/6.0/ref/models/querysets/"
[9]: https://www.djangoproject.com/download/ "Download Django | Django"
