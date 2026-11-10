# 粽子音源 · MyGo 插件

聚合多个音乐源的 [MyGo](https://github.com/egoist/mygo-music) 音源插件。跨平台源聚合、相互兜底，主流 App 找不到的曲目也能在这里补齐。

## 功能

| 模块 | 说明 |
|---|---|
| 搜索 | 单曲 / 歌手 / 专辑 / 歌单 / 播客，多源并发合并去重 |
| 首页 | 华语精选、欧美精选、新歌速递、下架歌手入口 |
| 歌单 | 自建歌单、我喜欢、收藏 |
| 歌手页 | 下架歌手走 YouTube 官方 Topic 频道拉完整曲库 |
| 专辑页 | 云音乐歌手目录 + YouTube 虚拟专辑兜底 |
| 电台 | 30+ 直播电台，SomaFM 等，带分类与封面 |
| 播客 | 41 个分类，播客小镇 + Apple Podcasts + 云音乐电台三源合并 |

## 数据源

- **云音乐** — 搜索、歌单、歌手目录、电台节目
- **YouTube / YouTube Music** — 下架歌手主源（InnerTube 直连，无需 API Key）
- **酷我** — 搜索与取流
- **Apple Podcasts** — 播客搜索与歌手头像
- **播客小镇 (podtown.xyz)** — 266 个中文播客，自带 RSS
- **SomaFM / Radio France** — 直播电台

## 播放相关

MyGo 的解码器限制很死，踩过不少：

- 只认 `mp3 / flac / ogg / wav / m4a / aac`，传别的会被当 mp3 解码后报错
- mp3 解码器（`hajimehoshi/go-mp3`）**只支持 MPEG Layer III**，Layer I/II 会报 `only layer3 is supported`
- **不支持 HE-AAC (SBR+PS)** → 播客 m4a 必须用 ffmpeg 转 mp3

## 安装

### 直接下载 zip（推荐）

最新版地址**固定不变**，出什么新版本都是这个链接：

```
https://github.com/ZONGZI-000/zongzi-mygo-plugin/releases/latest/download/zongzi-music-latest.zip
```

解压到 `%APPDATA%\MyGo Music\plugins\zongzi-music\` 即可。历史版本在 [Releases](https://github.com/ZONGZI-000/zongzi-mygo-plugin/releases) 里按版本号归档。

### 从源码装

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

### ffmpeg

`bin/`（ffmpeg 等平台二进制）不入库，首次用到转码时自动下载。有两点建议：

- **最好自备 ffmpeg**：把可用的 `ffmpeg.exe` 放到 `bin/win32-amd64/` 下即可，插件会直接用，省掉 78MB 下载和出错的概率
- 自动下载的源在 **GitHub release**，大陆网络可能连不上或很慢——如果一直卡在下载，挂代理，或干脆手动把 ffmpeg 放进上面的目录

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