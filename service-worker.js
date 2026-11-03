const CACHE_NAME = "ped-talk-v67";
const BASE = new URL("./", self.registration.scope).pathname;

// Install must never fail because one optional asset is unavailable.
const CORE_FILES = [
  BASE,
  `${BASE}index.html`,
  `${BASE}app/index.html`,
  `${BASE}app/app.css`,
  `${BASE}app/app.js`,
  `${BASE}app/manifest.json`,
  `${BASE}episodes.json`,
  `${BASE}upcoming.json`,
  `${BASE}assets/gift-of-hope-sky.svg`,
  `${BASE}assets/up-next-template.jpg`,
  `${BASE}assets/voice-of-healing.jpg`,
  `${BASE}icons/ped-talk-icon.svg`
];

self.addEventListener("install", event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await Promise.allSettled(CORE_FILES.map(async path => {
      const response = await fetch(path, { cache: "reload" });
      if (response.ok) await cache.put(path, response);
    }));
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  const isNavigation = event.request.mode === "navigate";
  event.respondWith((async () => {
    try {
      const response = await fetch(event.request, isNavigation ? { cache: "no-store" } : undefined);
      if (response && response.ok) {
        const cache = await caches.open(CACHE_NAME);
        await cache.put(event.request, response.clone());
      }
      return response;
    } catch (error) {
      const cached = await caches.match(event.request);
      if (cached) return cached;
      throw error;
    }
  })());
});
