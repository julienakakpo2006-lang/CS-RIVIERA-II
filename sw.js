/* ==========================================================
   SERVICE WORKER PWA — COMPLEXE SCOLAIRE RIVIERA II
   Mode Hors-Ligne Complet & Rapide
   ========================================================== */

const CACHE_NAME = "riviera-scolaire-v8";

const LOCAL_ASSETS = [
  "./",
  "./index.html",
  "./css/style.css",
  "./js/app.js",
  "./assets/logo.jpeg",
  "./assets/icon-192.png",
  "./assets/icon-512.png",
  "./manifest.json"
];

const EXTERNAL_ASSETS = [
  "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2",
  "https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js"
];

// 1. Installation : mise en cache garantie de l'application + librairies
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      console.log("[PWA Riviera II] Mise en cache hors-ligne...");
      await cache.addAll(LOCAL_ASSETS);
      await Promise.all(
        EXTERNAL_ASSETS.map(async (url) => {
          try {
            const response = await fetch(url);
            if (response && (response.ok || response.type === "opaque")) {
              await cache.put(url, response);
            }
          } catch (err) {
            console.warn("[PWA Riviera II] Librairie externe ignorée :", url);
          }
        })
      );
    }).then(() => self.skipWaiting())
  );
});

// 2. Activation et suppression de l'ancien cache
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// 3. Distribution réseau : instantanée hors-ligne et fiable sur mobile
self.addEventListener("fetch", (event) => {
  if (event.request.url.includes("supabase.co") || event.request.method !== "GET") {
    return;
  }

  // Librairies externes (Supabase & Excel) : Cache d'abord pour un démarrage immédiat
  if (event.request.url.includes("cdn.jsdelivr.net")) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached;
        return fetch(event.request).then((res) => {
          if (res && (res.ok || res.type === "opaque")) {
            const clone = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return res;
        });
      })
    );
    return;
  }

  // Fichiers de l'application : Réseau (max 3.5s) puis secours immédiat sur Cache
  event.respondWith(
    new Promise((resolve) => {
      let settled = false;
      const timer = setTimeout(async () => {
        if (settled) return;
        const cached = await caches.match(event.request);
        if (cached) {
          settled = true;
          resolve(cached);
        } else if (event.request.mode === "navigate") {
          const fallback = await caches.match("./index.html");
          if (fallback) {
            settled = true;
            resolve(fallback);
          }
        }
      }, 3500);

      fetch(event.request)
        .then((networkResponse) => {
          clearTimeout(timer);
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseClone));
          }
          if (!settled) {
            settled = true;
            resolve(networkResponse);
          }
        })
        .catch(async () => {
          clearTimeout(timer);
          if (settled) return;
          settled = true;
          const cachedResponse = await caches.match(event.request);
          if (cachedResponse) return resolve(cachedResponse);
          if (event.request.mode === "navigate") {
            const indexFallback = await caches.match("./index.html");
            if (indexFallback) return resolve(indexFallback);
          }
          resolve(new Response("Hors ligne", { status: 503, statusText: "Offline" }));
        });
    })
  );
});