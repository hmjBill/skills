---
name: security-ownership-map
description: 分析 Git 仓库以构建安全所有权拓扑（人员到文件），计算总线因子和敏感代码所有权，并导出 CSV/JSON 用于图数据库和可视化。
---

# 安全所有权图

## 概述

基于 git 历史构建“人员—文件”二部图，然后计算所有权风险并导出可用于 Neo4j/Gephi 的图谱产物。同时构建文件共变更图（在共享提交上使用 Jaccard 相似度），以按共同变化趋势对文件聚类，并忽略体量大、噪声高的提交。

## 环境要求

- Python 3
- `networkx`（必需；默认启用社区检测）

安装命令：

```bash
pip install networkx
```

本文件中的命令都在技能目录（本文件所在目录）下运行，脚本使用相对路径 `scripts/...`。

## 工作流

1. 确定仓库范围与时间窗口（可选 `--since/--until`）。
2. 决定敏感性规则（使用默认值或提供 CSV 配置）。
3. 使用 `scripts/run_ownership_map.py` 构建所有权映射（默认启用共变更图；使用 `--cochange-max-files` 忽略 supernode 提交）。
4. 默认计算社区；graphml 输出为可选（`--graphml`）。
5. 使用 `scripts/query_ownership.py` 查询输出，获取有界 JSON 切片。
6. 持久化并可视化（见 `references/neo4j-import.md`）。

默认情况下，共变更图会忽略常见“胶水”文件（lockfiles、`.github/*`、编辑器配置），使聚类反映真实代码变更，而非共享基础设施编辑。可通过 `--cochange-exclude` 或 `--no-default-cochange-excludes` 覆盖。默认排除 Dependabot 提交；可通过 `--no-default-author-excludes` 覆盖，或使用 `--author-exclude-regex` 添加模式。

如果希望在共变更聚类中排除类似 `Kbuild` 的 Linux 构建胶水文件，可传入：

```bash
python scripts/run_ownership_map.py \
  --repo /path/to/linux \
  --out ownership-map-out \
  --cochange-exclude "**/Kbuild"
```

## 快速开始

在技能目录下运行（被分析的仓库通过 `--repo` 指定）：

```bash
python scripts/run_ownership_map.py \
  --repo . \
  --out ownership-map-out \
  --since "12 months ago" \
  --emit-commits
```

默认设置：使用 author 身份、author 日期，并排除 merge 提交。如有需要，使用 `--identity committer`、`--date-field committer` 或 `--include-merges`。

示例（覆盖共变更排除项）：

```bash
python scripts/run_ownership_map.py \
  --repo . \
  --out ownership-map-out \
  --cochange-exclude "**/Cargo.lock" \
  --cochange-exclude "**/.github/**" \
  --no-default-cochange-excludes
```

默认会计算社区。若要禁用：

```bash
python scripts/run_ownership_map.py \
  --repo . \
  --out ownership-map-out \
  --no-communities
```

## 敏感性规则

默认情况下，脚本会标记常见 auth/crypto/secrets 路径。可通过提供 CSV 文件进行覆盖：

```
# 敏感性规则示例：pattern,tag,weight
**/auth/**,auth,1.0
**/crypto/**,crypto,1.0
**/*.pem,secrets,1.0
```

使用方式：`--sensitive-config path/to/sensitive.csv`。

## 输出产物

`ownership-map-out/` 包含：

- `people.csv`（节点：人员）
- `files.csv`（节点：文件）
- `edges.csv`（边：触达）
- `cochange_edges.csv`（文件到文件的共变更边，带 Jaccard 权重；使用 `--no-cochange` 时省略）
- `summary.json`（安全所有权发现）
- `commits.jsonl`（可选，启用 `--emit-commits` 时生成）
- `communities.json`（默认在有共变更边时计算；包含每个社区的 `maintainers`；可用 `--no-communities` 禁用）
- `cochange.graph.json`（NetworkX node-link JSON，含 `community_id` + `community_maintainers`；若无共变更边则回退到 `ownership.graph.json`）
- `ownership.graphml` / `cochange.graphml`（可选，启用 `--graphml` 时生成）

`people.csv` 包含基于 author 提交时区偏移的时区检测字段：`primary_tz_offset`、`primary_tz_minutes` 和 `timezone_offsets`。

## LLM 查询辅助脚本

使用 `scripts/query_ownership.py` 可返回较小的、有 JSON 边界的切片，无需将完整图加载到上下文中。

示例：

```bash
python scripts/query_ownership.py --data-dir ownership-map-out people --limit 10
python scripts/query_ownership.py --data-dir ownership-map-out files --tag auth --bus-factor-max 1
python scripts/query_ownership.py --data-dir ownership-map-out person --person alice@corp --limit 10
python scripts/query_ownership.py --data-dir ownership-map-out file --file crypto/tls
python scripts/query_ownership.py --data-dir ownership-map-out cochange --file crypto/tls --limit 10
python scripts/query_ownership.py --data-dir ownership-map-out summary --section orphaned_sensitive_code
python scripts/query_ownership.py --data-dir ownership-map-out community --id 3
```

使用 `run_ownership_map.py` 的 `--community-top-owners 5`（默认值）控制每个社区存储的 maintainer 数量。

## 基本安全查询

运行以下命令，以有界输出回答常见安全所有权问题：

```bash
# 孤儿敏感代码：无人或少人维护的敏感文件
python scripts/query_ownership.py --data-dir ownership-map-out summary --section orphaned_sensitive_code

# 隐藏所有者：实际控制敏感代码的人
python scripts/query_ownership.py --data-dir ownership-map-out summary --section hidden_owners

# 低 bus factor 热点
python scripts/query_ownership.py --data-dir ownership-map-out summary --section bus_factor_hotspots

# bus factor = 1 的敏感文件（auth 与 crypto）
python scripts/query_ownership.py --data-dir ownership-map-out files --tag auth --bus-factor-max 1
python scripts/query_ownership.py --data-dir ownership-map-out files --tag crypto --bus-factor-max 1

# 敏感文件触达最多的人员
python scripts/query_ownership.py --data-dir ownership-map-out people --sort sensitive_touches --limit 10

# 指定文件的共变更关联
python scripts/query_ownership.py --data-dir ownership-map-out cochange --file path/to/file --min-jaccard 0.05 --limit 20

# 社区详情
python scripts/query_ownership.py --data-dir ownership-map-out community --id 3

# 社区维护者（最近）
python scripts/community_maintainers.py \
  --data-dir ownership-map-out \
  --file network/card.c \
  --since 2025-01-01 \
  --top 5

# 社区维护者（按日历季度分桶）
python scripts/community_maintainers.py \
  --data-dir ownership-map-out \
  --file network/card.c \
  --since 2025-01-01 \
  --bucket quarter \
  --top 5
```

## 查询选项说明

- 以下选项属于 `community_maintainers.py`：`--touch-mode`（默认按 authored commit 计数，`file` 按文件计数触达）、`--window-days`/`--weight recency --half-life-days`（平滑 churn）、`--ignore-author-regex '(bot|dependabot)'`（过滤 bot）、`--min-share 0.1`（仅显示稳定 maintainer）、`--bucket quarter`（按日历季度分组）。
- `--identity committer`、`--date-field committer`、`--include-merges` 在 `run_ownership_map.py` 与 `community_maintainers.py` 中均可用（默认按 author 归因并排除 merge 提交）。

### 摘要格式（默认）

使用如下结构，必要时可添加字段：

```json
{
  "orphaned_sensitive_code": [
    {
      "path": "crypto/tls/handshake.rs",
      "last_security_touch": "2023-03-12T18:10:04+00:00",
      "bus_factor": 1
    }
  ],
  "hidden_owners": [
    {
      "person": "alice@corp",
      "controls": "63% of auth code"
    }
  ]
}
```

## 图持久化

当需要将 CSV 导入 Neo4j 时，使用 `references/neo4j-import.md`。其中包含约束、导入 Cypher 以及可视化提示。

## 备注

- `summary.json` 中的 `bus_factor_hotspots` 列出低 bus factor 的敏感文件；`orphaned_sensitive_code` 是其中陈旧子集。
- 如果 `git log` 规模过大，可用 `--since` 或 `--until` 缩小范围。
- 将 `summary.json` 与 CODEOWNERS 对比，可突出显示所有权漂移。
