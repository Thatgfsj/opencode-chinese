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

# 控制台（/console）是客户端渲染的 SPA，界面文案全在 bundle 里，供 console-coverage.js 使用
echo
echo "下载控制台 bundle ..."
mkdir -p raw/console/assets
console_assets=(
  "index-uMEjDk-9.js"
  "app-pages-FyA1OWx4.js"
  "meters-XjwhZ6SV.js"
  "data-table-Ct8kXydw.js"
  "select-input-RekMIwnJ.js"
  "icon-V2H2B8XT.js"
)
for a in "${console_assets[@]}"; do
  curl -sSL --max-time 60 -A "$UA" "https://opencode.ai/console/assets/$a" -o "raw/console/assets/$a"
  printf '%-26s %8s bytes\n' "console/$a" "$(wc -c < "raw/console/assets/$a")"
done
echo "控制台 bundle 已保存到 test/raw/console/assets/"
