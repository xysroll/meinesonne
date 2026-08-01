// ambient.js — lightning + peer cursors + keyboard sounds + keymap
(function () {
  'use strict';

  let _ws, _myUsername, _getUserColor, _getCtx;
  let _listenersSetUp = false;

  window.AmbientFX = {
    init: function (opts) {
      _ws = opts.ws; _myUsername = opts.myUsername;
      _getUserColor = opts.getUserColor; _getCtx = opts.getCtx;
      if (!_listenersSetUp) {
        _listenersSetUp = true;
        initLightning();
        initPeerCursors();
        initKeyboardSounds();
        initKeymap();
      }
    },
    updateWs: function (ws, username) { _ws = ws; _myUsername = username; },
    onMessage: function (data) {
      if (data.type === 'cursor') handlePeerCursor(data.username, data.x, data.y);
      if (data.type === 'system' && data.event === 'leave') removePeerCursor(data.username);
    },
    triggerLightning: triggerLightning,
  };


  // ══════════════════════════════════════════════════════════════════════════
  // LIGHTNING
  // ══════════════════════════════════════════════════════════════════════════

  let _lightningOverlay = null;
  function getLightningOverlay() {
    if (!_lightningOverlay) {
      _lightningOverlay = document.createElement('div');
      _lightningOverlay.style.cssText = [
        'position:fixed;inset:0;pointer-events:none;z-index:1',
        'background:#ddeeff;opacity:0;will-change:opacity',
      ].join(';');
      document.body.appendChild(_lightningOverlay);
    }
    return _lightningOverlay;
  }

  function triggerLightning() {
    const overlay = getLightningOverlay();
    let ctx;
    try { ctx = _getCtx && _getCtx(); } catch (e) { }

    if (ctx) {
      fetch('/lightning.mp3')
        .then(function (r) { return r.arrayBuffer(); })
        .then(function (buf) { return ctx.decodeAudioData(buf); })
        .then(function (decoded) {
          const analyser = ctx.createAnalyser();
          analyser.fftSize = 256;
          analyser.smoothingTimeConstant = 0.65;
          const src = ctx.createBufferSource();
          src.buffer = decoded;
          src.connect(analyser); analyser.connect(ctx.destination);
          src.start(0);

          const freqData = new Uint8Array(analyser.frequencyBinCount);
          let ended = false, alpha = 0, fadingOut = false;
          src.onended = function () { ended = true; };

          (function frame() {
            analyser.getByteFrequencyData(freqData);
            let sum = 0;
            for (let i = 0; i < 12; i++) sum += freqData[i];
            const target = Math.min(0.07, (sum / 12 / 255) * 0.12); // very subtle
            if (!ended) {
              alpha += (target - alpha) * 0.28;
              overlay.style.opacity = alpha;
              requestAnimationFrame(frame);
            } else if (!fadingOut) {
              fadingOut = true;
              (function fade() {
                alpha *= 0.87;
                overlay.style.opacity = alpha;
                if (alpha > 0.003) requestAnimationFrame(fade);
                else overlay.style.opacity = 0;
              })();
            }
          })();
        })
        .catch(function () { fallbackFlash(overlay); });
    } else {
      fallbackFlash(overlay);
      new Audio('/lightning.mp3').play().catch(function () { });
    }
  }

  function fallbackFlash(overlay) {
    let alpha = 0, phase = 'in';
    (function frame() {
      if (phase === 'in') { alpha = Math.min(0.07, alpha + 0.02); if (alpha >= 0.07) phase = 'out'; }
      else alpha *= 0.87;
      overlay.style.opacity = alpha;
      if (alpha > 0.003) requestAnimationFrame(frame);
      else overlay.style.opacity = 0;
    })();
  }

  function isRainOn() {
    const btn = document.getElementById('rain-btn');
    return btn ? btn.classList.contains('rain-on') : false;
  }

  function initLightning() {
    getLightningOverlay();
    (function schedule() {
      setTimeout(function () {
        if (isRainOn()) triggerLightning();
        schedule();
      }, (150 + Math.random() * 270) * 1000);
    })();
  }


  // ══════════════════════════════════════════════════════════════════════════
  // PEER CURSORS
  // ══════════════════════════════════════════════════════════════════════════

  const _peers = {};
  function initPeerCursors() {
    let lastSent = 0;
    document.addEventListener('mousemove', function (e) {
      if (!_ws || _ws.readyState !== 1) return;
      const now = Date.now();
      if (now - lastSent < 16) return;
      lastSent = now;
      const zoom = parseFloat(getComputedStyle(document.documentElement).zoom) || 1;
      try {
        _ws.send(JSON.stringify({
          type: 'cursor',
          x: +(e.clientX / zoom).toFixed(1),
          y: +(e.clientY / zoom).toFixed(1),
        }));
      } catch (_) { }
    });
  }

  function handlePeerCursor(username, nx, ny) {
    if (!username || username === _myUsername) return;
    const zoom = parseFloat(getComputedStyle(document.documentElement).zoom) || 1;
    const tx = nx * zoom, ty = ny * zoom;
    if (!_peers[username]) {
      const color = _getUserColor ? _getUserColor(username) : '#aaaaaa';
      const el = document.createElement('div');
      el.style.cssText = [
        'position:fixed;top:0;left:0;pointer-events:none;z-index:9997',
        'display:flex;flex-direction:column;align-items:flex-start;gap:2px',
        'opacity:0;transition:opacity 0.3s ease;will-change:transform',
        'transform:translate(-9999px,-9999px)',
      ].join(';');
      const dot = document.createElement('div');
      dot.style.cssText = ['width:9px;height:9px;border-radius:50%;flex-shrink:0',
        'background:' + color + ';border:1.5px solid rgba(255,255,255,0.3)',
        'box-shadow:0 1px 5px rgba(0,0,0,0.6)'].join(';');
      const pill = document.createElement('div');
      pill.textContent = username;
      pill.style.cssText = ['font-size:9px;font-weight:bold;font-family:inherit;white-space:nowrap',
        'color:' + color + ';background:rgba(0,0,0,0.5)',
        'padding:1px 5px;border-radius:20px',
        'letter-spacing:0.02em;text-shadow:0 1px 2px rgba(0,0,0,0.9);line-height:1.6'].join(';');
      el.appendChild(dot); el.appendChild(pill);
      document.body.appendChild(el);
      const peer = { el, tx, ty, lastSeen: Date.now(), raf: null };
      _peers[username] = peer;
      requestAnimationFrame(function () { el.style.opacity = '1'; });
      (function loop() {
        const p = _peers[username]; if (!p) return;
        p.el.style.transform = 'translate(' + p.tx.toFixed(1) + 'px,' + p.ty.toFixed(1) + 'px)';
        const age = Date.now() - p.lastSeen;
        if (age > 4000) p.el.style.opacity = '0';
        if (age > 6000) { removePeerCursor(username); return; }
        p.raf = requestAnimationFrame(loop);
      })();
    } else {
      _peers[username].tx = tx; _peers[username].ty = ty;
      _peers[username].lastSeen = Date.now();
      _peers[username].el.style.opacity = '1';
    }
  }

  function removePeerCursor(username) {
    const p = _peers[username]; if (!p) return;
    if (p.raf) cancelAnimationFrame(p.raf);
    if (p.el) {
      p.el.style.opacity = '0';
      setTimeout(function () { if (p.el && p.el.parentNode) p.el.parentNode.removeChild(p.el); }, 400);
    }
    delete _peers[username];
  }


  // ══════════════════════════════════════════════════════════════════════════
  // KEYBOARD SOUNDS — NK Cream
  // ══════════════════════════════════════════════════════════════════════════

  const KEY_SOUND_MAP = {
    'KeyA': 'a', 'KeyB': 'b', 'KeyC': 'c', 'KeyD': 'd', 'KeyE': 'e', 'KeyF': 'f', 'KeyG': 'g',
    'KeyH': 'h', 'KeyI': 'i', 'KeyJ': 'j', 'KeyK': 'k', 'KeyL': 'l', 'KeyM': 'm', 'KeyN': 'n',
    'KeyO': 'o', 'KeyP': 'p', 'KeyQ': 'q', 'KeyR': 'r', 'KeyS': 's', 'KeyT': 't', 'KeyU': 'u',
    'KeyV': 'v', 'KeyW': 'w', 'KeyX': 'x', 'KeyY': 'y', 'KeyZ': 'z',
    'Space': 'space', 'Enter': 'enter', 'Backspace': 'backspace',
    'Tab': 'tab', 'CapsLock': 'caps lock',
    'ShiftLeft': 'shift', 'ShiftRight': 'shift',
    'BracketLeft': '[', 'BracketRight': ']',
    'Digit1': 'q', 'Digit2': 'w', 'Digit3': 'e', 'Digit4': 'r', 'Digit5': 't',
    'Digit6': 'y', 'Digit7': 'u', 'Digit8': 'i', 'Digit9': 'o', 'Digit0': 'p',
    'Semicolon': 'l', 'Quote': ']', 'Comma': 'm', 'Period': 'n', 'Slash': 'v',
    'Minus': '[', 'Equal': ']', 'Backquote': 'q',
    'ArrowUp': 'i', 'ArrowDown': 'k', 'ArrowLeft': 'j', 'ArrowRight': 'l',
    'Delete': 'backspace',
  };

  const BASE = '/sounds/', BUFFS = {};
  let _kbEnabled = true;

  function preloadSounds(ctx) {
    const files = [...new Set(Object.values(KEY_SOUND_MAP).filter(Boolean))];
    files.forEach(function (name) {
      fetch(BASE + name + '.wav')
        .then(function (r) { return r.arrayBuffer(); })
        .then(function (buf) { return ctx.decodeAudioData(buf); })
        .then(function (d) { BUFFS[name] = d; })
        .catch(function () { });
    });
  }

  function playKey(code) {
    if (!_kbEnabled) return;
    const name = KEY_SOUND_MAP[code]; if (!name) return;
    let ctx;
    try { ctx = _getCtx && _getCtx(); } catch (e) { return; }
    if (!ctx) return;
    if (Object.keys(BUFFS).length === 0) preloadSounds(ctx);
    const buf = BUFFS[name]; if (!buf) return;
    const src = ctx.createBufferSource(), gain = ctx.createGain();
    src.buffer = buf; gain.gain.value = 0.55;
    src.connect(gain); gain.connect(ctx.destination); src.start(0);
  }

  function initKeyboardSounds() {
    document.addEventListener('keydown', function (e) {
      if (!_kbEnabled || e.repeat) return;
      playKey(e.code);
    });

    // ── Sidebar button ─────────────────────────────────────────────────────
    _addSidebarBtn('keys', 'keys', function (on) {
      _kbEnabled = on;
      if (on) {
        let ctx; try { ctx = _getCtx && _getCtx(); } catch (e) { }
        if (ctx && Object.keys(BUFFS).length === 0) preloadSounds(ctx);
      }
    }, true);
  }


  // ══════════════════════════════════════════════════════════════════════════
  // KEYMAP — letter keys only, compact, class-based flash
  // ══════════════════════════════════════════════════════════════════════════

  const KM_ROWS = [
    ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
    ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'],
    ['shift', 'z', 'x', 'c', 'v', 'b', 'n', 'm', ',', '.'],
    ['space'],
  ];
  const KM_OFFSETS = [0, 0.5, 0, 0]; // shift key replaces stagger on row 2

  // KEY_W=26, GAP=5, UNIT=31
  // Spacebar offset: center it under the letter rows.
  // Row 0 total width = 10*26 + 9*5 = 305px, center = 152.5px
  // Spacebar 120px wide, so offset = 152.5 - 60 = 92.5 ≈ 93px
  const KM_SPACE_OFFSET = 93;

  const KM_CODE_POS = {
    'KeyQ': [0, 0], 'KeyW': [0, 1], 'KeyE': [0, 2], 'KeyR': [0, 3], 'KeyT': [0, 4],
    'KeyY': [0, 5], 'KeyU': [0, 6], 'KeyI': [0, 7], 'KeyO': [0, 8], 'KeyP': [0, 9],
    'KeyA': [1, 0], 'KeyS': [1, 1], 'KeyD': [1, 2], 'KeyF': [1, 3], 'KeyG': [1, 4],
    'KeyH': [1, 5], 'KeyJ': [1, 6], 'KeyK': [1, 7], 'KeyL': [1, 8],
    'ShiftLeft': [2, 0],
    'KeyZ': [2, 1], 'KeyX': [2, 2], 'KeyC': [2, 3], 'KeyV': [2, 4], 'KeyB': [2, 5],
    'KeyN': [2, 6], 'KeyM': [2, 7], 'Comma': [2, 8], 'Period': [2, 9],
    'Space': [3, 0],
  };

  let _keymapVisible = false;
  let _keymapEl = null;
  let _kmKeyEls = {}; // "r-c" → element
  let _kmShiftDown = false;

  // Inject keymap CSS once
  (function () {
    const style = document.createElement('style');
    style.textContent = [
      '@media(max-width:640px){#keymap-panel{display:none!important}}',
      '#keymap-panel{',
      'position:fixed;bottom:100px;left:0;',
      'padding:0;background:transparent;border:none;',
      'z-index:9995;width:fit-content;',
      'cursor:grab;user-select:none;-webkit-user-select:none;',
      '}',
      '#keymap-panel:active{cursor:grabbing}',
      '#keymap-panel .km-row{display:flex;gap:5px;margin-bottom:5px}',
      '#keymap-panel .km-key{',
      'width:26px;height:22px;',
      'display:flex;align-items:center;justify-content:center;',
      'border-radius:4px;',
      'background:var(--bg-btn);border:var(--border-main);box-shadow:var(--shadow-btn);',
      'font-size:9px;font-weight:bold;color:var(--text-dim);',
      'flex-shrink:0;cursor:inherit;',
      'transition:background 0.08s,color 0.08s,box-shadow 0.08s;',
      '}',
      '#keymap-panel .km-key.km-shift{width:40px}',
      '#keymap-panel .km-key.km-space{width:120px}',
      '#keymap-panel .km-key.km-flash{background:transparent;box-shadow:none;color:var(--text-main)}',
      '#keymap-panel .km-key.km-shift-active{background:var(--bg-input);box-shadow:var(--shadow-input);color:var(--text-main)}',
    ].join('');
    document.head.appendChild(style);
  })();

  function initKeymap() {
    if (window.innerWidth <= 640) return; // no keymap on mobile

    _addSidebarBtn('keymap', 'keymap', function (on) {
      _keymapVisible = on;
      if (!_keymapEl) buildKeymap();
      _keymapEl.style.display = on ? 'block' : 'none';
    });

    document.addEventListener('keydown', function (e) {
      if (!_keymapVisible || e.repeat) return;
      if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
        _kmShiftDown = true;
        _setKeymapCase(true);
        const shiftEl = _kmKeyEls['2-0'];
        if (shiftEl) shiftEl.classList.add('km-shift-active');
      }
      const pos = KM_CODE_POS[e.code];
      if (!pos) return;
      const el = _kmKeyEls[pos[0] + '-' + pos[1]];
      if (el) el.classList.add('km-flash');
    });

    document.addEventListener('keyup', function (e) {
      if (!_keymapVisible) return;
      if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
        _kmShiftDown = false;
        _setKeymapCase(false);
        const shiftEl = _kmKeyEls['2-0'];
        if (shiftEl) shiftEl.classList.remove('km-shift-active');
      }
      const pos = KM_CODE_POS[e.code];
      if (!pos) return;
      const el = _kmKeyEls[pos[0] + '-' + pos[1]];
      if (el) el.classList.remove('km-flash');
    });
  }

  function _setKeymapCase(upper) {
    const LETTER_KEYS = ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p',
      'a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l',
      'z', 'x', 'c', 'v', 'b', 'n', 'm'];
    KM_ROWS.forEach(function (row, ri) {
      row.forEach(function (label, ci) {
        if (LETTER_KEYS.indexOf(label) !== -1) {
          const el = _kmKeyEls[ri + '-' + ci];
          if (el) el.textContent = upper ? label.toUpperCase() : label;
        }
      });
    });
  }

  function buildKeymap() {
    _keymapEl = document.createElement('div');
    _keymapEl.id = 'keymap-panel';
    _keymapEl.style.display = 'none';

    const KEY_W = 26, GAP = 5, UNIT = KEY_W + GAP;

    KM_ROWS.forEach(function (row, ri) {
      const rowEl = document.createElement('div');
      rowEl.className = 'km-row';
      if (ri === 3) {
        rowEl.style.marginLeft = KM_SPACE_OFFSET + 'px';
      } else {
        rowEl.style.marginLeft = (KM_OFFSETS[ri] * UNIT) + 'px';
      }
      row.forEach(function (label, ci) {
        const key = document.createElement('div');
        key.className = 'km-key'
          + (label === 'space' ? ' km-space' : '')
          + (label === 'shift' ? ' km-shift' : '');
        key.textContent = label;
        _kmKeyEls[ri + '-' + ci] = key;
        rowEl.appendChild(key);
      });
      _keymapEl.appendChild(rowEl);
    });

    // Center within the main chat area (viewport minus sidebar ~240px), just above input
    var KM_WIDTH = 305;
    var z = parseFloat(getComputedStyle(document.documentElement).zoom) || 1;
    var sidebar = document.getElementById('sidebar');
    var sidebarW = sidebar ? sidebar.offsetWidth : 240;
    var chatW = (window.innerWidth / z) - sidebarW;
    var defaultLeft = Math.max(sidebarW, Math.round(sidebarW + (chatW - KM_WIDTH) / 2));
    _keymapEl.style.left = defaultLeft + 'px';
    _keymapEl.style.bottom = '125px';
    let dx = 0, dy = 0, mx = 0, my = 0, dragging = false;
    _keymapEl.addEventListener('mousedown', function (e) {
      dragging = true;
      mx = e.clientX; my = e.clientY;
      dx = parseInt(_keymapEl.style.left) || defaultLeft;
      dy = parseInt(_keymapEl.style.bottom) || 100;
      e.preventDefault();
    });
    document.addEventListener('mousemove', function (e) {
      if (!dragging) return;
      _keymapEl.style.left = Math.max(0, dx + (e.clientX - mx)) + 'px';
      _keymapEl.style.bottom = Math.max(0, dy - (e.clientY - my)) + 'px';
    });
    document.addEventListener('mouseup', function () { dragging = false; });

    document.body.appendChild(_keymapEl);
  }


  // ══════════════════════════════════════════════════════════════════════════
  // SHARED HELPER — add a toggle button to the sidebar settings panel
  // ══════════════════════════════════════════════════════════════════════════

  function _addSidebarBtn(labelOff, labelOn, onToggle, initialOn) {
    const panel = document.getElementById('sidebar-settings');
    if (!panel) return;

    let row = panel.querySelector('.km-btn-row');
    if (!row) {
      row = document.createElement('div');
      row.className = 'km-btn-row';
      row.style.cssText = 'display:flex;gap:4px;flex-wrap:wrap;';
      panel.appendChild(row);
    }

    let on = !!initialOn;
    const btn = document.createElement('button');
    btn.textContent = on ? labelOn : labelOff;
    btn.style.cssText = [
      'background:var(--bg-btn);color:var(--text-btn)',
      'border:var(--border-main);box-shadow:var(--shadow-btn)',
      'border-radius:var(--radius-btn);padding:3px 7px',
      'font-family:inherit;font-size:10px;font-weight:bold',
      'cursor:pointer;line-height:1.4;white-space:nowrap',
    ].join(';');
    if (on) {
      btn.style.background = 'var(--bg-input)';
      btn.style.boxShadow = 'var(--shadow-input)';
      btn.style.color = 'var(--text-main)';
    }
    btn.addEventListener('click', function () {
      on = !on;
      // text stays as labelOff — only visual state changes
      btn.style.background = on ? 'var(--bg-input)' : 'var(--bg-btn)';
      btn.style.boxShadow = on ? 'var(--shadow-input)' : 'var(--shadow-btn)';
      btn.style.color = on ? 'var(--text-main)' : 'var(--text-btn)';
      onToggle(on);
    });
    row.appendChild(btn);
  }

})();