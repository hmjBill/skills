---
name: slides
description: 使用 Chart.js、设计令牌、响应式布局、文案公式和上下文幻灯片策略创建策略性 HTML 演示文稿。
argument-hint: "[topic] [slide-count]"
metadata:
  author: claudekit
  version: "1.0.0"
---

# 幻灯片

使用数据可视化的战略性 HTML 演示设计。

<args>$ARGUMENTS</args>

## 何时使用

- 营销演示和 pitch deck
- 使用 Chart.js 的数据驱动幻灯片
- 战略性幻灯片设计与布局模式
- 文案优化演示内容

## 子命令

| 子命令 | 描述 | 参考 |
|--------|------|------|
| `create` | 创建战略性演示幻灯片 | `references/create.md` |

## 参考资料（知识库）

| 主题 | 文件 |
|------|------|
| 布局模式 | `references/layout-patterns.md` |
| HTML 模板 | `references/html-template.md` |
| 文案公式 | `references/copywriting-formulas.md` |
| 幻灯片策略 | `references/slide-strategies.md` |

## 路由

1. 从 `$ARGUMENTS`（第一个词）解析子命令
2. 加载相应的 `references/{subcommand}.md`
3. 使用剩余参数执行
