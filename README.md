# 粽子音源 · MyGo 插件

聚合多个音乐源的 [MyGo](https://github.com/egoist/mygo-music) 音源插件。核心特色是**下架歌手的完整曲库**——主流平台搜不到的人和歌，这里能搜到并播放。

## 功能

| 模块 | 说明 |
|---|---|
| 搜索 | 单曲 / 歌手 / 专辑 / 歌单 / 播客，多源并发合并去重 |
| 首页 | 华语精选、欧美精选、新歌速递、下架歌手入口 |
| 歌单 | 自建歌单、我喜欢、收藏 |
| 歌手页 | 下架歌手走 YouTube 官方 Topic 频道拉完整曲库 |
| 专辑页 | 网易云歌手目录 + YouTube 虚拟专辑兜底 |
| 电台 | 30+ 直播电台，SomaFM 等，带分类与封面 |
| 播客 | 41 个分类，播客小镇 + Apple Podcasts + 网易电台三源合并 |

## 数据源

- **网易云音乐** — 搜索、歌单、歌手目录、电台节目
- **YouTube / YouTube Music** — 下架歌手主源（InnerTube 直连，无需 API Key）
- **酷我** — 搜索与取流
- **Apple Podcasts** — 播客搜索与歌手头像
- **播客小镇 (podtown.xyz)** — 266 个中文播客，自带 RSS
- **SomaFM / Radio France** — 直播电台

## 下架歌手是怎么解决的

这是本插件最花功夫的部分，几个关键坑：

### 1. 没有官方频道就搜不到歌

YouTube 的 `Topic` 频道是唱片公司直传的音频库，是唯一干净的音源。但**老歌手/被封歌手经常没有**，搜索结果全是搬运号和新闻。

解决办法：在 `ARTIST_DICT` 里硬编码官方频道 ID + 代表作，走频道直拉而不是搜索。目前收录 26 位。

### 2. 频道结构不统一

同样是 Topic 频道，结构可能完全不同：

- 常见形态：一个 `VLOLAK5uy_...` 播放列表装整张专辑
- **红花会** 这种：一首歌一个播放列表，12 个列表各 1 首

如果只拉前 3 个列表，红花会就只能拿到 3 首。所以现在按列表总数动态拉完（上限 16 个，每批并发 4 个）。

### 3. 搜索会被年龄验证拦掉

搜「阴三儿」会直接返回「确认您的年龄」页面（约 8KB，零 `videoRenderer`）→ 解析出 0 条。

但搜「陰三兒」（繁体）或「阴三儿 北京晚报」都能正常返回 20 条。所以这类歌手配 `safeQuery`，只在**纯歌手名查询**时替换搜索词。

### 4. 搜索结果会大量跑偏

「大买麦乐团」的搜索结果里混着《乐队的夏天》鼓手简评和郭富城金曲串烧。所有字典内歌手的搜索结果都要过一遍相关性过滤：标题或歌手名必须命中歌手名/别名/代表作，否则丢弃（过滤后少于 3 条则整体退回，避免把页面清空）。

### 5. 同名频道陷阱

- 「俄罗斯娜娜」绑的频道是**韩语吃播博主** Lady Nana（24 首 `#mukbang`）
- 「阴三儿 Topic」会命中「龍胆紫 - Topic」（成员后来组的另一支乐队）

所以登记频道 ID 前必须**实拉验证曲目非空且内容对得上**，不能只看名字。

### 6. 一个频道两个名字

福禄寿 2023 年重组为 DOUDOU，两支乐队共用同一个频道 `@doudou-officiall`。而 **YouTube 单曲不带署名**（`artist` 字段全空），接口层面分不开，只能按曲名白名单区分。

同名不同版本（《马》简体 vs 《馬》繁体、《超度我》vs《超度我 (Live)》）靠**原字形 + 版本后缀精确匹配**区分，不能繁简归一。

## 播放相关

MyGo 的解码器限制很死，踩过不少：

- 只认 `mp3 / flac / ogg / wav / m4a / aac`，传别的会被当 mp3 解码后报错
- mp3 解码器（`hajimehoshi/go-mp3`）**只支持 MPEG Layer III**，Layer I/II 会报 `only layer3 is supported`
- **不支持 HE-AAC (SBR+PS)** → 播客 m4a 必须用 ffmpeg 转 mp3

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
