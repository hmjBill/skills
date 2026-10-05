# 组件令牌

引用语义层的组件专用令牌。

## 按钮令牌

```css
:root {
  /* 默认（主色） */
  --button-bg: var(--color-primary);
  --button-fg: var(--color-primary-foreground);
  --button-hover-bg: var(--color-primary-hover);
  --button-active-bg: var(--color-primary-active);

  /* 次要 */
  --button-secondary-bg: var(--color-secondary);
  --button-secondary-fg: var(--color-secondary-foreground);
  --button-secondary-hover-bg: var(--color-secondary-hover);

  /* 描边 */
  --button-outline-border: var(--color-border);
  --button-outline-fg: var(--color-foreground);
  --button-outline-hover-bg: var(--color-accent);

  /* 幽灵 */
  --button-ghost-fg: var(--color-foreground);
  --button-ghost-hover-bg: var(--color-accent);

  /* 危险 */
  --button-destructive-bg: var(--color-destructive);
  --button-destructive-fg: var(--color-destructive-foreground);
  --button-destructive-hover-bg: var(--color-destructive-hover);

  /* 尺寸 */
  --button-padding-x: var(--space-4);
  --button-padding-y: var(--space-2);
  --button-padding-x-sm: var(--space-3);
  --button-padding-y-sm: var(--space-1-5);
  --button-padding-x-lg: var(--space-6);
  --button-padding-y-lg: var(--space-3);

  /* 形状 */
  --button-radius: var(--radius-md);
  --button-font-size: var(--font-size-sm);
  --button-font-weight: var(--font-weight-medium);
}
```

## 输入框令牌

```css
:root {
  /* 背景与边框 */
  --input-bg: var(--color-background);
  --input-border: var(--color-input);
  --input-fg: var(--color-foreground);

  /* 占位符 */
  --input-placeholder: var(--color-muted-foreground);

  /* 聚焦 */
  --input-focus-border: var(--color-ring);
  --input-focus-ring: var(--color-ring);

  /* 错误 */
  --input-error-border: var(--color-error);
  --input-error-fg: var(--color-error);

  /* 禁用 */
  --input-disabled-bg: var(--color-muted);
  --input-disabled-fg: var(--color-muted-foreground);

  /* 尺寸 */
  --input-padding-x: var(--space-3);
  --input-padding-y: var(--space-2);
  --input-radius: var(--radius-md);
  --input-font-size: var(--font-size-sm);
}
```

## 卡片令牌

```css
:root {
  /* 背景与边框 */
  --card-bg: var(--color-card);
  --card-fg: var(--color-card-foreground);
  --card-border: var(--color-border);

  /* 阴影 */
  --card-shadow: var(--shadow-default);
  --card-shadow-hover: var(--shadow-md);

  /* 间距 */
  --card-padding: var(--space-6);
  --card-padding-sm: var(--space-4);
  --card-gap: var(--space-4);

  /* 形状 */
  --card-radius: var(--radius-lg);
}
```

## 徽章令牌

```css
:root {
  /* 默认 */
  --badge-bg: var(--color-primary);
  --badge-fg: var(--color-primary-foreground);

  /* 次要 */
  --badge-secondary-bg: var(--color-secondary);
  --badge-secondary-fg: var(--color-secondary-foreground);

  /* 描边 */
  --badge-outline-border: var(--color-border);
  --badge-outline-fg: var(--color-foreground);

  /* 危险 */
  --badge-destructive-bg: var(--color-destructive);
  --badge-destructive-fg: var(--color-destructive-foreground);

  /* 尺寸 */
  --badge-padding-x: var(--space-2-5);
  --badge-padding-y: var(--space-0-5);
  --badge-radius: var(--radius-full);
  --badge-font-size: var(--font-size-xs);
}
```

## 提示令牌

```css
:root {
  /* 默认 */
  --alert-bg: var(--color-background);
  --alert-fg: var(--color-foreground);
  --alert-border: var(--color-border);

  /* 危险 */
  --alert-destructive-bg: var(--color-destructive);
  --alert-destructive-fg: var(--color-destructive-foreground);

  /* 间距 */
  --alert-padding: var(--space-4);
  --alert-radius: var(--radius-lg);
}
```

## 对话框/模态框令牌

```css
:root {
  /* 遮罩 */
  --dialog-overlay-bg: rgb(0 0 0 / 0.5);

  /* 内容 */
  --dialog-bg: var(--color-background);
  --dialog-fg: var(--color-foreground);
  --dialog-border: var(--color-border);
  --dialog-shadow: var(--shadow-lg);

  /* 间距 */
  --dialog-padding: var(--space-6);
  --dialog-radius: var(--radius-lg);
  --dialog-max-width: 32rem;
}
```

## 表格令牌

```css
:root {
  /* 表头 */
  --table-header-bg: var(--color-muted);
  --table-header-fg: var(--color-muted-foreground);

  /* 表体 */
  --table-row-bg: var(--color-background);
  --table-row-hover-bg: var(--color-muted);
  --table-row-fg: var(--color-foreground);

  /* 边框 */
  --table-border: var(--color-border);

  /* 间距 */
  --table-cell-padding-x: var(--space-4);
  --table-cell-padding-y: var(--space-3);
}
```

## 用法示例

```css
.button {
  background: var(--button-bg);
  color: var(--button-fg);
  padding: var(--button-padding-y) var(--button-padding-x);
  border-radius: var(--button-radius);
  font-size: var(--button-font-size);
  font-weight: var(--button-font-weight);
  transition: background var(--duration-fast);
}

.button:hover {
  background: var(--button-hover-bg);
}

.button.secondary {
  background: var(--button-secondary-bg);
  color: var(--button-secondary-fg);
}
```
