---
name: canvas-cookie-bridge
description: 用本机只读 cookie 桥让 Canvas MCP 在学校禁用学生 token 时照常可用，读课程、作业与截止时间、成绩、待办，并配合 canvas-* 学生向 skills 做周计划与截止提醒
---

# Canvas Cookie 桥

很多学校（SLCC 等）在权限层关掉了「学生自助生成 API token」：Canvas 设置页里按钮还在，
点下去前端发出的 `POST /api/v1/users/self/tokens` 却返回 403。结果所有 token 型 Canvas MCP 全部失效。

本技能描述的是**已经落地在 Windows 本机的替代链路**：跑一个只读小服务，把浏览器的 Canvas 登录 cookie
注入给 `canvas-mcp`，从而保住 Canvas MCP 的全部读类能力，以及配套学生向 skills 的工作流。

## 什么时候用它

- 要让 Agent 读你的 Canvas：课程、作业与截止时间、提交状态、成绩、公告、待办、日历。
- 已配好 canvas MCP，但报 401 / `Invalid access token`，或学校设置页里建 token 被拒。
- cookie 过期、桥没在跑、Agent 里看不到 canvas 工具，需要按「排障」处理。

**不适用**：交作业、发消息、改页面这类写操作。桥只放行 `GET`/`HEAD`，写请求明确被拒（有意为之）。

## 链路与部署位置

```
Agent（Hermes / OpenCode / Claude Code）
   │  MCP stdio：canvas-mcp-server --role student
   ▼
canvas-mcp  ──HTTP──►  127.0.0.1:8901（cookie 桥，只读）
                          │  丢掉假 Bearer，换成浏览器 session cookie
                          ▼
                   https://<学校>.instructure.com/api/v1
```

| 环节 | 位置 | 说明 |
| --- | --- | --- |
| cookie 桥 | `B:\Program Files\CanvasCookieBridge\` | `bridge.py`（纯标准库，无第三方依赖）、`grab-cookie.mjs`、`refresh-cookie.cmd`、`selftest.cmd`、`start-bridge.cmd` |
| cookie 与日志 | `B:\ProgramData\CanvasCookieBridge\` | `cookie.json`（凭据）、`bridge.log`（5MB 轮转） |
| 开机自启 | `HKCU\Software\Microsoft\Windows\CurrentVersion\Run` 的 `CanvasCookieBridge` | 用 `pythonw.exe` 常驻，无窗口 |
| MCP 服务 | `B:\Program Files\CanvasMCP\.venv\Scripts\canvas-mcp-server.exe` | 以 `--role student` 运行（约 51 个工具） |
| MCP 配置源 | CC Switch 库 `mcp_servers` 表，id `canvas` | 不要手改下游 config.yaml，会被同步覆盖 |

## 开工前的两个检查

先跑技能内附的脚本（PowerShell 7 / Windows PowerShell 都可以）：

```powershell
# 在技能目录下运行
pwsh -File .\scripts\check-bridge.ps1
```

它会打印桥状态、上游状态码、登录身份和 cookie 龄，并按情况给出动作。等价的手工检查：

```powershell
Invoke-RestMethod http://127.0.0.1:8901/bridge-health | Format-List
```

期望 `ok : True`、`authenticated_as` 是你的名字。另可双击 `selftest.cmd`（多带一段日志尾巴）。

**cookie 龄超过约 14 天就提前刷一次**，别等它返回 401 再处理。

## 配合 Canvas MCP 怎么用

工具前缀 `mcp__canvas__*`。日常真正用得上的：

| 想看什么 | 工具 | 备注 |
| --- | --- | --- |
| 我有哪些课 | `list_courses` | 需要历史课程时加 `include_concluded` |
| 接下来要交什么 | `get_my_upcoming_assignments` | `days` 控制前瞻天数，含提交状态 |
| 混合日历（事件 + 截止） | `list_calendar_events` | `days` / `start_date` / `event_type` |
| 待办列表 | `get_my_todo_items` | 对应 Canvas 首页的 To Do |
| 某门课的作业清单 | `list_assignments` | `course_identifier` 传课程代码或 Canvas ID；核对截止时间用 `raw_dates` |
| 某门课每项作业的得分与状态 | `get_my_assignment_scores` | 分作业组显示，含 missing / late / ungraded |
| 各课当前成绩 | `get_my_course_grades` | 未批改时百分比会接近 0，字母等级别当结论 |
| 课程大纲 | `get_syllabus` | 评分政策、权重、期末说明都在这里 |
| 模块与条目 | `list_modules` | 加 `include_items` 一次拿到结构 |
| 课程文件 | `list_course_files` | 配 `search_term` 找具体文件 |
| 还不确定用哪个工具 | `search_canvas_tools` | 按关键词搜工具名与签名 |

课程代码形如 `CS-1030-003-Fall 2026`，`course_identifier` 用代码或 Canvas ID 都行。
直接说人话即可：「看看我这周有什么要交的」「我 CS-1030 现在多少分」「把这门课的模块列出来」。

## 和其他 skills 怎么搭

- `canvas-week-plan`：**学生向、纯读，直接可用**——它调 `get_my_upcoming_assignments` 与
  `get_my_course_grades` 产出本周计划，是本技能最自然的搭档。
- `canvas-morning-check`、`canvas-discussion-facilitator`、`canvas-course-qc`、`canvas-bulk-grading`、
  `canvas-peer-review-manager`、`canvas-course-builder`、`canvas-accessibility-auditor`：
  **教师向**，依赖 educator 档工具或写操作，在当前配置下会失败（工具不存在，或被桥 403）。
  要跑通需要把 MCP 改成 `--role educator` 并放开桥的只读白名单——那与本方案「学生账号 + 只读」的定位冲突，不建议。
- `wiki-*` / `obsidian-*`：把课程结构与截止时间沉淀进笔记库（如「学业」领域），
  落库前按笔记库规则交用户确认；本技能只负责取数。
- `handoff`：换机器或学期交接时，把桥的重建要点一并交接出去。

## cookie 刷新

cookie 是**会话级**的，几周内过期。触发条件：桥返回 401、健康检查 `message` 里出现「会话已过期」。

```powershell
# 方式一：双击
B:\Program Files\CanvasCookieBridge\refresh-cookie.cmd
```

```powershell
# 方式二：命令行等价（在桥程序目录下运行）
node "B:\Program Files\CanvasCookieBridge\grab-cookie.mjs" "B:\ProgramData\CanvasCookieBridge\cookie.json"
```

两个前提：

1. 日常 Edge 处于 Canvas 已登录状态（cookie 从浏览器取，不从别处来）。
2. Edge 开着调试端口。端口写在 `%LOCALAPPDATA%\Microsoft\Edge\User Data\DevToolsActivePort`；
   文件不存在说明没开，需要走浏览器接管授权流程（本机对应技能为 `edge-live-session-attach`，需用户明确授权后使用）。

刷新脚本**先验证再覆盖**：拿新 cookie 打一次 `/api/v1/users/self`，返回 200 才写盘，
因此失败不会毁掉旧 cookie。刷新后桥无需重启——它按文件 mtime 自动换用新 cookie。

## 排障

| 症状 | 原因 | 动作 |
| --- | --- | --- |
| MCP 报 401 / `Invalid access token` | cookie 过期 | 刷新 cookie |
| 桥返回 401，message 提到会话过期 | 同上 | 刷新 cookie |
| 桥返回 503「未找到 cookie 文件」 | 从没取过 cookie | 走一次刷新流程 |
| 健康检查连不上、端口无监听 | 桥没在跑 | 双击 `start-bridge.cmd`；确认 HKCU Run 里有 `CanvasCookieBridge` |
| 工具调用返回 403「cookie 桥是只读的」 | 调了写类工具 | 预期行为，改在 Canvas 网页里做 |
| Agent 里根本没有 canvas 工具 | Agent 未重启或未收到配置 | 重启该 Agent；确认 CC Switch 里该条已勾选对应平台 |
| `canvas-mcp-server --test` 报 401 但桥是好的 | MCP 没读到位配置 | 核对该 MCP 条目的 `CANVAS_API_URL` / `CANVAS_ALLOW_INSECURE_HTTP` |
| 取 cookie 报没找到 instructure cookie | Edge 里 Canvas 未登录 | 先登录 Canvas，再刷新 |
| 取 cookie 报调试端口相关错误 | Edge 没开调试端口 | 走浏览器接管授权流程 |
| 附件/文件下载失败 | cookie 会话缺 `verifier` 参数 | 已知限制，文件在浏览器里下载 |

## 边界与政策

- **只读**：桥只放行 `GET`/`HEAD`，其余一律 403；日志只记方法、路径、状态码、耗时，不记 cookie。
- **只在本机**：监听 `127.0.0.1:8901`，局域网与公网都访问不到。
- **凭据纪律**：`cookie.json` 是明文会话凭据，等同于浏览器登录态。不要贴进对话、日志，也不要提交进任何仓库。
- **政策**：这条路绕过了学校「不给学生发 token」的限制。用的是你自己的账号、只读你自己的数据、不改动任何东西，
  但学校未必认同。建议同时向学校 eLearning 支持申请正式 token；拿到后把 MCP 的 `CANVAS_API_URL` 换回官方地址、
  删掉自启键即可退役，本技能的读类用法不受影响。

## 在新机器上重建

1. **装 MCP**：克隆 `https://github.com/vishalsachdev/canvas-mcp`（MIT），用 uv 管理的 CPython 建 venv 后
   `pip install -e .`，入口是 `.venv\Scripts\canvas-mcp-server.exe`。
2. **部署桥**：把 `B:\Program Files\CanvasCookieBridge\` 整个目录复制过去（`bridge.py` 无第三方依赖），
   在 `HKCU\Software\Microsoft\Windows\CurrentVersion\Run` 加一项，指向
   `<pythonw.exe 绝对路径> "<桥目录>\bridge.py"`（两段路径都要带引号）。
3. **取 cookie**：运行 `grab-cookie.mjs`（Node 22+，用内置 WebSocket 直连 Edge 的 CDP）。
4. **接 MCP**：在该 MCP 条目的环境变量里设

   ```
   CANVAS_API_URL=http://127.0.0.1:8901/api/v1
   CANVAS_ALLOW_INSECURE_HTTP=true
   CANVAS_API_TOKEN=<任意非空占位串>
   TIMEZONE=<IANA 时区，如 America/Denver>
   ```

   `CANVAS_ALLOW_INSECURE_HTTP` 是 canvas-mcp 自带的开关，专为 loopback 明文放行；
   换成非本机地址时会直接启动失败，那是它的保护，不要绕。
5. **验证**：`canvas-mcp-server.exe --test` 应打印 `✓ API connection successful! Authenticated as: <你>`。

自己重写桥时**别漏这四条**：剥掉 Canvas 的 XSSI 前缀 `while(1);`；把分页 `Link` 头里的上游域名
改写成桥自身地址（否则翻页会绕过桥直连 Canvas 而 401）；把「302 跳登录页」识别成会话过期并返回明确 401；
日志绝不落 cookie。
