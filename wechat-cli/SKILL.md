---
name: wechat-cli
description: 查询本地微信数据（聊天记录、联系人、会话、收藏、统计等），专为 AI 集成设计
---

# WeChat CLI Skill

通过 [`wechat-cli`](https://github.com/huohuoer/wechat-cli) 查询本地微信数据。所有数据完全本地处理，SQLCipher 即时解密，不联网。

## 平台与系统要求

| 平台 | 支持 | `init` 权限/前置 |
|---|---|---|
| Windows | ✅ | 通常直接运行即可；报进程内存读取权限错误时再以管理员身份运行终端 |
| macOS | ✅ | 系统需 ≥ 26.3.1；终端需授予"完全磁盘访问"；`init` 可能需要重签 WeChat.app（会影响微信自动更新），**重签后必须从菜单完全退出微信再重开并重新登录**才生效 |
| Linux | ⚠️ | 微信 4.x 无官方 Linux 桌面客户端，此路径未经上游验证；原理上需读取 `/proc/<pid>/mem` |

- Python ≥ 3.10
- 微信客户端需保持登录运行
- 微信版本：macOS 需 ≤ 4.1.8.100（更高版本 `init` 会失败，需等上游适配）
- 微信版本：Windows ≥ 4.1.11 需打密钥提取补丁（见下一节）

## 安装

> ⚠️ **PyPI 上现在有一个同名的 `wechat-cli`，但不是这个项目**（另一个带 REST API / web 界面的工具，命令是 `setup/start/chats/moments/web`，依赖 Frida）。`pip install wechat-cli` 会**静默装错东西**，且它注册的命令也叫 `wechat-cli`，会抢 PATH。
>
> 本 skill 要装的是 **`huohuoer/wechat-cli`**（SQLCipher 解密本机数据库），只能从 GitHub 源码装。上游 README 里部分链接还指向旧仓库名，以 `huohuoer/wechat-cli` 为准。

**推荐（uv tool，隔离环境）**：

```bash
uv tool install git+https://github.com/huohuoer/wechat-cli
```

装完自带 `wechat-cli` 可执行文件。可执行文件在 uv 的 bin 目录，**不一定已在 PATH**：`uv tool dir --bin` 可查实际路径（Windows 常见于 `%APPDATA%\uv\tools\bin` 或 `~/.local/bin`，也可自定义），把它加进 PATH 后即可直接用 `wechat-cli`。

> ⚠️ **不要把 `uvx wechat-cli` / `uv tool run wechat-cli` 当通用兜底**：它按包名从 PyPI 解析，而 PyPI 上的 `wechat-cli` 是另一个项目（见上面的警告）。它只在"你确实用 `uv tool install` 装过本项目"时才安全。裸 `wechat-cli` 不在 PATH 时，正确做法是把 uv 的 bin 目录加进 PATH，或用绝对路径调用。

**备选（pip from git）**：

```bash
pip install git+https://github.com/huohuoer/wechat-cli
```

注意：uv 管理的 Python（PEP 668 externally-managed）会拒绝直接 `pip install`，用上面的 `uv tool` 方式或放进 venv。

**备选（editable 源码）**：

```bash
git clone https://github.com/huohuoer/wechat-cli.git
cd wechat-cli
pip install -e .
```

**npm（勿用）**：`@canghe_ai/wechat-cli` 已在 npm 标记废弃（"Package no longer supported"），且只有 darwin-arm64 预编译二进制（win32-x64 / linux-x64 包在 registry 上不存在），Windows/Linux 装完即报错。

验证安装：

```bash
wechat-cli --version
```

## 全局选项与环境变量

对所有查询类子命令生效（`init` 不加载配置，密钥固定读写 `~/.wechat-cli/`，这两个开关对它无效）：

| 选项 / 环境变量 | 说明 |
|---|---|
| `--config <路径>` | 指定 `config.json` 路径，默认 `~/.wechat-cli/config.json`。**全局选项，必须写在子命令前面** |
| `WECHAT_CLI_CONFIG` | 同上的环境变量写法；命令行 `--config` 优先 |

**数据目录找不到时怎么用**（头号坑）：查询命令报「未找到微信数据目录。请运行: wechat-cli init」，或 `init` 之后查询仍找不到数据库，都是自动检测失败（多账号、非默认安装位置最常见）。两条解法：

```bash
# A. 直接改默认配置里的 db_dir（最省事，键名别写错）
#    ~/.wechat-cli/config.json : {"db_dir": "C:/.../xwechat_files/<wxid>/db_storage"}

# B. 另存一份配置，用 --config 指过去
#    注意：--config 是全局选项，必须写在子命令前面
wechat-cli --config "D:/tools/wechat-cli/config.json" sessions
```

```powershell
# PowerShell 写法
$env:WECHAT_CLI_CONFIG = "D:\tools\wechat-cli\config.json"
wechat-cli sessions
```

> ⚠️ `config.json` 放在 `~/.wechat-cli/` 之外时，`keys_file`、`decrypted_dir` 等路径默认按**配置文件所在目录**推导，而不是 `~/.wechat-cli/`。另存配置必须同时写明 `"keys_file": "C:/Users/<用户>/.wechat-cli/all_keys.json"`，否则会报找不到密钥文件。

**`--limit` 上限**：只有 `search` 有硬上限 **500**，超过直接报错退出（`错误: limit 不能大于 500`，退出码 2），**不会自动截断**，要更多结果就配 `--offset` 分页。`history`、`export` 不受此限制（`export --limit` 默认 500）；`sessions`、`contacts`、`unread`、`favorites` 的 `--limit` 也不校验上限。

## 初始化（首次必须）

确保微信已登录运行，然后执行：

```bash
wechat-cli init
```

`init` 会：

1. 自动检测微信数据目录（兼容新版 `xwechat_files/<wxid>/db_storage` 与旧版 `WeChat Files`；检测不到见下）
2. 从微信进程内存提取加密密钥
3. 保存到 `~/.wechat-cli/all_keys.json`

自动检测失败（多微信账号、非默认安装位置最常见）时，用 `--db-dir` 显式指定，指向 `db_storage` 那一层目录：

```bash
wechat-cli init --db-dir "C:/Users/<用户>/Documents/xwechat_files/<wxid>/db_storage"
```

目录不存在会直接报错退出。指定结果会写进 `~/.wechat-cli/config.json` 的 `db_dir`，之后所有查询命令共用，无需逐条再传。

微信更新后若功能异常，用 `--force` 重新提取：

```bash
wechat-cli init --force
```

## 微信 4.1.11+ 密钥提取（Windows 必须打补丁）

**先判断你需不需要补丁**：直接跑 `wechat-cli init`。若输出显示提取到了 salt 与密钥（形如 `找到 N 个数据库, N 个不同的salt`），说明不需要补丁；若报 `0 hex patterns`、`0/N salts`，则是微信版本问题，继续往下。

### 为什么需要补丁

微信 **4.1.11 起**不再把明文数据库密钥以 `x'<64hex密钥><32hex salt>'` 形式缓存在进程内存，而是 XOR 混淆进 `com.Tencent.WCDB.Config.Cipher` 对象。（4.1.10.31 是"明文 key 移出进程堆"的分界，早于这个版本的客户端一般不需要补丁。）

上游 `huohuoer/wechat-cli` 0.2.4（最后提交 2026-04）的 Windows 提取**只有**扫旧字面量这一条路，因此 `init` 会识别出 DB/salt 却报 `0 hex patterns`、`0/N salts`——**这不是权限问题**（管理员终端也一样）。

### 修复：从零打补丁（任何机器通用）

修复内容 = 上游未合并的 **PR #22**（Config.Cipher 结构体解析 + XOR 解码，纯只读、不注入；旧 SHA512 校验保留为回退）。

```bash
# 1. 克隆上游源码到持久目录（不要放会被系统清理的临时目录）
git clone https://github.com/huohuoer/wechat-cli.git "<持久目录>/wechat-cli"
cd "<持久目录>/wechat-cli"

# 2. 下载 PR #22 的补丁（装了 gh 也可用：gh pr diff 22 --repo huohuoer/wechat-cli > pr22.diff）
curl -L https://github.com/huohuoer/wechat-cli/pull/22.diff -o pr22.diff

# 3. 打补丁并从源码安装
git apply pr22.diff
uv tool install --force .          # 已用 pip 装的：pip install --force-reinstall --no-deps -e .

# 4. 重新提取密钥（微信必须保持运行）
wechat-cli init --force
```

- ⚠️ **不要跑 `uv tool upgrade wechat-cli`**，会覆盖回未打补丁的版本。
- 若 PR #22 已被合并，可直接：`uv tool install --force git+https://github.com/huohuoer/wechat-cli`。
- 状态自查：`gh pr view 22 --repo huohuoer/wechat-cli --json state,mergeable`。
- 相关但未合并的 PR：#23（macOS 4.1.x 的同类问题）、#27（4.x 跨平台密钥获取）。macOS 用户遇到同类问题去看 #23。
- 若本工具彻底失效，备选是仍在上游维护的 `TANGandXUE/wcdb-key-tool`（取 key 后自行解密）。

> ⚠️ **`init --force` 报「未提取到任何密钥」不代表查询功能坏了**——之前 init 保存的密钥仍可能有效。先直接跑一条查询（如 `wechat-cli sessions --limit 5`）验证，能读出数据就是假失败，多半因为微信刚启动、内存布局还没稳定，等一会儿再 `--force`，或先在客户端收发一条消息。

**已验证**：微信 4.1.15.56 + Windows → 28/28 salts 提取成功，`sessions` / `history` 正常。（salt 数量随本机数据库个数变化，属正常。）

## 调用方式

### 标准：直接用 wechat-cli

```bash
wechat-cli sessions --limit 10
```

> 全局选项（`--config`）一律写在子命令**前面**：`wechat-cli --config <路径> sessions`。

若 `wechat-cli` 不在 PATH，查一下 uv 的 bin 目录并加进 PATH（`uv tool dir --bin`）；确认已用 `uv tool install` 装过本项目时，也可以 `uv tool run wechat-cli sessions --limit 10`（**不要用 `uvx wechat-cli`**，它会从 PyPI 解析成另一个项目）。

> Windows：`scripts/wx.sh` 需在 Git Bash / WSL 下于 skill 目录运行。PowerShell 下直接用 `wechat-cli ...`；要临时走 uv 隔离环境：

```powershell
function wx { uv tool run wechat-cli @args }
wx sessions --limit 10
```

### PATH 冲突排错（重要）

如果 `wechat-cli --version` 报类似 `Cannot find module '@canghe_ai/wechat-cli-win32-x64/package.json'` 的错误，说明 PATH 里的 npm 版（`@canghe_ai/wechat-cli`）优先于 git 安装版，而 npm 版在你的平台没有二进制。任选一种方式解决：

**方式 A — 用本 skill 自带的包装脚本**（Git Bash，在 skill 目录下运行）：

```bash
bash scripts/wx.sh sessions --limit 10
```

脚本内部执行 `uv tool run wechat-cli "$@"`（uv 不存在时回退裸 `wechat-cli`），走 uv tool 隔离环境，不受 PATH 顺序影响。

**方式 B — 直接走 uv tool run**（仅在确认本项目是用 `uv tool install` 装的）：

```bash
uv tool run wechat-cli sessions --limit 10
```

或在单条命令内定义临时别名：

```bash
wx() { uv tool run wechat-cli "$@"; }
wx sessions --limit 10
```

**方式 C — 根治**（卸载 npm 版，可能因文件锁 EBUSY 失败，失败也不影响 git 安装版使用）：

```bash
npm uninstall -g @canghe_ai/wechat-cli
```

## 命令参考

> 以下示例统一用 `wechat-cli`；若遇到上文的 PATH 冲突，按"方式 A/B"替换为 `bash scripts/wx.sh` 或 `uv tool run wechat-cli`。**全局选项 `--config` 要写在子命令前面。**

### sessions — 最近会话

```bash
wechat-cli sessions                          # 最近 20 个会话
wechat-cli sessions --limit 10               # 最近 10 个
wechat-cli sessions --format text            # 纯文本输出（默认 JSON）
```

### history — 聊天记录

```bash
wechat-cli history "张三"                            # 最近 50 条消息
wechat-cli history "张三" --limit 100                # 指定数量
wechat-cli history "交流群" --start-time "2026-04-01" --end-time "2026-04-03"
wechat-cli history "张三" --type link                # 只看链接
wechat-cli history "张三" --format text              # 纯文本输出
```

选项：`--limit`, `--offset`, `--start-time`, `--end-time`, `--type`, `--format`, `--media`（解析图片/文件/视频/语音的本地路径）

### search — 搜索消息

```bash
wechat-cli search "Claude"                           # 全局搜索
wechat-cli search "Claude" --chat "交流群"            # 指定聊天
wechat-cli search "开会" --chat "群A" --chat "群B"    # 多个聊天
wechat-cli search "报告" --type file                  # 只搜文件
```

选项：`--chat`（可重复）, `--start-time`, `--end-time`, `--limit`, `--offset`, `--type`, `--format`

### contacts — 联系人搜索与详情

```bash
wechat-cli contacts --query "李"                     # 搜索联系人
wechat-cli contacts --detail "张三"                   # 联系人详情（昵称、备注、微信号、个性签名等）
wechat-cli contacts --query "李" --limit 20          # 限制返回数量（默认 50）
wechat-cli contacts --query "李" --format text        # 纯文本
```

选项：`--query`, `--detail`, `--limit`, `--format json|text`

### members — 群成员

```bash
wechat-cli members "AI交流群"                        # 群成员列表（默认 JSON）
```

> ⚠️ **`--format text` 在 0.2.4 会崩**（源码引用了未定义变量，抛 `NameError`）。JSON 分支正常可用，要人可读输出就解析 JSON，不要加 `--format text`。

### stats — 聊天统计

```bash
wechat-cli stats "AI交流群"                          # 消息总数、类型分布、发言 Top 10、24h 活跃分布
wechat-cli stats "AI交流群" --format text            # 纯文本
wechat-cli stats "AI交流群" --start-time "2026-01-01"
wechat-cli stats "AI交流群" --start-time "2026-01-01" --end-time "2026-01-31"   # 指定时间范围
```

选项：`--start-time`, `--end-time`（均为 `YYYY-MM-DD [HH:MM[:SS]]`）, `--format json|text`

### export — 导出聊天记录

```bash
wechat-cli export "张三" --format markdown            # 导出为 Markdown（stdout）
wechat-cli export "群聊" --format txt --output chat.txt   # 导出为文件
wechat-cli export "张三" --start-time "2026-01-01" --end-time "2026-06-01"
```

选项：`--format markdown|txt`, `--output`, `--start-time`, `--end-time`, `--limit`

### favorites — 微信收藏

```bash
wechat-cli favorites                                 # 所有收藏
wechat-cli favorites --type article                  # 收藏的文章
wechat-cli favorites --type text                     # 收藏的文本
wechat-cli favorites --query "关键词"                 # 搜索收藏
wechat-cli favorites --limit 50                      # 限制数量（默认 20）
wechat-cli favorites --limit 5 --format text         # 纯文本输出
```

类型：`text`, `image`, `article`, `card`, `video`

选项：`--limit`, `--type`, `--query`, `--format json|text`

### unread — 未读会话

```bash
wechat-cli unread                                    # 未读会话列表
wechat-cli unread --limit 20                         # 限制数量
```

### new-messages — 增量新消息

```bash
wechat-cli new-messages                              # 自上次调用以来的新消息
wechat-cli new-messages --format text
```

状态保存在 `~/.wechat-cli/last_check.json`。

## 消息类型过滤器（--type）

用于 `history` 和 `search`：

| 值 | 含义 |
|---|---|
| `text` | 文本消息 |
| `image` | 图片 |
| `voice` | 语音 |
| `video` | 视频 |
| `sticker` | 表情包 |
| `location` | 位置 |
| `link` | 链接/小程序 |
| `file` | 文件 |
| `call` | 音视频通话 |
| `system` | 系统消息 |

## 输出格式

- 默认 JSON（适合 AI 解析）
- 纯文本：加 `--format text`

## 常用命令速查

| 命令 | 用途 |
|------|------|
| `sessions --limit N` | 最近 N 个会话 |
| `history "联系人名" --limit N` | 指定聊天的最近 N 条消息 |
| `new-messages` | 自上次调用以来的增量新消息 |
| `search "关键词" --chat "群名"` | 在指定聊天中搜索 |
| `contacts --query "名"` | 搜索联系人 |
| `unread` | 未读会话 |
| `stats` | 聊天统计分析 |
| `members "群名"` | 群成员列表（仅 JSON，不要加 `--format text`） |
| `favorites` | 微信收藏 |
| `export "联系人名"` | 导出聊天记录为 Markdown |

> **坑**：查看聊天记录用 `history`，不是 `messages`（该命令不存在）。群聊名支持模糊匹配。

## 注意事项

1. **只读工具**：`wechat-cli` 只能查（sessions / history / search / contacts / members / stats / export / favorites / unread / new-messages），**没有 `send` 之类的发消息命令**。要发微信请用 Agent 自身的消息发送能力，不要去找第三方微信自动化库。
2. **合规**：只处理**你自己账号、你自己电脑**上已有权限访问的数据；不联网、不上传。使用者需自行遵守所在法域法律与微信服务条款（上游同样只声明个人学习研究用途）。
3. **必须先 init**：所有查询命令依赖 `~/.wechat-cli/all_keys.json`
4. **微信必须运行**：`init` 时需要从微信进程提取密钥
5. **PyPI 同名包勿用**：PyPI 上的 `wechat-cli` 是另一个项目（见「安装」），统一用 `uv tool install git+https://github.com/huohuoer/wechat-cli`（或 pip from git）安装
6. **PATH 冲突**：若 `wechat-cli` 命令报 `Cannot find module '...win32-x64...'`，按"调用方式 → PATH 冲突排错"处理
7. **数据安全**：所有数据本地处理，SQLCipher 即时解密，不联网
8. **维护状态**：单人维护，跟进新版微信可能滞后（macOS > 4.1.8.100 暂不支持；Windows ≥ 4.1.11 需打补丁）

## editable 安装排错

如果以 `pip install -e .` 从临时目录安装且该目录被系统清理，会出现 `ModuleNotFoundError: No module named 'wechat_cli'`。修复方法：把源码移到持久位置后重装：

```bash
git clone https://github.com/huohuoer/wechat-cli.git "<持久目录>/wechat-cli"
cd "<持久目录>/wechat-cli" && pip install -e .
```

更新方法：

```bash
cd "<持久目录>/wechat-cli" && git pull
# 或
pip install --force-reinstall --no-deps -e "<持久目录>/wechat-cli"
```
