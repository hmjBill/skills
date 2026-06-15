---
name: wechat-cli
description: 查询本地微信数据（聊天记录、联系人、会话、收藏、统计等），专为 AI 集成设计
---

# WeChat CLI Skill

通过 `wechat-cli` 查询本地微信数据。所有数据完全本地处理，SQLCipher 即时解密。

## 前置条件

### 安装状态

- **Python 版本**已通过 `pip install --user -e .` 从 GitHub 源码安装
- pip `--user` 安装的可执行文件通常位于 `~/AppData/Roaming/Python/Python<版本>/Scripts/wechat-cli.exe`（Windows）
- 依赖：click, pycryptodome, zstandard
- **npm 版本不工作**：`@canghe_ai/wechat-cli` npm 包只提供 macOS arm64 二进制，Windows 二进制 `@canghe_ai/wechat-cli-win32-x64` 在 npm 上不存在（已标记 deprecated）
- PyPI 上也未发布（`pip install wechat-cli` 找不到包），只能从 GitHub 源码安装

### 调用方式

由于 npm 的 `wechat-cli` 命令优先级高于 pip 安装的（PATH 中 npm 路径在前），**必须通过 python 直接调用**：

```bash
python -c "from wechat_cli.main import cli; cli()" -- <command> [options]
```

也可以直接用 pip 安装的可执行文件（完整路径）：
```bash
wechat-cli.exe <command> [options]
```

**推荐用 python -c 方式**，更可靠。

### 初始化（必须先做一次）

必须确保微信正在运行，然后执行：
```bash
python -c "from wechat_cli.main import cli; cli()" -- init
```

此命令会：
1. 自动检测微信数据目录（如 `~/xwechat_files/<wxid>/db_storage`）
2. 从 Weixin.exe 进程内存提取加密密钥（Windows 下不需要 sudo）
3. 保存到 `~/.wechat-cli/all_keys.json`

配置文件位置：`~/.wechat-cli/`

如果微信更新后功能异常，用 `--force` 重新提取：
```bash
python -c "from wechat_cli.main import cli; cli()" -- init --force
```

## 命令参考

### 调用方式

**推荐**：使用 skill 自带的包装脚本，避免每次手打 python -c（在本 skill 目录下运行）：

```bash
bash scripts/wx.sh sessions --limit 10
```

**备选**：在单条 terminal 命令内定义临时别名：

```bash
wx() { python -c "from wechat_cli.main import cli; cli()" -- "$@"; }
wx sessions --limit 10
```

### sessions — 最近会话

```bash
wx sessions                          # 最近 20 个会话
wx sessions --limit 10               # 最近 10 个
wx sessions --format text            # 纯文本输出（默认 JSON）
```

### history — 聊天记录

```bash
wx history "张三"                            # 最近 50 条消息
wx history "张三" --limit 100                # 指定数量
wx history "交流群" --start-time "2026-04-01" --end-time "2026-04-03"
wx history "张三" --type link                # 只看链接
wx history "张三" --format text              # 纯文本输出
```

选项：`--limit`, `--offset`, `--start-time`, `--end-time`, `--type`, `--format`

### search — 搜索消息

```bash
wx search "Claude"                           # 全局搜索
wx search "Claude" --chat "交流群"            # 指定聊天
wx search "开会" --chat "群A" --chat "群B"    # 多个聊天
wx search "报告" --type file                  # 只搜文件
```

选项：`--chat`（可重复）, `--start-time`, `--end-time`, `--limit`, `--offset`, `--type`, `--format`

### contacts — 联系人搜索与详情

```bash
wx contacts --query "李"                     # 搜索联系人
wx contacts --detail "张三"                   # 联系人详情（返回昵称、备注、微信号、个性签名等）
```

### members — 群成员

```bash
wx members "AI交流群"                        # 群成员列表
wx members "AI交流群" --format text          # 纯文本
```

### stats — 聊天统计

```bash
wx stats "AI交流群"                          # 统计（消息总数、类型分布、发言 Top 10、24h 活跃分布）
wx stats "AI交流群" --format text            # 纯文本
wx stats "AI交流群" --start-time "2026-01-01"
```

### export — 导出聊天记录

```bash
wx export "张三" --format markdown            # 导出为 Markdown（stdout）
wx export "群聊" --format txt --output chat.txt   # 导出为文件
wx export "张三" --start-time "2026-01-01" --end-time "2026-06-01"
```

选项：`--format markdown|txt`, `--output`, `--start-time`, `--end-time`, `--limit`

### favorites — 微信收藏

```bash
wx favorites                                 # 所有收藏
wx favorites --type article                  # 收藏的文章
wx favorites --type text                     # 收藏的文本
wx favorites --query "关键词"                 # 搜索收藏
```

类型：`text`, `image`, `article`, `card`, `video`

### unread — 未读会话

```bash
wx unread                                    # 未读会话列表
wx unread --limit 20                         # 限制数量
```

### new-messages — 增量新消息

```bash
wx new-messages                              # 自上次调用以来的新消息
wx new-messages --format text
```

状态保存在 `~/.wechat-cli/last_check.json`

## 消息类型过滤器（--type）

用于 `history` 和 `search` 命令：

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

- **默认**：JSON（适合 AI 解析）
- 调用方式：`python -c "from wechat_cli.main import cli; cli()" -- <command>`

## 常用命令速查

| 命令 | 用途 |
|------|------|
| `sessions --limit N` | 最近 N 个会话 |
| `history "联系人名" --limit N` | 获取指定聊天的最近 N 条消息 |
| `new-messages` | 获取自上次调用以来的增量新消息 |
| `search "关键词" --chat "群名"` | 在指定聊天中搜索 |
| `contacts --query "名"` | 搜索联系人 |
| `unread` | 查看未读会话 |
| `stats` | 聊天统计分析 |
| `members "群名"` | 查看群成员列表 |
| `favorites` | 查看微信收藏 |
| `export "联系人名"` | 导出聊天记录为 markdown |

> **坑**：查看聊天记录用 `history`，不是 `messages`（该命令不存在）。群聊名支持模糊匹配。

## 注意事项

1. **必须先 init**：所有查询命令依赖 `~/.wechat-cli/all_keys.json`
2. **微信必须运行**：init 时需要从微信进程提取密钥
3. **Windows 平台**：npm 版不可用，必须用 Python 版
4. **PATH 冲突**：npm 的 `wechat-cli` 命令会在 PATH 中优先于 pip 版本，始终用 `python -c` 方式调用
5. **数据安全**：所有数据本地处理，SQLCipher 即时解密，不联网
6. **npm 包已 deprecated**：标记为不再维护
7. **npm 卸载可能 EBUSY**：`npm uninstall -g @canghe_ai/wechat-cli` 可能因文件锁失败，不影响使用（pip 版独立运行）

## ⚠️ 重要：editable install 位置问题

如果以 `pip install --user -e .` 从临时目录（如 `/tmp/wechat-cli`）做 editable 安装，**Windows Temp 目录可能被系统清理**，导致包失效。

修复方法（如果 `python -c "from wechat_cli.main import cli; cli()"` 报错 ModuleNotFoundError）：
```bash
# 将源码移到持久位置
cp -r /tmp/wechat-cli "<持久目录>/wechat-cli"
cd "<持久目录>/wechat-cli" && pip install --user -e .
```

更新方法：
```bash
cd /tmp/wechat-cli && git pull  # 如果还在 /tmp
# 或
pip install --user --force-reinstall --no-deps -e /path/to/wechat-cli
```
