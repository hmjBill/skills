---
name: 代码地图
description: 为不熟悉的代码仓库生成全面的分层代码地图。高开销操作，仅在明确要求代码库文档或初始仓库映射时使用。
---

# 代码地图

帮助用户通过创建分层代码地图来理解和映射仓库。

## 使用场景

- 用户要求理解/映射仓库
- 用户需要代码库文档
- 开始处理不熟悉的代码库

## 工作流程

### 步骤 1：检查现有状态

**首先，检查仓库根目录是否存在 `.slim/codemap.json`。**

如果不存在，检查旧状态 `.slim/cartography.json`。

如果存在旧状态：将 `.slim/cartography.json` 移动到 `.slim/codemap.json`，然后继续进行变更检测。

如果 `.slim/codemap.json` 存在：跳到步骤 3（检测变更）— 无需重新初始化。

如果两个文件都不存在：继续步骤 2（初始化）。

### 步骤 2：初始化（仅在无状态时执行）

1. **分析仓库结构** — 列出文件，理解目录
2. **推断模式** 仅针对**核心代码/配置文件**：
   - **包含**：`src/**/*.ts`、`package.json` 等
   - **排除（强制）**：不包含测试、文档或翻译
     - 测试：`**/*.test.ts`、`**/*.spec.ts`、`tests/**`、`__tests__/**`
     - 文档：`docs/**`、`*.md`（需要的根 `README.md` 除外）、`LICENSE`
     - 构建/依赖：`node_modules/**`、`dist/**`、`build/**`、`*.min.js`
   - 自动尊重 `.gitignore`
3. **运行 codemap.mjs init**：

```bash
node ~/.config/opencode/skills/codemap/scripts/codemap.mjs init \
  --root ./ \
  --include "src/**/*.ts" \
  --exclude "**/*.test.ts" --exclude "dist/**" --exclude "node_modules/**"
```

这会创建：
- `.slim/codemap.json` — 用于变更检测的文件和文件夹哈希
- 所有相关子目录中的空 `codemap.md` 文件

4. **将代码地图编写委托给 Fixer 代理** — 每个文件夹生成一个 fixer 来阅读代码并创建或更新其特定的 `codemap.md` 文件。

### 步骤 3：检测变更（如果状态已存在）

1. **运行 codemap.mjs changes** 查看变化：

```bash
node ~/.config/opencode/skills/codemap/scripts/codemap.mjs changes \
  --root ./
```

2. **审查输出** — 显示：
   - 新增文件
   - 删除文件
   - 修改文件
   - 受影响的文件夹

3. **仅更新受影响的代码地图** — 为每个受影响的文件夹生成一个 fixer 来更新其 `codemap.md`。
4. **运行 update 保存新状态**：

```bash
node ~/.config/opencode/skills/codemap/scripts/codemap.mjs update \
  --root ./
```

### 步骤 4：完成仓库地图集（根代码地图）

所有特定目录映射完成后，协调器必须创建或更新根 `codemap.md`。此文件作为任何进入仓库的代理或人类的**主入口点**。

1. **映射根资源**：记录根级文件（如 `package.json`、`index.ts`、`plugin.json`）和项目的整体目的。
2. **聚合子地图**：创建"仓库目录地图"部分。对于每个有 `codemap.md` 的文件夹，提取其**职责**摘要并将其包含在根地图的表格或列表中。
3. **交叉引用**：确保根地图包含子地图的绝对或相对路径，以便代理可以直接跳转到相关详情。

### 步骤 5：在 AGENTS.md 中注册代码地图

**OpenCode 在每个会话中自动将 `AGENTS.md` 加载到代理上下文中。** 为确保代理自动发现和使用代码地图，请在仓库根目录更新（或创建）`AGENTS.md`：

1. 如果 `AGENTS.md` 已存在且已包含 `## Repository Map` 部分，**跳过此步骤** — 引用已设置。
2. 如果 `AGENTS.md` 存在但没有 `## Repository Map` 部分，**附加**以下部分。
3. 如果 `AGENTS.md` 不存在，**使用以下部分创建**。

```markdown
## Repository Map

完整的代码地图位于项目根目录的 `codemap.md`。

在处理任何任务之前，请阅读 `codemap.md` 以了解：
- 项目架构和入口点
- 目录职责和设计模式
- 模块之间的数据流和集成点

对于特定文件夹的深入工作，也请阅读该文件夹的 `codemap.md`。
```

这是幂等的 — 重复的代码地图运行将检测到现有部分并跳过。不会重复。

## 代码地图内容

Fixer 负责在此工作流程中编写 `codemap.md` 文件。使用精确的技术术语记录实现：

- **职责** — 使用标准软件工程术语定义此目录的特定角色（如"服务层"、"数据访问对象"、"中间件"）。
- **设计模式** — 识别并命名使用的特定模式（如"观察者"、"单例"、"工厂"、"策略"）。详细说明抽象和接口。
- **数据和控制流** — 显式追踪数据如何进入和离开模块。提及特定的函数调用序列和状态转换。
- **集成点** — 列出依赖项和消费模块。使用技术名称表示钩子、事件或 API 端点。

代码地图示例：

```markdown
# 代码地图

## 职责
定义代理个性并管理其配置生命周期。

## 设计
每个代理是一个提示 + 权限集。配置系统使用：
- 默认提示（orchestrator.ts、explorer.ts 等）
- 来自 ~/.config/opencode/oh-my-opencode-slim.json 的用户覆盖
- 技能/MCP 访问控制的权限通配符

## 流程
1. 插件加载 → 调用 getAgentConfigs()
2. 读取用户配置预设
3. 合并默认值与覆盖
4. 应用权限规则（通配符扩展）
5. 返回代理配置给 OpenCode

## 集成
- 被消费：主插件（src/index.ts）
- 依赖：配置加载器、技能注册表
```

示例**根代码地图（地图集）**：

```markdown
# 代码地图

## 项目职责
面向 OpenCode 的高性能、低延迟代理编排插件，专注于专业子代理委托和多路复用器辅助的子会话。

## 系统入口点
- `src/index.ts`：插件初始化和 OpenCode 集成。
- `package.json`：依赖清单和构建脚本。
- `oh-my-opencode-slim.json`：用户配置模式。

## 目录地图（聚合）
| 目录 | 职责摘要 | 详细地图 |
|-----------|------------------------|--------------|
| `src/agents/` | 定义代理个性（协调器、探索者）并管理模型路由。 | [查看地图](src/agents/codemap.md) |
| `src/features/` | tmux 集成和会话状态的核心逻辑。 | [查看地图](src/features/codemap.md) |
| `src/config/` | 实现配置加载管道和环境变量注入。 | [查看地图](src/config/codemap.md) |
```
