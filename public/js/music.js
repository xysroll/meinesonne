/* ══════════════════════════════════════════════════════════════════════════
   music.js — Cathedral Music Player v6
   LEFT  → compact player (fixed width ~200px), album grid, inline tracklist
   RIGHT → artist selector (auto-width, just wide enough for names)
   - Zoom-aware positioning
   - Default: random track loaded on activate
   - Volume default: 50%
   - Album click → tracklist replaces grid inline (back button to return)
   ══════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  const MANIFEST_URL = '/music.json';
  const PLAYER_W = 185;
  const PLAYER_H_RATIO = 0.69; // ~55% * 1.25
  const GAP = 8;

  var tracks = [];
  var lib = {};
  var artists = [];
  var queue = [];
  var queueIdx = 0;
  var shuffleOn = false;
  var repeatOn = false;
  var prevSize = null;
  var visible = false;
  var gridMode = 'albums'; // 'albums' | 'tracks'

  const audio = new Audio();
  audio.crossOrigin = 'anonymous';
  audio.volume = 0.5;
  audio.preload = 'auto'; // Eagerly buffer audio data from R2
  window._musicAudio = audio; // expose for first-click priming in audio.js

  // Hidden audio element to silently pre-buffer the NEXT track in the queue
  const prefetchAudio = new Audio();
  prefetchAudio.crossOrigin = 'anonymous';
  prefetchAudio.preload = 'auto';
  prefetchAudio.volume = 0;

  function fmt(s) {
    if (!isFinite(s) || s < 0) return '0:00';
    return Math.floor(s / 60) + ':' + String(Math.floor(s % 60)).padStart(2, '0');
  }

  function getZoom() {
    return parseFloat(getComputedStyle(document.documentElement).zoom) || 1;
  }

  function getLayout() {
    var inner = document.getElementById('chat-screen-inner');
    if (!inner) return null;
    var z = getZoom();
    var r = inner.getBoundingClientRect();
    return {
      left: r.left / z,
      top: r.top / z,
      right: r.right / z,
      height: r.height / z,
      vw: window.innerWidth / z,
    };
  }

  // ── DOM refs ──────────────────────────────────────────────────────────────
  var playerEl, artistsEl;
  var elCover, elTitle, elArtist, elAlbum, elYear, elGenre, elTrack;
  var elBar, elFill, elHandle, elCur, elTot;
  var elPrev, elPlay, elNext, elShuffle, elRepeat;
  var elVol, elVolIcon;
  var elGridLabel, elGridWrap, elGrid, elTracklist;

  function buildDOM() {
    playerEl = document.createElement('div');
    playerEl.id = 'mp-player';
    playerEl.innerHTML = [
      '<div class="mp-inner">',
      '<div class="mp-cover-wrap"><img id="mp-cover" class="mp-cover" alt=""/></div>',
      '<div class="mp-meta">',
      '<div class="mp-title"  id="mp-title">—</div>',
      '<div class="mp-artist" id="mp-artist">—</div>',
      '<div class="mp-dimrow">',
      '<span id="mp-album"></span>',
      '<span id="mp-year-sep"> · </span>',
      '<span id="mp-year"></span>',
      '</div>',
      '<div class="mp-dimrow">',
      '<span id="mp-genre"></span>',
      '<span id="mp-track-sep"> · </span>',
      '<span id="mp-track-lbl">track </span><span id="mp-track"></span>',
      '</div>',
      '</div>',
      '<div class="mp-prog-wrap">',
      '<span class="mp-time" id="mp-cur">0:00</span>',
      '<div class="mp-bar" id="mp-bar">',
      '<div class="mp-fill" id="mp-fill"></div>',
      '<div class="mp-handle" id="mp-handle"></div>',
      '</div>',
      '<span class="mp-time" id="mp-tot">0:00</span>',
      '</div>',
      '<div class="mp-ctrl">',
      '<button class="mp-btn mp-sm" id="mp-shuffle" title="Shuffle">⇄</button>',
      '<button class="mp-btn mp-sm" id="mp-prev" title="Prev">⏮</button>',
      '<button class="mp-btn mp-play-btn" id="mp-play" title="Play">▶</button>',
      '<button class="mp-btn mp-sm" id="mp-next" title="Next">⏭</button>',
      '<button class="mp-btn mp-sm" id="mp-repeat" title="Repeat">↻</button>',
      '</div>',
      '<div class="mp-vol-row">',
      '<span id="mp-vol-icon" class="mp-vol-icon">🔉</span>',
      '<input type="range" id="mp-vol" class="mp-vol" min="0" max="1" step="0.02" value="0.5"/>',
      '</div>',
      '<div class="mp-section">',
      '<div class="mp-grid-label" id="mp-grid-label"></div>',
      '<div id="mp-grid-wrap">',
      '<div class="mp-grid" id="mp-grid"></div>',
      '<div class="mp-tracklist" id="mp-tracklist" style="display:none">',
      '<button class="mp-tl-back" id="mp-tl-back" title="Back to albums">← albums</button>',
      '<div class="mp-tl-album" id="mp-tl-album"></div>',
      '<div class="mp-tl-list" id="mp-tl-list"></div>',
      '</div>',
      '</div>',
      '</div>',
      '</div>',
    ].join('');
    document.body.appendChild(playerEl);

    // RIGHT — artist list, auto-width
    artistsEl = document.createElement('div');
    artistsEl.id = 'mp-artists';
    buildArtistPanel();
    document.body.appendChild(artistsEl);

    elCover = document.getElementById('mp-cover');
    elTitle = document.getElementById('mp-title');
    elArtist = document.getElementById('mp-artist');
    elAlbum = document.getElementById('mp-album');
    elYear = document.getElementById('mp-year');
    elGenre = document.getElementById('mp-genre');
    elTrack = document.getElementById('mp-track');
    elBar = document.getElementById('mp-bar');
    elFill = document.getElementById('mp-fill');
    elHandle = document.getElementById('mp-handle');
    elCur = document.getElementById('mp-cur');
    elTot = document.getElementById('mp-tot');
    elPrev = document.getElementById('mp-prev');
    elPlay = document.getElementById('mp-play');
    elNext = document.getElementById('mp-next');
    elShuffle = document.getElementById('mp-shuffle');
    elRepeat = document.getElementById('mp-repeat');
    elVol = document.getElementById('mp-vol');
    elVolIcon = document.getElementById('mp-vol-icon');
    elGridLabel = document.getElementById('mp-grid-label');
    elGrid = document.getElementById('mp-grid');
    elTracklist = document.getElementById('mp-tracklist');

    document.getElementById('mp-tl-back').addEventListener('click', showGrid);
    bindEvents();

    // Load random track on init
    loadRandomTrack();
  }

  function loadRandomTrack() {
    if (!tracks.length) return;
    var t = tracks[Math.floor(Math.random() * tracks.length)];
    queue = tracks.slice();
    queueIdx = tracks.indexOf(t);
    loadTrack(t, false);
    // Pre-select artist and open tracklist for the random track
    setTimeout(function () {
      // Highlight artist in panel
      artistsEl.querySelectorAll('.mp-ap-item').forEach(function (el) {
        if (el.textContent === t.artist) el.classList.add('mp-ap-active');
      });
      // Show album grid for that artist
      selectArtist(t.artist);
      elGridLabel.textContent = t.artist;
      // Open tracklist for that album
      if (lib[t.artist] && lib[t.artist][t.album]) {
        // Highlight album cell
        elGrid.querySelectorAll('.mp-alb-cell').forEach(function (cell) {
          var lbl = cell.querySelector('.mp-alb-lbl');
          if (lbl && lbl.textContent === t.album) cell.classList.add('mp-alb-active');
        });
        showTracklist(t.artist, t.album, true);
        // Set queue to this album, queueIdx to the random track
        var sortedAlbum = lib[t.artist][t.album].slice().sort(function (a, b) {
          return (parseInt(a.track) || 0) - (parseInt(b.track) || 0);
        });
        queue = sortedAlbum;
        var trackIdx = sortedAlbum.findIndex(function (x) { return x.url === t.url; });
        queueIdx = trackIdx !== -1 ? trackIdx : 0;
        highlightRow(queueIdx);
      }
    }, 50);
  }

  // ── Artist panel ──────────────────────────────────────────────────────────
  function buildArtistPanel() {
    artistsEl.innerHTML = '<div class="mp-ap-label">artists</div>';
    artists.forEach(function (a) {
      var el = document.createElement('div');
      el.className = 'mp-ap-item';
      el.textContent = a;
      el.addEventListener('click', function () {
        artistsEl.querySelectorAll('.mp-ap-item').forEach(function (x) {
          x.classList.toggle('mp-ap-active', x === el);
        });
        selectArtist(a);
      });
      artistsEl.appendChild(el);
    });
  }

  // ── Select artist → album grid ────────────────────────────────────────────
  function selectArtist(artist) {
    elGridLabel.textContent = artist;
    showGrid();
    elGrid.innerHTML = '';

    var albums = Object.keys(lib[artist]).sort(function (a, b) {
      return lib[artist][b].length - lib[artist][a].length;
    });
    albums.forEach(function (album) {
      var albumTracks = lib[artist][album];
      var first = albumTracks[0];

      var cell = document.createElement('div');
      cell.className = 'mp-alb-cell';

      var img = document.createElement('img');
      img.className = 'mp-alb-img';
      img.alt = album;
      img.fetchPriority = 'high';  // These visible images jump the connection queue
      img.decoding = 'async';      // Don't block main thread on image decode
      img.addEventListener('error', function () { img.style.opacity = '0.2'; });

      // Load cover immediately — no lazy loading, no fade delay
      if (first && first.cover) {
        img.src = first.cover;
      }

      var lbl = document.createElement('div');
      lbl.className = 'mp-alb-lbl';
      lbl.textContent = album;

      var meta = document.createElement('div');
      meta.className = 'mp-alb-meta';
      var year = first && first.year ? first.year : '';
      meta.textContent = (year ? year + ' · ' : '') + albumTracks.length + ' tracks';

      cell.appendChild(img); cell.appendChild(lbl); cell.appendChild(meta);
      cell.addEventListener('click', function () {
        elGrid.querySelectorAll('.mp-alb-cell').forEach(function (x) { x.classList.remove('mp-alb-active'); });
        cell.classList.add('mp-alb-active');
        showTracklist(artist, album);
      });
      elGrid.appendChild(cell);
    });
  }

  function showGrid() {
    gridMode = 'albums';
    elGrid.style.display = '';
    elTracklist.style.display = 'none';
  }

  function showTracklist(artist, album, preserveQueue) {
    gridMode = 'tracks';
    elGrid.style.display = 'none';
    elTracklist.style.display = 'flex';

    var albumTracks = lib[artist][album].slice().sort(function (a, b) {
      return (parseInt(a.track) || 0) - (parseInt(b.track) || 0);
    });

    document.getElementById('mp-tl-album').textContent = album;
    var list = document.getElementById('mp-tl-list');
    list.innerHTML = '';

    if (!preserveQueue) {
      queue = albumTracks;
      queueIdx = 0;
    }

    albumTracks.forEach(function (t, i) {
      var row = document.createElement('div');
      row.className = 'mp-tl-row';
      row.dataset.idx = i;

      var num = document.createElement('span');
      num.className = 'mp-tl-num';
      num.textContent = t.track ? String(t.track).split('/')[0] : (i + 1);

      var name = document.createElement('span');
      name.className = 'mp-tl-name';
      name.textContent = t.title || t.track || '—';

      row.appendChild(num); row.appendChild(name);
      row.addEventListener('click', function () {
        queueIdx = i;
        loadTrack(t, true);
        highlightRow(i);
      });
      list.appendChild(row);
    });

    // highlight current if playing from this album
    highlightRow(queueIdx);
  }

  function highlightRow(idx) {
    var list = document.getElementById('mp-tl-list');
    if (!list) return;
    list.querySelectorAll('.mp-tl-row').forEach(function (r) {
      r.classList.toggle('mp-tl-active', parseInt(r.dataset.idx) === idx);
    });
  }

  // ── Prefetch next track ─────────────────────────────────────────────────
  function prefetchNext() {
    if (!queue.length) return;
    var nextIdx = (queueIdx + 1) % queue.length;
    var nextTrack = queue[nextIdx];
    if (nextTrack && nextTrack.url && prefetchAudio.src !== nextTrack.url) {
      prefetchAudio.src = nextTrack.url;
      prefetchAudio.load(); // Start downloading next track silently
    }
  }

  // ── Load track ────────────────────────────────────────────────────────────
  function loadTrack(t, play) {
    if (!t) return;

    elTitle.textContent = t.title || t.track || '—';
    elArtist.textContent = t.artist || '—';
    elAlbum.textContent = t.album || '—';
    elYear.textContent = t.year || '';
    elGenre.textContent = t.genre || '';

    var trackNum = t.track ? String(t.track).split('/')[0] : '';
    elTrack.textContent = trackNum;

    var showYear = !!t.year;
    var showTrack = !!trackNum;
    var showGenre = !!t.genre;

    document.getElementById('mp-year-sep').style.display = showYear ? '' : 'none';
    document.getElementById('mp-year').style.display = showYear ? '' : 'none';
    document.getElementById('mp-track-sep').style.display = (showTrack && showGenre) ? '' : 'none';
    document.getElementById('mp-track-lbl').style.display = showTrack ? '' : 'none';
    document.getElementById('mp-track').style.display = showTrack ? '' : 'none';

    elCover.src = t.cover || '';
    elFill.style.width = '0%';
    elHandle.style.left = '0%';
    elCur.textContent = '0:00';
    elTot.textContent = '0:00';

    // _loadGen increments on every loadTrack call.
    // The error handler uses this to ignore stale errors from previous loads.
    audio._loadGen = (audio._loadGen || 0) + 1;

    if (play) {
      // Check if this track was already prefetched — use it for instant start
      if (prefetchAudio.src && prefetchAudio.src === t.url && prefetchAudio.readyState >= 3) {
        // The prefetch buffer has enough data — swap sources for instant playback
        audio.src = t.url;
        audio.currentTime = 0;
        audio.play().catch(function () { });
      } else {
        // Not prefetched or not ready — load normally (still fast from R2)
        audio._pendingUrl = null;
        audio.src = t.url;
        audio.load();
        audio.play().catch(function () { });
      }
    } else {
      // Initial random track — store URL for first-click priming.
      audio._pendingUrl = t.url;
    }

    // Always prefetch the NEXT track in queue for instant transitions
    prefetchNext();
  }

  // ── Events ────────────────────────────────────────────────────────────────
  function bindEvents() {
    elPlay.addEventListener('click', function () {
      // Transfer pending URL to main audio on first play click
      if (!audio.src && audio._pendingUrl) {
        audio.src = audio._pendingUrl;
        audio._pendingUrl = null;
      }
      if (!audio.src) return;
      if (audio.paused) {
        audio.play().catch(function (e) { console.warn('[music] play failed', e); });
      } else {
        audio.pause();
      }
    });
    elPrev.addEventListener('click', function () {
      if (audio.currentTime > 3) { audio.currentTime = 0; return; }
      if (!queue.length) return;
      queueIdx = (queueIdx - 1 + queue.length) % queue.length;
      loadTrack(queue[queueIdx], true);
      if (gridMode === 'tracks') highlightRow(queueIdx);
    });
    elNext.addEventListener('click', function () {
      if (!queue.length) return;
      queueIdx = (queueIdx + 1) % queue.length;
      loadTrack(queue[queueIdx], true);
      if (gridMode === 'tracks') highlightRow(queueIdx);
    });
    elShuffle.addEventListener('click', function () {
      shuffleOn = !shuffleOn;
      elShuffle.classList.toggle('mp-active', shuffleOn);
    });
    elRepeat.addEventListener('click', function () {
      repeatOn = !repeatOn;
      elRepeat.classList.toggle('mp-active', repeatOn);
    });
    elVol.addEventListener('input', function () {
      audio.volume = parseFloat(this.value);
      elVolIcon.textContent = audio.volume === 0 ? '🔇' : audio.volume < 0.4 ? '🔈' : '🔉';
    });

    var seeking = false;
    function doSeek(e) {
      var r = elBar.getBoundingClientRect();
      var p = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
      if (isFinite(audio.duration)) audio.currentTime = p * audio.duration;
    }
    elBar.addEventListener('mousedown', function (e) { seeking = true; doSeek(e); });
    window.addEventListener('mousemove', function (e) { if (seeking) doSeek(e); });
    window.addEventListener('mouseup', function () { seeking = false; });

    audio.addEventListener('timeupdate', function () {
      if (!isFinite(audio.duration) || audio.duration === 0) return;
      var p = (audio.currentTime / audio.duration) * 100;
      elFill.style.width = p + '%';
      elHandle.style.left = p + '%';
      elCur.textContent = fmt(audio.currentTime);
    });
    audio.addEventListener('loadedmetadata', function () { elTot.textContent = fmt(audio.duration); });
    // When current track is fully buffered, ensure next track prefetch is primed
    audio.addEventListener('canplaythrough', function () { prefetchNext(); });
    audio.addEventListener('play', function () { elPlay.textContent = '⏸'; });
    audio.addEventListener('pause', function () { elPlay.textContent = '▶'; });
    audio.addEventListener('ended', function () {
      if (repeatOn) { audio.currentTime = 0; audio.play(); }
      else if (queue.length) {
        queueIdx = (queueIdx + 1) % queue.length;
        loadTrack(queue[queueIdx], true);
        if (gridMode === 'tracks') highlightRow(queueIdx);
      }
    });

    // ── Robust error handler ──────────────────────────────────────────────
    // Uses _loadGen to ignore stale errors from previous loads.
    // Retries the SAME track once before skipping to the next.
    var _errorRetries = 0; // retries for the CURRENT track
    var _totalSkips = 0;   // total consecutive skips
    var _userHasInteracted = false;
    audio.addEventListener('play', function () { _userHasInteracted = true; _errorRetries = 0; _totalSkips = 0; });
    audio.addEventListener('error', function () {
      var genAtError = audio._loadGen;
      console.warn('[music] error on gen', genAtError, audio.src);
      if (!audio.src) return;
      if (!_userHasInteracted) return;
      if (window.LT && window.LT._inSession) return;
      if (!queue.length) return;
      // Stop after 3 consecutive skips — something is fundamentally wrong
      if (_totalSkips >= 3) { _totalSkips = 0; return; }

      if (_errorRetries < 1) {
        // First error on this track — retry same track after 2 seconds
        _errorRetries++;
        setTimeout(function () {
          if (audio._loadGen !== genAtError) return; // user loaded something else, ignore
          audio.load();
          audio.play().catch(function () { });
        }, 2000);
      } else {
        // Already retried — skip to next track
        _errorRetries = 0;
        _totalSkips++;
        setTimeout(function () {
          if (audio._loadGen !== genAtError) return; // user loaded something else, ignore
          queueIdx = (queueIdx + 1) % queue.length;
          loadTrack(queue[queueIdx], !audio.paused);
          if (gridMode === 'tracks') highlightRow(queueIdx);
        }, 1500);
      }
    });
  }

  // ── Position (zoom-aware) ─────────────────────────────────────────────────
  function positionPanels() {
    if (!playerEl || !visible) return;
    var L = getLayout();
    if (!L) return;

    var leftAvail = L.left - GAP * 2;

    if (leftAvail < PLAYER_W) {
      playerEl.style.opacity = '0';
      playerEl.style.pointerEvents = 'none';
      artistsEl.style.opacity = '0';
      artistsEl.style.pointerEvents = 'none';
      return;
    }

    var centerX = GAP + Math.round((leftAvail - PLAYER_W) / 2);
    var playerH = Math.round(L.height * PLAYER_H_RATIO);
    var playerTop = L.top + GAP;

    playerEl.style.opacity = '1';
    playerEl.style.pointerEvents = 'auto';
    playerEl.style.left = centerX + 'px';
    playerEl.style.top = playerTop + 'px';
    playerEl.style.width = PLAYER_W + 'px';
    playerEl.style.height = playerH + 'px';

    var apTop = playerTop + playerH + GAP;
    var apMaxH = (L.top + L.height) - apTop - GAP;

    artistsEl.style.opacity = '1';
    artistsEl.style.pointerEvents = 'auto';
    artistsEl.style.left = centerX + 'px';
    artistsEl.style.top = apTop + 'px';
    artistsEl.style.width = PLAYER_W + 'px';
    artistsEl.style.height = 'auto';
    artistsEl.style.maxHeight = Math.max(apMaxH, 30) + 'px';
  }

  // ── Sidebar button ────────────────────────────────────────────────────────
  function addSidebarBtn() {
    var panel = document.getElementById('sidebar-settings');
    if (!panel) return;
    var row = panel.querySelector('.km-btn-row');
    if (!row) {
      row = document.createElement('div');
      row.className = 'km-btn-row';
      row.style.cssText = 'display:flex;gap:4px;flex-wrap:wrap;';
      panel.appendChild(row);
    }
    var on = true;
    var btn = document.createElement('button');
    btn.textContent = 'music';
    btn.style.cssText = 'background:var(--bg-btn);color:var(--text-btn);border:var(--border-main);box-shadow:var(--shadow-btn);border-radius:var(--radius-btn);padding:3px 7px;font-family:inherit;font-size:10px;font-weight:bold;cursor:pointer;line-height:1.4;white-space:nowrap;';
    btn.style.background = 'var(--bg-input)';
    btn.style.boxShadow = 'var(--shadow-input)';
    btn.style.color = 'var(--text-main)';
    btn.addEventListener('click', function () {
      on = !on;
      // text stays "music" — only visual state changes
      btn.style.background = on ? 'var(--bg-input)' : 'var(--bg-btn)';
      btn.style.boxShadow = on ? 'var(--shadow-input)' : 'var(--shadow-btn)';
      btn.style.color = on ? 'var(--text-main)' : 'var(--text-btn)';
      togglePlayer(on);
    });
    row.appendChild(btn);
  }

  function getSize() {
    for (var i = 1; i <= 3; i++) if (document.body.classList.contains('app-size-' + i)) return String(i);
    return '1';
  }
  function setSize(n) {
    var b = document.querySelector('.sz-btn[data-size="' + n + '"]');
    if (b) b.click();
  }

  function togglePlayer(on) {
    visible = on;
    if (on) {
      prevSize = getSize();
      setSize('3');
      playerEl.classList.add('mp-on');
      artistsEl.classList.add('mp-on');
      setTimeout(positionPanels, 80);
    } else {
      playerEl.classList.remove('mp-on');
      artistsEl.classList.remove('mp-on');
      playerEl.style.opacity = '0';
      artistsEl.style.opacity = '0';
      playerEl.style.pointerEvents = 'none';
      artistsEl.style.pointerEvents = 'none';
      if (prevSize) setSize(prevSize);
      prevSize = null;
      audio.pause();
    }
  }

  // ── Init ──────────────────────────────────────────────────────────────────
  async function init() {
    if (window.innerWidth <= 640 && !window.ENABLE_MOBILE_MUSIC) return;

    var data;
    try {
      var res = await fetch(MANIFEST_URL);
      var text = await res.text();
      if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1);
      data = JSON.parse(text);
    } catch (e) { console.warn('[music] manifest error', e); return; }

    tracks = data;
    tracks.forEach(function (t) {
      if (!lib[t.artist]) lib[t.artist] = {};
      if (!lib[t.artist][t.album]) lib[t.artist][t.album] = [];
      lib[t.artist][t.album].push(t);
    });
    artists = (function () {
      var order = ["Chouchou", "Kashiwa Daisuke", "Gregory and the Hawk", "Xerxes", "dom mino'", "Kamome Sano", "Flica", "Advantage Lucy", "Kye Kye", "Ex:Re", "Porya Hatami", "Fourteen Nights At Sea", "Phoenix", "Tangled Hair", "Colour", "moshimoss", "A Beacon School", "toe", "Lucy Rose", "Daughter", "Goreshit", "Mazzy Star", "C418", "Pandatone", "Cö Shu Nie", "El Cuarteto de Nos", "Plus-Tech Squeeze Box", "Serani Poji", "Strawberry Machine", "deadmau5", "Euseng Seto", "Lena Raine", "Kaskade"];
      var all = Object.keys(lib);
      var ordered = order.filter(function (a) { return lib[a]; });
      var rest = all.filter(function (a) { return order.indexOf(a) === -1; }).sort();
      return ordered.concat(rest);
    })();
    queue = tracks.slice();

    buildDOM();
    addSidebarBtn();
    togglePlayer(true);

    // Prefetch ALL unique cover images on init so they're cached in memory
    prefetchAllCovers();

    // No preload tricks needed — loadTrack() now sets audio.src immediately
    // and the browser's native preload='auto' handles buffering from CDN.

    window.addEventListener('resize', positionPanels);
    new MutationObserver(function () {
      if (visible) setTimeout(positionPanels, 80);
    }).observe(document.body, { attributes: true, attributeFilter: ['class'] });
  }

  // ── Prefetch all covers ──────────────────────────────────────────────────
  // Loads covers in small batches to avoid saturating the browser's connection
  // pool, which would make VISIBLE album grid images queue behind prefetch requests.
  function prefetchAllCovers() {
    var seen = new Set();
    var urls = [];
    tracks.forEach(function (t) {
      if (t.cover && !seen.has(t.cover)) {
        seen.add(t.cover);
        urls.push(t.cover);
      }
    });
    console.log('[music] Prefetching', urls.length, 'unique cover images (batched)');

    var BATCH = 10;
    var idx = 0;
    function loadBatch() {
      var end = Math.min(idx + BATCH, urls.length);
      for (var j = idx; j < end; j++) {
        var img = new Image();
        img.src = urls[j];
      }
      idx = end;
      if (idx < urls.length) {
        setTimeout(loadBatch, 50); // Tiny gap lets visible images through
      }
    }
    // Wait 500ms for the visible album grid images to finish loading first
    setTimeout(loadBatch, 500);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();