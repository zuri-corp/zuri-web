import {test} from 'node:test';
import assert from 'node:assert/strict';
import {replacesCreation} from '../src/experience/navigation.ts';
import {initialData,readData,objectRoute,parseRoute,routeHash} from '../src/experience/model.ts';
import {threadComments} from '../src/experience/threadModel.ts';
import {freshSocietyTopics} from '../src/experience/freshSocieties.ts';
test('completed creation replaces the form history entry across worlds',()=>{
 for(const [from,to] of [['new-topic','topic'],['new-ping','ping'],['new-space','space-wall'],['new-society','society'],['new-moment','chapter'],['new-channel','channel'],['checkout','order']])assert.equal(replacesCreation(objectRoute(from,'create'),objectRoute(to,'saved')),true);
 assert.equal(replacesCreation({world:'rizz',tab:'Create'},{world:'rizz',tab:'Feed'}),true);
 assert.equal(replacesCreation(objectRoute('event-create','create'),objectRoute('event-create','saved')),true);
 assert.equal(replacesCreation(objectRoute('society','s'),objectRoute('topic','t')),false);
});
test('conversation photos and nested replies survive reload without losing text',()=>{
 const d=structuredClone(initialData),image='data:image/jpeg;base64,YQ==',topic={...freshSocietyTopics[0],id:'local',messages:[{userId:'me',text:'Opening',time:'now',image}]};
 d.customTopics=[topic];d.discussions=[{id:'r',topicId:'local',text:'',author:d.name,created:'2026-10-26',image}];
 const restored=readData(JSON.stringify(d));assert.equal(restored.customTopics[0].messages[0].image,image);assert.equal(threadComments(topic,restored)[0].image,image);
 assert.throws(()=>readData(JSON.stringify({...d,discussions:[{...d.discussions[0],image:'javascript:bad'}]})),/conversation photo/);
});
test('customer preview is a canonical route without changing publication',()=>{const r=objectRoute('space-preview','owned');assert.deepEqual(parseRoute(routeHash(r)),r);assert.equal(r.world,'aura');});
