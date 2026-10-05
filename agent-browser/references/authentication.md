# 认证

使用真实的持久化 Chrome 配置文件作为认证权威。绝不要仅因为站点显示登录页就从干净的浏览器开始或导出 cookie。

## 先确定账户

- 仅当运行时配置的默认值与任务匹配时才省略 `--account`。
- 对于被请求的账户，使用本地已安装的操作者映射中其确切的已登记别名传入 `--account HANDLE`。对该映射表保密。
- 不要根据邮箱或配置文件标签杜撰账户句柄。对于新配置文件，遵循[设置与登记指南](setup.md)。

会话名称不会选择账户。在更改账户数据、发送任何内容或提交付款之前，先验证目标页面的可见身份。

```bash
IFS= read -r default_auth_uuid </proc/sys/kernel/random/uuid
default_auth_session="default-auth-${default_auth_uuid//-/}"
agent-browser --session "$default_auth_session" open URL
agent-browser --session "$default_auth_session" snapshot -i --compact
agent-browser --session "$default_auth_session" close

# Explicit account lane, using the locally mapped alias
: "${browser_account:?Set the requested alias from the local operator mapping}"
IFS= read -r account_auth_uuid </proc/sys/kernel/random/uuid
account_auth_session="account-auth-${account_auth_uuid//-/}"
agent-browser --account "$browser_account" --session "$account_auth_session" open URL
agent-browser --account "$browser_account" --session "$account_auth_session" snapshot -i --compact
agent-browser --account "$browser_account" --session "$account_auth_session" close
```

## 先自动化，再询问

如果站点尚未处于已认证的目标页面：

1. 检查可见页面和当前身份。
2. 当站点常规的账户选择器、Continue、Sign in 或 OAuth 控件能够复用所选 Chrome 配置文件已保存的会话时，使用它们。
3. 在同一命名会话中跟随重定向，并验证返回的身份。
4. 在声称无法登录之前，先检查被请求/默认配置文件现有的已登录状态。对于账户敏感操作，不要静默切换到不同身份。

只要仍存在已保存配置文件的可行路径，就不要要求用户“先登录”。绝不要在聊天或 shell 命令中请求或暴露密码、cookie、令牌、一次性验证码或恢复机密。

## 真正的人工输入边界

只有当渲染出的页面证明存在代理无法安全完成的、不可避免的密码、2FA、硬件密钥、恢复、CAPTCHA、文件选择器或账户权威决策时，才暂停。同意页面并不自动构成用户边界：先检查身份、请求的范围和现有授权。

在中断期间保持完全相同的命名会话。在获得用户许可后，使用命令参考中的 `foreground --input-boundary TYPE`；否则指明配置文件与任务标签页，供用户选择。用户在那里提供机密——而不是在聊天中。输入之后，在适用时使用带有相同账户、会话和 `--current-tab` 前缀的 `background`。只有在交接的焦点历史保持不变时，它才会恢复先前保存的应用或标签页。取消、拒绝、未确认的结果或没有交接都不承诺焦点最终落在何处；不要重试或强制聚焦。恢复同一会话，验证已认证的身份和目标，并在共享工作完成后关闭它。

## OAuth 与持久化

- 在同一任务会话中继续同标签页的 OAuth 重定向，并在每次导航后使用新的引用。任务自有的确切弹出窗口后代页需要清理，但普通路由无法切换到或控制它们。网站触发的弹出窗口可能会将 Chrome 前置；这一被接受的限制并不免除清理它们的义务。仅根 `close` 成功并不能证明弹出窗口已消失；将仍然存留的自有弹出窗口作为清理失败报告给运行时维护者，而不要关闭猜测的或用户所有的标签页。如果需要与弹出窗口交互，不要猜测标签页命令，也不要将其作为当前标签页接管；只有真正的人工输入边界可以交给用户，否则将不支持的浏览器操作转交运行时维护者处理。
- 认证持久保存在所选 Chrome 配置文件中。不要为用户所有的账户使用可移植状态文件。
- 绝不要用会强制再次登录的新的干净标签页来替代附加或传输失败。
- 默认保持任务标签页非活动。用户可以选择确切的保留任务标签页进行输入或持续协作；这并不授权代理反复将 Chrome 前置或在共享工作期间关闭该标签页。

## 浏览器扩展与 MetaMask

- 普通私有路由控制 HTTP(S) 页面标签页；它不授予扩展 UI 或扩展存储的权限。绝不要使用 `eval`、原始 CDP 或猜测的内部 URL 绕过该边界。
- 绝不要仅仅因为站点或传输被阻塞就重新安装、重置、侧载、解锁、连接、签名、创建/导入或修复钱包。
- 当用户期望已有钱包时，MetaMask 引导（`Create a new wallet` / `I have an existing wallet`）是错误状态的 RED。保留现场数据并停止普通通道。只有单独明确的钱包/状态任务才授权调查该状态；绝不要索取助记词、私钥、保险库、密码或硬件钱包机密。
- 站点连接绝不授权钱包签名或交易。在首次尝试被证明确实不存在之前，绝不要重复其中任何一项。
- 传输相关工作绝不授权更改 MetaMask 数据或硬件钱包/USB 行为。

完成后及时运行匹配的会话 `close`，包括失败或取消之后，除非该确切标签页仍在与用户进行主动协作或正在等待真正的仅用户输入。保留并重复相同的显式账户/会话。以匹配的 `close` 结束受邀用户标签页的附加，它会分离而不关闭用户的标签页。
