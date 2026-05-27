---
name: defuddle
description: 使用 Defuddle CLI 从网页提取干净 Markdown 内容，移除导航和杂项以节省上下文
---

# Defuddle

使用 Defuddle CLI 从网页提取干净可读内容。对普通网页优先使用此工具而非 WebFetch——它会移除导航、广告等杂项内容，减少 token 用量。

如未安装：`npm install -g defuddle`

## 用法

始终使用 `--md` 输出 Markdown：

```bash
defuddle parse <url> --md
```

保存到文件：

```bash
defuddle parse <url> --md -o content.md
```

提取特定元数据：

```bash
defuddle parse <url> -p title
defuddle parse <url> -p description
defuddle parse <url> -p domain
```

## 输出格式

| 标志 | 格式 |
|------|------|
| `--md` | Markdown（默认选择） |
| `--json` | JSON，包含 HTML 和 Markdown |
| （无） | HTML |
| `-p <name>` | 指定元数据属性 |
