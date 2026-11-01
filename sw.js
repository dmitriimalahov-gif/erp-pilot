/* В кэше только статическая оболочка. Конфигурация и рабочие данные туда не попадают. */
const CACHE = "erp-pilot-entry-v1";
const SHELL = ["./", "./index.html", "./styles.css", "./app.mjs", "./strings.mjs", "./url-validation.mjs", "./manifest.webmanifest", "./icons/pilot.svg", "./icons/pilot-180.png", "./icons/pilot-192.png", "./icons/pilot-512.png"];
const urls = new Set(SHELL.map((path) => new URL(path, self.registration.scope).href));
self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key.startsWith("erp-pilot-entry-") && key !== CACHE).map((key) => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET" || !urls.has(request.url)) return;
  event.respondWith(fetch(request).then(async (response) => {
    if (response.ok && response.type === "basic") {
      const cache = await caches.open(CACHE);
      await cache.put(request, response.clone());
    }
    return response;
  }).catch(async () => {
    const saved = await caches.match(request);
    if (saved) return saved;
    return new Response("Offline", {status: 503, headers: {"Content-Type": "text/plain"}});
  }));
});
