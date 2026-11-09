// Set Programım – internetsiz çalışma.
// Uygulama dosyaları ve PDF okuyucu telefona kaydedilir. Sayfa önce internetten
// istenir (güncellemeler gelsin), internet yoksa kayıtlı kopya açılır.
const CACHE = "setprog-v2026.11.09-3";
const CORE = ["./", "index.html", "manifest.webmanifest", "apple-touch-icon.png", "icon-512.png",
  "lib/pdf.min.mjs", "lib/pdf.worker.min.mjs", "lib/pdf.worker.safe.mjs", "lib/streams-polyfill.js"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(CORE)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys()
    .then((ks) => Promise.all(ks.filter((k) => k.startsWith("setprog-") && k !== CACHE).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  // never cache the update check
  if (url.pathname.endsWith("/version.json")) return;
  // fonts: cache after first use
  if (/fonts\.(googleapis|gstatic)\.com$/.test(url.hostname)) {
    e.respondWith(caches.open(CACHE).then(async (c) => {
      const hit = await c.match(req); if (hit) return hit;
      try { const r = await fetch(req); c.put(req, r.clone()); return r; } catch (_) { return Response.error(); }
    }));
    return;
  }
  if (url.origin !== location.origin) return;
  // the page itself: network first so updates arrive, cached copy when offline
  if (req.mode === "navigate" || url.pathname.endsWith("/") || url.pathname.endsWith("/index.html")) {
    e.respondWith(fetch(req).then((r) => {
      if (r.ok) { const cp = r.clone(); caches.open(CACHE).then((c) => c.put("index.html", cp)); }
      return r;
    }).catch(async () => (await caches.match("index.html")) || (await caches.match("./")) || Response.error()));
    return;
  }
  // everything else of ours (pdf.js, icons): cache first
  e.respondWith(caches.match(req, { ignoreSearch: true }).then((hit) => hit || fetch(req).then((r) => {
    if (r.ok) { const cp = r.clone(); caches.open(CACHE).then((c) => c.put(req, cp)); }
    return r;
  })));
});
