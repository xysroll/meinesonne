window.DM = {
  windows: {}, count: 0, zTop: 3000,

  open: function(u) {
    if (this.windows[u]) {
      // If the window exists but is hidden (mobile "background" state), show it
      if (this.windows[u].hidden) this.show(u);
      else if (this.windows[u].minimized) this.restore(u);
      this.front(u); if (window.innerWidth > 640) this.windows[u].input.focus(); return;
    }
    this._create(u);
  },

  // hide() — hides the DM visually. History is managed exclusively via popstate.
  hide: function(u) {
    var w = this.windows[u]; if (!w) return;
    w.hidden = true;
    w.el.classList.add('dm-hidden');
    this._updateTray();
  },

  show: function(u) {
    var w = this.windows[u]; if (!w) return;
    w.hidden = false;
    w.el.classList.remove('dm-hidden');
    this._clearUnread(u);
    this.front(u);
    if (window.innerWidth > 640) w.input.focus();
    this._updateTray();
  },

  // _updateTray — Messenger-style chat bubbles for hidden DMs (mobile only).
  _updateTray: function() {
    if (window.innerWidth > 640) return;
    var self = this;
    var hidden = Object.keys(this.windows).filter(function(k) { return DM.windows[k].hidden; });

    // Remove bubbles whose DM is no longer hidden
    document.querySelectorAll('.dm-bubble').forEach(function(b) {
      if (hidden.indexOf(b.dataset.dmUser) === -1) b.remove();
    });

    // Create or update a bubble per hidden DM
    hidden.forEach(function(u, idx) {
      var w = DM.windows[u];
      var safeU = u.replace(/[^a-zA-Z0-9_-]/g, '_');
      var bubble = document.querySelector('.dm-bubble[data-dm-user-id="' + safeU + '"]');

      if (!bubble) {
        bubble = document.createElement('div');
        bubble.className = 'dm-bubble';
        bubble.dataset.dmUserId = safeU;
        bubble.dataset.dmUser   = u;
        bubble.style.background = window.getUserColor(u);
        var letter = document.createElement('span');
        letter.textContent = u.charAt(0).toUpperCase();
        bubble.appendChild(letter);
        var badge = document.createElement('div');
        badge.className = 'dm-bubble-badge hidden';
        bubble.appendChild(badge);
        bubble.style.right  = '16px';
        bubble.style.bottom = (80 + idx * 68) + 'px';
        document.body.appendChild(bubble);
        self._bubbleDrag(bubble, u);
      }

      var badgeEl = bubble.querySelector('.dm-bubble-badge');
      if (badgeEl) {
        if (w.unread > 0) {
          badgeEl.textContent = w.unread > 99 ? '99+' : String(w.unread);
          badgeEl.classList.remove('hidden');
        } else {
          badgeEl.classList.add('hidden');
        }
      }
    });
  },

  // Touch-drag for chat bubbles + tap-to-open
  _bubbleDrag: function(bubble, u) {
    var startX, startY, origRight, origBottom, wasDrag = false;

    function getZoom() {
      var z = parseFloat(getComputedStyle(document.documentElement).zoom);
      return (isFinite(z) && z > 0) ? z : 1;
    }

    bubble.addEventListener('touchstart', function(e) {
      var t = e.touches[0];
      startX = t.clientX; startY = t.clientY;
      origRight  = parseInt(bubble.style.right,  10) || 16;
      origBottom = parseInt(bubble.style.bottom, 10) || 80;
      wasDrag = false;
      e.stopPropagation();
    }, { passive: true });

    bubble.addEventListener('touchmove', function(e) {
      var t = e.touches[0];
      var z  = getZoom();
      var dx = (t.clientX - startX) / z;
      var dy = (t.clientY - startY) / z;
      if (Math.abs(dx) > 4 || Math.abs(dy) > 4) wasDrag = true;
      if (!wasDrag) return;
      e.preventDefault();
      var vw = window.innerWidth  / z;
      var vh = window.innerHeight / z;
      var newRight  = Math.max(4, Math.min(vw - 58, origRight  - dx));
      var newBottom = Math.max(4, Math.min(vh - 58, origBottom - dy));
      bubble.style.right  = newRight  + 'px';
      bubble.style.bottom = newBottom + 'px';
    }, { passive: false });

    bubble.addEventListener('touchend', function() {
      if (wasDrag) {
        var z = getZoom();
        var vw = window.innerWidth / z;
        var r = parseInt(bubble.style.right, 10) || 16;
        var snapRight = r < (vw / 2 - 27) ? 16 : vw - 70;
        bubble.style.transition = 'right 0.18s ease';
        bubble.style.right = snapRight + 'px';
        setTimeout(function() { bubble.style.transition = ''; }, 220);
      } else {
        DM.show(u);
      }
    }, { passive: true });
  },

  close: function(u) {
    if (this.windows[u]) {
      if (this.windows[u]._dragCleanup) this.windows[u]._dragCleanup();
      this.windows[u].el.querySelectorAll('img[data-blob-url]').forEach(function(img) {
        URL.revokeObjectURL(img.dataset.blobUrl);
      });
      if (this.windows[u]._imgInput && this.windows[u]._imgInput.parentNode) {
        this.windows[u]._imgInput.parentNode.removeChild(this.windows[u]._imgInput);
      }
      var safeU = u.replace(/[^a-zA-Z0-9_-]/g, '_');
      var bub = document.querySelector('.dm-bubble[data-dm-user-id="' + safeU + '"]');
      if (bub) bub.remove();
      this.windows[u].el.remove();
      delete this.windows[u];
      if (Object.keys(this.windows).length === 0) { this.zTop = 3000; this.count = 0; }
    }
  },

  minimize: function(u) {
    var w = this.windows[u]; if (!w || w.minimized) return;
    w.minimized = true; w.el.classList.add('dm-minimized'); w.minBtn.textContent = '[ ]';
  },

  restore: function(u) {
    var w = this.windows[u]; if (!w || !w.minimized) return;
    w.minimized = false; w.el.classList.remove('dm-minimized'); w.minBtn.textContent = '---';
    this._clearUnread(u); this.front(u); if (window.innerWidth > 640) w.input.focus();
  },

  front: function(u) {
    var self = this;
    Object.keys(this.windows).forEach(function(k) { self.windows[k].el.classList.remove('dm-active'); });
    var w = this.windows[u]; if (!w) return;
    w.el.style.zIndex = ++this.zTop; w.el.classList.add('dm-active');
  },

  receive: function(from, to, text, time, isImg, imgData, encrypted) {
    var convo = from === window.myUsername ? to : from;
    if (!this.windows[convo]) this.open(convo);
    var localTime = window.fmtTime ? window.fmtTime(Date.now()) : time;
    this._append(convo, { from: from, text: text, time: localTime, isImg: isImg, imgData: imgData, encrypted: encrypted });
    var w = this.windows[convo];
    if (from !== window.myUsername && (w.minimized || w.hidden || !w.el.classList.contains('dm-active'))) {
      w.unread++; w.unreadEl.textContent = w.unread; w.unreadEl.classList.add('visible');
      if (window.sounds) window.sounds.message();
      this._updateTray();
    }
  },

  appendSys: function(u, msg) {
    var w = this.windows[u]; if (!w) return;
    var el = document.createElement('div'); el.className = 'dm-sys'; el.textContent = msg;
    w.msgsEl.appendChild(el); w.msgsEl.scrollTop = w.msgsEl.scrollHeight;
  },

  notifyLeft: function(u) {
    if (!this.windows[u]) return;
    this.appendSys(u, u + ' left the chat');
    this.windows[u].input.disabled = true; this.windows[u].sendBtn.disabled = true;
  },

  notifyRejoined: function(u) {
    if (!this.windows[u]) return;
    this.appendSys(u, u + ' rejoined');
    this.windows[u].input.disabled = false; this.windows[u].sendBtn.disabled = false;
  },

  _clearUnread: function(u) {
    var w = this.windows[u]; if (!w) return;
    w.unread = 0; w.unreadEl.textContent = ''; w.unreadEl.classList.remove('visible');
  },

  _effectiveVP: function() {
    var z = parseFloat(getComputedStyle(document.documentElement).zoom);
    if (!isFinite(z) || z <= 0) z = 1;
    return { w: window.innerWidth / z, h: window.innerHeight / z, z: z };
  },

  _clamp: function(u) {
    var w = this.windows[u]; if (!w) return;
    var vp = this._effectiveVP();
    var l = parseFloat(w.el.style.left) || 0;
    var t = parseFloat(w.el.style.top)  || 0;
    var maxL = Math.max(0, vp.w - (w.el.offsetWidth  || 300));
    var maxT = Math.max(0, vp.h - 40);
    w.el.style.left = Math.max(0, Math.min(l, maxL)) + 'px';
    w.el.style.top  = Math.max(0, Math.min(t, maxT)) + 'px';
  },

  _create: function(u) {
    var self = this;
    var color = window.getUserColor(u);
    var idx = this.count++;
    var vp   = this._effectiveVP();
    var stagger = (idx % 5) * 30;
    var left = Math.max(10, vp.w - 300 - 20 - stagger);
    var top  = Math.max(10, vp.h - 390 - 20 - stagger);

    var el = document.createElement('div');
    el.className = 'dm-win dm-active';
    el.style.left = left + 'px'; el.style.top = top + 'px'; el.style.zIndex = ++this.zTop;

    var tb = document.createElement('div'); tb.className = 'dm-titlebar';
    var backB = document.createElement('button'); backB.className = 'dm-back-btn'; backB.title = 'Back'; backB.innerHTML = '&#8592;';
    var tba = document.createElement('div'); tba.className = 'dm-tb-avatar'; tba.style.background = color; tba.textContent = u.charAt(0).toUpperCase();
    var tbn = document.createElement('div'); tbn.className = 'dm-tb-name'; tbn.textContent = u;
    var unr = document.createElement('div'); unr.className = 'dm-unread';
    var minB = document.createElement('button'); minB.className = 'dm-wb dm-min-btn'; minB.title = 'Minimize'; minB.textContent = '---';
    var clsB = document.createElement('button'); clsB.className = 'dm-wb dm-close-btn'; clsB.title = 'Close'; clsB.textContent = 'x';
    tb.appendChild(backB); tb.appendChild(tba); tb.appendChild(tbn); tb.appendChild(unr); tb.appendChild(minB); tb.appendChild(clsB);

    var body = document.createElement('div'); body.className = 'dm-body';
    var msgs = document.createElement('div'); msgs.className = 'dm-messages';
    var sys0 = document.createElement('div'); sys0.className = 'dm-sys'; sys0.textContent = 'conversation with ' + u;
    msgs.appendChild(sys0);

    var pr = document.createElement('div'); pr.className = 'dm-paste-row';
    var pt = document.createElement('img'); pt.className = 'dm-paste-thumb';
    var pl = document.createElement('div'); pl.className = 'dm-paste-lbl';
    var px = document.createElement('button'); px.className = 'dm-paste-x'; px.textContent = 'x';
    pr.appendChild(pt); pr.appendChild(pl); pr.appendChild(px);

    var ib = document.createElement('div'); ib.className = 'dm-inputbar';
    var dmImgInput = document.createElement('input'); dmImgInput.type = 'file'; dmImgInput.accept = 'image/*';
    dmImgInput.style.cssText = 'position:fixed;top:-999px;left:-999px;width:0;height:0;opacity:0;visibility:hidden;pointer-events:none;overflow:hidden;'; dmImgInput.setAttribute('aria-hidden','true'); dmImgInput.setAttribute('tabindex','-1');
    document.body.appendChild(dmImgInput);
    var dmImgBtn = document.createElement('button'); dmImgBtn.className = 'dm-sendbtn dm-img-btn'; dmImgBtn.title = 'Attach image';
    dmImgBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 20 20" fill="none"><rect x="2" y="4" width="16" height="12" rx="2" stroke="currentColor" stroke-width="1.8"/><circle cx="7" cy="8.5" r="1.5" fill="currentColor"/><path d="M2 13l4.5-4 3.5 3.5 2.5-2.5L18 14" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    var inp = document.createElement('textarea'); inp.className = 'dm-input'; inp.placeholder = 'Message ' + u + '...'; inp.maxLength = 1000; inp.rows = 1;
    inp.setAttribute('autocomplete', 'off'); inp.setAttribute('autocorrect', 'on'); inp.setAttribute('autocapitalize', 'sentences');
    var snd = document.createElement('button'); snd.className = 'dm-sendbtn'; snd.title = 'Send';
    snd.innerHTML = '<svg width="14" height="14" viewBox="0 0 18 18" fill="none"><path d="M9 14V4M9 4L4.5 8.5M9 4L13.5 8.5" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    ib.appendChild(dmImgBtn); ib.appendChild(inp); ib.appendChild(snd);

    body.appendChild(msgs); body.appendChild(pr); body.appendChild(ib);
    el.appendChild(tb); el.appendChild(body);
    document.body.appendChild(el);

    var w = { el:el, msgsEl:msgs, input:inp, sendBtn:snd, pasteRow:pr, pasteThumb:pt,
      pasteLbl:pl, pasteX:px, unreadEl:unr, minBtn:minB, _imgInput:dmImgInput,
      pendingImg:null, unread:0, minimized:false, hidden:false, lastFrom:null, lastTs:0 };
    this.windows[u] = w;

    this._drag(tb, el, u);

    if (window.innerWidth <= 640) {
      history.pushState({ dmOpen: u }, '');
    }

    minB.addEventListener('click', function(e) { e.stopPropagation(); w.minimized ? self.restore(u) : self.minimize(u); });
    clsB.addEventListener('click', function(e) { e.stopPropagation(); self.close(u); });

    backB.addEventListener('click', function(e) {
      e.preventDefault(); e.stopPropagation();
      if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
      if (window.innerWidth <= 640) self.hide(u);
      else self.close(u);
    });

    el.addEventListener('mousedown', function() { self.front(u); });
    el.addEventListener('click', function() { self._clearUnread(u); });

    (function() {
      var tsX = 0, tsY = 0;
      el.addEventListener('touchstart', function(e) {
        tsX = e.touches[0].clientX; tsY = e.touches[0].clientY;
      }, { passive: true });
      el.addEventListener('touchend', function(e) {
        if (window.innerWidth > 640) return;
        var dx = e.changedTouches[0].clientX - tsX;
        var dy = e.changedTouches[0].clientY - tsY;
        if (dx > 80 && Math.abs(dy) < Math.abs(dx) * 0.6) {
          e.preventDefault(); self.hide(u);
        }
      }, { passive: false });
    })();

    snd.addEventListener('click', function() { self._send(u); });
    inp.addEventListener('keydown', function(e) { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); self._send(u); } });
    inp.addEventListener('input', function() { inp.style.height = 'auto'; inp.style.height = Math.min(inp.scrollHeight, 72) + 'px'; });
    
    inp.addEventListener('paste', function(e) {
      var items = e.clipboardData && e.clipboardData.items;
      if (!items) return;
      for (var i = 0; i < items.length; i++) {
        if (items[i].type.startsWith('image/')) {
          e.preventDefault();
          if (window.compressImage) {
            window.compressImage(items[i].getAsFile()).then(function(b64) {
              w.pendingImg = b64; w.pasteThumb.src = b64;
              w.pasteLbl.textContent = 'image ' + Math.round(b64.length * 0.75 / 1024) + 'KB';
              w.pasteRow.classList.add('visible');
            }).catch(function(err) { self.appendSys(u, typeof err === 'string' ? err : 'Could not process image.'); });
          }
          return;
        }
      }
    });

    px.addEventListener('click', function() { w.pendingImg = null; w.pasteThumb.src = ''; w.pasteRow.classList.remove('visible'); });
    dmImgBtn.addEventListener('click', function() {
      dmImgInput.value = '';
      dmImgInput.style.visibility = 'visible'; dmImgInput.style.pointerEvents = 'auto';
      dmImgInput.click();
      requestAnimationFrame(function() { dmImgInput.style.visibility = 'hidden'; dmImgInput.style.pointerEvents = 'none'; });
    });
    
    dmImgInput.addEventListener('change', function() {
      var file = dmImgInput.files && dmImgInput.files[0];
      if (!file) return;
      if (window.compressImage) {
        window.compressImage(file).then(function(b64) {
          w.pendingImg = b64; w.pasteThumb.src = b64;
          w.pasteLbl.textContent = 'image ' + Math.round(b64.length * 0.75 / 1024) + 'KB';
          w.pasteRow.classList.add('visible');
        }).catch(function(err) { self.appendSys(u, typeof err === 'string' ? err : 'Could not process image.'); });
      }
    });
    
    inp.focus();
  },

  _send: function(u) {
    var w = this.windows[u];
    if (!w || !window.ws || window.ws.readyState !== WebSocket.OPEN) return;
    if (w.pendingImg) {
      var imgData = w.pendingImg, text = w.input.value.trim();
      w.pendingImg = null; w.pasteThumb.src = ''; w.pasteRow.classList.remove('visible');
      window.ws.send(JSON.stringify({ type: 'dm-image', to: u, data: imgData }));
      if (text) {
        (async () => {
          try {
            if (window.E2E && window.E2E.hasPeerKey(u)) {
              var ct = await window.E2E.encrypt(u, text);
              window.ws.send(JSON.stringify({ type: 'dm', to: u, text: ct, encrypted: true }));
            } else {
              window.ws.send(JSON.stringify({ type: 'dm', to: u, text: text }));
            }
          } catch(e) { window.ws.send(JSON.stringify({ type: 'dm', to: u, text: text })); }
        })();
      }
      w.input.value = ''; w.input.style.height = 'auto'; w.input.focus(); return;
    }
    
    var msgText = w.input.value.trim(); if (!msgText) return;
    w.input.value = ''; w.input.style.height = 'auto'; w.input.focus();
    (async () => {
      try {
        if (window.E2E && window.E2E.hasPeerKey(u)) {
          var ct = await window.E2E.encrypt(u, msgText);
          window.ws.send(JSON.stringify({ type: 'dm', to: u, text: ct, encrypted: true }));
        } else {
          window.ws.send(JSON.stringify({ type: 'dm', to: u, text: msgText }));
        }
      } catch(e) { window.ws.send(JSON.stringify({ type: 'dm', to: u, text: msgText })); }
    })();
  },

  _append: function(u, opts) {
    var w = this.windows[u]; if (!w) return;
    var nowMs = Date.now();
    var grouped = opts.from === w.lastFrom && (nowMs - w.lastTs) < 60000;
    w.lastFrom = opts.from; w.lastTs = nowMs;
    var color = window.getUserColor(opts.from);
    
    var msgEl = document.createElement('div');
    msgEl.className = 'dm-msg' + (opts.from === window.myUsername ? ' dm-own' : '') + (grouped ? ' dm-grouped' : '');
    var hdr = document.createElement('div'); hdr.className = 'dm-msg-header';
    var uEl = document.createElement('span'); uEl.className = 'dm-msg-user'; uEl.style.color = color; uEl.textContent = opts.from;
    var tEl = document.createElement('span'); tEl.className = 'dm-msg-time'; tEl.textContent = opts.time;
    hdr.appendChild(uEl); hdr.appendChild(tEl); msgEl.appendChild(hdr);
    
    if (opts.isImg) {
      var wrap = document.createElement('div'); wrap.className = 'dm-msg-img';
      var img = document.createElement('img'); var blob = window.base64ToBlobUrl ? window.base64ToBlobUrl(opts.imgData) : '';
      if (!blob) return;
      img.src = blob; img.dataset.blobUrl = blob; img.alt = 'image'; img.loading = 'lazy';
      img.addEventListener('click', function() { window.openLightbox(blob); });
      wrap.appendChild(img); msgEl.appendChild(wrap);
    } else {
      var txtEl = document.createElement('div'); txtEl.className = 'dm-msg-text';
      txtEl.innerHTML = window.highlightMentions ? window.highlightMentions(opts.text) : window.escapeHtml(opts.text);
      if (opts.encrypted) {
        var lockEl = document.createElement('span');
        lockEl.className = 'dm-e2e-lock'; lockEl.textContent = ' 🔒'; lockEl.title = 'end-to-end encrypted';
        txtEl.appendChild(lockEl);
      }
      msgEl.appendChild(txtEl);
    }
    w.msgsEl.appendChild(msgEl); w.msgsEl.scrollTop = w.msgsEl.scrollHeight;
  },

  _drag: function(handle, winEl, u) {
    var self = this, dragging = false, sx, sy, ox, oy;
    handle.addEventListener('mousedown', function(e) {
      if (e.target.closest('.dm-wb')) return;
      dragging = true; sx = e.clientX; sy = e.clientY;
      ox = parseFloat(winEl.style.left) || 0;
      oy = parseFloat(winEl.style.top)  || 0;
      self.front(u); e.preventDefault();
    });
    function onMove(e) {
      if (!dragging) return;
      var z = parseFloat(getComputedStyle(document.documentElement).zoom);
      if (!isFinite(z) || z <= 0) z = 1;
      var vp = self._effectiveVP();
      var newL = ox + (e.clientX - sx) / z;
      var newT = oy + (e.clientY - sy) / z;
      winEl.style.left = Math.max(0, Math.min(vp.w - (winEl.offsetWidth || 300), newL)) + 'px';
      winEl.style.top  = Math.max(0, Math.min(vp.h - 40, newT)) + 'px';
    }
    function onUp() { if (dragging) { dragging = false; self._clamp(u); } }
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    if (this.windows[u]) {
      this.windows[u]._dragCleanup = function() {
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
      };
    }
  }
};