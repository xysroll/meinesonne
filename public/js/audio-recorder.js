/**
 * audio-recorder.js — cathedral voice messages
 * Pure logic only. All HTML and CSS lives in index.html.
 */
(function () {
  'use strict';

  const BARS    = 44;
  const BAR_W   = 3;
  const BAR_GAP = 2;
  const WAVE_H  = 36;
  const MAX_SEC = 60;
  const BITRATE = 128_000;

  let state = 'idle';
  let mediaRecorder = null, audioStream = null, audioChunks = [], recStart = 0, timerIv = null;
  let _getWs, _getUserColor, _messagesEl, _scrollToBottom, _fmtTime, _hideEmptyState;
  const waveCache = new Map();

  const SVG_MIC  = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none"><rect x="9" y="2" width="6" height="13" rx="3" stroke="currentColor" stroke-width="2"/><path d="M5 10a7 7 0 0 0 14 0" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><line x1="12" y1="19" x2="12" y2="22" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><line x1="9" y1="22" x2="15" y2="22" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`;
  const SVG_X    = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><line x1="5" y1="5" x2="19" y2="19" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/><line x1="19" y1="5" x2="5" y2="19" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg>`;
  const SVG_SEND = `<svg width="20" height="20" viewBox="0 0 18 18" fill="none"><path d="M9 14V4M9 4L4.5 8.5M9 4L13.5 8.5" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  const SVG_PLAY = `<svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><polygon points="6,3 20,12 6,21"/></svg>`;
  const SVG_PAUSE= `<svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><rect x="5" y="3" width="4" height="18" rx="1.5"/><rect x="15" y="3" width="4" height="18" rx="1.5"/></svg>`;

  /* ── PUBLIC ──────────────────────────────────────────────────── */
  function init(opts) {
    _getWs          = opts.getWs;
    _getUserColor   = opts.getUserColor;
    _messagesEl     = opts.messagesEl;
    _scrollToBottom = opts.scrollToBottom;
    _fmtTime        = opts.fmtTime        || (() => '');
    _hideEmptyState = opts.hideEmptyState || (() => {});

    // ── Nuke any leftover injected elements from old versions of this file ──
    document.querySelectorAll('#rec-bar').forEach(el => el.remove());
    const inputRight = document.getElementById('input-right');
    document.querySelectorAll('#mic-btn').forEach(btn => {
      if (!inputRight || !inputRight.contains(btn)) btn.remove();
    });

    const micBtn  = document.getElementById('mic-btn');
    const sendBtn = document.getElementById('send-btn');
    if (!micBtn || !sendBtn) { console.warn('[AR] mic-btn or send-btn missing'); return; }

    micBtn.addEventListener('click', () => {
      if (state === 'idle')           _startRecording();
      else if (state === 'recording') _cancelRecording();
    });

    sendBtn.addEventListener('click', e => {
      if (state === 'recording') { e.stopImmediatePropagation(); _stopAndSend(); }
    }, true);
  }

  /* ── RECORDING ───────────────────────────────────────────────── */
  async function _startRecording() {
    if (state !== 'idle') return;
    try {
      audioStream = await navigator.mediaDevices.getUserMedia({ audio: {
        noiseSuppression: false, echoCancellation: false, autoGainControl: false,
        sampleRate: 48000, channelCount: 1,
      }});
    } catch { alert('Microphone access denied.'); return; }

    const mime = _bestMime();
    try { mediaRecorder = new MediaRecorder(audioStream, mime ? { mimeType: mime, audioBitsPerSecond: BITRATE } : {}); }
    catch { mediaRecorder = new MediaRecorder(audioStream); }

    audioChunks = [];
    mediaRecorder.ondataavailable = e => { if (e.data?.size > 0) audioChunks.push(e.data); };
    mediaRecorder.start(100);
    recStart = Date.now();
    state = 'recording';
    _enterUI();
    _startTimer();
  }

  function _stopAndSend()     { if (state === 'recording') _doStop(true);  }
  function _cancelRecording() { if (state === 'recording') _doStop(false); }

  function _doStop(send) {
    state = 'stopping';
    clearInterval(timerIv); timerIv = null;
    audioStream?.getTracks().forEach(t => t.stop());
    const mime = mediaRecorder?.mimeType || 'audio/ogg';
    const dur  = Math.round((Date.now() - recStart) / 1000);
    mediaRecorder.onstop = () => {
      if (send && audioChunks.length) _sendBlob(new Blob(audioChunks, { type: mime }), dur);
      mediaRecorder = null; audioChunks = []; audioStream = null;
    };
    if (mediaRecorder.state !== 'inactive') mediaRecorder.stop();
    else { mediaRecorder = null; audioChunks = []; audioStream = null; }
    _exitUI();
    state = 'idle';
  }

  /* ── UI ──────────────────────────────────────────────────────── */
  function _enterUI() {
    _el('msg-input',      el => el.style.display = 'none');
    _el('char-counter',   el => el.style.display = 'none');
    _el('img-attach-btn', el => el.style.display = 'none');
    _el('rec-inline',     el => el.style.display = 'flex');
    _el('rec-timer',      el => el.textContent   = '0:00');
    _el('mic-btn',  el => { el.innerHTML = SVG_X;    el.title = 'Cancel'; el.classList.add('mic-recording'); });
    _el('send-btn', el => { el.innerHTML = SVG_SEND; el.disabled = false; });
  }

  function _exitUI() {
    _el('rec-inline',     el => el.style.display = 'none');
    _el('msg-input',      el => el.style.display = '');
    _el('char-counter',   el => el.style.display = '');
    _el('img-attach-btn', el => el.style.display = '');
    _el('mic-btn',  el => { el.innerHTML = SVG_MIC;  el.title = 'Record voice message'; el.classList.remove('mic-recording'); });
    _el('send-btn', el => {
      el.innerHTML = SVG_SEND;
      const inp = document.getElementById('msg-input');
      el.disabled = !(inp && inp.value.trim().length > 0);
    });
  }

  function _el(id, fn) { const el = document.getElementById(id); if (el) fn(el); }

  /* ── TIMER ───────────────────────────────────────────────────── */
  function _startTimer() {
    timerIv = setInterval(() => {
      const s = Math.floor((Date.now() - recStart) / 1000);
      _el('rec-timer', el => el.textContent = _secFmt(s));
      if (s >= MAX_SEC) _stopAndSend();
    }, 500);
  }

  /* ── SEND ────────────────────────────────────────────────────── */
  function _sendBlob(blob, duration) {
    const ws = _getWs();
    if (!ws || ws.readyState !== WebSocket.OPEN) { alert('Not connected.'); return; }
    const reader = new FileReader();
    reader.onload = () => {
      if (reader.result.length > 1_450_000) { alert('Voice message too large.'); return; }
      ws.send(JSON.stringify({ type: 'audio', data: reader.result, duration }));
    };
    reader.readAsDataURL(blob);
  }

  /* ── RENDER RECEIVED ─────────────────────────────────────────── */
  function appendAudioMessage({ username, data: dataUrl, duration, ts, own }) {
    _hideEmptyState();
    const time  = _fmtTime(ts);
    const color = _getUserColor(username);

    const msgEl = document.createElement('div');
    msgEl.className = 'msg' + (own ? ' own' : '');
    msgEl.dataset.username = username;

    const avatarCol = document.createElement('div');
    avatarCol.className = 'msg-avatar-col';
    const av = document.createElement('div');
    av.className = 'msg-avatar'; av.style.background = color;
    av.textContent = username.charAt(0).toUpperCase();
    const ht = document.createElement('span');
    ht.className = 'msg-hover-time'; ht.textContent = time;
    avatarCol.appendChild(av); avatarCol.appendChild(ht);

    const body = document.createElement('div'); body.className = 'msg-body';
    const hdr  = document.createElement('div'); hdr.className  = 'msg-header';
    const uEl  = document.createElement('span'); uEl.className = 'msg-user'; uEl.style.color = color; uEl.textContent = username;
    const tEl  = document.createElement('span'); tEl.className = 'msg-time'; tEl.textContent = time;
    hdr.appendChild(uEl); hdr.appendChild(tEl);
    body.appendChild(hdr);
    body.appendChild(_buildPlayer(dataUrl, duration || 0));
    msgEl.appendChild(avatarCol);
    msgEl.appendChild(body);
    _messagesEl.appendChild(msgEl);
    _scrollToBottom();
  }

  /* ── PLAYER ──────────────────────────────────────────────────── */
  function _buildPlayer(dataUrl, totalSec) {
    const wrap = document.createElement('div'); wrap.className = 'msg-audio';
    const audio = new Audio(); audio.preload = 'none';
    const playBtn = document.createElement('button'); playBtn.className = 'audio-play-btn'; playBtn.innerHTML = SVG_PLAY;
    const canvas  = document.createElement('canvas'); canvas.className  = 'audio-waveform'; canvas.style.cursor = 'pointer';
    const durEl   = document.createElement('span');   durEl.className   = 'audio-dur';      durEl.textContent   = _secFmt(totalSec);
    wrap.appendChild(playBtn); wrap.appendChild(canvas); wrap.appendChild(durEl);

    requestAnimationFrame(() => {
      const dpr  = Math.min(window.devicePixelRatio || 1, 2);
      const cssW = canvas.offsetWidth || 160;
      canvas.width  = Math.round(cssW * dpr);
      canvas.height = Math.round(WAVE_H * dpr);
      canvas.getContext('2d').scale(dpr, dpr);
      _draw(canvas, dataUrl, 0, cssW);
    });

    let playing = false, loaded = false, rafId = null;
    const tick = () => {
      if (!playing) return;
      _draw(canvas, dataUrl, audio.duration ? audio.currentTime / audio.duration : 0, canvas.offsetWidth);
      durEl.textContent = audio.duration ? _secFmt(Math.ceil(audio.duration - audio.currentTime)) : _secFmt(totalSec);
      rafId = requestAnimationFrame(tick);
    };

    playBtn.addEventListener('click', () => {
      if (playing) { audio.pause(); playing = false; playBtn.innerHTML = SVG_PLAY; cancelAnimationFrame(rafId); }
      else {
        if (!loaded) { audio.src = dataUrl; loaded = true; }
        audio.play().catch(() => {}); playing = true; playBtn.innerHTML = SVG_PAUSE; tick();
      }
    });
    canvas.addEventListener('click', e => {
      const pct = e.offsetX / (canvas.offsetWidth || 1);
      if (!loaded) { audio.src = dataUrl; loaded = true; }
      if (audio.duration) audio.currentTime = audio.duration * pct;
      _draw(canvas, dataUrl, pct, canvas.offsetWidth);
      if (!playing) { audio.play().catch(() => {}); playing = true; playBtn.innerHTML = SVG_PAUSE; tick(); }
    });
    audio.addEventListener('ended', () => {
      playing = false; cancelAnimationFrame(rafId); playBtn.innerHTML = SVG_PLAY;
      _draw(canvas, dataUrl, 0, canvas.offsetWidth); durEl.textContent = _secFmt(totalSec);
    });
    return wrap;
  }

  /* ── WAVEFORM ────────────────────────────────────────────────── */
  async function _draw(canvas, dataUrl, progress, cssW) {
    let bars = waveCache.get(dataUrl);
    if (!bars) { bars = await _decodeRms(dataUrl); waveCache.set(dataUrl, bars); }
    const ctx = canvas.getContext('2d');
    const w = cssW || 160, h = WAVE_H, cy = h / 2, maxH = cy * 0.92;
    const totalBarW = BAR_W + BAR_GAP;
    const count  = Math.min(BARS, Math.floor((w + BAR_GAP) / totalBarW));
    const startX = (w - (count * totalBarW - BAR_GAP)) / 2;
    ctx.clearRect(0, 0, w, h); ctx.fillStyle = '#ffffff';
    for (let i = 0; i < count; i++) {
      const idx    = Math.round(i / Math.max(count - 1, 1) * (BARS - 1));
      const bh     = Math.max(2.5, bars[idx] * maxH);
      const cx     = startX + i * totalBarW + BAR_W / 2;
      const played = Math.max(0, Math.min(1, progress * count - i));
      ctx.globalAlpha = 0.28 + played * 0.67;
      _roundBar(ctx, cx, cy, BAR_W, bh); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  async function _decodeRms(dataUrl) {
    try {
      const b64 = dataUrl.slice(dataUrl.indexOf(',') + 1);
      const bin = atob(b64); const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      const tmp = new (window.AudioContext || window.webkitAudioContext)();
      const decoded = await tmp.decodeAudioData(bytes.buffer.slice(0)); await tmp.close();
      const L = decoded.getChannelData(0);
      let samples = L;
      if (decoded.numberOfChannels > 1) {
        const R = decoded.getChannelData(1); samples = new Float32Array(L.length);
        for (let i = 0; i < L.length; i++) samples[i] = (L[i] + R[i]) * 0.5;
      }
      const chunk = Math.floor(samples.length / BARS);
      const raw = new Float32Array(BARS);
      for (let b = 0; b < BARS; b++) {
        let sum = 0, off = b * chunk;
        for (let j = 0; j < chunk; j++) sum += samples[off + j] ** 2;
        raw[b] = Math.sqrt(sum / chunk);
      }
      const K = [0.06, 0.24, 0.40, 0.24, 0.06], sm = new Float32Array(BARS);
      for (let i = 0; i < BARS; i++) {
        let val = 0, wt = 0;
        for (let k = 0; k < 5; k++) { const j = i+k-2; if (j>=0&&j<BARS) { val+=raw[j]*K[k]; wt+=K[k]; } }
        sm[i] = val / wt;
      }
      const peak = Math.max(...sm, 0.001), out = new Float32Array(BARS);
      for (let i = 0; i < BARS; i++) out[i] = Math.min(sm[i] / peak * 1.4, 1.0);
      return out;
    } catch { return _fallbackBars(); }
  }

  function _fallbackBars() {
    const out = new Float32Array(BARS); let v = 0.45;
    for (let i = 0; i < BARS; i++) { v = Math.abs(v + Math.sin(i*2.39)*0.28 + (Math.random()-0.5)*0.12); out[i] = Math.min(Math.max(v,0.10),0.95); }
    return out;
  }

  function _roundBar(ctx, cx, cy, bw, bh) {
    const r=bw/2, x=cx-r, y=cy-bh, h2=bh*2;
    ctx.beginPath();
    if (ctx.roundRect) { ctx.roundRect(x,y,bw,h2,r); }
    else { ctx.moveTo(x+r,y); ctx.arcTo(x+bw,y,x+bw,y+r,r); ctx.arcTo(x+bw,y+h2,x+r,y+h2,r); ctx.arcTo(x,y+h2,x,y+h2-r,r); ctx.arcTo(x,y,x+r,y,r); ctx.closePath(); }
  }

  function _bestMime() {
    return ['audio/ogg; codecs=opus','audio/webm; codecs=opus','audio/webm','audio/mp4'].find(t => MediaRecorder.isTypeSupported(t)) || '';
  }
  function _secFmt(s) { s=Math.max(0,Math.floor(s)); return `${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`; }

  window.AudioRecorder = { init, appendAudioMessage };
})();
