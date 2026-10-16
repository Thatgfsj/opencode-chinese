#!/usr/bin/env bash
# 下载验证用的页面快照（英文原文），保存到 test/raw/
set -euo pipefail
cd "$(dirname "$0")"
mkdir -p raw
UA='Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/131.0 Safari/537.36'

# 文件基名 与 路径 的对应（用 / 分隔的路径会替换成 _）
pages=(
  "home:/"
  "zen:/zen"
  "go:/go"
  "enterprise:/enterprise"
  "download:/download"
  "brand:/brand"
  "data:/data"
  "changelog:/changelog"
  "docs:/docs"
  "legal_privacy-policy:/legal/privacy-policy"
  "legal_terms-of-service:/legal/terms-of-service"
  # 官方简体中文页，供 regression-zh.js 做回归对比
  "home_zh:/zh"
  "zh_zen:/zh/zen"
  "zh_data:/zh/data"
  "zh_docs:/zh/docs"
)

for item in "${pages[@]}"; do
  name="${item%%:*}"
  url="https://opencode.ai${item#*:}"
  curl -sSL --max-time 60 -A "$UA" "$url" -o "raw/${name}.html"
  printf '%-26s %8s bytes\n' "$name" "$(wc -c < "raw/${name}.html")"
done
echo "快照已保存到 test/raw/"

# 控制台（/console）是客户端渲染的 SPA，界面文案全在 bundle 里，供 console-coverage.js 使用。
# 入口 chunk 会随版本变化，这里从 shell HTML 取入口，再递归抓取它引用的所有懒加载 chunk。
echo
echo "下载控制台 bundle ..."
mkdir -p raw/console/assets
console_base="https://opencode.ai/console/assets"
curl -sSL --max-time 60 -A "$UA" "https://opencode.ai/console" -o /tmp/oc-console-shell.html
entry=$(grep -oE '/console/assets/[A-Za-z0-9_.-]+\.js' /tmp/oc-console-shell.html | head -1 | xargs -r basename)
[ -n "$entry" ] || { echo "⚠️ 未能从 shell HTML 解析出入口 chunk"; entry="index-uMEjDk-9.js"; }
echo "入口 chunk: $entry"

for round in 1 2 3 4 5; do
  [ -f "raw/console/assets/$entry" ] || curl -sSL --max-time 60 -A "$UA" "$console_base/$entry" -o "raw/console/assets/$entry"
  grep -ohE '[A-Za-z0-9_.-]+\.js' raw/console/assets/*.js 2>/dev/null | sort -u > /tmp/oc-console-chunks.txt
  new=0
  while read -r c; do
    [ -s "raw/console/assets/$c" ] && continue
    if curl -sfSL --max-time 60 -A "$UA" "$console_base/$c" -o "raw/console/assets/$c"; then
      new=$((new + 1))
    else
      rm -f "raw/console/assets/$c"
    fi
  done < /tmp/oc-console-chunks.txt
  printf '  第 %s 轮：新增 %s 个 chunk\n' "$round" "$new"
  [ "$new" -eq 0 ] && break
done
printf '控制台 bundle 共 %s 个 chunk，已保存到 test/raw/console/assets/（%s）\n' \
  "$(ls raw/console/assets/*.js 2>/dev/null | wc -l)" "$(du -sh raw/console/assets | cut -f1)"
