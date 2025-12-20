/* eslint-disable no-restricted-globals */

const CACHE_NAME = "laundrypro-cache-v1";
const urlsToCache = ["/", "/login", "/images/lolafeslaundry-logo.png", "/images/lolafeslaundry-logo.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(urlsToCache))
  );
});

self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => response || fetch(event.request))
  );
});

export function register() {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker
      .register("/service-worker.js")
      .then((registration) => console.log("SW registered"))
      .catch(console.error);
  }
}