# 品牌指南模板

使用此模板为任何项目创建完整的品牌指南。

## 文档结构

```markdown
# 品牌指南 v{X.Y}

## 快速参考
- **主色：** #XXXXXX
- **次要色：** #XXXXXX
- **主字体：** {font-family}
- **声音：** {3 key traits}

## 1. 调色板

### 主色
| 名称 | Hex | RGB | 用途 |
|------|-----|-----|-------|
| {Name} | #{hex} | rgb({r},{g},{b}) | 品牌主色、CTA、页眉 |
| {Name} | #{hex} | rgb({r},{g},{b}) | 辅助强调 |

### 次要色
| 名称 | Hex | RGB | 用途 |
|------|-----|-----|-------|
| {Name} | #{hex} | rgb({r},{g},{b}) | 次要元素 |
| {Name} | #{hex} | rgb({r},{g},{b}) | 高亮 |

### 中性调色板
| 名称 | Hex | RGB | 用途 |
|------|-----|-----|-------|
| 背景 | #{hex} | rgb({r},{g},{b}) | 页面背景 |
| 正文文本 | #{hex} | rgb({r},{g},{b}) | 正文 |
| 次要文本 | #{hex} | rgb({r},{g},{b}) | 说明文字、弱化文本 |
| 边框 | #{hex} | rgb({r},{g},{b}) | 分隔线、边框 |

### 无障碍
- 文本/背景对比度：{ratio}:1（WCAG {level}）
- CTA 对比度：{ratio}:1
- 所有交互元素符合 WCAG 2.1 AA

## 2. 排版

### 字体栈
```css
--font-heading: '{Font}', sans-serif;
--font-body: '{Font}', sans-serif;
--font-mono: '{Font}', monospace;
```

### 字号比例
| 元素 | 字体 | 字重 | 字号（桌面/移动） | 行高 |
|---------|------|--------|----------------------|-------------|
| H1 | {font} | 700 | 48px / 32px | 1.2 |
| H2 | {font} | 600 | 36px / 28px | 1.25 |
| H3 | {font} | 600 | 28px / 24px | 1.3 |
| H4 | {font} | 600 | 24px / 20px | 1.35 |
| 正文 | {font} | 400 | 16px / 16px | 1.5 |
| 小号 | {font} | 400 | 14px / 14px | 1.5 |
| 说明文字 | {font} | 400 | 12px / 12px | 1.4 |

## 3. Logo 使用

### 变体
- **主版本：** 带字标的完整横向 Logo
- **堆叠：** 适合方形空间的垂直排列
- **图标：** 仅符号，用于网站图标、应用图标
- **单色：** 适用于颜色受限场景的单色版本

### 安全留白
最小安全留白 = Logo 标记的高度

### 最小尺寸
- 数字媒体：最小宽度 80px
- 印刷：最小宽度 25mm

### 禁止事项
- 不要旋转或倾斜
- 不要使用已批准调色板之外的颜色
- 不要添加特效（阴影、渐变）
- 不要裁剪或修改比例
- 不要放在复杂背景上

## 4. 声音与语气

### 品牌个性
{Trait 1}: {Description}
{Trait 2}: {Description}
{Trait 3}: {Description}

### 声音图表
| 特质 | 我们是这样 | 我们不是这样 |
|-------|--------|------------|
| {Trait} | {Description} | {Anti-description} |

### 按语境划分的语气
| 语境 | 语气 | 示例 |
|---------|------|---------|
| 营销 | {tone} | "{example}" |
| 客服 | {tone} | "{example}" |
| 错误提示 | {tone} | "{example}" |
| 成功提示 | {tone} | "{example}" |

### 禁用词
- {term 1}（原因）
- {term 2}（原因）

## 5. 图像指南

### 摄影风格
- {Lighting preference}
- {Subject guidelines}
- {Color treatment}

### 插画
- 风格：{description}
- 颜色：仅限品牌调色板
- 描边：{weight}px

### 图标
- 风格：{outlined/filled/duotone}
- 尺寸：24px 基准网格
- 圆角：{value}px
```

## 用法

1. 复制上方模板
2. 填入品牌专属值
3. 保存为 `docs/brand-guidelines.md`
4. 在内容工作流中引用

## 可提取字段

脚本可提取：
- `colors.primary`, `colors.secondary`, `colors.neutral`
- `typography.heading`, `typography.body`
- `voice.traits`, `voice.prohibited`
- `logo.variants`, `logo.minSize`
