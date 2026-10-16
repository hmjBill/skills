---
name: bitwarden-cli
description: 用 Bitwarden 官方 CLI(bw) 管理个人密码库的查询、增删改、文件夹整理、生成密码、Send 分享与备份导出，Windows 优先，供 OpenCode、Hermes、Claude Code 等 Agent 调用
---

# Bitwarden CLI 技能

用 Bitwarden 官方命令行工具 `bw` 管理**你自己的** Bitwarden 密码库：查询条目、新增 / 编辑 / 删除、文件夹整理、生成密码、附件、Send 分享、备份导出与恢复。面向在 Windows 11 上把批量整理类任务交给 AI Agent（OpenCode / Hermes / Claude Code）的场景。

两条边界先立好：

1. 只操作用户自己的密码库、自己的账号。
2. 主密码、会话 key、导出的明文 vault 都是敏感凭据，纪律见「安全红线」——那条是硬规则，不是建议。

## 为什么是 CLI + 本技能，而不是官方 MCP

- 官方 Bitwarden MCP 的个人密码库功能本身就是在包装 `bw` CLI，功能不比 CLI 多；导入 / 导出、批量脚本组合、文件夹整理这类活只有 CLI 能干。
- 官方 MCP 本质上包装的就是 CLI 的 `bw serve`——`bw serve` 把本地 vault 暴露成 REST 接口（默认端口 8087），MCP 在其上再包一层工具。真需要 MCP 形态时，从 CLI 起 `bw serve` 即可；本项目仍选直接调 CLI，少一层进程和端口管理。
- MCP 真正独有的价值是组织管理 API（企业库、成员、集合权限）。个人库场景用不到。
- 两者不互斥：真到需要组织 API 时再叠 MCP，本技能的 `bw` 命令照样复用。

## 安装

### Windows（本机约定：全局 CLI 走 npm-global）

```powershell
npm i -g @bitwarden/cli
bw --version
```

升级用 `npm i -g @bitwarden/cli@latest`；不要用 `npm update -g`（会把无关包一起动）。

本机实际落点：`B:\Develops\DevRuntimes\npm-global\bw`，该目录已在 PATH 中，直接敲 `bw` 即可。

### macOS / Linux

```bash
brew install bitwarden-cli        # 或 npm i -g @bitwarden/cli
```

### 数据目录（C 盘敏感者注意）

CLI 的状态文件 `data.json` 默认在 `%APPDATA%\Bitwarden CLI\data.json`，落在 C 盘。想挪到 B 盘，设用户级环境变量（已实测生效）：

```powershell
[Environment]::SetEnvironmentVariable("BITWARDENCLI_APPDATA_DIR", "B:\Develops\DevRuntimes\bw-data", "User")
```

新开终端后 `bw status` 会在该目录创建 `data.json`。原 C 盘位置已有的登录态不会自动迁移，需要在两个位置分别 `bw login`。

## 登录、解锁与会话管理

```powershell
# 登录（只传邮箱，主密码走交互提示，不进 argv / shell 历史）
bw login your@email.com

# 解锁并取出 session key（旧 key 随即全部失效）
$env:BW_SESSION = (bw unlock --raw)

# 状态与同步
bw status
bw sync            # 拉取服务端最新 vault；-f 强制全量
```

要点：

- `bw login` / `bw unlock` 都支持 `--passwordenv <变量名>` 和 `--passwordfile <文件>`。脚本化场景用前者，变量只在当前 shell 存活；**永远不要把主密码写成命令行参数**（`bw unlock <password>` 这种写法会进 shell 历史和进程列表）。
- `--raw` 让命令只输出 session key 本身，方便 `$env:BW_SESSION = (bw unlock --raw)` 这样的赋值；不加 `--raw` 输出的是一段描述性文字，无法直接当变量值。
- `BW_SESSION` 是**当前 shell 会话级**的。新开终端、Agent 重新起 shell 后全部失效，需要重新 unlock——这是特性不是 bug：不用的会话拿不到 vault。
- 未解锁时大多数命令直接报 `Vault is locked`，先 unlock 再操作。
- 用完可以 `bw lock`（销毁全部 session key）；彻底退出用 `bw logout`。
- 开了 2FA 的账号：`bw login your@email.com --method 1` 之类按提示走；API key 登录（`--apikey`）是 CI 场景，个人本机用不到。
- 自建服务端（如自托管 Vaultwarden）：`bw config server <url>` 切换服务器地址。**这条会直接覆盖原有服务器配置**，官方云账号不要顺手执行；换回官方写 `bw config server https://api.bitwarden.com`。

### 判断 session 是否还有效：`bw unlock --check`

**这是非交互场景唯一可靠的检查方式**，比 `bw status` 更直接：

```powershell
bw unlock --check        # 有效时输出 "Vault is unlocked!" 并 exit 0
```

`bw status` 显示 `locked` 有两种完全不同的原因，处理方式也不同：

| 现象 | 含义 | 处理 |
| ---- | ---- | ---- |
| `bw status` → locked，但根本没设过 `BW_SESSION` | 从没解锁 | 正常，需要 unlock |
| `bw status` → locked，但持久化的 `BW_SESSION` 已存在 | **那个 key 已失效** | 重新 unlock 并重新持久化 |

### 让 Agent 免交互使用：持久化 session key

Agent 反复调用 `bw` 时，每次都要人输主密码是不可接受的。做法是 unlock 一次，把 session key 持久化，之后所有新进程自动继承。

**每次 `bw unlock` 都会作废之前所有 session key**（CLI 帮助原文：`After unlocking, any previous session keys will no longer be valid.`）。所以持久化不是一劳永逸的，**每次 unlock 之后都要重新写一遍**。

Windows（用户级注册表，新进程自动继承）：

```powershell
# 设成你自己的 CLI 数据目录；不设则沿用默认（见「数据目录」一节）
$env:BITWARDENCLI_APPDATA_DIR = '/path/to/Bitwarden CLI'
[Environment]::SetEnvironmentVariable('BW_SESSION', (bw unlock --raw), 'User')
```

macOS / Linux（写进 shell profile）：

```bash
echo 'export BW_SESSION='"$(bw unlock --raw)" >> ~/.zshrc   # 或 ~/.bashrc
```

**关键限制：已经跑着的进程（包括当前这个 Agent 会话）拿不到新值。** Windows 的子进程从父进程的环境块继承，不重读注册表。所以：

- 新开的终端 / 重启后的应用 → 能读到
- 当前会话里的 Agent → 读不到

绕法：**需要用 `bw` 的脚本不依赖进程环境变量，直接从持久化位置读回来**。这样不重启也能用：

```powershell
# Windows
$sess = ([string](Get-ItemProperty 'HKCU:\Environment').BW_SESSION).Trim()
if ($sess) { $env:BW_SESSION = $sess }
bw unlock --check
```

脚本开头统一用这个模式，并且**在 vault 不可用时明确退出**，而不是让后续命令报一堆看不懂的错：

```powershell
if ([string]::IsNullOrWhiteSpace($sess)) {
    Write-Host 'No persisted BW_SESSION. Run: bw unlock --raw' -ForegroundColor Red
    exit 1
}
```

### 组织结构：先建文件夹，再谈分类

个人 vault 里**文件夹**（`bw create folder`）是主力分类机制；Tags 需要 Premium。多数人的 vault 长期停在「一个条目都不放文件夹」的状态，结果是条目堆在一起、找东西全靠搜索。

设计分类前先看清现状（只读统计，不要打印条目内容）：

```powershell
$raw = & bw list items 2>$null | Out-String
$items = ($raw -replace '[\x00-\x08\x0B\x0C\x0E-\x1F]', '') | ConvertFrom-Json
@($items) | Group-Object type | ForEach-Object { "type=$($_.Name): $($_.Count)" }
@($items) | Group-Object { if ($_.folderId) { 'in-folder' } else { 'no-folder' } } |
    ForEach-Object { "$($_.Name): $($_.Count)" }
```

先按**用途**分文件夹（工作 / 个人 / 服务器 / 金融），而不是按网站类型分——用途决定你什么时候需要它。跨用途的账号再考虑 Tags。

**注意**：`bw list items` 的完整 JSON 包含所有密码、TOTP seed 和备注，**只用来做计数和分组，绝不整体倒进对话或日志**。

## 查询

```powershell
bw list items                          # 全部条目（JSON 数组）
bw list items --search github          # 只搜名字里的关键词
bw list items --folderid <folderId>    # 按文件夹过滤
bw list items --url github.com         # 登录项按 URL 匹配
bw list items --trash                  # 回收站里的
bw list folders                        # 全部文件夹

bw get item <id>          # 完整条目（含密码，谨慎输出）
bw get password <id>      # 只要密码
bw get username <id>      # 只要用户名
bw get totp <id>          # 只要当前 TOTP 验证码
bw get notes <id>         # 只要备注
bw get uri <id>           # 只要 URI（第一条）
bw get field <id> <字段名>  # 只要自定义字段（fields），与写字段的 `bw edit` 配套
bw get exposed github.com # 查该 URL 是否出现在已知泄露库

bw get template item          # 拿条目 JSON 模板（create/edit 的骨架）
bw get template item.login    # 登录项模板
bw get template folder        # 文件夹模板

bw report password-health     # 密码健康报告（强度 0-4 等）
```

安全习惯：只要密码就 `bw get password <id>`，**不要把整个 `bw get item` 的 JSON 倒进对话或日志**——那里有密码、TOTP seed、备注里的敏感信息。批量筛选让 Agent 在脚本里用 jq 或 PowerShell 过滤，人看到的部分只留 name / id / 文件夹。

## 新增、编辑、删除

`create` / `edit` 的载荷是 **base64 编码后的 JSON**。PowerShell 里用编码管道最稳：`bw encode` 负责编码，`bw decode` 是它的反向（把 base64 解回 JSON，载荷写错时用来对照原始输入）：

```powershell
# 新建文件夹
'{"name":"Development"}' | bw encode | bw create folder

# 新建登录项（基于模板改，别手搓）
$item = bw get template item.login | ConvertFrom-Json
$item.name = "GitHub"
$item.login.username = "your@email.com"
$item.login.password = "S3cure-P@ss"
$item.login.uris = @(@{ uri = "https://github.com" })
$json = $item | ConvertTo-Json -Depth 10 -Compress
$json | bw encode | bw create item
```

### 条目类型（cipher type）：先认 type，再谈字段

每条 vault 条目都有一个 `type`（cipher type）。字段结构**按 type 完全不同**，往错类型里塞字段会被静默丢弃——不报错，东西就是存不进去。

| type | 类型 | 内容字段 |
| ---- | ---- | -------- |
| 1 | Login 登录项 | `login.{username,password,uris,totp}` |
| 2 | SecureNote 安全笔记 | 见下方「安全笔记的真相」 |
| 3 | Card 银行卡 | `card.*` |
| 4 | Identity 身份信息 | `identity.*` |
| 5 | SshKey SSH 密钥 | `sshKey.{privateKey,publicKey,keyFingerprint}` |

**`bw get template item.sshKey` 会报不支持，但这不代表 CLI 不支持 SSH 密钥。** CLI 从 2024.12.0 起就完整支持 type=5，是 `bw get template` 的注册表落后于 cipher 类型。判断某类型是否支持，用 `bw get template item`（完整 item 模板）或直接试写，**不要拿 `item.<type>` 模板命令的返回值当证据**——这是个很容易踩的坑，会让人误判整个功能不存在。

### 安全笔记的真相（type=2）

安全笔记的**可取回内容存在顶层 `notes` 字段**，不是 `secureNote.notes`：

```json
{ "name": "...", "type": 2, "notes": "<内容>", "secureNote": { "type": 0 } }
```

两个后果，踩过就会白忙一场：

1. 把内容写进 `secureNote.notes` → **每次写入都被静默丢弃**，命令返回成功、条目也建出来了，但内容是空的。
2. `bw get password <id>` 对安全笔记**返回空**（它只服务于 Login 类型）。取内容要读条目的 `.notes`。

正确建法：

```powershell
$item = [PSCustomObject]@{
    name       = 'restic-repo-key'
    notes      = $secret          # 内容放这里
    type       = 2
    secureNote = [PSCustomObject]@{ type = 0 }
    fields     = @([PSCustomObject]@{ name = 'context'; value = $desc; type = 0 })
} | ConvertTo-Json -Depth 12 -Compress
```

自定义字段（`fields`）用来放指纹、路径、恢复命令这类元数据——条目只能有一个 `notes`，元数据放这里。

### SSH 密钥条目（type=5）

```json
{
  "name": "ssh-key-<标识>",
  "type": 5,
  "sshKey": {
    "privateKey":     "-----BEGIN OPENSSH PRIVATE KEY-----\n...",
    "publicKey":      "ssh-ed25519 AAAA... comment",
    "keyFingerprint": "SHA256:xxxx"
  }
}
```

字段名是 **`keyFingerprint`**（不是 `keyType` / `keyData`）。`publicKey` 和 `keyFingerprint` 都能从私钥推导出来，静止时可以不存；写全三条能让条目自解释、便于人工核对。

几条与 OpenSSH 相关的硬约束：

- **私钥必须是 LF 换行**。CRLF 的私钥 OpenSSH 直接拒绝加载，存进去等于废条目。
- **Windows 上恢复后必须收紧 ACL**，否则 OpenSSH 报 `UNPROTECTED PRIVATE KEY FILE` 拒绝加载。
- **带口令的私钥无法在无人值守场景校验**。`ssh-keygen -y -P ''` 只对无口令密钥有效；有口令密钥只能做逐字节比对。这点在自动化脚本里要说清楚，别把"校验跳过"当成"校验通过"。

写入前先自检，坏格式宁可不写：

```powershell
$bytes = [IO.File]::ReadAllBytes($path)
for ($i = 1; $i -lt $bytes.Length; $i++) {
    if ($bytes[$i] -eq 10 -and $bytes[$i-1] -eq 13) { throw 'CRLF: OpenSSH would reject this key' }
}
if (([Text.Encoding]::UTF8.GetString($bytes)) -notmatch '-----BEGIN OPENSSH PRIVATE KEY-----') { throw 'not an OpenSSH key' }
```

完整脚本见 `scripts/store-ssh-key.ps1`，含写入后的往返校验（私钥/公钥/指纹逐项比对，无口令时再做一次 `ssh-keygen -y` 派生验证）。

编辑的正确姿势是**先取全量、改字段、再整份编码回传**。直接传局部 JSON 会把没写的字段清掉：

```powershell
$item = bw get item <id> | ConvertFrom-Json
$item.folderId = "<folderId>"          # 例如移动到 Development 文件夹
$item.notes = "备注更新"
($item | ConvertTo-Json -Depth 10 -Compress) | bw encode | bw edit item <id>
```

文件夹本身有简写命令，不用取回再改（载荷同样是 base64 编码后的 JSON）：

```powershell
'{"name":"Development"}' | bw encode | bw edit folder <id>
```

**重建而非编辑**：条目结构写错时（比如把内容误放进了 `secureNote.notes`），再多次 `edit` 也修不回来——因为回读时那个字段已经不存在了。正确做法是 `bw delete item <id> --permanent` 后按正确结构重建。

JSON 解析的坑：vault 里某些条目的名字含裸控制字符，`bw list items` 的输出直接喂给 `ConvertFrom-Json` 会解析失败（报 `unexpected character`）。批量统计前先清洗：

```powershell
$raw = & bw list items 2>$null | Out-String
$items = ($raw -replace '[\x00-\x08\x0B\x0C\x0E-\x1F]', '') | ConvertFrom-Json
```

PowerShell 字符串陷阱：载荷里的路径**必须用单引号 here-string**。双引号里的 `B:\ProgramData\restic\...` 会被当成变量展开（`$env:restic` 等），路径直接写坏：

```powershell
$body = @'
Path: B:\ProgramData\restic\password.bin
'@   # 单引号 here-string，不展开
```

删除与恢复：

```powershell
bw delete item <id>          # 软删除，进回收站（默认保留 30 天），可恢复
bw delete item <id> --permanent   # 永久删除，不可恢复
bw restore item <id>         # 从 trash / archive 恢复
bw delete folder <id>
```

附件：

```powershell
bw create attachment --file .\key.pub --itemid <id>
bw get attachment <attachmentId> --itemid <id> --output .\
```

## 典型批量任务：找重名、归文件夹

以「找出所有 GitHub 相关账号、检查重复、整理到 Development 文件夹」为例，完整流程：

```powershell
bw sync
bw list items --search github

# 判重：按 name 或 login.username 分组，count > 1 的就是重复
bw list items --search github |
  ConvertFrom-Json |
  Group-Object login.username |
  Where-Object Count -gt 1 |
  Select-Object Name, Count
```

确认没有重名后，把计划保留的条目挪进目标文件夹：

```powershell
# 1. 找到（或先创建）目标文件夹，拿 folderId
$folderId = (bw list folders | ConvertFrom-Json | Where-Object name -eq 'Development').id

# 2. 逐条改 folderId（注意先取全量再改）
$item = bw get item <id> | ConvertFrom-Json
$item.folderId = $folderId
($item | ConvertTo-Json -Depth 10 -Compress) | bw encode | bw edit item <id>
```

两条纪律：改文件夹前先 `bw export` 一份备份；删除类操作（尤其是 `--permanent`）逐条列出计划让用户确认，不自动批量删。

## 生成密码

```powershell
bw generate                        # 默认 -uln --length 14
bw generate -ulns --length 20
bw generate --passphrase --words 5 --separator - --capitalize
bw generate --ambiguous            # 避开 O/0、l/1 这类易混字符
bw generate --minNumber 2 --minSpecial 2 --length 24
```

创建登录项时可以直接内嵌：`$item.login.password = (bw generate --raw -ulns --length 20)`。

## Send 分享

Send 是 Bitwarden 的临时分享（文本或文件），到期自动删除：

```powershell
bw send "要分享的文本"                          # 快速创建，返回访问 URL
bw send --file .\report.pdf -n "周报" -d 7       # 文件 Send，7 天后删除
bw send "文本" --password --emails a@b.com -a 3  # 访问密码 + 限定邮箱 + 最多 3 次访问
bw send "隐藏内容" --hidden                       # 网页默认不显示内容

bw send list        # 自己的全部 Send
bw send get <id>
bw send delete <id>
```

注意：`--password` 会明文出现在 argv / shell 历史里。个人本机可接受；共享或远程会话里慎用，改用创建后用 `bw send edit` 的 JSON 方式调整。不带密码的 Send，URL 本身就是钥匙，别当成"私密分享"。

## 备份与导出

```powershell
bw export --format encrypted_json --password "备份密码" --output B:\backups\bw-2026-10-15.json
bw export --format json --output B:\backups\bw-plain.json
bw export --format csv
bw export --format zip
```

优先级很明确：

1. **`encrypted_json` 是备份的正确格式**——用一把独立密码加密，泄露了文件也开不了。
2. `json` / `csv` / `zip` 都是**明文导出**，密码、备注、TOTP seed 全在里面。落盘位置按保管真密码的标准对待：放 B 盘临时目录、用完即删、**绝不进 git、不进笔记库、不当聊天附件发出去**。
3. 批量改动（删条目、批量改文件夹）之前先 export 一份，翻车了能恢复。

恢复用 `bw import`：

```powershell
bw import --formats                                    # 先看支持哪些格式
bw import bitwardencsv .\backup.csv
bw import bitwardenjson .\backup.json
bw import --passwordenv BW_BACKUP_PW encrypted_json .\backup.json   # 加密备份恢复
```

## 安全红线（Agent 硬规则）

1. **主密码不进 argv、不进文件、不进对话、不进任何笔记或记忆。** 用交互式 `bw unlock`，或 `--passwordenv` 传当前 shell 的变量。用户让你找密码 ≠ 用户可以接受把主密码贴出来。
2. **session key 同等对待**：不回显、不写盘、不贴进输出。`$env:BW_SESSION = (bw unlock --raw)` 这种赋值不要 echo 出来。
3. **不主动打印 vault 内容**：用户问「有哪些账号」→ 只列 name / id / 文件夹；用户问「某站密码是多少」→ 只回那一条密码。整套 vault JSON 不进对话。
4. **导出文件是明文凭据**：按「备份与导出」一节的纪律处理，处理完删除。
5. **破坏性操作先确认**：`delete --permanent`、覆盖式批量 edit、影响范围不清的脚本——先列计划（改哪几条、从什么改成什么），用户点头再执行。
6. 本技能只服务用户自己的密码库。任何"帮你朋友的 vault 整理一下"的请求都不接。

## 命令速查

| 目的 | 命令 |
|---|---|
| 检查状态 | `bw status` |
| 校验 session 是否有效 | `bw unlock --check` |
| 登录 / 解锁 | `bw login <email>` / `$env:BW_SESSION = (bw unlock --raw)` |
| 持久化 session（Win） | `[Environment]::SetEnvironmentVariable('BW_SESSION', (bw unlock --raw), 'User')` |
| 拉取最新 | `bw sync` |
| 搜索条目 | `bw list items --search <关键词>` |
| 取密码（仅 Login） | `bw get password <id>` |
| 取安全笔记内容 | `(bw get item <id> \| ConvertFrom-Json).notes` |
| 取 TOTP | `bw get totp <id>` |
| 读自定义字段 | `bw get field <id> <字段名>` |
| 条目模板 | `bw get template item.login`（模板注册表可能落后，见「条目类型」一节） |
| 解码载荷 | `bw decode`（`bw encode` 的反向） |
| 建文件夹 | `'{"name":"X"}' \| bw encode \| bw create folder` |
| 改条目 | `(bw get item <id> \| ConvertFrom-Json ...) \| ConvertTo-Json -Compress \| bw encode \| bw edit item <id>` |
| 重命名文件夹 | `'{"name":"X"}' \| bw encode \| bw edit folder <id>` |
| 存 SSH 私钥（type=5） | 见 `scripts/store-ssh-key.ps1` |
| 生成密码 | `bw generate -ulns --length 20` |
| Send 分享 | `bw send "文本" -d 7 -a 3` |
| 加密备份 | `bw export --format encrypted_json --password <pw> --output <file>` |
| 恢复 | `bw import <format> <file>` |
| 软删除（回收站保留 30 天） | `bw delete item <id>` |
| 永久删除 | `bw delete item <id> --permanent` |
| 切换自建服务器 | `bw config server <url>`（会覆盖原有服务器配置） |
| 锁定 | `bw lock` / `bw logout` |

## 已知坑（2026.10.0 实测）

1. **没有 `bw folders` 这个子命令**。文件夹操作一律走 `bw list folders` / `bw create folder` / `bw edit folder <id>` / `bw delete folder <id>`；敲错时 `bw folders --help` 会打印顶层总帮助，容易看懵。
2. **`bw get template item.sshKey` 报不支持，但 CLI 完整支持 type=5 SSH 密钥**（2024.12.0 起）。模板注册表落后于 cipher 类型，别据此判断功能不存在——这条极易导致误判。
3. **安全笔记的内容在顶层 `notes`，不是 `secureNote.notes`**。写错位置会被静默丢弃：命令成功、条目建出来了、内容却是空的。`bw get password` 对安全笔记也返回空。
4. **每次 `bw unlock` 作废所有旧 session key**。持久化过的 `BW_SESSION` 会在下一次 unlock 后失效，需要重新写一遍。
5. **`bw unlock --raw` 在 vault 已锁定时把错误打到 stderr 并以非零码退出**，赋值给 `$env:BW_SESSION` 前先 `bw unlock --check` 确认。注意它可能仍以 exit 0 返回**提示框文本**而非 key，所以不能只看退出码，要校验返回值形态。
6. **`bw encode` 是把 stdin 做 base64**；PowerShell 里 base64 串含 `+` `/` `=`，一律用**单引号**包裹，双引号在某些上下文会被变量展开破坏。
7. **`bw list items` 的 JSON 可能含裸控制字符**（某些条目名），直接喂 `ConvertFrom-Json` 会报 `unexpected character`。先 `-replace '[\x00-\x08\x0B\x0C\x0E-\x1F]', ''` 清洗。
8. **双引号字符串里的 Windows 路径会被变量展开**。`"B:\ProgramData\restic\..."` 里的 `$env:restic` 之类会被替换掉，路径写坏。描述性文字用单引号 here-string `@' ... '@`。
9. **`bw login` 在已登录状态会先要求 logout**；换账号前先 `bw logout`。
10. **`data.json`（登录态、同步缓存）默认在 C 盘 `%APPDATA%\Bitwarden CLI\`**，见「数据目录」一节改 `BITWARDENCLI_APPDATA_DIR`。
11. **`bw get exposed <url>` 和 `bw report` 默认会联网查 HIBP 泄露库**；`bw report password-health --no-check-exposed` 可跳过。
12. **OpenSSH 私钥必须是 LF 换行**，CRLF 的会被 OpenSSH 拒绝加载；Windows 上恢复后还要收紧 ACL，否则报 `UNPROTECTED PRIVATE KEY FILE`。
13. **带口令的 SSH 私钥无法无人值守校验**：`ssh-keygen -y -P ''` 只对无口令密钥有效。脚本要明确区分「校验通过」和「跳过校验」，别混为一谈。
