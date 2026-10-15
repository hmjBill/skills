---
name: bitwarden-cli
description: 用 Bitwarden 官方 CLI(bw) 管理个人密码库的查询、增删改、文件夹整理、生成密码、Send 分享与备份导出，Windows 优先，供 OpenCode、Hermes、Claude Code 等 Agent 调用
---

# Bitwarden CLI Skill

用 Bitwarden 官方命令行工具 `bw` 管理**你自己的** Bitwarden 密码库：查询条目、新增 / 编辑 / 删除、文件夹整理、生成密码、附件、Send 分享、备份导出与恢复。面向在 Windows 11 上把批量整理类任务交给 AI Agent（OpenCode / Hermes / Claude Code）的场景。

两条边界先立好：

1. 只操作用户自己的密码库、自己的账号。
2. 主密码、会话 key、导出的明文 vault 都是敏感凭据，纪律见「安全红线」——那条是硬规则，不是建议。

## 为什么是 CLI + 本技能，而不是官方 MCP

- 官方 Bitwarden MCP 的个人密码库功能本身就是在包装 `bw` CLI，功能不比 CLI 多；导入 / 导出、批量脚本组合、文件夹整理这类活只有 CLI 能干。
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
bw get exposed github.com # 查该 URL 是否出现在已知泄露库

bw get template item          # 拿条目 JSON 模板（create/edit 的骨架）
bw get template item.login    # 登录项模板
bw get template folder        # 文件夹模板

bw report password-health     # 密码健康报告（强度 0-4 等）
```

安全习惯：只要密码就 `bw get password <id>`，**不要把整个 `bw get item` 的 JSON 倒进对话或日志**——那里有密码、TOTP seed、备注里的敏感信息。批量筛选让 Agent 在脚本里用 jq 或 PowerShell 过滤，人看到的部分只留 name / id / 文件夹。

## 新增、编辑、删除

`create` / `edit` 的载荷是 **base64 编码后的 JSON**。PowerShell 里用编码管道最稳：

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

编辑的正确姿势是**先取全量、改字段、再整份编码回传**。直接传局部 JSON 会把没写的字段清掉：

```powershell
$item = bw get item <id> | ConvertFrom-Json
$item.folderId = "<folderId>"          # 例如移动到 Development 文件夹
$item.notes = "备注更新"
($item | ConvertTo-Json -Depth 10 -Compress) | bw encode | bw edit item <id>
```

删除与恢复：

```powershell
bw delete item <id>          # 软删除，进 trash，可恢复
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
| 登录 / 解锁 | `bw login <email>` / `$env:BW_SESSION = (bw unlock --raw)` |
| 拉取最新 | `bw sync` |
| 搜索条目 | `bw list items --search <关键词>` |
| 取密码 | `bw get password <id>` |
| 取 TOTP | `bw get totp <id>` |
| 条目模板 | `bw get template item.login` |
| 建文件夹 | `'{"name":"X"}' \| bw encode \| bw create folder` |
| 改条目 | `(bw get item <id> \| ConvertFrom-Json ...) \| ConvertTo-Json -Compress \| bw encode \| bw edit item <id>` |
| 生成密码 | `bw generate -ulns --length 20` |
| Send 分享 | `bw send "文本" -d 7 -a 3` |
| 加密备份 | `bw export --format encrypted_json --password <pw> --output <file>` |
| 恢复 | `bw import <format> <file>` |
| 锁定 | `bw lock` / `bw logout` |

## 已知坑（2026.10.0 实测）

1. **没有 `bw folders` 这个子命令**。文件夹操作一律走 `bw list folders` / `bw create folder` / `bw edit folder <id>` / `bw delete folder <id>`；敲错时 `bw folders --help` 会打印顶层总帮助，容易看懵。
2. `bw unlock --raw` 在 vault 已锁定时把错误打到 stderr 并以非零码退出，赋值给 `$env:BW_SESSION` 前先 `bw status` 确认。
3. `bw encode` 是把 stdin 做 base64；PowerShell 里 base64 串含 `+` `/` `=`，一律用**单引号**包裹，双引号在某些上下文会被变量展开破坏。
4. `bw login` 在已登录状态会先要求 logout；换账号前先 `bw logout`。
5. `data.json`（登录态、同步缓存）默认在 C 盘 `%APPDATA%\Bitwarden CLI\`，见「数据目录」一节改 `BITWARDENCLI_APPDATA_DIR`。
6. `bw get exposed <url>` 和 `bw report` 默认会联网查 HIBP 泄露库；`bw report password-health --no-check-exposed` 可跳过。
