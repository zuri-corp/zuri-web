import { useModuleNavigation } from '../../state/navigation'
import { useRecords, updateState, usePrototype } from '../../state/store'
import Unavailable from '../../components/Unavailable'
import { formatMoney, newId } from '../../state/core'
import { useState, useEffect, type ReactNode } from 'react'
import { useEcosystem, type CrossAppRoute } from '../../LegacyApp'
import { societies, societyTopics, products, productMap, userMap, societyMap, type Space, type Ping, type Society, type Content, type BusinessCategory, type Product, type FindCategory,  } from '../../data/catalog'

type Screen =
  | { id: 'home' }
  | { id: 'pings_list' }
  | { id: 'ping_detail'; pingId: string }
  | { id: 'space_detail'; spaceId: string }
  | { id: 'space_business'; spaceId: string }
  | { id: 'owner_dashboard'; spaceId: string }
  | { id: 'societies' }
  | { id: 'society_detail'; societyId: string }
  | { id: 'topic_chat'; topicId: string }
  | { id: 'spaces' }
  | { id: 'find' }
  | { id: 'find_category'; category: FindCategory }
  | { id: 'product_detail'; productId: string }
  | { id: 'wallet' }
  | { id: 'search' }

export default function AuraApp() {
  const { pings, spaces } = useRecords()
  const { screen, push, pop, navTab, switchNav } = useModuleNavigation<Screen>('aura', {"home": "home", "pings": "pings_list", "societies": "societies", "spaces": "spaces", "find": "find"})
  const pingsState = usePrototype()
  const allPings = pingsState.pings
  const addPing = (item: Ping) => updateState(s => ({ ...s, pings: [item, ...s.pings] }))

  const NAV = [
    { id: 'home', label: 'Home', Icon: HomeIcon },
    { id: 'pings', label: 'Pings', Icon: PingIcon },
    { id: 'spaces', label: 'Spaces', Icon: SpaceIcon },
    { id: 'societies', label: 'Societies', Icon: SocietyIcon },
    { id: 'find', label: 'Find', Icon: FindIcon },
  ]

  const records = useRecords()
  if ('spaceId' in screen && !records.spaceMap[screen.spaceId]) return <Unavailable title="Space unavailable" onBack={pop} />
  if ('pingId' in screen && !records.pingMap[screen.pingId]) return <Unavailable title="Ping unavailable" onBack={pop} />
  if ('societyId' in screen && !societyMap[screen.societyId]) return <Unavailable title="Society unavailable" onBack={pop} />
  if ('topicId' in screen && !societyTopics.some(topic => topic.id === screen.topicId)) return <Unavailable title="Topic unavailable" onBack={pop} />
  if (screen.id === 'find_category' && !['shop', 'merch', 'stay', 'dine', 'experiences', 'services', 'offers'].includes(screen.category)) return <Unavailable title="Category unavailable" onBack={pop} />
  if (screen.id === 'topic_chat') {
    const topic = societyTopics.find(t => t.id === screen.topicId)!
    if (societyMap[topic.societyId]?.privacy === 'private' && pingsState.societyMemberships[topic.societyId] !== 'joined') return <Unavailable title="Private conversation" detail="Society membership is required." onBack={pop} />
  }
  if ('productId' in screen && !productMap[screen.productId]) return <Unavailable title="Product unavailable" onBack={pop} />
  if (screen.id === 'owner_dashboard' && records.spaceMap[screen.spaceId].ownerId !== 'me') return <Unavailable title="Owner access required" onBack={pop} />
  return (
    <div className="app-aura flex flex-col h-full" style={{ background: 'var(--color-eco-bg)' }}>
      <div key={JSON.stringify(screen)} className="flex-1 overflow-hidden relative">
        {screen.id === 'home' && <AuraHome push={push} />}
        {screen.id === 'pings_list' && <PingsListScreen push={push} allPings={allPings} onCreate={addPing} />}
        {screen.id === 'ping_detail' && <PingDetail pingId={(screen as any).pingId} pop={pop} push={push} allPings={allPings} />}
        {screen.id === 'space_detail' && <SpaceDetail spaceId={(screen as any).spaceId} pop={pop} push={push} />}
        {screen.id === 'space_business' && <SpaceBusinessScreen spaceId={(screen as any).spaceId} pop={pop} />}
        {screen.id === 'owner_dashboard' && <OwnerDashboardScreen spaceId={(screen as any).spaceId} pop={pop} push={push} />}
        {screen.id === 'societies' && <SocietiesScreen push={push} />}
        {screen.id === 'society_detail' && <SocietyDetail societyId={(screen as any).societyId} pop={pop} push={push} />}
        {screen.id === 'topic_chat' && <TopicChat topicId={(screen as any).topicId} pop={pop} />}
        {screen.id === 'spaces' && <SpacesScreen push={push} />}
        {screen.id === 'find' && <FindScreen push={push} />}
        {screen.id === 'find_category' && <FindCategoryScreen category={(screen as any).category} pop={pop} push={push} />}
        {screen.id === 'product_detail' && <ProductDetailScreen productId={(screen as any).productId} pop={pop} push={push} />}
        {screen.id === 'wallet' && <WalletScreen pop={pop} />}
        {screen.id === 'search' && <AuraSearchScreen pop={pop} push={push} />}
      </div>

      <div className="flex-shrink-0 flex items-center justify-around px-1 pb-6 pt-2.5"
        style={{ background: 'var(--color-eco-bg)', borderTop: '1px solid rgba(0,212,255,0.08)' }}>
        {NAV.map(({ id, label, Icon }) => {
          const active = navTab === id
          return (
            <button key={id} className="pressable flex flex-col items-center gap-1 flex-1 py-1" onClick={() => switchNav(id)}>
              <Icon active={active} />
              <span className="font-display font-semibold text-[9px] tracking-wide"
                style={{ color: active ? '#00D4FF' : 'var(--color-eco-muted)' }}>
                {label}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

/* ───── AURA HOME — places feed, Instagram style ─────
   Every post here is Content tagged to a Space. Rizz is where it's made;
   Motion posts (event photos) land here too the moment they're tagged to a place. */
function AuraHome({ push }: { push: (s: Screen) => void }) {
  const { eventMap, spaceMap } = useRecords()
  const eco = useEcosystem()
  const [loaded, setLoaded] = useState(false)
  const [liked, setLiked] = useState<Set<string>>(new Set())
  const [commentSheet, setCommentSheet] = useState<string | null>(null)
  const { comments: extraComments } = usePrototype()
  useEffect(() => { const t = setTimeout(() => setLoaded(true), 700); return () => clearTimeout(t) }, [])

  const feed = eco.contentItems.filter(c => c.taggedSpaceIds.length > 0)
  const toggleLike = (id: string) =>
    setLiked(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n })
  const addComment = (postId: string, text: string) => {
    updateState(s => ({ ...s, comments: { ...s.comments, [postId]: [...(s.comments[postId] || []), { id: Date.now(), user: 'me', text }] } }))
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex-shrink-0 flex items-center justify-between px-5 pt-3 pb-3">
        <button {...eco.homeButtonProps} className="pressable flex items-center gap-2" style={{ touchAction: 'none' }}>
          <h1 className="font-display font-black text-xl text-eco-text" style={{ letterSpacing: '-0.02em' }}>AURA</h1>
        </button>
        <div className="flex items-center gap-2.5">
          <button className="pressable w-8 h-8 rounded-full flex items-center justify-center bg-eco-surface2"
            onClick={() => push({ id: 'search' })}>
            <SearchIconAura />
          </button>
          <img src="https://i.pravatar.cc/150?img=3" className="w-8 h-8 rounded-full object-cover border border-eco-border2" alt="You" />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {!loaded ? <SkeletonHome /> : (
          <div className="pb-6">
            {feed.length === 0 && (
              <div className="px-5 py-16 text-center">
                <div className="font-body text-sm text-eco-muted">Nothing tagged to a place yet.</div>
                <div className="font-body text-xs text-eco-subtle mt-1">Post from Rizz and tag a Space to see it here.</div>
              </div>
            )}
            {feed.map(post => {
              const space = post.taggedSpaceIds[0] ? spaceMap[post.taggedSpaceIds[0]] : null
              const event = post.taggedEventIds[0] ? eventMap[post.taggedEventIds[0]] : null
              const creator = userMap[post.creatorId]
              const isLiked = liked.has(post.id)
              return (
                <div key={post.id} className="mb-5">
                  {/* Post header */}
                  <div className="flex items-center gap-2.5 px-4 py-2.5">
                    <button className="pressable" onClick={() => eco.navigateTo('rizz', { screen: 'creator', params: { userId: creator.id } })}>
                      <img src={creator.avatar} className="w-8 h-8 rounded-full object-cover" alt="" />
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className="font-body text-xs font-semibold text-eco-text">{creator.name}</div>
                      {space && (
                        <button className="pressable flex items-center gap-1" onClick={() => push({ id: 'space_detail', spaceId: space.id })}>
                          <span style={{ color: '#00D4FF', fontSize: '9px' }}>📍</span>
                          <span className="font-body text-[10px]" style={{ color: '#00D4FF' }}>{space.name}</span>
                        </button>
                      )}
                    </div>
                    <span className="font-body text-[10px] text-eco-subtle">{post.createdAt}</span>
                  </div>

                  {/* Media */}
                  {post.media && (
                    <div className="relative w-full" style={{ aspectRatio: '4/5' }}>
                      <img src={post.media} className="absolute inset-0 w-full h-full object-cover" alt="" onDoubleClick={() => toggleLike(post.id)} />
                      {post.mediaType === 'reel' && (
                        <div className="absolute top-2.5 right-2.5 w-6 h-6 rounded-full flex items-center justify-center"
                          style={{ background: 'rgba(0,0,0,0.55)' }}>
                          <span className="text-[10px] text-white">▶</span>
                        </div>
                      )}
                      {event && (
                        <button className="pressable absolute bottom-2.5 left-2.5 px-2.5 py-1 rounded-full text-[9px] font-display font-bold flex items-center gap-1"
                          style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)', color: '#FF6B1A' }}
                          onClick={() => eco.navigateTo('motion', { screen: 'event_detail', params: { eventId: event.id } })}>
                          🎟 {event.name}
                        </button>
                      )}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-4 px-4 pt-2.5">
                    <button className="pressable" onClick={() => toggleLike(post.id)}>
                      <span style={{ fontSize: '20px', color: isLiked ? '#FF2878' : 'var(--color-eco-muted)' }}>{isLiked ? '♥' : '♡'}</span>
                    </button>
                    <span className="font-body text-xs text-eco-muted">{post.reactions + (isLiked ? 1 : 0)}</span>
                    <button className="pressable" onClick={() => setCommentSheet(post.id)}>
                      <span className="font-body text-xs" style={{ color: 'var(--color-eco-muted)' }}>
                        💬 {post.comments + (extraComments[post.id]?.length || 0)}
                      </span>
                    </button>
                  </div>

                  {/* Caption */}
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

      {commentSheet && (
        <CommentsSheet
          postId={commentSheet}
          count={(feed.find(p => p.id === commentSheet)?.comments || 0) + (extraComments[commentSheet]?.length || 0)}
          extra={extraComments[commentSheet] || []}
          onClose={() => setCommentSheet(null)}
          onAdd={text => addComment(commentSheet, text)}
        />
      )}
    </div>
  )
}

/* ───── COMMENTS — bottom sheet, reusable for any Aura post ───── */
const SEED_COMMENTS = [
  { user: 'u2', text: '🔥🔥🔥 this is fire' },
  { user: 'u5', text: 'need to pull up fr' },
]
function CommentsSheet({ postId, count, extra, onClose, onAdd }: {
  postId: string; count: number; extra: { id: number; user: string; text: string }[];
  onClose: () => void; onAdd: (text: string) => void
}) {
  const [draft, setDraft] = useState('')
  const submit = () => { if (!draft.trim()) return; onAdd(draft.trim()); setDraft('') }
  return (
    <div className="absolute inset-0 flex flex-col justify-end z-50 animate-fadeIn"
      style={{ background: 'rgba(0,0,0,0.55)' }} onClick={onClose}>
      <div className="rounded-t-3xl flex flex-col animate-slideUp" style={{ background: 'var(--color-eco-surface)', maxHeight: '70%' }}
        onClick={e => e.stopPropagation()}>
        <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
          <div className="w-9 h-1 rounded-full" style={{ background: 'var(--color-eco-subtle)' }} />
        </div>
        <div className="font-display font-black text-sm text-eco-text text-center py-2 flex-shrink-0"
          style={{ borderBottom: '1px solid var(--color-eco-border)' }}>{count} comments</div>

        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
          {[...SEED_COMMENTS, ...extra.map(e => ({ user: e.user, text: e.text }))].map((c, i) => (
            <div key={i} className="flex items-start gap-2.5">
              <img src={c.user === 'me' ? 'https://i.pravatar.cc/150?img=3' : userMap[c.user]?.avatar}
                className="w-8 h-8 rounded-full object-cover flex-shrink-0" alt="" />
              <div className="flex-1">
                <div className="font-body text-xs font-semibold text-eco-text">{c.user === 'me' ? 'You' : userMap[c.user]?.name}</div>
                <div className="font-body text-sm text-eco-muted">{c.text}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="flex-shrink-0 flex items-center gap-2.5 px-4 py-3" style={{ borderTop: '1px solid var(--color-eco-border)' }}>
          <img src="https://i.pravatar.cc/150?img=3" className="w-8 h-8 rounded-full object-cover flex-shrink-0" alt="" />
          <input value={draft} onChange={e => setDraft(e.target.value)} onKeyDown={e => e.key === 'Enter' && submit()}
            placeholder="Add a comment…" className="flex-1 rounded-full px-4 py-2 font-body text-sm outline-none"
            style={{ background: 'var(--glass-06)', color: 'var(--color-eco-text)' }} />
          <button className="pressable font-display font-bold text-xs" style={{ color: draft.trim() ? '#00D4FF' : 'var(--color-eco-subtle)' }}
            onClick={submit} disabled={!draft.trim()}>Post</button>
        </div>
      </div>
    </div>
  )
}

/* ───── PINGS — the join-a-meetup list (was folded into Home before) ───── */
function PingsListScreen({ push, allPings, onCreate }: { push: (s: Screen) => void; allPings: Ping[]; onCreate: (p: Ping) => void }) {
  const eco = useEcosystem()
  const [showCreate, setShowCreate] = useState(false)
  return (
    <div className="flex flex-col h-full relative">
      <div className="flex-shrink-0 px-5 pt-3 pb-4"
        style={{ background: 'linear-gradient(180deg, rgba(0,212,255,0.12) 0%, transparent 100%)' }}>
        <h1 className="font-display font-black text-[28px] text-eco-text" style={{ letterSpacing: '-0.02em' }}>Pings</h1>
        <div className="flex items-center gap-1.5 mt-0.5">
          <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#00D4FF' }} />
          <span className="font-body text-xs font-semibold" style={{ color: 'rgba(0,212,255,0.7)' }}>Jinja · {allPings.length} active</span>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-5 pb-24 space-y-3">
        {allPings.map(ping => (
          <PingCard key={ping.id} ping={ping}
            onPress={() => push({ id: 'ping_detail', pingId: ping.id })}
            onSpacePress={() => push({ id: 'space_detail', spaceId: ping.spaceId })}
          />
        ))}
      </div>
      <button className="pressable absolute bottom-5 right-5 w-14 h-14 rounded-full flex items-center justify-center"
        style={{ background: '#00D4FF', boxShadow: '0 8px 24px rgba(0,212,255,0.4)' }}
        onClick={() => setShowCreate(true)}>
        <span className="font-display font-black text-2xl" style={{ color: '#00131A' }}>+</span>
      </button>
      {showCreate && <CreatePingSheet onClose={() => setShowCreate(false)} onCreate={onCreate} />}
    </div>
  )
}

/* ───── CREATE PING ───── */
function CreatePingSheet({ onClose, onCreate }: { onClose: () => void; onCreate: (p: Ping) => void }) {
  const { spaces } = useRecords()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [spaceId, setSpaceId] = useState(spaces[0]?.id || '')
  const [time, setTime] = useState('')
  const [recurring, setRecurring] = useState(false)

  const canSubmit = title.trim().length > 0 && time.trim().length > 0

  const submit = () => {
    if (!canSubmit) return
    onCreate({
      id: `ping-${newId('record')}`,
      title: title.trim(),
      image: `https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=800&h=500&fit=crop&auto=format`,
      creatorId: 'me' as any,
      spaceId,
      timestamp: time.trim(),
      participantIds: [],
      isRecurring: recurring,
      description: description.trim() || 'No description yet.',
      mediaCount: 0,
    })
    onClose()
  }

  return (
    <div className="absolute inset-0 flex flex-col justify-end z-50 animate-fadeIn"
      style={{ background: 'rgba(0,0,0,0.55)' }} onClick={onClose}>
      <div className="rounded-t-3xl p-5 animate-slideUp" style={{ background: 'var(--color-eco-surface)', maxHeight: '85%', overflowY: 'auto' }}
        onClick={e => e.stopPropagation()}>
        <div className="flex justify-center mb-3">
          <div className="w-9 h-1 rounded-full" style={{ background: 'var(--color-eco-subtle)' }} />
        </div>
        <div className="font-display font-black text-lg text-eco-text mb-4">New Ping</div>

        <FormLabel>What's happening?</FormLabel>
        <FormInput value={title} onChange={setTitle} placeholder="e.g. Friday Night Hangout" />

        <FormLabel>Description</FormLabel>
        <FormTextarea value={description} onChange={setDescription} placeholder="What should people know before joining?" />

        <FormLabel>Where?</FormLabel>
        <div className="flex gap-2 flex-wrap mb-1">
          {spaces.map(s => (
            <button key={s.id} onClick={() => setSpaceId(s.id)}
              className="pressable px-3 py-1.5 rounded-lg text-xs font-display font-bold"
              style={{ background: spaceId === s.id ? '#00D4FF' : 'var(--glass-08)', color: spaceId === s.id ? '#00131A' : 'var(--color-eco-muted)' }}>
              {s.name}
            </button>
          ))}
        </div>

        <FormLabel>When?</FormLabel>
        <FormInput value={time} onChange={setTime} placeholder="e.g. Tonight · 9 PM" />

        <button className="pressable flex items-center gap-2.5 py-3" onClick={() => setRecurring(r => !r)}>
          <div className="w-5 h-5 rounded-md flex items-center justify-center"
            style={{ background: recurring ? '#00D4FF' : 'var(--glass-10)' }}>
            {recurring && <span style={{ color: '#00131A', fontSize: '11px', fontWeight: 900 }}>✓</span>}
          </div>
          <span className="font-body text-sm text-eco-text">This Ping repeats</span>
        </button>

        <button className="pressable w-full mt-3 py-3.5 rounded-xl font-display font-bold text-sm"
          disabled={!canSubmit}
          onClick={submit}
          style={{ background: canSubmit ? '#00D4FF' : 'var(--glass-10)', color: canSubmit ? '#00131A' : 'var(--color-eco-muted)' }}>
          Create Ping
        </button>
      </div>
    </div>
  )
}

/* ───── Shared form primitives (used by Create sheets across Aura) ───── */
function FormLabel({ children }: { children: ReactNode }) {
  return <div className="font-display font-black text-[10px] tracking-[0.2em] text-eco-subtle uppercase mb-1.5 mt-3.5">{children}</div>
}
function FormInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
      className="w-full rounded-xl px-3.5 py-3 font-body text-sm outline-none"
      style={{ background: 'var(--glass-06)', color: 'var(--color-eco-text)' }} />
  )
}
function FormTextarea({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={2}
      className="w-full rounded-xl px-3.5 py-3 font-body text-sm outline-none resize-none"
      style={{ background: 'var(--glass-06)', color: 'var(--color-eco-text)' }} />
  )
}

function SearchIconAura() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <circle cx="11" cy="11" r="7" stroke="#6A6A8E" strokeWidth="2" />
      <path d="M16 16L21 21" stroke="#6A6A8E" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

/* ───── SEARCH — live filter across Spaces, Pings, Societies ───── */
function AuraSearchScreen({ pop, push }: { pop: () => void; push: (s: Screen) => void }) {
  const { pings, spaces } = useRecords()
  const [q, setQ] = useState('')
  const query = q.trim().toLowerCase()
  const matchedSpaces = query ? spaces.filter(s => s.name.toLowerCase().includes(query) || s.category.toLowerCase().includes(query)) : []
  const matchedPings = query ? pings.filter(p => p.title.toLowerCase().includes(query)) : []
  const matchedSocieties = query ? societies.filter(s => s.name.toLowerCase().includes(query)) : []
  const noResults = query.length > 0 && matchedSpaces.length === 0 && matchedPings.length === 0 && matchedSocieties.length === 0

  return (
    <div className="flex flex-col h-full">
      <div className="flex-shrink-0 flex items-center gap-3 px-5 pt-3 pb-3">
        <button onClick={pop} className="pressable w-8 h-8 rounded-full flex items-center justify-center bg-eco-surface2">
          <span className="text-eco-text">←</span>
        </button>
        <div className="flex-1 flex items-center gap-2 px-3.5 py-2.5 rounded-xl" style={{ background: 'var(--glass-07)' }}>
          <SearchIconAura />
          <input autoFocus value={q} onChange={e => setQ(e.target.value)}
            placeholder="Search Spaces, Pings, Societies…"
            className="flex-1 bg-transparent outline-none font-body text-sm text-eco-text" />
          {q && (
            <button onClick={() => setQ('')} className="pressable text-eco-muted text-xs">✕</button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-6">
        {!query && (
          <div className="pt-16 text-center">
            <div className="text-3xl mb-3">🔍</div>
            <div className="font-body text-sm text-eco-muted">Search for a Space, Ping, or Society</div>
          </div>
        )}
        {noResults && (
          <div className="pt-16 text-center">
            <div className="font-body text-sm text-eco-muted">No results for "{q}"</div>
          </div>
        )}

        {matchedSpaces.length > 0 && (
          <div className="mb-5">
            <div className="font-display font-black text-[10px] tracking-[0.2em] text-eco-subtle uppercase mb-2">Spaces</div>
            {matchedSpaces.map(space => (
              <button key={space.id} onClick={() => push({ id: 'space_detail', spaceId: space.id })}
                className="pressable w-full flex items-center gap-3 py-2.5">
                <img src={space.image} className="w-11 h-11 rounded-xl object-cover flex-shrink-0" alt="" />
                <div className="text-left min-w-0">
                  <div className="font-body text-sm font-semibold text-eco-text truncate">{space.name}</div>
                  <div className="font-body text-xs text-eco-muted truncate">{space.category}</div>
                </div>
              </button>
            ))}
          </div>
        )}

        {matchedPings.length > 0 && (
          <div className="mb-5">
            <div className="font-display font-black text-[10px] tracking-[0.2em] text-eco-subtle uppercase mb-2">Pings</div>
            {matchedPings.map(ping => (
              <button key={ping.id} onClick={() => push({ id: 'ping_detail', pingId: ping.id })}
                className="pressable w-full flex items-center gap-3 py-2.5">
                <img src={ping.image} className="w-11 h-11 rounded-xl object-cover flex-shrink-0" alt="" />
                <div className="text-left min-w-0">
                  <div className="font-body text-sm font-semibold text-eco-text truncate">{ping.title}</div>
                  <div className="font-body text-xs text-eco-muted truncate">{ping.timestamp}</div>
                </div>
              </button>
            ))}
          </div>
        )}

        {matchedSocieties.length > 0 && (
          <div>
            <div className="font-display font-black text-[10px] tracking-[0.2em] text-eco-subtle uppercase mb-2">Societies</div>
            {matchedSocieties.map(society => (
              <button key={society.id} onClick={() => push({ id: 'society_detail', societyId: society.id })}
                className="pressable w-full flex items-center gap-3 py-2.5">
                <img src={society.image} className="w-11 h-11 rounded-xl object-cover flex-shrink-0" alt="" />
                <div className="text-left min-w-0">
                  <div className="font-body text-sm font-semibold text-eco-text truncate">{society.name}</div>
                  <div className="font-body text-xs text-eco-muted truncate">{society.memberCount.toLocaleString()} members</div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

/* ───── PING DETAIL ───── */
function PingDetail({ pingId, pop, push, allPings }: { pingId: string; pop: () => void; push: (s: Screen) => void; allPings: Ping[] }) {
  const { eventMap, pingMap, spaceMap } = useRecords()
  const eco = useEcosystem()
  const ping = allPings.find(p => p.id === pingId) || pingMap[pingId]
  const creator = userMap[ping.creatorId]
  const space = spaceMap[ping.spaceId]
  const society = ping.societyId ? societyMap[ping.societyId] : null
  const event = ping.eventId ? eventMap[ping.eventId] : null
  const joined = eco.joinedPings.has(pingId)
  const [joinState, setJoinState] = useState<'idle' | 'loading' | 'done'>('idle')

  useEffect(() => {
    if (joined) setJoinState('done')
  }, [joined])

  const handleJoin = () => {
    if (joinState !== 'idle') return
    setJoinState('loading')
    setTimeout(() => {
      eco.joinPing(pingId)
      setJoinState('done')
    }, 1200)
  }

  return (
    <div className="flex flex-col h-full">
      {/* Hero */}
      <div className="relative flex-shrink-0" style={{ height: '270px' }}>
        <img src={ping.image} className="w-full h-full object-cover" alt={ping.title} />
        <div className="absolute inset-0"
          style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.25) 0%, rgba(6,6,13,0.97) 100%)' }} />
        <button onClick={pop}
          className="pressable absolute top-3 left-5 w-9 h-9 rounded-full flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(10px)', border: '1px solid var(--glass-10)' }}>
          <span className="text-white font-bold">←</span>
        </button>
        {ping.isRecurring && (
          <div className="absolute bottom-4 left-5 px-2.5 py-1 rounded-full text-[9px] font-display font-bold"
            style={{ background: 'rgba(0,212,255,0.2)', border: '1px solid rgba(0,212,255,0.4)', color: '#00D4FF' }}>
            ↻ {ping.recurringLabel}
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-5 pt-5 pb-28 space-y-5">
        <div>
          <h1 className="font-display font-black text-[26px] text-eco-text" style={{ letterSpacing: '-0.02em' }}>
            {ping.title}
          </h1>
          <div className="flex items-center gap-2 mt-1.5">
            <img src={creator.avatar} className="w-5 h-5 rounded-full" alt="" />
            <span className="font-body text-xs text-eco-muted">{creator.name}</span>
            <span className="text-eco-subtle">·</span>
            <span className="font-body text-xs font-semibold" style={{ color: '#00D4FF' }}>{ping.timestamp}</span>
          </div>
        </div>

        {/* Space */}
        <button className="pressable flex items-center gap-3 p-3 rounded-2xl w-full"
          style={{ background: 'rgba(0,212,255,0.07)', border: '1px solid rgba(0,212,255,0.15)' }}
          onClick={() => push({ id: 'space_detail', spaceId: ping.spaceId })}>
          <div className="w-9 h-9 rounded-xl overflow-hidden flex-shrink-0">
            <img src={space.image} className="w-full h-full object-cover" alt="" />
          </div>
          <div className="text-left">
            <div className="font-body text-[9px] text-eco-muted uppercase tracking-widest">Space</div>
            <div className="font-body text-sm font-semibold text-eco-text">{space.name}</div>
          </div>
          <span className="ml-auto text-eco-muted">›</span>
        </button>

        <p className="font-body text-sm text-eco-muted leading-relaxed">{ping.description}</p>

        {/* Participants */}
        <div>
          <div className="text-[10px] font-display font-bold tracking-widest text-eco-muted uppercase mb-2.5">
            {ping.participantIds.length + (joined ? 1 : 0)} Joined
          </div>
          <div className="flex items-center gap-2.5">
            <div className="flex -space-x-2.5">
              {ping.participantIds.slice(0, 6).map(uid => (
                <img key={uid} src={userMap[uid]?.avatar}
                  className="w-8 h-8 rounded-full object-cover border-2 border-eco-bg" alt="" />
              ))}
              {joined && (
                <div className="w-8 h-8 rounded-full border-2 border-ping flex items-center justify-center"
                  style={{ background: 'rgba(0,212,255,0.2)' }}>
                  <span className="text-[8px] font-bold text-ping">You</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Linked society + event */}
        {(society || event) && (
          <div className="space-y-2">
            {society && (
              <button className="pressable w-full flex items-center gap-3 p-3 rounded-2xl"
                style={{ background: 'var(--color-eco-surface)', border: '1px solid var(--glass-06)' }}
                onClick={() => push({ id: 'society_detail', societyId: society.id })}>
                <img src={society.image} className="w-9 h-9 rounded-xl object-cover" alt="" />
                <div className="text-left">
                  <div className="text-[9px] font-display tracking-widest text-eco-muted uppercase">Society</div>
                  <div className="font-body text-sm font-semibold text-eco-text">{society.name}</div>
                </div>
                <span className="ml-auto text-eco-muted">›</span>
              </button>
            )}
            {event && (
              <button className="pressable w-full flex items-center gap-3 p-3 rounded-2xl"
                style={{ background: 'var(--color-eco-surface)', border: '1px solid rgba(255,107,26,0.15)' }}
                onClick={() => eco.navigateTo('motion', { screen: 'event_detail', params: { eventId: event.id } })}>
                <div className="w-9 h-9 rounded-xl overflow-hidden flex-shrink-0">
                  <img src={event.image} className="w-full h-full object-cover" alt="" />
                </div>
                <div className="text-left flex-1">
                  <div className="text-[9px] font-display tracking-widest text-eco-muted uppercase">Event · MOTION</div>
                  <div className="font-body text-sm font-semibold text-eco-text">{event.name}</div>
                </div>
                <span className="font-body text-xs font-bold" style={{ color: '#FF6B1A' }}>
                  {event.isFree ? 'FREE' : `${formatMoney(event.price)}`}
                </span>
                <span className="text-eco-muted ml-1">›</span>
              </button>
            )}
          </div>
        )}

        {/* Chat (post-join) */}
        {joinState === 'done' && (
          <div className="animate-fadeUp">
            <div className="text-[10px] font-display font-bold tracking-widest text-eco-muted uppercase mb-3">Ping Chat</div>
            <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--color-eco-surface)', border: '1px solid var(--glass-06)' }}>
              <div className="p-3 space-y-3">
                {[
                  { uid: 'u1', text: "Who's coming early?", time: '3m' },
                  { uid: 'u2', text: "I'll be there by 6:30", time: '2m' },
                  { uid: 'u3', text: 'Saving a spot near the stage 🔥', time: '1m' },
                ].map((msg, i) => (
                  <div key={i} className="flex gap-2.5">
                    <img src={userMap[msg.uid]?.avatar} className="w-6 h-6 rounded-full flex-shrink-0 mt-0.5" alt="" />
                    <div>
                      <div className="flex items-baseline gap-1.5">
                        <span className="font-body text-[11px] font-semibold text-eco-text">{userMap[msg.uid]?.name.split(' ')[0]}</span>
                        <span className="font-body text-[9px] text-eco-muted">{msg.time} ago</span>
                      </div>
                      <p className="font-body text-xs text-eco-muted mt-0.5">{msg.text}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-2 px-3 py-2.5 border-t border-eco-border">
                <div className="flex-1 px-3 py-2 rounded-full text-xs text-eco-muted font-body"
                  style={{ background: 'var(--color-eco-surface2)' }}>Say something...</div>
                <button disabled title="Not connected in this prototype" className="w-8 h-8 rounded-full flex items-center justify-center"
                  style={{ background: 'rgba(0,212,255,0.15)' }}>
                  <span className="text-xs" style={{ color: '#00D4FF' }}>↑</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Join CTA */}
      <div className="absolute bottom-0 left-0 right-0 p-5 pb-7"
        style={{ background: 'linear-gradient(to top, #06060D 65%, transparent)' }}>
        <button
          className="pressable w-full h-14 rounded-2xl font-display font-black text-base tracking-wide"
          style={{
            background: joinState === 'done'
              ? 'rgba(0,212,255,0.12)'
              : 'linear-gradient(135deg, #00D4FF 0%, #0094C8 100%)',
            border: joinState === 'done' ? '1.5px solid rgba(0,212,255,0.35)' : 'none',
            color: joinState === 'done' ? '#00D4FF' : '#000',
          }}
          onClick={handleJoin}
        >
          {joinState === 'loading' ? (
            <span className="flex items-center justify-center gap-2">
              <Dots color="#00D4FF" /><span style={{ color: '#00D4FF' }}>JOINING...</span>
            </span>
          ) : joinState === 'done' ? (
            <span>✓ JOINED</span>
          ) : 'JOIN PING'}
        </button>
      </div>
    </div>
  )
}

/* ───── SPACE DETAIL ───── */
function SpaceDetail({ spaceId, pop, push }: { spaceId: string; pop: () => void; push: (s: Screen) => void }) {
  const { events, pings, spaceMap } = useRecords()
  const eco = useEcosystem()
  const space = spaceMap[spaceId]
  const hasBusiness = !!space.businessCategories?.length
  const [tab, setTab] = useState(hasBusiness ? 'pings' : 'now')
  const spacePings = pings.filter(p => p.spaceId === spaceId)
  const spaceEvents = events.filter(e => e.spaceId === spaceId)
  const spaceContent = eco.contentItems.filter(c => c.taggedSpaceIds.includes(spaceId))
  const spaceSocieties = societies.filter(s => s.spaceIds.includes(spaceId))
  const TABS = hasBusiness
    ? ['business', 'pings', 'events', 'media', 'societies', 'about']
    : ['now', 'pings', 'events', 'media', 'societies', 'about']

  return (
    <div className="flex flex-col h-full">
      <div className="relative flex-shrink-0" style={{ height: '230px' }}>
        <img src={space.image} className="w-full h-full object-cover" alt={space.name} />
        <div className="absolute inset-0"
          style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.2) 0%, rgba(6,6,13,0.97) 100%)' }} />
        <button onClick={pop}
          className="pressable absolute top-3 left-5 w-9 h-9 rounded-full flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(10px)', border: '1px solid var(--glass-10)' }}>
          <span className="text-white font-bold">←</span>
        </button>
        {space.ownerId === 'me' && (
          <button onClick={() => push({ id: 'owner_dashboard', spaceId })}
            className="pressable absolute top-3 right-5 flex items-center gap-1.5 px-3 py-2 rounded-full"
            style={{ background: 'rgba(212,175,55,0.85)', backdropFilter: 'blur(10px)' }}>
            <span style={{ fontSize: '12px' }}>⚙️</span>
            <span className="font-display font-black text-[10px]" style={{ color: '#1A1500' }}>MANAGE</span>
          </button>
        )}
        <div className="absolute bottom-4 left-5 right-5">
          <div className="flex items-center gap-1.5 mb-1.5">
            <div className="inline-block px-2 py-0.5 rounded text-[9px] font-display font-bold tracking-widest uppercase"
              style={{ background: 'rgba(0,212,255,0.2)', color: '#00D4FF' }}>{space.category}</div>
            {space.spaceType === 'establishment' && (
              <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-display font-bold tracking-widest uppercase"
                style={{ background: 'rgba(212,175,55,0.22)', color: '#D4AF37' }}>
                SAMPLE ESTABLISHMENT
              </div>
            )}
          </div>
          <div className="font-display font-black text-2xl text-white" style={{ letterSpacing: '-0.02em' }}>{space.name}</div>
          <div className="flex items-center gap-1.5 mt-1">
            <span className="text-[10px]">📍</span>
            <span className="font-body text-xs text-white/60">{space.location}</span>
            <span className="text-white/30">·</span>
            <span className="font-body text-xs text-white/40">{space.followers.toLocaleString()} following</span>
          </div>
        </div>
      </div>

      {space.spaceType === 'establishment' && (
        <div className="flex-shrink-0 mx-4 mt-3 px-3.5 py-2.5 rounded-xl flex items-center gap-2.5"
          style={{ background: 'rgba(212,175,55,0.08)', border: '1px solid rgba(212,175,55,0.2)' }}>
          <span style={{ fontSize: '14px' }}>🏛</span>
          <span className="font-body text-[11px] leading-snug" style={{ color: 'var(--color-eco-muted)' }}>
            This is a sample <span style={{ color: '#D4AF37', fontWeight: 700 }}>Establishment</span> — shown to demonstrate business features.
          </span>
        </div>
      )}

      {/* Contextual Message / Call — communication lives where the relationship is */}
      <div className="flex-shrink-0 flex gap-2 mx-4 mt-3">
        <button disabled title="Not connected in this prototype" className="pressable flex-1 py-2.5 rounded-xl font-display font-bold text-xs"
          style={{ background: 'var(--glass-08)', color: 'var(--color-eco-text)' }}>💬 Message</button>
        <button disabled title="Not connected in this prototype" className="pressable flex-1 py-2.5 rounded-xl font-display font-bold text-xs"
          style={{ background: 'var(--glass-08)', color: 'var(--color-eco-text)' }}>📞 Call</button>
      </div>

      {/* Stats */}
      <div className="flex-shrink-0 flex justify-around py-3.5 mx-4 rounded-2xl my-3"
        style={{ background: 'var(--color-eco-surface)', border: '1px solid var(--glass-06)' }}>
        {([
          [space.pingCount, 'Pings', '#00D4FF'],
          [space.eventCount, 'Events', '#FF6B1A'],
          [space.rizzCount, 'Rizz', '#FF2878'],
          [space.projectCount, 'Projects', '#4B8CF7'],
          [space.societyCount, 'Soc.', '#D4AF37'],
        ] as [number, string, string][]).map(([n, l, c]) => (
          <div key={l} className="flex flex-col items-center">
            <span className="font-display font-black text-lg" style={{ color: c }}>{n}</span>
            <span className="font-body text-[9px] text-eco-muted">{l}</span>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex-shrink-0 flex gap-1 px-4 overflow-x-auto pb-2">
        {TABS.map(t => (
          <button key={t}
            className="pressable flex-shrink-0 px-3 py-1.5 rounded-full text-[10px] font-display font-bold uppercase tracking-wide"
            style={{
              background: tab === t ? 'rgba(0,212,255,0.15)' : 'transparent',
              color: tab === t ? '#00D4FF' : 'var(--color-eco-muted)',
              border: tab === t ? '1px solid rgba(0,212,255,0.3)' : '1px solid transparent',
            }}
            onClick={() => t === 'business' ? push({ id: 'space_business', spaceId }) : setTab(t)}>
            {t === 'business' ? '🛍 business' : t}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-6 pt-1">
        {tab === 'now' && (
          <div className="space-y-4 animate-fadeUp">
            <p className="font-body text-sm text-eco-muted leading-relaxed">{space.description}</p>
            {spacePings.map(p => (
              <PingCard key={p.id} ping={p}
                onPress={() => push({ id: 'ping_detail', pingId: p.id })} onSpacePress={() => {}} />
            ))}
            {spaceEvents.map(e => (
              <EventRow key={e.id} event={e}
                onPress={() => eco.navigateTo('motion', { screen: 'event_detail', params: { eventId: e.id } })} />
            ))}
          </div>
        )}
        {tab === 'pings' && (
          <div className="space-y-3 animate-fadeUp">
            {spacePings.length === 0 ? <Empty label="No pings yet" /> :
              spacePings.map(p => <PingCard key={p.id} ping={p}
                onPress={() => push({ id: 'ping_detail', pingId: p.id })} onSpacePress={() => {}} />)
            }
          </div>
        )}
        {tab === 'events' && (
          <div className="space-y-3 animate-fadeUp">
            {spaceEvents.length === 0 ? <Empty label="No upcoming events" /> :
              spaceEvents.map(e => <EventRow key={e.id} event={e}
                onPress={() => eco.navigateTo('motion', { screen: 'event_detail', params: { eventId: e.id } })} />)
            }
          </div>
        )}
        {tab === 'media' && (
          <div className="grid grid-cols-2 gap-2 animate-fadeUp">
            {spaceContent.map(c => (
              <button key={c.id} className="pressable aspect-[3/4] rounded-2xl overflow-hidden relative"
                onClick={() => eco.navigateTo('rizz', { screen: 'reels', params: { contentId: c.id } })}>
                <img src={c.media} className="w-full h-full object-cover" alt="" />
                <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.6) 0%, transparent 55%)' }} />
                <div className="absolute bottom-2 left-2 right-2 font-body text-[9px] text-white/80 line-clamp-2">{c.caption}</div>
              </button>
            ))}
          </div>
        )}
        {tab === 'societies' && (
          <div className="space-y-2.5 animate-fadeUp">
            {spaceSocieties.map(s => (
              <SocietyRow key={s.id} society={s} onPress={() => push({ id: 'society_detail', societyId: s.id })} />
            ))}
          </div>
        )}
        {tab === 'about' && (
          <div className="animate-fadeUp space-y-4">
            <p className="font-body text-sm text-eco-muted leading-relaxed">{space.description}</p>
            {[
              { icon: '📍', label: 'Location', value: space.location },
              { icon: '🏷', label: 'Category', value: space.category },
              { icon: '👥', label: 'Followers', value: `${space.followers.toLocaleString()} people` },
            ].map(r => (
              <div key={r.label} className="flex items-center gap-3">
                <span className="text-base">{r.icon}</span>
                <div>
                  <div className="font-body text-[9px] text-eco-muted uppercase tracking-widest">{r.label}</div>
                  <div className="font-body text-sm text-eco-text">{r.value}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

/* ───── SPACE BUSINESS — full immersive shopping/booking experience ─────
   One accordion of categories; each offering renders a UI appropriate to its
   fulfillment type — product (cart+variants), appointment/rental (slot picker),
   subscription (recurring), pass (prepaid credits redeemed over time), or info. */
function SpaceBusinessScreen({ spaceId, pop }: { spaceId: string; pop: () => void }) {
  const { spaceMap } = useRecords()
  const eco = useEcosystem()
  const space = spaceMap[spaceId]
  const categories: BusinessCategory[] = space.businessCategories || []
  const [expanded, setExpanded] = useState<Set<string>>(new Set([categories[0]?.id].filter(Boolean) as string[]))
  const [cart, setCart] = useState<Record<string, number>>({})
  const [variantChoice, setVariantChoice] = useState<Record<string, string>>({})
  const [slotChoice, setSlotChoice] = useState<Record<string, string>>({})
  const [booked, setBooked] = useState<Record<string, string>>(() => Object.fromEntries(eco.bookings.filter(b => b.spaceId === spaceId && !b.detail.startsWith('Subscription') && b.detail !== 'Pass purchase').map(b => [b.offeringId, b.detail])))
  const [subscribed, setSubscribed] = useState<Set<string>>(() => new Set(eco.bookings.filter(b => b.spaceId === spaceId && b.detail.startsWith('Subscription')).map(b => b.offeringId)))
  const [passOwned, setPassOwned] = useState<Set<string>>(() => new Set(eco.bookings.filter(b => b.spaceId === spaceId && b.detail === 'Pass purchase').map(b => b.offeringId)))
  const { passUses: passUsed } = usePrototype()
  const setPassUsed = (update: (uses: Record<string, number>) => Record<string, number>) => updateState(s => ({ ...s, passUses: update(s.passUses) }))
  const [busyId, setBusyId] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [showCart, setShowCart] = useState(false)

  const flash = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 1800) }
  const toggleCat = (id: string) => setExpanded(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n })
  const categoryOf = (offeringId: string) => categories.find(c => c.offerings.some(o => o.id === offeringId))?.name || ''

  const addToCart = (offeringId: string) => {
    setCart(c => ({ ...c, [offeringId]: (c[offeringId] || 0) + 1 }))
    flash('Added to cart')
  }

  const bookOffering = (offering: { id: string; name: string; price?: number }) => {
    if (busyId || booked[offering.id]) return
    const slot = slotChoice[offering.id]
    if (!slot) { flash('Pick a time or date first'); return }
    const price = offering.price || 0
    if (price > eco.walletBalance) { flash('Insufficient wallet balance'); return }
    setBusyId(offering.id)
    setTimeout(() => {
      if (!eco.completePurchase({ amount: price, label: offering.name, bookings: [{ spaceId, offeringId: offering.id, offeringName: offering.name, categoryName: categoryOf(offering.id), buyerId: 'me', price, detail: slot }] })) { setBusyId(null); flash('Booking declined. Check your balance or offering availability.'); return }
      setBooked(b => ({ ...b, [offering.id]: slot }))
      setBusyId(null)
      flash(`Booked — ${offering.name} · ${slot}`)
    }, 900)
  }

  const subscribe = (offering: { id: string; name: string; price?: number }) => {
    if (busyId || subscribed.has(offering.id)) return
    const price = offering.price || 0
    if (price > eco.walletBalance) { flash('Insufficient wallet balance'); return }
    setBusyId(offering.id)
    setTimeout(() => {
      if (!eco.completePurchase({ amount: price, label: `${offering.name} · first cycle`, bookings: [{ spaceId, offeringId: offering.id, offeringName: offering.name, categoryName: categoryOf(offering.id), buyerId: 'me', price, detail: 'Subscription · first cycle' }] })) { setBusyId(null); flash('Subscription declined. Check your balance or offering availability.'); return }
      setSubscribed(s => new Set([...s, offering.id]))
      setBusyId(null)
      flash(`Subscribed — ${offering.name}`)
    }, 900)
  }

  const buyPass = (offering: { id: string; name: string; price?: number }) => {
    if (busyId || passOwned.has(offering.id)) return
    const price = offering.price || 0
    if (price > eco.walletBalance) { flash('Insufficient wallet balance'); return }
    setBusyId(offering.id)
    setTimeout(() => {
      if (!eco.completePurchase({ amount: price, label: offering.name, bookings: [{ spaceId, offeringId: offering.id, offeringName: offering.name, categoryName: categoryOf(offering.id), buyerId: 'me', price, detail: 'Pass purchase' }] })) { setBusyId(null); flash('Pass declined. Check your balance or offering availability.'); return }
      setPassOwned(s => new Set([...s, offering.id]))
      setPassUsed(u => ({ ...u, [offering.id]: 0 }))
      setBusyId(null)
      flash(`Pass purchased — ${offering.name}`)
    }, 900)
  }

  const redeemPass = (offering: { id: string; name: string; totalCredits?: number }) => {
    if (!passOwned.has(offering.id)) { flash('Purchase a pass first'); return }
    const used = passUsed[offering.id] || 0
    if (used >= (offering.totalCredits || 0)) { flash('No visits left'); return }
    setPassUsed(u => ({ ...u, [offering.id]: used + 1 }))
    flash(`Visit redeemed — ${used + 1}/${offering.totalCredits} used`)
  }

  const allOfferings = categories.flatMap(c => c.offerings)
  const cartCount = Object.values(cart).reduce((a, b) => a + b, 0)
  const cartTotal = Object.entries(cart).reduce((sum, [id, qty]) => {
    const off = allOfferings.find(o => o.id === id)
    return sum + (off?.price || 0) * qty
  }, 0)

  return (
    <div className="flex flex-col h-full relative" style={{ background: 'var(--color-eco-bg)' }}>
      <div className="relative flex-shrink-0" style={{ height: '190px' }}>
        <img src={space.image} className="w-full h-full object-cover" alt={space.name} />
        <div className="absolute inset-0"
          style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.15) 0%, rgba(6,6,13,0.97) 100%)' }} />
        <button onClick={pop}
          className="pressable absolute top-3 left-5 w-9 h-9 rounded-full flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.1)' }}>
          <span className="text-white font-bold">←</span>
        </button>
        {cartCount > 0 && (
          <button className="pressable absolute top-3 right-5 w-9 h-9 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.1)' }}
            onClick={() => setShowCart(true)}>
            <span className="text-white" style={{ fontSize: '15px' }}>🛒</span>
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center font-display font-black"
              style={{ background: '#00D4FF', color: '#000', fontSize: '9px' }}>{cartCount}</span>
          </button>
        )}
        <div className="absolute bottom-4 left-5 right-5">
          <div className="inline-block px-2 py-0.5 rounded text-[9px] font-display font-bold tracking-widest uppercase mb-1.5"
            style={{ background: 'rgba(0,212,255,0.2)', color: '#00D4FF' }}>Business</div>
          <div className="font-display font-black text-2xl text-white" style={{ letterSpacing: '-0.02em' }}>{space.name}</div>
          <div className="font-body text-xs text-white/60 mt-0.5">{categories.length} categories · {allOfferings.length} offerings</div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pt-4 pb-24 space-y-3">
        {categories.map(cat => {
          const isOpen = expanded.has(cat.id)
          return (
            <div key={cat.id} className="rounded-2xl overflow-hidden"
              style={{ background: 'var(--color-eco-surface)', border: '1px solid var(--glass-06)' }}>
              <button className="pressable flex items-center gap-3 w-full px-4 py-3.5 text-left" onClick={() => toggleCat(cat.id)}>
                <span className="text-xl">{cat.icon}</span>
                <div className="flex-1">
                  <div className="font-display font-black text-sm text-eco-text">{cat.name}</div>
                  <div className="font-body text-[10px] text-eco-muted">{cat.offerings.length} available</div>
                </div>
                <span className="text-eco-subtle transition-transform" style={{ transform: isOpen ? 'rotate(180deg)' : 'none' }}>⌄</span>
              </button>

              {isOpen && (
                <div className="px-4 pb-4 space-y-3 animate-fadeUp">
                  {cat.offerings.map(off => {
                    const isBooked = !!booked[off.id]
                    const isBusy = busyId === off.id
                    const inCart = cart[off.id] || 0
                    const isSubscribed = subscribed.has(off.id)
                    const ownsPass = passOwned.has(off.id)
                    const used = passUsed[off.id] || 0
                    const isPaused = eco.pausedOfferings.has(off.id)

                    if (isPaused) {
                      return (
                        <div key={off.id} className="rounded-xl overflow-hidden opacity-60" style={{ background: 'var(--color-eco-surface2)' }}>
                          <div className="flex gap-2 p-1.5">
                            {off.images.map((img, i) => (
                              <img key={i} src={img} className="rounded-lg object-cover flex-1 grayscale" style={{ height: '84px' }} alt={off.name} />
                            ))}
                          </div>
                          <div className="p-3">
                            <div className="font-display font-bold text-sm text-eco-text leading-tight">{off.name}</div>
                            <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg"
                              style={{ background: 'var(--glass-08)' }}>
                              <span style={{ fontSize: '10px' }}>⏸</span>
                              <span className="font-body text-[10px] text-eco-muted font-semibold">Currently unavailable</span>
                            </div>
                          </div>
                        </div>
                      )
                    }
                    return (
                      <div key={off.id} className="rounded-xl overflow-hidden" style={{ background: 'var(--color-eco-surface2)' }}>
                        <div className="flex gap-2 p-1.5">
                          {off.images.map((img, i) => (
                            <img key={i} src={img} className="rounded-lg object-cover flex-1" style={{ height: '84px' }} alt={off.name} />
                          ))}
                        </div>
                        <div className="p-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="font-display font-bold text-sm text-eco-text leading-tight">{off.name}</div>
                            {off.priceLabel && (
                              <span className="font-display font-black text-xs flex-shrink-0" style={{ color: '#00D4FF' }}>{off.priceLabel}</span>
                            )}
                          </div>
                          <p className="font-body text-xs text-eco-muted mt-1 leading-relaxed">{off.description}</p>

                          {/* PRODUCT — variant chips + add to cart */}
                          {off.offeringType === 'product' && (
                            <>
                              {off.variants && (
                                <div className="flex gap-1.5 flex-wrap mt-2.5">
                                  {off.variants.map(v => (
                                    <button key={v} onClick={() => setVariantChoice(s => ({ ...s, [off.id]: v }))}
                                      className="pressable px-2.5 py-1 rounded-lg text-[10px] font-display font-bold"
                                      style={{
                                        background: variantChoice[off.id] === v ? '#00D4FF' : 'var(--glass-08)',
                                        color: variantChoice[off.id] === v ? '#00131A' : 'var(--color-eco-muted)',
                                      }}>{v}</button>
                                  ))}
                                </div>
                              )}
                              <button
                                className="pressable w-full mt-3 py-2 rounded-lg font-display font-bold text-xs"
                                onClick={() => { if (off.variants && !variantChoice[off.id]) { flash('Pick a size first'); return } addToCart(off.id) }}
                                style={{ background: inCart ? 'rgba(0,212,255,0.15)' : '#00D4FF', color: inCart ? '#00D4FF' : '#00131A' }}>
                                {inCart ? `✓ In cart · ${inCart}` : 'Add to Cart'}
                              </button>
                            </>
                          )}

                          {/* APPOINTMENT / RENTAL — slot picker then book */}
                          {(off.offeringType === 'appointment' || off.offeringType === 'rental') && (
                            <>
                              {!isBooked && off.slots && (
                                <div className="flex gap-1.5 flex-wrap mt-2.5">
                                  {off.slots.map(s => (
                                    <button key={s} onClick={() => setSlotChoice(sc => ({ ...sc, [off.id]: s }))}
                                      className="pressable px-2.5 py-1 rounded-lg text-[10px] font-display font-bold"
                                      style={{
                                        background: slotChoice[off.id] === s ? '#00D4FF' : 'var(--glass-08)',
                                        color: slotChoice[off.id] === s ? '#00131A' : 'var(--color-eco-muted)',
                                      }}>{s}</button>
                                  ))}
                                </div>
                              )}
                              <button
                                className="pressable w-full mt-3 py-2 rounded-lg font-display font-bold text-xs"
                                disabled={isBooked || isBusy}
                                onClick={() => bookOffering(off)}
                                style={{
                                  background: isBooked ? 'rgba(0,212,255,0.15)' : isBusy ? 'var(--glass-10)' : '#00D4FF',
                                  color: isBooked ? '#00D4FF' : isBusy ? 'var(--color-eco-muted)' : '#00131A',
                                }}>
                                {isBooked ? `✓ Booked · ${booked[off.id]}` : isBusy ? 'Booking…' : off.offeringType === 'rental' ? 'Reserve' : 'Book'}
                              </button>
                            </>
                          )}

                          {/* SUBSCRIPTION — recurring access */}
                          {off.offeringType === 'subscription' && (
                            <button
                              className="pressable w-full mt-3 py-2 rounded-lg font-display font-bold text-xs"
                              disabled={isSubscribed || isBusy}
                              onClick={() => subscribe(off)}
                              style={{
                                background: isSubscribed ? 'rgba(0,212,255,0.15)' : isBusy ? 'var(--glass-10)' : '#00D4FF',
                                color: isSubscribed ? '#00D4FF' : isBusy ? 'var(--color-eco-muted)' : '#00131A',
                              }}>
                              {isSubscribed ? '✓ Active · renews monthly' : isBusy ? 'Subscribing…' : `Subscribe ${off.priceLabel || ''}`}
                            </button>
                          )}

                          {/* PASS — prepaid credits, redeemed over time */}
                          {off.offeringType === 'pass' && (
                            <>
                              {!ownsPass ? (
                                <button
                                  className="pressable w-full mt-3 py-2 rounded-lg font-display font-bold text-xs"
                                  disabled={isBusy}
                                  onClick={() => buyPass(off)}
                                  style={{ background: isBusy ? 'var(--glass-10)' : '#00D4FF', color: isBusy ? 'var(--color-eco-muted)' : '#00131A' }}>
                                  {isBusy ? 'Purchasing…' : 'Buy Pass'}
                                </button>
                              ) : (
                                <div className="mt-3">
                                  <div className="flex items-center justify-between mb-1.5">
                                    <span className="font-body text-[10px] text-eco-muted">{used}/{off.totalCredits} visits used</span>
                                  </div>
                                  <div className="h-1.5 rounded-full mb-2.5" style={{ background: 'var(--glass-08)' }}>
                                    <div className="h-full rounded-full" style={{ width: `${(used / (off.totalCredits || 1)) * 100}%`, background: '#00D4FF' }} />
                                  </div>
                                  <button
                                    className="pressable w-full py-2 rounded-lg font-display font-bold text-xs"
                                    disabled={used >= (off.totalCredits || 0)}
                                    onClick={() => redeemPass(off)}
                                    style={{
                                      background: used >= (off.totalCredits || 0) ? 'var(--glass-10)' : 'rgba(0,212,255,0.15)',
                                      color: used >= (off.totalCredits || 0) ? 'var(--color-eco-muted)' : '#00D4FF',
                                    }}>
                                    {used >= (off.totalCredits || 0) ? 'Fully redeemed' : 'Redeem a visit'}
                                  </button>
                                </div>
                              )}
                            </>
                          )}

                          {/* INFO — no transaction, just detail */}
                          {off.offeringType === 'info' && (
                            <div className="mt-2.5 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg"
                              style={{ background: 'var(--glass-06)' }}>
                              <span style={{ fontSize: '10px' }}>ℹ️</span>
                              <span className="font-body text-[10px] text-eco-muted font-semibold">Included, no booking needed</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Cart summary bar */}
      {cartCount > 0 && !showCart && (
        <button className="pressable absolute left-4 right-4 bottom-4 rounded-2xl flex items-center justify-between px-4 py-3.5"
          style={{ background: '#00D4FF', boxShadow: '0 8px 24px rgba(0,212,255,0.35)' }}
          onClick={() => setShowCart(true)}>
          <span className="font-display font-black text-sm" style={{ color: '#00131A' }}>🛒 {cartCount} item{cartCount > 1 ? 's' : ''} · {formatMoney(cartTotal)}</span>
          <span className="font-display font-black text-xs" style={{ color: '#00131A' }}>View Cart ›</span>
        </button>
      )}

      {/* Toast */}
      {toast && (
        <div className="absolute left-1/2 top-4 -translate-x-1/2 px-4 py-2 rounded-full animate-fadeUp"
          style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)' }}>
          <span className="font-body text-xs font-semibold text-white">{toast}</span>
        </div>
      )}

      {/* Cart sheet */}
      {showCart && (
        <div className="absolute inset-0 flex flex-col justify-end z-50 animate-fadeIn"
          style={{ background: 'rgba(0,0,0,0.55)' }} onClick={() => setShowCart(false)}>
          <div className="rounded-t-3xl p-5 animate-slideUp" style={{ background: 'var(--color-eco-surface)' }}
            onClick={e => e.stopPropagation()}>
            <div className="flex justify-center mb-3">
              <div className="w-9 h-1 rounded-full" style={{ background: 'var(--color-eco-subtle)' }} />
            </div>
            <div className="font-display font-black text-base text-eco-text mb-3">Your Cart</div>
            <div className="space-y-2.5 mb-4 max-h-[240px] overflow-y-auto">
              {Object.entries(cart).map(([id, qty]) => {
                const off = allOfferings.find(o => o.id === id)
                if (!off) return null
                return (
                  <div key={id} className="flex items-center justify-between">
                    <div>
                      <div className="font-body text-sm font-semibold text-eco-text">{off.name}</div>
                      <div className="font-body text-[10px] text-eco-muted">Qty {qty}</div>
                    </div>
                    <span className="font-display font-bold text-sm" style={{ color: '#00D4FF' }}>{formatMoney((off.price || 0) * qty)}</span>
                  </div>
                )
              })}
            </div>
            <div className="flex items-center justify-between mb-3 pt-3" style={{ borderTop: '1px solid var(--color-eco-border)' }}>
              <span className="font-body text-xs text-eco-muted">Total</span>
              <span className="font-display font-black text-lg" style={{ color: '#00D4FF' }}>{formatMoney(cartTotal)}</span>
            </div>
            <button
              className="pressable w-full py-3.5 rounded-xl font-display font-bold text-sm"
              style={{ background: '#00D4FF', color: '#00131A' }}
              onClick={() => {
                if (cartTotal > eco.walletBalance) { flash('Insufficient wallet balance'); return }
                const orderBookings = Object.entries(cart).flatMap(([id, qty]) => {
                  const off = allOfferings.find(o => o.id === id)
                  return off ? [{ spaceId, offeringId: id, offeringName: off.name, categoryName: categoryOf(id), buyerId: 'me', price: (off.price || 0) * qty, detail: `Qty ${qty}${variantChoice[id] ? ' · ' + variantChoice[id] : ''}` }] : []
                })
                if (!orderBookings.length || !eco.completePurchase({ amount: cartTotal, label: `${space.name} order`, bookings: orderBookings })) { flash('Order declined. Check your balance or offering availability.'); return }
                setCart({})
                setShowCart(false)
                flash('Order placed ✓')
              }}>
              Checkout · {formatMoney(cartTotal)}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

/* ───── OWNER DASHBOARD — run the business, don't just browse it ─────
   Stats, real bookings from every purchase made anywhere in the app,
   and the ability to pause an offering or add a new one. */
function OwnerDashboardScreen({ spaceId, pop, push }: { spaceId: string; pop: () => void; push: (s: Screen) => void }) {
  const { spaceMap } = useRecords()
  const eco = useEcosystem()
  const space = spaceMap[spaceId]
  const categories: BusinessCategory[] = space.businessCategories || []
  const [tab, setTab] = useState<'overview' | 'bookings' | 'offerings'>('overview')
  const [showAddOffering, setShowAddOffering] = useState<string | null>(null)

  const spaceBookings = eco.bookings.filter(b => b.spaceId === spaceId)
  const totalRevenue = spaceBookings.reduce((sum, b) => sum + b.price, 0)
  const allOfferings = categories.flatMap(c => c.offerings)
  const activeCount = allOfferings.filter(o => !eco.pausedOfferings.has(o.id)).length

  return (
    <div className="flex flex-col h-full" style={{ background: 'var(--color-eco-bg)' }}>
      <div className="flex-shrink-0 flex items-center gap-3 px-5 pt-12 pb-3">
        <button onClick={pop} className="pressable w-8 h-8 rounded-full flex items-center justify-center bg-eco-surface2">
          <span className="text-eco-text">←</span>
        </button>
        <div className="flex-1 min-w-0">
          <div className="font-display font-black text-base text-eco-text truncate">{space.name}</div>
          <div className="font-body text-[11px]" style={{ color: '#D4AF37' }}>Owner Dashboard</div>
        </div>
        <button onClick={() => push({ id: 'space_business', spaceId })}
          className="pressable px-3 py-1.5 rounded-lg font-display font-bold text-[10px]"
          style={{ background: 'var(--glass-08)', color: 'var(--color-eco-muted)' }}>
          View as customer
        </button>
      </div>

      <div className="flex-shrink-0 flex gap-2 px-5 pb-3">
        {(['overview', 'bookings', 'offerings'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className="pressable flex-1 py-2 rounded-xl text-xs font-display font-bold uppercase"
            style={{ background: tab === t ? '#D4AF37' : 'var(--color-eco-surface)', color: tab === t ? '#1A1500' : 'var(--color-eco-muted)' }}>
            {t}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-6">
        {tab === 'overview' && (
          <div>
            <div className="grid grid-cols-2 gap-3 mb-5">
              <div className="rounded-2xl p-4" style={{ background: 'var(--color-eco-surface)', border: '1px solid var(--glass-06)' }}>
                <div className="font-display font-black text-2xl" style={{ color: '#D4AF37' }}>{formatMoney(totalRevenue)}</div>
                <div className="font-body text-[10px] text-eco-muted mt-0.5">Demo sales</div>
              </div>
              <div className="rounded-2xl p-4" style={{ background: 'var(--color-eco-surface)', border: '1px solid var(--glass-06)' }}>
                <div className="font-display font-black text-2xl text-eco-text">{spaceBookings.length}</div>
                <div className="font-body text-[10px] text-eco-muted mt-0.5">Total bookings</div>
              </div>
              <div className="rounded-2xl p-4" style={{ background: 'var(--color-eco-surface)', border: '1px solid var(--glass-06)' }}>
                <div className="font-display font-black text-2xl" style={{ color: '#00D4FF' }}>{space.followers.toLocaleString()}</div>
                <div className="font-body text-[10px] text-eco-muted mt-0.5">Followers</div>
              </div>
              <div className="rounded-2xl p-4" style={{ background: 'var(--color-eco-surface)', border: '1px solid var(--glass-06)' }}>
                <div className="font-display font-black text-2xl text-eco-text">{activeCount}/{allOfferings.length}</div>
                <div className="font-body text-[10px] text-eco-muted mt-0.5">Offerings active</div>
              </div>
            </div>

            <div className="font-display font-black text-[10px] tracking-[0.2em] text-eco-subtle uppercase mb-2.5">Recent activity</div>
            {spaceBookings.length === 0 ? (
              <div className="rounded-2xl p-6 text-center" style={{ background: 'var(--color-eco-surface)' }}>
                <div className="font-body text-xs text-eco-muted">No bookings yet. Once someone books, subscribes, or buys from your Business tab, it shows up here.</div>
              </div>
            ) : (
              <div className="space-y-2">
                {spaceBookings.slice(0, 5).map(b => (
                  <div key={b.id} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: 'var(--color-eco-surface)' }}>
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(212,175,55,0.12)' }}>
                      <span style={{ fontSize: '14px' }}>◎</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-body text-xs font-semibold text-eco-text truncate">{b.offeringName}</div>
                      <div className="font-body text-[10px] text-eco-muted truncate">{b.detail} · {b.timestamp}</div>
                    </div>
                    <span className="font-display font-black text-xs flex-shrink-0" style={{ color: '#D4AF37' }}>{formatMoney(b.price)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === 'bookings' && (
          <div>
            {spaceBookings.length === 0 ? (
              <div className="pt-16 text-center">
                <div className="text-3xl mb-3">📋</div>
                <div className="font-body text-sm text-eco-muted">No bookings yet</div>
              </div>
            ) : (
              <div className="space-y-2">
                {spaceBookings.map(b => (
                  <div key={b.id} className="p-3.5 rounded-xl" style={{ background: 'var(--color-eco-surface)' }}>
                    <div className="flex items-start justify-between mb-1.5">
                      <div className="font-body text-sm font-semibold text-eco-text">{b.offeringName}</div>
                      <span className="px-2 py-0.5 rounded text-[9px] font-display font-black uppercase"
                        style={{ background: 'rgba(0,212,255,0.15)', color: '#00D4FF' }}>{b.status}</span>
                    </div>
                    <div className="font-body text-xs text-eco-muted">{b.categoryName} · {b.detail}</div>
                    <div className="flex items-center justify-between mt-2">
                      <span className="font-body text-[10px] text-eco-subtle">{b.timestamp}</span>
                      <span className="font-display font-black text-xs" style={{ color: '#D4AF37' }}>{formatMoney(b.price)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === 'offerings' && (
          <div className="space-y-4">
            {categories.map(cat => (
              <div key={cat.id}>
                <div className="flex items-center justify-between mb-2">
                  <div className="font-display font-black text-[10px] tracking-[0.2em] text-eco-subtle uppercase">{cat.icon} {cat.name}</div>
                  <button onClick={() => setShowAddOffering(cat.id)} className="pressable font-body text-[10px] font-bold" style={{ color: '#D4AF37' }}>
                    + Add
                  </button>
                </div>
                <div className="space-y-2">
                  {cat.offerings.map(off => {
                    const isPaused = eco.pausedOfferings.has(off.id)
                    return (
                      <div key={off.id} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: 'var(--color-eco-surface)' }}>
                        <img src={off.images[0]} className="w-11 h-11 rounded-lg object-cover flex-shrink-0" style={{ opacity: isPaused ? 0.4 : 1 }} alt="" />
                        <div className="flex-1 min-w-0">
                          <div className="font-body text-sm font-semibold truncate" style={{ color: isPaused ? 'var(--color-eco-muted)' : 'var(--color-eco-text)' }}>{off.name}</div>
                          <div className="font-body text-[10px] text-eco-muted truncate">{off.priceLabel || 'No price set'}</div>
                        </div>
                        <ToggleSwitchGold checked={!isPaused} onChange={() => eco.toggleOfferingPaused(off.id)} />
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
            {categories.length === 0 && (
              <div className="pt-12 text-center">
                <div className="font-body text-sm text-eco-muted">No business categories set up yet.</div>
              </div>
            )}
          </div>
        )}
      </div>

      {showAddOffering && (
        <AddOfferingSheet spaceId={spaceId} categoryId={showAddOffering} onClose={() => setShowAddOffering(null)} />
      )}
    </div>
  )
}

function ToggleSwitchGold({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button className="pressable flex-shrink-0" onClick={onChange}
      style={{ width: '40px', height: '24px', borderRadius: '999px', position: 'relative', background: checked ? '#D4AF37' : 'var(--glass-14)', transition: 'background 0.2s ease' }}>
      <div style={{
        position: 'absolute', top: '3px', left: checked ? '19px' : '3px', width: '18px', height: '18px', borderRadius: '50%',
        background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.3)', transition: 'left 0.2s cubic-bezier(0.16,1,0.3,1)',
      }} />
    </button>
  )
}

function AddOfferingSheet({ spaceId, categoryId, onClose }: { spaceId: string; categoryId: string; onClose: () => void }) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [price, setPrice] = useState('')

  return (
    <div className="absolute inset-0 flex flex-col justify-end z-50 animate-fadeIn" style={{ background: 'rgba(0,0,0,0.55)' }} onClick={onClose}>
      <div className="rounded-t-3xl p-5 animate-slideUp" style={{ background: 'var(--color-eco-surface)' }} onClick={e => e.stopPropagation()}>
        <div className="flex justify-center mb-3"><div className="w-9 h-1 rounded-full" style={{ background: 'var(--color-eco-subtle)' }} /></div>
        <div className="font-display font-black text-lg text-eco-text mb-4">New Offering</div>
        <FormLabel>Name</FormLabel>
        <FormInput value={name} onChange={setName} placeholder="e.g. Sunset Cruise" />
        <FormLabel>Description</FormLabel>
        <FormTextarea value={description} onChange={setDescription} placeholder="What are you offering?" />
        <FormLabel>Price (UGX)</FormLabel>
        <input value={price} onChange={e => setPrice(e.target.value.replace(/\D/g, ''))} placeholder="e.g. 50" inputMode="numeric"
          className="w-full rounded-xl px-3.5 py-3 font-body text-sm outline-none" style={{ background: 'var(--glass-06)', color: 'var(--color-eco-text)' }} />
        <button className="pressable w-full mt-4 py-3.5 rounded-xl font-display font-bold text-sm"
          disabled={!name.trim() || !price.trim() || !Number.isSafeInteger(Number(price))} onClick={() => {
            if (!name.trim() || !price.trim()) return
            updateState(s => ({ ...s, spaces: s.spaces.map(space => space.id !== spaceId || space.ownerId !== 'me' ? space : ({ ...space,
              businessCategories: space.businessCategories?.map(category => category.id !== categoryId ? category : ({ ...category,
                offerings: [...category.offerings, { id: newId('record'), name: name.trim(), description: description.trim(), price: Number(price), priceLabel: formatMoney(Number(price)), images: [space.image], offeringType: 'product' as const }],
              })),
            })) }))
            onClose()
          }}
          style={{ background: name.trim() ? '#D4AF37' : 'var(--glass-10)', color: name.trim() ? '#1A1500' : 'var(--color-eco-muted)' }}>
          Add Offering
        </button>
        <div className="font-body text-[10px] text-eco-subtle text-center mt-2.5">
          Saved in this prototype on your browser.
        </div>
      </div>
    </div>
  )
}

/* ───── SOCIETIES LIST ───── */
function SocietiesScreen({ push }: { push: (s: Screen) => void }) {
  return (
    <div className="flex flex-col h-full">
      <div className="flex-shrink-0 px-5 pt-4 pb-3">
        <h1 className="font-display font-black text-[28px] text-eco-text" style={{ letterSpacing: '-0.02em' }}>SOCIETIES</h1>
        <p className="font-body text-xs text-eco-muted mt-0.5">Where people gather</p>
      </div>
      <div className="flex-1 overflow-y-auto px-5 pb-6 space-y-2.5">
        {societies.map(s => (
          <SocietyRow key={s.id} society={s} onPress={() => push({ id: 'society_detail', societyId: s.id })} />
        ))}
      </div>
    </div>
  )
}

/* ───── SOCIETY DETAIL ───── */
function SocietyDetail({ societyId, pop, push }: { societyId: string; pop: () => void; push: (s: Screen) => void }) {
  const eco = useEcosystem()
  const society = societyMap[societyId]
  const [tab, setTab] = useState<'topics' | 'lore'>('topics')
  const topics = societyTopics.filter(t => t.societyId === societyId)
  const membership = usePrototype().societyMemberships[societyId]

  return (
    <div className="flex flex-col h-full">
      <div className="relative flex-shrink-0" style={{ height: '170px' }}>
        <img src={society.image} className="w-full h-full object-cover" alt="" />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.15), rgba(6,6,13,0.97))' }} />
        <button onClick={pop}
          className="pressable absolute top-3 left-5 w-8 h-8 rounded-full flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(10px)', border: '1px solid var(--glass-10)' }}>
          <span className="text-white text-sm">←</span>
        </button>
        <div className="absolute bottom-4 left-5 right-5 flex items-end justify-between">
          <div>
            <div className="font-display font-black text-xl text-white">{society.name}</div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="font-body text-xs text-white/60">{society.memberCount.toLocaleString()} members</span>
              <span className="px-1.5 py-0.5 rounded text-[8px] font-display font-black uppercase"
                style={{
                  background: society.privacy === 'public' ? 'rgba(0,212,255,0.2)' : 'rgba(212,175,55,0.2)',
                  color: society.privacy === 'public' ? '#00D4FF' : '#D4AF37',
                }}>{society.privacy}</span>
            </div>
          </div>
          <button disabled={!!membership} onClick={() => updateState(s => ({ ...s, societyMemberships: { ...s.societyMemberships, [societyId]: society.privacy === 'private' ? 'requested' : 'joined' } }))} className="pressable px-4 py-2 rounded-xl font-display font-bold text-xs"
            style={{ background: 'rgba(0,212,255,0.15)', border: '1px solid rgba(0,212,255,0.35)', color: '#00D4FF' }}>
            {membership === 'joined' ? 'JOINED' : membership === 'requested' ? 'REQUESTED' : society.privacy === 'private' ? 'REQUEST TO JOIN' : 'JOIN'}
          </button>
        </div>
      </div>

      <div className="flex-shrink-0 flex gap-0 mx-5 my-3 rounded-xl overflow-hidden"
        style={{ background: 'var(--color-eco-surface)', border: '1px solid var(--glass-07)' }}>
        {(['topics', 'lore'] as const).map(t => (
          <button key={t} className="pressable flex-1 py-3 text-[11px] font-display font-black tracking-widest uppercase"
            style={{
              background: tab === t ? 'rgba(0,212,255,0.15)' : 'transparent',
              color: tab === t ? '#00D4FF' : 'var(--color-eco-muted)',
            }}
            onClick={() => setTab(t)}>{t}</button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-6">
        {society.privacy === 'private' && membership !== 'joined' && <p className="font-body text-sm text-eco-muted p-5">This Society is private. Request access to see its conversations and Lore.</p>}
        {(society.privacy === 'public' || membership === 'joined') && tab === 'topics' && (
          <div className="space-y-2.5 animate-fadeUp">
            {topics.map(topic => (
              <button key={topic.id}
                className="pressable w-full text-left p-4 rounded-2xl"
                style={{ background: 'var(--color-eco-surface)', border: `1px solid ${topic.isPinned ? 'rgba(0,212,255,0.2)' : 'var(--glass-06)'}` }}
                onClick={() => push({ id: 'topic_chat', topicId: topic.id })}>
                {topic.isPinned && (
                  <div className="text-[9px] font-display font-bold tracking-widest uppercase mb-1.5" style={{ color: '#00D4FF' }}>
                    📌 PINNED
                  </div>
                )}
                <div className="font-display font-black text-sm text-eco-text leading-tight">{topic.title}</div>
                <div className="flex items-center justify-between mt-3">
                  <div className="flex items-center gap-2">
                    <div className="flex -space-x-1.5">
                      {topic.participantIds.slice(0, 3).map(uid => (
                        <img key={uid} src={userMap[uid]?.avatar} className="w-5 h-5 rounded-full border border-eco-bg object-cover" alt="" />
                      ))}
                    </div>
                    <span className="font-body text-[10px] text-eco-muted">{topic.engaged} engaged</span>
                  </div>
                  <div className="flex items-center gap-3 text-eco-muted text-[10px] font-body">
                    <span>{topic.replies} replies</span>
                    <span>{topic.timestamp}</span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
        {(society.privacy === 'public' || membership === 'joined') && tab === 'lore' && <LoreContent societyId={societyId} push={push} />}
      </div>
    </div>
  )
}

function LoreContent({ societyId, push }: { societyId: string; push: (s: Screen) => void }) {
  const { events, pings, spaces, eventMap, pingMap, spaceMap } = useRecords()
  const eco = useEcosystem()
  const society = societyMap[societyId]
  const [open, setOpen] = useState<Record<string, boolean>>({ spaces: true })

  const sections = [
    { key: 'spaces',   label: 'SPACES',   items: society.spaceIds.map(id => spaceMap[id]).filter(Boolean) },
    { key: 'events',   label: 'EVENTS',   items: society.eventIds.map(id => eventMap[id]).filter(Boolean) },
    { key: 'pings',    label: 'PINGS',    items: society.pingIds.map(id => pingMap[id]).filter(Boolean) },
  ]

  return (
    <div className="space-y-2 animate-fadeUp">
      {sections.map(sec => (
        <div key={sec.key} className="rounded-2xl overflow-hidden"
          style={{ background: 'var(--color-eco-surface)', border: '1px solid var(--glass-06)' }}>
          <button className="pressable w-full flex items-center justify-between px-4 py-3.5"
            onClick={() => setOpen(o => ({ ...o, [sec.key]: !o[sec.key] }))}>
            <span className="font-display font-black text-sm tracking-widest text-eco-text uppercase">{sec.label}</span>
            <span className="text-eco-muted" style={{ transform: open[sec.key] ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>⌄</span>
          </button>
          {open[sec.key] && (
            <div className="px-4 pb-3 space-y-2.5 animate-fadeUp">
              {sec.items.length === 0 && <div className="text-xs text-eco-muted font-body py-1">None linked</div>}
              {sec.key === 'spaces' && (sec.items as Space[]).map(space => (
                <button key={space.id} className="pressable flex items-center gap-3 w-full"
                  onClick={() => push({ id: 'space_detail', spaceId: space.id })}>
                  <img src={space.image} className="w-9 h-9 rounded-xl object-cover" alt="" />
                  <div className="text-left">
                    <div className="font-body text-sm font-semibold text-eco-text">{space.name}</div>
                    <div className="font-body text-xs text-eco-muted">{space.location}</div>
                  </div>
                  <span className="ml-auto text-eco-muted">›</span>
                </button>
              ))}
              {sec.key === 'events' && (sec.items as any[]).map(event => (
                <button key={event.id} className="pressable flex items-center gap-3 w-full"
                  onClick={() => eco.navigateTo('motion', { screen: 'event_detail', params: { eventId: event.id } })}>
                  <img src={event.image} className="w-9 h-9 rounded-xl object-cover" alt="" />
                  <div className="text-left flex-1">
                    <div className="font-body text-sm font-semibold text-eco-text">{event.name}</div>
                    <div className="font-body text-xs text-eco-muted">{event.date}</div>
                  </div>
                  <span className="font-body text-xs" style={{ color: '#FF6B1A' }}>{event.isFree ? 'FREE' : `${formatMoney(event.price)}`}</span>
                </button>
              ))}
              {sec.key === 'pings' && (sec.items as Ping[]).map(ping => (
                <button key={ping.id} className="pressable flex items-center gap-3 w-full"
                  onClick={() => push({ id: 'ping_detail', pingId: ping.id })}>
                  <img src={ping.image} className="w-9 h-9 rounded-xl object-cover" alt="" />
                  <div className="text-left">
                    <div className="font-body text-sm font-semibold text-eco-text">{ping.title}</div>
                    <div className="font-body text-xs text-eco-muted">{ping.timestamp}</div>
                  </div>
                  <span className="ml-auto text-eco-muted">›</span>
                </button>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

/* ───── TOPIC CHAT ───── */
function TopicChat({ topicId, pop }: { topicId: string; pop: () => void }) {
  const topic = societyTopics.find(t => t.id === topicId)!
  const { topicMessages } = usePrototype()
  const msgs = [...topic.messages, ...(topicMessages[topicId] || [])]
  const [input, setInput] = useState('')

  const send = () => {
    if (!input.trim()) return
    updateState(s => ({ ...s, topicMessages: { ...s.topicMessages, [topicId]: [...(s.topicMessages[topicId] || []), { userId: 'me', text: input.trim(), time: 'Saved locally' }] } }))
    setInput('')
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-shrink-0 flex items-center gap-3 px-5 pt-4 pb-3 border-b border-eco-border">
        <button onClick={pop}
          className="pressable w-8 h-8 rounded-full flex items-center justify-center"
          style={{ background: 'var(--color-eco-surface2)' }}>
          <span className="text-white text-sm">←</span>
        </button>
        <div className="flex-1 min-w-0">
          <div className="font-display font-black text-sm text-eco-text leading-tight truncate">{topic.title}</div>
          <div className="font-body text-[10px] text-eco-muted">Prototype conversation · replies are saved on this browser</div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
        {msgs.map((msg, i) => {
          const isMe = msg.userId === 'me'
          const user = userMap[msg.userId]
          return (
            <div key={i} className={`flex gap-2.5 items-end ${isMe ? 'flex-row-reverse' : ''}`}>
              {!isMe && <img src={user?.avatar || 'https://i.pravatar.cc/150?img=3'}
                className="w-7 h-7 rounded-full flex-shrink-0 mb-0.5 object-cover" alt="" />}
              <div className={`max-w-[75%] flex flex-col gap-0.5 ${isMe ? 'items-end' : ''}`}>
                {!isMe && <span className="font-body text-[10px] font-semibold text-eco-muted ml-1">{user?.name.split(' ')[0]}</span>}
                <div className="px-3.5 py-2 font-body text-sm"
                  style={{
                    background: isMe ? 'rgba(0,212,255,0.15)' : 'var(--color-eco-surface2)',
                    color: isMe ? '#00D4FF' : 'var(--color-eco-text)',
                    borderRadius: isMe ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                  }}>
                  {msg.text}
                </div>
                <span className="font-body text-[9px] text-eco-muted mx-1">{msg.time}</span>
              </div>
            </div>
          )
        })}
      </div>

      <div className="flex-shrink-0 flex items-center gap-2 px-4 pb-8 pt-2.5 border-t border-eco-border">
        <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && send()}
          className="flex-1 px-4 py-2.5 rounded-full font-body text-sm text-eco-text outline-none"
          style={{ background: 'var(--color-eco-surface2)', border: '1px solid var(--glass-08)' }}
          placeholder="Reply..." />
        <button onClick={send}
          className="pressable w-9 h-9 rounded-full flex items-center justify-center"
          style={{ background: 'rgba(0,212,255,0.2)' }}>
          <span style={{ color: '#00D4FF' }} className="text-sm">↑</span>
        </button>
      </div>
    </div>
  )
}

/* ───── SPACES LIST ───── */
function SpacesScreen({ push }: { push: (s: Screen) => void }) {
  const { pings, spaces } = useRecords()
  return (
    <div className="flex flex-col h-full">
      <div className="flex-shrink-0 px-5 pt-4 pb-3">
        <h1 className="font-display font-black text-[28px] text-eco-text" style={{ letterSpacing: '-0.02em' }}>SPACES</h1>
        <p className="font-body text-xs text-eco-muted mt-0.5">Where things happen</p>
      </div>
      <div className="flex-1 overflow-y-auto px-5 pb-6 space-y-3">
        {spaces.map(space => (
          <button key={space.id}
            className="pressable w-full text-left rounded-2xl overflow-hidden"
            style={{ border: '1px solid var(--glass-07)' }}
            onClick={() => push({ id: 'space_detail', spaceId: space.id })}>
            <div className="relative" style={{ height: '130px' }}>
              <img src={space.image} className="w-full h-full object-cover" alt={space.name} />
              <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, transparent 45%, rgba(6,6,13,0.95) 100%)' }} />
              <div className="absolute bottom-3 left-4 right-4 flex items-end justify-between">
                <div>
                  {space.spaceType === 'establishment' && (
                    <div className="inline-block px-1.5 py-0.5 rounded text-[8px] font-display font-bold tracking-widest uppercase mb-1"
                      style={{ background: 'rgba(212,175,55,0.25)', color: '#D4AF37' }}>✓ Establishment</div>
                  )}
                  <div className="font-display font-black text-base text-white">{space.name}</div>
                  <div className="font-body text-xs text-white/60">{space.location}</div>
                </div>
                <span className="font-body text-xs font-semibold" style={{ color: '#00D4FF' }}>{space.pingCount} pings</span>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

/* ───── SHARED COMPONENTS ───── */
function PingCard({ ping, onPress, onSpacePress }: { ping: Ping; onPress: () => void; onSpacePress: () => void }) {
  const { spaceMap } = useRecords()
  const eco = useEcosystem()
  const creator = userMap[ping.creatorId]
  const space = spaceMap[ping.spaceId]
  const joined = eco.joinedPings.has(ping.id)

  return (
    <button className="pressable w-full text-left rounded-2xl overflow-hidden"
      style={{ background: 'var(--color-eco-surface)', border: '1px solid var(--glass-07)' }}
      onClick={onPress}>
      <div className="relative" style={{ height: '130px' }}>
        <img src={ping.image} className="w-full h-full object-cover" alt={ping.title} />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, transparent 40%, rgba(6,6,13,0.95) 100%)' }} />
        {ping.isRecurring && (
          <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full text-[9px] font-display font-bold"
            style={{ background: 'rgba(0,212,255,0.2)', color: '#00D4FF' }}>↻ {ping.recurringLabel}</div>
        )}
        <div className="absolute bottom-2 left-3 right-3 flex items-end justify-between">
          <div className="font-display font-black text-sm text-white leading-tight">{ping.title}</div>
          {joined && (
            <div className="px-2 py-0.5 rounded-full text-[9px] font-display font-bold"
              style={{ background: 'rgba(0,212,255,0.25)', color: '#00D4FF' }}>✓ Joined</div>
          )}
        </div>
      </div>
      <div className="px-3 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <img src={creator.avatar} className="w-4.5 h-4.5 rounded-full object-cover" style={{ width: '18px', height: '18px' }} alt="" />
          <span className="font-body text-[11px] text-eco-muted">{creator.name.split(' ')[0]}</span>
          <span className="text-eco-subtle">·</span>
          <span className="font-body text-[11px] font-semibold" style={{ color: '#00D4FF' }}>📍 {space.name}</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="flex -space-x-1.5">
            {ping.participantIds.slice(0, 3).map(uid => (
              <img key={uid} src={userMap[uid]?.avatar}
                className="w-4 h-4 rounded-full border border-eco-bg object-cover" alt="" />
            ))}
          </div>
          <span className="font-body text-[9px] text-eco-muted">{ping.participantIds.length}</span>
        </div>
      </div>
    </button>
  )
}

function SocietyRow({ society, onPress }: { society: Society; onPress: () => void }) {
  return (
    <button className="pressable w-full text-left flex items-center gap-3 p-3.5 rounded-2xl"
      style={{ background: 'var(--color-eco-surface)', border: '1px solid var(--glass-06)' }}
      onClick={onPress}>
      <img src={society.image} className="w-12 h-12 rounded-xl object-cover flex-shrink-0" alt="" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-display font-black text-sm text-eco-text">{society.name}</span>
          <span className="px-1.5 py-0.5 rounded text-[8px] font-display font-black uppercase"
            style={{
              background: society.privacy === 'public' ? 'rgba(0,212,255,0.15)' : 'rgba(212,175,55,0.15)',
              color: society.privacy === 'public' ? '#00D4FF' : '#D4AF37',
            }}>{society.privacy}</span>
        </div>
        <div className="font-body text-xs text-eco-muted mt-0.5 truncate">{society.description}</div>
        <div className="font-body text-[10px] text-eco-muted mt-1">{society.memberCount.toLocaleString()} · {society.topicCount} topics</div>
      </div>
      <span className="text-eco-muted">›</span>
    </button>
  )
}

function EventRow({ event, onPress }: { event: any; onPress: () => void }) {
  const { spaceMap } = useRecords()
  const eco = useEcosystem()
  const space = spaceMap[event.spaceId]
  const attending = eco.purchasedTickets.has(event.id)
  return (
    <button className="pressable w-full text-left flex items-center gap-3 p-3 rounded-2xl"
      style={{ background: 'var(--color-eco-surface)', border: '1px solid rgba(255,107,26,0.12)' }}
      onClick={onPress}>
      <div className="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0 relative">
        <img src={event.image} className="w-full h-full object-cover" alt="" />
        {attending && (
          <div className="absolute inset-0 flex items-center justify-center"
            style={{ background: 'rgba(255,107,26,0.7)' }}>
            <span className="font-display font-black text-xs text-white">✓</span>
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-display font-black text-sm text-eco-text leading-tight">{event.name}</div>
        <div className="font-body text-xs text-eco-muted mt-0.5">{space?.name}</div>
        <div className="font-body text-xs text-eco-muted">{event.date} · {event.time}</div>
      </div>
      <span className="font-display font-black text-sm flex-shrink-0" style={{ color: event.isFree ? '#00D4FF' : '#FF6B1A' }}>
        {event.isFree ? 'FREE' : `${formatMoney(event.price)}`}
      </span>
    </button>
  )
}

function SpaceChip({ space, onPress }: { space: Space; onPress: () => void }) {
  const { pings } = useRecords()
  return (
    <button className="pressable flex-shrink-0 relative rounded-2xl overflow-hidden"
      style={{ width: '130px', height: '170px', border: '1px solid var(--glass-07)' }}
      onClick={onPress}>
      <img src={space.image} className="absolute inset-0 w-full h-full object-cover" alt={space.name} />
      <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.82) 0%, transparent 55%)' }} />
      <div className="absolute bottom-2.5 left-2.5 right-2.5">
        <div className="font-display font-black text-xs text-white leading-tight">{space.name}</div>
        <div className="font-body text-[9px] text-white/55 mt-0.5">{space.pingCount} pings active</div>
      </div>
    </button>
  )
}

function SectionTitle({ label, accent = 'var(--color-eco-text)', badge, badgeColor }:
  { label: string; accent?: string; badge?: string; badgeColor?: string }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <span className="font-display font-black text-[11px] tracking-[0.12em] text-eco-text uppercase">{label}</span>
      {badge && (
        <span className="font-body text-[9px] font-semibold px-2 py-0.5 rounded"
          style={{ background: `${badgeColor}18`, color: badgeColor }}>via {badge}</span>
      )}
    </div>
  )
}

function SkeletonHome() {
  return (
    <div className="px-5 space-y-8 pt-1 pb-6">
      {[1, 2, 3].map(i => (
        <div key={i} className="space-y-3">
          <div className="shimmer h-3 w-24 rounded-full" />
          <div className="shimmer h-36 rounded-2xl" />
          <div className="shimmer h-3 w-32 rounded-full" />
        </div>
      ))}
    </div>
  )
}

function BlankScreen({ label, sub }: { label: string; sub?: string }) {
  return <Empty label={label} sub={sub} />
}

function Empty({ label, sub }: { label: string; sub?: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-3 py-20">
      <div className="text-5xl opacity-10">◎</div>
      <div className="font-display font-semibold text-eco-muted text-sm">{label}</div>
      {sub && <div className="font-body text-xs text-eco-subtle">{sub}</div>}
    </div>
  )
}

function Dots({ color }: { color: string }) {
  return (
    <span className="flex gap-1">
      {[0, 1, 2].map(i => (
        <span key={i} className="w-1.5 h-1.5 rounded-full"
          style={{ background: color, animation: `pulse 1s ${i * 0.15}s infinite` }} />
      ))}
    </span>
  )
}

/* ── Icons ── */
function HomeIcon({ active }: { active: boolean }) {
  const c = active ? '#00D4FF' : 'var(--color-eco-muted)'
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
    <path d="M3 12L12 3L21 12V21H15V15H9V21H3V12Z" stroke={c} strokeWidth="1.8" strokeLinejoin="round" fill={active ? 'rgba(0,212,255,0.15)' : 'none'} />
  </svg>
}
function PingIcon({ active }: { active: boolean }) {
  const c = active ? '#00D4FF' : 'var(--color-eco-muted)'
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="3" fill={c} />
    <circle cx="12" cy="12" r="7" stroke={c} strokeWidth="1.5" strokeDasharray="2 3" fill="none" />
    <circle cx="12" cy="12" r="11" stroke={c} strokeWidth="1" strokeDasharray="1 4" opacity="0.4" fill="none" />
  </svg>
}
function SocietyIcon({ active }: { active: boolean }) {
  const c = active ? '#00D4FF' : 'var(--color-eco-muted)'
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
    <circle cx="9" cy="7" r="3" stroke={c} strokeWidth="1.8" />
    <circle cx="15" cy="7" r="3" stroke={c} strokeWidth="1.8" />
    <path d="M3 19c0-3.31 2.69-6 6-6h6c3.31 0 6 2.69 6 6" stroke={c} strokeWidth="1.8" strokeLinecap="round" />
  </svg>
}
function SpaceIcon({ active }: { active: boolean }) {
  const c = active ? '#00D4FF' : 'var(--color-eco-muted)'
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" stroke={c} strokeWidth="1.8" fill={active ? 'rgba(0,212,255,0.12)' : 'none'} />
    <circle cx="12" cy="9" r="2.5" stroke={c} strokeWidth="1.5" />
  </svg>
}
function FindIcon({ active }: { active: boolean }) {
  const c = active ? '#00D4FF' : 'var(--color-eco-muted)'
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
    <path d="M3 9l1.5-5h15L21 9" stroke={c} strokeWidth="1.8" strokeLinejoin="round" />
    <path d="M4 9h16v10a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1z" stroke={c} strokeWidth="1.8" fill={active ? 'rgba(0,212,255,0.12)' : 'none'} />
    <path d="M9 13h6" stroke={c} strokeWidth="1.8" strokeLinecap="round" />
  </svg>
}
function SearchIcon() {
  const { events, projects } = useRecords()
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
    <circle cx="11" cy="11" r="7" stroke="#6A6A8E" strokeWidth="2" />
    <path d="M16 16L21 21" stroke="#6A6A8E" strokeWidth="2" strokeLinecap="round" />
  </svg>
}

/* ═══════════════════════════════════════════════════
   FIND — Aura's contextual discovery & commerce layer.
   Space = who/where · Find = what's available · Wallet = payments.
   Everything here resolves back to an existing Space or Product.
   ═══════════════════════════════════════════════════ */

const FIND_CATEGORIES: { id: FindCategory; label: string; icon: string; blurb: string }[] = [
  { id: 'shop',        label: 'Shop',        icon: '🛍️', blurb: 'Products from Spaces near you' },
  { id: 'merch',       label: 'Merch',       icon: '✦',  blurb: 'Creators, events & projects' },
  { id: 'stay',        label: 'Stay',        icon: '🛏️', blurb: 'Hotels, lodges & guest houses' },
  { id: 'dine',        label: 'Dine',        icon: '🍽️', blurb: 'Restaurants, cafés & bars' },
  { id: 'experiences', label: 'Experiences', icon: '🎋', blurb: 'Tours, culture & activities' },
  { id: 'services',    label: 'Services',    icon: '🔧', blurb: 'Transport & local services' },
  { id: 'offers',      label: 'Offers',      icon: '🎁', blurb: 'Deals from Spaces you follow' },
]

function spacesIn(category: FindCategory, spaces: Space[]) {
  return spaces.filter(s => s.findCategories?.includes(category))
}

/* Small reusable row: always shows SPACE · LOCATION · CATEGORY so context stays visible */
function FindSpaceRow({ space, onPress, trailing }: { space: Space; onPress: () => void; trailing?: ReactNode }) {
  return (
    <button onClick={onPress} className="pressable w-full flex items-center gap-3 p-3 rounded-2xl mb-2"
      style={{ background: 'var(--color-eco-surface)', border: '1px solid var(--glass-06)' }}>
      <img src={space.image} className="w-14 h-14 rounded-xl object-cover flex-shrink-0" alt="" />
      <div className="flex-1 min-w-0 text-left">
        <div className="font-display font-black text-sm text-eco-text truncate">{space.name}</div>
        <div className="font-body text-[11px] text-eco-muted truncate">{space.category}</div>
        <div className="flex items-center gap-1 mt-0.5">
          <span style={{ fontSize: '8px' }}>📍</span>
          <span className="font-body text-[10px] text-eco-subtle truncate">{space.location}</span>
        </div>
      </div>
      {trailing}
    </button>
  )
}

function FindProductRow({ product, onPress }: { product: Product; onPress: () => void }) {
  const { spaceMap } = useRecords()
  const space = product.spaceId ? spaceMap[product.spaceId] : null
  const seller = userMap[product.sellerId]
  return (
    <button onClick={onPress} className="pressable w-full flex items-center gap-3 p-3 rounded-2xl mb-2"
      style={{ background: 'var(--color-eco-surface)', border: '1px solid var(--glass-06)' }}>
      <img src={product.image} className="w-14 h-14 rounded-xl object-cover flex-shrink-0" alt="" />
      <div className="flex-1 min-w-0 text-left">
        <div className="font-display font-black text-sm text-eco-text truncate">{product.name}</div>
        <div className="font-body text-[11px] text-eco-muted truncate">
          {product.contextLabel || product.category}
        </div>
        <div className="flex items-center gap-1 mt-0.5">
          <span style={{ fontSize: '8px' }}>{space ? '📍' : '✦'}</span>
          <span className="font-body text-[10px] text-eco-subtle truncate">{space ? space.name : seller?.name}</span>
        </div>
      </div>
      <span className="font-display font-black text-sm flex-shrink-0" style={{ color: '#D4AF37' }}>{formatMoney(product.price)}</span>
    </button>
  )
}

/* ───── FIND HOME ───── */
function FindScreen({ push }: { push: (s: Screen) => void }) {
  const { spaces } = useRecords()
  const eco = useEcosystem()
  const [q, setQ] = useState('')
  const query = q.trim().toLowerCase()

  const matchedSpaces = query ? spaces.filter(s => s.findCategories?.length && (s.name.toLowerCase().includes(query) || s.category.toLowerCase().includes(query))) : []
  const matchedProducts = query ? products.filter(p => p.name.toLowerCase().includes(query) || p.category.toLowerCase().includes(query)) : []
  const searching = query.length > 0

  const offerSpaces = spacesIn('offers', spaces)
  const stayPreview = spacesIn('stay', spaces).slice(0, 4)
  const nearbyProducts = products.filter(p => p.findCategory === 'shop').slice(0, 4)

  return (
    <div className="flex flex-col h-full">
      <div className="flex-shrink-0 px-5 pt-3 pb-3">
        <div className="flex items-center justify-between mb-3">
          <button {...eco.homeButtonProps} className="pressable" style={{ touchAction: 'none' }}>
            <h1 className="font-display font-black text-xl text-eco-text" style={{ letterSpacing: '-0.02em' }}>FIND</h1>
          </button>
          <button onClick={() => push({ id: 'wallet' })}
            className="pressable flex items-center gap-1.5 px-3 py-1.5 rounded-xl"
            style={{ background: 'rgba(212,175,55,0.12)', border: '1px solid rgba(212,175,55,0.25)' }}>
            <span className="font-display font-black text-xs" style={{ color: '#D4AF37' }}>{formatMoney(eco.walletBalance)}</span>
          </button>
        </div>
        <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl" style={{ background: 'var(--glass-07)' }}>
          <SearchIconAura />
          <input value={q} onChange={e => setQ(e.target.value)}
            placeholder="What are you looking for?"
            className="flex-1 bg-transparent outline-none font-body text-sm text-eco-text" />
          {q && <button onClick={() => setQ('')} className="pressable text-eco-muted text-xs">✕</button>}
        </div>
        {!searching && (
          <div className="font-body text-[11px] text-eco-subtle mt-2">Things available in your world · Jinja</div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-6">
        {searching ? (
          <div>
            {matchedSpaces.length === 0 && matchedProducts.length === 0 && (
              <div className="pt-14 text-center">
                <div className="font-body text-sm text-eco-muted">No results for "{q}"</div>
              </div>
            )}
            {matchedSpaces.length > 0 && (
              <div className="mb-4">
                <div className="font-display font-black text-[10px] tracking-[0.2em] text-eco-subtle uppercase mb-2">Places</div>
                {matchedSpaces.map(s => (
                  <FindSpaceRow key={s.id} space={s} onPress={() => push({ id: 'space_detail', spaceId: s.id })} />
                ))}
              </div>
            )}
            {matchedProducts.length > 0 && (
              <div>
                <div className="font-display font-black text-[10px] tracking-[0.2em] text-eco-subtle uppercase mb-2">Items</div>
                {matchedProducts.map(p => (
                  <FindProductRow key={p.id} product={p} onPress={() => push({ id: 'product_detail', productId: p.id })} />
                ))}
              </div>
            )}
          </div>
        ) : (
          <>
            {/* Categories */}
            <div className="grid grid-cols-2 gap-2.5 mb-6">
              {FIND_CATEGORIES.map(cat => (
                <button key={cat.id} onClick={() => push({ id: 'find_category', category: cat.id })}
                  className="pressable text-left p-3.5 rounded-2xl"
                  style={{ background: 'var(--color-eco-surface)', border: '1px solid var(--glass-06)' }}>
                  <div className="text-xl mb-1.5">{cat.icon}</div>
                  <div className="font-display font-black text-sm text-eco-text">{cat.label}</div>
                  <div className="font-body text-[10px] text-eco-muted leading-tight mt-0.5">{cat.blurb}</div>
                </button>
              ))}
            </div>

            {/* Offers — contextual, from Spaces */}
            {offerSpaces.length > 0 && (
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2.5">
                  <span className="font-display font-black text-[11px] tracking-[0.1em] text-eco-text uppercase">Offers near you</span>
                  <button onClick={() => push({ id: 'find_category', category: 'offers' })}
                    className="pressable font-body text-xs text-eco-muted">See all</button>
                </div>
                {offerSpaces.map(s => (
                  <button key={s.id} onClick={() => push({ id: 'space_detail', spaceId: s.id })}
                    className="pressable w-full flex items-center gap-3 p-3 rounded-2xl mb-2"
                    style={{ background: 'rgba(212,175,55,0.07)', border: '1px solid rgba(212,175,55,0.2)' }}>
                    <img src={s.image} className="w-12 h-12 rounded-xl object-cover flex-shrink-0" alt="" />
                    <div className="flex-1 min-w-0 text-left">
                      <div className="font-display font-black text-xs" style={{ color: '#D4AF37' }}>{s.offer?.label}</div>
                      <div className="font-body text-[11px] text-eco-text truncate">{s.name}</div>
                      <div className="font-body text-[10px] text-eco-subtle truncate">{s.offer?.detail}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Stay preview */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2.5">
                <span className="font-display font-black text-[11px] tracking-[0.1em] text-eco-text uppercase">Places to stay</span>
                <button onClick={() => push({ id: 'find_category', category: 'stay' })}
                  className="pressable font-body text-xs text-eco-muted">See all</button>
              </div>
              <div className="flex gap-3 overflow-x-auto -mx-5 px-5 pb-1">
                {stayPreview.map(s => (
                  <button key={s.id} onClick={() => push({ id: 'space_business', spaceId: s.id })}
                    className="pressable flex-shrink-0 text-left" style={{ width: '150px' }}>
                    <img src={s.image} className="rounded-2xl object-cover w-full" style={{ height: '100px' }} alt="" />
                    <div className="font-display font-black text-xs text-eco-text mt-1.5 truncate">{s.name}</div>
                    <div className="font-body text-[10px] text-eco-subtle truncate">{s.location}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Shop preview */}
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <span className="font-display font-black text-[11px] tracking-[0.1em] text-eco-text uppercase">From Spaces near you</span>
                <button onClick={() => push({ id: 'find_category', category: 'shop' })}
                  className="pressable font-body text-xs text-eco-muted">See all</button>
              </div>
              {nearbyProducts.map(p => (
                <FindProductRow key={p.id} product={p} onPress={() => push({ id: 'product_detail', productId: p.id })} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

/* ───── FIND CATEGORY ───── */
function FindCategoryScreen({ category, pop, push }: { category: FindCategory; pop: () => void; push: (s: Screen) => void }) {
  const { spaces } = useRecords()
  const meta = FIND_CATEGORIES.find(c => c.id === category)!
  const catSpaces = spacesIn(category, spaces)
  const catProducts = products.filter(p => p.findCategory === category)

  return (
    <div className="flex flex-col h-full">
      <div className="flex-shrink-0 flex items-center gap-3 px-5 pt-12 pb-3">
        <button onClick={pop} className="pressable w-8 h-8 rounded-full flex items-center justify-center bg-eco-surface2">
          <span className="text-eco-text">←</span>
        </button>
        <div>
          <div className="font-display font-black text-lg text-eco-text">{meta.icon} {meta.label}</div>
          <div className="font-body text-[11px] text-eco-muted">{meta.blurb}</div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-6">
        {catSpaces.length === 0 && catProducts.length === 0 && (
          <div className="pt-16 text-center">
            <div className="font-body text-sm text-eco-muted">Nothing here yet in Jinja.</div>
          </div>
        )}

        {/* Offers render with their deal surfaced */}
        {category === 'offers' && catSpaces.map(s => (
          <button key={s.id} onClick={() => push({ id: 'space_detail', spaceId: s.id })}
            className="pressable w-full flex items-center gap-3 p-3 rounded-2xl mb-2"
            style={{ background: 'rgba(212,175,55,0.07)', border: '1px solid rgba(212,175,55,0.2)' }}>
            <img src={s.image} className="w-14 h-14 rounded-xl object-cover flex-shrink-0" alt="" />
            <div className="flex-1 min-w-0 text-left">
              <div className="font-display font-black text-xs" style={{ color: '#D4AF37' }}>{s.offer?.label}</div>
              <div className="font-body text-[11px] text-eco-text truncate">{s.name}</div>
              <div className="font-body text-[10px] text-eco-subtle truncate">{s.offer?.detail} · {s.location}</div>
            </div>
          </button>
        ))}

        {/* Space-backed categories go straight into that Space's Business tab */}
        {category !== 'offers' && catSpaces.map(s => (
          <FindSpaceRow key={s.id} space={s}
            onPress={() => push({ id: 'space_business', spaceId: s.id })}
            trailing={<span className="font-body text-[10px] flex-shrink-0" style={{ color: '#00D4FF' }}>View ›</span>}
          />
        ))}

        {catProducts.length > 0 && (
          <div className={catSpaces.length ? 'mt-4' : ''}>
            {catSpaces.length > 0 && (
              <div className="font-display font-black text-[10px] tracking-[0.2em] text-eco-subtle uppercase mb-2">Items</div>
            )}
            {catProducts.map(p => (
              <FindProductRow key={p.id} product={p} onPress={() => push({ id: 'product_detail', productId: p.id })} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

/* ───── PRODUCT DETAIL — keeps its Space/creator/event context visible ───── */
function ProductDetailScreen({ productId, pop, push }: { productId: string; pop: () => void; push: (s: Screen) => void }) {
  const { eventMap, projectMap, spaceMap } = useRecords()
  const eco = useEcosystem()
  const product = productMap[productId]
  const seller = userMap[product.sellerId]
  const space = product.spaceId ? spaceMap[product.spaceId] : null
  const event = product.eventId ? eventMap[product.eventId] : null
  const project = product.projectId ? projectMap[product.projectId] : null
  const [state, setState] = useState<'idle' | 'buying' | 'success'>('idle')
  const canBuy = eco.walletBalance >= product.price && product.inStock

  const handleBuy = () => {
    if (!canBuy || state !== 'idle') return
    setState('buying')
    setTimeout(() => {
      if (!eco.completePurchase({ amount: product.price, label: product.name })) { setState('idle'); eco.notify('Purchase declined. Check your wallet balance.'); return }
      setState('success')
    }, 1200)
  }

  return (
    <div className="flex flex-col h-full">
      <div className="relative flex-shrink-0" style={{ height: '260px' }}>
        <img src={product.image} className="w-full h-full object-cover" alt={product.name} />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.3) 0%, transparent 40%, rgba(6,6,13,0.9) 100%)' }} />
        <button onClick={pop} className="pressable absolute top-3 left-5 w-9 h-9 rounded-full flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(10px)' }}>
          <span className="text-white font-bold">←</span>
        </button>
        {!product.inStock && (
          <div className="absolute top-3 right-5 px-2.5 py-1 rounded-full text-[9px] font-display font-black"
            style={{ background: 'rgba(255,255,255,0.15)', color: '#fff' }}>SOLD OUT</div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-5 pt-4 pb-6">
        {product.contextLabel && (
          <div className="inline-block px-2 py-0.5 rounded text-[9px] font-display font-bold tracking-widest uppercase mb-2"
            style={{ background: 'rgba(212,175,55,0.18)', color: '#D4AF37' }}>{product.contextLabel}</div>
        )}
        <div className="font-display font-black text-xl text-eco-text">{product.name}</div>
        <div className="font-display font-black text-lg mt-1" style={{ color: '#D4AF37' }}>{formatMoney(product.price)}</div>
        <p className="font-body text-sm text-eco-muted leading-relaxed mt-3">{product.description}</p>

        {/* Context — the product never floats free of who/where it came from */}
        <div className="mt-5 space-y-2">
          <div className="font-display font-black text-[10px] tracking-[0.2em] text-eco-subtle uppercase mb-1">Where this comes from</div>
          {space && (
            <button onClick={() => push({ id: 'space_detail', spaceId: space.id })}
              className="pressable w-full flex items-center gap-3 p-3 rounded-xl"
              style={{ background: 'var(--color-eco-surface)' }}>
              <img src={space.image} className="w-10 h-10 rounded-lg object-cover" alt="" />
              <div className="flex-1 text-left min-w-0">
                <div className="font-body text-xs font-semibold text-eco-text truncate">{space.name}</div>
                <div className="font-body text-[10px] text-eco-subtle truncate">{space.location}</div>
              </div>
              <span className="text-eco-subtle">›</span>
            </button>
          )}
          <button onClick={() => eco.navigateTo('rizz', { screen: 'creator', params: { userId: seller.id } })}
            className="pressable w-full flex items-center gap-3 p-3 rounded-xl" style={{ background: 'var(--color-eco-surface)' }}>
            <img src={seller.avatar} className="w-10 h-10 rounded-full object-cover" alt="" />
            <div className="flex-1 text-left min-w-0">
              <div className="font-body text-xs font-semibold text-eco-text truncate">{seller.name}</div>
              <div className="font-body text-[10px] text-eco-subtle">Seller</div>
            </div>
            <span className="text-eco-subtle">›</span>
          </button>
          {event && (
            <button onClick={() => eco.navigateTo('motion', { screen: 'event_detail', params: { eventId: event.id } })}
              className="pressable w-full flex items-center gap-3 p-3 rounded-xl" style={{ background: 'var(--color-eco-surface)' }}>
              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: 'rgba(255,107,26,0.12)' }}>🎟</div>
              <div className="flex-1 text-left min-w-0">
                <div className="font-body text-xs font-semibold text-eco-text truncate">{event.name}</div>
                <div className="font-body text-[10px] text-eco-subtle">Event · in Motion</div>
              </div>
              <span className="text-eco-subtle">›</span>
            </button>
          )}
          {project && (
            <button onClick={() => eco.navigateTo('xp', { screen: 'project_detail', params: { projectId: project.id } })}
              className="pressable w-full flex items-center gap-3 p-3 rounded-xl" style={{ background: 'var(--color-eco-surface)' }}>
              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: 'rgba(75,140,247,0.12)' }}>📁</div>
              <div className="flex-1 text-left min-w-0">
                <div className="font-body text-xs font-semibold text-eco-text truncate">{project.name}</div>
                <div className="font-body text-[10px] text-eco-subtle">Project · in XP</div>
              </div>
              <span className="text-eco-subtle">›</span>
            </button>
          )}
        </div>

        {/* Contextual messaging — not a generic chat tab */}
        <div className="flex gap-2 mt-4">
          <button disabled title="Not connected in this prototype" className="pressable flex-1 py-2.5 rounded-xl font-display font-bold text-xs"
            style={{ background: 'var(--glass-08)', color: 'var(--color-eco-text)' }}>💬 Message</button>
          <button disabled title="Not connected in this prototype" className="pressable flex-1 py-2.5 rounded-xl font-display font-bold text-xs"
            style={{ background: 'var(--glass-08)', color: 'var(--color-eco-text)' }}>📞 Call</button>
        </div>
      </div>

      <div className="flex-shrink-0 px-5 pb-6 pt-2">
        <button onClick={handleBuy} disabled={!canBuy || state !== 'idle'}
          className="pressable w-full h-14 rounded-2xl font-display font-black text-sm"
          style={{
            background: state === 'success' ? 'rgba(0,212,255,0.15)' : canBuy ? '#D4AF37' : 'var(--glass-10)',
            color: state === 'success' ? '#00D4FF' : canBuy ? '#1A1500' : 'var(--color-eco-muted)',
          }}>
          {state === 'success' ? '✓ PURCHASED'
            : state === 'buying' ? 'PROCESSING PAYMENT…'
            : !product.inStock ? 'SOLD OUT'
            : !canBuy ? 'INSUFFICIENT WALLET BALANCE'
            : `PAY WITH WALLET · ${formatMoney(product.price)}`}
        </button>
      </div>
    </div>
  )
}

/* ───── WALLET — is ecosystem-wide, it just lives here now ───── */
function WalletScreen({ pop }: { pop: () => void }) {
  const eco = useEcosystem()
  return (
    <div className="flex flex-col h-full" style={{ background: 'var(--color-eco-bg)' }}>
      <div className="flex-shrink-0 flex items-center gap-3 px-5 pt-12 pb-4">
        <button onClick={pop} className="pressable w-8 h-8 rounded-full flex items-center justify-center"
          style={{ background: 'var(--color-eco-surface)' }}>
          <span className="text-eco-text">←</span>
        </button>
        <div className="font-display font-black text-xl text-eco-text">WALLET</div>
      </div>

      <p className="mx-5 mb-3 font-body text-xs text-eco-muted">Demo wallet · UGX sample funds. Real deposits, transfers and payments are not connected.</p>
      <div className="mx-5 mb-5 p-6 rounded-3xl text-center relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #1A1408 0%, #2A1F0A 100%)', border: '1px solid rgba(212,175,55,0.3)' }}>
        <div className="absolute inset-0 opacity-10" style={{ background: 'radial-gradient(circle at 50% 0%, #D4AF37, transparent 70%)' }} />
        <div className="relative">
          <div className="font-body text-xs uppercase tracking-widest mb-2" style={{ color: 'rgba(255,255,255,0.5)' }}>WALLET BALANCE</div>
          <div className="font-display font-black text-3xl" style={{ color: '#D4AF37' }}>{formatMoney(eco.walletBalance)}</div>
          <div className="flex justify-center gap-6 mt-4">
            <button disabled title="Not connected in this prototype" className="pressable px-4 py-2 rounded-xl font-display font-bold text-xs"
              style={{ background: 'rgba(212,175,55,0.15)', border: '1px solid rgba(212,175,55,0.3)', color: '#D4AF37' }}>TOP UP</button>
            <button disabled title="Not connected in this prototype" className="pressable px-4 py-2 rounded-xl font-display font-bold text-xs"
              style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', color: '#fff' }}>SEND</button>
          </div>
        </div>
      </div>

      <div className="mx-5 mb-5 p-4 rounded-2xl" style={{ background: 'var(--color-eco-surface)', border: '1px solid var(--glass-06)' }}>
        <div className="font-body text-[10px] text-eco-muted uppercase tracking-widest mb-3">Earned Stats</div>
        <div className="grid grid-cols-4 gap-2">
          {[
            { label: 'XP', value: 75, color: '#4B8CF7' },
            { label: 'Aura', value: 140, color: '#00D4FF' },
            { label: 'Rizz', value: 42, color: '#FF2878' },
            { label: 'Motion', value: 28, color: '#FF6B1A' },
          ].map(stat => (
            <div key={stat.label} className="flex flex-col items-center p-2 rounded-xl" style={{ background: `${stat.color}10` }}>
              <span className="font-display font-black text-lg" style={{ color: stat.color }}>{stat.value}</span>
              <span className="font-body text-[9px] text-eco-muted">{stat.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-6">
        <div className="font-body text-[10px] text-eco-muted uppercase tracking-widest mb-3">Transactions</div>
        <div className="space-y-2">
          {eco.walletTxs.map(tx => (
            <div key={tx.id} className="flex items-center justify-between p-3 rounded-xl"
              style={{ background: 'var(--color-eco-surface)', border: '1px solid var(--glass-05)' }}>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full flex items-center justify-center"
                  style={{ background: tx.type === 'credit' ? 'rgba(0,212,255,0.1)' : 'rgba(255,40,120,0.1)' }}>
                  <span className="text-sm" style={{ color: tx.type === 'credit' ? '#00D4FF' : '#FF2878' }}>
                    {tx.type === 'credit' ? '+' : '−'}
                  </span>
                </div>
                <div>
                  <div className="font-body text-xs font-semibold text-eco-text">{tx.label}</div>
                  <div className="font-body text-[10px] text-eco-muted">{tx.timestamp}</div>
                </div>
              </div>
              <span className="font-display font-black text-sm" style={{ color: tx.type === 'credit' ? '#00D4FF' : '#FF2878' }}>
                {tx.type === 'credit' ? '+' : '−'}{formatMoney(Math.abs(tx.amount))}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
