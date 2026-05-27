---
name: tutor
description: 基于 Obsidian StudyVault 进行交互式测验辅导，追踪概念掌握度和薄弱项。
---

# Tutor Skill

基于测验的辅导工具，在**概念级别**追踪用户的掌握和薄弱情况。目标是通过提问帮助用户发现盲点。

## 文件结构

```
StudyVault/
├── *dashboard*              ← 简洁概览：掌握度表格 + 统计
└── concepts/
    ├── {area-name}.md       ← 各领域概念追踪（尝试次数、状态、错题笔记）
    └── ...
```

- **Dashboard**：仅包含汇总数字，链接到概念文件。始终保持精简。
- **概念文件**：每个领域一个。追踪每个概念的尝试次数、正确数、日期、状态和错题笔记。随测试过的唯一概念数量增长（有上限）。

## 工作流

### 阶段 0：检测语言

从用户消息中检测语言 → `{LANG}`。所有输出和文件内容使用 `{LANG}`。

### 阶段 1：发现 Vault

1. 在项目中 Glob `**/StudyVault/`
2. 列出各节目录
3. Glob `**/StudyVault/*dashboard*` 查找仪表板
4. 如果找到，读取它。无论语言如何，保留现有文件路径。
5. 如果未找到，从模板创建（见下方 Dashboard 模板）

如果 StudyVault 不存在，通知用户并停止。

### 阶段 2：询问会话类型

**强制**：使用 AskUserQuestion 让用户选择操作。分析仪表板构建上下文感知选项，然后展示。

读取仪表板掌握度表格，根据当前状态构建选项：

1. 如果存在未测量领域（⬜）→ 包含"诊断"选项，针对这些领域
2. 如果存在薄弱领域（🟥/🟨）→ 包含"强化薄弱项"选项，指出最薄弱的领域
3. 始终包含"选择章节"选项，让用户可以指定任意领域
4. 如果所有领域都是 🟩/🟦 → 包含"高难度复习"选项

将这些作为 AskUserQuestion 展示，header 为"Session"，每个选项带简要描述说明针对哪些领域。用户必须先选择才能继续。

### 阶段 3：构建题目

1. 读取目标章节的 markdown 文件
2. 如果是强化薄弱项：同时读取 `concepts/{area}.md` 找到 🔴 未解决概念 —— 在新上下文中重新出题（不要重复相同问题）
3. 严格按照 `references/quiz-rules.md` 出 4 道题

**关键**：出题前必须先读取 `references/quiz-rules.md`。禁止给出任何提示。

### 阶段 4：展示测验

使用 AskUserQuestion：
- 4 道题，每题 4 个选项，单选
- Header："Q1. Topic"（最多 12 字符）
- 描述：中性，不含提示

### 阶段 5：评分与讲解

1. 展示结果表格（题目 / 正确答案 / 用户答案 / 结果）
2. 错误答案：简洁解释
3. 将每道题映射到其所属领域

### 阶段 6：更新文件

#### 1. 更新概念文件（`concepts/{area}.md`）

对每道作答的题目：
- **新概念**：在表格中添加行 + 如果答错，在 `### 오답 메모`（或本地化等效标题）下添加错题笔记
- **已有 🔴 概念回答正确**：递增 attempts 和 correct，状态改为 🟢，保留错题笔记（学习历史）
- **已有 🟢 概念再次答错**：递增 attempts，状态改回 🔴，更新错题笔记

表格格式：
```markdown
| Concept | Attempts | Correct | Last Tested | Status |
|---------|----------|---------|-------------|--------|
| concept name | 2 | 1 | 2026-02-24 | 🔴 |
```

错题笔记格式（仅答错时添加）：
```markdown
### Error Notes

**concept name**
- Confusion: what the user mixed up
- Key point: the correct understanding
```

#### 2. 更新仪表板

- 从概念文件重新计算各领域统计（汇总该领域所有概念的 attempts/correct）
- 更新掌握度徽章：🟥 0-39% · 🟨 40-69% · 🟩 70-89% · 🟦 90-100% · ⬜ 无数据
- 更新统计：总题数、累计正确率、未解决/已解决数量、最薄弱/最强领域

仪表板保持精简 —— 不记录会话日志，不记录逐题详情。

## Dashboard 模板

当仪表板不存在时创建。文件名本地化为 `{LANG}`。英文示例：

```markdown
# Learning Dashboard

> Concept-based metacognition tracking. See linked files for details.

---

## Proficiency by Area

| Area | Correct | Wrong | Rate | Level | Details |
|------|---------|-------|------|-------|---------|
（每个章节一行，最后一列 = [[concepts/{area}]] 链接）
| **Total** | **0** | **0** | **-** | ⬜ Unmeasured | |

> 🟥 Weak (0-39%) · 🟨 Fair (40-69%) · 🟩 Good (70-89%) · 🟦 Mastered (90-100%) · ⬜ Unmeasured

---

## Stats

- **Total Questions**: 0
- **Cumulative Rate**: -
- **Unresolved Concepts**: 0
- **Resolved Concepts**: 0
- **Weakest Area**: -
- **Strongest Area**: -
```

## 概念文件模板

每个领域首次出题时创建。示例：

```markdown
# {Area Name} — Concept Tracker

| Concept | Attempts | Correct | Last Tested | Status |
|---------|----------|---------|-------------|--------|

### Error Notes

（概念答错时添加）
```

## 重要提醒

- 出题前**必须**读取 `references/quiz-rules.md`
- **禁止**在选项标签或描述中包含提示
- **禁止**在任何选项上使用 "(Recommended)"
- 正确答案位置随机
- 评分后**必须**同时更新概念文件和仪表板
- 使用用户的语言沟通
