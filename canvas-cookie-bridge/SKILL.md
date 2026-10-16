---
name: canvas-cookie-bridge
description: 用本机 cookie 桥让 canvas-cli 或任何 Bearer 型 Canvas 客户端在学校禁用学生 token 时照常可用，转发全部方法并注入 CSRF，读课程作业成绩、实测写操作、管理 cookie 生命周期
---

# Canvas Cookie 桥

很多学校（SLCC 等）在权限层关掉了「学生自助生成 API token」：Canvas 设置页里按钮还在，
点下去前端发出的 `POST /api/v1/users/self/tokens` 却返回 403；OAuth developer key 又只由
管理员签发。结果所有 token 型 Canvas 客户端（canvas-cli、canvas-mcp 等）全部失效。

本技能提供一个本机小桥：把浏览器的 Canvas 登录 cookie 注入给这些客户端，保住 API 能力。
**浏览器网页本身就是用这个 cookie 工作的**，所以这不是破解——只是把已有的网页会话
转接给命令行客户端用。

## 链路

```
canvas-cli / 任何 Bearer 型客户端
   │  HTTP（Bearer 会被丢弃，值随意）
   ▼
127.0.0.1:8902（本桥，纯标准库，无第三方依赖）
   │  换成 Cookie: canvas_session + _csrf_token
   │  写方法（POST/PUT/PATCH/DELETE）额外注入 X-CSRF-Token + X-Requested-With + Referer
   ▼
https://<学校>.instructure.com/api/v1
```

## 什么时候用它

- 要用 canvas-cli / Canvas MCP 读你的 Canvas：课程、作业与截止时间、提交状态、成绩、
  公告、讨论、待办、日历、文件元数据。
- 客户端报 401 / `Invalid access token`，或学校设置页里建 token 被拒（403）。
- cookie 过期、桥没在跑，需要按「日常运维」处理。

**能力边界**（详见下文）：读操作全通；写操作按浏览器同款方式带上 CSRF 转发，
学校收不收由上游定，桥不伪造结果；文件下载走 Canvas 返回的签名 URL，客户端直连、不经桥；
管理员功能（SIS、报表、冒充用户）不可能——会话身份就是学生。

## 快速部署

技能自带完整实现，在 `scripts/` 下（`.py`/`.mjs`/`.cmd`，全部按相对路径定位，
复制到哪里都能跑）：

| 文件 | 作用 |
| --- | --- |
| `scripts/bridge.py` | 桥本体。Python 3.10+ 标准库，建议 `pythonw.exe` 无窗口常驻 |
| `scripts/grab-cookie.mjs` | 经 CDP `Storage.getCookies` 取 cookie 并自验，Node 22+ |
| `scripts/selftest.py` / `.cmd` | 健康检查 + 真实认证请求 |
| `scripts/start-bridge.cmd` | 没在跑就启动（解释器：`CANVAS_BRIDGE_PYW` 环境变量 → PATH 里的 `pythonw`） |
| `scripts/refresh-cookie.cmd` | 重新取 cookie |

三步：

1. **起桥**：`scripts\start-bridge.cmd`。监听 `127.0.0.1:8902`，只转发到配置的学校域名。
2. **取 cookie**：让日常浏览器带调试端口重启，登录 Canvas，然后
   `scripts\refresh-cookie.cmd`：
   ```powershell
   & "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" `
     --remote-debugging-port=10273 --profile-directory=Default
   ```
   新版 Edge/Chrome 出于安全**禁止默认 profile 无参开调试**：如果脚本报 CDP 超时或
   `/json/version` 404，说明当前浏览器不是这样启动的，带参重启即可（会话可恢复）。
   脚本失败时会打印具体的判断依据。
3. **客户端指向桥**。canvas-cli 示例（token 值随意，桥会丢弃）：
   ```powershell
   canvas config add slcc --url http://127.0.0.1:8902
   canvas auth token set slcc --token local-bridge-not-used
   canvas courses list
   ```

任何发 `Authorization: Bearer` 的 HTTP 客户端都能接；MCP 型客户端把 API URL 指到桥即可。

## canvas-cli 常用命令（读课程/作业/成绩）

canvas-cli v1.15.3 命令面很大（见文末一行），下面只列本机最常用的读命令。
`canvas config add` 指向桥之后直接用，不需要 `auth login`。

| 目的 | 命令 | 核对状态 |
| --- | --- | --- |
| 列出我的课程 | `canvas courses list` | README 已核对 |
| 看单个课程 | `canvas courses get <id>` | 子命令名已核对，参数见 `--help` |
| 某课程作业清单 | `canvas assignments list --course-id <course-id>` | README 已核对（含 `--course-id`） |
| 单个作业详情 | `canvas assignments get` | 子命令名已核对，flag 见 `--help` |
| 查提交 | `canvas submissions get` | 子命令名已核对，flag 见 `--help` |
| 成绩 | `canvas grades history`、`canvas grades feed` | 子命令名已核对，参数见 `--help` |

补充说明：

- `submissions` 组还有 `list`、`grade`、`bulk-grade`、`comments`；`grades` 组还有 `columns`。
  `grade` / `bulk-grade` 是教师侧，学生会话走桥也不会成功。
- 输出格式默认 table，可在配置 `default_output_format` 改成 `json` / `yaml` / `csv`
  （README 只给了这个配置项名，命令行 flag 名以 `canvas <group> --help` 为准）。
- 上游 skill 用 `--dry-run` 预览写操作；不确定某命令会改什么时先加它。

### 写操作护栏：`canvas agent guard`

Agent 可能发出 `courses delete`、`sections crosslist`、`enrollments conclude` 这类不可逆命令。
`canvas agent guard` 生成权限规则与 PreToolUse 钩子，硬拦不可逆操作、对写操作要求确认。
**要动写操作前先装上**：

```powershell
# 只看会生成什么，不落盘
canvas agent guard --host opencode
# 写入当前项目（配置 + 钩子脚本）
canvas agent guard --host opencode --write
# 最严：create/update/grade 也一并要求确认
canvas agent guard --host opencode --all-writes --write
```

`--host` 支持 `claude-code`、`codex`、`opencode`；升级 canvas 后重新生成以覆盖新命令。

## 与 canvas-cli 官方 skill 的关系

如果同时安装了 canvas-cli 上游自带的用法 skill（`npx skills add jjuanrivvera/canvas-cli`
或 `canvas skills install` 装的那份），注意其中 OAuth / `canvas auth login` 的认证指引
在「禁学生 token」的学校**走不通**：auth login 需要管理员签发的 developer key，必然失败。
两个 skill 同时在场时，**认证一律以本 skill 为准**：

- 实例接入：`canvas config add <名> --url http://127.0.0.1:8902` + 占位 token，不要跑 auth login。
- 出现 401：不是重新 login，而是 `refresh-cookie.cmd` 刷 cookie。
- 命令用法（courses/assignments/... 的参数与组合）仍以上游 skill 为准，两者不冲突。

## 日常运维

| 症状 | 处理 |
| --- | --- |
| 401，或 selftest 报 cookie 过期 | `refresh-cookie.cmd`（cookie 是会话级，数周内需重取） |
| 桥不在监听 | `start-bridge.cmd` |
| 其他异常 | `selftest.cmd`，然后看日志 |

日志在数据目录 `bridge.log`（5MB 轮转），**只记**方法/路径/状态码/字节数/耗时，
永不记 header、cookie 或请求体。

## 开机自启

注册 `HKCU\Software\Microsoft\Windows\CurrentVersion\Run`（或任务计划）：

```powershell
Set-ItemProperty -Path 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Run' `
  -Name 'CanvasCookieBridge' `
  -Value '"C:\path\to\pythonw.exe" "C:\path\to\scripts\bridge.py"'
```

卸载时删除该注册值、停进程、删目录即可，桥不装服务、不写全局环境变量。

## 换学校 / 换端口

改 `bridge.py` 顶部常量（`UPSTREAM_HOST`、可选 `LISTEN_PORT`）和
`grab-cookie.mjs` 的 `CANVAS_HOST`，没有其他学校相关配置。测试时也可用环境变量
`CANVAS_BRIDGE_UPSTREAM` / `CANVAS_BRIDGE_PORT` / `CANVAS_BRIDGE_INSECURE=1`（仅测试）
覆盖，不动代码。

## 安全边界

- 只绑 `127.0.0.1`，不监听局域网。
- `cookie.json` 是**活会话凭据**，等价于你的 Canvas 登录态：数据目录 ACL 应收紧到本人 +
  管理员；不要提交进任何仓库。
- 这是兼容性垫片，不是官方集成。学校哪天发了正式 token，删掉这套、直接用官方凭据。

## 本机部署现状（参考）

| 环节 | 位置 |
| --- | --- |
| 桥程序 | `B:\Program Files\CanvasCLI-Bridge\`（与 `scripts/` 同源） |
| cookie 与日志 | `B:\ProgramData\CanvasCLI-Bridge\` |
| 自启 | `HKCU\...\Run` 的 `CanvasCookieBridge`（uv 管理的 pythonw 3.11） |
| 客户端 | canvas-cli v1.15.3（`B:\Program Files\canvas-cli\`，PATH 已加） |

写操作是否被学校接受**尚未用真 cookie 实测**（取 cookie 需重启日常浏览器）；
bridge 对 canvas-cli 的方法透传、CSRF 注入、Bearer 剥除、分页跟随已用 mock 上游验证通过。

命令面以 `canvas --help` 与本机 `B:\Program Files\canvas-cli\README.md` 为准：canvas-cli 共
93 个命令组 / 540+ 命令（README 记 v1.15.3），本文只摘最常用的几条，不要全量枚举。
