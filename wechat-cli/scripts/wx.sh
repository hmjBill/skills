#!/bin/bash
# wechat-cli wrapper — 优先用 uv tool run（uv tool 隔离环境），避免裸 python 找不到 wechat_cli
# Usage: wx <command> [options]
# Example: wx sessions --limit 10
if command -v uv >/dev/null 2>&1; then
  exec uv tool run wechat-cli "$@"
else
  exec wechat-cli "$@"
fi
