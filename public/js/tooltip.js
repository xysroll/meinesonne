/* ══════════════════════════════════════════════════════════════════════════
   tooltip.js — custom music card tooltip for .lt-activity elements
   ══════════════════════════════════════════════════════════════════════════ */
(function () {
    'use strict';

    var card = null;
    var hideTimer = null;

    function getZoom() {
        return parseFloat(getComputedStyle(document.documentElement).zoom) || 1;
    }

    function buildCard() {
        card = document.createElement('div');
        card.id = 'music-tooltip';
        card.style.cssText = [
            'position:fixed',
            'z-index:9999',
            'pointer-events:none',
            'opacity:0',
            'transition:opacity 0.15s',
            'display:flex',
            'align-items:center',
            'gap:8px',
            'padding:7px 9px',
            'background:var(--bg-panel)',
            'border:var(--border-main)',
            'border-radius:var(--radius-btn)',
            'box-shadow:var(--shadow-panel)',
            'max-width:200px',
        ].join(';');

        var cover = document.createElement('img');
        cover.id = 'music-tooltip-cover';
        cover.style.cssText = 'width:36px;height:36px;border-radius:var(--radius-btn);object-fit:cover;flex-shrink:0;display:none;border:var(--border-main);';

        var text = document.createElement('div');
        text.style.cssText = 'display:flex;flex-direction:column;gap:2px;min-width:0;';

        var title = document.createElement('div');
        title.id = 'music-tooltip-title';
        title.style.cssText = 'font-size:10px;font-weight:bold;color:var(--text-main);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:140px;';

        var artist = document.createElement('div');
        artist.id = 'music-tooltip-artist';
        artist.style.cssText = 'font-size:9px;color:var(--led-glow);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:140px;';

        text.appendChild(title);
        text.appendChild(artist);
        card.appendChild(cover);
        card.appendChild(text);
        document.body.appendChild(card);
    }

    function showCard(actEl, e) {
        if (!card) buildCard();
        clearTimeout(hideTimer);

        // get username from parent .user-item
        var userItem = actEl.closest('.user-item');
        var username = userItem ? userItem.dataset.dmUser : null;

        // read session data directly from LT._sessions
        var session = username && window.LT && window.LT._sessions
            ? window.LT._sessions[username]
            : null;

        // fallback: parse from cover src + title attribute
        var coverSrc = '';
        var titleText = '';
        var artistText = '';

        if (session) {
            coverSrc = session.cover || '';
            titleText = session.title || '';
            artistText = session.artist || '';
        } else {
            var coverEl = actEl.querySelector('.lt-act-cover');
            coverSrc = coverEl ? coverEl.src : '';
            // format is "artist · title"
            var tooltip = actEl._nativeTitle || actEl.title || '';
            var idx = tooltip.lastIndexOf(' · ');
            if (idx !== -1) {
                artistText = tooltip.slice(0, idx);
                titleText = tooltip.slice(idx + 3);
            } else {
                titleText = tooltip;
            }
        }

        // suppress native tooltip
        if (!actEl._nativeTitle && actEl.title) {
            actEl._nativeTitle = actEl.title;
            actEl.removeAttribute('title');
        }

        var coverImg = document.getElementById('music-tooltip-cover');
        var titleEl = document.getElementById('music-tooltip-title');
        var artistEl = document.getElementById('music-tooltip-artist');

        if (coverSrc) {
            coverImg.src = coverSrc;
            coverImg.style.display = 'block';
        } else {
            coverImg.style.display = 'none';
        }

        titleEl.textContent = titleText || '';
        artistEl.textContent = artistText || '';
        artistEl.style.display = artistText ? '' : 'none';

        if (!titleText && !artistText) { card.style.opacity = '0'; return; }

        positionCard(e);
        card.style.opacity = '1';
    }

    function positionCard(e) {
        if (!card) return;
        var z = getZoom();
        var x = e.clientX / z + 12;
        var y = e.clientY / z + 12;
        var cw = card.offsetWidth || 200;
        var ch = card.offsetHeight || 60;
        var vw = window.innerWidth / z;
        var vh = window.innerHeight / z;
        if (x + cw > vw - 8) x = e.clientX / z - cw - 8;
        if (y + ch > vh - 8) y = e.clientY / z - ch - 8;
        card.style.left = x + 'px';
        card.style.top = y + 'px';
    }

    function hideCard(actEl) {
        if (actEl && actEl._nativeTitle) {
            actEl.setAttribute('title', actEl._nativeTitle);
            actEl._nativeTitle = null;
        }
        hideTimer = setTimeout(function () {
            if (card) card.style.opacity = '0';
        }, 80);
    }

    function init() {
        var userList = document.getElementById('user-list');
        if (!userList) { setTimeout(init, 300); return; }

        userList.addEventListener('mouseenter', function (e) {
            var actEl = e.target.closest('.lt-activity');
            if (!actEl) return;
            showCard(actEl, e);
        }, true);

        userList.addEventListener('mousemove', function (e) {
            var actEl = e.target.closest('.lt-activity');
            if (!actEl || !card || card.style.opacity === '0') return;
            positionCard(e);
        }, true);

        userList.addEventListener('mouseleave', function (e) {
            var actEl = e.target.closest('.lt-activity');
            if (!actEl) return;
            hideCard(actEl);
        }, true);
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();

})();