// cursors.js — custom cursor pack switcher
// Positioned below the layout switcher (bubble/cozy/compact), only visible on app-size-3

(function () {
    var CURSOR_KEY = 'chat-cursor-pack';
    var SWITCHER_W = 245;
    var SWITCHER_H = 35;
    var SWITCHER_PANEL_W = 240;
    var SWITCHER_GAP = 8;

    // Pack definitions — each entry maps CSS cursor roles to .cur file paths
    // 'default' is required; all others fall back to system if not defined
    var PACKS = {
        'off': null,
        '1': {
            label: '1',
            name: 'Diablo II',
            base: '/cursors/diablo-ii/',
            cursors: {
                'default': 'normal.cur',
                'pointer': 'pointer.cur',
                'text': 'text.cur',
                'move': 'move.cur',
                'help': 'help.cur',
                'not-allowed': 'unavailable.cur',
                'copy': 'alternate.cur',
                'cell': 'pen.cur',
            }
        },
        '2': {
            label: '2',
            name: 'Diablo IV',
            base: '/cursors/diablo-iv/',
            cursors: {
                'default': 'normal.cur',
                'pointer': 'pointer.cur',
                'text': 'text.cur',
                'move': 'move.cur',
                'help': 'help.cur',
                'not-allowed': 'unavailable.cur',
                'crosshair': 'crosshair.cur',
                'copy': 'alternate.cur',
                'cell': 'pen.cur',
                'nesw-resize': 'nesw-resize.cur',
                'nwse-resize': 'nwse-resize.cur',
                'ew-resize': 'ew-resize.cur',
                'ns-resize': 'ns-resize.cur',
            }
        },
        '3': {
            label: '3',
            name: "Baldur's Gate 3",
            base: '/cursors/baldurs-gate-3/',
            cursors: {
                'default': 'normal.cur',
                'pointer': 'pointer.cur',
                'text': 'text.cur',
                'move': 'move.cur',
                'not-allowed': 'unavailable.cur',
                'cell': 'pen.cur',
                'alias': 'alternate.cur',
                'nesw-resize': 'nesw-resize.cur',
                'nwse-resize': 'nwse-resize.cur',
                'ew-resize': 'ew-resize.cur',
                'ns-resize': 'ns-resize.cur',
            }
        },
        '4': {
            label: '4',
            name: 'Morrowind',
            base: '/cursors/morrowind/',
            cursors: {
                'default': 'normal.cur',
                'pointer': 'pointer.cur',
                'text': 'text.cur',
                'move': 'move.cur',
                'help': 'help.cur',
                'not-allowed': 'unavailable.cur',
                'copy': 'alternate.cur',
                'cell': 'pen.cur',
                'nesw-resize': 'nesw-resize.cur',
                'nwse-resize': 'nwse-resize.cur',
                'ew-resize': 'ew-resize.cur',
                'ns-resize': 'ns-resize.cur',
            }
        },
        '5': {
            label: '5',
            name: "Andrea's Choice",
            base: '/cursors/andrea/',
            cursors: {
                'default': 'normal.cur',
            }
        },
        '6': {
            label: '6',
            name: 'Supple Remixed',
            base: '/cursors/supple/',
            cursors: {
                'default': 'normal.cur',
                'pointer': 'pointer.cur',
                'copy': 'alternate.cur',
            }
        },
    };

    var styleEl = null;

    function cur(pack, role, fallback) {
        var file = pack.cursors[role];
        return file ? 'url("' + pack.base + file + '"), ' + fallback : fallback;
    }

    function buildCSS(pack) {
        if (!pack) return '';
        var rules = [];
        // Set default on html so everything inherits it
        rules.push('html, body, * { cursor: ' + cur(pack, 'default', 'default') + ' !important; }');
        // Override specific roles
        rules.push('a, button, [role="button"], .btn, .tb-toggle-btn, label[for], .user-item, .msg-action-btn, .ctx-item, .color-swatch, #avatar-preview, .msg-reply-preview, [style*="cursor:pointer"], [style*="cursor: pointer"] { cursor: ' + cur(pack, 'pointer', 'pointer') + ' !important; }');
        rules.push('input[type="text"], input[type="search"], input[type="email"], input[type="password"], textarea, [contenteditable] { cursor: ' + cur(pack, 'text', 'text') + ' !important; }');
        rules.push('[disabled], .disabled { cursor: ' + cur(pack, 'not-allowed', 'not-allowed') + ' !important; }');
        rules.push('.cp-picker { cursor: ' + cur(pack, 'crosshair', 'crosshair') + ' !important; }');
        return rules.join('\n');
    }

    function applyCursorPack(id) {
        if (!styleEl) {
            styleEl = document.createElement('style');
            styleEl.id = 'cursor-pack-style';
            document.head.appendChild(styleEl);
        }
        var pack = PACKS[id];
        styleEl.textContent = pack ? buildCSS(pack) : '';
        window.lsSet(CURSOR_KEY, id);
        // Update switcher button states
        var switcher = document.getElementById('cursor-switcher');
        if (switcher) {
            switcher.querySelectorAll('.tb-toggle-btn').forEach(function (btn) {
                btn.classList.toggle('tb-active', btn.dataset.val === id);
            });
        }
    }

    // Build the switcher widget
    function buildSwitcher() {
        var existing = document.getElementById('cursor-switcher');
        if (existing) return;

        var sw = document.createElement('div');
        sw.id = 'cursor-switcher';

        Object.keys(PACKS).forEach(function (id) {
            var btn = document.createElement('button');
            btn.className = 'tb-toggle-btn';
            btn.dataset.val = id;
            btn.textContent = id === 'off' ? 'off' : id;
            if (PACKS[id]) btn.title = PACKS[id].name;
            sw.appendChild(btn);
        });

        sw.addEventListener('click', function (e) {
            var b = e.target.closest('.tb-toggle-btn');
            if (b) applyCursorPack(b.dataset.val);
        });

        document.body.appendChild(sw);
        positionSwitcher();
    }

    function _colGeometry() {
        var inner = document.getElementById('chat-screen-inner');
        if (!inner) return null;
        var z = parseFloat(getComputedStyle(document.documentElement).zoom) || 1;
        var r = inner.getBoundingClientRect();
        var vw = window.innerWidth / z;
        var right = r.right / z;
        var top = r.top / z;
        var height = r.height / z;
        var rightAvail = vw - right - SWITCHER_GAP * 2;
        if (rightAvail < SWITCHER_PANEL_W) return null;
        var panelLeft = right + SWITCHER_GAP + Math.round((rightAvail - SWITCHER_PANEL_W) / 2);
        var panelH = Math.round(height * 0.82);
        var panelTop = top + SWITCHER_GAP + Math.round((height - panelH) / 2);
        return { left: panelLeft, panelTop: panelTop, panelH: panelH };
    }

    function positionSwitcher() {
        var sw = document.getElementById('cursor-switcher');
        if (!sw) return;
        var geo = _colGeometry();
        if (!geo) return;
        var left = geo.left + (SWITCHER_PANEL_W / 2) - (SWITCHER_W / 2);
        // Place just below the bottom of the glossary panel
        var top = geo.panelTop + geo.panelH + 20;
        sw.style.left = left + 'px';
        sw.style.top = top + 'px';
        sw.style.width = SWITCHER_W + 'px';
        sw.style.height = SWITCHER_H + 'px';
        sw.style.opacity = '1';
        sw.style.pointerEvents = 'all';
    }

    // Inject styles — mirrors #layout-switcher, hidden on size 1 & 2
    var style = document.createElement('style');
    style.textContent = [
        '#cursor-switcher {',
        '  position: fixed;',
        '  z-index: 200;',
        '  display: none;',
        '  width: ' + SWITCHER_W + 'px;',
        '  border: var(--border-main);',
        '  border-radius: var(--radius-btn);',
        '  box-shadow: var(--shadow-btn);',
        '  overflow: hidden;',
        '  left: -9999px;',
        '  top: -9999px;',
        '}',
        'body.app-size-3 #cursor-switcher {',
        '  display: flex;',
        '}',
        '#cursor-switcher .tb-toggle-btn {',
        '  flex: 1;',
        '  padding: 8px 0;',
        '  font-size: 11px;',
        '  text-align: center;',
        '  border-left: var(--border-main);',
        '}',
        '#cursor-switcher .tb-toggle-btn:first-child {',
        '  border-left: none;',
        '}',
    ].join('\n');
    document.head.appendChild(style);

    // Init — run after DOM is ready (script is at bottom of body)
    function init() {
        buildSwitcher();
        var saved = window.lsGet ? window.lsGet(CURSOR_KEY, 'off') : (localStorage.getItem(CURSOR_KEY) || 'off');
        applyCursorPack(saved);
        if (window.positionLayoutSwitcher) window.positionLayoutSwitcher();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    window.addEventListener('resize', positionSwitcher);
    new MutationObserver(positionSwitcher).observe(
        document.body, { attributes: true, attributeFilter: ['class'] }
    );

    // Re-position when layout switcher repositions
    var origPosition = window.positionLayoutSwitcher;
    window.positionLayoutSwitcher = function () {
        if (origPosition) origPosition();
        positionSwitcher();
    };
})();