// Offline-first service worker. App shell is precached; audio is cached
// lazily on first play (cache-first) so the app works offline after listening.
const SHELL = 'nru-shell-v2';
const MEDIA = 'nru-media-v1';
const SHELL_ASSETS = [
  '.',
  'index.html',
  'css/style.css',
  'js/app.js',
  'tracks.json',
  'manifest.webmanifest',
  'icons/icon-192.png',
  'icons/icon-512.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(SHELL).then((c) => c.addAll(SHELL_ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== SHELL && k !== MEDIA).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Audio: cache the FULL file once, then serve range requests from cache.
  // iOS Safari demands 206 Partial Content for <audio> — we build it from the
  // cached full body so playback + seeking work offline.
  if (url.pathname.includes('/audio/')) {
    e.respondWith(serveAudio(req, url));
    return;
  }

  // Shell: cache-first, fall back to network
  e.respondWith(caches.match(req).then((hit) => hit || fetch(req)));
});

// Fetch (once) + cache the full audio file, then answer Range requests with 206.
async function serveAudio(req, url) {
  const cache = await caches.open(MEDIA);
  const cacheKey = url.pathname; // ignore range header for the cache key
  let full = await cache.match(cacheKey);

  if (!full) {
    try {
      // Always fetch the WHOLE file (no Range) so we can slice it later.
      const res = await fetch(url.pathname);
      if (res.ok && res.status === 200) {
        await cache.put(cacheKey, res.clone());
        full = res;
      } else {
        return fetch(req); // give up caching, passthrough
      }
    } catch {
      return fetch(req); // offline + not cached → let it fail naturally
    }
  }

  const range = req.headers.get('range');
  if (!range) return full;

  const buf = await full.arrayBuffer();
  const total = buf.byteLength;
  const m = /bytes=(\d*)-(\d*)/.exec(range);
  let start = m && m[1] ? parseInt(m[1], 10) : 0;
  let end = m && m[2] ? parseInt(m[2], 10) : total - 1;
  if (isNaN(start) || start < 0) start = 0;
  if (isNaN(end) || end >= total) end = total - 1;
  if (start > end) start = 0;

  return new Response(buf.slice(start, end + 1), {
    status: 206,
    statusText: 'Partial Content',
    headers: {
      'Content-Type': 'audio/mpeg',
      'Content-Range': `bytes ${start}-${end}/${total}`,
      'Content-Length': String(end - start + 1),
      'Accept-Ranges': 'bytes'
    }
  });
}
