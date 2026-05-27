---
name: ai-wiki-obsidian-cli
description: 在 AI-Wiki 环境中使用 Obsidian CLI 操作笔记库
---

# Obsidian CLI（AI-Wiki 适配版）

使用 `obsidian` CLI 与运行中的 Obsidian 实例交互。需要 Obsidian 处于打开状态。

本技能在原 obsidian-cli 基础上增加了 AI-Wiki 笔记库的操作规范，确保 CLI 操作符合 AI-Wiki 的目录结构、模板系统和 frontmatter 约束。

## 命令参考

运行 `obsidian help` 查看所有可用命令（始终为最新版本）。完整文档：https://help.obsidian.md/cli

## 语法

**参数** 使用 `=` 传递值，含空格时加引号：

```bash
obsidian create name="My Note" content="Hello world"
```

**标志** 是布尔开关，不接值：

```bash
obsidian create name="My Note" silent overwrite
```

多行内容使用 `\n` 表示换行，`\t` 表示制表符。

## 文件定位

许多命令接受 `file` 或 `path` 来指定目标文件。两者都未提供时，使用当前活动文件。

- `file=<name>` —— 按 wikilink 方式解析（只需名称，无需路径或扩展名）
- `path=<path>` —— 从仓库根目录的精确路径，例如 `folder/note.md`

## 仓库定位

命令默认指向最近聚焦的仓库。使用 `vault=<name>` 作为首个参数可指定目标仓库：

```bash
obsidian vault="My Vault" search query="test"
```

## 常用操作

```bash
obsidian read file="My Note"
obsidian create name="New Note" content="# Hello" template="Template" silent
obsidian append file="My Note" content="New line"
obsidian search query="search term" limit=10
obsidian daily:read
obsidian daily:append content="- [ ] New task"
obsidian property:set name="status" value="done" file="My Note"
obsidian tasks daily todo
obsidian tags sort=count counts
obsidian backlinks file="My Note"
```

任意命令附加 `--copy` 可将输出复制到剪贴板。使用 `silent` 防止文件被打开。列表命令附加 `total` 可获取计数。

## 插件开发

### 开发/测试循环

修改插件或主题代码后，按以下流程操作：

1. **重载** 插件以加载变更：
   ```bash
   obsidian plugin:reload id=my-plugin
   ```
2. **检查错误** —— 如有错误，修复后从第 1 步重复：
   ```bash
   obsidian dev:errors
   ```
3. **视觉验证** —— 截图或检查 DOM：
   ```bash
   obsidian dev:screenshot path=screenshot.png
   obsidian dev:dom selector=".workspace-leaf" text
   ```
4. **检查控制台输出** 查看警告或异常日志：
   ```bash
   obsidian dev:console level=error
   ```

### 其他开发命令

在应用上下文中运行 JavaScript：

```bash
obsidian eval code="app.vault.getFiles().length"
```

检查 CSS 属性值：

```bash
obsidian dev:css selector=".workspace-leaf" prop=background-color
```

切换移动端模拟：

```bash
obsidian dev:mobile on
```

运行 `obsidian help` 查看更多开发命令，包括 CDP 和调试器控制。

## AI-Wiki 操作规范

在 AI-Wiki 笔记库中使用 obsidian CLI 时，遵循以下规则。

### 笔记创建
- 创建笔记前先确认目标目录和对应模板
- 使用 template 参数指定 00_系统/模板/ 中的模板：
  ```bash
  obsidian create name="新笔记" template="资源模板" silent
  ```
- 创建后必须更新目标目录 README 的 ## 导航入口

### Frontmatter 修改
- 使用 property:set 修改单个字段：
  ```bash
  obsidian property:set name="状态" value="进行中" file="项目名"
  ```
- 枚举字段只能使用合法值：
  - type: book/area/media/person/project/inbox/resource/single/recurring
  - 状态(项目): 进行中/已完成/废弃/暂停/搁置
  - 状态(收件箱): 待处理/已归档
  - 收件类型: 灵感/摘录/待处理
  - 媒体类型: 电影/剧集/动画/视频/游戏
  - 优先级(OKR): High/Middle/Low

### 常用 AI-Wiki 操作
```bash
# 查看今日日记
obsidian daily:read

# 追加内容到日记
obsidian daily:append content="- [ ] 今日待办"

# 搜索特定目录下的内容
obsidian search query="tag:#项目" limit=20

# 查看反向链接
obsidian backlinks file="某个笔记"

# 设置 OKR 进度
obsidian property:set name="完成进度" value=75 file="某个OKR"
```

### 注意事项
- 不要创建新的顶层目录（00-09 以外的）
- 不要自动删除或移动文件
- 使用模板创建笔记，不凭记忆手写格式
- 知识型笔记添加 1-3 个高置信 wikilink
- 执行型笔记链接到最近的相关 README/MOC
