---
name: "文档处理"
description: "处理 .docx 文档的读取、创建、编辑，强调布局可视化验证"
---


# DOCX 技能

## 使用场景
- 读取或审查布局重要的 DOCX 内容（表格、图表、分页）。
- 使用专业格式创建或编辑 DOCX 文件。
- 交付前验证视觉布局。

## 工作流程
1. 优先进行视觉审查（布局、表格、图表）。
   - 如果 `soffice` 和 `pdftoppm` 可用，将 DOCX -> PDF -> PNG。
   - 或使用 `scripts/render_docx.py`（需要 `pdf2image` 和 Poppler）。
   - 如果这些工具缺失，安装它们或要求用户在本地审查渲染页面。
2. 使用 `python-docx` 进行编辑和结构化创建（标题、样式、表格、列表）。
3. 每次有意义的更改后，重新渲染并检查页面。
4. 如果无法进行视觉审查，使用 `python-docx` 提取文本作为后备，并指出布局风险。
5. 保持中间输出有序，最终批准后清理。

## 临时文件和输出约定
- 使用 `tmp/docs/` 存放中间文件；完成后删除。
- 在此仓库中工作时，将最终产物写入 `output/doc/`。
- 保持文件名稳定且有描述性。

## 依赖（缺失时安装）
优先使用 `uv` 进行依赖管理。

Python 包：
```
uv pip install python-docx pdf2image
```
如果 `uv` 不可用：
```
python3 -m pip install python-docx pdf2image
```
系统工具（用于渲染）：
```
# macOS (Homebrew)
brew install libreoffice poppler

# Ubuntu/Debian
sudo apt-get install -y libreoffice poppler-utils
```

如果此环境无法安装，请告诉用户缺少哪个依赖以及如何在本地安装。

## 环境
无必需的环境变量。

## 渲染命令
DOCX -> PDF：
```
soffice -env:UserInstallation=file:///tmp/lo_profile_$$ --headless --convert-to pdf --outdir $OUTDIR $INPUT_DOCX
```

PDF -> PNG：
```
pdftoppm -png $OUTDIR/$BASENAME.pdf $OUTDIR/$BASENAME
```

打包的辅助脚本：
```
python3 scripts/render_docx.py /path/to/file.docx --output_dir /tmp/docx_pages
```

## 质量期望
- 交付客户就绪的文档：一致的排版、间距、页边距和清晰的层次结构。
- 避免格式缺陷：裁剪/重叠文本、破损表格、乱码或默认模板样式。
- 图表、表格和视觉元素在渲染页面上必须清晰可辨，对齐正确。
- 仅使用 ASCII 连字符。避免 U+2011（不间断连字符）和其他 Unicode 破折号。
- 引用和参考必须人类可读；绝不留下工具标记或占位符字符串。

## 最终检查
- 交付前在 100% 缩放级别重新渲染并检查每个页面。
- 修复任何间距、对齐或分页问题并重复渲染循环。
- 确认没有遗留物（临时文件、重复渲染），除非用户要求保留。
