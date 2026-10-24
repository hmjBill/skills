---
name: hermes-pi-bridge
description: 让 Hermes 通过 Pi 原生 RPC 调度 Coding Agent：前台或后台执行编码任务、回传结果与工具轨迹，含会话续用、超时中止与错误判定
---

# Hermes ⇄ Pi 桥接

用 Pi 自己的 RPC 协议把编码任务交给 Pi 跑，Hermes 负责下发任务、汇报结果。
不改 Pi 源码、不装 Pi 插件、不做常驻服务——一个 Skill 目录加一个零依赖 Node 脚本即可。

## 什么时候用

- 需要 Pi 的 Lens / Todo / 代码编辑与测试能力，但不希望在 Hermes 里重新实现一遍。
- 需要长任务（几分钟以上的重构、跑测试、修 bug）且 Hermes 终端命令有超时。
- 需要把某个项目的编码会话**续下去**，而不是每次从零开始。

## 前置条件

| 依赖 | 检查方式 | 说明 |
|------|---------|------|
| Node.js 18+ | `node --version` | 适配器只用内置模块，无第三方依赖 |
| Pi CLI | `pi --version` | 需在 PATH 中；不在时用 `--pi <命令>` 指定 |
| 可用模型的凭据 | `pi auth check --model <provider/model> --json` | 返回 `ready` 才算可用 |

一条命令全查：

```powershell
node scripts/pi-rpc.mjs doctor
```

**凭据检查会骗人**：某个 provider 配了 key 但 key 是占位符时，`auth check` 仍返回 `ready`，
真正调用会 401。所以第一次跑真实任务后要确认 `result` 有内容，不能只看 `ok`。

## 两种执行模式

### 前台（短任务，结果当场要）

```powershell
node scripts/pi-rpc.mjs run "D:\Projects\Demo" "分析项目结构，不要修改任何文件"
```

阻塞到 Pi 跑完，stdout 输出 JSON 结果。适合几十秒内能完的只读分析。

### 后台（长任务，推荐）

Hermes 终端命令有默认超时，长任务用前台模式会被打断。后台模式立即返回 `taskId`，
之后随时轮询：

```powershell
node scripts/pi-rpc.mjs start "D:\Projects\Demo" "实现登录接口并补测试"
# → { "taskId": "t-xxxx", "status": "started" }

node scripts/pi-rpc.mjs status t-xxxx    # 轮询：state / status / toolCount
node scripts/pi-rpc.mjs result t-xxxx    # 完成后取完整结果
node scripts/pi-rpc.mjs stop   t-xxxx    # 中途终止
node scripts/pi-rpc.mjs list             # 列出所有后台任务
```

轮询间隔建议 15–30 秒。`status` 只给摘要，`result` 给完整 JSON。

## 常用参数

| 参数 | 作用 |
|------|------|
| `--timeout <秒>` | 任务超时，默认 1800；超时后自动 abort Pi |
| `--model <provider/model>` | 指定模型，绕开默认模型（默认模型可能是未配置的 provider） |
| `--fresh` | 另起一个全新会话，不继承上一次的上下文 |
| `--session-id <id>` | 指定会话 id（要续某个手工开的 pi 会话时用） |
| `--with-file <路径>` | 把文件内容并入提示词，可重复 |
| `--prompt-file <路径>` | 从文件读提示词 |
| `--ui-policy deny\|allow` | 扩展弹出对话框时如何作答，默认 `deny` |
| `--approve` | 信任项目本地文件（Pi 的 `--approve`），默认不信任 |
| `--raw` | 只打印最终回复文本，不打印 JSON |
| `--pi <命令>` | 指定 Pi 可执行文件 |

## 会话怎么续

桥接为每个项目目录维护一个自己的 session id，落在状态目录里（默认
`%LOCALAPPDATA%\pi-bridge`，可用环境变量 `PI_BRIDGE_HOME` 改）。

- **默认**：复用该项目的上一个会话 → 上次的上下文还在。
- **`--fresh`**：生成新 id，Pi 新建会话文件 → 干净上下文；之后的普通调用接着这个新会话。
- **`--session-id <id>`**：显式指定，接手工开的 pi 会话。

桥接始终显式传 session id，不依赖 Pi 的默认行为——Pi 默认会续用该目录**最近**的会话，
包括你手工 `pi` 开的那一个，容易串上下文。

## 结果怎么读

stdout 是一个 JSON 对象：

| 字段 | 含义 |
|------|------|
| `ok` | 是否成功。**Provider 报错、空回复都算失败**，不会是 `true` |
| `status` | `settled` 正常结束 / `handled` 被扩展直接处理 / `timeout` 超时 / `aborted` 被中止 / `failed` 出错 |
| `result` | Pi 最后一条回复的正文 |
| `tools` | 本次用到的工具、是否出错、耗时 |
| `dialogs` | 期间出现的扩展对话框及应答方式 |
| `usage` | token 用量与上下文占用 |
| `sessionId` / `sessionFile` | 会话标识与 Pi 侧会话文件路径 |
| `error` / `stderr` | 失败原因与 Pi 的标准错误输出 |

进程退出码同样表达结果：成功 0，失败 1。`status: settled` 只代表 Pi 跑完了，**不代表代码已经通过验证**——
Pi 说做完了就是做完了，测试和 lint 仍然要自己确认。

## 边界与风险

1. **Pi 不做逐次工具审批**。Pi 以启动它的账号权限读写文件、跑命令；`--approve` 只是决定要不要加载
   项目本地的扩展与配置，不是操作授权。生产目录上别随手开 `--approve`。
2. **RPC 不提供文件隔离**。需要目录级权限控制的话，那是独立的一层安全机制，别指望桥接。
3. **扩展对话框默认拒绝**。`--ui-policy deny` 下所有 `select` / `confirm` / `input` / `editor`
   请求一律回 `cancelled`，Pi 不会挂死，但也拿不到你的选择。确实需要放行时再显式改 `allow`。
4. **Pi 的 TUI 界面不会出现**。RPC 是无界面模式，Atelier 之类的终端侧栏看不到 Pi 的实时渲染。
5. **Hermes 终端超时**：别为了跑长任务去调大 `terminal.timeout`（影响全部终端命令），
   用后台模式。

## 故障排查

| 现象 | 原因与处理 |
|------|-----------|
| `ok: false` 且 `error` 里是 401 / 403 | 模型凭据无效。换 `--model` 指向真正可用的模型 |
| `status: failed`，`result` 为 null | Pi 跑完但没产出文本，通常也是模型调用失败，看 `error` 和 `stderr` |
| `spawn: pi` 后就没下文 | Pi 不在 PATH，或 `PI_BRIDGE_HOME` 指向了不可写目录；先用 `doctor` 排查 |
| `status: timeout` | 任务超过 `--timeout`，Pi 已被 abort；加大超时或拆小任务 |
| 扩展一直等着不做事 | 扩展弹了对话框；`dialogs` 字段能看到，默认已自动拒绝 |

## 在 Hermes 里怎么调

技能目录下的脚本用相对路径引用即可，Hermes 会把它解析成绝对路径：

```powershell
node scripts/pi-rpc.mjs run "D:\Projects\Demo" "分析项目结构，不要修改任何文件"
```

在 Hermes 里加载本技能时，`${HERMES_SKILL_DIR}` 会替换成本技能的实际目录，可用于拼接绝对路径。

macOS / Linux 等价写法：

```bash
node scripts/pi-rpc.mjs run "$HOME/Projects/Demo" "分析项目结构，不要修改任何文件"
```

脚本用 `import.meta.url` 定位自身所在目录，不依赖当前工作目录；提示词请用引号包住，
含空格或换行时尤其如此。

## 装到 Hermes

把整个 `hermes-pi-bridge/` 目录复制到 Hermes 的 skills 目录：

```powershell
$skills = if ($env:HERMES_HOME) {
    Join-Path $env:HERMES_HOME 'skills'
} else {
    Join-Path $env:LOCALAPPDATA 'hermes\skills'
}
Copy-Item -Recurse hermes-pi-bridge $skills
```

macOS / Linux 等价写法：

```bash
cp -r hermes-pi-bridge "${HERMES_HOME:-$HOME/.hermes}/skills/"
```

装完重启 Hermes。用 `/hermes-pi-bridge` 触发，技能也会按 `description` 自动匹配加载，
或用 `skill_view(name='hermes-pi-bridge')` 显式读取。放在 Hermes 主目录下时，curator 会在
长期未使用后自动归档它；需要长期常驻就挂到 `external_dirs` 下。

## 深入了解协议

要自己改适配器、或需要在 Hermes 之外直连 Pi，读 `references/rpc-protocol.md`：
里面是 Pi RPC 的记录格式、命令清单、事件流、扩展 UI 子协议，以及踩坑点
（stdout 只能按 LF 切分、prompt 响应不代表跑完、对话框不回应就会挂死）。
