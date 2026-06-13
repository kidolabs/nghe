'use strict';

// ---------- Elements ----------
const audio = document.getElementById('audio');
const listEl = document.getElementById('trackList');
const npTitle = document.getElementById('npTitle');
const curTimeEl = document.getElementById('curTime');
const durTimeEl = document.getElementById('durTime');
const seek = document.getElementById('seek');
const markA = document.getElementById('markA');
const markB = document.getElementById('markB');
const playBtn = document.getElementById('playBtn');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const repeatBtn = document.getElementById('repeatBtn');
const speedBtn = document.getElementById('speedBtn');
const setABtn = document.getElementById('setA');
const setBBtn = document.getElementById('setB');
const abToggle = document.getElementById('abToggle');
const abClear = document.getElementById('abClear');

const SPEEDS = [1, 1.25, 1.5, 0.75];
const STORE = 'nru-starter-listening';

// ---------- State ----------
let tracks = [];
let current = -1;          // index into tracks
let isSeeking = false;
let repeatOne = false;
let speedIdx = 0;
let ab = { a: null, b: null, on: false }; // seconds; on = loop active

// ---------- Persistence ----------
function loadState() {
  try { return JSON.parse(localStorage.getItem(STORE)) || {}; }
  catch { return {}; }
}
function saveState(patch) {
  const s = Object.assign(loadState(), patch);
  try { localStorage.setItem(STORE, JSON.stringify(s)); } catch {}
}
// Per-track A-B points: keyed by track number
function abKey(n) { return 'ab_' + n; }

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
  audio.src = t.file;
  audio.playbackRate = SPEEDS[speedIdx];
  npTitle.textContent = t.title;
  loadAbForTrack(t.n);
  saveState({ lastTrack: t.n });
  highlightList();
  if (autoplay) audio.play().catch(() => {});
}

function loadAbForTrack(n) {
  const saved = loadState()[abKey(n)];
  if (saved && typeof saved.a === 'number') {
    ab = { a: saved.a, b: saved.b ?? null, on: false };
  } else {
    ab = { a: null, b: null, on: false };
  }
  renderAb();
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

// ---------- A-B repeat ----------
function renderAb() {
  setABtn.textContent = 'A: ' + (ab.a != null ? fmt(ab.a) : '--:--');
  setBBtn.textContent = 'B: ' + (ab.b != null ? fmt(ab.b) : '--:--');
  setABtn.classList.toggle('set-a', ab.a != null);
  setBBtn.classList.toggle('set-b', ab.b != null);
  const ready = ab.a != null && ab.b != null;
  abToggle.disabled = !ready;
  abClear.disabled = ab.a == null && ab.b == null;
  abToggle.textContent = 'Lặp: ' + (ab.on ? 'bật' : 'tắt');
  abToggle.classList.toggle('on', ab.on);
  positionMarkers();
}

function positionMarkers() {
  const dur = audio.duration;
  if (!isFinite(dur) || dur <= 0) { markA.hidden = true; markB.hidden = true; return; }
  const w = seek.clientWidth;
  if (ab.a != null) { markA.hidden = false; markA.style.left = (ab.a / dur * w) + 'px'; }
  else markA.hidden = true;
  if (ab.b != null) { markB.hidden = false; markB.style.left = (ab.b / dur * w) + 'px'; }
  else markB.hidden = true;
}

function persistAb() {
  if (current < 0) return;
  const n = tracks[current].n;
  if (ab.a == null && ab.b == null) saveState({ [abKey(n)]: null });
  else saveState({ [abKey(n)]: { a: ab.a, b: ab.b } });
}

function setPointA() {
  ab.a = audio.currentTime;
  if (ab.b != null && ab.b <= ab.a) ab.b = null; // keep order valid
  enableAbIfReady();
  renderAb(); persistAb();
}
function setPointB() {
  ab.b = audio.currentTime;
  if (ab.a != null && ab.a >= ab.b) ab.a = null;
  enableAbIfReady();
  renderAb(); persistAb();
}
function enableAbIfReady() {
  if (ab.a != null && ab.b != null) ab.on = true;
}
function toggleAb() {
  if (ab.a == null || ab.b == null) return;
  ab.on = !ab.on;
  renderAb();
}
function clearAb() {
  ab = { a: null, b: null, on: false };
  renderAb(); persistAb();
}

// ---------- Audio events ----------
audio.addEventListener('loadedmetadata', () => {
  durTimeEl.textContent = fmt(audio.duration);
  positionMarkers();
});
audio.addEventListener('timeupdate', () => {
  // A-B loop: jump back to A when reaching B
  if (ab.on && ab.a != null && ab.b != null && audio.currentTime >= ab.b) {
    audio.currentTime = ab.a;
  }
  if (!isSeeking && isFinite(audio.duration) && audio.duration > 0) {
    seek.value = String(Math.round(audio.currentTime / audio.duration * 1000));
    curTimeEl.textContent = fmt(audio.currentTime);
  }
});
audio.addEventListener('play', () => { playBtn.textContent = '⏸'; highlightList(); });
audio.addEventListener('pause', () => { playBtn.textContent = '▶'; highlightList(); });
audio.addEventListener('ended', () => {
  if (ab.on && ab.a != null) { audio.currentTime = ab.a; audio.play().catch(() => {}); return; }
  if (repeatOne) { audio.currentTime = 0; audio.play().catch(() => {}); return; }
  next();
});

// ---------- Seek interactions ----------
function seekStart() { isSeeking = true; }
function seekMove() {
  if (isFinite(audio.duration)) curTimeEl.textContent = fmt(seek.value / 1000 * audio.duration);
}
function seekEnd() {
  if (isFinite(audio.duration)) audio.currentTime = seek.value / 1000 * audio.duration;
  isSeeking = false;
}
seek.addEventListener('input', () => { seekStart(); seekMove(); });
seek.addEventListener('change', seekEnd);

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
setABtn.addEventListener('click', setPointA);
setBBtn.addEventListener('click', setPointB);
abToggle.addEventListener('click', toggleAb);
abClear.addEventListener('click', clearAb);
window.addEventListener('resize', positionMarkers);

document.addEventListener('keydown', (e) => {
  if (e.code === 'Space') { e.preventDefault(); togglePlay(); }
  else if (e.code === 'ArrowRight') next();
  else if (e.code === 'ArrowLeft') prev();
});

// ---------- Init ----------
async function init() {
  const s = loadState();
  speedIdx = Number.isInteger(s.speedIdx) ? s.speedIdx : 0;
  repeatOne = !!s.repeatOne;
  speedBtn.textContent = SPEEDS[speedIdx] + '×';
  repeatBtn.classList.toggle('on', repeatOne);

  try {
    tracks = await (await fetch('tracks.json')).json();
  } catch (err) {
    npTitle.textContent = 'Lỗi tải danh sách track';
    return;
  }
  renderList();

  // restore last track (no autoplay — browser blocks autoplay without gesture)
  const lastN = s.lastTrack;
  const idx = lastN != null ? tracks.findIndex(t => t.n === lastN) : -1;
  if (idx >= 0) selectTrack(idx, false);
}

// ---------- Service worker (offline) ----------
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  });
}

init();
