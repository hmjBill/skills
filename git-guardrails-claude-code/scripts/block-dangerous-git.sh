#!/bin/bash

# jq 是必需依赖：缺失时无法解析 stdin JSON，检测循环会空匹配并放行，必须 fail-closed。
if ! command -v jq >/dev/null 2>&1; then
  echo "BLOCKED: jq is required by this hook but was not found on PATH." >&2
  echo "Install jq first, e.g.: winget install jqlang.jq / scoop install jq / brew install jq" >&2
  exit 2
fi

INPUT=$(cat)
COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command')

DANGEROUS_PATTERNS=(
  "git push"
  "git reset --hard"
  "git clean -fd"
  "git clean -f"
  "git branch -D"
  "git checkout \."
  "git restore \."
  "push --force"
  "reset --hard"
)

for pattern in "${DANGEROUS_PATTERNS[@]}"; do
  if echo "$COMMAND" | grep -qE "$pattern"; then
    echo "BLOCKED: '$COMMAND' matches dangerous pattern '$pattern'. The user has prevented you from doing this." >&2
    exit 2
  fi
done

exit 0
