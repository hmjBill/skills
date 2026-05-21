---
name: tutor-setup
description: 将文档、网页或代码库转换为 Obsidian StudyVault，生成学习笔记、练习题和入门材料。
---

# Tutor Setup — 知识转化为 Obsidian StudyVault

## CWD 边界规则（所有模式）

> **禁止访问当前工作目录（CWD）以外的文件。**
> 所有源文件扫描、读取和 vault 输出必须限制在 CWD 及其子目录内。
> 如果用户提供了外部路径，要求他们先将文件复制到 CWD 中。

## 模式检测

调用时自动检测模式：

1. **检查项目标记文件**，位于 CWD：
   - `package.json`, `pom.xml`, `build.gradle`, `Cargo.toml`, `go.mod`, `Makefile`,
     `*.sln`, `pyproject.toml`, `setup.py`, `Gemfile`
2. **找到任意标记** → **Codebase 模式**
3. **未找到标记** → **Document 模式**
4. **决胜规则**：如果 `.git/` 是唯一指标且不存在源代码文件（`*.ts`, `*.py`, `*.java`, `*.go`, `*.rs` 等），默认为 Document 模式。
5. 公告检测到的模式，并要求用户确认或覆盖。

---

## Document 模式

> 将知识源（PDF、文本、网页、epub）转化为学习笔记。
> 模板：[templates.md](references/templates.md)

### 阶段 D1：源文件发现与提取

1. **自动扫描 CWD**，查找 `**/*.pdf`, `**/*.txt`, `**/*.md`, `**/*.html`, `**/*.epub`（排除 `node_modules/`, `.git/`, `dist/`, `build/`, `StudyVault/`）。展示给用户确认。
2. **提取文本（强制工具）**：
   - **PDF → 仅使用 `pdftotext` CLI**（通过 Bash 工具运行）。禁止直接使用 Read 工具读取 PDF 文件——它会将页面渲染为图片，多消耗 10-50 倍 token。先转换为 `.txt`，然后用 Read 读取 `.txt` 文件。
     ```bash
     pdftotext "source.pdf" "/tmp/source.txt"
     ```
   - 如果未安装 `pdftotext`，先安装：`brew install poppler`（macOS）或 `apt-get install poppler-utils`（Linux）。
   - URL → WebFetch
   - 其他格式（`.md`, `.txt`, `.html`）→ 直接使用 Read。
3. **读取提取的 `.txt` 文件** —— 理解范围、结构和深度。仅从转换后的文本工作，绝不从原始 PDF。
4. **源文件内容映射（多文件源时强制执行）**：
   - 对**每个**源文件读取**封面 + 目录 + 中间/末尾 3 页以上样本**
   - **禁止从文件名推测内容** —— 文件编号通常 ≠ 章节编号
   - 构建已验证的映射：`{ source_file → actual_topics → page_ranges }`
   - 标记非学术文件和缺失的源
   - 将映射展示给用户验证后再继续

### 阶段 D2：内容分析

1. 识别主题层级 —— 章节、领域划分。
2. 分离概念内容和练习题。
3. 映射主题之间的依赖关系。
4. 识别关键模式 —— 对比、决策树、公式。
5. **完整主题清单（强制）** —— 列出每个主题/子主题。驱动所有后续阶段。

> **等深规则**：即使只是简要提及的子主题，也必须获得完整的独立笔记，并补充教科书级别的知识。

6. **分类完整性**：当源文件列举了类别（"3 types of X"、"N가지"、"categories"、"there are N"）时，每个成员都必须获得独立笔记。扫描关键词："types of"、"N가지"、"categories"、"there are N"。
7. **源文件到笔记的交叉验证（强制）**：记录每个主题对应的源文件和页码范围。将无法溯源的主题标记为"원문 미보유"。

### 阶段 D3：标签标准

在创建笔记之前定义标签词汇：
- **格式**：英文、小写、kebab-case（例如 `#data-hazard`）
- **层级**：顶级 → 领域 → 细节 → 技法 → 笔记类型
- **注册表**：只允许使用已注册的标签。细节标签必须同时附加父领域标签。

### 阶段 D4：Vault 结构

按照 [templates.md](references/templates.md) 创建带有编号文件夹的 `StudyVault/`。每个文件归类 3-5 个相关概念。

### 阶段 D5：仪表板创建

创建 `00-Dashboard/`：MOC、Quick Reference、Exam Traps。参见 [templates.md](references/templates.md)。

- **MOC**：Topic Map + Practice Notes + Study Tools + Tag Index（含规则）+ Weak Areas（含链接）+ Non-core Topic Policy
- **Quick Reference**：每个标题包含 `→ [[Concept Note]]` 链接；所有关键公式
- **Exam Traps**：每个主题的陷阱要点放在折叠 callout 中，链接到概念笔记

### 阶段 D6：概念笔记

按照 [templates.md](references/templates.md)。关键规则：
- YAML frontmatter：`source_pdf`、`part`、`keywords`（强制）
- **source_pdf 必须与阶段 D1 验证的映射一致** —— 禁止从文件名猜测
- 如不可用：`source_pdf: 원문 미보유`
- `[[wiki-links]]`、callout（`[!tip]`、`[!important]`、`[!warning]`）、对比表格优于纯文字
- 流程/工作流/时序使用 ASCII 图示
- **简化但标注例外**：概括性陈述必须注明边缘情况

### 阶段 D7：练习题

按照 [templates.md](references/templates.md)。关键规则：
- 每个主题文件夹必须有一个练习文件（8 题以上）
- **主动回忆**：答案使用 `> [!answer]- 정답 보기` 折叠 callout
- 模式使用 `> [!hint]-` / `> [!summary]-` 折叠 callout
- **题型多样性**：每个文件 ≥60% 回忆题、≥20% 应用题、≥2 道分析题
- `## Related Concepts` 附带 `[[wiki-links]]`

### 阶段 D8：交叉链接

1. 每个概念笔记添加 `## Related Notes`
2. MOC 链接到每个概念 + 练习笔记
3. 概念 ↔ 练习交叉链接；同级笔记互相引用
4. Quick Reference 各节 → `[[Concept Note]]` 链接
5. Weak Areas → 相关笔记 + Exam Traps；Exam Traps → 概念笔记

### 阶段 D9：自检（强制）

对照 [quality-checklist.md](references/quality-checklist.md) 的 **Document Mode** 部分进行验证。修复并重新验证，直到所有检查通过。

---

## Codebase 模式

> 从源代码项目生成新开发者入门 StudyVault。
> 完整工作流：[codebase-workflow.md](references/codebase-workflow.md)
> 模板：[codebase-templates.md](references/codebase-templates.md)

### 阶段概览

| 阶段 | 名称 | 关键动作 |
|------|------|----------|
| C1 | 项目探索 | 扫描文件、检测技术栈、读取入口点、映射目录结构 |
| C2 | 架构分析 | 识别模式、追踪请求流、映射模块边界和数据流 |
| C3 | 标签标准 | 定义 `#arch-*`、`#module-*`、`#pattern-*`、`#api-*` 标签注册表 |
| C4 | Vault 结构 | 创建 `StudyVault/`，包含 Dashboard、Architecture、各模块、DevOps、Exercises 文件夹 |
| C5 | 仪表板 | MOC（Module Map + API Surface + Getting Started + Onboarding Path）+ Quick Reference |
| C6 | 模块笔记 | 每模块笔记：Purpose、Key Files、Public Interface、Internal Flow、Dependencies |
| C7 | 入门练习 | 代码阅读、配置、调试、扩展练习（每个主要模块 5 题以上） |
| C8 | 交叉链接 | 跨模块链接、架构 ↔ 实现链接、练习 ↔ 模块链接 |
| C9 | 自检 | 对照 [quality-checklist.md](references/quality-checklist.md) 的 **Codebase Mode** 部分进行验证 |

详见 [codebase-workflow.md](references/codebase-workflow.md) 各阶段详细说明。

---

## 语言

- 笔记语言与源材料语言匹配（韩文 → 韩文笔记等）
- **标签/关键词**：始终使用英文
