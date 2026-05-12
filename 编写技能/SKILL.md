---
name: write-a-skill
description: Create new agent skills with proper structure, progressive disclosure, and bundled resources. Use when user wants to create, write, or build a new skill.
---

# 编写技能

## 流程

1. **收集需求** - 询问用户：
   - 技能涵盖什么任务/领域？
   - 它应该处理哪些特定用例？
   - 它需要可执行脚本还是仅需要说明？
   - 有哪些参考资料要包含？

2. **起草技能** - 创建：
   - SKILL.md，包含简洁说明
   - 如果内容超过 500 行，则添加其他参考文件
   - 如果需要确定性操作，则添加实用脚本

3. **与用户审查** - 展示草稿并询问：
   - 这是否涵盖您的用例？
   - 是否有遗漏或不清楚的地方？
   - 是否有任何部分需要更详细/更简略？

## 技能结构

```
skill-name/
├── SKILL.md           # 主要说明（必需）
├── REFERENCE.md       # 详细文档（如果需要）
├── EXAMPLES.md        # 使用示例（如果需要）
└── scripts/           # 实用脚本（如果需要）
    └── helper.js
```

## SKILL.md 模板

```md
---
name: skill-name
description: Brief description of capability. Use when [specific triggers].
---

# Skill Name

## Quick start

[Minimal working example]

## Workflows

[Step-by-step processes with checklists for complex tasks]

## Advanced features

[Link to separate files: See [REFERENCE.md](REFERENCE.md)]
```

## 描述要求

描述是**代理在决定加载哪个技能时看到的唯一内容**。它在系统提示中与所有其他已安装技能一起显示。您的代理读取这些描述并根据用户请求选择相关技能。

**目标**：给代理足够信息以了解：

1. 此技能提供什么能力
2. 何时/为何触发它（特定关键词、上下文、文件类型）

**格式**：

- 最多 1024 个字符
- 用第三人称书写
- 第一句：做什么
- 第二句："Use when [specific triggers]"

**好示例**：

```
Extract text and tables from PDF files, fill forms, merge documents. Use when working with PDF files or when user mentions PDFs, forms, or document extraction.
```

**坏示例**：

```
Helps with documents.
```

坏示例让您的代理无法将其与其他文档技能区分开来。

## 何时添加脚本

在以下情况下添加实用脚本：

- 操作是确定性的（验证、格式化）
- 相同的代码会被反复生成
- 错误需要显式处理

脚本节省 token 并提高可靠性，而非生成代码。

## 何时拆分文件

在以下情况下拆分为单独的文件：

- SKILL.md 超过 100 行
- 内容有不同的领域（金融 vs 销售 schema）
- 高级功能很少需要

## 审查检查清单

起草后验证：

- [ ] 描述包含触发器（"Use when..."）
- [ ] SKILL.md 少于 100 行
- [ ] 没有时间敏感信息
- [ ] 术语一致
- [ ] 包含具体示例
- [ ] 引用深度仅一层
