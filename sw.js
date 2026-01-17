const CACHE_NAME = "telur-barokah-v1";
// Daftar file yang mau disimpan di memori HP
// Pastikan nama file di sini SAMA PERSIS dengan nama file kamu (huruf besar/kecil ngaruh)
const urlsToCache = [
  "/",
  "/index.html",
  "/style.css",
  "/script.js",
  "/manifest.json",
  "/icon.png" 
];

// 1. Install Service Worker & Simpan File
self.addEventListener("install", function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      console.log("Menyimpan file ke cache...");
      return cache.addAll(urlsToCache);
    })
  );
});

// 2. Ambil File dari Cache saat Offline
self.addEventListener("fetch", function(event) {
  event.respondWith(
    caches.match(event.request).then(function(response) {
      // Kalau ada di cache (offline), pakai itu. Kalau gak ada, ambil dari internet.
      return response || fetch(event.request);
    })
  );
});

// 3. Hapus Cache Lama kalau ada Update Baru
self.addEventListener("activate", function(event) {
  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames.map(function(cacheName) {
          if (cacheName !== CACHE_NAME) {
            console.log("Menghapus cache lama...");
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});