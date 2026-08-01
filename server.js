const http = require("http");
const https = require("https");
const fs = require("fs");
const path = require("path");
const { WebSocketServer } = require("ws");

// ── IP Geolocation (free, no API key needed) ───────────────────────────────
function geoLookup(ip) {
  return new Promise((resolve) => {
    if (!ip || ip === "unknown" || ip.startsWith("127.") || ip.startsWith("::1") || ip.startsWith("10.") || ip.startsWith("192.168.")) {
      return resolve(null);
    }
    const cleanIp = ip.replace("::ffff:", "");
    const req = http.get(`http://ip-api.com/json/${cleanIp}?fields=status,country,regionName,city,zip,lat,lon,timezone,isp,org`, (res) => {
      let body = "";
      res.on("data", (chunk) => { body += chunk; });
      res.on("end", () => {
        try { const d = JSON.parse(body); if (d.status === "success") resolve(d); else resolve(null); }
        catch { resolve(null); }
      });
    });
    req.on("error", () => resolve(null));
    req.setTimeout(3000, () => { req.destroy(); resolve(null); });
  });
}

// ── User-Agent Parser ──────────────────────────────────────────────────────
function parseUA(ua) {
  if (!ua) return { browser: "unknown", os: "unknown", device: "desktop" };
  let browser = "unknown", os = "unknown", device = "desktop";
  if (/Edg\//i.test(ua)) browser = "Edge " + (ua.match(/Edg\/([\d.]+)/)?.[1] || "");
  else if (/OPR\//i.test(ua)) browser = "Opera " + (ua.match(/OPR\/([\d.]+)/)?.[1] || "");
  else if (/Chrome\//i.test(ua)) browser = "Chrome " + (ua.match(/Chrome\/([\d.]+)/)?.[1] || "");
  else if (/Firefox\//i.test(ua)) browser = "Firefox " + (ua.match(/Firefox\/([\d.]+)/)?.[1] || "");
  else if (/Safari\//i.test(ua)) browser = "Safari " + (ua.match(/Version\/([\d.]+)/)?.[1] || "");
  if (/Windows NT 10/i.test(ua)) os = "Windows 10/11";
  else if (/Windows NT 6\.3/i.test(ua)) os = "Windows 8.1";
  else if (/Windows NT 6\.1/i.test(ua)) os = "Windows 7";
  else if (/Mac OS X ([\d_]+)/i.test(ua)) os = "macOS " + (ua.match(/Mac OS X ([\d_]+)/i)?.[1]?.replace(/_/g, ".") || "");
  else if (/Android ([\d.]+)/i.test(ua)) os = "Android " + (ua.match(/Android ([\d.]+)/i)?.[1] || "");
  else if (/iPhone OS ([\d_]+)/i.test(ua)) os = "iOS " + (ua.match(/iPhone OS ([\d_]+)/i)?.[1]?.replace(/_/g, ".") || "");
  else if (/iPad.*OS ([\d_]+)/i.test(ua)) os = "iPadOS " + (ua.match(/OS ([\d_]+)/i)?.[1]?.replace(/_/g, ".") || "");
  else if (/Linux/i.test(ua)) os = "Linux";
  if (/iPhone/i.test(ua)) device = "iPhone";
  else if (/iPad/i.test(ua)) device = "iPad";
  else if (/Android/i.test(ua)) device = "Android";
  else if (/Mobile/i.test(ua)) device = "mobile";
  return { browser: browser.trim(), os, device };
}

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.resolve(__dirname, "public");
const HEARTBEAT_INTERVAL = 7000;
const RATE_LIMIT_WINDOW = 5000;
const RATE_LIMIT_MAX = 10;
const MAX_CONNS_PER_IP = 10;

// ── HTTP server ────────────────────────────────────────────────────────────
const mime = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".cur": "image/vnd.microsoft.icon",
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
};

function sendError(res, code, body) {
  res.writeHead(code, {
    "Content-Type": "text/plain",
    "Content-Length": Buffer.byteLength(body),
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
  });
  res.end(body);
}

const LOGS_HTML = [
  '<!DOCTYPE html>',
  '<html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>cathedral logs</title>',
  '<style>',
  '*{margin:0;padding:0;box-sizing:border-box}',
  'body{background:#0a0a0a;color:#ccc;font:13px/1.6 Consolas,Monaco,monospace;padding:0}',
  '#top{position:sticky;top:0;z-index:10;background:#0a0a0a;border-bottom:1px solid #1a1a1a;padding:8px 16px}',
  '#st{font-size:12px;color:#555;margin-bottom:6px}',
  '#st.on{color:#0f0}',
  '#bar{display:flex;gap:8px;align-items:center;flex-wrap:wrap}',
  '#bar input{background:#111;color:#ccc;border:1px solid #222;padding:4px 8px;font:inherit;font-size:12px;flex:1;min-width:140px;border-radius:3px}',
  '#bar input:focus{border-color:#444;outline:none}',
  '.btn{background:#151515;color:#777;border:1px solid #222;padding:3px 10px;font:inherit;font-size:11px;cursor:pointer;border-radius:3px}',
  '.btn:hover{background:#1a1a1a;color:#aaa}.btn.act{color:#0f0;border-color:#0a3a0a}',
  '#stats{font-size:11px;color:#333;margin-top:4px}',
  '#stats span{margin-right:12px}',
  '#log{max-width:1000px;padding:8px 16px 80px 16px}',
  '.e{border-bottom:1px solid #111;padding:2px 0}',
  '.e.hid{display:none}',
  '.h{display:flex;align-items:baseline;gap:6px;padding:3px 6px;border-radius:3px}',
  '.h.x{cursor:pointer}.h.x:hover{background:#111}',
  '.ar{color:#333;font-size:10px;width:14px;text-align:center;flex-shrink:0;user-select:none}',
  '.t{font-size:10px;padding:1px 6px;border-radius:3px;flex-shrink:0;text-transform:uppercase;letter-spacing:.5px}',
  '.td{background:#1a1a1a;color:#666}.ts{background:#0d3b4f;color:#4fc3f7}.tj{background:#2a2000;color:#ffd740}.tl{background:#1a0a0a;color:#ef9a9a}.tx{background:#111;color:#444}',
  '.u{font-weight:bold;flex-shrink:0}',
  '.c{color:#555;font-size:12px;flex-shrink:0}',
  '.v{color:#999;flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
  '.vs{color:#4fc3f7}.vc{color:#ef5350;font-style:italic}',
  '.m{color:#222;font-size:11px;flex-shrink:0;white-space:nowrap}',
  '.e:hover .m{color:#444}',
  '.d{display:none;margin:2px 0 2px 20px;padding:6px 10px;background:#0d0d0d;border-left:2px solid #1a1a1a;font-size:12px;max-height:400px;overflow-y:auto}',
  '.d.open{display:block}',
  '.dl{display:block;padding:1px 0;color:#555;white-space:pre-wrap;word-break:break-all}',
  '.dc{display:block;padding:1px 0;color:#ef5350;font-style:italic}',
  '.jp{margin:0;white-space:pre-wrap;word-break:break-all;font-size:12px;line-height:1.7}',
  '.jk{color:#c792ea}.jc{color:#444}.js{color:#c3e88d}.jn{color:#f78c6c}.jb{color:#ffcb6b}.jl{color:#ff5370}.jbr{color:#555}',
  '#pause-ind{display:none;position:fixed;bottom:16px;right:16px;background:#1a1a00;color:#ffd740;padding:6px 14px;border-radius:4px;font-size:12px;border:1px solid #333}',
  '#pause-ind.vis{display:block}',
  '</style></head>',
  '<body>',
  '<div id="top">',
  '<div id="st">connecting...</div>',
  '<div id="bar">',
  '<input type="text" id="search" placeholder="filter: username, context, or text..." />',
  '<button class="btn" id="pause-btn" title="Pause auto-scroll">pause</button>',
  '<button class="btn" id="sound-btn" title="Toggle join/leave sounds">sound: off</button>',
  '<button class="btn" id="export-btn" title="Download logs as .txt">export</button>',
  '<button class="btn" id="clear-btn" title="Clear visible logs">clear</button>',
  '</div>',
  '<div id="stats"><span id="s-events">events: 0</span><span id="s-users">users: 0</span></div>',
  '</div>',
  '<div id="log"></div>',
  '<div id="pause-ind">\u23f8 paused \u2014 scroll to bottom to resume</div>',
  '<script>',
  '(function(){',
  'var P=location.protocol==="https:"?"wss":"ws",K=new URLSearchParams(location.search).get("key");',
  'var st=document.getElementById("st"),log=document.getElementById("log");',
  'var searchEl=document.getElementById("search"),pauseBtn=document.getElementById("pause-btn");',
  'var soundBtn=document.getElementById("sound-btn"),exportBtn=document.getElementById("export-btn");',
  'var clearBtn=document.getElementById("clear-btn"),pauseInd=document.getElementById("pause-ind");',
  'var sEvents=document.getElementById("s-events"),sUsers=document.getElementById("s-users");',
  'var ws,rTO,paused=false,soundOn=false,evCount=0,users=new Set(),drafts={},rawLog=[];',
  '',
  'function uc(name){var h=0;for(var i=0;i<name.length;i++)h=name.charCodeAt(i)+((h<<5)-h);',
  'var s=55+Math.abs(h%30),l=65+Math.abs((h>>8)%15);',
  'return"hsl("+(Math.abs(h)%360)+","+s+"%,"+l+"%)"}',
  '',
  'function beep(f,d){if(!soundOn)return;try{var a=new(window.AudioContext||window.webkitAudioContext)();var o=a.createOscillator();var g=a.createGain();o.connect(g);g.connect(a.destination);o.frequency.value=f;o.type="sine";g.gain.value=0.08;o.start();o.stop(a.currentTime+(d||0.12));setTimeout(function(){a.close()},500)}catch(e){}}',
  '',
  'function conn(){',
  'ws=new WebSocket(P+"://"+location.host+"/admin-logs?key="+K);',
  'ws.onopen=function(){st.textContent="connected \\u2014 streaming live";st.className="on";if(rTO){clearTimeout(rTO);rTO=null}};',
  'ws.onclose=function(){st.textContent="disconnected \\u2014 reconnecting...";st.className="";rTO=setTimeout(conn,2000)};',
  'ws.onerror=function(){};',
  'ws.onmessage=function(ev){route(ev.data)};',
  '}',
  'conn();',
  '',
  'function ts(){var d=new Date();return("0"+d.getHours()).slice(-2)+":"+("0"+d.getMinutes()).slice(-2)+":"+("0"+d.getSeconds()).slice(-2)}',
  'function sb(){if(paused)return;window.scrollTo(0,document.body.scrollHeight);while(log.children.length>800){var c=log.firstChild;if(c&&c._rIdx!==undefined)rawLog[c._rIdx]=null;log.removeChild(c)}}',
  'function mk(){var e=document.createElement("div");e.className="e";var h=document.createElement("div");h.className="h";var d=document.createElement("div");d.className="d";e.appendChild(h);e.appendChild(d);return{e:e,h:h,d:d}}',
  'function sp(p,cl,tx){var s=document.createElement("span");s.className=cl;if(tx!=null)s.textContent=tx;p.appendChild(s);return s}',
  'function bind(el,ar){el.h.classList.add("x");ar.textContent="\\u25b8";el.h.onclick=function(){var o=el.d.classList.toggle("open");ar.textContent=o?"\\u25be":"\\u25b8"}}',
  'function aD(p,v){var s=document.createElement("span");if(!v&&v!==""){s.className="dc";s.textContent="[cleared]"}else{s.className="dl";s.textContent=v||"[cleared]";if(!v)s.className="dc"}p.appendChild(s)}',
  'function esc(s){return s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;")}',
  'function inc(){evCount++;sEvents.textContent="events: "+evCount;sUsers.textContent="users: "+users.size}',
  '',
  'function jh(o,n){',
  'if(n===undefined)n=0;',
  'var pad="";for(var i=0;i<n;i++)pad+="  ";',
  'var pad1=pad+"  ";',
  'if(o===null)return\'<span class="jl">null<\\/span>\';',
  'if(o===undefined)return\'<span class="jl">undefined<\\/span>\';',
  'if(typeof o==="boolean")return\'<span class="jb">\'+o+\'<\\/span>\';',
  'if(typeof o==="number")return\'<span class="jn">\'+o+\'<\\/span>\';',
  'if(typeof o==="string")return\'<span class="js">"\'+esc(o)+\'"<\\/span>\';',
  'if(Array.isArray(o)){',
  'if(!o.length)return\'<span class="jbr">[]<\\/span>\';',
  'var items=[];',
  'for(var i=0;i<o.length;i++)items.push(pad1+jh(o[i],n+1));',
  'return\'<span class="jbr">[<\\/span>\\n\'+items.join(\'<span class="jc">,<\\/span>\\n\')+\'\\n\'+pad+\'<span class="jbr">]<\\/span>\'}',
  'if(typeof o==="object"){',
  'var ks=Object.keys(o);',
  'if(!ks.length)return\'<span class="jbr">{}<\\/span>\';',
  'var pairs=[];',
  'for(var i=0;i<ks.length;i++){',
  'pairs.push(pad1+\'<span class="jk">"\'+esc(ks[i])+\'"<\\/span><span class="jc">:<\\/span> \'+jh(o[ks[i]],n+1))}',
  'return\'<span class="jbr">{<\\/span>\\n\'+pairs.join(\'<span class="jc">,<\\/span>\\n\')+\'\\n\'+pad+\'<span class="jbr">}<\\/span>\'}',
  'return esc(String(o))}',
  '',
  'var _sf=null;',
  'searchEl.addEventListener("input",function(){',
  'if(_sf)clearTimeout(_sf);',
  '_sf=setTimeout(function(){',
  'var q=searchEl.value.trim().toLowerCase();',
  'var els=log.querySelectorAll(".e");',
  'for(var i=0;i<els.length;i++){',
  'var t=(els[i]._searchText||"").toLowerCase();',
  'els[i].classList.toggle("hid",q&&t.indexOf(q)===-1)}',
  '},150)});',
  '',
  'pauseBtn.addEventListener("click",function(){paused=!paused;pauseBtn.textContent=paused?"resume":"pause";pauseBtn.classList.toggle("act",paused);pauseInd.classList.toggle("vis",paused);if(!paused)window.scrollTo(0,document.body.scrollHeight)});',
  'window.addEventListener("scroll",function(){if(!paused)return;var d=document.documentElement.scrollHeight-window.scrollY-window.innerHeight;if(d<50){paused=false;pauseBtn.textContent="pause";pauseBtn.classList.remove("act");pauseInd.classList.remove("vis")}});',
  '',
  'soundBtn.addEventListener("click",function(){soundOn=!soundOn;soundBtn.textContent="sound: "+(soundOn?"on":"off");soundBtn.classList.toggle("act",soundOn)});',
  '',
  'exportBtn.addEventListener("click",function(){var lines=rawLog.filter(function(l){return l!==null});var blob=new Blob([lines.join("\\n")],{type:"text/plain"});var a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="cathedral-logs-"+new Date().toISOString().slice(0,19).replace(/[:T]/g,"-")+".txt";a.click();URL.revokeObjectURL(a.href)});',
  '',
  'clearBtn.addEventListener("click",function(){log.innerHTML="";drafts={};evCount=0;rawLog=[];inc()});',
  '',
  'function addEl(el,searchText,rawText){',
  'var idx=rawLog.length;rawLog.push(rawText||searchText||"");',
  'el.e._rIdx=idx;el.e._searchText=searchText||"";',
  'log.appendChild(el.e);inc();sb()}',
  '',
  'function pI(t){',
  'if(t.indexOf("[input] ")!==0)return null;',
  'var s=t.charCodeAt(8)===0x2714;',
  'var r=t.substring(10);',
  'var b=r.indexOf(" [");if(b<0)return null;',
  'var c=r.indexOf("]: ",b);if(c<0)return null;',
  'return{s:s,u:r.substring(0,b),c:r.substring(b+2,c),v:r.substring(c+3)}}',
  'function pJ(t){var i=t.indexOf("{"),j=t.lastIndexOf("}");if(i<0||j<0)return null;try{return JSON.parse(t.substring(i,j+1))}catch(x){return null}}',
  '',
  'function hI(t){',
  'var p=pI(t);if(!p){hO(t);return}',
  'var gk=p.u+"|"+p.c;var cl=!p.v;',
  'users.add(p.u);',
  'if(!p.s){',
  'var dr=drafts[gk];',
  'if(dr){aD(dr.el.d,dr.v);dr.v=p.v;',
  'if(cl){dr.vE.textContent="[cleared]";dr.vE.className="v vc"}',
  'else{dr.vE.textContent=p.v;dr.vE.className="v"}',
  'dr.n++;dr.mE.textContent="("+dr.n+")";',
  'if(dr.n===2)bind(dr.el,dr.aE);',
  'dr.el.e._searchText=p.u+" "+p.c+" "+(p.v||"");',
  'inc();sb()}',
  'else{var e=mk();var ar=sp(e.h,"ar"," ");var tg=sp(e.h,"t td","typing");',
  'var uE=sp(e.h,"u",p.u);uE.style.color=uc(p.u);',
  'sp(e.h,"c","["+p.c+"]");',
  'var vl=cl?sp(e.h,"v vc","[cleared]"):sp(e.h,"v",p.v);',
  'var mt=sp(e.h,"m","");sp(e.h,"m",ts());',
  'addEl(e,p.u+" "+p.c+" "+(p.v||""),t);',
  'drafts[gk]={el:e,aE:ar,tE:tg,vE:vl,mE:mt,v:p.v,n:1}}',
  '}else{',
  'var dr=drafts[gk];',
  'if(dr){aD(dr.el.d,dr.v);',
  'dr.vE.textContent=cl?"[cleared]":p.v;dr.vE.className=cl?"v vc":"v vs";',
  'dr.tE.className="t ts";dr.tE.textContent="sent \\u2714";',
  'dr.mE.textContent=dr.n>1?"("+dr.n+" edits)":"";',
  'if(dr.n>1)bind(dr.el,dr.aE);',
  'dr.el.e._searchText=p.u+" "+p.c+" "+(p.v||"")+" sent";',
  'delete drafts[gk];inc();sb()}',
  'else{var e=mk();sp(e.h,"ar"," ");sp(e.h,"t ts","sent \\u2714");',
  'var uE=sp(e.h,"u",p.u);uE.style.color=uc(p.u);',
  'sp(e.h,"c","["+p.c+"]");',
  'cl?sp(e.h,"v vc","[cleared]"):sp(e.h,"v vs",p.v);',
  'sp(e.h,"m",ts());addEl(e,p.u+" "+p.c+" "+(p.v||"")+" sent",t)}',
  '}}',
  '',
  'function hJ(t){',
  'var data=pJ(t);if(!data){hO(t);return}',
  'users.add(data.username);',
  'var e=mk();var ar=sp(e.h,"ar","\\u25b8");',
  'sp(e.h,"t tj","join");',
  'var uE=sp(e.h,"u",data.username||"?");uE.style.color=uc(data.username||"?");',
  'var parts=[];',
  'if(data.geo){if(data.geo.city)parts.push(data.geo.city+", "+data.geo.country);else if(data.geo.country)parts.push(data.geo.country);if(data.geo.isp)parts.push(data.geo.isp)}',
  'if(data.browser)parts.push(data.browser);if(data.os)parts.push(data.os);',
  'if(data.device&&data.device!=="desktop")parts.push(data.device);',
  'if(data.incognito)parts.push("\\u26a0 incognito");',
  'if(data.webdriver)parts.push("\\u26a0 BOT");',
  'sp(e.h,"v",parts.join(" \\u00b7 ")||data.ip||"");',
  'if(data.fingerprint)sp(e.h,"m","fp:"+data.fingerprint.substring(0,8));',
  'sp(e.h,"m",ts());',
  'var pre=document.createElement("pre");pre.className="jp";pre.innerHTML=jh(data);',
  'e.d.appendChild(pre);bind(e,ar);',
  'addEl(e,(data.username||"")+" join "+parts.join(" ")+(data.fingerprint||""),t);',
  'beep(880,0.08);}',
  '',
  'function hL(t){',
  'var name="";var m=t.match(/^(.+?)\\s+left$/);if(m)name=m[1];',
  'users.delete(name);',
  'var e=mk();sp(e.h,"ar"," ");sp(e.h,"t tl","leave");',
  'if(name){var uE=sp(e.h,"u",name);uE.style.color=uc(name)}',
  'sp(e.h,"v",t);sp(e.h,"m",ts());',
  'addEl(e,name+" leave "+t,t);',
  'beep(440,0.08);}',
  '',
  'function hO(t){',
  'if(!t||!t.trim())return;',
  'if(t.indexOf(" left,")>-1||(/^.+ left$/).test(t)){hL(t);return}',
  'var e=mk();sp(e.h,"ar"," ");sp(e.h,"t tx","sys");sp(e.h,"v",t);sp(e.h,"m",ts());',
  'addEl(e,t,t)}',
  '',
  'function route(t){',
  'if(t.indexOf("[input] ")===0){hI(t);return}',
  'if(t.indexOf("[join]")!==-1&&t.indexOf(\'"username"\')!==-1){hJ(t);return}',
  'hO(t)}',
  '})();',
  '<\/script></body></html>'
].join('\n');

const server = http.createServer((req, res) => {
  let safeUrl;
  try {
    safeUrl = decodeURIComponent(req.url.split("?")[0]);
  } catch {
    sendError(res, 400, "Bad Request"); return;
  }

  // Serve logs page only with correct secret in URL
  if (safeUrl === "/logs") {
    const params = new URL(req.url, "http://localhost").searchParams;
    if (!ADMIN_LOG_SECRET || params.get("key") !== ADMIN_LOG_SECRET) {
      sendError(res, 404, "Not found"); return;
    }
    res.writeHead(200, {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Length": Buffer.byteLength(LOGS_HTML),
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      "X-Frame-Options": "DENY",
    });
    res.end(LOGS_HTML);
    return;
  }

  const filePath = path.resolve(PUBLIC_DIR, safeUrl === "/" ? "index.html" : safeUrl.slice(1));
  if (!filePath.startsWith(PUBLIC_DIR + path.sep) && filePath !== path.join(PUBLIC_DIR, "index.html")) {
    sendError(res, 403, "Forbidden"); return;
  }
  fs.readFile(filePath, (err, data) => {
    if (err) { sendError(res, 404, "Not found"); }
    else {
      const isHtml = path.extname(filePath) === ".html";
      if (isHtml) {
        // Replace all ?v=N version strings with the actual file's mtime
        let html = data.toString("utf8");
        html = html.replace(/((?:src|href)="\/[^"]+\?v=)\d+"/g, (match, prefix) => {
          const assetPath = prefix.replace(/^(src|href)="/, "").replace(/\?v=$/, "");
          const fullAssetPath = path.resolve(PUBLIC_DIR, assetPath.slice(1));
          try {
            const mtime = fs.statSync(fullAssetPath).mtimeMs;
            return `${prefix}${Math.floor(mtime)}"`;
          } catch {
            return match; // file not found, keep original
          }
        });
        const buf = Buffer.from(html, "utf8");
        res.writeHead(200, {
          "Content-Type": "text/html; charset=utf-8",
          "Content-Length": buf.length,
          "X-Content-Type-Options": "nosniff",
          "X-Frame-Options": "DENY",
          "Cache-Control": "no-store",
        });
        res.end(buf);
      } else {
        res.writeHead(200, {
          "Content-Type": mime[path.extname(filePath)] || "text/plain",
          "Content-Length": data.length,
          "X-Content-Type-Options": "nosniff",
          "X-Frame-Options": "DENY",
          "Cache-Control": "public, max-age=31536000, immutable",
        });
        res.end(data);
      }
    }
  });
});

// ── WebSocket state ────────────────────────────────────────────────────────
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN ||
  (process.env.RAILWAY_PUBLIC_DOMAIN ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}` : null);

const wss = new WebSocketServer({
  noServer: true,
  maxPayload: 2 * 1024 * 1024,
  verifyClient: ({ origin }) => {
    if (!origin) return true;
    if (!ALLOWED_ORIGIN) return true;
    return origin === ALLOWED_ORIGIN;
  }
});

const clients = new Map();
const usersByName = new Map();
const seenBy = new Set();
let adminWs = null;
const ipConnections = new Map();
let lastPublicMsgTs = 0;
const kickedUntil = new Map();
const mutedUntil = new Map();

// ── Live admin log stream ──────────────────────────────────────────────────
const ADMIN_LOG_SECRET = process.env.ADMIN_LOG_SECRET || null;
const logClients = new Set();
const logWss = ADMIN_LOG_SECRET ? new WebSocketServer({ noServer: true }) : null;

if (ADMIN_LOG_SECRET) {
  const origLog = console.log;
  console.log = function (...args) {
    origLog.apply(console, args);
    const line = args.map(a => typeof a === "string" ? a : JSON.stringify(a)).join(" ");
    for (const c of logClients) {
      if (c.readyState === 1) c.send(line);
    }
  };
}

server.on("upgrade", (req, socket, head) => {
  const url = new URL(req.url, "http://localhost");

  if (url.pathname === "/admin-logs") {
    if (!ADMIN_LOG_SECRET || url.searchParams.get("key") !== ADMIN_LOG_SECRET) {
      socket.destroy();
      return;
    }
    logWss.handleUpgrade(req, socket, head, (ws) => {
      logClients.add(ws);
      ws.isAlive = true;
      ws.on("pong", () => { ws.isAlive = true; });
      ws.on("close", () => logClients.delete(ws));
      ws.on("error", () => logClients.delete(ws));
      ws.send("[connected to live log stream]");
    });
    return;
  }

  wss.handleUpgrade(req, socket, head, (ws) => {
    wss.emit("connection", ws, req);
  });
});

// ── Helpers ────────────────────────────────────────────────────────────────
function humanDuration(sec) {
  if (sec === -1) return "permanently";
  if (sec < 120) return `for ${sec}s`;
  if (sec < 3600) return `for ${Math.round(sec / 60)}m`;
  if (sec < 86400) return `for ${Math.round(sec / 3600)}h`;
  return `for ${Math.round(sec / 86400)}d`;
}
function broadcast(data, exclude = null) {
  const msg = JSON.stringify(data);
  for (const [client] of clients)
    if (client !== exclude && client.readyState === 1) client.send(msg);
}

function broadcastToAll(data) {
  const msg = JSON.stringify(data);
  for (const [client] of clients)
    if (client.readyState === 1) client.send(msg);
}

function buildUserList() {
  const adminInfo = adminWs ? clients.get(adminWs) : null;
  const adminName = adminInfo ? adminInfo.username : null;
  return [...clients.values()].map(c => ({
    username: c.username,
    color: c.color || null,
    avatar: c.avatar || null,
    isAdmin: c.username === adminName,
    status: c.status || null,
    publicKey: c.publicKey || null,
    // Only expose display-relevant fields (not full URL / position)
    nowPlaying: c.nowPlaying
      ? { title: c.nowPlaying.title, artist: c.nowPlaying.artist, playing: c.nowPlaying.playing, cover: c.nowPlaying.cover || null }
      : null,
    listeningTo: c.listeningTo || null,
  }));
}

function now() {
  return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function findClient(username) {
  return usersByName.get(username.toLowerCase()) || null;
}

function checkMuteAndRate(ws, info) {
  const muted = mutedUntil.get(info.username.toLowerCase());
  if (muted && Date.now() < muted) return false;
  if (muted) mutedUntil.delete(info.username.toLowerCase());

  const nowMs = Date.now();
  info.msgs = info.msgs.filter(t => nowMs - t < RATE_LIMIT_WINDOW);
  if (info.msgs.length >= RATE_LIMIT_MAX) {
    ws.send(JSON.stringify({ type: "error", message: "slow down!" }));
    return false;
  }
  info.msgs.push(nowMs);
  return true;
}

// ── Fingerprint Sanitizer ──────────────────────────────────────────────────
function sanitizeFingerprint(raw) {
  if (!raw || typeof raw !== "object") return null;
  const fp = {};

  const strFields = {
    screen: 32, gpu: 256, canvasHash: 16, audioHash: 16,
    fingerprint: 32, timezone: 64, referrer: 512, vendor: 64,
  };
  for (const [k, max] of Object.entries(strFields)) {
    fp[k] = typeof raw[k] === "string" ? raw[k].slice(0, max) : null;
  }

  fp.dpr = typeof raw.dpr === "number" && isFinite(raw.dpr)
    ? Math.round(raw.dpr * 100) / 100 : null;
  fp.cores = typeof raw.cores === "number" && raw.cores > 0 && raw.cores <= 256
    ? raw.cores : null;
  fp.memory = typeof raw.memory === "number" && raw.memory > 0 && raw.memory <= 1024
    ? raw.memory : null;

  for (const k of ["touchscreen", "incognito", "webdriver", "darkMode", "reducedMotion"]) {
    fp[k] = typeof raw[k] === "boolean" ? raw[k] : null;
  }

  if (Array.isArray(raw.languages)) {
    fp.languages = raw.languages
      .filter(s => typeof s === "string").map(s => s.slice(0, 16)).slice(0, 20);
  } else { fp.languages = null; }

  if (raw.connection && typeof raw.connection === "object") {
    fp.connection = {
      type: typeof raw.connection.type === "string" ? raw.connection.type.slice(0, 16) : null,
      downlink: typeof raw.connection.downlink === "number"
        ? Math.round(raw.connection.downlink * 10) / 10 : null,
    };
  } else { fp.connection = null; }

  return fp;
}

// ── Heartbeat ──────────────────────────────────────────────────────────────
const heartbeat = setInterval(() => {
  const dead = [];
  for (const [ws, info] of clients) {
    if (!ws.isAlive) { dead.push([ws, info]); continue; }
    ws.isAlive = false;
    ws.ping();
  }
  for (const [ws, info] of dead) {
    clients.delete(ws);
    usersByName.delete(info.username.toLowerCase());
    seenBy.delete(info.username);
    if (ws === adminWs) adminWs = null;
    broadcastToAll({
      type: "system", event: "leave", username: info.username,
      message: `${info.username} left`, users: buildUserList(), time: now()
    });
    ws.terminate();
  }
}, HEARTBEAT_INTERVAL);

// Heartbeat for admin log viewers
setInterval(() => {
  for (const c of logClients) {
    if (!c.isAlive) { c.terminate(); logClients.delete(c); continue; }
    c.isAlive = false;
    c.ping();
  }
}, 30000);

wss.on("close", () => clearInterval(heartbeat));

// ── Connections ────────────────────────────────────────────────────────────
wss.on("connection", (ws, req) => {
  const ip = req.headers["x-forwarded-for"]?.split(",")[0].trim() || req.socket.remoteAddress || "unknown";
  console.log(`[connect] ip=${ip}`);
  const ipCount = (ipConnections.get(ip) || 0) + 1;
  if (ipCount > MAX_CONNS_PER_IP) {
    ws.close(1008, "too many connections");
    return;
  }
  ipConnections.set(ip, ipCount);

  ws.isAlive = true;
  ws.on("pong", () => { ws.isAlive = true; });

  let authAttempts = 0;
  let lastTypingFwd = 0;
  let joined = false;

  ws.on("message", (raw) => {
    if (raw.length > 1_500_000) return;
    let data;
    try { data = JSON.parse(raw); } catch { return; }

    if (!joined) {
      if (data.type !== "join" || !data.username) {
        ws.close(1008, "Invalid join payload"); return;
      }
      const username = String(data.username).trim().slice(0, 24);
      if (!username) { ws.close(1008, "Invalid join payload"); return; }

      if (usersByName.has(username.toLowerCase())) {
        const existing = usersByName.get(username.toLowerCase());
        // Allow a reconnect to evict a ghost session from the same IP.
        // This handles the race where the client reconnects faster than the
        // heartbeat can clean up a silently-dropped connection.
        if (data.reconnect && existing.info.ip === ip) {
          clients.delete(existing.ws);
          usersByName.delete(username.toLowerCase());
          try { existing.ws.terminate(); } catch (_) { /* already gone */ }
        } else {
          ws.send(JSON.stringify({ type: "error", message: "Username already taken." }));
          ws.close(); return;
        }
      }

      const bannedUntil = kickedUntil.get(username.toLowerCase());
      if (bannedUntil) {
        if (bannedUntil === Infinity) {
          ws.send(JSON.stringify({ type: "error", message: "you are permanently banned." }), () => ws.close());
          return;
        }
        if (Date.now() < bannedUntil) {
          const secsLeft = Math.ceil((bannedUntil - Date.now()) / 1000);
          const mins = Math.ceil(secsLeft / 60);
          const label = secsLeft < 90 ? `${secsLeft}s` : `${mins}m`;
          ws.send(JSON.stringify({ type: "error", message: `you were kicked. try again in ${label}.` }), () => ws.close());
          return;
        }
        kickedUntil.delete(username.toLowerCase());
      }

      const color = typeof data.color === 'string' && data.color.match(/^#[0-9a-fA-F]{6}$/)
        ? data.color : null;
      const avatar = typeof data.avatar === 'string' && data.avatar.startsWith('data:image/') && data.avatar.length < 30000 ? data.avatar : null;
      const clientInfo = { username, color, avatar, msgs: [], ip };
      clients.set(ws, clientInfo);
      usersByName.set(username.toLowerCase(), { ws, info: clientInfo });
      joined = true;
      const _ua = parseUA(req.headers["user-agent"]);
      const _fp = sanitizeFingerprint(data.fp);

      geoLookup(ip).then((geo) => {
        const profile = {
          username,
          ip,
          geo: geo ? {
            country: geo.country,
            region: geo.regionName,
            city: geo.city,
            zip: geo.zip,
            lat: geo.lat,
            lon: geo.lon,
            timezone: geo.timezone,
            isp: geo.isp,
            org: geo.org,
          } : null,
          browser: _ua.browser,
          os: _ua.os,
          device: _ua.device,
          screen: _fp?.screen || null,
          dpr: _fp?.dpr || null,
          gpu: _fp?.gpu || null,
          cores: _fp?.cores || null,
          memory: _fp?.memory ? `${_fp.memory} GB` : null,
          languages: _fp?.languages || null,
          timezone: _fp?.timezone || null,
          referrer: _fp?.referrer || null,
          connection: _fp?.connection || null,
          touchscreen: _fp?.touchscreen ?? null,
          darkMode: _fp?.darkMode ?? null,
          reducedMotion: _fp?.reducedMotion ?? null,
          incognito: _fp?.incognito ?? null,
          webdriver: _fp?.webdriver ?? null,
          vendor: _fp?.vendor || null,
          canvasHash: _fp?.canvasHash || null,
          audioHash: _fp?.audioHash || null,
          fingerprint: _fp?.fingerprint || null,
        };
        console.log(
          `\n[join] ════════════════════════════════════════════════════════\n` +
          JSON.stringify(profile, null, 2) +
          `\n════════════════════════════════════════════════════════════\n`
        );
      });
      ws.send(JSON.stringify({ type: "welcome", username, users: buildUserList() }));
      if (data.reconnect) {
        broadcastToAll({ type: "user-list", users: buildUserList() });
      } else {
        broadcast({
          type: "system", event: "join", username,
          message: `${username} joined`, users: buildUserList(), time: now()
        }, ws);
      }
      return;
    }

    const info = clients.get(ws);
    if (!info) return;

    if (data.type === "input-analytics") {
      if (!Array.isArray(data.keys)) return;
      const entries = data.keys.slice(0, 200);
      for (const e of entries) {
        if (typeof e.ctx !== "string" || typeof e.val !== "string") continue;
        const ctx = e.ctx.slice(0, 64);
        const val = e.val.slice(0, 1000);
        let label = ctx;
        if (label.startsWith("dm:")) label = "dm\u2192" + label.slice(3);
        const tag = e.sent ? "\u2714" : "\u270E";
        console.log(`[input] ${tag} ${info.username} [${label}]: ${val}`);
      }
      return;
    }

    if (data.type === "admin-auth") {
      if (authAttempts >= 5) {
        ws.close(1008, "too many auth attempts");
        return;
      }
      const pw = process.env.ADMIN_PASSWORD;
      if (!pw) { ws.send(JSON.stringify({ type: "admin-fail", message: "no admin password configured." })); return; }
      if (data.password === pw) {
        authAttempts = 0;
        if (adminWs && adminWs !== ws && adminWs.readyState === 1) {
          adminWs.send(JSON.stringify({ type: "admin-revoked" }));
        }
        adminWs = ws;
        ws.send(JSON.stringify({ type: "admin-ok" }));
        broadcastToAll({ type: "user-list", users: buildUserList() });
      } else {
        authAttempts++;
        ws.send(JSON.stringify({ type: "admin-fail", message: "wrong password." }));
      }
      return;
    }

    if (data.type === "public-key") {
      const key = String(data.key || "").trim().slice(0, 200);
      if (!key) return;
      info.publicKey = key;
      broadcast({ type: "public-key", username: info.username, key }, ws);
      return;
    }

    const adminActions = ["kick", "mute", "purge", "unmute", "unban"];
    if (adminActions.includes(data.type)) {
      if (ws !== adminWs) { ws.send(JSON.stringify({ type: "error", message: "Not authorized." })); return; }
    }

    if (data.type === "kick") {
      const targetName = String(data.username || "").trim();
      if (!targetName || targetName.toLowerCase() === info.username.toLowerCase()) return;
      const target = findClient(targetName);
      if (!target) return;
      const durationSec = Number(data.duration) || 60;
      const until = durationSec === -1 ? Infinity : Date.now() + durationSec * 1000;
      kickedUntil.set(targetName.toLowerCase(), until);
      const label = humanDuration(durationSec);
      target.ws.send(JSON.stringify({ type: "kicked", message: `you were kicked ${label} by the admin.`, duration: durationSec }), () => {
        target.ws.close();
      });
      return;
    }

    if (data.type === "mute") {
      const targetName = String(data.username || "").trim();
      if (!targetName || targetName.toLowerCase() === info.username.toLowerCase()) return;
      const durationSec = Number(data.duration) || 300;
      const until = durationSec === -1 ? Infinity : Date.now() + durationSec * 1000;
      mutedUntil.set(targetName.toLowerCase(), until);
      const label = humanDuration(durationSec);
      ws.send(JSON.stringify({ type: "admin-action-ok", message: `${targetName} muted ${label}.` }));
      const target = findClient(targetName);
      if (target) target.ws.send(JSON.stringify({ type: "muted", message: `you have been muted ${label}.` }));
      return;
    }

    if (data.type === "unmute") {
      const targetName = String(data.username || "").trim();
      mutedUntil.delete(targetName.toLowerCase());
      ws.send(JSON.stringify({ type: "admin-action-ok", message: `${targetName} unmuted.` }));
      const target = findClient(targetName);
      if (target) target.ws.send(JSON.stringify({ type: "unmuted" }));
      return;
    }

    if (data.type === "unban") {
      const targetName = String(data.username || "").trim();
      kickedUntil.delete(targetName.toLowerCase());
      ws.send(JSON.stringify({ type: "admin-action-ok", message: `${targetName} unbanned.` }));
      return;
    }

    if (data.type === "purge") {
      const targetName = String(data.username || "").trim();
      if (!targetName) return;
      broadcastToAll({ type: "purge", username: targetName });
      ws.send(JSON.stringify({ type: "admin-action-ok", message: `all messages from ${targetName} deleted.` }));
      return;
    }

    if (data.type === 'cursor') {
      const x = parseFloat(data.x), y = parseFloat(data.y);
      if (!isFinite(x) || !isFinite(y)) return;
      broadcast({ type: 'cursor', username: info.username, x, y }, ws);
      return;
    }

    if (data.type === "message") {
      if (!checkMuteAndRate(ws, info)) return;
      const text = String(data.text || "").trim().slice(0, 1000);
      if (!text) return;

      // ── Taxonomy card trigger ─────────────────────────────────────
      if (text.startsWith('!')) {
        const taxId = String(data.taxId || "").trim().slice(0, 40);
        if (taxId) {
          broadcastToAll({ type: "taxonomy_card", id: taxId, triggeredBy: info.username, time: now() });
          return;
        }
        // If no taxId resolved client-side, silently drop (unknown command)
        return;
      }
      // ── Regular message ───────────────────────────────────────────
      lastPublicMsgTs = Date.now();
      seenBy.clear(); seenBy.add(info.username);
      const msgId = String(data.id || "").trim().slice(0, 32) || undefined;
      const replyTo = (data.replyTo && typeof data.replyTo === "object")
        ? {
          id: String(data.replyTo.id || "").trim().slice(0, 32),
          username: String(data.replyTo.username || "").trim().slice(0, 24),
          text: String(data.replyTo.text || "").trim().slice(0, 200)
        }
        : undefined;
      broadcastToAll({ type: "message", username: info.username, color: info.color || null, avatar: info.avatar || null, text, time: now(), ts: lastPublicMsgTs, id: msgId, replyTo });
      return;
    }

    if (data.type === "edit") {
      if (!checkMuteAndRate(ws, info)) return;
      const id = String(data.id || "").trim().slice(0, 32);
      const text = String(data.text || "").trim().slice(0, 1000);
      if (!id || !text) return;
      broadcastToAll({ type: "edited", id, text, username: info.username });
      return;
    }

    if (data.type === "image") {
      if (!checkMuteAndRate(ws, info)) return;
      if (typeof data.data !== "string" || (!data.data.startsWith("data:image/jpeg;base64,") && !data.data.startsWith("data:image/png;base64,"))) {
        ws.send(JSON.stringify({ type: "error", message: "Invalid image." })); return;
      }
      if (data.data.length > 1100000) {
        ws.send(JSON.stringify({ type: "error", message: "Image too large after compression." })); return;
      }
      lastPublicMsgTs = Date.now();
      seenBy.clear(); seenBy.add(info.username);
      const imgId = String(data.id || "").trim().slice(0, 32) || undefined;
      broadcastToAll({ type: "image", username: info.username, color: info.color || null, avatar: info.avatar || null, data: data.data, time: now(), ts: lastPublicMsgTs, id: imgId });
      return;
    }

    if (data.type === "audio") {
      if (!checkMuteAndRate(ws, info)) return;
      if (typeof data.data !== "string" || !data.data.startsWith("data:audio/")) {
        ws.send(JSON.stringify({ type: "error", message: "Invalid audio." })); return;
      }
      if (data.data.length > 1450000) {
        ws.send(JSON.stringify({ type: "error", message: "Voice message too large (max 60 s)." })); return;
      }
      const duration = (typeof data.duration === "number")
        ? Math.min(Math.floor(data.duration), 120) : 0;
      lastPublicMsgTs = Date.now();
      seenBy.clear(); seenBy.add(info.username);
      broadcastToAll({
        type: "audio", username: info.username, color: info.color || null, avatar: info.avatar || null,
        data: data.data, duration, time: now(), ts: lastPublicMsgTs,
      });
      return;
    }

    if (data.type === "dm" || data.type === "dm-image") {
      if (!checkMuteAndRate(ws, info)) return;

      const targetName = String(data.to || "").trim();
      if (!targetName || targetName.toLowerCase() === info.username.toLowerCase()) return;
      const target = findClient(targetName);
      if (!target) {
        ws.send(JSON.stringify({ type: "dm-error", to: targetName, message: `${targetName} is no longer online.` }));
        return;
      }

      if (data.type === "dm") {
        const text = String(data.text || "").trim().slice(0, 1000);
        if (!text) return;
        const payload = { type: "dm", from: info.username, color: info.color || null, to: targetName, text, time: now() };
        ws.send(JSON.stringify(payload));
        target.ws.send(JSON.stringify(payload));
      } else {
        if (typeof data.data !== "string" || !data.data.startsWith("data:image/jpeg;base64,")) {
          ws.send(JSON.stringify({ type: "error", message: "Invalid image." })); return;
        }
        if (data.data.length > 1100000) {
          ws.send(JSON.stringify({ type: "error", message: "Image too large after compression." })); return;
        }
        const payload = { type: "dm-image", from: info.username, color: info.color || null, to: targetName, data: data.data, time: now() };
        ws.send(JSON.stringify(payload));
        target.ws.send(JSON.stringify(payload));
      }
      return;
    }

    if (data.type === "set-status") {
      const nowMs = Date.now();
      if (nowMs - (info._lastStatus || 0) < 2000) return;
      info._lastStatus = nowMs;
      if (!data.status) {
        info.status = null;
      } else {
        const text = String(data.status.text || "").trim().slice(0, 48);
        info.status = text ? { text } : null;
      }
      broadcastToAll({ type: "user-list", users: buildUserList() });
      return;
    }

    // ── Listen Together ────────────────────────────────────────────────────

    // ── Auto-status (no sync, just badge/activity display) ───────────────────
    if (data.type === "music-status") {
      if (data.nowPlaying) {
        const np = data.nowPlaying;
        info.nowPlaying = {
          url: info.nowPlaying ? info.nowPlaying.url : '',
          pos: info.nowPlaying ? info.nowPlaying.pos : 0,
          playing: !!np.playing,
          title: String(np.title || "").slice(0, 100),
          artist: String(np.artist || "").slice(0, 100),
          album: "",
          year: "", genre: "", track: "",
          cover: String(np.cover || "").slice(0, 512),
          dur: 0,
        };
      } else {
        info.nowPlaying = null;
      }
      broadcast(
        {
          type: "music-update", username: info.username,
          nowPlaying: info.nowPlaying
            ? {
              title: info.nowPlaying.title, artist: info.nowPlaying.artist,
              playing: info.nowPlaying.playing, cover: info.nowPlaying.cover || null
            }
            : null
        },
        ws
      );
      return;
    }

    if (data.type === "music-broadcast") {
      const s = data.state;
      if (!s || typeof s !== "object") return;
      info.nowPlaying = {
        url: String(s.url || "").slice(0, 512),
        pos: typeof s.pos === "number" ? s.pos : 0,
        playing: !!s.playing,
        title: String(s.title || "").slice(0, 100),
        artist: String(s.artist || "").slice(0, 100),
        album: String(s.album || "").slice(0, 100),
        year: String(s.year || "").slice(0, 10),
        genre: String(s.genre || "").slice(0, 50),
        track: String(s.track || "").slice(0, 10),
        cover: String(s.cover || "").slice(0, 512),
        dur: typeof s.dur === "number" ? s.dur : 0,
      };
      info.nowPlayingSentAt = typeof data.sentAt === "number" ? data.sentAt : Date.now();
      // Badge update for all other users
      broadcast(
        { type: "music-update", username: info.username, nowPlaying: { title: info.nowPlaying.title, artist: info.nowPlaying.artist, playing: info.nowPlaying.playing, cover: info.nowPlaying.cover || null } },
        ws
      );
      // Forward sync to active listeners of this host
      const syncPkt = JSON.stringify({ type: "music-sync", from: info.username, state: info.nowPlaying, sentAt: info.nowPlayingSentAt });
      for (const [cws, cinfo] of clients) {
        if (cws !== ws && cinfo.listeningTo === info.username && cws.readyState === 1) cws.send(syncPkt);
      }
      return;
    }

    if (data.type === "music-stop") {
      info.nowPlaying = null;
      info.nowPlayingSentAt = null;
      for (const [, cinfo] of clients) { if (cinfo.listeningTo === info.username) cinfo.listeningTo = null; }
      broadcast({ type: "music-update", username: info.username, nowPlaying: null }, ws);
      return;
    }

    if (data.type === "music-join") {
      const hostName = String(data.host || "").trim().slice(0, 24);
      if (!hostName || hostName.toLowerCase() === info.username.toLowerCase()) return;
      const host = findClient(hostName);
      if (!host) { ws.send(JSON.stringify({ type: "music-update", username: hostName, nowPlaying: null })); return; }
      const hostInfo = clients.get(host.ws);
      info.listeningTo = hostName;
      host.ws.send(JSON.stringify({ type: "music-listener-joined", username: info.username }));
      if (hostInfo.nowPlaying) {
        ws.send(JSON.stringify({ type: "music-sync", from: hostName, state: hostInfo.nowPlaying, sentAt: hostInfo.nowPlayingSentAt || Date.now() }));
      }
      // Tell everyone so they see "listening with X" in the user list
      broadcastToAll({ type: "user-list", users: buildUserList() });
      return;
    }

    if (data.type === "music-resync-request") {
      // Listener asks host to re-broadcast current state
      const hostName = String(data.host || "").trim().slice(0, 24);
      const host = findClient(hostName);
      if (host) {
        host.ws.send(JSON.stringify({ type: "music-resync-ping", from: info.username }));
      }
      return;
    }

    if (data.type === "music-leave") {
      const hostName = String(data.host || "").trim().slice(0, 24);
      info.listeningTo = null;
      const host = findClient(hostName);
      if (host) host.ws.send(JSON.stringify({ type: "music-listener-left", username: info.username }));
      // Tell everyone so "listening with X" badge disappears
      broadcastToAll({ type: "user-list", users: buildUserList() });
      return;
    }

    // ── /Listen Together ───────────────────────────────────────────────────

    if (data.type === "typing") {
      const muted = mutedUntil.get(info.username.toLowerCase());
      if (muted && Date.now() < muted) return;
      const nowMs = Date.now();
      if (nowMs - lastTypingFwd < 1500) return;
      lastTypingFwd = nowMs;
      broadcast({ type: "typing", username: info.username }, ws);
      return;
    }

    if (data.type === "seen") {
      const nowMs = Date.now();
      if (nowMs - (info._lastSeen || 0) < 1000) return;
      info._lastSeen = nowMs;
      if (data.ts !== lastPublicMsgTs) return;
      seenBy.add(info.username);
      broadcastToAll({ type: "seen", users: [...seenBy] });
      return;
    }

    // Color picker — user changed their display colour in real-time
    if (data.type === 'color-update') {
      const newColor = typeof data.color === 'string' && data.color.match(/^#[0-9a-fA-F]{6}$/)
        ? data.color : null;
      if (newColor) {
        info.color = newColor;
        // Relay to every other client so they see the change immediately
        broadcastToAll({ type: 'color-update', username: info.username, color: newColor });
      }
      return;
    }

    // funziez.js — relay collaborative ambient events to all peers
    if (typeof data.type === 'string' && data.type.startsWith('funz-')) {
      broadcast({ ...data, username: info.username }, ws);
      return;
    }
  });

  ws.on("close", () => {
    const cur = ipConnections.get(ip) || 1;
    if (cur <= 1) ipConnections.delete(ip);
    else ipConnections.set(ip, cur - 1);

    if (!joined) return;
    const info = clients.get(ws);
    if (!info) return;
    // ── Listen Together: release anyone who was listening to this user ─────
    for (const [, cinfo] of clients) {
      if (cinfo.listeningTo === info.username) cinfo.listeningTo = null;
    }
    // ─────────────────────────────────────────────────────────────────────
    clients.delete(ws);
    usersByName.delete(info.username.toLowerCase());
    if (ws === adminWs) adminWs = null;
    seenBy.delete(info.username);
    broadcast({
      type: "system", event: "leave", username: info.username,
      message: `${info.username} left`, users: buildUserList(), time: now()
    });
    if (seenBy.size > 0) broadcastToAll({ type: "seen", users: [...seenBy] });
  });

  ws.on("error", () => { });
});

const SELF_URL = process.env.RAILWAY_PUBLIC_DOMAIN
  ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`
  : (process.env.SELF_URL || null);

if (SELF_URL) {
  setInterval(() => {
    https.get(SELF_URL, (res) => {
      res.on("data", () => { });
      res.on("end", () => { });
    }).on("error", () => { });
  }, 5 * 60 * 1000);
}

setInterval(() => {
  const now = Date.now();
  for (const [user, time] of mutedUntil) if (time !== Infinity && time < now) mutedUntil.delete(user);
  for (const [user, time] of kickedUntil) if (time !== Infinity && time < now) kickedUntil.delete(user);
}, 60 * 60 * 1000);

function shutdown() {
  console.log("[server] shutting down...");
  clearInterval(heartbeat);
  const msg = JSON.stringify({ type: "system", message: "Server is restarting, please wait..." });
  for (const [client] of clients) {
    if (client.readyState === 1) {
      client.send(msg);
      client.close(1001, "server shutting down");
    }
  }
  wss.close(() => {
    server.close(() => { process.exit(0); });
  });
  setTimeout(() => process.exit(1), 5000);
}
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

server.listen(PORT, () => console.log(`Chat server on http://localhost:${PORT}`));