# AGENTS.md

Agent Skills 收集与汉化仓库。无构建系统、无测试、无 CI。纯内容仓库。

## 目录结构

- 每个子目录是一个 Skill，核心文件为 `SKILL.md`
- 52 个目录：51 个含 SKILL.md，`gstack` 仅有 `llms.txt`
- 部分目录含参考文件（如 `tdd/tests.md`、`prototype/UI.md`）

## SKILL.md 格式约束（重要）

修改或新增 SKILL.md 时必须遵守：

- **编码**：UTF-8 **无 BOM**（EF BB BF 会导致 Codex 解析失败）
- **name 字段**：仅限 `^[a-z0-9]+(-[a-z0-9]+)*$`（小写英文+数字+连字符），必须与目录名完全一致
- **description 字段**：可为中文
- **标题和正文**：可为中文
- 专有名词保留英文原名（如 Playwright、Shoehorn）

## 已知的 README 不一致

README.md 第 121 行声称 description 保留英文，实际已全部汉化为中文。第 125 行引用的 `feature/localization` 分支不存在，实际使用的是 `feature/full-localization`。

## 工作流

- `main` 为唯一长期分支，保持可发布状态
- 使用 feature 分支开发，完成后合并回 main
- 分支命名：`feature/*`、`fix/*`、`docs/*`、`refactor/*`
- commit message 中文，格式：`<type>: <中文描述>`
- type 仅允许：`feat` `fix` `docs` `refactor` `chore` `perf` `test`
