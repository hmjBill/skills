---
name: restic-backup
description: 用 restic 做加密备份与仓库巡检：建仓、备份、快照与差异比对、保留策略清理、完整性校验、单文件与整树恢复，含 Windows 路径陷阱和保留策略分组陷阱
---

# Restic 备份与巡检 Skill

restic 是去重、加密、版本化的备份工具，仓库可以是本地目录、S3/B2/SFTP/rclone 目标或自建 rest-server。本技能面向"已经有一个 restic 仓库，要日常备份、检查、清理、恢复"的场景，同时覆盖从零建仓。

本技能面向 restic 0.17–0.19。0.19 的行为变更要点：`backup` 的 exclude 规则不再作用于命令行显式给出的路径本身，只作用于该路径下的内容；`restore` 新增 `--ownership-by-name`（按快照里记录的属主恢复文件属主，属 POSIX 相关能力）；`check` 支持用 `--tag` / `--host` / `--path` 过滤要校验的快照。

`scripts/restic-health.ps1` 是一个**只读**巡检脚本：检查仓库可读性、备份新鲜度、保留策略分组、完整性、密码文件权限、残留锁和磁盘余量，不修改仓库。Windows / macOS / Linux 上都能跑（PowerShell 7+），本地和 S3/B2/SFTP/REST/rclone 后端都适用。

## 先立两条边界

1. **restic 只有在你真的恢复过之后才算备份。** 每个仓库建好后至少做一次真实恢复（哪怕只是单文件），否则"备份成功"只是一句没被验证过的日志。
2. **密码文件就是密钥本身。** 它和仓库放在一起时，任何能读到这个文件的人都能解开整个仓库。用 `RESTIC_PASSWORD_FILE` 或 `-p`，永远不要把密码写成命令行参数。密码文件权限要收紧——Windows 上不要让 `Users` / `Authenticated Users` 可读，POSIX 上必须是 `chmod 600`。

## 环境变量与调用姿势

restic 的仓库位置和密码来源都用环境变量给，不要每次手打：

```powershell
$env:RESTIC_REPOSITORY    = 'F:\restic-repo'
$env:RESTIC_PASSWORD_FILE = 'F:\restic-repo\password.txt'
```

macOS / Linux 等价写法：

```bash
export RESTIC_REPOSITORY=/mnt/data/restic-repo
export RESTIC_PASSWORD_FILE=/mnt/data/restic-repo/password.txt
```

给了这两个变量后，所有命令直接写 `restic snapshots` 即可。对应的命令行开关是 `-r/--repo` 和 `-p/--password-file`。

### 三组互斥的环境变量（实测会直接报错）

restic 把"仓库位置"和"密码来源"都做成了三选一，同时设置其中两个会立刻失败：

| 用途 | 互斥的三个（设其一即可） | 冲突报错 |
| ---- | ---------------------- | -------- |
| 仓库位置 | `RESTIC_REPOSITORY` / `-r` / `RESTIC_REPOSITORY_FILE` | `Options -r and --repository-file are mutually exclusive` |
| 密码来源 | `RESTIC_PASSWORD_FILE` / `-p` / `RESTIC_PASSWORD_COMMAND` | `Password file and command are mutually exclusive options` |

脚本里如果从父进程继承了这些变量又临时改写，很容易撞上。稳妥做法是进入脚本先显式清掉不用的那个：

```powershell
Remove-Item Env:\RESTIC_REPOSITORY_FILE -ErrorAction SilentlyContinue
$env:RESTIC_REPOSITORY = 'F:\restic-repo'
```

`RESTIC_REPOSITORY_FILE` 适合多仓库切换：文件里放一行仓库位置，读的时候不会和 `-r` 打架（`local:` 前缀可写可不写，两种都实测可用）：

```powershell
Set-Content -Path C:\restic\prod.repo -Value 'F:\restic-repo' -NoNewline
$env:RESTIC_REPOSITORY_FILE = 'C:\restic\prod.repo'
```

### 不想落一个密码文件时：`RESTIC_PASSWORD_COMMAND`

密码从命令输出读取，适合对接系统钥匙串、密码管理器或 1Password：

```powershell
# Windows：注意 type 是 cmd 内建命令，必须通过 cmd 调用，且整条命令要加引号
$env:RESTIC_PASSWORD_COMMAND = 'cmd /c "type D:\secrets\restic-pw.txt"'

# macOS / Linux
$env:RESTIC_PASSWORD_COMMAND = 'pass restic/main'
```

实测：`cmd /c type ...`（不加引号）会失败，报 `exit status 1`；`type ...` 单独写则报 `executable file not found in %PATH%`——因为 `type` 不是独立可执行文件。加引号的 `cmd /c "type ..."` 才正常工作。

缓存默认落在 `%LocalAppData%\restic`。C 盘敏感或想让缓存可清理时挪走：

```powershell
$env:RESTIC_CACHE_DIR = 'B:\restic-cache'
```

`RESTIC_CACHE_DIR` 指向一个不存在的目录时 restic 会自动创建，实测可用；缓存不是数据，删掉只是下次变慢。

`restic cache --cleanup` 能清掉已经没有快照引用的缓存条目（`forget` 删掉快照后缓存不会自己收缩），加 `--keep-duration 30d` 可以把最近用过的部分留下。

## 建仓

```powershell
# 交互式输入密码，不要用 --insecure-no-password
restic init

# 显式指定密码来源，适合脚本化
$env:RESTIC_PASSWORD_FILE = 'D:\secrets\restic-pw.txt'
restic init

# macOS / Linux
restic init --repository /mnt/backup/restic-repo
```

建仓后立刻确认三件事，缺一不可：

```powershell
restic cat config          # 仓库存在、格式版本
restic key list            # 密钥 ID，记下来
Test-Path $env:RESTIC_PASSWORD_FILE   # 密码文件确实在
```

**密码丢了 = 数据永久没了**，没有后门、没有找回。密码文件请和仓库分开存放，并确认它被纳入你自己的备份（但注意别造成"备份的密码解开备份本身"的循环依赖）。

## 后端地址写法

`--repo` 的值决定后端类型，本地路径之外的都要写 `<backend>:<地址>`：

| 后端 | 写法 | 说明 |
| ---- | ---- | ---- |
| 本地目录 | `F:\restic-repo` 或 `/mnt/data/restic-repo` | 省略前缀即 local |
| S3 / 兼容 S3 | `s3:s3.amazonaws.com/bucket/restic` | MinIO、DigitalOcean Spaces、Ceph RGW 等 S3 兼容服务用 `-o s3.bucket-lookup=path` |
| Backblaze B2 | `b2:bucketname:path` | 需 `-o b2.connections=N` 之类调并发 |
| SFTP | `sftp:user@host:/srv/restic-repo` | 需要 SSH 私钥可用 |
| REST 服务 | `rest:https://user:pass@host:8000/` | 自建 rest-server |
| rclone | `rclone:remote:path` | 需要 PATH 上有 rclone，`-o rclone.program=` 指定路径 |

查看当前版本支持的后端参数和全部 feature flag：

```powershell
restic options      # 所有 -o key=value 扩展参数（各后端的并发、区域、超时等）
restic features     # 实验性/稳定特性开关
```

新仓库默认用稳定格式。需要实验特性时按版本文档加 `-o` 或 feature flag，不要盲目照抄旧教程里的开关名——选项会随版本增删。

## 备份

```powershell
# 最小可用：备份配置目录并打标签
restic backup "$env:USERPROFILE\.config" "$env:USERPROFILE\.ssh" --tag config-daily

# 先干跑，确认要收哪些文件、排除规则是否生效
restic backup C:\Users\me\.ssh --dry-run

# 从文件读源列表和排除规则（长列表比命令行更好维护）
restic backup --files-from sources.txt --exclude-file excludes.txt --tag config
```

`--files-from` 的三种模式区别值得记住：默认模式允许空行和 `#` 注释，`--files-from-verbatim` 原样逐行当成路径，`--files-from-raw` 与之类似但不做路径规范化。

排除规则用 glob，写法上和 gitignore 不同——**没有目录语义**，要写 `**/node_modules` 而不是 `node_modules/`：

```powershell
restic backup C:\data --exclude '**/node_modules' --exclude '**/*.log' --exclude-caches
```

几个实用开关：

- `--exclude-caches`：自动跳过带 `CACHEDIR.TAG` 的目录，比手写一长串缓存路径省事。
- `--exclude-cloud-files`：跳过 OneDrive / iCloud 的"仅在线"占位文件，备份网盘目录时能避免把一堆 stub 当成正常文件。
- `--iexclude`：忽略大小写的排除，等于 `-e` 的大小写不敏感版。
- `--exclude-larger-than 100M`：跳过超大文件（录屏、镜像、模型权重这类另存专用仓库更合适）。
- `--exclude-if-present .nobackup`：目录里存在 `.nobackup` 就整个跳过该目录内容，适合"我不想备份这个文件夹，放个标记文件就行"。
- `--one-file-system`（`-x`）：不跨文件系统边界，备份根目录时防止意外吞进挂载点。
- `--skip-if-unchanged`：和上次快照完全一致就不建新快照。
- `--use-fs-snapshot`：调用 Windows VSS 做一致性快照，备份正在写入的数据库/虚拟机镜像时用；没有管理员权限会失败。
- `--parent <快照>`：指定父快照，避免 restic 自己去找最新的那次，能省掉一次全量扫描。
- `--stdin-from-command <命令>`：把命令的标准输出直接收进快照，不用先落临时文件。

### 退出码比日志更可信

restic 的退出码是判断成败的正确依据：

| 退出码 | 含义 | 处理 |
| ------ | ---- | ---- |
| 0 | 完全成功 | — |
| 1 | 致命错误，没生成快照 | 查日志，任务失败 |
| 3 | 部分源文件读不到，**快照已生成但不完整** | 常见于文件被占用，通常可接受 |
| 10 | 仓库不存在 | 检查 `RESTIC_REPOSITORY` |
| 11 | 仓库被锁 | 见下方 unlock |
| 12 | 密码错误 | 检查 `RESTIC_PASSWORD_FILE` |

自动化脚本里应当把 3 当作"可接受但需记录"，把 1 当作失败。Windows 上如果还要让任务计划程序显示成功，记得自己归一化退出码。

## 查看快照与差异

```powershell
restic snapshots                        # 全部快照
restic snapshots --compact              # 每行一个，便于脚本处理
restic snapshots --latest 3 --tag config
restic snapshots --json                 # 结构化输出，脚本首选

# 看某个快照里有什么
restic ls latest
restic ls latest --long --human-readable

# 两个快照之间改了什么
restic diff 422d8dc6 a26b447d
restic diff latest~1 latest             # latest~1 = 上一个快照
```

`diff` 的首字母含义：`+` 新增、`-` 删除、`M` 内容变更、`U` 元数据变更、`T` 类型变更（如变成符号链接）、`?` **位损坏**（内容变了但元数据没变，这种最值得警惕）。

想按内容而不是按路径找东西用 `find`：给它 blob / pack / tree / 快照 ID，它会列出内容相同的其他 blob，也就是去重候选：

```powershell
restic find --blob <blob-id>       # 内容相同的其他 blob
restic find --tree <tree-id>       # 同一棵树被存了几份
```

## 体积统计与版本维护

```powershell
restic version                     # 版本字符串，脚本第一件事就是探它
restic stats                       # 默认按 restore-size 统计
restic stats --mode raw-data       # 仓库实际占用
restic stats --group-by host,tags  # 只统计某一组，快很多
```

三种 `--mode` 含义不同，别拿不同模式的数字互比：`restore-size` 是恢复出来的体积（含元数据，硬链接只算一份），`files-by-contents` 只算去重后的文件内容，`raw-data` 是压缩后真正占盘的数据（含索引与树）。巡检脚本用的是 `stats --mode raw-data`，因为它要回答的是"仓库到底占了多少盘"。

`self-update` 能把官方发行版二进制升到最新稳定版，默认不降级。用包管理器装的（Homebrew / apt / winget）请走包管理器升级，混用会互相覆盖。

## Windows 路径陷阱（实测）

这是 Windows 上最容易把人卡住的地方：**快照内部的路径是 `/C:/Users/...` 形式，不带盘符冒号。**

```powershell
restic ls latest 'C:\Users\me\.ssh'          # 失败：Fatal: All path filters must be absolute, starting with a forward slash
restic ls latest '/C/Users/me/.ssh'          # 正确
restic dump latest '/C/Users/me/.gitconfig'  # 正确，能直接输出文件内容
```

所以在 Windows 上：

- `ls` / `restore --include` / `dump` 的路径过滤器一律写成 `/C:/Users/...`，**不能带冒号**。
- 反过来，`--repo` 这类指向**本机真实路径**的参数要写正常的 `F:\restic-repo`，带盘符冒号。
- 快照列表里显示的 `Paths` 列仍显示 `C:\Users\...`，那是原始入参，不代表内部路径格式。

`dump` 是快速取回单个文件内容的最省事办法，不用先恢复到磁盘：

```powershell
restic dump latest '/C/Users/me/.gitconfig' > restored.gitconfig
```

## 保留策略与清理

`forget` 删快照，`prune` 回收快照不再引用的数据。两者分开；`forget --prune` 可以在删完快照后自动接上 prune。

```powershell
# 先干跑，看清楚会删哪些
restic forget --keep-daily 7 --keep-weekly 4 --keep-monthly 12 --dry-run

# 确认无误后执行并回收空间
restic forget --keep-daily 7 --keep-weekly 4 --keep-monthly 12 --prune
```

`prune` 会重写 pack 文件，耗时且吃 IO。仓库大时可以限量：

```powershell
restic prune --max-repack-size 4G        # 重写 4G 后就停，中断安全，可多次续跑
restic prune --max-unused 5%             # 容忍 5% 未用数据就跳过（默认值）
restic prune --dry-run
```

`rewrite` 和 `prune` 不是一回事：它是在重写快照时把快照里本该被排除的数据剔除掉，用来回收入库时误收的垃圾，而不是删快照；0.19 起支持 `--include` 限定只重写匹配的快照。它属于改写快照的操作，动手前先把仓库整个复制一份，和 `repair` / `recover` 是同一级别的风险。

### 分组陷阱：`--group-by` 决定保留策略是否真的生效

**这是保留策略最常见的失效原因。** `--keep-*` 策略是**按组分别应用**的，默认分组是 `host,paths`。而路径列表一旦变化（新增/删除一个备份目录），就等于开了一个**新组**，每组各自保留一整套快照——结果是策略几乎不删任何东西，仓库无声地一直涨。

实测过一个真实仓库：9 个快照因为路径列表改过几次，被默认分组拆成 **7 个组**，每组 1–2 个快照，`--keep-daily 7` 在每组里都"保留 7 个"，于是一个都没删掉。改用按 tag 分组后变成 1 组，同样策略立刻能识别出 5 个可删快照。

```powershell
# 稳定分组：路径变了也不会分裂成新组
restic forget --group-by host,tags --keep-tag config-daily --keep-daily 7 --keep-weekly 4 --keep-monthly 12 --dry-run

# 确认 keep/remove 数量再实删
restic forget --group-by host,tags --keep-tag config-daily --keep-daily 7 --prune
```

配套习惯：

- 给每类备份打固定 `--tag`，分组和筛选都靠它，而不是靠路径。
- `--keep-tag` 用来保护某类快照不被策略删掉。
- 删之前一定先 `--dry-run`。删掉的东西如果还没被 `prune` 回收，可以用 `restic recover` 尝试找回（见下）。

脚本里解析 `forget --dry-run --json` 时注意：返回的是**按组的数组**，必须写成 `$json[0].remove` 而不是 `$json.remove`——后者会撞上 PowerShell 数组自带的 `.Remove()` 方法，拿到方法而不是数据。

## 改密码与多密钥

仓库可以有多个密钥，备份时用任意一个都能解开。轮换密码不会重写历史数据，只是新增密钥：

```powershell
restic key list                    # 现有密钥，注意 ID 和创建时间
restic key add                     # 加一个密钥，返回新 ID（交互输入新密码）
restic key passwd                  # 改主密码：新增密钥 + 删旧密钥
restic key remove <key-id>         # 删掉某个密钥，至少要留一个
```

**`key passwd` 会立即让旧密钥失效。** 确认新密码能解开仓库后再删旧的那一步；如果有其他机器/定时任务在用旧密码，记得同步更新它们的密码文件或 `RESTIC_PASSWORD_COMMAND`。

删密钥前先确认没有别的备份任务依赖它——多台机器共用一个仓库时尤其容易漏。

## 完整性校验

```powershell
restic check                              # 结构校验：索引、快照树、pack 完整性（快）
restic check --read-data-subset=1/50      # 抽读 1/50 的数据 pack，能发现位损坏
restic check --read-data                  # 全量读数据，最慢最彻底
restic check --with-cache                 # 复用已有缓存，只读未缓存部分
```

日常巡检用 `--read-data-subset` 抽读就够；重要归档节点跑一次全量 `--read-data`。数据有损坏风险（老硬盘、网盘同步盘）时应定期全量校验。

出错时的修复阶梯，从轻到重：

```powershell
restic repair index      # 索引损坏/不一致，重建索引（保留快照）
restic repair packs      # 抢救仍可读的 pack 文件，丢弃彻底损坏的块
restic repair snapshots  # 修复快照元数据
restic recover           # 找回被 forget 误删但尚未 prune 回收的数据
```

`repair` 和 `recover` 都是抢救操作，执行前**先整个仓库复制一份**。

## 恢复

**永远先恢复到临时目录，不要直接覆盖原地。** 这是保住"还能回到出错前状态"的唯一办法。

```powershell
# 先干跑，确认会恢复什么
restic restore latest --target C:\restore-test --include '/C/Users/me/.ssh' --dry-run

# 恢复到独立目录（Windows 上路径过滤器用 /C:/ 形式）
restic restore latest --target C:\restore-test --include '/C/Users/me/.ssh' --include '/C/Users/me/.gitconfig'

# 整树恢复：直接 --target 根目录
restic restore latest --target E:\

# 只恢复子目录
restic restore latest:C:/Users/me/.ssh --target C:\restore-test

# 校验恢复出来的文件内容
restic restore latest --target C:\restore-test --verify

# 删除目标目录里快照中已不存在的文件（危险，先 --dry-run -vv）
restic restore latest --target C:\somewhere --delete --dry-run -vv
```

其他有用开关：`--overwrite if-newer` / `if-changed` / `never` 控制覆盖策略（默认 `always`），`--include` / `--exclude` 精确圈定范围，`-i` / `-e` 与 `--iexclude` 分别是大小写敏感与不敏感版本。

不想把文件落到磁盘上，可以用 `restic mount <快照ID>` 把快照挂成一个本地目录直接浏览（Linux / macOS 走 FUSE）。**Windows 没有原生支持**，得自己装 FUSE 驱动（如 WinFSP）；装不了就退回 `ls` / `dump`，或者恢复到临时目录再看。

### Windows 上的无害报错

恢复时可能看到：

```
ignoring error for \C\Users: failed to restore timestamp of "...\C\Users": Access is denied.
Fatal: There were 1 errors
```

这是 restic 想恢复中间目录的时间戳但没权限，**数据本身已经完整写出来了**，退出码却是 1。判断恢复是否成功要看 `Summary: Restored N / M files/dirs` 那行的文件数和实际落盘内容，而不是只看退出码。实测恢复出的 `.gitconfig` 与源文件 SHA256 完全一致。

## 日常巡检脚本

`scripts/restic-health.ps1` 只读巡检，不动仓库。下面的命令**在技能目录下运行**（脚本按相对路径引用）：

```powershell
pwsh -File .\scripts\restic-health.ps1 -Repository 'F:\restic-repo' -PasswordFile 'F:\restic-repo\password.txt'

# 加上体积统计和更重的完整性抽读
pwsh -File .\scripts\restic-health.ps1 -Repository 'F:\restic-repo' -PasswordFile 'F:\restic-repo\password.txt' -Deep

# 把缓存挪离 C 盘
pwsh -File .\scripts\restic-health.ps1 -Repository 'F:\restic-repo' -PasswordFile 'F:\restic-repo\password.txt' -CacheDir 'B:\restic-cache'
```

退出码：`0` 健康、`1` 有告警但仓库可读、`2` 仓库读不了（不存在 / 锁住 / 密码错）。

脚本检查项：restic 可执行、密码文件权限（Windows 看 ACL，POSIX 看 mode）、快照数量与最新快照新鲜度（默认阈值 30 小时）、保留策略分组是否已经碎裂、完整性抽读、本地仓库的剩余空间和残留锁文件。

每条 restic 调用都有超时保护（`-TimeoutSec`，默认 120 秒）。这条对**网络后端是必需的**：实测连一个不可达的 rest-server 时，restic 会带退避反复重试，不加限制能挂好几分钟——在 cron 或计划任务里就是一次静默卡死。超时后脚本会区分本地（磁盘忙）和远端（网络或凭据问题）给出提示。

脚本在 Windows、macOS、Linux 上都能跑（PowerShell 7+），后端地址填本地路径或 `s3:` / `b2:` / `sftp:` / `rest:` / `rclone:` 都可以，网络后端会自动跳过本地专有的磁盘和锁文件检查。

注意脚本按仓库约定保持 ASCII-only（Windows PowerShell 5.1 会把无 BOM 的 UTF-8 当 ANSI 读，中文字面量会让整个脚本解析失败），所以面向用户的中文说明在 SKILL.md 里而不是脚本里。

## 计划任务 / 定时备份

Windows 上用任务计划程序跑一个 PowerShell 脚本比较稳（注意用 `powershell.exe` 时脚本必须 ASCII-only，见上）。几个实践要点：

- 任务里直接调 `powershell.exe -NoProfile -ExecutionPolicy Bypass -File <脚本>`，不依赖用户登录状态时用 S4U 登录类型。
- 脚本里自己设 `RESTIC_REPOSITORY` / `RESTIC_PASSWORD_FILE`，别指望继承交互式会话的环境变量。
- 退出码归一化：备份返回 0 或 3 都可以算成功，其余原样退出，让任务计划程序显示真实状态。
- 加 `StartWhenAvailable`，错过触发时间后开机补跑。
- 每次运行写独立日志文件，文件名带时间戳，便于回溯。

Linux / macOS 上直接用 systemd timer 或 cron 调 `restic backup`，同样把仓库和密码来源写进脚本或 EnvironmentFile。

## 异地副本

单盘上的仓库只能防误删，防不了整机丢失。加一个远端仓库并定期复制：

```powershell
# 目标仓库需要独立密码；用 RESTIC_FROM_* 指定源
$env:RESTIC_REPOSITORY        = 's3:s3.amazonaws.com/my-bucket/restic'
$env:RESTIC_PASSWORD_FILE     = 'D:\secrets\remote-pw.txt'
$env:RESTIC_FROM_REPOSITORY    = 'F:\restic-repo'
$env:RESTIC_FROM_PASSWORD_FILE = 'F:\restic-repo\password.txt'

restic copy --group-by host,tags          # 按组复制
restic init --from-repo F:\restic-repo --copy-chunker-params   # 建目标时复制分块参数
```

`copy` 会完整读写数据（两端密钥不同，无法增量传输），且**不做重新分块**，目标端可能和源端重复占用空间。建目标仓库时带上 `--copy-chunker-params` 可以避免去重失效。

## 排障速查

| 症状 | 原因与处理 |
| ---- | ---- |
| `Options -r and --repository-file are mutually exclusive` | 同时设了 `RESTIC_REPOSITORY` 和 `RESTIC_REPOSITORY_FILE`，清掉一个 |
| `Password file and command are mutually exclusive options` | 同时设了 `RESTIC_PASSWORD_FILE` 和 `RESTIC_PASSWORD_COMMAND`，清掉一个 |
| `Resolving password failed: exec: "type": executable file not found` | Windows 上 `RESTIC_PASSWORD_COMMAND` 直接写 `type` 不行，要写成 `cmd /c "type ..."` |
| `Fatal: All path filters must be absolute, starting with a forward slash` | 路径过滤器要写成 `/C:/Users/...`，不带冒号 |
| `Wrong password` / 退出码 12 | `RESTIC_PASSWORD_FILE` 指向错文件，或文件末尾有多余空行/换行 |
| 退出码 11，`repository is locked` | 上次进程被强杀留下锁。先确认没有 restic 在跑，再 `restic unlock` |
| 退出码 3 | 部分源文件读不到（正被占用）。快照已生成，属可接受 |
| 仓库一直变大，forget 删不动 | 分组被路径列表变化打散了，见上文分组陷阱 |
| 备份/巡检在网络后端上卡住不动 | restic 对不可达主机带退避重试；给命令加超时或先确认网络/凭据 |
| 换密码后别的机器解不开了 | `key passwd` 立刻作废旧密钥，其他机器的密码文件没同步更新 |
| prune 很慢 | 正常，`--max-repack-size` 限量后可中断续跑 |
| 磁盘写满导致 prune 失败 | `prune --max-repack-size 0` 先看看能回收多少，再考虑 `--unsafe-recover-no-free-space` |
| 备份耗时突然变长 | 备份了缓存/依赖目录/大日志，用 `restic backup --dry-run` 看清单 |
| `check` 报 pack 损坏 | 阶梯修复 `repair index` → `repair packs` → `check --read-data` |
| 换了台机器备份变成"新主机" | 主机名变了就等于换了一组，用 `--host` 固定，或在 `forget` 时带上对应 `-H` |

排查顺序按"低风险、低成本、高信息量"来：先 `restic snapshots` 确认仓库能读，再 `restic check` 看结构，最后才上 `--read-data` 全量校验。
