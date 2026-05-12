---
name: 编写PRD
description: Turn the current conversation context into a PRD and publish it to the project issue tracker. Use when user wants to create a PRD from the current context.
---

此 skill 获取当前对话上下文和代码库理解并生成 PRD。不要采访用户 — 只是综合你已经知道的内容。

问题跟踪器和分类标签词汇应该已提供给你 — 如果没有，运行 `/setup-matt-pocock-skills`。

## 流程

1. 如果你尚未这样做，探索仓库以了解代码库的当前状态。在整个 PRD 中使用项目的领域词汇表，并尊重你触及区域的任何 ADR。

2. 勾勒你需要构建或修改的主要模块以完成实现。积极寻找可以提取深模块的机会，这些模块可以独立测试。

深模块（与浅模块相反）是封装了大量功能的模块，具有简单、可测试且很少变化的接口。

与用户确认这些模块是否符合他们的期望。与用户确认他们希望为哪些模块编写测试。

3. 使用下面的模板编写 PRD，然后将其发布到项目问题跟踪器。应用 `ready-for-agent` 分类标签 — 不需要额外的分类。

<prd-template>

## Problem Statement

用户面临的问题，从用户的角度。

## Solution

问题的解决方案，从用户的角度。

## User Stories

用户故事的详细编号列表。每个用户故事应采用以下格式：

1. As an <actor>, I want a <feature>, so that <benefit>

<user-story-example>
1. As a mobile bank customer, I want to see balance on my accounts, so that I can make better informed decisions about my spending
</user-story-example>

此用户故事列表应极其详尽，涵盖功能的所有方面。

## Implementation Decisions

所做实现的决策列表。这可以包括：

- 将要构建/修改的模块
- 将被修改的那些模块的接口
- 开发者的技术澄清
- 架构决策
- Schema 更改
- API 契约
- 特定交互

不要包含具体的文件路径或代码片段。它们可能很快过时。

例外：如果原型产生的片段比散文能更精确地编码决策（状态机、reducer、schema、类型形状），在内联在相关决策中并简要说明它来自原型。精简到决策丰富的部分 — 不是工作演示，只是重要的部分。

## Testing Decisions

所做的测试决策列表。包括：

- 什么是好测试的描述（只测试外部行为，不测试实现细节）
- 将被测试的模块
- 测试的先例（即代码库中类似的测试类型）

## Out of Scope

对此 PRD 范围之外的描述。

## Further Notes

关于此功能的任何进一步说明。

</prd-template>
