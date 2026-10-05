# 令牌架构

面向可扩展、可换肤设计系统的三层令牌体系。

## 层级概览

```
┌─────────────────────────────────────────────────┐
│  组件令牌                                       │  按组件覆盖
│  --button-bg, --card-padding                    │
├─────────────────────────────────────────────────┤
│  语义令牌                                       │  基于用途的别名
│  --color-primary, --spacing-section             │
├─────────────────────────────────────────────────┤
│  原始令牌                                       │  原始设计值
│  --color-blue-600, --space-4                    │
└─────────────────────────────────────────────────┘
```

## 为什么需要三层？

| 层级 | 用途 | 何时变更 |
|-------|---------|----------------|
| 原始 | 基础值（颜色、尺寸） | 很少 - 基础层 |
| 语义 | 赋予含义 | 主题切换 |
| 组件 | 组件定制 | 按组件需求 |

## 第 1 层：原始令牌

不带语义的原始设计值。

```css
:root {
  /* 颜色 */
  --color-gray-50: #F9FAFB;
  --color-gray-900: #111827;
  --color-blue-500: #3B82F6;
  --color-blue-600: #2563EB;

  /* 间距（4px 基准） */
  --space-1: 0.25rem;  /* 4px */
  --space-2: 0.5rem;   /* 8px */
  --space-4: 1rem;     /* 16px */
  --space-6: 1.5rem;   /* 24px */

  /* 排版 */
  --font-size-sm: 0.875rem;
  --font-size-base: 1rem;
  --font-size-lg: 1.125rem;

  /* 圆角 */
  --radius-sm: 0.25rem;
  --radius-default: 0.5rem;
  --radius-lg: 0.75rem;

  /* 阴影 */
  --shadow-sm: 0 1px 2px rgb(0 0 0 / 0.05);
  --shadow-default: 0 1px 3px rgb(0 0 0 / 0.1);
}
```

## 第 2 层：语义令牌

引用原始令牌、基于用途的别名。

```css
:root {
  /* 背景 */
  --color-background: var(--color-gray-50);
  --color-foreground: var(--color-gray-900);

  /* 主色 */
  --color-primary: var(--color-blue-600);
  --color-primary-hover: var(--color-blue-700);

  /* 次要色 */
  --color-secondary: var(--color-gray-100);
  --color-secondary-foreground: var(--color-gray-900);

  /* 弱化 */
  --color-muted: var(--color-gray-100);
  --color-muted-foreground: var(--color-gray-500);

  /* 危险 */
  --color-destructive: var(--color-red-600);
  --color-destructive-foreground: white;

  /* 间距 */
  --spacing-component: var(--space-4);
  --spacing-section: var(--space-6);
}
```

## 第 3 层：组件令牌

引用语义层的组件专用令牌。

```css
:root {
  /* 按钮 */
  --button-bg: var(--color-primary);
  --button-fg: white;
  --button-hover-bg: var(--color-primary-hover);
  --button-padding-x: var(--space-4);
  --button-padding-y: var(--space-2);
  --button-radius: var(--radius-default);

  /* 输入框 */
  --input-bg: var(--color-background);
  --input-border: var(--color-gray-300);
  --input-focus-ring: var(--color-primary);
  --input-padding: var(--space-2) var(--space-3);

  /* 卡片 */
  --card-bg: var(--color-background);
  --card-border: var(--color-gray-200);
  --card-padding: var(--space-4);
  --card-radius: var(--radius-lg);
  --card-shadow: var(--shadow-default);
}
```

## 深色模式

为深色主题覆盖语义令牌：

```css
.dark {
  --color-background: var(--color-gray-900);
  --color-foreground: var(--color-gray-50);
  --color-muted: var(--color-gray-800);
  --color-muted-foreground: var(--color-gray-400);
  --color-secondary: var(--color-gray-800);
}
```

## 命名规范

```
--{category}-{item}-{variant}-{state}

示例：
--color-primary           # 类别-条目
--color-primary-hover     # 类别-条目-状态
--button-bg-hover         # 组件-属性-状态
--space-section-sm        # 类别-语义-变体
```

## 类别

| 类别 | 示例 |
|----------|----------|
| color | primary, secondary, muted, destructive |
| space | 1, 2, 4, 8, section, component |
| font-size | xs, sm, base, lg, xl |
| radius | sm, default, lg, full |
| shadow | sm, default, lg |
| duration | fast, normal, slow |

## 文件组织

```
tokens/
├── primitives.css     # 原始值
├── semantic.css       # 用途别名
├── components.css     # 组件令牌
└── index.css          # 导入全部
```

或使用带层级注释的单文件：

```css
/* === 原始 === */
:root { ... }

/* === 语义 === */
:root { ... }

/* === 组件 === */
:root { ... }

/* === 深色模式 === */
.dark { ... }
```

## 从扁平令牌迁移

之前（扁平）：
```css
--button-primary-bg: #2563EB;
--button-secondary-bg: #F3F4F6;
```

之后（三层）：
```css
/* 原始 */
--color-blue-600: #2563EB;
--color-gray-100: #F3F4F6;

/* 语义 */
--color-primary: var(--color-blue-600);
--color-secondary: var(--color-gray-100);

/* 组件 */
--button-bg: var(--color-primary);
--button-secondary-bg: var(--color-secondary);
```

## W3C DTCG 对齐

令牌 JSON 格式（W3C Design Tokens Community Group）：

```json
{
  "color": {
    "blue": {
      "600": {
        "$value": "#2563EB",
        "$type": "color"
      }
    }
  }
}
```
