---
name: env-bootstrap
description: 开发环境引导与依赖补齐，安装缺失工具链并验证环境可用性
---

# 环境引导

触发场景：用户要求安装缺失工具链（如 LSP、CLI、MCP 依赖），或要求验证全局环境是否可用。

## 工作流程

### 1. 检测

检测常见工具的可用性与版本，按当前平台任选一条命令：

Windows PowerShell 7：

```powershell
foreach ($cmd in 'git','node','python','uv','gh') {
  $p = Get-Command $cmd -ErrorAction SilentlyContinue
  if ($p) { "$cmd`t$(& $cmd --version 2>&1 | Select-Object -First 1)" } else { "$cmd`tMISSING" }
}
```

macOS / Linux（bash/zsh）：

```bash
for cmd in git node python uv gh; do
  command -v "$cmd" >/dev/null 2>&1 && echo "$cmd: $("$cmd" --version 2>&1 | head -n 1)" || echo "$cmd: MISSING"
done
```

### 2. 汇报

- 报告缺失项、已安装工具的版本与路径。
- 说明每个缺失项的影响与建议安装方式，经用户确认后才执行安装，并在安装前说明具体命令与影响范围。

### 3. 安装（经用户确认）

| 场景 | 建议方式 |
| --- | --- |
| 系统级 CLI | Windows 用 winget；macOS / Linux 用系统包管理器或官方安装器 |
| Python CLI | `uv tool install <工具名>` |
| Node CLI | `npm install -g <包名>` |

### 4. 复检

安装后重新运行第 1 步检测，确认命令可用并报告结果。

## 约束

- 只安装明确缺失的项。
- 不执行破坏性命令。
- 不隐式修改用户业务代码仓库。
- 配置修改必须可追溯（文件路径 + 变更点）。
- 不跳过验证步骤。
