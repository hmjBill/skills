# 布局模式

25 种幻灯片布局，含 CSS 结构与动画类。

## 按用例选择布局

| 布局 | 用例 | 动画 |
|--------|----------|-----------|
| 标题页 | 开场/第一印象 | `animate-fade-up` |
| 问题陈述 | 建立痛点 | `animate-stagger` |
| 方案概览 | 介绍方案 | `animate-scale` |
| 功能网格 | 展示能力（3-6 张卡片） | `animate-stagger` |
| 指标仪表盘 | 展示 KPI（3-4 项指标） | `animate-stagger-scale` |
| 对比表 | 对比选项 | `animate-fade-up` |
| 时间线流程 | 展示进程 | `animate-stagger` |
| 团队网格 | 介绍成员 | `animate-stagger` |
| 引语证言 | 客户背书 | `animate-fade-up` |
| 双栏分栏 | 比较/对照 | `animate-fade-up` |
| 大数字主视觉 | 单一有力指标 | `animate-count` |
| 产品截图 | 展示产品界面 | `animate-scale` |
| 定价卡片 | 展示档位 | `animate-stagger` |
| CTA 收尾 | 促成行动 | `animate-pulse` |

## CSS 结构

### 标题页
```css
.slide-title {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    text-align: center;
}
```

### 双栏分栏
```css
.slide-split {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 48px;
    align-items: center;
}
@media (max-width: 768px) {
    .slide-split { grid-template-columns: 1fr; gap: 24px; }
}
```

### 功能网格（3 列）
```css
.slide-features {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 24px;
}
@media (max-width: 768px) {
    .slide-features { grid-template-columns: repeat(2, 1fr); gap: 16px; }
}
@media (max-width: 480px) {
    .slide-features { grid-template-columns: 1fr; }
}
```

### 指标仪表盘（4 列）
```css
.slide-metrics {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 16px;
}
@media (max-width: 768px) {
    .slide-metrics { grid-template-columns: repeat(2, 1fr); }
}
@media (max-width: 480px) {
    .slide-metrics { grid-template-columns: 1fr; }
}
```

## 组件变体

### 卡片样式
| 样式 | CSS 类 | 用途 |
|-------|-----------|---------|
| 左侧图标 | `.card-icon-left` | 带图标的功能 |
| 强调条 | `.card-accent-bar` | 高亮功能 |
| 指标卡片 | `.card-metric` | 数字/统计 |
| 头像卡片 | `.card-avatar` | 团队成员 |
| 定价卡片 | `.card-pricing` | 价格档位 |

### 指标样式
| 样式 | 效果 |
|-------|--------|
| `gradient-number` | 数字渐变文字 |
| `oversized` | 超大（120px+） |
| `sparkline` | 小型内联图表 |
| `funnel-numbers` | 转化阶段 |

## 视觉处理

| 处理 | 使用时机 |
|-----------|-------------|
| `gradient-glow` | 标题页、CTA |
| `subtle-border` | 问题陈述 |
| `icon-top` | 功能网格 |
| `screenshot-shadow` | 产品截图 |
| `popular-highlight` | 定价（放大 1.05） |
| `bg-overlay` | 背景图片 |
| `contrast-pair` | 前后对比 |
| `logo-grayscale` | 客户 Logo |

## 搜索命令（在 design-system 技能目录下运行）

```bash
# 为特定用途查找布局
python scripts/search-slides.py "metrics dashboard" -d layout

# 上下文推荐
python scripts/search-slides.py "traction slide" \
  --context --position 4 --total 10
```

## 布局决策流程

```
1. What's the slide goal?
   └─> Search layout-logic.csv

2. What emotion should it trigger?
   └─> Search color-logic.csv

3. What's the content type?
   └─> Search typography.csv

4. Should it break pattern?
   └─> Check position (1/3, 2/3) → Use full-bleed
```
