# Tailwind CSS 响应式设计

移动端优先断点、响应式工具类与自适应布局。

## 移动端优先方法

Tailwind 采用移动端优先的响应式设计。基础样式应用于所有屏幕尺寸，然后用断点前缀在更大尺寸上覆盖。

```html
<!-- Base: 1 column (mobile)
     sm: 2 columns (tablet)
     lg: 4 columns (desktop) -->
<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
  <div>Item 1</div>
  <div>Item 2</div>
  <div>Item 3</div>
  <div>Item 4</div>
</div>
```

## 断点系统

**默认断点：**

| 前缀 | 最小宽度 | CSS 媒体查询 |
|--------|-----------|-----------------|
| `sm:` | 640px | `@media (min-width: 640px)` |
| `md:` | 768px | `@media (min-width: 768px)` |
| `lg:` | 1024px | `@media (min-width: 1024px)` |
| `xl:` | 1280px | `@media (min-width: 1280px)` |
| `2xl:` | 1536px | `@media (min-width: 1536px)` |

## 响应式模式

### 布局变化

```html
<!-- Vertical on mobile, horizontal on desktop -->
<div class="flex flex-col lg:flex-row gap-4">
  <div>Left</div>
  <div>Right</div>
</div>

<!-- 1 column -> 2 columns -> 3 columns -->
<div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
  <div>Item 1</div>
  <div>Item 2</div>
  <div>Item 3</div>
</div>
```

### 可见性

```html
<!-- Hide on mobile, show on desktop -->
<div class="hidden lg:block">
  Desktop only content
</div>

<!-- Show on mobile, hide on desktop -->
<div class="block lg:hidden">
  Mobile only content
</div>

<!-- Different content per breakpoint -->
<div class="lg:hidden">Mobile menu</div>
<div class="hidden lg:flex">Desktop navigation</div>
```

### 排版

```html
<!-- Responsive text sizes -->
<h1 class="text-2xl md:text-4xl lg:text-6xl font-bold">
  Heading scales with screen size
</h1>

<p class="text-sm md:text-base lg:text-lg">
  Body text scales appropriately
</p>
```

### 间距

```html
<!-- Responsive padding -->
<div class="p-4 md:p-6 lg:p-8">
  More padding on larger screens
</div>

<!-- Responsive gap -->
<div class="flex gap-2 md:gap-4 lg:gap-6">
  <div>Item 1</div>
  <div>Item 2</div>
</div>
```

### 宽度

```html
<!-- Full width on mobile, constrained on desktop -->
<div class="w-full lg:w-1/2 xl:w-1/3">
  Responsive width
</div>

<!-- Responsive max-width -->
<div class="max-w-sm md:max-w-2xl lg:max-w-4xl mx-auto">
  Centered with responsive max width
</div>
```

## 常见响应式布局

### 侧边栏布局

```html
<div class="flex flex-col lg:flex-row min-h-screen">
  <!-- Sidebar: Full width on mobile, fixed on desktop -->
  <aside class="w-full lg:w-64 bg-gray-100 p-4">
    Sidebar
  </aside>

  <!-- Main content -->
  <main class="flex-1 p-4 md:p-8">
    Main content
  </main>
</div>
```

### 卡片网格

```html
<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
  <div class="bg-white rounded-lg shadow p-6">Card 1</div>
  <div class="bg-white rounded-lg shadow p-6">Card 2</div>
  <div class="bg-white rounded-lg shadow p-6">Card 3</div>
  <div class="bg-white rounded-lg shadow p-6">Card 4</div>
</div>
```

### Hero 区域

```html
<section class="py-12 md:py-20 lg:py-32">
  <div class="container mx-auto px-4">
    <div class="flex flex-col lg:flex-row items-center gap-8 lg:gap-12">
      <div class="flex-1 text-center lg:text-left">
        <h1 class="text-4xl md:text-5xl lg:text-6xl font-bold mb-4">
          Hero Title
        </h1>
        <p class="text-lg md:text-xl mb-6">
          Hero description
        </p>
        <button class="px-6 py-3 md:px-8 md:py-4">
          CTA Button
        </button>
      </div>
      <div class="flex-1">
        <img src="hero.jpg" class="w-full rounded-lg" />
      </div>
    </div>
  </div>
</section>
```

### 导航

```html
<nav class="bg-white shadow">
  <div class="container mx-auto px-4">
    <div class="flex items-center justify-between h-16">
      <div class="text-xl font-bold">Logo</div>

      <!-- Desktop navigation -->
      <div class="hidden md:flex gap-6">
        <a href="#">Home</a>
        <a href="#">About</a>
        <a href="#">Services</a>
        <a href="#">Contact</a>
      </div>

      <!-- Mobile menu button -->
      <button class="md:hidden">
        <svg class="w-6 h-6">...</svg>
      </button>
    </div>
  </div>
</nav>
```

## 最大宽度查询

使用 `max-*:` 前缀仅在特定断点以下应用样式：

```html
<!-- Only on mobile and tablet (below 1024px) -->
<div class="max-lg:text-center">
  Centered on mobile/tablet, left-aligned on desktop
</div>

<!-- Only on mobile (below 640px) -->
<div class="max-sm:hidden">
  Hidden only on mobile
</div>
```

可用：`max-sm:` `max-md:` `max-lg:` `max-xl:` `max-2xl:`

## 范围查询

在断点之间应用样式：

```html
<!-- Only on tablets (between md and lg) -->
<div class="md:block lg:hidden">
  Visible only on tablets
</div>

<!-- Between sm and xl -->
<div class="sm:grid-cols-2 xl:grid-cols-4">
  2 columns on tablet, 4 on extra large
</div>
```

## 容器查询

根据父容器宽度为元素添加样式：

```html
<div class="@container">
  <div class="@md:grid-cols-2 @lg:grid-cols-3">
    Responds to parent width, not viewport
  </div>
</div>
```

容器查询断点：`@sm:` `@md:` `@lg:` `@xl:` `@2xl:`

## 自定义断点

在主题中定义自定义断点：

```css
@theme {
  --breakpoint-3xl: 120rem;  /* 1920px */
  --breakpoint-tablet: 48rem;  /* 768px */
}
```

```html
<div class="tablet:grid-cols-2 3xl:grid-cols-6">
  Uses custom breakpoints
</div>
```

## 响应式状态变体

将响应式与 hover/focus 组合：

```html
<!-- Hover effect only on desktop -->
<button class="lg:hover:scale-105">
  Scale on hover (desktop only)
</button>

<!-- Different hover colors per breakpoint -->
<a class="hover:text-blue-600 lg:hover:text-purple-600">
  Link
</a>
```

## 最佳实践

### 1. 移动端优先设计

从移动端样式开始，在更大断点逐步增加复杂度：

```html
<!-- Good: Mobile first -->
<div class="text-base md:text-lg lg:text-xl">

<!-- Avoid: Desktop first -->
<div class="text-xl lg:text-base">
```

### 2. 一致的断点使用

在相关元素上使用相同的断点：

```html
<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 lg:gap-8">
  Spacing scales with layout
</div>
```

### 3. 在断点边界测试

在精确的断点宽度（640px、768px、1024px 等）下测试，以捕捉边界情况。

### 4. 使用 Container 控制内容宽度

```html
<div class="container mx-auto px-4 sm:px-6 lg:px-8">
  <div class="max-w-7xl">
    Content with consistent max width
  </div>
</div>
```

### 5. 渐进增强

确保核心功能在移动端可用，再为更大屏幕增强：

```html
<!-- Core layout works on mobile -->
<div class="p-4">
  <!-- Enhanced spacing on desktop -->
  <div class="lg:p-8">
    Content
  </div>
</div>
```

### 6. 避免过多断点

为了可维护性，每个元素使用 2-3 个断点：

```html
<!-- Good: 2 breakpoints -->
<div class="grid-cols-1 md:grid-cols-2 lg:grid-cols-4">

<!-- Avoid: Too many breakpoints -->
<div class="grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
```

## 常见响应式工具类

### 响应式显示

```html
<div class="block md:flex lg:grid">
  Changes display type per breakpoint
</div>
```

### 响应式定位

```html
<div class="relative lg:absolute">
  Positioned differently per breakpoint
</div>
```

### 响应式顺序

```html
<div class="flex flex-col">
  <div class="order-2 lg:order-1">First on desktop</div>
  <div class="order-1 lg:order-2">First on mobile</div>
</div>
```

### 响应式溢出

```html
<div class="overflow-auto lg:overflow-visible">
  Scrollable on mobile, expanded on desktop
</div>
```

## 测试清单

- [ ] 在 320px（小屏手机）测试
- [ ] 在 640px（手机断点）测试
- [ ] 在 768px（平板断点）测试
- [ ] 在 1024px（桌面断点）测试
- [ ] 在 1280px（大桌面断点）测试
- [ ] 测试横屏方向
- [ ] 验证触摸目标（最小 44x44px）
- [ ] 检查所有尺寸下的文字可读性
- [ ] 验证导航在移动端可用
- [ ] 使用浏览器缩放测试
