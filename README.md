# 粽子音源 · MyGo 插件

聚合多个音乐源的 [MyGo](https://github.com/egoist/mygo-music) 音源插件。

## 功能

| 模块 | 说明 |
|---|---|
| 搜索 | 单曲 / 歌手 / 专辑 / 歌单 / 播客，多源并发合并去重 |
| 首页 | 华语精选、欧美精选、新歌速递、下架歌手入口 |
| 歌单 | 自建歌单、我喜欢、收藏 |
| 歌手页 | 下架歌手走 YouTube 官方 Topic 频道拉完整曲库 |
| 专辑页 | 云意义歌手目录 + YouTube 虚拟专辑兜底 |
| 电台 | 30+ 直播电台，SomaFM 等，带分类与封面 |
| 播客 | 41 个分类，播客小镇 + Apple Podcasts + 网易电台三源合并 |

## 数据源

- **云音乐** — 搜索、歌单、歌手目录、电台节目
- **YouTube / YouTube Music** — 下架歌手主源（InnerTube 直连，无需 API Key）
- **酷wo** — 搜索与取流
- **Apple Podcasts** — 播客搜索与歌手头像
- **播客小镇 (podtown.xyz)** — 266 个中文播客，自带 RSS
- **SomaFM / Radio France** — 直播电台

## 安装

两条通道，按需选：

```bash
# 稳定版（推荐）
git clone -b master https://github.com/ZONGZI-000/zongzi-mygo-plugin.git \
  "$APPDATA/MyGo Music/plugins/zongzi-music"

# 测试版（尝鲜，可能有毛刺）
git clone -b beta https://github.com/ZONGZI-000/zongzi-mygo-plugin.git \
  "$APPDATA/MyGo Music/plugins/zongzi-music"
```

已安装的想切通道：

```bash
cd "$APPDATA/MyGo Music/plugins/zongzi-music"
git fetch && git checkout beta && git pull     # 切 beta
git fetch && git checkout master && git pull   # 回稳定版
```

⚠️ 切完要重启 MyGo。

`bin/`（ffmpeg 等平台二进制）不入库，首次使用时按需下载。

## 版本

| 通道 | 版本号形态 | 分支 | 节奏 |
|---|---|---|---|
| 稳定版 | `1.0.0` | `master` | **少**，攒够验证过的改动才发 |
| 测试版 | `1.1.0-beta.7` | `beta` | **多**，随改随发 |

日常更新在 `beta`，稳定版是 `beta` 磨稳后的固化快照。发版流程见 [RELEASING.md](RELEASING.md)。

## 开发

```bash
node --check index.js      # 语法检查
node test_all.cjs          # 跑测试（沙箱 mock 了 host 环境）
./deploy.sh                # 部署到 MyGo（自动探测目录，也可传参）
```

`deploy.sh` 支持三种方式指定目标：

```bash
./deploy.sh                             # 自动探测
./deploy.sh "/d/MyGo/plugins/xxx"       # 指定路径
MYGO_PLUGIN_DIR=/some/dir ./deploy.sh   # 环境变量
```

⚠️ MyGo **只在启动时读插件**，部署完要重启才生效。

## 结构

```
index.js                插件主逻辑（~7600 行）
plugin.json             插件元信息 + 网络白名单
locales/zh-CN.json      界面文案
test_all.cjs            测试套件
deploy.sh               部署脚本
NOTES.md                MyGo 播放器硬限制备忘
BANNED_ARTISTS.md       下架歌手整理
```

## 说明

仅供个人学习与自用。曲库信息来自各平台公开接口，不对内容做二次分发。
