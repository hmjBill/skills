#!/usr/bin/env bash
# 仓库统一验收入口：Agent 验收门与人工提交前都跑这一条。
set -euo pipefail
cd "$(dirname "$0")"
echo "shell=$BASH $BASH_VERSION ostype=$OSTYPE"
node scripts/validate-skills.mjs
