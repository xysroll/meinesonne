// ── Audio System (Web Audio API) ─────────────────────────────────────────
window.audioCtx = null;

window.getCtx = function () {
  if (!window.audioCtx) window.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (window.audioCtx.state === 'suspended') window.audioCtx.resume();
  return window.audioCtx;
};

// Unlock AudioContext on first gesture — also starts rain audio if already on but not yet playing
document.addEventListener('click', function () {
  try { window.getCtx(); } catch (e) { }
  if (window.rainOn && !window.rainSource && window.startRainAudio) {
    window.startRainAudio();
  }
  // Prime the music player — load pending URL on first click so it's ready when user hits play
  try {
    var a = window._musicAudio;
    if (a && a._pendingUrl && !a.src) {
      a.src = a._pendingUrl;
      a._pendingUrl = null;
      a.load();
    }
  } catch (e) { }
}, { once: true, capture: true });

function tone(freq, startOffset, duration, volume, type = 'sine') {
  try {
    const ctx = window.getCtx();
    const t = ctx.currentTime + startOffset;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    gain.gain.setValueAtTime(0.001, t);
    gain.gain.linearRampToValueAtTime(volume, t + 0.008);
    gain.gain.setTargetAtTime(0, t + 0.008, duration / 3);
    osc.start(t); osc.stop(t + duration + 0.05);
  } catch (e) { }
}

function noiseBlip(duration, volume, hpFreq, lpFreq) {
  try {
    const ctx = window.getCtx();
    const len = Math.ceil(ctx.sampleRate * duration);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource(); src.buffer = buf;
    const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = hpFreq;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = lpFreq;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.setTargetAtTime(0, ctx.currentTime, duration / 3);
    src.connect(hp); hp.connect(lp); lp.connect(gain); gain.connect(ctx.destination);
    src.start(); src.stop(ctx.currentTime + duration);
  } catch (e) { }
}

window.sounds = {
  // Message receive — soft two-note bell
  message: () => { tone(1046.5, 0, 0.08, 0.038, 'sine'); tone(1318.5, 0.05, 0.12, 0.028, 'sine'); },
  // Send — crisp air puff
  send: () => { noiseBlip(0.055, 0.055, 1800, 9000); tone(700, 0, 0.07, 0.022, 'sine'); },
  // Join — warm ascending chime
  join: () => { [523.25, 659.25, 880].forEach((f, i) => tone(f, i * 0.09, 0.14, 0.03, 'triangle')); },
  // Leave — soft descending fade
  leave: () => { [440, 349.23].forEach((f, i) => tone(f, i * 0.1, 0.15, 0.025, 'sine')); },
  // Reconnect — two soft pings
  reconnect: () => { tone(880, 0, 0.07, 0.03, 'triangle'); tone(1046.5, 0.09, 0.1, 0.03, 'triangle'); },
  // Error — low soft buzz
  error: () => { noiseBlip(0.12, 0.07, 150, 600); },
  // Click — short cloth-like tap
  click: () => { noiseBlip(0.028, 0.045, 900, 7000); },
  // Admin login — triumphant four-note
  adminLogin: () => { [523.25, 659.25, 880, 1046.5].forEach((f, i) => tone(f, i * 0.09, 0.14, 0.032, 'triangle')); },
  // Purge — downward thud
  purge: () => { noiseBlip(0.15, 0.09, 60, 350); tone(120, 0, 0.15, 0.04, 'sine'); },
};

// Click sound on all buttons globally
document.addEventListener('mousedown', function (e) {
  if (e.target.closest('button')) window.sounds.click();
}, true);