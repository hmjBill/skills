# Playwright CLI 参考

除非 CLI 已全局安装，否则使用包装脚本。在技能目录（`SKILL.md` 所在目录）下运行：

```bash
export PWCLI="$PWD/scripts/playwright_cli.sh"
"$PWCLI" --help
```

Windows 上该脚本需要 Git Bash（或在 WSL 中运行）；在 PowerShell 7 下可直接使用等价的 `npx` 调用：

```powershell
npx --yes --package @playwright/cli playwright-cli --help
```

可选便捷别名：

```bash
alias pwcli="$PWCLI"
```

## 核心命令

```bash
pwcli open https://example.com
pwcli close
pwcli snapshot
pwcli click e3
pwcli dblclick e7
pwcli type "search terms"
pwcli press Enter
pwcli fill e5 "user@example.com"
pwcli drag e2 e8
pwcli hover e4
pwcli select e9 "option-value"
pwcli upload ./document.pdf
pwcli check e12
pwcli uncheck e12
pwcli eval "document.title"
pwcli eval "el => el.textContent" e5
pwcli dialog-accept
pwcli dialog-accept "confirmation text"
pwcli dialog-dismiss
pwcli resize 1920 1080
```

## 导航

```bash
pwcli go-back
pwcli go-forward
pwcli reload
```

## 键盘

```bash
pwcli press Enter
pwcli press ArrowDown
pwcli keydown Shift
pwcli keyup Shift
```

## 鼠标

```bash
pwcli mousemove 150 300
pwcli mousedown
pwcli mousedown right
pwcli mouseup
pwcli mouseup right
pwcli mousewheel 0 100
```

## 保存为

```bash
pwcli screenshot
pwcli screenshot e5
pwcli pdf
```

- `screenshot` 不带参数时对当前页面截图；`screenshot e5` 只截取快照中引用为 `e5` 的元素（先 `pwcli snapshot` 拿到引用）。
- 全页截图与「输出到指定文件」的写法本文档未固化：先运行 `pwcli screenshot --help` 查当前版本的实际参数，不要凭猜测拼 flag。

```bash
pwcli pdf --help
```

`pdf` 把当前页面导出为 PDF；输出路径参数本文档未固化，同样以 `pwcli pdf --help` 的实际输出为准。

## 标签页

```bash
pwcli tab-list
pwcli tab-new
pwcli tab-new https://example.com/page
pwcli tab-close
pwcli tab-close 2
pwcli tab-select 0
```

## 开发者工具

```bash
pwcli console
pwcli console warning
pwcli network
pwcli run-code "await page.waitForTimeout(1000)"
pwcli tracing-start
pwcli tracing-stop
```

- `console` 读取控制台消息，`console warning` 按级别过滤。
- 清空/重置已收集消息的 flag 本文档未固化（不同版本命名可能不同），以 `pwcli console --help` 为准，本文不写猜测的 flag 名。
- `network` 的子命令与过滤参数以 `pwcli network --help` 为准。
- `tracing-start` / `tracing-stop` 的 trace 输出文件参数本文档未固化，以 `pwcli tracing-stop --help` 为准。

## 会话

使用命名会话隔离工作：

```bash
pwcli --session todo open https://demo.playwright.dev/todomvc
pwcli --session todo snapshot
```

或一次性设置环境变量：

```bash
export PLAYWRIGHT_CLI_SESSION=todo
pwcli open https://demo.playwright.dev/todomvc
```

## 版本说明

当前安装策略是跟随 `@latest`，没有锁定版本：`scripts/playwright_cli.sh` 用的是 `npx --yes --package @playwright/cli playwright-cli`，`SKILL.md` 的全局安装步骤写的也是 `@playwright/cli@latest`。

因此子命令与 flag 都可能随版本漂移。本文档只固化已验证的用法；未固化的参数一律以 `--help` 为准：

```bash
pwcli <命令> --help
npx --yes --package @playwright/cli playwright-cli <命令> --help
```

升级后若某条命令失效或报参数错误，先跑上面的 `--help` 对照本文档，再改命令，不要沿用记忆中的 flag。
