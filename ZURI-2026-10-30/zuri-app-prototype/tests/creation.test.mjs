import {test} from 'node:test';
import assert from 'node:assert/strict';
import {validateGathering,validPhoto} from '../src/experience/creationModel.ts';
import {initialData,readData} from '../src/experience/model.ts';
import {emptyPamoja} from '../src/experience/pamojaModel.ts';
import {allOffers} from '../src/experience/spaceExperience.ts';
const photo='data:image/jpeg;base64,AAAA';
const fields={title:'Listening session',when:'2027-06-12T17:00',end:'2027-06-12T19:00',location:'Campus courtyard',capacity:25,image:photo};
test('gathering fields reject impossible dates, reversed times, missing places and invalid capacities',()=>{
 assert.doesNotThrow(()=>validateGathering(fields));
 for(const patch of [{title:' '},{when:'2027-02-30T12:00'},{end:'2027-06-12T16:00'},{location:''},{capacity:0},{capacity:1.5},{image:'javascript:alert(1)'}])assert.throws(()=>validateGathering({...fields,...patch}));
 assert.equal(validPhoto(''),true);assert.equal(validPhoto(photo),true);assert.equal(validPhoto('data:text/html;base64,AAAA'),false);
});
test('creation photos and event details survive workspace saving without substitute images',()=>{
 const d={...structuredClone(initialData),pamoja:emptyPamoja()};
 d.customPings=[{id:'ping-photo',title:'Training',description:'Bring boots',image:photo,creatorId:'me',spaceId:'',timestamp:fields.when,endAt:fields.end,capacity:25,participantIds:['me'],mediaCount:1,isRecurring:false}];
 d.pamoja.notes=[{id:'event-photo',text:JSON.stringify({type:'event-draft',name:fields.title,image:photo,when:fields.when,end:fields.end,capacity:25,place:fields.location,price:0,tags:[]})}];
 d.pamoja.offers=[{id:'offer-photo',spaceId:'s4',name:'My offering',description:'',price:10,type:'product',paused:false,image:photo}];
 const restored=readData(JSON.stringify(d));assert.equal(restored.customPings[0].image,photo);assert.equal(restored.customPings[0].endAt,fields.end);assert.equal(JSON.parse(restored.pamoja.notes[0].text).image,photo);assert.equal(allOffers(restored).find(o=>o.id==='offer-photo').image,photo);
});
