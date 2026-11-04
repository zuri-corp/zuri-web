import {test} from 'node:test';
import assert from 'node:assert/strict';
import {matchesContext} from '../src/experience/contextFilter.ts';
test('context filtering distinguishes kinds, exact objects and untagged records',()=>{
 const refs=[{kind:'space',id:'1'},{kind:'society',id:'2'}];
 assert.equal(matchesContext(refs,'space',''),true);
 assert.equal(matchesContext(refs,'space','1'),true);
 assert.equal(matchesContext(refs,'society','1'),false);
 assert.equal(matchesContext(refs,'ping',''),false);
 assert.equal(matchesContext(refs,'untagged',''),false);
 assert.equal(matchesContext([],'untagged',''),true);
 assert.equal(matchesContext([],'all',''),true);
 assert.deepEqual(refs,[{kind:'space',id:'1'},{kind:'society',id:'2'}]);
});
