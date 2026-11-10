# 发布流程

两条通道，**节奏故意不对称**：

- **beta 多** —— 改动随做随发，小步快跑，不攒
- **稳定版少** —— 攒够一批验证过的改动才发一次，宁缺毋滥

## 分发包结构

MyGo 用户按**固定地址**取最新版，所以文件名必须永远不变：

```
releases/
├── latest/
│   └── zongzi-music-latest.zip      ← 固定名称，永远指向最新版
├── history/
│   ├── zongzi-music-1.0.0.zip       ← 历史版本，按版本号归档
│   └── zongzi-music-1.1.0.zip
└── index.json                        ← 版本索引，记录 latest + 所有历史
```

**规则：**

1. **最新包文件名固定** —— 永远是 `zongzi-music-latest.zip`，内容随版本覆盖。用户的下载地址不用改。
2. **历史版本单独打包归档** —— 每发一版就往 `history/` 存一份 `zongzi-music-<版本>.zip`，不覆盖。
3. zip 不入 git（走 GitHub Release 分发），`index.json` 入库便于查版本。

## 版本号

`主版本.次版本.修订号`，SemVer：

| 段位 | 什么时候加 |
|---|---|
| 主版本 | 架构级重写、不兼容变更 |
| 次版本 | 新功能、新数据源、行为改进 |
| 修订号 | 只修 bug |

beta 用预发布后缀：`1.1.0-beta.1`、`1.1.0-beta.2`……

## 分支

| 分支 | 用途 | 更新频率 |
|---|---|---|
| `beta` | 日常开发主线 | **高**，几乎每次改动都推 |
| `master` | 稳定版，攒够才从 beta 合入 | **低** |

## 发布命令

一条命令搞定打包 + 归档 + tag + Release：

```bash
./release.sh                 # 版本号自动读 plugin.json
./release.sh 1.1.0           # 指定版本号
./release.sh 1.1.0 --no-push # 只本地打包，不提交推送（验证用）
```

它依次做四件事：

1. 打包 `releases/latest/zongzi-music-latest.zip`（**固定名称**）
2. 归档 `releases/history/zongzi-music-<版本>.zip`
3. 生成 `releases/index.json`
4. 提交 + 打 tag + 推 GitHub + 创建 Release（带两个 zip）

**只打包不发布：**

```bash
powershell -NoProfile -ExecutionPolicy Bypass -File ./pack_release.ps1
```

## 打包包含什么

**白名单机制** —— 只有下面这些会进包，其他一律排除（调试脚本、测试、`bin/`、`node_modules` 都无法混入）：

```
index.js  plugin.json  README.md  RELEASING.md
NOTES.md  BANNED_ARTISTS.md  deploy.sh  locales/
```

要新增运行时文件，改 `pack_release.ps1` 里的 `$allowTop` / `$allowDir`。

## beta 发版（高频）

改完就发，只要求语法过 + 测试全绿：

```bash
node --check index.js
node test_all.cjs

# 改 plugin.json: "version": "1.1.0-beta.7"
./release.sh

# Release 标为预发布
gh release edit v1.1.0-beta.7 --prerelease
```

## 稳定版发版（低频）

**不要每个 beta 都毕业。** 攒到这些情况才发：

- 某功能在 beta 跑了一两周没出问题
- 攒了若干用户能感知的改进
- 有人反馈某个 beta 足够稳

```bash
git checkout master && git merge beta

# 改 plugin.json: "version": "1.1.0"（去掉 beta 后缀）
node --check index.js
node test_all.cjs
./deploy.sh                    # 本地 MyGo 实测

./release.sh 1.1.0
```

稳定版硬要求：**测试全绿 + 本地 MyGo 实测过**。

## 用户怎么装

```bash
# 稳定版
git clone -b master https://github.com/ZONGZI-000/zongzi-mygo-plugin.git \
  "$APPDATA/MyGo Music/plugins/zongzi-music"

# 测试版
git clone -b beta https://github.com/ZONGZI-000/zongzi-mygo-plugin.git \
  "$APPDATA/MyGo Music/plugins/zongzi-music"
```

⚠️ MyGo 只在启动时读插件，装完要重启。

`bin/`（ffmpeg）不入库，首次使用时自动下载。建议自备 ffmpeg 放进 `bin/win32-amd64/`。

## 检查清单

**beta**（快）

- [ ] `plugin.json` 版本号带 `-beta.N`
- [ ] `node --check` + `test_all.cjs` 全绿
- [ ] `./release.sh` 跑通
- [ ] Release 打了 `--prerelease`

**稳定版**（全查）

- [ ] 版本号**没有** beta 后缀
- [ ] `node --check` 通过
- [ ] `test_all.cjs` 0 失败
- [ ] 本地 MyGo 实测：搜索 / 播放 / 歌手页 / 播客
- [ ] `releases/latest/zongzi-music-latest.zip` 是最新的
- [ ] `releases/history/` 里有对应版本归档
- [ ] git 里没有 `bin/`、`node_modules/`、`_*`、covers/
- [ ] 推了 master **和** tag
