const SERVICE_WORKER_VERSION = 1;
const PRECACHE = `john-bampton-v${SERVICE_WORKER_VERSION}`;
const HOUR_SECONDS = 60 * 60 * 1000;
const DAY_SECONDS = 24 * HOUR_SECONDS;
// const WEEK_SECONDS = 7 * DAY_SECONDS;
const PRECACHE_URLS = [
  'index.html',
  './',
  'styles.css',
  'bootstrap/css/bootstrap.css',
  'bootstrap/css/bootstrap.min.css',
  'bootstrap/css/bootstrap-grid.css',
  'bootstrap/css/bootstrap-grid.min.css',
  'bootstrap/css/bootstrap-reboot.css',
  'bootstrap/css/bootstrap-reboot.min.css',
  'script.js',
  'bootstrap/js/bootstrap.min.js',
  'bootstrap/js/jquery.min.js',
  'bootstrap/js/popper.min.js',
  'manifest.json',
];
const CACHE_EXPIRATION = {'users.json': 3 * DAY_SECONDS};

function getCache() {
  return caches.open(PRECACHE);
}
function cacheUrls(cache) {
  return cache.addAll(PRECACHE_URLS);
}
function skipWait() {
  return self.skipWaiting();
}
function claimClients() {
  return self.clients.claim();
}
function filterOldCaches(cacheNames) {
  return cacheNames.filter((name) => name !== PRECACHE);
}
function deleteCaches(names) {
  return Promise.all(names.map((name) => caches.delete(name)));
}

function isExpired(response, maxAgeMs) {
  if (!response) return true;
  const dateHeader = response.headers.get('date');
  if (!dateHeader) return true;
  return Date.now() - new Date(dateHeader).getTime() > maxAgeMs;
}

function updateCache(cache, request, response) {
  const headers = new Headers(response.headers);
  headers.set('date', new Date().toUTCString());
  const respWithDate = new Response(response.clone().body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
  cache.put(request, respWithDate.clone());
  return respWithDate;
}

function handleExpiringFile(event, filename, maxAgeMs) {
  event.respondWith(
    getCache().then((cache) =>
      cache.match(event.request).then((cached) => {
        if (!cached || isExpired(cached, maxAgeMs)) {
          return fetch(event.request).then((resp) =>
            updateCache(cache, event.request, resp),
          );
        }
        return cached;
      }),
    ),
  );
}

function handleDefaultFetch(event) {
  event.respondWith(
    caches
      .match(event.request)
      .then((cached) => cached || fetch(event.request)),
  );
}

self.addEventListener('install', (event) => {
  event.waitUntil(getCache().then(cacheUrls).then(skipWait));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(filterOldCaches).then(deleteCaches).then(claimClients),
  );
});

self.addEventListener('fetch', (event) => {
  const url = event.request.url;
  if (!url.startsWith(self.location.origin)) return null;
  for (const [filename, maxAgeMs] of Object.entries(CACHE_EXPIRATION)) {
    if (url.endsWith(filename))
      return handleExpiringFile(event, filename, maxAgeMs);
  }
  return handleDefaultFetch(event);
});
