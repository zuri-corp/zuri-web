/* Cache the application shell only. Never cache API responses or third-party resources. */
const CACHE='zuri-app-shell-v2-20261017';
const local=(path)=>new URL(path,self.registration.scope).href;
self.addEventListener('install',event=>{
  event.waitUntil((async()=>{
    const cache=await caches.open(CACHE),response=await fetch(local('./'),{cache:'reload'});
    if(!response.ok)throw new Error('The app shell could not be cached.');
    const html=await response.clone().text();
    const assets=[...html.matchAll(/(?:src|href)=["']([^"']+\.(?:js|css))["']/g)].map(match=>new URL(match[1],local('./'))).filter(url=>url.origin===self.location.origin).map(url=>url.href);
    await cache.put(local('./'),response);
    await cache.addAll([local('icon.svg'),local('manifest.webmanifest'),...assets]);
  })());
});
self.addEventListener('activate',event=>{
  event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('zuri-app-shell-')&&key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim()));
});
self.addEventListener('fetch',event=>{
  const request=event.request,url=new URL(request.url);
  if(request.method!=='GET'||url.origin!==self.location.origin||/\/api(?:\/|$)/.test(url.pathname))return;
  if(request.mode==='navigate'){
    event.respondWith(fetch(request).then(response=>{if(response.ok){const copy=response.clone();event.waitUntil(caches.open(CACHE).then(cache=>cache.put(local('./'),copy)));}return response;}).catch(()=>caches.match(local('./'))));
    return;
  }
  if(!/\.(?:js|css|svg|webmanifest|woff2?)(?:$)/.test(url.pathname))return;
  event.respondWith(fetch(request).then(response=>{if(response.ok){const copy=response.clone();event.waitUntil(caches.open(CACHE).then(cache=>cache.put(request,copy)));}return response;}).catch(()=>caches.match(request).then(response=>response||Response.error())));
});
