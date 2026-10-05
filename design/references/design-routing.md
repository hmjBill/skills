# 设计路由指南

何时使用哪个设计技能。

## 技能概览

| 技能 | 用途 |
|------|------|
| brand | 品牌识别、语调、信息框架、资产与风格指南 |
| design-system | 设计令牌架构、组件规范、令牌校验 |
| ui-styling | 使用 shadcn/ui + Tailwind 实现组件与页面 |
| slides | 使用 Chart.js、设计令牌和文案公式创建 HTML 演示文稿 |
| banner-design | 社交、广告、网页、印刷横幅设计 |

> Logo、CIP、图标为 `design` 技能的内置模块（见本技能 SKILL.md 与 `references/logo-*.md`、`references/cip-*.md`、`references/icon-design.md`），不单独成技能。

## 按任务类型路由

### 品牌识别任务
**→ brand**

- 定义品牌颜色与排版
- 创建 Logo 使用规范
- 建立品牌语调与语气
- 组织与验证品牌资产
- 创建信息框架
- 审计品牌一致性

### 令牌系统任务
**→ design-system**

- 创建设计令牌 JSON
- 生成 CSS 变量
- 定义组件规范
- 将令牌映射到 Tailwind 配置
- 校验代码中的令牌使用
- 记录状态与变体

### 实现任务
**→ ui-styling**

- 添加 shadcn/ui 组件
- 使用 Tailwind 类进行样式设计
- 实现深色模式
- 创建响应式布局
- 构建无障碍组件

### 演示文稿任务
**→ slides**

- 创建策略性 HTML 演示文稿
- 使用 Chart.js 做数据可视化
- 对幻灯片内容套用文案公式
- 使用布局模式与设计令牌

### 横幅设计任务
**→ banner-design**

- 社交平台横幅（Facebook、Twitter、LinkedIn、YouTube、Instagram）
- 广告横幅（Google Ads、Meta Ads）
- 网站英雄区与页眉
- 印刷横幅与封面
- 22 种艺术方向风格（极简、粗体排版、渐变、玻璃拟态等）

## 按问题类型路由

| 问题 | 技能 |
|------|------|
| "这个颜色应该用什么？" | brand |
| "如何为 X 创建令牌？" | design-system |
| "如何构建按钮组件？" | ui-styling |
| "这符合品牌规范吗？" | brand |
| "这里应该用 CSS 变量吗？" | design-system |
| "如何添加深色模式？" | ui-styling |
| "创建一份 pitch deck" | slides |
| "设计 Facebook 封面" | banner-design |
| "为 Google 创建广告横幅" | banner-design |
| "制作网站英雄区横幅" | banner-design |
| "为我的品牌创建 Logo" | design（内置 Logo 模块） |
| "生成名片样机" | design（内置 CIP 模块） |
| "生成设置图标" | design（内置图标模块） |

## 组合工作流

### 新项目设计系统

```
1. brand → 定义识别
   - 颜色、排版、语调

2. design-system → 创建令牌
   - 基础层、语义层、组件层

3. ui-styling → 实现
   - 配置 Tailwind、添加组件
```

### 设计系统迁移

```
1. brand → 审计现有资产
   - 提取品牌颜色、字体

2. design-system → 规范化令牌
   - 建立三层令牌架构

3. ui-styling → 更新代码
   - 替换硬编码值
```

### 组件创建

```
1. design-system → 参考规范
   - 按钮状态、尺寸、变体

2. ui-styling → 实现
   - 使用 shadcn/ui + Tailwind 构建
```

## 技能依赖

```
brand
    ↓ (颜色、排版)
design-system
    ↓ (令牌、规范)
ui-styling
    ↓ (组件)
应用代码
```

## 常用命令

**brand**（在 brand 技能目录下运行）：
```bash
node scripts/inject-brand-context.cjs
node scripts/validate-asset.cjs <asset-path>
```

**design-system**（在 design-system 技能目录下运行）：
```bash
node scripts/generate-tokens.cjs -c tokens.json
node scripts/validate-tokens.cjs -d src/
```

**ui-styling**：
```bash
npx shadcn@latest add button card input
```

## 多技能组合场景

使用 **brand + design-system + ui-styling** 当：

- 从零搭建设计系统并落地到代码

使用 **banner-design + brand** 当：

- 社交平台品牌横幅：跨平台统一品牌视觉

使用 **slides + design-system** 当：

- 基于既有设计令牌构建品牌演示文稿

使用 **brand + design-system** 当：

- 只定义设计语言，不做代码实现

使用 **design-system + ui-styling** 当：

- 在代码中实现既有品牌
- 构建组件库
