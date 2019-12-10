// using `cached, then network` pattern as described here:
// https://developers.google.com/web/fundamentals/instant-and-offline/offline-cookbook#cache-then-network

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
  // set some variables
  // console.log('Fetch intercepted for:', event.request.url);
  const reqUrl = new URL (event.request.url);
  // if it's a static resource, don't bother trying to get
  // the remote version. TODO write a better regexp for the pathnames
  if (reqUrl.origin === location.origin ||
      /\.css$/.test(reqUrl.pathname) ||
      /unpkg/.test(reqUrl.origin) ||
      /\.js$/.test(reqUrl.pathname)) {
    // 
    return event.respondWith(  
      caches.match(event.request)
      .then(cachedResponse => {
        console.log('Local, so using cache for: ', event.request.url);
        // console.log(event.request.url, location.origin, "FINDME")
        if (cachedResponse) { // if it's already cached, return cached
          return cachedResponse; 
        }
        // otherwise, fetch & update cache
        return fetch(event.request).then((fetched) => {
          return caches.open(cacheName).then( (cache) => {
            cache.put(event.request,fetched.clone());
            console.log('PUT ' + event.request.url)
            return fetched
          }); 
        });
      })
    );
  }
  console.log (`oops had to fetch ${event.request.url}`)
  // if it's data, first draw map with chaced data, but meanwhile
  // fetch data if possible and 
  event.respondWith(
    caches.match(event.request)
    .then(async cachedResponse => {
      // first, get the cached response (see return statement at end)
      // meanwhile, try to fetch the remote reosurce (this is async fn)
      console.log("INHERE")
      if (cachedResponse) {
        // Get the client.
        const client = await clients.get(event.clientId);
        console.log('inclienttest', client, cachedResponse)
        // Exit early if we don't get the client.
        // Eg, if it closed.
        if (!client) return;

        // get the referrer property of the initial request
        // passed as a paramter to fetches by gaugeParser.js
        // this is very tricky. Unfortuntely the code involed is somewhat invasive
        // the fetch event is triggered in `gaugeParser.js`
        // it can perhaps pass us the *slug* of the river object
        // we will need *both* the *id* of the chart containger
        // *and* the data parsing function of the json received
        // maybe guageParser can pass `${slug}:${gaugeType}` or
        // something like that.  Assuming slug works OK!!!!
        console.log(event.request.referrer);
        const ref = event.request.referrer;

        // fetch, thenn update cached value, then send data back to client as message
        fetch(event.request).then((fetched) => {
          return caches.open(cacheName).then( (cache) => {
            console.log(fetched.clone());
            fetched.clone().headers.forEach( (h,v) => console.log(h,v));
            // TODO: only store & postMessage if status is ok!!!!
            // --> use fetched.ok, I think
            cache.put(event.request,fetched.clone());
            console.log('updated cache for ' + event.request.url)
            fetched.json().then (j => client.postMessage([ref, j]))
          }); 
        });

        // meanwhile, return rached response first
        return cachedResponse

      } else {
        return fetch(event.request).then((fetched) => {
          return caches.open(cacheName).then( (cache) => {
            cache.put(event.request,fetched.clone());
            console.log('added cache entry for ' + event.request.url)
            return fetched
          }); 
        });
      }
    })
  )
 
});
