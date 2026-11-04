import { useModuleNavigation } from '../../state/navigation'
import { useRecords, updateState, usePrototype } from '../../state/store'
import Unavailable from '../../components/Unavailable'
import { useState, useEffect, useRef } from 'react'
import { useEcosystem, type CrossAppRoute } from '../../LegacyApp'
import { users, userMap, type Content } from '../../data/catalog'

type Screen =
  | { id: 'home' }
  | { id: 'discover' }
  | { id: 'create' }
  | { id: 'music' }
  | { id: 'chat' }
  | { id: 'reels'; contentId?: string }
  | { id: 'creator'; userId: string }
  | { id: 'encounter' }

const NAV = [
  { id: 'home', label: 'Home', icon: HomeIcon },
  { id: 'discover', label: 'Discover', icon: DiscoverIcon },
  { id: 'create', label: 'Create', icon: CreateIcon },
  { id: 'music', label: 'Music', icon: MusicIcon },
  { id: 'chat', label: 'Chat', icon: ChatIcon },
]

export default function RizzApp() {
  const { screen, push, pop, navTab, switchNav } = useModuleNavigation<Screen>('rizz', {"home": "home", "discover": "discover", "create": "create", "music": "music", "chat": "chat"})

  const isFullscreen = screen.id === 'reels' || screen.id === 'encounter'

  const { content: currentContent } = useRecords()
  if (screen.id === 'reels' && screen.contentId && !currentContent.some(c => c.id === screen.contentId)) return <Unavailable title="Post unavailable" onBack={pop} />
  if ('userId' in screen && !userMap[screen.userId]) return <Unavailable title="Member unavailable" onBack={pop} />
  return (
    <div className="app-rizz flex flex-col h-full" style={{ background: '#000' }}>
      <div key={JSON.stringify(screen)} className="flex-1 overflow-hidden relative">
        {screen.id === 'home' && <RizzHome push={push} />}
        {screen.id === 'discover' && <RizzDiscover push={push} />}
        {screen.id === 'create' && <RizzCreate pop={pop} />}
        {screen.id === 'music' && <RizzMusic />}
        {screen.id === 'chat' && <div className="flex h-full items-center justify-center"><EmptyState label="Messaging is not connected yet" /></div>}
        {screen.id === 'reels' && <RizzReels contentId={screen.contentId} pop={pop} push={push} />}
        {screen.id === 'creator' && <CreatorProfile userId={screen.userId} pop={pop} />}
        {screen.id === 'encounter' && <Unavailable title="Encounters are coming later" detail="Live matching and calls are not connected in this prototype." onBack={pop} />}
      </div>

      {!isFullscreen && (
        <div className="flex-shrink-0 flex items-center justify-around px-1 pb-6 pt-2"
          style={{ background: 'rgba(0,0,0,0.95)', borderTop: '1px solid var(--glass-06)' }}>
          {NAV.map(({ id, label, icon: Icon }) => {
            const active = navTab === id
            if (id === 'create') {
              return (
                <button key={id} className="pressable flex flex-col items-center gap-1 px-3 py-1"
                  onClick={() => switchNav(id)}>
                  <div className="w-10 h-10 rounded-full flex items-center justify-center"
                    style={{ background: 'linear-gradient(135deg, #FF2878, #FF6B1A)' }}>
                    <span className="text-white font-black text-xl">+</span>
                  </div>
                  <span className="font-display font-semibold text-[10px]" style={{ color: '#FF2878' }}>Create</span>
                </button>
              )
            }
            return (
              <button key={id} className="pressable flex flex-col items-center gap-1 px-3 py-1" onClick={() => switchNav(id)}>
                <Icon active={active} />
                <span className="font-display font-semibold text-[10px] tracking-wide"
                  style={{ color: active ? '#FF2878' : 'var(--color-eco-muted)' }}>
                  {label}
                </span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

function RizzHome({ push }: { push: (s: Screen) => void }) {
  const { content, eventMap, pingMap, spaceMap } = useRecords()
  const eco = useEcosystem()

  return (
    <div className="flex flex-col h-full" style={{ background: 'var(--color-eco-bg)' }}>
      <div className="flex-shrink-0 relative px-5 pt-3 pb-4"
        style={{ background: 'linear-gradient(180deg, rgba(255,40,120,0.14) 0%, transparent 100%)' }}>
        <div className="flex items-center justify-between">
          <button {...eco.homeButtonProps} className="pressable" style={{ touchAction: 'none' }}>
            <div className="font-display font-black text-[28px]" style={{ letterSpacing: '-0.03em', color: '#FF2878' }}>RIZZ</div>
          </button>
          <div className="flex items-center gap-3">
            <button className="pressable px-3 py-1.5 rounded-full text-xs font-display font-bold"
              style={{ background: 'rgba(255,40,120,0.15)', border: '1px solid rgba(255,40,120,0.3)', color: '#FF2878' }}
              onClick={() => push({ id: 'encounter' })}>
              ✦ 30 SEC
            </button>
            <button disabled title="Not connected in this prototype" className="pressable">
              <img src="https://i.pravatar.cc/150?img=3" className="w-9 h-9 rounded-full object-cover" alt="You" />
            </button>
          </div>
        </div>
        <div className="font-body text-xs mt-1" style={{ color: 'rgba(255,40,120,0.6)' }}>ONE CAMERA. ONE MOMENT.</div>
      </div>

      <div className="flex-1 overflow-y-auto pb-4">
        {/* Featured reel */}
        <div className="pressable relative mx-4 rounded-3xl overflow-hidden mb-4"
          style={{ height: '420px' }}
          onClick={() => push({ id: 'reels' })}>
          {content[0].media && <img src={content[0].media} className="absolute inset-0 w-full h-full object-cover" alt="" />}
          <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.9) 0%, transparent 50%)' }} />

          {/* Tags */}
          <div className="absolute top-4 right-4 flex flex-col gap-1.5">
            <div className="px-2.5 py-1 rounded-full text-[9px] font-body font-semibold backdrop-blur-sm"
              style={{ background: 'rgba(255,40,120,0.5)', color: '#fff' }}>{content[0].mediaType === 'post' ? 'POST' : 'MEDIA PREVIEW'}</div>
          </div>

          {/* Creator */}
          <div className="absolute bottom-4 left-4 right-14">
            <div className="flex items-center gap-2 mb-2">
              <img src={userMap[content[0].creatorId]?.avatar} className="w-7 h-7 rounded-full border border-white/30" alt="" />
              <span className="font-body text-xs font-semibold text-white">{userMap[content[0].creatorId]?.name}</span>
            </div>
            <p className="font-body text-sm text-white leading-snug">{content[0].caption}</p>
            {/* Context tags */}
            <div className="flex flex-wrap gap-1.5 mt-2">
              {content[0].taggedSpaceIds.map(id => (
                <span key={id} className="px-2 py-0.5 rounded-full text-[9px] font-body font-semibold"
                  style={{ background: 'rgba(0,212,255,0.3)', color: '#00D4FF' }}>📍 {spaceMap[id]?.name}</span>
              ))}
              {content[0].taggedEventIds.map(id => (
                <span key={id} className="px-2 py-0.5 rounded-full text-[9px] font-body font-semibold"
                  style={{ background: 'rgba(255,107,26,0.3)', color: '#FF6B1A' }}>🎟 {eventMap[id]?.name}</span>
              ))}
              {content[0].taggedPingIds.map(id => (
                <span key={id} className="px-2 py-0.5 rounded-full text-[9px] font-body font-semibold"
                  style={{ background: 'rgba(0,212,255,0.2)', color: '#00D4FF' }}>📌 {pingMap[id]?.title}</span>
              ))}
            </div>
          </div>

          {/* Actions sidebar */}
          <div className="absolute right-4 bottom-20 flex flex-col gap-4">
            <SideAction icon="♥" count={content[0].reactions} color="#FF2878" />
            <SideAction icon="💬" count={content[0].comments} color="#fff" />
            <SideAction icon="↗" count={0} color="#fff" />
          </div>
        </div>

        {/* Grid of posts */}
        <div className="px-4 mb-4">
          <div className="flex items-center justify-between mb-3">
            <span className="font-display font-black text-xs tracking-widest text-eco-text uppercase">TRENDING</span>
            <button disabled title="Not connected in this prototype" className="text-xs font-body" style={{ color: '#FF2878' }}>See all</button>
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            {content.slice(1).map(c => (
              <button key={c.id} className="pressable aspect-square rounded-xl overflow-hidden relative"
                onClick={() => push({ id: 'reels', contentId: c.id })}>
                {c.media ? <img src={c.media} className="w-full h-full object-cover" alt="" /> : <p className="p-3 font-body text-xs text-eco-text bg-eco-surface h-full">{c.caption}</p>}
                {c.mediaType === 'reel' && (
                  <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded flex items-center justify-center text-[8px] font-bold"
                    style={{ background: 'rgba(255,40,120,0.8)', color: '#fff' }}>▶</div>
                )}
                <div className="absolute bottom-1 left-1 flex -space-x-1">
                  {c.taggedSpaceIds.length > 0 && (
                    <span className="text-[7px]">📍</span>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Creators horizontal scroll */}
        <div className="px-4 mb-4">
          <div className="flex items-center justify-between mb-3">
            <span className="font-display font-black text-xs tracking-widest text-eco-text uppercase">CREATORS</span>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4">
            {users.filter(u => u.isCreator).map(creator => (
              <button key={creator.id} className="pressable flex-shrink-0 flex flex-col items-center gap-1.5"
                onClick={() => push({ id: 'creator', userId: creator.id })}>
                <div className="relative">
                  <div className="w-14 h-14 rounded-full p-0.5"
                    style={{ background: 'linear-gradient(135deg, #FF2878, #FF6B1A)' }}>
                    <img src={creator.avatar} className="w-full h-full rounded-full object-cover" alt="" />
                  </div>
                  <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full flex items-center justify-center text-[7px]"
                    style={{ background: creator.tier === 'elite' ? '#D4AF37' : creator.tier === 'expert' ? '#4B8CF7' : 'var(--color-eco-muted)', color: '#000' }}>
                    {creator.tier === 'elite' ? '★' : creator.tier === 'expert' ? '✦' : '·'}
                  </div>
                </div>
                <span className="font-body text-[10px] text-eco-muted">{creator.name.split(' ')[0]}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Music section */}
        <div className="px-4">
          <div className="flex items-center justify-between mb-3">
            <span className="font-display font-black text-xs tracking-widest text-eco-text uppercase">TRENDING MUSIC</span>
          </div>
          <div className="space-y-2">
            {['Afrobeats Fusion', 'Nile Nights Mix', 'Sunday Acoustic Vol. 2'].map((track, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-xl pressable"
                style={{ background: 'var(--color-eco-surface2)' }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
                  style={{ background: 'rgba(255,40,120,0.15)' }}>🎵</div>
                <div>
                  <div className="font-body text-sm font-semibold text-eco-text">{track}</div>
                  <div className="font-body text-xs text-eco-muted">{['Priya M.', 'DJ Morgs', 'Acoustic Yard'][i]}</div>
                </div>
                <div className="ml-auto font-body text-xs text-eco-muted">{['2:34', '3:12', '4:01'][i]}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function SideAction({ icon, count, color }: { icon: string; count: number; color: string }) {
  const [liked, setLiked] = useState(false)
  return (
    <button disabled={icon !== '♥'} title={icon !== '♥' ? 'Not connected in this prototype' : 'Like this post'} className="pressable flex flex-col items-center gap-1" onClick={e => { e.stopPropagation(); setLiked(l => !l) }}>
      <span className="text-2xl" style={{ color: icon === '♥' && liked ? '#FF2878' : color }}>{icon}</span>
      {count > 0 && <span className="font-body text-[10px] text-white/70">{liked && icon === '♥' ? count + 1 : count}</span>}
    </button>
  )
}

function RizzReels({ contentId, pop, push }: { contentId?: string; pop: () => void; push: (s: Screen) => void }) {
  const { content, eventMap, pingMap, projectMap, spaceMap } = useRecords()
  const eco = useEcosystem()
  const startIdx = contentId ? content.findIndex(c => c.id === contentId) : 0
  const [currentIdx, setCurrentIdx] = useState(startIdx >= 0 ? startIdx : 0)
  const [paused, setPaused] = useState(false)
  const touchStart = useRef(0)
  const current = content[currentIdx] || content[0]

  const onTouchStart = (y: number) => { touchStart.current = y }
  const onTouchEnd = (y: number) => {
    const delta = touchStart.current - y
    if (delta > 60 && currentIdx < content.length - 1) setCurrentIdx(i => i + 1)
    if (delta < -60 && currentIdx > 0) setCurrentIdx(i => i - 1)
  }

  return (
    <div className="relative w-full h-full bg-black"
      onTouchStart={e => onTouchStart(e.touches[0].clientY)}
      onTouchEnd={e => onTouchEnd(e.changedTouches[0].clientY)}
      >
      {/* Media */}
      {current.media ? <img src={current.media} className="absolute inset-0 w-full h-full object-cover" alt="Post media" /> : <div className="absolute inset-0 bg-eco-surface" />}
      {current.mediaType === 'reel' || current.mediaType === 'video' ? <span className="absolute top-24 left-5 font-body text-[10px] text-white/60">Sample media preview</span> : null}
      <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 40%, rgba(0,0,0,0.3) 100%)' }} />

      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-5 pt-12 pb-4">
        <button onClick={e => { e.stopPropagation(); pop() }} className="pressable w-9 h-9 rounded-full flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)' }}>
          <span className="text-white">←</span>
        </button>
        <div className="font-display font-black text-sm tracking-widest text-white opacity-70">POSTS</div>
        <div className="w-9" />
      </div>

      {/* Pagination dots */}
      <div className="absolute top-16 left-0 right-0 flex justify-center gap-1">
        {content.slice(0, 5).map((_, i) => (
          <div key={i} className="h-0.5 rounded-full transition-all"
            style={{ width: i === currentIdx % 5 ? '20px' : '4px', background: i === currentIdx % 5 ? '#FF2878' : 'rgba(255,255,255,0.3)' }} />
        ))}
      </div>

      {/* Pause overlay */}
      {paused && (
        <div className="absolute inset-0 flex items-center justify-center" onClick={e => e.stopPropagation()}>
          <div className="w-16 h-16 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)' }}>
            <span className="text-white text-2xl">⏸</span>
          </div>
        </div>
      )}

      {/* Bottom content */}
      <div className="absolute bottom-0 left-0 right-14 p-5 pb-10">
        <button className="pressable flex items-center gap-2.5 mb-3"
          onClick={e => { e.stopPropagation(); push({ id: 'creator', userId: current.creatorId }) }}>
          <img src={userMap[current.creatorId]?.avatar} className="w-8 h-8 rounded-full border border-white/40" alt="" />
          <span className="font-body text-sm font-semibold text-white">{userMap[current.creatorId]?.name}</span>
          <span className="px-2 py-0.5 rounded-full text-[9px] font-display font-bold"
            style={{ background: 'rgba(255,40,120,0.3)', color: '#FF2878', border: '1px solid rgba(255,40,120,0.4)' }}>
            Follow
          </span>
        </button>

        <p className="font-body text-sm text-white mb-3 leading-snug">{current.caption}</p>

        {/* Context tags — tappable */}
        <div className="flex flex-wrap gap-1.5">
          {current.taggedSpaceIds.map(id => (
            <button key={id} className="pressable px-2.5 py-1 rounded-full text-[10px] font-body font-semibold"
              style={{ background: 'rgba(0,212,255,0.25)', color: '#00D4FF' }}
              onClick={e => { e.stopPropagation(); eco.navigateTo('aura', { screen: 'space_detail', params: { spaceId: id } }) }}>
              📍 {spaceMap[id]?.name}
            </button>
          ))}
          {current.taggedEventIds.map(id => (
            <button key={id} className="pressable px-2.5 py-1 rounded-full text-[10px] font-body font-semibold"
              style={{ background: 'rgba(255,107,26,0.25)', color: '#FF6B1A' }}
              onClick={e => { e.stopPropagation(); eco.navigateTo('motion', { screen: 'event_detail', params: { eventId: id } }) }}>
              🎟 {eventMap[id]?.name}
            </button>
          ))}
          {current.taggedPingIds.map(id => (
            <button key={id} className="pressable px-2.5 py-1 rounded-full text-[10px] font-body font-semibold"
              style={{ background: 'rgba(0,212,255,0.2)', color: '#00D4FF' }}
              onClick={e => { e.stopPropagation(); eco.navigateTo('aura', { screen: 'ping_detail', params: { pingId: id } }) }}>
              📌 {pingMap[id]?.title}
            </button>
          ))}
          {current.taggedProjectIds.map(id => (
            <button key={id} className="pressable px-2.5 py-1 rounded-full text-[10px] font-body font-semibold"
              style={{ background: 'rgba(75,140,247,0.25)', color: '#4B8CF7' }}
              onClick={e => { e.stopPropagation(); eco.navigateTo('xp', { screen: 'project_detail', params: { projectId: id } }) }}>
              📁 {projectMap[id]?.name}
            </button>
          ))}
        </div>
      </div>

      {/* Right actions */}
      <div className="absolute right-4 bottom-24 flex flex-col gap-5">
        <SideAction icon="♥" count={current.reactions} color="rgba(255,255,255,0.8)" />
        <SideAction icon="💬" count={current.comments} color="rgba(255,255,255,0.8)" />
        <button className="pressable flex flex-col items-center gap-1" onClick={e => e.stopPropagation()}>
          <span className="text-2xl">↗</span>
          <span className="font-body text-[10px] text-white/70">Share</span>
        </button>
      </div>

      {/* Swipe hint */}
      <div className="absolute bottom-2 left-0 right-0 flex justify-center">
        <button aria-label="Previous post" disabled={currentIdx === 0} onClick={() => setCurrentIdx(i => i - 1)}>← Previous</button><button aria-label="Next post" disabled={currentIdx >= content.length - 1} onClick={() => setCurrentIdx(i => i + 1)} className="ml-4">Next →</button>
      </div>
    </div>
  )
}

function RizzDiscover({ push }: { push: (s: Screen) => void }) {
  const { content, spaces } = useRecords()
  const [query, setQuery] = useState('')
  const [activeTab, setActiveTab] = useState('for you')
  const tabs = ['for you', 'people', 'creators', 'music', 'reels', 'spaces', 'trending']
  const q = query.trim().toLowerCase()

  const matchedPeople = q ? users.filter(u => u.name.toLowerCase().includes(q) || u.handle.toLowerCase().includes(q)) : []
  const matchedContent = q ? content.filter(c => c.caption.toLowerCase().includes(q) || userMap[c.creatorId]?.name.toLowerCase().includes(q)) : content

  return (
    <div className="flex flex-col h-full" style={{ background: 'var(--color-eco-bg)' }}>
      <div className="flex-shrink-0 px-5 pt-12 pb-3">
        <div className="font-display font-black text-2xl text-eco-text mb-3" style={{ letterSpacing: '-0.02em' }}>DISCOVER</div>
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-2xl"
          style={{ background: 'var(--color-eco-surface)', border: '1px solid var(--glass-08)' }}>
          <SearchSVG />
          <input value={query} onChange={e => setQuery(e.target.value)}
            className="flex-1 bg-transparent font-body text-sm text-eco-text outline-none"
            placeholder="People, creators, spaces, content..." />
          {query && <button onClick={() => setQuery('')} className="pressable text-eco-muted text-xs">✕</button>}
        </div>
      </div>

      <div className="flex-shrink-0 flex gap-2 px-5 overflow-x-auto pb-3">
        {tabs.map(t => (
          <button key={t} className="pressable flex-shrink-0 px-3 py-1.5 rounded-full text-[11px] font-display font-bold uppercase"
            style={{
              background: activeTab === t ? 'rgba(255,40,120,0.2)' : 'var(--color-eco-surface)',
              color: activeTab === t ? '#FF2878' : 'var(--color-eco-muted)',
              border: activeTab === t ? '1px solid rgba(255,40,120,0.4)' : '1px solid transparent',
            }}
            onClick={() => setActiveTab(t)}>
            {t}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-6">
        {q && matchedPeople.length > 0 && (
          <div className="mb-4">
            <div className="font-display font-black text-[10px] tracking-[0.2em] text-eco-subtle uppercase mb-2">People</div>
            {matchedPeople.map(u => (
              <button key={u.id} onClick={() => push({ id: 'creator', userId: u.id })}
                className="pressable w-full flex items-center gap-3 py-2">
                <img src={u.avatar} className="w-10 h-10 rounded-full object-cover flex-shrink-0" alt="" />
                <div className="text-left min-w-0">
                  <div className="font-body text-sm font-semibold text-eco-text truncate">{u.name}</div>
                  <div className="font-body text-xs text-eco-muted truncate">@{u.handle}</div>
                </div>
              </button>
            ))}
          </div>
        )}
        {q && matchedContent.length === 0 && matchedPeople.length === 0 && (
          <div className="pt-16 text-center">
            <div className="font-body text-sm text-eco-muted">No results for "{query}"</div>
          </div>
        )}
        <div className="space-y-2 mb-3">
          {matchedContent.filter(c => !c.media).map(c => <button key={c.id} onClick={() => push({ id: 'reels', contentId: c.id })} className="block w-full p-4 rounded-xl text-left bg-eco-surface text-eco-text font-body text-sm">{c.caption}</button>)}
        </div>
        <div className="grid grid-cols-2 gap-2">
          {matchedContent.filter(c => c.media).map((c, i) => (
            <button key={c.id} className={`pressable rounded-2xl overflow-hidden relative ${i % 3 === 0 ? 'col-span-2 h-52' : 'h-44'}`}
              onClick={() => push({ id: 'reels', contentId: c.id })}>
              <img src={c.media} className="w-full h-full object-cover" alt="" />
              <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 60%)' }} />
              <div className="absolute bottom-2 left-3 right-3">
                <div className="flex items-center gap-1.5">
                  <img src={userMap[c.creatorId]?.avatar} className="w-4 h-4 rounded-full" alt="" />
                  <span className="font-body text-[10px] text-white/80">{userMap[c.creatorId]?.name.split(' ')[0]}</span>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

function RizzCreate({ pop }: { pop: () => void }) {
  const { content, events, pings, projects, spaces, eventMap, pingMap, projectMap, spaceMap } = useRecords()
  const eco = useEcosystem()
  const [mode, setMode] = useState<'photo' | 'post' | null>(null)
  const [media, setMedia] = useState<string | undefined>()
  const [mediaError, setMediaError] = useState('')
  const [tags, setTags] = useState<{
    spaces: string[]; events: string[]; pings: string[]; projects: string[]; societies: string[]
  }>({ spaces: [], events: [], pings: [], projects: [], societies: [] })
  const [caption, setCaption] = useState('')
  const [posting, setPosting] = useState(false)
  const [posted, setPosted] = useState(false)
  const [showContext, setShowContext] = useState(false)
  const [contextCat, setContextCat] = useState<'spaces' | 'events' | 'pings' | 'projects'>('spaces')

  const toggleTag = (type: keyof typeof tags, id: string) => {
    setTags(t => ({
      ...t,
      [type]: t[type].includes(id) ? t[type].filter(x => x !== id) : [...t[type], id],
    }))
  }

  const totalTags = Object.values(tags).flat().length

  const handlePost = () => {
    if (!mode || posting || (mode === 'photo' && !media) || (mode === 'post' && !caption.trim())) return
    const m = mode
    setPosting(true)
    setTimeout(() => {
      eco.addContent({
        creatorId: 'me',
        media: m === 'post' ? undefined : media,
        mediaType: m,
        caption: caption || (m === 'post' ? 'New update.' : ''),
        taggedSpaceIds: tags.spaces,
        taggedEventIds: tags.events,
        taggedPingIds: tags.pings,
        taggedProjectIds: tags.projects,
        taggedSocietyIds: tags.societies,
      })
      setPosted(true)
      setPosting(false)
    }, 1500)
  }

  if (posted) {
    return (
      <div className="flex flex-col h-full items-center justify-center px-8 gap-6 animate-scaleIn" style={{ background: '#000' }}>
        <div className="w-20 h-20 rounded-full flex items-center justify-center text-4xl"
          style={{ background: 'rgba(255,40,120,0.2)' }}>✦</div>
        <div className="text-center">
          <div className="font-display font-black text-2xl text-eco-text">POSTED</div>
          <div className="font-body text-sm text-eco-muted mt-2">Your content is now live across</div>
          {totalTags > 0 && (
            <div className="font-display font-bold text-sm mt-2" style={{ color: '#FF2878' }}>
              {totalTags} connected surface{totalTags > 1 ? 's' : ''}
            </div>
          )}
          <div className="mt-3 text-xs font-body text-eco-muted italic">
            ONE CAMERA. ONE MOMENT. ALL SOCIALS.
          </div>
        </div>
        <button className="pressable w-full h-12 rounded-2xl font-display font-black text-sm"
          style={{ background: 'rgba(255,40,120,0.2)', border: '1px solid rgba(255,40,120,0.4)', color: '#FF2878' }}
          onClick={pop}>
          DONE
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full" style={{ background: '#000' }}>
      {/* Header */}
      <div className="flex-shrink-0 flex items-center justify-between px-5 pt-12 pb-4">
        <button onClick={pop} className="pressable w-8 h-8 rounded-full flex items-center justify-center"
          style={{ background: 'var(--color-eco-surface)' }}>
          <span className="text-white">×</span>
        </button>
        <div className="font-display font-black text-sm tracking-widest" style={{ color: '#FF2878' }}>CREATE</div>
        <div className="w-8" />
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-6 space-y-6">
        {/* Mode selector */}
        {!mode ? (
          <div className="space-y-3 animate-fadeUp">
            <div className="font-body text-xs text-eco-muted text-center mb-4">What are you creating?</div>
            {(['photo', 'post'] as const).map(m => (
              <button key={m} className="pressable w-full p-4 rounded-2xl flex items-center gap-4"
                style={{ background: 'var(--color-eco-surface)', border: '1px solid var(--glass-07)' }}
                onClick={() => setMode(m)}>
                <span className="text-2xl">
                  {m === 'photo' ? '📷' : '✏️'}
                </span>
                <div className="text-left">
                  <div className="font-display font-black text-sm text-eco-text uppercase tracking-wide">{m}</div>
                  <div className="font-body text-xs text-eco-muted mt-0.5">
                    {m === 'photo' ? 'A single photo' : 'A text update'}
                  </div>
                </div>
                <span className="ml-auto text-eco-muted">›</span>
              </button>
            ))}
          </div>
        ) : (
          <div className="animate-fadeUp space-y-5">
            {/* Back to mode */}
            <button onClick={() => setMode(null)} className="pressable flex items-center gap-2 text-eco-muted">
              <span>←</span>
              <span className="font-body text-xs">{mode.toUpperCase()}</span>
            </button>

            {mode === 'photo' && <div className="space-y-2">
              <label className="block rounded-2xl p-4 bg-eco-surface text-eco-text font-body text-sm">
                Choose a photo
                <input aria-label="Choose a photo" className="block mt-2 w-full" type="file" accept="image/jpeg,image/png,image/webp" onChange={e => {
                  const file = e.target.files?.[0]; setMediaError(''); if (!file) return
                  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 750000) { setMediaError('Choose a JPG, PNG or WebP image smaller than 750 KB.'); return }
                  const reader = new FileReader(); reader.onload = () => setMedia(String(reader.result)); reader.onerror = () => setMediaError('Could not read this image. Try another file.'); reader.readAsDataURL(file)
                }} />
              </label>
              {media && <img src={media} className="w-full max-h-64 rounded-2xl object-cover" alt="Your selected photo" />}
              {mediaError && <p role="alert" className="text-red-400 font-body text-xs">{mediaError}</p>}
            </div>}

            {/* Caption */}
            <textarea
              value={caption}
              onChange={e => setCaption(e.target.value)}
              className="w-full px-4 py-3 rounded-2xl font-body text-sm text-eco-text outline-none resize-none"
              style={{ background: 'var(--color-eco-surface)', border: '1px solid var(--glass-08)', minHeight: '80px' }}
              placeholder="Write a caption..."
            />

            {/* ADD CONTEXT — one button + sheet instead of 4 stacked always-open rows */}
            <div>
              <button className="pressable w-full flex items-center justify-between p-4 rounded-2xl"
                style={{ background: 'var(--color-eco-surface)', border: '1px solid var(--glass-08)' }}
                onClick={() => setShowContext(true)}>
                <div className="flex items-center gap-2.5">
                  <span className="text-lg">🏷️</span>
                  <div className="text-left">
                    <div className="font-display font-black text-xs text-eco-text uppercase tracking-wide">Add Context</div>
                    <div className="font-body text-[11px] text-eco-muted mt-0.5">
                      {totalTags > 0 ? `${totalTags} tagged` : 'Tag a Space, Event, Ping or Project'}
                    </div>
                  </div>
                </div>
                <span className="text-eco-muted">›</span>
              </button>

              {/* Selected tags summary */}
              {totalTags > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-3 animate-fadeUp">
                  {tags.spaces.map(id => (
                    <button key={id} onClick={() => toggleTag('spaces', id)} className="pressable px-2.5 py-1 rounded-full text-[10px] font-body font-semibold flex items-center gap-1"
                      style={{ background: 'rgba(0,212,255,0.15)', color: '#00D4FF' }}>📍 {spaceMap[id]?.name} ×</button>
                  ))}
                  {tags.events.map(id => (
                    <button key={id} onClick={() => toggleTag('events', id)} className="pressable px-2.5 py-1 rounded-full text-[10px] font-body font-semibold flex items-center gap-1"
                      style={{ background: 'rgba(255,107,26,0.15)', color: '#FF6B1A' }}>🎟 {eventMap[id]?.name} ×</button>
                  ))}
                  {tags.pings.map(id => (
                    <button key={id} onClick={() => toggleTag('pings', id)} className="pressable px-2.5 py-1 rounded-full text-[10px] font-body font-semibold flex items-center gap-1"
                      style={{ background: 'rgba(0,212,255,0.12)', color: '#00D4FF' }}>📌 {pingMap[id]?.title} ×</button>
                  ))}
                  {tags.projects.map(id => (
                    <button key={id} onClick={() => toggleTag('projects', id)} className="pressable px-2.5 py-1 rounded-full text-[10px] font-body font-semibold flex items-center gap-1"
                      style={{ background: 'rgba(75,140,247,0.15)', color: '#4B8CF7' }}>📁 {projectMap[id]?.name} ×</button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Sticky Post button — always reachable, no scrolling to find it */}
      {mode && (
        <div className="flex-shrink-0 px-5 pt-3 pb-5" style={{ borderTop: '1px solid var(--glass-07)' }}>
          <button
            className="pressable w-full h-14 rounded-2xl font-display font-black text-base"
            style={{ background: 'linear-gradient(135deg, #FF2878, #FF6B1A)', color: '#fff', opacity: posting ? 0.7 : 1 }}
            onClick={handlePost} disabled={posting || (mode === 'photo' ? !media : !caption.trim())}>
            {posting ? (
              <span className="flex items-center justify-center gap-2">
                <LoadingDots color="#fff" />
                <span>POSTING...</span>
              </span>
            ) : 'POST'}
          </button>
        </div>
      )}

      {showContext && (
        <div className="absolute inset-0 flex flex-col justify-end z-50 animate-fadeIn"
          style={{ background: 'rgba(0,0,0,0.6)' }} onClick={() => setShowContext(false)}>
          <div className="rounded-t-3xl flex flex-col animate-slideUp" style={{ background: '#0F0F1A', maxHeight: '75%' }}
            onClick={e => e.stopPropagation()}>
            <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
              <div className="w-9 h-1 rounded-full" style={{ background: 'var(--color-eco-subtle)' }} />
            </div>
            <div className="flex items-center justify-between px-5 pt-2 pb-3 flex-shrink-0">
              <div className="font-display font-black text-sm text-eco-text">Add Context</div>
              <button className="pressable font-body text-xs font-bold" style={{ color: '#FF2878' }}
                onClick={() => setShowContext(false)}>Done</button>
            </div>
            <div className="flex-shrink-0 flex gap-2 px-5 pb-3 overflow-x-auto">
              {([
                ['spaces', '📍 Space'], ['events', '🎟 Event'], ['pings', '📌 Ping'], ['projects', '📁 Project'],
              ] as const).map(([cat, label]) => (
                <button key={cat} onClick={() => setContextCat(cat)}
                  className="pressable flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-display font-bold"
                  style={{ background: contextCat === cat ? '#FF2878' : 'var(--glass-08)', color: contextCat === cat ? '#fff' : 'var(--color-eco-muted)' }}>
                  {label}{tags[cat].length > 0 ? ` (${tags[cat].length})` : ''}
                </button>
              ))}
            </div>
            <div className="flex-1 overflow-y-auto px-5 pb-6 space-y-2">
              {contextCat === 'spaces' && spaces.map(space => (
                <button key={space.id} onClick={() => toggleTag('spaces', space.id)}
                  className="pressable w-full flex items-center justify-between p-3 rounded-xl"
                  style={{ background: tags.spaces.includes(space.id) ? 'rgba(0,212,255,0.12)' : 'var(--color-eco-surface2)' }}>
                  <span className="font-body text-sm" style={{ color: tags.spaces.includes(space.id) ? '#00D4FF' : 'var(--color-eco-text)' }}>{space.name}</span>
                  {tags.spaces.includes(space.id) && <span style={{ color: '#00D4FF' }}>✓</span>}
                </button>
              ))}
              {contextCat === 'events' && events.map(event => (
                <button key={event.id} onClick={() => toggleTag('events', event.id)}
                  className="pressable w-full flex items-center justify-between p-3 rounded-xl"
                  style={{ background: tags.events.includes(event.id) ? 'rgba(255,107,26,0.12)' : 'var(--color-eco-surface2)' }}>
                  <span className="font-body text-sm" style={{ color: tags.events.includes(event.id) ? '#FF6B1A' : 'var(--color-eco-text)' }}>{event.name}</span>
                  {tags.events.includes(event.id) && <span style={{ color: '#FF6B1A' }}>✓</span>}
                </button>
              ))}
              {contextCat === 'pings' && pings.map(ping => (
                <button key={ping.id} onClick={() => toggleTag('pings', ping.id)}
                  className="pressable w-full flex items-center justify-between p-3 rounded-xl"
                  style={{ background: tags.pings.includes(ping.id) ? 'rgba(0,212,255,0.1)' : 'var(--color-eco-surface2)' }}>
                  <span className="font-body text-sm" style={{ color: tags.pings.includes(ping.id) ? '#00D4FF' : 'var(--color-eco-text)' }}>{ping.title}</span>
                  {tags.pings.includes(ping.id) && <span style={{ color: '#00D4FF' }}>✓</span>}
                </button>
              ))}
              {contextCat === 'projects' && projects.map(project => (
                <button key={project.id} onClick={() => toggleTag('projects', project.id)}
                  className="pressable w-full flex items-center justify-between p-3 rounded-xl"
                  style={{ background: tags.projects.includes(project.id) ? 'rgba(75,140,247,0.12)' : 'var(--color-eco-surface2)' }}>
                  <span className="font-body text-sm" style={{ color: tags.projects.includes(project.id) ? '#4B8CF7' : 'var(--color-eco-text)' }}>{project.name}</span>
                  {tags.projects.includes(project.id) && <span style={{ color: '#4B8CF7' }}>✓</span>}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function RizzMusic() {
  const eco = useEcosystem()
  const tracks = [
    { title: 'Afrobeats Fusion', artist: 'Priya M.', duration: '2:34', plays: '12K', cover: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=160&h=160&fit=crop' },
    { title: 'Nile Nights', artist: 'DJ Morgs', duration: '3:12', plays: '8.4K', cover: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=160&h=160&fit=crop' },
    { title: 'Sunday Acoustic Vol. 2', artist: 'Acoustic Yard', duration: '4:01', plays: '5.2K', cover: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=160&h=160&fit=crop' },
    { title: 'East Side Story', artist: 'Kwame A.', duration: '3:45', plays: '3.1K', cover: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=160&h=160&fit=crop' },
    { title: 'City Heat', artist: 'Sarah A.', duration: '2:58', plays: '6.7K', cover: 'https://images.unsplash.com/photo-1429514513361-8a632ff5e7c6?w=160&h=160&fit=crop' },
    { title: 'Rooftop Sessions', artist: 'DJ Morgs', duration: '3:40', plays: '9.9K', cover: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=160&h=160&fit=crop' },
  ]
  const newReleases = [
    { title: 'Late Night Drive', artist: 'Kwame A.', cover: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=300&h=300&fit=crop' },
    { title: 'Homecoming', artist: 'Sarah A.', cover: 'https://images.unsplash.com/photo-1429514513361-8a632ff5e7c6?w=300&h=300&fit=crop' },
    { title: 'Sunrise', artist: 'Acoustic Yard', cover: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=300&h=300&fit=crop' },
    { title: 'Nakasero', artist: 'DJ Morgs', cover: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=300&h=300&fit=crop' },
  ]
  const playlists = [
    { title: 'Made For You', sub: 'Updated daily', cover: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=300&h=300&fit=crop' },
    { title: 'Jinja Heat', sub: '48 tracks', cover: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=300&h=300&fit=crop' },
    { title: 'Sunday Chill', sub: '22 tracks', cover: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=300&h=300&fit=crop' },
    { title: 'Workout Motion', sub: '35 tracks', cover: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=300&h=300&fit=crop' },
  ]
  const localArtists = users.filter(u => u.isCreator)

  const Section = ({ label }: { label: string }) => (
    <div className="font-display font-black text-sm text-eco-text px-5 mb-2.5 mt-6">{label}</div>
  )

  return (
    <div className="flex flex-col h-full" style={{ background: 'var(--color-eco-bg)' }}>
      <div className="flex-shrink-0 px-5 pt-12 pb-1">
        <div className="font-display font-black text-3xl text-eco-text" style={{ letterSpacing: '-0.02em' }}>MUSIC</div>
        <p className="font-body text-xs text-eco-muted mt-2">Catalog preview · audio playback is not connected.</p>
      </div>

      <div className="flex-1 overflow-y-auto pb-6">
        {/* Quick picks — 2-col grid, YT Music home style */}
        <div className="px-5 mt-4 grid grid-cols-2 gap-2.5">
          {tracks.slice(0, 6).map((track, i) => (
            <button key={i} className="pressable flex items-center gap-2.5 rounded-xl overflow-hidden pr-2"
              style={{ background: 'var(--color-eco-surface2)' }}
              onClick={() => eco.setNowPlaying({ title: track.title, artist: track.artist, cover: track.cover })}>
              <img src={track.cover} className="w-12 h-12 object-cover flex-shrink-0" alt="" />
              <div className="flex-1 text-left min-w-0">
                <div className="font-body text-xs font-semibold text-eco-text truncate">{track.title}</div>
                <div className="font-body text-[10px] text-eco-muted truncate">{track.artist}</div>
              </div>
            </button>
          ))}
        </div>

        {/* New releases */}
        <Section label="New releases" />
        <div className="flex gap-3 overflow-x-auto px-5 pb-1">
          {newReleases.map((r, i) => (
            <button disabled title="Not connected in this prototype" key={i} className="pressable flex-shrink-0 text-left" style={{ width: '128px' }}>
              <div className="relative rounded-xl overflow-hidden" style={{ width: '128px', height: '128px' }}>
                <img src={r.cover} className="w-full h-full object-cover" alt="" />
                <div className="absolute bottom-1.5 right-1.5 w-7 h-7 rounded-full flex items-center justify-center"
                  style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)' }}>
                  <span style={{ color: '#fff', fontSize: '10px' }}>▶</span>
                </div>
              </div>
              <div className="font-body text-xs font-semibold text-eco-text mt-1.5 truncate">{r.title}</div>
              <div className="font-body text-[10px] text-eco-muted truncate">{r.artist}</div>
            </button>
          ))}
        </div>

        {/* Trending in Jinja */}
        <Section label="Trending in Jinja" />
        <div className="px-5 space-y-2">
          {tracks.slice(0, 4).map((track, i) => (
            <button key={i} className="pressable w-full flex items-center gap-3 p-2.5 rounded-2xl"
              style={{ background: 'var(--color-eco-surface2)' }}
              onClick={() => eco.setNowPlaying({ title: track.title, artist: track.artist, cover: track.cover })}>
              <span className="font-display font-black text-sm w-4 text-center" style={{ color: 'var(--color-eco-subtle)' }}>{i + 1}</span>
              <img src={track.cover} className="w-11 h-11 rounded-lg object-cover flex-shrink-0" alt="" />
              <div className="flex-1 text-left min-w-0">
                <div className="font-body text-sm font-semibold text-eco-text truncate">{track.title}</div>
                <div className="font-body text-xs text-eco-muted truncate">{track.artist} · {track.plays} plays</div>
              </div>
              <span className="font-body text-xs text-eco-muted flex-shrink-0">{track.duration}</span>
            </button>
          ))}
        </div>

        {/* Playlists for you */}
        <Section label="Playlists for you" />
        <div className="flex gap-3 overflow-x-auto px-5 pb-1">
          {playlists.map((p, i) => (
            <button disabled title="Not connected in this prototype" key={i} className="pressable flex-shrink-0 text-left" style={{ width: '128px' }}>
              <img src={p.cover} className="rounded-xl object-cover" style={{ width: '128px', height: '128px' }} alt="" />
              <div className="font-body text-xs font-semibold text-eco-text mt-1.5 truncate">{p.title}</div>
              <div className="font-body text-[10px] text-eco-muted truncate">{p.sub}</div>
            </button>
          ))}
        </div>

        {/* Local artists */}
        <Section label="Local artists" />
        <div className="flex gap-4 overflow-x-auto px-5 pb-1">
          {localArtists.map(u => (
            <button disabled title="Not connected in this prototype" key={u.id} className="pressable flex-shrink-0 flex flex-col items-center gap-2" style={{ width: '76px' }}>
              <img src={u.avatar} className="w-16 h-16 rounded-full object-cover" alt={u.name} />
              <div className="font-body text-[10px] font-semibold text-eco-text text-center truncate w-full">{u.name.split(' ')[0]}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

function CreatorProfile({ userId, pop }: { userId: string; pop: () => void }) {
  const { content } = useRecords()
  const eco = useEcosystem()
  const user = userMap[userId]
  const userContent = content.filter(c => c.creatorId === userId)
  const [following, setFollowing] = useState(false)

  return (
    <div className="flex flex-col h-full" style={{ background: 'var(--color-eco-bg)' }}>
      {/* Header */}
      <div className="relative" style={{ height: '200px' }}>
        <img src={userContent[0]?.media || 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=800&h=400&fit=crop'}
          className="w-full h-full object-cover" alt="" />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.3), rgba(3,3,8,0.98))' }} />
        <button onClick={pop} className="pressable absolute top-12 left-5 w-9 h-9 rounded-full flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)' }}>
          <span className="text-white text-lg">←</span>
        </button>
      </div>

      <div className="px-5 -mt-14 relative z-10 pb-6">
        {/* Avatar */}
        <div className="flex items-end justify-between mb-4">
          <div className="relative">
            <div className="w-20 h-20 rounded-2xl p-0.5"
              style={{ background: 'linear-gradient(135deg, #FF2878, #FF6B1A)' }}>
              <img src={user.avatar} className="w-full h-full rounded-2xl object-cover" alt={user.name} />
            </div>
            <div className="absolute -bottom-1 -right-1 px-2 py-0.5 rounded-full text-[8px] font-display font-black uppercase"
              style={{
                background: user.tier === 'elite' ? '#D4AF37' : user.tier === 'expert' ? '#4B8CF7' : 'var(--color-eco-muted)',
                color: '#000',
              }}>
              {user.tier}
            </div>
          </div>
          <div className="flex gap-2">
            <button disabled title="Not connected in this prototype" className="pressable px-4 py-2 rounded-xl font-display font-black text-xs"
              style={{ background: 'var(--color-eco-surface)', border: '1px solid var(--glass-10)', color: 'var(--color-eco-text)' }}>
              Message
            </button>
            <button className="pressable px-4 py-2 rounded-xl font-display font-black text-xs"
              style={{ background: following ? 'var(--color-eco-surface)' : 'linear-gradient(135deg, #FF2878, #FF6B1A)', color: following ? '#FF2878' : '#fff',
                border: following ? '1px solid rgba(255,40,120,0.4)' : 'none' }}
              onClick={() => setFollowing(f => !f)}>
              {following ? '✓ Connected' : 'Connect'}
            </button>
          </div>
        </div>

        <div className="font-display font-black text-xl text-eco-text">{user.name}</div>
        <div className="font-body text-xs" style={{ color: '#FF2878' }}>{user.role}</div>
        <p className="font-body text-sm text-eco-muted mt-2 leading-relaxed">{user.bio}</p>

        {/* Stats */}
        <div className="flex gap-4 mt-4 pb-4 border-b border-eco-border">
          {[['XP', user.xp], ['Aura', user.aura], ['Rizz', user.rizz], ['Posts', userContent.length]].map(([l, v]) => (
            <div key={l as string}>
              <div className="font-display font-black text-lg text-eco-text">{v}</div>
              <div className="font-body text-[10px] text-eco-muted">{l}</div>
            </div>
          ))}
        </div>

        {/* Content grid */}
        <div className="mt-4 grid grid-cols-3 gap-1.5">
          {userContent.map(c => (
            <div key={c.id} className="aspect-square rounded-xl overflow-hidden relative pressable">
              <img src={c.media} className="w-full h-full object-cover" alt="" />
              {c.mediaType === 'reel' && (
                <div className="absolute top-1 right-1 w-4 h-4 rounded flex items-center justify-center text-[7px]"
                  style={{ background: 'rgba(255,40,120,0.8)', color: '#fff' }}>▶</div>
              )}
            </div>
          ))}
        </div>

        {/* Projects link */}
        <button className="pressable w-full mt-4 p-3 rounded-2xl flex items-center justify-between"
          style={{ background: 'var(--color-eco-surface)', border: '1px solid rgba(75,140,247,0.2)' }}
          onClick={() => eco.navigateTo('xp')}>
          <span className="font-body text-sm font-semibold text-eco-text">View Projects in XP</span>
          <span className="font-body text-xs" style={{ color: '#4B8CF7' }}>›</span>
        </button>
      </div>
    </div>
  )
}

function RizzEncounter({ pop }: { pop: () => void }) {
  const [phase, setPhase] = useState<'start' | 'searching' | 'call' | 'result' | 'connected'>('start')
  const [timer, setTimer] = useState(30)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const match = userMap['u5']

  const startSearch = () => {
    setPhase('searching')
    setTimeout(() => setPhase('call'), 2000)
  }

  useEffect(() => {
    if (phase === 'call') {
      timerRef.current = setInterval(() => {
        setTimer(t => {
          if (t <= 1) {
            clearInterval(timerRef.current!)
            setPhase('result')
            return 0
          }
          return t - 1
        })
      }, 1000)
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [phase])

  return (
    <div className="relative w-full h-full flex flex-col"
      style={{ background: 'radial-gradient(ellipse at 50% 0%, #1A0010 0%, #000 70%)' }}>

      {phase === 'start' && (
        <div className="flex-1 flex flex-col items-center justify-center gap-8 px-8 animate-fadeIn">
          <div className="w-24 h-24 rounded-full flex items-center justify-center text-5xl"
            style={{ background: 'rgba(255,40,120,0.15)', border: '2px solid rgba(255,40,120,0.3)' }}>✦</div>
          <div className="text-center">
            <div className="font-display font-black text-4xl text-eco-text">MEET SOMEONE</div>
            <div className="font-body text-eco-muted mt-2">30 seconds. No pressure.</div>
          </div>
          <button className="pressable w-full h-16 rounded-3xl font-display font-black text-lg"
            style={{ background: 'linear-gradient(135deg, #FF2878, #FF6B1A)', color: '#fff' }}
            onClick={startSearch}>
            START
          </button>
          <button onClick={pop} className="pressable font-body text-sm text-eco-muted">Cancel</button>
        </div>
      )}

      {phase === 'searching' && (
        <div className="flex-1 flex flex-col items-center justify-center gap-6 animate-fadeIn">
          <div className="relative w-24 h-24">
            <div className="absolute inset-0 rounded-full animate-ping"
              style={{ background: 'rgba(255,40,120,0.3)' }} />
            <div className="relative w-24 h-24 rounded-full flex items-center justify-center text-4xl"
              style={{ background: 'rgba(255,40,120,0.2)', border: '2px solid rgba(255,40,120,0.5)' }}>✦</div>
          </div>
          <div className="font-display font-black text-lg text-eco-text">Finding someone...</div>
          <div className="flex gap-1">
            {[0, 1, 2].map(i => (
              <div key={i} className="w-2 h-2 rounded-full animate-pulse"
                style={{ background: '#FF2878', animationDelay: `${i * 0.2}s` }} />
            ))}
          </div>
        </div>
      )}

      {phase === 'call' && (
        <div className="flex-1 flex flex-col animate-scaleIn">
          {/* Remote video (full screen) */}
          <div className="flex-1 relative">
            <img src={match.avatar} className="absolute inset-0 w-full h-full object-cover" alt="" style={{ filter: 'blur(2px) brightness(0.7)' }} />
            <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.4)' }} />

            {/* Timer */}
            <div className="absolute top-16 left-0 right-0 flex justify-center">
              <div className="px-5 py-2 rounded-full font-display font-black text-2xl"
                style={{
                  background: 'rgba(0,0,0,0.6)',
                  backdropFilter: 'blur(8px)',
                  color: timer < 10 ? '#FF2878' : '#fff',
                }}>
                00:{timer.toString().padStart(2, '0')}
              </div>
            </div>

            {/* Match name */}
            <div className="absolute top-1/2 left-0 right-0 flex flex-col items-center -translate-y-1/2">
              <img src={match.avatar} className="w-20 h-20 rounded-full border-2 border-white/40" alt="" />
              <div className="font-display font-black text-xl text-white mt-3">{match.name}</div>
              <div className="font-body text-sm text-white/60">{match.role}</div>
            </div>

            {/* Self preview */}
            <div className="absolute bottom-6 right-4 w-24 h-32 rounded-2xl overflow-hidden"
              style={{ border: '2px solid rgba(255,255,255,0.3)' }}>
              <img src={userMap['me'].avatar} className="w-full h-full object-cover" alt="" />
            </div>
          </div>
        </div>
      )}

      {phase === 'result' && (
        <div className="flex-1 flex flex-col items-center justify-center gap-6 px-8 animate-scaleIn">
          <div className="flex items-center gap-4">
            <img src={userMap['me'].avatar} className="w-16 h-16 rounded-2xl" alt="" />
            <span className="text-2xl" style={{ color: '#FF2878' }}>✦</span>
            <img src={match.avatar} className="w-16 h-16 rounded-2xl" alt="" />
          </div>
          <div className="text-center">
            <div className="font-display font-black text-2xl text-eco-text">KEEP THE RIZZ?</div>
            <div className="font-body text-sm text-eco-muted mt-1">With {match.name}</div>
          </div>
          <div className="flex gap-3 w-full">
            <button className="pressable flex-1 h-14 rounded-2xl font-display font-black text-sm flex items-center justify-center gap-2"
              style={{ background: 'linear-gradient(135deg, #FF2878, #FF6B1A)', color: '#fff' }}
              onClick={() => setPhase('connected')}>
              <span>❤️</span> CONNECT
            </button>
            <button className="pressable flex-1 h-14 rounded-2xl font-display font-black text-sm"
              style={{ background: 'var(--color-eco-surface)', border: '1px solid var(--glass-10)', color: 'var(--color-eco-muted)' }}
              onClick={() => { setTimer(30); setPhase('searching'); startSearch() }}>
              ↩ NEXT
            </button>
          </div>
        </div>
      )}

      {phase === 'connected' && (
        <div className="flex-1 flex flex-col items-center justify-center gap-6 px-8 animate-scaleIn">
          <div className="text-6xl">❤️</div>
          <div className="text-center">
            <div className="font-display font-black text-2xl text-eco-text">YOU CONNECTED!</div>
            <div className="font-body text-sm text-eco-muted mt-1">Chat with {match.name}</div>
          </div>
          <button disabled title="Not connected in this prototype" className="pressable w-full h-14 rounded-2xl font-display font-black text-sm"
            style={{ background: 'linear-gradient(135deg, #FF2878, #FF6B1A)', color: '#fff' }}>
            OPEN CHAT
          </button>
          <button onClick={pop} className="pressable font-body text-sm text-eco-muted">Later</button>
        </div>
      )}
    </div>
  )
}

// Helpers
function EmptyState({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3">
      <div className="text-3xl opacity-20">✦</div>
      <div className="font-display font-semibold text-eco-muted text-sm">{label}</div>
    </div>
  )
}
function LoadingDots({ color }: { color: string }) {
  return <span className="flex gap-1">{[0,1,2].map(i => (
    <span key={i} className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: color, animationDelay: `${i*0.15}s` }} />
  ))}</span>
}
function SearchSVG() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
    <circle cx="11" cy="11" r="7" stroke="#6B6B8C" strokeWidth="2" />
    <path d="M16 16L21 21" stroke="#6B6B8C" strokeWidth="2" strokeLinecap="round" />
  </svg>
}
function HomeIcon({ active }: { active: boolean }) {
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
    <path d="M3 12L12 3L21 12V21H15V15H9V21H3V12Z" stroke={active ? '#FF2878' : 'var(--color-eco-muted)'} strokeWidth="1.8" strokeLinejoin="round" fill={active ? 'rgba(255,40,120,0.15)' : 'none'} />
  </svg>
}
function DiscoverIcon({ active }: { active: boolean }) {
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
    <circle cx="11" cy="11" r="7" stroke={active ? '#FF2878' : 'var(--color-eco-muted)'} strokeWidth="1.8" />
    <path d="M16 16L21 21" stroke={active ? '#FF2878' : 'var(--color-eco-muted)'} strokeWidth="1.8" strokeLinecap="round" />
  </svg>
}
function CreateIcon({ active }: { active: boolean }) {
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="9" stroke={active ? '#FF2878' : 'var(--color-eco-muted)'} strokeWidth="1.8" />
    <path d="M12 8v8M8 12h8" stroke={active ? '#FF2878' : 'var(--color-eco-muted)'} strokeWidth="1.8" strokeLinecap="round" />
  </svg>
}
function MusicIcon({ active }: { active: boolean }) {
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
    <path d="M9 18V5l12-2v13" stroke={active ? '#FF2878' : 'var(--color-eco-muted)'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    <circle cx="6" cy="18" r="3" stroke={active ? '#FF2878' : 'var(--color-eco-muted)'} strokeWidth="1.8" />
    <circle cx="18" cy="16" r="3" stroke={active ? '#FF2878' : 'var(--color-eco-muted)'} strokeWidth="1.8" />
  </svg>
}
function ChatIcon({ active }: { active: boolean }) {
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" stroke={active ? '#FF2878' : 'var(--color-eco-muted)'} strokeWidth="1.8" fill={active ? 'rgba(255,40,120,0.15)' : 'none'} />
  </svg>
}
