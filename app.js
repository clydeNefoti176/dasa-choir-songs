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
  songsUrl:      '/data/songs.json',
  slideshowUrl:  '/data/slideshow.json',
  slideshowMs:   4500,   // interval between slides
  transitionMs:  1400,   // match CSS transition duration
};

// ─────────────────────────────────────────────────────────────
//  STATE
// ─────────────────────────────────────────────────────────────
const state = {
  allSongs:    [],
  images:      [],
  slideIndex:  0,
  slideTimer:  null,
};

// ─────────────────────────────────────────────────────────────
//  UTILS
// ─────────────────────────────────────────────────────────────

/** Safely escape HTML to prevent XSS */
function escHtml(str = '') {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Get a URL query param by name */
function qp(name) {
  return new URLSearchParams(window.location.search).get(name);
}

/** Truncate text for card preview */
function truncate(text, max = 130) {
  if (!text) return '';
  const flat = text.replace(/\n+/g, ' ').trim();
  return flat.length > max ? flat.slice(0, max).trimEnd() + '\u2026' : flat;
}

/** Count non-empty lines in lyrics */
function lineCount(lyrics = '') {
  return lyrics.split('\n').filter(l => l.trim()).length;
}

/** Fetch JSON with a cache-buster so CDN/browser re-fetches on deploy */
async function fetchJSON(url) {
  const res = await fetch(url + '?_=' + Math.floor(Date.now() / 30000)); // 30s bucket
  if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${url}`);
  return res.json();
}

/** Set footer year everywhere */
function setFooterYear() {
  document.querySelectorAll('[id^="footerYear"]').forEach(el => {
    el.textContent = new Date().getFullYear();
  });
}

// ─────────────────────────────────────────────────────────────
//  NAVBAR — scroll effect
// ─────────────────────────────────────────────────────────────
function initNavbar() {
  const nav = document.getElementById('navbar');
  if (!nav) return;

  const onScroll = () => {
    nav.classList.toggle('scrolled', window.scrollY > 60);
  };

  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll(); // run once in case page loads scrolled
}

// ─────────────────────────────────────────────────────────────
//  SLIDESHOW
// ─────────────────────────────────────────────────────────────
function buildSlide(imgData, index) {
  const el = document.createElement('div');
  el.className = 'slide' + (index === 0 ? ' active' : '');
  el.style.backgroundImage = `url('${escHtml(imgData.image)}')`;
  el.setAttribute('role', 'img');
  if (imgData.caption) el.setAttribute('aria-label', imgData.caption);
  return el;
}

function buildDot(index) {
  const btn = document.createElement('button');
  btn.className = 'slide-dot' + (index === 0 ? ' active' : '');
  btn.setAttribute('role', 'tab');
  btn.setAttribute('aria-label', `Slide ${index + 1}`);
  btn.setAttribute('aria-selected', index === 0 ? 'true' : 'false');
  btn.addEventListener('click', () => {
    goToSlide(index);
    resetTimer();
  });
  return btn;
}

function goToSlide(next) {
  const slides = document.querySelectorAll('.slide');
  const dots   = document.querySelectorAll('.slide-dot');
  const counter = document.getElementById('slideCounter');
  if (!slides.length) return;

  const n = ((next % slides.length) + slides.length) % slides.length;

  slides[state.slideIndex]?.classList.remove('active');
  dots[state.slideIndex]?.classList.remove('active');
  dots[state.slideIndex]?.setAttribute('aria-selected', 'false');

  state.slideIndex = n;

  slides[n]?.classList.add('active');
  dots[n]?.classList.add('active');
  dots[n]?.setAttribute('aria-selected', 'true');

  if (counter) {
    counter.innerHTML = `<strong>${n + 1}</strong> / ${slides.length}`;
  }
}

function resetTimer() {
  clearInterval(state.slideTimer);
  if (state.images.length > 1) {
    state.slideTimer = setInterval(() => goToSlide(state.slideIndex + 1), CONFIG.slideshowMs);
  }
}

function initSlideshow(images) {
  const wrap     = document.getElementById('slideshowWrap');
  const controls = document.getElementById('slideshowControls');
  const fallback = document.getElementById('slideFallback');
  const counter  = document.getElementById('slideCounter');

  if (!wrap) return;

  state.images = images;

  if (!images || images.length === 0) {
    // Keep the CSS gradient fallback visible
    if (fallback) fallback.style.opacity = '1';
    if (controls) controls.style.display = 'none';
    if (counter)  counter.style.display  = 'none';
    return;
  }

  // We have images — hide fallback gracefully
  if (fallback) {
    fallback.style.transition = 'opacity 1.5s ease';
    fallback.style.opacity = '0';
    setTimeout(() => { if (fallback) fallback.style.display = 'none'; }, 1500);
  }

  // Build slides
  images.forEach((imgData, i) => {
    wrap.appendChild(buildSlide(imgData, i));
  });

  // Build dots (only if >1 image)
  if (images.length > 1 && controls) {
    images.forEach((_, i) => controls.appendChild(buildDot(i)));
    resetTimer();
  }

  // Counter
  if (counter && images.length > 1) {
    counter.innerHTML = `<strong>1</strong> / ${images.length}`;
  } else if (counter) {
    counter.style.display = 'none';
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
  songs.forEach((song, i) => frag.appendChild(buildSongCard(song, state.allSongs.indexOf(song))));
  grid.appendChild(frag);
}

function renderError() {
  const grid = document.getElementById('songsGrid');
  if (!grid) return;
  grid.innerHTML = `
    <div class="state-card" role="alert">
      <div class="state-icon" aria-hidden="true">⚠️</div>
      <h3 class="state-title">Could Not Load Songs</h3>
      <p class="state-body">Unable to fetch the song data. Please check your connection and try refreshing.</p>
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
  const field   = document.getElementById('searchField');
  const clear   = document.getElementById('searchClear');
  const status  = document.getElementById('searchStatus');
  const secCnt  = document.getElementById('sectionCount');
  if (!field) return;

  const updateStatus = (shown, total, query) => {
    if (!query) {
      if (status)  status.textContent  = '';
      if (secCnt)  secCnt.textContent  = `${total} song${total !== 1 ? 's' : ''}`;
    } else if (shown === 0) {
      if (status)  status.textContent  = `No results for "${query}"`;
      if (secCnt)  secCnt.textContent  = '0 songs';
    } else {
      if (status)  status.textContent  = `${shown} result${shown !== 1 ? 's' : ''} found`;
      if (secCnt)  secCnt.textContent  = `${shown} song${shown !== 1 ? 's' : ''}`;
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

  // Load slideshow (non-blocking)
  fetchJSON(CONFIG.slideshowUrl)
    .then(data => initSlideshow((data.images || []).filter(img => img?.image)))
    .catch(() => initSlideshow([]));

  // Load songs
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

  // Guard: invalid index
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

    // Update <title>
    document.title = `${song.title} — DASA Choir`;

    // Update meta description dynamically
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) metaDesc.setAttribute('content', truncate(song.lyrics, 150));

    // Hero
    if (titleEl) titleEl.textContent = song.title;
    if (tagEl)   tagEl.textContent   = `Song #${String(idx + 1).padStart(2, '0')}`;

    // Sidebar
    if (sidebarTitle) sidebarTitle.textContent = song.title;
    if (sidebarLines) {
      const lines = lineCount(song.lyrics);
      sidebarLines.textContent = `${lines} line${lines !== 1 ? 's' : ''}`;
    }
    if (sidebar) sidebar.removeAttribute('aria-hidden');

    // Lyrics card — clear skeleton, inject lyrics
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
      <div class="state-card" style="border:none; box-shadow:none;">
        <div class="state-icon">${isNetworkError ? '⚠️' : '🔍'}</div>
        <h3 class="state-title">${isNetworkError ? 'Something Went Wrong' : 'Song Not Found'}</h3>
        <p class="state-body">
          ${isNetworkError
            ? 'Could not load song data. Please refresh and try again.'
            : 'This song does not exist in the collection.'}
        </p>
        <a href="/" class="btn-primary" style="margin-top: 28px; display: inline-flex; text-decoration: none; color: var(--ink);">
          ← Back to Songs
        </a>
      </div>
    `;
  }
}

// ─────────────────────────────────────────────────────────────
//  ROUTER — detect current page and initialise
// ─────────────────────────────────────────────────────────────
(function route() {
  const path = window.location.pathname;

  if (path.endsWith('song.html') || path.includes('/song')) {
    document.addEventListener('DOMContentLoaded', initSongPage);
  } else {
    document.addEventListener('DOMContentLoaded', initIndexPage);
  }

  // Netlify Identity: redirect to /admin after login
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
