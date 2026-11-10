const fs=require("fs"),path=require("path"),{spawn:cp}=require("child_process");
let s=fs.readFileSync(path.join(__dirname,"index.js"),"utf8");
s=s.replace(/^export\s+async\s+function\s+/gm,"async function ").replace(/^export\s+function\s+/gm,"function ").replace(/^export\s+const\s+/gm,"const ");
s+="\nmodule.exports={ytBoot,fetchText,YT_ANDROID_UA,YT_ANDROID_VER,YT_SEARCH_PARAMS};\n";
fs.writeFileSync(path.join(__dirname,"_anb.js"),s);
const st=new Map();
function rs(e,a){const c=cp(e,a,{windowsHide:true});let x="",r=false;const w=[];
 c.stderr.on("data",d=>x=(x+String(d)).slice(-8000));c.on("error",q=>{if(!r){r=true;w.forEach(f=>f(q))}});c.on("close",()=>{if(!r){r=true;w.forEach(f=>f(null))}});
 return{pid:c.pid,write:q=>c.stdin.write(q),closeStdin:()=>{try{c.stdin.end()}catch{}},readLine:()=>Promise.resolve(null),wait:()=>new Promise(f=>r?f(null):w.push(f)),kill:()=>{try{c.kill()}catch{}},errorOutput:()=>x};}
globalThis.host={platform:"windows",arch:"amd64",dir:__dirname,dataDir:path.join(__dirname,"_d"),
 storage:{get:k=>st.has(k)?JSON.parse(st.get(k)):undefined,set:(k,v)=>st.set(k,JSON.stringify(v)),remove:k=>st.delete(k)},
 spawn:rs,fetch:(u,o)=>fetch(u,o),log:()=>{},setting:()=>""};
const M=require("./_anb.js");
(async()=>{
  const boot=await M.ytBoot();
  const body={context:{client:{clientName:"ANDROID",clientVersion:M.YT_ANDROID_VER,hl:"zh-CN",gl:"CN",
    userAgent:M.YT_ANDROID_UA,androidSdkVersion:34,clientFormFactor:"SMALL_FORM_FACTOR"}},
    query:"赵薇",params:M.YT_SEARCH_PARAMS};
  const {text}=await M.fetchText("https://www.youtube.com/youtubei/v1/search?key="+boot.key+"&prettyPrint=false",
    {method:"POST",headers:{"Content-Type":"application/json","User-Agent":M.YT_ANDROID_UA,
      "X-YouTube-Client-Name":"3","X-YouTube-Client-Version":M.YT_ANDROID_VER},body:JSON.stringify(body)});
  const kinds={};
  for(const m of text.matchAll(/"(\w+Renderer)":/g)) kinds[m[1]]=(kinds[m[1]]||0)+1;
  console.log("渲染器 Top:",Object.entries(kinds).sort((a,b)=>b[1]-a[1]).slice(0,10).map(([k,v])=>`${k}×${v}`).join("  "));
  console.log("\n含 musicResponsiveListItem:",(text.match(/musicResponsiveListItem/g)||[]).length);
  console.log("含 videoId:",(text.match(/"videoId"/g)||[]).length);
  console.log("含 browseEndpoint:",(text.match(/"browseEndpoint"/g)||[]).length);
  // 找视频条目的样子
  const i=text.indexOf('"videoId"');
  console.log("\nvideoId 上下文:", text.slice(Math.max(0,i-200),i+200));
})().catch(e=>console.log("ERR",e.message));
