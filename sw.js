/* ==========================================================
   SERVICE WORKER PWA — COMPLEXE SCOLAIRE RIVIERA II
   ========================================================== */

const CACHE_NAME = "riviera-scolaire-v5";

const ASSETS_TO_CACHE = [
  "./",
  "./index.html",
  "./css/style.css",
  "./js/app.js",
  "./assets/logo.jpeg",
  "./manifest.json",
  "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2",
  "https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js"
];

// 1. Installation du Service Worker
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("[PWA Riviera II] Mise en cache des fichiers...");
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(() => self.skipWaiting())
  );
});

// 2. Activation et suppression de l'ancien cache bloquant
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log("[PWA Riviera II] Purge ancien cache :", key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// 3. Distribution réseau : Ne JAMAIS bloquer les requêtes Supabase ou non-GET
self.addEventListener("fetch", (event) => {
  // Laisser le navigateur envoyer directement les données à Supabase
  if (event.request.url.includes("supabase.co") || event.request.method !== "GET") {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        if (networkResponse.status === 200) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) return cachedResponse;
          if (event.request.mode === "navigate") return caches.match("./index.html");
        });
      })
  );
});