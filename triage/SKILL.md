---
name: triage
description: 通过分诊角色驱动的状态机对 Issue 与外部 PR 分诊：分类、验证、必要时追问，并撰写 agent brief。当用户想要创建 Issue、分诊 Issue/PR、审查传入 Bug 或功能请求、为离线代理准备 Issue 或管理工作流时使用。
---

# Issue 与 PR 分诊

通过分类角色的状态机移动项目问题跟踪器上的 issue 与外部 PR。

如果本仓库将外部 pull request 视为请求面（见问题跟踪器配置），分诊同样覆盖它们：**PR 就是附带代码的 issue**，使用相同的角色、相同的状态和相同的状态机，差异仅在下文以"针对 PR"标注的部分。遇到裸写的 `#42` 时，按跟踪器配置将其解析为 issue 或 PR。

与 qa 技能的分工：qa 负责从用户报告出发的质量检查与验证；本技能负责 issue/PR 的分类、标签与状态流转。

分类期间发布到问题跟踪器的每个评论或 issue **必须**以以下免责声明开头：

```
> *本内容由 AI 在分诊期间生成。*
```

## 参考文档

- [AGENT-BRIEF.md](AGENT-BRIEF.md) — 如何编写持久化的 agent brief
- [OUT-OF-SCOPE.md](OUT-OF-SCOPE.md) — `.out-of-scope/` 知识库如何工作

## 角色

两个**类别**角色：

- `bug` — 某物坏了
- `enhancement` — 新功能或改进

五个**状态**角色：

- `needs-triage` — 维护者需要评估
- `needs-info` — 等待报告者提供更多信息
- `ready-for-agent` — 完全指定，准备好供 AFK（用户不在场）agent 处理
- `ready-for-human` — 需要人工实现
- `wontfix` — 不会被处理

针对 PR，同样的状态要对着附带代码来读：`ready-for-agent` 表示 brief 已附上，agent 应在 diff 上采取下一步；`ready-for-human` 表示 PR 已准备好由人工合并。

每个分类的 issue 应恰好携带一个类别角色和一个状态角色。如果状态角色冲突，在做任何事情之前标记并询问维护者。

这些是规范角色名称 — 问题跟踪器中使用的实际标签字符串可能不同。映射应该已提供给你 — 如果没有，使用 setup-matt-pocock-skills 技能生成。

状态转换：未标签的 issue 通常首先进入 `needs-triage`；从那里它可以移动到 `needs-info`、`ready-for-agent`、`ready-for-human` 或 `wontfix`。一旦报告者回复，`needs-info` 返回到 `needs-triage`。维护者可以随时覆盖 — 标记看起来不寻常的转换并在继续之前询问。

## 调用

维护者调用 triage 技能并用自然语言描述他们想要的。解释请求并采取行动。示例：

- "Show me anything that needs my attention"
- "Let's look at #42"（issue 或 PR）
- "Move #42 to ready-for-agent"
- "What's ready for agents to pick up?"

## 显示需要关注的内容

查询问题跟踪器并按最早优先呈现三个桶：

1. **未标签** — 从未分类。
2. **`needs-triage`** — 评估进行中。
3. **`needs-info` 自上次分类笔记以来有报告者活动** — 需要重新评估。

当 PR 在范围内时，把外部 PR 也纳入这些桶，并在每行标注 `[PR]` 或 `[issue]`。发现阶段只呈现*外部* PR（跟踪器配置定义谁算外部；例如 GitHub 上按 PR 的 `authorAssociation` 过滤，非 `MEMBER`/`OWNER`/`COLLABORATOR` 的作者视为外部）——协作者正在进行的 PR 不算分诊工作。此过滤仅作用于发现阶段；被显式点名的 PR 无论作者是谁都要分诊。

如果跟踪器不支持按"上次分类笔记以来的报告者活动"过滤，则回退为：列出所有 `needs-info` issue，逐个检查最近评论的作者与时间，手动挑出上次分类笔记之后报告者回复过的项，再呈现第 3 个桶。

显示每个 issue 的计数和一行摘要。让维护者选择。

## 分类特定 issue 或 PR

1. **收集上下文。** 阅读完整 issue 或 PR（正文、评论、标签、作者、日期；PR 还要读 diff）。解析任何先前的分类笔记，这样你不会重复问已解决的问题。使用项目的领域词汇表（`GLOSSARY.md`）探索代码库，尊重你触及区域的 ADR。对代码库运行两项检查：(a) **冗余检查**：按领域概念（而不只是请求的措辞）搜索所请求行为是否已有实现，并报告你搜索过的位置；如果已存在，它就是"已实现"的 `wontfix`（见步骤 5）。(b) **先前拒绝检查**：阅读 `.out-of-scope/*.md`，指出任何与此请求相似的条目。

2. **推荐。** 告诉维护者你的类别和状态推荐及理由，加上与请求相关的简要代码库摘要（包括它是否已经实现）。等待指示。

3. **验证主张（Verify the claim）。** 在任何追问之前，确认主张站得住脚。对 bug，按报告者的步骤复现。对 PR，确认 diff 确实做到了它声称的事：checkout 该 PR，运行相关测试或命令。报告结果 — 确认（附代码路径）、验证失败或细节不足（强烈的 `needs-info` 信号）。经过确认的验证使 agent brief 强得多。

4. **追问（如需要）。** 如果请求需要详细阐述，依次调用 `grill-with-docs` 与 `ubiquitous-language` 技能，一轮一个问题地把它问成型；决策落定时，同步锐化领域术语并内联更新 `GLOSSARY.md` / ADR。

5. **应用结果：**
   - `ready-for-agent` — 发布 agent brief 评论（[AGENT-BRIEF.md](AGENT-BRIEF.md)）。
   - `ready-for-human` — 与 agent brief 结构相同，但注明为什么不能委托（判断电话、外部访问、设计决策、人工测试）。
   - `needs-info` — 发布分类笔记（如下模板）。
   - `wontfix` — 关闭 issue，评论取决于*原因*：
     - **已实现**：变更已存在于代码库中。指出它所在的位置；**不要**写入 `.out-of-scope/`（该知识库用于*被拒绝*的请求，不是已构建的功能）。
     - **拒绝（bug）**：礼貌解释，然后关闭。
     - **拒绝（enhancement）**：写入 `.out-of-scope/`，从评论链接到它，然后关闭（[OUT-OF-SCOPE.md](OUT-OF-SCOPE.md)）。
   - `needs-triage` — 应用角色。如果有部分进展，可选评论。

## 快速状态覆盖

如果维护者说"move #42 to ready-for-agent"，信任他们并直接应用角色。确认你将要做的事情（角色更改、评论、关闭），然后采取行动。跳过追问。如果在没有追问会话的情况下移动到 `ready-for-agent`，询问他们是否想写一个 agent brief。

## Needs-info 模板

```markdown
## Triage Notes

**What we've established so far:**

- point 1
- point 2

**What we still need from you (@reporter):**

- question 1
- question 2
```

将在追问期间解决的所有内容捕获在"established so far"下，这样工作不会丢失。问题必须具体且可操作，不是"请提供更多信息"。

## 恢复先前的会话

如果 issue 或 PR 上存在先前的分类笔记，阅读它们，检查报告者是否回答了任何待处理的问题，在继续之前呈现更新的情况。不要重复问已解决。
