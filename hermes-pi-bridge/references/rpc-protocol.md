# Pi RPC 协议速查

面向「自己写客户端」的场景。协议原文在 Pi 包内：
`node_modules/@earendil-works/pi-coding-agent/docs/rpc.md`、`rpc-commands.md`、
`json.md`、`rpc-extension-ui.md`（本文件是提炼后的中文速查，以官方文档为准）。

## 启动

```bash
pi --mode rpc
```

常用参数：`--provider` `--model` `--name` `--session-id` `--session-dir` `--no-session`
`--approve`（信任项目本地文件）`--thinking` `--tools` `--exclude-tools`。

RPC 模式**拒绝 `@file` 提示词参数**，文件内容要自己读进 `prompt` 消息里。

## 分帧：只按 LF 切

一条记录一个 JSON 对象，以 `\n` 结尾。读 stdout 时**只按 LF 切分**，并去掉可选的前导 `\r`。

```javascript
// 正确
child.stdout.setEncoding('utf8');
let buffer = '';
child.stdout.on('data', (chunk) => {
  buffer += chunk;
  let index;
  while ((index = buffer.indexOf('\n')) >= 0) {
    const line = buffer.slice(0, index).replace(/\r$/, '');
    buffer = buffer.slice(index + 1);
    if (line.trim()) handleLine(line);
  }
});
```

**坑**：Node 的 `readline` 还会在 `U+2028` / `U+2029` 处断行，而这两个字符在 JSON 字符串里是合法的，
用它切分会解析出坏 JSON。官方文档专门点名了这个坑。

stdout 只放协议记录；诊断和日志走 stderr，**不要拿 stderr 当协议数据解析**。
stdout 必须持续读取，否则管道写满会让 Pi 卡住。

## 四类记录

| 方向 | 记录 | 用途 |
|------|------|------|
| stdin | 命令 | 下发提示、查状态、改配置、管会话 |
| stdout | `response` | 报告单条命令是否成功 |
| stdout | 会话事件 | run / message / tool / queue / compaction / retry 活动流 |
| 双向 | 扩展 UI 记录 | Pi 与客户端之间的扩展交互 |

### 命令与响应

每条命令可带可选字符串 `id`，响应会原样带回：

```json
{"id":"req-1","type":"get_state"}
{"id":"req-1","type":"response","command":"get_state","success":true,"data":{ ... }}
```

命令处理是异步的，**必须按 id 关联，不能按响应顺序**。

失败时：

```json
{"id":"req-3","type":"response","command":"set_model","success":false,"error":"Model not found: invalid/model"}
```

JSON 解析失败会产生一条没有 id 的响应：

```json
{"type":"response","command":"parse","success":false,"error":"Failed to parse command: ..."}
```

会话事件通常没有命令 id。例外：`bash_execution_update` 会带上发起它的 `bash` 命令 id。

## 常用命令

| 命令 | 说明 |
|------|------|
| `prompt` | 下发提示词。响应 `data.disposition`：`started` 已开始 / `queued` 已排队 / `handled` 被扩展或输入处理器直接消费 |
| `steer` / `follow_up` | 运行中插话 / 跑完后追加 |
| `abort` | 中止当前操作并等会话空闲 |
| `clear_queue` | 清空 steering 与 followUp 队列 |
| `new_session` | 新会话，可带 `parentSession` |
| `get_state` | 当前状态：`sessionId`、`sessionFile`、`model`、`thinkingLevel`、`messageCount` 等 |
| `get_last_assistant_text` | 最后一条助手消息正文（`data.text`，可能为 `null`） |
| `get_session_stats` | token 用量、成本、上下文占用 |
| `get_messages` / `get_entries` / `get_tree` | 消息与会话树 |
| `set_model` / `cycle_model` / `get_available_models` | 模型管理 |
| `set_thinking_level` / `cycle_thinking_level` | 思考档位 |
| `bash` / `abort_bash` | 执行 shell 命令并把输出带进上下文 |
| `compact` / `set_auto_compaction` / `set_auto_retry` / `abort_retry` | 压缩与重试控制 |
| `switch_session` / `fork` / `clone` | 会话切换与分支 |
| `set_session_name` / `get_commands` / `export_html` | 命名、斜杠命令清单、导出 |

`prompt` 的三种排队语义：

- `"steer"`：当前助手回合的工具调用跑完后、下一次模型调用前投递。
- `"followUp"`：等 Agent 停下来再投递。
- 正在流式输出时不给 `streamingBehavior`，命令会直接报错。

## 事件流

一次正常运行的记录序列：

```json
{"type":"agent_start"}
{"type":"turn_start"}
{"type":"message_start","message":{...}}
{"type":"message_update","usage":{...},"assistantMessageEvent":{"type":"text_delta","contentIndex":0,"delta":"Hello"}}
{"type":"message_end","message":{...}}
{"type":"turn_end","message":{...},"toolResults":[]}
{"type":"agent_end","messages":[...],"willRetry":false}
{"type":"agent_settled","aborted":false}
```

**关键区分**：

- `agent_end` = 一次底层 Agent run 结束。之后还可能有自动重试、溢出恢复、压缩重试、steering、follow-up。
- `agent_settled` = Pi 不会再自动继续了。要判断「真的干完了」就等它。

`message_end` 的 `message` 是权威的最终消息。要拿最终答复，用
`get_last_assistant_text`；或自己读 `message_end` 里 `role == "assistant"` 的文本块。

**失败长这样**：`message_end` 的 `message.stopReason === "error"` 且带 `errorMessage`，
此时 `content` 可能是空的、`get_last_assistant_text` 返回 `null`。
只看「有没有 settle」会把失败当成功——必须同时看 `stopReason`。

其他事件：

| 事件 | 关键字段 |
|------|---------|
| `tool_execution_start` / `_update` / `_end` | `toolCallId`、`toolName`、`args`、`result`、`isError`、`durationMs` |
| `queue_update` | `steering`、`followUp` 当前队列全量 |
| `compaction_start` / `compaction_end` | `reason`（manual / threshold / overflow）、`result`、`aborted` |
| `auto_retry_start` / `auto_retry_end` | `attempt`、`delayMs`、`errorMessage`、`success` |
| `summarization_retry_scheduled` / `_attempt_start` / `_finished` | 压缩或分支摘要的重试 |
| `entry_appended` / `session_info_changed` / `thinking_level_changed` | 会话状态变化 |
| `extension_error` | 扩展处理器抛错（RPC 专有） |

## 扩展 UI 子协议

扩展调用 `ctx.ui` 时，RPC 模式下分两类：

**对话框类**（`select` / `confirm` / `input` / `editor`）——发出
`extension_ui_request` 后 **Pi 会一直阻塞，直到客户端回一条同 id 的 `extension_ui_response`**：

```json
{"type":"extension_ui_response","id":"uuid-1","value":"Allow"}
{"type":"extension_ui_response","id":"uuid-2","confirmed":true}
{"type":"extension_ui_response","id":"uuid-3","cancelled":true}
```

`cancelled: true` 适用于任何对话框：扩展收到 `undefined`（select/input/editor）或 `false`（confirm）。

**即发即忘类**（`notify` / `setStatus` / `setWidget` / `setTitle` / `set_editor_text`）——
只发请求，不等响应，可以直接忽略。

带 `timeout` 的对话框在超时后由 Agent 侧自动解决，客户端不用自己计时；但**不带 timeout 的必须回应**，
否则 Pi 永久卡住。

RPC 模式下的限制：`custom()` 返回 `undefined`；`onTerminalInput()` 是空订阅；
`setTheme()` 固定返回失败；`getEditorText()` 返回空串。`ctx.hasUI` 仍为 `true`，
判断 TUI 专属能力要用 `ctx.mode === "tui"`。

## 生命周期与关闭

- 先订阅事件，再发 `prompt`，否则可能漏掉快速完成。
- `prompt` 响应只说明「已接受」，不代表模型跑完。
- 正常关闭：关掉子进程 stdin，Pi 会先释放运行时再退出。
- 客户端还要自己处理：进程启动失败、意外退出、stderr 诊断、取消、超时。

## 会话选择行为

Pi 的默认行为容易踩坑：

| 启动参数 | 实际效果 |
|----------|---------|
| 不带任何会话参数 | 续用该工作目录**最近**的会话（可能是你手工 `pi` 开的那一个） |
| `--continue` | 明确续用该目录最近的会话 |
| `--session-id <id>` | 该 id 存在 → 打开它；不存在 → 用这个 id 新建会话 |
| `--no-session` | 临时会话，退出后不可恢复 |

要精确控制，就**总是显式传 `--session-id`**：想续用传旧 id，想新开传新 id。

## 安全边界

Pi 以启动它的账号权限读写文件、执行命令，**不会为每次工具调用征求同意**。
项目信任（`--approve`）只决定要不要加载项目本地的扩展与配置，不是操作授权。
真正的隔离要靠操作系统权限、容器或虚拟机。详见 Pi 包的 `docs/security.md`。
