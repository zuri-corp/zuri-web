import { content, events, pings, projects, spaces, userMap, initialWalletTxs, initialWalletBalance,
  type Content, type Event, type Ping, type Project, type Space, type WalletTx } from '../data/catalog'

export interface Booking {
  id: string
  spaceId: string
  offeringId: string
  offeringName: string
  categoryName: string
  buyerId: string
  price: number
  detail: string
  status: 'confirmed' | 'pending'
  timestamp: string
}

export interface PrototypeState {
  version: 1
  walletBalance: number
  walletTxs: WalletTx[]
  purchasedTickets: string[]
  joinedPings: string[]
  contentItems: Content[]
  events: Event[]
  pings: Ping[]
  projects: Project[]
  spaces: Space[]
  bookings: Booking[]
  pausedOfferings: string[]
  passUses: Record<string, number>
  societyMemberships: Record<string, 'joined' | 'requested'>
  notificationsEnabled: boolean
  collabRequests: string[]
  topicMessages: Record<string, { userId: string; text: string; time: string }[]>
  comments: Record<string, { id: number; user: string; text: string }[]>
}

export const STORAGE_KEY = 'zuri.prototype.v1'
export const newId = (prefix: string) => `${prefix}-${crypto.randomUUID?.() ?? Array.from(crypto.getRandomValues(new Uint32Array(4)), value => value.toString(16).padStart(8, '0')).join('')}`
export const formatMoney = (amount: number) => `UGX ${new Intl.NumberFormat('en-UG', { maximumFractionDigits: 0 }).format(amount)}`
export const validAmount = (amount: number) => Number.isSafeInteger(amount) && amount >= 0

export function initialState(): PrototypeState {
  return structuredClone({ version: 1, walletBalance: initialWalletBalance, walletTxs: initialWalletTxs,
    purchasedTickets: [], joinedPings: [], contentItems: content, events, pings, projects, spaces,
    bookings: [], pausedOfferings: [], passUses: {}, societyMemberships: {}, notificationsEnabled: true, collabRequests: [], topicMessages: {}, comments: {} })
}

// Restore only a complete, recognizable snapshot. Bad or old storage must not crash rendering.
export function restoreState(raw: string | null): PrototypeState {
  if (!raw) return initialState()
  try {
    const value = JSON.parse(raw)
    if (!value || typeof value !== 'object') return initialState()
    const defaults = initialState()
    if (value.version !== 1 || !validAmount(value.walletBalance)) return defaults
    for (const key of ['walletTxs', 'purchasedTickets', 'joinedPings', 'contentItems', 'events', 'pings', 'projects', 'spaces', 'bookings', 'pausedOfferings']) {
      if (!Array.isArray(value[key])) return defaults
    }
    for (const key of ['contentItems', 'events', 'pings', 'projects', 'spaces']) {
      if (!value[key].length || value[key].some((record: any) => !record || typeof record.id !== 'string')) return defaults
    }
    for (const item of value.contentItems) {
      if (typeof item.caption !== 'string' || !['photo', 'video', 'reel', 'post'].includes(item.mediaType) ||
        ['taggedSpaceIds', 'taggedEventIds', 'taggedPingIds', 'taggedProjectIds', 'taggedSocietyIds'].some(key => !Array.isArray(item[key]))) return defaults
    }
    const strings = (record: any, keys: string[]) => keys.every(key => typeof record[key] === 'string')
    const array = (record: any, key: string) => Array.isArray(record[key]) && record[key].every((id: unknown) => typeof id === 'string')
    const unique = (items: { id: string }[]) => new Set(items.map(item => item.id)).size === items.length
    for (const key of ['contentItems', 'events', 'pings', 'projects', 'spaces', 'walletTxs', 'bookings']) if (!unique(value[key])) return defaults
    for (const key of ['purchasedTickets', 'joinedPings', 'pausedOfferings']) if (!value[key].every((id: unknown) => typeof id === 'string')) return defaults
    if (!value.passUses || typeof value.passUses !== 'object' || Object.values(value.passUses).some(amount => !validAmount(amount as number))) return defaults
    if (!value.societyMemberships || typeof value.societyMemberships !== 'object' || Object.values(value.societyMemberships).some(status => status !== 'joined' && status !== 'requested')) return defaults
    for (const item of value.spaces) {
      if (!strings(item, ['id', 'name', 'image', 'category', 'description', 'location', 'spaceType']) || !Number.isFinite(item.followers)) return defaults
      if (item.businessCategories && (!Array.isArray(item.businessCategories) || item.businessCategories.some((category: any) =>
        !strings(category, ['id', 'name', 'icon']) || !Array.isArray(category.offerings) || category.offerings.some((offering: any) =>
          !strings(offering, ['id', 'name', 'description', 'offeringType']) || !array(offering, 'images') || (offering.price !== undefined && !validAmount(offering.price)))))) return defaults
    }
    const hasSpace = (id: string) => value.spaces.some((space: Space) => space.id === id)
    for (const item of value.events) if (!strings(item, ['id', 'name', 'image', 'spaceId', 'organizerId', 'date', 'time', 'description']) || !userMap[item.organizerId] || !hasSpace(item.spaceId) || !array(item, 'attendeeIds') || !validAmount(item.price) || !Array.isArray(item.tickets) || !item.tickets.length || item.tickets.some((ticket: any) => !strings(ticket, ['type', 'label']) || !validAmount(ticket.price))) return defaults
    for (const item of value.pings) if (!strings(item, ['id', 'title', 'image', 'creatorId', 'spaceId', 'timestamp', 'description']) || !userMap[item.creatorId] || !hasSpace(item.spaceId) || !array(item, 'participantIds')) return defaults
    for (const item of value.projects) if (!strings(item, ['id', 'name', 'image', 'creatorId', 'description', 'category', 'status']) || !userMap[item.creatorId] || !array(item, 'contributorIds') || !array(item, 'spaceIds')) return defaults
    for (const item of value.contentItems) if (!userMap[item.creatorId]) return defaults
    for (const item of value.walletTxs) if (!strings(item, ['id', 'label', 'timestamp']) || !Number.isSafeInteger(item.amount) || !['credit', 'debit'].includes(item.type)) return defaults
    for (const item of value.bookings) if (!strings(item, ['id', 'spaceId', 'offeringId', 'offeringName', 'categoryName', 'buyerId', 'detail', 'timestamp']) || !validAmount(item.price) || !['pending', 'confirmed'].includes(item.status)) return defaults
    if (value.collabRequests !== undefined && (!Array.isArray(value.collabRequests) || !value.collabRequests.every((id: unknown) => typeof id === 'string'))) return defaults
    for (const key of ['topicMessages', 'comments']) {
      if (value[key] !== undefined && (!value[key] || typeof value[key] !== 'object' || Object.values(value[key]).some(items => !Array.isArray(items) || items.some(item => !item || typeof item.text !== 'string')))) return defaults
    }
    return { ...defaults, ...value }
  } catch { return initialState() }
}

export type Purchase = {
  amount: number
  label: string
  ticketId?: string
  bookings?: Omit<Booking, 'id' | 'timestamp' | 'status'>[]
}

// Debit, receipt and entitlement are one synchronous transition, including free tickets.
export function purchase(state: PrototypeState, input: Purchase): PrototypeState | null {
  if (!validAmount(input.amount) || input.amount > state.walletBalance || !input.label.trim()) return null
  if (input.ticketId && (state.purchasedTickets.includes(input.ticketId) || !state.events.some(e => e.id === input.ticketId))) return null
  if (input.ticketId && !state.events.find(e => e.id === input.ticketId)?.tickets.some(ticket => ticket.price === input.amount)) return null
  if (input.bookings?.some(b => !validAmount(b.price) || state.pausedOfferings.includes(b.offeringId))) return null
  if (input.bookings && input.bookings.reduce((total, booking) => total + booking.price, 0) !== input.amount) return null
  if (input.bookings?.some(b => state.bookings.some(existing => existing.offeringId === b.offeringId && existing.detail === b.detail && !b.detail.startsWith('Qty ')))) return null
  const timestamp = new Date().toISOString()
  return { ...state,
    walletBalance: state.walletBalance - input.amount,
    walletTxs: [{ id: newId('tx'), label: input.label, amount: -input.amount, type: 'debit', timestamp }, ...state.walletTxs],
    purchasedTickets: input.ticketId ? [...state.purchasedTickets, input.ticketId] : state.purchasedTickets,
    bookings: [...(input.bookings || []).map(b => ({ ...b, id: newId('booking'), timestamp, status: 'confirmed' as const })), ...state.bookings],
  }
}
