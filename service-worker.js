const CACHE_NAME = "ped-talk-v32";
const BASE = new URL("./", self.registration.scope).pathname;

const FILES_TO_CACHE = [
  BASE,
  `${BASE}index.html`,
  `${BASE}app/`,
  `${BASE}app/index.html`,
  `${BASE}app/app.css`,
  `${BASE}app/app.js`,
  `${BASE}app/manifest.json`,
  `${BASE}episode.html`,
  `${BASE}bible.html`,
  `${BASE}scripture.html`,
  `${BASE}episodes.json`,
  `${BASE}manifest.json`,
  `${BASE}assets/ped-talk-healing-story.jpg`,
  `${BASE}assets/voice-of-healing.jpg`,
  `${BASE}assets/across-every-room-blue.jpg`,
  `${BASE}assets/up-next-template.jpg`,
  `${BASE}assets/gift-of-hope-sky.svg`,
  `${BASE}assets/gift-of-hope-sky.jpg`,
  `${BASE}data/web-bible.json`
];

self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(FILES_TO_CACHE)));
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))))
      .then(() => self.registration.navigationPreload ? self.registration.navigationPreload.enable() : undefined)
  );
  self.clients.claim();
});

self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  const isNavigation = event.request.mode === "navigate" || url.pathname.endsWith("/index.html");
  event.respondWith(
    (isNavigation && event.preloadResponse ? event.preloadResponse : fetch(event.request, isNavigation ? { cache: "no-store" } : undefined))
      .then(response => {
        if (response && response.ok) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
        }
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
