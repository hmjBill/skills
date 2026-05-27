# AGENTS.md

Agent Skills 收集与汉化仓库；无构建系统、无测试、无 CI，改动以内容校验为准。

## 仓库形状

- 79 个顶层 skill 条目；78 个含 `SKILL.md`，`gstack` 只有 `llms.txt`。
- `SKILL.md` 是核心文件；部分 skill 还有按需加载的参考文件，如 `tdd/tests.md`、`prototype/UI.md`、`wiki-config/assets/`、`scholar-skill/scripts/`。
- 新增或同步外部 skill 时，同步更新 `README.md` 分类/数量和 `ATTRIBUTIONS.md` 来源/许可证。
- 面向用户的安装/缺失提示应指向本仓库或本地 skill 目录；上游 GitHub 链接只用于 `ATTRIBUTIONS.md` 等来源归属。

## SKILL.md 兼容约束

- 文件必须是 UTF-8 **无 BOM**；BOM 会让 Codex 把 frontmatter 判为缺失。
- frontmatter 第一行必须直接是 `---`，不要保留源项目的空 frontmatter 或双 `---`。
- `name` 只能匹配 `^[a-z0-9]+(-[a-z0-9]+)*$`，且必须与目录名完全一致；中文目录名或中文 name 会被 OpenCode 拒绝。
- `description` 使用未加引号的短中文；避免长引号字符串和 `metadata`，否则部分插件列表/简化解析器可能不显示描述。
- 标题和正文使用中文；代码块、命令、路径、变量、wikilink、占位符、专有名词（如 Playwright、Shoehorn）保持原样。

## 本地验证

仓库没有 lint/test 命令。改动 `SKILL.md` 后至少运行以下 PowerShell 校验：

```powershell
$bad=@(); Get-ChildItem -Directory | ? Name -ne '.git' | % { $p=Join-Path $_.FullName 'SKILL.md'; if(Test-Path $p){ $b=[IO.File]::ReadAllBytes($p); if($b.Length -ge 3 -and $b[0]-eq 0xEF -and $b[1]-eq 0xBB -and $b[2]-eq 0xBF){$bad+="$($_.Name): BOM"}; $lines=[IO.File]::ReadAllLines($p); if($lines[0] -ne '---'){$bad+="$($_.Name): bad frontmatter"}; $name=($lines | ? {$_ -match '^name: '} | select -First 1) -replace '^name: ',''; if($name -ne $_.Name){$bad+="$($_.Name): name=$name"} } elseif($_.Name -ne 'gstack'){$bad+="$($_.Name): missing SKILL.md"} }; if($bad){$bad; exit 1}else{'skills ok'}
```

## Git 工作流

- `main` 是唯一长期分支；通常用 `feature/*`、`fix/*`、`docs/*`、`refactor/*` 短分支开发后合并。
- commit message 用中文，格式：`<type>: <中文描述>`；type 仅允许 `feat` `fix` `docs` `refactor` `chore` `perf` `test`。
