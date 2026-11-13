import test from 'node:test';import assert from 'node:assert/strict';import {createElement as h} from 'react';import {renderToStaticMarkup as render} from 'react-dom/server';import {register} from 'node:module';
register('./component-loader.mjs',import.meta.url);
const {ObjectScreen}=await import('../src/experience/ObjectWorkspace.tsx');
const {ObjectFacts}=await import('../src/experience/ObjectLayout.tsx');
const {EventDetails}=await import('../src/experience/EventPresentation.tsx');
const {default:ChapterWorkspace}=await import('../src/experience/ChapterWorkspace.tsx');
const actions={onOpen(){},onPlanner(){},onRefresh(){}};
const entity={id:'test-id',kind:'space',owner_id:'owner',title:'My actual place',description:'Useful services',status:'published',visibility:'public',join_policy:'open',details:{},updated_at:'2026-11-06T10:00:00Z'};
test('object landing pages expose type capabilities and keep management forms out of the main view',()=>{
 for(const [kind,tabs] of [['space',['Offerings','Media','Events']],['society',['Topics','Chats','Members','Plans']],['ping',['Chat','Media','People']],['event',['Media','People']],['channel',['Updates','Media','People']]]){
  const html=render(h(ObjectScreen,{...actions,summary:{entity:{...entity,kind},owner:true,joined:true,readable:true,can_post:true,member_count:1}}));
  for(const tab of tabs)assert.ok(html.includes(tab),kind+' needs '+tab);
  assert.match(html,/oc-hero/);assert.match(html,/Manage/);assert.doesNotMatch(html,/<textarea|Name or handle|Invite people/);
 }
});
test('empty facts render no outlined shell and private invitations reveal no activity or management tabs',()=>{
 assert.equal(render(h(ObjectFacts,{facts:[{label:'When',value:null},{label:'Where',value:''}]})),'');
 const html=render(h(ObjectScreen,{...actions,summary:{entity:{...entity,kind:'society',visibility:'private',invitation_pending:true,description:'You have been invited.'},owner:false,joined:false,readable:false,can_post:false,member_count:null}}));
 assert.match(html,/Accept invitation/);assert.doesNotMatch(html,/Manage|What is on offer|Share an update|Life here/);
});
test('external events carry an honest personal attendance action alongside organiser registration',()=>{
 const html=render(h(EventDetails,{event:{id:'external-id',source:'quicket',title:'An event',description:'Details',location:{},category:'music',starts_at:null,next_occurrence_at:null,registration_url:'https://example.com/tickets'},onSignIn(){},onPlanner(){}}));
 assert.match(html,/Plan to attend/);assert.match(html,/View tickets on Quicket/);assert.doesNotMatch(html,/Confirmed|Ticket purchased/);
});
test('chapter opens a private multi-part workspace with notes behind a plus action',()=>{
 const html=render(h(ChapterWorkspace,{record:{id:'chapter',kind:'chapter',content:{title:'My story',text:'A useful chapter',entries:[{id:'entry',text:'A saved note',created_at:'2026-11-06'}]}},busy:false,onEdit(){},async onSave(){}}));
 for(const part of ['Timeline','Tasks','Media','Links','A saved note','Add a note'])assert.ok(html.includes(part));assert.doesNotMatch(html,/<textarea|<input/);
});
