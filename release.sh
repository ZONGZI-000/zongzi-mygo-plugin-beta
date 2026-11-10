#!/bin/bash
# 发布：打包 latest（固定名称）+ 归档历史版本 + 打 tag + 建 GitHub Release
#
# 用法：
#   ./release.sh                  # 版本号自动读 plugin.json
#   ./release.sh 1.1.0            # 指定版本号
#   ./release.sh 1.1.0 --no-push  # 只打包，不提交/推送
#
# 产物：
#   releases/latest/zongzi-music-latest.zip     ← 固定名称，永远是最新版
#   releases/history/zongzi-music-<版本>.zip    ← 历史版本归档
set -euo pipefail
SRC="$(cd "$(dirname "$0")" && pwd)"
cd "$SRC"

VERSION=""
NO_PUSH=0
for arg in "$@"; do
  case "$arg" in
    --no-push) NO_PUSH=1 ;;
    -*) ;;
    *) VERSION="$arg" ;;
  esac
done

if [ -z "$VERSION" ]; then
  VERSION=$(grep -m1 '"version"' plugin.json | sed 's/.*:[[:space:]]*"\([^"]*\)".*/\1/')
fi
echo "==> 版本: $VERSION"

HIST_DIR="$SRC/releases/history"
mkdir -p "$HIST_DIR" "$SRC/releases/latest"

echo "==> 打包 latest（固定名称）"
powershell -NoProfile -ExecutionPolicy Bypass -File "./pack_release.ps1" -Version "$VERSION"

echo "==> 归档历史版本"
powershell -NoProfile -ExecutionPolicy Bypass -File "./pack_release.ps1" \
  -Version "$VERSION" -OutDir "$HIST_DIR" -OutName "zongzi-music-${VERSION}.zip"

echo "==> 生成 releases/index.json"
node - "$VERSION" <<'NODE'
const fs = require("fs");
const path = require("path");
const version = process.argv[2];
const root = "releases";
const histDir = path.join(root, "history");
const entries = fs.existsSync(histDir)
  ? fs.readdirSync(histDir)
      .filter((f) => f.startsWith("zongzi-music-") && f.endsWith(".zip"))
      .map((f) => ({
        version: f.replace("zongzi-music-", "").replace(".zip", ""),
        zip: "releases/history/" + f,
        size: fs.statSync(path.join(histDir, f)).size,
      }))
      .sort((a, b) => b.version.localeCompare(a.version, undefined, { numeric: true }))
  : [];
const idx = {
  latest: {
    version,
    zip: "releases/latest/zongzi-music-latest.zip",
    size: fs.existsSync(path.join(root, "latest/zongzi-music-latest.zip"))
      ? fs.statSync(path.join(root, "latest/zongzi-music-latest.zip")).size
      : 0,
  },
  history: entries,
};
fs.writeFileSync(path.join(root, "index.json"), JSON.stringify(idx, null, 2) + "\n");
console.log("   latest=" + version + "  历史版本 " + entries.length + " 个");
NODE

if [ "$NO_PUSH" -eq 0 ]; then
  echo "==> 提交并推送"
  git add -A
  git commit -m "release: v${VERSION}" || echo "   （无改动可提交）"
  git tag -a "v${VERSION}" -m "v${VERSION}" 2>/dev/null || echo "   （tag 已存在）"
  git push origin HEAD 2>&1 | tail -2
  git push origin "v${VERSION}" 2>&1 | tail -2

  echo "==> 创建 GitHub Release"
  gh release create "v${VERSION}" \
    "releases/latest/zongzi-music-latest.zip" \
    "releases/history/zongzi-music-${VERSION}.zip" \
    --title "v${VERSION}" --notes "v${VERSION}" 2>&1 | tail -3 || echo "   ⚠️ Release 创建失败，可手动补"
fi

echo ""
echo "✅ 完成"
ls -lh releases/latest/*.zip
