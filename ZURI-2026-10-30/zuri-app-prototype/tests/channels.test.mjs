import {test} from 'node:test';
import assert from 'node:assert/strict';
import {initialData,readData} from '../src/experience/model.ts';
import {addCollection,saveChannelPost,editChannel} from '../src/experience/channelModel.ts';
import {mergeBackup} from '../src/experience/backup.ts';
const fresh=()=>({...structuredClone(initialData),customChannels:[{id:'mine',ownerId:'me',name:'Songs & stories',description:'Studio life',posts:[]}]});
test('older channels remain readable and organised channels survive reload and backup',()=>{
 const old=fresh();assert.deepEqual(readData(JSON.stringify(old)),old);
 let d=addCollection(old,'mine','Releases');const sectionId=d.customChannels[0].sections[0].id;
 d=saveChannelPost(d,'mine',{id:'first',title:'First single',text:'What I am building',created:'2026-10-20T10:00:00Z',kind:'progress',sectionId,pinned:true,tags:[{kind:'ping',id:'ping1'}]});
 assert.deepEqual(readData(JSON.stringify(d)),d);assert.deepEqual(mergeBackup(structuredClone(initialData),d).customChannels,d.customChannels);assert.equal(old.customChannels[0].posts.length,0);
});
test('editing preserves one update and permits pinning and moving to a collection',()=>{
 let d=saveChannelPost(fresh(),'mine',{id:'p',text:'Before',created:'2026-10-20'});d=addCollection(d,'mine','Studio');
 d=saveChannelPost(d,'mine',{...d.customChannels[0].posts[0],text:'After',pinned:true,sectionId:d.customChannels[0].sections[0].id});
 assert.equal(d.customChannels[0].posts.length,1);assert.equal(d.customChannels[0].posts[0].text,'After');assert.equal(d.customChannels[0].posts[0].pinned,true);
});
test('collection names, references and owner boundaries are enforced locally',()=>{
 const d=addCollection(fresh(),'mine','Studio');assert.throws(()=>addCollection(d,'mine',' studio '),/already exists/);
 assert.throws(()=>saveChannelPost(d,'mine',{id:'p',text:'Hi',created:'2026-10-20',sectionId:'missing'}),/Invalid/);
 assert.throws(()=>editChannel(d,'sample',c=>c),/own channel/);
 assert.throws(()=>saveChannelPost(editChannel(d,'mine',c=>({...c,archived:true})),'mine',{id:'p',text:'Hi',created:'2026-10-20'}),/Restore/);
});
test('malformed organised channel backup is rejected before rendering',()=>{
 const d=fresh();d.customChannels[0].sections={bad:true};assert.throws(()=>readData(JSON.stringify(d)),/collections/);
 const bad=fresh();bad.customChannels[0].posts=[{id:'x',text:'Hi',created:'2026-10-20',pinned:'yes'}];assert.throws(()=>readData(JSON.stringify(bad)),/Invalid organised/);
});
