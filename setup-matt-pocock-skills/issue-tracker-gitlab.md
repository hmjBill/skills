# Issue 跟踪器：GitLab

本仓库的 issues 和规范文档以 GitLab issues 形式保存。所有操作使用 [`glab`](https://gitlab.com/gitlab-org/cli) CLI。

## 约定

- **创建 issue**：`glab issue create --title "..." --description "..."`。多行描述使用 heredoc；传入 `--description -` 可打开编辑器。
- **读取 issue**：`glab issue view <number> --comments`。使用 `-F json` 获得机器可读输出。
- **列出 issues**：`glab issue list -F json`，配合适当的 `--label` 过滤条件。
- **评论 issue**：`glab issue note <number> --message "..."`。GitLab 将评论称为 "notes"。
- **应用 / 移除标签**：`glab issue update <number> --label "..."` / `--unlabel "..."`。多个标签可用逗号分隔或重复该参数。
- **关闭**：`glab issue close <number>`。`glab issue close` 不接受关闭评论，需先用 `glab issue note <number> --message "..."` 发布说明，再关闭。
- **合并请求**：GitLab 将 PR 称为 "merge requests"。使用 `glab mr create`、`glab mr view`、`glab mr note` 等 — 形态与 `gh pr ...` 相同，只是用 `mr` 代替 `pr`、用 `note`/`--message` 代替 `comment`/`--body`。

仓库信息从 `git remote -v` 推断 — 在克隆目录内运行时 `glab` 会自动识别。

## Merge requests 作为分诊面

**MRs as a request surface: no.** _（如果本仓库把外部合并请求视为功能请求，改为 `yes`；`/triage` 会读取此开关。）_

设为 `yes` 时，MR 与 issue 走相同的标签和状态流，使用对应的 `glab mr` 命令：

- **读取 MR**：`glab mr view <number> --comments`；差异用 `glab mr diff <number>`。
- **列出待分诊的外部 MR**：`glab mr list -F json`，然后只保留作者不是项目成员/所有者的 MR（即贡献者的 MR，而不是维护者进行中的工作）。
- **评论 / 打标签 / 关闭**：`glab mr note`、`glab mr update --label`/`--unlabel`、`glab mr close`。

与 GitHub 不同，GitLab 的 issue 与 MR 分开编号，因此一旦知道维护者指哪个面，`#42` 就是无歧义的。

## 当技能说"发布到 issue 跟踪器"时

创建一个 GitLab issue。

## 当技能说"获取相关工单"时

运行 `glab issue view <number> --comments`。

## Wayfinding 操作

> 上游 `/wayfinder` 技能使用；本仓库未收录该技能，可跳过本节。

**地图**是单个 issue，**子** issue 是工单。

- **地图**：一个带 `wayfinder:map` 标签的 issue，承载 Notes / Decisions-so-far / Fog 正文。`glab issue create --label wayfinder:map`。（在支持原生 epic 的 GitLab 套餐上，地图也可放在 epic 中；带标签的 issue 在所有套餐上都可用。）
- **子工单**：正文顶部带 `Part of #<map>`、标签为 `wayfinder:<type>`（`research`/`prototype`/`grilling`/`task`）的 issue。认领后，工单分配给执行开发。
- **阻塞**：GitLab 的**原生阻塞链接**，规范且 UI 可见的表示。用 `/blocked_by #<n>` quick action 添加，以 note 形式发布（`glab issue note <child> --message "/blocked_by #<blocker>"`）。原生阻塞链接是 Premium/Ultimate 功能；在免费套餐（或不可用时）回退到正文顶部的 `Blocked by: #<n>, #<n>` 行。所有阻塞项关闭后，工单解除阻塞。
- **边界查询**：`glab issue list -F json`，限定到地图的子工单，丢弃有任何打开的阻塞项（指向打开 issue 的原生 `blocked_by` 链接（`glab api projects/:id/issues/:iid/links`），或 `Blocked by` 行中引用打开 issue）或有 assignee 的工单；按地图顺序取第一个。
- **认领**：`glab issue update <n> --assignee @me`，会话的第一次写入。
- **解决**：`glab issue note <n> --message "<answer>"`，然后 `glab issue close <n>`，再把上下文指针（要点 + 链接）追加到地图的 Decisions-so-far。
