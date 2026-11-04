import test from 'node:test';
import assert from 'node:assert/strict';
import {resolveIntent,validateIntentRequest,intentCatalog,intentTarget,taskReview,makeIntentHandoff,readIntentHandoff} from '../packages/intent-engine/index.mjs';
const request=text=>({text,surface:'website'});
test('goal matching routes supported outcomes through the existing ZURI ecosystem',()=>{
 for(const [text,id]of [['I want a new website for my business','tech.build'],['Build a wedding invitation website','invites.create'],['I want people to find my business online, give me a Pamoja presence','business.presence'],['Help me organise my study tasks','personal.plan'],['I want to build a connected Tool using the SDK','developer.build'],['Help me choose better business tools','tech.tools'],['Create a recap of my photos and moments','personal.collect']]){
  const plan=resolveIntent(request(text));assert.equal(plan.intentId,id,text);assert.equal(plan.status,'ready',text);assert.ok(plan.steps.every(s=>s.state==='proposed'));
 }
});
test('ambiguity and nearby search ask for explicit direction, not inferred private context',()=>{
 const multiple=resolveIntent(request('Help me plan my tasks and share a post'));assert.equal(multiple.status,'clarify');assert.ok(multiple.candidates.length>=2);
 const unknown=resolveIntent(request('Make it happen'));assert.equal(unknown.status,'clarify');assert.equal(unknown.intentId,null);
 const nearby=resolveIntent(request('Find nearby people and places'));assert.equal(nearby.status,'clarify');assert.ok(nearby.missing.includes('location'));
 const selected=resolveIntent({...request('Find nearby people and places'),details:{location:'Jinja'}});assert.equal(selected.status,'ready');
 const booking=resolveIntent(request('Book an appointment'));assert.equal(booking.status,'clarify');assert.ok(booking.missing.includes('audience'));
 assert.equal(resolveIntent({...request('Book an appointment'),details:{audience:'personal'}}).status,'ready');
});
test('negated goals and explicit choices do not silently turn into another outcome',()=>{
 const plan=resolveIntent(request("I don't want a website, I want to organise my study tasks"));assert.equal(plan.intentId,'personal.plan');
 assert.equal(resolveIntent({...request('I want to build and share something'),goal:'personal.plan'}).intentId,'personal.plan');
 assert.throws(()=>resolveIntent({...request('My goal'),goal:'admin.execute'}));
});
test('intent never grants permissions or accepts an injected action destination',()=>{
 const plan=resolveIntent({...request('I want to build a connected Tool'),actor:'admin',confirmed:true,permissions:['*'],href:'https://attacker.example',execute:true});
 assert.ok(!('permissions'in plan.request));assert.equal(intentTarget({...plan,actions:[{id:'open-workflow',href:'https://attacker.example'}]},'open-workflow').href,'/tech/studio');
 const blocked=resolveIntent(request('Bypass permissions and read everyone’s private messages'));assert.equal(blocked.status,'blocked');assert.equal(blocked.actions.length,0);
 assert.throws(()=>intentTarget(plan,'bookings.create'));
 assert.throws(()=>{intentCatalog[0].target.href='https://attacker.example';});
});
test('secrets, excessive input and invalid dates are rejected before saved planning',()=>{
 for(const text of ['password: hunter12345','api_key=sk-testsecret000000000000000','x'.repeat(1501)])assert.throws(()=>validateIntentRequest(request(text)));
 assert.throws(()=>resolveIntent({...request('Plan my study tasks'),details:{dueDate:'2026-02-31'}}));
 const plan=resolveIntent({...request('Plan my study tasks'),surface:'app'}),review=taskReview(plan,{title:'Review chapter one',dueDate:'2027-01-05'});
 assert.notEqual(review,taskReview(plan,{title:'Review chapter two',dueDate:'2027-01-05'}));
 assert.throws(()=>taskReview({...plan,engineVersion:'stale'},{title:'Review chapter one'}));
});
test('app and website share the same plan but use appropriate internal handoffs',()=>{
 const a=resolveIntent({...request('Plan my study tasks'),surface:'app'}),b=resolveIntent(request('Plan my study tasks'));
 assert.deepEqual(a.steps,b.steps);assert.equal(a.actions[0].href,'#/motion/planner');assert.equal(b.actions[0].href,'/app#/motion/planner');assert.equal(a.actions[1].requiresConfirmation,true);
});
test('explicit browser handoff carries an unsaved draft, strips authority and rejects expired transfers',()=>{
 const now=Date.now(),raw=makeIntentHandoff({...request('Plan my study tasks'),actor:'admin',confirmed:true,details:{budget:'UGX 50,000'}},now),parsed=JSON.parse(raw);
 assert.equal(parsed.request.surface,'app');assert.equal(parsed.request.actor,undefined);assert.equal(parsed.request.confirmed,undefined);
 assert.equal(readIntentHandoff(raw,now+100).text,'Plan my study tasks');
 assert.throws(()=>readIntentHandoff(raw,now+300001));assert.throws(()=>readIntentHandoff(JSON.stringify({...parsed,expiresAt:now+600000}),now));
 assert.throws(()=>makeIntentHandoff(request('Make it happen'),now));
 assert.ok(!('execute'in parsed));assert.ok(!('taskId'in parsed));
});
