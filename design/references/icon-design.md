# 图标设计参考

使用 Gemini 3.1 Pro Preview 生成 AI 驱动的 SVG 图标。15 种风格、12 个类别、多尺寸导出。

## 脚本

| 脚本 | 用途 |
|--------|---------|
| `scripts/icon/generate.py` | 使用 Gemini 3.1 Pro Preview 生成 SVG 图标 |

> 所有命令均在本技能目录（`design/`）下运行；Windows PowerShell 7 使用 `python`。

## 命令

### 生成单个图标

```bash
python scripts/icon/generate.py --prompt "settings gear" --style outlined
python scripts/icon/generate.py --prompt "shopping cart" --style filled --color "#6366F1"
python scripts/icon/generate.py --name "dashboard" --category navigation --style duotone
```

### 批量生成变体

```bash
python scripts/icon/generate.py --prompt "cloud upload" --batch 4 --output-dir ./icons
python scripts/icon/generate.py --prompt "notification bell" --batch 6 --style outlined --output-dir ./icons
```

### 生成多个尺寸

```bash
python scripts/icon/generate.py --prompt "user profile" --sizes "16,24,32,48" --output-dir ./icons
```

### 列出风格/类别

```bash
python scripts/icon/generate.py --list-styles
python scripts/icon/generate.py --list-categories
```

## CLI 选项

| 选项 | 说明 | 默认值 |
|--------|-------------|---------|
| `--prompt, -p` | 图标描述 | 必填 |
| `--name, -n` | 图标名称（用于文件名） | - |
| `--style, -s` | 图标风格（15 种可选） | - |
| `--category, -c` | 用于上下文的图标类别 | - |
| `--color` | 主色十六进制值 | currentColor |
| `--size` | 显示尺寸（px） | 24 |
| `--viewbox` | SVG viewBox 尺寸 | 24 |
| `--output, -o` | 输出文件路径 | 自动 |
| `--output-dir` | 输出目录（批量） | ./icons |
| `--batch` | 变体数量 | - |
| `--sizes` | 逗号分隔的尺寸列表 | - |

## 可用风格

| 风格 | 描边 | 填充 | 最佳用途 |
|-------|--------|------|----------|
| outlined | 2px | 无 | UI 界面、Web 应用 |
| filled | 0 | 实心 | 移动应用、导航栏 |
| duotone | 0 | 双色 | 营销、着陆页 |
| thin | 1-1.5px | 无 | 奢侈品牌、编辑排版 |
| bold | 3px | 无 | 页头、主视觉区 |
| rounded | 2px | 无 | 友好应用、健康 |
| sharp | 2px | 无 | 科技、金融科技、企业 |
| flat | 0 | 实心 | Material 设计、Google 风格 |
| gradient | 0 | 渐变 | 现代品牌、SaaS |
| glassmorphism | 1px | 半透明 | 现代 UI、浮层 |
| pixel | 0 | 实心 | 游戏、复古 |
| hand-drawn | 不定 | 无 | 手作、创意 |
| isometric | 1-2px | 部分 | 技术文档、信息图 |
| glyph | 0 | 实心 | 系统 UI、紧凑场景 |
| animated-ready | 2px | 不定 | 交互 UI、新手引导 |

## 图标类别

| 类别 | 图标 |
|----------|-------|
| navigation | 箭头、菜单、首页、折叠箭头 |
| action | 编辑、删除、保存、下载、上传 |
| communication | 邮件、聊天、电话、通知 |
| media | 播放、暂停、音量、相机 |
| file | 文档、文件夹、归档、云 |
| user | 人物、群组、个人资料、设置 |
| commerce | 购物车、购物袋、钱包、信用卡 |
| data | 图表、图形、分析、仪表盘 |
| development | 代码、终端、Bug、Git、API |
| social | 心形、星标、书签、奖杯 |
| weather | 太阳、月亮、云、雨 |
| map | 定位针、位置、指南针、地球 |

## SVG 最佳实践

- **ViewBox**：使用 `0 0 24 24`（标准）或 `0 0 16 16`（紧凑）
- **颜色**：使用 `currentColor` 以便 CSS 继承，避免硬编码颜色
- **无障碍**：始终包含 `<title>` 元素
- **优化**：最少路径节点，不嵌入字体或位图
- **尺寸**：以 24px 设计，在 16px 和 48px 下测试清晰度
- **描边**：outlined 风格使用 `stroke-linecap="round"` 和 `stroke-linejoin="round"`

## 模型

- **gemini-3.1-pro-preview**：最佳推理、token 效率、事实一致性
- 仅文本输出（SVG 是 XML 文本）— 不需要图像生成 API
- 支持结构化输出，保证 SVG 格式一致

## 工作流程

1. 描述图标 → `--prompt "settings gear"`
2. 选择风格 → `--style outlined`
3. 生成 → 脚本输出 .svg 文件
4. 可选批量 → `--batch 4` 生成变体
5. 多尺寸导出 → `--sizes "16,24,32,48"`

## 设置

```bash
export GEMINI_API_KEY="your-key"
pip install google-genai
```
