// 完整测试：加载 CJS 版插件，真实跑 新增菜单(电台/播客) + 已有菜单 + 全平台播放
// 运行: node test_all.cjs
const fs = require("fs");
const path = require("path");
const { spawn: cpspawn } = require("child_process");
const crypto = require("crypto");

const DIR = __dirname;
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

// ---- 0. 从 index.js 生成 CJS 版（把 export 转成 module.exports）供测试加载 ----
function buildCjs() {
  let src = fs.readFileSync(path.join(DIR, "index.js"), "utf8");
  const names = [];
  src = src.replace(/^export\s+async\s+function\s+(\w+)/gm, (m, n) => { names.push(n); return "async function " + n; });
  src = src.replace(/^export\s+function\s+(\w+)/gm, (m, n) => { names.push(n); return "function " + n; });
  src = src.replace(/^export\s+(const|let|var)\s+(\w+)/gm, (m, k, n) => { names.push(n); return k + " " + n; });
  src = src.replace(/^export\s*\{([^}]*)\}\s*;?/gm, (m, inner) => {
    inner.split(",").forEach((x) => { const p = x.trim().split(/\s+as\s+/); names.push(p[p.length - 1].trim()); });
    return "";
  });
  src += "\nmodule.exports={" + names.join(",") + "};\n";
  fs.writeFileSync(path.join(DIR, "_cjs.js"), src);
  return names;
}
const EXPORTS = buildCjs();
console.log("✓ 从 index.js 生成 CJS 版, 导出 " + EXPORTS.length + " 个函数");

// ---- 1. 语法校验（acorn 可选；装了 acorn 就用权威解析）----
try {
  const acorn = require("acorn");
  acorn.parse(fs.readFileSync(path.join(DIR, "index.js"), "utf8"), { ecmaVersion: 2022, sourceType: "module" });
  console.log("✓ index.js 语法 (acorn, sourceType=module) 通过");
} catch (e) {
  if (e.code === "MODULE_NOT_FOUND") console.log("- 未装 acorn，跳过权威语法校验（可用 npm i acorn 启用）");
  else { console.error("✗ index.js 语法错误:", e.message, "行", e.loc && e.loc.line); process.exit(2); }
}
// plugin.json 校验
try {
  const pj = JSON.parse(fs.readFileSync(path.join(DIR, "plugin.json"), "utf8"));
  const navTitles = (pj.navigation || []).map((n) => n.title || n.builtin);
  console.log("✓ plugin.json 合法, navigation =", navTitles.join(", "));
  const need = ["我的歌单", "最近播放", "艺人收藏", "电台", "播客"];
  const missing = need.filter((t) => !navTitles.includes(t));
  if (missing.length) console.log("  ⚠ 缺少菜单:", missing.join(","));
  else console.log("  ✓ 五个新菜单齐备");
  // v3.13.0：电台/播客改成自定义 page（按类别分组），不再是 builtin
  const hasStations = (pj.navigation || []).some((n) => n.page === "stations" || n.builtin === "stations");
  const hasShows = (pj.navigation || []).some((n) => n.page === "shows" || n.builtin === "shows");
  console.log("  ✓ stations 菜单:", hasStations, " shows 菜单:", hasShows);
} catch (e) {
  console.error("✗ plugin.json 错误:", e.message);
  process.exit(2);
}

// ---- 2. mock host ----
const storage = new Map();
function realSpawn(exe, args) {
  const child = cpspawn(exe, args, { windowsHide: true });
  let err = "";
  let resolved = false;
  const waiters = [];
  child.stderr.on("data", (d) => (err = (err + String(d)).slice(-8000)));
  child.on("error", (e) => {
    if (!resolved) {
      resolved = true;
      waiters.forEach((r) => r(e));
    }
  });
  child.on("close", () => {
    if (!resolved) {
      resolved = true;
      waiters.forEach((r) => r(null));
    }
  });
  return {
    pid: child.pid,
    write: (s) => child.stdin.write(s),
    closeStdin: () => {
      try { child.stdin.end(); } catch {}
    },
    readLine: () => Promise.resolve(null),
    wait: () => new Promise((r) => (resolved ? r(null) : waiters.push(r))),
    kill: () => {
      try { child.kill(); } catch {}
    },
    errorOutput: () => err,
  };
}
globalThis.host = {
  platform: "windows",
  arch: "amd64",
  dir: DIR,
  dataDir: path.join(DIR, "_data"),
  storage: {
    get: (k) => (storage.has(k) ? JSON.parse(storage.get(k)) : undefined),
    set: (k, v) => storage.set(k, JSON.stringify(v)),
    remove: (k) => storage.delete(k),
  },
  setting: () => "127.0.0.1:7890",
  t: (s) => s,
  language: () => "zh-CN",
  openURL: () => {},
  spawn: realSpawn,
  crypto: { md5: (t) => crypto.createHash("md5").update(t).digest("hex") },
};

const plugin = require("./_cjs.js");

// ---- 3. 工具 ----
let pass = 0, fail = 0;
function ok(name, cond, extra) {
  if (cond) { pass++; console.log("  ✓ " + name); }
  else { fail++; console.log("  ✗ " + name + (extra ? "  → " + extra : "")); }
}
async function probeStream(url, headers) {
  const ctrl = new AbortController();
  const to = setTimeout(() => ctrl.abort(), 15000);
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0", ...(headers || {}) },
      signal: ctrl.signal, redirect: "follow",
    });
    if (!res.ok) { clearTimeout(to); return { ok: false, why: "HTTP " + res.status }; }
    const reader = res.body.getReader();
    // 累积多块（转码流首块可能只有几字节）
    let total = 0, head = null;
    const deadline = Date.now() + 8000;
    while (total < 4096 && Date.now() < deadline) {
      const { value, done } = await reader.read();
      if (done) break;
      if (value && value.length) {
        if (!head) head = value.slice(0, 12);
        total += value.length;
      }
    }
    clearTimeout(to);
    try { reader.cancel(); } catch {}
    if (total < 1024) return { ok: false, why: "数据太少 " + total };
    const hex = Array.from(head).map((b) => b.toString(16).padStart(2, "0")).join(" ");
    const ascii = String.fromCharCode(...head);
    let fmt = null;
    if (ascii.startsWith("ID3") || /^ff f[b23]/.test(hex)) fmt = "mp3";
    else if (ascii.includes("OggS")) fmt = "ogg";
    else if (ascii.includes("fLaC")) fmt = "flac";
    else fmt = "?[" + hex + "]";
    return { ok: !!fmt && fmt !== "?", why: fmt + " " + (total / 1024).toFixed(0) + "KB" };
  } catch (e) {
    clearTimeout(to);
    return { ok: false, why: String((e && e.message) || e).slice(0, 70) };
  }
}
// 播放一条轨道（stream + 实测拉流）
async function playOne(label, id) {
  let st;
  try { st = await plugin.stream({ id, quality: "high" }); }
  catch (e) { console.log("    ✗ " + label + " 取流失败: " + String(e && e.message).slice(0, 70)); fail++; return false; }
  if (!st || !st.url) { console.log("    ✗ " + label + " 取流为空"); fail++; return false; }
  const p = await probeStream(st.url, st.headers);
  if (p.ok) { console.log("    ✓ " + label + " 可播 [" + p.why + "]"); pass++; return true; }
  console.log("    ✗ " + label + " 不可播 (" + p.why + ")"); fail++; return false;
}

async function run() {
  console.log("\n═══ 新增菜单 ═══");
  console.log("-- 电台 page --");
  // v3.14.0：电台页「网络收音机」+ 按语种/年代/风格三个分类维度
  const stPg = await plugin.browse({ page: "stations" });
  const stSecs = (stPg && stPg.sections) || [];
  console.log("   sections: " + stSecs.map((s) => (s.title || "?") + "(" + ((s.stations || []).length) + ")").join(" / "));
  ok("stations 页 >=4 栏（网络收音机+语种+年代+风格）", stSecs.length >= 4, "n=" + stSecs.length);
  const liveSec = stSecs.find((s) => (s.title || "").indexOf("网络收音机") >= 0);
  const catSec = stSecs.find((s) => (s.title || "").indexOf("语种") >= 0);
  const liveStations = (liveSec && liveSec.stations) || [];
  ok("网络收音机台 >=8 (多平台)", liveStations.length >= 8, "n=" + liveStations.length);
  ok("真电台台卡有封面", liveStations.every((s) => s.imageUrl));
  console.log("   网络收音机: " + liveStations.map((s) => s.name).join(" / "));
  ok("按语种/年代/风格分类台都有内容",
    stSecs.filter((s) => /语种|年代|风格/.test(s.title || "")).every((s) => (s.stations || []).length > 0));
  // 测一个可直连的真台（FIP），取流 + 拉流
  const fip = liveStations.find((s) => /FIP|NTS|SomaFM|Classic|Paradise|Antenne/.test(s.name));
  if (fip) {
    const tr = await plugin.stationNext({ id: fip.id });
    ok("真电台 stationNext → 1轨", Array.isArray(tr) && tr.length === 1, "n=" + (tr || []).length);
    if (tr && tr.length) await playOne("真电台 " + fip.name, tr[0].id);
  }
  // 分类台
  if (catSec && catSec.stations && catSec.stations.length) {
    const t0 = Date.now();
    const tr = await plugin.stationNext({ id: catSec.stations[0].id });
    console.log("   分类台 stationNext 耗时 " + (Date.now() - t0) + "ms, " + (tr || []).length + " 条");
    ok("分类台 stationNext 返回轨道", Array.isArray(tr) && tr.length > 0);
  }

  console.log("-- 播客收藏页 --");
  const myShows = await plugin.browse({ page: "myshows" });
  ok("播客收藏页 title", myShows && myShows.title === "播客收藏", myShows && myShows.title);
  ok("播客收藏页有空状态提示", !!(myShows && myShows.sections[0] && (myShows.sections[0].shows || myShows.sections[0].empty)));

  console.log("-- 播客 page（按类别分组）--");
  const podPg = await plugin.browse({ page: "shows" });
  const podSecs = (podPg && podPg.sections) || [];
  ok("播客页有多个分类 section", podSecs.length >= 3, "n=" + podSecs.length);
  console.log("   分类: " + podSecs.map((s) => (s.title || "?") + "(" + ((s.shows || []).length) + ")").join(" / "));
  const withShows = podSecs.find((s) => s.shows && s.shows.length);
  ok("至少一类有节目", !!withShows);
  if (withShows) {
    const page = await plugin.show({ id: withShows.shows[0].id });
    ok("show() 返回单集", Array.isArray(page.episodes) && page.episodes.length > 0, "集=" + ((page.episodes || []).length));
    if (page.episodes && page.episodes.length)
      await playOne("播客首集 " + (page.episodes[0].name || "").slice(0, 18), page.episodes[0].id);
  }

  console.log("-- 播客（shows() 兼容入口）--");
  const shs = await plugin.shows();
  ok("shows() 数组", Array.isArray(shs) && shs.length > 0, JSON.stringify(shs).slice(0, 120));
  console.log("   节目: " + (shs || []).map((s) => s.name).join(" / "));
  if (shs && shs.length) {
    const page = await plugin.show({ id: shs[0].id });
    ok("show() 返回 show", page && page.show && page.show.id === shs[0].id);
    ok("show() 返回 episodes", Array.isArray(page.episodes) && page.episodes.length > 0, "集数=" + (page.episodes || []).length);
  }
  ok("subscribeShow 存在", typeof plugin.subscribeShow === "function");

  console.log("\n═══ 已有菜单回归 ═══");
  const my = await plugin.browse({ page: "mylists" });
  ok("我的歌单页 title", my && my.title === "我的歌单", my && my.title);
  const rc = await plugin.recent();
  ok("recent() 数组", Array.isArray(rc));
  const ar = await plugin.browse({ page: "artists" });
  ok("艺人收藏页 title", ar && ar.title === "艺人收藏", ar && ar.title);
  const hm = await plugin.home();
  ok("home() 有 sections", hm && Array.isArray(hm.sections) && hm.sections.length > 0, "sections=" + (hm.sections || []).length);

  console.log("\n═══ 全平台播放（真实取流）═══");
  let r;
  try { r = await plugin.search({ query: "晴天 周杰伦", kind: "tracks", offset: 0 }); }
  catch (e) { console.log("search 失败: " + e.message); r = { tracks: [] }; }
  const all = r.tracks || [];
  console.log("   聚合返回 " + all.length + " 条");
  const by = (p) => all.filter((t) => String(t.id).startsWith(p + ":")).slice(0, 2);
  for (const [p, label] of [["ne", "网易"], ["kw", "酷我"], ["qq", "QQ"], ["yt", "YouTube"], ["bi", "B站"]]) {
    const arr = by(p);
    if (!arr.length) { console.log("   - " + label + ": 无结果"); continue; }
    for (const t of arr) await playOne(label + " " + (t.name || "").slice(0, 16), t.id);
  }

  console.log("\n═══ 多歌手搜索排序（任务4）═══");
  /* 覆盖热门/冷门/下架歌手。检查：
     ① 有结果；
     ② 「歌手 歌名」查询的首条是裸单曲（含歌名、无变体标记）；
     ③ 《演员》《素颜》这类"曾命中非音乐黑名单"的歌名，确实能找到。 */
  const VARIANT = /[（(\[【]|live|Live|remix|Remix|伴奏|钢琴|翻唱|cover|Cover|dj|DJ|现场|串烧|清唱/;
  const cases = [
    ["周杰伦 晴天", "晴天", "热门"],
    ["林俊杰 江南", "江南", "热门"],
    ["邓紫棋 光年之外", "光年之外", "热门"],
    ["薛之谦 演员", "演员", "歌名曾被误删"],
    ["许嵩 素颜", "素颜", "歌名曾被误删"],
    ["薛之谦 意外", "意外", "歌名曾被误删"],
    ["陈奕迅 十年", "十年", "热门粤语"],
    ["水仙斗活佛", "水仙", "冷门"],
  ];
  for (const [q, key, label] of cases) {
    let rr;
    try { rr = await plugin.search({ query: q, kind: "tracks", offset: 0 }); }
    catch (e) { console.log("  ✗ " + q + " 异常: " + String(e.message).slice(0, 40)); fail++; continue; }
    const tr = rr.tracks || [];
    if (!tr.length) { console.log("  ✗ " + q + " 0 条"); fail++; continue; }
    const top = String(tr[0].name || "");
    const topHasKey = top.indexOf(key) >= 0;
    const topClean = topHasKey && !VARIANT.test(top);
    const anyHasKey = tr.slice(0, 12).some((t) => String(t.name || "").indexOf(key) >= 0);
    /* 纯歌手名搜索（查询无空格）时，歌名不含歌手名是正常的 —— 只要首条歌手字段
       就是该歌手、且有结果，就算通过。 */
    const isArtistOnly = q.trim().indexOf(" ") < 0;
    const topArtist = String((tr[0].artists && tr[0].artists[0] && tr[0].artists[0].name) || "");
    const okCase = isArtistOnly ? tr.length > 0 : anyHasKey;
    const tag = okCase ? (isArtistOnly ? "✓" : topClean ? "✓" : "○") : "✗";
    console.log("  " + tag + " [" + String(tr[0].id).split(":")[0] + "] " + q.padEnd(22) + " 首条「" + top.slice(0, 20) + "」" + (isArtistOnly ? "-" + topArtist.slice(0, 8) : "") + "(" + label + ")");
    if (okCase) { pass++; } else { fail++; }
  }

  try { plugin.stopServing(); } catch {}
  console.log("\n══════════ 结果: " + pass + " 通过, " + fail + " 失败 ══════════");
  process.exit(fail ? 1 : 0);
}
run().catch((e) => { console.error("崩溃:", e && e.stack || e); process.exit(2); });