# 编写 Agent Brief

Agent brief 是 issue 或 PR 移动到 `ready-for-agent` 时发布在 GitHub 上的结构化评论。它是 AFK（用户不在场）agent 工作的权威规范。原始正文与讨论是背景 — agent brief 才是契约。

Brief 说明的是 **agent 应该做什么**，这句话覆盖两种请求面：对 issue 而言，是从零构建变更；对 PR 而言，是在*现有 diff 上*还需要做什么 — 完成它、补齐缺口、处理审查意见。两种情况下原则相同；下面的 PR 示例展示了差异。

## 原则

### 持久性优先于精确性

Issue 或 PR 可能在 `ready-for-agent` 停留数天或数周。代码库在此期间会变化。编写 brief 时要让它在文件被重命名、移动或重构后依然有用。

- **要**描述接口、类型和行为契约
- **要**点名 agent 应查找或修改的具体类型、函数签名或配置形状
- **不要**引用文件路径 — 它们会过时
- **不要**引用行号
- **不要**假设当前实现结构会保持不变

### 描述行为，而非过程

描述系统**应该做什么**，而不是**如何实现**。agent 会重新探索代码库并自行做实现决策。

- **好：** "`SkillConfig` 类型应接受一个可选的 `schedule` 字段，类型为 `CronExpression`"
- **坏：** "打开 src/types/skill.ts，在第 42 行添加 schedule 字段"
- **好：** "当用户不带参数运行 `/triage` 时，应看到需要关注的问题摘要"
- **坏：** "在主处理函数里添加一个 switch 语句"

### 完整的验收标准

Agent 需要知道何时算完成。每份 agent brief 都必须有具体、可测试的验收标准。每条标准应可独立验证。

- **好：** "运行 `gh issue list --label needs-triage` 会返回经过初始分类的 issue"
- **坏：** "分诊应该正常工作"

### 明确的边界

说明什么不在范围内。这能防止 agent 镀金或对相邻功能做假设。

## 模板

```markdown
## Agent Brief

**Category:** bug / enhancement
**Summary:** 需要完成的事情的一行描述

**Current behavior:**
描述现在发生什么。对 bug，这是损坏的行为。
对 enhancement，这是新功能所基于的现状。

**Desired behavior:**
描述 agent 工作完成后应该发生什么。
对边界情况和错误条件要具体。

**Key interfaces:**
- `TypeName` — 需要改什么以及为什么
- `functionName()` 返回类型 — 当前返回什么 vs 应该返回什么
- 配置形状 — 需要的新配置选项

**Acceptance criteria:**
- [ ] 具体、可测试的标准 1
- [ ] 具体、可测试的标准 2
- [ ] 具体、可测试的标准 3

**Out of scope:**
- 本 issue 中不应更改或处理的事情
- 看起来相关但实际独立的相邻功能
```

## 示例

### 好的 agent brief（bug）

```markdown
## Agent Brief

**Category:** bug
**Summary:** Skill 描述截断从词中间切断，产生损坏的输出

**Current behavior:**
当 skill 描述超过 1024 个字符时，会在恰好 1024 个字符处截断，
不考虑词边界。这产生的描述会在词中间结束（例如 "Use when the user wants to confi"）。

**Desired behavior:**
截断应发生在 1024 个字符之前的最后一个词边界处，
并追加 "..." 表示发生了截断。

**Key interfaces:**
- `SkillMetadata` 类型的 `description` 字段 — 不需要类型变更，
  但填充它的校验/处理逻辑需要尊重词边界
- 任何读取 SKILL.md frontmatter 并提取描述的函数

**Acceptance criteria:**
- [ ] 1024 字符以下的描述保持不变
- [ ] 超过 1024 字符的描述在 1024 之前的最后一个词边界处截断
- [ ] 截断后的描述以 "..." 结尾
- [ ] 包含 "..." 的总长度不超过 1024 字符

**Out of scope:**
- 更改 1024 字符上限本身
- 多行描述支持
```

### 好的 agent brief（enhancement）

```markdown
## Agent Brief

**Category:** enhancement
**Summary:** 添加 `.out-of-scope/` 目录支持，用于记录被拒绝的功能请求

**Current behavior:**
当功能请求被拒绝时，issue 会带 `wontfix` 标签和一条评论关闭。
决策及其理由没有持久记录。未来类似的请求需要维护者回忆或搜索
先前的讨论。

**Desired behavior:**
被拒绝的功能请求应记录在 `.out-of-scope/<concept>.md` 文件中，
捕获决策、理由以及所有请求该功能的 issue 链接。分诊新 issue 时，
应检查这些文件是否匹配。

**Key interfaces:**
- `.out-of-scope/` 中的 Markdown 文件格式 — 每个文件应有
  `# Concept Name` 标题、`**Decision:**` 行、`**Reason:**` 行，
  以及带 issue 链接的 `**Prior requests:**` 列表
- 分诊工作流应及早读取所有 `.out-of-scope/*.md` 文件，
  并按概念相似度将新 issue 与它们匹配

**Acceptance criteria:**
- [ ] 以 wontfix 关闭功能时，在 `.out-of-scope/` 中创建/更新文件
- [ ] 文件包含决策、理由和被关闭 issue 的链接
- [ ] 如果匹配的 `.out-of-scope/` 文件已存在，新 issue 追加到
      其 "Prior requests" 列表，而不是创建重复文件
- [ ] 分诊期间，检查现有 `.out-of-scope/` 文件，并在新 issue
      匹配先前拒绝时呈现给维护者

**Out of scope:**
- 自动匹配（由人工确认匹配）
- 重新打开先前被拒绝的功能
- Bug 报告（只有 enhancement 拒绝才写入 `.out-of-scope/`）
```

### 好的 agent brief（PR）

对 PR，"Current behavior" 描述 diff 的状态，brief 要求 agent 完成或修复它，而不是从零构建。

```markdown
## Agent Brief

**Category:** enhancement
**Summary:** 完成贡献者为 `triage list` 添加的 `--json` 输出标志

**Current behavior:**
该 PR 添加了把 issue 列表序列化为 JSON 的 `--json` 标志。顺利路径
已可工作，diff 符合项目的命令结构。还剩两个缺口：错误仍以人类
可读文本打印（而非 JSON），新标志没有测试覆盖。

**Desired behavior:**
启用 `--json` 时，所有输出（包括错误）都是 stdout 上的合法 JSON，
命令的退出码保持不变。未使用该标志时，现有的人类可读输出不受影响。

**Key interfaces:**
- 命令的错误路径在 `--json` 下应输出 `{ "error": string }`，
  而不是纯文本错误
- 复用 PR 已添加的现有序列化器；不要引入第二个

**Acceptance criteria:**
- [ ] `triage list --json` 在成功和错误情况下都输出合法 JSON
- [ ] 退出码与非 JSON 命令一致
- [ ] 有测试覆盖 `--json` 成功输出和一个错误情况
- [ ] 默认（非 JSON）输出逐字节不变

**Out of scope:**
- 给任何其他命令添加 `--json`
- 更改 PR 已定义的 JSON 成功载荷形状
```

### 坏的 agent brief

```markdown
## Agent Brief

**Summary:** 修复分诊 bug

**What to do:**
分诊出问题了。看主文件并修复它。
大约第 150 行的函数有问题。

**Files to change:**
- src/triage/handler.ts（第 150 行）
- src/types.ts（第 42 行）
```

这很糟糕，因为：

- 没有类别
- 描述含糊（"分诊出问题了"）
- 引用会过时的文件路径和行号
- 没有验收标准
- 没有范围边界
- 没有当前行为与期望行为的描述
