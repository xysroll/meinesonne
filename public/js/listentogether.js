/* ══════════════════════════════════════════════════════════════════════════
   listentogether.js — Cathedral "Listen Together"
   Inspired by Spotify's "Jam" / Discord's activity status.

   LOAD ORDER (index.html):
     …  →  listentogether.js  →  main.js  →  …  →  music.js

   Why before main.js?   → intercepts window.ws setter (each new WebSocket)
   Why before music.js?  → intercepts window.Audio() to capture the player
   ══════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  const SYNC_INTERVAL_MS = 5000;
  const DRIFT_TOLERANCE_S = 1.5;
  const BCAST_THROTTLE_MS = 300;
  const DRIFT_CHECK_MS = 8000;

  const LT = window.LT = {
    _audio: null,
    _audioHooked: false,
    _hosting: false,
    _inSession: false,
    _hostUsername: null,
    _listeners: new Set(),
    _sessions: {},        // username → { title, artist, playing }
    _listeningTo: {},        // username → hostUsername
    _syncTimer: null,
    _lastBcast: 0,
    _pendingBcast: null,
    _hostBtn: null,
    _syncGen: 0,
  };

  // ── 1. Audio interception ─────────────────────────────────────────────────
  const _OrigAudio = window.Audio;
  function _PatchedAudio(...args) {
    const inst = new _OrigAudio(...args);
    if (!LT._audio) { LT._audio = inst; _attachAudioHooks(inst); }
    return inst;
  }
  Object.setPrototypeOf(_PatchedAudio, _OrigAudio);
  _PatchedAudio.prototype = _OrigAudio.prototype;
  window.Audio = _PatchedAudio;

  function _attachAudioHooks(audio) {
    if (LT._audioHooked) return;
    LT._audioHooked = true;
    audio.addEventListener('play', () => { _scheduleStatusBcast(); if (LT._hosting) _scheduleBcast(); });
    audio.addEventListener('pause', () => { _scheduleStatusBcast(); if (LT._hosting) _scheduleBcast(); });
    audio.addEventListener('seeked', () => { if (LT._hosting) _scheduleBcast(); });
    _watchMpTitle();

    // Listener-side drift watchdog — if we fall behind the expected position,
    // request a fresh sync from the server by asking the host to re-broadcast
    let _lastDriftCheck = 0;
    audio.addEventListener('timeupdate', () => {
      if (!LT._inSession) return;
      if (!LT._lastKnownState) return;
      const now = Date.now();
      if (now - _lastDriftCheck < DRIFT_CHECK_MS) return;
      _lastDriftCheck = now;
      const s = LT._lastKnownState;
      if (!s.playing) return;
      const elapsed = (now - s.receivedAt) / 1000;
      const expected = s.pos + elapsed;
      const actual = audio.currentTime;
      if (Math.abs(actual - expected) > DRIFT_TOLERANCE_S * 2) {
        // Too much drift — request a fresh broadcast from the host
        _sendWS({ type: 'music-resync-request', host: LT._hostUsername });
      }
    });
  }

  function _watchMpTitle() {
    const _attach = () => {
      const el = document.getElementById('mp-title');
      if (!el) return false;
      new MutationObserver(() => {
        setTimeout(_scheduleStatusBcast, 280);
        if (LT._hosting) setTimeout(_scheduleBcast, 280);
      }).observe(el, { childList: true, characterData: true, subtree: true });
      return true;
    };
    if (!_attach()) {
      const obs = new MutationObserver(() => { if (_attach()) obs.disconnect(); });
      obs.observe(document.body, { childList: true, subtree: true });
    }
  }

  // ── 2. WebSocket interception ─────────────────────────────────────────────
  let _ltWs;
  Object.defineProperty(window, 'ws', {
    get() { return _ltWs; },
    set(v) { _ltWs = v; if (v) v.addEventListener('message', _onWsMsg); },
    configurable: true,
  });
  function _onWsMsg(ev) {
    let d; try { d = JSON.parse(ev.data); } catch (_) { return; }
    _handleMsg(d);
  }

  // ── 3. Message handling ───────────────────────────────────────────────────
  function _handleMsg(d) {
    switch (d.type) {

      case 'welcome':
      case 'user-list': {
        (d.users || []).forEach(u => {
          if (!u || !u.username) return;
          if (u.nowPlaying) LT._sessions[u.username] = u.nowPlaying;
          else delete LT._sessions[u.username];
          if (u.listeningTo) LT._listeningTo[u.username] = u.listeningTo;
          else delete LT._listeningTo[u.username];
        });
        _refreshAll();
        // welcome means chat just became visible — re-run positionPanels in music.js
        if (d.type === 'welcome') setTimeout(() => window.dispatchEvent(new Event('resize')), 120);
        break;
      }

      case 'music-update': {
        if (d.nowPlaying) LT._sessions[d.username] = d.nowPlaying;
        else delete LT._sessions[d.username];
        if (d.listeningTo) LT._listeningTo[d.username] = d.listeningTo;
        else delete LT._listeningTo[d.username];
        if (d.nowPlaying === null && LT._inSession && LT._hostUsername === d.username) {
          _leaveSession(true);
        }
        // If we're listening to this user, mirror their track visually
        if (LT._inSession && LT._hostUsername === d.username && d.nowPlaying) {
          _updateVisuals(d.nowPlaying);
        }
        _refreshAll();
        break;
      }

      case 'music-sync': {
        if (!LT._inSession || LT._hostUsername !== d.from) break;
        _syncToState(d.state, d.sentAt);
        break;
      }

      case 'music-listener-joined': {
        LT._listeners.add(d.username);
        _updateBanner();
        _showToast(d.username + ' is now listening with you');
        // Immediately send a fresh snapshot so new listener gets accurate position
        if (LT._hosting) setTimeout(_doBcast, 80);
        break;
      }

      case 'music-resync-ping': {
        // A listener detected drift and asked for a fresh broadcast
        if (LT._hosting) _doBcast();
        break;
      }

      case 'music-listener-left': {
        LT._listeners.delete(d.username);
        _updateBanner();
        break;
      }

      case 'system': {
        if (d.event === 'leave' && d.username) {
          delete LT._sessions[d.username];
          delete LT._listeningTo[d.username];
          LT._listeners.delete(d.username);
          if (LT._inSession && LT._hostUsername === d.username) _leaveSession(true);
          _refreshAll();
          _updateBanner();
        }
        break;
      }
    }
  }

  // ── 4. State snapshot ─────────────────────────────────────────────────────
  const _txt = id => (document.getElementById(id) || {}).textContent || '';
  const _src = id => (document.getElementById(id) || {}).src || '';

  function _getState() {
    const a = LT._audio;
    if (!a || !a.src || a.src === location.href) return null;
    return {
      url: a.src,
      pos: a.currentTime,
      playing: !a.paused && !a.ended,
      title: _txt('mp-title'),
      artist: _txt('mp-artist'),
      album: _txt('mp-album'),
      year: _txt('mp-year'),
      genre: _txt('mp-genre'),
      track: _txt('mp-track'),
      cover: _src('mp-cover'),
      dur: isFinite(a.duration) ? a.duration : 0,
    };
  }

  // ── 4b. Update visual DOM (listener side) ─────────────────────────────────
  function _updateVisuals(state) {
    if (!state) return;
    const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val || ''; };
    set('mp-title', state.title || '\u2014');
    set('mp-artist', state.artist || '\u2014');
    set('mp-album', state.album || '\u2014');
    set('mp-year', state.year || '');
    set('mp-genre', state.genre || '');
    set('mp-track', state.track || '');
    const cover = document.getElementById('mp-cover'); if (cover) cover.src = state.cover || '';
    const showYear = !!state.year, showTrack = !!state.track, showGenre = !!state.genre;
    const vis = (id, show) => { const el = document.getElementById(id); if (el) el.style.display = show ? '' : 'none'; };
    vis('mp-year-sep', showYear); vis('mp-year', showYear);
    vis('mp-track-sep', showTrack && showGenre); vis('mp-track-lbl', showTrack); vis('mp-track', showTrack);
    const fill = document.getElementById('mp-fill'); if (fill) fill.style.width = '0%';
    const hndl = document.getElementById('mp-handle'); if (hndl) hndl.style.left = '0%';
    const cur = document.getElementById('mp-cur'); if (cur) cur.textContent = '0:00';
    const tot = document.getElementById('mp-tot');
    if (tot && state.dur) tot.textContent = Math.floor(state.dur / 60) + ':' + String(Math.floor(state.dur % 60)).padStart(2, '0');
  }

  // ── 5. Sync from host state ───────────────────────────────────────────────
  function _syncToState(state, sentAt) {
    const a = LT._audio;
    if (!a || !state || !state.url) return;

    // Bump the generation counter. Any in-flight canplay callback that captured
    // an older generation value will see a mismatch and bail out silently.
    const gen = ++LT._syncGen;

    const transit = sentAt ? Math.min((Date.now() - sentAt) / 1000, 5) : 0.8;
    const target = Math.max(0, state.pos + (state.playing ? transit : 0));

    // Store for drift watchdog
    LT._lastKnownState = { pos: target, playing: state.playing, url: state.url, receivedAt: Date.now() };

    const _apply = () => {
      // Stale — a newer sync arrived before this one completed loading
      if (gen !== LT._syncGen) return;

      if (Math.abs(a.currentTime - target) > DRIFT_TOLERANCE_S) {
        a.currentTime = target;
      }
      if (state.playing && a.paused) {
        const p = a.play();
        if (p) p.then(() => { a.autoplay = false; }).catch(err => {
          a.autoplay = false;
          if (err && err.name === 'AbortError') return;
          _showToast('tap play to resume synced audio');
        });
      } else if (!state.playing && !a.paused) {
        a.pause();
      }
    };

    if (a.src !== state.url) {
      // New track — update visuals immediately so UI never shows stale info
      _updateVisuals(state);
      if (state.playing) a.autoplay = true;
      a.src = state.url;
      a.load();

      let _retries = 0;
      const MAX_RETRIES = 3;
      const RETRY_DELAY = 1800;

      function _onCanPlay() {
        a.removeEventListener('canplay', _onCanPlay);
        a.removeEventListener('error', _onError);
        _apply();
      }
      function _onError() {
        if (gen !== LT._syncGen) return; // stale sync, give up
        if (_retries < MAX_RETRIES) {
          _retries++;
          console.warn('[LT] track load failed, retry', _retries, state.url);
          setTimeout(() => {
            if (gen !== LT._syncGen) return;
            if (state.playing) a.autoplay = true;
            a.src = state.url;
            a.load();
          }, RETRY_DELAY * _retries);
        } else {
          a.removeEventListener('canplay', _onCanPlay);
          a.removeEventListener('error', _onError);
          console.warn('[LT] giving up on track after', MAX_RETRIES, 'retries');
        }
      }
      a.addEventListener('canplay', _onCanPlay);
      a.addEventListener('error', _onError);
    } else {
      _updateVisuals(state);
      _apply();
    }
  }

  // ── 6. Broadcast (host side) ──────────────────────────────────────────────
  function _scheduleBcast() {
    const now = Date.now();
    if (now - LT._lastBcast < BCAST_THROTTLE_MS) {
      if (!LT._pendingBcast) LT._pendingBcast = setTimeout(() => { LT._pendingBcast = null; _doBcast(); }, BCAST_THROTTLE_MS);
      return;
    }
    _doBcast();
  }

  function _doBcast() {
    if (!LT._hosting) return;
    const s = _getState();
    if (!s) return;
    LT._lastBcast = Date.now();
    // Keep own badge in sync with what's currently playing
    LT._sessions[window.myUsername] = { title: s.title, artist: s.artist, playing: s.playing, cover: s.cover };
    _refreshAll();
    _sendWS({ type: 'music-broadcast', state: s, sentAt: LT._lastBcast });
  }

  function _startPeriodicBcast() { _stopPeriodicBcast(); LT._syncTimer = setInterval(_doBcast, SYNC_INTERVAL_MS); }
  function _stopPeriodicBcast() { if (LT._syncTimer) { clearInterval(LT._syncTimer); LT._syncTimer = null; } }

  // ── Auto status — always on, independent of sharing ───────────────────────
  let _statusBcastTO = null;
  function _scheduleStatusBcast() {
    clearTimeout(_statusBcastTO);
    _statusBcastTO = setTimeout(_doStatusBcast, BCAST_THROTTLE_MS);
  }
  function _doStatusBcast() {
    const a = LT._audio;
    if (!a || !a.src || a.src === location.href) return;
    // Keep session alive on pause (shows track as paused, not gone)
    // Only clear when ended or no track loaded
    if (a.ended) {
      if (LT._sessions[window.myUsername] && !LT._hosting) {
        delete LT._sessions[window.myUsername];
        _refreshAll();
        _sendWS({ type: 'music-status', nowPlaying: null });
      }
      return;
    }
    const nowPlaying = {
      title: _txt('mp-title'),
      artist: _txt('mp-artist'),
      playing: !a.paused,
      cover: _src('mp-cover'),
    };
    LT._sessions[window.myUsername] = nowPlaying;
    _refreshAll();
    _sendWS({ type: 'music-status', nowPlaying });
  }



  // ── 7. Host / listener control ────────────────────────────────────────────
  function _startHosting() {
    if (LT._inSession) _leaveSession(false);
    LT._hosting = true; LT._listeners.clear();
    _startPeriodicBcast(); _doBcast();
    _updateBanner(); _updateHostBtn();
  }

  function _stopHosting() {
    if (!LT._hosting) return;
    LT._hosting = false; LT._listeners.clear(); _stopPeriodicBcast();
    _sendWS({ type: 'music-stop' });
    delete LT._sessions[window.myUsername];
    _refreshAll(); _updateBanner(); _updateHostBtn();
  }

  function _joinSession(hostUsername) {
    if (LT._hosting) _stopHosting();
    if (LT._inSession) _leaveSession(false);
    LT._inSession = true; LT._hostUsername = hostUsername;
    LT._listeningTo[window.myUsername] = hostUsername;  // local update; server echoes via user-list
    _sendWS({ type: 'music-join', host: hostUsername });
    _refreshAll(); _updateBanner();
    _showToast('joining ' + hostUsername + '\u2019s session\u2026');
  }

  function _leaveSession(hostLeft) {
    if (!LT._inSession) return;
    const prev = LT._hostUsername;
    LT._inSession = false; LT._hostUsername = null;
    delete LT._listeningTo[window.myUsername];
    if (!hostLeft) _sendWS({ type: 'music-leave', host: prev });
    _refreshAll(); _updateBanner();
    if (hostLeft) _showToast(prev + ' ended the session');
    else _showToast('left the session');
  }

  // ── 8. WS helper ─────────────────────────────────────────────────────────
  function _sendWS(obj) {
    const ws = window.ws;
    if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(obj));
  }

  // ── 9. Toast ──────────────────────────────────────────────────────────────
  function _showToast(msg) {
    let t = document.getElementById('lt-toast');
    if (!t) { t = document.createElement('div'); t.id = 'lt-toast'; document.body.appendChild(t); }
    t.textContent = msg; t.classList.add('visible');
    clearTimeout(t._to); t._to = setTimeout(() => t.classList.remove('visible'), 3800);
  }

  // ── 10. Activity info ────────────────────────────────────────────────────
  // Returns { cover, title, text } for visual rendering, or null if inactive.
  // `text` is always a plain string (used by banner/toast).
  function _activityFor(username) {
    const listeningTo = LT._listeningTo[username];
    if (listeningTo) {
      // Show the host's track — same cover + title as the host
      const hostSession = LT._sessions[listeningTo];
      if (hostSession) {
        const label = hostSession.title || 'listening to music';
        const parts = [];
        if (hostSession.artist) parts.push(hostSession.artist);
        if (hostSession.title) parts.push(hostSession.title);
        const tooltip = parts.join(' · ') || 'listening to music';
        return { cover: hostSession.cover || null, title: hostSession.title || null, text: label, tooltip, inSession: true };
      }
      // Host session not loaded yet — show minimal
      return { cover: null, title: null, text: 'listening together', tooltip: 'listening with ' + listeningTo, inSession: true };
    }
    const session = LT._sessions[username];
    if (session) {
      const label = session.title || 'listening to music';
      const parts = [];
      if (session.artist) parts.push(session.artist);
      if (session.title) parts.push(session.title);
      const tooltip = parts.join(' · ') || 'listening to music';
      return { cover: session.cover || null, title: session.title || null, text: label, tooltip, inSession: false };
    }
    return null;
  }

  // ── 11. Refresh all user items ────────────────────────────────────────────
  function _refreshAll() {
    document.querySelectorAll('#user-list .user-item').forEach(el => {
      const isMe = !el.dataset.dmUser;
      const username = isMe ? window.myUsername : el.dataset.dmUser;
      if (!username) return;

      const activity = _activityFor(username);

      // Activity row (shown for everyone including self)
      let actEl = el.querySelector('.lt-activity');
      if (activity) {
        if (!actEl) {
          actEl = document.createElement('div');
          actEl.className = 'lt-activity';
          const anchor = el.querySelector('.user-status') || el.querySelector('.user-name');
          const nameCol = anchor?.parentElement;
          if (nameCol && anchor) anchor.insertAdjacentElement('afterend', actEl);
          else (nameCol || el).appendChild(actEl);
        }
        // Rebuild contents: tiny cover (if available) + title text
        actEl.innerHTML = '';
        if (activity.cover) {
          const img = document.createElement('img');
          img.className = 'lt-act-cover';
          img.src = activity.cover;
          img.alt = '';
          actEl.appendChild(img);
        }
        const label = document.createElement('span');
        label.className = 'lt-act-label';
        label.textContent = activity.text;
        actEl.appendChild(label);
        // Hover tooltip: show full "Artist — Title" on the row
        actEl.title = activity.tooltip || activity.text;
        // Click to join/leave session (only for other users who are sharing)
        if (!isMe && LT._sessions[username]) {
          actEl.style.cursor = 'pointer';
          actEl._ltClick = () => {
            if (LT._inSession && LT._hostUsername === username) _leaveSession(false);
            else _joinSession(username);
          };
          actEl.onclick = (e) => { e.stopPropagation(); actEl._ltClick(); };
        } else {
          actEl.style.cursor = 'default';
          actEl.onclick = null;
        }
      } else {
        actEl?.remove();
      }

      el.querySelector('.lt-listen-btn')?.remove();
    });
    // Draw the glow line connecting users in the same session
    requestAnimationFrame(_drawConnectionLines);
  }

  // ── 12. Session banner  (status only — no button) ───────────────────────
  function _updateBanner() {
    const banner = document.getElementById('lt-banner');
    if (!banner) return;
    const text = banner.querySelector('.lt-b-text');
    if (LT._hosting) {
      const n = LT._listeners.size;
      text.textContent = 'sharing · ' +
        (n === 0 ? 'no listeners' : n === 1 ? '1 listening' : n + ' listening');
      banner.style.cursor = 'default';
      banner.classList.add('visible');
    } else if (LT._inSession) {
      text.textContent = 'listening with ' + LT._hostUsername + ' · click to leave';
      banner.style.cursor = 'pointer';
      banner.classList.add('visible');
    } else {
      banner.classList.remove('visible');
    }
  }

  // ── 13. Share button (sunken = active, never changes text) ───────────────
  function _updateHostBtn() {
    const btn = document.getElementById('lt-share-btn');
    if (!btn) return;
    if (LT._hosting) {
      btn.style.background = 'var(--bg-input)';
      btn.style.boxShadow = 'var(--shadow-input)';
      btn.style.color = 'var(--text-main)';
    } else {
      btn.style.background = 'var(--bg-btn)';
      btn.style.boxShadow = 'var(--shadow-btn)';
      btn.style.color = 'var(--text-btn)';
    }
  }

  function _injectShareBtn() {
    if (document.getElementById('lt-share-btn')) return;
    const _place = () => {
      // Append into the .km-btn-row created by music.js (same row as "music on", "keys on")
      const row = document.querySelector('.km-btn-row');
      if (!row) return false;
      const btn = document.createElement('button');
      btn.id = 'lt-share-btn';
      btn.textContent = 'share';
      btn.title = "Share what you're listening to — others can join in real time";
      // Match exact inline style used by the other buttons in this row (set by music.js)
      const BASE = 'background:var(--bg-btn);color:var(--text-btn);border:var(--border-main);' +
        'box-shadow:var(--shadow-btn);border-radius:var(--radius-btn);padding:3px 7px;' +
        'font-family:inherit;font-size:10px;font-weight:bold;cursor:pointer;line-height:1.4;white-space:nowrap;';
      btn.style.cssText = BASE;
      btn.addEventListener('click', () => { if (LT._hosting) _stopHosting(); else _startHosting(); });
      row.appendChild(btn);
      return true;
    };
    if (!_place()) {
      const obs = new MutationObserver(() => { if (_place()) obs.disconnect(); });
      obs.observe(document.body, { childList: true, subtree: true });
    }
  }

  // ── 14. Extend right-click context menu ──────────────────────────────────
  function _extendCtxMenu() {
    if (typeof window.showDMContextMenu !== 'function') { setTimeout(_extendCtxMenu, 80); return; }
    const orig = window.showDMContextMenu;
    window.showDMContextMenu = function (x, y, username) {
      orig.call(this, x, y, username);
      const session = LT._sessions[username];
      const isActive = LT._inSession && LT._hostUsername === username;
      if (!session && !isActive) return;
      const menu = document.getElementById('dm-ctx-menu'); if (!menu) return;
      const sep = document.createElement('div'); sep.className = 'ctx-sep'; menu.appendChild(sep);
      const item = document.createElement('div'); item.className = 'ctx-item lt-ctx-item';
      const esc = s => (window.escapeHtml ? window.escapeHtml(s) : s.replace(/&/g, '&amp;').replace(/</g, '&lt;'));
      if (isActive) {
        item.innerHTML = 'Leave session';
        item.addEventListener('click', () => { _leaveSession(false); window.hideCtxMenu(); });
      } else {
        const sub = session.title ? ' <span class="lt-ctx-sub">' + esc(session.title.slice(0, 30)) + '</span>' : '';
        item.innerHTML = 'Listen together' + sub;
        item.addEventListener('click', () => { _joinSession(username); window.hideCtxMenu(); });
      }
      menu.appendChild(item);
    };
  }

  // ── 15. Inject banner DOM ─────────────────────────────────────────────────
  function _injectBanner() { /* banner removed — not needed */ }

  // ── Connection lines SVG ──────────────────────────────────────────────────
  // Draws a glowing line between the .lt-act-cover of users in the same session.
  function _drawConnectionLines() {
    const ul = document.getElementById('user-list');
    if (!ul) return;

    const oldSvg = document.getElementById('lt-conn-svg');
    if (oldSvg) oldSvg.remove();

    // Collect pairs: [listenerAvatarEl, hostAvatarEl]
    const allItems = [...document.querySelectorAll('#user-list .user-item')];
    const pairs = [];

    allItems.forEach(el => {
      const username = el.dataset.dmUser || window.myUsername;
      if (!username) return;
      const listeningTo = LT._listeningTo[username];
      if (!listeningTo) return;
      const hostEl = allItems.find(e => (e.dataset.dmUser || window.myUsername) === listeningTo);
      if (!hostEl) return;
      const fromAvatar = el.querySelector('.user-avatar');
      const toAvatar = hostEl.querySelector('.user-avatar');
      if (fromAvatar && toAvatar) pairs.push([fromAvatar, toAvatar]);
    });

    if (!pairs.length) return;

    const ulRect = ul.getBoundingClientRect();
    const z = parseFloat(getComputedStyle(document.documentElement).zoom) || 1;

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.id = 'lt-conn-svg';
    svg.style.cssText = 'position:absolute;top:0;left:0;pointer-events:none;z-index:3;overflow:visible;';
    svg.setAttribute('width', ul.offsetWidth);
    svg.setAttribute('height', ul.scrollHeight);

    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    defs.innerHTML =
      '<filter id="lt-glow" x="-100%" y="-100%" width="300%" height="300%">' +
      '<feGaussianBlur stdDeviation="2" result="blur"/>' +
      '<feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>' +
      '</filter>';
    svg.appendChild(defs);

    // Resolve theme color — SVG attrs don't support CSS vars, must use computed value
    const color = getComputedStyle(document.documentElement)
      .getPropertyValue('--led-glow').trim() || '#5ce65c';

    pairs.forEach(([a, b]) => {
      const ra = a.getBoundingClientRect();
      const rb = b.getBoundingClientRect();

      // Center of each avatar
      const x = (ra.left + ra.width / 2 - ulRect.left) / z;
      const ay = (ra.top + ra.height / 2 - ulRect.top + ul.scrollTop) / z;
      const by = (rb.top + rb.height / 2 - ulRect.top + ul.scrollTop) / z;

      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', x); line.setAttribute('y1', ay);
      line.setAttribute('x2', x); line.setAttribute('y2', by);
      line.setAttribute('stroke', color);
      line.setAttribute('stroke-width', '1.5');
      line.setAttribute('filter', 'url(#lt-glow)');
      line.style.animation = 'lt-line-pulse 2.8s ease-in-out infinite';
      svg.appendChild(line);

      // Dot at each end
      [ay, by].forEach(endY => {
        const c = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        c.setAttribute('cx', x); c.setAttribute('cy', endY); c.setAttribute('r', '2.5');
        c.setAttribute('fill', color);
        c.setAttribute('filter', 'url(#lt-glow)');
        c.style.animation = 'lt-line-pulse 2.8s ease-in-out infinite';
        svg.appendChild(c);
      });
    });

    ul.style.position = 'relative';
    ul.appendChild(svg);
  }

  // ── 16. Re-run _refreshAll whenever main.js rebuilds the user list ────────
  function _initUserListObs() {
    const ul = document.getElementById('user-list');
    if (!ul) { setTimeout(_initUserListObs, 150); return; }
    new MutationObserver(_refreshAll).observe(ul, { childList: true });
    // Redraw lines when user scrolls the sidebar (positions shift)
    ul.addEventListener('scroll', () => requestAnimationFrame(_drawConnectionLines), { passive: true });
  }

  // ── 17. CSS ───────────────────────────────────────────────────────────────
  function _injectCSS() {
    const s = document.createElement('style');
    s.textContent = `
/* ── Listen Together ──────────────────────────────────────────────── */

#lt-toast {
  position: fixed; bottom: 72px; left: 50%;
  transform: translateX(-50%) translateY(10px);
  background: var(--color-bubble-bg, #1c1c1c);
  color: var(--color-text, #ddd);
  border: 1px solid var(--border-main, #333);
  border-radius: var(--radius-btn, 5px);
  padding: 7px 16px; font-size: 12.5px; z-index: 10000;
  opacity: 0; pointer-events: none;
  transition: opacity .22s ease, transform .22s ease;
  white-space: nowrap; box-shadow: 0 4px 18px rgba(0,0,0,.5);
}
#lt-toast.visible { opacity: 1; transform: translateX(-50%) translateY(0); }

/* banner removed */


/* Activity row */
@keyframes lt-pulse { 0%, 100% { opacity: .45; } 50% { opacity: .85; } }
@keyframes lt-line-pulse { 0%, 100% { opacity: .35; } 50% { opacity: .7; } }
.lt-activity {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 5px;
  margin-top: 2px;
  max-width: 100%;
  overflow: hidden;
  cursor: default;
  animation: lt-pulse 3s ease-in-out infinite;
  border-radius: 3px;
  transition: background .15s;
}
.lt-activity[style*="pointer"]:hover { background: rgba(128,128,128,0.12); }
.lt-act-cover {
  width: 14px; height: 14px;
  border-radius: 2px;
  flex-shrink: 0;
  object-fit: cover;
  display: block;
}
.lt-act-label {
  font-size: 10px;
  font-family: var(--font-main, inherit);
  font-weight: normal;
  color: var(--text-dim, #777);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  min-width: 0;
}



/* #lt-share-btn uses inline styles from music.js km-btn-row pattern */

.ctx-sep { height: 1px; background: var(--border-main, #2a2a2a); margin: 3px 0; }
.lt-ctx-sub { opacity: .6; font-style: italic; font-size: 11px; margin-left: 4px; }
    `;
    document.head.appendChild(s);
  }

  // ── 18. Init ──────────────────────────────────────────────────────────────
  function _init() {
    _injectCSS(); _injectBanner(); _initUserListObs(); _extendCtxMenu(); _injectShareBtn();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', _init);
  else _init();

})();