---
name: to-issues
description: 将计划、规格或对话拆分为一组带阻塞关系的垂直切片（tracer bullet）Issue，并发布到项目 Issue 追踪器。当用户想要把计划转为 Issue、创建实施工单时使用。
---

# 拆分 Issue

将计划、规格或对话拆分为一组 **issue**：垂直切片（tracer bullet），每个 issue 声明**阻塞**它的其他 issue。

问题跟踪器和分类标签词汇应该已提供给你 — 如果没有，使用 setup-matt-pocock-skills skill。

## 流程

### 1. 收集上下文

从对话上下文中已有的内容工作。如果用户传入引用（规格路径、issue 编号或 URL）作为参数，获取它并阅读完整正文和评论。

### 2. 探索代码库（可选）

如果你尚未探索代码库，请这样做以了解代码的当前状态。issue 标题和描述应使用项目的领域词汇表（`GLOSSARY.md`），并尊重你触及区域的 ADR。

寻找预重构（prefactor）代码的机会，让实现更容易——"让变更变简单，再做简单的变更"。

### 3. 起草垂直切片

将工作分解为 **tracer bullet** 形式的 issue。

<vertical-slice-rules>

- 每个切片切穿每一层（schema、API、UI、测试），是一条狭窄但完整的路径：是垂直切片，而不是某一层的水平切片
- 完成的切片本身可以演示或验证
- 每个切片的大小以"装得下一个全新的上下文窗口"为判据
- 任何预重构都应先完成

</vertical-slice-rules>

给每个 issue 标注它的**阻塞边**：必须先完成才能开工的其他 issue。没有阻塞者的 issue 可以立即开始。

**宽重构（wide refactor）是垂直切片的例外。** 宽重构是一次机械性变更（重命名一列、改共享符号的类型），其**影响范围（blast radius）**横跨整个代码库：单次编辑会同时破坏成千上万个调用点，任何垂直切片都无法保持绿色。不要硬套 tracer bullet，而按 **expand–contract（先扩展后收缩）** 排序。先扩展：在旧形式旁边加上新形式，保证不破坏任何东西。再迁移：按影响范围分批（按 package、按目录）把调用点迁移过去，每批自成一个 issue、被扩展那一步阻塞；由于旧形式仍然存在，CI 能逐批保持绿色。最后收缩：确认没有调用者后删除旧形式，该 issue 被所有迁移批次阻塞。当批次单独也无法保持绿色时，保留该顺序，但让它们共享一个集成分支，所有批次共同阻塞最终的"集成并验证"issue；只在那个 issue 上承诺绿色。

### 4. 向用户提问

将提议的分解呈现为编号列表。对于每个 issue，显示：

- **标题**：简短的描述性名称
- **被阻塞于**：哪些其他 issue（如果有）必须先完成
- **交付内容**：这个 issue 让什么端到端行为可用

询问用户：

- 粒度感觉合适吗？（太粗 / 太细）
- 阻塞边正确吗：每个 issue 是否只依赖真正会阻塞它的 issue？
- 任何 issue 应该合并或进一步拆分吗？

迭代直到用户批准分解。

### 5. 将 issues 发布到配置的跟踪器

发布已批准的 issue。**如何发布**取决于项目 `docs/agents/issue-tracker.md`（由 setup-matt-pocock-skills 生成）中配置的跟踪器；issue 内容相同，只是阻塞边的形态不同：

- **GitHub** → 使用 `gh issue create` 逐条创建 issue，按依赖顺序（阻塞者在前）发布，以便阻塞边能引用真实标识符。平台支持原生阻塞/子 issue 关系（如 GitHub issue dependencies）时优先使用原生方式；否则把每个 issue 的"被阻塞于"指向阻塞它的 issue。除非另有指示，应用 `ready-for-agent` 分类标签。
- **本地 markdown 跟踪器** → 在 `.scratch/<feature-slug>/issues/<NN>-<slug>.md` 下每个 issue 写一个文件，从 `01` 起按依赖顺序（阻塞者在前）编号。每个文件的"被阻塞于"列出它依赖的编号/标题。使用下面的本地 issue 模板：一个 issue 一个文件，绝不写单个合并文件。
- **其他跟踪器** → 按 `docs/agents/issue-tracker.md` 中的说明执行。

如果 `docs/agents/issue-tracker.md` 不存在，先使用 setup-matt-pocock-skills skill 生成配置。

除非另有指示，用 `ready-for-agent` 分类标签发布；这些 issue 在构造上就是 agent 可领取的。

推进 **frontier**：任何阻塞者都已完成的 issue。对于纯线性链，就是从顶到底。

不要关闭或修改任何父 issue。

<local-issue-template>

# <NN>: <issue 标题>

**要构建的内容：** 这个 issue 让什么端到端行为可用——从用户视角描述，而不是逐层实现清单。

**被阻塞于：** 阻塞此 issue 的编号/标题，或"无（可以立即开始）"。

**状态：** ready-for-agent

- [ ] 验收标准 1
- [ ] 验收标准 2

</local-issue-template>

<issue-template>

## Parent

对问题跟踪器上父 issue 的引用（如果源是现有 issue，否则省略此部分）。

## 要构建的内容

这个 issue 让什么端到端行为可用——从用户视角描述，而不是逐层实现。

## 验收标准

- [ ] 标准 1
- [ ] 标准 2

## 被阻塞于

- 对每个阻塞 issue 的引用，或"无（可以立即开始）"。

</issue-template>

无论哪种形式，避免具体的文件路径或代码片段——它们很快就会过时。例外：如果原型产生的片段比散文能更精确地编码决策（状态机、reducer、schema、类型形状），在此处内联并简要说明它来自原型。精简到决策丰富的部分——不是工作演示，只是重要的部分。
