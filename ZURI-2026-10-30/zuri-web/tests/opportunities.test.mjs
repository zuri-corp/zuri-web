import './hooks.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
const {xQuery,fetchX,fetchQuicket,geocodeVenue,retryTime}=await import('../src/lib/opportunities/connectors.ts');
const {preparePage,runDiscovery}=await import('../src/lib/opportunities/pipeline.ts');
const {matchOpportunities,verifiedXScopes,safeLink}=await import('../src/lib/opportunities/model.ts');
const {supportedExtraction}=await import('../src/lib/opportunities/extraction.ts');
const source={id:'source',provider:'x',mode:'account',query:'trusted_ug',since_id:'100',cursor:'page-two',pending_since_id:'300',failures:0};
const item={id:'123',text:'Kampala technology workshop: applications open for our community.',url:'https://x.com/i/web/status/123',officialLinks:[]};
test('X is bounded, scoped, incremental and sparse; never uses user OAuth or a raw user feed',async()=>{
 assert.equal(xQuery(source),'from:trusted_ug -is:retweet -is:reply');
 assert.match(xQuery({...source,mode:'search',query:'(Kampala OR Uganda) (jobs OR grants)'}),/Kampala/);
 for(const query of ['jobs','(Uganda) (anything)','(Kampala) (jobs) OR cats','from:admin'])assert.throws(()=>xQuery({...source,mode:'search',query}));
 const page=await fetchX(source,'test-token',async(url,options)=>{
  const u=new URL(url);assert.equal(u.origin,'https://api.x.com');assert.equal(u.searchParams.get('since_id'),'100');assert.equal(u.searchParams.get('next_token'),'page-two');assert.equal(u.searchParams.get('max_results'),'10');assert.equal(options.redirect,'error');
  return Response.json({data:[{id:item.id,text:item.text}],meta:{newest_id:'200'}});
 });assert.equal(page.items[0].url,item.url);assert.equal(page.cursor,null);
});
test('429 and provider failure preserve cursors and schedule backoff',async()=>{
 const p=await fetchX(source,'test',async()=>new Response('',{status:429,headers:{'retry-after':'3600'}}));
 assert.equal(p.cursor,'page-two');assert.ok(Date.parse(p.retryAt)>Date.now()+3500000);
 await assert.rejects(fetchX(source,'test',async()=>new Response('',{status:403})),/rejected/);
 assert.ok(Date.parse(retryTime(new Response('',{status:503}),3,0))>=480000);
});
test('deterministic rejection and dedup happen before AI, with unknown claims left unset',async()=>{
 const page={items:[item,item,{...item,id:'456',text:'Buy our coins: guaranteed returns in Kampala'}],cursor:'next',newestId:'300'};
 const drafts=preparePage(page);assert.equal(drafts.length,1);assert.equal(drafts[0].kind,'event');assert.equal(drafts[0].expires_at,undefined);
 let payload,aiCalls=0;
 const store={claim:async()=>({source,run_id:'run'}),knownFingerprints:async()=>drafts.map(d=>d.fingerprint),finish:async(s,r,p)=>{payload=p;}};
 await runDiscovery(store,'test',async()=>page,async()=>{aiCalls++;return {};});
 assert.equal(aiCalls,0);assert.equal(payload.cursor,'next');assert.equal(payload.newest_id,'300');
 store.knownFingerprints=async()=>[];await runDiscovery(store,'test',async()=>page,async()=>{aiCalls++;return {};});assert.equal(aiCalls,1);
 await runDiscovery({claim:async()=>null,finish:async()=>assert.fail()},'test',async()=>assert.fail());
});
test('evidence extraction rejects hallucinated fields and ambiguous dates',()=>{
 const text='Kampala. Eligibility: Uganda residents. Deadline 2027-03-01T17:00:00+03:00.';
 const fields=supportedExtraction(text,{eligibility:{value:'Uganda residents',quote:'Eligibility: Uganda residents.'},location:{value:'Nairobi',quote:'Kampala.'},expires_at:{value:'2027-03-01T17:00:00+03:00',quote:'Deadline 2027-03-01T17:00:00+03:00.'}});
 assert.equal(fields.eligibility.value,'Uganda residents');assert.equal(fields.location,undefined);assert.ok(fields.expires_at);
 assert.deepEqual(supportedExtraction(text,{expires_at:{value:'tomorrow',quote:'tomorrow'}}),{});
});
test('matching uses explicit location and interests and excludes stale, expired and withdrawn entries',()=>{
 const now=Date.now(),base={id:'1',status:'published',kind:'job',title:'Kampala developer job',summary:'Technology',tags:['technology'],location:'Kampala',fresh_until:new Date(now+100000).toISOString(),refreshed_at:new Date(now).toISOString(),expires_at:null};
 const result=matchOpportunities([base,{...base,id:'2',status:'withdrawn'},{...base,id:'3',fresh_until:new Date(now-1).toISOString()},{...base,id:'4',expires_at:new Date(now-1).toISOString()}],{interests:['technology'],location:'Kampala'},now);
 assert.equal(result.length,1);assert.deepEqual(result[0].reasons,['Interest: technology','Matches your chosen location']);
 assert.equal(matchOpportunities([base],{interests:['medicine'],location:''},now).length,0);
 assert.equal(safeLink('javascript:alert(1)'),null);assert.equal(safeLink('https://user:password@example.org'),null);
 assert.equal(verifiedXScopes(['tweet.read','users.read'],false),false);assert.equal(verifiedXScopes(['tweet.read','users.read','dm.read'],true),false);
});
test('Maps returns only a Place ID; ambiguous matches are withheld and Quicket never scrapes',async()=>{
 const venue=await geocodeVenue('A source-supplied venue in Kampala','test',async()=>Response.json({status:'OK',results:[{place_id:'place123',formatted_address:'NOT RETAINED',geometry:{location:{lat:1,lng:2}}}]}));
 assert.deepEqual(venue,{placeId:'place123',attribution:'Google Maps',verified:false});
 assert.equal(await geocodeVenue('Kampala','test',async()=>Response.json({status:'OK',results:[{place_id:'a'},{place_id:'b'}]})),null);
 await assert.rejects(fetchQuicket(),/permitted/);
});
