---
name: pdf
description: 处理 PDF 文件的读取、创建、审查，强调视觉渲染验证。
---

# PDF 处理

## 使用场景
- 读取或审查布局和视觉效果重要的 PDF 内容。
- 以可靠的格式编程创建 PDF。
- 在交付前验证最终渲染效果。

## 工作流程
1. 优先进行视觉审查：将 PDF 页面渲染为 PNG 并检查。
   - 如果可用，使用 `pdftoppm`。
   - 如果不可用，安装 Poppler 或让用户在本地审查输出。
2. 使用 `reportlab` 生成 PDF 来创建新文档。
3. 使用 `pdfplumber`（或 `pypdf`）进行文本提取和快速检查；不要依赖它来保证布局保真度。
4. 每次有意义的更新后，重新渲染页面并验证对齐、间距和可读性。

## 临时文件和输出约定
- 使用临时目录（如工作目录下的 `tmp/pdfs/`）存放中间文件；完成后删除。
- 最终产物写入用户指定的输出目录；未指定时先与用户确认。
- 保持文件名稳定且具有描述性。

## 依赖项（缺失时安装）
优先使用 `uv` 进行依赖管理。

Python 包（在工作/项目目录下创建虚拟环境后安装）：
```
uv venv
uv pip install reportlab pdfplumber pypdf
```
如果 `uv` 不可用（在已激活的虚拟环境中）：
```
python -m pip install reportlab pdfplumber pypdf
```
也可以不创建环境，用 `uv run` 直接注入依赖：
```
uv run --with reportlab --with pdfplumber --with pypdf python your_script.py
```
系统工具（用于渲染）：
```
# Windows（scoop 或 choco）
scoop install poppler
# 或：choco install poppler

# macOS (Homebrew)
brew install poppler

# Ubuntu/Debian
sudo apt-get install -y poppler-utils
```

如果无法在此环境中安装，请告诉用户缺少哪个依赖项以及如何在本地安装。

## 环境
无必需的环境变量。

## 渲染命令
PowerShell 7（Windows；`$env:INPUT_PDF` 为输入 PDF，`$env:OUTPUT_PREFIX` 为输出前缀）：
```
pdftoppm -png "$env:INPUT_PDF" "$env:OUTPUT_PREFIX"
```
macOS/Linux：
```
pdftoppm -png "$INPUT_PDF" "$OUTPUT_PREFIX"
```

## 质量期望
- 保持精致的视觉设计：一致的排版、间距、边距和章节层次。
- 避免渲染问题：文本被裁剪、元素重叠、表格破损、黑方块或无法读取的字形。
- 图表、表格和图像必须清晰、对齐良好且标记清楚。
- 仅使用 ASCII 连字符。避免使用 U+2011（非断字连字符）和其他 Unicode 破折号。
- 引用和参考必须人类可读；永远不要留下工具标记或占位符字符串。

## 最终检查
- 在最新的 PNG 检查显示零视觉或格式缺陷之前不要交付。
- 确认页眉/页脚、页码和章节转换看起来精致。
- 保持中间文件有序或在最终批准后删除它们。
