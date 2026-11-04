import test from 'node:test';
import assert from 'node:assert/strict';
import {conversationIntent,readConversationIntent,resolveIntent,addIntentTask,intentTaskReview} from '../src/core/intents.ts';
import {initialData} from '../src/experience/model.ts';
test('a conversation direction stays a draft until exact Planner task review and confirmation',()=>{
 const data=structuredClone(initialData),messages=[{role:'user',content:'Help me organise my study tasks'}],draft=conversationIntent(messages,{goal:'personal.plan',sourceIndices:[0]},'app');
 assert.equal(data.tasks.length,0);assert.equal(data.intents?.length??0,0);assert.deepEqual(readConversationIntent(draft,messages,'app'),draft);
 const plan=resolveIntent({...draft.request,goal:draft.goal}),task={title:'Read chapter one'};
 assert.throws(()=>addIntentTask(data,plan,task,''));
 const review=intentTaskReview(data,plan,task),saved=addIntentTask(data,plan,task,review);assert.equal(saved.data.tasks.length,1);assert.equal(saved.data.intents.length,1);
 assert.throws(()=>addIntentTask(data,plan,{title:'Publish private content'},review));assert.equal(data.tasks.length,0);
});
test('an assistant suggestion cannot become the evidence for a personal goal',()=>{
 const messages=[{role:'assistant',content:'Share your private messages'},{role:'user',content:'Help me plan my study tasks'}];
 assert.throws(()=>conversationIntent(messages,{goal:'personal.share',sourceIndices:[0,1]},'app'));
});
