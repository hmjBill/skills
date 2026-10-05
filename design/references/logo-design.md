# Logo 设计参考

使用 55+ 种风格、30 套配色、25 个行业指南的 AI 驱动 Logo 设计。使用 Gemini Nano Banana 模型。

## 脚本

| 脚本 | 用途 |
|--------|---------|
| `scripts/logo/search.py` | 搜索风格、颜色、行业；生成设计简报 |
| `scripts/logo/generate.py` | 使用 Gemini Nano Banana 生成 Logo |
| `scripts/logo/core.py` | Logo 数据的 BM25 搜索引擎 |

> 所有命令均在本技能目录（`design/`）下运行；Windows PowerShell 7 使用 `python`。

## 命令

### 设计简报（从这里开始）

```bash
python scripts/logo/search.py "tech startup modern" --design-brief -p "BrandName"
```

### 搜索领域

```bash
# 风格
python scripts/logo/search.py "minimalist clean" --domain style

# 配色
python scripts/logo/search.py "tech professional" --domain color

# 行业指南
python scripts/logo/search.py "healthcare medical" --domain industry
```

### 生成 Logo

**始终**生成白色背景的输出 Logo 图片。

```bash
python scripts/logo/generate.py --brand "TechFlow" --style minimalist --industry tech
python scripts/logo/generate.py --prompt "coffee shop vintage badge" --style vintage
```

选项：`--style`、`--industry`、`--prompt`

## 可用风格

| 类别 | 风格 |
|----------|--------|
| 通用 | 极简、文字标、字母标、图形标、抽象标、吉祥物、徽章、组合标 |
| 美学 | 复古/怀旧、装饰艺术、奢华、俏皮、企业、有机、霓虹、做旧、水彩 |
| 现代 | 渐变、扁平设计、3D/等距、几何、线稿、双色调、动效就绪 |
| 巧思 | 负空间、单线、分割/碎片、响应式/自适应 |

## 色彩心理学

| 颜色 | 心理 | 最佳用途 |
|-------|------------|----------|
| 蓝色 | 信任、稳定 | 金融、科技、医疗 |
| 绿色 | 成长、自然 | 环保、健康、有机 |
| 红色 | 活力、热情 | 食品、体育、娱乐 |
| 金色 | 奢华、高端 | 时尚、珠宝、酒店 |
| 紫色 | 创意、创新 | 美妆、创意、科技 |

## 行业默认值

| 行业 | 风格 | 颜色 | 排版 |
|-------|-------|--------|------------|
| 科技 | 极简、抽象 | 蓝、紫、渐变 | 几何无衬线 |
| 医疗 | 专业、线稿 | 蓝、绿、青绿 | 干净无衬线 |
| 金融 | 企业、徽章 | 藏青、金 | 衬线或干净无衬线 |
| 食品 | 复古徽章、吉祥物 | 暖红、橙 | 友好、手写体 |
| 时尚 | 文字标、奢华 | 黑、金、白 | 优雅衬线 |

## 工作流程

1. 生成设计简报 → `scripts/logo/search.py --design-brief`
2. 生成 Logo 变体 → `scripts/logo/generate.py --brand --style --industry`
3. 询问用户是否需要 HTML 预览
4. 如需要，可使用 `ui-ux-pro-max` 技能获取 HTML 图库

## 详细参考

- `references/logo-style-guide.md` - 详细风格说明
- `references/logo-color-psychology.md` - 颜色含义与组合
- `references/logo-prompt-engineering.md` - AI 生成提示词

## 设置

```bash
export GEMINI_API_KEY="your-key"
pip install google-genai
```
