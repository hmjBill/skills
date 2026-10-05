# 已认证私有路由命令参考

这是已安装的私有 Agent Browser 路由经过源码核对的语法子集，并不声称每条命令都通过了实机流程验证。固定的 Vercel v0.36 引擎暴露了更多命令，但其独立的 `--help` 并不能证明已认证页面能力允许这些命令。

## 强制前缀

每次调用都需要一个全局唯一的任务会话。生成一次，并在各次工具调用之间保留其精确值；shell 变量可能无法在新的调用中保留。每条命令都复用同一账户/会话：

```bash
IFS= read -r task_uuid </proc/sys/kernel/random/uuid
# For examples with --account, set browser_account from the local mapping.
# Otherwise omit --account consistently to use the runtime default.
task_session="research-pricing-${task_uuid//-/}"
agent-browser --session "$task_session" open https://example.com
```

对于非默认配置文件，在**每一条**命令上重复完全相同的已登记账户句柄，包括 `close`。请使用本地已安装的操作者映射，而不是杜撰的句柄或根据用户措辞猜测的邮箱：

```bash
IFS= read -r account_uuid </proc/sys/kernel/random/uuid
: "${browser_account:?Set the requested alias from the local operator mapping}"
account_session="account-pricing-${account_uuid//-/}"
agent-browser --account "$browser_account" --session "$account_session" open https://example.com
agent-browser --account "$browser_account" --session "$account_session" snapshot -i --compact
agent-browser --account "$browser_account" --session "$account_session" close
```

对于被显式邀请的当前标签页会话，还要重复 `--current-tab`：

```bash
IFS= read -r current_tab_uuid </proc/sys/kernel/random/uuid
current_tab_session="current-help-${current_tab_uuid//-/}"
agent-browser --session "$current_tab_session" --current-tab get url
agent-browser --session "$current_tab_session" --current-tab snapshot -i --compact
agent-browser --session "$current_tab_session" --current-tab close
```

不要对同一会话并发运行两条命令。相互独立的代理应使用不同的语义会话名称，可以并发运行，包括在同一配置文件内。当前 broker 上限为 16 个活跃会话。

## 核心页面命令

在导航或 DOM 发生实质变化后，使用新的快照引用：

```bash
agent-browser --session "$task_session" snapshot -i --compact
agent-browser --session "$task_session" snapshot -i --compact -s "#main"

agent-browser --session "$task_session" click @e1
agent-browser --session "$task_session" dblclick @e1
agent-browser --session "$task_session" fill @e2 "text"
agent-browser --session "$task_session" type @e2 "text"
agent-browser --session "$task_session" press Enter
agent-browser --session "$task_session" hover @e1
agent-browser --session "$task_session" check @e3
agent-browser --session "$task_session" uncheck @e3
agent-browser --session "$task_session" select @e4 "value"
agent-browser --session "$task_session" scroll down 500
agent-browser --session "$task_session" scrollintoview @e5
agent-browser --session "$task_session" drag @e5 @e6
agent-browser --session "$task_session" upload @e7 'C:\path\file.pdf'
```

已安装的引擎（`6612815`）支持相对调用者的上传。一次限定范围的 Chrome 检查在 58 毫秒内验证了所选文件的内容。只使用 Windows Chrome 可以访问、且被明确授权的文件；这并不授予任意文件系统访问权限，也不构成通过传输文件来绕过失败的理由。保持当前配置文件的文件访问权限边界。

绝不要把密码、令牌、助记词、私钥、钱包保险库或一次性验证码放进命令中。仅限用户本人掌握的机密由用户在保留的精确任务标签页中输入。

## 导航、观察与等待

```bash
agent-browser --session "$task_session" back
agent-browser --session "$task_session" forward
agent-browser --session "$task_session" reload

agent-browser --session "$task_session" get text @e1
agent-browser --session "$task_session" get html @e1
agent-browser --session "$task_session" get value @e1
agent-browser --session "$task_session" get attr @e1 href
agent-browser --session "$task_session" get title
agent-browser --session "$task_session" get url
agent-browser --session "$task_session" get count ".item"
agent-browser --session "$task_session" get box @e1
agent-browser --session "$task_session" is visible @e1
agent-browser --session "$task_session" is enabled @e1
agent-browser --session "$task_session" is checked @e1

agent-browser --session "$task_session" wait "#success"
agent-browser --session "$task_session" wait --text "Success"
agent-browser --session "$task_session" wait --url "**/dashboard"
agent-browser --session "$task_session" wait --load networkidle
agent-browser --session "$task_session" wait --fn "window.ready === true"
```

优先选择可观察的等待，而不是任意毫秒数。选择器等待使用 CSS，而不是 `@ref`；该引擎的等待路径不会解析快照引用。

## 定位器、截图与页面诊断

```bash
agent-browser --session "$task_session" find role button click --name "Submit"
agent-browser --session "$task_session" find text "Sign In" click --exact
agent-browser --session "$task_session" find label "Email" fill "user@example.com"
agent-browser --session "$task_session" find placeholder "Search" fill "query"

agent-browser --session "$task_session" screenshot "/tmp/${task_session}.png"
agent-browser --session "$task_session" screenshot --full "/tmp/${task_session}-full.png"
agent-browser --session "$task_session" console
agent-browser --session "$task_session" errors
```

### 结构化输出

将输出标志放在命令之后，遵循通常的账户/会话前缀：

```bash
agent-browser --session "$task_session" snapshot -i --compact -s "#main" --json
```

在使用 `data` 之前，先检查 `success` 和任何 `error`；仅凭命令退出并不能证明获得了所请求的页面结果。先限定快照/观察的范围，并使用 `--max-output` 限制序列化数据的大小。仅使用 JSON 并不会让输出变小。对于显式账户工作流，要包含打开它时所用的同一 `--account`。

### 已安装的功能

2026 年 9 月 8 日验证：已安装引擎 `6612815`。普通 CLI、回滚与重新应用均通过了真实 Chrome 检查。通过普通命令使用这些功能；以下测量数据仍仅限其受测场景。

| 功能 | 账户/会话前缀之后的语法 | 重要边界 |
| --- | --- | --- |
| 整页 PNG | `screenshot --full "/tmp/full.png"` | 整个文档，包括视口下方 |
| 元素 PNG | `screenshot "#chart" "/tmp/chart.png"` | CSS 选择器，包括较高的屏外区域 |
| JPEG | `screenshot "/tmp/view.jpg" --screenshot-format jpeg --screenshot-quality 80` | 显式选择格式/质量 |
| 清除已捕获的控制台 | `console --clear` | 仅限本会话已捕获的控制台缓冲区 |
| 清除已捕获的错误 | `errors --clear` | 保留控制台及其他所有者的错误；旧引擎会忽略此清除请求 |
| 限制大小的 JSON 数据 | `snapshot -i --compact -s "#main" --json --max-output 4000` | 单次结果的序列化字符上限，而不是总字节上限 |
| 相对调用者的上传 | `upload @e7 "./approved-file.txt"` | 仅限经授权的文件；现有的上传/路径保护仍然适用 |

过大的 JSON 数据可能被省略并给出警告，而操作状态和控制标识符仍会保留。输出缺失**并不**意味着操作失败。绝不要为找回被省略的输出而重复点击、上传或提交；改为进行范围更小的只读观察。在清除缓冲区之前先读取所需的诊断信息。

候选捕获观察到：视口 PNG 201 毫秒、整页 PNG 731 毫秒、选择器 PNG 579 毫秒、质量 80 的 JPEG 589–694 毫秒。这些是个别本地结果，不是普适的速度承诺，也不能证明之后每一种引擎/扩展组合的表现。当普通视口捕获足够时，在当前安装上使用它。

### 仅限用户的输入

在真实输入边界处获得用户许可后，只将你已有的任务标签页前置：

```bash
: "${browser_account:?Set the requested alias from the local operator mapping}"
: "${task_session:?Reuse the session already opened for this task}"
agent-browser --account "$browser_account" --session "$task_session" foreground --input-boundary two-factor
# After the user finishes, repeat this command's exact account/session/current-tab prefix:
agent-browser --account "$browser_account" --session "$task_session" background
```

如果这是被邀请的当前标签页会话，两条命令上也要重复 `--current-tab`。允许的边界值：`password`、`two-factor`、`hardware-key`、`captcha`、`file-picker`、`recovery`、`account-authority`。此封装命令本身已返回 JSON；不要追加引擎标志。它不会创建标签页，也不会重试被中断的激活。`background` 是有条件的：只有当与所有者绑定的交接的焦点历史保持不变时，它才会恢复先前保存的应用或标签页。`cancelled`、`denied`、`unconfirmed` 或 `no-handoff` 不承诺焦点位置。不要重试，也不要强制聚焦。

多个被显式邀请的代理可以使用 `--current-tab` 及各自的会话来共享同一个用户标签页。完整命令在那里串行执行；匹配的 `close` 会让每个代理分离，而不关闭该用户标签页。

仅在常规命令无法表达页面局部的观察/操作时才使用 `eval`。它绝不能绕过配置文件、扩展、cookie、钱包、标签页所有权、焦点或命令限制。

## 标签页与清理

```bash
agent-browser --session "$task_session" tab list
agent-browser --session "$task_session" close
```

仅支持 `tab list`；它显示本会话的合成页面条目，而不是所有 Chrome 标签页。私有路由拒绝通过可变索引创建、切换或关闭标签页。页面创建的 opener 后代页保留在其所属会话内，匹配的会话 `close` 会将其回收。当前标签页会话会分离，而不关闭用户的标签页。`close --all` 会被拒绝。

## 有意拒绝的命令面

封装层拒绝这些命令：`auth`、`chat`、`clipboard`、`connect`、`cookies`、`dashboard`、`inspect`、`install`、`mcp`、`plugin`、`profiles`、`storage` 和 `upgrade`。它还会拒绝替代性 provider/CDP/profile/state、restore、extension、config、namespace、headed、engine、executable、proxy、certificate、unrestricted-file、action-policy 和 idle-timeout 控制项。

页面能力拒绝 `Target.*`、`WebMCP.*`、cookie CDP 方法、`Page.bringToFront` 和 `Page.setDownloadBehavior`。因此不要使用独立 donor 文档中的旧式 `window`、trace/profiler、WebMCP、direct-download、donor focus 或 profile/state 示例。浏览器内部 URL 和扩展 URL 不在普通 HTTP(S) 任务路由的范围内。

如果这里没有记录所需的命令，请在运行之前检查随附源码，以核对封装层解析器、donor 分发和页面能力契约的确切行为。不要通过猜测命令来探测活动浏览器。
