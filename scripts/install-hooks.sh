#!/bin/sh
# 安装本仓库的 pre-commit 校验（.git/hooks 不入库，换机器需重跑本脚本）。
set -e
cd "$(dirname "$0")/.."

hook=".git/hooks/pre-commit"
cat > "$hook" <<'EOS'
#!/bin/sh
exec node scripts/validate-skills.mjs
EOS
chmod +x "$hook"
echo "已安装 $hook"
node scripts/validate-skills.mjs
