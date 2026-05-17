---
name: design-system
description: 令牌架构、组件规格和幻灯片生成。三层令牌（基础→语义→组件）、CSS 变量、间距/排版比例、组件规格、策略性幻灯片创建。
argument-hint: "[component or token]"
license: MIT
metadata:
  author: claudekit
  version: "1.0.0"
---

# 设计系统

令牌架构、组件规范、系统化设计、幻灯片生成。

## 使用场景

- 设计令牌创建
- 组件状态定义
- CSS 变量系统
- 间距/排版比例
- 设计到代码的交接
- Tailwind 主题配置
- **幻灯片/演示生成**

## 令牌架构

加载：`references/token-architecture.md`

### 三层结构

```
Primitive（原始值）
       ↓
Semantic（用途别名）
       ↓
Component（组件特定）
```

**示例：**
```css
/* Primitive */
--color-blue-600: #2563EB;

/* Semantic */
--color-primary: var(--color-blue-600);

/* Component */
--button-bg: var(--color-primary);
```

## 快速开始

**生成令牌：**
```bash
node scripts/generate-tokens.cjs --config tokens.json -o tokens.css
```

**验证使用：**
```bash
node scripts/validate-tokens.cjs --dir src/
```

## 参考资料

| 主题 | 文件 |
|-------|------|
| 令牌架构 | `references/token-architecture.md` |
| 原始令牌 | `references/primitive-tokens.md` |
| 语义令牌 | `references/semantic-tokens.md` |
| 组件令牌 | `references/component-tokens.md` |
| 组件规范 | `references/component-specs.md` |
| 状态与变体 | `references/states-and-variants.md` |
| Tailwind 集成 | `references/tailwind-integration.md` |

## 组件规范模式

| 属性 | 默认 | 悬停 | 激活 | 禁用 |
|----------|---------|-------|--------|----------|
| 背景 | primary | primary-dark | primary-darker | muted |
| 文本 | white | white | white | muted-fg |
| 边框 | none | none | none | muted-border |
| 阴影 | sm | md | none | none |

## 脚本

| 脚本 | 用途 |
|--------|---------|
| `generate-tokens.cjs` | 从 JSON 令牌配置生成 CSS |
| `validate-tokens.cjs` | 检查代码中的硬编码值 |
| `search-slides.py` | BM25 搜索 + 上下文推荐 |
| `slide-token-validator.py` | 验证幻灯片 HTML 的令牌合规性 |
| `fetch-background.py` | 从 Pexels/Unsplash 获取图片 |

## 模板

| 模板 | 用途 |
|----------|---------|
| `design-tokens-starter.json` | 带三层结构的起始 JSON |

## 集成

**与品牌：** 从品牌颜色/排版提取原始令牌
**与 ui-styling：** 组件令牌 → Tailwind 配置

**技能依赖：** brand、ui-styling
**主要代理：** ui-ux-designer、frontend-developer

## 幻灯片系统

使用设计令牌 + Chart.js + 上下文决策系统创建品牌合规的演示。

### 事实来源

| 文件 | 用途 |
|------|------|
| `docs/brand-guidelines.md` | 品牌识别、声音、颜色 |
| `assets/design-tokens.json` | 令牌定义（原始→语义→组件） |
| `assets/design-tokens.css` | CSS 变量（导入幻灯片） |
| `assets/css/slide-animations.css` | CSS 动画库 |

### 幻灯片搜索（BM25）

```bash
# 设计系统
python scripts/search-slides.py "investor pitch"

# 设计系统
python scripts/search-slides.py "problem agitation" -d copy
python scripts/search-slides.py "revenue growth" -d chart

# 设计系统
python scripts/search-slides.py "problem slide" --context --position 2 --total 9
python scripts/search-slides.py "cta" --context --position 9 --prev-emotion frustration
```

### 决策系统 CSV

| 文件 | 用途 |
|------|------|
| `data/slide-strategies.csv` | 15 种 deck 结构 + 情感弧 + 火花线节拍 |
| `data/slide-layouts.csv` | 25 种布局 + 组件变体 + 动画 |
| `data/slide-layout-logic.csv` | 目标 → 布局 + break_pattern 标志 |
| `data/slide-typography.csv` | 内容类型 → 排版比例 |
| `data/slide-color-logic.csv` | 情感 → 颜色处理 |
| `data/slide-backgrounds.csv` | 幻灯片类型 → 图片类别（Pexels/Unsplash） |
| `data/slide-copy.csv` | 25 种文案公式（PAS、AIDA、FAB） |
| `data/slide-charts.csv` | 25 种图表类型及 Chart.js 配置 |

### 上下文决策流程

```
1. 解析目标/上下文
        ↓
2. 搜索 slide-strategies.csv → 获取策略 + 情感节拍
        ↓
3. 对于每个幻灯片：
   a. 查询 slide-layout-logic.csv → 布局 + break_pattern
   b. 查询 slide-typography.csv → 类型比例
   c. 查询 slide-color-logic.csv → 颜色处理
   d. 查询 slide-backgrounds.csv → 需要时获取图片
   e. 应用来自 slide-animations.css 的动画类
        ↓
4. 使用设计令牌生成 HTML
        ↓
5. 使用 slide-token-validator.py 验证
```

### 模式打破（Duarte Sparkline）

高级 deck 在情感之间交替以保持参与度：
```
"什么是"（挫折）↔"可能是什么"（希望）
```

系统在 1/3 和 2/3 位置计算模式打破。

### 幻灯片要求

**所有幻灯片必须：**
1. 导入 `assets/design-tokens.css` - 单一事实来源
2. 使用 CSS 变量：`var(--color-primary)`、`var(--slide-bg)` 等
3. 使用 Chart.js 绘制图表（不是纯 CSS 条形图）
4. 包含导航（键盘箭头、点击、进度条）
5. 内容居中对齐
6. 专注于说服/转化

### Chart.js 集成

```html
<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js"></script>

<canvas id="revenueChart"></canvas>
<script>
new Chart(document.getElementById('revenueChart'), {
    type: 'line',
    data: {
        labels: ['Sep', 'Oct', 'Nov', 'Dec'],
        datasets: [{
            data: [5, 12, 28, 45],
            borderColor: '#FF6B6B',  // 使用品牌珊瑚色
            backgroundColor: 'rgba(255, 107, 107, 0.1)',
            fill: true,
            tension: 0.4
        }]
    }
});
</script>
```

### 令牌合规性

```css
/* 正确 - 使用令牌 */
background: var(--slide-bg);
color: var(--color-primary);
font-family: var(--typography-font-heading);

/* 错误 - 硬编码 */
background: #0D0D0D;
color: #FF6B6B;
font-family: 'Space Grotesk';
```

### 参考实现

包含所有功能的工作示例：
```
assets/designs/slides/claudekit-pitch-251223.html
```

### 命令

```bash
/slides:create "10-slide investor pitch for ClaudeKit Marketing"
```

## 最佳实践

1. 组件中永不使用原始十六进制 — 始终引用令牌
2. 语义层支持主题切换（亮/暗）
3. 组件令牌支持按组件定制
4. 使用 HSL 格式控制不透明度
5. 记录每个令牌的用途
6. **幻灯片必须导入 design-tokens.css 并仅使用 var()**
