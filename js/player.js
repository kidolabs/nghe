'use strict';

// ---------- Book context (from ?book=slug) ----------
const params = new URLSearchParams(location.search);
const slug = params.get('book') || 'new-round-up-starter';
const BOOK_DIR = 'books/' + slug;
const STORE = 'nru-player-' + slug;   // per-book persistence

// ---------- Elements ----------
const audio = document.getElementById('audio');
const listEl = document.getElementById('trackList');
const bookTitleEl = document.getElementById('bookTitle');
const bookSubEl = document.getElementById('bookSub');
const npTitle = document.getElementById('npTitle');
const curTimeEl = document.getElementById('curTime');
const durTimeEl = document.getElementById('durTime');
const seek = document.getElementById('seek');
const playBtn = document.getElementById('playBtn');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const repeatBtn = document.getElementById('repeatBtn');
const speedBtn = document.getElementById('speedBtn');
const vol = document.getElementById('vol');
const volVal = document.getElementById('volVal');

const SPEEDS = [1, 1.25, 1.5, 0.75];

// ---------- State ----------
let tracks = [];
let current = -1;
let isSeeking = false;
let repeatOne = false;
let speedIdx = 0;

// ---------- Persistence ----------
function loadState() {
  try { return JSON.parse(localStorage.getItem(STORE)) || {}; }
  catch { return {}; }
}
function saveState(patch) {
  const s = Object.assign(loadState(), patch);
  try { localStorage.setItem(STORE, JSON.stringify(s)); } catch {}
}

// ---------- Helpers ----------
function fmt(sec) {
  if (!isFinite(sec) || sec < 0) sec = 0;
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return m + ':' + String(s).padStart(2, '0');
}

function renderList() {
  listEl.innerHTML = '';
  tracks.forEach((t, i) => {
    const btn = document.createElement('button');
    btn.className = 'track-btn';
    btn.dataset.idx = i;
    btn.innerHTML = `<span class="tn">${t.n}</span><span class="tl">${t.title}</span>`;
    btn.addEventListener('click', () => selectTrack(i, true));
    listEl.appendChild(btn);
  });
}

function highlightList() {
  [...listEl.children].forEach((el, i) => {
    el.classList.toggle('active', i === current);
    el.classList.toggle('playing', i === current && !audio.paused);
  });
}

// ---------- Track selection ----------
function selectTrack(i, autoplay) {
  if (i < 0 || i >= tracks.length) return;
  current = i;
  const t = tracks[i];
  audio.src = BOOK_DIR + '/audio/' + t.file;
  audio.playbackRate = SPEEDS[speedIdx];
  npTitle.textContent = t.title;
  saveState({ lastTrack: t.n });
  highlightList();
  if (autoplay) audio.play().catch(() => {});
}

// ---------- Playback ----------
function togglePlay() {
  if (current < 0) { selectTrack(0, true); return; }
  if (audio.paused) audio.play().catch(() => {}); else audio.pause();
}
function prev() { selectTrack(current <= 0 ? tracks.length - 1 : current - 1, true); }
function next() { selectTrack(current >= tracks.length - 1 ? 0 : current + 1, true); }

function cycleSpeed() {
  speedIdx = (speedIdx + 1) % SPEEDS.length;
  audio.playbackRate = SPEEDS[speedIdx];
  speedBtn.textContent = SPEEDS[speedIdx] + '×';
  saveState({ speedIdx });
}

// ---------- Volume (iOS Safari ignores; works on Mac/desktop) ----------
function applyVolume(pct) {
  const v = Math.min(100, Math.max(0, pct));
  audio.volume = v / 100;
  vol.value = String(v);
  volVal.textContent = v + '%';
}

// ---------- Audio events ----------
audio.addEventListener('loadedmetadata', () => { durTimeEl.textContent = fmt(audio.duration); });
audio.addEventListener('timeupdate', () => {
  if (!isSeeking && isFinite(audio.duration) && audio.duration > 0) {
    seek.value = String(Math.round(audio.currentTime / audio.duration * 1000));
    curTimeEl.textContent = fmt(audio.currentTime);
  }
});
audio.addEventListener('play', () => { playBtn.textContent = '⏸'; highlightList(); });
audio.addEventListener('pause', () => { playBtn.textContent = '▶'; highlightList(); });
audio.addEventListener('ended', () => {
  if (repeatOne) { audio.currentTime = 0; audio.play().catch(() => {}); return; }
  next();
});

// ---------- Seek ----------
seek.addEventListener('input', () => {
  isSeeking = true;
  if (isFinite(audio.duration)) curTimeEl.textContent = fmt(seek.value / 1000 * audio.duration);
});
seek.addEventListener('change', () => {
  if (isFinite(audio.duration)) audio.currentTime = seek.value / 1000 * audio.duration;
  isSeeking = false;
});

// ---------- Wire controls ----------
playBtn.addEventListener('click', togglePlay);
prevBtn.addEventListener('click', prev);
nextBtn.addEventListener('click', next);
repeatBtn.addEventListener('click', () => {
  repeatOne = !repeatOne;
  repeatBtn.classList.toggle('on', repeatOne);
  saveState({ repeatOne });
});
speedBtn.addEventListener('click', cycleSpeed);
vol.addEventListener('input', () => { applyVolume(+vol.value); saveState({ volume: +vol.value }); });

document.addEventListener('keydown', (e) => {
  if (e.code === 'Space') { e.preventDefault(); togglePlay(); }
  else if (e.code === 'ArrowRight') next();
  else if (e.code === 'ArrowLeft') prev();
});

// ---------- Init ----------
async function setBookTitle() {
  try {
    const books = await (await fetch('books.json')).json();
    const b = books.find((x) => x.slug === slug);
    if (b) {
      bookTitleEl.textContent = b.title;
      bookSubEl.textContent = b.subtitle || '';
      document.title = b.title + ' — Listening';
    }
  } catch { /* keep defaults */ }
}

async function init() {
  const s = loadState();
  speedIdx = Number.isInteger(s.speedIdx) ? s.speedIdx : 0;
  repeatOne = !!s.repeatOne;
  speedBtn.textContent = SPEEDS[speedIdx] + '×';
  repeatBtn.classList.toggle('on', repeatOne);
  applyVolume(typeof s.volume === 'number' ? s.volume : 100);

  await setBookTitle();

  try {
    tracks = await (await fetch(BOOK_DIR + '/tracks.json')).json();
  } catch (err) {
    npTitle.textContent = 'Lỗi tải danh sách track';
    return;
  }
  renderList();

  const idx = s.lastTrack != null ? tracks.findIndex((t) => t.n === s.lastTrack) : -1;
  if (idx >= 0) selectTrack(idx, false);
}

// ---------- Service worker ----------
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}

init();
