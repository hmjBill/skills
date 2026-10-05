# Playwright CLI 工作流程

经常使用包装脚本和快照。
假设已设置 `PWCLI`，且 `pwcli` 是 `"$PWCLI"` 的别名（PowerShell 7 下用 `npx --yes --package @playwright/cli playwright-cli` 替代 `pwcli`）。
在本仓库中，从 `output/playwright/<label>/` 下运行命令，以将产物集中存放。

## 标准交互循环

```bash
pwcli open https://example.com
pwcli snapshot
pwcli click e3
pwcli snapshot
```

## 表单提交

```bash
pwcli open https://example.com/form --headed
pwcli snapshot
pwcli fill e1 "user@example.com"
pwcli fill e2 "password123"
pwcli click e3
pwcli snapshot
pwcli screenshot
```

## 数据提取

```bash
pwcli open https://example.com
pwcli snapshot
pwcli eval "document.title"
pwcli eval "el => el.textContent" e12
```

## 调试与检查

复现问题后捕获控制台消息和网络活动：

```bash
pwcli console warning
pwcli network
```

记录可疑流程前后的追踪：

```bash
pwcli tracing-start
# 复现问题
pwcli tracing-stop
pwcli screenshot
```

## 会话

使用会话在多个项目之间隔离工作：

```bash
pwcli --session marketing open https://example.com
pwcli --session marketing snapshot
pwcli --session checkout open https://example.com/checkout
```

或一次性设置会话：

```bash
export PLAYWRIGHT_CLI_SESSION=checkout
pwcli open https://example.com/checkout
```

## 配置文件

默认情况下，CLI 从当前目录读取 `playwright-cli.json`。使用 `--config` 指向特定文件。

最小示例：

```json
{
  "browser": {
    "launchOptions": {
      "headless": false
    },
    "contextOptions": {
      "viewport": { "width": 1280, "height": 720 }
    }
  }
}
```

## 故障排除

- 如果元素引用失败，重新运行 `pwcli snapshot` 并重试。
- 如果页面显示不正常，用 `--headed` 重新打开并调整窗口大小。
- 如果流程依赖先前状态，使用命名的 `--session`。
