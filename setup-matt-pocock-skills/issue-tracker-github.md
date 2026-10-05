# Issue 跟踪器：GitHub

本仓库的 issues 和规范文档以 GitHub issues 形式保存。所有操作使用 `gh` CLI。

## 约定

- **创建 issue**：`gh issue create --title "..." --body "..."`。多行正文使用 heredoc。
- **读取 issue**：`gh issue view <number> --comments`，用 `jq` 过滤评论，并获取标签。
- **列出 issues**：`gh issue list --state open --json number,title,body,labels,comments --jq '[.[] | {number, title, body, labels: [.labels[].name], comments: [.comments[].body]}]'`，配合适当的 `--label` 和 `--state` 过滤条件。
- **评论 issue**：`gh issue comment <number> --body "..."`
- **应用 / 移除标签**：`gh issue edit <number> --add-label "..."` / `--remove-label "..."`
- **关闭**：`gh issue close <number> --comment "..."`

仓库信息从 `git remote -v` 推断 — 在克隆目录内运行时 `gh` 会自动识别。

## Pull requests 作为分诊面

**PRs as a request surface: no.** _（如果本仓库把外部 PR 视为功能请求，改为 `yes`；`/triage` 会读取此开关。）_

设为 `yes` 时，PR 与 issue 走相同的标签和状态流，使用对应的 `gh pr` 命令：

- **读取 PR**：`gh pr view <number> --comments`；差异用 `gh pr diff <number>`。
- **列出待分诊的外部 PR**：`gh pr list --state open --json number,title,body,labels,author,authorAssociation,comments`，然后只保留 `authorAssociation` 为 `CONTRIBUTOR`、`FIRST_TIME_CONTRIBUTOR` 或 `NONE` 的条目（丢弃 `OWNER`/`MEMBER`/`COLLABORATOR`）。
- **评论 / 打标签 / 关闭**：`gh pr comment`、`gh pr edit --add-label`/`--remove-label`、`gh pr close`。

GitHub 的 issue 与 PR 共用一个编号空间，因此裸写的 `#42` 可能是其中之一：先用 `gh pr view 42` 解析，失败再回退到 `gh issue view 42`。

## 当技能说"发布到 issue 跟踪器"时

创建一个 GitHub issue。

## 当技能说"获取相关工单"时

运行 `gh issue view <number> --comments`。

## Wayfinding 操作

> 上游 `/wayfinder` 技能使用；本仓库未收录该技能，可跳过本节。

**地图**是单个 issue，**子** issue 是工单。

- **地图**：一个带 `wayfinder:map` 标签的 issue，承载 Notes / Decisions-so-far / Fog 正文。`gh issue create --label wayfinder:map`。
- **子工单**：作为地图的 GitHub sub-issue 链接（对 sub-issues 端点调用 `gh api`）。不支持 sub-issue 时，把子工单加入地图正文的任务列表，并在子工单正文顶部写 `Part of #<map>`。标签：`wayfinder:<type>`（`research`/`prototype`/`grilling`/`task`）。认领后，工单分配给执行开发。
- **阻塞**：GitHub 的**原生 issue 依赖**，规范且 UI 可见的表示。用 `gh api --method POST repos/<owner>/<repo>/issues/<child>/dependencies/blocked_by -F issue_id=<blocker-db-id>` 添加边，其中 `<blocker-db-id>` 是阻塞项的数值**数据库 id**（`gh api repos/<owner>/<repo>/issues/<n> --jq .id`，_不是_ `#number` 或 `node_id`）。GitHub 报告 `issue_dependencies_summary.blocked_by`（仅打开的阻塞项，即实时门禁）。依赖不可用时，回退到在子工单正文顶部写 `Blocked by: #<n>, #<n>`。所有阻塞项关闭后，工单解除阻塞。
- **边界查询**：列出地图的打开子工单（`gh issue list --state open`，限定到地图的 sub-issues / 任务列表），丢弃有任何打开的阻塞项（`issue_dependencies_summary.blocked_by > 0`，或 `Blocked by` 行中引用打开 issue）或有 assignee 的工单；按地图顺序取第一个。
- **认领**：`gh issue edit <n> --add-assignee @me`，会话的第一次写入。
- **解决**：`gh issue comment <n> --body "<answer>"`，然后 `gh issue close <n>`，再把上下文指针（要点 + 链接）追加到地图的 Decisions-so-far。
