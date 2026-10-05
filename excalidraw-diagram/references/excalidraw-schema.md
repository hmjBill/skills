# Excalidraw JSON Schema 参考

## 配色方案

### 主色

| 用途 | 颜色 | Hex |
|---------|-------|-----|
| 主标题 | 深蓝 | `#1e40af` |
| 副标题 | 中蓝 | `#3b82f6` |
| 正文文字 | 深灰 | `#374151` |
| 强调 | 橙色 | `#f59e0b` |
| 成功 | 绿色 | `#10b981` |
| 警告 | 红色 | `#ef4444` |

### 背景色

| 用途 | 颜色 | Hex |
|---------|-------|-----|
| 浅蓝 | 背景 | `#dbeafe` |
| 浅灰 | 中性 | `#f3f4f6` |
| 浅橙 | 高亮 | `#fef3c7` |
| 浅绿 | 成功 | `#d1fae5` |
| 浅紫 | 点缀 | `#ede9fe` |

## 元素类型

### 矩形
```json
{
  "type": "rectangle",
  "id": "unique-id",
  "x": 100,
  "y": 100,
  "width": 200,
  "height": 80,
  "strokeColor": "#1e40af",
  "backgroundColor": "#dbeafe",
  "fillStyle": "solid",
  "strokeWidth": 2,
  "roughness": 1,
  "opacity": 100,
  "roundness": { "type": 3 }
}
```

### 文本
```json
{
  "type": "text",
  "id": "unique-id",
  "x": 150,
  "y": 130,
  "text": "Content here",
  "fontSize": 20,
  "fontFamily": 5,
  "textAlign": "center",
  "verticalAlign": "middle",
  "strokeColor": "#1e40af",
  "backgroundColor": "transparent"
}
```

### 箭头
```json
{
  "type": "arrow",
  "id": "unique-id",
  "x": 300,
  "y": 140,
  "width": 100,
  "height": 0,
  "points": [[0, 0], [100, 0]],
  "strokeColor": "#374151",
  "strokeWidth": 2,
  "startArrowhead": null,
  "endArrowhead": "arrow"
}
```

### 椭圆
```json
{
  "type": "ellipse",
  "id": "unique-id",
  "x": 100,
  "y": 100,
  "width": 120,
  "height": 120,
  "strokeColor": "#10b981",
  "backgroundColor": "#d1fae5",
  "fillStyle": "solid"
}
```

### 菱形
```json
{
  "type": "diamond",
  "id": "unique-id",
  "x": 100,
  "y": 100,
  "width": 150,
  "height": 100,
  "strokeColor": "#f59e0b",
  "backgroundColor": "#fef3c7",
  "fillStyle": "solid"
}
```

### 线段
```json
{
  "type": "line",
  "id": "unique-id",
  "x": 100,
  "y": 100,
  "points": [[0, 0], [200, 100]],
  "strokeColor": "#374151",
  "strokeWidth": 2
}
```

## 完整 JSON 结构

```json
{
  "type": "excalidraw",
  "version": 2,
  "source": "https://excalidraw.com",
  "elements": [
    // Array of elements
  ],
  "appState": {
    "gridSize": null,
    "viewBackgroundColor": "#ffffff"
  },
  "files": {}
}
```

## 字体族取值

| 值 | 字体名 |
|-------|-----------|
| 1 | Virgil（手绘） |
| 2 | Helvetica |
| 3 | Cascadia |
| 4 | Assistant |
| 5 | Excalifont（推荐） |

## 填充样式

- `solid` - 实心填充
- `hachure` - 排线填充
- `cross-hatch` - 交叉排线
- `dots` - 点状图案

## 圆角类型

- `{ "type": 1 }` - 直角
- `{ "type": 2 }` - 轻微圆角
- `{ "type": 3 }` - 完全圆角（推荐）

## 元素绑定

将文本连接到容器：

```json
{
  "type": "rectangle",
  "id": "container-id",
  "boundElements": [{ "id": "text-id", "type": "text" }]
}
```

```json
{
  "type": "text",
  "id": "text-id",
  "containerId": "container-id"
}
```

## 箭头绑定

将箭头连接到形状：

```json
{
  "type": "arrow",
  "startBinding": {
    "elementId": "source-shape-id",
    "focus": 0,
    "gap": 5
  },
  "endBinding": {
    "elementId": "target-shape-id",
    "focus": 0,
    "gap": 5
  }
}
```
