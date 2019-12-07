const cacheName = 'v1';
const precacheResources = [
  '/',
  'chartist-line-wo.html',
  'vendor/chartist/chartist.min.css'
];

self.addEventListener('install', event => {
  console.log('Service worker install event!');
  event.waitUntil(
    caches.open(cacheName)
      .then(cache => {
        return cache.addAll(precacheResources);
      })
  );
});

self.addEventListener('activate', event => {
  console.log('Service worker activate event!');
});

self.addEventListener('fetch', event => {
  console.log('Fetch intercepted for:', event.request.url);
  event.respondWith(caches.match(event.request)
                    .then(cachedResponse => {
                      if (cachedResponse) {
                        return cachedResponse;
                      }
                      return fetch(event.request).then((fetched) => {
                        return caches.open(cacheName).then( (cache) => {
                          cache.put(event.request,fetched.clone());
                          return fetched
                        }); 
                      });
                    })
                   );
});

// self.addEventListener('fetch', (event) => {
//   console.log('Fetch intercepted for: ' , event.request.url)
//   event.respondWith(
//     caches.match(event.request).then((resp) => {
//       // if it's a local resource, or some css or js, then give the cache priority
//       if (requestURL.origin == location.origin ) {
//         // Handle article URLs
//         return resp || fetch(event.request).then((response) => {
//           return caches.open(cacheName).then((cache) => {
//             cache.put(event.request, response.clone());
//             return response;
//           });  
//         });
       
//       }
//       // if it's anything else -- that is, live data -- then
//       // handle differently. RIght now, we ware *not* actually reading from the cache (!)
//       // instead, we always try to get from the 
//       event.respondWith(
//         caches.open(cacheName).then(function(cache) {
//           return fetch(event.request).then(function(response) {
//             cache.put(event.request, response.clone());
//             return response;
//           });
//         })
//       );


//     })
//   );
// });

// const precacheResources = [
//   '/',
//   'index.html',
//   'chartist-line-wo.html',
//   'styles/main.css',
//   'vendor/chartist/chartist.min.css',
//   'vendor/chartist-plugin-tooltips-updated/chartist-plugin-tooltip.css'
//   // 'vendor/chartist-plugin-threshold/chartist-plugin-threshold.css',
//   // 'vendor/chartist-plugin-tooltips-updated/chartist-plugin-tooltip.css',
//   // 'chartist-line-wo.css',
//   // 'vendor/gauge-parsers/gaugeParser.js',
//   // 'vendor/markdown-it/markdown-it.min.js',
//   // 'vendor/markdown-it-attrs/markdown-it-attrs.browser.js',
//   // 'vendor/chartist/chartist.js',
//   // 'vendor/chartist-segmented-line/segmented-line.js',
//   // 'vendor/chartist-plugin-tooltips-updated/chartist-plugin-tooltip.js',
//   // 'vendor/moment/moment-with-locales.min.js',
//   // 'chartist-line-river.js'
// ];


// self.addEventListener('fetch', event => {
//   console.log('Fetch intercepted for:', event.request.url);
//   event.respondWith(caches.match(event.request)
//                     .then(cachedResponse => {
//                       if (cachedResponse) {
//                         return cachedResponse;
//                       }
//                       return fetch(event.request);
//                     })
//                    );
// });
