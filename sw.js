let newStaticCacheName = 'mws-restaurant-v9';
let oldStaticCacheName = 'mws-restaurant-v8';
let allCaches = [newStaticCacheName,oldStaticCacheName];


self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(newStaticCacheName).then(function(cache) {
      return cache.addAll([
        'css/styles.css',
        'js/dbhelper.js',
        'js/restaurant_info.js',
        'js/main.js',
        'js/idb.js',
        'manifest.json',
        'img/1.jpg',
        'img/2.jpg',
        'img/3.jpg',
        'img/4.jpg',
        'img/5.jpg',
        'img/6.jpg',
        'img/7.jpg',
        'img/8.jpg',
        'img/9.jpg',
        'img/10.jpg',
        'https://raw.githubusercontent.com/necolas/normalize.css/master/normalize.css'
      ]);
    })
  );
});


self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all( 
        cacheNames.filter(function(cacheName) {
          return cacheName.startsWith(oldStaticCacheName) &&
                 !allCaches.includes(cacheName);
        }).map(function(cacheName) {
          return caches.delete(cacheName);
        })
      );
    })
  );
});

addEventListener('fetch', function(event) {
  event.respondWith(
    caches.match(event.request)
      .then(function(response) {
        if (response) {
          return response;
        } else {
          return fetch(event.request)
            .then(function(res) {
              return caches.open(newStaticCacheName)
                .then(function(cache) {
                  cache.put(event.request.url, res.clone());
                  return res;
                })
            })
            .catch(function(err) { 
              return caches.open(newStaticCacheName)
                .then(function(cache) {
                  return cache.match('/offline.html');
                });
            });
        }
      })
  );
});  
