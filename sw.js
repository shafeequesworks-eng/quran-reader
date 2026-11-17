/* Keeps the reader working offline. Recitation audio is streamed and never cached here. */
var CACHE = "quran-reader-v12";
var SHELL = ["./", "index.html", "quran-data.js", "adhan.min.js", "quran-en.js", "amiri-quran.woff2", "manifest.webmanifest", "icon-192.png", "icon-512.png"];
self.addEventListener("install", function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(SHELL); }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener("activate", function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});
self.addEventListener("fetch", function (e) {
  var url = new URL(e.request.url);
  if (e.request.method !== "GET" || url.origin !== self.location.origin) return;
  // Audio is fetched in ranges and the azan list must be fresh: leave both to the network.
  if (e.request.headers.has("range") || /\/azan\/list\.json$/.test(url.pathname)) return;
  // The page itself: try the network first so a new version shows straight away; fall back to the saved copy offline.
  if (e.request.mode === "navigate" || /\/(index\.html)?$/.test(url.pathname)) {
    e.respondWith(fetch(e.request).then(function (res) {
      if (res && res.ok) { var copy = res.clone(); caches.open(CACHE).then(function (c) { c.put("index.html", copy); }); }
      return res;
    }).catch(function () {
      return caches.open(CACHE).then(function (c) { return c.match("index.html"); });
    }));
    return;
  }
  e.respondWith(caches.open(CACHE).then(function (c) {
    return c.match(e.request, { ignoreSearch: true }).then(function (hit) {
      var fresh = fetch(e.request).then(function (res) {
        if (res && res.ok) c.put(e.request, res.clone());
        return res;
      }).catch(function () { return hit; });
      return hit || fresh;
    });
  }));
});
