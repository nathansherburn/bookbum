importScripts(
  'https://storage.googleapis.com/workbox-cdn/releases/4.2.0/workbox-sw.js'
);

workbox.routing.registerRoute(
  new RegExp('\/$|.*.js|.*.css|.*.png|.*.html|site.webmanifest'),
  new workbox.strategies.CacheFirst()
);

workbox.routing.registerRoute(
  new RegExp('/list-books'),
  new workbox.strategies.NetworkFirst()
);