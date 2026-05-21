---
name: scholar-skill
description: 学术论文深度阅读和知识内化系统，支持 L1-L3 分级阅读、记忆抽取和 Obsidian 知识库沉淀。
---

# 学术论文深度阅读和知识内化系统

## 首次使用必读：配置引导

在开始阅读论文之前，需要完成以下配置。本技能支持三种配置模式：

### 配置模式

#### 模式 1: 全自动配置（推荐新手）
```bash
# 先选择中文包，再明确指定目标 Obsidian vault
python ~/.openclaw/workspace-scholar/skills/scholar-skill/zh-CN/scripts/configure.py auto --vault-path "/你的/Obsidian/Vault"
```
**适合**: 第一次使用，Obsidian 已安装
**自动完成**:
- ✓ 检测 Obsidian 仓库位置
- ✓ 创建目录结构（1-Papers, 2-Knowledge, 3-MOCs, memory 等）
- ✓ 生成配置文件
- ✓ 检查依赖技能

**注意**: 推荐始终传入 `--vault-path`，这样不会误选到别的 vault，也能确保只同步中文模板。

---

#### 模式 2: 半自动配置（推荐）
```bash
# 运行中文包配置脚本，并明确指定目标 vault
python ~/.openclaw/workspace-scholar/skills/scholar-skill/zh-CN/scripts/configure.py semi --vault-path "/你的/Obsidian/Vault"
```
**适合**: 希望手动确认每一步的用户
**流程**:
1. 自动检测 Obsidian 仓库（找不到会提示手动输入）
2. 询问是否创建目录结构
3. 检查依赖技能，询问是否安装
4. 生成配置文件

---

#### 模式 3: 手动配置（高级用户）
```bash
# 运行中文包配置脚本，并明确指定目标 vault
python ~/.openclaw/workspace-scholar/skills/scholar-skill/zh-CN/scripts/configure.py manual --vault-path "/你的/Obsidian/Vault"
```
**适合**: 清楚自己需要什么的高级用户
**流程**:
1. 手动输入 Obsidian 仓库路径
2. 跳过目录创建（稍后手动）
3. 仅检查依赖，不自动安装
4. 生成配置文件

---

### 依赖技能

本技能需要以下依赖技能（配置脚本会自动检查）：

#### 核心依赖（必需）

| 技能 | 用途 | 必需 |
|------|------|------|
| `obsidian-direct` | Obsidian 文件操作 | ⭐⭐⭐ |
| `arxiv-watcher` | ArXiv 论文搜索 | ⭐⭐⭐ |

#### 功能增强（推荐）

| 技能 | 用途 | 必需 |
|------|------|------|
| `academic-research-hub` | 多源学术搜索 | ⭐⭐ |
| `tavily` | 网页内容提取 | ⭐⭐ |
| `pdf` | PDF 文本提取 | ⭐⭐ |
| `obsidian-cli` | Obsidian CLI 工具 | ⭐⭐ |

#### 长任务编排（L3/批量处理必需）

| 技能 | 用途 | 必需 |
|------|------|------|
| `durable-task-runner` | 长任务编排、进度追踪、崩溃恢复 | ⭐⭐⭐ (L3/批量) |

**为什么需要 durable-task-runner？**
- ✅ **L3 精读** (2.5 小时): 需要进度追踪、中断恢复
- ✅ **批量阅读** (10+ 篇): 需要任务编排、步骤重试
- ✅ **周巩固** (60-90 分钟): 需要状态持久化、定期执行
- ✅ **崩溃恢复**: 会话中断后可继续
- ✅ **进度透明**: 实时显示完成进度

---

### 配置文件

配置完成后，配置文件位于：
```
~/.openclaw/workspace-scholar/config/scholar.yml
```
（如该目录不存在，则写入 `~/.openclaw/workspace/config/scholar.yml`）

**关键配置项**:
```yaml
obsidian:
  vault_path: /Users/shengjie/ObsidianVault  # ← 自动检测或手动输入
  
reading:
  default_level: L2  # L1/L2/L3
  
notification:
  feishu_enabled: false  # 是否启用飞书推送
```

---

### 常见问题

**Q: 找不到 Obsidian 仓库怎么办？**
A: 使用半自动或手动模式，手动输入路径。如未安装 Obsidian，先下载安装：https://obsidian.md

**Q: 依赖技能安装失败？**
A: 检查对应 skill 是否已安装到本地 skill 目录，必要时重新安装。

**Q: 可以修改配置吗？**
A: 可以！编辑 `~/.openclaw/workspace-scholar/config/scholar.yml`（或 `~/.openclaw/workspace/config/scholar.yml`）

**Q: 配置错了想重新配置？**
A: 删除配置文件后，用中文包重新运行：`rm ~/.openclaw/workspace-scholar/config/scholar.yml && python ~/.openclaw/workspace-scholar/skills/scholar-skill/zh-CN/scripts/configure.py auto --vault-path "/你的/Obsidian/Vault"`

---

## 触发词

- "阅读论文"
- "精读"
- "L1/L2/L3 阅读"
- "论文笔记"
- "知识内化"
- "配置 ScholarSkill"

---

## 适用场景

- 学术论文阅读（ArXiv/会议/期刊）
- 技术博客深度阅读
- 文献综述整理
- 研究领域调研

---

## 核心能力

### 1. 三级阅读标准

#### L1 快速筛选 (5 分钟)
- 阅读标题、摘要、图表
- 输出：一句话概括 + 优先级评级 (P0/P1/P2)
- 适用：P2 论文筛选

#### L2 标准阅读 (45 分钟)
- 阅读引言、方法、实验、结论
- 输出：3-5KB 笔记 + 5-8 条记忆
- 适用：P1 论文（日常标准）

#### L3 精读 (2.5 小时)
- 完整方法细节、实验分析、补充材料
- 输出：10-15KB 笔记 + 知识升级 + 2-3 条程序规则
- 适用：P0 论文（核心相关）

### 2. 记忆抽取

**Semantic Memory**: 事实、概念、方法、结论
**Episodic Memory**: 疑问、误解、修正过程
**Procedural Memory**: 可复用的阅读规则和研究方法

### 3. 知识管理

- Obsidian 双向链接
- MOC 知识地图
- 原子化记忆存储
- 周巩固机制

### 4. 反思与确认机制

- L1 反思：每篇论文后快速检查理解、疑问和下一步行动
- L2 反思：周度回顾知识增长、缺失链接、研究方向和风险
- L3 反思：月度评估知识演化、方向调整和认知修正
- 人工确认：新 MOC、核心论文、认知冲突、方向调整等关键事项进入 `0-Inbox/`

---

## 工作流程

```
1. 接收论文 (PDF/ArXiv URL/本地文件)
   ↓
2. 优先级评估 (P0/P1/P2)
   ↓
3. 选择阅读级别 (L1/L2/L3)
   ↓
4. 执行阅读 + 笔记生成
   ↓
5. 记忆抽取 (Semantic/Episodic/Procedural)
   ↓
6. 更新 2-Knowledge/（Concept / Insight / Method / Question / Person）
   ↓
7. 知识关联 (双向链接 + MOC 更新)
   ↓
8. 反思 / 确认 / 输出报告
```

---

## 完整配置参考

```yaml
# ~/.openclaw/workspace-scholar/config/scholar.yml 或 ~/.openclaw/workspace/config/scholar.yml
# 注意：配置脚本优先写入 ~/.openclaw/workspace-scholar/config/（如该目录存在）
obsidian:
  inbox_folder: 0-Inbox
  vault_path: /Users/shengjie/ObsidianVault
  paper_notes_folder: 1-Papers
  knowledge_folder: 2-Knowledge
  concepts_folder: 2-Knowledge/Concepts
  insights_folder: 2-Knowledge/Insights
  methods_folder: 2-Knowledge/Methods
  questions_folder: 2-Knowledge/Questions
  people_folder: 2-Knowledge/People
  moc_folder: 3-MOCs
  outputs_folder: 4-Outputs
  reflections_folder: 4-Outputs/Reflections
  confirmation_records_folder: 4-Outputs/Confirmation-Records
  templates_folder: 9-Templates/zh-CN
  memory_folder: memory

reading:
  default_level: L2
  enable_memory_extraction: true
  enable_knowledge_consolidation: true

notification:
  feishu_enabled: false
  feishu_user_id: ou_xxxxxxxxxxxxx
```

配置脚本会把中文模板同步到：

```text
{vault}/9-Templates/zh-CN/
```

---

## 输出物

### 1. 论文笔记
位置：`{vault}/1-Papers/By-Topic/{Topic}/{Year}-{Author}-{Title}.md`

### 2. 语义记忆
位置：`{vault}/memory/semantic/{Topic}.md`

### 3. 程序记忆
位置：`{vault}/memory/procedural/{Topic}.md`

### 4. 情景记忆
位置：`{vault}/memory/episodic/{Date}-{Paper}.md`

### 5. MOC 更新
位置：`{vault}/3-MOCs/MOC-{Topic}.md`

### 6. 概念卡片
位置：`{vault}/2-Knowledge/Concepts/`

### 7. 洞察卡片
位置：`{vault}/2-Knowledge/Insights/`

### 8. 问题卡片
位置：`{vault}/2-Knowledge/Questions/`

### 9. 方法卡片
位置：`{vault}/2-Knowledge/Methods/`

### 10. 人物卡片
位置：`{vault}/2-Knowledge/People/`

### 11. 反思输出
位置：`{vault}/4-Outputs/Reflections/L1|L2|L3/`

### 12. 确认请求
位置：`{vault}/0-Inbox/`

---

## 使用示例

### 示例 1: L2 标准阅读

```
用户：请用 L2 级别阅读这篇论文
附件：paper.pdf

智能体:
1. 评估优先级 → P1
2. 执行 L2 阅读（45 分钟标准）
3. 生成笔记（3-5KB）
4. 抽取 5-8 条记忆
5. 需要时创建 Concept / Insight / Question / Method 卡片
6. 更新知识关联与 MOC
7. 生成 L1 反思
8. 输出报告
```

### 示例 2: L3 精读

```
用户：请以 L3 级别精读 ArXiv:2407.19354

智能体:
1. 获取论文（ArXiv API）
2. 评估优先级 → P0（与核心方向直接相关）
3. 执行 L3 阅读（2.5 小时标准）
4. 生成深度笔记（10-15KB）
5. 知识升级 + 旧知识修订
6. 提炼 2-3 条程序规则
7. 更新 2-Knowledge/ 与 3-MOCs/
8. 若出现冲突/新方向，创建确认请求到 0-Inbox/
9. 生成深度反思并推送详细报告
```

### 示例 3: 批量阅读

```
用户：这 10 篇论文请先 L1 筛选，然后对其中的 P0/P1 论文执行 L2 阅读

智能体:
1. 批量 L1 筛选（5 分钟/篇）
2. 评级分类：P0(2 篇) + P1(5 篇) + P2(3 篇)
3. 对 P0 论文执行 L3 阅读
4. 对 P1 论文执行 L2 阅读
5. P2 论文仅存档
6. 周末执行 L2 反思并整理概念 / MOC
7. 输出汇总报告
```

---

## 质量检查清单

### L2 检查
- [ ] 标准笔记完整（3-5KB）
- [ ] Semantic Memories 3-5 条
- [ ] Episodic Memories 1-2 条
- [ ] Procedural Memories 1 条候选
- [ ] 每条记忆有 action 字段
- [ ] 给出与旧知识的连接关系

### L3 检查
- [ ] L2 全部要求满足
- [ ] 完成常驻/检索记忆划分
- [ ] 至少修订或评估 1 组旧知识
- [ ] 至少提炼 2-3 条程序规则
- [ ] 标记冲突、时间演化或废弃知识
- [ ] 回答"这篇论文如何改变我的知识结构"

### 2-Knowledge 更新检查
- [ ] 是否需要创建 Concept 卡片
- [ ] 是否需要创建 Insight 卡片
- [ ] 是否需要创建 Question 卡片
- [ ] 是否需要更新 Method / Person 卡片
- [ ] 是否需要把新知识挂到既有 MOC

### 反思与确认检查
- [ ] 单篇阅读后是否生成 L1 反思
- [ ] 周期性任务是否进入 L2 / L3 反思
- [ ] 是否触发人工确认请求

---

## 依赖技能

- `arxiv-watcher`: ArXiv 论文搜索
- `academic-research-hub`: 多源学术搜索
- `obsidian-direct`: Obsidian 文件操作
- `tavily`: 网页内容提取
- `pdf`: PDF 文本提取
- `obsidian-cli`: Obsidian CLI 工具

---

## 错误处理

### 常见错误

1. **论文无法获取**
   - 处理：跳过并记录原因，不创建推断性笔记

2. **Obsidian 路径不存在**
   - 处理：自动创建目录结构

3. **记忆抽取失败**
   - 处理：降级到 L1 输出，记录错误日志

4. **知识冲突检测**
   - 处理：标记为 `contradict`，等待周巩固时裁决

---

## 相关文档

- [READING-STRATEGY-v2.1.md](protocols/READING-STRATEGY-v2.1.md) - 完整阅读策略
- [CHECKLIST-Paper-Reading.md](protocols/CHECKLIST-Paper-Reading.md) - 启动检查清单
- [Template-Reflection-L1.md](templates/Template-Reflection-L1.md) - 单篇论文反思
- [Template-Reflection-L2.md](templates/Template-Reflection-L2.md) - 周度反思
- [Template-Reflection-L3.md](templates/Template-Reflection-L3.md) - 月度反思
- [Template-Confirmation-Request.md](templates/Template-Confirmation-Request.md) - 人工确认请求
- [Procedure-人工确认流程.md](templates/Procedure-人工确认流程.md) - 确认流程
