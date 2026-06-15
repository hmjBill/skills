---
name: wechat-cli
description: 查询本地微信数据（聊天记录、联系人、会话、收藏、统计等），专为 AI 集成设计
---

# WeChat CLI Skill

通过 [`wechat-cli`](https://github.com/freestylefly/wechat-cli) 查询本地微信数据。所有数据完全本地处理，SQLCipher 即时解密，不联网。

## 平台与系统要求

| 平台 | 支持 | `init` 权限/前置 |
|---|---|---|
| Windows | ✅ | 需以管理员权限运行终端 |
| macOS | ✅ | 终端需授予"完全磁盘访问"；`init` 可能需要重签 WeChat.app（会影响微信自动更新） |
| Linux | ✅ | 需 root（读取 `/proc/<pid>/mem`） |

- Python ≥ 3.10
- 微信客户端需保持登录运行
- 微信版本：macOS 需 ≤ 4.1.8.100（更高版本 `init` 可能失败，需等上游适配）

## 安装

**推荐（pip，跨平台）**：

```bash
pip install wechat-cli
```

**备选（源码）**：

```bash
git clone https://github.com/freestylefly/wechat-cli.git
cd wechat-cli
pip install -e .
```

**npm（不推荐）**：`@canghe_ai/wechat-cli` 已标记 deprecated，且仅提供 macOS arm64 二进制，Windows/Linux 无预编译。Windows 用户**不要用 npm 版**。

验证安装：

```bash
wechat-cli --version
```

## 初始化（首次必须）

确保微信已登录运行，然后执行：

```bash
wechat-cli init
```

`init` 会：

1. 自动检测微信数据目录（兼容新版 `xwechat_files/<wxid>/db_storage` 与旧版 `WeChat Files`）
2. 从微信进程内存提取加密密钥
3. 保存到 `~/.wechat-cli/all_keys.json`

微信更新后若功能异常，用 `--force` 重新提取：

```bash
wechat-cli init --force
```

## 调用方式

### 标准：直接用 wechat-cli

```bash
wechat-cli sessions --limit 10
```

### PATH 冲突排错（重要）

如果 `wechat-cli --version` 报类似 `Cannot find module '@canghe_ai/wechat-cli-win32-x64/package.json'` 的错误，说明 PATH 里的 npm 版（`@canghe_ai/wechat-cli`）优先于 pip 版，而 npm 版在你的平台没有二进制。任选一种方式解决：

**方式 A — 用本 skill 自带的包装脚本**（在 skill 目录下运行）：

```bash
bash scripts/wx.sh sessions --limit 10
```

脚本本质是 `python -c "from wechat_cli.main import cli; cli()" -- "$@"`，绕过 PATH 冲突。

**方式 B — 直接走 Python 入口**：

```bash
python -c "from wechat_cli.main import cli; cli()" -- sessions --limit 10
```

或在单条命令内定义临时别名：

```bash
wx() { python -c "from wechat_cli.main import cli; cli()" -- "$@"; }
wx sessions --limit 10
```

**方式 C — 根治**（卸载 npm 版，可能因文件锁 EBUSY 失败，失败也不影响 pip 版使用）：

```bash
npm uninstall -g @canghe_ai/wechat-cli
```

## 命令参考

> 以下示例统一用 `wechat-cli`；若遇到上文的 PATH 冲突，按"方式 A/B"替换为 `bash scripts/wx.sh` 或 `python -c "from wechat_cli.main import cli; cli()" --`。

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

选项：`--limit`, `--offset`, `--start-time`, `--end-time`, `--type`, `--format`

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
```

### members — 群成员

```bash
wechat-cli members "AI交流群"                        # 群成员列表
wechat-cli members "AI交流群" --format text          # 纯文本
```

### stats — 聊天统计

```bash
wechat-cli stats "AI交流群"                          # 消息总数、类型分布、发言 Top 10、24h 活跃分布
wechat-cli stats "AI交流群" --format text            # 纯文本
wechat-cli stats "AI交流群" --start-time "2026-01-01"
```

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
```

类型：`text`, `image`, `article`, `card`, `video`

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
| `members "群名"` | 群成员列表 |
| `favorites` | 微信收藏 |
| `export "联系人名"` | 导出聊天记录为 Markdown |

> **坑**：查看聊天记录用 `history`，不是 `messages`（该命令不存在）。群聊名支持模糊匹配。

## 注意事项

1. **必须先 init**：所有查询命令依赖 `~/.wechat-cli/all_keys.json`
2. **微信必须运行**：`init` 时需要从微信进程提取密钥
3. **npm 版勿用**：已 deprecated 且 Windows/Linux 无二进制，统一用 pip 版（`pip install wechat-cli`）或源码安装
4. **PATH 冲突**：若 `wechat-cli` 命令报 `Cannot find module '...win32-x64...'`，按"调用方式 → PATH 冲突排错"处理
5. **数据安全**：所有数据本地处理，SQLCipher 即时解密，不联网
6. **维护状态**：单人维护，跟进新版微信可能滞后（macOS > 4.1.8.100 暂不支持）

## editable 安装排错

如果以 `pip install -e .` 从临时目录安装且该目录被系统清理，会出现 `ModuleNotFoundError: No module named 'wechat_cli'`。修复方法：把源码移到持久位置后重装：

```bash
git clone https://github.com/freestylefly/wechat-cli.git "<持久目录>/wechat-cli"
cd "<持久目录>/wechat-cli" && pip install -e .
```

更新方法：

```bash
cd "<持久目录>/wechat-cli" && git pull
# 或
pip install --force-reinstall --no-deps -e "<持久目录>/wechat-cli"
```
