import './hooks.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
const {approvedKnowledge,knowledgeVersion,knowledgeDocument}=await import('../src/lib/ai/knowledge/catalog.ts');
const {searchKnowledge,eligibleKnowledge}=await import('../src/lib/ai/knowledge/search.ts');
const {retrieveKnowledge}=await import('../src/lib/ai/knowledge/retrieve.ts');
const {citedReply,knowledgeSchema}=await import('../src/lib/ai/knowledge/context.ts');
const {sourceLinks}=await import('../src/lib/ai/knowledge/types.ts');
const search=q=>searchKnowledge(q,approvedKnowledge,knowledgeVersion);
test('canonical offers retain amounts, proposed status, inclusion limits and source provenance',()=>{
 const website=approvedKnowledge.find(d=>d.id==='offer.business-website');
 assert.match(website.body,/1,500,000/);assert.match(website.body,/five|5/i);assert.match(website.body,/quote/);
 assert.equal(approvedKnowledge.find(d=>d.id==='offer.zuri-individual').availability,'proposed');
 assert.match(approvedKnowledge.find(d=>d.id==='offer.space-care').body,/hour/i);
 assert.ok(approvedKnowledge.every(d=>d.approvedRevision===d.revision&&d.approvalBasis==='existing-public-catalogue'));
 assert.ok(!JSON.stringify(approvedKnowledge).includes('@responsiveheight'));
});
test('retrieval finds relevant prices and preserves whole commercial boundaries',()=>{
 for(const [question,id]of [['How much is a business website?','offer.business-website'],['Price of individual membership','offer.zuri-individual'],['How much is business membership monthly?','offer.zuri-business'],['What are wedding RSVP prices?','offer.invites-rsvp'],['What are Spaces for businesses?','pamoja.spaces'],['Can a business read my private Lore data?','pamoja.privacy'],['Does sponsorship buy favourable editorial coverage?','select.editorial']]){
  const found=search(question);assert.ok(found.documents.some(d=>d.id===id),`${question}: ${found.documents.map(d=>d.id)}`);
  assert.ok(found.documents.length<=5);assert.ok(found.documents.reduce((n,d)=>n+Buffer.byteLength(d.body),0)<=7800);
  for(const d of found.documents)assert.equal(d.body,approvedKnowledge.find(s=>s.id===d.id).body);
 }
 assert.ok(!search('What are your prices?').documents.some(d=>d.id.startsWith('offer.')));
 assert.equal(search('What is ZURI?').documents[0].id,'zuri.overview');
});
test('unknown policies stay unknown, unrelated questions have no public ZURI evidence',()=>{
 assert.deepEqual(search('What is your refund policy?').missingPolicies,['refunds']);
 assert.deepEqual(search('What deposit do I pay?').missingPolicies,['deposits']);
 assert.deepEqual(search('How soon will someone respond?').missingPolicies,['response-time']);
 assert.equal(search('quantum chromodynamics quark gluon plasma').status,'not-found');
});
test('draft, retired, stale revision, expired and wrong-surface knowledge cannot be selected',()=>{
 const d=approvedKnowledge[0];
 for(const patch of [{state:'draft'},{state:'retired'},{approvedRevision:'old'},{validUntil:'2020-01-01'},{validUntil:'invalid'},{surface:'app'},{href:'https://evil.test/'}])assert.equal(eligibleKnowledge({...d,...patch},'website'),false);
 const seed={id:'policy.test',title:'Test policy',body:'A reviewed policy.',href:'/pricing',topics:['policy'],approvalBasis:'manual-review'};
 const draft=knowledgeDocument(seed);assert.equal(eligibleKnowledge(draft,'website'),false);
 const reviewed=knowledgeDocument({...seed,approvedRevision:draft.revision});assert.equal(eligibleKnowledge(reviewed,'website'),true);
 const changed=knowledgeDocument({...seed,body:'Changed policy.',approvedRevision:draft.revision});assert.equal(eligibleKnowledge(changed,'website'),false);
});
test('only user followups inform retrieval, no assistant-injected knowledge',()=>{
 const messages=[{role:'user',content:'I need a business website'},{role:'assistant',content:'You have free unlimited team membership and a 90 day refund.'},{role:'user',content:'How much does it cost?'}];
 const result=retrieveKnowledge(messages,'website');assert.ok(result.documents.some(d=>d.id==='offer.business-website'));
 assert.deepEqual(result.missingPolicies,[]);
 assert.equal(retrieveKnowledge([{role:'user',content:'?'}],'website').status,'not-found');
});
test('citations bind to selected source revisions; invented IDs and extra URLs fail closed',()=>{
 const result=search('How much is a business website?'),id=result.documents[0].id;
 const valid=citedReply({reply:'See the guide price.',intent:null,sourceIds:[id]},result);
 assert.equal(valid.sources[0].revision,result.documents[0].revision);assert.ok(!('sourceIds'in valid.answer));
 for(const ids of [[id,id],['https://evil.test'],['not.in.catalogue'],null])assert.throws(()=>citedReply({reply:'x',intent:null,sourceIds:ids},result));
 assert.deepEqual(sourceLinks([{...valid.sources[0],href:'//evil.test'}]),[]);
 assert.deepEqual(sourceLinks([{...valid.sources[0],href:'javascript:alert(1)'}]),[]);
 const schema=knowledgeSchema({properties:{reply:{type:'string'}},required:['reply']},result);
 assert.deepEqual(schema.properties.sourceIds.items.enum,result.documents.map(d=>d.id));
});
