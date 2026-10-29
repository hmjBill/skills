# 私有文件格式

本技能维护 `private/` 下的所有文件。该目录被 `.gitignore` 排除；数据目录可用环境变量 `LIFTING_LOOPS_PRIVATE` 改到别处。

## 文件清单

- `private/config.json`：数据源设置
- `private/state.json`：扫描游标，只由 `digest.py mark` 写入
- `private/ledger.md`：回环台账
- `private/proposals/P-NNN.md`：提案，一个文件一个
- `private/runs/<日期>-<主机>/`：一次批处理的 digest、`run.json` 与报告

## config.json

```json
{
  "vault": "~/笔记库路径",
  "vault_exclude": ["由自动化写入的目录"],
  "vault_full_history": ["需要全量历史的目录"],
  "vault_ai_marker": "^>.*\\(AI\\)",
  "claudeai_backup": null,
  "first_run_days": 90
}
```

- `vault`：Obsidian 库根目录；没有就写 `null`。
- `vault_exclude`：自动化写入的目录（相对库根），不参与摘要。
- `vault_full_history`：首次扫描时忽略时间窗、全量读取的目录，通常是月度或年度复盘。
- `vault_ai_marker`：匹配笔记前 800 个字符的正则，命中表示该笔记由 Agent 撰写；可选。
- `claudeai_backup`：claude.ai 导出目录，需含 `conversations/split/index.json`；没有就写 `null`。
- `first_run_days`：尚无游标时向前扫描多少天。

## ledger.md

```markdown
# 回环台账

更新：YYYY-MM-DD（会话模式 / 批处理模式 · 主机）

## L-001 一句话描述这个回环

- 状态：observed
- 角色：重试
- 首次 / 最近：YYYY-MM-DD / YYYY-MM-DD
- 证据数：4（跨 3 个会话）
- 证据：
  - YYYY-MM-DD · pi · a1b2c3d4 · “再试一次”
- 已计入会话：a1b2c3d4 e5f6a7b8
- 目标背后的目标：用户真正想要的结果，一句话
- 指标：每周人工介入次数；结果信号：一句话
- 指标记录：YYYY-MM-DD 3 · YYYY-MM-DD 1
- 提案：P-002（open）
- 落地物：路径或 —

## 已退役

- L-000 一句话描述 · 退役原因 · YYYY-MM-DD
```

规则：

- 「已计入会话」列出所有记过的会话 id 前 8 位，只增不减。合并新证据前先查这一行，已存在就跳过；会话模式下的当前会话是唯一例外，可以持续追加。
- 每个回环只保留最近 5 条证据；更早的只计入「证据数」。
- 每条证据含日期、来源、会话 id 前 8 位、用户原话（不超过 60 字）。来源是笔记库时，用笔记的相对路径代替会话 id。
- 每次批处理往「指标记录」追加一个数字，只保留最近 8 个。

## 状态与转移

| 状态 | 进入条件 |
| --- | --- |
| observed | 首次发现 |
| candidate | 证据数 ≥ 3 且跨 ≥ 2 个会话；或在单个会话里用户为此花了 ≥ 10 轮 |
| proposed | 提案已写好，等用户决定 |
| graduated | 用户接受，且落地物已就位 |
| reopened | 毕业后连续 4 次批处理，介入数都没低于毕业前 4 周的平均值 |
| retired | observed 且 8 周无新证据；或 graduated 且 8 周内零介入且结果信号正常 |

- 用户拒绝提案时，把回环移回 candidate，并在提案文件里记下原因。
- 被拒绝的退出方式不要重复提。等新证据 ≥ 3 条后，可以提另一种退出方式。
- reopened 按 candidate 处理，其提案必须说明上一个落地物为何没起作用。

## proposals/P-NNN.md

```markdown
---
id: P-007
loop: L-003
status: open
exit: 修改既有落地物
target: 相对路径或 ~ 开头的路径
created: YYYY-MM-DD
---

# 一句话说明改什么

## 证据

3–5 条，格式与台账一致。

## 目标背后的目标

一句话。

## 改动

目标是受版本控制的文件时，给可直接应用的 unified diff；新文件给全文。只涉及用户自身习惯的建议不需要本节。

## 指标

- 如何计数介入：哪些原话、哪些会话算一次
- 结果信号：介入数下降时，用什么确认用户不是干脆放弃了

## 脱敏检查

对 SKILL.md 里每条脱敏规则写「通过」或改了什么。

## 决定

用户决定后填写：采纳 / 拒绝及原因 / 日期。
```

- `status` 取 `open`、`applied`、`rejected` 之一。
- 编号全局递增：新编号 = `private/proposals/` 里最大编号 + 1。

## 每周报告

```markdown
# 抬出回环周报 · YYYY-MM-DD · 主机

## 需要你决定

- P-007 一句话 → [proposals/P-007.md](../../proposals/P-007.md)

## 本周数字

N 个会话（a 个手动开启，b 个定时运行），M 次介入：重试 r、判好坏 j、批准 g、搬上下文 c、起任务 t、替它干 h。

## 已毕业的回环

| 回环 | 落地物 | 毕业前每周介入 | 本周 | 结果信号 |
| --- | --- | --- | --- | --- |

## 新增与升级

- L-012（新增）一句话
- L-004 observed → candidate，原因

## 给你的建议

最多 3 条，只写用户自己能改的习惯。

## 记忆整理

每个记忆一行：保留 / 已被某落地物覆盖可删 / 提案 P-NNN。

## 指标复核

每个指标一句话：数字的变化是否真的说明变好了。
```
