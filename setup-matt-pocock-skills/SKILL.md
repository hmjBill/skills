---
name: setup-matt-pocock-skills
description: 在 AGENTS.md/CLAUDE.md 中设置代理技能块和 docs/agents/ 目录，使工程技能了解仓库的 Issue 追踪器、分诊标签词汇和领域文档布局。
disable-model-invocation: true
---

# 技能配置

为工程技能搭建每个仓库的配置假设：

- **问题跟踪器 (Issue tracker)** — issues 存放在哪里（默认为 GitHub；也原生支持本地 markdown）
- **分类标签 (Triage labels)** — 五个规范分类角色使用的字符串
- **领域文档 (Domain docs)** — `GLOSSARY.md` 和 ADR 存放位置，以及读取规则

这是一个提示驱动的 skill，不是确定性脚本。先探索，呈现发现，与用户确认，然后写入。

## 流程

### 1. 探索

查看当前仓库以了解其初始状态。读取已存在的内容；不要假设：

- `git remote -v` 和 `.git/config` — 这是 GitHub 仓库吗？是哪一个？
- 仓库根目录的 `AGENTS.md` 和 `CLAUDE.md` — 存在哪一个？其中是否有 `## Agent skills` 部分？
- 仓库根目录的 `GLOSSARY.md` 和 `GLOSSARY-MAP.md`
- `docs/adr/` 和任何 `src/*/docs/adr/` 目录
- `docs/agents/` — 此 skill 的先前输出是否已存在？
- `.scratch/` — 表示已使用本地-markdown 问题跟踪器约定的标志
- `triage` skill 是否已安装？（与本技能并列的 `triage` 技能文件夹，或你的可用技能列表中有 `triage`。）这决定部分 B 是否运行。
- monorepo 信号：`pnpm-workspace.yaml`、`package.json` 中的 `workspaces` 字段，或带自己 `src/` 的已填充 `packages/*`。这些只在真正的大型多包仓库中出现；没有它们就是单上下文，几乎所有仓库都是如此。

### 2. 呈现发现并询问

总结已存在的和缺失的内容。然后按顺序处理各部分：一部分，一个答案，再进入下一部分。不要一次性抛出全部。

每部分先给出推荐答案，让用户一个词就能接受。只有当选择确实分叉时才给一行说明；探索已经确定的部分直接跳过（未安装 `triage` 时跳过部分 B；没有 monorepo 信号时，部分 C 直接按单上下文写入、不询问）。假设用户不了解这些术语的含义。

**部分 A — 问题跟踪器。**

> 说明："问题跟踪器"是此仓库的 issues 存放位置。`to-issues`、`triage`、`to-prd` 和 `qa` 等 skill 从中读写 — 它们需要知道是调用 `gh issue create`、在 `.scratch/` 下写入 markdown 文件，还是遵循你描述的其他工作流程。选择你实际用于跟踪此仓库工作的位置。

默认姿态：这些 skill 是为 GitHub 设计的。如果 `git remote` 指向 GitHub，则提议使用 GitHub。如果指向 GitLab（`gitlab.com` 或自托管主机），则提议使用 GitLab。否则（或如果用户偏好），提供：

- **GitHub** — issues 存放在仓库的 GitHub Issues（使用 `gh` CLI）
- **GitLab** — issues 存放在仓库的 GitLab Issues（使用 [`glab`](https://gitlab.com/gitlab-org/cli) CLI）
- **本地 markdown** — issues 作为文件存放在此仓库的 `.scratch/<feature>/` 下（适合个人项目或没有远程的仓库）
- **其他**（Jira、Linear 等）— 请用户用一段话描述工作流程；skill 将其记录为自由格式文本

将选择记录到 `docs/agents/issue-tracker.md`。GitHub 与 GitLab 模板带有 "PRs/MRs as a request surface" 开关，默认**关闭**。保持关闭，不要主动提起它 — 想把外部 PR 纳入分诊队列的用户可以稍后在文件里打开。

**部分 B — 分类标签词汇。** 如果探索发现 `triage` skill 未安装，整段跳过 — 未安装的 skill 不需要标签。

如果已安装，只问一个问题：

> 保留默认分类标签吗？（推荐：**是**）

默认值是五个规范角色，每个角色的字符串等于其名称：`needs-triage`、`needs-info`、`ready-for-agent`、`ready-for-human`、`wontfix`。回答"是"就原样写入。只有用户说不（通常因为他们的跟踪器已使用其他名称，例如用 `bug:triage` 表示 `needs-triage`）才收集覆盖项，让 `triage` 应用现有标签而不是创建重复。

**部分 C — 领域文档。** 默认**单上下文 (single-context)**：仓库根目录一个 `GLOSSARY.md` + `docs/adr/`。这适合几乎所有仓库，直接写入、不要询问。

只有当探索发现 monorepo 信号时才提供**多上下文 (multi-context)**（根目录 `GLOSSARY-MAP.md` 指向各上下文的 `GLOSSARY.md` 文件）。此时再确认用户想要哪种布局。

### 3. 确认并编辑

向用户展示以下内容的草稿：

- 要添加到被编辑的 `CLAUDE.md` / `AGENTS.md` 中的 `## Agent skills` 块（见步骤 4 的选择规则）
- `docs/agents/issue-tracker.md`、`docs/agents/domain.md` 的内容，以及仅当 `triage` 已安装且部分 B 运行过时才包括的 `docs/agents/triage-labels.md`

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

只当 `triage` 已安装且部分 B 运行过时，才包含 `### Triage labels` 子块并写入 `docs/agents/triage-labels.md`；否则两者都省略。

然后使用此 skill 文件夹中的种子模板作为起点写入 docs 文件：

- [issue-tracker-github.md](./issue-tracker-github.md) — GitHub issue 跟踪器
- [issue-tracker-gitlab.md](./issue-tracker-gitlab.md) — GitLab issue 跟踪器
- [issue-tracker-local.md](./issue-tracker-local.md) — 本地-markdown issue 跟踪器
- [triage-labels.md](./triage-labels.md) — 标签映射（仅当 `triage` 已安装时）
- [domain.md](./domain.md) — 领域文档消费规则 + 布局

对于"其他" issue 跟踪器，使用用户的描述从头编写 `docs/agents/issue-tracker.md`。

### 5. 完成

告诉用户设置完成，以及哪些工程 skill 现在会从这些文件读取。提及他们稍后可以直接编辑 `docs/agents/*.md` — 只有在他们想切换 issue 跟踪器或从头开始时才需要重新运行此 skill。
