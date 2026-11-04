import {test} from 'node:test';
import assert from 'node:assert/strict';
import {initialScrollNav,nextScrollNav} from '../src/experience/navigation.ts';
import {initialData,readData} from '../src/experience/model.ts';
test('bottom navigation hides on deliberate downward scroll and returns on upward scroll',()=>{
 let s=nextScrollNav(initialScrollNav(),80);assert.equal(s.hidden,true);
 s=nextScrollNav(s,77);assert.equal(s.hidden,true);
 s=nextScrollNav(s,60);assert.equal(s.hidden,false);
 s=nextScrollNav(s,100);assert.equal(s.hidden,true);
 assert.equal(nextScrollNav(s,0).hidden,false);
 assert.equal(nextScrollNav(s,-10).hidden,false);
});
test('tiny scroll jitter does not hide navigation',()=>{
 const s={top:50,direction:0,distance:0,hidden:false};assert.equal(nextScrollNav(s,51).hidden,false);
});
test('Friends widget upgrades existing layouts once and respects later removal',()=>{
 const old={...structuredClone(initialData),layoutVersion:3,widgets:['planner','pings']};
 const upgraded=readData(JSON.stringify(old));assert.deepEqual(upgraded.widgets,['planner','friends','pings']);
 upgraded.widgets=['planner'];assert.deepEqual(readData(JSON.stringify(upgraded)).widgets,['planner']);
});
