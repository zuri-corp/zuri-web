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
export const users: User[] = [
  {
    id: 'me', name: 'Alex Kato', handle: 'alex.kato', avatar: 'https://i.pravatar.cc/150?img=3',
    bio: 'Always in motion · Jinja based', role: 'Member',
    xp: 75, aura: 140, rizz: 42, motion: 28, tier: 'ordinary',
  },
  {
    id: 'u1',
    name: 'Maya Nakato',
    handle: 'maya.nakato',
    avatar: 'https://i.pravatar.cc/150?img=47',
    bio: 'Photographer · Nile Nights creator',
    role: 'Creator',
    xp: 840, aura: 1200, rizz: 310, motion: 89,
    isCreator: true, tier: 'expert',
  },
  {
    id: 'u2',
    name: 'James Sserugo',
    handle: 'james.s',
    avatar: 'https://i.pravatar.cc/150?img=12',
    bio: 'Sound engineer · rafting on weekends',
    role: 'Contributor',
    xp: 420, aura: 580, rizz: 140, motion: 210,
    tier: 'ordinary',
  },
  {
    id: 'u3',
    name: 'Sarah Amara',
    handle: 'sarah.amara',
    avatar: 'https://i.pravatar.cc/150?img=32',
    bio: 'Event organizer · Nile culture',
    role: 'Organizer',
    xp: 680, aura: 950, rizz: 205, motion: 340,
    isCreator: true, tier: 'expert',
  },
  {
    id: 'u4',
    name: 'David Ochieng',
    handle: 'david.o',
    avatar: 'https://i.pravatar.cc/150?img=65',
    bio: 'Dev · community projects',
    role: 'Contributor',
    xp: 560, aura: 400, rizz: 90, motion: 120,
    tier: 'ordinary',
  },
  {
    id: 'u5',
    name: 'Priya Mehta',
    handle: 'priya.m',
    avatar: 'https://i.pravatar.cc/150?img=44',
    bio: 'Musician · Afrobeats × Indie',
    role: 'Creator',
    xp: 730, aura: 1400, rizz: 520, motion: 180,
    isCreator: true, tier: 'elite',
  },
  {
    id: 'u6',
    name: 'Kwame Asante',
    handle: 'kwame.a',
    avatar: 'https://i.pravatar.cc/150?img=8',
    bio: 'Filmmaker · street stories',
    role: 'Creator',
    xp: 490, aura: 720, rizz: 280, motion: 95,
    isCreator: true, tier: 'expert',
  },
  {
    id: 'u7',
    name: 'Trisha Naigaga',
    handle: 'trisha.n',
    avatar: 'https://i.pravatar.cc/150?img=25',
    bio: 'pov: i document the chaos 🎥 · gen z certified',
    role: 'Creator',
    xp: 220, aura: 610, rizz: 890, motion: 140,
    isCreator: true, tier: 'ordinary',
  },
]

export const userMap = Object.fromEntries(users.map(u => [u.id, u]))

// --- Spaces ---
export const spaces: Space[] = [
  {
    id: 's1',
    name: 'Walukuba Barbarians RFC',
    image: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&h=500&fit=crop&auto=format',
    category: 'Sports & Entertainment',
    description: 'Jinja\'s home of rugby. Match days, socials, and the loudest touchline in Busoga.',
    location: 'Walukuba, Jinja',
    pingCount: 34,
    eventCount: 2,
    rizzCount: 21,
    projectCount: 2,
    societyCount: 5,
    followers: 3120,
    spaceType: 'ordinary',
  },
  {
    id: 's2',
    name: '2 Friends Beach Lounge',
    image: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800&h=500&fit=crop&auto=format',
    category: 'Nightlife & Leisure',
    description: 'The Nile-side hangout everyone ends up at eventually. Sunsets, bonfires, and late nights.',
    location: 'Nile Shore, Jinja',
    pingCount: 26,
    eventCount: 1,
    rizzCount: 39,
    projectCount: 1,
    societyCount: 3,
    followers: 5600,
    spaceType: 'ordinary',
    findCategories: ['dine'],
  },
  {
    id: 's3',
    name: 'Adonai Plaza',
    image: 'https://images.unsplash.com/photo-1555529669-e69e7aa0ba9a?w=800&h=500&fit=crop&auto=format',
    category: 'Shopping',
    description: 'Jinja Town\'s go-to plaza — where everyone meets to shop, eat and hang.',
    location: 'Main Street, Jinja',
    pingCount: 12,
    eventCount: 0,
    rizzCount: 17,
    projectCount: 0,
    societyCount: 1,
    followers: 2100,
    spaceType: 'establishment',
    findCategories: ['shop', 'offers'],
    offer: { label: '10% off this week', detail: 'On all Home & Living items' },
    businessCategories: [
      {
        id: 'bc1', name: 'Kids', icon: '🧒',
        offerings: [
          { id: 'bo1', name: 'Air Trail Jr. Sneakers', images: ['https://images.unsplash.com/photo-1514989940723-e8e51635b782?w=600&h=600&fit=crop&auto=format'], description: 'Lightweight kids sneakers built for the school run and the playground.', price: 35000, priceLabel: 'UGX 35,000', offeringType: 'product', variants: ['UK 10', 'UK 11', 'UK 12', 'UK 13'] },
          { id: 'bo2', name: 'School Backpack Set', images: ['https://images.unsplash.com/photo-1622560480605-d83c853bc5c3?w=600&h=600&fit=crop&auto=format'], description: 'Backpack, lunch box and pencil case bundle in matching prints.', price: 22000, priceLabel: 'UGX 22,000', offeringType: 'product' },
        ],
      },
      {
        id: 'bc2', name: 'Adults', icon: '👕',
        offerings: [
          { id: 'bo3', name: 'Urban Utility Jacket', images: ['https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=600&h=600&fit=crop&auto=format'], description: 'Water-resistant shell jacket, unisex fit, four seasons.', price: 68000, priceLabel: 'UGX 68,000', offeringType: 'product', variants: ['S', 'M', 'L', 'XL'] },
          { id: 'bo4', name: 'Classic Denim Set', images: ['https://images.unsplash.com/photo-1542272604-787c3835535d?w=600&h=600&fit=crop&auto=format'], description: 'Straight-fit denim jacket and jeans, sold as a set.', price: 54000, priceLabel: 'UGX 54,000', offeringType: 'product', variants: ['30', '32', '34', '36'] },
        ],
      },
      {
        id: 'bc3', name: 'Home & Living', icon: '🏠',
        offerings: [
          { id: 'bo5', name: 'Ceramic Dinnerware Set', images: ['https://images.unsplash.com/photo-1584346133934-a3afd2a33f4d?w=600&h=600&fit=crop&auto=format'], description: '16-piece hand-glazed ceramic dinnerware, service for 4.', price: 40000, priceLabel: 'UGX 40,000', offeringType: 'product' },
        ],
      },
      {
        id: 'bc7', name: 'Membership', icon: '💳',
        offerings: [
          { id: 'bo12', name: 'Adonai Rewards', images: ['https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=600&h=600&fit=crop&auto=format'], description: 'Monthly perks: 10% off every purchase, early access to sales, free alterations.', price: 8000, priceLabel: 'UGX 8,000 / month', offeringType: 'subscription', billingCycle: 'monthly' },
        ],
      },
    ],
  },
  {
    id: 's4',
    name: 'Jinja Nile Resort',
    image: 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=800&h=500&fit=crop&auto=format',
    category: 'Hospitality & Leisure',
    description: 'Premium riverside resort — rooms, dining, events and wellness on the banks of the Nile.',
    location: 'Nile Avenue, Jinja',
    pingCount: 9,
    eventCount: 1,
    rizzCount: 14,
    projectCount: 1,
    societyCount: 2,
    followers: 2640,
    spaceType: 'establishment',
    ownerId: 'me',
    findCategories: ['stay', 'dine', 'offers'],
    offer: { label: 'Free breakfast', detail: 'On 2+ night stays this month' },
    businessCategories: [
      {
        id: 'bc4', name: 'Hospitality', icon: '🏨',
        offerings: [
          { id: 'bo6', name: 'Executive Conference Hall', images: ['https://images.unsplash.com/photo-1517502884422-41eaead166d4?w=600&h=600&fit=crop&auto=format', 'https://images.unsplash.com/photo-1431540015161-0bf868a2d407?w=600&h=600&fit=crop&auto=format'], description: 'Seats up to 120, full AV setup, catering available on request.', price: 180000, priceLabel: 'UGX 180,000 / day', offeringType: 'rental', slots: ['Sat 13 Sep', 'Sun 14 Sep', 'Sat 20 Sep', 'Sun 21 Sep'] },
          { id: 'bo7', name: 'Riverside Wedding Venue', images: ['https://images.unsplash.com/photo-1519741497674-611481863552?w=600&h=600&fit=crop&auto=format'], description: 'Open-air venue right on the Nile, seats 200, evening lighting included.', price: 450000, priceLabel: 'UGX 450,000 / day', offeringType: 'rental', slots: ['Sat 20 Sep', 'Sat 27 Sep', 'Sat 4 Oct'] },
          { id: 'bo13', name: 'Free WiFi & Parking', images: ['https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=600&h=600&fit=crop&auto=format'], description: 'Complimentary high-speed WiFi and secure parking for all guests and event attendees.', offeringType: 'info' },
        ],
      },
      {
        id: 'bc5', name: 'Meals', icon: '🍽️',
        offerings: [
          { id: 'bo8', name: 'Breakfast Buffet', images: ['https://images.unsplash.com/photo-1533089860892-a7c6f0a88666?w=600&h=600&fit=crop&auto=format'], description: 'Full continental and local spread, Nile view included.', price: 18000, priceLabel: 'UGX 18,000 / person', offeringType: 'appointment', slots: ['6:30 AM', '7:30 AM', '8:30 AM', '9:30 AM'] },
          { id: 'bo9', name: 'Private Dinner Setup', images: ['https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=600&h=600&fit=crop&auto=format'], description: 'Candlelit table for two right by the water, set menu included.', price: 90000, priceLabel: 'UGX 90,000', offeringType: 'appointment', slots: ['7:00 PM', '8:00 PM', '9:00 PM'] },
        ],
      },
      {
        id: 'bc6', name: 'Rooms', icon: '🛏️',
        offerings: [
          { id: 'bo10', name: 'Deluxe Nile-View Room', images: ['https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=600&h=600&fit=crop&auto=format'], description: 'River-view room, king bed, breakfast included.', price: 220000, priceLabel: 'UGX 220,000 / night', offeringType: 'rental', slots: ['Tonight', 'Fri 12 Sep', 'Sat 13 Sep', 'Sun 14 Sep'] },
          { id: 'bo11', name: 'Executive Suite', images: ['https://images.unsplash.com/photo-1591088398332-8a7791972843?w=600&h=600&fit=crop&auto=format'], description: 'Separate lounge area, king bed, private balcony over the river.', price: 380000, priceLabel: 'UGX 380,000 / night', offeringType: 'rental', slots: ['Tonight', 'Fri 12 Sep', 'Sat 13 Sep'] },
        ],
      },
      {
        id: 'bc8', name: 'Passes', icon: '🎫',
        offerings: [
          { id: 'bo14', name: '5-Visit Pool Day Pass', images: ['https://images.unsplash.com/photo-1571902943202-507ec2618e8f?w=600&h=600&fit=crop&auto=format'], description: 'Five day-passes to the pool and riverside deck, valid any day, use anytime.', price: 75000, priceLabel: 'UGX 75,000 total', offeringType: 'pass', totalCredits: 5 },
        ],
      },
      {
        id: 'bc9', name: 'Membership', icon: '💳',
        offerings: [
          { id: 'bo15', name: 'Nile Resort Fitness & Pool', images: ['https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=600&h=600&fit=crop&auto=format'], description: 'Unlimited access to the gym, pool and sauna. Cancel anytime.', price: 60000, priceLabel: 'UGX 60,000 / month', offeringType: 'subscription', billingCycle: 'monthly' },
        ],
      },
    ],
  },
  {
    id: 's5',
    name: 'Gately on Nile',
    image: 'https://images.unsplash.com/photo-1445019980597-93fa8acb246c?w=800&h=500&fit=crop&auto=format',
    category: 'Hospitality',
    description: 'Historic colonial-era hotel turned boutique stay, right on the water.',
    location: 'Nile Crescent, Jinja',
    pingCount: 3,
    eventCount: 0,
    rizzCount: 6,
    projectCount: 0,
    societyCount: 0,
    followers: 980,
    spaceType: 'establishment',
    findCategories: ['stay'],
    businessCategories: [
      {
        id: 'bc10', name: 'Rooms', icon: '🛏️',
        offerings: [
          { id: 'bo16', name: 'Garden Cottage', images: ['https://images.unsplash.com/photo-1598928506311-c55ded91a20c?w=600&h=600&fit=crop&auto=format'], description: 'Standalone cottage in the garden, queen bed, breakfast included.', price: 140000, priceLabel: 'UGX 140,000 / night', offeringType: 'rental', slots: ['Tonight', 'Fri 12 Sep', 'Sat 13 Sep'] },
          { id: 'bo17', name: 'Nile-View Suite', images: ['https://images.unsplash.com/photo-1611892440504-42a792e24d32?w=600&h=600&fit=crop&auto=format'], description: 'Top-floor suite overlooking the river, king bed.', price: 260000, priceLabel: 'UGX 260,000 / night', offeringType: 'rental', slots: ['Tonight', 'Sat 13 Sep', 'Sun 14 Sep'] },
        ],
      },
    ],
  },
  {
    id: 's6',
    name: '2 Friends Guest House',
    image: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800&h=500&fit=crop&auto=format',
    category: 'Hospitality',
    description: 'Budget-friendly guest house a short walk from the Nile, popular with backpackers.',
    location: 'Clive Road, Jinja',
    pingCount: 5,
    eventCount: 0,
    rizzCount: 4,
    projectCount: 0,
    societyCount: 0,
    followers: 640,
    spaceType: 'establishment',
    findCategories: ['stay'],
    businessCategories: [
      {
        id: 'bc11', name: 'Rooms', icon: '🛏️',
        offerings: [
          { id: 'bo18', name: 'Shared Dorm Bed', images: ['https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=600&h=600&fit=crop&auto=format'], description: '6-bed mixed dorm, lockers included, shared bathroom.', price: 25000, priceLabel: 'UGX 25,000 / night', offeringType: 'rental', slots: ['Tonight', 'Fri 12 Sep', 'Sat 13 Sep', 'Sun 14 Sep'] },
          { id: 'bo19', name: 'Private Double Room', images: ['https://images.unsplash.com/photo-1595576508898-0ad5c879a061?w=600&h=600&fit=crop&auto=format'], description: 'Private room, double bed, ensuite bathroom.', price: 65000, priceLabel: 'UGX 65,000 / night', offeringType: 'rental', slots: ['Tonight', 'Fri 12 Sep', 'Sat 13 Sep'] },
        ],
      },
    ],
  },
  {
    id: 's7',
    name: 'Kingfisher Safaris Resort',
    image: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=800&h=500&fit=crop&auto=format',
    category: 'Hospitality',
    description: 'Sprawling riverside resort with gardens, a pool, and Nile-facing dining.',
    location: 'Kimaka, Jinja',
    pingCount: 4,
    eventCount: 0,
    rizzCount: 8,
    projectCount: 0,
    societyCount: 1,
    followers: 1420,
    spaceType: 'establishment',
    findCategories: ['stay', 'dine'],
    businessCategories: [
      {
        id: 'bc12', name: 'Rooms', icon: '🛏️',
        offerings: [
          { id: 'bo20', name: 'Standard Garden Room', images: ['https://images.unsplash.com/photo-1631049035182-249067d7618e?w=600&h=600&fit=crop&auto=format'], description: 'Garden-facing room, twin or double bed.', price: 110000, priceLabel: 'UGX 110,000 / night', offeringType: 'rental', slots: ['Tonight', 'Fri 12 Sep', 'Sat 13 Sep'] },
        ],
      },
      {
        id: 'bc13', name: 'Dining', icon: '🍽️',
        offerings: [
          { id: 'bo21', name: 'Nile-View Sunday Lunch', images: ['https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=600&h=600&fit=crop&auto=format'], description: 'Buffet lunch on the terrace overlooking the river.', price: 22000, priceLabel: 'UGX 22,000 / person', offeringType: 'appointment', slots: ['12:00 PM', '1:00 PM', '2:00 PM'] },
        ],
      },
    ],
  },
  {
    id: 's8',
    name: 'Source of the Nile Gardens',
    image: 'https://images.unsplash.com/photo-1516426122078-c23e76319801?w=800&h=500&fit=crop&auto=format',
    category: 'Cultural & Heritage Site',
    description: 'Where the Nile begins its journey to the Mediterranean. Gardens, monuments, and boat rides to the source point.',
    location: 'Njeru, Jinja',
    pingCount: 18,
    eventCount: 0,
    rizzCount: 44,
    projectCount: 1,
    societyCount: 1,
    followers: 6200,
    spaceType: 'ordinary',
    findCategories: ['experiences'],
  },
  {
    id: 's9',
    name: 'Nyege Nyege Festival Grounds',
    image: 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=800&h=500&fit=crop&auto=format',
    category: 'Festival Grounds',
    description: 'Temporary grounds set up along the Nile for Nyege Nyege — East Africa\'s biggest music and arts festival.',
    location: 'Itanda, near Jinja',
    pingCount: 22,
    eventCount: 1,
    rizzCount: 61,
    projectCount: 0,
    societyCount: 1,
    followers: 8900,
    spaceType: 'temporary',
  },
  {
    id: 's10',
    name: 'The Keep Restaurant',
    image: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&h=500&fit=crop&auto=format',
    category: 'Restaurant',
    description: 'Jinja Town favourite for wood-fired pizza, grills and long lunches.',
    location: 'Main Street, Jinja',
    pingCount: 7, eventCount: 0, rizzCount: 12, projectCount: 0, societyCount: 0,
    followers: 1340,
    spaceType: 'establishment',
    findCategories: ['dine', 'offers'],
    offer: { label: '2-for-1 pizza', detail: 'Tuesdays, dine-in only' },
    businessCategories: [
      {
        id: 'bc14', name: 'Menu', icon: '🍕',
        offerings: [
          { id: 'bo22', name: 'Wood-Fired Margherita', images: ['https://images.unsplash.com/photo-1604068549290-dea0e4a305ca?w=600&h=600&fit=crop&auto=format'], description: 'San Marzano tomato, fresh mozzarella, basil.', price: 15000, priceLabel: 'UGX 15,000', offeringType: 'product' },
          { id: 'bo23', name: 'Nile Perch Grill', images: ['https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=600&h=600&fit=crop&auto=format'], description: 'Fresh catch, chargrilled, served with greens and chips.', price: 24000, priceLabel: 'UGX 24,000', offeringType: 'product' },
        ],
      },
      {
        id: 'bc15', name: 'Reservations', icon: '🪑',
        offerings: [
          { id: 'bo24', name: 'Table for Two', images: ['https://images.unsplash.com/photo-1592861956120-e524fc739696?w=600&h=600&fit=crop&auto=format'], description: 'Reserve a table in the garden section.', offeringType: 'appointment', slots: ['6:30 PM', '7:30 PM', '8:30 PM'] },
        ],
      },
    ],
  },
  {
    id: 's11',
    name: 'Nile River Explorers',
    image: 'https://images.unsplash.com/photo-1530866495561-507c9faab8f6?w=800&h=500&fit=crop&auto=format',
    category: 'Adventure & Tours',
    description: 'Grade 5 white-water rafting, kayaking and sunset cruises on the Nile since 1996.',
    location: 'Bujagali, Jinja',
    pingCount: 11, eventCount: 0, rizzCount: 28, projectCount: 0, societyCount: 1,
    followers: 4700,
    spaceType: 'establishment',
    findCategories: ['experiences'],
    businessCategories: [
      {
        id: 'bc16', name: 'On the water', icon: '🚣',
        offerings: [
          { id: 'bo25', name: 'Full-Day Rafting', images: ['https://images.unsplash.com/photo-1530866495561-507c9faab8f6?w=600&h=600&fit=crop&auto=format'], description: 'Grade 5 rapids, lunch and transport included. No experience needed.', price: 95000, priceLabel: 'UGX 95,000 / person', offeringType: 'appointment', slots: ['Sat 13 Sep', 'Sun 14 Sep', 'Sat 20 Sep'] },
          { id: 'bo26', name: 'Sunset Cruise', images: ['https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=600&h=600&fit=crop&auto=format'], description: 'Two hours on the water with drinks as the sun goes down.', price: 40000, priceLabel: 'UGX 40,000 / person', offeringType: 'appointment', slots: ['5:30 PM daily'] },
        ],
      },
    ],
  },
  {
    id: 's12',
    name: 'Jinja Boda Collective',
    image: 'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?w=800&h=500&fit=crop&auto=format',
    category: 'Transport Service',
    description: 'Registered boda riders operating across Jinja Town. Fixed fares, tracked trips.',
    location: 'Jinja Town',
    pingCount: 2, eventCount: 0, rizzCount: 3, projectCount: 0, societyCount: 1,
    followers: 890,
    spaceType: 'establishment',
    findCategories: ['services'],
    businessCategories: [
      {
        id: 'bc17', name: 'Rides', icon: '🛵',
        offerings: [
          { id: 'bo27', name: 'Town Ride', images: ['https://images.unsplash.com/photo-1558981403-c5f9899a28bc?w=600&h=600&fit=crop&auto=format'], description: 'Point-to-point within Jinja Town. Fixed fare, no haggling.', price: 5000, priceLabel: 'UGX 5,000', offeringType: 'product' },
          { id: 'bo28', name: 'Airport Transfer', images: ['https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?w=600&h=600&fit=crop&auto=format'], description: 'Jinja to Entebbe International. Car, not boda. Book 24h ahead.', price: 120000, priceLabel: 'UGX 120,000', offeringType: 'appointment', slots: ['Early AM', 'Midday', 'Evening'] },
        ],
      },
    ],
  },
  {
    id: 's13',
    name: 'Busoga Cultural Centre',
    image: 'https://images.unsplash.com/photo-1523805009345-7448845a9e53?w=800&h=500&fit=crop&auto=format',
    category: 'Cultural Experience',
    description: 'Busoga history, craft workshops and traditional performance, run by local practitioners.',
    location: 'Jinja Town',
    pingCount: 6, eventCount: 0, rizzCount: 15, projectCount: 1, societyCount: 1,
    followers: 2200,
    spaceType: 'establishment',
    findCategories: ['experiences'],
    businessCategories: [
      {
        id: 'bc18', name: 'Workshops', icon: '🪘',
        offerings: [
          { id: 'bo29', name: 'Drumming Workshop', images: ['https://images.unsplash.com/photo-1519892300165-cb5542fb47c7?w=600&h=600&fit=crop&auto=format'], description: 'Two-hour session with Busoga master drummers. All levels.', price: 30000, priceLabel: 'UGX 30,000 / person', offeringType: 'appointment', slots: ['Sat 10 AM', 'Sat 2 PM', 'Sun 10 AM'] },
          { id: 'bo30', name: 'Craft & Weaving', images: ['https://images.unsplash.com/photo-1528475478853-5b89bed12eea?w=600&h=600&fit=crop&auto=format'], description: 'Learn traditional basket weaving. Take your work home.', price: 25000, priceLabel: 'UGX 25,000 / person', offeringType: 'appointment', slots: ['Fri 2 PM', 'Sat 11 AM'] },
        ],
      },
    ],
  },
]

export const spaceMap = Object.fromEntries(spaces.map(s => [s.id, s]))

// --- Societies ---
export const societies: Society[] = [
  {
    id: 'soc1',
    name: 'Jinja Nights',
    image: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400&h=400&fit=crop&auto=format',
    description: 'The community keeping Jinja\'s culture alive after dark. Events, art, music, people.',
    memberCount: 3640,
    privacy: 'public',
    spaceIds: ['s1', 's2'],
    eventIds: ['e1'],
    projectIds: ['p1'],
    pingIds: ['ping1', 'ping2'],
    topicCount: 47,
  },
  {
    id: 'soc2',
    name: 'Nile Photography Guild',
    image: 'https://images.unsplash.com/photo-1452587925148-ce544e77e70d?w=400&h=400&fit=crop&auto=format',
    description: 'Uganda\'s most active photography collective, based on the river. Critique, collab, grow.',
    memberCount: 1120,
    privacy: 'public',
    spaceIds: ['s1', 's4', 's8'],
    eventIds: [],
    projectIds: ['p1', 'p3'],
    pingIds: ['ping3'],
    topicCount: 28,
  },
  {
    id: 'soc3',
    name: 'Nyege Nyege Heads',
    image: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=400&fit=crop&auto=format',
    description: 'Everyone who\'s already counting down to the next festival. Lineups, lodging, and travel plans.',
    memberCount: 5340,
    privacy: 'private',
    spaceIds: ['s2', 's9'],
    eventIds: ['e2', 'e3'],
    projectIds: ['p2'],
    pingIds: ['ping6'],
    topicCount: 63,
  },
]

export const societyMap = Object.fromEntries(societies.map(s => [s.id, s]))

export const societyTopics = [
  {
    id: 't1',
    societyId: 'soc1',
    title: "WHO'S GOING TO THE MATCH?",
    creatorId: 'u2',
    participantIds: ['u1', 'u2', 'u3', 'u4', 'u5', 'u6'],
    replies: 42,
    engaged: 86,
    timestamp: '2h ago',
    isPinned: true,
    messages: [
      { userId: 'u2', text: 'Walukuba Barbarians vs Heathens this Saturday - anyone heading there?', time: '2h' },
      { userId: 'u1', text: 'Yes! Already got 6 people coming 🙌', time: '1h 45m' },
      { userId: 'u3', text: 'there\'s a whole thing at 2 Friends right after, perfect night ngl', time: '1h 30m' },
      { userId: 'u4', text: 'getting there early, not missing this fr', time: '1h' },
    ],
  },
  {
    id: 't2',
    societyId: 'soc1',
    title: 'NYEGE NYEGE COUNTDOWN 👀',
    creatorId: 'u3',
    participantIds: ['u1', 'u3', 'u5', 'u6', 'u7'],
    replies: 51,
    engaged: 130,
    timestamp: '5h ago',
    isPinned: false,
    messages: [
      { userId: 'u3', text: 'ok who else already booked their spot near the grounds', time: '5h' },
      { userId: 'u7', text: 'the way i\'ve had my tent packed for a week 😭 no cap', time: '4h 20m' },
      { userId: 'u5', text: 'see everyone by the river!!', time: '4h' },
    ],
  },
  {
    id: 't3',
    societyId: 'soc1',
    title: 'BEST SPOTS FOR AFTER-PARTY?',
    creatorId: 'u6',
    participantIds: ['u2', 'u4', 'u6'],
    replies: 15,
    engaged: 38,
    timestamp: '1d ago',
    isPinned: false,
    messages: [
      { userId: 'u6', text: '2 Friends obviously - anything else worth it?', time: '1d' },
      { userId: 'u2', text: 'the resort bar has been unmatched lately fr', time: '23h' },
    ],
  },
  {
    id: 't4',
    societyId: 'soc3',
    title: 'LODGING NEAR THE FESTIVAL — HELP',
    creatorId: 'u7',
    participantIds: ['u1', 'u2', 'u7'],
    replies: 34,
    engaged: 95,
    timestamp: '8h ago',
    isPinned: true,
    messages: [
      { userId: 'u7', text: 'is camping actually worth it or should i just get a room in town 💀', time: '8h' },
      { userId: 'u1', text: 'camping is the whole experience honestly, do it once', time: '7h 10m' },
      { userId: 'u2', text: '2 Friends Guest House has dorm beds if you want a bed to crash in after', time: '6h 40m' },
    ],
  },
]

// --- Pings ---
export const pings: Ping[] = [
  {
    id: 'ping1',
    title: 'Friday Night Hangout',
    image: 'https://images.unsplash.com/photo-1529543544282-ea669407fca3?w=600&h=400&fit=crop&auto=format',
    creatorId: 'u1',
    spaceId: 's1',
    timestamp: 'Tonight · 7pm',
    participantIds: ['u1', 'u2', 'u3', 'u4', 'u5'],
    isRecurring: true,
    recurringLabel: 'Every Friday',
    societyId: 'soc1',
    eventId: 'e1',
    description: 'The usual Friday energy at the club before the big show. Come through.',
    mediaCount: 12,
  },
  {
    id: 'ping2',
    title: 'Post-Match Vibes',
    image: 'https://images.unsplash.com/photo-1431324155629-1a6deb1dec8d?w=600&h=400&fit=crop&auto=format',
    creatorId: 'u3',
    spaceId: 's1',
    timestamp: 'Sat · After match',
    participantIds: ['u1', 'u3', 'u6'],
    isRecurring: false,
    societyId: 'soc1',
    description: 'Drinks and vibes after the Walukuba Barbarians match. RSVP below.',
    mediaCount: 3,
  },
  {
    id: 'ping3',
    title: 'Sunrise Photo Walk — Source of the Nile',
    image: 'https://images.unsplash.com/photo-1590004987778-bece5c9adab6?w=600&h=400&fit=crop&auto=format',
    creatorId: 'u1',
    spaceId: 's8',
    timestamp: 'Sun · 6am',
    participantIds: ['u1', 'u2', 'u6'],
    isRecurring: false,
    societyId: 'soc2',
    description: 'Golden hour photography walk at the source. Bring your gear.',
    mediaCount: 0,
  },
  {
    id: 'ping4',
    title: 'Nile Rafting Crew',
    image: 'https://images.unsplash.com/photo-1530866495561-507c9faab8f6?w=600&h=400&fit=crop&auto=format',
    creatorId: 'u4',
    spaceId: 's8',
    timestamp: 'Sat · 9am',
    participantIds: ['u4', 'u2'],
    isRecurring: false,
    description: 'Grade 5 rapids, need 3 more people to fill the raft. No experience needed, just don\'t be scared 😅',
    mediaCount: 0,
  },
  {
    id: 'ping5',
    title: 'Bonfire by the Nile',
    image: 'https://images.unsplash.com/photo-1475619691507-4c47295a2f19?w=600&h=400&fit=crop&auto=format',
    creatorId: 'u7',
    spaceId: 's2',
    timestamp: 'Tonight · 8pm',
    participantIds: ['u7', 'u5', 'u1'],
    isRecurring: false,
    description: 'small fire, good music, bring a chair or vibes only 🔥 giving beach bonfire energy fr',
    mediaCount: 5,
  },
  {
    id: 'ping6',
    title: 'Nyege Nyege Warmup Session',
    image: 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=600&h=400&fit=crop&auto=format',
    creatorId: 'u5',
    spaceId: 's9',
    eventId: 'e3',
    societyId: 'soc3',
    timestamp: 'Thu · setup day',
    participantIds: ['u5', 'u7', 'u3'],
    isRecurring: false,
    description: 'pre-festival setup crew linking up before the gates open. tents, snacks, and the first sunset on the grounds.',
    mediaCount: 8,
  },
  {
    id: 'ping7',
    title: 'Sunday Market Run',
    image: 'https://images.unsplash.com/photo-1488459716781-31db52582fe9?w=600&h=400&fit=crop&auto=format',
    creatorId: 'u2',
    spaceId: 's3',
    timestamp: 'Sun · 10am',
    participantIds: ['u2', 'u4'],
    isRecurring: true,
    recurringLabel: 'Every Sunday',
    description: 'Weekly market run at Adonai Plaza. Fresh produce, cheap finds, good company.',
    mediaCount: 1,
  },
]

export const pingMap = Object.fromEntries(pings.map(p => [p.id, p]))

// --- Events ---
export const events: Event[] = [
  {
    id: 'e1',
    name: 'Jinja Night Live',
    image: 'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=800&h=500&fit=crop&auto=format',
    spaceId: 's1',
    organizerId: 'u3',
    date: 'Saturday, 14 Sep',
    time: '7:00 PM',
    price: 50000,
    isFree: false,
    attendeeIds: ['u1', 'u2', 'u5', 'u6'],
    description: 'Jinja\'s biggest monthly live music event. Featuring local and international artists, live DJs, and a night to remember.',
    societyId: 'soc1',
    tickets: [
      { type: 'regular', price: 50000, label: 'REGULAR' },
      { type: 'vip', price: 120000, label: 'VIP' },
      { type: 'elite', price: 250000, label: 'ELITE' },
    ],
  },
  {
    id: 'e2',
    name: 'Riverside Sessions Vol. 4',
    image: 'https://images.unsplash.com/photo-1429514513361-8a632ff5e7c6?w=800&h=500&fit=crop&auto=format',
    spaceId: 's4',
    organizerId: 'u5',
    date: 'Sunday, 22 Sep',
    time: '4:00 PM',
    price: 0,
    isFree: true,
    attendeeIds: ['u1', 'u3', 'u4'],
    description: 'Free Sunday afternoon session. Beats, drinks, river views. RSVP to confirm your spot.',
    societyId: 'soc3',
    tickets: [{ type: 'free', price: 0, label: 'FREE ENTRY' }],
  },
  {
    id: 'e3',
    name: 'Nyege Nyege Festival',
    image: 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=800&h=500&fit=crop&auto=format',
    spaceId: 's9',
    organizerId: 'u5',
    date: 'Thu–Sun, 4–7 Sep',
    time: 'Gates open 2:00 PM',
    price: 90000,
    isFree: false,
    attendeeIds: ['u1', 'u2', 'u3', 'u5', 'u6', 'u7'],
    description: 'Four days of music, art and chaos on the banks of the Nile. East Africa\'s biggest festival — camping, stages, and everything in between.',
    societyId: 'soc3',
    tickets: [
      { type: 'day', price: 90000, label: 'DAY PASS' },
      { type: 'full', price: 280000, label: 'FULL FESTIVAL' },
      { type: 'camping', price: 380000, label: 'FULL + CAMPING' },
    ],
  },
]

export const eventMap = Object.fromEntries(events.map(e => [e.id, e]))

// --- Projects ---
export const projects: Project[] = [
  {
    id: 'p1',
    name: 'Nile Nights',
    image: 'https://images.unsplash.com/photo-1498736297812-3a08021f206f?w=800&h=500&fit=crop&auto=format',
    creatorId: 'u1',
    contributorIds: ['u1', 'u2', 'u6'],
    description: 'A long-form photo and video documentation of Jinja\'s night culture — its people, spaces, stories, and energy.',
    category: 'Photography · Documentary',
    status: 'Shot 4 complete',
    spaceIds: ['s1', 's2'],
    societyId: 'soc1',
    mediaCount: 48,
    updateCount: 7,
  },
  {
    id: 'p2',
    name: 'Sound Archive Uganda',
    image: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800&h=500&fit=crop&auto=format',
    creatorId: 'u5',
    contributorIds: ['u5', 'u2', 'u4'],
    description: 'Archiving and celebrating Uganda\'s diverse musical traditions, from Kadongo Kamu to the electronic scene born at Nyege Nyege.',
    category: 'Music · Archive',
    status: 'Open for contributors',
    spaceIds: ['s9'],
    societyId: 'soc3',
    mediaCount: 120,
    updateCount: 12,
  },
  {
    id: 'p3',
    name: 'Nile Mural Project',
    image: 'https://images.unsplash.com/photo-1551913902-c92207136625?w=800&h=500&fit=crop&auto=format',
    creatorId: 'u6',
    contributorIds: ['u6', 'u1', 'u3'],
    description: 'A living catalog of Jinja\'s street murals, graffiti, and public art — with stories behind each piece.',
    category: 'Visual Art · Urban',
    status: 'Actively collecting',
    spaceIds: ['s1', 's8'],
    mediaCount: 67,
    updateCount: 5,
  },
]

export const projectMap = Object.fromEntries(projects.map(p => [p.id, p]))

// --- Content ---
export const content: Content[] = [
  {
    id: 'c1',
    creatorId: 'u1',
    media: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=600&h=800&fit=crop&auto=format',
    mediaType: 'reel',
    caption: 'Friday energy at Walukuba. Nothing else like it.',
    createdAt: '3h ago',
    taggedSpaceIds: ['s1'],
    taggedEventIds: ['e1'],
    taggedPingIds: ['ping1'],
    taggedProjectIds: ['p1'],
    taggedSocietyIds: ['soc1'],
    reactions: 284,
    comments: 47,
  },
  {
    id: 'c2',
    creatorId: 'u6',
    media: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=600&h=800&fit=crop&auto=format',
    mediaType: 'reel',
    caption: 'Jinja nights go different. Shot 4 done.',
    createdAt: '1d ago',
    taggedSpaceIds: ['s1', 's2'],
    taggedEventIds: [],
    taggedPingIds: ['ping2'],
    taggedProjectIds: ['p1'],
    taggedSocietyIds: [],
    reactions: 512,
    comments: 88,
  },
  {
    id: 'c3',
    creatorId: 'u5',
    media: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=600&h=800&fit=crop&auto=format',
    mediaType: 'photo',
    caption: 'Sound check done. Ready for Saturday.',
    createdAt: '6h ago',
    taggedSpaceIds: ['s1'],
    taggedEventIds: ['e1'],
    taggedPingIds: [],
    taggedProjectIds: ['p2'],
    taggedSocietyIds: ['soc3'],
    reactions: 720,
    comments: 103,
  },
  {
    id: 'c4',
    creatorId: 'u2',
    media: 'https://images.unsplash.com/photo-1571204829887-3b8d69e4094d?w=600&h=800&fit=crop&auto=format',
    mediaType: 'photo',
    caption: 'The pitch before it wakes up.',
    createdAt: '2d ago',
    taggedSpaceIds: ['s1'],
    taggedEventIds: [],
    taggedPingIds: ['ping1'],
    taggedProjectIds: ['p1'],
    taggedSocietyIds: ['soc1'],
    reactions: 190,
    comments: 31,
  },
  {
    id: 'c5',
    creatorId: 'u3',
    media: 'https://images.unsplash.com/photo-1429514513361-8a632ff5e7c6?w=600&h=800&fit=crop&auto=format',
    mediaType: 'reel',
    caption: 'Riverside Sessions preview 🎶',
    createdAt: '4h ago',
    taggedSpaceIds: ['s4'],
    taggedEventIds: ['e2'],
    taggedPingIds: [],
    taggedProjectIds: [],
    taggedSocietyIds: ['soc3'],
    reactions: 348,
    comments: 56,
  },
  {
    id: 'c6',
    creatorId: 'u4',
    mediaType: 'post',
    caption: "Spent the weekend cleaning up the Sound Archive metadata — 120 tracks now properly tagged by region and era. Next up: interviews with the original Kadongo Kamu artists before we lose that history for good.",
    createdAt: '9h ago',
    taggedSpaceIds: [],
    taggedEventIds: [],
    taggedPingIds: [],
    taggedProjectIds: ['p2'],
    taggedSocietyIds: [],
    reactions: 64,
    comments: 12,
  },
  {
    id: 'c7',
    creatorId: 'u7',
    media: 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=600&h=800&fit=crop&auto=format',
    mediaType: 'reel',
    caption: 'the grounds are SET UP i am not okay 😭 4 days of this and i\'m already tired but in the best way',
    createdAt: '1h ago',
    taggedSpaceIds: ['s9'],
    taggedEventIds: ['e3'],
    taggedPingIds: ['ping6'],
    taggedProjectIds: [],
    taggedSocietyIds: ['soc3'],
    reactions: 1240,
    comments: 210,
  },
  {
    id: 'c8',
    creatorId: 'u1',
    media: 'https://images.unsplash.com/photo-1516426122078-c23e76319801?w=600&h=800&fit=crop&auto=format',
    mediaType: 'photo',
    caption: 'the source of the actual Nile. still not over it tbh',
    createdAt: '5h ago',
    taggedSpaceIds: ['s8'],
    taggedEventIds: [],
    taggedPingIds: ['ping3'],
    taggedProjectIds: ['p3'],
    taggedSocietyIds: ['soc2'],
    reactions: 430,
    comments: 39,
  },
]

// --- Products ---
export const products: Product[] = [
  {
    id: 'pr1',
    name: 'Jinja Night Live Tee',
    image: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=600&h=600&fit=crop&auto=format',
    sellerId: 'u3',
    spaceId: 's1',
    price: 80000,
    category: 'Merch',
    description: 'Limited edition tee from the JNL September edition. Screen-printed, heavyweight cotton.',
    inStock: true,
    findCategory: 'merch',
    contextLabel: 'Event merch',
    eventId: 'e1',
  },
  {
    id: 'pr2',
    name: 'Priya M. Vinyl Drop',
    image: 'https://images.unsplash.com/photo-1484876065684-b683cf17d276?w=600&h=600&fit=crop&auto=format',
    sellerId: 'u5',
    price: 200000,
    category: 'Music',
    description: 'Limited vinyl pressing of the Afrobeats × Indie EP. 200 copies only.',
    inStock: true,
    findCategory: 'merch',
    contextLabel: 'Creator merch',
  },
  {
    id: 'pr3',
    name: 'Photo Guild Print — Source of the Nile',
    image: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=600&h=600&fit=crop&auto=format',
    sellerId: 'u1',
    price: 150000,
    category: 'Art Print',
    description: 'A3 fine-art print from the Nile Nights project. Signed, numbered.',
    inStock: true,
    findCategory: 'merch',
    contextLabel: 'Project merch',
    projectId: 'p1',
  },
  {
    id: 'pr4',
    name: 'Walukuba Barbarians Match Kit',
    image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&h=600&fit=crop&auto=format',
    sellerId: 'u3',
    spaceId: 's1',
    price: 120000,
    category: 'Sportswear',
    description: 'Official Walukuba Barbarians fan kit. Jersey + cap. Limited seasonal release.',
    inStock: false,
    findCategory: 'merch',
    contextLabel: 'Official Space merch',
  },
  {
    id: 'pr5',
    name: 'Nyege Nyege 2026 Tee',
    image: 'https://images.unsplash.com/photo-1503341504253-dff4815485f1?w=600&h=600&fit=crop&auto=format',
    sellerId: 'u7',
    spaceId: 's9',
    price: 65000,
    category: 'Merch',
    description: 'Official festival tee. Sold on the grounds and online, while stock lasts.',
    inStock: true,
    findCategory: 'merch',
    contextLabel: 'Event merch',
    eventId: 'e3',
  },
  {
    id: 'pr6',
    name: 'Busoga Roast Coffee — 500g',
    image: 'https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=600&h=600&fit=crop&auto=format',
    sellerId: 'u2',
    spaceId: 's3',
    price: 28000,
    category: 'Food & Drink',
    description: 'Single-origin beans grown on the slopes above the Nile, roasted weekly in Jinja.',
    inStock: true,
    findCategory: 'shop',
  },
  {
    id: 'pr7',
    name: 'Woven Storage Basket',
    image: 'https://images.unsplash.com/photo-1595408076683-9c0f5b5e9c3c?w=600&h=600&fit=crop&auto=format',
    sellerId: 'u3',
    spaceId: 's13',
    price: 45000,
    category: 'Home & Living',
    description: 'Hand-woven by Busoga artisans using traditional technique. Each piece is unique.',
    inStock: true,
    findCategory: 'shop',
  },
  {
    id: 'pr8',
    name: 'Kitenge Tote Bag',
    image: 'https://images.unsplash.com/photo-1544816155-12df9643f363?w=600&h=600&fit=crop&auto=format',
    sellerId: 'u7',
    spaceId: 's3',
    price: 32000,
    category: 'Accessories',
    description: 'Lined canvas tote in East African kitenge print. Made in Jinja Town.',
    inStock: true,
    findCategory: 'shop',
  },
  {
    id: 'pr9',
    name: 'Nile Honey — 1kg Jar',
    image: 'https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=600&h=600&fit=crop&auto=format',
    sellerId: 'u4',
    spaceId: 's3',
    price: 20000,
    category: 'Food & Drink',
    description: 'Raw, unfiltered honey from hives along the riverbank. Sourced from local keepers.',
    inStock: true,
    findCategory: 'shop',
  },
]

export const productMap = Object.fromEntries(products.map(p => [p.id, p]))

// --- Trips ---
export const trips: Trip[] = [
  {
    id: 'tr1',
    type: 'share',
    eventId: 'e1',
    organizerId: 'u2',
    participantIds: ['u2'],
    departure: 'Jinja Town',
    destination: 'Walukuba Barbarians RFC',
    time: '6:30 PM',
    seats: 3,
  },
  {
    id: 'tr2',
    type: 'split',
    eventId: 'e1',
    organizerId: 'u4',
    participantIds: ['u4', 'u6'],
    departure: 'Bugembe',
    destination: 'Walukuba Barbarians RFC',
    time: '6:45 PM',
  },
  {
    id: 'tr3',
    type: 'hosted',
    eventId: 'e3',
    organizerId: 'u3',
    participantIds: ['u1', 'u2', 'u3', 'u5', 'u7'],
    departure: 'Kampala',
    destination: 'Nyege Nyege Festival Grounds',
    time: '6:00 PM',
  },
]

// --- Wallet ---
export const initialWalletTxs: WalletTx[] = [
  { id: 'w1', label: 'Riverside Sessions reward', amount: 25000, type: 'credit', timestamp: '2d ago' },
  { id: 'w2', label: 'XP Project payment', amount: 100000, type: 'credit', timestamp: '5d ago' },
  { id: 'w3', label: 'Creator merch — Priya M.', amount: -200000, type: 'debit', timestamp: '1w ago' },
  { id: 'w4', label: 'Motion streak bonus', amount: 15000, type: 'credit', timestamp: '1w ago' },
]

export const initialWalletBalance = 340000

// --- Event Memories ---
export const eventMemories = [
  'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=400&h=600&fit=crop&auto=format',
  'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400&h=600&fit=crop&auto=format',
  'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=400&h=600&fit=crop&auto=format',
  'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=400&h=600&fit=crop&auto=format',
  'https://images.unsplash.com/photo-1429514513361-8a632ff5e7c6?w=400&h=600&fit=crop&auto=format',
  'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=600&fit=crop&auto=format',
  'https://images.unsplash.com/photo-1571204829887-3b8d69e4094d?w=400&h=600&fit=crop&auto=format',
]
