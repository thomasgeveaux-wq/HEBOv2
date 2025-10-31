const CACHE = 'hebo-cache-v1';
const ASSETS = [
  './', './index.html', './style.css', './app.js',
  './manifest.json'
];
self.addEventListener('install', e=>{
  e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)));
});
self.addEventListener('fetch', e=>{
  e.respondWith(
    caches.match(e.request).then(r=> r || fetch(e.request).catch(()=> caches.match('./index.html')))
  );
});
