#!/usr/bin/env bash
# 在真实的持久化 Chrome profile 中检查已登录流程。
# 用法：authenticated-session.sh URL [account]
# 省略 [account] 则使用本地配置的默认账号，也可传入已登记的账号句柄。

set -euo pipefail

target_url="${1:?用法：authenticated-session.sh URL [account]}"
account="${2:-}"
# 读取任务 UUID：此写法需 Linux/WSL；纯 Git Bash 无 /proc，可在 PowerShell 用 `[guid]::NewGuid()` 代替
IFS= read -r task_uuid </proc/sys/kernel/random/uuid
task_session="auth-check-${task_uuid//-/}"
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
"$browser_bin" "${browser_args[@]}" open "$target_url"
"$browser_bin" "${browser_args[@]}" snapshot -i --compact

printf '%s\n' "先在快照中确认已保存账号的登录路径，再向用户索要输入。"
