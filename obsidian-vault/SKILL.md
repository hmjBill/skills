---
name: obsidian-vault
description: 在 AI-Wiki 笔记库中搜索、创建和管理笔记
---

# AI-Wiki 笔记库操作

在 AI-Wiki 笔记库中搜索、创建和管理笔记。

## AI-Wiki 架构

AI-Wiki 是基于 PARA 变体的 Obsidian 笔记库，目录结构：

- `00_系统` — 系统配置、模板、操作指南
- `01_收件箱` — 临时收集
- `02_日常` — 日记、事件、OKR
- `03_项目` — 活跃项目
- `04_领域` — 持续关注领域
- `05_资源` — 参考资料、知识条目
- `06_媒体` — 读书/电影/剧集/动画/视频/游戏
- `07_人物` — 人物档案
- `08_归档` — 已归档内容
- `09_受控信息` — 敏感信息

模板位于 `00_系统/模板/`，共 19 个中文模板。

Frontmatter 规则：系统字段用英文（type/tags/date），业务字段用中文（状态/收件类型/来源/等级）。枚举值注册在 `00_系统/Agent操作指南.md`。

三层链接体系：README 导航 → 高置信 wikilink → DataviewJS。

## 功能

### 1. 搜索笔记

通过 obsidian search 或 grep 按内容、标签、frontmatter 搜索笔记。

```bash
obsidian search query="搜索词" limit=10
```

### 2. 读取笔记

通过路径或 wikilink 名称读取笔记内容。

```bash
obsidian read file="笔记名"
```

### 3. 创建笔记

使用正确模板创建笔记，路由到对应 PARA 目录。创建时必须：

- 使用 `00_系统/模板/` 中的正确模板
- 仅填写合法枚举值的 frontmatter
- 添加 `## 相关链接`
- 更新目录 README 的 `## 导航入口`

```bash
obsidian create name="新笔记" template="资源模板" silent
```

### 4. 更新笔记

修改笔记内容或 frontmatter。frontmatter 修改使用 `patchField`/`patchFields`，不使用 `processFrontMatter`。

```bash
obsidian append file="笔记名" content="新内容"
obsidian property:set name="状态" values="进行中" file="笔记名"
```

### 5. 查找反向链接

查看哪些笔记链接到指定笔记。

```bash
obsidian backlinks file="笔记名"
```

### 6. 目录浏览

列出指定目录下的笔记，读取 README 获取上下文。

### 7. 日记操作

```bash
obsidian daily:read
obsidian daily:append content="- [ ] 任务"
```

## 操作步骤

1. 定位笔记库根目录（从当前目录向上搜索 `.obsidian/` 或 `00_系统/`）
2. 如需规则参考，读取 `00_系统/Agent操作指南.md`
3. 执行请求的操作
4. 验证结果（文件存在、frontmatter 合法、导航已更新）

## 关键规则

- 所有路径使用带数字前缀的中文目录名
- 不创建顶层目录
- 不自动删除或移动文件
- 新笔记必须使用模板
- 添加或删除文件后更新 README 导航
- frontmatter 修改使用 `patchField`/`patchFields`
- 遵守三层链接体系
- 禁止：自动删除/移动/批量重分类、创建顶层目录、凭记忆写 frontmatter
