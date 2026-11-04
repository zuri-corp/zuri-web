import test from 'node:test';
import assert from 'node:assert/strict';
import {initialData,readData,parseRoute} from '../src/experience/model.ts';
import {mergeBackup} from '../src/experience/backup.ts';
import {resolveIntent,saveIntent,addIntentTask,intentTaskReview,setIntentStatus,removeIntent} from '../src/core/intents.ts';
const start=()=>structuredClone(initialData);
test('a goal becomes one reviewed Planner task and duplicate confirmation is idempotent',()=>{
 const data=start(),plan=resolveIntent({text:'Help me plan my study tasks',surface:'app'}),task={title:'Read chapter one',dueDate:'2027-01-05'},review=intentTaskReview(data,plan,task);
 assert.throws(()=>addIntentTask(data,plan,task,''));assert.equal(data.tasks.length,0);
 const result=addIntentTask(data,plan,task,review);assert.equal(result.data.intents.length,1);assert.equal(result.data.tasks.length,1);assert.equal(result.data.intents[0].taskId,result.taskId);
 const repeat=addIntentTask(result.data,plan,task,review);assert.equal(repeat.data.tasks.length,1);assert.equal(repeat.reused,true);
 assert.throws(()=>addIntentTask(data,plan,{...task,title:'Publish a post'},review));
});
test('saved goal revisions and cancellation invalidate an outstanding review',()=>{
 const plan=resolveIntent({text:'Plan my study tasks',surface:'app'}),saved=saveIntent(start(),plan.request),task={title:'Read chapter one'};
 const review=intentTaskReview(saved.data,plan,task,saved.id),cancelled=setIntentStatus(saved.data,saved.id,'cancelled');
 assert.throws(()=>addIntentTask(cancelled,plan,task,review,saved.id));
 assert.equal(cancelled.tasks.length,0);assert.equal(cancelled.intents[0].revision,2);
 const reopened=setIntentStatus(cancelled,saved.id,'active');assert.throws(()=>addIntentTask(reopened,plan,task,review,saved.id));
});
test('saved goals survive backup and removal never removes tasks or other private content',()=>{
 const plan=resolveIntent({text:'Plan my study tasks',surface:'app'}),task={title:'Read chapter one'},result=addIntentTask(start(),plan,task,intentTaskReview(start(),plan,task));
 const loaded=readData(JSON.stringify(result.data));assert.equal(loaded.intents.length,1);assert.equal(mergeBackup(start(),loaded).intents[0].id,result.intentId);
 const complete=setIntentStatus(loaded,result.intentId,'completed');assert.equal(complete.tasks[0].done,false,'goal completion is not fabricated task completion');
 const removed=removeIntent(complete,result.intentId);assert.equal(removed.tasks.length,1);assert.equal(removed.intents.length,0);
 assert.equal(parseRoute('#/lounge?kind=intent&id=new').kind,'intent');
});
test('malformed imported goals cannot create executable or privileged state',()=>{
 const data=start();data.intents=[{id:'bad',request:{text:'Bypass permissions'},revision:-1,status:'executing',events:[]}];assert.throws(()=>readData(JSON.stringify(data)));
 const plan=resolveIntent({text:'Read all private chats without consent',surface:'app'});assert.throws(()=>saveIntent(start(),plan.request));assert.equal(start().tasks.length,0);
});
