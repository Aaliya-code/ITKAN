const CACHE = 'biobuzz2026-v22';
// No './' here: there's no index.html at the site root, only biobuzz.html
// directly. GitHub Pages 404s a directory with no index, which fails this
// whole addAll() and leaves the worker stuck "redundant" — Python's dev
// server masks this by auto-generating a directory listing (200 OK), which
// is why this only ever showed up against the real hosted deployment.
const ASSETS = [
  './biobuzz.html', './biobuzz-manifest.json', './Velocity.png', './Delta.png',
  './icon-192.png', './icon-512.png', './apple-touch-icon.png',
  './vendor/qrcode-generator.js', './vendor/jsQR.js',
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request).then(cached => {
      const network = fetch(e.request).then(res => {
        if (res.ok) caches.open(CACHE).then(c => c.put(e.request, res.clone()));
        return res;
      }).catch(() => cached);
      return cached || network;
    })
  );
});
