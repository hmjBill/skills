# 社交照片设计指南

通过 HTML/CSS 渲染 + 截图导出来设计社交媒体图片。编排 `ui-ux-pro-max`、`brand`、`design-system` 和 `chrome-devtools` 技能。

## 平台尺寸

| 平台 | 类型 | 尺寸（px） | 宽高比 |
|----------|------|-----------|--------|
| Instagram | 帖子 | 1080 x 1080 | 1:1 |
| Instagram | 故事/Reel | 1080 x 1920 | 9:16 |
| Instagram | 轮播 | 1080 x 1350 | 4:5 |
| Facebook | 帖子 | 1200 x 630 | ~1.9:1 |
| Facebook | 故事 | 1080 x 1920 | 9:16 |
| Twitter/X | 帖子 | 1200 x 675 | 16:9 |
| Twitter/X | 卡片 | 800 x 418 | ~1.91:1 |
| LinkedIn | 帖子 | 1200 x 627 | ~1.91:1 |
| LinkedIn | 文章 | 1200 x 644 | ~1.86:1 |
| Pinterest | Pin 图 | 1000 x 1500 | 2:3 |
| YouTube | 缩略图 | 1280 x 720 | 16:9 |
| TikTok | 封面 | 1080 x 1920 | 9:16 |
| Threads | 帖子 | 1080 x 1080 | 1:1 |

## 工作流程

### 步骤 1：任务编排

创建持久化的 TODO 任务清单跟踪工作，拆解为：
- 需求分析任务
- 想法生成任务（一个或多个）
- HTML 设计任务（一个或多个）— 可按尺寸/变体并行拆解
- 截图导出任务（一个或多个）— 可按文件并行拆解
- 报告生成任务

对独立任务可启动并行子代理（例如为不同尺寸生成多个 HTML 文件）。

### 步骤 2：分析需求

解析用户输入中的：
- **主题/话题** — 社交照片表达的内容
- **目标平台** — 需要哪些尺寸（默认：Instagram 帖子 1:1 + 故事 9:16）
- **视觉风格** — 极简、大胆、渐变、照片风格等
- **品牌上下文** — 如存在 `docs/brand-guidelines.md` 则从中读取
- **内容元素** — 标题、副文案、CTA、图片、图标
- **数量** — 需要多少变体（默认：3）

### 步骤 3：生成想法

创建 3-5 个概念想法，要求：
- 符合输入提示/需求
- 考虑平台专属最佳实践
- 在构图、色彩、排版手法上有变化
- 如有品牌规范则与其对齐

向用户展示想法并征求确认，然后再开始设计。

### 步骤 4：设计 HTML 文件

按顺序激活以下技能：

1. **`brand`** — 从用户项目中提取品牌颜色、字体、语调
2. **`design-system`** — 获取设计令牌（间距、字号层级、配色）
3. **随机调用以下之一：** `ui-ux-pro-max` 或 `frontend-design` — 用于布局、层级、视觉平衡。每次随机选一个以获得设计多样性。

对每个已确认的想法 × 每个目标尺寸，创建一个 HTML 文件：

```
output/social-photos/
├── idea-1-instagram-post-1080x1080.html
├── idea-1-instagram-story-1080x1920.html
├── idea-2-instagram-post-1080x1080.html
├── idea-2-instagram-story-1080x1920.html
└── ...
```

#### HTML 设计规则

- **视口** — 设置与目标尺寸完全一致的像素尺寸
- **自包含** — 内联全部 CSS，通过 Google Fonts CDN 嵌入字体
- **无滚动** — 所有内容在一屏内
- **高对比** — 文字在缩略图尺寸下仍可读
- **品牌一致** — 使用提取的品牌颜色/字体
- **安全区域** — 关键内容位于中央 80% 区域内
- **排版** — 1080px 宽度下标题最小 24px，正文最小 16px
- **视觉层级** — 单一焦点，清晰的阅读动线

#### HTML 模板结构

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width={WIDTH}, initial-scale=1.0">
  <link href="https://fonts.googleapis.com/css2?family={FONT}&display=swap" rel="stylesheet">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body {
      width: {WIDTH}px;
      height: {HEIGHT}px;
      overflow: hidden;
      font-family: '{FONT}', sans-serif;
    }
    .canvas {
      width: {WIDTH}px;
      height: {HEIGHT}px;
      position: relative;
      /* 背景：渐变、纯色或图片 */
    }
    /* 来自 brand/design-system 的设计令牌 */
  </style>
</head>
<body>
  <div class="canvas">
    <!-- 内容层 -->
  </div>
</body>
</html>
```

### 步骤 5：截图导出

使用 Chrome 无头模式、`chrome-devtools` 技能或 Playwright/Puppeteer 截取精确尺寸的截图。

**重要：** 页面加载后始终延迟 3-5 秒，等字体/图片完全渲染后再截图。

#### 方案 A：Chrome 无头命令行（推荐 — 零依赖）

```bash
CHROME="<Chrome 可执行文件路径>"
DELAY=5  # 字体/图片加载所需的秒数

"$CHROME" \
  --headless \
  --disable-gpu \
  --no-sandbox \
  --hide-scrollbars \
  --window-size="${WIDTH},${HEIGHT}" \
  --virtual-time-budget=$((DELAY * 1000)) \
  --screenshot="output.png" \
  "file:///path/to/file.html"
```

关键参数：
- `--virtual-time-budget=5000` — 等待 5 秒虚拟时间，让资源（Google Fonts、图片）加载完成
- `--hide-scrollbars` — 防止截图中出现滚动条痕迹
- `--window-size=WxH` — 设置精确像素尺寸

#### 方案 B：chrome-devtools 技能

调用 `chrome-devtools` 技能，指示它：
1. 在浏览器中打开每个 HTML 文件
2. 将视口设置为精确的目标尺寸
3. 等待 3-5 秒让字体/图片完全加载
4. 将整页截图保存为 PNG
5. 保存到 `output/social-photos/exports/`

#### 方案 C：Playwright 脚本

```javascript
const { chromium } = require('playwright');

async function captureScreenshots(htmlFiles) {
  const browser = await chromium.launch();

  for (const file of htmlFiles) {
    const [width, height] = file.match(/(\d+)x(\d+)/).slice(1).map(Number);

    const page = await browser.newPage();
    await page.setViewportSize({ width, height });
    await page.goto(`file://${file}`, { waitUntil: 'networkidle' });
    // 等待字体/图片完全渲染
    await page.waitForTimeout(3000);

    const outputPath = file.replace('.html', '.png').replace('social-photos/', 'social-photos/exports/');
    await page.screenshot({ path: outputPath, type: 'png' });
    await page.close();
  }

  await browser.close();
}
```

#### 方案 D：Puppeteer 脚本

```javascript
const puppeteer = require('puppeteer');

async function captureScreenshots(htmlFiles) {
  const browser = await puppeteer.launch();

  for (const file of htmlFiles) {
    const [width, height] = file.match(/(\d+)x(\d+)/).slice(1).map(Number);

    const page = await browser.newPage();
    await page.setViewport({ width, height, deviceScaleFactor: 2 }); // 2 倍分辨率（retina）
    await page.goto(`file://${file}`, { waitUntil: 'networkidle0' });
    // 等待字体/图片完全渲染
    await new Promise(r => setTimeout(r, 3000));

    const outputPath = file.replace('.html', '.png').replace('social-photos/', 'social-photos/exports/');
    await page.screenshot({ path: outputPath, type: 'png' });
    await page.close();
  }

  await browser.close();
}
```

**重要：** 使用 `deviceScaleFactor: 2` 获得 retina 级输出（仅 Puppeteer）。

### 步骤 6：验证与修复设计

使用 Chrome MCP 或 `chrome-devtools` 技能逐一目视检查导出的 PNG：

1. 打开导出的截图，检查布局/样式问题
2. 验证：字体渲染正确、颜色符合品牌、文字在缩略图尺寸下可读
3. 检查：无溢出、无内容裁切、遵守安全区域、视觉层级清晰
4. 发现问题 → 修复 HTML 源文件 → 重新导出截图 → 再次验证
5. 重复直到所有设计通过视觉 QA

**常见问题检查：**
- 字体未加载（回退到系统字体）
- 文字溢出或被裁切
- 元素超出安全区域（中央 80%）
- 文字对比度不足（低于 WCAG AA 4.5:1）
- 元素错位或布局破损

### 步骤 7：生成总结报告

将报告保存到 `plans/reports/`（按项目约定命名）。

报告结构：

```markdown
# 社交照片设计报告

## 概述
- 提示词/需求：{original input}
- 平台：{target platforms}
- 变体数量：{count}
- 风格：{chosen style}

## 生成的想法
1. **{Idea name}** — {brief description, rationale}
2. ...

## 设计决策
- 配色：{colors used, why}
- 排版：{fonts, sizes, why}
- 布局：{composition approach, why}
- 品牌一致性：{how brand guidelines influenced design}

## 输出文件
| 文件 | 尺寸 | 平台 | 预览 |
|------|------|----------|---------|
| exports/{filename}.png | {WxH} | {platform} | {description} |

## 为什么有效
- {Platform-specific reasoning}
- {Brand alignment reasoning}
- {Visual hierarchy reasoning}
- {Engagement potential reasoning}

## 建议
- {A/B test suggestions}
- {Platform-specific tips}
- {Iteration opportunities}
```

### 步骤 8：整理输出

整理所有输出文件与报告（按项目约定归档）：
- 将导出的 PNG 移动/复制到合适的资产目录
- 确保报告位于 `plans/reports/` 且命名正确
- 如需要，清理中间 HTML 文件
- 为输出添加元数据标签（平台、尺寸、概念名）

## 设计最佳实践

### 平台专属提示

- **Instagram** — 视觉优先，文字最少（<20%），色彩强烈，生活方式感
- **Facebook** — 信息量大，可容纳更多文字，在信息流中抓眼
- **Twitter/X** — 大胆标题，兼顾深/浅色模式的对比，信息清晰
- **LinkedIn** — 专业、干净、数据驱动的视觉，思想领导力
- **Pinterest** — 竖版格式，图片上叠加文字，教程风格
- **YouTube** — 人脸特写效果最好，色彩明亮，小尺寸下可读
- **TikTok** — 潮流、活力、大胆排版，面向年轻群体

### 艺术方向风格（复用自横幅）

| 风格 | 最佳用途 | 关键元素 |
|-------|----------|--------------|
| 极简 | SaaS、科技、奢华 | 留白、单一强调色、干净字体 |
| 粗体排版 | 公告、引言 | 大字号、高对比、最少图像 |
| 渐变网格 | 现代品牌、应用 | 流动的色彩过渡、悬浮元素 |
| 照片风格 | 生活方式、电商 | 主视觉图、细微叠加、图上文字 |
| 几何 | 科技、金融科技 | 形状、图案、结构化布局 |
| 玻璃拟态 | SaaS、现代应用 | 磨砂玻璃、模糊效果、透明感 |
| 扁平插画 | 教育、健康 | 定制插画、友好、平易近人 |
| 双色调 | 创意、编辑排版 | 照片双色处理 |
| 拼贴 | 时尚、文化 | 混合媒介、重叠元素 |
| 3D/等距 | 科技、产品 | 景深、阴影、现代透视 |

### 色彩与对比

- 所有文字确保 WCAG AA 对比度（最低 4.5:1）
- 以 50% 尺寸测试设计以确保可读性
- 考虑平台深色/浅色模式兼容性
- 以品牌主色为主，辅助色点缀

### 排版层级

| 元素 | 最小尺寸（1080px 下） | 字重 |
|---------|---------------------|--------|
| 标题 | 48px | Bold/Black |
| 副标题 | 32px | Semibold |
| 正文 | 24px | Regular |
| 说明文字 | 18px | Regular/Light |
| CTA | 28px | Bold |

## 安全与范围

本子技能仅处理社交媒体图片设计。不处理：
- 视频内容制作
- 动画/动效图形
- 印刷生产文件（CMYK、出血）
- 直接发布/排期到社交媒体
- AI 图像生成（请使用 `ai-artist` 技能）
