# Issue 跟踪器：本地 Markdown

本仓库的 issues 和规范文档以 markdown 文件形式保存在 `.scratch/` 下。

## 约定

- 每个功能一个目录：`.scratch/<feature-slug>/`
- 规范文档为 `.scratch/<feature-slug>/spec.md`
- 实现 issue 为 `.scratch/<feature-slug>/issues/<NN>-<slug>.md`，从 `01` 开始编号，绝不使用单个合并的工单文件
- 分诊状态记录在每个 issue 文件顶部附近的 `Status:` 行（角色字符串见 `triage-labels.md`）
- 评论和对话历史追加到文件底部的 `## Comments` 标题下

## 当技能说"发布到 issue 跟踪器"时

在 `.scratch/<feature-slug>/` 下创建新文件（如目录不存在则先创建）。

## 当技能说"获取相关工单"时

读取所引用路径的文件。用户通常会直接传入路径或 issue 编号。

## Wayfinding 操作

> 上游 `/wayfinder` 技能使用；本仓库未收录该技能，可跳过本节。

**地图**是一个文件，每个**子**工单对应一个文件。

- **地图**：`.scratch/<effort>/map.md`（Notes / Decisions-so-far / Fog 正文）。
- **子工单**：`.scratch/<effort>/issues/NN-<slug>.md`，从 `01` 开始编号，正文写问题。`Type:` 行记录工单类型（`research`/`prototype`/`grilling`/`task`）；`Status:` 行记录 `claimed`/`resolved`。
- **阻塞**：顶部附近的 `Blocked by: NN, NN` 行。列出文件全部 `resolved` 后，工单解除阻塞。
- **边界**：扫描 `.scratch/<effort>/issues/` 中打开、未阻塞且未认领的文件；按编号取第一个。
- **认领**：任何工作前先设 `Status: claimed` 并保存。
- **解决**：在 `## Answer` 标题下追加答案，设 `Status: resolved`，再把上下文指针（要点 + 链接）追加到 `map.md` 的 Decisions-so-far。
