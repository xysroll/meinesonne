/* ══════════════════════════════════════════════════════════════════════════
   funziez.js
   · Idle detection    — away state after 3 min of no movement
   · Message hover     — broadcast which message you're reading
   · Shift + Draw      — collaborative freehand calligraphy, strokes fade fast
   ══════════════════════════════════════════════════════════════════════════ */
(function () {
    'use strict';

    // ── CORE STATE ────────────────────────────────────────────────────────────
    let _ws = null;
    let _myUsername = null;

    // Peer positions: username → { x, y, idle }
    // x/y are CSS pixels, same coordinate space as clientX/Y
    const _peers = new Map();

    // ── UTILITIES ─────────────────────────────────────────────────────────────
    function getZoom() {
        return parseFloat(getComputedStyle(document.documentElement).zoom) || 1;
    }

    function send(obj) {
        if (_ws && _ws.readyState === 1) {
            try { _ws.send(JSON.stringify(obj)); } catch (_) { }
        }
    }

    function hexToRgb(hex) {
        if (!hex || typeof hex !== 'string' || !hex.startsWith('#') || hex.length < 7) {
            return [150, 150, 150];
        }
        return [
            parseInt(hex.slice(1, 3), 16),
            parseInt(hex.slice(3, 5), 16),
            parseInt(hex.slice(5, 7), 16),
        ];
    }

    function getUserColor(username) {
        return (window.getUserColor && window.getUserColor(username)) || '#aaaaaa';
    }

    // Find the ambient.js cursor element for a given username
    // Structure: body > div > [div.dot, div.pill(textContent=username)]
    function findCursorEl(username) {
        for (const el of document.body.children) {
            if (el.tagName !== 'DIV') continue;
            if (el.children.length >= 2 && el.children[1].textContent.trim() === username) return el;
        }
        return null;
    }

    // ── WEBSOCKET HOOKUP ──────────────────────────────────────────────────────
    // Attaches a message listener to a ws instance exactly once.
    function hookWs(ws) {
        if (!ws || ws._funziez) return;
        ws._funziez = true;
        ws.addEventListener('message', function (e) {
            let data;
            try { data = JSON.parse(e.data); } catch (_) { return; }
            handleMessage(data);
        });
    }

    // Intercept AmbientFX.updateWs to catch reconnects without modifying main.js
    function wrapAmbient() {
        if (!window.AmbientFX) return false;
        if (window.AmbientFX._funziez_wrapped) return true;
        window.AmbientFX._funziez_wrapped = true;
        const _orig = window.AmbientFX.updateWs;
        window.AmbientFX.updateWs = function (ws, username) {
            _orig.call(window.AmbientFX, ws, username);
            _ws = ws;
            _myUsername = username;
            hookWs(ws);
        };
        return true;
    }

    (function initWs() {
        // Try immediately, then poll until AmbientFX is available
        const t = setInterval(function () {
            if (window.ws) { _ws = window.ws; hookWs(window.ws); }
            if (window.myUsername) _myUsername = window.myUsername;
            if (wrapAmbient()) clearInterval(t);
        }, 80);
    })();

    // ── MESSAGE ROUTER ────────────────────────────────────────────────────────
    function handleMessage(data) {
        if (!data || !data.type) return;
        const from = data.username;
        if (!from || from === _myUsername) return;

        switch (data.type) {
            case 'cursor': {
                const zoom = getZoom();
                // data.x/y are logical pixels (clientX / zoom), convert back to CSS px
                _updatePeerPos(from, data.x * zoom, data.y * zoom);
                break;
            }
            case 'funz-idle': _setPeerIdle(from, true); break;
            case 'funz-active': _setPeerIdle(from, false); break;
            case 'funz-hover': _handleMsgHover(from, data.id || null); break;
            case 'funz-draw': _handlePeerDraw(data); break;
            case 'funz-drawmode': _setPeerDrawMode(from, data.active); break;
            case 'system':
                if (data.event === 'leave') _removePeer(from);
                break;
        }
    }

    function _updatePeerPos(username, x, y) {
        if (!_peers.has(username)) {
            _peers.set(username, { x, y, idle: false });
        } else {
            const p = _peers.get(username);
            p.x = x; p.y = y;
        }
    }

    function _removePeer(username) {
        _peers.delete(username);
        _msgHovers.delete(username);
        _peerStrokes.forEach(function (stroke, id) {
            if (stroke.username === username) _peerStrokes.delete(id);
        });
    }

    function _setPeerDrawMode(username, active) {
        const el = findCursorEl(username);
        if (el) el.style.visibility = active ? 'hidden' : '';
    }

    // ══════════════════════════════════════════════════════════════════════════
    // IDLE DETECTION
    // ══════════════════════════════════════════════════════════════════════════
    const IDLE_DELAY = 3 * 60 * 1000; // 3 minutes
    let _idleTimer = null;
    let _amIdle = false;

    function initIdle() {
        function onActivity() {
            if (_amIdle) {
                _amIdle = false;
                if (_myUsername) send({ type: 'funz-active', username: _myUsername });
            }
            clearTimeout(_idleTimer);
            _idleTimer = setTimeout(goIdle, IDLE_DELAY);
        }

        function goIdle() {
            if (_amIdle) return;
            _amIdle = true;
            if (_myUsername) send({ type: 'funz-idle', username: _myUsername });
        }

        ['mousemove', 'keydown', 'mousedown', 'touchstart'].forEach(function (ev) {
            document.addEventListener(ev, onActivity, { passive: true });
        });

        onActivity(); // start the timer immediately
    }

    function _setPeerIdle(username, idle) {
        if (_peers.has(username)) _peers.get(username).idle = idle;

        // Update the ambient.js cursor element
        const el = findCursorEl(username);
        if (!el) return;

        el.style.opacity = idle ? '0.3' : '1';

        let badge = el.querySelector('.funz-away-badge');
        if (idle && !badge) {
            badge = document.createElement('div');
            badge.className = 'funz-away-badge';
            badge.textContent = 'away';
            badge.style.cssText = [
                'font-size:8px;font-weight:bold;font-family:inherit;',
                'letter-spacing:0.1em;text-transform:uppercase;',
                'color:rgba(255,255,255,0.4);',
                'background:rgba(0,0,0,0.45);',
                'padding:1px 5px;border-radius:10px;',
                'margin-top:1px;',
            ].join('');
            el.appendChild(badge);
        } else if (!idle && badge) {
            badge.remove();
        }
    }

    // ══════════════════════════════════════════════════════════════════════════
    // MESSAGE HOVER BROADCAST
    // ══════════════════════════════════════════════════════════════════════════

    // peer username → { msgId, badgeEl, timer }
    const _msgHovers = new Map();
    let _myHoveredId = null;

    function initMsgHover() {
        // Inject styles
        const style = document.createElement('style');
        style.textContent = [
            '.msg { position: relative; }',
            '.funz-msg-glow {',
            '  background: rgba(255,255,255,0.022) !important;',
            '  outline: 1px solid rgba(255,255,255,0.07) !important;',
            '  outline-offset: -1px;',
            '}',
            '.funz-reader {',
            '  position: absolute;',
            '  right: 10px;',
            '  top: 50%;',
            '  transform: translateY(-50%);',
            '  font-size: 9px;',
            '  font-weight: bold;',
            '  font-family: inherit;',
            '  letter-spacing: 0.04em;',
            '  pointer-events: none;',
            '  white-space: nowrap;',
            '  opacity: 0.6;',
            '  z-index: 5;',
            '  transition: opacity 0.3s;',
            '}',
        ].join('\n');
        document.head.appendChild(style);

        const container = document.getElementById('messages');
        if (!container) return;

        let _lastSentId = null;

    let _hoverTimer = null;

    container.addEventListener('mouseover', function (e) {
        const msg = e.target.closest('.msg[data-msg-id]');
        if (!msg) return;
        const id = msg.dataset.msgId;
        if (id === _lastSentId) return;
        _lastSentId = id;
        
        clearTimeout(_hoverTimer);
        _hoverTimer = setTimeout(() => {
            _myHoveredId = id;
            if (_myUsername) send({ type: 'funz-hover', id, username: _myUsername });
        }, 150);
    });

    container.addEventListener('mouseleave', function () {
        clearTimeout(_hoverTimer);
        if (!_lastSentId) return;
        _lastSentId = null;
        _myHoveredId = null;
        if (_myUsername) send({ type: 'funz-hover', id: null, username: _myUsername });
    });

    container.addEventListener('mouseout', function (e) {
        const msg = e.target.closest('.msg[data-msg-id]');
        if (!msg || msg.dataset.msgId !== _lastSentId) return;
        if (msg.contains(e.relatedTarget)) return; // moved to child
        clearTimeout(_hoverTimer);
        _lastSentId = null;
        _myHoveredId = null;
        if (_myUsername) send({ type: 'funz-hover', id: null, username: _myUsername });
    });
    }

    function _handleMsgHover(username, msgId) {
        // Clear previous hover for this user
        const prev = _msgHovers.get(username);
        if (prev) {
            clearTimeout(prev.timer);
            _clearMsgGlow(prev.msgId, prev.badgeEl);
            _msgHovers.delete(username);
        }

        if (!msgId) return;

        const msg = document.querySelector(`.msg[data-msg-id="${CSS.escape(msgId)}"]`);
        if (!msg) return;

        msg.classList.add('funz-msg-glow');

        const badge = document.createElement('div');
        badge.className = 'funz-reader';
        badge.style.color = getUserColor(username);
        badge.textContent = '👁 ' + username;
        msg.appendChild(badge);

        const timer = setTimeout(function () {
            _clearMsgGlow(msgId, badge);
            _msgHovers.delete(username);
        }, 3500);

        _msgHovers.set(username, { msgId, badgeEl: badge, timer });
    }

    function _clearMsgGlow(msgId, badgeEl) {
        if (badgeEl && badgeEl.parentNode) badgeEl.remove();
        const msg = document.querySelector(`.msg[data-msg-id="${CSS.escape(msgId)}"]`);
        if (msg) msg.classList.remove('funz-msg-glow');
    }

    // ══════════════════════════════════════════════════════════════════════════
    // SHIFT + DRAW
    // ══════════════════════════════════════════════════════════════════════════
    const STROKE_LIFE = 7500;  // ms — total stroke lifetime
    const STROKE_FADE_AT = 5000;  // ms — begin fading after 5 s
    const DRAW_THROTTLE = 80;    // ms between sent packets (~12fps) to avoid proxy disconnects

    let _drawCanvas, _drawCtx;
    let _shiftHeld = false;
    let _drawing = false;
    let _strokeId = null;
    let _ownPoints = []; // live reference for current stroke
    let _lastDrawSent = 0;

    // Own strokes: strokeId → { points, color, pencil, startedAt }
    const _ownStrokes = new Map();
    // Peer strokes: strokeId → { points, color, pencil, username, startedAt }
    const _peerStrokes = new Map();

    // ── Pencil selection ──────────────────────────────────────────────────────
    let _pencilIdx = 0; // cycles with RShift

    // ── Input smoothing (EMA) ─────────────────────────────────────────────────
    // Exponential moving average applied to raw cursor coords before storing.
    // Lower = silkier but more lag; 0.38 gives a nice Photoshop-ish feel.
    const SMOOTH_FACTOR = 0.38;
    const MIN_PX_DIST = 2;    // skip point if cursor hasn't moved this far
    let _smoothX = 0, _smoothY = 0;

    function initDraw() {
        _drawCanvas = document.createElement('canvas');
        _drawCanvas.style.cssText = [
            'position:fixed;inset:0;width:100%;height:100%;',
            'z-index:9996;pointer-events:none;',
        ].join('');
        document.body.appendChild(_drawCanvas);

        // ── Pencil popup ────────────────────────────────────────────────────────
        const _popup = document.createElement('div');
        _popup.style.cssText = [
            'position:fixed;bottom:20px;right:20px;',
            'z-index:10001;pointer-events:none;',
            'font-family:system-ui,sans-serif;',
            'font-size:13px;font-weight:600;letter-spacing:0.03em;',
            'color:rgba(0,0,0,0.7);background:rgba(255,255,255,0.88);',
            'border:1px solid rgba(0,0,0,0.1);',
            'padding:5px 10px;border-radius:8px;',
            'box-shadow:0 2px 8px rgba(0,0,0,0.12);',
            'opacity:0;transition:opacity 0.2s;',
        ].join('');
        document.body.appendChild(_popup);

        let _popupTimer = null;
        function _showPencilPopup() {
            const p = _pencils[_pencilIdx];
            _popup.textContent = _pencilIdx + 1 + '  ' + p.name;
            _popup.style.opacity = '1';
            clearTimeout(_popupTimer);
            _popupTimer = setTimeout(function () {
                _popup.style.opacity = '0';
            }, 1800);
        }

        function resize() {
            _drawCanvas.width = window.innerWidth;
            _drawCanvas.height = window.innerHeight;
            _drawCtx = _drawCanvas.getContext('2d');
        }
        resize();
        window.addEventListener('resize', resize);

        // ── Key events ──────────────────────────────────────────────────────────
        document.addEventListener('keydown', function (e) {
            // RShift → cycle pencil (never enters draw mode)
            if (e.code === 'ShiftRight') {
                _pencilIdx = (_pencilIdx + 1) % _pencils.length;
                _showPencilPopup();
                return;
            }
            if (e.code !== 'ShiftLeft') return;
            if (_shiftHeld) return;
            _shiftHeld = true;
            _drawCanvas.style.pointerEvents = 'all';
            send({ type: 'funz-drawmode', active: true, username: _myUsername });
        });

        document.addEventListener('keyup', function (e) {
            if (e.code !== 'ShiftLeft') return;
            _exitDrawMode(true);
        });

        // Safety: if window loses focus, exit draw mode
        window.addEventListener('blur', function () { _exitDrawMode(true); });

        // ── Mouse events (draw canvas captures them when shiftHeld) ─────────────
        document.addEventListener('mousedown', function (e) {
            if (!_shiftHeld || e.button !== 0) return;
            e.preventDefault();
            _drawing = true;
            _strokeId = Date.now() + '_' + Math.random().toString(36).slice(2, 6);
            _ownPoints = [];

            // Seed EMA at exact click position — no lag on stroke start
            _smoothX = e.clientX;
            _smoothY = e.clientY;
            _ownPoints.push(_normPt(_smoothX, _smoothY));

            const color = '#000000';
            _ownStrokes.set(_strokeId, { points: _ownPoints, color, pencil: _pencilIdx, startedAt: Date.now() });
        });

        document.addEventListener('mousemove', function (e) {
            if (!_shiftHeld || !_drawing) return;

            // EMA: blend toward raw cursor each frame
            _smoothX += (e.clientX - _smoothX) * SMOOTH_FACTOR;
            _smoothY += (e.clientY - _smoothY) * SMOOTH_FACTOR;

            // Only store if we've moved far enough — reduces point density clutter
            const prev = _ownPoints[_ownPoints.length - 1];
            const dx = _smoothX - prev.x * window.innerWidth;
            const dy = _smoothY - prev.y * window.innerHeight;
            if (dx * dx + dy * dy < MIN_PX_DIST * MIN_PX_DIST) return;

            _ownPoints.push(_normPt(_smoothX, _smoothY));

            const now = Date.now();
            if (now - _lastDrawSent < DRAW_THROTTLE) return;
            _lastDrawSent = now;

            // Send the last ~6 points to keep packets small
            const slice = _ownPoints.slice(-6);
            send({
                type: 'funz-draw',
                strokeId: _strokeId,
                points: slice,
                color: '#000000',
                pencil: _pencilIdx,
                done: false,
            });
        });

        document.addEventListener('mouseup', function (e) {
            if (!_drawing || e.button !== 0) return;
            _finishStroke();
        });

        requestAnimationFrame(_renderDraw);
    }

    function _normPt(cx, cy) {
        return {
            x: cx / window.innerWidth,
            y: cy / window.innerHeight,
        };
    }

    function _finishStroke() {
        if (!_drawing) return;
        _drawing = false;
        const stroke = _ownStrokes.get(_strokeId);
        if (stroke) {
            send({
                type: 'funz-draw', strokeId: _strokeId, points: [], done: true,
                color: stroke.color, pencil: stroke.pencil,
            });
        }
        _strokeId = null;
        _ownPoints = [];
    }

    function _exitDrawMode(finishStroke) {
        if (!_shiftHeld) return;
        _shiftHeld = false;
        _drawCanvas.style.pointerEvents = 'none';
        send({ type: 'funz-drawmode', active: false, username: _myUsername });
        if (finishStroke && _drawing) _finishStroke();
    }

    function _handlePeerDraw(data) {
        const { strokeId, points, color, done } = data;
        if (!strokeId) return;

        if (!_peerStrokes.has(strokeId)) {
            _peerStrokes.set(strokeId, {
                points: [],
                color: color || '#000000',
                pencil: data.pencil || 0,
                username: data.username,
                startedAt: Date.now(),
                done: false,
            });
        }

        const stroke = _peerStrokes.get(strokeId);
        if (points && points.length) {
            // Denormalize from 0-1 to CSS pixels on receive
            points.forEach(function (p) {
                stroke.points.push({
                    x: p.x * window.innerWidth,
                    y: p.y * window.innerHeight,
                });
            });
        }
        if (done) stroke.done = true;
    }

    function _renderDraw() {
        requestAnimationFrame(_renderDraw);
        if (!_drawCtx) return;

        const ctx = _drawCtx;
        const now = Date.now();

        // Cull expired strokes
        _ownStrokes.forEach(function (s, id) { if (now - s.startedAt > STROKE_LIFE) _ownStrokes.delete(id); });
        _peerStrokes.forEach(function (s, id) { if (now - s.startedAt > STROKE_LIFE) _peerStrokes.delete(id); });

        ctx.clearRect(0, 0, _drawCanvas.width, _drawCanvas.height);

        // Draw own strokes — points are already in CSS pixels via _normPt + denorm below
        _ownStrokes.forEach(function (stroke) {
            const pts = stroke.points.map(function (p) {
                return { x: p.x * window.innerWidth, y: p.y * window.innerHeight };
            });
            _renderStroke(ctx, pts, stroke.color, now - stroke.startedAt, stroke.pencil);
        });

        _peerStrokes.forEach(function (stroke) {
            _renderStroke(ctx, stroke.points, stroke.color, now - stroke.startedAt, stroke.pencil);
        });
    }

    // ── Chaikin corner-cutting ────────────────────────────────────────────────
    function _chaikin(pts, passes) {
        let p = pts;
        for (let pass = 0; pass < passes; pass++) {
            if (p.length < 3) break;
            const out = [p[0]];
            for (let i = 0; i < p.length - 1; i++) {
                out.push({ x: p[i].x * 0.75 + p[i + 1].x * 0.25, y: p[i].y * 0.75 + p[i + 1].y * 0.25 });
                out.push({ x: p[i].x * 0.25 + p[i + 1].x * 0.75, y: p[i].y * 0.25 + p[i + 1].y * 0.75 });
            }
            out.push(p[p.length - 1]);
            p = out;
        }
        return p;
    }

    // ── Shared shape filler ───────────────────────────────────────────────────
    function _fillNibShape(ctx, left, right, fillStyle, glowColor) {
        if (left.length < 2) return;
        const trace = function (edgePts, forward) {
            const arr = forward ? edgePts : [...edgePts].reverse();
            for (let i = 1; i < arr.length - 1; i++) {
                const mx = (arr[i].x + arr[i + 1].x) / 2, my = (arr[i].y + arr[i + 1].y) / 2;
                ctx.quadraticCurveTo(arr[i].x, arr[i].y, mx, my);
            }
            ctx.lineTo(arr[arr.length - 1].x, arr[arr.length - 1].y);
        };
        ctx.save();
        if (glowColor) { ctx.shadowBlur = 8; ctx.shadowColor = glowColor; }
        ctx.beginPath();
        ctx.moveTo(left[0].x, left[0].y);
        trace(left, true);
        ctx.lineTo(right[right.length - 1].x, right[right.length - 1].y);
        trace(right, false);
        ctx.closePath();
        ctx.fillStyle = fillStyle;
        ctx.fill();
        ctx.restore();
    }

    // ── Nib edge builder (parametrized) ───────────────────────────────────────
    // minFrac: minimum width as fraction of maxW (prevents invisible strokes)
    function _nibEdgesAngled(pts, nibAngle, maxW, minFrac) {
        const left = [], right = [];
        for (let i = 0; i < pts.length; i++) {
            let dx, dy;
            if (i === 0) { dx = pts[1].x - pts[0].x; dy = pts[1].y - pts[0].y; }
            else if (i === pts.length - 1) { dx = pts[i].x - pts[i - 1].x; dy = pts[i].y - pts[i - 1].y; }
            else { dx = pts[i + 1].x - pts[i - 1].x; dy = pts[i + 1].y - pts[i - 1].y; }
            const moveAngle = Math.atan2(dy, dx);
            const hw = (maxW * (minFrac + (1 - minFrac) * Math.abs(Math.sin(moveAngle - nibAngle)))) / 2;
            const ox = Math.cos(nibAngle) * hw, oy = Math.sin(nibAngle) * hw;
            left.push({ x: pts[i].x - ox, y: pts[i].y - oy });
            right.push({ x: pts[i].x + ox, y: pts[i].y + oy });
        }
        return { left, right };
    }

    // ── Brush edge builder (speed → width, tapered ends) ──────────────────────
    function _brushEdges(pts) {
        const left = [], right = [];
        for (let i = 0; i < pts.length; i++) {
            let dx, dy;
            if (i === 0) { dx = pts[1].x - pts[0].x; dy = pts[1].y - pts[0].y; }
            else if (i === pts.length - 1) { dx = pts[i].x - pts[i - 1].x; dy = pts[i].y - pts[i - 1].y; }
            else { dx = pts[i + 1].x - pts[i - 1].x; dy = pts[i + 1].y - pts[i - 1].y; }
            const len = Math.sqrt(dx * dx + dy * dy) || 1;
            // Normal direction (perpendicular to movement)
            const nx = -dy / len, ny = dx / len;
            // Fast stroke = thin, slow stroke = thick
            const speed = len;
            const speedW = Math.max(2, Math.min(11, 14 / (1 + speed * 0.07)));
            // Taper: sin curve from 0→1→0 over stroke length
            const taper = Math.sin(Math.PI * i / Math.max(pts.length - 1, 1));
            const hw = speedW * (0.15 + 0.85 * taper) / 2;
            left.push({ x: pts[i].x + nx * hw, y: pts[i].y + ny * hw });
            right.push({ x: pts[i].x - nx * hw, y: pts[i].y - ny * hw });
        }
        return { left, right };
    }

    // ── Round stroke (marker / fineliner) ─────────────────────────────────────
    function _renderRoundStroke(ctx, pts, strokeStyle, lineWidth) {
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        for (let i = 1; i < pts.length - 1; i++) {
            const mx = (pts[i].x + pts[i + 1].x) / 2, my = (pts[i].y + pts[i + 1].y) / 2;
            ctx.quadraticCurveTo(pts[i].x, pts[i].y, mx, my);
        }
        ctx.lineTo(pts[pts.length - 1].x, pts[pts.length - 1].y);
        ctx.strokeStyle = strokeStyle;
        ctx.lineWidth = lineWidth;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.stroke();
        ctx.restore();
    }

    // ── Pencil definitions ────────────────────────────────────────────────────
    // Each has a name and a render(ctx, smoothPts, r, g, b, alpha) function.
    const _pencils = [
        {
            name: 'Calligraphy',
            render: function (ctx, pts, r, g, b, a) {
                const { left, right } = _nibEdgesAngled(pts, Math.PI / 4, 10, 0.35);
                _fillNibShape(ctx, left, right, `rgba(${r},${g},${b},${a})`, `rgba(${r},${g},${b},${a * 0.25})`);
            },
        },
        {
            name: 'Marker',
            render: function (ctx, pts, r, g, b, a) {
                // Two passes: thick semi-transparent body + thin opaque edge for marker feel
                _renderRoundStroke(ctx, pts, `rgba(${r},${g},${b},${a * 0.55})`, 13);
                _renderRoundStroke(ctx, pts, `rgba(${r},${g},${b},${a * 0.9})`, 2);
            },
        },
        {
            name: 'Brush',
            render: function (ctx, pts, r, g, b, a) {
                const { left, right } = _brushEdges(pts);
                _fillNibShape(ctx, left, right, `rgba(${r},${g},${b},${a})`, null);
            },
        },
        {
            name: 'Chisel',
            render: function (ctx, pts, r, g, b, a) {
                // Horizontal nib — fat on vertical strokes, razor-thin on horizontal
                const { left, right } = _nibEdgesAngled(pts, 0, 13, 0.08);
                _fillNibShape(ctx, left, right, `rgba(${r},${g},${b},${a})`, null);
            },
        },
        {
            name: 'Fineliner',
            render: function (ctx, pts, r, g, b, a) {
                _renderRoundStroke(ctx, pts, `rgba(${r},${g},${b},${a})`, 1.5);
            },
        },
    ];

    // ── Main stroke renderer ──────────────────────────────────────────────────
    function _renderStroke(ctx, pts, color, age, pencilIdx) {
        if (pts.length < 2) return;

        const [r, g, b] = hexToRgb(color);

        let alpha = 1;
        if (age > STROKE_FADE_AT) {
            alpha = 1 - (age - STROKE_FADE_AT) / (STROKE_LIFE - STROKE_FADE_AT);
        }
        alpha = Math.max(0, Math.min(1, alpha));

        const smooth = _chaikin(pts, 2);
        const pencil = _pencils[pencilIdx || 0];
        pencil.render(ctx, smooth, r, g, b, alpha);
    }

    // ── BOOT ──────────────────────────────────────────────────────────────────
    function boot() {
        initIdle();
        initMsgHover();
        initDraw();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot);
    } else {
        boot();
    }

})();