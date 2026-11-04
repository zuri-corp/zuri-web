import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {objectRoute,parseRoute,routeHash} from '../src/experience/model.ts';
import {currentOpportunity,matchOpportunities} from '../src/experience/opportunityModel.ts';
test('opportunity route remains inside Motion and survives deep links',()=>{
 const route=objectRoute('opportunities','discover');assert.equal(route.world,'motion');assert.deepEqual(parseRoute(routeHash(route)),route);
});
test('mobile discovery excludes withdrawn records and copied contracts match the server',()=>{
 assert.equal(currentOpportunity({status:'withdrawn',fresh_until:'2099-01-01'}),false);
 assert.deepEqual(matchOpportunities([],{interests:['music'],location:'Kampala'}),[]);
 assert.equal(readFileSync(new URL('../src/experience/opportunityModel.ts',import.meta.url),'utf8'),readFileSync(new URL('../../zuri-web/src/lib/opportunities/model.ts',import.meta.url),'utf8'));
});
