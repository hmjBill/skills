#!/usr/bin/env bash
# 在真实 Chrome profile 中操作已渲染表单流程的安全起点。
# 用法：form-automation.sh URL [account]

set -euo pipefail

form_url="${1:?用法：form-automation.sh URL [account]}"
account="${2:-}"
# 读取任务 UUID：此写法需 Linux/WSL；纯 Git Bash 无 /proc，可在 PowerShell 用 `[guid]::NewGuid()` 代替
IFS= read -r task_uuid </proc/sys/kernel/random/uuid
task_session="form-flow-${task_uuid//-/}"
browser_bin="$(command -v agent-browser)"
browser_args=(--session "$task_session")
if [[ -n "$account" ]]; then
  browser_args=(--account "$account" "${browser_args[@]}")
fi

cleanup_armed=0
cleanup() {
  prior_status=$?
  trap - EXIT
  if [[ "$cleanup_armed" == 1 ]]; then
    if ! "$browser_bin" "${browser_args[@]}" close; then
      printf 'Agent Browser 清理失败，会话 %s。\n' "$task_session" >&2
      if [[ "$prior_status" -eq 0 ]]; then
        prior_status=1
      fi
    fi
  fi
  exit "$prior_status"
}
trap cleanup EXIT

cleanup_armed=1
"$browser_bin" "${browser_args[@]}" open "$form_url"
"$browser_bin" "${browser_args[@]}" snapshot -i --compact

# 用快照中最新获取的 refs 继续操作，例如：
# "$browser_bin" "${browser_args[@]}" fill @e1 "value"
# "$browser_bin" "${browser_args[@]}" click @e2
# "$browser_bin" "${browser_args[@]}" snapshot -i --compact

printf '%s\n' "请使用最新的 refs，核对页面可见结果，并让 cleanup trap 关闭本次任务会话。"
