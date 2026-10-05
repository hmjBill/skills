# 排版规范

定义和实施品牌排版的指南。

## 字体栈结构

### 主要字体
```css
/* 标题 - 用于视觉冲击的展示字体 */
--font-heading: 'Inter', system-ui, -apple-system, sans-serif;

/* 正文 - 适合长文阅读 */
--font-body: 'Inter', system-ui, -apple-system, sans-serif;

/* 等宽 - 代码、技术内容 */
--font-mono: 'JetBrains Mono', 'Fira Code', monospace;
```

### 字体加载
```html
<!-- Google Fonts（推荐） -->
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
```

## 字号比例

### 基础系统
- 基准字号：16px（1rem）
- 比例系数：1.25（大三度）

### 比例定义
| 元素 | 字号（rem） | 字号（px） | 字重 | 行高 |
|---------|------------|-----------|--------|-------------|
| 展示 | 3.815rem | 61px | 700 | 1.1 |
| H1 | 3.052rem | 49px | 700 | 1.2 |
| H2 | 2.441rem | 39px | 600 | 1.25 |
| H3 | 1.953rem | 31px | 600 | 1.3 |
| H4 | 1.563rem | 25px | 600 | 1.35 |
| H5 | 1.25rem | 20px | 600 | 1.4 |
| 大正文 | 1.125rem | 18px | 400 | 1.6 |
| 正文 | 1rem | 16px | 400 | 1.5 |
| 小号 | 0.875rem | 14px | 400 | 1.5 |
| 说明文字 | 0.75rem | 12px | 400 | 1.4 |

### 响应式调整
```css
/* 移动端（< 768px） */
h1 { font-size: 2rem; }    /* 32px */
h2 { font-size: 1.5rem; }  /* 24px */
h3 { font-size: 1.25rem; } /* 20px */
body { font-size: 1rem; }  /* 16px */

/* 桌面端（>= 768px） */
h1 { font-size: 3rem; }    /* 48px */
h2 { font-size: 2.25rem; } /* 36px */
h3 { font-size: 1.75rem; } /* 28px */
body { font-size: 1rem; }  /* 16px */
```

## 字重

### 字重比例
| 名称 | 值 | 用途 |
|------|-------|-------|
| 常规 | 400 | 正文、段落 |
| 中等 | 500 | 按钮、导航项 |
| 半粗体 | 600 | 小标题、强调 |
| 粗体 | 700 | 标题、CTA |

### 字重搭配
- 标题：600-700
- 正文：400
- 链接：500
- 按钮：600

## 行高指南

### 规则
| 内容类型 | 行高 | 说明 |
|--------------|-------------|-------|
| 标题 | 1.1-1.3 | 更紧凑以增强视觉冲击 |
| 正文 | 1.5-1.6 | 最佳可读性 |
| 小号文本 | 1.4-1.5 | 略紧凑 |
| 长文 | 1.6-1.75 | 更舒适 |

## 字距

### 指南
| 元素 | 字距方向 | 值 |
|---------|----------|-------|
| 展示 | 更紧 | -0.02em |
| 标题 | 正常 | 0 |
| 正文 | 正常 | 0 |
| 全大写 | 更宽 | 0.05em |
| 小型大写 | 更宽 | 0.1em |

## 段落间距

### 外边距
```css
/* 标题间距 */
h1, h2 { margin-top: 2rem; margin-bottom: 1rem; }
h3, h4 { margin-top: 1.5rem; margin-bottom: 0.75rem; }

/* 段落间距 */
p { margin-bottom: 1rem; }
p + p { margin-top: 0; }
```

### 最大行宽
- 正文：65-75 个字符（最佳）
- 标题：可以更宽
- 代码块：80-100 个字符

```css
.prose {
  max-width: 65ch;
}
```

## CSS 实现

### 完整变量
```css
:root {
  /* 字体族 */
  --font-heading: 'Inter', system-ui, sans-serif;
  --font-body: 'Inter', system-ui, sans-serif;
  --font-mono: 'JetBrains Mono', monospace;

  /* 字号 */
  --text-xs: 0.75rem;
  --text-sm: 0.875rem;
  --text-base: 1rem;
  --text-lg: 1.125rem;
  --text-xl: 1.25rem;
  --text-2xl: 1.5rem;
  --text-3xl: 1.875rem;
  --text-4xl: 2.25rem;
  --text-5xl: 3rem;

  /* 字重 */
  --font-normal: 400;
  --font-medium: 500;
  --font-semibold: 600;
  --font-bold: 700;

  /* 行高 */
  --leading-none: 1;
  --leading-tight: 1.25;
  --leading-snug: 1.375;
  --leading-normal: 1.5;
  --leading-relaxed: 1.625;
  --leading-loose: 2;
}
```

### Tailwind 配置
```javascript
theme: {
  fontFamily: {
    heading: ['Inter', 'system-ui', 'sans-serif'],
    body: ['Inter', 'system-ui', 'sans-serif'],
    mono: ['JetBrains Mono', 'monospace'],
  },
  fontSize: {
    xs: ['0.75rem', { lineHeight: '1rem' }],
    sm: ['0.875rem', { lineHeight: '1.25rem' }],
    base: ['1rem', { lineHeight: '1.5rem' }],
    lg: ['1.125rem', { lineHeight: '1.75rem' }],
    xl: ['1.25rem', { lineHeight: '1.75rem' }],
    '2xl': ['1.5rem', { lineHeight: '2rem' }],
    '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
    '4xl': ['2.25rem', { lineHeight: '2.5rem' }],
    '5xl': ['3rem', { lineHeight: '1.1' }],
  }
}
```

## 常见字体搭配

### 简洁现代
- 标题：Inter
- 正文：Inter

### 专业
- 标题：Playfair Display
- 正文：Source Sans Pro

### 创业/科技
- 标题：Poppins
- 正文：Open Sans

### 编辑风格
- 标题：Merriweather
- 正文：Lato

## 无障碍

### 最小字号
- 正文：最小 16px
- 小号文本：最小 14px，不用于长内容
- 说明文字：最小 12px，谨慎使用

### 对比度要求
- 背景上的文本：至少 4.5:1（AA）
- 大号文本（18px 以上）：至少 3:1

### 最佳实践
- 长文本不要全部大写
- 避免两端对齐（使用左对齐）
- 确保足够的行距
- 小字号不要使用过细字重（<400）
