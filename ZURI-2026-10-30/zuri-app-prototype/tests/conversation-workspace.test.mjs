import test from 'node:test';
import assert from 'node:assert/strict';
import {createConversationWorkspace,addConversationTurn,replaceConversationContext,readConversationWorkspace,resetConversationTopic,validConversationContext} from '../src/core/conversationEngine.ts';
import {verifyConversationContexts} from '../src/experience/conversationContextAccess.ts';

const space={kind:'space',id:'a16f5310-eaf4-40af-8d11-77e8bc18ed0b',label:'My Space'};
const chapter={kind:'chapter',id:'9204d2f4-609e-4659-9bb6-c75ac51188ad',label:'A chapter'};
test('conversation context contains only supported UUID references, deduplicated and bounded',()=>{
 const workspace=replaceConversationContext(createConversationWorkspace('viola'),[space,space,chapter,{kind:'space',id:'local-example'}, {kind:'person',id:space.id}]);
 assert.deepEqual(workspace.contexts.map(({kind,id})=>({kind,id})),[{kind:space.kind,id:space.id},{kind:chapter.kind,id:chapter.id}]);
 assert.equal(validConversationContext({kind:'space',id:'not-a-uuid'}),false);
 assert.equal(readConversationWorkspace(workspace,'viola').contexts.length,2);
});
test('session restoration preserves recent turns and keeps assistant workspaces separate',()=>{
 const initial=createConversationWorkspace('viola');
 const current=addConversationTurn(addConversationTurn(initial,{role:'user',content:'Help me grow my Space'}),{role:'assistant',content:'Who are your customers?'});
 const restored=readConversationWorkspace(current,'viola');
 assert.deepEqual(restored.turns,current.turns);
 assert.equal(readConversationWorkspace(current,'robert').turns.length,0);
 const reset=resetConversationTopic(replaceConversationContext(restored,[space]));
 assert.deepEqual(reset.contexts,[]);assert.deepEqual(reset.turns,[]);assert.notEqual(reset.id,current.id);
});
test('selected private and public context is checked before sending to the model',async()=>{
 const calls=[];
 await verifyConversationContexts([space,chapter],async(action,payload)=>{calls.push({action,payload});return action==='objects.summary'?{entity:{kind:'space'}}:{kind:'chapter'};});
 assert.deepEqual(calls.map(call=>call.action),['objects.summary','records.get']);
 await assert.rejects(verifyConversationContexts([space],async()=>{throw Error('forbidden');}),/Could not verify My Space/);
 await assert.rejects(verifyConversationContexts([space],async()=>({entity:{kind:'society'}})),/Could not verify/);
 await assert.rejects(verifyConversationContexts([space],async()=>({entity:{kind:'space'},readable:false})),/Could not verify/);
 await assert.rejects(verifyConversationContexts([space],async()=>({entity:{kind:'space',status:'archived'},readable:true})),/Could not verify/);
});
