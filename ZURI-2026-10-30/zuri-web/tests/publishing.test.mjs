import './hooks.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {NextRequest} from 'next/server.js';
import {state,reset} from './supabase-mock.mjs';
const collection=await import('../src/app/api/admin/publishing/[kind]/route.ts');
const itemAPI=await import('../src/app/api/admin/publishing/[kind]/[id]/route.ts');
const delivery=await import('../src/lib/publishing/public.ts');
const model=await import('../src/lib/publishing/model.ts');
const story={title:'A real title',category:'Ideas',standfirst:'A considered introduction.',image:'',caption:'',byline:'Named contributor',paragraphs:['A complete paragraph.']};
const profile={name:'Example subject',category:'Photography',location:'Kampala',description:'An introduction',initials:'ES',about:'A full introduction to the subject.',offerings:['Portraits']};
const id='550e8400-e29b-41d4-a716-446655440000';
function request(method,body,headers={}){return new NextRequest('https://zuri.test/api/admin/publishing/story',{method,headers:{origin:'https://zuri.test','content-type':'application/json',...headers},...(method==='GET'?{}:{body:typeof body==='string'?body:JSON.stringify(body)})});}
const context=kind=>({params:Promise.resolve({kind})});
const itemContext=(kind='story',itemId=id)=>({params:Promise.resolve({kind,id:itemId})});
async function create(kind='story',extra={}){const res=await collection.POST(request('POST',{slug:'example-story',data:kind==='story'?story:profile,...extra}),context(kind));assert.equal(res.status,201);return (await res.json()).item;}
async function action(kind,body){return itemAPI.PATCH(request('PATCH',body),itemContext(kind));}
test.beforeEach(()=>{reset();process.env.ZURI_CONTENT_MODE='live';});
test.afterEach(()=>delete process.env.ZURI_CONTENT_MODE);
for(const [label,method] of [['list','GET'],['create','POST']]){
 test(`${label}: visitors cannot access admin content`,async()=>{state.user=null;const res=await collection[method](request(method,{slug:'x',data:story}),context('story'));assert.equal(res.status,401);assert.equal(state.calls.length,0);});
 test(`${label}: authenticated non-admin cannot access content`,async()=>{state.allowed=false;const res=await collection[method](request(method,{slug:'x',data:story}),context('story'));assert.equal(res.status,403);assert.deepEqual(state.calls.map(c=>c.table),['admin_users']);});
}
test('mutations independently authorize before touching content',async()=>{state.allowed=false;assert.equal((await action('story',{action:'publish',revision:1})).status,403);assert.deepEqual(state.calls.map(c=>c.table),['admin_users']);});
test('new drafts cannot inject published state, actor, consent or revision',async()=>{
 const created=await create('story',{status:'published',published_data:story,created_by:'attacker',revision:100});
 assert.equal(created.status,'draft');assert.equal(created.revision,1);assert.equal(state.contents[0].created_by,'admin-1');assert.deepEqual((await delivery.loadStories()).items,[]);
});
test('story journey: draft, publish, unpublished edit, republish, withdraw',async()=>{
 let current=await create();let res=await action('story',{action:'publish',revision:current.revision});assert.equal(res.status,200);current=(await res.json()).item;
 assert.equal((await delivery.findStory('example-story')).item.title,'A real title');
 res=await action('story',{action:'save',revision:current.revision,slug:current.slug,data:{...story,title:'Revised title'}});assert.equal(res.status,200);current=(await res.json()).item;
 assert.equal(current.status,'published');assert.notEqual(current.revision,current.published_revision);assert.equal((await delivery.findStory('example-story')).item.title,'A real title');
 res=await action('story',{action:'publish',revision:current.revision});current=(await res.json()).item;assert.equal((await delivery.findStory('example-story')).item.title,'Revised title');
 res=await action('story',{action:'unpublish',revision:current.revision});assert.equal(res.status,200);assert.equal((await delivery.findStory('example-story')).item,null);
});
test('incomplete draft saves, but publishing is rejected',async()=>{const current=await create('story',{data:{title:'Draft only'}});assert.equal((await action('story',{action:'publish',revision:current.revision})).status,400);assert.equal(state.contents[0].status,'draft');});
test('profile consent must be recorded, never public',async()=>{
 let current=await create('person');assert.equal((await action('person',{action:'publish',revision:current.revision})).status,400);
 let res=await action('person',{action:'save',revision:current.revision,slug:current.slug,data:profile,consent_verified:true,consent_reference:'Internal permission record'});current=(await res.json()).item;
 res=await action('person',{action:'publish',revision:current.revision});assert.equal(res.status,200);current=(await res.json()).item;
 const published=(await delivery.findProfile('person',current.slug)).item;assert.equal(published.name,profile.name);assert.equal('consent_reference' in published,false);assert.equal('created_by' in published,false);assert.equal('id' in published,false);
 res=await action('person',{action:'save',revision:current.revision,slug:current.slug,data:profile,consent_verified:false,consent_reference:'Consent withdrawn'});assert.equal(res.status,200);assert.equal((await delivery.findProfile('person',current.slug)).item,null);
});
test('consent cannot be confirmed without a reference',async()=>{const res=await collection.POST(request('POST',{slug:'subject',data:profile,consent_verified:true}),context('space'));assert.equal(res.status,400);assert.equal(state.contents.length,0);});
test('public content is an allowlisted snapshot, not arbitrary private JSON',async()=>{
 const current=await create('story',{data:{...story,consent_reference:'secret',owner_id:'private',member:true}});await action('story',{action:'publish',revision:current.revision});const published=(await delivery.loadStories()).items[0];assert.equal('consent_reference' in published,false);assert.equal('owner_id' in published,false);assert.equal('member' in published,false);
 const publicQueries=state.calls.filter(c=>c.table==='zuri_website_content'&&c.columns.includes('published_data'));for(const q of publicQueries)assert.equal(q.columns,'kind,slug,published_data,published_at');
});
test('stale revisions and race conditions cannot overwrite another editor',async()=>{
 const current=await create();assert.equal((await action('story',{action:'archive',revision:99})).status,409);assert.equal(state.contents[0].status,'draft');state.failCAS=true;assert.equal((await action('story',{action:'publish',revision:current.revision})).status,409);assert.equal(state.contents[0].status,'draft');
});
test('published URL cannot change without withdrawal',async()=>{let current=await create();current=(await (await action('story',{action:'publish',revision:current.revision})).json()).item;assert.equal((await action('story',{action:'save',revision:current.revision,slug:'different-url',data:story})).status,409);assert.equal(state.contents[0].slug,current.slug);});
test('archive withdraws public content and restore returns a private draft',async()=>{let current=await create();current=(await (await action('story',{action:'publish',revision:current.revision})).json()).item;current=(await (await action('story',{action:'archive',revision:current.revision})).json()).item;assert.equal((await delivery.findStory(current.slug)).item,null);assert.equal((await action('story',{action:'publish',revision:current.revision})).status,409);current=(await (await action('story',{action:'restore',revision:current.revision})).json()).item;assert.equal(current.status,'draft');assert.equal((await delivery.findStory(current.slug)).item,null);});
test('same slug conflicts are reported without silent replacement',async()=>{await create();const res=await collection.POST(request('POST',{slug:'example-story',data:story}),context('story'));assert.equal(res.status,409);assert.equal(state.contents.length,1);});
test('kind boundaries prevent editing a story as a profile',async()=>{const current=await create();assert.equal((await action('space',{action:'publish',revision:current.revision})).status,404);});
test('unknown kinds and invalid IDs cannot reach content',async()=>{assert.equal((await collection.GET(request('GET'),context('member'))).status,404);assert.equal((await itemAPI.PATCH(request('PATCH',{action:'publish',revision:1}),itemContext('story','invalid'))).status,400);});
for(const [label,body,headers,status] of [['foreign origin',{}, {origin:'https://other.test'},403],['malformed JSON','{',{},400],['wrong content type',{}, {'content-type':'text/plain'},415],['oversized body','x'.repeat(320001),{},413]])test(`publishing rejects ${label}`,async()=>{assert.equal((await collection.POST(request('POST',body,headers),context('story'))).status,status);assert.equal(state.contents.length,0);});
test('private responses cannot be shared-cache stored',async()=>{const res=await collection.GET(request('GET'),context('story'));assert.equal(res.headers.get('cache-control'),'private, no-store');});
test('live content failure is unavailable, never sample fallback',async()=>{state.contentError={code:'missing_table'};const stories=await delivery.loadStories();assert.equal(stories.available,false);assert.equal(stories.preview,false);assert.deepEqual(stories.items,[]);assert.equal((await delivery.findStory('example-story')).available,false);});
test('preview content stays labelled and independent of live drafts',async()=>{process.env.ZURI_CONTENT_MODE='preview';await create();const result=await delivery.loadStories();assert.equal(result.preview,true);assert.equal(result.items.every(s=>(s.sample||s.editorialDraft)&&s.publishedAt===null),true);});
test('unsafe image URLs and executable fields do not enter content',()=>{for(const image of ['javascript:alert(1)','https://unknown.example/tracker','https://user:password@images.unsplash.com/image'])assert.throws(()=>model.validateData('story',{...story,image}));assert.deepEqual(model.validateData('story',{...story,html:'<script>bad</script>'}),story);});
test('admin pagination makes older content reachable with private responses',async()=>{
 state.contents=Array.from({length:75},(_,i)=>({id:`record-${i}`,kind:'story',slug:`story-${i}`,status:'draft',data:{...story,title:`Story ${i}`},revision:1}));
 const res=await collection.GET(new NextRequest('https://zuri.test/api/admin/publishing/story?page=2'),context('story'));assert.equal(res.status,200);const body=await res.json();assert.equal(body.page,2);assert.equal(body.pages,2);assert.equal(body.total,75);assert.equal(body.items.length,25);assert.equal(body.items[0].slug,'story-50');
});
test('storage errors return 503 and never pretend to save',async()=>{state.contentError={code:'missing_table'};const res=await collection.POST(request('POST',{slug:'x',data:story}),context('story'));assert.equal(res.status,503);assert.equal(state.contents.length,0);});
test('publication rejects invalid actions and missing revisions',async()=>{await create();assert.equal((await action('story',{action:'destroy',revision:1})).status,400);assert.equal((await action('story',{action:'publish'})).status,400);});
test('public profile lookups are type scoped and do not expose unrelated identities',async()=>{const current=await create('space',{consent_verified:true,consent_reference:'Permission documented'});await action('space',{action:'publish',revision:current.revision});assert.ok((await delivery.findProfile('space',current.slug)).item);assert.equal((await delivery.findProfile('person',current.slug)).item,null);});
test('missing content is 404, storage failure is not a missing record',async()=>{assert.equal((await action('story',{action:'archive',revision:1})).status,404);state.contentError={code:'offline'};assert.equal((await action('story',{action:'archive',revision:1})).status,503);});
test('text is rendered as plain data and snapshots remain strictly allowlisted',()=>{const result=model.validateData('story',{...story,title:'<script>alert(1)</script>',external_owner:'private'});assert.equal(result.title,'<script>alert(1)</script>');assert.equal('external_owner' in result,false);assert.equal(model.approvedImage('https://unknown.example/tracker'),false);});


test('default directory excludes fictional profiles while preserving owner supplied content',async()=>{process.env.ZURI_CONTENT_MODE='preview';const result=await delivery.loadProfiles();assert.ok(result.items.length);assert.ok(result.items.every(p=>!p.sample));assert.ok(result.items.some(p=>p.slug==='david-dawudi-jabulani'));assert.equal((await delivery.findProfile('person','nala-kintu-example')).item,null);});
