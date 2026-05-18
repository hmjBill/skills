---
name: wiki-lint
description: "健康检查 wiki：扫描所有页面的损坏 wiki 链接、孤立页面、过时索引条目、缺失连接、破折号违规、孤立资源和架构错误。生成带日期的 lint 报告。当用户说 /wiki-lint、提到损坏链接、孤立页面、"我的 wiki 有什么问题"、"链接是否正常"时使用。仅报告，从不自动修复。需要文件系统读权限和对 archive/ 的写权限。"
metadata:
  version: "3.12"
---

# Wiki 检查

健康检查 wiki 并生成报告。从不修改 wiki 内容。

---

## 配置发现

**每次调用从这里开始。** Wiki 根目录是包含 `wiki-config.md` 的目录。各 skill 在运行时推导它。本 skill 检查的页面对照 `wiki-schema.md` 中的结构进行验证 — 这两个文件都必须存在。

1. **识别范围**：确定你的文件系统范围根目录 — 你的文件系统工具能访问的顶级目录。

2. **范围检查 — 强制停止**：如果范围是裸盘根目录（`C:\`、`D:\`、`/`）、操作系统根目录或用户主目录（`C:\Users\X`、`/home/X`、`/Users/X`）→ **立即停止。不要搜索。不要尝试定位 wiki-config.md。** 直接跳到第 6 步。

3. **扫描 `<available_skills>` 查找 `wiki-config`。** 记录它是否可用 — 这影响下面的建议。捆绑的 `references/setup-help.md` 也可用；如果用户需要了解背景或你遇到困难，可以阅读它。

4. **定位并读取 `wiki-config.md`**：递归搜索（首次匹配，最多 5 层）。如果找到，读取它（`blacklist`、`index_excludes`、`ingested_folder`、`ingested_subdirs`、`log_format`）。如果未找到，跳到第 6 步。

5. **定位并读取 `wiki-schema.md` — 强制检查**：在 `wiki-config.md` 所在目录中，验证 `wiki-schema.md` 存在且可正确解析为 YAML。**在得到明确结论（存在 / 缺失 / 格式错误）之前不要继续下面的工作流。** 然后：

   - **存在且解析正常** → 读取 schema（`mandatory_fields`、`conditional_fields`、`enums`）并继续工作流。

   - **缺失** → 停止。不要继续。不要部署。响应取决于 `wiki-config` 是否在 `<available_skills>` 中（来自第 3 步）：

     - **wiki-config 可用：** 输出以下模式 — *"你的 wiki 缺少 `wiki-schema.md`。运行 `/wiki-config` 来部署它并完成设置。我会等你完成后再继续。"* 本轮结束。不要提供捆绑部署；不要提供替代方案。当 wiki-config 可用时，wiki-config 的引导流程是正确的路径。

     - **wiki-config 不可用：** 提供捆绑回退方案 — *"你的 wiki 缺少 `wiki-schema.md`，且 wiki-config skill 未安装。我可以从我捆绑的参考文件中部署默认版本，但我建议安装 wiki-config 以进行引导设置。要部署捆绑的默认版本吗？"* 等待明确确认。确认后，从 `references/wiki-schema.md` 部署。

   - **格式错误** → 停止。相同结构：

     - **wiki-config 可用：** *"你的 `wiki-schema.md` 格式错误。运行 `/wiki-config` — 它有引导修复流程，可以保留你做的任何自定义。我会等待。"* 本轮结束。不要尝试修复或捆绑覆盖。

     - **wiki-config 不可用：** 指向 `references/setup-help.md` 获取手动修复指导。如果用户明确指示重置（非自动回退），警告这会覆盖任何自定义，然后在明确确认后部署默认版本。

   如果第 4 步中发现 `wiki-config.md` 本身格式错误，同样适用以上双分支结构：wiki-config 可用 → 停止并推荐 `/wiki-config`，本轮结束；不可用 → 通过 setup-help.md 引导手动修复。

6. **完全找不到配置**：询问用户的 wiki 根目录路径，在那里搜索（限定，最多 5 层）。如果仍然没有，用户还没有 wiki — 按照上面的"缺失"分支处理（推荐 `/wiki-config`；如果不可用则提供捆绑部署）。

---

## 能力要求

本 skill 需要**文件系统读权限**（扫描所有页面）和**对 `archive/` 的写权限**（写入 lint 报告）。如果读权限不可用，本 skill 无法继续。---

## 工作流

配置发现已将 `wiki-config.md` 和 `wiki-schema.md` 加载到上下文中。不要重新读取它们；从这里继续，假设两者都可用。

### 步骤 1 - 构建页面清单

递归列出知识库中的所有 `.md` 文件。完全排除 `blacklist` 中的路径；不扫描其内部内容。`index_excludes` 中的路径（`raw\`、`archive\`、`ingested\`）被排除不被视为 wiki 页面，但仍然可读以进行链接目标验证：如果活跃的 wiki 页面链接到 `archive/` 或 `ingested/` 中的文件，该链接必须解析为真实文件。从同时不在 blacklist 和 index_excludes 中的文件构建**范围内页面集**。同时将黑名单路径、raw\、archive\ 和 ingested\ 之外的所有非 Markdown 文件列为潜在的孤立二进制资源。

### 步骤 2 - 读取 index.md

读取 `index.md`。解析所有 wikilink 引用和文件路径。构建 index.md 中列出的页面及其引用路径的集合。

### 步骤 3 - 检查损坏的 wikilink

对每个范围内的 wiki 页面，提取所有 `[[wikilinks]]`。尝试将每个链接解析为实际文件。如果未找到匹配文件：标记为**损坏的 wikilink**，附带所在页面、损坏的链接文本和（如果明显）建议的更正。

同时标记：任何包含指向 `raw/` 链接的 wiki 页面。一旦 wiki-ingest 将文件移动到 `ingested/`，raw/ 源链接将损坏。将这些标记为**未来损坏警告**："[[页面]]链接到 raw/<文件名>：摄入后将损坏。在摄入完成后更新为 ingested/<子目录>/<文件名>。" 这些尚未损坏但注定会损坏。

### 步骤 4 - 检查孤立页面

对范围内集中的每个页面检查：
- 它是否列在 `index.md` 中？
- 它是否被任何其他范围内页面中的 wikilink 引用？

如果两者都不满足：标记为**孤立页面**。新页面可能是合法的孤立页面；仍然标记，由人类决定。

### 步骤 5 - 检查过时索引条目

对 `index.md` 中列出的每个页面，检查引用的文件是否存在。如果不存在：标记为**过时索引条目**。

### 步骤 6 - 定性和结构化检查

**概念性问题：** 读取 `Overview.md` 并扫描明显的矛盾或过时内容；看起来与特定 wiki 页面矛盾的主张，或似乎显著过时的页面。仅定性检查，不是完整的内容审查。

**缺失连接：** 扫描 `index.md` 的描述，查找未互相链接的页面对之间显著的术语重叠。在索引描述中共享多个关键概念但没有互相 wikilink 的页面是缺失连接的候选。标记有有意义重叠的页面对；不标记微弱的巧合关键词。这是轻量级的启发式检查；如果用户同意连接是真实的，则由 wiki-integrate 处理实际链接。

### 步骤 6b - 检查页面标题和文件名中的破折号

页面文件名和 `title:` frontmatter 字段中的破折号（`—`）是 LLM 输出的持久痕迹。它们会破坏 wikilink（指向 `[[主题 - 子主题]]` 的链接无法解析名为 `主题 — 子主题.md` 的文件），使页面无法按预期名称搜索，并违反知识库的破折号约定。

对每个范围内页面：
1. 检查文件名中是否有 `—` 字符
2. 读取 `title:` frontmatter 字段并检查是否有 `—` 字符

将每个出现标记为**破折号违规**，附上文件路径、发现位置（文件名 / title 字段）、违规字符串和建议修复：将 `—` 替换为 ` - `（空格-连字符-空格）。

### 步骤 6c - 检查过时页面

对每个范围内页面检查以下条件：

**缺失日期字段（错误）：** 如果页面的 frontmatter 中既没有 `date:` 也没有 `updated:`，标记为**缺失日期字段错误**。两个字段都缺失表明创建时出了问题 — 页面不是由 skill 写入的，或 frontmatter 格式错误。

**过时（软警告）：** 如果页面有 `updated:` 字段且距今超过 90 天，标记为**过时页面**。此检查豁免：
- `status: artefact`、`status: snapshot`、`status: archived` — 定义为冻结状态
- `page_type: reference` — 参考页面内容大多静态，不频繁更新符合预期

没有 `updated:` 字段（但有 `date:`）的页面静默跳过 — 缺少 `updated:` 不是错误。

标记每个过时页面：路径、`updated:` 日期、距上次接触的天数。
标记每个缺失日期字段错误：路径、缺失哪些字段。

### 步骤 6d - 架构合规检查（来源字段）

对每个范围内页面验证四个来源字段（`status:`、`description:`、`source:`、`reliability:`）。两类发现：

**错误（硬标记）：**

- **有 `source:` 但无 `reliability:`** — `source:` 存在但 `reliability:` 不存在。这些字段是耦合的；一个有而另一个无是内部不一致。标记为**架构错误**，附上：路径、受影响的字段对。
- **无效的 `status:` 值** — `status:` 存在但其值不在有效枚举值中（`active`、`stub`、`artefact`、`archived`、`snapshot`）。标记为**架构错误**，附上：路径、字段、找到的无效值、有效值。
- **无效的 `reliability:` 值** — `reliability:` 存在但其值不在（`high`、`medium`、`low`）中。标记为**架构错误**，附上：路径、字段、找到的无效值、有效值。
- **无效的 `page_type:` 值** — `page_type:` 存在但其值不在 wiki-schema.md 的有效枚举列表中。标记为**架构错误**，附上：路径、字段、找到的无效值和 schema 中的有效值。

**软警告（信息性）：**

- **Skill 接触过的页面缺少 `status:` 或 `description:`** — 页面有 `updated:`（意味着 skill 在 3b 之后写入过）且 `page_type:` 是 `knowledge`、`research-note` 或 `survey`，但 `status:` 或 `description:` 缺失。没有 `updated:` 的旧页面静默跳过 — 它们早于 3b，将在下次接触时获取字段。标记为**缺失来源字段**，附上：路径、缺失哪些字段。
- **有 `source:` 但没有 `## Sources` 章节** — frontmatter 中的 `source:` 意味着摄入来源；正文应有 `## Sources` 章节用于充实跟踪。缺失不是硬错误但值得标记。标记为**缺失 Sources 章节**，附上：路径。
- **Skill 接触过的页面缺少 `page_type:`** — 页面有 `updated:`（意味着 skill 已写入）但 `page_type:` 缺失。没有 `updated:` 的页面静默跳过 — 它们早于该特性，将在下次接触时获取字段。标记为**缺失 page_type**，附上：路径。

### 步骤 7 - 检查孤立的二进制资源

对黑名单路径、raw\、archive\ 和 ingested\ 之外的每个非 Markdown 文件：在所有范围内页面中搜索对该文件名的任何引用。如果未找到：标记为**孤立的二进制资源**。在与相关内容上下文中放置的文件（例如领域子文件夹中被领域页面引用的 PDF）不是孤立资源；仅标记在任何地方都没有 wiki 引用的文件。

### 步骤 7a - 检查 ingested/ 中的孤立来源

`ingested/` 中的每个文件应至少有一个引用它的 wiki 页面；通过页面正文中包含 `ingested/` 路径的 Sources 章节。没有 wiki 引用的来源已被处理但在知识图谱中未留下痕迹。

对 `ingested/` 中的每个文件（所有子目录，包括 assets/）：
1. 在所有范围内 wiki 页面中搜索该文件的相对路径（如 `ingested/documentation/foo.md`）。检查完整页面内容：`## Sources` 章节正文、`changes:` frontmatter 字段或路径引用可能出现的任何其他地方。无论出现在哪里，任何匹配都视为有效引用。
2. 如果未找到匹配：标记为**孤立的来源**："ingested/[子目录]/文件名 没有引用它的 wiki 页面"

`ingested/assets/` 中没有引用的来源是预期的（在摄入时不可读）；以较低严重性标记为**注记**而非警告，以便用户知道它存在，并在能力提升时可以重新尝试摄入。

### 步骤 8 - 写入 lint 报告

创建 `[wiki-root]/archive/lint-YYYY-MM-DD.md`：

```markdown
---
title: Lint 报告 YYYY-MM-DD
date: YYYY-MM-DD
---

# Lint 报告 - YYYY-MM-DD

## 摘要
- 损坏 wikilink：N
- 未来损坏警告（raw/ 链接）：N
- 孤立页面：N
- 过时索引条目：N
- 缺失连接（候选）：N
- 破折号违规（标题/文件名）：N
- 缺失日期字段（错误）：N
- 过时页面（updated: > 90 天）：N
- 架构错误（无效枚举值、缺失字段对）：N
- 缺失来源字段（skill 接触过的页面）：N
- 缺失 page_type（skill 接触过的页面）：N
- 缺失 Sources 章节：N
- 孤立二进制资源：N
- ingested/ 中的孤立来源：N（+ N 条 assets/ 中的注记）
- 概念性标记：N

## 损坏 Wikilink
[发现位置页面、损坏的链接、建议修复]

## 未来损坏警告
[发现位置页面、raw/ 链接、建议摄入后目标]

## 孤立页面
[页面路径、可能孤立的原因]

## 过时索引条目
[索引条目、不再解析的路径]

## 缺失连接
[页面对、重叠术语、建议操作：运行 wiki-integrate]

## 破折号违规
[文件路径、发现位置（文件名 / 标题字段）、建议修复：将 — 替换为 ' - ']

## 缺失日期字段
[文件路径、date: / updated: 中哪些缺失；可能表明 frontmatter 格式错误或非 skill 创建]

## 过时页面
[文件路径、updated: 日期、距上次接触的天数；status: artefact/snapshot/archived 或 page_type: reference 未标记]

## 架构错误
[文件路径、受影响的字段、错误性质（无效枚举值 / 有 source: 无 reliability: / 无效 page_type: 值）]

## 缺失来源字段
[文件路径、status: / description: 中哪些缺失；页面有 updated: 且是事实性 page_type]

## 缺失 page_type:
[文件路径、页面有 updated: 但 page_type: 缺失；使用 wiki-schema.md 中的值添加 page_type:，或运行 wiki-integrate 推断并确认]

## 缺失 Sources 章节
[文件路径、frontmatter 中有 source: 但正文中没有 ## Sources 章节]

## 孤立二进制资源
[文件路径、没有 wiki 引用的原因]

## ingested/ 中的孤立来源
[文件路径、没有 wiki 页面引用此来源；考虑重新摄入或归档]

## 注记：ingested/assets/
[文件路径、在摄入时不可读；如果能力提升可重新尝试]

## 概念性标记
[页面、潜在问题性质]
```

### 步骤 9 - 追加到 log.md

在 log.md 顶部、标题行之下、所有现有条目之上添加新条目。

```
## [YYYY-MM-DD] lint | 全 wiki 检查
摘要：N 个损坏链接、N 个孤立页面、N 个过时条目、N 个缺失连接、N 个日期字段错误、N 个过时页面、N 个架构错误、N 个缺失来源/page_type 字段、N 个孤立资源。
报告：archive/lint-YYYY-MM-DD.md
```

### 步骤 10 - 呈现发现

报告摘要。不要提供自动修复任何内容。建议后续操作：
- 损坏 wikilink → 手动修复或在受影响页面上运行 wiki-integrate
- 未来损坏警告 → 在下次摄入运行后将 raw/ 链接更新为 ingested/ 路径
- 孤立页面 → 运行 wiki-integrate，或如果已弃用则移到 archive/
- 过时索引条目 → 从 index.md 中删除或更新路径
- 缺失连接 → 在标记的页面对上运行 wiki-integrate
- 破折号违规 → 重命名文件（将 `—` 替换为 ` - `）并更新其 `title:` 字段；搜索指向旧名称的 wikilink 并更新它们
- 缺失日期字段 → 检查页面；如果由 skill 写入，frontmatter 格式错误，应手动修复
- 过时页面 → 审查和更新；或如果页面有意冻结，设置为 `status: artefact`、`snapshot` 或 `archived`
- 架构错误 → 手动修复 frontmatter：当 `source:` 存在时添加缺失的 `reliability:`，修正 `status:`、`reliability:` 或 `page_type:` 的无效枚举值
- 缺失来源字段 → 在页面上重新运行 wiki-ingest 或 wiki-crystallize 以获取 `status:` 和 `description:`；或按 schema 手动添加
- 缺失 page_type: → 使用 wiki-schema.md 枚举中的值向页面 frontmatter 添加 `page_type:`；或运行 wiki-integrate 将推断并确认类型
- 缺失 Sources 章节 → 在页面正文中添加引用 `source:` 中路径的 `## Sources` 章节
- 孤立二进制资源 → 移到适当位置或如果不需要则删除
- ingested/ 中的孤立来源 → 重新摄入源文件（放回 raw/ 并运行 wiki-ingest），或调查为何未创建 wiki 页面
- ingested/assets/ 中的注记 → 如果有新工具或能力可用，重新尝试摄入

---

## 关键规则

1. **绝不修改 wiki 页面** — 除了将 lint 报告写入 archive/ 外只读
2. **绝不删除文件** — 只标记；由人类决定
3. **不标记上下文放置的文件** — 在其领域内有 wiki 引用的文件不是孤立资源
4. **黑名单路径被完全跳过** — lint 不扫描黑名单目录内的内容
5. **index_excludes 不是 wiki 页面但是有效的链接目标** — archive/ 和 ingested/ 即使被排除在页面清单外，也可读取以进行链接解析
6. **报告存放到 archive/ 中，而非 wiki 根目录**

---

## 本 skill 不做什么

本 skill 做 wiki 工作：摄入、合成、组织和查询 `.md` 页面以随时间积累知识。它不修改工具或插件设置，不通过 shell 操纵应用程序状态，也不复制属于用户阅读笔记的应用程序的行为。如果请求无法通过读写 wiki 根目录内的 `.md` 文件来满足，则拒绝并说明原因。

---

## 云同步知识库

存储在云同步服务中的知识库可能有未本地下载的文件，呈现为零字节占位符。如果文件读取意外返回空，将其标记为可能的同步问题，并在重试前请用户确认。不要将零字节文件视为成功处理的空文件。
