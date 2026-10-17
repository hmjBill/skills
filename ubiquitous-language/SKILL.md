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
# 词汇表地图

## 上下文

- [Ordering](./src/ordering/GLOSSARY.md): 接收并跟踪客户订单
- [Billing](./src/billing/GLOSSARY.md): 生成发票并处理付款
- [Fulfillment](./src/fulfillment/GLOSSARY.md): 管理仓库拣货和发货

## 关系

- **Ordering → Fulfillment**: Ordering 发出 `OrderPlaced` 事件；Fulfillment 消费它们开始拣货
- **Fulfillment → Billing**: Fulfillment 发出 `ShipmentDispatched` 事件；Billing 消费它们生成发票
- **Ordering ↔ Billing**: 共享 `CustomerId` 和 `Money` 类型
```

惰性创建文件——只有在有内容要写时才创建。如果不存在 `GLOSSARY.md`，在第一个术语被解决时创建。多上下文仓库中，推断当前主题属于哪个上下文；不清楚就问。

## 输出格式

写入 `GLOSSARY.md` 时使用与 `grill-with-docs` 的 `GLOSSARY-FORMAT.md` 一致的格式（已内嵌在下方，本技能可独立使用）：

```md
# {上下文名称}

{一两句话说明这个上下文是什么、为什么存在。}

## Language

**Order**:
客户购买一个或多个商品的请求。
_Avoid_: Purchase, transaction

**Invoice**:
交付后向客户发出的付款请求。
_Avoid_: Bill, payment request
```

如果本轮已经由 `grill-with-docs` 内联写入，只做合并与补漏，不要重写既有格式或重复条目。

## 规则

- **只做术语表。** 本技能只写 `GLOSSARY.md`，不写 ADR、spec 或实现笔记。
- **同一概念只保留一个规范词**，其余列在 `_Avoid_` 下。
- **定义一两句话**，说明它*是什么*，不是它*做什么*。
- **只收录本上下文特有的领域术语**，不收录通用编程概念。
- **术语自然成簇时用 `##` 子标题分组**；否则平铺即可。
- **可选章节按需添加**（Relationships、Example dialogue、Flagged ambiguities），不要强加。
- **不写入实现细节**；`GLOSSARY.md` 只是术语表。
- **保留既有条目。** 合并新术语时，不删除仍然准确的旧定义；只在理解变化时更新。
- **不重写格式。** 已有文件使用什么结构就沿用，除非它与上述格式冲突。

## 与 ADR 的分工

本技能默认不创建 ADR。ADR 的三关判断与格式属于 `grill-with-docs` 技能；只有当用户明确要求，或决策同时满足“难以逆转、没有上下文会令人惊讶、真正权衡”三项时，才提示改用 `grill-with-docs`。

<example>

## 示例：术语如何在对话中澄清

> **开发：** "不用 Docker 怎么测试 **sync service**？"

> **领域专家：** "用 **filesystem layer** 替代 **Docker layer**。它实现的是同一个 **Sandbox service** 接口，只是把本地目录当作 **sandbox**。"

> **开发：** "那 **sync-in** 仍然会创建 **bundle** 并解包？"

> **领域专家：** "正是。**sync service** 不知道自己面对的是哪一层。它调用 `exec` 和 `copyIn`——**filesystem layer** 只是把它们当作本地 shell 命令执行。"

</example>

## 重新运行

在同一对话中再次调用时：

1. 阅读现有的 `GLOSSARY.md`
2. 合并后续讨论中的任何新术语
3. 如果理解有演变，更新定义
4. 重新标记任何新的歧义
5. 如有示例对话，按需更新以合并新术语
