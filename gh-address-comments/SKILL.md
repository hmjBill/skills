---
name: "PR评论处理"
description: "处理 GitHub PR review 评论，汇总待处理评论并按选择修复"
metadata:
  short-description: 处理 GitHub PR 审查评论
---

# PR 评论处理

查找当前分支的开放 PR 并使用 gh CLI 处理其评论。运行所有 `gh` 命令时需提升网络访问权限。

前置条件：确保 `gh` 已认证（例如，运行一次 `gh auth login`），然后使用提升的权限运行 `gh auth status`（包含 workflow/repo scopes）以确保 `gh` 命令成功。如果沙箱阻止了 `gh auth status`，请使用 `sandbox_permissions=require_escalated` 重新运行。

## 1) 检查需要处理的评论
- 运行 `scripts/fetch_comments.py`，它将打印出 PR 上的所有评论和审查线程

## 2) 向用户确认
- 为所有审查线程和评论编号，并提供简要说明每个评论需要什么修复
- 询问用户需要处理哪些编号的评论

## 3) 如果用户选择了评论
- 为选定的评论应用修复

注意事项：
- 如果 gh 在运行中途遇到认证/速率限制问题，提示用户使用 `gh auth login` 重新认证，然后重试。
