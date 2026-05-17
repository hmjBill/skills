---
name: ui-styling
description: 使用 shadcn/ui 组件（基于 Radix UI + Tailwind）、Tailwind CSS 实用优先样式和基于画布的视觉设计，创建美观、可访问的用户界面。
argument-hint: "[component or layout]"
license: MIT
metadata:
  author: claudekit
  version: "1.0.0"
---

# UI 样式

综合技能指南，用于创建美观、可访问的用户界面，结合使用 shadcn/ui 组件、 Tailwind CSS 工具类样式和基于 Canvas 的视觉设计系统。

## 参考资料

- shadcn/ui: https://ui.shadcn.com/llms.txt
- Tailwind CSS: https://tailwindcss.com/docs

## 何时使用此技能

适用于以下场景：
- 使用 React 框架构建 UI（Next.js、Vite、Remix、Astro）
- 实现可访问组件（对话框、表单、表格、导航）
- 使用工具类优先的 CSS 方式样式设计
- 创建响应式、移动端优先的布局
- 实现深色模式和主题定制
- 构建具有统一设计令牌的设计系统
- 生成视觉设计、海报或品牌素材
- 快速原型开发并获得即时视觉反馈
- 添加复杂的 UI 模式（数据表格、图表、命令面板）

## 核心技术栈

### 组件层：shadcn/ui
- 通过 Radix UI 原语构建的预置可访问组件
- 复制粘贴分发模式（组件位于你的代码库中）
- TypeScript 优先，完全类型安全
- 用于复杂 UI 的可组合原语
- 基于 CLI 的安装和管理

### 样式层：Tailwind CSS
- 工具类优先的 CSS 框架
- 构建时处理，零运行时开销
- 移动端优先的响应式设计
- 统一的设计令牌（颜色、间距、排版）
- 自动死代码消除

### 视觉设计层：Canvas
- 博物馆级别的视觉构图
- 哲学驱动的设计方法
- 复杂的视觉传达
- 文字最少化，视觉冲击最大化
- 系统化的模式和精致的审美

## 快速开始

### 组件 + 样式配置

**安装 shadcn/ui 和 Tailwind：**
```bash
npx shadcn@latest init
```

CLI 会提示选择框架、TypeScript、路径和主题偏好。这将同时配置 shadcn/ui 和 Tailwind CSS。

**添加组件：**
```bash
npx shadcn@latest add button card dialog form
```

**使用组件和工具类样式：**
```tsx
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"

export function Dashboard() {
  return (
    <div className="container mx-auto p-6 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      <Card className="hover:shadow-lg transition-shadow">
        <CardHeader>
          <CardTitle className="text-2xl font-bold">Analytics</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">View your metrics</p>
          <Button variant="default" className="w-full">
            View Details
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
```

### 备选方案：仅使用 Tailwind

**Vite 项目：**
```bash
npm install -D tailwindcss @tailwindcss/vite
```

```javascript
// vite.config.ts
import tailwindcss from '@tailwindcss/vite'
export default { plugins: [tailwindcss()] }
```

```css
/* src/index.css */
@import "tailwindcss";
```

## 组件库指南

**全面的组件目录，包含使用模式、安装和组合示例。**

参见：`references/shadcn-components.md`

涵盖内容：
- 表单和输入组件（Button、Input、Select、Checkbox、Date Picker、表单验证）
- 布局和导航（Card、Tabs、Accordion、Navigation Menu）
- 覆盖层和对话框（Dialog、Drawer、Popover、Toast、Command）
- 反馈和状态（Alert、Progress、Skeleton）
- 展示组件（Table、Data Table、Avatar、Badge）

## 主题和定制

**主题配置、CSS 变量、深色模式实现和组件定制。**

参见：`references/shadcn-theming.md`

涵盖内容：
- 使用 next-themes 配置深色模式
- CSS 变量系统
- 颜色定制和调色板
- 组件变体定制
- 主题切换实现

## 无障碍模式

**ARIA 模式、键盘导航、屏幕阅读器支持和可访问组件使用。**

参见：`references/shadcn-accessibility.md`

涵盖内容：
- Radix UI 无障碍功能
- 键盘导航模式
- 焦点管理
- 屏幕阅读器通知
- 表单验证无障碍

## Tailwind 工具类

**用于布局、间距、排版、颜色、边框和阴影的核心工具类。**

参见：`references/tailwind-utilities.md`

涵盖内容：
- 布局工具类（Flexbox、Grid、定位）
- 间距系统（padding、margin、gap）
- 排版（字体大小、粗细、对齐、行高）
- 颜色和背景
- 边框和阴影
- 自定义样式的任意值

## 响应式设计

**移动端优先断点、响应式工具类和自适应布局。**

参见：`references/tailwind-responsive.md`

涵盖内容：
- 移动端优先方法
- 断点系统（sm、md、lg、xl、2xl）
- 响应式工具类模式
- 容器查询
- 最大宽度查询
- 自定义断点

## Tailwind 定制

**配置文件结构、自定义工具类、插件和主题扩展。**

参见：`references/tailwind-customization.md`

涵盖内容：
- @theme 指令用于自定义令牌
- 自定义颜色和字体
- 间距和断点扩展
- 自定义工具类创建
- 自定义变体
- 层组织（@layer base、components、utilities）
- 用于组件提取的 apply 指令

## 视觉设计系统

**基于 Canvas 的设计哲学、视觉传达原则和复杂的构图。**

参见：`references/canvas-design-system.md`

涵盖内容：
- 设计哲学方法
- 视觉传达优于文字
- 系统化的模式和构图
- 颜色、形态和空间设计
- 文字最小化整合
- 博物馆级别的执行
- 多页面设计系统

## 实用脚本

**用于组件安装和配置生成的 Python 自动化脚本。**

### shadcn_add.py
添加 shadcn/ui 组件并处理依赖：
```bash
python scripts/shadcn_add.py button card dialog
```

### tailwind_config_gen.py
生成带有自定义主题的 tailwind.config.js：
```bash
python scripts/tailwind_config_gen.py --colors brand:blue --fonts display:Inter
```

## 最佳实践

1. **组件组合**：从简单、可组合的原语构建复杂的 UI
2. **工具类优先样式**：直接使用 Tailwind 类；只有在真正重复使用时才提取为组件
3. **移动端优先响应式**：从移动端样式开始，逐层添加响应式变体
4. **无障碍优先**：利用 Radix UI 原语，添加焦点状态，使用语义化 HTML
5. **设计令牌**：使用统一的间距比例、颜色调色板、排版系统
6. **深色模式一致性**：将深色变体应用于所有主题化元素
7. **性能**：利用自动 CSS 清理，避免动态类名
8. **TypeScript**：使用完全类型安全以获得更好的开发者体验
9. **视觉层次**：让组合引导注意力，有意识地使用间距和颜色
10. **专业工艺**：每个细节都很重要——将 UI 视为一门手艺

## 参考导航

**组件库**
- `references/shadcn-components.md` - 完整组件目录
- `references/shadcn-theming.md` - 主题和定制
- `references/shadcn-accessibility.md` - 无障碍模式

**样式系统**
- `references/tailwind-utilities.md` - 核心工具类
- `references/tailwind-responsive.md` - 响应式设计
- `references/tailwind-customization.md` - 配置和扩展

**视觉设计**
- `references/canvas-design-system.md` - 设计哲学和 Canvas 工作流程

**自动化**
- `scripts/shadcn_add.py` - 组件安装
- `scripts/tailwind_config_gen.py` - 配置生成

## 常见模式

**带验证的表单：**
```tsx
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8)
})

export function LoginForm() {
  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "" }
  })

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(console.log)} className="space-y-6">
        <FormField control={form.control} name="email" render={({ field }) => (
          <FormItem>
            <FormLabel>Email</FormLabel>
            <FormControl>
              <Input type="email" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <Button type="submit" className="w-full">Sign In</Button>
      </form>
    </Form>
  )
}
```

**带深色模式的响应式布局：**
```tsx
<div className="min-h-screen bg-white dark:bg-gray-900">
  <div className="container mx-auto px-4 py-8">
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
        <CardContent className="p-6">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
            Content
          </h3>
        </CardContent>
      </Card>
    </div>
  </div>
</div>
```

## 资源

- shadcn/ui 文档：https://ui.shadcn.com
- Tailwind CSS 文档：https://tailwindcss.com
- Radix UI：https://radix-ui.com
- Tailwind UI：https://tailwindui.com
- Headless UI：https://headlessui.com
- v0（AI UI 生成器）：https://v0.dev
