import test from 'node:test';
import assert from 'node:assert/strict';
import {activeOccurrence, safeEventUrl} from '../src/lib/motion-event-dates.ts';
const now=Date.parse('2026-11-05T09:00:00Z');
test('ongoing events remain visible until their end; expired events disappear',()=>{
 assert.equal(activeOccurrence({next_occurrence_at:'2026-11-05T08:00:00Z',ends_at:'2026-11-05T12:00:00Z'},now),'2026-11-05T08:00:00Z');
 assert.equal(activeOccurrence({next_occurrence_at:'2026-11-04T08:00:00Z',ends_at:'2026-11-04T12:00:00Z'},now),null);
});
test('recurring events advance to the next real session and do not run nonstop',()=>{
 const event={next_occurrence_at:'2026-10-30T16:30:00',ends_at:'2026-12-18T20:00:00',sessions:[{starts_at:'2026-10-30T16:30:00',ends_at:'2026-10-30T20:00:00'},{starts_at:'2026-11-06T16:30:00',ends_at:'2026-11-06T20:00:00'}]};
 assert.equal(activeOccurrence(event,now),'2026-11-06T16:30:00');
 assert.equal(activeOccurrence(event,Date.parse('2026-11-07T00:00:00Z')),null);
});
test('Kampala sessions use UTC+3 and external links reject credentials and unsafe protocols',()=>{
 assert.equal(activeOccurrence({next_occurrence_at:'2026-11-05T11:00:00'},now),null);
 assert.equal(safeEventUrl('javascript:alert(1)'),undefined);
 assert.equal(safeEventUrl('https://user:password@example.com'),undefined);
 assert.equal(safeEventUrl('https://x.com/i/status/123'),'https://x.com/i/status/123');
});
