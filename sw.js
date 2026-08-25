/* Skip Retyping service worker.
 * Small same-origin cache for static pages and assets.
 */

const CACHE_NAME = 'fillpro-static-live';
const CORE_ASSETS = [
  '/',
  '/skip-retyping/',
  '/skip-retyping/checkout/',
  '/skip-retyping/download/',
  '/skip-retyping/download/chrome/',
  '/skip-retyping/download/edge/',
  '/skip-retyping/download/firefox/',
  '/skip-retyping/privacy/',
  '/skip-retyping/job-application-autofill/',
  '/skip-retyping/resume-upload-autofill/',
  '/skip-retyping/local-form-autofill/',
  '/skip-retyping/browser-autofill-vs-skip-retyping/',
  '/support/',
  '/contact/',
  '/styles.css',
  '/site.js',
  '/contact.js',
  '/assets/browser-chrome.svg',
  '/assets/browser-edge.svg',
  '/assets/browser-firefox.svg',
  '/assets/skip-retyping-logo.svg',
  '/assets/skip-retyping-logo.png',
  '/assets/skip-retyping-og.png',
  '/assets/skip-retyping-demo-poster.png',
  '/manifest.webmanifest',
  '/llms.txt',
  '/404.html',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(CORE_ASSETS).catch(() => undefined))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;

  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  if (url.origin !== self.location.origin) return;

  if (
    request.mode === 'navigate' ||
    (request.headers.get('accept') || '').includes('text/html')
  ) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches
            .open(CACHE_NAME)
            .then((cache) => cache.put(request, copy))
            .catch(() => undefined);
          return response;
        })
        .catch(() =>
          caches
            .match(request)
            .then((cached) => cached || caches.match('/404.html')),
        ),
    );
    return;
  }

  event.respondWith(
    fetch(request)
      .then((response) => {
        if (
          response &&
          response.status === 200 &&
          response.type === 'basic'
        ) {
          const copy = response.clone();
          caches
            .open(CACHE_NAME)
            .then((cache) => cache.put(request, copy))
            .catch(() => undefined);
        }
        return response;
      })
      .catch(() => caches.match(request)),
  );
});
