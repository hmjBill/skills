# Issue 跟踪器：GitLab

本仓库的 issues 和 PRD 以 GitLab issues 形式保存。所有操作使用 [`glab`](https://gitlab.com/gitlab-org/cli) CLI。

## 约定

- **创建 issue**：`glab issue create --title "..." --description "..."`。多行描述使用 heredoc；传入 `--description -` 可打开编辑器。
- **读取 issue**：`glab issue view <number> --comments`。使用 `-F json` 获得机器可读输出。
- **列出 issues**：`glab issue list -F json`，配合适当的 `--label` 过滤条件。
- **评论 issue**：`glab issue note <number> --message "..."`。GitLab 将评论称为 "notes"。
- **应用 / 移除标签**：`glab issue update <number> --label "..."` / `--unlabel "..."`。多个标签可用逗号分隔或重复该参数。
- **关闭**：`glab issue close <number>`。`glab issue close` 不接受关闭评论，需先用 `glab issue note <number> --message "..."` 发布说明，再关闭。
- **合并请求**：GitLab 将 PR 称为 "merge requests"。使用 `glab mr create`、`glab mr view`、`glab mr note` 等 — 形态与 `gh pr ...` 相同，只是用 `mr` 代替 `pr`、用 `note`/`--message` 代替 `comment`/`--body`。

仓库信息从 `git remote -v` 推断 — 在克隆目录内运行时 `glab` 会自动识别。

## 当技能说"发布到 issue 跟踪器"时

创建一个 GitLab issue。

## 当技能说"获取相关工单"时

运行 `glab issue view <number> --comments`。
