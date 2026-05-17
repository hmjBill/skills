---
name: design
description: 综合设计技能：品牌识别、设计令牌、UI 样式、Logo 生成、企业识别系统、HTML 演示文稿、横幅设计、图标设计、社交照片。
argument-hint: "[design-type] [context]"
license: MIT
metadata:
  author: claudekit
  version: "2.1.0"
---

# 综合-设计

统一设计技能：品牌、令牌、UI、Logo、CIP、幻灯片、横幅、社交照片、图标。

## 使用场景

- 品牌识别、声音、资产
- 设计系统令牌和规范
- 使用 shadcn/ui + Tailwind 的 UI 样式
- Logo 设计和 AI 生成
- 企业形象计划（CIP）交付物
- 演示和推销 deck
- 社交媒体、广告、网页、印刷的横幅设计
- Instagram、Facebook、LinkedIn、Twitter、Pinterest、TikTok 的社交照片

## 子技能路由

| 任务 | 子技能 | 详情 |
|------|-----------|---------|
| 品牌识别、声音、资产 | `brand` | 外部技能 |
| 令牌、规范、CSS 变量 | `design-system` | 外部技能 |
| shadcn/ui、Tailwind、代码 | `ui-styling` | 外部技能 |
| Logo 创建、AI 生成 | Logo（内置） | `references/logo-design.md` |
| CIP 样机、交付物 | CIP（内置） | `references/cip-design.md` |
| 演示、推销 deck | Slides（内置） | `references/slides.md` |
| 横幅、封面、头部 | Banner（内置） | `references/banner-sizes-and-styles.md` |
| 社交媒体图片/照片 | Social Photos（内置） | `references/social-photos-design.md` |
| SVG 图标、图标集 | Icon（内置） | `references/icon-design.md` |

## Logo 设计（内置）

55+ 风格、30 种配色、25 个行业指南。Gemini Nano Banana 模型。

### Logo：生成设计简报

```bash
python3 ~/.claude/skills/design/scripts/logo/search.py "tech startup modern" --design-brief -p "BrandName"
```

### Logo：搜索风格/颜色/行业

```bash
python3 ~/.claude/skills/design/scripts/logo/search.py "minimalist clean" --domain style
python3 ~/.claude/skills/design/scripts/logo/search.py "tech professional" --domain color
python3 ~/.claude/skills/design/scripts/logo/search.py "healthcare medical" --domain industry
```

### Logo：使用 AI 生成

**始终**生成白色背景的输出 logo 图片。

```bash
python3 ~/.claude/skills/design/scripts/logo/generate.py --brand "TechFlow" --style minimalist --industry tech
python3 ~/.claude/skills/design/scripts/logo/generate.py --prompt "coffee shop vintage badge" --style vintage
```

**重要：** 脚本失败时，尝试直接修复。

生成后，**始终**通过 `AskUserQuestion` 询问用户是否需要 HTML 预览。如果是，调用 `/ui-ux-pro-max` 获取图库。

## CIP 设计（内置）

50+ 交付物、20 种风格、20 个行业。Gemini Nano Banana（Flash/Pro）。

### CIP：生成简报

```bash
python3 ~/.claude/skills/design/scripts/cip/search.py "tech startup" --cip-brief -b "BrandName"
```

### CIP：搜索领域

```bash
python3 ~/.claude/skills/design/scripts/cip/search.py "business card letterhead" --domain deliverable
python3 ~/.claude/skills/design/scripts/cip/search.py "luxury premium elegant" --domain style
python3 ~/.claude/skills/design/scripts/cip/search.py "hospitality hotel" --domain industry
python3 ~/.claude/skills/design/scripts/cip/search.py "office reception" --domain mockup
```

### CIP：生成样机

```bash
# 综合-设计
python3 ~/.claude/skills/design/scripts/cip/generate.py --brand "TopGroup" --logo /path/to/logo.png --deliverable "business card" --industry "consulting"

# 综合-设计
python3 ~/.claude/skills/design/scripts/cip/generate.py --brand "TopGroup" --logo /path/to/logo.png --industry "consulting" --set

# 综合-设计
python3 ~/.claude/skills/design/scripts/cip/generate.py --brand "TopGroup" --logo logo.png --deliverable "business card" --model pro

# 综合-设计
python3 ~/.claude/skills/design/scripts/cip/generate.py --brand "TechFlow" --deliverable "business card" --no-logo-prompt
```

模型：`flash`（默认，`gemini-2.5-flash-image`）、`pro`（`gemini-3-pro-image-preview`）

### CIP：渲染 HTML 演示

```bash
python3 ~/.claude/skills/design/scripts/cip/render-html.py --brand "TopGroup" --industry "consulting" --images /path/to/cip-output
```

**提示：** 如果没有 logo，先使用上面的 Logo 设计部分。

## Slides（内置）

使用 Chart.js、设计令牌、文案公式的战略 HTML 演示。

加载 `references/slides-create.md` 获取创建工作流程。

### Slides：知识库

| 主题 | 文件 |
|-------|------|
| 创建指南 | `references/slides-create.md` |
| 布局模式 | `references/slides-layout-patterns.md` |
| HTML 模板 | `references/slides-html-template.md` |
| 文案 | `references/slides-copywriting-formulas.md` |
| 策略 | `references/slides-strategies.md` |

## 横幅设计（内置）

22 种艺术方向风格，覆盖社交、广告、网页、印刷。使用 `frontend-design`、`ai-artist`、`ai-multimodal`、`chrome-devtools` 技能。

加载 `references/banner-sizes-and-styles.md` 获取完整的尺寸和风格参考。

### Banner：工作流程

1. **收集需求** 通过 `AskUserQuestion` — 目的、平台、内容、品牌、风格、数量
2. **研究** — 激活 `ui-ux-pro-max`，浏览 Pinterest 获取参考
3. **设计** — 使用 `frontend-design` 创建 HTML/CSS 横幅，使用 `ai-artist`/`ai-multimodal` 生成视觉元素
4. **导出** — 通过 `chrome-devtools` 以精确尺寸截图为 PNG
5. **展示** — 并排显示所有选项，根据反馈迭代

### Banner：快速尺寸参考

| 平台 | 类型 | 尺寸（px） |
|----------|------|-----------|
| Facebook | 封面 | 820 x 312 |
| Twitter/X | 头部 | 1500 x 500 |
| LinkedIn | 个人 | 1584 x 396 |
| YouTube | 频道图 | 2560 x 1440 |
| Instagram | 故事 | 1080 x 1920 |
| Instagram | 帖子 | 1080 x 1080 |
| Google Ads | 中矩形 | 300 x 250 |
| 网站 | 英雄区 | 1920 x 600-1080 |

### Banner：顶级艺术风格

| 风格 | 最佳用途 |
|-------|----------|
| 极简 | SaaS、科技 |
| 粗体排版 | 公告 |
| 渐变 | 现代品牌 |
| 照片风格 | 生活方式、电商 |
| 几何 | 科技、金融科技 |
| 玻璃拟态 | SaaS、应用 |
| 霓虹/赛博朋克 | 游戏、活动 |

### Banner：设计规则

- 安全区域：关键内容位于中间 70-80%
- 每个横幅一个 CTA，右下角，最小 44px 高度
- 最多 2 种字体，正文最小 16px，标题 ≥32px
- 广告文本低于 20%（Meta 惩罚）
- 印刷：300 DPI、CMYK、3-5mm 出血

## 图标设计（内置）

15 种风格、12 个类别。Gemini 3.1 Pro Preview 生成 SVG 文本输出。

### Icon：生成单个图标

```bash
python3 ~/.claude/skills/design/scripts/icon/generate.py --prompt "settings gear" --style outlined
python3 ~/.claude/skills/design/scripts/icon/generate.py --prompt "shopping cart" --style filled --color "#6366F1"
python3 ~/.claude/skills/design/scripts/icon/generate.py --name "dashboard" --category navigation --style duotone
```

### Icon：批量生成变体

```bash
python3 ~/.claude/skills/design/scripts/icon/generate.py --prompt "cloud upload" --batch 4 --output-dir ./icons
```

### Icon：多尺寸导出

```bash
python3 ~/.claude/skills/design/scripts/icon/generate.py --prompt "user profile" --sizes "16,24,32,48" --output-dir ./icons
```

### Icon：顶级风格

| 风格 | 最佳用途 |
|-------|----------|
| outlined | UI 界面、Web 应用 |
| filled | 移动应用、导航栏 |
| duotone | 营销、着陆页 |
| rounded | 友好应用、健康 |
| sharp | 科技、金融科技、企业 |
| flat | Material 设计、Google 风格 |
| gradient | 现代品牌、SaaS |

**模型：** `gemini-3.1-pro-preview` — 仅文本输出（SVG 是 XML 文本）。不需要图像生成 API。

## 社交照片（内置）

多平台社交图片设计：HTML/CSS → 截图导出。使用 `ui-ux-pro-max`、`brand`、`design-system`、`chrome-devtools` 技能。

加载 `references/social-photos-design.md` 获取尺寸、模板、最佳实践。

### Social Photos：工作流程

1. **编排** — `project-management` 技能用于 TODO 任务；并行子代理处理独立工作
2. **分析** — 解析提示：主题、平台、风格、品牌上下文、内容元素
3. **构思** — 3-5 个概念，通过 `AskUserQuestion` 展示
4. **设计** — `/ckm:brand` → `/ckm:design-system` → 随机调用 `/ck:ui-ux-pro-max` 或 `/ck:frontend-design`；每个想法 × 尺寸的 HTML
5. **导出** — `chrome-devtools` 或 Playwright 以精确 px 截图（2x deviceScaleFactor）
6. **验证** — 使用 Chrome MCP 或 `chrome-devtools` 技能目视检查导出的设计；修复布局/样式问题并重新导出
7. **报告** — 设计决策摘要到 `plans/reports/`
8. **组织** — 调用 `assets-organizing` 技能对输出文件和报告进行排序

### Social Photos：关键尺寸

| 平台 | 尺寸（px） | 平台 | 尺寸（px） |
|----------|-----------|----------|-----------|
| IG 帖子 | 1080×1080 | FB 帖子 | 1200×630 |
| IG 故事 | 1080×1920 | X 帖子 | 1200×675 |
| IG 轮播 | 1080×1350 | LinkedIn | 1200×627 |
| YT 缩略图 | 1280×720 | Pinterest | 1000×1500 |

## 工作流程

### 完整品牌包

1. **Logo** → `scripts/logo/generate.py` → 生成 logo 变体
2. **CIP** → `scripts/cip/generate.py --logo ...` → 创建交付物样机
3. **演示** → 加载 `references/slides-create.md` → 构建推销 deck

### 新设计系统

1. **品牌**（品牌技能）→ 定义颜色、排版、声音
2. **令牌**（设计系统技能）→ 创建语义令牌层
3. **实现**（ui-styling 技能）→ 配置 Tailwind、shadcn/ui

## 参考资料

| 主题 | 文件 |
|-------|------|
| 设计路由 | `references/design-routing.md` |
| Logo 设计指南 | `references/logo-design.md` |
| Logo 风格 | `references/logo-style-guide.md` |
| Logo 颜色 | `references/logo-color-psychology.md` |
| Logo 提示词 | `references/logo-prompt-engineering.md` |
| CIP 设计指南 | `references/cip-design.md` |
| CIP 交付物 | `references/cip-deliverable-guide.md` |
| CIP 风格 | `references/cip-style-guide.md` |
| CIP 提示词 | `references/cip-prompt-engineering.md` |
| Slides 创建 | `references/slides-create.md` |
| Slides 布局 | `references/slides-layout-patterns.md` |
| Slides 模板 | `references/slides-html-template.md` |
| Slides 文案 | `references/slides-copywriting-formulas.md` |
| Slides 策略 | `references/slides-strategies.md` |
| 横幅尺寸与风格 | `references/banner-sizes-and-styles.md` |
| 社交照片指南 | `references/social-photos-design.md` |
| 图标设计指南 | `references/icon-design.md` |

## 脚本

| 脚本 | 用途 |
|--------|---------|
| `scripts/logo/search.py` | 搜索 logo 风格、颜色、行业 |
| `scripts/logo/generate.py` | 使用 Gemini AI 生成 logo |
| `scripts/logo/core.py` | logo 数据的 BM25 搜索引擎 |
| `scripts/cip/search.py` | 搜索 CIP 交付物、风格、行业 |
| `scripts/cip/generate.py` | 使用 Gemini 生成 CIP 样机 |
| `scripts/cip/render-html.py` | 从 CIP 样机渲染 HTML 演示 |
| `scripts/cip/core.py` | CIP 数据的 BM25 搜索引擎 |
| `scripts/icon/generate.py` | 使用 Gemini 3.1 Pro 生成 SVG 图标 |

## 设置

```bash
export GEMINI_API_KEY="your-key"  # https://aistudio.google.com/apikey
pip install google-genai pillow
```

## 集成

**外部子技能：** brand、design-system、ui-styling
**相关技能：** frontend-design、ui-ux-pro-max、ai-multimodal、chrome-devtools
