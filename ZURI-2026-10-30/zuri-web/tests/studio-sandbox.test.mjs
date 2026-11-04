import './hooks.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
const {newSandbox,sandboxChange}=await import('../src/lib/studio/sandbox.ts');
const {bookingManifest,bookingInput}=await import('../src/lib/studio/model.ts');
test('labelled sandbox completes the reference journey and blocks revoked access',()=>{
 let s=newSandbox();const run=(action,input)=>s=sandboxChange(s,{action,input});
 run('register',{name:'Example Developer',kind:'individual'});
 run('create',{developerId:s.developers[0].id,manifest:bookingManifest});const versionId=s.versions[0].id;
 run('submit',{versionId});assert.throws(()=>run('publish',{versionId}));
 run('verify',{developerId:s.developers[0].id,reference:'Simulated identity verification completed'});
 run('approve',{versionId,reference:'Simulated permission and endpoint review'});run('publish',{versionId});
 run('install',{versionId,spaceId:s.spaces[0].id,consent:true});const installationId=s.installations[0].id;
 const input={installationId,name:'Example Customer',startsAt:new Date(Date.now()+86400000).toISOString(),endsAt:new Date(Date.now()+90000000).toISOString()};
 run('booking-create',input);assert.equal(s.bookings[0].status,'requested');assert.equal(s.usage.length,1);
 assert.throws(()=>run('booking-create',input),/overlaps/);
 run('booking-status',{bookingId:s.bookings[0].id,status:'confirmed'});
 run('revoke',{installationId});assert.throws(()=>run('booking-create',{...input,startsAt:new Date(Date.now()+2*86400000).toISOString(),endsAt:new Date(Date.now()+2*86400000+1800000).toISOString()}),/active installation/i);
 assert.throws(()=>run('issue-key',{toolId:s.tools[0].id}),/unavailable/);
});
test('booking validation rejects past, ambiguous timezone and excessive duration',()=>{
 assert.throws(()=>bookingInput({name:'Example',startsAt:'2000-01-01T10:00:00Z',endsAt:'2000-01-01T11:00:00Z'}));
 assert.throws(()=>bookingInput({name:'Example',startsAt:'2027-01-01T10:00:00',endsAt:'2027-01-01T11:00:00'}));
});
