// ── LOCAL STORAGE HELPERS ───────────────────────────────────────────────
window.lsGet = function (key, def) {
  try { var v = localStorage.getItem(key); return v !== null ? v : def; } catch (e) { return def; }
};
window.lsSet = function (key, val) {
  try { localStorage.setItem(key, val); } catch (e) { }
};

// ── AVATAR HELPERS ───────────────────────────────────────────────────────
window.getMyAvatar = function () {
  try { return localStorage.getItem('chat-avatar') || null; } catch (e) { return null; }
};
window.setMyAvatar = function (dataUrl) {
  try { localStorage.setItem('chat-avatar', dataUrl); } catch (e) { }
};
window.clearMyAvatar = function () {
  try { localStorage.removeItem('chat-avatar'); } catch (e) { }
};

// Returns a fully built avatar element — img if the user has a saved avatar, else letter div
window.buildAvatarEl = function (username, extraClass) {
  const cls = extraClass || 'msg-avatar';
  const el = document.createElement('div');
  el.className = cls;

  // Own avatar: check localStorage; others: check userAvatars map
  const avatarSrc = username === window.myUsername
    ? window.getMyAvatar()
    : (window.userAvatars.get(username) || null);

  if (avatarSrc) {
    el.style.background = 'none';
    el.textContent = '';
    const img = document.createElement('img');
    img.src = avatarSrc;
    img.style.cssText = 'width:100%;height:100%;object-fit:cover;border-radius:inherit;display:block;';
    el.appendChild(img);
    return el;
  }
  el.style.background = window.getUserColor(username);
  el.textContent = username.charAt(0).toUpperCase();
  return el;
};

// ── COLOR SWATCHES & USER COLORS ────────────────────────────────────────
window.USER_COLORS = [
  '#3a86ff', '#0ea5e9', '#6366f1', '#818cf8', '#8338ec', '#a855f7', '#ff006e', '#f472b6',
  '#ef4444', '#fb5607', '#f97316', '#f4a261', '#ffbe0b', '#facc15', '#2a9d8f', '#22c55e',
  '#06b6d4', '#14b8a6', '#10b981', '#84cc16', '#e76f51', '#94a3b8', '#64748b', '#475569',
  '#1e293b', '#0f172a', '#111111', '#ffffff', '#c0392b', '#27ae60', '#2980b9', '#8e44ad',
];

window.userColors = new Map();
window.userAvatars = new Map();
window.userColorOverride = window.lsGet('chat-color', null);

window.getUserColor = function (username) {
  if (username === window.myUsername && window.userColorOverride) return window.userColorOverride;
  if (window.userColors.has(username)) return window.userColors.get(username);
  let hash = 0;
  for (let i = 0; i < username.length; i++) {
    hash = Math.imul(31, hash) + username.charCodeAt(i) | 0;
  }
  return window.USER_COLORS[Math.abs(hash) % window.USER_COLORS.length];
};

function hexToRgb(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return 'rgb(' + r + ', ' + g + ', ' + b + ')';
}

(function initSwatches() {
  const container = document.getElementById('color-swatches');
  if (!window.userColorOverride) {
    window.userColorOverride = window.USER_COLORS[0];
    window.lsSet('chat-color', window.userColorOverride);
  }
  window.USER_COLORS.forEach(function (hex) {
    const s = document.createElement('div');
    s.className = 'color-swatch' + (hex === window.userColorOverride ? ' selected' : '');
    s.style.background = hex;
    s.title = hex;
    s.addEventListener('click', function () {
      window.userColorOverride = hex;
      window.lsSet('chat-color', hex);
      container.querySelectorAll('.color-swatch').forEach(function (el) {
        el.classList.toggle('selected', el.style.background === hex || el.style.background === hexToRgb(hex));
      });
    });
    container.appendChild(s);
  });
})();

// ── THEME & ROUNDED LOGIC ─────────────────────────────────────────────
var joinThemeSelect = document.getElementById('join-theme-select');
var joinRoundedSelect = document.getElementById('join-rounded-select');
var roundedToggle = document.getElementById('rounded-toggle');
var themeBtnLabel = document.getElementById('theme-btn-label');
var themeDropdown = document.getElementById('theme-dropdown');
var themeBtn = document.getElementById('theme-btn');
var sidebarThemeSelect = document.getElementById('sidebar-theme-select');
var sidebarRoundedSelect = document.getElementById('sidebar-rounded-select');
var sidebarRainBtn = document.getElementById('sidebar-rain-btn');

var THEME_LABELS = {};
(function () {
  for (var i = 0; i < document.styleSheets.length; i++) {
    try {
      var rules = document.styleSheets[i].cssRules;
      for (var j = 0; j < rules.length; j++) {
        var r = rules[j];
        if (!r.selectorText) continue;
        var m = r.selectorText.match(/^body\.(theme-[\w-]+)$/);
        if (!m) continue;
        var v = r.style.getPropertyValue('--theme-label').trim().replace(/^['"]|['"]$/g, '');
        if (v && !THEME_LABELS[m[1]]) THEME_LABELS[m[1]] = v;
      }
    } catch (e) { }
  }
})();

// Auto-generate theme DOM elements from THEME_LABELS
Object.keys(THEME_LABELS).forEach(function (val) {
  var label = THEME_LABELS[val];
  joinThemeSelect.add(new Option(label, val));
  if (sidebarThemeSelect) sidebarThemeSelect.add(new Option(label, val));
  var ddItem = document.createElement('div');
  ddItem.className = 'tb-dd-item';
  ddItem.dataset.val = val;
  ddItem.textContent = label;
  themeDropdown.appendChild(ddItem);
});

window.savedTheme = window.lsGet('chat-theme', 'theme-anodized-bronze');
// Redirect removed themes to default
var _removedThemes = ['theme-graphite-skeuo', 'theme-polycarbonate-clear', 'theme-aurora'];
if (_removedThemes.indexOf(window.savedTheme) !== -1) window.savedTheme = 'theme-anodized-bronze';
window.savedRounded = window.lsGet('chat-rounded', 'no');

function applyTheme(theme) {
  window.savedTheme = theme;
  var noRadius = window.savedRounded === 'no';

  var wasAdmin = document.body.classList.contains('is-admin');
  var sidebarOpen = document.body.classList.contains('sidebar-open');
  var cls = [theme];
  if (noRadius) cls.push('no-radius');
  if (wasAdmin) cls.push('is-admin');
  if (sidebarOpen) cls.push('sidebar-open');
  if (window.currentAppSize && window.currentAppSize !== '1') cls.push('app-size-' + window.currentAppSize);
  if (window.savedLayout === 'cozy') cls.push('layout-cozy');
  if (window.savedLayout === 'compact') cls.push('layout-compact');
  document.body.className = cls.join(' ');
  window.lsSet('chat-theme', theme);
  joinThemeSelect.value = theme;
  if (sidebarThemeSelect) sidebarThemeSelect.value = theme;
  themeBtnLabel.textContent = THEME_LABELS[theme] || theme;
  themeDropdown.querySelectorAll('.tb-dd-item').forEach(function (el) {
    el.classList.toggle('tb-cur', el.dataset.val === theme);
  });
}

function applyRounded(val) {
  window.savedRounded = val;
  window.lsSet('chat-rounded', val);
  applyTheme(window.savedTheme);
  joinRoundedSelect.value = val;
  if (sidebarRoundedSelect) sidebarRoundedSelect.value = val;
  roundedToggle.querySelectorAll('.tb-toggle-btn').forEach(function (btn) {
    btn.classList.toggle('tb-active', btn.dataset.val === val);
  });
}

applyRounded(window.savedRounded);
if (sidebarThemeSelect) sidebarThemeSelect.value = window.savedTheme;
if (sidebarRoundedSelect) sidebarRoundedSelect.value = window.savedRounded;

// Theme cycle setup
var THEME_ORDER = Object.keys(THEME_LABELS);
function cycleTheme(dir) {
  var idx = THEME_ORDER.indexOf(window.savedTheme);
  if (idx === -1) idx = 0;
  var next = (idx + dir + THEME_ORDER.length) % THEME_ORDER.length;
  applyTheme(THEME_ORDER[next]);
}

document.addEventListener('keydown', function (e) {
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) return;
  if ((e.key === '1' || e.key === '2' || e.key === '3') && !e.ctrlKey && !e.metaKey && !e.altKey) {
    var layouts = ['bubble', 'cozy', 'compact'];
    applyLayout(layouts[parseInt(e.key) - 1]);
  }
  if ((e.key === 't' || e.key === 'T') && !e.ctrlKey && !e.metaKey && !e.altKey) { cycleTheme(1); }
});

var _themeWrap = document.querySelector('.tb-theme-wrap');
var _scrollCooldown = false;
_themeWrap.addEventListener('wheel', function (e) {
  e.preventDefault();
  if (_scrollCooldown) return;
  _scrollCooldown = true;
  setTimeout(function () { _scrollCooldown = false; }, 180);
  cycleTheme(e.deltaY > 0 ? 1 : -1);
}, { passive: false });

roundedToggle.addEventListener('click', function (e) {
  var b = e.target.closest('.tb-toggle-btn');
  if (b) applyRounded(b.dataset.val);
});
themeBtn.addEventListener('click', function (e) { e.stopPropagation(); themeDropdown.classList.toggle('tb-open'); });
themeDropdown.addEventListener('click', function (e) {
  var it = e.target.closest('.tb-dd-item');
  if (it && !it.classList.contains('tb-cur')) applyTheme(it.dataset.val);
  themeDropdown.classList.remove('tb-open');
});
document.addEventListener('click', function () { themeDropdown.classList.remove('tb-open'); });
joinThemeSelect.addEventListener('change', function (e) { applyTheme(e.target.value); });
joinRoundedSelect.addEventListener('change', function (e) { applyRounded(e.target.value); });
if (sidebarThemeSelect) sidebarThemeSelect.addEventListener('change', function (e) { applyTheme(e.target.value); });
if (sidebarRoundedSelect) sidebarRoundedSelect.addEventListener('change', function (e) { applyRounded(e.target.value); });

// ── LAYOUT (bubble / cozy / compact) ─────────────────────────────────
var sidebarLayoutSelect = document.getElementById('sidebar-layout-select');
// layoutSwitcher looked up lazily — div exists in HTML before this script

window.savedLayout = window.lsGet('chat-layout', 'cozy');

function applyLayout(val) {
  window.savedLayout = val;
  window.lsSet('chat-layout', val);
  document.body.classList.remove('layout-cozy', 'layout-compact');
  if (val === 'cozy') document.body.classList.add('layout-cozy');
  if (val === 'compact') document.body.classList.add('layout-compact');
  var layoutSwitcher = document.getElementById('layout-switcher');
  if (layoutSwitcher) layoutSwitcher.querySelectorAll('.tb-toggle-btn').forEach(function (btn) {
    btn.classList.toggle('tb-active', btn.dataset.val === val);
  });
  if (sidebarLayoutSelect) sidebarLayoutSelect.value = val;
}

applyLayout(window.savedLayout);

(function () {
  var layoutSwitcher = document.getElementById('layout-switcher');
  if (layoutSwitcher) layoutSwitcher.addEventListener('click', function (e) {
    var b = e.target.closest('.tb-toggle-btn');
    if (b) applyLayout(b.dataset.val);
  });
})();
if (sidebarLayoutSelect) sidebarLayoutSelect.addEventListener('change', function (e) { applyLayout(e.target.value); });

// Position the floating switcher 20px above the taxonomy panel
// Uses same colGeometry pattern as widget.js — divides by zoom to get logical px
var SWITCHER_W = 220;
var SWITCHER_H = 35;
var SWITCHER_PANEL_W = 240;
var SWITCHER_GAP = 8;

function _switcherColGeometry() {
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
  // same vertical math as taxonomy-panel.js
  var panelH = Math.round(height * 0.82);
  var panelTop = top + SWITCHER_GAP + Math.round((height - panelH) / 2);
  return { left: panelLeft, panelTop: panelTop };
}

window.positionLayoutSwitcher = function () {
  var layoutSwitcher = document.getElementById('layout-switcher');
  if (!layoutSwitcher) return;
  // Permanently hidden — layout changed via keys 1/2/3 instead
  layoutSwitcher.style.display = 'none';
  return;
  var geo = _switcherColGeometry();
  if (!geo) return;
  var left = geo.left + (SWITCHER_PANEL_W / 2) - (SWITCHER_W / 2);
  var top = geo.panelTop - SWITCHER_H - 20;
  layoutSwitcher.style.left = left + 'px';
  layoutSwitcher.style.top = top + 'px';
  layoutSwitcher.style.width = SWITCHER_W + 'px';
  layoutSwitcher.style.height = SWITCHER_H + 'px';
  layoutSwitcher.style.opacity = '1';
  layoutSwitcher.style.pointerEvents = 'all';
};

window.addEventListener('resize', window.positionLayoutSwitcher);
new MutationObserver(window.positionLayoutSwitcher).observe(
  document.body, { attributes: true, attributeFilter: ['class'] }
);

// Sidebar Rain sync

if (sidebarRainBtn) {
  sidebarRainBtn.addEventListener('click', function () {
    document.getElementById('rain-btn').click();
    sidebarRainBtn.classList.toggle('rain-on', document.getElementById('rain-btn').classList.contains('rain-on'));
    sidebarRainBtn.textContent = document.getElementById('rain-btn').textContent;
  });
}

// ── APP SIZE (DESKTOP) ────────────────────────────────────────────────
window.currentAppSize = window.lsGet('app-size', '3');
function applySize(s) {
  window.currentAppSize = s;
  window.lsSet('app-size', s);
  document.body.classList.remove('app-size-1', 'app-size-2', 'app-size-3');
  if (s !== '1') document.body.classList.add('app-size-' + s);
  document.querySelectorAll('#size-toggle .sz-btn').forEach(function (b) {
    b.classList.toggle('sz-active', b.dataset.size === s);
  });
}
applySize(window.currentAppSize);
document.getElementById('size-toggle').addEventListener('click', function (e) {
  var b = e.target.closest('.sz-btn');
  if (b) applySize(b.dataset.size);
});

// ── MOBILE SIDEBAR TOGGLE ─────────────────────────────────────────────
const hamburgerBtn = document.getElementById('hamburger-btn');
const sidebarBackdrop = document.getElementById('sidebar-backdrop');
const sidebar = document.getElementById('sidebar');

hamburgerBtn.addEventListener('click', () => document.body.classList.toggle('sidebar-open'));
sidebarBackdrop.addEventListener('click', () => document.body.classList.remove('sidebar-open'));
document.getElementById('user-list').addEventListener('click', () => {
  if (window.innerWidth <= 640) document.body.classList.remove('sidebar-open');
});

var _sx = 0, _sy = 0;
sidebar.addEventListener('touchstart', function (e) {
  _sx = e.touches[0].clientX; _sy = e.touches[0].clientY;
}, { passive: true });
sidebar.addEventListener('touchend', function (e) {
  if (window.innerWidth > 640) return;
  var dx = e.changedTouches[0].clientX - _sx;
  var dy = e.changedTouches[0].clientY - _sy;
  if (dx < -48 && Math.abs(dy) < Math.abs(dx) * 0.65) {
    document.body.classList.remove('sidebar-open');
  }
}, { passive: true });

// ── IOS VISUAL VIEWPORT FIX ───────────────────────────────────────────
if (window.visualViewport) {
  var _vpHandler = function () {
    if (window.innerWidth > 640) return;
    var vv = window.visualViewport;
    var kbH = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
    var bc = document.getElementById('bottom-chrome');
    if (bc) bc.style.transform = kbH > 0 ? 'translateY(-' + kbH + 'px)' : '';
    document.querySelectorAll('.dm-win').forEach(function (dmEl) {
      if (window.innerWidth <= 640) {
        dmEl.style.height = (kbH > 0 ? vv.height : '') + (kbH > 0 ? 'px' : '');
        dmEl.style.top = kbH > 0 ? vv.offsetTop + 'px' : '';
      }
    });
  };
  window.visualViewport.addEventListener('resize', _vpHandler);
  window.visualViewport.addEventListener('scroll', _vpHandler);
}

// ── LIGHTBOX ──────────────────────────────────────────────────────────
const lightbox = document.getElementById('lightbox');
const lightboxImg = document.getElementById('lightbox-img');

window.openLightbox = function (src) {
  var z = parseFloat(getComputedStyle(document.documentElement).zoom) || 1;
  var vw = window.innerWidth / z;
  var vh = window.innerHeight / z;
  lightboxImg.style.maxWidth = Math.floor(vw * 0.88) + 'px';
  lightboxImg.style.maxHeight = Math.floor(vh * 0.84) + 'px';
  lightboxImg.src = src;
  lightbox.classList.add('visible');
};

lightbox.addEventListener('click', function (e) {
  if (e.target === lightbox) lightbox.classList.remove('visible');
});
document.getElementById('lightbox-close').addEventListener('click', function (e) {
  e.stopPropagation(); lightbox.classList.remove('visible');
});

// ── STATUS PICKER MODAL ───────────────────────────────────────────────
window.StatusPicker = (function () {
  var _pickerEl = document.getElementById('status-picker');
  var _backdropEl = document.getElementById('status-picker-backdrop');
  var _closeBtn = document.getElementById('status-picker-close');
  var _customInput = document.getElementById('status-custom-input');
  var _saveBtn = document.getElementById('status-save-btn');
  var _clearBtn = document.getElementById('status-clear-btn');
  var _myStatusText = document.getElementById('my-status-text');
  var _myStatusRow = document.getElementById('my-status-row');
  var _presets = document.querySelectorAll('.status-preset');
  var _myCurrentStatus = null;

  function open() { _pickerEl.classList.add('visible'); _customInput.focus(); }
  function close() { _pickerEl.classList.remove('visible'); }

  function _highlightPreset(text) {
    _presets.forEach(function (p) { p.classList.toggle('active', p.dataset.text === text); });
  }

  function _sendStatus(status) {
    _myCurrentStatus = status;
    if (!window.ws || window.ws.readyState !== WebSocket.OPEN) return;
    window.ws.send(JSON.stringify({ type: 'set-status', status: status }));
  }

  function resendStatusAfterReconnect() {
    if (_myCurrentStatus && window.ws && window.ws.readyState === WebSocket.OPEN) {
      window.ws.send(JSON.stringify({ type: 'set-status', status: _myCurrentStatus }));
    }
  }

  _presets.forEach(function (p) {
    p.addEventListener('click', function () {
      var text = p.dataset.text;
      _highlightPreset(text);
      _customInput.value = text;
      _customInput.focus();
    });
  });

  _saveBtn.addEventListener('click', function () {
    var text = _customInput.value.trim().slice(0, 48);
    if (!text) { _sendStatus(null); close(); return; }
    _sendStatus({ text: text });
    close();
  });
  _customInput.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') { e.preventDefault(); _saveBtn.click(); }
  });

  _clearBtn.addEventListener('click', function () {
    _sendStatus(null);
    _highlightPreset(null);
    _customInput.value = '';
    close();
  });

  _closeBtn.addEventListener('click', close);
  _backdropEl.addEventListener('click', close);
  _myStatusRow.addEventListener('click', open);

  function syncMyRow(status) {
    if (!status || !status.text) {
      _myStatusText.textContent = 'set a status…';
      _myStatusText.style.opacity = '0.5';
      _highlightPreset(null);
      if (_customInput !== document.activeElement) _customInput.value = '';
    } else {
      _myStatusText.textContent = status.text;
      _myStatusText.style.opacity = '1';
      _highlightPreset(status.text);
      if (_customInput !== document.activeElement) _customInput.value = status.text;
    }
  }

  return { open, close, syncMyRow, resendAfterReconnect: resendStatusAfterReconnect };
})();

// ── MOBILE ACTION SHEET ───────────────────────────────────────────────
(function () {
  var actionSheet = document.getElementById('mobile-action-sheet');
  var actionBackdrop = document.getElementById('mobile-action-sheet-backdrop');
  var actionDmBtn = document.getElementById('mobile-action-dm');
  var actionStatusBtn = document.getElementById('mobile-action-set-status');
  var actionCancel = document.getElementById('mobile-action-cancel');
  var actionTarget = null;

  function showSheet(username, isMe) {
    actionTarget = isMe ? null : username;
    document.getElementById('mobile-action-sheet-title').textContent = isMe ? 'your status' : username;
    actionDmBtn.style.display = isMe ? 'none' : '';
    actionStatusBtn.style.display = isMe ? '' : 'none';
    actionSheet.classList.add('visible');
  }

  function hideSheet() {
    actionSheet.classList.remove('visible');
    actionTarget = null;
  }

  document.getElementById('user-list').addEventListener('click', function (e) {
    if (window.innerWidth > 640) return;
    var item = e.target.closest('.user-item');
    if (!item) return;
    var who = item.dataset.dmUser || null;
    var isMe = !who;
    e.stopPropagation();
    if (isMe) {
      document.body.classList.remove('sidebar-open');
      setTimeout(function () { window.StatusPicker.open(); }, 60);
    } else {
      showSheet(who, false);
    }
  });

  actionDmBtn.addEventListener('click', function () {
    var who = actionTarget;
    hideSheet();
    if (who && window.DM) {
      document.body.classList.remove('sidebar-open');
      setTimeout(function () { window.DM.open(who); }, 60);
    }
  });

  actionStatusBtn.addEventListener('click', function () {
    hideSheet();
    setTimeout(function () { window.StatusPicker.open(); }, 60);
  });

  actionCancel.addEventListener('click', hideSheet);
  actionBackdrop.addEventListener('click', hideSheet);

  // Attach showMsgActionSheet to window so main.js can use it for messages
  window.showMsgActionSheet = function (id, username) {
    const sheet = document.getElementById('mobile-action-sheet');
    const panel = document.getElementById('mobile-action-sheet-panel');
    const title = document.getElementById('mobile-action-sheet-title');

    actionDmBtn.style.display = 'none';
    actionStatusBtn.style.display = 'none';
    title.textContent = 'message options';

    const replyActionBtn = document.createElement('button');
    replyActionBtn.className = 'mobile-action-btn';
    replyActionBtn.textContent = 'reply';
    panel.insertBefore(replyActionBtn, actionCancel);

    const editActionBtn = document.createElement('button');
    editActionBtn.className = 'mobile-action-btn';
    editActionBtn.textContent = 'edit';
    panel.insertBefore(editActionBtn, actionCancel);

    function closeSheet() {
      sheet.classList.remove('visible');
      replyActionBtn.remove();
      editActionBtn.remove();
      actionDmBtn.style.display = '';
      actionStatusBtn.style.display = '';
      title.textContent = 'options';
    }

    replyActionBtn.addEventListener('click', function () { closeSheet(); if (window.startReply) window.startReply(id); });
    editActionBtn.addEventListener('click', function () { closeSheet(); if (window.startEdit) window.startEdit(id); });
    actionCancel.addEventListener('click', closeSheet, { once: true });
    actionBackdrop.addEventListener('click', closeSheet, { once: true });

    sheet.classList.add('visible');
  };
})();

// Global Escape listener
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    document.getElementById('lightbox').classList.remove('visible');
    if (window.ctxVisible && window.hideCtxMenu) window.hideCtxMenu();
    document.getElementById('status-picker').classList.remove('visible');
  }
});

// ── AVATAR UPLOAD UI (v2 — replaces previous block) ──────────────────────
// NOTE: The old block above this comment is superseded; this one wins at runtime
// because it re-queries the same elements and overwrites all listeners.
(function () {
  const fileInput = document.getElementById('avatar-file-input');
  const preview = document.getElementById('avatar-preview');
  if (!fileInput || !preview) return;

  function extractDominantColor(canvas) {
    const ctx = canvas.getContext('2d');
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    let rSum = 0, gSum = 0, bSum = 0, totalWeight = 0;
    for (let i = 0; i < data.length; i += 32) {
      const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3];
      if (a === 0) continue;
      // Compute saturation as weight — colorful pixels dominate, blacks/whites/greys barely count
      const max = Math.max(r, g, b), min = Math.min(r, g, b);
      const saturation = max === 0 ? 0 : (max - min) / max;
      const weight = saturation * saturation; // square it to further suppress low-saturation pixels
      if (weight < 0.01) continue; // skip near-grey/black/white entirely
      rSum += r * weight; gSum += g * weight; bSum += b * weight;
      totalWeight += weight;
    }
    // If no saturated pixels found, fall back to plain average (e.g. greyscale images)
    if (totalWeight === 0) {
      let rS = 0, gS = 0, bS = 0, count = 0;
      for (let i = 0; i < data.length; i += 32) {
        if (data[i + 3] === 0) continue;
        rS += data[i]; gS += data[i + 1]; bS += data[i + 2]; count++;
      }
      if (!count) return null;
      return '#' + [Math.round(rS / count), Math.round(gS / count), Math.round(bS / count)]
        .map(v => v.toString(16).padStart(2, '0')).join('');
    }
    const r = Math.round(rSum / totalWeight);
    const g = Math.round(gSum / totalWeight);
    const b = Math.round(bSum / totalWeight);
    return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');
  }

  function setPreview(dataUrl) {
    const old = preview.querySelector('img');
    if (old) old.remove();
    const icon = document.getElementById('avatar-placeholder-icon');
    const hint = document.getElementById('avatar-hint');
    if (dataUrl) {
      const img = document.createElement('img');
      img.src = dataUrl;
      preview.appendChild(img);
      preview.classList.add('has-image');
    } else {
      preview.classList.remove('has-image');
      if (icon) icon.style.display = '';
      if (hint) hint.style.display = '';
    }
  }

  // Assign random color if none saved
  if (!window.userColorOverride) {
    const rand = window.USER_COLORS[Math.floor(Math.random() * (window.USER_COLORS.length - 2))];
    window.userColorOverride = rand;
    window.lsSet('chat-color', rand);
  }

  setPreview(window.getMyAvatar());

  preview.addEventListener('click', function () { fileInput.click(); });

  fileInput.addEventListener('change', function () {
    const file = fileInput.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function (e) {
      const img = new Image();
      img.onload = function () {
        const size = 128;
        const canvas = document.createElement('canvas');
        canvas.width = size; canvas.height = size;
        const ctx = canvas.getContext('2d');
        const scale = Math.max(size / img.width, size / img.height);
        const sw = size / scale, sh = size / scale;
        const sx = (img.width - sw) / 2, sy = (img.height - sh) / 2;
        ctx.drawImage(img, sx, sy, sw, sh, 0, 0, size, size);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        window.setMyAvatar(dataUrl);
        setPreview(dataUrl);
        const dominant = extractDominantColor(canvas);
        if (dominant) {
          window.userColorOverride = dominant;
          window.lsSet('chat-color', dominant);
          window.userColors.set(window.myUsername, dominant);
        }
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
    fileInput.value = '';
  });
})();