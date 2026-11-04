import {test} from 'node:test';
import assert from 'node:assert/strict';
import {initialData} from '../src/experience/model.ts';
import {allTopics,feedSocietyTopics} from '../src/experience/activity.ts';
import {pj} from '../src/experience/pamojaModel.ts';
test('Society discovery shows public discussions and excludes group chats and private threads',()=>{
 const d=structuredClone(initialData),items=feedSocietyTopics(d);
 assert.ok(items.some(t=>t.id.startsWith('fresh-')));
 assert.ok(items.every(t=>t.mode!=='chat'&&t.societyId!=='soc3'));
 assert.ok(allTopics(d).some(t=>t.mode==='chat'));
 assert.equal(feedSocietyTopics(d,'One lens')[0].id,'fresh-photo-walk');
});
test('blocked authors cannot reappear through the Society feed',()=>{
 const d=structuredClone(initialData);d.pamoja={...pj(d),blocked:['u4']};
 assert.equal(feedSocietyTopics(d,'One lens').length,0);
});
