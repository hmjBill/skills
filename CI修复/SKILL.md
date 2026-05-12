---
name: CI修复
description: "调试 GitHub Actions 中失败的 PR checks，分析日志并制定修复方案"
---


# Gh Pr Checks 修复计划

## 概述

使用 gh 定位失败的 PR 检查，获取可操作的 GitHub Actions 日志，总结失败片段，然后提出修复计划并在明确批准后实施。
- 如果有面向计划的技能（例如 `create-plan`），使用它；否则在内部起草简明计划并在实施前请求批准。

前置条件：进行一次标准的 GitHub CLI 认证（例如，运行 `gh auth login`），然后使用 `gh auth status` 确认（通常需要 repo + workflow scopes）。

## 输入

- `repo`：仓库内路径（默认为 `.`）
- `pr`：PR 编号或 URL（可选；默认为当前分支的 PR）
- `gh` 对仓库主机的认证

## 快速开始

- `python "<path-to-skill>/scripts/inspect_pr_checks.py" --repo "." --pr "<number-or-url>"`
- 如果需要机器可读的输出进行汇总，请添加 `--json`

## 工作流程

1. 验证 gh 认证。
   - 在仓库中运行 `gh auth status`。
   - 如果未认证，要求用户运行 `gh auth login`（确保有 repo + workflow scopes）后再继续。
2. 确定 PR。
   - 优先使用当前分支的 PR：`gh pr view --json number,url`。
   - 如果用户提供了 PR 编号或 URL，直接使用。
3. 检查失败的检查（仅限 GitHub Actions）。
   - 优先：运行绑定的脚本（处理 gh 字段漂移和 job-log 回退）：
     - `python "<path-to-skill>/scripts/inspect_pr_checks.py" --repo "." --pr "<number-or-url>"`
     - 添加 `--json` 以获取机器可读的输出。
   - 手动回退：
     - `gh pr checks <pr> --json name,state,bucket,link,startedAt,completedAt,workflow`
       - 如果字段被拒绝，使用 `gh` 报告的可用字段重新运行。
     - 对于每个失败的检查，从 `detailsUrl` 提取 run id 并运行：
       - `gh run view <run_id> --json name,workflowName,conclusion,status,url,event,headBranch,headSha`
       - `gh run view <run_id> --log`
     - 如果运行日志显示仍在进行中，直接获取 job 日志：
       - `gh api "/repos/<owner>/<repo>/actions/jobs/<job_id>/logs" > "<path>"`
4. 确定非 GitHub Actions 检查的范围。
   - 如果 `detailsUrl` 不是 GitHub Actions 运行，标记为外部并仅报告 URL。
   - 不要尝试 Buildkite 或其他提供者；保持工作流程精简。
5. 为用户总结失败情况。
   - 提供失败的检查名称、运行 URL（如果有）以及简明的日志片段。
   - 明确指出缺失的日志。
6. 制定计划。
   - 使用 `create-plan` 技能起草简明计划并请求批准。
7. 批准后实施。
   - 应用批准的计划，总结差异/测试，并询问是否打开 PR。
8. 重新检查状态。
   - 更改后，建议重新运行相关测试和 `gh pr checks` 以确认。

## 绑定资源

### scripts/inspect_pr_checks.py

获取失败的 PR 检查，拉取 GitHub Actions 日志，并提取失败片段。当失败仍然存在时以非零退出，以便可用于自动化。

使用示例：
- `python "<path-to-skill>/scripts/inspect_pr_checks.py" --repo "." --pr "123"`
- `python "<path-to-skill>/scripts/inspect_pr_checks.py" --repo "." --pr "https://github.com/org/repo/pull/123" --json`
- `python "<path-to-skill>/scripts/inspect_pr_checks.py" --repo "." --max-lines 200 --context 40`
