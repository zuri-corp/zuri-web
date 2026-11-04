import { test } from 'node:test'
import assert from 'node:assert/strict'
import { initialState, purchase, restoreState, formatMoney, newId } from '../src/state/core.ts'
import { parseDestination, destinationHash } from '../src/state/navigation.ts'

test('newly created event can be purchased and survives restoration', () => {
  const state = initialState()
  state.events.unshift({ ...state.events[0], id: 'new-event', tickets: [{ type: 'regular', label: 'Regular', price: 25000 }] })
  const next = purchase(state, { amount: 25000, ticketId: 'new-event', label: 'New event ticket' })
  assert.equal(next.walletBalance, state.walletBalance - 25000)
  assert.equal(next.walletTxs.length, state.walletTxs.length + 1)
  assert.ok(next.purchasedTickets.includes('new-event'))
  assert.deepEqual(restoreState(JSON.stringify(next)), next)
  assert.equal(state.walletBalance, 340000, 'transition does not mutate the old snapshot')
})
test('wallet rejects insufficient, negative, fractional, non-finite and unsafe amounts', () => {
  const state = initialState()
  for (const amount of [380000, -1, 0.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1]) {
    assert.equal(purchase(state, { amount, label: 'Invalid purchase' }), null)
  }
  assert.equal(state.walletTxs.length, 4)
})
test('repeated ticket purchase is idempotent and price tampering is rejected', () => {
  const state = initialState()
  const event = state.events[0]
  assert.equal(purchase(state, { amount: 1, ticketId: event.id, label: 'Tampered' }), null)
  const next = purchase(state, { amount: event.tickets[0].price, ticketId: event.id, label: 'Ticket' })
  assert.equal(purchase(next, { amount: event.tickets[0].price, ticketId: event.id, label: 'Ticket' }), null)
})
test('free tickets work without adding or deducting funds', () => {
  const state = initialState()
  const event = state.events.find(event => event.isFree)
  const next = purchase(state, { amount: 0, ticketId: event.id, label: 'Free RSVP' })
  assert.equal(next.walletBalance, state.walletBalance)
  assert.ok(next.purchasedTickets.includes(event.id))
})
test('bookings and receipts are atomic; paused and duplicate entitlements are declined', () => {
  const state = initialState()
  const booking = { spaceId: 's4', offeringId: 'bo14', offeringName: 'Pass', categoryName: 'Passes', buyerId: 'me', price: 75000, detail: 'Pass purchase' }
  const next = purchase(state, { amount: 75000, label: 'Pass', bookings: [booking] })
  assert.equal(next.bookings.length, 1)
  assert.equal(next.walletTxs[0].amount, -75000)
  assert.equal(purchase(next, { amount: 75000, label: 'Pass', bookings: [booking] }), null)
  state.pausedOfferings.push('bo14')
  assert.equal(purchase(state, { amount: 75000, label: 'Pass', bookings: [booking] }), null)
})
test('saved shared records, membership and pass usage round-trip together', () => {
  const state = initialState()
  state.pings.unshift({ ...state.pings[0], id: 'new-ping' })
  state.projects.unshift({ ...state.projects[0], id: 'new-project' })
  state.contentItems.unshift({ ...state.contentItems[0], id: 'new-content', taggedPingIds: ['new-ping'], taggedProjectIds: ['new-project'] })
  state.passUses.bo14 = 3
  state.societyMemberships.soc3 = 'requested'
  assert.deepEqual(restoreState(JSON.stringify(state)), state)
})
test('corrupt or incompatible storage resets safely', () => {
  for (const raw of [null, '{bad', 'null', '{}', JSON.stringify({ ...initialState(), walletBalance: -1 }), JSON.stringify({ ...initialState(), events: null }), JSON.stringify({ ...initialState(), contentItems: [{ id: 'broken' }] })]) {
    assert.deepEqual(restoreState(raw), initialState())
  }
})
test('normal wallet uses explicit UGX amounts', () => {
  assert.equal(formatMoney(50000), 'UGX 50,000')
  assert.equal(formatMoney(0), 'UGX 0')
})
test('cross-app URLs preserve context and numeric ticket price', () => {
  const hash = destinationHash('motion', { screen: 'ticket_confirm', params: { eventId: 'new-event', ticketType: 'regular', price: 25000 } })
  assert.deepEqual(parseDestination(hash), { app: 'motion', route: { screen: 'ticket_confirm', params: { eventId: 'new-event', ticketType: 'regular', price: 25000 } } })
})
test('invalid routes and incomplete ticket links fall back to usable home screens', () => {
  assert.equal(parseDestination('#/missing/home').app, 'home')
  for (const hash of ['#/motion/not-a-screen', '#/motion/event_detail', '#/motion/ticket_confirm?eventId=e1&ticketType=regular&price=-1', '#/motion/ticket_confirm?eventId=e1&ticketType=regular&price=nope']) {
    assert.deepEqual(parseDestination(hash), { app: 'motion', route: { screen: 'home' } })
  }
})
test('record identifiers work without the secure-context randomUUID API', () => {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'crypto')
  const cryptoSource = globalThis.crypto
  Object.defineProperty(globalThis, 'crypto', { configurable: true, value: { getRandomValues: cryptoSource.getRandomValues.bind(cryptoSource) } })
  try {
    const first = newId('event'), second = newId('event')
    assert.match(first, /^event-[a-f0-9]{32}$/)
    assert.notEqual(first, second)
  } finally { Object.defineProperty(globalThis, 'crypto', original) }
})
test('incomplete nested saved records cannot break detail rendering', () => {
  for (const changed of [{ events: [] }, { events: [{ id: 'bad' }] }, { spaces: [{ id: 'bad' }] }, { passUses: null }, { topicMessages: { t1: null } }]) {
    assert.deepEqual(restoreState(JSON.stringify({ ...initialState(), ...changed })), initialState())
  }
})
test('a failed cart never creates a partial booking or receipt', () => {
  const state = initialState()
  const booking = { spaceId: 's4', offeringId: 'bo14', offeringName: 'Pass', categoryName: 'Passes', buyerId: 'me', price: 75000, detail: 'Pass purchase' }
  assert.equal(purchase(state, { amount: 1, label: 'Invalid cart', bookings: [booking] }), null)
  assert.equal(state.bookings.length, 0)
  assert.equal(state.walletBalance, 340000)
})
