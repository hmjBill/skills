---
name: 工作交接
description: 将当前对话压缩为交接文档，供另一个代理接续工作。
argument-hint: "What will the next session be used for?"
---

撰写一份交接文档，总结当前对话，以便新的 agent 可以继续工作。将其保存到 `mktemp -t handoff-XXXXXX.md` 生成的路径（写入前先读取文件）。

如果下一个会话需要使用任何技能，请提出建议。

不要复制已捕获在其他 artifact（PRD、计划、ADR、issues、commits、diffs）中的内容。改为通过路径或 URL 引用它们。

如果用户传递了参数，将其视为对下一个会话将关注内容的描述，并相应地定制文档。
