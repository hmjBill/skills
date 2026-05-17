---
name: setup-matt-pocock-skills
description: 在 AGENTS.md/CLAUDE.md 中设置代理技能块和 docs/agents/ 目录，使工程技能了解仓库的 Issue 追踪器、分诊标签词汇和领域文档布局。
disable-model-invocation: true
---

# 技能配置

为工程技能搭建每个仓库的配置假设：

- **问题跟踪器 (Issue tracker)** — issues 存放在哪里（默认为 GitHub；也原生支持本地 markdown）
- **分类标签 (Triage labels)** — 五个规范分类角色使用的字符串
- **领域文档 (Domain docs)** — `CONTEXT.md` 和 ADR 存放位置，以及读取规则

这是一个提示驱动的 skill，不是确定性脚本。先探索，呈现发现，与用户确认，然后写入。

## 流程

### 1. 探索

查看当前仓库以了解其初始状态。读取已存在的内容；不要假设：

- `git remote -v` 和 `.git/config` — 这是 GitHub 仓库吗？是哪一个？
- 仓库根目录的 `AGENTS.md` 和 `CLAUDE.md` — 存在哪一个？其中是否有 `## Agent skills` 部分？
- 仓库根目录的 `CONTEXT.md` 和 `CONTEXT-MAP.md`
- `docs/adr/` 和任何 `src/*/docs/adr/` 目录
- `docs/agents/` — 此 skill 的先前输出是否已存在？
- `.scratch/` — 表示已使用本地-markdown 问题跟踪器约定的标志

### 2. 呈现发现并询问

总结已存在的和缺失的内容。然后逐一引导用户完成三个决策 — 呈现一个部分，获取用户答案，再进入下一个。不要一次性抛出全部三个。

假设用户不了解这些术语的含义。每个部分以简短说明开始（它是什么，为什么这些 skill 需要它，选择不同会有什么变化）。然后展示选项和默认值。

**部分 A — 问题跟踪器。**

> 说明： "问题跟踪器"是此仓库的 issues 存放位置。`to-issues`、`triage`、`to-prd` 和 `qa` 等 skill 从中读写 — 它们需要知道是调用 `gh issue create`、在 `.scratch/` 下写入 markdown 文件，还是遵循你描述的其他工作流程。选择你实际用于跟踪此仓库工作的位置。

默认姿态：这些 skill 是为 GitHub 设计的。如果 `git remote` 指向 GitHub，则提议使用 GitHub。如果指向 GitLab（`gitlab.com` 或自托管主机），则提议使用 GitLab。否则（或如果用户偏好），提供：

- **GitHub** — issues 存放在仓库的 GitHub Issues（使用 `gh` CLI）
- **GitLab** — issues 存放在仓库的 GitLab Issues（使用 [`glab`](https://gitlab.com/gitlab-org/cli) CLI）
- **本地 markdown** — issues 作为文件存放在此仓库的 `.scratch/<feature>/` 下（适合个人项目或没有远程的仓库）
- **其他**（Jira、Linear 等）— 请用户用一段话描述工作流程；skill 将其记录为自由格式文本

**部分 B — 分类标签词汇。**

> 说明：当 `triage` skill 处理传入的 issue 时，它会通过状态机移动它 — 需要评估、等待报告者、准备被 AFK agent 认领、准备人工处理或不会修复。为此，它需要应用与*你实际配置的*字符串匹配的标签（或你问题跟踪器中的等效物）。如果你的仓库已使用不同的标签名称（例如 `bug:triage` 而不是 `needs-triage`），在此处映射它们，这样 skill 应用正确的标签而不是创建重复的。

五个规范角色：

- `needs-triage` — 维护者需要评估
- `needs-info` — 等待报告者提供信息
- `ready-for-agent` — 完全指定，可由 AFK agent 处理（agent 可以在无人为上下文的情况下认领）
- `ready-for-human` — 需要人工实现
- `wontfix` — 不会被处理

默认值：每个角色的字符串等于其名称。询问用户是否要覆盖任何。如果你的问题跟踪器没有现有标签，默认值即可。

**部分 C — 领域文档。**

> 说明：一些 skill（`improve-codebase-architecture`、`diagnose`、`tdd`）读取 `CONTEXT.md` 文件来学习项目的领域语言，并读取 `docs/adr/` 了解过去的架构决策。它们需要知道仓库是有一个全局上下文还是多个（例如具有独立前端/后端上下文的 monorepo），以便在正确的位置查找。

确认布局：

- **单上下文 (Single-context)** — 一个 `CONTEXT.md` + `docs/adr/` 在仓库根目录。大多数仓库是这样。
- **多上下文 (Multi-context)** — 根目录有 `CONTEXT-MAP.md` 指向每个上下文的 `CONTEXT.md` 文件（通常是 monorepo）。

### 3. 确认并编辑

向用户展示以下内容的草稿：

- 要添加到被编辑的 `CLAUDE.md` / `AGENTS.md` 中的 `## Agent skills` 块（见步骤 4 的选择规则）
- `docs/agents/issue-tracker.md`、`docs/agents/triage-labels.md`、`docs/agents/domain.md` 的内容

让他们在写入前编辑。

### 4. 写入

**选择要编辑的文件：**

- 如果 `CLAUDE.md` 存在，则编辑它。
- 否则如果 `AGENTS.md` 存在，则编辑它。
- 如果两者都不存在，询问用户要创建哪一个 — 不要替他们选择。

永远不要在 `CLAUDE.md` 已存在时创建 `AGENTS.md`（反之亦然）— 总是编辑已存在的那个。

如果选中的文件中已存在 `## Agent skills` 块，则原地更新其内容，而不是追加重复块。不要覆盖用户对周围部分的编辑。

该块：

```markdown
## Agent skills

### Issue tracker

[关于 issues 跟踪位置的一行摘要]。见 `docs/agents/issue-tracker.md`。

### Triage labels

[关于标签词汇的一行摘要]。见 `docs/agents/triage-labels.md`。

### Domain docs

[关于布局的一行摘要 — "single-context" 或 "multi-context"]。见 `docs/agents/domain.md`。
```

然后使用此 skill 文件夹中的种子模板作为起点写入三个 docs 文件：

- [issue-tracker-github.md](./issue-tracker-github.md) — GitHub issue 跟踪器
- [issue-tracker-gitlab.md](./issue-tracker-gitlab.md) — GitLab issue 跟踪器
- [issue-tracker-local.md](./issue-tracker-local.md) — 本地-markdown issue 跟踪器
- [triage-labels.md](./triage-labels.md) — 标签映射
- [domain.md](./domain.md) — 领域文档消费规则 + 布局

对于"其他" issue 跟踪器，使用用户的描述从头编写 `docs/agents/issue-tracker.md`。

### 5. 完成

告诉用户设置完成，以及哪些工程 skill 现在会从这些文件读取。提及他们稍后可以直接编辑 `docs/agents/*.md` — 只有在他们想切换 issue 跟踪器或从头开始时才需要重新运行此 skill。
