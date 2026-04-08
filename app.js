/**
 * ============================================================
 * DASA Choir Songs — app.js
 * Production-ready vanilla JS for JAMstack choir app
 * ============================================================
 */

'use strict';

// ─────────────────────────────────────────────────────────────
//  CONFIG
// ─────────────────────────────────────────────────────────────
const CONFIG = {
  songsUrl:     '/data/songs.json',
  slideshowUrl: '/data/slideshow.json',
  slideshowMs:  4500,  // interval between slides (ms)
};

// ─────────────────────────────────────────────────────────────
//  STATE
// ─────────────────────────────────────────────────────────────
const state = {
  allSongs:   [],
  images:     [],
  slideIndex: 0,
  slideTimer: null,
  // ✅ FIX: store DOM references at build time, not re-queried on every tick
  slideEls:   [],   // Array of .slide DOM elements
  dotEls:     [],   // Array of .slide-dot DOM elements
};

// ─────────────────────────────────────────────────────────────
//  UTILS
// ─────────────────────────────────────────────────────────────

function escHtml(str = '') {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function qp(name) {
  return new URLSearchParams(window.location.search).get(name);
}

function truncate(text, max = 130) {
  if (!text) return '';
  const flat = text.replace(/\n+/g, ' ').trim();
  return flat.length > max ? flat.slice(0, max).trimEnd() + '\u2026' : flat;
}

function lineCount(lyrics = '') {
  return lyrics.split('\n').filter(l => l.trim()).length;
}

async function fetchJSON(url) {
  const res = await fetch(url + '?_=' + Math.floor(Date.now() / 30000));
  if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${url}`);
  return res.json();
}

function setFooterYear() {
  document.querySelectorAll('[id^="footerYear"]').forEach(el => {
    el.textContent = new Date().getFullYear();
  });
}

// ─────────────────────────────────────────────────────────────
//  NAVBAR
// ─────────────────────────────────────────────────────────────
function initNavbar() {
  const nav = document.getElementById('navbar');
  if (!nav) return;
  const onScroll = () => nav.classList.toggle('scrolled', window.scrollY > 60);
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
}

// ─────────────────────────────────────────────────────────────
//  SLIDESHOW  ← ✅ FIXED
// ─────────────────────────────────────────────────────────────

function buildSlide(imgData) {
  const el = document.createElement('div');
  el.className = 'slide';  // active class set explicitly after array is built
  el.style.backgroundImage = `url('${escHtml(imgData.image)}')`;
  el.setAttribute('role', 'img');
  if (imgData.caption) el.setAttribute('aria-label', imgData.caption);
  return el;
}

function buildDot(index) {
  const btn = document.createElement('button');
  btn.className = 'slide-dot';
  btn.setAttribute('role', 'tab');
  btn.setAttribute('aria-label', `Slide ${index + 1}`);
  btn.setAttribute('aria-selected', 'false');
  btn.addEventListener('click', () => {
    goToSlide(index);
    resetTimer();
  });
  return btn;
}

/**
 * ✅ CORE FIX: Uses state.slideEls / state.dotEls (populated once at
 * build time) instead of document.querySelectorAll('.slide') on each call.
 *
 * The original bug: querySelectorAll was called inside setInterval.
 * If it ran before all slides finished appending, it returned only 1 element,
 * so the "next" index always wrapped back to 0 — giving the appearance of
 * a single looping image even when multiple were uploaded.
 */
function goToSlide(next) {
  const slides  = state.slideEls;
  const dots    = state.dotEls;
  const counter = document.getElementById('slideCounter');

  if (!slides.length) return;

  const n = ((next % slides.length) + slides.length) % slides.length;

  // Deactivate current
  slides[state.slideIndex].classList.remove('active');
  if (dots[state.slideIndex]) {
    dots[state.slideIndex].classList.remove('active');
    dots[state.slideIndex].setAttribute('aria-selected', 'false');
  }

  // Activate next
  state.slideIndex = n;
  slides[n].classList.add('active');
  if (dots[n]) {
    dots[n].classList.add('active');
    dots[n].setAttribute('aria-selected', 'true');
  }

  if (counter) {
    counter.innerHTML = `<strong>${n + 1}</strong> / ${slides.length}`;
  }
}

function resetTimer() {
  clearInterval(state.slideTimer);
  if (state.slideEls.length > 1) {
    state.slideTimer = setInterval(
      () => goToSlide(state.slideIndex + 1),
      CONFIG.slideshowMs
    );
  }
}

/**
 * normalizeImages — accepts BOTH formats Decap CMS can produce:
 *
 *   Format A  (config.yml `field` singular → plain strings):
 *     ["/assets/images/a.jpg", "/assets/images/b.jpg"]
 *
 *   Format B  (config.yml `fields` array → objects):
 *     [{image: "/assets/images/a.jpg", caption: "…"}, …]
 *
 * Returns a clean {image, caption}[] either way.
 */
function normalizeImages(raw) {
  if (!Array.isArray(raw)) return [];
  return raw.map(entry => {
    if (typeof entry === 'string' && entry.trim()) {
      const p = entry.trim();
      return { image: p.startsWith('/') ? p : '/' + p, caption: '' };
    }
    if (entry && typeof entry === 'object' && entry.image) {
      const p = String(entry.image).trim();
      return { image: p.startsWith('/') ? p : '/' + p, caption: entry.caption || '' };
    }
    return null;
  }).filter(Boolean);
}

/**
 * ✅ FIXED initSlideshow:
 * 1. Build ALL elements into arrays first
 * 2. Append to DOM in one batch
 * 3. Activate slide 0 + dot 0
 * 4. Start timer ONLY AFTER state.slideEls is fully populated
 */
function initSlideshow(images) {
  const wrap     = document.getElementById('slideshowWrap');
  const controls = document.getElementById('slideshowControls');
  const fallback = document.getElementById('slideFallback');
  const counter  = document.getElementById('slideCounter');

  if (!wrap) return;

  // ✅ Normalize: converts string[] or object[] → {image,caption}[]
  const validImages = normalizeImages(images);
  state.images  = validImages;
  state.slideEls = [];
  state.dotEls   = [];

  if (validImages.length === 0) {
    if (controls) controls.style.display = 'none';
    if (counter)  counter.style.display  = 'none';
    return;
  }

  // ── 1. Build all slide elements, store in state ──────────
  const slidesFrag = document.createDocumentFragment();
  validImages.forEach(imgData => {
    const el = buildSlide(imgData);
    state.slideEls.push(el);      // ← stored here
    slidesFrag.appendChild(el);
  });

  // ── 2. Append entire batch to DOM at once ────────────────
  wrap.appendChild(slidesFrag);

  // ── 3. Activate first slide ──────────────────────────────
  state.slideIndex = 0;
  state.slideEls[0].classList.add('active');

  // ── 4. Fade out CSS gradient fallback ───────────────────
  if (fallback) {
    fallback.style.transition = 'opacity 1.5s ease';
    fallback.style.opacity    = '0';
    setTimeout(() => { if (fallback) fallback.style.display = 'none'; }, 1500);
  }

  // ── 5. Multi-image: build dots, update counter, start timer ──
  if (validImages.length > 1) {
    const dotsFrag = document.createDocumentFragment();
    validImages.forEach((_, i) => {
      const dot = buildDot(i);
      state.dotEls.push(dot);     // ← stored here
      dotsFrag.appendChild(dot);
    });

    if (controls) {
      controls.appendChild(dotsFrag);
      state.dotEls[0].classList.add('active');
      state.dotEls[0].setAttribute('aria-selected', 'true');
    }

    if (counter) {
      counter.innerHTML = `<strong>1</strong> / ${validImages.length}`;
    }

    // ← Timer starts HERE, only after state.slideEls is fully built
    resetTimer();

  } else {
    // Single image: hide navigation chrome
    if (controls) controls.style.display = 'none';
    if (counter)  counter.style.display  = 'none';
  }
}

// ─────────────────────────────────────────────────────────────
//  SONG CARDS
// ─────────────────────────────────────────────────────────────
function buildSongCard(song, index) {
  const a = document.createElement('a');
  a.className = 'song-card';
  a.href = `/song.html?i=${index}`;
  a.setAttribute('role', 'listitem');
  a.setAttribute('aria-label', `Open song: ${song.title}`);
  a.style.animationDelay = `${Math.min(index * 70, 500)}ms`;

  a.innerHTML = `
    <span class="card-num" aria-hidden="true">${String(index + 1).padStart(2, '0')}</span>
    <span class="card-tag">Song</span>
    <h3 class="card-title">${escHtml(song.title)}</h3>
    <p class="card-preview">${escHtml(truncate(song.lyrics))}</p>
    <div class="card-footer">
      <span class="card-link">
        Read lyrics
        <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.5" aria-hidden="true">
          <path d="M5 12h14M12 5l7 7-7 7"/>
        </svg>
      </span>
      <span class="card-note" aria-hidden="true">♪</span>
    </div>
  `;
  return a;
}

function renderCards(songs) {
  const grid = document.getElementById('songsGrid');
  if (!grid) return;
  grid.innerHTML = '';

  if (!songs || songs.length === 0) {
    grid.innerHTML = `
      <div class="state-card" role="listitem">
        <div class="state-icon" aria-hidden="true">🎵</div>
        <h3 class="state-title">No Songs Found</h3>
        <p class="state-body">
          ${state.allSongs.length === 0
            ? 'Songs added through the admin panel will appear here.'
            : 'No songs match your search. Try a different term.'}
        </p>
      </div>
    `;
    return;
  }

  const frag = document.createDocumentFragment();
  songs.forEach(song => {
    frag.appendChild(buildSongCard(song, state.allSongs.indexOf(song)));
  });
  grid.appendChild(frag);
}

function renderError() {
  const grid = document.getElementById('songsGrid');
  if (!grid) return;
  grid.innerHTML = `
    <div class="state-card" role="alert">
      <div class="state-icon" aria-hidden="true">⚠️</div>
      <h3 class="state-title">Could Not Load Songs</h3>
      <p class="state-body">Unable to fetch the song data. Please refresh and try again.</p>
    </div>
  `;
}

// ─────────────────────────────────────────────────────────────
//  STATS BAR
// ─────────────────────────────────────────────────────────────
function updateStats(count) {
  const el = document.getElementById('statSongs');
  if (el) el.innerHTML = `<span>${count}</span>`;
}

// ─────────────────────────────────────────────────────────────
//  SEARCH
// ─────────────────────────────────────────────────────────────
function initSearch() {
  const field  = document.getElementById('searchField');
  const clear  = document.getElementById('searchClear');
  const status = document.getElementById('searchStatus');
  const secCnt = document.getElementById('sectionCount');
  if (!field) return;

  const updateStatus = (shown, total, query) => {
    if (!query) {
      if (status) status.textContent = '';
      if (secCnt) secCnt.textContent = `${total} song${total !== 1 ? 's' : ''}`;
    } else if (shown === 0) {
      if (status) status.textContent = `No results for "${query}"`;
      if (secCnt) secCnt.textContent = '0 songs';
    } else {
      if (status) status.textContent = `${shown} result${shown !== 1 ? 's' : ''} found`;
      if (secCnt) secCnt.textContent = `${shown} song${shown !== 1 ? 's' : ''}`;
    }
  };

  field.addEventListener('input', () => {
    const q = field.value.trim().toLowerCase();
    if (!q) {
      renderCards(state.allSongs);
      updateStatus(state.allSongs.length, state.allSongs.length, '');
      return;
    }
    const matches = state.allSongs.filter(s => s.title.toLowerCase().includes(q));
    renderCards(matches);
    updateStatus(matches.length, state.allSongs.length, q);
  });

  if (clear) {
    clear.addEventListener('click', () => {
      field.value = '';
      field.dispatchEvent(new Event('input'));
      field.focus();
    });
  }
}

// ─────────────────────────────────────────────────────────────
//  INDEX PAGE INIT
// ─────────────────────────────────────────────────────────────
async function initIndexPage() {
  setFooterYear();
  initNavbar();

  fetchJSON(CONFIG.slideshowUrl)
    .then(data => initSlideshow(data.images || []))
    .catch(() => initSlideshow([]));

  try {
    const data = await fetchJSON(CONFIG.songsUrl);
    state.allSongs = (data.songs || []).filter(s => s?.title);
    renderCards(state.allSongs);
    updateStats(state.allSongs.length);

    const secCnt = document.getElementById('sectionCount');
    if (secCnt) {
      secCnt.textContent = `${state.allSongs.length} song${state.allSongs.length !== 1 ? 's' : ''}`;
    }
    initSearch();
  } catch (err) {
    console.error('[DASA Choir] Failed to load songs:', err);
    renderError();
    updateStats(0);
  }
}

// ─────────────────────────────────────────────────────────────
//  SONG DETAIL PAGE INIT
// ─────────────────────────────────────────────────────────────
async function initSongPage() {
  setFooterYear();

  const idx          = parseInt(qp('i'), 10);
  const titleEl      = document.getElementById('songTitle');
  const tagEl        = document.getElementById('songTag');
  const lyricsCard   = document.getElementById('lyricsCard');
  const sidebarTitle = document.getElementById('sidebarTitle');
  const sidebarLines = document.getElementById('sidebarLineCount');
  const sidebar      = document.getElementById('songSidebar');

  if (isNaN(idx) || idx < 0) {
    showSongError(titleEl, lyricsCard, false);
    return;
  }

  try {
    const data  = await fetchJSON(CONFIG.songsUrl);
    const songs = (data.songs || []).filter(s => s?.title);
    const song  = songs[idx];

    if (!song) {
      showSongError(titleEl, lyricsCard, false);
      return;
    }

    document.title = `${song.title} — DASA Choir`;

    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) metaDesc.setAttribute('content', truncate(song.lyrics, 150));

    if (titleEl) titleEl.textContent = song.title;
    if (tagEl)   tagEl.textContent   = `Song #${String(idx + 1).padStart(2, '0')}`;
    if (sidebarTitle) sidebarTitle.textContent = song.title;
    if (sidebarLines) {
      const lines = lineCount(song.lyrics);
      sidebarLines.textContent = `${lines} line${lines !== 1 ? 's' : ''}`;
    }
    if (sidebar) sidebar.removeAttribute('aria-hidden');

    if (lyricsCard) {
      lyricsCard.innerHTML = `<p class="lyrics-body">${escHtml(song.lyrics)}</p>`;
    }

  } catch (err) {
    console.error('[DASA Choir] Failed to load song:', err);
    showSongError(titleEl, lyricsCard, true);
  }
}

function showSongError(titleEl, lyricsCard, isNetworkError) {
  if (titleEl) titleEl.textContent = isNetworkError ? 'Error Loading Song' : 'Song Not Found';
  if (lyricsCard) {
    lyricsCard.innerHTML = `
      <div class="state-card" style="border:none;box-shadow:none;">
        <div class="state-icon">${isNetworkError ? '⚠️' : '🔍'}</div>
        <h3 class="state-title">${isNetworkError ? 'Something Went Wrong' : 'Song Not Found'}</h3>
        <p class="state-body">
          ${isNetworkError
            ? 'Could not load song data. Please refresh and try again.'
            : 'This song does not exist in the collection.'}
        </p>
        <a href="/" class="btn-primary" style="margin-top:28px;display:inline-flex;text-decoration:none;color:var(--ink);">
          ← Back to Songs
        </a>
      </div>
    `;
  }
}

// ─────────────────────────────────────────────────────────────
//  ROUTER
// ─────────────────────────────────────────────────────────────
(function route() {
  const path = window.location.pathname;

  if (path.endsWith('song.html') || path.includes('/song')) {
    document.addEventListener('DOMContentLoaded', initSongPage);
  } else {
    document.addEventListener('DOMContentLoaded', initIndexPage);
  }

  if (window.netlifyIdentity) {
    window.netlifyIdentity.on('init', user => {
      if (!user) {
        window.netlifyIdentity.on('login', () => {
          document.location.href = '/admin/';
        });
      }
    });
  }
})();
