/* Service worker: el armazón se guarda al instalar; los audios, cuando se piden.
   Así la app abre sin datos y cada pista escuchada queda disponible offline. */
const SHELL = "shell-v1";
const AUDIO = "audio-f6da764023";
const BASICOS = ["./", "index.html", "manifest.webmanifest", "icono-192.png", "icono-512.png"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(SHELL).then((c) => c.addAll(BASICOS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((ks) => Promise.all(ks.filter((k) => k !== SHELL && k !== AUDIO).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;

  // los MP3 pueden pedirse por rango: se guarda la respuesta entera y se sirve desde el cache
  if (url.pathname.includes("/audio/")) {
    e.respondWith(
      caches.open(AUDIO).then(async (c) => {
        const guardado = await c.match(url.pathname.split("/").slice(-2).join("/"), { ignoreSearch: true })
          || await c.match(req, { ignoreSearch: true });
        if (guardado) return guardado;
        const red = await fetch(req);
        if (red.ok && red.status === 200) c.put(req, red.clone());
        return red;
      }).catch(() => fetch(req))
    );
    return;
  }

  // el resto: red primero para tomar actualizaciones, cache como respaldo
  e.respondWith(
    fetch(req)
      .then((r) => {
        if (r.ok) caches.open(SHELL).then((c) => c.put(req, r.clone()));
        return r;
      })
      .catch(() => caches.match(req).then((r) => r || caches.match("index.html")))
  );
});
