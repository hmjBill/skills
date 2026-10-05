---
name: handoff
description: 将当前对话压缩为交接文档，供另一个代理接续工作。
argument-hint: "What will the next session be used for?"
---

撰写一份交接文档，总结当前对话，以便新的 agent 可以继续工作。保存到宿主临时目录中的新建文件：Windows 用 `[IO.Path]::GetTempFileName()` 获取路径，macOS/Linux 用 `mktemp -t handoff-XXXXXX.md`；拿到路径后写入，文件已有内容时先读取再覆盖。

文档中应包含“建议技能（suggested skills）”小节，列出下一个 agent 应通过 Skill 工具调用的技能名称。

对敏感信息进行脱敏，例如 API key、密码、个人身份信息（PII）。

不要复制已捕获在其他 artifact（如 AI-Wiki 中的 PRD、issue、diff）里的内容。改为通过路径或 URL 引用它们。

如果用户传递了参数，将其视为对下一个会话将关注内容的描述，并相应地定制文档。
