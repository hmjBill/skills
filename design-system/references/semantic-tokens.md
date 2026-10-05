# 语义令牌

基于用途、引用原始令牌的别名。

## 颜色语义

### 背景与前景

```css
:root {
  /* 页面背景 */
  --color-background: var(--color-gray-50);
  --color-foreground: var(--color-gray-900);

  /* 卡片/表面背景 */
  --color-card: white;
  --color-card-foreground: var(--color-gray-900);

  /* 浮层/下拉菜单 */
  --color-popover: white;
  --color-popover-foreground: var(--color-gray-900);
}
```

### 主色

```css
:root {
  --color-primary: var(--color-blue-600);
  --color-primary-hover: var(--color-blue-700);
  --color-primary-active: var(--color-blue-800);
  --color-primary-foreground: white;
}
```

### 次要色

```css
:root {
  --color-secondary: var(--color-gray-100);
  --color-secondary-hover: var(--color-gray-200);
  --color-secondary-foreground: var(--color-gray-900);
}
```

### 弱化

```css
:root {
  --color-muted: var(--color-gray-100);
  --color-muted-foreground: var(--color-gray-500);
}
```

### 强调

```css
:root {
  --color-accent: var(--color-gray-100);
  --color-accent-foreground: var(--color-gray-900);
}
```

### 危险

```css
:root {
  --color-destructive: var(--color-red-600);
  --color-destructive-hover: var(--color-red-700);
  --color-destructive-foreground: white;
}
```

### 状态色

```css
:root {
  --color-success: var(--color-green-600);
  --color-success-foreground: white;

  --color-warning: var(--color-yellow-500);
  --color-warning-foreground: var(--color-gray-900);

  --color-error: var(--color-red-600);
  --color-error-foreground: white;

  --color-info: var(--color-blue-500);
  --color-info-foreground: white;
}
```

### 边框与焦点环

```css
:root {
  --color-border: var(--color-gray-200);
  --color-input: var(--color-gray-200);
  --color-ring: var(--color-blue-500);
}
```

## 间距语义

```css
:root {
  /* 组件内部间距 */
  --spacing-component-xs: var(--space-1);
  --spacing-component-sm: var(--space-2);
  --spacing-component: var(--space-3);
  --spacing-component-lg: var(--space-4);

  /* 区块间距 */
  --spacing-section-sm: var(--space-8);
  --spacing-section: var(--space-12);
  --spacing-section-lg: var(--space-16);

  /* 页面边距 */
  --spacing-page-x: var(--space-4);
  --spacing-page-y: var(--space-6);
}
```

## 排版语义

```css
:root {
  /* 标题 */
  --font-heading: var(--font-size-2xl);
  --font-heading-lg: var(--font-size-3xl);
  --font-heading-xl: var(--font-size-4xl);

  /* 正文 */
  --font-body: var(--font-size-base);
  --font-body-sm: var(--font-size-sm);
  --font-body-lg: var(--font-size-lg);

  /* 标签与说明文字 */
  --font-label: var(--font-size-sm);
  --font-caption: var(--font-size-xs);
}
```

## 交互状态

```css
:root {
  /* 焦点环 */
  --ring-width: 2px;
  --ring-offset: 2px;
  --ring-color: var(--color-ring);

  /* 禁用状态不透明度 */
  --opacity-disabled: 0.5;

  /* 过渡 */
  --transition-colors: color, background-color, border-color;
  --transition-transform: transform;
  --transition-all: all;
}
```

## 深色模式覆盖

```css
.dark {
  --color-background: var(--color-gray-950);
  --color-foreground: var(--color-gray-50);

  --color-card: var(--color-gray-900);
  --color-card-foreground: var(--color-gray-50);

  --color-popover: var(--color-gray-900);
  --color-popover-foreground: var(--color-gray-50);

  --color-muted: var(--color-gray-800);
  --color-muted-foreground: var(--color-gray-400);

  --color-secondary: var(--color-gray-800);
  --color-secondary-foreground: var(--color-gray-50);

  --color-accent: var(--color-gray-800);
  --color-accent-foreground: var(--color-gray-50);

  --color-border: var(--color-gray-800);
  --color-input: var(--color-gray-800);
}
```

## 使用模式

### 应用语义令牌

```css
/* 正确 - 使用语义令牌 */
.card {
  background: var(--color-card);
  color: var(--color-card-foreground);
  border: 1px solid var(--color-border);
}

/* 错误 - 直接使用原始令牌 */
.card {
  background: var(--color-gray-50);
  color: var(--color-gray-900);
}
```

### 主题切换

语义令牌支持即时切换主题：

```js
// 切换深色模式
document.documentElement.classList.toggle('dark');
```
