import {test} from 'node:test';
import assert from 'node:assert/strict';
import {sourceLinks} from '../src/core/knowledge.ts';
import {reviewedAIMessages} from '../src/core/privacy.ts';
test('Viola source links are bounded internal references, kept outside reviewed AI messages',()=>{
 const source={id:'offer.business-website',title:'Business website',href:'/pricing#tech-pricing',revision:'1234567890abcdef',availability:'current'};
 assert.deepEqual(sourceLinks([source,source]),[source]);
 for(const href of ['https://evil.test','//evil.test','javascript:alert(1)','/pricing?secret=x'])assert.deepEqual(sourceLinks([{...source,href}]),[]);
 assert.deepEqual(reviewedAIMessages([{role:'assistant',content:'A guide price.',sources:[source]},{role:'user',content:'What is included?'}]),[{role:'assistant',content:'A guide price.'},{role:'user',content:'What is included?'}]);
});
