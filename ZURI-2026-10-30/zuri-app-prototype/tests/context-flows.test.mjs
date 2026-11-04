import {test} from 'node:test';
import assert from 'node:assert/strict';
import {initialData,readData,objectRoute,addMomentsToChapter} from '../src/experience/model.ts';
import {joinPing,pingPeople,canSeeTravel,recordAttendance,contextOptions,auraMedia,chapterTask,contextHeader} from '../src/experience/activity.ts';
import {mergeBackup} from '../src/experience/backup.ts';
import {pings,events} from './fixtures/catalog.ts';
const fresh=()=>structuredClone(initialData);
test('joining a Ping is idempotent and unlocks only its contextual travel',()=>{
 const d=fresh(),p=pings.find(p=>!p.participantIds.includes('me'));const joined=joinPing(d,p.id);
 assert.equal(canSeeTravel(d,`ping:${p.id}`),false);assert.equal(canSeeTravel(joined,`ping:${p.id}`),true);
 assert.equal(pingPeople(joined,p.id).filter(x=>x==='me').length,1);assert.equal(joinPing(joined,p.id),joined);assert.equal(d.pingJoins.length,0);
 const full={...d,customPings:[{...p,id:'full',capacity:1,participantIds:['u1']}]};assert.throws(()=>joinPing(full,'full'),/no places/);assert.throws(()=>joinPing(d,'missing'),/unavailable/);
});
test('attendance validates the catalog ticket and unlocks travel without a fabricated charge',()=>{
 const d=fresh(),e=events.find(e=>e.tickets.length);assert.equal(canSeeTravel(d,`event:${e.id}`),false);
 assert.throws(()=>recordAttendance(d,e.id,'invented ticket'),/valid/);const next=recordAttendance(d,e.id,e.tickets[0].type);
 assert.equal(canSeeTravel(next,`event:${e.id}`),true);assert.equal(recordAttendance(next,e.id,e.tickets[0].type),next);assert.equal('walletBalance' in next,false);
});
test('context search stays empty until typing and Aura includes tagged photo and video posts',()=>{
 const d=fresh();assert.deepEqual(contextOptions(d,'space','  '),[]);assert.ok(contextOptions(d,'space','Walukuba').length);
 d.posts=[{id:'photo',text:'Tagged',created:'today',image:'data:image/png;base64,AA==',tags:[{kind:'society',id:'soc1'}]},{id:'video',text:'Video',created:'today',video:'data:video/mp4;base64,AA==',tags:[{kind:'space',id:'s1'}]},{id:'untagged',text:'Private moment',created:'today',image:'data:image/png;base64,AA=='}];
 assert.deepEqual(auraMedia(d).filter(x=>!x.sample).map(x=>x.id),['photo','video']);assert.equal(auraMedia(d).find(x=>x.id==='video').type,'video');
 const next=addMomentsToChapter(d,'chapter','River',['photo','video']);assert.deepEqual(next.chapters[0].momentIds,['photo','video']);
});
test('chapter tasks are shared Planner objects and context records survive backup merging',()=>{
 const d=fresh();d.chapters=[{id:'chapter',title:'Life lately',momentIds:[]}];const next=chapterTask(d,'chapter',' Make something ');
 assert.equal(next.tasks[0].text,'Make something');assert.equal(next.tasks[0].chapterId,'chapter');assert.equal(next.chapters[0].blocks[0].taskId,next.tasks[0].id);
 next.customTopics=[{id:'mine',societyId:'soc1',title:'Studio',creatorId:'me',participantIds:['me'],replies:0,engaged:0,timestamp:'today',isPinned:false,messages:[],mode:'chat'}];
 next.customChannels=[{id:'channel',name:'Notes',description:'My channel',ownerId:'me',posts:[]}];next.pingJoins=['p1'];next.attendance=['e1'];
 const restored=readData(JSON.stringify(mergeBackup(d,next)));assert.equal(restored.customTopics[0].mode,'chat');assert.equal(restored.customChannels[0].ownerId,'me');assert.deepEqual(restored.pingJoins,['p1']);assert.deepEqual(restored.attendance,['e1']);
 assert.deepEqual(contextHeader(next,objectRoute('topic','mine')),{parent:'Jinja Nights',title:'Studio'});assert.equal(objectRoute('travel','ping:p1').tab,'Pings');
});
test('malformed contextual records are rejected before restoring storage',()=>{
 for(const patch of [{customPings:[{id:'broken'}]},{customChannels:[{id:'x',name:'x',description:'x',ownerId:'me',posts:[{id:'x'}]}]},{posts:[{id:'x',text:'x',created:'today',video:'javascript:bad'}]},{chapters:[{id:'x',title:'x',momentIds:[],blocks:[{id:'x',kind:'unsupported',created:'today'}]}]}])assert.throws(()=>readData(JSON.stringify({...fresh(),...patch})));
});
