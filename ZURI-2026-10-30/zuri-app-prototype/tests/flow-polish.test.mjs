import test from 'node:test';import assert from 'node:assert/strict';import {createElement as h} from 'react';import {renderToStaticMarkup as render} from 'react-dom/server';
import {register} from 'node:module';
register('./component-loader.mjs',import.meta.url);
const {EventCard,EventDetails}=await import('../src/experience/EventPresentation.tsx');
const {default:CloudLore,chapterEntries}=await import('../src/experience/CloudLore.tsx');
const {default:CloudProfileView}=await import('../src/experience/CloudProfileView.tsx');
const {objectRoute,parseRoute,routeHash}=await import('../src/experience/model.ts');
const {creationAction}=await import('../src/experience/screenPresentation.ts');
const {textSizes,savedTextSize}=await import('../src/experience/TextSizeControl.tsx');
const event={id:'quicket:123',source:'quicket',title:'A real event',description:'The long story belongs in the details page.',category:'business-tech',starts_at:'2026-12-01T12:00:00Z',ends_at:'2026-12-01T16:00:00Z',next_occurrence_at:'2026-12-01T12:00:00Z',location:{venue:'Serena',city:'Kampala'},image:{original_url:'https://example.com/poster.jpg'},registration_url:'https://example.com/tickets'};
test('compact cards carry the essentials; descriptions and outbound booking belong in event details',()=>{
 const card=render(h(EventCard,{event,onOpen(){}}));assert.match(card,/A real event/);assert.match(card,/Serena, Kampala/);assert.match(card,/Business &amp; Tech/);assert.match(card,/Quicket/);assert.match(card,/<img/);assert.doesNotMatch(card,/long story|example.com\/tickets/);
 const details=render(h(EventDetails,{event}));assert.match(details,/long story belongs/);assert.match(details,/example.com\/tickets/);
});
test('event details and new chapter routes survive copied links and reloads',()=>{
 for(const [kind,id] of [['external-event','x:123'],['new-chapter','new'],['chapter','private-id']])assert.deepEqual(parseRoute(routeHash(objectRoute(kind,id))),objectRoute(kind,id));
});
const record={id:'chapter-id',kind:'chapter',owner_id:'owner',revision:2,created_at:'2026-11-05T10:00:00Z',updated_at:'2026-11-05T11:00:00Z',content:{title:'Building ZURI',text:'A private workspace',entries:[{id:'n1',text:'A saved note',created_at:'2026-11-05T11:00:00Z'}]}};
const props={records:[record],busy:false,onOpen(){},async onSave(){},async onRun(work){await work();},onBack(){},async onAttachment(){}};
test('Lore collections start with plus actions, and chapter detail renders the workspace rather than another list',()=>{
 const list=render(h(CloudLore,{...props,route:{world:'lore',tab:'Chapters'}}));assert.equal(creationAction({world:'lore',tab:'Chapters'}).kind,'new-chapter');assert.match(list,/Open chapter: Building ZURI/);assert.doesNotMatch(list,/<textarea|<input/);
 const detail=render(h(CloudLore,{...props,route:{world:'lore',tab:'Chapters',kind:'chapter',id:'chapter-id'}}));assert.match(detail,/A saved note/);assert.match(detail,/Add a note/);assert.match(detail,/Tasks/);assert.match(detail,/Media/);assert.match(detail,/Links/);assert.doesNotMatch(detail,/<textarea/);
 const moments=render(h(CloudLore,{...props,records:[],route:{world:'lore',tab:'Moments'}}));assert.equal(creationAction({world:'lore',tab:'Moments'}).kind,'new-moment');assert.doesNotMatch(moments,/<textarea|<input/);
 assert.equal(chapterEntries([null,{},record.content.entries[0]]).length,1);
});
test('profile opens as a profile, with explicit editing and safe public links',()=>{
 const view=render(h(CloudProfileView,{profile:{display_name:'Dawdy Jabulani',bio:'Founder at ZURI',handle:'dawdy',location:'Kampala',avatar_media_id:null,is_public:true,receive_invites:false,links:[{title:'Unsafe',url:'javascript:alert(1)'},{title:'Portfolio',url:'https://example.com'}]},photoUrl:'',onEdit(){}}));
 assert.match(view,/Dawdy Jabulani/);assert.match(view,/Edit profile/);assert.match(view,/Portfolio/);assert.doesNotMatch(view,/<input|<textarea|javascript:/);
 assert.deepEqual(Object.values(textSizes),[1,1.15,1.3]);assert.equal(savedTextSize(),'standard');
});
