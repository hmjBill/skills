---
name: ubiquitous-language
description: 从当前对话中提取 DDD 风格的通用语言词汇表，标记歧义并提出规范术语。保存到 UBIQUITOUS_LANGUAGE.md。当用户想要定义领域术语、构建词汇表或创建通用语言时使用。
disable-model-invocation: true
---

# 通用语言

从当前对话中提取并形式化领域术语为一致的词汇表，保存到本地文件。

## 流程

1. **扫描对话** 寻找领域相关的名词、动词和概念
2. **识别问题**：
   - 同一词用于不同概念（歧义）
   - 不同词用于同一概念（同义词）
   - 模糊或重载的术语
3. **提出规范词汇表** 并带有明确的选择
4. **写入 `UBIQUITOUS_LANGUAGE.md`** 到工作目录，使用以下格式
5. **在对话中输出摘要**

## 输出格式

使用此结构写入 `UBIQUITOUS_LANGUAGE.md` 文件：

```md
# 通用语言

## Order lifecycle

| Term        | Definition                                              | Aliases to avoid      |
| ----------- | ------------------------------------------------------- | --------------------- |
| **Order**   | A customer's request to purchase one or more items      | Purchase, transaction |
| **Invoice** | A request for payment sent to a customer after delivery | Bill, payment request |

## People

| Term         | Definition                                  | Aliases to avoid       |
| ------------ | ------------------------------------------- | ---------------------- |
| **Customer** | A person or organization that places orders | Client, buyer, account |
| **User**     | An authentication identity in the system    | Login, account         |

## Relationships

- An **Invoice** belongs to exactly one **Customer**
- An **Order** produces one or more **Invoices**

## Example dialogue

> **Dev:** "When a **Customer** places an **Order**, do we create the **Invoice** immediately?"
> **Domain expert:** "No — an **Invoice** is only generated once a **Fulfillment** is confirmed. A single **Order** can produce multiple **Invoices** if items ship in separate **Shipments**."
> **Dev:** "So if a **Shipment** is cancelled before dispatch, no **Invoice** exists for it?"
> **Domain expert:** "Exactly. The **Invoice** lifecycle is tied to the **Fulfillment**, not the **Order**."

## Flagged ambiguities

- "account" was used to mean both **Customer** and **User** — these are distinct concepts: a **Customer** places orders, while a **User** is an authentication identity that may or may not represent a **Customer**.
```

## 规则

- **要明确。** 当同一概念存在多个词时，选择最好的一个并列出其他作为应避免的别名。
- **明确标记冲突。** 如果术语在对话中被歧义使用，在"Flagged ambiguities"部分指出它并提供明确的建议。
- **只包括领域专家相关的术语。** 跳过模块或类的名称，除非它们在领域语言中有意义。
- **保持定义紧密。** 最多一句话。定义它*是什么*，而不是它*做什么*。
- **展示关系。** 使用粗体术语名称并在明显的地方表达基数。
- **只包括领域术语。** 跳过通用编程概念（array、function、endpoint），除非它们有领域特定含义。
- **将术语分组到多个表** 当自然集群出现时（例如按子域、生命周期或参与者）。每个组获得自己的标题和表。如果所有术语属于一个内聚领域，一张表即可 — 不要强制分组。
- **写一个示例对话。** 一个开发者和领域专家之间的简短对话（3-5 个来回），展示术语如何自然交互。对话应澄清相关概念之间的边界并展示术语被精确使用。

<example>

## Example dialogue

> **Dev:** "How do I test the **sync service** without Docker?"

> **Domain expert:** "Provide the **filesystem layer** instead of the **Docker layer**. It implements the same **Sandbox service** interface but uses a local directory as the **sandbox**."

> **Dev:** "So **sync-in** still creates a **bundle** and unpacks it?"

> **Domain expert:** "Exactly. The **sync service** doesn't know which layer it's talking to. It calls `exec` and `copyIn` — the **filesystem layer** just runs those as local shell commands."

</example>

## 重新运行

在同一对话中再次调用时：

1. 阅读现有的 `UBIQUITOUS_LANGUAGE.md`
2. 合并后续讨论中的任何新术语
3. 如果理解有演变，更新定义
4. 重新标记任何新的歧义
5. 重写示例对话以合并新术语
