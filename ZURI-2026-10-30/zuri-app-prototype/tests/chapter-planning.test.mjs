import {test} from 'node:test';
import assert from 'node:assert/strict';
import {initialData,readData} from '../src/experience/model.ts';
import {chapterTask} from '../src/experience/activity.ts';
import {planTask,toggleTask,chapterSummary,removeChapter} from '../src/experience/taskPlanning.ts';
const fresh=()=>({...structuredClone(initialData),chapters:[{id:'c',title:'Wedding',momentIds:['photo'],blocks:[]}]});
test('task dates and responsibility survive saving and drive chapter next action',()=>{
 let d=chapterTask(fresh(),'c','Book venue');const id=d.tasks[0].id;
 d=planTask(d,id,{dueDate:'2026-11-15',assignee:' Partner ',status:'doing'});
 assert.equal(d.tasks[0].assignee,'Partner');assert.equal(d.tasks[0].done,false);assert.equal(chapterSummary(d,'c').next.id,id);
 assert.deepEqual(readData(JSON.stringify(d)),d);
 d={...d,tasks:d.tasks.map(toggleTask)};assert.equal(d.tasks[0].status,'done');assert.equal(chapterSummary(d,'c').done,1);assert.equal(chapterSummary(d,'c').next,undefined);
 assert.equal(toggleTask(d.tasks[0]).status,'todo');
});
test('real dates are validated without inventing scheduling from text',()=>{
 const d=chapterTask(fresh(),'c','Do it on Friday');const id=d.tasks[0].id;
 assert.equal(d.tasks[0].dueDate,undefined);assert.throws(()=>planTask(d,id,{dueDate:'2026-02-30',status:'todo'}),/valid due date/);
 const bad=structuredClone(d);bad.tasks[0].dueDate='tomorrow';assert.throws(()=>readData(JSON.stringify(bad)),/planning/);
});
test('next action prefers the earliest explicit due date and skips completed tasks',()=>{
 let d=chapterTask(chapterTask(fresh(),'c','Undated'),'c','Soon');d=planTask(d,d.tasks[1].id,{dueDate:'2026-10-25',status:'todo'});
 assert.equal(chapterSummary(d,'c').next.text,'Soon');assert.equal(chapterSummary(d,'c').total,2);
});
test('removing a chapter keeps original media and tasks without stale chapter associations',()=>{
 let d=chapterTask(fresh(),'c','Keep task');d.posts=[{id:'photo',text:'Keep memory',image:'https://example.com/photo.jpg',created:'2026-10-21',tags:[{kind:'chapter',id:'c'},{kind:'space',id:'s1'}]}];
 const next=removeChapter(d,'c');assert.equal(next.chapters.length,0);assert.equal(next.tasks[0].text,'Keep task');assert.equal(next.tasks[0].chapterId,undefined);assert.equal(next.posts[0].id,'photo');assert.deepEqual(next.posts[0].tags,[{kind:'space',id:'s1'}]);assert.equal(d.chapters.length,1);
});
