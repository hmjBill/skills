---
name: Obsidian知识库
description: Search, create, and manage notes in the Obsidian vault with wikilinks and index notes. Use when user wants to find, create, or organize notes in Obsidian.
---

# Obsidian 知识库

## 知识库位置

`/mnt/d/Obsidian Vault/AI Research/`

根级别基本扁平。

## 命名约定

- **索引笔记**：聚合相关主题（例如 `Ralph Wiggum Index.md`、`Skills Index.md`、`RAG Index.md`）
- 所有笔记名称使用首字母大写
- 不使用文件夹进行组织——使用链接和索引笔记代替

## 链接

- 使用 Obsidian `[[wikilinks]]` 语法：`[[Note Title]]`
- 笔记在底部链接到依赖项/相关笔记
- 索引笔记只是 `[[wikilinks]]` 列表

## 工作流程

### 搜索笔记

```bash
# 按文件名搜索
find "/mnt/d/Obsidian Vault/AI Research/" -name "*.md" | grep -i "keyword"

# 按内容搜索
grep -rl "keyword" "/mnt/d/Obsidian Vault/AI Research/" --include="*.md"
```

或者直接在知识库路径上使用 Grep/Glob 工具。

### 创建新笔记

1. 文件名使用**首字母大写**
2. 按照知识库规则将内容写成一个学习单元
3. 在底部添加相关笔记的 `[[wikilinks]]`
4. 如果是编号序列的一部分，使用层次编号方案

### 查找相关笔记

在整个知识库中搜索 `[[Note Title]]` 以找到反向链接：

```bash
grep -rl "\\[\\[Note Title\\]\\]" "/mnt/d/Obsidian Vault/AI Research/"
```

### 查找索引笔记

```bash
find "/mnt/d/Obsidian Vault/AI Research/" -name "*Index*"
```
