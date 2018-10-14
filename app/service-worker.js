// variable with the name for the cache
let staticCacheName = 'pages-cache-v1';

// An array with all the assets we want to cache in first visit
var urlsToCache = [
  'index.html',
  'styles/styles.css',
  'js/main.js',
  'js/restaurant_info.js',
  'js/dbhelper.js',
  'js/idb.js',
];

/**
 * When we first visit the site the service worker is installed
   and this is when we cache the assets
*/
self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(staticCacheName)
    .then(function(cache) {
      return cache.addAll(urlsToCache);
    })
    .then(self.skipWaiting())
  );
});
/**
 * Returns the request from cache if it exists
  otherwise it's fetched from the network and is stored in cache
  */
self.addEventListener('fetch', event => {
  const saveUrl = event.request.url.split(/[?#]/)[0];

  if (saveUrl.startsWith(self.location.origin)) {
    event.respondWith(
      caches.match(saveUrl).then(cachedResponse => {
        if (cachedResponse) {
          return cachedResponse;
        }

        return caches.open(staticCacheName).then(cache => {
          return fetch(event.request).then(response => {
            return cache.put(saveUrl, response.clone()).then(() => {
              return response;
            });
          });
        });
      })
    );
  }
});

/**
 * When new service worker is activated, if there is a new cache
 the old one is deleted
  */
self.addEventListener('activate', function(event) {
  console.log('Activating new service worker...');

  var cacheWhitelist = [staticCacheName];

  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames.map(function(cacheName) {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            console.log('Delete CACHE');
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});