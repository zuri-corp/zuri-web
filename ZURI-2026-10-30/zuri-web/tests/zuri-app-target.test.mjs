import './hooks.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,access} from 'node:fs/promises';
const {ZURI_APP_PATH,validZuriAppHash}=await import('../src/lib/navigation/zuri-app.ts');
const {validSpaceAddress,destination}=await import('../src/lib/navigation/routes.ts');
test('web app is a reserved website destination, not a business address',()=>{
 assert.equal(ZURI_APP_PATH,'/app');
 assert.equal(validSpaceAddress('app'),false);
 assert.equal(validSpaceAddress('zuri-app'),false);
 assert.equal(destination('/app'),'corporate');
});
test('deep links retain app tabs and object query context and reject foreign routes',()=>{
 for(const hash of ['#/lounge','#/aura/feed','#/motion/planner?kind=ping&id=sample-1','#/rizz/chats?kind=chat&id=demo'])assert.equal(validZuriAppHash(hash),true);
 for(const hash of ['https://example.com','#/admin','#/lounge#bad',null,'#/aura/feed?'+ 'a'.repeat(1001)])assert.equal(validZuriAppHash(hash),false);
});
test('website includes a built app with portable asset paths and isolated local records',async()=>{
 const root=new URL('../public/zuri-app/',import.meta.url);
 const html=await readFile(new URL('index.html',root),'utf8');
 const scripts=[...html.matchAll(/(?:src|href)="(\/zuri-app\/assets\/[^"]+)"/g)].map(m=>m[1]);
 assert.equal(scripts.length,2);
 for(const asset of scripts)await access(new URL('../public'+asset,import.meta.url));
 const js=await readFile(new URL('../public'+scripts.find(x=>x.endsWith('.js')),import.meta.url),'utf8');
 assert.ok(js.includes('zuri-web-app-v1'));
 assert.ok(!js.includes('serviceWorker.register'));
 assert.ok(js.includes('/zuri-app/brand/'));
 assert.ok(!html.includes('8443'));
});
