#!/usr/bin/env bash
# 在真实 Chrome profile 中按 token 预算执行渲染结果采集。
# 用法：capture-workflow.sh URL [output-dir] [selector]

set -euo pipefail

target_url="${1:?用法：capture-workflow.sh URL [output-dir] [selector]}"
output_dir="${2:-.}"
selector="${3:-}"
# 读取任务 UUID：此写法需 Linux/WSL；纯 Git Bash 无 /proc，可在 PowerShell 用 `[guid]::NewGuid()` 代替
IFS= read -r task_uuid </proc/sys/kernel/random/uuid
task_session="capture-${task_uuid//-/}"
browser_bin="$(command -v agent-browser)"

mkdir -p "$output_dir"
cleanup_armed=0
cleanup() {
  prior_status=$?
  trap - EXIT
  if [[ "$cleanup_armed" == 1 ]]; then
    if ! "$browser_bin" --session "$task_session" close; then
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
"$browser_bin" --session "$task_session" open "$target_url"
"$browser_bin" --session "$task_session" snapshot -i --compact >"$output_dir/page-structure.txt"
# 整页修复已有候选证明，但默认安装的引擎尚不支持。
"$browser_bin" --session "$task_session" screenshot "$output_dir/page-viewport.png"

if [[ -n "$selector" ]]; then
  "$browser_bin" --session "$task_session" get text "$selector" >"$output_dir/selected-text.txt"
fi

printf '渲染结果已保存到 %s\n' "$output_dir"
