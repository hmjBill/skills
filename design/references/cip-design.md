# CIP 设计参考

企业识别计划（CIP）设计：50+ 交付物、20 种风格、20 个行业。使用 Gemini Nano Banana（Flash/Pro）生成样机。

## 脚本

| 脚本 | 用途 |
|--------|---------|
| `scripts/cip/search.py` | 搜索交付物、风格、行业；生成 CIP 简报 |
| `scripts/cip/generate.py` | 使用 Gemini（Flash/Pro）生成 CIP 样机 |
| `scripts/cip/render-html.py` | 从 CIP 样机渲染 HTML 演示 |
| `scripts/cip/core.py` | CIP 数据的 BM25 搜索引擎 |

> 所有命令均在本技能目录（`design/`）下运行；Windows PowerShell 7 使用 `python`。

## 命令

### CIP 简报（从这里开始）

```bash
python scripts/cip/search.py "tech startup" --cip-brief -b "BrandName"
```

### 搜索领域

```bash
# 交付物
python scripts/cip/search.py "business card letterhead" --domain deliverable

# 设计风格
python scripts/cip/search.py "luxury premium elegant" --domain style

# 行业指南
python scripts/cip/search.py "hospitality hotel" --domain industry

# 样机场景
python scripts/cip/search.py "office reception" --domain mockup
```

### 生成样机

```bash
# 带 Logo（推荐——使用图像编辑）
python scripts/cip/generate.py --brand "TopGroup" --logo /path/to/logo.png --deliverable "business card" --industry "consulting"

# 带 Logo 的全套 CIP
python scripts/cip/generate.py --brand "TopGroup" --logo /path/to/logo.png --industry "consulting" --set

# 使用 Pro 模型进行 4K 文字渲染
python scripts/cip/generate.py --brand "TopGroup" --logo logo.png --deliverable "business card" --model pro

# 自定义交付物与宽高比
python scripts/cip/generate.py --brand "GreenLeaf" --logo logo.png --industry "organic food" --deliverables "letterhead,packaging,vehicle" --ratio 16:9

# 不带 Logo（由 AI 生成诠释）
python scripts/cip/generate.py --brand "TechFlow" --deliverable "business card" --no-logo-prompt
```

### 渲染 HTML 演示

```bash
python scripts/cip/render-html.py --brand "TopGroup" --industry "consulting" --images /path/to/cip-output
python scripts/cip/render-html.py --brand "TopGroup" --industry "consulting" --images ./topgroup-cip --output presentation.html
```

## 模型

- `flash`（默认）：`gemini-2.5-flash-image` - 快速、高性价比
- `pro`：`gemini-3-pro-image-preview` - 高质量、4K 文字渲染

## 交付物类别

| 类别 | 内容 |
|----------|-------|
| 核心识别 | Logo、Logo 变体 |
| 文印 | 名片、信纸、信封、文件夹、笔记本、笔 |
| 安全/门禁 | ID 卡、挂绳、门禁卡 |
| 办公环境 | 前台标识、导视、会议室标牌、墙面图形 |
| 服装 | Polo 衫、T 恤、帽子、夹克、围裙 |
| 推广 | 帆布袋、礼盒、U 盘、水瓶、马克杯、雨伞 |
| 车辆 | 轿车、厢式车、卡车 |
| 数字 | 社交媒体、邮件签名、PowerPoint、文档模板 |
| 产品 | 包装盒、标签、吊牌、零售陈列 |
| 活动 | 展会摊位、易拉宝、桌布、背景板 |

## 设计风格

| 风格 | 颜色 | 最佳用途 |
|-------|--------|----------|
| 企业极简 | 藏青、白、蓝 | 金融、法律、咨询 |
| 现代科技 | 紫、青、绿 | 科技、初创、SaaS |
| 奢华高级 | 黑、金、白 | 时尚、珠宝、酒店 |
| 温暖有机 | 棕、绿、奶油 | 食品、有机、手作 |
| 大胆动感 | 红、橙、黑 | 体育、娱乐 |

## HTML 演示特性

- 主视觉区展示品牌名、行业、风格、气质
- 交付物卡片与样机图片
- 描述：概念、用途、规格
- 响应式桌面/移动端，深色主题
- 图片以 base64 嵌入（单文件便携）

## 工作流程

1. 生成 CIP 简报 → `scripts/cip/search.py --cip-brief`
2. 带 Logo 生成样机 → `scripts/cip/generate.py --brand --logo --industry --set`
3. 渲染 HTML 演示 → `scripts/cip/render-html.py --brand --industry --images`

**提示：** 如果没有 Logo，先使用内置的 Logo 设计模块生成一个。

## 详细参考

- `references/cip-deliverable-guide.md` - 交付物规格
- `references/cip-style-guide.md` - 设计风格说明
- `references/cip-prompt-engineering.md` - AI 生成提示词

## 设置

```bash
export GEMINI_API_KEY="your-key"
pip install google-genai pillow
```
