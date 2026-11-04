import {test} from 'node:test';
import assert from 'node:assert/strict';
import {threadComments,replyParent} from '../src/experience/threadModel.ts';
import {initialData,readData} from '../src/experience/model.ts';
import {freshSocietyTopics} from '../src/experience/freshSocieties.ts';
test('reply relationships survive saving and attach beneath the selected comment',()=>{
 const topic=freshSocietyTopics[0],d=structuredClone(initialData),parent=topic.id+':sample:0';
 d.discussions=[{id:'r1',topicId:topic.id,text:'A reply',author:d.name,created:'2026-10-26',parentId:parent}];
 const comments=threadComments(topic,readData(JSON.stringify(d)));
 assert.equal(replyParent(comments,comments.find(c=>c.id==='r1')),parent);
 assert.equal(comments.filter(c=>!replyParent(comments,c)).length,2);
});
test('deleted parents and cyclic imported replies remain readable without recursive loops',()=>{
 const comments=[{id:'a',parentId:'b'},{id:'b',parentId:'a'},{id:'c',parentId:'deleted'}];
 for(const c of comments)assert.equal(replyParent(comments,c),undefined);
 assert.throws(()=>readData(JSON.stringify({...initialData,discussions:[{id:'x',topicId:'t',text:'x',author:'a',created:'now',parentId:7}]})),/reply parent/);
});
