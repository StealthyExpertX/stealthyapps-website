/* FillPro service worker.
 * Small same-origin cache for static pages and assets.
 */

const VERSION = 'fillpro-launch-v42-2026-07-03';
const CORE_ASSETS = [
  '/',
  '/fillpro/',
  '/fillpro/download/',
  '/fillpro/download/chrome/',
  '/fillpro/download/edge/',
  '/fillpro/download/firefox/',
  '/fillpro/privacy/',
  '/fillpro/job-application-autofill/',
  '/fillpro/resume-upload-autofill/',
  '/fillpro/local-form-autofill/',
  '/fillpro/browser-autofill-vs-fillpro/',
  '/support/',
  '/contact/',
  '/styles.css?v=fillpro-launch-v42',
  '/site.js?v=fillpro-launch-v42',
  '/fillpro-hero-scene.js?v=fillpro-launch-v42',
  '/vendor/three.module.min.js',
  '/vendor/three.core.min.js',
  '/contact.js?v=fillpro-launch-v42',
  '/assets/fillpro-logo.svg',
  '/assets/fillpro-logo.png',
  '/assets/fillpro-og.png',
  '/assets/fillpro-demo-poster.png',
  '/manifest.webmanifest',
  '/llms.txt',
  '/404.html',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(VERSION)
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
            .filter((key) => key !== VERSION)
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
            .open(VERSION)
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
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request)
        .then((response) => {
          if (
            response &&
            response.status === 200 &&
            response.type === 'basic'
          ) {
            const copy = response.clone();
            caches
              .open(VERSION)
              .then((cache) => cache.put(request, copy))
              .catch(() => undefined);
          }
          return response;
        })
        .catch(() => cached);
    }),
  );
});
