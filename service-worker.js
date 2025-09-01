// Cache with version bump
const CACHE_NAME = "fairy-pixel-v1";
const ASSETS = [
  "./",
  "./index.html",
  "./styles.css?v=1",
  "./app.js?v=1",
  "./manifest.json",
  "./icons/bg.png"
];

self.addEventListener("install", (e)=>{
  e.waitUntil(caches.open(CACHE_NAME).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting()));
});
self.addEventListener("activate", (e)=>{
  e.waitUntil(
    caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE_NAME).map(k=>caches.delete(k))))
    .then(()=>self.clients.claim())
  );
});
self.addEventListener("fetch", (e)=>{
  if (e.request.mode === "navigate"){
    e.respondWith(fetch(e.request).catch(()=>caches.match("./index.html")));
    return;
  }
  e.respondWith(caches.match(e.request).then(res=>res||fetch(e.request)));
});
