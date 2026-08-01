// colorpicker.js — right-click your own name in sidebar to pick a color
// custom card UI, appears at click position, follows active theme

(function () {
  let card = null;
  let hue = 0;
  let saturation = 1;
  let brightness = 1;
  let pickerCanvas, pickerCtx, hueCanvas, hueCtx;
  let draggingPicker = false, draggingHue = false;

  function hexToHsb(hex) {
    let r = parseInt(hex.slice(1, 3), 16) / 255;
    let g = parseInt(hex.slice(3, 5), 16) / 255;
    let b = parseInt(hex.slice(5, 7), 16) / 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
    let h = 0;
    if (d !== 0) {
      if (max === r) h = ((g - b) / d) % 6;
      else if (max === g) h = (b - r) / d + 2;
      else h = (r - g) / d + 4;
      h = Math.round(h * 60); if (h < 0) h += 360;
    }
    return { h, s: max === 0 ? 0 : d / max, b: max };
  }

  function hsbToHex(h, s, b) {
    const f = (n) => {
      const k = (n + h / 60) % 6;
      const v = b - b * s * Math.max(0, Math.min(k, 4 - k, 1));
      return Math.round(v * 255);
    };
    return '#' + [f(5), f(3), f(1)].map(v => v.toString(16).padStart(2, '0')).join('');
  }

  function drawPicker() {
    if (!pickerCtx) return;
    const w = pickerCanvas.width, h = pickerCanvas.height;
    // White to hue horizontal gradient
    const grad1 = pickerCtx.createLinearGradient(0, 0, w, 0);
    grad1.addColorStop(0, 'white');
    grad1.addColorStop(1, `hsl(${hue},100%,50%)`);
    pickerCtx.fillStyle = grad1;
    pickerCtx.fillRect(0, 0, w, h);
    // Transparent to black vertical gradient
    const grad2 = pickerCtx.createLinearGradient(0, 0, 0, h);
    grad2.addColorStop(0, 'transparent');
    grad2.addColorStop(1, 'black');
    pickerCtx.fillStyle = grad2;
    pickerCtx.fillRect(0, 0, w, h);
    // Draw cursor
    const cx = saturation * w, cy = (1 - brightness) * h;
    pickerCtx.beginPath();
    pickerCtx.arc(cx, cy, 7, 0, Math.PI * 2);
    pickerCtx.strokeStyle = brightness > 0.5 ? '#000' : '#fff';
    pickerCtx.lineWidth = 2;
    pickerCtx.stroke();
    pickerCtx.beginPath();
    pickerCtx.arc(cx, cy, 5, 0, Math.PI * 2);
    pickerCtx.strokeStyle = '#fff';
    pickerCtx.lineWidth = 1.5;
    pickerCtx.stroke();
  }

  function drawHue() {
    if (!hueCtx) return;
    const w = hueCanvas.width, h = hueCanvas.height;
    const grad = hueCtx.createLinearGradient(0, 0, w, 0);
    for (let i = 0; i <= 360; i += 30) grad.addColorStop(i / 360, `hsl(${i},100%,50%)`);
    hueCtx.fillStyle = grad;
    hueCtx.fillRect(0, 0, w, h);
    // Draw thumb
    const x = (hue / 360) * w;
    hueCtx.beginPath();
    hueCtx.arc(x, h / 2, h / 2 - 1, 0, Math.PI * 2);
    hueCtx.fillStyle = `hsl(${hue},100%,50%)`;
    hueCtx.fill();
    hueCtx.strokeStyle = '#fff';
    hueCtx.lineWidth = 2;
    hueCtx.stroke();
  }

  function updatePreview() {
    const hex = hsbToHex(hue, saturation, brightness);
    return hex;
  }

  function broadcastColor(hex) {
    window.userColorOverride = hex;
    window.lsSet('chat-color', hex);
    if (window.myUsername) window.userColors.set(window.myUsername, hex);
    if (window._updateUsersNow) window._updateUsersNow();
    if (window.ws && window.ws.readyState === WebSocket.OPEN) {
      window.ws.send(JSON.stringify({ type: 'color-update', color: hex }));
    }
  }

  function buildCard(x, y) {
    if (card) card.remove();

    card = document.createElement('div');
    card.className = 'cp-card';
    card.innerHTML = `
      <canvas class="cp-picker" width="200" height="150"></canvas>
      <canvas class="cp-hue" width="200" height="16"></canvas>
    `;

    // The app has CSS zoom: 1.3125 applied — clientX/Y are in unzoomed coords
    // so we need to divide by the CSS zoom to get the correct fixed position
    const cssZoom = parseFloat(getComputedStyle(document.documentElement).zoom) || 1;
    const ax = x / cssZoom;
    const ay = y / cssZoom;

    card.style.cssText = `
      position: fixed;
      left: ${ax}px;
      top: ${ay}px;
      z-index: 99999;
      padding: 12px;
      border-radius: var(--radius-panel, 8px);
      background: var(--bg-panel, #2a2a2a);
      border: var(--border-main, 1px solid #333);
      box-shadow: var(--shadow-panel, 0 8px 32px rgba(0,0,0,0.6));
      user-select: none;
      width: 224px;
    `;

    document.body.appendChild(card);

    // Nudge if it goes off screen
    const rect = card.getBoundingClientRect();
    if (rect.right > window.innerWidth - 8) card.style.left = ((window.innerWidth - rect.width - 8) / cssZoom) + 'px';
    if (rect.bottom > window.innerHeight - 8) card.style.top = ((ay * cssZoom - rect.height - 4) / cssZoom) + 'px';

    pickerCanvas = card.querySelector('.cp-picker');
    hueCanvas = card.querySelector('.cp-hue');
    pickerCtx = pickerCanvas.getContext('2d');
    hueCtx = hueCanvas.getContext('2d');

    // Seed with current color
    const current = window.userColorOverride || '#e31704';
    if (/^#[0-9a-fA-F]{6}$/.test(current)) {
      const hsb = hexToHsb(current);
      hue = hsb.h; saturation = hsb.s; brightness = hsb.b;
    }

    drawPicker();
    drawHue();
    updatePreview();

    // Picker interactions
    function onPickerMove(e) {
      if (!draggingPicker) return;
      const r = pickerCanvas.getBoundingClientRect();
      saturation = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
      brightness = Math.max(0, Math.min(1, 1 - (e.clientY - r.top) / r.height));
      drawPicker();
      broadcastColor(updatePreview());
    }
    pickerCanvas.addEventListener('mousedown', e => { draggingPicker = true; onPickerMove(e); });
    window.addEventListener('mousemove', onPickerMove);
    window.addEventListener('mouseup', () => { draggingPicker = false; });

    // Hue interactions
    function onHueMove(e) {
      if (!draggingHue) return;
      const r = hueCanvas.getBoundingClientRect();
      hue = Math.round(Math.max(0, Math.min(360, ((e.clientX - r.left) / r.width) * 360)));
      drawHue();
      drawPicker();
      broadcastColor(updatePreview());
    }
    hueCanvas.addEventListener('mousedown', e => { draggingHue = true; onHueMove(e); });
    window.addEventListener('mousemove', onHueMove);
    window.addEventListener('mouseup', () => { draggingHue = false; });

    // Close on outside click
    setTimeout(() => {
      document.addEventListener('mousedown', function outsideClick(e) {
        if (card && !card.contains(e.target)) {
          card.remove(); card = null;
          document.removeEventListener('mousedown', outsideClick);
        }
      });
    }, 0);
  }

  window.attachColorPicker = function (el) {
    el.addEventListener('contextmenu', function (e) {
      e.preventDefault();
      e.stopPropagation();
      buildCard(e.clientX, e.clientY);
    });
  };

  // Inject styles
  const style = document.createElement('style');
  style.textContent = `
    .cp-card { font-family: var(--font-main, sans-serif); }
    .cp-label {
      font-size: 11px;
      color: var(--text-dim, #888);
      margin-bottom: 8px;
    }
    .cp-picker {
      display: block;
      width: 200px;
      height: 150px;
      border-radius: 4px;
      cursor: crosshair;
      margin-bottom: 8px;
    }
    .cp-hue {
      display: block;
      width: 200px;
      height: 16px;
      border-radius: 8px;
      cursor: pointer;
      margin-bottom: 4px;
    }
    .cp-hint {
      font-size: 10px;
      color: var(--text-dim, #666);
      line-height: 1.3;
    }
  `;
  document.head.appendChild(style);
})();