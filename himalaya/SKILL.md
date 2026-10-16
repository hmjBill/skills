---
name: himalaya
description: 用 himalaya 命令行收发管理邮件：读取、搜索、撰写发送、回复转发、附件、多账户与 IMAP/SMTP/Maildir 配置
---

# Himalaya 邮件 CLI 技能

himalaya 是 Rust 编写的邮件命令行客户端：IMAP / JMAP / Gmail API / Microsoft Graph 收信，SMTP 发信，另有 Maildir 等纯本地离线后端。无 TUI、全程非交互、输出纯文本，适合脚本和 Agent 调用。上游 [pimalaya/himalaya](https://github.com/pimalaya/himalaya)（原 soywod/himalaya），本文档对照 v2.2.1 官方文档整理。

## 第一步：先确认版本

v2 是破坏性重写，命令树和配置格式与 v1 完全不同。任何操作前先跑：

```powershell
himalaya --version
```

- 版本 ≥ 2.0.0：按本文档执行。
- 版本 1.x：命令与输出格式不同，本文档不适用。先看 [references/migration-v1-to-v2.md](references/migration-v1-to-v2.md) 对照差异，并建议用户升级到 v2。

本文档未逐一固化的参数，一律以 `himalaya <命令> --help` 为准——`--help` 是唯一可靠真源。

## 安装

Windows（优先 scoop；官方未提供 aarch64-windows 预编译包）：

```powershell
scoop install himalaya
```

macOS / Linux：从 GitHub Releases 下载预编译包，或用 Rust 工具链（1.89+）编译安装：

```bash
cargo install --locked --git https://github.com/pimalaya/himalaya.git
```

## 配置文件位置

| 平台 | 首选路径 |
| ---- | -------- |
| Windows | `%APPDATA%\himalaya\config.toml` |
| macOS | `~/Library/Application Support/himalaya/config.toml` |
| Linux | `~/.config/himalaya/config.toml` |

查找顺序：上表平台首选路径 → 回退 `~/.config/himalaya/config.toml` → `~/.himalayarc`。`-c/--config` 或环境变量 `HIMALAYA_CONFIG` 覆盖以上全部；`-c` 可写多个路径（用 `:` 分隔），按序深合并。

最小可用配置——IMAP + SMTP（照抄可用，密码交给 pass 之类的 CLI 密钥工具，不落明文）：

```toml
[accounts.example]
default = true
email = "alice@example.org"
display-name = "Alice"
imap.server = "imaps://imap.example.org:993"
imap.sasl.plain.username = "alice@example.org"
imap.sasl.plain.password.command = "pass show himalaya-example"
smtp.server = "smtps://smtp.example.org:465"
smtp.sasl.plain.username = "alice@example.org"
smtp.sasl.plain.password.command = "pass show himalaya-example"

[accounts.example.mailbox.alias]
inbox = "INBOX"
sent = "INBOX.Sent"
trash = "INBOX.Trash"
```

纯离线本地账户（Maildir，不需要网络即可完整练习）：

```toml
[accounts.local]
default = true
email = "me@localhost"
maildir.root = "~/Mail/example"
```

全部键位见 [references/configuration.md](references/configuration.md)。

## 快速核对账户

```powershell
himalaya account list     # 配置里的全部账户
himalaya account check    # 逐账户连通性检查（需网络）
himalaya configure        # 交互式向导：需要真 TTY，提示走 stderr
```

`configure` 向导必须有 TTY，在计划任务、无终端脚本里会直接报错——自动化场景不要指望向导，直接写 config.toml。

## 核心工作流

共享命令跑在账户的第一个后端上（`-b/--backend` 可临时指定）。`-m/--mailbox` 接信箱名称、别名或角色（`inbox`、`sent`、`drafts`、`trash`…），省略时默认 `inbox`。

### 列信箱、列信封

```powershell
himalaya mailbox list --counts           # 信箱与计数；IMAP 上偏慢，Maildir 不支持
himalaya envelope list                   # 收件箱信封，每页默认 25 封
himalaya envelope list -m sent -s 50 -p 1
himalaya envelope list --has-attachment  # 只要带附件的
```

`envelope list` 关键选项：`-m` 信箱、`-p/--page` 页码、`-s/--page-size` 页大小（默认 25）、`--has-attachment` 过滤带附件（其余选项如 `-w`、`-r` 以 `--help` 为准）。输出列格式为 `ID FLAGS [ATT] SUBJECT FROM\|TO DATE SIZE`：FLAGS 里 `*` 表示未读、`R` 已回复、`!` 旗标，`[ATT]` 表示带附件。**行首的 ID 是后续 read / reply / forward / attachment 等命令的邮件标识。**

### 搜索

```powershell
himalaya envelope search "from alice@example.org"
himalaya envelope search "subject 周报 and not flag seen"
himalaya envelope search "after 2026-01-01 order by date desc"
```

搜索 DSL 要点：字段有 `date` / `after` / `from` / `to` / `subject` / `body` / `flag`（取 `seen`、`answered`、`flagged`、`draft`）；用 `and` / `or` / `not` 与括号组合；`order by date\|from\|to\|subject [asc\|desc]` 排序。v1 的 `before` 字段在 v2 已移除。

### 读信与附件：ID 的对应关系

```powershell
himalaya message read 42             # 头块 + 各 MIME 部分摘要
himalaya message read 42 --raw       # 原始 RFC 5322 全文
himalaya message read 42 --seen      # 读取同时标记已读

himalaya attachment list 42                        # 列出各部分与附件
himalaya attachment download 42 -d "$env:TEMP"     # 全部下载
himalaya attachment download 42 2 -d "$env:TEMP"   # 只下载第 2 个
```

`read` 默认输出头块加 MIME 叶子摘要，形如 `[ID] type/subtype — name (size)`——这个 `[ID]` 就是 1 起始的 MIME 序号，`attachment download` 的 `[ID...]` 参数用的正是它，省略则下载全部。重名附件自动追加 `(1)`、`(2)`，不会互相覆盖。下载目录取 `downloads-dir` 配置，未配置时为系统临时目录（macOS / Linux 等价写法 `-d /tmp`）。

### 撰写、发送、回复、转发

`compose` 全程非交互：既不 `--send` 也不 `--save` 时，把组装好的 RFC 5322 邮件打印到 stdout——Agent 可以先检查内容再决定投递。

```powershell
himalaya message compose --from alice@example.org -t bob@example.org -s "周报" --body "本周进展……" --send
himalaya message compose --from alice@example.org -t bob@example.org -s "周报" --body-file .\draft.md --attach .\report.pdf --send
himalaya message compose --from alice@example.org -t bob@example.org -s "周报" --body "草稿" --save Sent

himalaya message reply 42 --body "收到，已处理" --send      # 回复：继承 compose 全部参数
himalaya message forward 42 -t carol@example.org --send    # 转发：同样继承
himalaya message reply 42 -P bottom --send                 # 引文放底部
```

`compose` 的完整参数：`--from`、`-t/--to`、`--cc`、`--bcc`、`-s/--subject`、`--body` / `--body-file`、`--attach`、`--signature` / `--signature-file`、`--save <MAILBOX>` / `--no_save`、`--send`。`reply` / `forward` 在此之外多两个：`-P/--posting-style top\|bottom\|none` 控制引文位置，`-Q/--quote-headline` 自定义引文标题。

把一封现成的 RFC 5322 邮件存入信箱用 `message add`（别名 `save`），`-m` 必填；发送现成邮件用 `message send`，信封取自头块的 From/To/Cc/Bcc，`--save` / `--no_save` 控制是否存副本。输入形式以 `himalaya message send --help` 为准。

### 旗标

```powershell
himalaya flag add 42 -f seen       # 标已读
himalaya flag remove 42 -f seen    # 标回未读
himalaya flag add 42 -f flagged    # 加旗标
```

只支持四种旗标：`seen`、`answered`、`flagged`、`draft`。`-f/--flag` 必填且可重复。

### 复制、移动、删除（废纸篓语义）

```powershell
himalaya message copy 42 -f inbox -t archive
himalaya message move 42 -f inbox -t archive
himalaya message delete 42    # 第一步：移入废纸篓
```

`delete` 是两段式的：邮件先被移进 trash 角色/别名对应的信箱；只有对已在废纸篓里的邮件再执行 delete 才真正删除。IMAP 服务器不支持 UIDPLUS 扩展时，真删后可能还要 `himalaya imap expunge` 才释放空间。

### 多账户

```powershell
himalaya -a work envelope list
himalaya -a work envelope search "subject 周报"
```

`-a/--account` 临时切换账户；配置里 `default = true` 的是省略 `-a` 时的默认账户。

## 认证要点

- **凭据双形态**：`.raw` 直接写值，`.command` 从命令输出读取（argv 形式更安全）。keyring 集成在 v2 已移除，改用 pass、secret-tool 等外部 CLI 经 `.command` 接入。
- **OAuth 没有内置授权流**：himalaya 只消费现成 token。用 pimalaya/ortie 之类的 broker 跑授权，把 token 接到 `gmail.auth.token.command` 这类配置上。
- **应用密码**：Gmail 的 IMAP/SMTP 必须用应用密码；iCloud 的 IMAP 登录名是不带域的 `johnappleseed` 形式、SMTP 用完整邮箱地址；Proton Mail 走本地 Bridge（IMAP 1143 / SMTP 1025）。
- SASL 机制 `anonymous` / `login` / `plain` / `oauthbearer` / `xoauth2` / `scram-sha-256` 恰好配置一种，详表见 [references/configuration.md](references/configuration.md)。

中国邮箱开关（排障高频，Coremail 系为主）：

- 126 / 163 等 Coremail 系：`imap.sasl-ir = false`（服务器不支持 SASL initial response）。
- 163：拒 `AUTHENTICATE PLAIN` 时改配 `imap.sasl.login` 机制。
- QQ / 126 / 163：`imap.id.auto = true`（服务器要求 IMAP ID 扩展，不开会拒连）。

## 何时下钻协议专属命令树

日常收发用共享命令就够了。需要服务器级操作时再进各协议的专属命令组：`imap`（expunge、订阅信箱、RFC 3501 原生操作）、`jmap`、`gmail`（label、history）、`msgraph`、`smtp send`（显式信封）、`sieve`（过滤脚本），以及本地后端 `maildir` / `m2dir` / `mbox` / `pimdir`。注意 `-b/--backend` 对这些专属命令组无效——它们本来就绑定协议本身。完整命令树见 [references/commands.md](references/commands.md)。

## Windows 注意

- 调试用 `--log-level debug`，日志落 `--log-file`；v2 没有 `--debug` / `--trace`。
- v2 同样没有 `-f/--folder`（改 `-m/--mailbox`）和 `-o/--output`（改 `--json`）。
- `watch` 常驻命令在 v2 不存在；持续同步/迁移用上游姊妹项目 pimalaya/neverest。

## 排障速查

| 症状 | 原因与处理 |
| ---- | ---------- |
| `configure` 在脚本/计划任务里报错 | 向导需要 TTY；无终端环境直接写 config.toml |
| 连 126/163 被拒或卡死 | `imap.sasl-ir = false`；QQ/126/163 还要 `imap.id.auto = true` |
| 163 报认证机制不可用 | 服务器拒 AUTHENTICATE PLAIN，改用 `imap.sasl.login` |
| 报 `--debug` / `--folder` / `--output` 未知选项 | v2 已移除：分别改 `--log-level debug`、`-m`、`--json` |
| 删除后 IMAP 空间未释放 | 服务器无 UIDPLUS 时真删后需 `imap expunge` |
| 命令行为和文档对不上 | 多半本机是 v1，先 `himalaya --version`，对照迁移参考 |
| Gmail 命令读不到正文 | `gmail` 组 `--format` 默认 metadata，要完整 MIME 用 `--format full` |
| OAuth 账号登不上 | 没有内置授权流，token 须经 broker 接到 `*.token.command` |

## 参考文件

- [references/commands.md](references/commands.md)：v2 完整命令树（共享 + 协议专属 + 账户与工具）
- [references/configuration.md](references/configuration.md)：配置查找顺序、全键位表、SASL 认证详表、最小示例、代理
- [references/migration-v1-to-v2.md](references/migration-v1-to-v2.md)：v1→v2 映射表与版本时间线
