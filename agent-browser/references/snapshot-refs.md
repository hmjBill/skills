# 快照与引用

快照暴露紧凑的元素引用，使代理无需转储页面 DOM 即可进行交互。以下每个示例都使用一个生成的、全局唯一的会话。在整个工作流期间，将该变量保留在同一个 shell 中。对于非默认配置文件，在每条命令上重复其 `--account`；对于用户邀请的当前标签页，还要重复 `--current-tab`。

## 快速循环

```bash
IFS= read -r snapshot_uuid </proc/sys/kernel/random/uuid
snapshot_session="snapshot-example-${snapshot_uuid//-/}"
agent-browser --session "$snapshot_session" open https://example.com
agent-browser --session "$snapshot_session" snapshot -i --compact
# act with the returned refs
```

优先使用 `-i --compact`。仅在确实需要结构上下文时才使用完整快照。

## 引用形态

典型输出：

```text
@e1 [heading] "Account settings"
@e2 [textbox] "Display name"
@e3 [button] "Save"
```

在生成该引用的同一会话中使用它：

```bash
agent-browser --session "$snapshot_session" fill @e2 "New name"
agent-browser --session "$snapshot_session" click @e3
```

引用与具体会话和页面状态绑定。绝不要在代理、会话或标签页之间复制引用。每次快照都会替换该会话的引用映射，包括限定范围的快照。只使用最近一次成功快照中的引用。

## 生命周期

在导航、重新加载、保存、对话框或 DOM 发生实质变化之后，使用下一个引用之前要重新快照：

```bash
agent-browser --session "$snapshot_session" snapshot -i --compact
agent-browser --session "$snapshot_session" click @e1
agent-browser --session "$snapshot_session" wait --url "**/next"
agent-browser --session "$snapshot_session" snapshot -i --compact
```

当页面没有发生实质变化时，不要每次按键后都重新快照。

## 限定输出范围

将大页面限制到相关容器：

```bash
agent-browser --session "$snapshot_session" snapshot -i --compact -s "#settings"
# If that snapshot returns the desired element as [ref=e9]:
agent-browser --session "$snapshot_session" get text @e9
```

快照 `-s` 只接受 CSS，绝不接受 `@ref`。限定范围的快照会替换先前的引用映射；它不会向其中添加引用。

除非整个 body 确实是所请求的证据，否则避免使用 `get text body`。

限定范围的 `snapshot -s` 仍会通过已登记扩展承载的常规 CDP 协议获取 Chrome 的完整无障碍树，然后在引擎中过滤它。对于单个狭义事实，CSS 专用的 `get` 或 `is` 传输的数据更少，通常成本更低。在遇到大小失败后，不要重复未改变的快照，也不要用原始 CDP 绕过封装层。

## 故障排除

遇到 `ref not found` 时，先判断页面是否发生了变化。如果是，取一次新的快照。如果控件在当前视口之外或异步出现，使用可观察的等待或滚动，然后快照一次：

```bash
agent-browser --session "$snapshot_session" wait --text "Continue"
agent-browser --session "$snapshot_session" snapshot -i --compact

agent-browser --session "$snapshot_session" scroll down 800
agent-browser --session "$snapshot_session" snapshot -i --compact
```

如果一次新的快照仍无法暴露该控件，使用语义定位器或一次限定范围的页面局部观察。不要重复快照、按索引切换标签页，也不要使用 `eval` 绕过所有权、账户、钱包或机密状态保护。

无论成功、失败还是取消，都应及时关闭同一个生成的会话，除非其确切的标签页仍在与用户进行主动协作，或正在等待真正的仅用户输入：

```bash
agent-browser --session "$snapshot_session" close
```
