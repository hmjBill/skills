# 调色板管理

定义、提取和执行品牌颜色的指南。

## 颜色系统结构

### 层级
```
主色（1-2）
├── 品牌主色 - 用于 CTA、页眉、关键元素
└── 辅助主色 - 次级强调

次要色（2-3）
├── 强调色 - 高亮、交互状态
└── 辅助视觉 - 图标、插画

中性调色板（3-5）
├── 背景色 - 页面、卡片、弹窗背景
├── 文本色 - 标题、正文、弱化文本
└── UI 元素 - 边框、分隔线、阴影

语义色（4）
├── 成功 - #22C55E（绿色）
├── 警告 - #F59E0B（琥珀色）
├── 错误 - #EF4444（红色）
└── 信息 - #3B82F6（蓝色）
```

## 颜色文档格式

### Markdown 表格
```markdown
| 名称 | Hex | RGB | HSL | 用途 |
|------|-----|-----|-----|-------|
| 主蓝色 | #2563EB | rgb(37,99,235) | hsl(217,91%,53%) | CTA、链接 |
```

### CSS 变量
```css
:root {
  /* 主色 */
  --color-primary: #2563EB;
  --color-primary-light: #3B82F6;
  --color-primary-dark: #1D4ED8;

  /* 次要色 */
  --color-secondary: #8B5CF6;
  --color-accent: #F59E0B;

  /* 中性色 */
  --color-background: #FFFFFF;
  --color-surface: #F9FAFB;
  --color-text-primary: #111827;
  --color-text-secondary: #6B7280;
  --color-border: #E5E7EB;
}
```

### Tailwind 配置
```javascript
colors: {
  primary: {
    DEFAULT: '#2563EB',
    50: '#EFF6FF',
    100: '#DBEAFE',
    500: '#3B82F6',
    600: '#2563EB',
    700: '#1D4ED8',
  }
}
```

## 无障碍要求

### 对比度要求（WCAG 2.1）
| 级别 | 普通文本 | 大号文本 | UI 组件 |
|-------|-------------|------------|---------------|
| AA | 4.5:1 | 3:1 | 3:1 |
| AAA | 7:1 | 4.5:1 | 4.5:1 |

### 检查对比度
```javascript
// 相对亮度公式
function luminance(r, g, b) {
  const [rs, gs, bs] = [r, g, b].map(v => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

function contrastRatio(l1, l2) {
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}
```

## 颜色提取

### 从图像提取
使用 `extract-colors.cjs` 脚本：
1. 加载图像文件
2. 使用 k-means 聚类提取主色
3. 映射到最接近的品牌色
4. 报告合规百分比

### 从品牌指南提取
解析 Markdown 以提取：
- 表格中的十六进制色值
- CSS 变量定义
- 颜色名称和用途描述

## 品牌合规校验

### 规则
1. **主色比例**：占设计 60-70%
2. **次要色比例**：占设计 20-30%
3. **强调色比例**：占设计 5-10%
4. **偏离品牌容差**：非调色板颜色最多 20%

### 校验输出
```json
{
  "compliance": 85,
  "colors": {
    "brand": ["#2563EB", "#8B5CF6", "#FFFFFF"],
    "offBrand": ["#FF5500"],
    "dominant": "#2563EB"
  },
  "issues": [
    "Off-brand color #FF5500 detected (15% coverage)",
    "Primary color underused (45% vs 60% target)"
  ]
}
```

## 颜色使用指南

### 该做
- 主色用于主要 CTA 和关键元素
- 保持悬停/激活状态一致
- 测试所有组合的无障碍表现
- 记录颜色决策

### 不该做
- 在单个组件中使用超过 2-3 种颜色
- 无意地混用暖色和冷色
- 文本使用纯黑（#000）（应使用 #111 或类似颜色）
- 仅靠颜色传达含义（应同时使用图标/文字）

## 调色板示例

### 科技/SaaS
```
主色：#2563EB（蓝色）
次要色：#8B5CF6（紫色）
强调色：#10B981（翠绿）
背景：#F9FAFB
文本：#111827
```

### 营销/创意
```
主色：#F97316（橙色）
次要色：#EC4899（粉色）
强调色：#14B8A6（青色）
背景：#FFFFFF
文本：#1F2937
```

### 专业/企业
```
主色：#1E40AF（藏青）
次要色：#475569（石板灰）
强调色：#0EA5E9（天蓝）
背景：#F8FAFC
文本：#0F172A
```

## 工具与资源

- [Coolors](https://coolors.co) - 调色板生成
- [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)
- [Tailwind Color Reference](https://tailwindcss.com/docs/customizing-colors)
- [Color Hunt](https://colorhunt.co) - 精选调色板
