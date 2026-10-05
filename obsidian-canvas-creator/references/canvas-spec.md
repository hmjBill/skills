# Obsidian 的 JSON Canvas 规范

Version 1.0 — 2024-03-11

## 概述

JSON Canvas 是一种表示无限画布文档的格式。本规范定义与 Obsidian 兼容的画布文件的结构。

## 顶层结构

根 JSON 对象包含两个可选数组：

```json
{
  "nodes": [...],
  "edges": [...]
}
```

- `nodes`（可选，数组）：所有画布对象（文本、文件、链接、分组）
- `edges`（可选，数组）：节点之间的所有连接

## 节点类型

### 公共属性

所有节点共享以下必需属性：

- `id`（必需，字符串）：节点的唯一标识符
- `type`（必需，字符串）：节点类型（`text`、`file`、`link`、`group`）
- `x`（必需，整数）：X 坐标（像素）
- `y`（必需，整数）：Y 坐标（像素）
- `width`（必需，整数）：宽度（像素）
- `height`（必需，整数）：高度（像素）
- `color`（可选，字符串/数字）：颜色（十六进制 `"#FF0000"` 或预设 `"1"`）

### 文本节点

以 Markdown 格式存储纯文本。

**必需属性：**
- `text`（字符串）：Markdown 语法的内容

**示例：**
```json
{
  "id": "abc123",
  "type": "text",
  "x": 0,
  "y": 0,
  "width": 250,
  "height": 100,
  "text": "# Main Topic\n\nKey point here",
  "color": "4"
}
```

### 文件节点

引用其他文件或附件（图片、PDF 等）。

**必需属性：**
- `file`（字符串）：笔记库中的文件路径

**可选属性：**
- `subpath`（字符串）：指向特定标题/块的链接（以 `#` 开头）

**示例：**
```json
{
  "id": "def456",
  "type": "file",
  "x": 300,
  "y": 0,
  "width": 400,
  "height": 300,
  "file": "Images/diagram.png"
}
```

**带 subpath：**
```json
{
  "id": "ghi789",
  "type": "file",
  "x": 0,
  "y": 200,
  "width": 250,
  "height": 100,
  "file": "Notes/Meeting Notes.md",
  "subpath": "#Action Items"
}
```

### 链接节点

引用外部 URL。

**必需属性：**
- `url`（字符串）：包含协议的完整 URL

**示例：**
```json
{
  "id": "jkl012",
  "type": "link",
  "x": 0,
  "y": -200,
  "width": 250,
  "height": 100,
  "url": "https://obsidian.md",
  "color": "5"
}
```

### 分组节点

用于组织相关节点的视觉容器。

**可选属性：**
- `label`（字符串）：分组文本标签（推荐）
- `background`（字符串）：背景图片路径
- `backgroundStyle`（字符串）：图片渲染样式
  - `cover`：填满整个节点
  - `ratio`：保持宽高比
  - `repeat`：平铺为图案

**示例：**
```json
{
  "id": "group1",
  "type": "group",
  "x": -50,
  "y": -50,
  "width": 600,
  "height": 400,
  "label": "Main Concepts",
  "color": "4"
}
```

**带背景：**
```json
{
  "id": "group2",
  "type": "group",
  "x": 700,
  "y": 0,
  "width": 500,
  "height": 600,
  "label": "Reference Materials",
  "background": "Images/texture.png",
  "backgroundStyle": "repeat"
}
```

## Z 轴顺序与分层

节点按数组顺序显示：
- **第一个节点**：底层（渲染在其他节点之下）
- **最后一个节点**：顶层（渲染在其他节点之上）

**最佳实践顺序：**
1. 分组节点（背景）
2. 子分组
3. 普通节点（文本、文件、链接）

这确保分组显示在内容之后。

## 边（连接）

边用线条连接节点。

**必需属性：**
- `id`（必需，字符串）：唯一标识符
- `fromNode`（必需，字符串）：起始节点 ID
- `toNode`（必需，字符串）：结束节点 ID

**可选属性：**
- `fromSide`（字符串）：起始边侧
  - 取值：`top`、`right`、`bottom`、`left`
- `fromEnd`（字符串）：起点端点形状
  - 取值：`none`（默认）、`arrow`
- `toSide`（字符串）：结束边侧
  - 取值：`top`、`right`、`bottom`、`left`
- `toEnd`（字符串）：终点端点形状
  - 取值：`arrow`（默认）、`none`
- `color`（字符串/数字）：边颜色
- `label`（字符串）：边上的文本标签

**示例——简单连接：**
```json
{
  "id": "edge1",
  "fromNode": "abc123",
  "toNode": "def456"
}
```

**示例——完整指定：**
```json
{
  "id": "edge2",
  "fromNode": "def456",
  "fromSide": "bottom",
  "fromEnd": "none",
  "toNode": "ghi789",
  "toSide": "top",
  "toEnd": "arrow",
  "color": "3",
  "label": "leads to"
}
```

## 颜色系统

### 预设颜色

使用字符串数字 `"1"` 到 `"6"`：

- `"1"` - 红色
- `"2"` - 橙色
- `"3"` - 黄色
- `"4"` - 绿色
- `"5"` - 青色
- `"6"` - 紫色

**注意：** 具体颜色会随 Obsidian 主题自适应。这些颜色在浅色/深色模式下提供语义含义。

### 自定义十六进制颜色

使用十六进制格式：`"#RRGGBB"`

**示例：**
- `"#4A90E2"`（蓝色）
- `"#50E3C2"`（青绿）
- `"#F5A623"`（橙色）

**最佳实践：** 在同一画布中使用一致的格式（全部十六进制或全部预设）。

## 完整示例

```json
{
  "nodes": [
    {
      "id": "group001",
      "type": "group",
      "x": -50,
      "y": -50,
      "width": 700,
      "height": 500,
      "label": "Core Concepts",
      "color": "4"
    },
    {
      "id": "center01",
      "type": "text",
      "x": 0,
      "y": 0,
      "width": 300,
      "height": 120,
      "text": "# Central Topic\n\nMain idea here",
      "color": "4"
    },
    {
      "id": "branch01",
      "type": "text",
      "x": 400,
      "y": -100,
      "width": 220,
      "height": 100,
      "text": "Subtopic A",
      "color": "5"
    },
    {
      "id": "branch02",
      "type": "text",
      "x": 400,
      "y": 100,
      "width": 220,
      "height": 100,
      "text": "Subtopic B",
      "color": "5"
    },
    {
      "id": "detail01",
      "type": "text",
      "x": 700,
      "y": -100,
      "width": 200,
      "height": 80,
      "text": "Detail 1",
      "color": "6"
    }
  ],
  "edges": [
    {
      "id": "e1",
      "fromNode": "center01",
      "fromSide": "right",
      "toNode": "branch01",
      "toSide": "left",
      "toEnd": "arrow"
    },
    {
      "id": "e2",
      "fromNode": "center01",
      "fromSide": "right",
      "toNode": "branch02",
      "toSide": "left",
      "toEnd": "arrow"
    },
    {
      "id": "e3",
      "fromNode": "branch01",
      "fromSide": "right",
      "toNode": "detail01",
      "toSide": "left",
      "toEnd": "arrow",
      "color": "3"
    }
  ]
}
```

## 验证要求

创建画布文件时，确保：

1. **唯一 ID**：所有 `id` 值在节点和边之间必须唯一
2. **有效引用**：所有边的 `fromNode` 和 `toNode` 必须引用存在的节点 ID
3. **必需字段**：每种类型的必需属性均已提供
4. **有效坐标**：所有位置/尺寸值均为整数
5. **颜色格式**：颜色使用十六进制（`"#RRGGBB"`）或预设字符串（`"1"` 到 `"6"`）
6. **引号转义**：JSON 字符串中的特殊字符已正确转义

## 常见问题与解决方案

### 问题：画布无法在 Obsidian 中打开
**解决方案：**
- 验证 JSON 语法（使用 JSON 校验器）
- 检查所有 ID 唯一
- 验证所有边引用存在
- 确保必需字段存在

### 问题：节点出现重叠
**解决方案：**
- 增大坐标之间的间距
- 定位时考虑节点尺寸
- 使用最小间距：水平 320px，垂直 200px

### 问题：分组显示不正确
**解决方案：**
- 确保分组的数组位置在内容节点之前
- 为所有分组添加显式 `label`
- 检查分组尺寸包含子节点

### 问题：颜色与预期不符
**解决方案：**
- 使用一致的颜色格式（全部十六进制或全部预设）
- 记住预设会随主题自适应
- 使用自定义颜色时在浅色和深色模式下都测试

### 问题：文本显示被截断
**解决方案：**
- 增大节点尺寸
- 将长文本拆分为多个节点
- 长内容使用文件节点

## 中文内容的字符编码

当画布包含中文文本时，应用以下转换：

- 中文双引号 `"` → `『』`
- 中文单引号 `'` → `「」`
- 英文双引号必须转义：`\"`

**示例：**
```json
{
  "text": "『核心概念』包含:「子概念A」和「子概念B」"
}
```

这可以避免混合语言内容导致的 JSON 解析错误。

## 性能考虑

- **大型画布**：保持节点数量合理（<500 以获得流畅性能）
- **图片文件**：背景使用压缩图片
- **文本长度**：节点文本保持简洁；长内容使用文件节点
- **边复杂度**：尽量减少交叉边以保持清晰

## 未来扩展

本规范可能扩展以下内容：
- 更多节点类型
- 更多边样式选项
- 动画属性
- 交互行为

始终查阅 Obsidian 文档以了解最新的 Canvas 特性。
