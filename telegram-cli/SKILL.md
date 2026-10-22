---
name: telegram-cli
description: 用 tg 命令行驱动 Telegram 个人账号（收发消息、读历史、全局搜索、群组与频道管理、媒体上传下载、实时监听新消息），面向 AI Agent 的结构化 JSON 输出
---

# Telegram CLI 技能

用 [`gotd/cli`](https://github.com/gotd/cli) 的 `tg` 命令驱动**你自己的** Telegram 个人账号（或 bot）：收发消息、读历史、全局搜索、管理群组与频道、上传下载媒体、实时监听新消息。

`tg` 是单个静态 Go 二进制，无运行时依赖，Windows / macOS / Linux 都有官方预编译包。面向 Agent 设计：任何命令加 `-o json` 都输出稳定信封 `{"schema":1,"data":…}` 到 stdout，日志与提示走 stderr，可直接管道给 `jq`。

## 动手前先确认已登录

`tg` 需要一次性配置 + 登录。**登录必须由用户本人完成**（扫码或收验证码），不要自己跑 `tg login` 然后等它成功。

```bash
tg whoami -o json   # 已授权 → 返回 {"schema":1,"data":{...}}
```

报 `not authorized: run 'tg login' first` 就说明还没登录，**停下来请用户登录**，不要试图绕过。

未初始化时：

```bash
tg init    # 写配置文件；官方 release 二进制内嵌 app 凭据，这一步就能成功
```

`tg init` 写出的配置内容是 `{}` ——这是**正常的**，官方 release 二进制在编译期内嵌了 app 凭据，运行时直接回退使用。只有自己从源码编译的二进制才需要 `--app-id/--app-hash`。

### 登录（需要用户在场）

```bash
tg login             # 默认 QR 登录：终端打印二维码 + tg:// 链接，用户用手机 Telegram 扫码
tg login --account work          # 登录另一个账号（标签自动创建）
tg login --phone +1234567890     # 手机号 + 验证码流程（不带号码时交互式提示输入）
```

用户操作路径：手机 Telegram → 设置 → 设备 → 链接桌面设备。

二维码、提示、进度全在 **stderr**；stdout 只输出最终的账号信息。开启两步验证时用 `--password` 或环境变量 `TG_PASSWORD` 传云端密码，避免进 shell 历史：

```bash
TG_PASSWORD=secret tg login
```

登录成功后 session 持久化在**配置文件所在目录**（Windows：`%APPDATA%\gotd\`），后续命令都能无头运行。macOS 上默认存进系统 Keychain（配置文件里设 `keychain: false` 可改为存文件），其余平台一律存文件。

## 面向 Agent 的四条硬规则

1. **凡是需要解析的输出，一律加 `-o json`。** stdout 只有数据，日志提示在 stderr，可以放心 `| jq`。
2. **peer 写法统一。** 接受 `me` / `self`（自己的收藏夹）、`@username`、手机号、`t.me/…` 链接，以及 `id:<数字>`（无用户名/手机号的会话，先跑过一次 `tg chats list` 缓存 access-hash 才能用）。解析结果本地缓存，同一 peer 复用同一种写法。
3. **破坏性命令必须带 `--yes`**，且**只在用户明确要求删除时**才加。涉及 `delete`、`delete-history`、`unpin-all`、`leave`、`ban` 等。
4. **先读后写。** 发消息、编辑、删除之前先用 `history` / `search` / `chats list` 看清现状，别凭猜测操作。

## 常用配方

注意参数位置的差异：`send` / `upload` 的目标用 `--peer` 标志（默认发给自己），其余大多数命令的目标是**位置参数**。

```bash
# 发消息（收藏夹 / 指定对象）
tg send "note to self"
tg send --peer @username "hello"
tg send --peer @username --html --silent "<b>bold</b>"

# 列出会话并取出用户名
tg chats list -o json | jq -r '.data.chats[].peer.username // empty'

# 读历史 / 搜索（peer 是位置参数）
tg history @username --limit 20 -o json
tg search @username "invoice" -o json        # 限定在某个会话内
tg search --global "invoice" -o json         # 全局搜索所有会话

# 回复 / 编辑 / 表情回应（消息 id 来自 history）
tg reply @username 12345 "on it"
tg edit  @username 12345 "fixed typo"
tg react @username 12345 👍

# 媒体（upload 用 --peer，download 是位置参数 + --out）
tg upload --peer me ./report.pdf
tg upload --peer me ./clip.mp4 --type video
tg download @username 12345 --out ./downloads/

# 实时
tg watch @username -o json                # 持续流式输出新消息（长驻，不退出）
tg wait  @username --timeout 30s -o json  # 阻塞等待下一条消息后退出
```

破坏性操作（仅在用户明确要求时）：

```bash
tg delete @username 12345 --yes            # <peer> <message-id>...
tg delete-history @username --yes
```

## 参数位置速查

| 命令 | 目标写法 | 常用可选参数 |
|------|---------|-------------|
| `send` | `--peer`（默认自己） | `--html` `--silent` `--nowebpage` `--schedule <时长>` |
| `upload` | `--peer`（默认自己） | `--type <file/video/audio/voice/gif/sticker>`（不填按 MIME 自动识别）、`--message <说明文字>`、`--filename` |
| `history` | 位置参数 `<peer>` | `--limit/-n`（默认 30，**实际最多 100**） |
| `search` | 位置参数 `<peer> <query>`；`--global` 时只给 `<query>` | `--limit/-n`（默认 50）、`--global/-g` |
| `chats list` | 无 | `--limit/-n`（默认 100）、`--archived` |
| `download` | 位置参数 `<peer> <message-id>` | `--out <文件或目录>` |
| `reply` / `edit` / `react` / `delete` | 位置参数 `<peer> <message-id> [文本/表情]` | `delete` 需 `--yes` |

`--limit` 的实际含义：Telegram 单次请求超过 100 条不会报错，但会**静默返回更少或不对的结果**，所以 `history` 内部把批次上限钳在 100。要读更多历史得分段取，不要指望 `--limit 500` 一次拿全。

## 全局参数

| 参数 | 含义 |
|------|------|
| `-o, --output text\|json` | 输出格式；要解析就用 `json` |
| `-a, --account <标签>` | 选择账号，`all` 表示遍历所有账号（结果会带 `account` 字段区分） |
| `-c, --config <路径>` | 指定配置文件 |
| `--proxy <url>` | `socks5://…` 或 `tg://proxy?…`（MTProxy），覆盖配置文件里的设置 |

环境变量等价写法：`TG_PROXY`、`TG_ACCOUNT`、`TG_PASSWORD`、`APP_ID`、`APP_HASH`、`BOT_TOKEN`。

## 多账号与 bot

```bash
tg accounts                     # 列出已配置账号及其登录状态
tg login --account work         # 新标签会自动创建，复用内嵌凭据
tg chats list --account work -o json
tg watch --account all -o json  # 遍历所有账号，每条结果带 account 标签
```

bot 模式：

```bash
tg init --token <bot-token>
tg whoami --bot
```

大多数命令都支持 `--bot` 标志切换到 bot 会话。

## 排障与边界

- **没有 `--version` 参数。** 想确认版本就读 release tag（`tg` 是静态二进制，`tg --version` 会报 unknown flag）。上游提供了 `tg docs --dir <目录>` 可从命令树生成完整 Markdown 参考，以及 `tg completion bash|zsh|fish|powershell` 生成补全脚本。
- **命令面很大，别猜参数。** `tg --help` 给出分组命令列表，`tg <命令> --help` 给出该命令的参数与示例。
- **错误输出在 stderr，格式是 `tg: <原因>`，退出码非 0 表示失败。** 设 `TG_DEBUG=1` 可打印完整错误链与堆栈。
- **`tg init` 不覆盖已存在的配置文件**，报 `file … exists`。要重置就自己删掉配置文件再 init。
- **`send` 的文本是位置参数**，超过一个词必须加引号。
- **会话 ID 形式 `id:<数字>` 需要先缓存**：先跑 `tg chats list` 把会话写进本地 access-hash 缓存，才能用 `id:` 形式寻址。
- **代理**：直连不通时用 `--proxy socks5://127.0.0.1:1080` 之类，或在配置文件里写 `proxy:`。MTProxy 用 `tg://proxy?...` 链接。

更多命令族（群组管理、频道、话题、文件夹、投票、草稿、定时、贴纸、联系人）与完整参数表见 [references/commands.md](references/commands.md)。

## 合规与安全

- 只操作**用户自己的账号**。不要用这个工具去操作他人账号或批量骚扰。
- session 文件等同于账号登录态，**不要提交到版本库、不要贴进聊天记录**。
- 群组/频道的破坏性操作（踢人、封禁、退群、删历史、删消息）**必须先取得用户明确指示**，`--yes` 不要自作主张加。
- 使用者需自行遵守所在法域法律与 Telegram 服务条款。

## 安装

### Windows

官方 release 提供预编译 zip（tar.gz），解压后把 `tg.exe` 放进任一在 PATH 里的目录，例如 `C:\Program Files\tg\`。

```powershell
# 1. 下载并解压（版本号按需替换为最新 tag）
$ver = "0.11.0"
$tg = "tg_${ver}_windows_amd64.tar.gz"
Invoke-WebRequest "https://github.com/gotd/cli/releases/download/v${ver}/${tg}" -OutFile $tg
tar -xzf $tg
New-Item -ItemType Directory -Force "C:\Program Files\tg" | Out-Null
Move-Item tg.exe "C:\Program Files\tg\" -Force

# 2. 加进用户级 PATH（PowerShell，无需管理员）
[Environment]::SetEnvironmentVariable(
  "Path",
  [Environment]::GetEnvironmentVariable("Path","User").TrimEnd(";") + ";C:\Program Files\tg",
  "User")

# 3. 新开终端后验证
tg init
```

> PowerShell 7 的 `tar` 支持解压 `.tar.gz`；若提示找不到 `tar`，用 `tar.exe -xzf` 或改用 7-Zip。

macOS / Linux 同理，下载对应平台的 `.tar.gz`（或 `.deb` / `.rpm` / `.apk`）解压后把 `tg` 放进 PATH。

**校验完整性**：release 提供 `checksums.txt`，下载后核对 SHA256。

```bash
sha256sum tg_0.11.0_windows_amd64.tar.gz
# 与 https://github.com/gotd/cli/releases/latest 的 checksums.txt 比对
```

### 从源码编译（可选）

需要 Go 1.25+。源码编译的二进制**没有**内嵌 app 凭据，必须自己申请：

```bash
git clone https://github.com/gotd/cli.git
cd cli
go build -o tg ./cmd/tg
```

再到 <https://my.telegram.org> 的 API development tools 申请 `app_id` / `app_hash`，然后：

```bash
tg init --app-id <数字> --app-hash <字符串>
```

## 安装后自检

```bash
tg --help          # 打印分组命令列表，不报错即为可用
tg init            # 写配置文件（已存在时会报 exists，属正常）
tg whoami -o json  # 未登录时报 not authorized —— 交给用户扫码登录
```
