const CACHE = 'biobuzz2026-v55';
// No './' here: there's no index.html at the site root, only biobuzz.html
// directly. GitHub Pages 404s a directory with no index, which fails this
// whole addAll() and leaves the worker stuck "redundant" — Python's dev
// server masks this by auto-generating a directory listing (200 OK), which
// is why this only ever showed up against the real hosted deployment.
const ASSETS = [
  './biobuzz.html', './biobuzz-manifest.json', './Velocity.png', './Delta.png',
  './icon-192.png', './icon-512.png', './apple-touch-icon.png',
  './vendor/qrcode-generator.js', './vendor/jsQR.js',
  './vendor/firebase/firebase-app.js', './vendor/firebase/firebase-auth.js', './vendor/firebase/firebase-firestore.js',
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
  // Firebase Auth/Firestore must never be cached or intercepted — their
  // REST calls are mostly POST (already excluded above), but Firestore's
  // real-time Listen channel streams over a long-lived GET, which this
  // cache-then-network handler would otherwise try to cache.clone() and
  // replay. Everything Firebase talks to lives under *.googleapis.com; no
  // legitimate app asset ever does, so excluding that whole host is safe
  // and simpler than enumerating identitytoolkit/securetoken/firestore/
  // firebaseinstallations individually.
  if (new URL(e.request.url).hostname.endsWith('.googleapis.com')) return;
  // The sign-up notifier (Apps Script web app) — a POST is already
  // excluded above, but Apps Script serves its response via a redirect
  // through script.googleusercontent.com, which this cache-then-network
  // handler would otherwise still try to intercept/cache on that hop.
  {
    const h = new URL(e.request.url).hostname;
    if (h === 'script.google.com' || h.endsWith('.googleusercontent.com')) return;
  }
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
