import test from 'node:test';
import assert from 'node:assert/strict';
import {resolvePublicConnection} from '../src/lib/publicConnection.ts';
import {createPlacesLookup,normalizeBusinesses,directionsUrl} from '../src/lib/geoapify-places.ts';
const config={url:'https://project.supabase.co',publishableKey:'sb_publishable_test-public'};
const place={id:'place-1',name:'A real source name',address:'Kampala',latitude:.3,longitude:32.5};
const ok=(rows=[place])=>Response.json({businesses:rows});
test('public connection survives missing build environment without accepting server credentials or mixing projects',()=>{
 assert.deepEqual(resolvePublicConnection(undefined,config),config);
 assert.throws(()=>resolvePublicConnection({VITE_SUPABASE_URL:'https://different.supabase.co'},config),/both/);
 assert.throws(()=>resolvePublicConnection({VITE_SUPABASE_URL:config.url,VITE_SUPABASE_PUBLISHABLE_KEY:'sb_secret_do-not-send'},config),/publishable key/);
 assert.throws(()=>resolvePublicConnection(undefined,{...config,url:'https://user:password@project.supabase.co'}));
});
test('normalize source fields, remove duplicates and invalid coordinates, never turn imports into claimed Spaces',()=>{
 const data=normalizeBusinesses({businesses:[{...place,latitude:'0.3',longitude:'32.5',claimed:true},place,{...place,id:'no-name',name:'Unnamed place'},{...place,id:'bad',latitude:91},{...place,id:'blank',longitude:''},null]},'restaurants');
 assert.equal(data.length,1);assert.equal(data[0].latitude,.3);assert.equal(data[0].claimed,false);assert.equal(data[0].category,'restaurants');
 assert.match(directionsUrl(data[0]),/^https:\/\/www.google.com\/maps\/search\//);
 assert.throws(()=>normalizeBusinesses({features:[]},'restaurants'));
 assert.deepEqual(normalizeBusinesses({businesses:[]},'restaurants'),[]);
});
test('concurrent lookups share one anonymous request; cache expires and refresh is explicit',async()=>{
 let calls=0,now=0;const lookup=createPlacesLookup(config,async(url,options)=>{calls++;assert.equal(url,config.url+'/functions/v1/geoapify-places');assert.equal(options.credentials,'omit');assert.equal(options.headers.Authorization,'Bearer '+config.publishableKey);assert.equal(JSON.parse(options.body).category,'restaurants');return ok();},()=>now);
 const [one,two]=await Promise.all([lookup('restaurants'),lookup('restaurants')]);assert.equal(calls,1);assert.deepEqual(one,two);
 await lookup('restaurants');assert.equal(calls,1);
 now=300001;await lookup('restaurants');assert.equal(calls,2);
 await lookup('restaurants',{refresh:true});assert.equal(calls,3);
});
test('a cancelled screen cannot receive late results and does not cancel another consumer',async()=>{
 let release;let calls=0;const lookup=createPlacesLookup(config,()=>{calls++;return new Promise(resolve=>{release=()=>resolve(ok());});});
 const controller=new AbortController();const first=lookup('restaurants',{signal:controller.signal});const rejected=assert.rejects(first,error=>error.name==='AbortError');
 const second=lookup('restaurants');controller.abort();release();await rejected;assert.equal((await second).length,1);assert.equal(calls,1);
});
test('upstream failures are not cached, response errors are not shown as empty success, unsupported categories never fetch',async()=>{
 let calls=0;const lookup=createPlacesLookup(config,async()=>{calls++;return calls===1?Response.json({error:'provider details'},{status:429}):ok();});
 await assert.rejects(lookup('restaurants'),error=>error.status===429&&/try later/i.test(error.message));assert.equal((await lookup('restaurants')).length,1);
 await assert.rejects(lookup('unsupported'),/supported/);assert.equal(calls,2);
 const malformed=createPlacesLookup(config,async()=>Response.json({error:'bad upstream'}));await assert.rejects(malformed('cafes'),/could not complete/);
});
