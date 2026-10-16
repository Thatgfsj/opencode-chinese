#!/usr/bin/env bash
# 本地安装 / 更新用：起一个只监听 127.0.0.1 的静态服务，并在默认浏览器打开安装页。
# 用法：bash tools/serve-install.sh [端口]   （默认 8791，Ctrl-C 结束）
set -euo pipefail

PORT="${1:-${PORT:-8791}}"
DIR="$(cd "$(dirname "$0")/.." && pwd)"
URL="http://127.0.0.1:${PORT}/opencode-chinese.user.js"

cd "$DIR"
echo "服务目录：$DIR"
echo "安装地址：$URL"

python3 -m http.server "$PORT" --bind 127.0.0.1 --directory . &
SERVER_PID=$!
trap 'kill "$SERVER_PID" 2>/dev/null || true' EXIT INT TERM

sleep 1
if command -v xdg-open >/dev/null 2>&1; then
  xdg-open "$URL" >/dev/null 2>&1 || true
elif command -v open >/dev/null 2>&1; then
  open "$URL" >/dev/null 2>&1 || true
else
  echo "请手动在浏览器打开上面的安装地址。"
fi

echo "浏览器中点击 Tampermonkey 的「安装」即可。按 Ctrl-C 停止服务。"
wait "$SERVER_PID"
