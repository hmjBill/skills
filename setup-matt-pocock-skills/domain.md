# 领域文档

工程技能在探索代码库时应如何消费本仓库的领域文档。

## 探索之前，先阅读这些

- 仓库根目录的 **`CONTEXT.md`**，或
- 仓库根目录的 **`CONTEXT-MAP.md`**（如存在）— 它指向每个上下文对应的 `CONTEXT.md`。阅读与当前主题相关的每一个。
- **`docs/adr/`** — 阅读涉及你即将工作区域的 ADR。在多上下文仓库中，还要检查 `src/<context>/docs/adr/` 中的上下文级决策。

如果这些文件不存在，**静默继续**。不要指出其缺失，也不要建议预先创建。生产者技能（`/grill-with-docs`）会在术语或决策真正确定时按需创建。

## 文件结构

单上下文仓库（大多数仓库）：

```
/
├── CONTEXT.md
├── docs/adr/
│   ├── 0001-event-sourced-orders.md
│   └── 0002-postgres-for-write-model.md
└── src/
```

多上下文仓库（根目录存在 `CONTEXT-MAP.md`）：

```
/
├── CONTEXT-MAP.md
├── docs/adr/                          ← 系统级决策
└── src/
    ├── ordering/
    │   ├── CONTEXT.md
    │   └── docs/adr/                  ← 上下文特有决策
    └── billing/
        ├── CONTEXT.md
        └── docs/adr/
```

## 使用术语表的词汇

当输出中命名领域概念时（issue 标题、重构提案、假设、测试名称等），使用 `CONTEXT.md` 中定义的术语。不要漂移到术语表明确避免的同义词。

如果你需要的概念还不在术语表中，这是一个信号 — 要么你在发明项目不使用的语言（重新考虑），要么存在真正的缺口（记录下来交给 `/grill-with-docs`）。

## 标记 ADR 冲突

如果输出与现有 ADR 矛盾，要显式提出，而不是静默覆盖：

> _与 ADR-0007（event-sourced orders）矛盾 — 但值得重新讨论，因为…_
