#!/bin/bash
# wechat-cli wrapper — resolves npm/PATH conflict on Windows
# Usage: wx <command> [options]
# Example: wx sessions --limit 10
python -c "from wechat_cli.main import cli; cli()" -- "$@"
