#!/bin/bash
# 发布：打包 + 归档历史版本 + 打 tag + 建 GitHub Release
#
# 两个仓库各发布各的：
#   stable → ZONGZI-000/zongzi-mygo-plugin-stable（默认分支 master）
#   beta   → ZONGZI-000/zongzi-mygo-plugin-beta  （默认分支 beta）
#
# MyGo 安装规则（官方文档）：
#   取最新 release 的 zip 资产，按平台命名（plugin-win32-amd64.zip），
#   或一个不带平台名的 zip；都没有才退回源码默认分支。
#   所以固定名称必须叫 plugin-win32-amd64.zip 这种，MyGo 才认得。
#
# 用法：
#   ./release.sh stable                # 发稳定版
#   ./release.sh beta                  # 发 beta（版本号需带 -beta.N）
#   ./release.sh stable 1.0.1          # 指定版本号
#   ./release.sh beta --no-push        # 只打包不推送
set -euo pipefail
SRC="$(cd "$(dirname "$0")" && pwd)"
cd "$SRC"

CHANNEL=""
VERSION=""
NO_PUSH=0
for arg in "$@"; do
  case "$arg" in
    --no-push) NO_PUSH=1 ;;
    stable|beta) CHANNEL="$arg" ;;
    -*) ;;
    *) VERSION="$arg" ;;
  esac
done

if [ -z "$CHANNEL" ]; then
  echo "✗ 必须指定通道: ./release.sh stable  或  ./release.sh beta"
  exit 1
fi

# 通道配置
if [ "$CHANNEL" = "stable" ]; then
  REMOTE="stable"
  BRANCH="master"
  REPO="ZONGZI-000/zongzi-mygo-plugin-stable"
  PRERELEASE=0
else
  REMOTE="beta"
  BRANCH="beta"
  REPO="ZONGZI-000/zongzi-mygo-plugin-beta"
  PRERELEASE=0  # ⚠️ 不能标 prerelease：GitHub 的 /releases/latest 会跳过预发布导致 404
fi

if [ -z "$VERSION" ]; then
  VERSION=$(grep -m1 '"version"' plugin.json | sed 's/.*:[[:space:]]*"\([^"]*\)".*/\1/')
fi

# 通道与版本号一致性校验
case "$VERSION" in
  *-beta.*|*-beta)
    if [ "$CHANNEL" = "stable" ]; then
      echo "✗ 稳定版版本号不能带 beta 后缀: $VERSION"
      exit 1
    fi
    ;;
  *)
    if [ "$CHANNEL" = "beta" ]; then
      echo "✗ beta 版版本号必须带 -beta.N 后缀: $VERSION"
      exit 1
    fi
    ;;
esac

echo "==> 通道: $CHANNEL   版本: $VERSION   仓库: $REPO   分支: $BRANCH"

LATEST_DIR="$SRC/releases/latest"
HIST_DIR="$SRC/releases/history"
mkdir -p "$LATEST_DIR" "$HIST_DIR"

# MyGo 认的固定资产名（按平台）。同时留一份不带平台名的兜底。
LATEST_ZIP="plugin-win32-amd64.zip"

echo "==> 打包 $LATEST_ZIP（固定名称，MyGo 直接取这个）"
powershell -NoProfile -ExecutionPolicy Bypass -File "./pack_release.ps1" \
  -Version "$VERSION" -OutDir "$LATEST_DIR" -OutName "$LATEST_ZIP"

HIST_ZIP="zongzi-music-${VERSION}.zip"
echo "==> 归档历史版本 $HIST_ZIP"
powershell -NoProfile -ExecutionPolicy Bypass -File "./pack_release.ps1" \
  -Version "$VERSION" -OutDir "$HIST_DIR" -OutName "$HIST_ZIP"

echo "==> 更新 releases/index.json"
node - "$VERSION" "$CHANNEL" "$LATEST_ZIP" <<'NODE'
const fs = require("fs");
const path = require("path");
const [version, channel, latestZip] = process.argv.slice(2);
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
const latestPath = path.join(root, "latest", latestZip);
const idx = {
  channel,
  latest: {
    version,
    zip: "releases/latest/" + latestZip,
    size: fs.existsSync(latestPath) ? fs.statSync(latestPath).size : 0,
    installUrl: `https://github.com/ZONGZI-000/zongzi-mygo-plugin-${channel}/releases/latest/download/${latestZip}`,
  },
  history: entries,
};
fs.writeFileSync(path.join(root, "index.json"), JSON.stringify(idx, null, 2) + "\n");
console.log(`   channel=${channel}  latest=${version}  历史 ${entries.length} 个`);
NODE

if [ "$NO_PUSH" -eq 0 ]; then
  echo "==> 提交并推送 $REMOTE/$BRANCH"
  git add -A
  git commit -m "release(${CHANNEL}): v${VERSION}" || echo "   （无改动可提交）"
  git tag -a "v${VERSION}" -m "v${VERSION}" 2>/dev/null || echo "   （tag 已存在）"
  git push "$REMOTE" "HEAD:${BRANCH}" 2>&1 | tail -2
  git push "$REMOTE" "v${VERSION}" 2>&1 | tail -2 || true

  echo "==> 创建 GitHub Release（$REPO）"
  PRERELEASE_FLAG=""
  [ "$PRERELEASE" -eq 1 ] && PRERELEASE_FLAG="--prerelease"
  gh release create "v${VERSION}" \
    "$LATEST_DIR/$LATEST_ZIP" \
    "$HIST_DIR/$HIST_ZIP" \
    --repo "$REPO" \
    --title "v${VERSION}" \
    --notes "v${VERSION}" $PRERELEASE_FLAG 2>&1 | tail -3 \
    || echo "   ⚠️ Release 创建失败（可能已存在），可手动补"
fi

echo ""
echo "✅ 完成 [$CHANNEL] v$VERSION"
echo "   安装地址: https://github.com/$REPO"
echo "   固定包:   $LATEST_DIR/$LATEST_ZIP"
