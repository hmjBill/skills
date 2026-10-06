---
name: chatlog-keeper
description: 导出本地 QQ 与微信聊天记录（会话目录、消息流、图片解密、密钥管理），全程本地处理不上传
---

# Chatlog Keeper Skill

通过 [`chatlog-keeper`](https://github.com/labazhou2024/chatlog-keeper) 解密并导出**你自己**本机的 QQ / 微信聊天记录，产出 JSON + 一个自包含的 HTML 页面（按会话、按天分组的气泡样式）。全程离线，解密路径里没有任何网络代码，不上传、不采集、零遥测。

上游明确的边界：只处理**你自己账号**的数据，只读**你自己电脑上你本来就有权访问**的文件；不是破解他人加密，不侵入任何服务器。使用前请读上游 `DISCLAIMER.md`，并自行遵守所在法域法律与相关服务条款。

## 平台与系统要求

| 平台 | 支持 | 备注 |
|---|---|---|
| Windows | ✅ | 需登录运行本机的 QQ / 微信；key 走被动内存扫描或一次性调试器 |
| macOS | ✅ | 官方仅测 Apple Silicon；主动取钥需先从菜单正常退出日常客户端 |
| Linux | ✅ | 仅官方 Ubuntu / Debian x86_64 客户端；WeChat 取钥需带 Python 支持的 GDB |

- Python ≥ 3.9（`requires-python = ">=3.9"`）
- 本机安装方式：`uv tool install`（隔离环境 + shim，不污染系统 Python）
- **不需要管理员 / UAC**：上游说明 Windows 主动取钥"只在当前用户下启动并调试一个全新的子进程，不请求 UAC/admin"
- **QQ / 微信客户端需处于登录运行状态**（取钥与在线读取都要用到你本机的数据）

核心依赖：`pycryptodome`、`numpy`、`zstandard`。可选 extras：`images` = `Pillow`，`ocr` = `rapidocr-onnxruntime`。

## 安装

> ⚠️ **PyPI 上没有 `chatlog-keeper`**（上游在 `pyproject.toml` 里明确写了本包**故意只发源码、不发布到 PyPI**）。不要用 `pip install chatlog-keeper`，一律从源码安装。

**本机约定（vendor 源码目录 + uv tool，Windows 已验证）**：

```powershell
git clone https://github.com/labazhou2024/chatlog-keeper "B:\Develops\Projects\vendor\chatlog-keeper"
uv tool install --force "B:\Develops\Projects\vendor\chatlog-keeper"
```

已安装路径示例：shim 在 `B:\Develops\DevRuntimes\uv-tools-bin\chatlog-keeper.exe`（uv tool 的 shim 目录，通常已在 PATH）。

**通用写法（任意持久目录）**：

```powershell
git clone https://github.com/labazhou2024/chatlog-keeper.git "<持久目录>\chatlog-keeper"
uv tool install --force "<持久目录>\chatlog-keeper"
```

**更新已有源码**（不要用 `uv tool upgrade`，那会走 PyPI）：

```powershell
git -C "<持久目录>\chatlog-keeper" pull --ff-only
uv tool install --force "<持久目录>\chatlog-keeper"
```

**备选（venv 内 pip install .，上游 README 的方式）**：

```powershell
git clone https://github.com/labazhou2024/chatlog-keeper.git "<持久目录>\chatlog-keeper"
cd "<持久目录>\chatlog-keeper"
python -m pip install .
```

上游还为 tag 版本提供独立可执行文件（Windows `chatlog-keeper.exe`、macOS `chatlog-keeper-macos-arm64`、Linux `chatlog-keeper-linux-x86_64`），从同一 GitHub Release 下载并用旁边的 `.sha256` 校验；源码安装在首次取钥时会现场编译几个只读的 C 辅助程序（macOS 需 Xcode Command Line Tools，Linux 需 `build-essential`）。

验证安装：

```powershell
chatlog-keeper --help
```

> ⚠️ **没有 `--version` 参数**。`chatlog-keeper --version` 会因 argparse 报 `the following arguments are required: cmd` 并以退出码 **2** 结束。版本请用 `uv tool list` 查看。
>
> 退出码约定（读 stdout 时用得上）：`0` = 正常；`1` = JSON 里 `available: false` 或含 `error`（**不是崩溃**，内部异常会被刻意折叠成同一份安全 JSON 形状）；`2` = 参数用法错误。

## 密钥与初始化

### probe —— 先看状态（安全、瞬时、不扫内存）

```powershell
chatlog-keeper probe
```

`probe` 只做本机状态探测：数据目录能否发现、客户端是否运行、**缓存里**有没有已验证的 key。它**不会取钥、不会扫描进程内存**，可以随时放心跑。

实测输出（本机，`available: false`，两个客户端都在运行但缓存无 key）：

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
    "wxid_dir": "B:\\Users\\Documents\\WeChat Files\\wxid_c0ha6n6tr7un12",
    "enc_keys_present": false,
    "needs_key": false,
    "protocol_capabilities": ["key-identity-v1"],
    "native_account_binding": { "schema": "chatlog-keeper.native-account-binding.v1", "state": "unavailable", "...": "..." }
  }
}
```

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
> - Windows 的 active 方式会在 cipher 边界**启动并调试一个独立的客户端副本**；上游把这条路径的风险评为**中–高**（"仅在被动失败时使用"）。它会在你正在运行的客户端旁边拉起第二个被调试的实例，结束后终止的也正是**它自己拉起的那个副本**。
> - **`auto` 的回退目标就是 `active`**：微信 4.1.10.31 起明文 key 已移出进程堆，被动扫描找不到，`auto` 会自动走到调试器这条路上。所以"用默认参数"并不等于"安全"。
> - **日常客户端正在运行时不要走 active**。QQ / 微信是单实例应用；macOS / Linux 路径的前置检查会检测到日常客户端仍在运行并返回 `daily_client_single_instance_conflict`，要求你**从菜单正常退出**（上游明确说不要强制结束）。在 Windows 上同样建议先正常退出客户端再取主动 key。
> - 更安全的顺序：`probe` → `--method passive` → 不行就用 `set-key --key-stdin` 手动喂 key。**只有在 passive 与手动都失败时才考虑 active。**

### set-key —— 手动提供 key

```powershell
# 推荐：key 走 stdin，不进进程列表 / shell 历史
chatlog-keeper set-key --source wechat --key-stdin
chatlog-keeper set-key --source qq --key-stdin
```

粘贴 key 后发送 EOF：Windows 上是 `Ctrl+Z` 然后回车；macOS / Linux 上是 `Ctrl+D`。

> ⚠️ `--key <key>` 仅为兼容保留：会把密钥暴露在 argv 和 shell 历史里，**不要用**。

选项：`--source {qq,wechat}`（必填）、`--data-root DIR`、`--key KEY` / `--key-stdin` / `--key-identity-stdin`（三选一，必填其一）

### 密钥缓存位置

取到的 key 会缓存在本机并在后续导出时复用（**尽量复用缓存，不要反复重取**）：

- Windows：`%LOCALAPPDATA%\chatlog-keeper\data\secrets\`
- macOS：`~/Library/Application Support/chatlog-keeper/secrets/`
- Linux：`$XDG_DATA_HOME/chatlog-keeper/secrets/`（通常是 `~/.local/share/chatlog-keeper/secrets/`）

macOS / Linux 下目录权限 `0700`、密钥文件 `0600`；Windows 下用受保护 ACL 只放行当前用户与 LocalSystem，ACL 设置或校验失败会直接拒收密钥。

## 命令参考

> 统一用 `chatlog-keeper`。若不在 PATH，改用 `uv tool run chatlog-keeper ...`；在 venv 内 pip 安装的场景用 `python -m chatlog_keeper.cli ...`。

### probe —— 状态探测

```powershell
chatlog-keeper probe
```

无参数。输出 JSON 到 stdout，退出码 `0`。

### directory —— 列账号与会话（不读消息正文、不需要 key）

```powershell
chatlog-keeper directory --source qq
chatlog-keeper directory --source wechat
chatlog-keeper directory --source wechat --account "wxid_xxxxx"
```

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

需要 `images` extra（`Pillow`）；`wxgf` → `jpg` 还需系统 PATH 上有 `ffmpeg`。

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

1. **只导自己的数据**：仅限你自己账号、自己本机的数据。绝不要用于任何服务端自动化（批量加好友、模拟发言、多开、插件外挂、伪造定位等）——那才是真正容易封号的区域。
2. **风险取决于取钥方式**（上游评估）：读本地数据库文件 ≈ 无风险（纯文件读、服务端感知不到）；被动内存扫描 = 低风险（只读进程内存，不注入、不挂钩、不附加调试器）；**Windows 主动取钥 = 中–高风险**；macOS 主动取钥 = 兼容性敏感。
3. **`auto` 会回退到 active**：微信 4.1.10.31+ 被动取不到 key 时，默认参数会自动走调试器。要控制风险就显式写 `--method passive`。
4. **日常客户端运行中别跑 active**：单实例冲突；上游要求先从菜单正常退出客户端，不要强制结束进程。
5. **腾讯的现实风险主要是项目级**：上游指出对这类工具的主要执法手段是要求代码托管平台把仓库下架（DMCA），而非封个人账号——这与"导出自己数据"的个人风险是两回事。
6. **降低风险的做法**：优先被动、复用缓存而不是反复重取、甚至可以**退出客户端后离线解密**。
7. **数据目录必须能被发现或显式指定**：QQ 数据根是 `<Documents>/Tencent Files/<qq-id>/nt_qq/nt_db/nt_msg.db`（含 OneDrive 重定向与"数据目录被挪到任意盘"的探测），微信是 `xwechat_files` 目录；探测不到就用 `--data-root`。
8. **Windows 没有 `--version`**：用 `uv tool list` 查版本；退出码 `1` 表示 `available: false`，不代表程序崩了。
9. **`--key` 会泄露密钥**：只在必要时用 `--key-stdin`。
10. **上游仍是较年轻的 CLI 优先项目**（JSON/HTML 输出，没有内置统计分析），macOS 目标平台是 Apple Silicon、Linux 面向官方 x86_64 客户端（非 Wine），新版本客户端的适配可能滞后。
