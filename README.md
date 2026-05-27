# Skills

从开源社区收集的 Agent Skills 合集，用于 AI 编程助手（如 Claude Code、Cursor、Codex 等）。所有 Skills 已完成中文本地化，方便阅读和二次开发。

## 什么是 Skill

Skill 是一段预置指令，AI 编程助手加载后可在特定场景下自动执行专业工作流。每个 Skill 由一个目录表示，核心文件通常为 `SKILL.md`。

## 收录条目（79 个，78 个含 SKILL.md）

### 开发与架构

| Skill | 说明 |
|-------|------|
| [caveman](caveman/SKILL.md) | 用最原始的方式解决问题，拒绝过度工程 |
| [codemap](codemap/SKILL.md) | 生成代码地图，快速理解项目结构 |
| [improve-codebase-architecture](improve-codebase-architecture/SKILL.md) | 改善代码库架构 |
| [migrate-to-shoehorn](migrate-to-shoehorn/SKILL.md) | 迁移到 Shoehorn 框架 |
| [request-refactor-plan](request-refactor-plan/SKILL.md) | 请求重构计划 |
| [simplify](simplify/SKILL.md) | 简化代码，提升可读性和可维护性 |
| [zoom-out](zoom-out/SKILL.md) | 纵观全局，制定架构策略 |

### 测试与质量

| Skill | 说明 |
|-------|------|
| [grill-me](grill-me/SKILL.md) | 对计划或设计进行深度追问 |
| [grill-with-docs](grill-with-docs/SKILL.md) | 结合项目文档进行追问 |
| [prototype](prototype/SKILL.md) | 快速原型开发 |
| [qa](qa/SKILL.md) | 质量保证与测试 |
| [review](review/SKILL.md) | 代码审查 |
| [scaffold-exercises](scaffold-exercises/SKILL.md) | 搭建练习脚手架 |
| [tdd](tdd/SKILL.md) | 测试驱动开发（TDD） |
| [triage](triage/SKILL.md) | 问题分类与分流 |

### UI / UX / 设计

| Skill | 说明 |
|-------|------|
| [banner-design](banner-design/SKILL.md) | Banner 设计 |
| [brand](brand/SKILL.md) | 品牌设计 |
| [design](design/SKILL.md) | 通用设计 |
| [design-an-interface](design-an-interface/SKILL.md) | 界面设计 |
| [design-system](design-system/SKILL.md) | 设计系统 |
| [frontend-design](frontend-design/SKILL.md) | 前端设计 |
| [slides](slides/SKILL.md) | 幻灯片制作 |
| [ui-styling](ui-styling/SKILL.md) | UI 样式 |
| [ui-ux-pro-max](ui-ux-pro-max/SKILL.md) | UI/UX 专业增强 |

### 可视化

| Skill | 说明 |
|-------|------|
| [excalidraw-diagram](excalidraw-diagram/SKILL.md) | 生成 Excalidraw 手绘风图表 |
| [mermaid-visualizer](mermaid-visualizer/SKILL.md) | 将文本转换为 Mermaid 图表 |
| [obsidian-canvas-creator](obsidian-canvas-creator/SKILL.md) | 生成 Obsidian Canvas 画布 |

### 浏览器自动化

| Skill | 说明 |
|-------|------|
| [agent-browser](agent-browser/SKILL.md) | 浏览器自动化 CLI |
| [playwright](playwright/SKILL.md) | Playwright 测试自动化 |
| [playwright-interactive](playwright-interactive/SKILL.md) | Playwright 交互模式 |
| [screenshot](screenshot/SKILL.md) | 截图工具 |

### 安全

| Skill | 说明 |
|-------|------|
| [security-best-practices](security-best-practices/SKILL.md) | 安全最佳实践 |
| [security-ownership-map](security-ownership-map/SKILL.md) | 安全归属地图 |
| [security-threat-model](security-threat-model/SKILL.md) | 安全威胁建模 |

### Git / GitHub

| Skill | 说明 |
|-------|------|
| [gh-address-comments](gh-address-comments/SKILL.md) | 处理 GitHub PR Review 评论 |
| [gh-fix-ci](gh-fix-ci/SKILL.md) | 修复 GitHub Actions CI 失败 |
| [git-guardrails-claude-code](git-guardrails-claude-code/SKILL.md) | Git 操作护栏 |
| [to-issues](to-issues/SKILL.md) | 转换为 GitHub Issues |
| [workflow-checker](workflow-checker/SKILL.md) | 工作流检查 |

### 文档与写作

| Skill | 说明 |
|-------|------|
| [diagnose](diagnose/SKILL.md) | 诊断分析 |
| [doc](doc/SKILL.md) | 文档生成 |
| [edit-article](edit-article/SKILL.md) | 文章编辑 |
| [handoff](handoff/SKILL.md) | 项目交接 |
| [obsidian-vault](obsidian-vault/SKILL.md) | Obsidian 笔记库操作 |
| [pdf](pdf/SKILL.md) | PDF 文件处理 |
| [to-prd](to-prd/SKILL.md) | 转换为产品需求文档 |
| [ubiquitous-language](ubiquitous-language/SKILL.md) | 统一语言建模 |
| [writing-beats](writing-beats/SKILL.md) | 写作节奏 |
| [writing-fragments](writing-fragments/SKILL.md) | 写作片段 |
| [writing-shape](writing-shape/SKILL.md) | 写作塑形 |

### 知识管理

| Skill | 说明 |
|-------|------|
| [wiki-config](wiki-config/SKILL.md) | 交互式 Wiki 配置和架构管理 |
| [wiki-crystallize](wiki-crystallize/SKILL.md) | 将聊天会话提炼为结构化 Wiki 页面 |
| [wiki-ingest](wiki-ingest/SKILL.md) | 将源文件处理为合成后的 Wiki 页面 |
| [wiki-integrate](wiki-integrate/SKILL.md) | 将 Wiki 页面编织到知识图谱 |
| [wiki-lint](wiki-lint/SKILL.md) | Wiki 健康检查和链接验证 |
| [wiki-query](wiki-query/SKILL.md) | 使用 Wiki 知识库回答问题 |
| [obsidian-cli](obsidian-cli/SKILL.md) | 通过 Obsidian CLI 管理仓库内容 |

### 学习与科研

| Skill | 说明 |
|-------|------|
| [scholar-skill](scholar-skill/SKILL.md) | 学术论文深度阅读和知识内化 |
| [tutor-setup](tutor-setup/SKILL.md) | 将文档或代码库转换为 StudyVault |
| [tutor](tutor/SKILL.md) | 基于 StudyVault 的交互式测验辅导 |

### AI-Wiki 适配

以下 Skills 为上述原始版本的 AI-Wiki 适配版，针对 PARA 变体 Obsidian 笔记库重写：

| Skill | 原始版本 | 说明 |
|-------|---------|------|
| [ai-wiki-config](ai-wiki-config/SKILL.md) | wiki-config | 检查和展示 AI-Wiki 系统配置与架构状态 |
| [ai-wiki-query](ai-wiki-query/SKILL.md) | wiki-query | 基于全库内容回答问题，带 wikilink 引用 |
| [ai-wiki-ingest](ai-wiki-ingest/SKILL.md) | wiki-ingest | 将外部内容摄入并按 PARA 结构路由 |
| [ai-wiki-integrate](ai-wiki-integrate/SKILL.md) | wiki-integrate | 建立语义链接并更新目录导航 |
| [ai-wiki-lint](ai-wiki-lint/SKILL.md) | wiki-lint | 笔记库健康检查和 schema 合规校验 |
| [ai-wiki-crystallize](ai-wiki-crystallize/SKILL.md) | wiki-crystallize | 将对话提炼为持久笔记并按 PARA 归档 |
| [ai-wiki-vault](ai-wiki-vault/SKILL.md) | obsidian-vault | 在 AI-Wiki 中搜索、创建和管理笔记 |
| [ai-wiki-scholar](ai-wiki-scholar/SKILL.md) | scholar-skill | 学术论文阅读输出到 AI-Wiki 结构 |
| [ai-wiki-tutor-setup](ai-wiki-tutor-setup/SKILL.md) | tutor-setup | 将学习材料导入 AI-Wiki 生成结构化笔记 |
| [ai-wiki-tutor](ai-wiki-tutor/SKILL.md) | tutor | 基于 AI-Wiki 笔记进行交互式测验 |
| [ai-wiki-to-prd](ai-wiki-to-prd/SKILL.md) | to-prd | 将需求整理为项目文档归档到 AI-Wiki |
| [ai-wiki-obsidian-cli](ai-wiki-obsidian-cli/SKILL.md) | obsidian-cli | AI-Wiki 环境下的 Obsidian CLI 操作 |
| [ai-wiki-canvas-creator](ai-wiki-canvas-creator/SKILL.md) | obsidian-canvas-creator | AI-Wiki 中创建 Canvas 画布和可视化 |

### 环境 / 工具

| Skill | 说明 |
|-------|------|
| [env-bootstrap](env-bootstrap/SKILL.md) | 环境引导配置 |
| [defuddle](defuddle/SKILL.md) | 从网页提取干净 Markdown 内容 |
| [gstack](gstack/llms.txt) | 技术栈管理 |
| [setup-matt-pocock-skills](setup-matt-pocock-skills/SKILL.md) | 安装 Matt Pocock Skills |
| [setup-pre-commit](setup-pre-commit/SKILL.md) | 配置 pre-commit 钩子 |
| [write-a-skill](write-a-skill/SKILL.md) | 创建新的 Skill |

## 使用方式

将需要的 Skill 目录复制到你的 AI 编程助手配置目录中。以 Claude Code 为例：

```bash
# 复制单个 Skill
cp -r simplify ~/.claude/skills/

# 复制全部
cp -r */ ~/.claude/skills/
```

每个含 `SKILL.md` 的 Skill 目录都以该文件作为核心指令文件，AI 助手加载后会自动识别并应用。

## 中文本地化

本仓库的所有 `SKILL.md` 已完成中文翻译：

- YAML frontmatter 的 `name` 保留英文，确保工具兼容性；`description` 已翻译为中文
- Markdown 正文内容全部翻译为中文
- 代码块保持不变

本地化内容在 [`feature/full-localization`](https://github.com/hmjBill/skills/tree/feature/full-localization) 分支。

## 致谢与归属

所有 Skills 来源于开源社区，版权归原作者所有。详细的来源与许可证信息请参阅 [ATTRIBUTIONS.md](ATTRIBUTIONS.md)。

## 许可证

本仓库为 Skills 收集与汉化项目，各 Skill 的版权归各自作者所有，遵循其原始许可证。详见 [ATTRIBUTIONS.md](ATTRIBUTIONS.md)。
