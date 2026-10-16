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
