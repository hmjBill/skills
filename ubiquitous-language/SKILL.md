---
name: ubiquitous-language
description: 从当前对话中提取 DDD 风格的通用语言词汇表，标记歧义并提出规范术语。保存到 GLOSSARY.md。当用户想要定义领域术语、构建词汇表或创建通用语言时使用。
disable-model-invocation: true
---

# 通用语言

从当前对话中提取并形式化领域术语为一致的词汇表，写入工作目录的 `GLOSSARY.md`。

## 流程

1. **扫描对话** 寻找领域相关的名词、动词和概念
2. **识别问题**：
   - 同一词用于不同概念（歧义）
   - 不同词用于同一概念（同义词）
   - 模糊或重载的术语
3. **对抗式澄清**（见下节）——逐条逼问确认，不要静默汇总
4. **提出规范词汇表** 并带有明确的选择
5. **写入 `GLOSSARY.md`** 到工作目录，使用下面的输出格式
6. **在对话中输出摘要**

## 对抗式澄清

词汇表在交锋中成形，而不是在沉默中汇总：

- **词条冲突当场指出。** 当用户使用的术语与现有 `GLOSSARY.md` 冲突时，立即提出："你的词汇表将 'cancellation' 定义为 X，但你似乎指的是 Y——到底是哪个？"
- **锐化模糊词。** 当用户使用模糊或重载的术语时，提出精确的规范术语："你说的是 'account'——你指的是 Customer 还是 User？这些是不同的东西。"
- **编造边界场景压测。** 当讨论领域关系时，用具体场景施压。设计探测边缘情况的场景，迫使参与者对概念之间的边界保持精确。
- **与代码交叉验证。** 当用户说明某事如何工作时，检查代码是否同意。发现矛盾就摆出来："你的代码取消整个 Orders，但你刚才说部分取消是可能的——哪个是正确的？"

## 文件结构

**单上下文（大多数仓库）：** 仓库根目录一个 `GLOSSARY.md`。

**多上下文：** 仓库根目录的 `GLOSSARY-MAP.md` 指向每个上下文的 `GLOSSARY.md`，并记录它们之间的关系：

```md
# Glossary Map

## Contexts

- [Ordering](./src/ordering/GLOSSARY.md): 接收并跟踪客户订单
- [Billing](./src/billing/GLOSSARY.md): 生成发票并处理付款
- [Fulfillment](./src/fulfillment/GLOSSARY.md): 管理仓库拣货和发货

## Relationships

- **Ordering → Fulfillment**: Ordering 发出 `OrderPlaced` 事件；Fulfillment 消费它们开始拣货
- **Fulfillment → Billing**: Fulfillment 发出 `ShipmentDispatched` 事件；Billing 消费它们生成发票
- **Ordering ↔ Billing**: 共享 `CustomerId` 和 `Money` 类型
```

惰性创建文件——只有在有内容要写时才创建。如果不存在 `GLOSSARY.md`，在第一个术语被解决时创建；如果不存在 `docs/adr/`，在需要第一个 ADR 时创建。多上下文仓库中，推断当前主题属于哪个上下文；不清楚就问。

## 输出格式

使用此结构写入 `GLOSSARY.md` 文件：

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
- **保持定义紧密。** 最多一两句话。定义它*是什么*，而不是它*做什么*。
- **展示关系。** 使用粗体术语名称并在明显的地方表达基数。
- **只包括领域术语。** 跳过通用编程概念（array、function、endpoint），除非它们有领域特定含义。
- **不要承载实现细节。** `GLOSSARY.md` 只是术语表，不是 spec、草稿本或实现决策的存放处。
- **将术语分组到多个表** 当自然集群出现时（例如按子域、生命周期或参与者）。每个组获得自己的标题和表。如果所有术语属于一个内聚领域，一张表即可 — 不要强制分组。
- **写一个示例对话。** 一个开发者和领域专家之间的简短对话（3-5 个来回），展示术语如何自然交互。对话应澄清相关概念之间的边界并展示术语被精确使用。

## 提供 ADR

只有当以下三个条件全部满足时才建议创建 ADR：

1. **难以逆转** — 以后改变想法的代价是显著的
2. **没有上下文会令人惊讶** — 未来的读者会想知道"为什么他们这样做？"
3. **真正权衡的结果** — 存在真正的替代方案，你出于特定原因选择了其中一个

缺少任何一条都跳过 ADR。ADR 存放于 `docs/adr/`，格式见 grill-with-docs 技能的 `ADR-FORMAT.md`。

<example>

## Example dialogue

> **Dev:** "How do I test the **sync service** without Docker?"

> **Domain expert:** "Provide the **filesystem layer** instead of the **Docker layer**. It implements the same **Sandbox service** interface but uses a local directory as the **sandbox**."

> **Dev:** "So **sync-in** still creates a **bundle** and unpacks it?"

> **Domain expert:** "Exactly. The **sync service** doesn't know which layer it's talking to. It calls `exec` and `copyIn` — the **filesystem layer** just runs those as local shell commands."

</example>

## 重新运行

在同一对话中再次调用时：

1. 阅读现有的 `GLOSSARY.md`
2. 合并后续讨论中的任何新术语
3. 如果理解有演变，更新定义
4. 重新标记任何新的歧义
5. 重写示例对话以合并新术语
