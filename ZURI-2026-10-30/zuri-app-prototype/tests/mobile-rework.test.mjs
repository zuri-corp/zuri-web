import {test} from 'node:test';
import assert from 'node:assert/strict';
import {initialData,readData,addMomentsToChapter,parseRoute} from '../src/experience/model.ts';
import {mergeBackup} from '../src/experience/backup.ts';

test('home upgrades preserve a person’s planner while adding Ping and Lore widgets once',()=>{
 const old={...structuredClone(initialData),widgets:['planner'],layoutVersion:undefined,tasks:[{id:'mine',text:'Keep this plan',done:true,date:'2026-10-19'}]};
 const restored=readData(JSON.stringify(old));assert.deepEqual(restored.widgets,['planner','friends','pings','lore']);assert.equal(restored.tasks[0].done,true);
 restored.widgets=['planner'];assert.deepEqual(readData(JSON.stringify(restored)).widgets,['planner']);
});
test('the Lore widget collects only the person’s real photo posts and does not duplicate them',()=>{
 const original=structuredClone(initialData);original.posts=[{id:'mine',text:'Nile',created:'2026-10-19',image:'data:image/png;base64,AA=='},{id:'text',text:'A thought',created:'2026-10-19'}];
 const first=addMomentsToChapter(original,'chapter','Nile days',['mine','mine','missing','text']);assert.deepEqual(first.chapters[0].momentIds,['mine']);assert.equal(original.chapters.length,0);
 const again=addMomentsToChapter(first,'chapter','Ignored replacement',['mine']);assert.deepEqual(again.chapters[0],first.chapters[0]);assert.deepEqual(again.posts,original.posts);
 assert.throws(()=>addMomentsToChapter(original,'empty','Empty',['missing','text']),/photo or video moments/);
});
test('Society discussions stay connected to Aura and round-trip through local backups',()=>{
 assert.deepEqual(parseRoute('#/rizz/chats?kind=topic&id=t1'),{world:'aura',tab:'Societies',kind:'topic',id:'t1'});
 const source=structuredClone(initialData);source.discussions=[{id:'reply',topicId:'t1',text:'A local reply',author:'Alex',created:'2026-10-19'}];
 const restored=readData(JSON.stringify(source));assert.deepEqual(restored.discussions,source.discussions);
 assert.deepEqual(mergeBackup(structuredClone(initialData),restored).discussions,source.discussions);
 assert.throws(()=>readData(JSON.stringify({...source,discussions:[{id:'bad',topicId:5}]})));
});
