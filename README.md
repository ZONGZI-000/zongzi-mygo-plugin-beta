# 粽子音源 · MyGo 插件

![粽子音源](assets/kanban/zongzi-ad-banner.jpg)

聚合多个音乐源的 [MyGo](https://github.com/egoist/mygo-music) 音源插件。

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


## 安装

在 MyGo 里打开 `Settings > Plugins > +`，填仓库地址。

**稳定版：**

```
ZONGZI-000/zongzi-mygo-plugin-stable
```

**测试版**（更新快，可能有毛刺）：

```
ZONGZI-000/zongzi-mygo-plugin-beta
```

MyGo 会自动取最新 release 里的 `plugin-win32-amd64.zip` 安装。新版本发布后设置里会显示更新提示。

两个仓库都加了 `mygo-music-plugin` topic，也能在 MyGo 插件市场里搜到。

### 手动装

不想用 MyGo 的安装器，也可以直接下 zip：

```
https://github.com/ZONGZI-000/zongzi-mygo-plugin-stable/releases/latest/download/plugin-win32-amd64.zip
```

解压到 `%APPDATA%\MyGo Music\plugins\zongzi-music\`。历史版本在各自仓库的 Releases 里按版本号归档。

### ffmpeg

`bin/`（ffmpeg 等平台二进制）不入库，首次用到转码时自动下载。有两点建议：

- **最好自备 ffmpeg**：把可用的 `ffmpeg.exe` 放到 `bin/win32-amd64/` 下即可，插件会直接用，省掉 78MB 下载和出错的概率
- 自动下载的源在 **GitHub release**，大陆网络可能连不上或很慢——如果一直卡在下载，挂代理，或干脆手动把 ffmpeg 放进上面的目录

## 版本

两个独立仓库，互不干扰：

| 通道 | 仓库 | 版本号 | 节奏 |
|---|---|---|---|
| 稳定版 | `zongzi-mygo-plugin-stable` | `1.0.0` | **少**，攒够验证过的改动才发 |
| 测试版 | `zongzi-mygo-plugin-beta` | `1.1.0-beta.1` | **多**，随改随发 |

稳定版是 beta 磨稳后的固化快照。发版流程见 [RELEASING.md](RELEASING.md)。

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
