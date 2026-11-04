import { useModuleNavigation } from '../../state/navigation'
import { useRecords, updateState, usePrototype } from '../../state/store'
import Unavailable from '../../components/Unavailable'
import { formatMoney, newId } from '../../state/core'
import { useState, useEffect, useRef, useCallback } from 'react'
import { useEcosystem, type CrossAppRoute } from '../../LegacyApp'
import { trips, userMap, eventMemories, type Event } from '../../data/catalog'
import {
  getMotionEvents,
  type ImportedMotionEvent,
} from '../../lib/motion-events'
type Screen =
  | { id: 'home' }
  | { id: 'events_list' }
  | { id: 'event_detail'; eventId: string }
  | { id: 'imported_event_detail'; eventId: string }
  | { id: 'ticket_select'; eventId: string }
  | { id: 'ticket_confirm'; eventId: string; ticketType: string; price: number }
  | { id: 'trips' }
  | { id: 'hosted_space'; eventId: string }
  | { id: 'memories'; eventId: string }
  | { id: 'chat' }
  | { id: 'search' }
  | { id: 'my_tickets' }

export default function MotionApp() {
  const { events } = useRecords()
  const { screen, push, pop, navTab, switchNav } = useModuleNavigation<Screen>('motion', {"home": "home", "events": "events_list", "trips": "trips", "chat": "chat"})
  const eventsState = usePrototype()
  const allEvents = eventsState.events
  const [importedEvents, setImportedEvents] = useState<ImportedMotionEvent[]>([])
  const [importedLoading, setImportedLoading] = useState(true)
  const [importedError, setImportedError] = useState(false)

  useEffect(() => {
    let active = true
    getMotionEvents()
      .then(results => {
        if (active) setImportedEvents(results)
      })
      .catch(error => {
        console.error('Motion imported events failed to load:', error)
        if (active) setImportedError(true)
      })
      .finally(() => {
        if (active) setImportedLoading(false)
      })
    return () => { active = false }
  }, [])
  const addEvent = (item: Event) => updateState(s => ({ ...s, events: [item, ...s.events] }))

  const NAV = [
    { id: 'home',   label: 'Home',   Icon: HomeIcon },
    { id: 'events', label: 'Events', Icon: EventIcon },
    { id: 'trips',  label: 'Trips',  Icon: TripIcon },
    { id: 'chat',   label: 'Chat',   Icon: ChatIcon },
  ]

  const importedDetail = screen.id === 'imported_event_detail'
    ? importedEvents.find(event => event.id === screen.eventId)
    : undefined
  if (screen.id === 'imported_event_detail' && !importedLoading && !importedDetail) {
    return <Unavailable title="Event unavailable" onBack={pop} />
  }
  if ('eventId' in screen && screen.id !== 'imported_event_detail' &&
      !allEvents.some(event => event.id === screen.eventId) &&
      !events.some(event => event.id === screen.eventId)) {
    return <Unavailable title="Event unavailable" onBack={pop} />
  }
  return (
    <div className="app-motion flex flex-col h-full" style={{ background: 'var(--color-eco-bg)' }}>
      <div key={JSON.stringify(screen)} className="flex-1 overflow-hidden relative">
        {screen.id === 'home'           && <MotionHome push={push} />}
        {screen.id === 'events_list'    && <MotionEventsList
  push={push}
  allEvents={allEvents}
  importedEvents={importedEvents}
  importedLoading={importedLoading}
  importedError={importedError}
  onCreate={addEvent}
/>}
        {screen.id === 'imported_event_detail' && (importedDetail ? <ImportedEventDetail event={importedDetail} pop={pop} /> : <div className="p-5 text-eco-muted">Loading event…</div>)}
        {screen.id === 'event_detail'   && <EventDetail eventId={(screen as any).eventId} pop={pop} push={push} allEvents={allEvents} />}
        {screen.id === 'ticket_select'  && <TicketSelect eventId={(screen as any).eventId} pop={pop} push={push} allEvents={allEvents} />}
        {screen.id === 'ticket_confirm' && <TicketConfirm eventId={(screen as any).eventId} ticketType={(screen as any).ticketType} price={(screen as any).price} pop={pop} push={push} />}
        {screen.id === 'my_tickets' && <MyTickets push={push} />}
        {screen.id === 'trips'          && <TripsScreen push={push} />}
        {screen.id === 'hosted_space'   && <HostedSpace eventId={(screen as any).eventId} pop={pop} />}
        {screen.id === 'memories'       && <EventMemoriesScreen eventId={(screen as any).eventId} pop={pop} />}
        {screen.id === 'chat'           && <div className="flex h-full items-center justify-center"><Empty label="Messaging is not connected yet" /></div>}
        {screen.id === 'search'         && <MotionSearchScreen pop={pop} push={push} />}
      </div>

      <div className="flex-shrink-0 flex items-center justify-around px-1 pb-6 pt-2.5"
        style={{ background: 'var(--color-eco-bg)', borderTop: '1px solid rgba(255,107,26,0.08)' }}>
        {NAV.map(({ id, label, Icon }) => {
          const active = navTab === id
          return (
            <button key={id} className="pressable flex flex-col items-center gap-1 flex-1 py-1" onClick={() => switchNav(id)}>
              <Icon active={active} />
              <span className="font-display font-semibold text-[9px] tracking-wide"
                style={{ color: active ? '#FF6B1A' : 'var(--color-eco-muted)' }}>{label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

/* ───── MOTION HOME ───── */
/* ───── MOTION HOME — event feed, Instagram style ─────
   Pictures by Spaces or by Rizz attendees who tagged the event. */
function MotionHome({ push }: { push: (s: Screen) => void }) {
  const { eventMap, spaceMap } = useRecords()
  const eco = useEcosystem()
  const [loaded, setLoaded] = useState(false)
  const [liked, setLiked] = useState<Set<string>>(new Set())
  useEffect(() => { const t = setTimeout(() => setLoaded(true), 700); return () => clearTimeout(t) }, [])

  const feed = eco.contentItems.filter(c => c.taggedEventIds.length > 0)
  const toggleLike = (id: string) =>
    setLiked(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n })

  return (
    <div className="flex flex-col h-full">
      <div className="flex-shrink-0 flex items-center justify-between px-5 pt-3 pb-3">
        <button {...eco.homeButtonProps} className="pressable" style={{ touchAction: 'none' }}>
          <h1 className="font-display font-black text-xl text-eco-text" style={{ letterSpacing: '-0.02em' }}>MOTION</h1>
        </button>
        <div className="flex items-center gap-2.5">
          <button className="pressable w-8 h-8 rounded-full flex items-center justify-center bg-eco-surface2"
            onClick={() => push({ id: 'search' })}>
            <SearchIcon />
          </button>
          <img src="https://i.pravatar.cc/150?img=3" className="w-8 h-8 rounded-full object-cover border border-eco-border2" alt="You" />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {!loaded ? <SkeletonEvents /> : (
          <div className="pb-6">
            {feed.length === 0 && (
              <div className="px-5 py-16 text-center">
                <div className="font-body text-sm text-eco-muted">No event photos yet.</div>
                <div className="font-body text-xs text-eco-subtle mt-1">Post from Rizz and tag an Event to see it here.</div>
              </div>
            )}
            {feed.map(post => {
              const event = post.taggedEventIds[0] ? eventMap[post.taggedEventIds[0]] : null
              const space = event ? spaceMap[event.spaceId] : null
              const creator = userMap[post.creatorId]
              const isHost = event && post.creatorId === event.organizerId
              const isLiked = liked.has(post.id)
              return (
                <div key={post.id} className="mb-5">
                  <div className="flex items-center gap-2.5 px-4 py-2.5">
                    <img src={creator.avatar} className="w-8 h-8 rounded-full object-cover" alt="" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-body text-xs font-semibold text-eco-text">{creator.name}</span>
                        {isHost && (
                          <span className="px-1.5 py-0.5 rounded text-[8px] font-display font-black"
                            style={{ background: 'rgba(255,107,26,0.18)', color: '#FF6B1A' }}>HOST</span>
                        )}
                      </div>
                      {event && (
                        <button className="pressable flex items-center gap-1"
                          onClick={() => push({ id: 'event_detail', eventId: event.id })}>
                          <span style={{ fontSize: '9px' }}>🎟</span>
                          <span className="font-body text-[10px]" style={{ color: '#FF6B1A' }}>{event.name}</span>
                          {space && <span className="font-body text-[10px] text-eco-subtle">· {space.name}</span>}
                        </button>
                      )}
                    </div>
                    <span className="font-body text-[10px] text-eco-subtle">{post.createdAt}</span>
                  </div>

                  {post.media && (
                    <div className="relative w-full" style={{ aspectRatio: '4/5' }}>
                      <img src={post.media} className="absolute inset-0 w-full h-full object-cover" alt="" onDoubleClick={() => toggleLike(post.id)} />
                      {post.mediaType === 'reel' && (
                        <div className="absolute top-2.5 right-2.5 w-6 h-6 rounded-full flex items-center justify-center"
                          style={{ background: 'rgba(0,0,0,0.55)' }}>
                          <span className="text-[10px] text-white">▶</span>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex items-center gap-4 px-4 pt-2.5">
                    <button className="pressable" onClick={() => toggleLike(post.id)}>
                      <span style={{ fontSize: '20px', color: isLiked ? '#FF2878' : 'var(--color-eco-muted)' }}>{isLiked ? '♥' : '♡'}</span>
                    </button>
                    <span className="font-body text-xs text-eco-muted">{post.reactions + (isLiked ? 1 : 0)}</span>
                    <span className="font-body text-xs" style={{ color: 'var(--color-eco-muted)' }}>💬 {post.comments}</span>
                  </div>

                  <div className="px-4 pt-1.5">
                    <span className="font-body text-xs text-eco-text">
                      <span className="font-semibold">{creator.name.split(' ')[0]}</span>{' '}
                      <span className="text-eco-muted">{post.caption}</span>
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

/* ───── EVENTS — the actual event browser + ticket entry point (was Home before) ───── */
function MotionEventsList({ push, allEvents, importedEvents, importedLoading, importedError, onCreate }: { push: (s: Screen) => void; allEvents: Event[]; importedEvents: ImportedMotionEvent[]; importedLoading: boolean; importedError: boolean; onCreate: (e: Event) => void }) {
  const { events, spaceMap } = useRecords()
  const eco = useEcosystem()
  const [loaded, setLoaded] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  useEffect(() => { const t = setTimeout(() => setLoaded(true), 800); return () => clearTimeout(t) }, [])

  return (
    <div className="flex flex-col h-full relative">
      {/* Header */}
      <div className="flex-shrink-0 relative px-5 pt-3 pb-4"
        style={{ background: 'linear-gradient(180deg, rgba(255,107,26,0.13) 0%, transparent 100%)' }}>
        <div className="flex items-center justify-between mb-2">
          <button {...eco.homeButtonProps} className="pressable w-8 h-8 rounded-full flex items-center justify-center bg-eco-surface2" style={{ touchAction: 'none' }}>
            <span style={{ fontSize: '13px', color: 'var(--color-eco-muted)' }}>◈</span>
          </button>
          <div className="flex items-center gap-2.5">
            <button className="pressable w-8 h-8 rounded-full flex items-center justify-center bg-eco-surface2"
              onClick={() => push({ id: 'search' })}>
              <SearchIcon />
            </button>
            <img src="https://i.pravatar.cc/150?img=3" className="w-8 h-8 rounded-full object-cover border border-eco-border2" alt="You" />
          </div>
        </div>
        <h1 className="font-display font-black text-[42px] text-eco-text" style={{ letterSpacing: '-0.03em' }}>Events</h1>
        <div className="font-body text-xs mt-0.5" style={{ color: 'rgba(255,107,26,0.6)' }}>Tickets · Trips · RSVPs</div>
      </div>

      {/* Filter chips */}
      <div className="flex-shrink-0 flex gap-2 px-5 overflow-x-auto pb-3">
        {['All', 'Tonight', 'This Week', 'Free', 'Near You'].map((f, i) => (
          <button disabled title="Not connected in this prototype" key={f} className="pressable flex-shrink-0 px-3 py-1.5 rounded-full text-[10px] font-display font-bold"
            style={{
              background: i === 0 ? 'rgba(255,107,26,0.18)' : 'var(--glass-06)',
              color: i === 0 ? '#FF6B1A' : 'var(--color-eco-muted)',
              border: i === 0 ? '1px solid rgba(255,107,26,0.35)' : '1px solid transparent',
            }}>
            {f}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto">
        {!loaded ? <SkeletonEvents /> : (
          <div className="space-y-6 pb-6">
            {/* Featured */}
            <div className="px-4">
              <button
                className="pressable w-full relative rounded-3xl overflow-hidden"
                style={{ height: '240px', border: '1px solid rgba(255,107,26,0.2)' }}
                onClick={() => push({ id: 'event_detail', eventId: events[0].id })}>
                <img src={events[0].image} className="absolute inset-0 w-full h-full object-cover" alt="" />
                <div className="absolute inset-0"
                  style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.1) 0%, rgba(6,6,13,0.97) 100%)' }} />
                <div className="absolute inset-0 p-5 flex flex-col justify-end">
                  <div className="text-[9px] font-display font-bold tracking-[0.3em] text-eco-muted uppercase mb-1">FEATURED</div>
                  <div className="font-display font-black text-xl text-white leading-tight" style={{ letterSpacing: '-0.02em' }}>
                    {events[0].name}
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <div>
                      <div className="font-body text-xs text-white/65">{spaceMap[events[0].spaceId]?.name}</div>
                      <div className="font-body text-xs text-white/45">{events[0].date} · {events[0].time}</div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <div className="px-3 py-1.5 rounded-xl font-display font-black text-sm"
                        style={{ background: '#FF6B1A', color: '#000' }}>
                        {formatMoney(events[0].price)}
                      </div>
                      {eco.purchasedTickets.has(events[0].id) && (
                        <div className="px-2 py-0.5 rounded text-[9px] font-display font-black"
                          style={{ background: 'rgba(255,107,26,0.2)', color: '#FF6B1A' }}>✓ ATTENDING</div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-3">
                    <div className="flex -space-x-2">
                      {events[0].attendeeIds.slice(0, 5).map(uid => (
                        <img key={uid} src={userMap[uid]?.avatar}
                          className="w-6 h-6 rounded-full border-2 border-eco-bg object-cover" alt="" />
                      ))}
                    </div>
                    <span className="font-body text-xs text-white/55">{events[0].attendeeIds.length} attending</span>
                  </div>
                </div>
              </button>
            </div>

            {/* Upcoming */}
            <div className="px-4">
              <div className="flex items-center justify-between mb-3 px-1">
                <span className="font-display font-black text-[11px] tracking-[0.12em] text-eco-text uppercase">UPCOMING</span>
              </div>
              <div className="space-y-2.5">
                {allEvents.map(event => (
                  <EventCard key={event.id} event={event} onPress={() => push({ id: 'event_detail', eventId: event.id })} />
                ))}
                {importedEvents.filter(event => !allEvents.some(native => native.id === event.id) && !events.some(native => native.id === event.id)).map(event => (
                  <ImportedEventCard key={event.id} event={event} onPress={() => push({ id: 'imported_event_detail', eventId: event.id })} />
                ))}
                {importedLoading && <div className="font-body text-xs text-eco-muted py-2">Loading more events…</div>}
                {importedError && <div role="status" className="font-body text-xs text-eco-muted py-2">External events are temporarily unavailable.</div>}
              </div>
            </div>
          </div>
        )}
      </div>

      <button aria-label="Create event" className="pressable absolute bottom-5 right-5 w-14 h-14 rounded-full flex items-center justify-center"
        style={{ background: '#FF6B1A', boxShadow: '0 8px 24px rgba(255,107,26,0.4)' }}
        onClick={() => setShowCreate(true)}>
        <span className="font-display font-black text-2xl" style={{ color: '#000' }}>+</span>
      </button>
      {showCreate && <CreateEventSheet onClose={() => setShowCreate(false)} onCreate={onCreate} />}
    </div>
  )
}

/* ───── CREATE EVENT ───── */
function CreateEventSheet({ onClose, onCreate }: { onClose: () => void; onCreate: (e: Event) => void }) {
  const { spaces } = useRecords()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [spaceId, setSpaceId] = useState('s1')
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [isFree, setIsFree] = useState(false)
  const [price, setPrice] = useState('')

  const canSubmit = name.trim().length > 0 && date.trim().length > 0

  const submit = () => {
    if (!canSubmit) return
    const p = isFree ? 0 : Math.max(0, parseInt(price) || 0)
    onCreate({
      id: `ev-${newId('record')}`,
      name: name.trim(),
      image: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=800&h=450&fit=crop&auto=format',
      spaceId,
      organizerId: 'me',
      date: date.trim(),
      time: time.trim() || 'TBA',
      price: p,
      isFree,
      attendeeIds: [],
      description: description.trim() || 'No description yet.',
      tickets: [{ type: 'regular', price: p, label: isFree ? 'Free entry' : 'Regular' }],
    })
    onClose()
  }

  return (
    <div className="absolute inset-0 flex flex-col justify-end z-50 animate-fadeIn"
      style={{ background: 'rgba(0,0,0,0.55)' }} onClick={onClose}>
      <div className="rounded-t-3xl p-5 animate-slideUp" style={{ background: 'var(--color-eco-surface)', maxHeight: '85%', overflowY: 'auto' }}
        onClick={e => e.stopPropagation()}>
        <div className="flex justify-center mb-3"><div className="w-9 h-1 rounded-full" style={{ background: 'var(--color-eco-subtle)' }} /></div>
        <div className="font-display font-black text-lg text-eco-text mb-4">New Event</div>

        <div className="font-display font-black text-[10px] tracking-[0.2em] text-eco-subtle uppercase mb-1.5">Event name</div>
        <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Jinja Night Live"
          className="w-full rounded-xl px-3.5 py-3 font-body text-sm outline-none mb-1"
          style={{ background: 'var(--glass-06)', color: 'var(--color-eco-text)' }} />

        <div className="font-display font-black text-[10px] tracking-[0.2em] text-eco-subtle uppercase mb-1.5 mt-3.5">Description</div>
        <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} placeholder="What's this event about?"
          className="w-full rounded-xl px-3.5 py-3 font-body text-sm outline-none resize-none"
          style={{ background: 'var(--glass-06)', color: 'var(--color-eco-text)' }} />

        <div className="font-display font-black text-[10px] tracking-[0.2em] text-eco-subtle uppercase mb-1.5 mt-3.5">Where?</div>
        <div className="flex gap-2 flex-wrap">
          {spaces.map(s => (
            <button key={s.id} onClick={() => setSpaceId(s.id)}
              className="pressable px-3 py-1.5 rounded-lg text-xs font-display font-bold"
              style={{ background: spaceId === s.id ? '#FF6B1A' : 'var(--glass-08)', color: spaceId === s.id ? '#000' : 'var(--color-eco-muted)' }}>
              {s.name}
            </button>
          ))}
        </div>

        <div className="flex gap-3 mt-3.5">
          <div className="flex-1">
            <div className="font-display font-black text-[10px] tracking-[0.2em] text-eco-subtle uppercase mb-1.5">Date</div>
            <input value={date} onChange={e => setDate(e.target.value)} placeholder="Sat 20 Sep"
              className="w-full rounded-xl px-3.5 py-3 font-body text-sm outline-none"
              style={{ background: 'var(--glass-06)', color: 'var(--color-eco-text)' }} />
          </div>
          <div className="flex-1">
            <div className="font-display font-black text-[10px] tracking-[0.2em] text-eco-subtle uppercase mb-1.5">Time</div>
            <input value={time} onChange={e => setTime(e.target.value)} placeholder="7:00 PM"
              className="w-full rounded-xl px-3.5 py-3 font-body text-sm outline-none"
              style={{ background: 'var(--glass-06)', color: 'var(--color-eco-text)' }} />
          </div>
        </div>

        <button className="pressable flex items-center gap-2.5 py-3" onClick={() => setIsFree(f => !f)}>
          <div className="w-5 h-5 rounded-md flex items-center justify-center" style={{ background: isFree ? '#FF6B1A' : 'var(--glass-10)' }}>
            {isFree && <span style={{ color: '#000', fontSize: '11px', fontWeight: 900 }}>✓</span>}
          </div>
          <span className="font-body text-sm text-eco-text">This event is free</span>
        </button>
        {!isFree && (
          <input value={price} onChange={e => setPrice(e.target.value.replace(/\D/g, ''))} placeholder="Ticket price in UGX, e.g. 50000"
            inputMode="numeric"
            className="w-full rounded-xl px-3.5 py-3 font-body text-sm outline-none mb-2"
            style={{ background: 'var(--glass-06)', color: 'var(--color-eco-text)' }} />
        )}

        <button className="pressable w-full mt-2 py-3.5 rounded-xl font-display font-bold text-sm"
          disabled={!canSubmit} onClick={submit}
          style={{ background: canSubmit ? '#FF6B1A' : 'var(--glass-10)', color: canSubmit ? '#000' : 'var(--color-eco-muted)' }}>
          Create Event
        </button>
      </div>
    </div>
  )
}

function EventCard({ event, onPress }: { event: Event; onPress: () => void }) {
  const { spaceMap } = useRecords()
  const eco = useEcosystem()
  const space = spaceMap[event.spaceId]
  const attending = eco.purchasedTickets.has(event.id)

  return (
    <button className="pressable w-full text-left rounded-2xl overflow-hidden flex"
      style={{ background: 'var(--color-eco-surface)', border: '1px solid var(--glass-07)' }}
      onClick={onPress}>
      <div className="w-20 h-20 flex-shrink-0 relative overflow-hidden">
        <img src={event.image} className="w-full h-full object-cover" alt="" />
        {attending && (
          <div className="absolute inset-0 flex items-center justify-center"
            style={{ background: 'rgba(255,107,26,0.7)' }}>
            <span className="font-display font-black text-xs text-white">✓</span>
          </div>
        )}
      </div>
      <div className="flex-1 px-3 py-2.5 flex flex-col justify-between">
        <div>
          <div className="font-display font-black text-sm text-eco-text leading-tight">{event.name}</div>
          <div className="font-body text-xs text-eco-muted mt-0.5">{space?.name}</div>
          <div className="font-body text-[10px] text-eco-muted">{event.date} · {event.time}</div>
        </div>
        <div className="flex items-center justify-between mt-1">
          <span className="font-display font-black text-sm" style={{ color: event.isFree ? '#00D4FF' : '#FF6B1A' }}>
            {event.isFree ? 'FREE' : `${formatMoney(event.price)}`}
          </span>
          <div className="flex -space-x-1.5">
            {event.attendeeIds.slice(0, 3).map(uid => (
              <img key={uid} src={userMap[uid]?.avatar}
                className="w-5 h-5 rounded-full border border-eco-bg object-cover" alt="" />
            ))}
          </div>
        </div>
      </div>
    </button>
  )
}

/* ───── IMPORTED EVENTS — external booking, never ZURI Wallet ───── */
function importedDate(value: string | null) {
  if (!value) return 'Date to be confirmed'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Date to be confirmed'
  return date.toLocaleString('en-UG', { timeZone: 'Africa/Kampala', dateStyle: 'medium', timeStyle: 'short' })
}

function safeExternalUrl(url: string | null) {
  if (!url) return null
  try {
    const parsed = new URL(url)
    return parsed.protocol === 'https:' && (parsed.hostname === 'quicket.co.za' || parsed.hostname === 'www.quicket.co.za') ? parsed.href : null
  } catch { return null }
}

function ImportedEventCard({ event, onPress }: { event: ImportedMotionEvent; onPress: () => void }) {
  return (
    <button type="button" className="pressable w-full text-left rounded-2xl overflow-hidden flex"
      style={{ background: 'var(--color-eco-surface)', border: '1px solid var(--glass-07)' }} onClick={onPress}>
      <div className="w-20 h-20 flex-shrink-0 overflow-hidden" style={{ background: 'var(--color-eco-surface2)' }}>
        {event.image?.original_url && <img src={event.image.original_url} alt={event.image.alt || event.title} loading="lazy" className="w-full h-full object-cover" />}
      </div>
      <div className="flex-1 min-w-0 px-3 py-2.5 flex flex-col justify-between">
        <div>
          <div className="font-display font-black text-sm text-eco-text leading-tight">{event.title}</div>
          <div className="font-body text-xs text-eco-muted mt-0.5">{event.location?.venue || event.location?.city || 'Venue to be confirmed'}</div>
          <div className="font-body text-[10px] text-eco-muted">{importedDate(event.next_occurrence_at)}</div>
        </div>
        <span className="font-display font-black text-xs mt-1" style={{ color: '#FF6B1A' }}>QUICKET · VIEW DETAILS ›</span>
      </div>
    </button>
  )
}

function ImportedEventDetail({ event, pop }: { event: ImportedMotionEvent; pop: () => void }) {
  const bookingUrl = safeExternalUrl(event.registration_url)
  return (
    <div className="flex flex-col h-full relative">
      <div className="relative flex-shrink-0" style={{ height: '290px', background: 'var(--color-eco-surface)' }}>
        {event.image?.original_url && <img src={event.image.original_url} className="w-full h-full object-cover" alt={event.image.alt || event.title} />}
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.2), rgba(6,6,13,0.98))' }} />
        <button type="button" onClick={pop} aria-label="Back to events" className="pressable absolute top-3 left-5 w-9 h-9 rounded-full flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.55)' }}>
          <span className="text-white font-bold">←</span>
        </button>
        <div className="absolute bottom-5 left-5 right-5">
          <div className="font-body text-[10px] font-bold uppercase tracking-widest" style={{ color: '#FF9950' }}>Listed via Quicket</div>
          <h1 className="font-display font-black text-[26px] text-white leading-tight mt-1">{event.title}</h1>
          <div className="font-body text-sm text-white/65 mt-1">{importedDate(event.next_occurrence_at)}</div>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-5 pt-5 pb-32 space-y-5">
        <div className="p-4 rounded-2xl" style={{ background: 'var(--color-eco-surface)', border: '1px solid var(--glass-06)' }}>
          <div className="font-body text-[9px] text-eco-muted uppercase tracking-widest">Venue</div>
          <div className="font-body text-sm font-semibold text-eco-text mt-1">{event.location?.venue || 'Venue to be confirmed'}</div>
          {event.location?.city && <div className="font-body text-xs text-eco-muted">{event.location.city}{event.location.country ? `, ${event.location.country}` : ''}</div>}
        </div>
        {event.description && <p className="font-body text-sm text-eco-muted leading-relaxed whitespace-pre-line">{event.description}</p>}
        <div className="font-body text-xs text-eco-muted">Tickets, prices and availability are managed by Quicket. Booking externally does not create a ZURI ticket or unlock Motion Trips.</div>
      </div>
      <div className="flex-shrink-0 p-5 pb-7" style={{ background: 'var(--color-eco-bg)', borderTop: '1px solid var(--glass-07)' }}>
        {bookingUrl ? (
          <a href={bookingUrl} target="_blank" rel="noopener noreferrer" className="pressable w-full h-14 rounded-2xl font-display font-black text-sm flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #FF6B1A, #FF9950)', color: '#000' }}>
            VIEW TICKETS ON QUICKET ↗
          </a>
        ) : <div className="font-body text-sm text-eco-muted text-center">Booking link unavailable</div>}
      </div>
    </div>
  )
}

/* ───── EVENT DETAIL ───── */
function EventDetail({ eventId, pop, push, allEvents }: { eventId: string; pop: () => void; push: (s: Screen) => void; allEvents: Event[] }) {
  const { events, eventMap, spaceMap } = useRecords()
  const eco = useEcosystem()
  const event = allEvents.find(e => e.id === eventId) || eventMap[eventId]
  const space = spaceMap[event.spaceId]
  const organizer = userMap[event.organizerId]
  const attending = eco.purchasedTickets.has(eventId)

  const trackRef = useRef<HTMLDivElement>(null)
  const startX = useRef(0)
  const dragging = useRef(false)
  const [progress, setProgress] = useState(0)

  const onStart = (x: number) => { startX.current = x; dragging.current = true }
  const onMove = useCallback((x: number) => {
    if (!dragging.current || !trackRef.current) return
    const w = trackRef.current.offsetWidth - 56
    setProgress(Math.max(0, Math.min((x - startX.current) / w, 1)))
  }, [])
  const onEnd = useCallback(() => {
    dragging.current = false
    if (progress > 0.8) {
      push({ id: 'ticket_select', eventId })
    }
    setProgress(0)
  }, [progress, eventId, push])

  return (
    <div className="flex flex-col h-full">
      <div className="relative flex-shrink-0" style={{ height: '290px' }}>
        <img src={event.image} className="w-full h-full object-cover" alt={event.name} />
        <div className="absolute inset-0"
          style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.2) 0%, rgba(6,6,13,0.98) 100%)' }} />
        <button onClick={pop}
          className="pressable absolute top-3 left-5 w-9 h-9 rounded-full flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(10px)', border: '1px solid var(--glass-10)' }}>
          <span className="text-white font-bold">←</span>
        </button>
        {attending && (
          <div className="absolute top-3 right-5 px-3 py-1.5 rounded-full font-display font-black text-xs"
            style={{ background: 'rgba(255,107,26,0.2)', border: '1px solid rgba(255,107,26,0.4)', color: '#FF6B1A' }}>
            ✓ ATTENDING
          </div>
        )}
        <div className="absolute bottom-5 left-5 right-5">
          <div className="font-display font-black text-[26px] text-white leading-tight" style={{ letterSpacing: '-0.02em' }}>
            {event.name}
          </div>
          <div className="font-body text-sm text-white/65 mt-1">{event.date} · {event.time}</div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 pt-5 pb-32 space-y-5">
        {/* Venue */}
        <div className="flex items-center gap-3 p-3 rounded-2xl"
          style={{ background: 'var(--color-eco-surface)', border: '1px solid var(--glass-06)' }}>
          <div className="w-10 h-10 rounded-xl overflow-hidden flex-shrink-0">
            <img src={space.image} className="w-full h-full object-cover" alt="" />
          </div>
          <div>
            <div className="font-body text-[9px] text-eco-muted uppercase tracking-widest">Venue</div>
            <div className="font-body text-sm font-semibold text-eco-text">{space.name}</div>
            <div className="font-body text-xs text-eco-muted">{space.location}</div>
          </div>
        </div>

        {/* Organizer */}
        <div className="flex items-center gap-3">
          <img src={organizer.avatar} className="w-10 h-10 rounded-full object-cover" alt="" />
          <div>
            <div className="font-body text-[9px] text-eco-muted uppercase tracking-widest">Organizer</div>
            <div className="font-body text-sm font-semibold text-eco-text">{organizer.name}</div>
          </div>
        </div>

        <p className="font-body text-sm text-eco-muted leading-relaxed">{event.description}</p>

        {/* Attendees */}
        <div>
          <div className="font-body text-[10px] text-eco-muted uppercase tracking-widest mb-2">{event.attendeeIds.length} Attending</div>
          <div className="flex -space-x-2.5">
            {event.attendeeIds.slice(0, 7).map(uid => (
              <img key={uid} src={userMap[uid]?.avatar}
                className="w-8 h-8 rounded-full border-2 border-eco-bg object-cover" alt="" />
            ))}
          </div>
        </div>

        {/* Ticket tiers */}
        <div className="flex gap-2">
          {event.tickets.map(t => (
            <div key={t.type} className="flex-1 p-3 rounded-xl text-center"
              style={{ background: 'var(--color-eco-surface)', border: '1px solid rgba(255,107,26,0.12)' }}>
              <div className="font-display font-black text-[9px] tracking-widest text-eco-muted uppercase">{t.label}</div>
              <div className="font-display font-black text-lg mt-0.5" style={{ color: '#FF6B1A' }}>
                {t.price === 0 ? 'FREE' : `${formatMoney(t.price)}`}
              </div>
            </div>
          ))}
        </div>

        {/* Post-purchase actions */}
        {attending && (
          <div className="space-y-2 animate-fadeUp">
            <div className="p-4 rounded-2xl"
              style={{ background: 'rgba(255,107,26,0.08)', border: '1px solid rgba(255,107,26,0.25)' }}>
              <div className="font-display font-black text-sm text-eco-text">{event.tickets[0]?.label} · {formatMoney(event.tickets[0]?.price || 0)}</div>
              <div className="font-body text-xs text-eco-muted mt-0.5">✓ Confirmed</div>
            </div>
            <div className="flex gap-2">
              <button className="pressable flex-1 py-3 rounded-2xl font-display font-black text-xs"
                style={{ background: 'rgba(255,107,26,0.12)', border: '1px solid rgba(255,107,26,0.25)', color: '#FF6B1A' }}
                onClick={() => push({ id: 'trips' })}>
                VIEW TRIPS
              </button>
              <button className="pressable flex-1 py-3 rounded-2xl font-display font-black text-xs"
                style={{ background: 'rgba(255,107,26,0.12)', border: '1px solid rgba(255,107,26,0.25)', color: '#FF6B1A' }}
                onClick={() => push({ id: 'memories', eventId })}>
                MEMORIES
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Swipe CTA */}
      {!attending && (
        <div className="absolute bottom-0 left-0 right-0 p-5 pb-7"
          style={{ background: 'linear-gradient(to top, #06060D 65%, transparent)' }}>
          <div className="text-center mb-2.5">
            <span className="font-display font-black text-sm" style={{ color: '#FF6B1A' }}>
              {event.isFree ? 'FREE EVENT' : `${formatMoney(event.price)}`}
            </span>
          </div>
          <div ref={trackRef}
            className="relative h-14 rounded-2xl overflow-hidden select-none"
            style={{ background: 'rgba(255,107,26,0.1)', border: '1px solid rgba(255,107,26,0.25)' }}
            onMouseMove={e => onMove(e.clientX)}
            onMouseUp={onEnd}
            onMouseLeave={onEnd}
            onTouchMove={e => onMove(e.touches[0].clientX)}
            onTouchEnd={onEnd}>
            {/* Fill track */}
            <div className="absolute inset-y-0 left-0 rounded-2xl"
              style={{ width: `${progress * 100}%`, background: 'rgba(255,107,26,0.25)', transition: 'none' }} />
            {/* Thumb */}
            <div
              className="absolute top-1.5 bottom-1.5 w-11 rounded-xl flex items-center justify-center font-bold text-base cursor-grab"
              style={{
                left: `calc(${progress * Math.min(100 - (56 / (trackRef.current?.offsetWidth || 300) * 100), 100)}%)`,
                background: 'linear-gradient(135deg, #FF6B1A, #FF9950)',
                color: '#000',
                transition: dragging.current ? 'none' : 'left 0.3s ease',
              }}
              onMouseDown={e => onStart(e.clientX)}
              onTouchStart={e => onStart(e.touches[0].clientX)}>
              →
            </div>
            <span className="absolute inset-0 flex items-center justify-center font-display font-black text-sm pointer-events-none"
              style={{ color: 'rgba(255,107,26,0.6)', paddingLeft: '56px' }}>
              SWIPE TO ATTEND
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

/* ───── TICKET SELECT ───── */
function TicketSelect({ eventId, pop, push, allEvents }: { eventId: string; pop: () => void; push: (s: Screen) => void; allEvents: Event[] }) {
  const { eventMap } = useRecords()
  const event = allEvents.find(e => e.id === eventId) || eventMap[eventId]
  const [selected, setSelected] = useState(event.tickets[0])

  return (
    <div className="flex flex-col h-full">
      <div className="flex-shrink-0 flex items-center gap-3 px-5 pt-4 pb-5 border-b border-eco-border">
        <button onClick={pop} className="pressable w-8 h-8 rounded-full flex items-center justify-center" style={{ background: 'var(--color-eco-surface2)' }}>
          <span className="text-white text-sm">←</span>
        </button>
        <div>
          <div className="font-display font-black text-lg text-eco-text">Choose Ticket</div>
          <div className="font-body text-xs text-eco-muted">{event.name}</div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 pt-5 space-y-3">
        {event.tickets.map(ticket => (
          <button key={ticket.type}
            className="pressable w-full p-5 rounded-2xl text-left"
            style={{
              background: selected.type === ticket.type ? 'rgba(255,107,26,0.1)' : 'var(--color-eco-surface)',
              border: selected.type === ticket.type ? '1.5px solid rgba(255,107,26,0.5)' : '1px solid var(--glass-07)',
            }}
            onClick={() => setSelected(ticket)}>
            <div className="flex items-center justify-between">
              <div>
                <div className="font-display font-black text-base text-eco-text">{ticket.label}</div>
                <div className="font-body text-xs text-eco-muted mt-1">
                  {ticket.type === 'regular' && 'General admission'}
                  {ticket.type === 'vip' && 'VIP area + bar tab'}
                  {ticket.type === 'elite' && 'Elite lounge + meet & greet'}
                  {ticket.type === 'free' && 'Free admission — RSVP only'}
                </div>
              </div>
              <div className="flex flex-col items-end gap-2">
                <span className="font-display font-black text-xl" style={{ color: '#FF6B1A' }}>
                  {ticket.price === 0 ? 'FREE' : `${formatMoney(ticket.price)}`}
                </span>
                <div className="w-5 h-5 rounded-full border-2 flex items-center justify-center"
                  style={{
                    borderColor: selected.type === ticket.type ? '#FF6B1A' : 'var(--color-eco-subtle)',
                    background: selected.type === ticket.type ? '#FF6B1A' : 'transparent',
                  }}>
                  {selected.type === ticket.type && <span className="text-black font-black text-[9px]">✓</span>}
                </div>
              </div>
            </div>
          </button>
        ))}
      </div>

      <div className="flex-shrink-0 p-5 pb-8">
        <button
          className="pressable w-full h-14 rounded-2xl font-display font-black text-base"
          style={{ background: 'linear-gradient(135deg, #FF6B1A, #FF9950)', color: '#000' }}
          onClick={() => push({ id: 'ticket_confirm', eventId, ticketType: selected.type, price: selected.price })}>
          CONTINUE
        </button>
      </div>
    </div>
  )
}

/* ───── TICKET CONFIRM ───── */
function TicketConfirm({ eventId, ticketType, price, pop, push }: {
  eventId: string; ticketType: string; price: number; pop: () => void; push: (s: Screen) => void
}) {
  const { eventMap, spaceMap } = useRecords()
  const eco = useEcosystem()
  const event = eventMap[eventId]
  const [state, setState] = useState<'idle' | 'processing' | 'success'>('idle')

  const selectedTicket = event.tickets.find(ticket => ticket.type === ticketType)
  const actualPrice = selectedTicket?.price
  const alreadyOwned = eco.purchasedTickets.has(eventId)
  const canPay = actualPrice !== undefined && actualPrice === price && actualPrice <= eco.walletBalance && !alreadyOwned
  const confirm = () => {
    if (state !== 'idle' || !canPay) return
    if (!eco.completePurchase({ amount: actualPrice!, label: `${event.name} ticket`, ticketId: eventId })) {
      eco.notify('This purchase could not be completed. Check your balance and tickets.'); return
    }
    setState('success')
  }

  const afterBalance = eco.walletBalance - (actualPrice ?? 0)

  return (
    <div className="flex flex-col h-full">
      <div className="flex-shrink-0 flex items-center gap-3 px-5 pt-4 pb-4">
        <button onClick={pop} className="pressable w-8 h-8 rounded-full flex items-center justify-center" style={{ background: 'var(--color-eco-surface2)' }}>
          <span className="text-white text-sm">←</span>
        </button>
        <div className="font-display font-black text-lg text-eco-text">Confirm Purchase</div>
      </div>

      <div className="flex-1 flex flex-col px-5 pt-2 space-y-4">
        {state === 'success' ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-6 animate-bounceIn">
            <div className="w-20 h-20 rounded-full flex items-center justify-center text-4xl"
              style={{ background: 'rgba(255,107,26,0.18)', border: '1px solid rgba(255,107,26,0.3)' }}>🎟</div>
            <div className="text-center">
              <div className="font-display font-black text-3xl text-eco-text">✓ ATTENDING</div>
              <div className="font-body text-sm text-eco-muted mt-1">{event.name}</div>
              <div className="font-body text-xs mt-0.5" style={{ color: '#FF6B1A' }}>
                {ticketType.toUpperCase()} · {formatMoney(price)}
              </div>
            </div>
            <button className="pressable w-full h-14 rounded-2xl font-display font-black text-sm"
              style={{ background: 'rgba(255,107,26,0.15)', border: '1.5px solid rgba(255,107,26,0.4)', color: '#FF6B1A' }}
              onClick={() => push({ id: 'trips' })}>
              VIEW TRIPS
            </button>
            <button className="pressable w-full h-12 rounded-2xl font-display font-semibold text-sm text-eco-muted"
              style={{ background: 'var(--color-eco-surface)', border: '1px solid var(--glass-07)' }}
              onClick={() => push({ id: 'event_detail', eventId })}>
              BACK TO EVENT
            </button>
          </div>
        ) : (
          <>
            {/* Ticket */}
            <div className="p-5 rounded-2xl" style={{ background: 'var(--color-eco-surface)', border: '1px solid rgba(255,107,26,0.2)' }}>
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-display font-black text-base text-eco-text">{event.name}</div>
                  <div className="font-body text-xs text-eco-muted mt-0.5">{event.date} · {event.time}</div>
                  <div className="font-body text-xs text-eco-muted">{spaceMap[event.spaceId]?.name}</div>
                </div>
                <div className="px-2 py-1 rounded-lg font-display font-black text-xs uppercase"
                  style={{ background: 'rgba(255,107,26,0.15)', color: '#FF6B1A' }}>
                  {ticketType}
                </div>
              </div>
            </div>

            {/* summary */}
            <div className="p-5 rounded-2xl space-y-3" style={{ background: 'var(--color-eco-surface)', border: '1px solid var(--glass-06)' }}>
              <div className="font-body text-[9px] text-eco-muted uppercase tracking-widest">Wallet Summary</div>
              {[
                ['Current balance', `${formatMoney(eco.walletBalance)}`, '#D4AF37'],
                ['Ticket price', `−${formatMoney(price)}`, '#FF6B1A'],
              ].map(([l, v, c]) => (
                <div key={l} className="flex items-center justify-between">
                  <span className="font-body text-sm text-eco-muted">{l}</span>
                  <span className="font-display font-black text-base" style={{ color: c }}>{v}</span>
                </div>
              ))}
              <div className="border-t border-eco-border pt-3 flex items-center justify-between">
                <span className="font-body text-sm font-semibold text-eco-text">After purchase</span>
                <span className="font-display font-black text-xl"
                  style={{ color: afterBalance < 80000 ? '#FF2878' : '#00D4FF' }}>{formatMoney(afterBalance)}</span>
              </div>
            </div>

            <div className="flex-1" />

            <button
              className="pressable w-full h-14 rounded-2xl font-display font-black text-base mb-8"
              style={{
                background: state === 'idle' ? 'linear-gradient(135deg, #FF6B1A, #FF9950)' : 'var(--color-eco-surface)',
                color: state === 'idle' ? '#000' : '#FF6B1A',
              }}
              onClick={confirm} disabled={!canPay || state !== 'idle'}>
              {state === 'processing' ? (
                <span className="flex items-center justify-center gap-2">
                  <Dots color="#FF6B1A" /><span>PROCESSING PAYMENT...</span>
                </span>
              ) : alreadyOwned ? 'TICKET ALREADY OWNED' : !canPay ? 'INSUFFICIENT BALANCE OR INVALID TICKET' : 'CONFIRM PURCHASE'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}

/* ───── TRIPS ───── */
function TripsScreen({ push }: { push: (s: Screen) => void }) {
  const { eventMap, spaceMap } = useRecords()
  const eco = useEcosystem()
  const [tab, setTab] = useState<'share' | 'split' | 'hosted'>('share')
  const hasTicket = [...eco.purchasedTickets].length > 0
  const filtered = trips.filter(t => t.type === tab)

  return (
    <div className="flex flex-col h-full">
      <div className="flex-shrink-0 px-5 pt-4 pb-3">
        <h1 className="font-display font-black text-[28px] text-eco-text" style={{ letterSpacing: '-0.02em' }}>TRIPS</h1>
        <p className="font-body text-xs text-eco-muted mt-0.5">Move together</p>
      </div>

      {!hasTicket && (
        <div className="mx-5 mb-3 p-4 rounded-2xl flex items-center gap-3"
          style={{ background: 'rgba(255,107,26,0.07)', border: '1px solid rgba(255,107,26,0.18)' }}>
          <span>🎟</span>
          <div>
            <div className="font-body text-sm font-semibold text-eco-text">Get a ticket first</div>
            <div className="font-body text-xs text-eco-muted">Trips unlock with event tickets</div>
          </div>
        </div>
      )}

      <div className="flex-shrink-0 flex mx-5 mb-3 rounded-xl overflow-hidden"
        style={{ background: 'var(--color-eco-surface)', border: '1px solid var(--glass-07)' }}>
        {(['share', 'split', 'hosted'] as const).map(t => (
          <button key={t} className="pressable flex-1 py-3 text-[10px] font-display font-black tracking-widest uppercase"
            style={{
              background: tab === t ? 'rgba(255,107,26,0.15)' : 'transparent',
              color: tab === t ? '#FF6B1A' : 'var(--color-eco-muted)',
            }}
            onClick={() => setTab(t)}>{t}</button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-6 space-y-2.5">
        <div className="font-body text-xs text-eco-muted px-1 mb-3">
          {tab === 'share' && 'One person traveling with empty seats to offer.'}
          {tab === 'split' && 'Coordinate a shared ride. No fares — matching is free.'}
          {tab === 'hosted' && 'Organizer creates a temporary community for the trip.'}
        </div>
        {filtered.map(trip => {
          const org = userMap[trip.organizerId]
          const event = eventMap[trip.eventId]
          return (
            <button key={trip.id}
              className="pressable w-full text-left p-4 rounded-2xl"
              style={{ background: 'var(--color-eco-surface)', border: '1px solid rgba(255,107,26,0.12)' }}
              onClick={() => { if (!eco.purchasedTickets.has(trip.eventId)) { eco.notify('Get a ticket for this event to access its trips.'); return }; if (trip.type === 'hosted') push({ id: 'hosted_space', eventId: trip.eventId }); else eco.notify('Ride coordination is not connected in this prototype.') }}>
              <div className="flex items-center gap-3 mb-3">
                <img src={org.avatar} className="w-8 h-8 rounded-full object-cover" alt="" />
                <div>
                  <div className="font-body text-xs font-semibold text-eco-text">{org.name}</div>
                  <div className="font-body text-[10px] text-eco-muted">{event?.name}</div>
                </div>
                {trip.seats && (
                  <span className="ml-auto font-body text-xs font-semibold" style={{ color: '#FF6B1A' }}>{trip.seats} seats</span>
                )}
              </div>
              <div className="flex items-center gap-2 font-body text-xs text-eco-muted">
                <span>📍 {trip.departure}</span>
                <span style={{ color: '#FF6B1A' }}>→</span>
                <span>{trip.destination}</span>
              </div>
              <div className="flex items-center justify-between mt-2">
                <span className="font-body text-xs" style={{ color: '#FF6B1A' }}>Departs {trip.time}</span>
                <div className="flex items-center gap-2">
                  <div className="flex -space-x-1.5">
                    {trip.participantIds.map(uid => (
                      <img key={uid} src={userMap[uid]?.avatar}
                        className="w-5 h-5 rounded-full border border-eco-bg object-cover" alt="" />
                    ))}
                  </div>
                  {trip.type === 'hosted' && (
                    <span className="px-2 py-0.5 rounded text-[9px] font-display font-bold"
                      style={{ background: 'rgba(255,107,26,0.2)', color: '#FF6B1A' }}>HOSTED ›</span>
                  )}
                </div>
              </div>
            </button>
          )
        })}
        <button disabled title="Not connected in this prototype" className="pressable w-full h-12 rounded-2xl font-display font-semibold text-sm mt-1"
          style={{ background: 'rgba(255,107,26,0.07)', border: '1px dashed rgba(255,107,26,0.3)', color: '#FF6B1A' }}>
          + Create Trip
        </button>
      </div>
    </div>
  )
}

/* ───── HOSTED SPACE ───── */
function HostedSpace({ eventId, pop }: { eventId: string; pop: () => void }) {
  const { eventMap } = useRecords()
  const event = eventMap[eventId]
  const [tab, setTab] = useState('wall')
  const TABS = ['wall', 'chat', 'coordination', 'photos', 'updates', 'plans']

  return (
    <div className="flex flex-col h-full">
      <div className="relative flex-shrink-0" style={{ height: '150px' }}>
        <img src={event.image} className="w-full h-full object-cover" alt="" />
        <div className="absolute inset-0" style={{ background: 'rgba(6,6,13,0.7)' }} />
        <button onClick={pop}
          className="pressable absolute top-3 left-5 w-8 h-8 rounded-full flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(10px)' }}>
          <span className="text-white text-sm">←</span>
        </button>
        <div className="absolute bottom-4 left-5">
          <div className="text-[9px] font-display font-bold tracking-widest text-eco-muted uppercase mb-1">HOSTED SPACE</div>
          <div className="font-display font-black text-lg text-white">{event.name}</div>
        </div>
      </div>

      <div className="flex-shrink-0 flex gap-1 px-4 pt-3 pb-2 overflow-x-auto">
        {TABS.map(t => (
          <button key={t}
            className="pressable flex-shrink-0 px-3 py-1.5 rounded-full text-[10px] font-display font-bold uppercase"
            style={{
              background: tab === t ? 'rgba(255,107,26,0.15)' : 'transparent',
              color: tab === t ? '#FF6B1A' : 'var(--color-eco-muted)',
            }}
            onClick={() => setTab(t)}>{t}</button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-6">
        {tab === 'wall' ? (
          <div className="space-y-3 pt-2 animate-fadeUp">
            {[
              { uid: 'u3', text: 'Bus leaves from Kisementi at 6pm sharp!', time: '1h' },
              { uid: 'u1', text: "Joining the Ntinda carpool 🚗", time: '45m' },
              { uid: 'u2', text: 'Anyone near Wandegeya want to share?', time: '30m' },
            ].map((post, i) => (
              <div key={i} className="p-3 rounded-2xl"
                style={{ background: 'var(--color-eco-surface)', border: '1px solid var(--glass-06)' }}>
                <div className="flex items-center gap-2.5 mb-2">
                  <img src={userMap[post.uid]?.avatar} className="w-7 h-7 rounded-full object-cover" alt="" />
                  <span className="font-body text-xs font-semibold text-eco-text">{userMap[post.uid]?.name.split(' ')[0]}</span>
                  <span className="font-body text-[10px] text-eco-muted ml-auto">{post.time} ago</span>
                </div>
                <p className="font-body text-xs text-eco-muted">{post.text}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex items-center justify-center h-32 animate-fadeUp">
            <Empty label={`${tab.charAt(0).toUpperCase() + tab.slice(1)} coming soon`} />
          </div>
        )}
      </div>
    </div>
  )
}

/* ───── EVENT MEMORIES ───── */
function EventMemoriesScreen({ eventId, pop }: { eventId: string; pop: () => void }) {
  const { eventMap } = useRecords()
  const event = eventMap[eventId]
  const [states, setStates] = useState<Record<number, 'confirmed' | 'not_me'>>({})

  return (
    <div className="flex flex-col h-full">
      <div className="flex-shrink-0 flex items-center gap-3 px-5 pt-4 pb-3">
        <button onClick={pop} className="pressable w-8 h-8 rounded-full flex items-center justify-center" style={{ background: 'var(--color-eco-surface2)' }}>
          <span className="text-white text-sm">←</span>
        </button>
        <div>
          <div className="font-display font-black text-xl text-eco-text">EVENT MEMORIES</div>
          <div className="font-body text-xs text-eco-muted">{event.name}</div>
        </div>
      </div>

      <div className="mx-5 mb-4 p-4 rounded-2xl"
        style={{ background: 'rgba(255,107,26,0.1)', border: '1px solid rgba(255,107,26,0.28)' }}>
        <div className="font-display font-black text-base text-eco-text">MEMORY PREVIEW</div>
        <div className="font-body text-sm text-eco-muted mt-0.5">{eventMemories.length} possible photos from this event</div>
        <div className="font-body text-[10px] text-eco-muted mt-1.5 italic">Sample suggestions · never auto-published. You decide.</div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-6">
        <div className="grid grid-cols-2 gap-2.5">
          {eventMemories.map((src, i) => {
            const s = states[i]
            return (
              <div key={i} className="rounded-2xl overflow-hidden relative"
                style={{ border: `1px solid ${s === 'confirmed' ? 'rgba(255,107,26,0.5)' : 'var(--glass-07)'}` }}>
                <img src={src} className="w-full aspect-[3/4] object-cover"
                  style={{ opacity: s === 'not_me' ? 0.25 : 1 }} alt="" />
                {!s && (
                  <div className="absolute bottom-0 left-0 right-0 flex gap-1.5 p-2"
                    style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.85), transparent)' }}>
                    <button onClick={() => setStates(st => ({ ...st, [i]: 'confirmed' }))}
                      className="pressable flex-1 py-1.5 rounded-xl font-display font-black text-[10px]"
                      style={{ background: 'rgba(255,107,26,0.85)', color: '#fff' }}>
                      CONFIRM
                    </button>
                    <button onClick={() => setStates(st => ({ ...st, [i]: 'not_me' }))}
                      className="pressable flex-1 py-1.5 rounded-xl font-display font-bold text-[10px]"
                      style={{ background: 'rgba(255,255,255,0.15)', color: '#fff' }}>
                      NOT ME
                    </button>
                  </div>
                )}
                {s === 'confirmed' && (
                  <div className="absolute inset-0 flex items-center justify-center animate-scaleIn"
                    style={{ background: 'rgba(255,107,26,0.18)' }}>
                    <span className="font-display font-black text-3xl" style={{ color: '#FF6B1A' }}>✓</span>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

/* ── Shared ── */
function Empty({ label, sub }: { label: string; sub?: string }) {
  return (
    <div className="flex flex-col items-center gap-2 py-12">
      <div className="text-3xl opacity-10">◎</div>
      <div className="font-display text-eco-muted text-sm">{label}</div>
      {sub && <div className="font-body text-xs text-eco-subtle">{sub}</div>}
    </div>
  )
}
function SkeletonEvents() {
  return (
    <div className="px-4 space-y-3 pt-2 pb-6">
      {[1,2,3].map(i => <div key={i} className="shimmer h-20 rounded-2xl" />)}
    </div>
  )
}
function Dots({ color }: { color: string }) {
  return <span className="flex gap-1">{[0,1,2].map(i => (
    <span key={i} className="w-1.5 h-1.5 rounded-full animate-pulse"
      style={{ background: color, animationDelay: `${i*0.15}s` }} />
  ))}</span>
}
function SearchIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
    <circle cx="11" cy="11" r="7" stroke="#6A6A8E" strokeWidth="2" />
    <path d="M16 16L21 21" stroke="#6A6A8E" strokeWidth="2" strokeLinecap="round" />
  </svg>
}

/* ───── SEARCH — live filter across Events and Trips ───── */
function MotionSearchScreen({ pop, push }: { pop: () => void; push: (s: Screen) => void }) {
  const { events, spaceMap } = useRecords()
  const [q, setQ] = useState('')
  const query = q.trim().toLowerCase()
  const matchedEvents = query ? events.filter(e => e.name.toLowerCase().includes(query) || spaceMap[e.spaceId]?.name.toLowerCase().includes(query)) : []
  const matchedTrips = query ? trips.filter(t => t.destination.toLowerCase().includes(query) || t.departure.toLowerCase().includes(query)) : []
  const noResults = query.length > 0 && matchedEvents.length === 0 && matchedTrips.length === 0

  return (
    <div className="flex flex-col h-full">
      <div className="flex-shrink-0 flex items-center gap-3 px-5 pt-12 pb-3">
        <button onClick={pop} className="pressable w-8 h-8 rounded-full flex items-center justify-center bg-eco-surface2">
          <span className="text-eco-text">←</span>
        </button>
        <div className="flex-1 flex items-center gap-2 px-3.5 py-2.5 rounded-xl" style={{ background: 'var(--glass-07)' }}>
          <SearchIcon />
          <input autoFocus value={q} onChange={e => setQ(e.target.value)}
            placeholder="Search Events, Trips…"
            className="flex-1 bg-transparent outline-none font-body text-sm text-eco-text" />
          {q && <button onClick={() => setQ('')} className="pressable text-eco-muted text-xs">✕</button>}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-6">
        {!query && (
          <div className="pt-16 text-center">
            <div className="text-3xl mb-3">🔍</div>
            <div className="font-body text-sm text-eco-muted">Search for an Event or Trip</div>
          </div>
        )}
        {noResults && (
          <div className="pt-16 text-center">
            <div className="font-body text-sm text-eco-muted">No results for "{q}"</div>
          </div>
        )}

        {matchedEvents.length > 0 && (
          <div className="mb-5">
            <div className="font-display font-black text-[10px] tracking-[0.2em] text-eco-subtle uppercase mb-2">Events</div>
            {matchedEvents.map(event => (
              <button key={event.id} onClick={() => push({ id: 'event_detail', eventId: event.id })}
                className="pressable w-full flex items-center gap-3 py-2.5">
                <img src={event.image} className="w-11 h-11 rounded-xl object-cover flex-shrink-0" alt="" />
                <div className="text-left min-w-0">
                  <div className="font-body text-sm font-semibold text-eco-text truncate">{event.name}</div>
                  <div className="font-body text-xs text-eco-muted truncate">{spaceMap[event.spaceId]?.name} · {event.date}</div>
                </div>
              </button>
            ))}
          </div>
        )}

        {matchedTrips.length > 0 && (
          <div>
            <div className="font-display font-black text-[10px] tracking-[0.2em] text-eco-subtle uppercase mb-2">Trips</div>
            {matchedTrips.map(trip => (
              <div key={trip.id} className="flex items-center gap-3 py-2.5">
                <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(255,107,26,0.12)' }}>
                  <span style={{ fontSize: '16px' }}>🚗</span>
                </div>
                <div className="text-left min-w-0">
                  <div className="font-body text-sm font-semibold text-eco-text truncate">{trip.departure} → {trip.destination}</div>
                  <div className="font-body text-xs text-eco-muted truncate">{trip.type} · {trip.time}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
function HomeIcon({ active }: { active: boolean }) {
  const c = active ? '#FF6B1A' : 'var(--color-eco-muted)'
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
    <path d="M3 12L12 3L21 12V21H15V15H9V21H3V12Z" stroke={c} strokeWidth="1.8" strokeLinejoin="round" fill={active ? 'rgba(255,107,26,0.12)' : 'none'} />
  </svg>
}
function EventIcon({ active }: { active: boolean }) {
  const c = active ? '#FF6B1A' : 'var(--color-eco-muted)'
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
    <rect x="3" y="4" width="18" height="18" rx="3" stroke={c} strokeWidth="1.8" fill={active ? 'rgba(255,107,26,0.1)' : 'none'} />
    <path d="M16 2v4M8 2v4M3 10h18" stroke={c} strokeWidth="1.8" strokeLinecap="round" />
  </svg>
}
function TripIcon({ active }: { active: boolean }) {
  const c = active ? '#FF6B1A' : 'var(--color-eco-muted)'
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
    <path d="M5 12h14M14 6l6 6-6 6" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
}
function ChatIcon({ active }: { active: boolean }) {
  const c = active ? '#FF6B1A' : 'var(--color-eco-muted)'
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" stroke={c} strokeWidth="1.8" fill={active ? 'rgba(255,107,26,0.1)' : 'none'} />
  </svg>
}

function MyTickets({ push }: { push: (screen: Screen) => void }) {
  const state = usePrototype()
  const tickets = state.events.filter(event => state.purchasedTickets.includes(event.id))
  return <div className="h-full overflow-y-auto p-5 text-eco-text">
    <h1 className="font-display font-black text-2xl mb-4">My Tickets</h1>
    <p className="font-body text-xs text-eco-muted mb-4">Prototype reservations. These are not valid admission tickets.</p>
    {!tickets.length && <p className="font-body text-sm text-eco-muted">No tickets yet. Explore events to find something for you.</p>}
    {tickets.map(event => <button key={event.id} onClick={() => push({ id: 'event_detail', eventId: event.id })} className="w-full p-4 mb-3 text-left rounded-2xl bg-eco-surface">
      <div className="font-body font-semibold">{event.name}</div><div className="font-body text-xs text-eco-muted mt-1">{event.date} · View event →</div>
    </button>)}
  </div>
}
