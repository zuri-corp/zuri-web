import {test} from 'node:test';
import assert from 'node:assert/strict';
import {initialData} from '../src/experience/model.ts';
import {orderedPings,pingGroup,latestUpdates} from '../src/experience/activity.ts';
import {networkResults} from '../src/experience/pamojaModel.ts';
test('upcoming Pings precede recurring and past plans without assigning dates to sample labels',()=>{
 const now=Date.parse('2026-10-22T12:00:00Z');const base={title:'Test',description:'',participantIds:[],image:''};
 const d={...structuredClone(initialData),customPings:[{...base,id:'old',timestamp:'2026-10-20T12:00:00Z'},{...base,id:'late',timestamp:'2026-10-25T12:00:00Z'},{...base,id:'soon',timestamp:'2026-10-23T12:00:00Z'}]};
 const list=orderedPings(d,now);assert.deepEqual(list.slice(0,2).map(p=>p.id),['soon','late']);assert.equal(list.at(-1).id,'old');assert.equal(pingGroup({...base,timestamp:'Tonight · 8pm'},now),'Sample plans');
});
test('relative archive updates and dated local updates sort newest first without mutating input',()=>{
 const posts=[{created:'3h ago'},{created:'2d ago'},{created:'1d ago'}];assert.deepEqual(latestUpdates(posts).map(p=>p.created),['3h ago','1d ago','2d ago']);assert.equal(posts[1].created,'2d ago');
 assert.deepEqual(latestUpdates([{created:'2026-01-01'},{created:'2026-02-01'}]).map(p=>p.created),['2026-02-01','2026-01-01']);
});
test('Find renders dated Ping records as readable dates and retains recurring labels',()=>{
 const d={...structuredClone(initialData),customPings:[{id:'dated',title:'Readable test',description:'',timestamp:'2027-06-12T16:30:00',participantIds:[],image:''}]};
 const result=networkResults(d,'Readable test','ping')[0];assert.ok(result);assert.ok(!result.detail.includes('T16:30'));assert.match(result.detail,/Jun/);
});
