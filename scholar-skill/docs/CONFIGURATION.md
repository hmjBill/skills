# ScholarSkill 配置指南

**版本**: v1.0.0  
**最后更新**: 2026-03-18

---

## 🎯 配置流程总览

在开始前，先决定你要安装 `zh-CN/` 还是 `en/` 版本。每个语言包都有自己的 `configure.py`，并且会把模板同步到对应语言的模板子目录。

```
1. 运行配置脚本（auto/semi/manual）
   ↓
2. 指定或检测 Obsidian 仓库
   ↓
3. 创建目录结构
   ↓
4. 同步模板到语言专属模板目录
   ↓
5. 检查依赖技能
   ↓
6. 生成配置文件
   ↓
7. 开始使用！
```

---

## 📋 配置模式详解

### 模式 1: 全自动配置（auto）

**适用场景**:
- ✅ 第一次使用 ScholarSkill
- ✅ Obsidian 已安装在常见位置
- ✅ 不想手动配置任何内容

**运行命令**:
```bash
cd ~/.openclaw/workspace-scholar/skills/scholar-skill
python zh-CN/scripts/configure.py auto --vault-path "/你的/Obsidian/Vault"
```

**自动完成**:
1. 使用你指定的 Obsidian 仓库路径（未传入时才扫描常见路径）
2. 自动创建目录结构（0-Inbox, 1-Papers, 2-Knowledge, 3-MOCs, 4-Outputs, 9-Templates, memory）
3. 自动同步中文模板到 `9-Templates/zh-CN/`
4. 自动检查依赖技能
5. 自动生成配置文件

**检测路径**:
- `~/ObsidianVault`
- `~/Documents/ObsidianVault`
- `~/obsidian-vault`
- `~/knowledge-base`
- `~/second-brain`
- 以及这些目录的子目录

**如未传入 `--vault-path` 且检测失败**:
```
✗ 未自动检测到 Obsidian 仓库
ℹ 全自动模式需要 Obsidian 仓库已存在
ℹ 请使用半自动或手动模式：python zh-CN/scripts/configure.py semi --vault-path "/你的/Obsidian/Vault"
```

此时改用半自动模式即可。

---

### 模式 2: 半自动配置（semi）⭐ 推荐

**适用场景**:
- ✅ 希望确认每一步操作
- ✅ Obsidian 安装在非标准位置
- ✅ 想自定义部分配置

**运行命令**:
```bash
python zh-CN/scripts/configure.py semi --vault-path "/你的/Obsidian/Vault"
```

**交互流程**:

```
=============================================================
              ScholarSkill 配置向导              
=============================================================

ℹ 配置模式：semi
ℹ 正在检测 Obsidian 仓库...
⚠ 未自动检测到 Obsidian 仓库
请输入 Obsidian 仓库路径：/Users/username/my-vault

ℹ 路径验证：/Users/username/my-vault 存在
是否创建 Obsidian 目录结构？(y/n): y

ℹ 正在创建目录...
✓   创建目录：1-Papers/By-Topic
✓   创建目录：2-Knowledge/Concepts
...

ℹ 正在检查依赖技能...
✓   arxiv-watcher 已安装
⚠   academic-research-hub 未安装

是否现在安装 academic-research-hub? (y/n): y
ℹ   安装 academic-research-hub...
⚠   请确认本地 skills 目录中已提供 academic-research-hub；本仓库未包含该依赖

✓ 配置文件已生成：~/.openclaw/workspace-scholar/config/scholar.yml
✓ 模板已同步：9-Templates/zh-CN/
```

---

### 模式 3: 手动配置（manual）

**适用场景**:
- ✅ 高级用户
- ✅ 清楚自己需要什么
- ✅ 想完全控制配置过程

**运行命令**:
```bash
python zh-CN/scripts/configure.py manual --vault-path "/你的/Obsidian/Vault"
```

**流程**:
1. 手动输入 Obsidian 路径（不自动检测）
2. 跳过目录创建（稍后手动）
3. 仅检查依赖，不提示安装
4. 生成最简配置文件

---

## 📁 配置文件说明

配置完成后，文件位于：
```
~/.openclaw/workspace-scholar/config/scholar.yml
```
（如该目录不存在，则写入 `~/.openclaw/workspace/config/scholar.yml`）

### 关键配置项

#### 1. Obsidian 路径（必填）
```yaml
obsidian:
  vault_path: /Users/your-username/ObsidianVault  # ← 必须修改
```

**推荐做法**:
首次运行时直接传入 `--vault-path`，避免脚本误选到其他 vault。

**如何找到你的 Obsidian 路径**:
1. 打开 Obsidian
2. 点击左下角 "Open another vault"
3. 右键当前仓库 → "Copy path"
4. 粘贴到配置文件中

#### 2. 阅读级别（可选）
```yaml
reading:
  default_level: L2  # L1(快速) / L2(标准) / L3(精读)
```

#### 3. 通知推送（可选）
```yaml
notification:
  feishu_enabled: false  # 是否启用飞书推送
  feishu_user_id: ""     # 你的飞书用户 ID
```

#### 4. 优先级关键词（推荐自定义）
```yaml
priority:
  p0_keywords:  # 核心方向（L3 精读）
    - "CAD Generation"
    - "Physical AI"
    - "World Model"
  
  p1_keywords:  # 相关方向（L2 标准）
    - "LLM Agent"
    - "Reasoning"
    - "3D Generation"
  
  p2_keywords:  # 边缘方向（L1 筛选）
    - "其他方向"
```

**建议**: 根据你的研究方向修改这些关键词！

#### 5. 反思与确认（推荐保留默认）
```yaml
reflection:
  enable_reflection: true
  l1_after_each_paper: true
  l2_schedule: weekly
  l3_schedule: monthly

confirmation:
  enable_human_confirmation: true
  trigger_on_new_moc: true
  trigger_on_core_paper: true
  trigger_on_cognitive_conflict: true
```

**说明**:
- `reflection` 控制单篇、周度、月度反思节奏
- `confirmation` 控制何时把关键事项送入 `0-Inbox/` 等待人工确认

---

## 🔧 依赖技能

### 必需依赖

| 技能 | 用途 | 来源说明 |
|------|------|---------|
| `obsidian-direct` | Obsidian 文件操作 | 本仓库未包含，需由本地 skills 目录提供 |
| `arxiv-watcher` | ArXiv 论文搜索 | 本仓库未包含，需由本地 skills 目录提供 |

### 推荐依赖

| 技能 | 用途 | 来源说明 |
|------|------|---------|
| `academic-research-hub` | 多源学术搜索 | 本仓库未包含，需由本地 skills 目录提供 |
| `tavily` | 网页内容提取 | 本仓库未包含，需由本地 skills 目录提供 |
| `pdf` | PDF 文本提取 | 本仓库已包含 `pdf/` |

### 检查依赖

```bash
# 查看已安装的技能
clawhub list

# 或使用 OpenClaw 验证（只读命令）
openclaw skills list
openclaw skills check <技能名>

# 或手动检查
ls ~/.openclaw/workspace-scholar/skills/
```

---

## 📂 目录结构

配置脚本会自动在 Obsidian 仓库中创建以下目录：

```
ObsidianVault/
├── 0-Inbox/                  # 确认请求、待处理事项
├── 1-Papers/                 # 论文笔记
│   ├── By-Topic/
│   ├── By-Year/
│   └── To-Process/
├── 2-Knowledge/              # 原子化知识
│   ├── Concepts/             # 概念卡片
│   ├── Insights/             # 洞察卡片
│   ├── Methods/              # 方法卡片
│   ├── Questions/            # 问题卡片
│   └── People/               # 研究者卡片
├── 3-MOCs/                  # 知识地图
├── 4-Applications/          # 面向应用的知识沉淀
├── 4-Surveys/               # 调研与综述
├── 4-Outputs/               # 反思、确认记录、草稿
│   ├── Reflections/
│   │   ├── L1/
│   │   ├── L2/
│   │   └── L3/
│   ├── Confirmation-Records/
│   ├── Drafts/
│   └── Literature-Reviews/
├── 9-Templates/             # 从 skill 自动同步的模板根目录
│   └── zh-CN/               # 中文版模板
└── memory/                  # 长期记忆
    ├── semantic/
    ├── episodic/
    └── inbox/
```

**手动创建**（如自动创建失败）:
```bash
cd /your/obsidian/vault
mkdir -p 0-Inbox
mkdir -p 1-Papers/By-Topic
mkdir -p 1-Papers/By-Year
mkdir -p 1-Papers/To-Process
mkdir -p 2-Knowledge/Concepts
mkdir -p 2-Knowledge/Insights
mkdir -p 2-Knowledge/Methods
mkdir -p 2-Knowledge/Questions
mkdir -p 2-Knowledge/People
mkdir -p 3-MOCs
mkdir -p 4-Outputs/Reflections/L1
mkdir -p 4-Outputs/Reflections/L2
mkdir -p 4-Outputs/Reflections/L3
mkdir -p 4-Outputs/Confirmation-Records
mkdir -p 9-Templates/zh-CN
mkdir -p memory/semantic
mkdir -p memory/episodic
mkdir -p memory/inbox
```

### 模板同步

配置脚本会把 skill 自带模板同步到 Obsidian 仓库的 `9-Templates/zh-CN/`，包括：

- `Template-Paper-Note-L2.md`
- `Template-Paper-Note-L3.md`
- `Template-Reflection-L1.md`
- `Template-Reflection-L2.md`
- `Template-Reflection-L3.md`
- `Template-Confirmation-Request.md`
- `Template-Concept.md`
- `Template-Insight.md`
- `Template-Method.md`
- `Template-Question.md`
- `Template-Person.md`
- `Template-MOC.md`
- `Procedure-人工确认流程.md`

这意味着配置完成后，用户可以直接在 Obsidian vault 内查看并引用这些模板。

---

## ❓ 故障排除

### 问题 1: 配置脚本无法运行

**错误**: `Permission denied`

**解决**:
```bash
chmod +x zh-CN/scripts/configure.py
python zh-CN/scripts/configure.py auto --vault-path "/你的/Obsidian/Vault"
```

---

### 问题 2: 找不到 Obsidian 仓库

**错误**: `未自动检测到 Obsidian 仓库`

**解决**:
1. 使用半自动模式：`python zh-CN/scripts/configure.py semi --vault-path "/你的/Obsidian/Vault"`
2. 手动输入完整路径
3. 如路径不存在，先创建目录：`mkdir -p /path/to/vault`

---

### 问题 3: 依赖技能安装失败

**错误**: `skill not found`

**解决**:
```bash
# 确认本仓库或本地 skills 目录中是否已有对应 skill
# 本仓库未包含的依赖，需要用户在本地 skill 库中自行提供
```

---

### 问题 4: 配置文件生成失败

**错误**: `无法写入配置文件`

**解决**:
```bash
# 检查目录权限
ls -la ~/.openclaw/workspace/

# 如需要，创建目录
mkdir -p ~/.openclaw/workspace-scholar/config

# 重新运行配置
python zh-CN/scripts/configure.py manual --vault-path "/你的/Obsidian/Vault"
```

---

### 问题 5: 想重新配置

**解决**:
```bash
# 删除配置文件
rm ~/.openclaw/workspace-scholar/config/scholar.yml

# 重新运行配置
python zh-CN/scripts/configure.py auto --vault-path "/你的/Obsidian/Vault"
```

---

## 🎯 验证配置

配置完成后，运行以下命令验证：

```bash
# 1. 检查配置文件是否存在
cat ~/.openclaw/workspace-scholar/config/scholar.yml

# 2. 检查 Obsidian 目录结构
ls -la /your/obsidian/vault/1-Papers/
ls -la /your/obsidian/vault/memory/

# 3. 检查依赖技能
clawhub list | grep -E "arxiv|obsidian|academic"

# 4. 测试运行（可选）
openclaw scholar read --help
```

---

## 📞 获取帮助

如遇到其他问题：

1. 查看日志：`cat ~/.openclaw/workspace/logs/scholar.log`
2. 查看本目录文档：`scholar-skill/docs/`
3. 检查本仓库 `README.md` 与 `ATTRIBUTIONS.md`

---

**祝你使用愉快！** 🦉
