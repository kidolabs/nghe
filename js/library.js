'use strict';

// Library home: render book cards from books.json. Tapping a card opens the
// generic player at player.html?book=<slug>.
const gridEl = document.getElementById('bookGrid');
const PLAYER_STORE_PREFIX = 'nru-player-';

function lastTrackOf(slug) {
  try {
    const s = JSON.parse(localStorage.getItem(PLAYER_STORE_PREFIX + slug));
    return s && s.lastTrack ? s.lastTrack : null;
  } catch { return null; }
}

function card(book) {
  const a = document.createElement('a');
  a.className = 'book-card';
  a.href = 'player.html?book=' + encodeURIComponent(book.slug);
  a.style.setProperty('--book-color', book.color || '#38bdf8');
  const last = lastTrackOf(book.slug);
  a.innerHTML = `
    <div class="book-cover" aria-hidden="true">
      <span class="book-cover-title">${book.title}</span>
    </div>
    <div class="book-meta">
      <span class="book-title">${book.title}</span>
      <span class="book-sub">${book.subtitle || ''}</span>
      <span class="book-tracks">${book.tracks} tracks${last ? ' · đang nghe Track ' + String(last).padStart(2, '0') : ''}</span>
    </div>`;
  return a;
}

async function init() {
  let books = [];
  try {
    books = await (await fetch('books.json')).json();
  } catch {
    gridEl.innerHTML = '<p class="lib-error">Không tải được danh sách sách.</p>';
    return;
  }
  gridEl.innerHTML = '';
  books.forEach((b) => gridEl.appendChild(card(b)));
}

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}

init();
