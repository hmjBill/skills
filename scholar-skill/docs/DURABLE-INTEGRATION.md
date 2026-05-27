# ScholarSkill × Durable Task Runner 集成指南

**版本**: v1.0.0  
**最后更新**: 2026-03-18

---

## 🎯 为什么需要集成？

### 场景对比

| 场景 | 无 Durable | 有 Durable |
|------|-----------|-----------|
| **L3 精读** (2.5 小时) | ❌ 会话中断=全部重来 | ✅ 中断后可恢复 |
| **批量阅读** (10+ 篇) | ❌ 无法追踪进度 | ✅ 实时进度显示 |
| **周巩固** (60-90 分钟) | ❌ 无状态持久化 | ✅ 定期执行 + 状态保存 |
| **崩溃恢复** | ❌ 数据丢失 | ✅ 自动恢复 |
| **任务编排** | ❌ 顺序执行 | ✅ 并行 + 依赖管理 |

---

## 📦 安装

```bash
# 验证本地 skills 目录中是否已有 durable-task-runner
clawhub list | grep durable
```

`durable-task-runner` 不在本仓库内；如需使用，请先在本地 skill 库中提供该依赖。

---

## 🔧 配置

### 自动配置

运行配置脚本时会自动检测：

```bash
python scripts/configure.py auto
```

**输出示例**:
```
ℹ 正在检查依赖技能...
✓   arxiv-watcher 已安装
✓   durable-task-runner 已安装（长任务编排）
⚠   academic-research-hub 未安装
```

### 手动配置

编辑配置文件 `~/.openclaw/workspace-scholar/config/scholar.yml`（或 `~/.openclaw/workspace/config/scholar.yml`）:

```yaml
advanced:
  # 启用长任务编排
  enable_durable_runner: true
  
  # L3 精读使用 durable runner（推荐）
  l3_use_durable: true
  
  # 批量阅读使用 durable runner（推荐）
  batch_use_durable: true
  
  # 周巩固使用 durable runner（推荐）
  consolidation_use_durable: true
  
  # durable-task-runner 配置
  durable:
    # 数据库路径
    db_path: ~/.openclaw/workspace/durable/runner.db
    
    # 任务输出目录
    artifact_root: ~/.openclaw/workspace/durable/artifacts
    
    # 心跳间隔（秒）
    heartbeat_interval: 30
    
    # 任务超时（分钟）
    task_timeout: 300
```

---

## 📖 使用方式

### L3 精读（自动使用 Durable）

```bash
# 普通 L3 阅读（自动启用 durable-task-runner）
openclaw scholar read paper.pdf --level L3
```

**进度显示**:
```
Task: l3-reading-20260318-001 | L3 精读：ArXiv:2407.19354
Overall: 45% (9/20 steps)
Current Phase: 记忆抽取

Completed Since Last Update:
- step-005 完成笔记生成（10.2KB）
- step-006 抽取 Semantic Memories（5 条）

In Progress:
- step-007 抽取 Episodic Memories

Next:
- step-008 抽取 Procedural Memories

Risks/Blocks:
- 无

Control:
- pause | resume | cancel | recover_stalled_tasks
```

---

### 批量阅读（自动使用 Durable）

```bash
# 批量 L2 阅读 10 篇论文
openclaw scholar batch read ./papers/*.pdf --level L2
```

**进度显示**:
```
Task: batch-reading-20260318-001 | 批量阅读：10 篇论文
Overall: 30% (3/10 papers)
Current Phase: 论文 #4 - L2 标准阅读

Completed Since Last Update:
- paper-003 完成阅读（ArXiv:2407.19354）
- paper-003 生成笔记（4.2KB）
- paper-003 抽取记忆（6 条）

In Progress:
- paper-004 阅读中（45%）

Next:
- paper-005 ArXiv:2403.12345

Risks/Blocks:
- 无

Control:
- pause | resume | cancel | skip_paper | recover_stalled_tasks
```

---

### 周巩固（自动使用 Durable）

```bash
# 执行周巩固
openclaw scholar consolidate --week 2026-W12
```

**进度显示**:
```
Task: consolidation-20260318-001 | 周巩固：2026-W12
Overall: 60% (6/10 steps)
Current Phase: 合并重复记忆

Completed Since Last Update:
- step-003 合并 Semantic Memories（2 组重复）
- step-004 标记冲突结论（1 组）

In Progress:
- step-006 输出本周 3 条稳定规则

Next:
- step-007 更新常驻记忆块

Risks/Blocks:
- 无

Control:
- pause | resume | cancel | recover_stalled_tasks
```

---

## 🛠️ 高级功能

### 任务控制

```bash
# 暂停任务
openclaw scholar task pause l3-reading-20260318-001

# 恢复任务
openclaw scholar task resume l3-reading-20260318-001

# 取消任务
openclaw scholar task cancel l3-reading-20260318-001

# 查看任务状态
openclaw scholar task status l3-reading-20260318-001

# 查看任务报告
openclaw scholar task report l3-reading-20260318-001
```

---

### 崩溃恢复

如会话中断（网络问题、系统崩溃等），可恢复任务：

```bash
# 恢复所有停滞任务
openclaw scholar recover

# 恢复特定任务
openclaw scholar task recover l3-reading-20260318-001
```

**恢复流程**:
1. 扫描所有 `RUNNING` 状态的任务
2. 检查心跳是否超时（默认 5 分钟）
3. 重新排队超时任务
4. 从中断点继续执行

---

### 并行处理（批量阅读）

```bash
# 批量阅读，同时处理 3 篇论文
openclaw scholar batch read ./papers/*.pdf --parallel 3
```

**注意**:
- 默认 `--parallel 1`（顺序执行）
- 增加并发数可加快速度，但会增加资源消耗
- 推荐值：CPU 核心数 - 1

---

## 📊 任务状态机

```
PENDING → QUEUED → RUNNING → COMPLETED
                    ↓
                 FAILED → RETRY → QUEUED
                    ↓
                 BLOCKED (等待人工干预)
```

**状态说明**:
- **PENDING**: 任务创建，等待计划
- **QUEUED**: 步骤已排队，等待执行
- **RUNNING**: 步骤执行中
- **COMPLETED**: 任务完成
- **FAILED**: 步骤失败（可重试）
- **BLOCKED**: 任务阻塞（需人工干预）

---

## 🔍 故障排除

### 问题 1: 任务卡住不动

**症状**: 进度长时间不更新

**解决**:
```bash
# 1. 查看任务状态
openclaw scholar task status <task_id>

# 2. 查看日志
cat ~/.openclaw/workspace/logs/scholar.log

# 3. 恢复停滞任务
openclaw scholar recover

# 4. 如仍失败，取消后重新运行
openclaw scholar task cancel <task_id>
openclaw scholar read paper.pdf --level L3
```

---

### 问题 2: durable-task-runner 未安装

**症状**: 
```
⚠ durable-task-runner 未安装（L3 精读/批量处理推荐）
```

**解决**:
```bash
# 验证本地 skills 目录中是否已有 durable-task-runner
clawhub list | grep durable

# 或使用 OpenClaw 验证（只读命令）
openclaw skills list
openclaw skills info durable-task-runner
```

---

### 问题 3: 任务失败后无法恢复

**症状**: 任务状态为 `FAILED` 或 `BLOCKED`

**解决**:
```bash
# 1. 查看详细错误
openclaw scholar task report <task_id> --verbose

# 2. 根据错误信息修复（如论文文件损坏）

# 3. 重试失败步骤
openclaw scholar task retry <task_id> --step <step_id>

# 4. 或跳过失败步骤
openclaw scholar task skip <task_id> --step <step_id>
```

---

## 📈 性能对比

### L3 精读（2.5 小时）

| 指标 | 无 Durable | 有 Durable |
|------|-----------|-----------|
| **中断恢复** | ❌ 从头开始 | ✅ 从中断点继续 |
| **进度可见性** | ❌ 黑盒 | ✅ 实时显示 |
| **崩溃风险** | 高（长时间运行） | 低（状态持久化） |
| **用户体验** | 焦虑（不知道进度） | 安心（可控） |

---

### 批量阅读（10 篇论文）

| 指标 | 无 Durable | 有 Durable |
|------|-----------|-----------|
| **总时长** | ~7.5 小时 | ~7.5 小时 |
| **进度追踪** | ❌ 无法中断 | ✅ 可随时暂停/恢复 |
| **并行处理** | ❌ 顺序执行 | ✅ 支持并发 |
| **失败处理** | ❌ 全部重来 | ✅ 仅重试失败论文 |

---

## 🎯 最佳实践

### 1. 始终启用 Durable（长任务）

**推荐配置**:
```yaml
advanced:
  l3_use_durable: true      # L3 精读
  batch_use_durable: true   # 批量阅读
  consolidation_use_durable: true  # 周巩固
```

### 2. 设置合理的超时时间

```yaml
advanced:
  durable:
    task_timeout: 300  # 5 小时（L3 精读 2.5 小时 + 缓冲）
    heartbeat_interval: 30  # 30 秒心跳
```

### 3. 定期检查任务状态

```bash
# 查看所有活跃任务
openclaw scholar task list

# 查看特定任务
openclaw scholar task status <task_id>
```

### 4. 使用暂停而非取消

如需要暂时停止：
```bash
# 推荐：暂停（可恢复）
openclaw scholar task pause <task_id>

# 不推荐：取消（丢失进度）
openclaw scholar task cancel <task_id>
```

---

## 🔗 相关资源

- Durable Task Runner：本仓库未包含，需由本地 skill 库提供
- [ScholarSkill 配置指南](CONFIGURATION.md)
- [ScholarSkill README](../README.md)

---

**集成完成！享受可靠的长任务处理体验！** 🦉
