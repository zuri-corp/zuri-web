export interface User {
  id: string
  name: string
  handle: string
  avatar: string
  bio: string
  role: string
  xp: number
  aura: number
  rizz: number
  motion: number
  isCreator?: boolean
  tier?: 'ordinary' | 'expert' | 'elite'
}

export type OfferingType = 'product' | 'appointment' | 'rental' | 'subscription' | 'pass' | 'info'

export interface BusinessOffering {
  id: string
  name: string
  images: string[]
  description: string
  price?: number
  priceLabel?: string
  offeringType: OfferingType
  variants?: string[]              // product — size/color/etc chips
  slots?: string[]                 // appointment/rental — pickable time or date slots
  billingCycle?: 'weekly' | 'monthly' | 'yearly'   // subscription
  totalCredits?: number            // pass — total redemptions included
}

export interface BusinessCategory {
  id: string
  name: string
  icon: string
  offerings: BusinessOffering[]
}

export type FindCategory = 'shop' | 'merch' | 'stay' | 'dine' | 'experiences' | 'services' | 'offers'

export interface Space {
  id: string
  name: string
  image: string
  category: string
  description: string
  location: string
  pingCount: number
  eventCount: number
  rizzCount: number
  projectCount: number
  societyCount: number
  followers: number
  spaceType: 'ordinary' | 'establishment' | 'temporary'
  ownerId?: string
  findCategories?: FindCategory[]
  offer?: { label: string; detail: string }
  businessCategories?: BusinessCategory[]
}

export interface Society {
  id: string
  name: string
  image: string
  description: string
  memberCount: number
  privacy: 'public' | 'private'
  spaceIds: string[]
  eventIds: string[]
  projectIds: string[]
  pingIds: string[]
  topicCount: number
}

export interface Ping {
  id: string
  title: string
  image: string
  creatorId: string
  spaceId: string
  timestamp: string
  participantIds: string[]
  isRecurring: boolean
  recurringLabel?: string
  societyId?: string
  eventId?: string
  description: string
  mediaCount: number
}

export interface Event {
  id: string
  name: string
  image: string
  spaceId: string
  organizerId: string
  date: string
  time: string
  price: number
  isFree: boolean
  attendeeIds: string[]
  description: string
  societyId?: string
  tickets: { type: string; price: number; label: string }[]
}

export interface Project {
  id: string
  name: string
  image: string
  creatorId: string
  contributorIds: string[]
  description: string
  category: string
  status: string
  spaceIds: string[]
  societyId?: string
  mediaCount: number
  updateCount: number
}

export interface Content {
  id: string
  creatorId: string
  media?: string
  mediaType: 'photo' | 'video' | 'reel' | 'post'
  caption: string
  createdAt: string
  taggedSpaceIds: string[]
  taggedEventIds: string[]
  taggedPingIds: string[]
  taggedProjectIds: string[]
  taggedSocietyIds: string[]
  reactions: number
  comments: number
}

export interface Product {
  id: string
  name: string
  image: string
  sellerId: string
  spaceId?: string
  price: number
  category: string
  description: string
  inStock: boolean
  findCategory?: 'shop' | 'merch'
  contextLabel?: string        // e.g. "Creator merch", "Event merch", "Project merch"
  eventId?: string
  projectId?: string
}

export interface Trip {
  id: string
  type: 'share' | 'split' | 'hosted'
  eventId: string
  organizerId: string
  participantIds: string[]
  departure: string
  destination: string
  time: string
  seats?: number
}

export interface WalletTx {
  id: string
  label: string
  amount: number
  type: 'credit' | 'debit'
  timestamp: string
}

// --- Users ---

/** Public runtime catalog starts empty. Only verified API responses belong in live screens. */
export const users: User[] = [];
export const spaces: Space[] = [];
export const societies: Society[] = [];
export const pings: Ping[] = [];
export const events: Event[] = [];
export const projects: Project[] = [];
export const content: Content[] = [];
export const products: Product[] = [];
export const trips: Trip[] = [];
export const initialWalletTxs: WalletTx[] = [];
export const initialWalletBalance = 0;
export const societyTopics: {id:string;societyId:string;title:string;creatorId:string;participantIds:string[];replies:number;engaged:number;timestamp:string;isPinned:boolean;messages:{userId:string;text:string;time:string}[]}[]=[];
export const eventMemories:string[]=[];
export const userMap = Object.fromEntries(users.map(x=>[x.id,x]));
export const spaceMap = Object.fromEntries(spaces.map(x=>[x.id,x]));
export const societyMap = Object.fromEntries(societies.map(x=>[x.id,x]));
export const pingMap = Object.fromEntries(pings.map(x=>[x.id,x]));
export const eventMap = Object.fromEntries(events.map(x=>[x.id,x]));
export const projectMap = Object.fromEntries(projects.map(x=>[x.id,x]));
export const productMap = Object.fromEntries(products.map(x=>[x.id,x]));
