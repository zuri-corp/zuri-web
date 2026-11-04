import './hooks.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {NextRequest} from 'next/server.js';
const {worlds,parseRoute,routeHash,readData,initialData,runFocus}=await import('../src/lib/experience/model.ts');

test('V2 destinations retain the agreed information architecture',()=>{
 assert.deepEqual(worlds.lounge.tabs,[]);
 assert.deepEqual(worlds.aura.tabs,['Home','Spaces','Societies','Find']);
 assert.deepEqual(worlds.motion.tabs,['Planner','Events','Trips','Pings']);
 assert.deepEqual(worlds.rizz.tabs,['Feed','Create','Channels','Chats']);
 assert.deepEqual(worlds.lore.tabs,['Moments','Discover','Chapters','Profile']);
});
test('deep links round-trip shared objects and reject invalid destinations',()=>{
 for(const [world,tab,kind,id]of [['aura','Spaces','space','s1'],['motion','Pings','ping','p1'],['rizz','Chats','chat','u2'],['lore','Chapters','chapter','custom & one']]){
  const route={world,tab,kind,id};assert.deepEqual(parseRoute(routeHash(route)),route);
 }
 for(const hash of ['#/unknown/home','#/toString','#/__proto__'])assert.equal(parseRoute(hash).world,'lounge');
 assert.equal(parseRoute('#/rizz/reels').tab,'Feed');
 assert.deepEqual(parseRoute('#/aura/spaces?kind=script&id=foo'),{world:'aura',tab:'Spaces'});
});
test('local data restores safely without silently overwriting corrupt data',()=>{
 assert.deepEqual(readData(JSON.stringify(initialData)),initialData);
 assert.notEqual(readData(null),initialData);
 assert.throws(()=>readData('{broken'));
 assert.throws(()=>readData(JSON.stringify({...initialData,tasks:[{id:'x',text:42}]})));
 assert.throws(()=>readData(JSON.stringify({...initialData,messages:[{id:'x',text:'hello',personId:null,created:'today'}]})));
 assert.throws(()=>readData(JSON.stringify({...initialData,chapters:[{id:'x',title:'Hello',momentIds:[3]}]})));
});
test('daily focus is idempotent and preserves completed tasks',()=>{
 const once=runFocus(structuredClone(initialData),'2026-10-16');once.tasks[0].done=true;
 const twice=runFocus(once,'2026-10-16');assert.equal(twice.tasks.length,1);assert.equal(twice.tasks[0].done,true);
 const tomorrow=runFocus(twice,'2026-10-17');assert.equal(tomorrow.tasks.length,2);assert.equal(tomorrow.automations[0].lastRun,'2026-10-17');
});
test('Viola retains its own guidance while using the shared gateway',async()=>{
 const {violaInstructions}=await import('../src/lib/experience/viola.ts');
 assert.match(violaInstructions,/You are Viola/);assert.match(violaInstructions,/You have no tools/);
 const route=await import('../src/app/api/viola/route.ts');
 const previous=process.env.ZURI_AI_ENABLED;delete process.env.ZURI_AI_ENABLED;
 try{assert.equal((await(await route.GET()).json()).enabled,false);
  assert.equal((await route.POST(new Request('http://localhost/api/viola',{method:'POST',headers:{origin:'https://wrong.test'}}))).status,403);
 }finally{if(previous===undefined)delete process.env.ZURI_AI_ENABLED;else process.env.ZURI_AI_ENABLED=previous;}
});
