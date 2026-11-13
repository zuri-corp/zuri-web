import test from 'node:test';
import assert from 'node:assert/strict';
import {auraSearch,matchesArea} from '../src/experience/auraSearch.ts';
import {parseRoute,routeHash} from '../src/experience/model.ts';
test('Viola keeps business type and location separate',()=>{
 assert.deepEqual(auraSearch('Find a café in Jinja'),{mode:'places',term:'café',area:'Jinja',category:'cafes'});
 assert.deepEqual(auraSearch('Find restaurant Spaces in Kampala'),{mode:'spaces',term:'restaurant',area:'Kampala',category:'restaurants'});
 assert.equal(auraSearch('Find developers in Kampala'),null);
 assert.equal(auraSearch('Find cafés near me').area,'');
 assert.equal(matchesArea({details:{location:'Central, Kampala, Uganda'}},'kampala'),true);
 assert.equal(matchesArea({details:{location:'Jinja'}},'Kampala'),false);
});
test('opening the Aura search preserves both fields',()=>{
 const route={world:'aura',tab:'Find',searchTerm:'cafés',searchArea:'Jinja',placeCategory:'cafes'};
 assert.deepEqual(parseRoute(routeHash(route)),route);
});
