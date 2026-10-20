---
name: chatlog-keeper
description: 导出本地 QQ 与微信聊天记录（会话目录、消息流、图片解密、密钥管理），全程本地处理不上传
---

# Chatlog Keeper 技能

通过 [`chatlog-keeper`](https://github.com/labazhou2024/chatlog-keeper) 解密并导出**你自己**本机的 QQ / 微信聊天记录，产出 JSON + 一个自包含的 HTML 页面（按会话、按天分组的气泡样式）。全程离线，解密路径里没有任何网络代码，不上传、不采集、零遥测。

上游明确的边界：只处理**你自己账号**的数据，只读**你自己电脑上你本来就有权访问**的文件；不是破解他人加密，不侵入任何服务器。使用前请读上游 `DISCLAIMER.md`，并自行遵守所在法域法律与相关服务条款。

## 平台与系统要求

| 平台 | 支持 | 备注 |
|---|---|---|
| Windows | ✅ | 需登录运行本机的 QQ / 微信；**用 Release 独立 exe 安装**（venv / uv tool 装法读 QQ 会失败，见「安装」）；key 走被动内存扫描或一次性调试器；**`active` 会强杀正在运行的客户端** |
| macOS | ✅ | 仅 Apple Silicon；**微信 active 只对白名单版本生效**（如 4.1.11 / 4.1.12 / 4.1.13 / 4.1.15 的特定 build），其他版本 fail closed，只能手动喂 key |
| Linux | ✅ | 仅官方 Ubuntu / Debian x86_64 客户端；WeChat 取钥需带 Python 支持的 GDB；默认 `kernel.yama.ptrace_scope=1` 会拒绝被动读内存，**不要用 root 绕过 Yama** |

- Python ≥ 3.9（`requires-python = ">=3.9"`）——仅源码安装需要；**Windows 用独立 exe 时无需本机 Python**
- Windows 安装方式：Release 独立 `chatlog-keeper.exe`（见「安装」）；macOS / Linux 可用 `uv tool install`
- **不需要管理员 / UAC**：上游说明 Windows 主动取钥"只在当前用户下启动并调试一个全新的子进程，不请求 UAC/admin"
- **QQ / 微信客户端需处于登录运行状态**（取钥与在线读取都要用到你本机的数据）

核心依赖：`pycryptodome`、`numpy`、`zstandard`。可选 extras：`images` = `Pillow`，`ocr` = `rapidocr-onnxruntime`（**独立 exe 未打包这两个**，见「images」）。

## 安装

> ⚠️ **PyPI 上没有 `chatlog-keeper`**（上游在 `pyproject.toml` 里明确写了本包**故意只发源码、不发布到 PyPI**）。不要用 `pip install chatlog-keeper`，一律从源码安装。

### Windows（推荐：独立可执行文件）

**为什么不直接用 uv tool / venv 安装**：Windows 上读 QQ 的 NTQQ"shifted"数据库时，工具会启动一个隔离读取器，它**硬性要求 SQLite 恰好为 `3.53.2`**，并要求 sqlite3 DLL 位于 Python 前缀内。结果是：

- `uv tool install`、`pipx`、venv 内的 `pip install` **在 Windows 上读 QQ 都会失败**并报 `QQShiftedSQLiteError`；
- 只有**非 venv** 的 `python -m pip install .` 且该 Python 恰好自带 SQLite `3.53.2` 才有机会工作（罕见且难凑）；
- **最省事、上游支持的方式 = Release 独立 exe**（自带锁定的 SQLite 3.53.2）。

从 GitHub Release 下载独立 exe 并校验（`gh` 或浏览器均可）：

```powershell
# 查最新 tag，不要写死版本号
$tag = gh release list -R labazhou2024/chatlog-keeper --limit 1 --json tagName -q .tagName
$dir = "$env:LOCALAPPDATA\Programs\chatlog-keeper"   # 或你习惯的任意可写目录
New-Item -ItemType Directory -Force -Path $dir | Out-Null
gh release download -R labazhou2024/chatlog-keeper $tag `
  -p chatlog-keeper.exe -p chatlog-keeper.exe.sha256 -D $dir --clobber
# 校验 sha256
$exp = (Get-Content "$dir\chatlog-keeper.exe.sha256").Trim().Split()[0]
(Get-FileHash "$dir\chatlog-keeper.exe" -Algorithm SHA256).Hash.ToLower() -eq $exp
Unblock-File "$dir\chatlog-keeper.exe"   # 解除"下载自网络"标记
```

把它加入用户 PATH，之后可直接用 `chatlog-keeper`（新开终端生效）：

```powershell
$dir = "$env:LOCALAPPDATA\Programs\chatlog-keeper"
$cur = [Environment]::GetEnvironmentVariable("Path","User")
if (($cur -split ';') -notcontains $dir) {
  [Environment]::SetEnvironmentVariable("Path", $cur.TrimEnd(';') + ';' + $dir, "User")
}
```

不改 PATH 也行——直接用全路径调用即可。数据目录若不自动探测到，再按「定位数据目录」一节设置 `CHATLOG_QQ_DATA_ROOT` / `CHATLOG_WECHAT_DATA_ROOT`。

### macOS / Linux（源码 + uv tool）

Windows 专属的 shifted 读取器不适用于 macOS / Linux，用常规 `uv tool install`：

```bash
git clone https://github.com/labazhou2024/chatlog-keeper.git "<持久目录>/chatlog-keeper"
uv tool install --force "<持久目录>/chatlog-keeper"
```

更新已有源码（不要用 `uv tool upgrade`，那会走 PyPI）：

```bash
git -C "<持久目录>/chatlog-keeper" pull --ff-only
uv tool install --force "<持久目录>/chatlog-keeper"
```

macOS 另有 release 二进制 `chatlog-keeper-macos-arm64`。源码安装首次取钥时会现场编译只读的 C 辅助程序（macOS 需 Xcode Command Line Tools，Linux 需 `build-essential`）。

### 通用源码安装（⚠️ 非 Windows 推荐路径）

```bash
git clone https://github.com/labazhou2024/chatlog-keeper.git "<持久目录>/chatlog-keeper"
cd "<持久目录>/chatlog-keeper"
python -m pip install .
```

> ⚠️ Windows 上源码 / venv 安装**不能读 QQ**（原因见上），请改用上面的独立 exe。

验证安装：

```powershell
chatlog-keeper --help
```

> ⚠️ **没有 `--version` 参数**。`chatlog-keeper --version` 会因 argparse 报 `the following arguments are required: cmd` 并以退出码 **2** 结束。独立 exe 无内嵌版本号，看 Release tag 或用 `probe` 输出判断。
>
> 退出码约定（读 stdout 时用得上）：`2` = 参数用法错误（含不存在的参数）；`1` = 多数子命令失败时返回。**`0` 不等于成功**——`probe` 和 `images` 无论成败都退出 `0`（前者可能 `available:false`，后者可能 `decrypted:0, failed:N`）。判断成败一律读 stdout JSON 字段（`available` / `ok` / `error` / `decrypted` / `failed`），不要只看退出码。

## 客户端版本决定路径——先读版本再动手

| 客户端 | 版本 | 后果 |
|---|---|---|
| QQ（NTQQ） | < 9.9.21.38503 | 被动内存扫描可拿到可用 key |
| QQ（NTQQ） | ≥ 9.9.21.38503 | 登录成功后明文 key 即被销毁，被动扫描捞到的是残留数据，**解不开库** |
| 微信（WeChat） | < 4.1.10.31 | 明文 key 仍在进程堆，被动扫描可用 |
| 微信（WeChat） | ≥ 4.1.10.31 | 明文 key 已移出进程堆，被动扫描找不到，必须用 `active` 或手动喂 key |

**读真实版本，别信 `ProductVersion`**：QQ 看 `<安装目录>\versions\<版本>` 目录名（`QQ.exe` 的 `ProductVersion` 属性常是旧值或某个子模块的版本）；微信 `Weixin.exe` 的 `ProductVersion` 够用。

> 上表 QQ 两行来自单机实测（9.9.36-53644），上游文档与源码均未记录，**不代表其他版本行为相同**。换版本请重新验证。

### 已知上游缺陷：部分 QQ 版本读不了

部分较新的 NTQQ 版本（实测 9.9.36-53644）的 `nt_msg.db` 存在两种结构特征，导致上游 `chatlog-keeper qq` **即使 key 完全正确也会失败**：

1. 数据库物理页数**大于** SQLite 文件头声明的页数（尾部约 2 万页是预留区，非数据）；
2. 上游按**物理文件末尾**循环解密，遇到预留区页认证失败即抛 `OSError`。

典型报错：`QQ database decryption failed: OSError` / `shifted NTQQ database failed authenticated decryption`。**这是上游缺陷，不是你的 key 错了**，不要反复重取 key。

规避办法（按需加载）：解出第 1 页后读文件头 28-32 字节的**声明页数**，只解密到该页数为止，尾部预留区跳过。这需要自己写解密逻辑（SQLCipher 4：`PBKDF2-HMAC-SHA512` 4000 次、页大小 4096、页 HMAC 与 reserve 依版本而定，务必用 page-1 HMAC 逐组验证候选参数）。本 skill 不提供现成脚本，各版本参数可能不同。

## 密钥与初始化

> 下文示例用 `chatlog-keeper` 代指可执行文件；Windows 上的实际调用路径见「命令参考」开头的约定。

### probe —— 先看状态（安全、瞬时、不扫内存）

```powershell
chatlog-keeper probe
```

`probe` 只做本机状态探测：数据目录能否发现、客户端是否运行、**缓存里**有没有已验证的 key。它**不会取钥、不会扫描进程内存**，可以随时放心跑。

> ⚠️ **`probe` 不接受任何参数**（包括 `--data-root`）。要指定数据目录用环境变量 `CHATLOG_QQ_DATA_ROOT` / `CHATLOG_WECHAT_DATA_ROOT`。`probe` 永远退出 `0`，成败看 JSON 里的 `available`。

输出示例（`available: false`：客户端在运行，但本机没探测到可用数据目录、缓存里也没有 key）：

```json
{
  "qq": {
    "source": "qq",
    "available": false,
    "client_running": true,
    "account": null,
    "db_path": null,
    "key_present": false,
    "needs_key": false,
    "native_account_binding": { "schema": "chatlog-keeper.native-account-binding.v1", "state": "unavailable", "...": "..." }
  },
  "wechat": {
    "source": "wechat",
    "available": false,
    "client_running": true,
    "wxid_dir": "<本机微信数据目录>\\wxid_xxxxx",
    "enc_keys_present": false,
    "needs_key": false,
    "protocol_capabilities": ["key-identity-v1"],
    "native_account_binding": { "schema": "chatlog-keeper.native-account-binding.v1", "state": "unavailable", "...": "..." }
  }
}
```

> `wxid_dir`、`db_path` 这类字段给的是**本机实际探测到的绝对路径**，示例里已换成占位符。换台机器字段形状相同、值不同——这正是需要 `--data-root` 的原因，见下节。

### extract-key —— 取钥

```powershell
# auto（默认）：先被动，失败才回退主动
chatlog-keeper extract-key --source wechat

# 只要被动（风险最低；WeChat 4.1.10.31+ 上可能取不到）
chatlog-keeper extract-key --source wechat --method passive

# 只要主动（新版本客户端才需要；风险高，见下方警告）
chatlog-keeper extract-key --source wechat --method active

# 数据目录被挪走过时显式指定
chatlog-keeper extract-key --source wechat --method active --data-root "E:\xwechat_files"
```

选项：`--source {qq,wechat}`（必填）、`--method {auto,passive,active}`（默认 `auto`）、`--data-root DIR`

> 🔴 **`--method active` 高危警告（务必先读）**
>
> - **Windows 上 `active` 会强制结束你正在运行的客户端。** 通过 CLI 调用（`extract-key --method active`）时，工具不会做单实例预检，而是对所有 `QQ.exe` / `Weixin.exe` 执行 `Stop-Process -Force`，再拉起被调试的副本。**先从托盘菜单正常退出客户端**——正常退出会把数据落盘，强杀可能丢失未写完的聊天数据。上游把这条路径的风险评为**中–高**。
> - macOS / Linux 路径不同：它们会检测到日常客户端仍在运行并返回 `daily_client_single_instance_conflict`，**不做强杀**。上面那条「不要强制结束」只对这两个平台和工具的私有恢复协议成立。
> - **`auto` 的回退目标就是 `active`**：微信 4.1.10.31 起明文 key 已移出进程堆，被动扫描找不到，`auto` 会自动走到调试器这条路上。所以"用默认参数"并不等于"安全"。
> - **取钥期间不要使用客户端**：工具会拉起副本并在结束时终止它自己拉起的那个，但你的日常账号会被强制登出。
> - 更安全的顺序：`probe` → `--method passive` → 不行就用 `set-key --key-stdin` 手动喂 key。**只有在 passive 与手动都失败时才考虑 active。**
> - **取钥的"成功"有两层含义**：`extract-key` 返回 `ok: true` 只代表**取钥阶段**成功，不代表**解密阶段**可行。看 `fresh_extraction` 字段——`false` 表示本次没有真正扫描、只是复用了缓存里的旧 key（删掉缓存文件再重扫）；`true` 表示确实新扫到了，但仍可能解不开（见上文版本闸门）。**别用取钥成功代表导出可用。**

### set-key —— 手动提供 key

```powershell
# 推荐：key 走 stdin，不进进程列表 / shell 历史
chatlog-keeper set-key --source wechat --key-stdin
chatlog-keeper set-key --source qq --key-stdin
```

粘贴 key 后发送 EOF：Windows 上是 `Ctrl+Z` 然后回车；macOS / Linux 上是 `Ctrl+D`。

> ⚠️ `--key <key>` 仅为兼容保留：会把密钥暴露在 argv 和 shell 历史里，**不要用**。

选项：`--source {qq,wechat}`（必填）、`--data-root DIR`、`--key KEY` / `--key-stdin` / `--key-identity-stdin`（三选一，必填其一）

> **key 格式**：QQ 是 16 或 32 位可打印 ASCII；微信是 **64 位十六进制**（32 字节）。格式不对会被直接拒收（如 `invalid WeChat key (expect 64 hex chars)`）。微信的 key 会对着本机 `message_*.db` 做 HMAC 校验后才写入缓存。

### 密钥缓存位置

取到的 key 会缓存在本机并在后续导出时复用（**尽量复用缓存，不要反复重取**）：

- Windows：`%LOCALAPPDATA%\chatlog-keeper\data\secrets\`
- macOS：`~/Library/Application Support/chatlog-keeper/secrets/`
- Linux：`$XDG_DATA_HOME/chatlog-keeper/secrets/`（通常是 `~/.local/share/chatlog-keeper/secrets/`）

**实际写入的是按账号命名的子路径，不只是目录根下的单个文件：**

```
secrets/
├── qq_accounts/<sha256(QQ号)>.key           # 例：sha256("2074244117")
├── wechat_accounts/<sha256(账号目录名)>.key   # 例：sha256("wxid_xxx_3c00")
├── qq_db.key                                # 全局兜底
└── wechat_db.key
```

读取顺序是**账号级优先、全局兜底**。所以想强制重新提取：把**两个 `*_accounts/` 子目录整个删掉**（可连同全局 `.key` 一起删），只删 `qq_db.key` 不一定生效。

macOS / Linux 下目录权限 `0700`、密钥文件 `0600`；Windows 下用受保护 ACL 只放行当前用户与 LocalSystem，ACL 设置或校验失败会直接拒收密钥。

## 命令参考

> 下文示例把可执行文件统一记作 `chatlog-keeper`。**Windows**：`& "<你安装 chatlog-keeper.exe 的目录>\chatlog-keeper.exe" <子命令>`（把该目录加入 PATH 后可省略路径）；**macOS / Linux**：`chatlog-keeper`，不在 PATH 时用 `uv tool run chatlog-keeper`（venv 内 pip 安装用 `python -m chatlog_keeper.cli ...`）。

### probe —— 状态探测

```powershell
chatlog-keeper probe
```

无参数。输出 JSON 到 stdout，**无论 `available` 真假都退出 `0`**——判断成败必须读 JSON 字段。

### directory —— 列账号与会话（不读消息正文，但**需要一把已可用的 key**）

```powershell
chatlog-keeper directory --source qq
chatlog-keeper directory --source wechat
chatlog-keeper directory --source wechat --account "wxid_xxxxx"
```

> ⚠️ 它**不会去取钥**（内部以 `allow_live_key_extract=False` 构造 reader，不扫内存、不注入），但**没有可用 key 时它列不出任何会话**，返回 `available:false` + 空列表 + 退出码 `1`。报 `No verified cached key is available…` 或 `Cached QQ key does not unlock…` = **key 的问题**，不是数据目录配错——这两种情况的 JSON 形状一样，无法从输出区分。正确顺序：`probe` → `extract-key` → `directory`。

选项：`--source {wechat,qq}`（必填）、`--data-root DIR`、`--account ACCOUNT`（限定某个已发现的账号）

纯元数据查询（内部以 `allow_live_key_extract=False` 构造 reader，不扫内存、不取钥）。数据目录探测不到时返回 `available: false` + 空列表并以退出码 `1` 结束——这是"没找到"，不是"缺密钥"。

### qq / wechat —— 导出消息

```powershell
chatlog-keeper qq --days 30 --out .\out
chatlog-keeper wechat --days 30 --out .\out
chatlog-keeper wechat --days 7 --out .\out --account "wxid_xxxxx"
chatlog-keeper qq --days 30 --out .\out --conversation "123456789"
```

选项（两者一致，只有 `--data-root` 含义不同）：

| 选项 | 说明 |
|---|---|
| `--days N` | 回看天数，默认 `7` |
| `--out DIR` | 输出目录（必填） |
| `--data-root DIR` | `qq` 覆盖 `Tencent Files` 目录；`wechat` 覆盖 `xwechat_files` 目录；不给则自动探测 |
| `--account ACCOUNT` | 只导出某个已发现账号，可重复 |
| `--conversation CONVERSATION` | 只导出某个原生会话，可重复 |
| `--selection-stdin` | 从 stdin 读 `account_ids` / `conversation_ids` JSON（可选精确 `conversation_scopes`） |

### images —— 解密微信图片 .dat

```powershell
chatlog-keeper images --src "<微信图片文件夹>" --out .\out\images
```

选项：`--src SRC`（必填，`.dat` 文件所在目录）、`--out OUT`（必填）

> ⚠️ **独立 exe 里没有打包 Pillow**（上游 release 只锁 numpy / pycryptodome / zstandard），所以 exe 用户装不了 `images` extra。Pillow 只用于可选的 OCR / 空帧启发式，代码里有无 PIL 的回退路径；`ocr` extra（rapidocr-onnxruntime）同理未打包。
>
> 微信 4.x 的 `.dat`（V2 格式）需要一个从运行中 `Weixin.exe` 内存提取的 AES key，取不到就整批失败——表现为 `decrypted:0, failed:N`，**但退出码仍是 `0`**。`wxgf` → `jpg` 另需 PATH 上有 `ffmpeg`，没有则输出 `.bin`。
>
> 源码安装想要 OCR：`python -m pip install ".[images,ocr]"`。

### 机器可读契约子命令（面向宿主集成）

四个"冻结"的本地 IPC 协议能力，用于让宿主程序安全绑定本地数据，不导出消息正文：

```powershell
chatlog-keeper key-identity-v1 --capabilities
chatlog-keeper native-account-binding-v1 --capabilities
chatlog-keeper message-stream-v1 --capabilities
chatlog-keeper message-stream-v1 --selection-stdin
chatlog-keeper participant-directory-v1 --capabilities
chatlog-keeper participant-directory-v1 --selection-stdin
```

| 子命令 | 用法 |
|---|---|
| `key-identity-v1` | 仅 `--capabilities`，输出冻结的微信 key identity 能力契约 |
| `native-account-binding-v1` | 仅 `--capabilities`，输出不透明的原生账号绑定契约 |
| `message-stream-v1` | `--capabilities` 或 `--selection-stdin` 二选一；把有界的 QQ/微信消息页以本地 NDJSON 流式输出 |
| `participant-directory-v1` | `--capabilities` 或 `--selection-stdin` 二选一；分页输出纯元数据的成员 / 观察到的发送者 |

后两个还支持 `--data-root DIR` 覆盖所选数据源的本地根目录。

> 顶层帮助里还列了一个 `key-recovery-v1`，其说明被上游刻意屏蔽（显示为 `==SUPPRESS==`），属内部/未公开接口，不要依赖。

## 定位数据目录

`--data-root` 填的是**数据根目录**，不是数据库文件本身：

| 数据源 | `--data-root` 填什么 | 数据库文件实际在哪 |
|---|---|---|
| `qq` | `Tencent Files` 目录 | `<Tencent Files>\<QQ号>\nt_qq\nt_db\nt_msg.db` |
| `wechat` | `xwechat_files` 目录（也可直接填某个**账号子目录**） | 在该目录下的各账号子目录中 |

### 自动探测只覆盖固定布局

探测按固定顺序试以下位置，**不是**全盘搜索：

1. 环境变量（`CHATLOG_QQ_DATA_ROOT` / `CHATLOG_WECHAT_DATA_ROOT`）
2. `qq`：文档目录（含 Windows 文件夹重定向与 OneDrive 的 `Documents` / `文档` 变体）下的 `Tencent Files`；每个盘根下的 `Tencent Files` 与 `<盘根>\Documents\Tencent Files`
3. `wechat`：每个盘根下的 `wechat files\xwechat_files`、`<盘根>\xwechat_files`、`<盘根>\WeChat Files`；文档目录下的 `xwechat_files` 与 `WeChat Files`

**很多用户会把数据目录挪到这些布局之外**——自定义目录、改过名的目录、网盘同步目录、深度嵌套的应用数据目录等。这时 `probe` / `directory` 会报 `available: false`（退出码 `1`），必须显式传 `--data-root` 或设环境变量。

### 跨盘搜索（通用）

`available: false` 时，先全盘找 `nt_msg.db`。

**Windows（PowerShell）：**

```powershell
Get-PSDrive -PSProvider FileSystem | ForEach-Object {
  & where.exe /r "$($_.Root)" nt_msg.db 2>$null
}
```

**macOS / Linux（bash / zsh）：**

```bash
find / -name nt_msg.db -path '*nt_db*' 2>/dev/null | head
```

输出形如（路径因人而异）：

```
C:\Users\<用户名>\Documents\Tencent Files\<QQ号>\nt_qq\nt_db\nt_msg.db
E:\Tencent Files\<QQ号>\nt_qq\nt_db\nt_msg.db
```

要传给 `--data-root` 的是 **`nt_db` 的上一级、也就是 `Tencent Files` 目录**（`\<QQ号>` 的父目录）。`--data-root` 要给到**目录**，不是数据库文件本身：

```powershell
# 目录名通常带空格，务必加引号
$env:CHATLOG_QQ_DATA_ROOT = "E:\Tencent Files"
chatlog-keeper probe
chatlog-keeper qq --days 30 --out .\out --data-root "E:\Tencent Files"
```

> `probe` 不接受 `--data-root`（报 argparse 错误并退 `2`），要指定目录用环境变量；`directory` / `qq` / `wechat` 才支持 `--data-root`。

> 这是只读的目录遍历，全盘扫描可能要几分钟；先确认 `probe` 报 `available: false` 再跑。

微信同理（全盘找 `db_storage`，或找账号子目录名）：

```powershell
Get-PSDrive -PSProvider FileSystem | ForEach-Object {
  & where.exe /r "$($_.Root)" db_storage 2>$null
}
$env:CHATLOG_WECHAT_DATA_ROOT = "<某个 xwechat_files 目录>"
chatlog-keeper probe
```

```bash
# macOS / Linux
find / -type d -name 'xwechat_files' 2>/dev/null | head
```

> 微信 4.x 的账号子目录名形如 `wxid_xxx_<hash>`，**不是裸 wxid**；`--data-root` 填**包含账号子目录的那一层**（`xwechat_files`），不是账号目录本身。

### 用环境变量代替每次传参

```powershell
$env:CHATLOG_QQ_DATA_ROOT = "<Tencent Files 目录>"
chatlog-keeper probe
```

```bash
# macOS / Linux
export CHATLOG_QQ_DATA_ROOT="/path/to/Tencent Files"
chatlog-keeper probe
```

微信把变量名换成 `CHATLOG_WECHAT_DATA_ROOT`、值填 `xwechat_files` 目录：

```powershell
$env:CHATLOG_WECHAT_DATA_ROOT = "<xwechat_files 目录>"
chatlog-keeper probe
```

写成用户级变量可长期生效（需新开终端）：

```powershell
[Environment]::SetEnvironmentVariable("CHATLOG_QQ_DATA_ROOT", "<Tencent Files 目录>", "User")
```

### 传对了还是 `available: false`

1. **QQ 账号子目录名必须是纯数字**。Windows 上只认纯数字目录名（macOS / Linux 才允许哈希式不透明目录名）。若你的 QQ 账号目录不是纯数字，手动指定到该账号目录通常无效——这种情况用 `directory --source qq` 配合 `--data-root` 再确认一次。
2. **数据库存在但为空**：探测要求 `nt_msg.db` 存在**且大小大于 0**。刚装客户端还没产生消息时，先在客户端里收发一条再试。
3. **目录名被改过**：只要下面这种结构在（`<Tencent Files>\<账号>\nt_qq\nt_db\nt_msg.db`，旧版也可能少一层 `nt_qq`），`--data-root` 直接填改名后的根目录即可，不必非得叫 `Tencent Files`。
4. **多账号**：一个 `Tencent Files` 下可以有多个纯数字账号目录，导出时用 `--account <QQ号>` 指定。

## 输出格式

- `qq` / `wechat`：把 JSON + HTML 写进 `--out` 目录，完成后用浏览器打开 `out/*_messages.html` 即可回看
- `probe` / `directory`：JSON 打到 stdout（适合 AI 解析与脚本处理）
- `images`：按 `--out` 输出解密后的 jpg / png
- 全部子命令都支持 `--help`
- 数据目录自动探测失败时，用 `--data-root` 显式指定，或设环境变量 `CHATLOG_QQ_DATA_ROOT` / `CHATLOG_WECHAT_DATA_ROOT`
- 解密是**逐页流式**的（峰值内存约一个 4 KB 页），多 GB 的数据库也不会整份载入；活跃数据库会先复制成一致的私有副本（`db`、`-wal`、`-shm`）

## 常用命令速查

| 命令 | 用途 |
|---|---|
| `probe` | 探测本机可用性与缓存 key 状态（不取钥、不扫内存） |
| `directory --source qq` | 列 QQ 账号与会话（不读消息正文） |
| `directory --source wechat` | 列微信账号与会话 |
| `qq --days 30 --out DIR` | 导出最近 30 天 QQ 记录（JSON + HTML） |
| `wechat --days 30 --out DIR` | 导出最近 30 天微信记录 |
| `qq --days N --out DIR --conversation C` | 只导出会话 C |
| `images --src SRC --out OUT` | 解密微信 .dat 图片为 jpg / png |
| `extract-key --source wechat --method passive` | 被动取钥（风险最低，优先用） |
| `extract-key --source wechat --method active` | 主动取钥（高危，见警告） |
| `set-key --source qq --key-stdin` | 手动从 stdin 喂 key |
| `key-identity-v1 --capabilities` | 输出 key identity 能力契约 |

## 注意事项

1. **只读工具**：本工具只能查和导出，**没有发消息、加好友、修改数据库的能力**。要发消息请用 Agent 自身的消息发送能力，不要去找第三方自动化库。
2. **只导自己的数据**：仅限你自己账号、自己本机的数据。绝不要用于任何服务端自动化（批量加好友、模拟发言、多开、插件外挂、伪造定位等）——那才是真正容易封号的区域。
3. **风险取决于取钥方式**（上游评估）：读本地数据库文件 ≈ 无风险（纯文件读、服务端感知不到）；被动内存扫描 = 低风险（只读进程内存，不注入、不挂钩、不附加调试器）；**Windows 主动取钥 = 中–高风险**，且会**强制结束正在运行的客户端**（`Stop-Process -Force`），可能丢失未落盘数据；macOS / Linux 主动取钥 = 兼容性敏感，不做强杀。
4. **`auto` 会回退到 active**：微信 4.1.10.31+ 被动取不到 key 时，默认参数会自动走调试器。要控制风险就显式写 `--method passive`。
5. **主动取钥前先正常退出客户端**：Windows 上工具会强杀进程，**从托盘菜单正常退出**能让数据落盘，强杀则可能丢失未写完的聊天记录。macOS / Linux 会直接拒绝运行并提示你先退出。
6. **取钥成功 ≠ 导出可用**：`extract-key` 的 `ok: true` 只代表取钥阶段成功。判断能不能导出的闸门是 `directory` 是否返回 `available: true` 且会话列表非空。
7. **腾讯的现实风险主要是项目级**：上游指出对这类工具的主要执法手段是要求代码托管平台把仓库下架（DMCA），而非封个人账号——这与"导出自己数据"的个人风险是两回事。
8. **降低风险的做法**：优先被动、复用缓存而不是反复重取、甚至可以**退出客户端后离线解密**。
9. **数据目录必须能被发现或显式指定**：自动探测只覆盖固定布局（QQ 看 `<文档>\Tencent Files`，微信看各盘根下的 `wechat_files\xwechat_files` / `xwechat_files` / `WeChat Files`）。数据目录被挪到别处就会报 `available: false`——按「定位数据目录」一节跨盘搜索后用 `--data-root` 或 `CHATLOG_QQ_DATA_ROOT` / `CHATLOG_WECHAT_DATA_ROOT` 指定。
10. **Windows 没有 `--version`**：独立 exe 看 Release tag；**退出码 `0` 不等于成功**（`probe` / `images` 永远退 0），要读 stdout JSON 字段判断。
11. **`--key` 会泄露密钥**：只在必要时用 `--key-stdin`。
12. **合规**：只处理你自己账号、你自己电脑上已有权限访问的数据；全程本地处理、不联网、不上传。使用者需自行遵守所在法域法律与相关服务条款。
13. **上游仍是较年轻的 CLI 优先项目**（JSON/HTML 输出，没有内置统计分析），macOS 目标平台是 Apple Silicon、Linux 面向官方 x86_64 客户端（非 Wine），新版本客户端的适配可能滞后。
