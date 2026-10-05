---
name: scaffold-exercises
description: 创建包含章节、问题、解决方案和说明的练习目录结构，确保通过代码检查。当用户想要搭建练习、创建练习模板或设置新课程章节时使用。
---

# 练习脚手架

创建能够通过练习 lint 检查的练习目录结构，然后使用 `git commit` 提交。`pnpm ai-hero-cli internal lint` 属于 ai-hero 课程环境；通用仓库改用仓库自带的 lint 命令，没有则跳过后续 lint 步骤。

## 目录命名规范

- **章节 (Section)**: `XX-section-name/` 放在 `exercises/` 下（例如 `01-retrieval-skill-building`）
- **练习 (Exercise)**: `XX.YY-exercise-name/` 放在章节目录下（例如 `01.03-retrieval-with-bm25`）
- 章节编号 = `XX`，练习编号 = `XX.YY`
- 名称使用 dash-case（小写，连字符分隔）

## 练习变体

每个练习至少需要以下子文件夹之一：

- `problem/` - 学生工作区，包含 TODOs
- `solution/` - 参考实现
- `explainer/` - 概念性材料，无 TODOs；需要多个讲解时使用编号变体 `explainer.1/`、`explainer.2/`

创建占位时，默认使用 `explainer/`，除非计划另有指定。

## 必需文件

每个子文件夹（`problem/`、`solution/`、`explainer/`）都需要一个 `readme.md`，该文件必须：

- **不为空**（必须有实际内容，即使是单行标题也可以）
- 不包含失效链接

创建占位时，创建一个带有标题和描述的最小化 readme：

```md
# 练习脚手架

Description here
```

如果子文件夹包含代码，还需要一个 `main.ts`（>1 行）；纯占位（仅含 readme）的子文件夹不需要 `main.ts`。

## 工作流程

1. **解析计划** - 提取章节名称、练习名称和变体类型
2. **创建目录** - macOS / Linux 用 `mkdir -p`，Windows PowerShell 7 用 `New-Item -ItemType Directory -Force -Path`，逐一创建每个路径
3. **创建占位 readme** - 每个变体文件夹一个 `readme.md`，包含标题
4. **运行 lint** - 使用仓库自带的 lint 命令验证（ai-hero 课程环境为 `pnpm ai-hero-cli internal lint`）；没有 lint 命令则跳过
5. **修复错误** - 迭代直到 lint 通过

## Lint 规则摘要

Linter（ai-hero 课程环境为 `pnpm ai-hero-cli internal lint`，通用仓库以仓库自带 lint 为准）检查：

- 每个练习都有子文件夹（`problem/`、`solution/`、`explainer/`）
- 至少存在 `problem/`、`explainer/` 或编号讲解 `explainer.1/` 之一
- 主子文件夹中存在非空的 `readme.md`
- 不存在 `.gitkeep` 文件
- 不存在 `speaker-notes.md` 文件
- readme 中没有失效链接
- readme 中没有 `pnpm run exercise` 命令
- 包含代码的子文件夹都需要 `main.ts`；仅含 readme 的占位子文件夹除外

## 移动/重命名练习

重编号或移动练习时：

1. 使用 `git mv`（而非 `mv`）重命名目录 - 保留 git 历史
2. 更新数字前缀以维持顺序
3. 移动后重新运行 lint

示例：

```bash
git mv exercises/01-retrieval/01.03-embeddings exercises/01-retrieval/01.04-embeddings
```

## 示例：从计划创建占位符

给定如下计划：

```
Section 05: Memory Skill Building
- 05.01 Introduction to Memory
- 05.02 Short-term Memory (explainer + problem + solution)
- 05.03 Long-term Memory
```

创建：

```bash
# macOS / Linux
mkdir -p exercises/05-memory-skill-building/05.01-introduction-to-memory/explainer
mkdir -p exercises/05-memory-skill-building/05.02-short-term-memory/explainer
mkdir -p exercises/05-memory-skill-building/05.02-short-term-memory/problem
mkdir -p exercises/05-memory-skill-building/05.02-short-term-memory/solution
mkdir -p exercises/05-memory-skill-building/05.03-long-term-memory/explainer
```

```powershell
# Windows PowerShell 7
New-Item -ItemType Directory -Force -Path exercises/05-memory-skill-building/05.01-introduction-to-memory/explainer
New-Item -ItemType Directory -Force -Path exercises/05-memory-skill-building/05.02-short-term-memory/explainer
New-Item -ItemType Directory -Force -Path exercises/05-memory-skill-building/05.02-short-term-memory/problem
New-Item -ItemType Directory -Force -Path exercises/05-memory-skill-building/05.02-short-term-memory/solution
New-Item -ItemType Directory -Force -Path exercises/05-memory-skill-building/05.03-long-term-memory/explainer
```

然后创建 readme 占位符：

```
exercises/05-memory-skill-building/05.01-introduction-to-memory/explainer/readme.md -> "# Introduction to Memory"
exercises/05-memory-skill-building/05.02-short-term-memory/explainer/readme.md -> "# Short-term Memory"
exercises/05-memory-skill-building/05.02-short-term-memory/problem/readme.md -> "# Short-term Memory"
exercises/05-memory-skill-building/05.02-short-term-memory/solution/readme.md -> "# Short-term Memory"
exercises/05-memory-skill-building/05.03-long-term-memory/explainer/readme.md -> "# Long-term Memory"
```
