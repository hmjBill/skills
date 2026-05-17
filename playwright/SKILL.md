---
name: playwright
description: 当任务需要从终端自动化真实浏览器（导航、表单填写、快照、截图、数据提取、UI 流程调试）时使用，通过 `playwright-cli` 或捆绑的封装脚本。
---

# Playwright

使用 `playwright-cli` 从终端驱动真实的浏览器。优先使用捆绑的包装脚本，这样 CLI 即使在没有全局安装时也能工作。
将此技能视为 CLI 优先的自动化。除非用户明确要求测试文件，否则不要转向 `@playwright/test`。

## 前置检查（必需）

在提议命令之前，检查 `npx` 是否可用（包装脚本依赖它）：

```bash
command -v npx >/dev/null 2>&1
```

如果不可用，暂停并要求用户安装 Node.js/npm（提供 `npx`）。逐字提供以下步骤：

```bash
# Playwright
node --version
npm --version

# Playwright
npm install -g @playwright.cli@latest
playwright-cli --help
```

一旦 `npx` 存在，继续使用包装脚本。全局安装 `playwright-cli` 是可选的。

## 技能路径（设置一次）

```bash
export CODEX_HOME="${CODEX_HOME:-$HOME/.codex}"
export PWCLI="$CODEX_HOME/skills/playwright/scripts/playwright_cli.sh"
```

用户范围的技能安装在 `$CODEX_HOME/skills` 下（默认：`~/.codex/skills`）。

## 快速开始

使用包装脚本：

```bash
"$PWCLI" open https://playwright.dev --headed
"$PWCLI" snapshot
"$PWCLI" click e15
"$PWCLI" type "Playwright"
"$PWCLI" press Enter
"$PWCLI" screenshot
```

如果用户更喜欢全局安装，这也是有效的：

```bash
npm install -g @playwright.cli@latest
playwright-cli --help
```

## 核心工作流程

1. 打开页面。
2. 快照以获取稳定的元素引用。
3. 使用最新快照中的引用进行交互。
4. 在导航或重大 DOM 更改后重新快照。
5. 在有用时捕获产物（截图、pdf、追踪）。

最小循环：

```bash
"$PWCLI" open https://example.com
"$PWCLI" snapshot
"$PWCLI" click e3
"$PWCLI" snapshot
```

## 何时重新快照

在以下操作后重新快照：

- 导航
- 点击显著改变 UI 的元素
- 打开/关闭模态框或菜单
- 标签页切换

引用可能会失效。当命令因缺少引用而失败时，重新快照。

## 推荐模式

### 表单填写和提交

```bash
"$PWCLI" open https://example.com/form
"$PWCLI" snapshot
"$PWCLI" fill e1 "user@example.com"
"$PWCLI" fill e2 "password123"
"$PWCLI" click e3
"$PWCLI" snapshot
```

### 使用追踪调试 UI 流程

```bash
"$PWCLI" open https://example.com --headed
"$PWCLI" tracing-start
# Playwright
"$PWCLI" tracing-stop
```

### 多标签页工作

```bash
"$PWCLI" tab-new https://example.com
"$PWCLI" tab-list
"$PWCLI" tab-select 0
"$PWCLI" snapshot
```

## 包装脚本

包装脚本使用 `npx --package @playwright/cli playwright-cli`，这样 CLI 可以在没有全局安装的情况下运行：

```bash
"$PWCLI" --help
```

除非仓库已经标准化全局安装，否则优先使用包装脚本。

## 参考资料

只打开您需要的内容：

- CLI 命令参考：`references/cli.md`
- 实用工作流程和故障排除：`references/workflows.md`

## 护栏

- 在引用 `e12` 这样的元素 ID 之前始终先快照。
- 当引用看起来失效时重新快照。
- 优先使用显式命令而不是 `eval` 和 `run-code`，除非需要。
- 当您没有新的快照时，使用占位符引用如 `eX` 并说明原因；不要用 `run-code` 绕过引用。
- 当视觉检查有帮助时使用 `--headed`。
- 在此仓库中捕获产物时，使用 `output/playwright/` 并避免引入新的顶级产物文件夹。
- 默认使用 CLI 命令和工作流程，而不是 Playwright 测试规范。
