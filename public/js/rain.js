// ── Rain System (Canvas & Physics) ─────────────────────────────────────────
window.rainCanvas = document.getElementById('rain-canvas');
if (!window.rainCanvas) {
  window.rainCanvas = document.createElement('canvas');
  window.rainCanvas.id = 'rain-canvas';
  document.body.appendChild(window.rainCanvas);
}
var rCtx = window.rainCanvas.getContext('2d');

function resizeRain() {
  window.rainCanvas.width = window.innerWidth;
  window.rainCanvas.height = window.innerHeight;
}
resizeRain();
window.addEventListener('resize', function () {
  resizeRain();
  if (window.rainOn) initDrops();
  // Re-clamp every open DM window so it stays inside the (possibly resized) viewport
  if (window.DM && window.DM.windows) {
    Object.keys(window.DM.windows).forEach(function (k) { window.DM._clamp(k); });
  }
});

// Smooth cursor tracking for wind effect
var mx = -9999, my = -9999, mvx = 0, mvy = 0, _mpx = -9999, _mpy = -9999;
document.addEventListener('mousemove', function (e) {
  if (_mpx === -9999) { _mpx = e.clientX; _mpy = e.clientY; mx = e.clientX; my = e.clientY; return; }
  var dx = Math.max(-18, Math.min(18, e.clientX - _mpx));
  var dy = Math.max(-18, Math.min(18, e.clientY - _mpy));
  mvx = dx * 0.25 + mvx * 0.75;
  mvy = dy * 0.25 + mvy * 0.75;
  mvx = Math.max(-12, Math.min(12, mvx));
  mvy = Math.max(-12, Math.min(12, mvy));
  _mpx = mx = e.clientX;
  _mpy = my = e.clientY;
});

// Touch wind — treat finger drag same as mouse for rain
document.addEventListener('touchmove', function (e) {
  var t = e.touches[0];
  if (_mpx === -9999) { _mpx = t.clientX; _mpy = t.clientY; mx = t.clientX; my = t.clientY; return; }
  var dx = Math.max(-18, Math.min(18, t.clientX - _mpx));
  var dy = Math.max(-18, Math.min(18, t.clientY - _mpy));
  mvx = dx * 0.25 + mvx * 0.75;
  mvy = dy * 0.25 + mvy * 0.75;
  mvx = Math.max(-12, Math.min(12, mvx));
  mvy = Math.max(-12, Math.min(12, mvy));
  _mpx = mx = t.clientX;
  _mpy = my = t.clientY;
}, { passive: true });

var DROPS = [];
window.rainOn = false;
var rainAnim = null;

// Three depth layers: far/mid/close
var LAYERS = [
  { count: 90, sp: 1.8, ln: 9, op: 0.10, wd: 0.4, wn: 0.55 },
  { count: 110, sp: 3.2, ln: 16, op: 0.22, wd: 0.7, wn: 1.1 },
  { count: 60, sp: 5.2, ln: 26, op: 0.38, wd: 1.1, wn: 1.8 },
];

function mkDrop(layerIdx, fromTop) {
  var cfg = LAYERS[layerIdx];
  var spVar = cfg.sp * 0.4;
  var lnVar = cfg.ln * 0.35;
  return {
    l: layerIdx,
    x: Math.random() * (window.rainCanvas.width + 450) - 350,
    y: fromTop ? -(cfg.ln + Math.random() * window.rainCanvas.height * 0.5) : Math.random() * window.rainCanvas.height,
    sp: cfg.sp + (Math.random() - 0.5) * spVar,
    ln: cfg.ln + (Math.random() - 0.5) * lnVar,
    op: cfg.op + Math.random() * 0.06,
    wd: cfg.wd + Math.random() * 0.12,
    wn: cfg.wn + Math.random() * 0.4,
    vx: 0,
    vy: 0,
  };
}

function initDrops() {
  DROPS = [];
  LAYERS.forEach(function (cfg, li) {
    for (var i = 0; i < cfg.count; i++) DROPS.push(mkDrop(li, false));
  });
}

var WIND_R = 200, WIND_STR = 0.18;

function frame() {
  rCtx.clearRect(0, 0, window.rainCanvas.width, window.rainCanvas.height);
  rCtx.lineCap = 'round';

  var mSpd2 = mvx * mvx + mvy * mvy;
  var rs = getComputedStyle(document.body);
  var rr = (rs.getPropertyValue('--rain-r') || '174').trim();
  var rg = (rs.getPropertyValue('--rain-g') || '212').trim();
  var rb = (rs.getPropertyValue('--rain-b') || '248').trim();

  for (var i = 0; i < DROPS.length; i++) {
    var d = DROPS[i];

    if (mSpd2 > 4) {
      var ddx = d.x - mx, ddy = d.y - my;
      var dist2 = ddx * ddx + ddy * ddy;
      if (dist2 < WIND_R * WIND_R) {
        var dist = Math.sqrt(dist2);
        var influence = (1 - dist / WIND_R) * WIND_STR * (d.l * 0.4 + 0.3);
        d.vx += mvx * influence;
        d.vy += mvy * influence * 0.4;
      }
    }

    d.vx *= 0.92;
    d.vy *= 0.92;

    var totalWind = d.wn + d.vx;
    var totalFall = d.sp + d.vy;
    d.x += totalWind;
    d.y += totalFall;

    var fallForAngle = Math.max(0.1, totalFall);
    var tailX = d.x - totalWind * (d.ln / fallForAngle);
    var tailY = d.y - d.ln;

    var grad = rCtx.createLinearGradient(tailX, tailY, d.x, d.y);
    grad.addColorStop(0, 'rgba(' + rr + ',' + rg + ',' + rb + ',0)');
    grad.addColorStop(0.4, 'rgba(' + rr + ',' + rg + ',' + rb + ',' + (d.op * 0.3) + ')');
    grad.addColorStop(1, 'rgba(' + rr + ',' + rg + ',' + rb + ',' + d.op + ')');

    rCtx.beginPath();
    rCtx.moveTo(tailX, tailY);
    rCtx.lineTo(d.x, d.y);
    rCtx.strokeStyle = grad;
    rCtx.lineWidth = d.wd;
    rCtx.stroke();

    if (d.y > window.rainCanvas.height + d.ln + 10 || d.x > window.rainCanvas.width + 120 || d.x < -400) {
      DROPS[i] = mkDrop(d.l, true);
    }
  }

  mvx *= 0.80;
  mvy *= 0.80;

  if (window.rainOn) rainAnim = requestAnimationFrame(frame);
}

// ── Rain Audio (Web Audio API, zero-gap seamless loop) ───────────────────
var rainBuffer = null;
window.rainSource = null;
var rainGainNode = null;
var rainLoadPromise = null;

function loadRainBuffer(cb) {
  if (rainBuffer) { cb(); return; }
  if (!rainLoadPromise) {
    rainLoadPromise = fetch('/rain_loop.mp3')
      .then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.arrayBuffer();
      })
      .then(function (ab) { return window.getCtx().decodeAudioData(ab); })
      .then(function (buf) { rainBuffer = buf; rainLoadPromise = null; })
      .catch(function () { rainLoadPromise = null; });
  }
  rainLoadPromise.then(function () { if (rainBuffer) cb(); }).catch(function () { });
}

window.startRainAudio = function () {
  loadRainBuffer(function () {
    try {
      var ctx = window.getCtx();
      if (window.rainSource) { try { window.rainSource.stop(); } catch (e) { } }
      if (rainGainNode) { try { rainGainNode.disconnect(); } catch (e) { } }
      rainGainNode = ctx.createGain();
      rainGainNode.gain.setValueAtTime(0, ctx.currentTime);
      rainGainNode.gain.linearRampToValueAtTime(0.45, ctx.currentTime + 2.0);
      rainGainNode.connect(ctx.destination);
      window.rainSource = ctx.createBufferSource();
      window.rainSource.buffer = rainBuffer;
      window.rainSource.loop = true;
      window.rainSource.connect(rainGainNode);
      window.rainSource.start(0);
    } catch (e) { }
  });
};

function stopRainAudio() {
  if (!rainGainNode || !window.rainSource) return;
  try {
    var ctx = window.getCtx();
    var g = rainGainNode, s = window.rainSource;
    g.gain.linearRampToValueAtTime(0, ctx.currentTime + 1.5);
    setTimeout(function () {
      try { s.stop(); } catch (e) { }
      try { g.disconnect(); } catch (e) { }
      if (window.rainSource === s) window.rainSource = null;
      if (rainGainNode === g) rainGainNode = null;
    }, 1700);
  } catch (e) { }
}

// Init Rain state
var rainBtn = document.getElementById('rain-btn');
window.rainOn = true;
if (rainBtn) {
  rainBtn.classList.add('rain-on');
  rainBtn.textContent = 'rain';
}
initDrops();
window.rainCanvas.classList.add('rain-visible');
rainAnim = requestAnimationFrame(frame);

var sbRain = document.getElementById('sidebar-rain-btn');
if (sbRain) { sbRain.classList.add('rain-on'); sbRain.textContent = 'rain'; }

if (rainBtn) {
  rainBtn.addEventListener('click', function () {
    window.rainOn = !window.rainOn;
    if (window.rainOn) {
      window.startRainAudio();
      rainBtn.classList.add('rain-on');
      rainBtn.textContent = 'rain';
      initDrops();
      window.rainCanvas.classList.add('rain-visible');
      rainAnim = requestAnimationFrame(frame);
    } else {
      stopRainAudio();
      rainBtn.classList.remove('rain-on');
      rainBtn.textContent = 'rain';
      window.rainCanvas.classList.remove('rain-visible');
      if (rainAnim) cancelAnimationFrame(rainAnim);
      setTimeout(function () { rCtx.clearRect(0, 0, window.rainCanvas.width, window.rainCanvas.height); }, 1400);
    }
    if (sbRain) {
      sbRain.classList.toggle('rain-on', window.rainOn);
      sbRain.textContent = 'rain';
    }
  });
}