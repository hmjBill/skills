# GLOSSARY.md 格式

## 结构

```md
# {Context Name}

{One or two sentence description of what this context is and why it exists.}

## Language

**Order**:
{A one or two sentence description of the term}
_Avoid_: Purchase, transaction

**Invoice**:
A request for payment sent to a customer after delivery.
_Avoid_: Bill, payment request

**Customer**:
A person or organization that places orders.
_Avoid_: Client, buyer, account
```

## 规则

- **要有主见。** 同一概念存在多个词时，选择最好的一个，其余列在 `_Avoid_` 下。
- **定义要紧凑。** 最多一两句话。定义它*是什么*，而不是它*做什么*。
- **只收录本上下文特有的术语。** 通用编程概念（timeout、错误类型、工具模式）即使项目大量使用也不属于这里。添加术语前先问：这是本上下文特有的概念，还是通用编程概念？只有前者才收录。
- **不要承载实现细节。** `GLOSSARY.md` 只是术语表，不是 spec、草稿本或实现决策的存放处。
- **当自然簇出现时，把术语分组到子标题下。** 如果所有术语属于一个内聚领域，平铺即可。

## 可选增强

上游的最小格式只有 `## Language`。以下部分是本技能保留的本地增强，按需使用，不要强加。

### Relationships

用粗体术语名表达关系，明显处标出基数：

```md
## Relationships

- An **Order** produces one or more **Invoices**
- An **Invoice** belongs to exactly one **Customer**
```

### Example dialogue

写一段开发者与领域专家之间的对话，展示术语如何自然交互、澄清相邻概念的边界。

### Flagged ambiguities

术语被歧义使用时，明确列出并给出解决结论：

```md
## Flagged ambiguities

- "account" was used to mean both **Customer** and **User** — resolved: these are distinct concepts.
```

## 单上下文与多上下文仓库

**单上下文（大多数仓库）：** 仓库根目录一个 `GLOSSARY.md`。

**多上下文：** 仓库根目录的 `GLOSSARY-MAP.md` 列出各上下文、它们的位置以及相互关系：

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

本技能据此推断适用哪种结构：

- 如果存在 `GLOSSARY-MAP.md`，读取它以找到各上下文
- 如果只有根目录 `GLOSSARY.md`，则为单上下文
- 如果都不存在，在第一个术语被解决时惰性创建根目录 `GLOSSARY.md`

当存在多个上下文时，推断当前主题与哪个上下文相关。如果不清楚，就询问。
