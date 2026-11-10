# 发布流程

## 两个仓库，两条通道

| 通道 | 仓库 | 默认分支 | 版本号 |
|---|---|---|---|
| 稳定版 | [zongzi-mygo-plugin-stable](https://github.com/ZONGZI-000/zongzi-mygo-plugin-stable) | `master` | `1.0.0` |
| 测试版 | [zongzi-mygo-plugin-beta](https://github.com/ZONGZI-000/zongzi-mygo-plugin-beta) | `beta` | `1.1.0-beta.1` |

两个仓库都加了 `mygo-music-plugin` topic，会被 MyGo 插件市场收录。

**节奏故意不对称：**

- **beta 多** —— 改动随做随发，小步快跑
- **稳定版少** —— 攒够一批验证过的改动才发一次

## MyGo 怎么装插件（官方规则）

在 MyGo 里 `Settings > Plugins > +`，填入仓库：

```
owner/repo   或   https://github.com/owner/repo
```

MyGo 取插件的方式，按优先级：

1. **最新 release 里按平台命名的 zip 资产** ← 我们用这个
2. 不带平台名的 zip 资产
3. 以上都没有 → 取默认分支最新 commit

⚠️ **关键**：资产必须叫 `plugin-win32-amd64.zip` 这种格式，MyGo 才认得。所以我们的固定包名就是它。

## 分发包结构

```
releases/
├── latest/
│   └── plugin-win32-amd64.zip          ← 固定名称，MyGo 直接取这个
├── history/
│   └── zongzi-music-1.0.0.zip          ← 历史版本，按版本号归档
└── index.json                           ← 版本索引
```

**规则：**

1. **最新包文件名固定** `plugin-win32-amd64.zip` —— 内容随版本覆盖，MyGo 的下载地址永远不变
2. **历史版本单独归档** —— `zongzi-music-<版本>.zip`，不覆盖
3. zip 不入 git（走 Release 分发），`index.json` 入库

## ⚠️ beta 不能标 prerelease

GitHub 的 `/releases/latest/` **会跳过 prerelease 标记的版本**，导致固定地址 404。

实测：`v1.1.0-beta.1` 标了 `--prerelease` → 固定地址 404；取消后 → 200。

所以 beta 版本号带 `-beta.N` 后缀区分就够了，**不要**加 `--prerelease` 标记。

## 发布命令

```bash
./release.sh stable          # 发稳定版（版本号不能带 beta 后缀）
./release.sh beta            # 发 beta（版本号必须带 -beta.N）
./release.sh stable 1.0.1    # 指定版本号
./release.sh stable --no-push # 只打包，不推送（验证用）
```

脚本会：

1. 校验版本号与通道是否匹配（beta 必须带后缀，稳定版必须不带）
2. 打包 `releases/latest/plugin-win32-amd64.zip`
3. 归档 `releases/history/zongzi-music-<版本>.zip`
4. 更新 `releases/index.json`
5. 推送到对应仓库的对应分支 + 打 tag
6. 在对应仓库创建 Release 并上传两个 zip

## beta 发版（高频）

改完就发，只要求语法过 + 测试全绿：

```bash
git checkout beta
git merge master              # 确保拿到最新脚本
node --check index.js
node test_all.cjs

# 改 plugin.json: "version": "1.1.0-beta.2"
./release.sh beta
```

## 稳定版发版（低频）

**不要每个 beta 都毕业。** 攒到这些情况才发：

- 某功能在 beta 跑了一两周没出问题
- 攒了若干用户能感知的改进
- 有人反馈某个 beta 足够稳

```bash
git checkout master
git merge beta

# 改 plugin.json: "version": "1.1.0"（去掉 beta 后缀）
node --check index.js
node test_all.cjs
./deploy.sh                    # 本地 MyGo 实测

./release.sh stable
```

稳定版硬要求：**测试全绿 + 本地 MyGo 实测过**。

## 打包白名单

只有这些进包，其他一律排除（调试脚本、测试、`bin/`、`node_modules` 都进不去）：

```
index.js  plugin.json  README.md  RELEASING.md
NOTES.md  BANNED_ARTISTS.md  deploy.sh  locales/
```

要新增运行时文件，改 `pack_release.ps1` 里的 `$allowTop` / `$allowDir`。

## 检查清单

**beta**（快）

- [ ] `plugin.json` 版本号带 `-beta.N`
- [ ] `node --check` + `test_all.cjs` 全绿
- [ ] `./release.sh beta` 跑通
- [ ] **没有**标 prerelease

**稳定版**（全查）

- [ ] 版本号**没有** beta 后缀
- [ ] `node --check` 通过
- [ ] `test_all.cjs` 0 失败
- [ ] 本地 MyGo 实测：搜索 / 播放 / 歌手页 / 播客
- [ ] 固定包版本号正确（`unzip -p ... plugin.json`）
- [ ] 历史归档存在
- [ ] git 里没有 `bin/`、`node_modules/`、`_*`、covers/
