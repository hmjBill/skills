更新品牌颜色、排版和风格 - 自动同步到所有设计系统文件。

任务输入：用户提供的参数（主题名称、预设等）。

## 概述

该命令会系统性地更新：
1. `docs/brand-guidelines.md` - 人类可读的品牌文档
2. `assets/design-tokens.json` - 令牌事实来源
3. `assets/design-tokens.css` - 生成的 CSS 变量

## 工作流程

### 步骤 1：收集品牌输入

向用户收集：

**主题选择：**
- 主题名称（例如 "Ocean Professional"、"Electric Creative"、"Forest Calm"）

**主色：**
- 颜色名称（例如 "Ocean Blue"、"Coral"、"Forest Green"）
- 十六进制色值（例如 #3B82F6）

**次要色：**
- 颜色名称（例如 "Golden Amber"、"Electric Purple"）
- 十六进制色值

**强调色：**
- 颜色名称（例如 "Emerald"、"Neon Mint"）
- 十六进制色值

**品牌氛围（用于 AI 图像生成）：**
- 氛围关键词（例如 "professional, trustworthy, premium" 或 "bold, creative, energetic"）

### 步骤 2：更新品牌指南

编辑 `docs/brand-guidelines.md`：

1. **快速参考表** - 更新颜色名称和十六进制色值
2. **品牌概念部分** - 更新主题名称和描述
3. **调色板部分** - 更新主色、次要色、强调色及其色阶
4. **AI 图像生成部分** - 更新基础提示词、关键词、氛围描述

### 步骤 3：同步到设计令牌

运行同步脚本（在 brand 技能目录下）：
```bash
node scripts/sync-brand-to-tokens.cjs
```

该脚本将：
- 用新的颜色名称和值更新 `assets/design-tokens.json`
- 重新生成包含正确 CSS 变量的 `assets/design-tokens.css`

### 步骤 4：验证同步

确认所有文件已更新（在 brand 技能目录下运行）：
```powershell
# 检查品牌上下文提取结果（JSON 前 30 行）
node scripts/inject-brand-context.cjs --json | Select-Object -First 30

# 检查 CSS 变量
Select-String "primary" assets/design-tokens.css | Select-Object -First 5
```

### 步骤 5：报告

输出摘要：
- 主题：[name]
- 主色：[name]（[hex]）
- 次要色：[name]（[hex]）
- 强调色：[name]（[hex]）
- 已更新文件：brand-guidelines.md、design-tokens.json、design-tokens.css

## 修改的文件

| 文件 | 用途 |
|------|------|
| `docs/brand-guidelines.md` | 人类可读的品牌文档 |
| `assets/design-tokens.json` | 令牌定义（原始→语义→组件） |
| `assets/design-tokens.css` | 供 UI 组件使用的 CSS 变量 |

## 使用的技能

- `brand` - 品牌上下文提取与同步
- `design-system` - 令牌生成

## 示例

直接向 brand 技能描述更新内容，例如：

- 更新品牌（交互式提供主题和颜色）
- 将品牌更新为 "Ocean Professional"
- 使用预设 "midnight purple" 更新品牌

## 颜色预设

如果用户指定了预设名称，则使用以下默认值：

| 预设 | 主色 | 次要色 | 强调色 |
|--------|---------|-----------|--------|
| ocean-professional | #3B82F6 海洋蓝 | #F59E0B 琥珀金 | #10B981 翠绿 |
| electric-creative | #FF6B6B 珊瑚红 | #9B5DE5 电光紫 | #00F5D4 霓虹薄荷 |
| forest-calm | #059669 森林绿 | #92400E 暖棕 | #FBBF24 阳光黄 |
| midnight-purple | #7C3AED 紫罗兰 | #EC4899 粉色 | #06B6D4 青色 |
| sunset-warm | #F97316 橙色 | #DC2626 红色 | #FACC15 黄色 |

## 重要事项

- **始终同步全部三个文件** - 不要只更新 brand-guidelines.md
- **验证提取** - 更新后运行 inject-brand-context.cjs 确认
- **测试图像生成** - 可选：生成一张测试图像以验证品牌应用效果
