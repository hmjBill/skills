---
name: screenshot
description: 当用户明确要求桌面或系统截图（全屏、特定应用或窗口、像素区域），或工具特定的捕获功能不可用且需要操作系统级捕获时使用。
---


# 截图

每次都遵循以下保存位置规则：

1) 如果用户指定了路径，就保存到该路径。
2) 如果用户要求截图但未提供路径，就保存到操作系统默认截图位置。
3) 如果 Codex 为自身检查需要截图，就保存到临时目录。

## Tool priority

- 当可用时，优先使用工具特定的截图能力（例如：用于 Figma 文件的 Figma MCP/skill，或用于浏览器与 Electron 应用的 Playwright/agent-browser 工具）。
- 在被明确要求时、需要整机桌面截图时，或工具特定截图无法满足需求时，使用此 skill。
- 否则，对于没有更好集成截图工具的桌面应用，将此 skill 作为默认方案。

## macOS permission preflight (reduce repeated prompts)

在 macOS 上，在窗口/应用截图前先运行一次 preflight 辅助脚本。
它会检查 Screen Recording 权限，说明为何需要该权限，并在同一处发起权限请求。

这些辅助脚本会将 Swift 的 module cache 定向到 `$TMPDIR/codex-swift-module-cache`，
以避免额外的沙箱 module-cache 提示。

```bash
bash <path-to-skill>/scripts/ensure_macos_permissions.sh
```

为避免多次沙箱授权提示，尽可能将 preflight 与 capture 合并为一个命令：

```bash
bash <path-to-skill>/scripts/ensure_macos_permissions.sh && \
python3 <path-to-skill>/scripts/take_screenshot.py --app "Codex"
```

对于 Codex 的检查执行，请将输出保存在临时目录：

```bash
bash <path-to-skill>/scripts/ensure_macos_permissions.sh && \
python3 <path-to-skill>/scripts/take_screenshot.py --app "<App>" --mode temp
```

使用随附脚本，避免重复推导各操作系统特定命令。

## macOS and Linux (Python helper)

从仓库根目录运行该辅助脚本：

```bash
python3 <path-to-skill>/scripts/take_screenshot.py
```

常见用法：

- 默认位置（用户只说“截个图”）：

```bash
python3 <path-to-skill>/scripts/take_screenshot.py
```

- 临时位置（Codex 视觉检查）：

```bash
python3 <path-to-skill>/scripts/take_screenshot.py --mode temp
```

- 显式位置（用户提供了路径或文件名）：

```bash
python3 <path-to-skill>/scripts/take_screenshot.py --path output/screen.png
```

- 按应用名抓取应用/窗口（仅 macOS；支持子串匹配；会抓取所有匹配窗口）：

```bash
python3 <path-to-skill>/scripts/take_screenshot.py --app "Codex"
```

- 指定应用内的窗口标题（仅 macOS）：

```bash
python3 <path-to-skill>/scripts/take_screenshot.py --app "Codex" --window-name "Settings"
```

- 在截图前列出匹配窗口 id（仅 macOS）：

```bash
python3 <path-to-skill>/scripts/take_screenshot.py --list-windows --app "Codex"
```

- 像素区域（x,y,w,h）：

```bash
python3 <path-to-skill>/scripts/take_screenshot.py --mode temp --region 100,200,800,600
```

- 焦点/活动窗口（仅抓取最前窗口；使用 `--app` 可抓取该应用的全部窗口）：

```bash
python3 <path-to-skill>/scripts/take_screenshot.py --mode temp --active-window
```

- 指定窗口 id（在 macOS 上可用 --list-windows 发现 id）：

```bash
python3 <path-to-skill>/scripts/take_screenshot.py --window-id 12345
```

脚本会为每次截图输出一个路径。若匹配到多个窗口或显示器，会输出多个路径（每行一个），并附加如 `-w<windowId>` 或 `-d<display>` 的后缀。请使用图像查看工具按顺序查看每个路径，仅在有需要或被要求时再处理图像。

### Workflow examples

- “看看 <App> 并告诉我你看到了什么”：先截图到临时目录，再按顺序查看每个输出路径。

```bash
bash <path-to-skill>/scripts/ensure_macos_permissions.sh && \
python3 <path-to-skill>/scripts/take_screenshot.py --app "<App>" --mode temp
```

- “Figma 设计和实际实现不一致”：先用 Figma MCP/skill 抓取设计图，再用此 skill 抓取运行中的应用（通常保存到临时目录），并在做任何处理前先比较原始截图。

### Multi-display behavior

- 在 macOS 上，连接多显示器时，全屏截图会为每个显示器保存一个文件。
- 在 Linux 和 Windows 上，全屏截图使用虚拟桌面（所有显示器合并为一张图）；需要时可用 `--region` 分离单个显示器。

### Linux prerequisites and selection logic

该辅助脚本会自动选择第一个可用工具：

1) `scrot`
2) `gnome-screenshot`
3) ImageMagick `import`

如果都不可用，请让用户安装其中之一后重试。

坐标区域截图需要 `scrot` 或 ImageMagick `import`。

`--app`、`--window-name` 与 `--list-windows` 仅支持 macOS。在 Linux 上，
请使用 `--active-window`，或在可用时提供 `--window-id`。

## Windows (PowerShell helper)

运行 PowerShell 辅助脚本：

```powershell
powershell -ExecutionPolicy Bypass -File <path-to-skill>/scripts/take_screenshot.ps1
```

常见用法：

- 默认位置：

```powershell
powershell -ExecutionPolicy Bypass -File <path-to-skill>/scripts/take_screenshot.ps1
```

- 临时位置（Codex 视觉检查）：

```powershell
powershell -ExecutionPolicy Bypass -File <path-to-skill>/scripts/take_screenshot.ps1 -Mode temp
```

- 显式路径：

```powershell
powershell -ExecutionPolicy Bypass -File <path-to-skill>/scripts/take_screenshot.ps1 -Path "C:\Temp\screen.png"
```

- 像素区域（x,y,w,h）：

```powershell
powershell -ExecutionPolicy Bypass -File <path-to-skill>/scripts/take_screenshot.ps1 -Mode temp -Region 100,200,800,600
```

- 活动窗口（先让用户将目标窗口置于焦点）：

```powershell
powershell -ExecutionPolicy Bypass -File <path-to-skill>/scripts/take_screenshot.ps1 -Mode temp -ActiveWindow
```

- 指定窗口句柄（仅在已提供时）：

```powershell
powershell -ExecutionPolicy Bypass -File <path-to-skill>/scripts/take_screenshot.ps1 -WindowHandle 123456
```

## Direct OS commands (fallbacks)

当无法运行辅助脚本时，使用以下命令。

### macOS

- 全屏截图并保存到指定路径：

```bash
screencapture -x output/screen.png
```

- 像素区域：

```bash
screencapture -x -R100,200,800,600 output/region.png
```

- 指定窗口 id：

```bash
screencapture -x -l12345 output/window.png
```

- 交互式选择区域或窗口：

```bash
screencapture -x -i output/interactive.png
```

### Linux

- 全屏：

```bash
scrot output/screen.png
```

```bash
gnome-screenshot -f output/screen.png
```

```bash
import -window root output/screen.png
```

- 像素区域：

```bash
scrot -a 100,200,800,600 output/region.png
```

```bash
import -window root -crop 800x600+100+200 output/region.png
```

- 活动窗口：

```bash
scrot -u output/window.png
```

```bash
gnome-screenshot -w -f output/window.png
```

## Error handling

- 在 macOS 上，先运行 `bash <path-to-skill>/scripts/ensure_macos_permissions.sh`，以在同一处请求 Screen Recording 权限。
- 如果在沙箱环境中看到 “screen capture checks are blocked in the sandbox”、“could not create image from display” 或 Swift `ModuleCache` 权限错误，请使用提升权限后重新运行命令。
- 如果 macOS 应用/窗口截图未匹配到结果，请运行 `--list-windows --app "AppName"`，然后改用 `--window-id` 重试，并确保该应用在屏幕上可见。
- 如果 Linux 的区域/窗口截图失败，请用 `command -v scrot`、`command -v gnome-screenshot` 和 `command -v import` 检查工具可用性。
- 如果在沙箱中保存到操作系统默认位置因权限错误失败，请使用提升权限后重新运行命令。
- 始终在回复中报告已保存的文件路径。
