# 会话管理

命名会话隔离任务所有权、标签页和元素引用。它们不选择也不隔离 Google 账户；cookie 和已保存的登录状态由 Chrome 配置文件持有。

已安装的会话键将别名绑定到真实所有者进程的创建标识和原生子线程命名空间。使用相同别名的不同所有者会得到各自独立的标签页；别名匹配并不构成交接或清理能力。进行中的工作应保留原始 worker，并由其执行关闭。原生进程死亡清理并不意味着已完成的子线程已经关闭了其标签页。

## 一个工作流，一个命名会话

```bash
IFS= read -r task_uuid </proc/sys/kernel/random/uuid
# This workflow uses the runtime default; omit --account on every command.
task_session="checkout-${task_uuid//-/}"
agent-browser --session "$task_session" open URL
agent-browser --session "$task_session" snapshot -i --compact
# interact and verify, then run the matching close shown under Cleanup
```

- 同一工作流复用匹配的命名会话/目标。
- 仅当不存在匹配目标，或确实需要一条独立通道时，才打开新会话。
- 写入边界是一个自有会话/标签页树，而不是整个配置文件。
- 为每个并发代理提供全局唯一的语义会话名。当并发确实能显著缩短整个任务时，在独立会话中并发运行互不依赖的浏览器通道；同一配置文件可以安全地承载多个自有会话。串行执行相互依赖的操作以及对同一标签页的任何工作。
- 已安装的 broker 目前允许总共 16 个活跃会话。这是可扩展的容量，不是预先打开标签页的理由；通常只保留少数几个。
- 如果匹配目标存在但无法重新连接，按失败关闭（fail closed）处理，并解决其所有者或传输问题。不要创建会重复登录/2FA 的替代标签页。

## 账户通道

```bash
# Runtime default
IFS= read -r default_uuid </proc/sys/kernel/random/uuid
default_session="default-settings-${default_uuid//-/}"
agent-browser --session "$default_session" open URL
agent-browser --session "$default_session" snapshot -i --compact
agent-browser --session "$default_session" close

# Explicit account, using the locally mapped alias
: "${browser_account:?Set the requested alias from the local operator mapping}"
IFS= read -r account_uuid </proc/sys/kernel/random/uuid
account_session="account-settings-${account_uuid//-/}"
agent-browser --account "$browser_account" --session "$account_session" open URL
agent-browser --account "$browser_account" --session "$account_session" snapshot -i --compact
agent-browser --account "$browser_account" --session "$account_session" close
```

在涉及账户敏感操作之前，始终验证可见身份。对于另一个命名配置文件或邮箱，使用本地已安装的操作者映射中其已登记的别名；绝不要猜测某个邮箱本身就是有效的 `--account` 值，也不要静默使用默认值。对于该会话的每条命令，都要重复相同的显式账户句柄。

## 后台与当前标签页协作

普通的 `open` 会创建一个非活动标签页。如果所选配置文件没有普通窗口，其扩展会惰性创建一个最小化的任务窗口；关闭其最后一个任务会移除该扩展所有的窗口。不要为每个配置文件保留空闲窗口。

仅在对该标签页中的协助有明确请求之后，才使用用户的当前标签页：

```bash
IFS= read -r current_tab_uuid </proc/sys/kernel/random/uuid
current_tab_session="current-help-${current_tab_uuid//-/}"
agent-browser --session "$current_tab_session" --current-tab get url
agent-browser --session "$current_tab_session" --current-tab close
```

这是对确切聚焦的配置文件/窗口/标签页进行的冷启动、一次性认领。它绝不意味着“找一个可能合适的标签页”。其他代理的任务标签页不可认领。在每条命令上重复 `--current-tab` 以及相同的账户/会话选择器。关闭此会话会分离 Agent Browser，并保留用户的标签页。

在执行操作前验证返回的 URL。在初次认领时，等待目标文档渲染完成，而不仅仅是等待其地址出现。Chrome 可能在文档加载开始之前报告空的框架 URL。如果认领期间焦点发生变化，保留该失败状态；不要强制恢复焦点或反复认领。新的尝试需要在该确切失败边界处观察到变化。附加之后，用户可以最小化 Chrome 或切换应用，而命令会继续在保留的标签页中执行，且不会激活它。

两个被显式邀请的代理共享一个用户标签页通过了单独的真实 Chrome 检查：重叠的命令被串行化，每次分离都保留了另一个代理，用户的文档和输入值也得以保留。每个代理都需要自己的会话和邀请；任务自有的标签页仍对其所有者独占。当工作确实可以并行运行时，优先使用相互独立的标签页。

如果任务到达不可避免的仅用户输入，保留其确切会话。在获得许可后，使用命令参考中的 `foreground --input-boundary TYPE`；否则让用户选择标签页。输入之后，使用与交接时完全相同的账户、会话和 `--current-tab` 选择器运行 `background`。返回是有条件的，取决于保存的所有者/焦点状态。取消、拒绝、未确认的结果或没有交接都不承诺焦点；绝不重试或强制聚焦。恢复同一会话并在协作期间保持其打开，而不是创建替代会话。

## 配对与重新连接

传输扩展在每个配置文件中分别安装、启用并登记。只使用本地已安装的操作者映射中列出的账户。一次性登记操作在常规使用中不会重复：处于离线状态的已登记配置文件会按需启动并自动重新连接。复用期间出现新的批准提示属于真实故障；不要自动点击它，也不要再创建一个 Chrome。

## 清理

无论成功、失败还是取消，都使用原始 worker 和账户/会话选择器关闭已完成的任务会话。仅在进行中的用户协作或真正的仅用户输入时才保留它：

```bash
agent-browser --session "$task_session" close
# For an explicit-account workflow, repeat --account "$browser_account" too.
```

封装层会关闭任务自有的目标，并保留用户真实的稳定版 Chrome、无关的已保留用户/认证标签页、扩展、设置和配置文件。它会跟踪任务创建的精确 opener 后代页，并且只关闭自己拥有的那些。对于 `--current-tab` 会话，它会分离而不关闭用户标签页。绝不要留下空白会话等待之后清理。

等待命令退出。如果某个子进程在清理前停止，尽可能恢复那个确切的 worker，或将故障报告给运行时维护者。使用相同别名的父侧关闭在父进程的命名空间中操作，而不是子进程的命名空间。绝不要伪造所有者元数据来绕过隔离。

用户所有的认证保留在所选 Chrome 配置文件中。绝不打印、导出、复制、保存或传输其 cookie、令牌、密码或恢复数据。
