# Himalaya 配置参考（v2）

对应 himalaya v2.2.1。键名以 `himalaya json-schema` 导出的 JSON Schema 为最终核对依据。

## 配置查找顺序

1. `-c/--config` 或环境变量 `HIMALAYA_CONFIG` 指定的路径（可写多个，`:` 分隔，按序深合并）
2. 平台首选路径：

   | 平台 | 路径 |
   | ---- | ---- |
   | Windows | `%APPDATA%\himalaya\config.toml` |
   | macOS | `~/Library/Application Support/himalaya/config.toml` |
   | Linux | `~/.config/himalaya/config.toml` |

3. 回退：`~/.config/himalaya/config.toml` → `~/.himalayarc`

注意：上游 README 只写 XDG 路径，与实现有滞后——Windows / macOS 各有自己的首选位置，以上表为准。

## 顶层键

| 键 | 默认 | 说明 |
| ---- | ---- | ---- |
| `display-name` | — | 全局显示名 |
| `signature` | — | 全局签名 |
| `signature-delim` | `"-- \n"` | 签名分隔行，原样写入邮件 |
| `downloads-dir` | `$TMPDIR` | 附件下载目录 |
| `message.send.save-copy` | — | true 时发送的邮件保存副本，读作已存入 sent |
| `message.reply.posting-style` | — | 回复引文位置（`top` / `bottom` / `none`） |
| `message.forward.posting-style` | — | 转发引文位置 |
| `table.preset` / `table.arrangement` | — | 表格输出样式 |
| `envelope.list.page-size` 等 | 25 | 信封列表分页等 `envelope.list.*` 键 |
| `proxy.url` | — | 代理地址，`socks5://` 或 `http://`；未配置时回退读环境变量 `all_proxy` / `https_proxy` |
| `mailbox.alias.<名称>` | — | 信箱别名，大小写不敏感；以角色名命名的条目会覆盖后端自报的角色；没有 `default-mailbox` 键 |

## 账户块

```toml
[accounts.<名称>]
default = true          # 可选；标记省略 -a 时的默认账户
email = "alice@example.org"
display-name = "Alice"
signature = "Alice"
```

信箱别名挂在账户块下：

```toml
[accounts.<名称>.mailbox.alias]
inbox = "INBOX"
sent = "INBOX.Sent"
trash = "INBOX.Trash"
```

后端配置是**扁平键**（不再是 v1 的 `backend.type` 整块），直接写在账户块层级。

## 后端块

| 后端块 | 键 |
| ------ | ---- |
| `[imap]`（放在账户块下即 `[accounts.<名称>.imap]`，或写 `imap.server = …` 扁平形式） | `server`（如 `imaps://imap.example.org:993`，支持 `unix://`）、`tls.provider`、`starttls`、`sasl-ir`、`id.auto` |
| `[smtp]` | 与 `[imap]` 同构 |
| `[gmail]` | `user-id`、`auth.token.raw` / `auth.token.command` |
| `[jmap]` | `server`、`auth.bearer` |
| `[maildir]` | `root` |
| `[mbox]` | `root`、`format`（默认 `mboxrd`） |
| `[pimdir]` | `root`、`account` |
| `[sieve]` | `server` |

一个账户块只挂一个收信后端；共享命令跑在账户的第一个后端上。

## SASL 认证

机制 `anonymous` / `login` / `plain` / `oauthbearer` / `xoauth2` / `scram-sha-256`，**恰好配置一种**：

```toml
imap.sasl.plain.username = "alice@example.org"
imap.sasl.plain.password.raw = "…"                    # 形态一：直接写值
imap.sasl.plain.password.command = "pass show key"    # 形态二：从命令输出读取（argv 形式更安全）
```

- **keyring 已移除**：用 pass、secret-tool 等外部 CLI 经 `.command` 接入。
- **OAuth（`oauthbearer` / `xoauth2`）无内置授权流**：用 pimalaya/ortie 之类的 broker 完成授权，把 token 接到 `*.token.command`（Gmail 即 `gmail.auth.token.command`）。
- 凭据双形态 `.raw` / `.command` 同样适用于 Gmail 的 `auth.token`。

## 最小示例

IMAP + SMTP（照抄可用，密码走 pass）：

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

离线 Maildir：

```toml
[accounts.local]
default = true
email = "me@localhost"
maildir.root = "~/Mail/example"
```

## 中国邮箱开关

| 服务商 | 配置 |
| ------ | ---- |
| 126 / 163 等 Coremail 系 | `imap.sasl-ir = false`（服务器不支持 SASL initial response） |
| 163 | 拒 `AUTHENTICATE PLAIN` 时改用 `imap.sasl.login` 机制 |
| QQ / 126 / 163 | `imap.id.auto = true`（服务器要求 IMAP ID 扩展，不开会拒连） |

## 代理

```toml
proxy.url = "socks5://127.0.0.1:1080"   # 或 http://…
```

未配置 `proxy.url` 时，回退读环境变量 `all_proxy`、`https_proxy`。
