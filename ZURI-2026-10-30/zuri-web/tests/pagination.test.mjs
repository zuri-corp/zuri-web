import './hooks.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
const {enquiryPage} = await import('../src/lib/enquiries/pagination.ts');
test('pagination accepts positive integer pages',()=>{assert.equal(enquiryPage('2'),2);assert.equal(enquiryPage('100'),100);});
test('pagination normalizes malformed or unsafe URL values',()=>{for(const value of [undefined,['2'],'0','-1','1.5','abc','9999999999999999999','100001']) assert.equal(enquiryPage(value),1);});
