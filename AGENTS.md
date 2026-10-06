# AGENTS.md

Agent Skills 收集与汉化仓库；无构建系统、无测试、无 CI，改动以内容校验为准。

## 仓库形状

- 68 个顶层 skill 目录，全部含 `SKILL.md`；许多 skill 还有按需加载的 `references/`、`scripts/`、`assets/`（如 `tdd/tests.md`、`prototype/UI.md`、`mermaid-visualizer/references/`）。
- 新增/移除 skill 时，同步更新 `README.md`（分类/数量）、`ATTRIBUTIONS.md`（来源/许可证）和本文件的条目数。
- 部分 skill 带 `agents/openai.yaml`（Codex 专有元数据，其他宿主忽略，保留即可）。
- 面向用户的安装/缺失提示指向本仓库或本地 skill 目录；上游 GitHub 链接只用于 `ATTRIBUTIONS.md` 等来源归属。
- 本仓库不自动部署：本机 OpenCode 从 `~/.config/opencode/skills` 读取（部分为副本/符号链接），改动后按需手动同步。

## SKILL.md 兼容约束

- UTF-8 **无 BOM**（BOM 会让 Codex 判为缺 frontmatter）；frontmatter 第一行必须直接是 `---`。
- `name` 只能匹配 `^[a-z0-9]+(-[a-z0-9]+)*$`，且必须与目录名完全一致。
- `description` 用未加引号的短中文；OpenCode 只读 `name`/`description`，description 一旦被 YAML 解析成非字符串（列表/数字），该技能会**静默消失**（不报错）。
- 不新增 `metadata` 及 `hidden`/`argument-hint` 等扩展字段：本地宿主静默忽略，claude.ai 上传/Skills API 打包只接受规范字段、多余键硬失败；仓库既有的少量 `argument-hint`、`disable-model-invocation` 为有意保留。
- 标题和正文使用中文（不要缺 H1）；代码块、命令、路径、变量、wikilink、占位符、专有名词保持原样；`references/` 附件同样要求汉化（代码块除外）。
- 所有 `.sh` 必须 LF（`.gitattributes` 已声明 `*.sh text eol=lf`）；CRLF 会让 Git Bash 报 `bad interpreter`。

## 命令与平台约定

- 以 Windows（PowerShell 7）为主、兼顾 macOS/Linux：命令给 PowerShell 等价写法；不要写 `python3`（Windows 通常没有；`python`/`py` 也可能不可用，优先 uv 管理的解释器）。
- 不要硬编码 `~/.claude/...`、`.claude/skills/...` 或仓库外绝对路径（Claude Code 专用技能的安装路径除外）。
- 脚本与资源用技能内相对路径（`Path(__file__).parent` / `__dirname`）定位，不要按 cwd 或 `parents[N]` 猜仓库根；文档注明「在技能目录下运行」。
- 改脚本后做语法检查：`.sh` → Git Bash `bash -n`；`.py` → `python -m py_compile`；`.js`/`.cjs` → `node --check`。
- 清理宿主耦合时：`git-guardrails-claude-code` 的 `.claude` 钩子安装路径、`playwright-interactive` 的「仅 Codex 适用」说明等为有意保留，不要当残留删除。

## 本地验证

仓库没有 lint/test 命令。改动 `SKILL.md` 后至少运行以下 PowerShell 校验（在仓库根执行；只覆盖顶层 SKILL.md 的存在/BOM/frontmatter/name）：

```powershell
$bad=@(); Get-ChildItem -Directory | ? Name -ne '.git' | % { $p=Join-Path $_.FullName 'SKILL.md'; if(Test-Path $p){ $b=[IO.File]::ReadAllBytes($p); if($b.Length -ge 3 -and $b[0]-eq 0xEF -and $b[1]-eq 0xBB -and $b[2]-eq 0xBF){$bad+="$($_.Name): BOM"}; $lines=[IO.File]::ReadAllLines($p); if($lines[0] -ne '---'){$bad+="$($_.Name): bad frontmatter"}; $name=($lines | ? {$_ -match '^name: '} | select -First 1) -replace '^name: ',''; if($name -ne $_.Name){$bad+="$($_.Name): name=$name"} } else {$bad+="$($_.Name): missing SKILL.md"} }; if($bad){$bad; exit 1}else{'skills ok'}
```

## 同步上游

- 来源与许可证以 `ATTRIBUTIONS.md` 为准（主要上游：mattpocock/skills、openai/skills（已 deprecated）、anthropics/skills、vanillaflava/llm-wiki-skills、kepano/obsidian-skills 等）。
- 同步时比对上游原文，**保留本地技能名与本地适配**（中文、AI-Wiki 约定、Git 规则），不要整份覆盖本地增强；代码块/命令与上游逐字节核对。

## wiki / obsidian 技能

- `wiki-*`、`obsidian-*` 的目标库是 `B:\AI-Wiki`（改动前只读核对实况）；枚举值真源是 `00_系统/Agent操作指南.md` 的枚举注册表，模板在 `00_系统/模板/`，`.obsidian/types.json` 只登记字段类型。
- 不要移除技能内的写入边界说明（Coding Agent 不直接写库，由 Wiki Agent 落库、先交用户确认）。

## Git 工作流

- `main` 是唯一长期分支；用 `feature/*`、`fix/*`、`docs/*`、`refactor/*` 短分支开发后合并。
- commit message 用中文，格式：`<type>: <中文描述>`；type 仅允许 `feat` `fix` `docs` `refactor` `chore` `perf` `test`。
- push、合并 `main` 前须用户确认。
