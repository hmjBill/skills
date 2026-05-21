---
name: obsidian-cli
description: 使用 Obsidian CLI 读取、创建、搜索和管理 Obsidian 仓库内容及插件开发流程
---

# Obsidian CLI

使用 `obsidian` CLI 与运行中的 Obsidian 实例交互。需要 Obsidian 处于打开状态。

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
