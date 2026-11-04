import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

function worker(fetchImpl){
 const handlers={},stored=new Map(),added=[];
 const cache={put:async(key,response)=>stored.set(typeof key==='string'?key:key.url,response),addAll:async(urls)=>added.push(...urls)};
 const context={URL,Response,fetch:fetchImpl,caches:{open:async()=>cache,match:async(key)=>stored.get(typeof key==='string'?key:key.url),keys:async()=>[],delete:async()=>true},self:{registration:{scope:'https://zuri.test/'},location:{origin:'https://zuri.test'},clients:{claim:async()=>{}},addEventListener:(name,fn)=>handlers[name]=fn}};
 vm.runInNewContext(readFileSync(new URL('../public/sw.js',import.meta.url),'utf8'),context);
 return {handlers,stored,added};
}
test('first installation precaches the compiled entry assets as well as the shell',async()=>{
 const shell='<script type="module" src="/assets/app.js"></script><link rel="stylesheet" href="/assets/app.css"><script src="https://other.test/track.js"></script>';
 const app=worker(async()=>new Response(shell));let done;
 app.handlers.install({waitUntil:p=>done=p});await done;
 assert.ok(app.stored.has('https://zuri.test/'));
 assert.ok(app.added.includes('https://zuri.test/assets/app.js'));assert.ok(app.added.includes('https://zuri.test/assets/app.css'));
 assert.equal(app.added.some(url=>url.includes('other.test')),false);
});
test('offline navigation returns the cached app without caching API or external requests',async()=>{
 const app=worker(async()=>{throw new Error('Offline');});
 app.stored.set('https://zuri.test/',new Response('ZURI cached shell'));
 let response;
 app.handlers.fetch({request:{url:'https://zuri.test/',method:'GET',mode:'navigate'},respondWith:p=>response=p,waitUntil:()=>{}});
 assert.equal(await(await response).text(),'ZURI cached shell');
 for(const request of [{url:'https://zuri.test/api/viola',method:'GET',mode:'cors'},{url:'https://external.test/photo.js',method:'GET',mode:'cors'},{url:'https://zuri.test/api/viola',method:'POST',mode:'cors'}]){
  let intercepted=false;app.handlers.fetch({request,respondWith:()=>intercepted=true,waitUntil:()=>{}});assert.equal(intercepted,false);
 }
});
