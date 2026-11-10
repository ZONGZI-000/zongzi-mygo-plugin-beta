# 发布流程

两条通道，**节奏故意不对称**：

- **beta 多** —— 改动随做随发，小步快跑，不攒
- **稳定版少** —— 攒够一批验证过的改动才发一次，宁缺毋滥

```
1.0.0 ──────────────────────────────────────────► 稳定
   └─► 1.1.0-beta.1 ─► 1.1.0-beta.2 ─► 1.1.0-beta.3
       1.1.0-beta.4 ─► 1.1.0-beta.5 ─► ...  攒够 ──► 1.1.0
```

beta 编号可以一直加，1.1.0 磨多久就发多少个 beta。觉得这批功能稳了、用量够了，才毕业成 `1.1.0`。

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
| `beta` | 日常开发主线，所有改动先落这里 | **高**，几乎每次改动都推 |
| `main` | 稳定版，只在发版时从 beta 合入 | **低**，攒够才动 |

> 现有仓库主分支是 `master`，等同 `main` 的角色。

## 日常：发 beta（高频）

改完就直接发，不要等：

```bash
node --check index.js
node test_all.cjs              # 全绿就行

# 版本号在 1.1.0-beta.N 上 +1
#   plugin.json: "version": "1.1.0-beta.7"

git add -A
git commit -m "beta: v1.1.0-beta.7 - 改了什么"
git push origin beta

gh release create v1.1.0-beta.7 --prerelease \
  --title "v1.1.0-beta.7" --notes "改了什么"
```

beta 的要求只有两条：**语法过 + 测试全绿**。不需要完整实测，出问题下一个 beta 修。

## 偶尔：发稳定版（低频）

**不要每个 beta 都毕业。** 攒到下面这些情况才发：

- 某个功能在 beta 上跑了一两周没出新问题
- 攒了若干个「用户会感知到」的改进，值得写进更新日志
- 有人反馈某个 beta 已经足够稳，可以固化了

```bash
# 1. 从 beta 合入主分支
git checkout master
git merge beta

# 2. 版本号去掉 beta 后缀，修订号/次版本按实际改
#    plugin.json: "version": "1.1.0"

# 3. 验证三连
node --check index.js
node test_all.cjs              # 必须 0 失败
./deploy.sh                    # 本地 MyGo 实测：搜索/播放/歌手页都过一遍

# 4. 提交 + tag
git add -A
git commit -m "release: v1.1.0 稳定版"
git tag -a v1.1.0 -m "v1.1.0 稳定版"
git push origin master
git push origin v1.1.0

# 5. Release（注意：不加 --prerelease）
gh release create v1.1.0 --title "v1.1.0" --notes "## 更新内容
- 变更点1
- 变更点2"
```

稳定版的硬要求：**测试全绿 + 本地 MyGo 实测过**。没实测就发稳定版就是耍流氓。

## 装哪个

```bash
# 稳定版（想省心）
git clone -b master https://github.com/ZONGZI-000/zongzi-mygo-plugin.git \
  "$APPDATA/MyGo Music/plugins/zongzi-music"

# beta（想尝鲜，跟着更新）
git clone -b beta https://github.com/ZONGZI-000/zongzi-mygo-plugin.git \
  "$APPDATA/MyGo Music/plugins/zongzi-music"
```

已有安装切通道：

```bash
cd "$APPDATA/MyGo Music/plugins/zongzi-music"
git fetch && git checkout beta && git pull     # 切 beta
git fetch && git checkout master && git pull   # 回稳定版
```

⚠️ 切完要重启 MyGo。

## 检查清单

**beta**（快，只查前两项）

- [ ] `plugin.json` 版本号带 `-beta.N` 且 N 递增
- [ ] `node --check` + `test_all.cjs` 全绿
- [ ] Release 打了 `--prerelease`

**稳定版**（慢，全查）

- [ ] `plugin.json` 版本号**没有** beta 后缀
- [ ] `node --check` 通过
- [ ] `test_all.cjs` 0 失败
- [ ] 本地 MyGo 实测：搜索 / 播放 / 歌手页 / 播客
- [ ] git 里没有 `bin/`、`node_modules/`、`_*.py`、`_shots/`
- [ ] 没有本地绝对路径、密钥、cookie 泄漏
- [ ] 推了 master **和** tag
- [ ] Release 没打 `--prerelease`
