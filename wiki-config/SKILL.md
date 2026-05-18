---
name: wiki-config
description: 交互式设置、验证和维护 llm-wiki skill 套件，管理 wiki 配置、schema 和模板。
---

# Wiki 配置

`wiki-config.md` 的交互式设置、验证和维护。与五个操作型 wiki skills（wiki-ingest、wiki-lint、wiki-integrate、wiki-crystallize、wiki-query）配套使用，它们都读取同一份配置。

---

## 能力要求

文件系统读取、写入、搜索和目录创建。如果运行环境没有文件系统工具，请告知用户并停止。

---

## 工作流

### 步骤 0 - 欢迎与初始化

**每次调用 wiki-config 时，都从这里开始。**

#### 展示 wiki skill 生态

检查本会话中有哪些 wiki skills 可用。扫描上下文中的 `<available_skills>` 部分，查找匹配 `wiki-*` 模式的 skills（wiki-config、wiki-ingest、wiki-query、wiki-lint、wiki-integrate、wiki-crystallize）。在 `<available_skills>` 中找到的 skills 已启用且可用 - 标记为 ✓。未找到的 skills 要么未安装，要么在用户设置中被关闭 - 标记为 ✗。

用每个 skill 的实际状态展示此表：

```
## Wiki Skill Ecosystem

| Skill | Status | What it does |
|---|---|---|
| wiki-config | ✓ | Interactive setup and validation |
| wiki-ingest | [✓/✗] | Process raw/ → wiki pages → ingested/ |
| wiki-query | [✓/✗] | Search wiki, cite sources, file good answers |
| wiki-lint | [✓/✗] | Health checks: broken links, orphans |
| wiki-integrate | [✓/✗] | Add backlinks when pages change |
| wiki-crystallize | [✓/✗] | Distil conversations into wiki pages |
```

如果有任何缺失："请从本仓库补齐 `wiki-config`、`wiki-crystallize`、`wiki-ingest`、`wiki-integrate`、`wiki-lint`、`wiki-query` 六个目录。"

捆绑的 `references/setup-help.md` 在整个会话中都可用。如果需要更多导向上下文、用户询问 wiki 系统的详细问题，或你卡住了，请读取它。

#### 展示欢迎消息

"我先读取设置指南，帮助我们双方确认方向……"

然后展示：

---

> **欢迎使用你的 LLM-Wiki**
> 
> 开始之前，先快速说明几个概念：

> **文件系统访问范围** - 你的文件系统工具可以访问的目录。这是最外层边界。请严格限定工具范围；过宽的访问范围会带来隐私风险。
>
> **Wiki root** - 该范围内包含你的 Markdown 笔记和 wiki 系统文件（`wiki-config.md`、`wiki-help.md`、`Home.md`、`Overview.md`、`index.md`、`log.md`、`raw\`、`ingested\`、`templates\`）的文件夹。这是你存放 `.md` 文件的位置 - 可以是 Obsidian vault、Logseq graph 或你维护笔记的任何位置的一个子集。Skills 通过查找 `wiki-config.md` 来定位 wiki root。

> **重要：** Wiki root 不应是你的机器根目录（`C:\`、`/`）或用户主目录 - 这些都有隐私风险。它也不需要是你的整个 vault 或 graph。
>
> 我们建议把 wiki root 设置为知识库的一个子目录 - 只包含你愿意与代理共享的文件夹。
>
> 该 wiki 会与你现有的笔记协同工作，帮助你将来源材料（PDF、文章、文档）综合为相互链接的 wiki 页面。你添加的每个来源、提出的每个问题，都会让知识库更加丰富 - 它会随时间复利增长。

---

如果用户看起来不确定或要求更多上下文，询问："要我向你展示完整设置指南吗？" 然后读取并展示 `references/setup-help.md`。

否则继续评估状态。

#### 评估状态并分支

**检查文件系统范围：**

识别你的文件系统范围根目录 - 也就是你的文件系统工具可以访问的顶层目录。

**如果范围不合理**（裸磁盘根目录、OS 根目录或用户主目录）：

"你的文件系统访问范围设置为 `[scope]` - 这非常宽泛，存在隐私风险。我建议设置完成后，将范围限定为你的 wiki 文件夹。

我需要你的 wiki root 的绝对路径。示例：
- Windows: `C:\Users\YourName\Documents\wiki`
- Mac: `/Users/YourName/Documents/wiki`

路径是什么？"

**隐私纪律：** 切勿列出用户或枚举系统文件夹。直接询问路径。

**如果范围合理：** 递归搜索 `wiki-config.md`（最多 5 层深）。

**根据发现结果分支：**

→ **未找到配置** - "你还没有 wiki。我会带你完成设置。" → 步骤 2（Init）

→ **找到配置** - 读取它，然后在同一目录中运行完整环境检查。检查以下各项：

1. `wiki-schema.md` - 存在且可正常解析 / 缺失 / 格式错误
2. `wiki-help.md` - 存在 / 缺失
3. `templates/` folder - 存在 / 缺失
4. 模板文件完整性 - 13 个预期文件中哪些存在（`knowledge.md`、`reference.md`、`survey.md`、`domain-home.md`、`overview.md`、`home.md`、`log.md`、`index.md`、`longform.md`、`profile.md`、`established-patterns.md`、`note.md`、`config.md`）
5. `wiki-config.md` 中的 `templates_folder:` field - 存在 / 不存在

展示一份紧凑、友好的摘要 - 每个组件一行。例如：

> **你的 wiki 环境**
>
> - wiki-config.md: 已找到
> - wiki-schema.md: 已找到
> - wiki-help.md: 已找到
> - templates/: 存在（13 个文件中的 9 个）
> - templates_folder field: 配置中不存在
>
> 两项需要处理。我可以一步修复两项，或者你可以单独选择。

**如果一切健康：** 直接提供主菜单。

**如果有任何项目缺失或损坏：** 展示上面的摘要，然后提供：
- "全部修复" - 一次性部署所有缺失项目；开始前确认一次
- 单独选择 - 用户选择要处理的项目

**每个组件的修复动作：**
- `wiki-schema.md` 缺失 → 从 `assets/wiki-schema.md` 部署（非破坏性，无需确认）
- `wiki-schema.md` 格式错误 → 警告，提供重置为捆绑默认值的选项；覆盖前确认
- `wiki-help.md` 缺失 → 从 `assets/wiki-help.md` 部署（非破坏性，无需确认）
- `templates/` folder 缺失 → 使用下面的引用块介绍模板，然后询问是否创建文件夹并从 `assets/templates/` 部署全部 13 个文件 + README
- 单个模板文件缺失 → 仅从 `assets/templates/` 部署缺失文件；绝不覆盖已存在文件
- 配置中缺少 `templates_folder:` → 将 `templates_folder: templates/` 写入 `wiki-config.md`；仅在确认 `templates/` folder 存在时执行

当 `templates/` 缺失或不完整且用户此前没有接触过这个概念时，展示：

> **页面模板**
>
> 模板为每个 wiki 页面提供一致、结构化的起点。当 skill 创建新页面时，它会从你的 `templates/` folder 读取匹配的模板，并将其用作脚手架 - 把 `{{TITLE}}` 和 `{{DATE}}` 等占位符替换为真实值。
>
> 你的模板由你编辑。任何改动会立即影响新页面；现有页面永远不会被修改。如果某个模板文件缺失，skill 会回退到最小硬编码结构。
>
> 默认集合覆盖全部 13 个默认模板（12 种页面类型加上特殊的顶层 Home 导航中心）：knowledge、reference、survey、domain-home、overview、home、log、index、longform、profile、established-patterns、note 和 config。

展示后，询问："是否将默认模板集部署到 `<wiki_root>/templates/`？"

任何修复后：展示更新后的状态并提供主菜单。

**主菜单（所有组件健康）：**

提供：
- 验证配置（步骤 3）
- 编辑配置设置（步骤 4）
- 管理 schema（步骤 5）
- 管理模板（步骤 6）

### 2 - 初始化

询问用户的 wiki root：

*"我们来设置 `wiki-config.md`。我需要你的 wiki root 的绝对路径 - 也就是你的笔记所在文件夹。*

*Wiki root 不是你的机器根目录（`C:\`、`/`）或用户主目录（`C:\Users\you\`、`~/`）。它是你的笔记和 wiki 系统文件所在的具体文件夹。它必须位于你的文件系统工具范围内。*

*示例：`C:\Users\you\Notes\`、`/Users/you/Documents/Wiki/`、`/home/you/vault/`"*

对返回的路径做合理性检查：
- 拒绝裸磁盘根目录（`C:\`、`D:\`、`/`）
- 拒绝 OS 根目录和用户主目录（`/home/`、`/Users/`、`C:\Users\`）
- 确认路径存在且可写

如果路径未通过检查，说明具体原因并再次询问。

部署脚手架：
1. 将 `assets/wiki-config-template.md` 复制到 `<wiki_root>/wiki-config.md`
2. 如果模板中尚不存在，则将 `templates_folder: templates/` 写入 `<wiki_root>/wiki-config.md`
3. 将 `assets/wiki-schema.md` 复制到 `<wiki_root>/wiki-schema.md`
4. 将 `assets/wiki-help.md` 复制到 `<wiki_root>/wiki-help.md`（如果缺失；绝不覆盖现有副本）
5. 如果 `<wiki_root>/index.md` 缺失，则从 `assets/templates/index.md` 创建它，并替换 `{{TITLE}}` = "index"、`{{DATE}}` = 今天、`{{DESCRIPTION}}` = "所有 wiki 页面的目录。"
6. 如果 `<wiki_root>/log.md` 缺失，则从 `assets/templates/log.md` 创建它，并替换 `{{TITLE}}` = "log"、`{{DATE}}` = 今天、`{{DESCRIPTION}}` = "所有 wiki skill 操作的仅前置追加审计轨迹。"
7. 如果 `<wiki_root>/Home.md` 缺失，则从 `assets/templates/home.md` 创建它，并替换 `{{TITLE}}` = "Home"、`{{DATE}}` = 今天、`{{DESCRIPTION}}` = "导航中心。Skill 工作流、关键页面和你的领域链接。"
8. 如果 `<wiki_root>/Overview.md` 缺失，则从 `assets/templates/overview.md` 创建它，并替换 `{{TITLE}}` = "Overview"、`{{DATE}}` = 今天、`{{DESCRIPTION}}` = "跨所有领域的当前知识动态综合。Vault 级 crystallize 目标。"
9. 创建 `<wiki_root>/raw/`（ingest 队列）
10. 创建 `<wiki_root>/ingested/` 和 `ingested_subdirs` 中的每个子目录，以及 `<wiki_root>/ingested/assets/`（始终创建）
11. 创建 `<wiki_root>/templates/`，并把 `assets/templates/` 中全部 13 个模板文件复制进去
12. 将 `assets/templates/README.md` 复制到 `<wiki_root>/templates/README.md`
13. 在 log.md 的标题行下方、所有现有条目上方，前置追加一条 init 记录

向用户报告：列出已创建的内容，明确命名 `wiki-config.md`、`wiki-schema.md`、`wiki-help.md`、`Home.md`、`Overview.md` 和 templates 文件夹（13 个模板文件）。建议下一步：打开 `Home.md` 获取导向，将文件放入 `raw/` 并运行 `/wiki-ingest` 开始构建知识。

### 3 - 验证

读取配置并检查：
- YAML 解析无错误
- 所有必填字段都存在：`blacklist`、`index_excludes`、`ingested_folder`、`ingested_subdirs`、`log_format`
- `blacklist` 和 `index_excludes` 中的路径是相对字符串（无绝对路径、无协议）
- `ingested_folder` 出现在 `index_excludes` 中，且不在 `blacklist` 中
- Wiki root（包含配置的目录）通过步骤 2 的合理性检查
- `blacklist` 值是真实文件夹名，而不是模板占位符（如果捆绑模板中的占位符仍然存在，则标记）

报告发现。对每个问题提出修复方案，并在应用前询问。

### 4 - 重新配置

如果用户想更改值：
- 显示当前值
- 提示输入新值，并说明该字段的作用
- 写入前确认
- 写回 `wiki-config.md`，保留注释和结构

绝不静默覆盖。重新配置始终是显式确认的操作。

### 5 - Schema 管理

Schema 管理允许用户查看、编辑、重置或修复 `wiki-schema.md`。

**在做其他任何事情之前，先读取此 skill 自身 assets 文件夹中的 `assets/wiki-schema.md`。** 该捆绑文件是默认 schema - 六个 wiki skills 之间最小一致的字段和枚举集合。你需要在上下文中掌握它，才能知道重置/修复操作中的“默认”意味着什么，并准确描述安全编辑与风险编辑。

然后读取已部署的 `<wiki_root>/wiki-schema.md`。

**比较并展示：**

如果已部署 schema 可正常解析 → "这是你当前的 schema：" 展示 frontmatter YAML。提供：
- **保持原样** → 返回主菜单
- **重置为捆绑默认值** → 明确确认后用捆绑模板覆盖
- **编辑字段或枚举** → 交互式修改（见下文）

如果已部署 schema 格式错误（YAML 解析错误、缺少关键部分）→ "你的 `wiki-schema.md` 格式错误：[具体错误]。我可以将其重置为捆绑默认值，或者你可以手动编辑。你更希望怎么做？"

如果已部署 schema 缺失 → 按理已在步骤 0 分支处理，不应到达这里，但如果发生：确认后从捆绑模板部署。

**编辑 schema 字段：**

当用户想修改 schema 时，在接受更改前展示此警告：

> *"捆绑 schema 定义了最小一致集合。移除 mandatory fields、重命名字段、移除现有页面使用的 enum values，或更改字段类型，可能导致 skill 行为异常（写入失败、页面无效、lint 误报）。添加新的 conditional fields 或扩展 enum value lists 通常是安全的。"*

然后询问他们想更改什么：mandatory field、conditional field，还是 enum list。

对于每项更改：
- 显示当前值
- 接受新值
- 验证：mandatory_fields 仍必须包含 title、version、date、changes、page_type
- 验证：所有三个 enums 至少仍必须保留其默认值，除非用户明确确认移除
- 写入前确认
- 写回 `wiki-schema.md`，保留注释和结构

**重置 / 修复：**

应用户请求，将 `assets/wiki-schema.md` 复制覆盖 `<wiki_root>/wiki-schema.md`。记录该操作。确认："Schema 已重置为捆绑默认值。Skills 将在下次调用时使用它。"

绝不静默覆盖自定义 schema。重置始终是显式确认的操作。

### 6 - 模板管理

模板管理允许用户查看、修复、重置或检查 `<wiki_root>/templates/` 中的页面模板。

首次进入此流程时展示导向说明：

> **页面模板**
>
> 模板为每个 wiki 页面提供一致、结构化的起点。当 skill 创建新页面时，它会从你的 `templates/` folder 读取匹配的模板，并将其用作脚手架 - 把 `{{TITLE}}` 和 `{{DATE}}` 等占位符替换为真实值。
>
> 你的模板由你编辑。任何改动会立即影响新页面；现有页面永远不会被修改。如果某个模板文件缺失，skill 会回退到最小硬编码结构。
>
> 默认集合覆盖全部 13 个默认模板（12 种页面类型加上特殊的顶层 Home 导航中心）：knowledge、reference、survey、domain-home、overview、home、log、index、longform、profile、established-patterns、note 和 config。

**评估当前状态：**

列出 `<wiki_root>/templates/` 中的文件。识别 13 个预期文件中哪些存在、哪些缺失。

展示状态：

> **Templates folder: [13 个默认模板中存在 X 个]**
>
> Present: knowledge.md, survey.md, ... [列表]
> Missing: reference.md, ... [列表，如有]

**提供操作：**

- **查看模板** - 读取并显示任意命名模板文件的内容；说明用户可以直接在自己的笔记应用中编辑它
- **部署缺失默认模板** - 将任何缺失文件从 `assets/templates/` 复制到 `<wiki_root>/templates/`；绝不覆盖已存在文件
- **重置指定模板** - 用捆绑默认值覆盖指定模板；继续前先警告
- **重置所有模板** - 用捆绑默认值覆盖全部 13 个模板；继续前先警告
- **查看 README** - 显示 `<wiki_root>/templates/README.md`

**重置保护** - 在任何重置前展示：

> *"重置模板会用捆绑默认值替换你的编辑。你现有的 wiki 页面不受影响 - 只有未来页面会使用新结构。此操作无法在此 skill 内撤销。"*

单个重置时逐文件确认；完整重置前确认一次（列出全部 13 个文件）。

任何操作后，询问是继续执行另一个模板操作，还是返回主菜单。

---

## 关键规则

1. **此 skill 完全负责设置 UX。** 五个操作型 skills 都会在配置缺失时拒绝继续，并指向这里（或当此 skill 未安装时，指向捆绑的 `references/setup-help.md` 供手动设置）。只有此 skill 创建脚手架、验证配置并处理重新配置。只有此 skill 宣传 "set up wiki config" 触发器。
2. **没有明确确认，绝不覆盖实时配置。** 重新配置是逐字段对话。
3. **Wiki root 是包含 wiki-config.md 的目录。** 配置中没有 wiki_root 字段。移动 wiki 就意味着移动此文件。
4. **绝不部署到裸磁盘根目录、OS 根目录或用户主目录。** 这些几乎总是用户错误。
5. **捆绑 assets 是唯一事实来源。** 此 skill 捆绑 `assets/wiki-config-template.md`、`assets/wiki-schema.md`、`assets/wiki-help.md` 和 `assets/templates/`（13 个模板文件 + README）。初始化期间会全部部署。五个操作型 skills 在各自的 `references/` 文件夹中捆绑相同的只读 `wiki-config-template.md` 和 `wiki-schema.md` 副本。当这里的任何共享文件发生变化时，操作型副本必须同步更新。`references/setup-help.md` 也应在操作型 skills 之间保持同步。
6. **wiki-config 是推荐的设置、编辑和修复路径。** 只有 wiki-config 具备引导式 schema 编辑器和修复流程。操作型 skills 可以在 wiki-config 不可用或用户更愿意继续时，从其 `references/` 文件夹部署捆绑默认值作为后备，但在 wiki-config 可用时必须先推荐 `/wiki-config`。绝不静默覆盖格式错误的 schema - 这种情况始终需要用户明确决策并提供覆盖警告。

---

## 此 skill 不做什么

- 不执行任何 wiki 操作（ingest、lint、integrate、crystallize、query）。这些由五个操作型 skills 负责。
- 不管理 TaskNotes config、plugin settings 或任何非 wiki 配置。
- 不越出 wiki root，也不修改文件系统工具的访问范围。
- 不直接编辑模板内容 - 它只部署、修复和重置模板；用户在自己的笔记应用中编辑它们。
