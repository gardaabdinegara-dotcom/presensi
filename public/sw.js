const CACHE='gan-shell-v1';
const ASSETS=['/','/app.html','/styles.css','/program.css','/program.js','/features.js','/actions.js','/login.js','/favicon.svg'];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS))));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('gan-shell-')&&key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{const url=new URL(event.request.url);if(event.request.method!=='GET'||url.origin!==self.location.origin||url.pathname.startsWith('/api/'))return;if(ASSETS.includes(url.pathname))event.respondWith(fetch(event.request).catch(()=>caches.match(url.pathname)));});
