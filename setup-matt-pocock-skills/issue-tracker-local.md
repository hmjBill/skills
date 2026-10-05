# Issue 跟踪器：本地 Markdown

本仓库的 issues 和 PRD 以 markdown 文件形式保存在 `.scratch/` 下。

## 约定

- 每个功能一个目录：`.scratch/<feature-slug>/`
- PRD 为 `.scratch/<feature-slug>/PRD.md`
- 实现 issue 为 `.scratch/<feature-slug>/issues/<NN>-<slug>.md`，从 `01` 开始编号
- 分诊状态记录在每个 issue 文件顶部附近的 `Status:` 行（角色字符串见 `triage-labels.md`）
- 评论和对话历史追加到文件底部的 `## Comments` 标题下

## 当技能说"发布到 issue 跟踪器"时

在 `.scratch/<feature-slug>/` 下创建新文件（如目录不存在则先创建）。

## 当技能说"获取相关工单"时

读取所引用路径的文件。用户通常会直接传入路径或 issue 编号。
