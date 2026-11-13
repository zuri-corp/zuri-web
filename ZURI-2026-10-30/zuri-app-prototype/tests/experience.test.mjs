import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {worlds,home,parseRoute,routeHash,readData,initialData,runFocus} from '../src/experience/model.ts';
import {mergeBackup,migrateLegacy} from '../src/experience/backup.ts';
import {resolveApiBase,websiteLoginUrl,getViolaStatus,askViola,readViolaEvents,readViolaPings,readViolaPingDraft} from '../src/experience/services.ts';
import {content} from './fixtures/catalog.ts';

test('the standalone app mounts V2 directly and has no website dependency',()=>{
 const entry=readFileSync(new URL('../src/App.tsx',import.meta.url),'utf8');
 assert.match(entry,/experience\/Experience/);assert.doesNotMatch(entry,/from\s+['"][^'"]*(?:next\/|zuri-web|LegacyApp)/);
 assert.deepEqual(Object.keys(worlds),['lounge','aura','motion','rizz','lore']);
 assert.deepEqual(worlds.lounge.tabs,[]);
 assert.deepEqual(worlds.aura.tabs,['Feed','Spaces','Societies','Find']);
 assert.deepEqual(worlds.motion.tabs,['Planner','Events','Pings']);
 assert.deepEqual(worlds.rizz.tabs,['Feed','Create','Channels','Chats']);
 assert.deepEqual(worlds.lore.tabs,['Moments','Discover','Chapters','Profile']);
});
test('object links always resolve to their single canonical destination',()=>{
 assert.deepEqual(parseRoute('#/aura/spaces?kind=chat&id=u2'),{world:'rizz',tab:'Chats',kind:'chat',id:'u2'});
 assert.deepEqual(parseRoute('#/rizz/feed?kind=ping&id=p1'),{world:'motion',tab:'Pings',kind:'ping',id:'p1'});
 const chapter={world:'lore',tab:'Chapters',kind:'chapter',id:'nile & days'};
 assert.deepEqual(parseRoute(routeHash(chapter)),chapter);
 for(const bad of ['#/toString','#/unknown','#/__proto__'])assert.deepEqual(parseRoute(bad),home);
 assert.deepEqual(parseRoute('#/lore/profile?kind=toString&id=x'),{world:'lore',tab:'Profile'});
});
test('established app links carry people and objects into the V2 app',()=>{
 assert.deepEqual(parseRoute('#/motion/event_detail?eventId=e1'),{world:'motion',tab:'Events',kind:'event',id:'e1'});
 assert.deepEqual(parseRoute('#/aura/topic_chat?topicId=t1'),{world:'aura',tab:'Societies',kind:'topic',id:'t1'});
 assert.equal(parseRoute('#/rizz/music').tab,'Channels');
 assert.equal(parseRoute('#/rizz/reels').tab,'Create');
 assert.equal(parseRoute('#/motion/home').tab,'Planner');
 assert.equal(parseRoute('#/xp/discover').world,'lore');
});
test('backup merging preserves local edits and adds missing records once',()=>{
 const local=structuredClone(initialData),backup=structuredClone(initialData);
 local.name='Local identity';local.tasks=[{id:'existing',text:'Edited locally',date:'2026-10-17',done:true}];
 backup.name='Other identity';backup.tasks=[{id:'existing',text:'Old text',date:'2026-10-16',done:false},{id:'new',text:'New task',date:'2026-10-17',done:false}];
 backup.posts=[{id:'photo',text:'A river photograph',created:'2026-10-17',image:'data:image/png;base64,AA=='}];
 backup.chapters=[{id:'chapter',title:'Nile',momentIds:['photo']}];
 const result=mergeBackup(local,backup);
 assert.equal(result.name,'Local identity');assert.equal(result.tasks.length,2);assert.equal(result.tasks[0].text,'Edited locally');
 assert.equal(result.posts[0].id,'photo');assert.deepEqual(result.chapters[0].momentIds,['photo']);
 assert.deepEqual(mergeBackup(result,backup),result);assert.equal(local.tasks.length,1);
});
test('legacy migration brings authored content forward without promoting fixtures or spending demo funds',()=>{
 const legacy={version:1,contentItems:[...content,{id:'my-photo',creatorId:'me',caption:'My first app moment',mediaType:'photo',media:'data:image/png;base64,AA==',createdAt:'2026-10-17',taggedSpaceIds:['s1']}],joinedPings:['p1'],purchasedTickets:['e1'],societyMemberships:{soc1:'joined',soc2:'requested'},walletBalance:340000};
 const result=migrateLegacy(JSON.stringify(legacy));
 assert.deepEqual(result.posts.map(p=>p.id),['my-photo']);assert.equal(result.posts[0].spaceId,'s1');
 assert.deepEqual(result.plan,['p1','e1']);assert.deepEqual(result.joined,['soc1']);assert.equal('walletBalance' in result,false);
 assert.deepEqual(migrateLegacy(null),initialData);assert.throws(()=>migrateLegacy('{bad'));
});
test('invalid imported records cannot corrupt the active workspace',()=>{
 for(const changes of [{name:''},{tasks:[{id:'x',text:1}]},{messages:[{id:'x',text:'Hi',personId:null,created:'today'}]},{posts:[{id:'x',text:'bad',created:'today',image:'javascript:alert(1)'}]},{chapters:[{id:'x',title:'Unsafe',momentIds:[7]}]},{posts:[{id:'x',text:'one',created:'today'},{id:'x',text:'two',created:'today'}]}])assert.throws(()=>readData(JSON.stringify({...initialData,...changes})));
 assert.deepEqual(readData(JSON.stringify(initialData)),initialData);
});
test('daily focus remains idempotent and preserves completed work',()=>{
 const once=runFocus(structuredClone(initialData),'2026-10-17');once.tasks[0].done=true;
 const twice=runFocus(once,'2026-10-17');assert.equal(twice.tasks.length,1);assert.equal(twice.tasks[0].done,true);
 assert.equal(runFocus(twice,'2026-10-18').tasks.length,2);
});
test('API configuration accepts only deliberate public service addresses',async()=>{
 for(const value of [undefined,'','javascript:alert(1)','//evil.test','http://remote.test','https://user:secret@remote.test','https://example.test/api?token=secret'])assert.equal(resolveApiBase(value),null);
 assert.equal(resolveApiBase('/api/'),'/api');assert.equal(resolveApiBase('https://api.example.test/api/'),'https://api.example.test/api');assert.equal(resolveApiBase('http://127.0.0.1:3000/api'),'http://127.0.0.1:3000/api');
 assert.equal(websiteLoginUrl('/app#/lounge','http://127.0.0.1:3015'),'http://127.0.0.1:3015/pamoja/login?next=%2Fapp%23%2Flounge');
 assert.equal(websiteLoginUrl('/app','https://remote.example.test'),'/pamoja/login?next=%2Fapp');
 assert.deepEqual(await getViolaStatus(),{enabled:false});await assert.rejects(()=>askViola([{role:'user',content:'Hello'}]),/not connected/);
});
test('Viola validates canonical event and Ping references and safe links before rendering',()=>{
 const event={reference:{source:'motion_imported_events',id:'quicket:event-42'},source:'Motion',title:'Verified Concert',description:'Verified listing.',canonicalUrl:'https://tickets.example.test/event',startsAt:'2026-11-11T09:00:00.000Z',endsAt:null,status:'upcoming',visibility:'public',location:{venue:'Acacia Mall',city:'Kampala',country:'Uganda'}};
 const unsafe=readViolaEvents([{...event,canonicalUrl:'javascript:alert(1)'},{...event,reference:{...event.reference,id:'invalid id'}}]);
 assert.equal(unsafe.length,1);assert.equal(unsafe[0].canonicalUrl,null);
 const ping={reference:{source:'zuri_entities',id:'550e8400-e29b-41d4-a716-446655440010'},title:'Study Ping',description:'Find a study partner.',startsAt:'2026-11-11T09:00:00.000Z',endsAt:null,status:'upcoming',visibility:'private',joinPolicy:'approval',capacity:3,location:{venue:'Library',city:'Kampala',country:'Uganda'},category:'Study'};
 assert.equal(readViolaPings([ping,{...ping,reference:{source:'zuri_entities',id:'bad'}}]).length,1);
 const draft={title:'FIFA at Acacia Mall',description:'Play FIFA tomorrow.',startsAt:'2026-11-11T09:00:00.000Z',timeZone:'Africa/Kampala',location:'Acacia Mall',participantCount:3,category:'Sport',visibility:null,joinPolicy:null,linkedEvent:null};
 assert.equal(readViolaPingDraft(draft).participantCount,3);
 assert.equal(readViolaPingDraft({...draft,timeZone:'UTC'}),null);
});
test('installable shell excludes external resources and API responses',()=>{
 const manifest=JSON.parse(readFileSync(new URL('../public/manifest.webmanifest',import.meta.url),'utf8'));
 assert.equal(manifest.name,'ZURI');assert.equal(manifest.start_url,'./');assert.equal(manifest.display,'standalone');
 const worker=readFileSync(new URL('../public/sw.js',import.meta.url),'utf8');assert.match(worker,/url\.origin!==self\.location\.origin/);assert.match(worker,/api/);
});
