# Himalaya v2 命令树参考

对应 himalaya v2.2.1。各命令的完整参数以 `himalaya <命令> --help` 为准（上游明确 `--help` 是唯一真源），本文只列命令组骨架与关键参数。

标注：🌐 需网络，📁 本地离线。共享命令实际是否联网取决于所跑的后端（IMAP/JMAP/Gmail/msgraph/smtp 联网；maildir/m2dir/mbox/pimdir 本地）。

## 全局选项

| 选项 | 说明 |
| ---- | ---- |
| `-c/--config <路径>` | 配置文件路径；可写多个（`:` 分隔），按序深合并；环境变量 `HIMALAYA_CONFIG` 等效 |
| `-a/--account <名称>` | 选择账户 |
| `-b/--backend <名称>` | `auto` / `imap` / `jmap` / `gmail` / `msgraph` / `maildir` / `m2dir` / `mbox` / `pimdir` / `smtp`（实际可用取决于编译 feature）；对协议专属命令组无效 |
| `--json` | 输出 JSON |
| `--log-level <级别>` | 日志级别（调试用 `debug`） |
| `--log-file <路径>` | 日志落盘文件 |

v2 已移除的全局选项：`--debug`、`--trace`、`-f/--folder`、`-o/--output`。

## 共享命令组

跑在账户的第一个后端上，或用 `-b` 临时指定。`-m/--mailbox` 接信箱名称、别名或角色（`inbox` / `sent` / `drafts` / `trash`…），省略默认 `inbox`。

### mailbox

| 命令 | 关键参数 | 用途 |
| ---- | -------- | ---- |
| `mailbox list` | `--counts` | 列出信箱（可带计数）；IMAP 上偏慢，Maildir 不支持 |

### envelope

| 命令 | 关键参数 | 用途 |
| ---- | -------- | ---- |
| `envelope list` | `-m`、`-p/--page`、`-s/--page-size`（默认 25）、`-w`、`-r`、`--has-attachment` | 分页列出信封；输出列 `ID FLAGS [ATT] SUBJECT FROM\|TO DATE SIZE` |
| `envelope search [QUERY]` | DSL：`date`/`after`/`from`/`to`/`subject`/`body`/`flag seen\|answered\|flagged\|draft` + `and`/`or`/`not` + 括号 + `order by date\|from\|to\|subject [asc\|desc]` | 按条件搜索信封；v1 的 `before` 已移除 |

### flag

| 命令 | 关键参数 | 用途 |
| ---- | -------- | ---- |
| `flag add <ID>` | `-f/--flag`（必填，可重复） | 加旗标；仅 `seen` / `answered` / `flagged` / `draft` |
| `flag set <ID>` | 同上 | 设置旗标 |
| `flag remove <ID>` | 同上 | 移除旗标 |

### message

| 命令 | 别名 | 关键参数 | 用途 |
| ---- | ---- | -------- | ---- |
| `message add` | `save` | `-m`（必填） | 把 RFC 5322 邮件存入指定信箱 |
| `message compose` | `write`、`new` | `--from`、`-t/--to`、`--cc`、`--bcc`、`-s/--subject`、`--body` / `--body-file`、`--attach`、`--signature` / `--signature-file`、`--save <MAILBOX>` / `--no_save`、`--send` | 非交互组装邮件；无 `--send`/`--save` 时默认输出 RFC 5322 到 stdout |
| `message reply <ID>` | — | compose 全部参数 + `-P/--posting-style top\|bottom\|none` + `-Q/--quote-headline` | 回复 |
| `message forward <ID>` | — | 同 reply | 转发 |
| `message read <ID>` | — | `--raw`、`--seen` | 读信；默认输出头块 + MIME 叶子摘要 `[ID] type/subtype — name (size)` |
| `message copy` | — | `-f/--from`、`-t/--to` | 跨信箱复制 |
| `message move` | — | `-f/--from`、`-t/--to` | 跨信箱移动 |
| `message delete` | — | — | 两段式删除：先移入废纸篓（trash 角色/别名），已在废纸篓里才真删；IMAP 无 UIDPLUS 时需 `imap expunge` |
| `message send` | — | `--save` / `--no_save` | 发送现成邮件；信封取头块 From/To/Cc/Bcc |

### attachment

| 命令 | 关键参数 | 用途 |
| ---- | -------- | ---- |
| `attachment list <MESSAGE-ID>` | `-m`、`-i` | 列出各 MIME 部分与附件；`[ID]` 即 1 起始的 MIME 序号 |
| `attachment download <MESSAGE-ID> [ID...]` | `-d/--dir`、`-m`、`-i`；省略 ID 等于全部 | 下载附件；ID 为 MIME 序号，重名自动追加 `(1)`、`(2)` |

## 协议专属命令组

`-b/--backend` 对这些组无效（它们绑定协议本身）。各子命令的参数一律以 `himalaya <命令> --help` 为准。

### imap 🌐

RFC 3501 的扁平封装：

| 子命令 | 用途 |
| ------ | ---- |
| `id` | 交换 IMAP ID 扩展信息 |
| `select` | 选中信箱 |
| `create` / `delete` / `rename` | 建、删、重命名信箱 |
| `subscribe` / `unsubscribe` | 订阅 / 退订信箱 |
| `list` | 列出信箱 |
| `status` | 查询信箱状态 |
| `close` / `unselect` | 关闭当前信箱（前者可能触发删除 \deleted） |
| `expunge` | 物理清除标记删除的邮件 |
| `search` / `sort` / `thread` | 检索 / 排序 / 会话线程 |
| `store` / `flag` | 改标志 |
| `fetch` | 取信（`--body` 取正文） |
| `append` / `copy` / `move` | 存入、复制、移动邮件 |
| `raw` | 发送原始 IMAP 命令 |

### jmap 🌐

| 子命令 | 用途 |
| ------ | ---- |
| `query` | JMAP 查询 |
| `mailbox` / `email` / `thread` | 信箱 / 邮件 / 会话对象操作 |
| `identity` | 发件身份 |
| `submission` | 提交发送 |
| `vacation-response` | 休假自动回复 |

### gmail 🌐

`profile`、`labels`、`messages`、`attachments`、`drafts`、`threads`、`history`、`settings`。

注意：`--format` 默认 `metadata`，要完整 MIME 内容需显式 `--format full`。

### msgraph 🌐

`profile`、`mail-folders`、`messages`、`attachments`。

### smtp 🌐

| 子命令 | 关键参数 | 用途 |
| ------ | -------- | ---- |
| `smtp send` | `-f`、`-t`（显式信封） | 不经账户头块推断，直接按给定信封经 SMTP 投递 |

### sieve 🌐

ManageSieve 脚本管理：`capability`、`list`、`get`、`put`、`check`、`rename`、`delete`、`activate`、`deactivate`、`raw`。

### 本地后端 📁

`maildir` / `m2dir` / `mbox` / `pimdir` 各有专属命令组，离线可用；`pimdir` 另有 `queue list` / `queue cancel`（本地发送队列管理）。

## 账户与工具

| 命令 | 说明 |
| ---- | ---- |
| `configure` | 交互式配置向导；需要真 TTY，提示走 stderr |
| `account list` | 列出配置中的账户 |
| `account check` 🌐 | 逐账户连通性检查 |
| `completion` | 生成 shell 补全；默认输出到 stdout，`--dir` 写入文件 |
| `manual` | 生成手册页；同上 |
| `json-schema` | 导出配置 JSON Schema（核对配置键名/类型的最快途径）；同上 |
