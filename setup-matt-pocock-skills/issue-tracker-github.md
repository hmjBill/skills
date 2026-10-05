# Issue 跟踪器：GitHub

本仓库的 issues 和 PRD 以 GitHub issues 形式保存。所有操作使用 `gh` CLI。

## 约定

- **创建 issue**：`gh issue create --title "..." --body "..."`。多行正文使用 heredoc。
- **读取 issue**：`gh issue view <number> --comments`，用 `jq` 过滤评论，并获取标签。
- **列出 issues**：`gh issue list --state open --json number,title,body,labels,comments --jq '[.[] | {number, title, body, labels: [.labels[].name], comments: [.comments[].body]}]'`，配合适当的 `--label` 和 `--state` 过滤条件。
- **评论 issue**：`gh issue comment <number> --body "..."`
- **应用 / 移除标签**：`gh issue edit <number> --add-label "..."` / `--remove-label "..."`
- **关闭**：`gh issue close <number> --comment "..."`

仓库信息从 `git remote -v` 推断 — 在克隆目录内运行时 `gh` 会自动识别。

## 当技能说"发布到 issue 跟踪器"时

创建一个 GitHub issue。

## 当技能说"获取相关工单"时

运行 `gh issue view <number> --comments`。
