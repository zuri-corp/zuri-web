import test from 'node:test';
import assert from 'node:assert/strict';
import {createHmac,randomUUID} from 'node:crypto';
import {createZuriToolClient,validateManifest,bookingManifest,verifyZuriWebhook,ZuriToolError} from '../packages/tool-sdk/index.mjs';
test('manifest limits runtime contexts, endpoint shape and permission purposes',()=>{
 assert.equal(validateManifest(bookingManifest).version,'1.0.0');
 for(const change of [{model:'hosted'},{contexts:['personal']},{endpoint:'http://localhost/tool'},{endpoint:'https://127.0.0.1/tool'},{permissions:[{capability:'messages.read',purpose:'Read private messages without consent'}]},{permissions:[{capability:'space.read',purpose:'short'}]}])assert.throws(()=>validateManifest({...bookingManifest,...change}));
});
test('SDK transports scoped operations and never automatically retries uncertain writes',async()=>{
 const calls=[],client=createZuriToolClient({baseUrl:'https://zuri.example',toolKey:'ztk_'+'a'.repeat(64),installationToken:'zik_'+'b'.repeat(64),fetch:async(...args)=>{calls.push(args);return Response.json({result:{status:'requested'}});}}),id=randomUUID();
 await client.bookings.create({name:'Example',startsAt:'2027-01-01T10:00:00Z',endsAt:'2027-01-01T10:30:00Z'},{idempotencyKey:id});
 assert.equal(calls.length,1);assert.equal(calls[0][1].headers['Idempotency-Key'],id);assert.equal(calls[0][1].redirect,'error');assert.equal(JSON.parse(calls[0][1].body).operation,'bookings.create');
 const failing=createZuriToolClient({baseUrl:'https://zuri.example',toolKey:'ztk_'+'a'.repeat(64),installationToken:'zik_'+'b'.repeat(64),fetch:async()=>Response.json({error:'Quota exhausted',code:'P0001'},{status:429})});
 await assert.rejects(failing.space.get(),e=>e instanceof ZuriToolError&&e.status===429&&e.code==='P0001');
 assert.throws(()=>createZuriToolClient({baseUrl:'http://attacker.example',toolKey:'x',installationToken:'x'}));
});
test('webhook helper checks exact body, freshness and signatures',()=>{
 const now=Date.now(),timestamp=String(Math.floor(now/1000)),eventId='event_123456',secret='s'.repeat(32),rawBody='{"status":"requested"}';
 const signature='sha256='+createHmac('sha256',secret).update(`${timestamp}.${eventId}.${rawBody}`).digest('hex');
 assert.equal(verifyZuriWebhook({now,timestamp,eventId,secret,rawBody,signature}),true);
 assert.equal(verifyZuriWebhook({now:now+600000,timestamp,eventId,secret,rawBody,signature}),false);
 assert.equal(verifyZuriWebhook({now,timestamp,eventId,secret,rawBody:rawBody+' ',signature}),false);
});
test('SDK intent planning is a separate stateless proposal call, without runtime credentials',async()=>{
 const calls=[],client=createZuriToolClient({baseUrl:'https://zuri.example',toolKey:'ztk_'+'a'.repeat(64),installationToken:'zik_'+'b'.repeat(64),fetch:async(...args)=>{calls.push(args);return Response.json({plan:{status:'clarify',question:'Who is this for?'}});}});
 const result=await client.intents.resolve({text:'Book an appointment'});
 assert.equal(result.status,'clarify');assert.equal(calls[0][0].pathname,'/api/intents/resolve');
 assert.equal(calls[0][1].headers.Authorization,undefined);assert.equal(calls[0][1].headers['X-Zuri-Tool-Key'],undefined);
 assert.deepEqual(JSON.parse(calls[0][1].body),{text:'Book an appointment'});
});
