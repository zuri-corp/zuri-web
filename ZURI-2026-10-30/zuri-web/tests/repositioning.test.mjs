import './hooks.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readdirSync} from 'node:fs';
const {guidance,enquiryContext,goals,audiences}=await import('../src/lib/technology/guidance.ts');
const {reservedAddresses,validSpaceAddress,destination}=await import('../src/lib/navigation/routes.ts');
const {validateDraft,validateData,publicationData}=await import('../src/lib/publishing/model.ts');
const {findStory}=await import('../src/lib/publishing/public.ts');
const {reset,state}=await import('./supabase-mock.mjs');
const basic={name:'A business',category:'Design',location:'Kampala',initials:'AB',description:'A useful introduction',about:'What we do.',offerings:['Design']};
test('every goal/audience has a safe internal handoff and context',()=>{
 for(const g of goals)for(const a of audiences){const result=guidance(g.id,a.id);assert.ok(result);assert.match(result.href,/^\/tech\//);assert.match(result.enquiryHref,/^\/tech\//);assert.match(result.context,/Goal:/);assert.match(result.context,/For:/);}
});
test('unknown URL input cannot become a recommendation or enquiry prefill',()=>{
 assert.equal(guidance('javascript:alert(1)','business'),null);assert.equal(guidance('ai','unrecognized'),null);assert.equal(enquiryContext('unknown','business'),'');
});
test('wedding and privacy goals preserve their distinct journeys',()=>{
 assert.equal(guidance('celebration','individual').enquiryHref,'/tech/invites/enquire');assert.equal(guidance('privacy','business').service,'security');assert.match(enquiryContext('work-better','individual'),/individual/);
});
test('all existing root route namespaces are reserved against Space addresses',()=>{
 for(const e of readdirSync('src/app',{withFileTypes:true})){if(e.isDirectory()&&!e.name.startsWith('['))assert.equal(validSpaceAddress(e.name),false,`${e.name} must stay reserved`);}
 for(const value of ['tech','select','search','about','admin','api','contact','login','claim','moments'])assert.ok(reservedAddresses.includes(value));
 for(const bad of ['TECH','one/name','../admin','two--hyphens','a'.repeat(91),'robots.txt'])assert.equal(validSpaceAddress(bad),false);
 assert.equal(validSpaceAddress('the-garden-house'),true);
});
test('destination chrome follows the local world including clean Space URLs',()=>{
 assert.equal(destination('/tech/marketplace'),'tech');assert.equal(destination('/select/something'),'select');assert.equal(destination('/the-garden-house'),'pamoja');assert.equal(destination('/admin'),'corporate');assert.equal(destination('/contact'),'corporate');
});
test('Space editors and publication reject reserved public addresses',()=>{
 assert.throws(()=>validateDraft('space',{slug:'tech',data:basic}),/reserved/);
 assert.throws(()=>publicationData({kind:'space',slug:'api',data:basic,consent_verified:true,consent_reference:'Consent reference'}),/reserved/);
});
test('public contact fields are intentional and unsafe contact links are rejected',()=>{
 const parsed=validateData('space',{...basic,public_email:'hello@example.test',public_phone:'+256 700 123456',website:'https://example.test',opening_info:'Weekdays, 9am–5pm',email:'private@example.test'},true);
 assert.equal(parsed.public_email,'hello@example.test');assert.equal('email' in parsed,false);assert.equal(parsed.opening_info,'Weekdays, 9am–5pm');
 for(const website of ['javascript:alert(1)','http://example.test','https://user:password@example.test'])assert.throws(()=>validateData('space',{...basic,website},true));
 assert.throws(()=>validateData('space',{...basic,public_email:'invalid'},true));
});
test('profile images require approved sources and publication captions',()=>{
 assert.throws(()=>validateData('space',{...basic,image:'https://unknown.test/track'},true));
 assert.throws(()=>validateData('space',{...basic,image:'/brands/zuri-tech.png'},true));
 assert.equal(validateData('space',{...basic,image:'/brands/zuri-tech.png',image_caption:'Illustrative supplied asset.'},true).image,'/brands/zuri-tech.png');
});
test('fictional story aliases do not reappear, while actual published records remain reachable',async()=>{
 reset();process.env.ZURI_CONTENT_MODE='preview';assert.equal((await findStory('the-places-we-remember')).item,null);
 process.env.ZURI_CONTENT_MODE='live';state.contents=[{kind:'story',slug:'the-places-we-remember',status:'published',published_at:'2026-10-13T10:00:00Z',published_data:{title:'An actual published record',category:'Places',standfirst:'Real record',image:'',caption:'',byline:'Contributor',paragraphs:['Text.']}}];assert.equal((await findStory('the-places-we-remember')).item.slug,'the-places-we-remember');delete process.env.ZURI_CONTENT_MODE;
});
