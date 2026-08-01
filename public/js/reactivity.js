/* ══════════════════════════════════════════════════════════════════════════
   reactivity.js — music reactivity visualizer
   ══════════════════════════════════════════════════════════════════════════ */
(function () {
    'use strict';

    var btnOn = false;
    var running = false;
    var analyser = null;
    var fftData = null;
    var animId = null;
    var canvas = null;
    var ctx2d = null;
    var reactBtn = null;
    var wrapper = null;
    var resizeObs = null;

    var beatHistory = new Array(40).fill(0);
    var beatCooldown = 0;
    var beatFlash = 0;

    function setupAnalyser(callback) {
        var audio = window._musicAudio;
        if (!audio) { setTimeout(function () { setupAnalyser(callback); }, 200); return; }
        var actx = window.getCtx();
        actx.resume().then(function () {
            try {
                if (!audio._reactSrc) {
                    audio._reactSrc = actx.createMediaElementSource(audio);
                    audio._reactSrc.connect(actx.destination);
                }
                analyser = actx.createAnalyser();
                analyser.fftSize = 256;
                analyser.smoothingTimeConstant = 0.8;
                fftData = new Uint8Array(analyser.frequencyBinCount);
                audio._reactSrc.connect(analyser);
                callback();
            } catch (e) {
                console.warn('[reactivity] setup failed:', e);
            }
        });
    }

    function teardownAnalyser() {
        running = false;
        if (animId) { cancelAnimationFrame(animId); animId = null; }
        var audio = window._musicAudio;
        if (analyser && audio && audio._reactSrc) {
            try { audio._reactSrc.disconnect(analyser); } catch (e) { }
        }
        analyser = null;
        fftData = null;
        beatHistory.fill(0);
        beatCooldown = 0;
        beatFlash = 0;
    }

    function createWrapper() {
        wrapper = document.createElement('div');
        wrapper.id = 'react-wrap';
        wrapper.style.cssText = 'width:100%;flex-shrink:0;overflow:hidden;height:0;';
        canvas = document.createElement('canvas');
        canvas.id = 'react-canvas';
        canvas.style.cssText = 'display:block;width:100%;height:100%;will-change:transform;';
        wrapper.appendChild(canvas);
        var settings = document.getElementById('sidebar-settings');
        if (settings) settings.parentNode.insertBefore(wrapper, settings);
    }

    function sizeCanvas() {
        if (!canvas || !wrapper) return;
        var w = wrapper.offsetWidth;
        var h = wrapper.offsetHeight;
        if (w <= 0 || h <= 0) return;
        var cw = Math.round(w * devicePixelRatio);
        var ch = Math.round(h * devicePixelRatio);
        if (canvas.width === cw && canvas.height === ch) return;
        canvas.width = cw;
        canvas.height = ch;
        ctx2d = canvas.getContext('2d');
    }

    function draw() {
        if (!running) return;
        animId = requestAnimationFrame(draw);
        if (!ctx2d || !analyser) return;

        analyser.getByteFrequencyData(fftData);

        var W = canvas.width;
        var H = canvas.height;

        var bassSum = 0;
        for (var i = 4; i < 10; i++) bassSum += fftData[i];
        var bassAvg = bassSum / 6;
        var histSum = 0;
        for (var j = 0; j < beatHistory.length; j++) histSum += beatHistory[j];
        var histAvg = histSum / beatHistory.length;

        var isBeat = bassAvg > histAvg * 1.3 && beatCooldown <= 0;
        if (isBeat) { beatFlash = 8; beatCooldown = 12; }
        beatHistory.shift(); beatHistory.push(bassAvg);
        if (beatCooldown > 0) beatCooldown--;
        if (beatFlash > 0) beatFlash--;

        var isSakura = document.body.classList.contains('theme-sakura-y2k');
        var isBronze = document.body.classList.contains('theme-anodized-bronze');
        var barColor;
        var barOpacityMin, barOpacityMax;

        if (isSakura) {
            var grad = ctx2d.createLinearGradient(0, 0, 0, H);
            grad.addColorStop(0, '#ff99cc');
            grad.addColorStop(0.49, '#ff4da6');
            grad.addColorStop(0.51, '#ff1a8c');
            grad.addColorStop(1, '#e60073');
            barColor = grad;
            barOpacityMin = 0.55;
            barOpacityMax = 0.95;
        } else if (isBronze) {
            barColor = '#000000ff';
            barOpacityMin = 0.28;
            barOpacityMax = 0.5;
        } else {
            barColor = getComputedStyle(document.body).getPropertyValue('--led-glow').trim() || '#f0f0f0';
            barOpacityMin = 0.18;
            barOpacityMax = 0.40;
        }

        ctx2d.clearRect(0, 0, W, H);

        var barCount = 48;
        var barW = (W / barCount) * 0.7;
        var barGap = (W / barCount) * 0.3;
        var maxH = H * 0.85;
        var binStart = 6;
        var binEnd = 80;

        ctx2d.fillStyle = barColor;
        for (var b = 0; b < barCount; b++) {
            var t = b / barCount;
            var binIdx = Math.round(binStart + Math.pow(t, 1.2) * (binEnd - binStart));
            var val = fftData[Math.min(binIdx, 127)] / 255;
            var barH = val * maxH;
            if (beatFlash > 6) barH = Math.min(barH * 1.12, maxH);
            ctx2d.globalAlpha = barOpacityMin + val * (barOpacityMax - barOpacityMin);
            ctx2d.fillRect(b * (barW + barGap), H - barH, barW, barH);
        }
        ctx2d.globalAlpha = 1;
    }

    function turnOn() {
        var userListWrap = document.getElementById('user-list-wrap');
        if (userListWrap) {
            userListWrap.style.flex = '0 0 auto';
            userListWrap.style.overflowY = 'hidden';
        }
        wrapper.style.flex = '1';
        wrapper.style.height = 'auto';

        if (window.ResizeObserver) {
            resizeObs = new ResizeObserver(function () {
                sizeCanvas();
            });
            resizeObs.observe(wrapper);
        } else {
            window.addEventListener('resize', sizeCanvas);
        }

        sizeCanvas();
        setupAnalyser(function () {
            running = true;
            draw();
        });
    }

    function turnOff() {
        teardownAnalyser();
        var userListWrap = document.getElementById('user-list-wrap');
        if (userListWrap) {
            userListWrap.style.flex = '';
            userListWrap.style.overflowY = '';
        }
        wrapper.style.flex = '';
        wrapper.style.height = '0px';
        if (resizeObs) { resizeObs.disconnect(); resizeObs = null; }
        window.removeEventListener('resize', sizeCanvas);
        if (ctx2d && canvas) ctx2d.clearRect(0, 0, canvas.width, canvas.height);
    }

    function setButtonOn(on) {
        if (!reactBtn) return;
        reactBtn.style.background = on ? 'var(--bg-input)' : 'var(--bg-btn)';
        reactBtn.style.boxShadow = on ? 'var(--shadow-input)' : 'var(--shadow-btn)';
        reactBtn.style.color = on ? 'var(--text-main)' : 'var(--text-btn)';
    }

    function makeButton() {
        var btn = document.createElement('button');
        btn.id = 'react-btn';
        btn.title = 'music reactivity';
        btn.style.cssText = [
            'background:var(--bg-btn);color:var(--text-btn)',
            'border:var(--border-main);box-shadow:var(--shadow-btn)',
            'border-radius:var(--radius-btn)',
            'padding:3px 5px',
            'display:inline-flex;align-items:center;justify-content:center',
            'cursor:pointer;flex-shrink:0',
        ].join(';');
        btn.innerHTML =
            '<svg width="10" height="9" viewBox="0 0 10 9" fill="currentColor">' +
            '<rect x="0"   y="6" width="1.5" height="3" rx="0.5"/>' +
            '<rect x="2.1" y="3" width="1.5" height="6" rx="0.5"/>' +
            '<rect x="4.2" y="0" width="1.5" height="9" rx="0.5"/>' +
            '<rect x="6.3" y="4" width="1.5" height="5" rx="0.5"/>' +
            '<rect x="8.4" y="6" width="1.5" height="3" rx="0.5"/>' +
            '</svg>';
        btn.addEventListener('click', function () {
            btnOn = !btnOn;
            setButtonOn(btnOn);
            if (btnOn) turnOn();
            else turnOff();
        });
        return btn;
    }

    function addButton() {
        var panel = document.getElementById('sidebar-settings');
        if (!panel) { setTimeout(addButton, 200); return; }
        createWrapper();
        if (!reactBtn) reactBtn = makeButton();

        function enforceOrder() {
            var row = panel.querySelector('.km-btn-row');
            if (!row) return false;
            var btns = {};
            row.querySelectorAll('button').forEach(function (b) {
                var t = b.textContent.trim();
                if (t === 'keys') btns.keys = b;
                if (t === 'keymap') btns.keymap = b;
                if (t === 'music') btns.music = b;
                if (t === 'share') btns.share = b;
            });
            if (!btns.keys || !btns.keymap || !btns.music || !btns.share) return false;
            row.appendChild(btns.keys);
            row.appendChild(btns.keymap);
            row.appendChild(reactBtn);
            row.appendChild(btns.share);
            row.appendChild(btns.music);
            return true;
        }

        if (!enforceOrder()) {
            var obs = new MutationObserver(function () {
                if (enforceOrder()) obs.disconnect();
            });
            obs.observe(panel, { childList: true, subtree: true });
        }
    }

    function init() {
        addButton();
        setTimeout(function () {
            if (!btnOn) {
                btnOn = true;
                setButtonOn(true);
                turnOn();
            }
        }, 1500);
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();

})();