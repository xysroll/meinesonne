/**
 * mobile-plugins.js  —  v5 definitive mobile experience
 *
 * Complete mobile overhaul for Glossary & Music Player.
 * Disassembles the desktop DOM and reassembles it into mobile-optimised
 * zones. Album tap → immediate tracklist view with clean back button.
 * Deep glossary overhaul with proper mobile typography.
 *
 * Delete this file (and its <script> tag) to remove everything.
 */
(function () {
  'use strict';

  const isMobile = () => window.innerWidth <= 640;
  window.ENABLE_MOBILE_MUSIC = true;

  /* ══════════════════════════════════════════════════════════════════
     1.  CSS
     ══════════════════════════════════════════════════════════════════ */
  const css = `
    .mp-sidebar-btn { display: none !important; }

    @media (max-width: 640px) {

      /* ─────────────────────────────────────────
         TOPBAR BUTTONS
         ───────────────────────────────────────── */
      .mp-topbar-btn {
        display: inline-flex !important;
        align-items: center;
        justify-content: center;
        background: none;
        border: none;
        color: var(--text-dim);
        font-family: inherit;
        font-size: 11px;
        font-weight: bold;
        padding: 4px 7px;
        cursor: pointer;
        -webkit-tap-highlight-color: transparent;
        touch-action: manipulation;
        white-space: nowrap;
        opacity: 0.55;
        transition: opacity 0.15s;
        letter-spacing: 0.3px;
      }
      .mp-topbar-btn:active { opacity: 1; }

      /* ─────────────────────────────────────────
         OVERLAY SHELL
         ───────────────────────────────────────── */
      .mp-overlay {
        position: fixed;
        inset: 0;
        z-index: 4000;
        display: none;
        flex-direction: column;
        background: var(--bg-panel, #111);
        color: var(--text-main, #eee);
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      }
      .mp-overlay.mp-open { display: flex; }

      .mp-overlay-header {
        flex-shrink: 0;
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 10px 16px;
        padding-top: calc(10px + env(safe-area-inset-top, 0px));
        background: var(--bg-panel, #111);
        border-bottom: 1px solid rgba(128,128,128,0.08);
      }
      .mp-overlay-title {
        font-size: 14px;
        font-weight: 700;
        letter-spacing: 0.3px;
        opacity: 0.85;
      }
      .mp-overlay-close {
        background: none;
        border: none;
        color: var(--text-dim);
        font-size: 18px;
        padding: 6px 10px;
        cursor: pointer;
        line-height: 1;
        -webkit-tap-highlight-color: transparent;
        opacity: 0.5;
      }

      .mp-overlay-body {
        flex: 1;
        overflow-y: scroll !important;
        -webkit-overflow-scrolling: touch;
        overscroll-behavior-y: contain;
      }
      .mp-overlay-body::-webkit-scrollbar { display: none; }

      /* ═════════════════════════════════════════
         GLOSSARY OVERLAY
         ═════════════════════════════════════════ */

      /* flatten the desktop panel */
      .mp-overlay #taxonomy-panel {
        position: static !important;
        width: 100% !important;
        height: auto !important;
        max-height: none !important;
        transform: none !important;
        transition: none !important;
        border: none !important;
        box-shadow: none !important;
        border-radius: 0 !important;
        display: block !important;
        opacity: 1 !important;
        pointer-events: auto !important;
        overflow: visible !important;
        background: transparent !important;
        padding: 0 !important;
      }
      /* hide desktop header (we have our own) */
      .mp-overlay #tax-header { display: none !important; }

      /* all inner containers: no height constraints */
      .mp-overlay #tax-list,
      .mp-overlay #tax-detail,
      .mp-overlay .tax-detail-scroll,
      .mp-overlay .tax-detail-body {
        overflow: visible !important;
        height: auto !important;
        max-height: none !important;
      }

      /* search bar */
      .mp-overlay #tax-search-wrap {
        padding: 10px 16px !important;
        display: flex !important;
        align-items: center !important;
        gap: 8px !important;
        border-bottom: 1px solid rgba(128,128,128,0.06) !important;
      }
      .mp-overlay #tax-search {
        font-size: 15px !important;
        padding: 10px 12px !important;
        border-radius: var(--radius-btn, 8px) !important;
        background: var(--bg-input, rgba(255,255,255,0.05)) !important;
        border: var(--border-main, 1px solid rgba(128,128,128,0.1)) !important;
        width: 100% !important;
        box-sizing: border-box !important;
        color: var(--text-main) !important;
        outline: none !important;
      }

      /* group headers */
      .mp-overlay .tax-group-hdr {
        padding: 20px 16px 6px !important;
        font-size: 11px !important;
        letter-spacing: 1px !important;
        text-transform: uppercase !important;
        font-weight: 800 !important;
        opacity: 0.35;
        border-bottom: none !important;
      }

      /* list items */
      .mp-overlay .tax-item {
        padding: 14px 16px !important;
        border-bottom: 1px solid rgba(128,128,128,0.05) !important;
        cursor: pointer;
        transition: background 0.1s;
      }
      .mp-overlay .tax-item:active {
        background: rgba(128,128,128,0.08);
      }
      .mp-overlay .tax-item-name {
        font-size: 15px !important;
        font-weight: 500 !important;
        line-height: 1.4 !important;
      }

      /* ── detail view ── */
      .mp-overlay #tax-detail {
        display: flex !important;
        flex-direction: column !important;
      }

      .mp-overlay .tax-detail-sticky {
        position: sticky !important;
        top: 0 !important;
        z-index: 1 !important;
        background: var(--bg-panel, #111) !important;
      }

      .mp-overlay .tax-detail-header {
        padding: 14px 16px 10px !important;
        display: flex !important;
        align-items: center !important;
        gap: 8px !important;
        flex-wrap: wrap !important;
      }
      .mp-overlay .tax-detail-header--back {
        cursor: pointer !important;
      }
      .mp-overlay .tax-back-arrow {
        font-size: 16px !important;
        margin-right: 4px !important;
        opacity: 0.4;
        transition: opacity 0.15s;
      }
      .mp-overlay .tax-detail-header--back:active .tax-back-arrow {
        opacity: 0.8;
      }
      .mp-overlay .tax-detail-name {
        font-size: 17px !important;
        font-weight: 700 !important;
        line-height: 1.3 !important;
        white-space: normal !important;
        flex: 1 !important;
        min-width: 0 !important;
      }
      .mp-overlay .tax-detail-pill {
        font-size: 10px !important;
        padding: 2px 8px !important;
        border-radius: 10px !important;
      }

      /* severity/frequency meta row */
      .mp-overlay .tax-detail-meta {
        padding: 4px 16px 10px !important;
        display: flex !important;
        align-items: center !important;
        gap: 6px !important;
        border-bottom: 1px solid rgba(128,128,128,0.06) !important;
      }
      .mp-overlay .tax-meta-item {
        font-size: 11px !important;
      }
      .mp-overlay .tax-meta-label {
        opacity: 0.4;
        margin-right: 3px;
      }

      /* content sections */
      .mp-overlay .tax-section {
        padding: 14px 16px !important;
        border-bottom: 1px solid rgba(128,128,128,0.04) !important;
      }
      .mp-overlay .tax-section-label {
        font-size: 10px !important;
        letter-spacing: 0.8px !important;
        margin-bottom: 5px !important;
        opacity: 0.35;
        text-transform: uppercase;
        font-weight: 700;
      }
      .mp-overlay .tax-section-text {
        font-size: 14px !important;
        line-height: 1.6 !important;
      }

      /* chat command pills */
      .mp-overlay .tax-cmd-pills {
        display: flex !important;
        flex-wrap: wrap !important;
        gap: 6px !important;
      }
      .mp-overlay .tax-cmd-pill {
        font-size: 11px !important;
        padding: 3px 8px !important;
        border-radius: 10px !important;
        background: rgba(128,128,128,0.08) !important;
      }

      /* empty state */
      .mp-overlay .tax-empty {
        padding: 32px 16px !important;
        text-align: center !important;
        opacity: 0.4;
        font-size: 14px;
      }

      /* ═════════════════════════════════════════
         MUSIC PLAYER OVERLAY
         ═════════════════════════════════════════ */

      /* ── Now Playing card ── */
      .mob-now-playing {
        display: grid;
        grid-template-columns: 64px 1fr;
        gap: 0 12px;
        padding: 12px 16px;
        border-bottom: 1px solid rgba(128,128,128,0.06);
      }
      .mob-now-playing .mp-cover-wrap {
        grid-row: 1 / 3;
        width: 64px !important;
        height: 64px !important;
        max-width: none !important;
        aspect-ratio: 1/1 !important;
        border-radius: var(--radius-btn, 5px) !important;
        box-shadow: 0 2px 8px rgba(0,0,0,0.2) !important;
        border: var(--border-main) !important;
        overflow: hidden !important;
        flex-shrink: 0 !important;
      }
      .mob-now-playing .mp-cover {
        border-radius: var(--radius-btn, 5px) !important;
        width: 100% !important; height: 100% !important;
        object-fit: cover !important;
      }
      .mob-now-playing .mp-meta {
        grid-column: 2; text-align: left !important; min-width: 0;
        align-self: center;
        display: flex !important; flex-direction: column !important; gap: 1px !important;
      }
      .mob-now-playing .mp-title {
        font-size: 14px !important; font-weight: 700 !important;
        white-space: nowrap !important; overflow: hidden !important;
        text-overflow: ellipsis !important; line-height: 1.3 !important;
      }
      .mob-now-playing .mp-artist {
        font-size: 12px !important;
        white-space: nowrap !important; overflow: hidden !important;
        text-overflow: ellipsis !important;
      }
      .mob-now-playing .mp-dimrow {
        font-size: 10px !important;
        white-space: nowrap !important; overflow: hidden !important;
        text-overflow: ellipsis !important;
      }

      /* ── Transport bar ── */
      .mob-transport {
        padding: 6px 16px 8px;
        border-bottom: 1px solid rgba(128,128,128,0.06);
      }
      .mob-transport .mp-prog-wrap { width: 100%; gap: 6px; margin-bottom: 2px; }
      .mob-transport .mp-bar  { height: 3px !important; border-radius: 2px !important; }
      .mob-transport .mp-fill { border-radius: 2px !important; }
      .mob-transport .mp-handle { width: 10px !important; height: 10px !important; }
      .mob-transport .mp-time { font-size: 10px !important; }

      .mob-transport .mp-ctrl {
        display: flex !important; align-items: center !important;
        justify-content: center !important; gap: 2px !important;
        padding: 2px 0 0 !important;
      }
      .mob-transport .mp-btn {
        background: none !important; border: none !important;
        box-shadow: none !important; font-size: 15px !important;
        padding: 8px 10px !important; color: var(--text-main) !important;
        line-height: 1 !important;
      }
      .mob-transport .mp-play-btn {
        font-size: 18px !important;
        width: 38px !important; height: 38px !important;
        display: inline-flex !important; align-items: center !important;
        justify-content: center !important;
        background: var(--text-main) !important;
        color: var(--bg-panel) !important;
        border-radius: 50% !important;
        box-shadow: 0 2px 6px rgba(0,0,0,0.15) !important;
        padding: 0 !important;
      }
      .mob-transport .mp-btn.mp-active {
        color: var(--led-glow) !important; background: none !important;
      }
      .mob-transport .mp-vol-row { display: none !important; }

      /* ── Artist pills ── */
      .mob-artists-strip {
        display: flex; flex-wrap: nowrap;
        overflow-x: auto; -webkit-overflow-scrolling: touch;
        padding: 8px 16px; gap: 6px;
        border-bottom: 1px solid rgba(128,128,128,0.06);
      }
      .mob-artists-strip::-webkit-scrollbar { display: none; }
      .mob-artists-strip .mp-ap-item {
        flex-shrink: 0 !important;
        border: 1px solid rgba(128,128,128,0.1) !important;
        border-radius: 14px !important;
        padding: 5px 11px !important;
        font-size: 11px !important;
        font-weight: 600 !important;
        background: rgba(128,128,128,0.03) !important;
        white-space: nowrap !important;
        cursor: pointer !important;
        transition: background 0.12s, border-color 0.12s !important;
      }
      .mob-artists-strip .mp-ap-item.mp-ap-active {
        background: rgba(128,128,128,0.12) !important;
        border-color: var(--led-glow, rgba(128,128,128,0.3)) !important;
        color: var(--led-glow, #fff) !important;
      }

      /* ── Library (albums / tracklist) ── */
      .mob-library {
        padding: 6px 12px 24px;
      }
      .mob-library .mp-grid-label {
        display: block !important;
        font-size: 10px !important;
        padding: 4px 4px 6px !important;
        opacity: 0.5;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }
      .mob-library #mp-grid-wrap {
        display: block !important; height: auto !important; overflow: visible !important;
      }
      .mob-library .mp-grid {
        display: grid !important;
        grid-template-columns: repeat(3, 1fr) !important;
        gap: 8px !important;
        overflow: visible !important; height: auto !important;
      }
      .mob-library .mp-alb-cell {
        padding: 5px !important;
        border-radius: var(--radius-btn, 5px) !important;
        border: 1px solid rgba(128,128,128,0.05) !important;
        cursor: pointer !important;
        transition: border-color 0.12s !important;
      }
      .mob-library .mp-alb-cell.mp-alb-active {
        border-color: var(--led-glow) !important;
      }
      .mob-library .mp-alb-img {
        width: 100% !important;
        border-radius: calc(var(--radius-btn, 5px) - 2px) !important;
        margin-bottom: 3px !important; display: block !important;
      }
      .mob-library .mp-alb-lbl {
        font-size: 10px !important; font-weight: 600 !important;
        line-height: 1.2 !important; white-space: normal !important;
        overflow: visible !important; text-overflow: unset !important;
      }
      .mob-library .mp-alb-meta { font-size: 8px !important; }

      /* ── Tracklist ── */
      .mob-library .mp-tracklist {
        display: none !important;
      }
      .mob-library .mp-tracklist.mob-tl-visible {
        display: flex !important; flex-direction: column !important;
        overflow: visible !important; height: auto !important;
      }
      
      /* The cover art header acting as the back button - identical to album cell */
      @keyframes tlBackGlow {
        0%, 100% { box-shadow: 0 0 0px 0px rgba(var(--led-glow-rgb, 200,200,200), 0); border-color: rgba(128,128,128,0.1); }
        50%       { box-shadow: 0 0 8px 2px rgba(var(--led-glow-rgb, 200,200,200), 0.35); border-color: var(--led-glow, rgba(200,200,200,0.5)); }
      }
      .mob-library .mp-tl-back {
        display: block !important;
        width: calc(33.333% - 6px) !important;
        margin: 16px auto 24px !important;
        padding: 5px !important;
        border: 1px solid rgba(128,128,128,0.1) !important;
        background: none !important;
        border-radius: var(--radius-btn, 5px) !important;
        cursor: pointer !important;
        transition: transform 0.15s, background 0.15s !important;
        -webkit-tap-highlight-color: transparent !important;
        text-align: left !important;
        animation: tlBackGlow 3s ease-in-out infinite !important;
      }
      .mob-library .mp-tl-back:active {
        animation: none !important;
        transform: scale(0.96) !important;
        background: rgba(128,128,128,0.06) !important;
        box-shadow: none !important;
      }
      
      /* Hide the desktop album text, our back button already has the identical album label inside it */
      .mob-library #mp-tl-album {
        display: none !important;
      }
      .mob-library .mp-tl-list {
        overflow: visible !important; height: auto !important;
      }
      .mob-library .mp-tl-row {
        padding: 11px 4px !important;
        border-bottom: 1px solid rgba(128,128,128,0.04);
        gap: 10px !important;
        display: flex !important; align-items: center !important;
        cursor: pointer;
        transition: background 0.1s;
      }
      .mob-library .mp-tl-row:active {
        background: rgba(128,128,128,0.06);
      }
      .mob-library .mp-tl-num {
        font-size: 11px !important; width: 18px !important;
        text-align: right !important; flex-shrink: 0 !important;
        opacity: 0.4;
      }
      .mob-library .mp-tl-name {
        font-size: 14px !important; flex: 1 !important;
        min-width: 0 !important;
        white-space: nowrap !important; overflow: hidden !important;
        text-overflow: ellipsis !important;
      }
      .mob-library .mp-tl-row.mp-tl-active .mp-tl-name,
      .mob-library .mp-tl-row.mp-tl-active .mp-tl-num {
        color: var(--led-glow) !important;
      }

      /* CRITICAL: force-hide tracklist by default — overrides music.js inline styles */
      .mob-library .mp-tracklist {
        display: none !important;
      }
      /* only show tracklist when this class is added by JS */
      .mob-library .mp-tracklist.mob-tl-visible {
        display: flex !important;
        flex-direction: column !important;
        overflow: visible !important;
        height: auto !important;
      }

      /* hide original containers (we extracted their children) */
      .mp-overlay #mp-player { display: none !important; }
      .mp-overlay #mp-artists { display: none !important; }

      /* kill all scrollbars */
      .mp-overlay ::-webkit-scrollbar { display: none; }

      .mp-overlay-pad { height: env(safe-area-inset-bottom, 16px); }
    }
  `;

  document.head.appendChild(Object.assign(document.createElement('style'), {
    id: 'mobile-plugins-v5', textContent: css
  }));

  /* ══════════════════════════════════════════════════════════════════
     2.  DOM SETUP
     ══════════════════════════════════════════════════════════════════ */
  window.addEventListener('DOMContentLoaded', () => {
    if (!isMobile()) return;

    const glossaryOverlay = makeOverlay('glossary');
    const musicOverlay    = makeOverlay('music');
    document.body.appendChild(glossaryOverlay);
    document.body.appendChild(musicOverlay);

    /* ── Glossary ─────────────────────────────────────────────── */
    const taxPanel = document.getElementById('taxonomy-panel');
    if (taxPanel) {
      glossaryOverlay._body.appendChild(taxPanel);
      glossaryOverlay._body.appendChild(makePad());
    }

    /* ── Music Player (may load async) ────────────────────────── */
    const buildMusicUI = () => {
      const mp = document.getElementById('mp-player');
      const ap = document.getElementById('mp-artists');
      if (!mp) return false;

      mp.classList.add('mp-on');
      if (ap) ap.classList.add('mp-on');

      const body = musicOverlay._body;

      // 1) Now Playing card
      const npCard = document.createElement('div');
      npCard.className = 'mob-now-playing';
      const coverWrap = mp.querySelector('.mp-cover-wrap');
      const meta = mp.querySelector('.mp-meta');
      if (coverWrap) npCard.appendChild(coverWrap);
      if (meta) npCard.appendChild(meta);
      body.appendChild(npCard);

      // 2) Transport bar
      const transport = document.createElement('div');
      transport.className = 'mob-transport';
      const progWrap = mp.querySelector('.mp-prog-wrap');
      const ctrl = mp.querySelector('.mp-ctrl');
      const volRow = mp.querySelector('.mp-vol-row');
      if (progWrap) transport.appendChild(progWrap);
      if (ctrl) transport.appendChild(ctrl);
      if (volRow) transport.appendChild(volRow);
      body.appendChild(transport);

      // 3) Artist pills — define strip at outer scope so view-switch can access it
      let strip = null;
      if (ap) {
        strip = document.createElement('div');
        strip.className = 'mob-artists-strip';
        while (ap.firstChild) strip.appendChild(ap.firstChild);
        body.appendChild(strip);
      }

      // 4) Library (grid + tracklist)
      const section = mp.querySelector('.mp-section');
      if (section) {
        const library = document.createElement('div');
        library.className = 'mob-library';
        library.appendChild(section);
        body.appendChild(library);

        const tracklist = section.querySelector('.mp-tracklist');
        const gridLabel = section.querySelector('.mp-grid-label');
        const actualGrid = section.querySelector('.mp-grid'); // Do not hide gridWrap, it contains the tracklist!

        // ── VIEW SWITCH ──
        // Tracklist is ALWAYS hidden via CSS !important.
        // We add/remove .mob-tl-visible to show/hide it.
        // Player (npCard + transport) ALWAYS stays visible.
        // Only strip + actualGrid get hidden when tracklist is showing.

        function enterTracklistView() {
          // Inject the exact same album cell content into the back button
          const backBtn = section.querySelector('.mp-tl-back');
          const activeCell = document.querySelector('.mp-grid .mp-alb-cell.mp-alb-active');
          if (backBtn && activeCell) {
            backBtn.innerHTML = activeCell.innerHTML;
          }

          if (tracklist) tracklist.classList.add('mob-tl-visible');
          if (strip) strip.style.display = 'none';
          if (gridLabel) gridLabel.style.setProperty('display', 'none', 'important');
          if (actualGrid) actualGrid.style.setProperty('display', 'none', 'important');
          body.scrollTop = 0;
        }

        function exitTracklistView() {
          if (tracklist) tracklist.classList.remove('mob-tl-visible');
          if (strip) strip.style.display = '';
          if (gridLabel) gridLabel.style.removeProperty('display');
          if (actualGrid) actualGrid.style.removeProperty('display');
          body.scrollTop = 0;
        }

        if (tracklist) {
          // music.js binds click to '.mp-tl-back' calling showGrid() internally.
          // We don't overwrite the listener, we just redesign the button in CSS
          // to be the album cover image (injected above in enterTracklistView).

          const obs = new MutationObserver(() => {
            const wantsVisible = tracklist.style.display !== 'none' && tracklist.style.display !== '';
            
            if (musicOverlay.classList.contains('mp-open')) {
              if (wantsVisible) enterTracklistView();
              else exitTracklistView();
            }
          });
          obs.observe(tracklist, { attributes: true, attributeFilter: ['style'] });
        }

        // Reset to grid view (in our UI) every time overlay opens
        musicOverlay._resetView = () => {
           // Tell music.js to reset its state by simulating a 'go back' click
           const backBtn = section.querySelector('.mp-tl-back');
           if (backBtn) backBtn.click();
           exitTracklistView();
        };
      }

      // 5) Force-load all album cover images
      // (IntersectionObserver won't fire for images inside a hidden overlay)
      setTimeout(() => {
        body.querySelectorAll('.mp-alb-img').forEach(img => {
          img.style.opacity = '1';
          img.style.transition = 'none';
        });
      }, 500);

      body.appendChild(makePad());

      // Keep originals in DOM (hidden) so music.js refs work
      document.body.appendChild(mp);
      if (ap) document.body.appendChild(ap);

      return true;
    };

    if (!buildMusicUI()) {
      const obs = new MutationObserver(() => {
        if (buildMusicUI()) obs.disconnect();
      });
      obs.observe(document.body, { childList: true, subtree: true });
    }

    /* ── Topbar buttons ───────────────────────────────────────── */
    const topbar = document.getElementById('topbar');
    if (topbar) {
      topbar.appendChild(makeBtn('glossary', () => openOverlay(glossaryOverlay)));
      topbar.appendChild(makeBtn('music',    () => openOverlay(musicOverlay)));
    }

    /* ── Intercept desktop glossary toggle ─────────────────────── */
    const origGlosBtn = document.getElementById('tax-toggle-btn');
    if (origGlosBtn) {
      origGlosBtn.addEventListener('click', (e) => {
        if (isMobile()) { e.preventDefault(); e.stopPropagation(); openOverlay(glossaryOverlay); }
      }, true);
    }
  });

  /* ══════════════════════════════════════════════════════════════════
     3.  HELPERS
     ══════════════════════════════════════════════════════════════════ */
  function makeOverlay(title) {
    const el = document.createElement('div');
    el.className = 'mp-overlay';
    const header = document.createElement('div');
    header.className = 'mp-overlay-header';
    const h = document.createElement('span');
    h.className = 'mp-overlay-title';
    h.textContent = title;
    const closeBtn = document.createElement('button');
    closeBtn.className = 'mp-overlay-close';
    closeBtn.textContent = '✕';
    closeBtn.addEventListener('click', () => closeOverlay(el));
    header.appendChild(h);
    header.appendChild(closeBtn);
    el.appendChild(header);
    const body = document.createElement('div');
    body.className = 'mp-overlay-body';
    el.appendChild(body);
    el._body = body;
    return el;
  }

  function makeBtn(label, onClick) {
    const b = document.createElement('button');
    b.className = 'mp-topbar-btn';
    b.textContent = label;
    b.addEventListener('click', onClick);
    return b;
  }

  function makePad() {
    const p = document.createElement('div');
    p.className = 'mp-overlay-pad';
    return p;
  }

  function openOverlay(el) {
    // Reset to grid view if this is the music overlay
    if (el._resetView) el._resetView();
    el.classList.add('mp-open');
    if (el._body) el._body.scrollTop = 0;
    document.body.style.overflow = 'hidden';
  }

  function closeOverlay(el) {
    el.classList.remove('mp-open');
    document.body.style.overflow = '';
  }
})();
