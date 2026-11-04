import {test} from 'node:test';
import assert from 'node:assert/strict';
import {initialData,readData} from '../src/experience/model.ts';
import {emptyPamoja,pj} from '../src/experience/pamojaModel.ts';
import {saveEnquiry} from '../src/experience/spaceExperience.ts';
import {createOfferingRequest,reviseOfferingRequest,readRequestFields,enquiryDrafts,changeEnquiry} from '../src/experience/requestModel.ts';
const fresh=()=>({...structuredClone(initialData),pamoja:emptyPamoja()});
const offer={id:'service',spaceId:'s4',name:'Venue',price:500000,type:'rental'};
const fields={kind:'rental',date:'2027-06-12',endDate:'2027-06-13',time:'16:30',people:'80',variant:'',notes:'Seating and sound'};
test('venue requests retain guest counts without multiplying the listed rate and survive reload',()=>{
 const d=createOfferingRequest(fresh(),offer,80,fields),o=pj(d).orders[0];
 assert.equal(o.quantity,1);assert.equal(o.unitPrice,500000);assert.deepEqual(readRequestFields(o.option),{version:2,...fields});
 assert.deepEqual(readData(JSON.stringify(d)),d);
});
test('product requests preserve quantity and variant while legacy options remain readable',()=>{
 const d=createOfferingRequest(fresh(),{...offer,type:'product'},3,{...fields,kind:'product',date:'',endDate:'',people:'',variant:'Blue'});
 assert.equal(pj(d).orders[0].quantity,3);assert.equal(readRequestFields(pj(d).orders[0].option).variant,'Blue');
 assert.equal(readRequestFields('Blue, medium'),undefined);assert.equal(readRequestFields('null'),undefined);
});
test('service drafts reject impossible dates, times and guest counts',()=>{
 for(const f of [{date:'2027-02-30'},{endDate:'2027-06-01'},{time:'25:00'},{people:'0'},{people:'10001'}])assert.throws(()=>createOfferingRequest(fresh(),offer,1,{...fields,...f}));
 for(const kind of ['appointment','subscription','pass'])assert.throws(()=>createOfferingRequest(fresh(),{...offer,type:kind},1,{...fields,kind,date:''}),/preferred date/);
});
test('editing a request preserves identity, original timestamp and other drafts without duplicates',()=>{
 let d=createOfferingRequest(fresh(),offer,1,fields);const original=pj(d).orders[0];
 d=createOfferingRequest(d,offer,1,{...fields,notes:'Another request'});
 d=reviseOfferingRequest(d,original.id,offer,1,{...fields,people:'100'});
 assert.equal(pj(d).orders.length,2);const revised=pj(d).orders.find(o=>o.id===original.id);
 assert.equal(revised.created,original.created);assert.equal(readRequestFields(revised.option).people,'100');
 assert.throws(()=>reviseOfferingRequest(d,original.id,{...offer,id:'different'},1,fields),/does not match/);
 revised.status='cancelled';assert.throws(()=>reviseOfferingRequest(d,original.id,offer,1,fields),/available request draft/);
});
test('enquiry edits, cancellation and restoration preserve context and survive reload',()=>{
 let d=saveEnquiry(fresh(),'space:s4',{message:'Venue enquiry',when:'2027-06-12',guests:'80'});const original=enquiryDrafts(d)[0];
 d=changeEnquiry(d,original.id,{message:'Updated requirements',when:'2027-06-13',guests:'90'});
 d=changeEnquiry(d,original.id,'cancel');assert.equal(enquiryDrafts(d)[0].cancelled,true);
 d=changeEnquiry(readData(JSON.stringify(d)),original.id,'restore');const e=enquiryDrafts(d)[0];
 assert.equal(e.cancelled,false);assert.equal(e.context,original.context);assert.equal(e.message,'Updated requirements');assert.equal(e.guests,'90');assert.equal(enquiryDrafts(d).length,1);
 assert.throws(()=>changeEnquiry(d,original.id,{message:'',when:'',guests:''}),/Write/);
 assert.throws(()=>changeEnquiry(d,original.id,{message:'Hello',when:'2027-02-30',guests:''}),/valid date/);
});
test('older enquiry notes retain their message and acquire a usable Space context',()=>{
 const d=fresh();d.pamoja.notes=[{id:'legacy',text:JSON.stringify({type:'enquiry',spaceId:'s4',text:'Old message'})},{id:'ordinary',text:'Normal note'}];
 const [e]=enquiryDrafts(d);assert.equal(e.message,'Old message');assert.equal(e.context,'space:s4');assert.equal(enquiryDrafts(d).length,1);
 assert.equal(enquiryDrafts(changeEnquiry(d,'legacy','cancel'))[0].message,'Old message');
});
