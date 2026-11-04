import {test} from 'node:test';
import assert from 'node:assert/strict';
import {initialData,readData,objectRoute} from '../src/experience/model.ts';
import {emptyPamoja} from '../src/experience/pamojaModel.ts';
import {placeMoments,enquiryContext,saveEnquiry,allOffers,matchesSpace} from '../src/experience/spaceExperience.ts';
const fresh=()=>({...structuredClone(initialData),pamoja:emptyPamoja()});
test('hidden and blocked sample activity cannot reappear in a Space',()=>{
 let d=fresh();const post=placeMoments(d,'s1').find(p=>p.sample);assert.ok(post);
 d.pamoja.hidden=[post.id];assert.ok(!placeMoments(d,'s1').some(p=>p.id===post.id));
 d=fresh();d.pamoja.blocked=[post.creatorId];assert.ok(!placeMoments(d,'s1').some(p=>p.creatorId===post.creatorId));
});
test('new tagged posts appear immediately while hidden and chapter-only media stay excluded',()=>{
 const d=fresh();d.posts=[{id:'local',text:'My Space update',created:'2026-10-21',tags:[{kind:'space',id:'s4'}]},{id:'private',text:'My chapter',created:'2026-10-21',chapterOnly:true,tags:[{kind:'space',id:'s4'}]}];
 assert.equal(placeMoments(d,'s4')[0].id,'local');assert.ok(!placeMoments(d,'s4').some(p=>p.id==='private'));
 d.pamoja.hidden=['local'];assert.ok(!placeMoments(d,'s4').some(p=>p.id==='local'));
});
test('offering enquiry keeps its Space, service, date and request rather than routing to a person',()=>{
 const d=fresh(),offer=allOffers(d).find(o=>o.name==='Riverside Wedding Venue');assert.ok(offer);
 const key='offer:'+offer.id,context=enquiryContext(d,key);assert.equal(context.space.id,offer.spaceId);assert.equal(context.offer.id,offer.id);
 const next=saveEnquiry(d,key,{message:'Is this venue available?',when:'2027-06-12',guests:'80'});const saved=JSON.parse(next.pamoja.notes.at(-1).text);
 assert.equal(saved.spaceId,offer.spaceId);assert.equal(saved.offerId,offer.id);assert.equal(saved.when,'2027-06-12');assert.equal(saved.guests,'80');assert.equal(next.messages.length,0);assert.deepEqual(readData(JSON.stringify(next)),next);
 assert.equal(objectRoute('enquiry',key).world,'aura');
});
test('unavailable enquiry context and empty enquiries fail without inventing a recipient',()=>{
 assert.equal(enquiryContext(fresh(),'offer:missing'),undefined);
 assert.throws(()=>saveEnquiry(fresh(),'offer:missing',{message:'Hello',when:'',guests:''}),/unavailable/);
 assert.throws(()=>saveEnquiry(fresh(),'space:s4',{message:' ',when:'',guests:''}),/Write/);
});

test('Space search discovers wedding offerings rather than requiring the merchant name',()=>{assert.equal(matchesSpace(fresh(),'s4','wedding'),true);assert.equal(matchesSpace(fresh(),'s4','unrelated nonexistent service'),false);});
