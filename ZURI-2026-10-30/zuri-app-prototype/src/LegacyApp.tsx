import { useState, useRef, useCallback, useEffect, createContext, useContext } from 'react'
import AuraApp from './apps/aura/AuraApp'
import RizzApp from './apps/rizz/RizzApp'
import XpApp from './apps/xp/XpApp'
import MotionApp from './apps/motion/MotionApp'
import { type WalletTx, type Content } from './data/catalog'
import { usePrototype, useRecords, updateState, completePurchase, hasStorageError } from './state/store'
import { formatMoney, newId, type Booking, type Purchase } from './state/core'
import { useDestination, navigate, goBack, type AppName, type CrossAppRoute } from './state/navigation'
export type { AppName, CrossAppRoute } from './state/navigation'
export type { Booking } from './state/core'

export interface EcosystemCtx {
  walletBalance: number
  completePurchase: (purchase: Purchase) => boolean
  notify: (message: string) => void
  walletTxs: WalletTx[]
  purchasedTickets: Set<string>
  joinedPings: Set<string>
  joinPing: (pingId: string) => void
  contentItems: Content[]
  addContent: (item: Omit<Content, 'id' | 'createdAt' | 'reactions' | 'comments'>) => void
  isDark: boolean
  toggleTheme: () => void
  nowPlaying: { title: string; artist: string; cover: string } | null
  isPlayingMusic: boolean
  setNowPlaying: (t: { title: string; artist: string; cover: string }) => void
  toggleMusicPlay: () => void
  installedTools: Set<string>
  toggleTool: (id: string) => void
  bookings: Booking[]
  pausedOfferings: Set<string>
  toggleOfferingPaused: (offeringId: string) => void
  navigateTo: (app: AppName, route?: CrossAppRoute) => void
  showAppSwitcher: () => void
  showProfileMenu: () => void
  homeButtonProps: {
    onPointerDown: (e: React.PointerEvent) => void
    onPointerUp: () => void
    onPointerLeave: () => void
  }
}

export const EcosystemContext = createContext<EcosystemCtx>(null!)
export const useEcosystem = () => useContext(EcosystemContext)

export const APPS: { id: AppName; label: string; color: string; icon: string; tagline: string }[] = [
  { id: 'aura',    label: 'AURA',    color: '#00D4FF', icon: '📍', tagline: 'Places · Moments · Presence' },
  { id: 'rizz',    label: 'RIZZ',    color: '#FF2878', icon: '✦',  tagline: 'Expression · Culture · Create' },
  { id: 'xp',      label: 'XP',      color: '#4B8CF7', icon: '⬡',  tagline: 'Projects · Experience · Collab' },
  { id: 'motion',  label: 'MOTION',  color: '#FF6B1A', icon: '◎',  tagline: 'Events · Trips · Movement' },
]

const LP_MS = 2000

export default function App() {
  const destination = useDestination()
  const currentApp = destination.app
  const state = usePrototype()
  const { walletBalance, walletTxs, contentItems, bookings } = state
  const purchasedTickets = new Set(state.purchasedTickets)
  const joinedPings = new Set(state.joinedPings)
  const pausedOfferings = new Set(state.pausedOfferings)
  const [notice, setNotice] = useState<string | null>(null)
  const [showDrawer, setShowDrawer] = useState(false)
  const [showProfileMenu, setShowProfileMenuState] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [nowPlaying, setNowPlayingState] = useState<{ title: string; artist: string; cover: string } | null>({
    title: 'Nile After Dark', artist: 'DJ Morgs',
    cover: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=120&h=120&fit=crop&auto=format',
  })
  const [isPlayingMusic, setIsPlayingMusic] = useState(false)
  const [installedTools, setInstalledTools] = useState<Set<string>>(new Set(['ursb']))
  const [isDark, setIsDark] = useState(() => {
    try { return localStorage.getItem('eco_theme') !== 'light' } catch { return true }
  })
  const [lpState, setLpState] = useState<'idle' | 'pressing'>('idle')
  const [lpProgress, setLpProgress] = useState(0)
  const lpStart = useRef(0)
  const lpInterval = useRef<ReturnType<typeof setInterval> | undefined>(undefined)

  useEffect(() => {
    document.documentElement.classList.toggle('light', !isDark)
    try { localStorage.setItem('eco_theme', isDark ? 'dark' : 'light') } catch {}
  }, [isDark])

  const toggleTheme = () => setIsDark(d => !d)
  const setNowPlaying = (t: { title: string; artist: string; cover: string }) => {
    setNowPlayingState(t)
    setIsPlayingMusic(true)
  }
  const toggleMusicPlay = () => setIsPlayingMusic(p => !p)
  const toggleTool = (id: string) => setInstalledTools(s => {
    const n = new Set(s)
    n.has(id) ? n.delete(id) : n.add(id)
    return n
  })
  const toggleOfferingPaused = (id: string) => updateState(s => ({ ...s,
    pausedOfferings: s.pausedOfferings.includes(id) ? s.pausedOfferings.filter(x => x !== id) : [...s.pausedOfferings, id] }))
  const joinPing = (id: string) => updateState(s => ({ ...s, joinedPings: [...new Set([...s.joinedPings, id])] }))
  const addContent = (item: Omit<Content, 'id' | 'createdAt' | 'reactions' | 'comments'>) => {
    updateState(s => ({ ...s, contentItems: [{ ...item, id: newId('post'), createdAt: 'Just now', reactions: 0, comments: 0 }, ...s.contentItems] }))
  }
  const navigateTo = (app: AppName, route?: CrossAppRoute) => { navigate(app, route); setShowDrawer(false) }
  useEffect(() => () => clearInterval(lpInterval.current), [])
  useEffect(() => {
    const title = currentApp === 'home' ? 'Zuri — Opportunity for everyone' : `${currentApp.toUpperCase()} · Zuri`
    document.title = title
  }, [currentApp])

  const beginLP = useCallback(() => {
    if (currentApp === 'home') return
    lpStart.current = Date.now()
    setLpState('pressing')
    setLpProgress(0)
    lpInterval.current = setInterval(() => {
      const p = Math.min((Date.now() - lpStart.current) / LP_MS, 1)
      setLpProgress(p)
      if (p >= 1) {
        clearInterval(lpInterval.current)
        setLpState('idle')
        setLpProgress(0)
        setShowDrawer(true)
      }
    }, 16)
  }, [currentApp])

  const endLP = useCallback(() => {
    if (lpState !== 'pressing') return
    const elapsed = Date.now() - lpStart.current
    clearInterval(lpInterval.current)
    setLpState('idle')
    setLpProgress(0)
    if (elapsed < 300) {
      navigate('home')
    }
  }, [lpState])

  const cancelLP = useCallback(() => {
    if (lpState !== 'pressing') return
    clearInterval(lpInterval.current)
    setLpState('idle')
    setLpProgress(0)
  }, [lpState])

  const homeButtonProps = {
    onPointerDown: (e: React.PointerEvent) => { e.preventDefault(); beginLP() },
    onPointerUp: endLP,
    onPointerLeave: cancelLP,
  }

  const ctx: EcosystemCtx = {
    walletBalance, completePurchase, walletTxs, notify: setNotice,
    purchasedTickets, joinedPings, joinPing,
    contentItems, addContent,
    isDark, toggleTheme,
    nowPlaying, isPlayingMusic, setNowPlaying, toggleMusicPlay,
    installedTools, toggleTool,
    bookings, pausedOfferings, toggleOfferingPaused,
    navigateTo, showAppSwitcher: () => setShowDrawer(true),
    showProfileMenu: () => setShowProfileMenuState(true),
    homeButtonProps,
  }

  return (
    <EcosystemContext.Provider value={ctx}>
      <div className="flex items-center justify-center w-full h-full" style={{ background: 'var(--page-bg)' }}>
        <div className="relative flex flex-col overflow-hidden"
          style={{
            width: 'min(390px, 100vw)',
            height: 'min(844px, 100vh)',
            borderRadius: 'clamp(0px, 3vw, 44px)',
            background: 'var(--color-eco-bg)',
            boxShadow: '0 48px 96px rgba(0,0,0,0.9), 0 0 0 1px var(--glass-06)',
          }}>
          <div className="zuri-global-nav" aria-label="Zuri navigation">
            <button onClick={() => goBack()} aria-label="Go back">←</button>
            <button onClick={() => navigate('home')} aria-label="Zuri home">ZURI</button>
            <span className="flex-1 text-right text-[9px] text-eco-muted">PROTOTYPE</span>
            <button onClick={() => setNotice('Viola is Zuri’s AI. Live assistance will be connected in a later release.')} aria-label="About Viola">Viola ✦</button>
            <button onClick={() => setShowDrawer(true)} aria-label="Switch apps">Apps</button>
          </div>
          {hasStorageError() && <p role="alert" className="px-4 py-2 text-xs text-red-300 font-body">Browser storage is full or unavailable. Changes in this session may be lost when you reload.</p>}
          {/* Status bar */}
          <div className="flex-shrink-0 flex items-center justify-between px-6 pt-3 pb-1"
            style={{ color: 'var(--status-text)', fontSize: '11px', fontFamily: 'Inter,sans-serif', fontWeight: 600 }}>
            <span>9:41</span>
            <div className="flex items-center gap-2">
              <svg width="14" height="10" viewBox="0 0 14 10" fill="none">
                <rect x="0" y="6" width="2" height="4" rx="0.5" fill="currentColor" />
                <rect x="3" y="4" width="2" height="6" rx="0.5" fill="currentColor" />
                <rect x="6" y="2" width="2" height="8" rx="0.5" fill="currentColor" />
                <rect x="9" y="0" width="2" height="10" rx="0.5" fill="currentColor" />
              </svg>
              <svg width="15" height="11" viewBox="0 0 15 11" fill="none">
                <path d="M7.5 2.5C9.8 2.5 11.9 3.5 13.3 5.1L14.5 3.7C12.8 1.8 10.3 0.5 7.5 0.5C4.7 0.5 2.2 1.8 0.5 3.7L1.7 5.1C3.1 3.5 5.2 2.5 7.5 2.5Z" fill="currentColor" />
                <path d="M7.5 5.5C8.9 5.5 10.2 6.1 11.1 7.1L12.3 5.7C11.1 4.4 9.4 3.5 7.5 3.5C5.6 3.5 3.9 4.4 2.7 5.7L3.9 7.1C4.8 6.1 6.1 5.5 7.5 5.5Z" fill="currentColor" />
                <circle cx="7.5" cy="9.5" r="1.5" fill="currentColor" />
              </svg>
              <span>100%</span>
            </div>
          </div>

          {/* Main content */}
          <div className="flex-1 overflow-hidden relative">
            <div hidden={currentApp !== 'home'} className="h-full"><EcosystemHome onLaunch={navigateTo} walletBalance={walletBalance} /></div>
            <AppRenderer currentApp={currentApp} />

            {/* Persistent Now Playing — survives switching apps, per Pamoja's cross-ecosystem music layer */}
            {nowPlaying && isPlayingMusic && (
              <div
                className="absolute left-3 right-3 z-40 flex items-center gap-2.5 px-2.5 py-2 rounded-2xl"
                style={{ bottom: currentApp === 'home' ? '104px' : '18px', background: 'rgba(10,10,20,0.85)', backdropFilter: 'blur(16px)', border: '1px solid var(--glass-10)' }}
>
                <button aria-label="Open music" className="flex flex-1 min-w-0 items-center gap-2.5 text-left" onClick={() => navigateTo('rizz', { screen: 'music' })}>
                <img src={nowPlaying.cover} className="w-8 h-8 rounded-lg object-cover flex-shrink-0" alt="" />
                <div className="flex-1 min-w-0 text-left">
                  <div className="font-body text-xs font-semibold text-white truncate">{nowPlaying.title}</div>
                  <div className="font-body text-[10px] text-white/50 truncate">{nowPlaying.artist}</div>
                </div>
                </button>
                <button aria-label="Toggle music preview" className="pressable w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ background: 'rgba(255,255,255,0.12)' }}
                  onClick={e => { e.stopPropagation(); toggleMusicPlay() }}>
                  <span style={{ color: '#fff', fontSize: '11px' }}>{isPlayingMusic ? '❚❚' : '▶'}</span>
                </button>
              </div>
            )}

            {/* Long-press ring near the ◈ button (top-left) */}
            {lpState === 'pressing' && (
              <div className="absolute pointer-events-none" style={{ top: 8, left: 12, zIndex: 60 }}>
                <LPRing progress={lpProgress} />
              </div>
            )}

            {/* Apps drawer */}
            {showDrawer && (
              <AppsDrawer
                currentApp={currentApp as AppName | 'home'}
                onSelect={navigateTo}
                onGoHome={() => { navigate('home'); setShowDrawer(false) }}
                onClose={() => setShowDrawer(false)}
              />
            )}

            {/* Profile menu */}
            {showProfileMenu && (
              <ProfileMenu
                onClose={() => setShowProfileMenuState(false)}
                onOpenSettings={() => { setShowProfileMenuState(false); setShowSettings(true) }}
              />
            )}

            {/* Settings */}
            {showSettings && (
              <SettingsScreen
                isDark={isDark}
                toggleTheme={toggleTheme}
                onClose={() => setShowSettings(false)}
              />
            )}
            {notice && <div className="absolute inset-0 z-[80] flex items-center justify-center p-5" style={{ background: 'rgba(0,0,0,.65)' }} onClick={() => setNotice(null)}>
              <div role="dialog" aria-modal="true" aria-label="Zuri information" className="rounded-2xl p-5 text-eco-text bg-eco-surface font-body text-sm" onClick={e => e.stopPropagation()}>
                <p>{notice}</p><button autoFocus onClick={() => setNotice(null)} className="mt-4 px-4 py-2 rounded-xl bg-eco-surface2">Got it</button>
              </div>
            </div>}
          </div>
        </div>
      </div>
    </EcosystemContext.Provider>
  )
}

/* ── App renderer ── */
function AppRenderer({ currentApp }: { currentApp: AppName | 'home' }) {
  const visited = useRef(new Set<AppName>())
  if (currentApp !== 'home') visited.current.add(currentApp)
  return <>{APPS.filter(app => visited.current.has(app.id)).map(app => {
    const Component = { aura: AuraApp, rizz: RizzApp, xp: XpApp, motion: MotionApp }[app.id]
    return <div key={app.id} hidden={currentApp !== app.id} className="h-full"><Component /></div>
  })}</>
}

/* ── Circular long-press ring ── */
function LPRing({ progress }: { progress: number }) {
  const r = 20, circ = 2 * Math.PI * r
  return (
    <svg width="44" height="44" viewBox="0 0 44 44"
      style={{ filter: 'drop-shadow(0 0 6px rgba(255,255,255,0.3))' }}>
      <circle cx="22" cy="22" r={r} fill="none" stroke="var(--glass-08)" strokeWidth="2.5" />
      <circle cx="22" cy="22" r={r} fill="none"
        stroke="rgba(255,255,255,0.9)" strokeWidth="2.5"
        strokeDasharray={`${circ * progress} ${circ}`}
        strokeLinecap="round"
        transform="rotate(-90 22 22)" />
    </svg>
  )
}

/* ── Apps drawer (appears after 2-second long press) ── */
function AppsDrawer({ currentApp, onSelect, onGoHome, onClose }: {
  currentApp: AppName | 'home'
  onSelect: (app: AppName) => void
  onGoHome: () => void
  onClose: () => void
}) {
  return (
    <div className="absolute inset-0 flex flex-col justify-end z-50 animate-fadeIn"
      style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(10px)' }}
      onClick={onClose}>
      <div className="animate-slideUp rounded-t-3xl"
        style={{ background: 'var(--color-eco-surface)', border: '1px solid var(--glass-09)', borderBottom: 'none' }}
        onClick={e => e.stopPropagation()}>
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-9 h-1 rounded-full" style={{ background: 'var(--color-eco-subtle)' }} />
        </div>
        <div className="px-5 pt-2 pb-1">
          <div className="font-display font-black text-[9px] tracking-[0.35em] text-eco-muted uppercase">SWITCH APP</div>
        </div>
        <div className="flex gap-3 px-4 pt-3 pb-9 overflow-x-auto">
          <button className="pressable flex-shrink-0 flex flex-col items-center gap-2" onClick={onGoHome}>
            <div className="w-[62px] h-[62px] rounded-2xl flex items-center justify-center font-display font-black text-xl"
              style={{
                background: currentApp === 'home' ? 'var(--glass-14)' : 'var(--glass-06)',
                border: currentApp === 'home' ? '1.5px solid var(--glass-50)' : '1px solid var(--glass-12)',
                color: 'var(--color-eco-text)',
              }}>◈</div>
            <span className="font-display font-bold text-[10px]"
              style={{ color: currentApp === 'home' ? 'var(--color-eco-text)' : 'var(--color-eco-muted)' }}>HOME</span>
          </button>
          {APPS.map(app => (
            <button key={app.id} className="pressable flex-shrink-0 flex flex-col items-center gap-2"
              onClick={() => onSelect(app.id)}>
              <div className="w-[62px] h-[62px] rounded-2xl flex items-center justify-center text-2xl"
                style={{
                  background: currentApp === app.id ? `${app.color}22` : `${app.color}0D`,
                  border: currentApp === app.id ? `1.5px solid ${app.color}` : `1px solid ${app.color}22`,
                }}>
                {app.icon}
              </div>
              <span className="font-display font-bold text-[10px]"
                style={{ color: currentApp === app.id ? app.color : 'var(--color-eco-muted)' }}>
                {app.label}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ── Profile menu (bottom sheet, opened from the avatar) ── */
function ProfileMenu({ onClose, onOpenSettings }: { onClose: () => void; onOpenSettings: () => void }) {
  const eco = useEcosystem()
  const { spaces } = useRecords()
  const myEstablishment = spaces.find(s => s.ownerId === 'me')
  const ITEMS: { icon: string; label: string; sub?: string; action: () => void }[] = [
    { icon: '⚙️', label: 'Settings', sub: 'Appearance, notifications', action: onOpenSettings },
    { icon: '◈', label: 'Wallet', sub: formatMoney(eco.walletBalance), action: () => { onClose(); eco.navigateTo('aura', { screen: 'wallet' }) } },
    { icon: '⬡', label: 'My XP profile', sub: 'Projects & experience', action: () => { onClose(); eco.navigateTo('xp', { screen: 'creator_detail', params: { userId: 'me' } }) } },
    ...(myEstablishment ? [{
      icon: '🏛', label: 'My Business', sub: myEstablishment.name,
      action: () => { onClose(); eco.navigateTo('aura', { screen: 'owner_dashboard', params: { spaceId: myEstablishment.id } }) },
    }] : []),
  ]
  return (
    <div className="absolute inset-0 flex flex-col justify-end z-50 animate-fadeIn"
      style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(8px)' }}
      onClick={onClose}>
      <div className="animate-slideUp rounded-t-3xl overflow-hidden"
        style={{ background: 'var(--color-eco-surface)', border: '1px solid var(--glass-09)', borderBottom: 'none' }}
        onClick={e => e.stopPropagation()}>
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-9 h-1 rounded-full" style={{ background: 'var(--color-eco-subtle)' }} />
        </div>

        {/* Identity row */}
        <div className="flex items-center gap-3 px-5 pt-3 pb-4"
          style={{ borderBottom: '1px solid var(--color-eco-border)' }}>
          <img src="https://i.pravatar.cc/150?img=3" className="w-12 h-12 rounded-full object-cover" alt="You" />
          <div>
            <div className="font-display font-black text-base text-eco-text">Alex Kato</div>
            <div className="font-body text-xs text-eco-muted">Jinja, UG · {formatMoney(eco.walletBalance)}</div>
          </div>
        </div>

        <div className="px-3 py-2 pb-safe">
          {ITEMS.map(item => (
            <button key={item.label} className="pressable flex items-center gap-3 w-full px-2.5 py-3 rounded-xl text-left"
              onClick={item.action}>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center text-base flex-shrink-0"
                style={{ background: 'var(--glass-06)' }}>{item.icon}</div>
              <div className="flex-1 min-w-0">
                <div className="font-body text-sm font-semibold text-eco-text">{item.label}</div>
                {item.sub && <div className="font-body text-xs text-eco-muted mt-0.5">{item.sub}</div>}
              </div>
              <span className="text-eco-subtle">›</span>
            </button>
          ))}
        </div>
        <div className="h-4" />
      </div>
    </div>
  )
}

/* ── Settings screen ── */
function SettingsScreen({ isDark, toggleTheme, onClose }: { isDark: boolean; toggleTheme: () => void; onClose: () => void }) {
  const { notificationsEnabled: notifs } = usePrototype()
  const setNotifs = (update: (value: boolean) => boolean) => updateState(s => ({ ...s, notificationsEnabled: update(s.notificationsEnabled) }))
  return (
    <div className="absolute inset-0 z-50 flex flex-col animate-fadeIn" style={{ background: 'var(--color-eco-bg)' }}>
      <div className="flex-shrink-0 flex items-center gap-3 px-5 pt-4 pb-3"
        style={{ borderBottom: '1px solid var(--color-eco-border)' }}>
        <button className="pressable w-8 h-8 rounded-full flex items-center justify-center"
          style={{ background: 'var(--glass-06)' }} onClick={onClose}>
          <span className="text-eco-text" style={{ fontSize: '15px' }}>‹</span>
        </button>
        <span className="font-display font-black text-lg text-eco-text">Settings</span>
      </div>

      <div className="flex-1 overflow-y-auto px-5 pt-5 pb-6">
        <div className="font-display font-black text-[10px] tracking-[0.25em] text-eco-subtle uppercase mb-2.5">Appearance</div>
        <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--color-eco-surface)', border: '1px solid var(--color-eco-border)' }}>
          <div className="flex items-center gap-3 px-4 py-3.5">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center text-base flex-shrink-0"
              style={{ background: 'var(--glass-06)' }}>{isDark ? '🌙' : '☀️'}</div>
            <div className="flex-1">
              <div className="font-body text-sm font-semibold text-eco-text">Day mode</div>
              <div className="font-body text-xs text-eco-muted mt-0.5">
                {isDark ? 'Off — using dark theme' : 'On — using light theme'}
              </div>
            </div>
            <ToggleSwitch checked={!isDark} onChange={toggleTheme} />
          </div>
        </div>

        <div className="font-display font-black text-[10px] tracking-[0.25em] text-eco-subtle uppercase mb-2.5 mt-6">Notifications</div>
        <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--color-eco-surface)', border: '1px solid var(--color-eco-border)' }}>
          <div className="flex items-center gap-3 px-4 py-3.5">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center text-base flex-shrink-0"
              style={{ background: 'var(--glass-06)' }}>🔔</div>
            <div className="flex-1">
              <div className="font-body text-sm font-semibold text-eco-text">Notification preference</div>
              <div className="font-body text-xs text-eco-muted mt-0.5">Saved on this browser; push delivery is not connected</div>
            </div>
            <ToggleSwitch checked={notifs} onChange={() => setNotifs(n => !n)} />
          </div>
        </div>

        <div className="font-display font-black text-[10px] tracking-[0.25em] text-eco-subtle uppercase mb-2.5 mt-6">About</div>
        <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--color-eco-surface)', border: '1px solid var(--color-eco-border)' }}>
          <div className="flex items-center justify-between px-4 py-3.5">
            <span className="font-body text-sm text-eco-text">Version</span>
            <span className="font-body text-sm text-eco-muted">1.0.0</span>
          </div>
        </div>
      </div>
    </div>
  )
}

function ToggleSwitch({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button className="pressable flex-shrink-0" onClick={onChange}
      style={{
        width: '44px', height: '26px', borderRadius: '999px', position: 'relative',
        background: checked ? '#00D4FF' : 'var(--glass-14)',
        transition: 'background 0.2s ease',
      }}>
      <div style={{
        position: 'absolute', top: '3px', left: checked ? '21px' : '3px',
        width: '20px', height: '20px', borderRadius: '50%', background: '#fff',
        boxShadow: '0 1px 3px rgba(0,0,0,0.3)', transition: 'left 0.2s cubic-bezier(0.16,1,0.3,1)',
      }} />
    </button>
  )
}

/* ════════════════════════════════════════════
   ECOSYSTEM HOME  —  Lounge · Tools · Browser
   ════════════════════════════════════════════ */
function EcosystemHome({ onLaunch, walletBalance }: { onLaunch: (app: AppName) => void; walletBalance: number }) {
  const eco = useEcosystem()
  const [tab, setTab] = useState<'lounge' | 'tools' | 'browser'>('lounge')
  const [showNotifications, setShowNotifications] = useState(false)
  const [dockVisible, setDockVisible] = useState(true)
  const lastScrollY = useRef(0)
  const isLounge = tab === 'lounge'

  const handleContentScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const y = e.currentTarget.scrollTop
    const last = lastScrollY.current
    if (y < 24) setDockVisible(true)
    else if (y > last + 6) setDockVisible(false)
    else if (y < last - 6) setDockVisible(true)
    lastScrollY.current = y
  }

  return (
    <div className="flex flex-col h-full relative overflow-hidden" style={{ background: 'var(--color-eco-bg)' }}>
      {/* Wallpaper — only shown under Lounge */}
      {isLounge && (
        <div className="absolute inset-0 pointer-events-none z-0">
          <img
            src="https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800&h=1400&fit=crop&auto=format"
            className="w-full h-full object-cover"
            style={{ opacity: 0.38 }}
            alt=""
          />
          <div className="absolute inset-0"
            style={{ background: 'linear-gradient(to bottom, var(--wallpaper-25) 0%, var(--wallpaper-55) 40%, var(--wallpaper-92) 75%, #06060D 100%)' }} />
        </div>
      )}

      {/* Header */}
      <div className="flex-shrink-0 relative z-10 flex items-center justify-between px-5 pt-2 pb-3"
        style={isLounge ? { backdropFilter: 'blur(0px)' } : {}}>
        <div className="font-display font-black text-[13px] tracking-[0.35em] text-eco-muted uppercase">◈ ZURI</div>
        <div className="flex items-center gap-2.5">
          <button className="pressable relative w-8 h-8 rounded-full flex items-center justify-center"
            style={{
              background: isLounge ? 'var(--glass-10)' : 'var(--color-eco-surface)',
              border: '1px solid var(--glass-12)',
              backdropFilter: isLounge ? 'blur(16px)' : undefined,
            }}
            onClick={() => setShowNotifications(true)}>
            <BellIcon />
            <span className="absolute top-0.5 right-0.5 w-2 h-2 rounded-full border border-eco-bg"
              style={{ background: '#FF2878' }} />
          </button>
          <button className="pressable" onClick={eco.showProfileMenu}>
            <img src="https://i.pravatar.cc/150?img=3"
              className="w-8 h-8 rounded-full object-cover"
              style={{ border: '1.5px solid var(--glass-18)' }} alt="You" />
          </button>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex-shrink-0 relative z-10 mx-5 mb-3 flex rounded-xl overflow-hidden"
        style={{
          background: isLounge ? 'var(--surface-blur3)' : 'var(--color-eco-surface)',
          border: '1px solid var(--glass-09)',
          backdropFilter: isLounge ? 'blur(20px)' : undefined,
        }}>
        {(['lounge', 'tools', 'browser'] as const).map(t => (
          <button key={t} className="pressable flex-1 py-2.5 font-display font-black text-[11px] tracking-widest uppercase"
            style={{
              background: tab === t ? 'var(--glass-10)' : 'transparent',
              color: tab === t ? 'var(--color-eco-text)' : 'var(--color-eco-muted)',
            }}
            onClick={() => { setTab(t); setDockVisible(true); lastScrollY.current = 0 }}>{t}</button>
        ))}
      </div>

      {/* Content — each tab gets its own absolute scroll container */}
      <div className="flex-1 relative z-10 overflow-hidden">
        {tab === 'lounge' && (
          <div className="absolute inset-0 overflow-y-auto px-5 pt-1 pb-4 space-y-5" onScroll={handleContentScroll}>
            <LoungeTab walletBalance={walletBalance} isLounge={isLounge} />
          </div>
        )}
        {tab === 'tools' && (
          <div className="absolute inset-0 overflow-y-auto px-5 pt-2 pb-4 space-y-4" onScroll={handleContentScroll}>
            <ToolsTab onLaunch={onLaunch} />
          </div>
        )}
        {tab === 'browser' && (
          <div className="absolute inset-0">
            <BrowserTab />
          </div>
        )}
      </div>

      {/* App dock — collapses on scroll down, reappears on scroll up, matching modern feed apps */}
      <div className="flex-shrink-0 relative z-10 overflow-hidden"
        style={{
          borderTop: dockVisible ? '1px solid var(--glass-07)' : '1px solid transparent',
          background: isLounge ? 'var(--wallpaper-65)' : 'var(--color-eco-bg)',
          backdropFilter: isLounge ? 'blur(24px)' : undefined,
          maxHeight: dockVisible ? '132px' : '0px',
          paddingTop: dockVisible ? '12px' : '0px',
          paddingBottom: dockVisible ? '24px' : '0px',
          transition: 'max-height 0.28s cubic-bezier(0.16,1,0.3,1), padding 0.28s cubic-bezier(0.16,1,0.3,1)',
        }}>
        <div className="px-4">
          <div className="font-display font-bold text-[8px] tracking-[0.35em] text-eco-subtle uppercase px-1 mb-3">APPS</div>
          <div className="flex justify-between">
            {APPS.map(app => (
              <button key={app.id} className="pressable flex flex-col items-center gap-1.5"
                onClick={() => onLaunch(app.id)}>
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl"
                  style={{ background: `${app.color}14`, border: `1px solid ${app.color}22` }}>
                  {app.icon}
                </div>
                <span className="font-display font-bold text-[9px]" style={{ color: app.color }}>{app.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {showNotifications && <NotificationsSheet onClose={() => setShowNotifications(false)} />}
    </div>
  )
}

/* ── Notifications — personal, individual alerts. Distinct from Lounge's aggregate Reports. ── */
function NotificationsSheet({ onClose }: { onClose: () => void }) {
  const NOTIFICATIONS = [
    { icon: '✦', text: 'Sarah Amara liked your reel', sub: '1h ago', color: '#FF2878' },
    { icon: '💬', text: 'James Sserugo commented on your Ping', sub: '2h ago', color: '#00D4FF' },
    { icon: '🎟', text: 'Jinja Night Live — 12 seats left', sub: '18m ago', color: '#FF6B1A' },
    { icon: '⬡', text: 'Collab request on Sound Archive Uganda', sub: '3h ago', color: '#4B8CF7' },
    { icon: '🏨', text: 'Your booking at Jinja Nile Resort is confirmed', sub: '1d ago', color: '#D4AF37' },
  ]
  return (
    <div className="absolute inset-0 flex flex-col justify-end z-50 animate-fadeIn"
      style={{ background: 'rgba(0,0,0,0.55)' }} onClick={onClose}>
      <div className="rounded-t-3xl animate-slideUp" style={{ background: 'var(--color-eco-surface)', maxHeight: '75%' }}
        onClick={e => e.stopPropagation()}>
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-9 h-1 rounded-full" style={{ background: 'var(--color-eco-subtle)' }} />
        </div>
        <div className="flex items-center justify-between px-5 pt-2 pb-4">
          <span className="font-display font-black text-base text-eco-text">Notifications</span>
          <button className="pressable font-body text-xs text-eco-muted" onClick={onClose}>Close</button>
        </div>
        <div className="px-4 pb-6 space-y-2 overflow-y-auto">
          {NOTIFICATIONS.map((n, i) => (
            <div key={i} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: 'var(--glass-05)' }}>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
                style={{ background: `${n.color}18` }}>{n.icon}</div>
              <div className="flex-1 min-w-0">
                <div className="font-body text-xs text-eco-text leading-tight">{n.text}</div>
                <div className="font-body text-[10px] text-eco-muted mt-0.5">{n.sub}</div>
              </div>
              <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: n.color }} />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ── Lounge ── */
function LoungeTab({ walletBalance, isLounge }: { walletBalance: number; isLounge: boolean }) {
  const h = new Date().getHours()
  const greeting = h < 5 ? 'Still up,' : h < 12 ? 'Good morning,' : h < 17 ? 'Good afternoon,' : 'Good evening,'

  const eco = useEcosystem()
  const TRACKS = [
    { title: 'Nile After Dark', artist: 'DJ Morgs', cover: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=120&h=120&fit=crop&auto=format' },
    { title: 'Night Frequency',    artist: 'Kwame A.', cover: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=120&h=120&fit=crop&auto=format' },
    { title: 'East Sound Vol. 3',  artist: 'Sarah A.', cover: 'https://images.unsplash.com/photo-1571330735066-03aaa9429d89?w=120&h=120&fit=crop&auto=format' },
  ]
  const trackIdx = Math.max(0, TRACKS.findIndex(t => t.title === eco.nowPlaying?.title))
  const track = eco.nowPlaying || TRACKS[0]
  const playing = eco.isPlayingMusic

  const REPORTS = [
    { icon: '📍', text: 'Walukuba Barbarians RFC posted 12 new Pings this week', sub: 'Space report', color: '#00D4FF' },
    { icon: '🏨', text: 'Jinja Nile Resort crossed 500 total bookings',          sub: 'Establishment report', color: '#D4AF37' },
    { icon: '🎪', text: 'Nyege Nyege Heads grew by 340 members this month',      sub: 'Society report', color: '#FF6B1A' },
    { icon: '🎵', text: 'Sound Archive Uganda hit 120 archived tracks',          sub: 'Project report', color: '#4B8CF7' },
  ]
  const DISCOVER = [
    { image: 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=300&h=160&fit=crop&auto=format', title: 'Jinja Music Scene 2026', tag: 'Culture' },
    { image: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=300&h=160&fit=crop&auto=format', title: 'Best Rooftop Views',         tag: 'Places' },
    { image: 'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=300&h=160&fit=crop&auto=format', title: 'Street Art in Kololo',        tag: 'Art' },
  ]

  return (
    <div className="space-y-5 animate-fadeUp">
      {/* Greeting */}
      <div>
        <div className="font-body text-sm text-eco-muted">{greeting}</div>
        <p className="font-body text-xs text-eco-muted mb-2">Opportunity for everyone. People, places, ideas and experiences.</p>
        <div className="font-display font-black text-[32px] text-eco-text leading-tight" style={{ letterSpacing: '-0.03em' }}>
          Alex Kato
        </div>
        <div className="flex items-center gap-3 mt-2 flex-wrap">
          <span className="font-body text-xs text-eco-muted">{formatMoney(walletBalance)}</span>
          <span className="w-1 h-1 rounded-full bg-eco-subtle" />
          <span className="font-body text-xs text-eco-muted">Jinja, UG</span>
          <span className="w-1 h-1 rounded-full bg-eco-subtle" />
          <span className="font-body text-xs" style={{ color: '#00D4FF' }}>● Online</span>
        </div>
      </div>

      {/* Music player */}
      <div className="rounded-2xl overflow-hidden"
        style={{
          background: isLounge ? 'var(--surface-blur1)' : 'var(--color-eco-surface)',
          border: '1px solid var(--glass-10)',
          backdropFilter: isLounge ? 'blur(20px)' : undefined,
        }}>
        <div className="flex items-center gap-3 p-3 pb-2">
          <div className="relative flex-shrink-0 w-14 h-14 rounded-xl overflow-hidden">
            <img src={track.cover} className="w-full h-full object-cover" alt="" />
            {playing && (
              <div className="absolute inset-0 flex items-end justify-center pb-1.5 gap-0.5"
                style={{ background: 'rgba(0,0,0,0.45)' }}>
                {[3,5,2,4].map((seed, i) => (
                  <div key={i} className="w-1 rounded-t-sm animate-pulse"
                    style={{ background: '#FF2878', height: `${seed * 10}%`, animationDelay: `${i * 0.1}s` }} />
                ))}
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-body text-[9px] text-eco-muted uppercase tracking-widest">Music preview · no audio</div>
            <div className="font-display font-black text-sm text-eco-text truncate mt-0.5">{track.title}</div>
            <div className="font-body text-xs text-eco-muted">{track.artist}</div>
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <button className="pressable w-8 h-8 flex items-center justify-center"
              onClick={() => eco.setNowPlaying(TRACKS[(trackIdx - 1 + TRACKS.length) % TRACKS.length])}>
              <span className="text-eco-muted text-base">⏮</span>
            </button>
            <button className="pressable w-10 h-10 rounded-full flex items-center justify-center"
              style={{ background: '#FF2878' }} onClick={() => eco.toggleMusicPlay()}>
              <span className="text-white text-base">{playing ? '⏸' : '▶'}</span>
            </button>
            <button className="pressable w-8 h-8 flex items-center justify-center"
              onClick={() => eco.setNowPlaying(TRACKS[(trackIdx + 1) % TRACKS.length])}>
              <span className="text-eco-muted text-base">⏭</span>
            </button>
          </div>
        </div>
        <div className="mx-3 mb-3 h-1 rounded-full" style={{ background: 'var(--glass-08)' }}>
          <div className="h-full rounded-full transition-all duration-1000"
            style={{ width: playing ? '45%' : '28%', background: 'linear-gradient(90deg, #FF2878, #FF6B1A)' }} />
        </div>
      </div>

      {/* Reports — aggregate/summary updates. Personal alerts live behind the bell icon instead. */}
      <div>
        <div className="flex items-center justify-between mb-2.5">
          <span className="font-display font-black text-[11px] tracking-[0.1em] text-eco-text uppercase">Reports</span>
          <button disabled title="Not connected in this prototype" className="font-body text-xs text-eco-muted pressable">See all</button>
        </div>
        <div className="space-y-2">
          {REPORTS.map((n, i) => (
            <div key={i} className="pressable flex items-center gap-3 p-3 rounded-xl"
              style={{
                background: isLounge ? 'var(--glass-06)' : 'var(--color-eco-surface)',
                border: `1px solid ${isLounge ? 'var(--glass-10)' : 'var(--glass-05)'}`,
                backdropFilter: isLounge ? 'blur(16px)' : undefined,
              }}>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
                style={{ background: `${n.color}18` }}>{n.icon}</div>
              <div className="flex-1 min-w-0">
                <div className="font-body text-xs text-eco-text leading-tight">{n.text}</div>
                <div className="font-body text-[10px] text-eco-muted mt-0.5">{n.sub}</div>
              </div>
              <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: n.color }} />
            </div>
          ))}
        </div>
      </div>

      {/* Discover */}
      <div>
        <div className="font-display font-black text-[11px] tracking-[0.1em] text-eco-text uppercase mb-2.5">Discover</div>
        <div className="flex gap-3 -mx-5 px-5 overflow-x-auto pb-1">
          {DISCOVER.map((d, i) => (
            <button disabled title="Not connected in this prototype" key={i} className="pressable flex-shrink-0 rounded-2xl overflow-hidden text-left"
              style={{ width: '58vw', maxWidth: '210px', border: '1px solid var(--glass-07)' }}>
              <div className="relative" style={{ paddingBottom: '56.25%' }}>
                <img src={d.image} className="absolute inset-0 w-full h-full object-cover" alt="" />
              </div>
              <div className="p-3"
                style={{
                  background: isLounge ? 'var(--surface-blur2)' : 'var(--color-eco-surface)',
                  backdropFilter: isLounge ? 'blur(16px)' : undefined,
                }}>
                <div className="font-body text-[9px] text-eco-muted uppercase tracking-wider mb-0.5">{d.tag}</div>
                <div className="font-display font-black text-sm text-eco-text leading-tight">{d.title}</div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ── Tools ── */
function ToolsTab({ onLaunch }: { onLaunch: (app: AppName) => void }) {
  const eco = useEcosystem()
  const tools = [
    { icon: '📷', label: 'Create',      sub: 'RIZZ',    color: '#FF2878', action: () => eco.navigateTo('rizz', { screen: 'create' }) },
    { icon: '🎟',  label: 'My Tickets',  sub: 'MOTION',  color: '#FF6B1A', action: () => eco.navigateTo('motion', { screen: 'my_tickets' }) },
    { icon: '◎',  label: 'Wallet', sub: 'AURA · FIND', color: '#D4AF37', action: () => eco.navigateTo('aura', { screen: 'wallet' }) },
    { icon: '📍', label: 'Places',         sub: 'AURA',    color: '#00D4FF', action: () => eco.navigateTo('aura', { screen: 'spaces' }) },
    { icon: '⬡',  label: 'Projects',    sub: 'XP',      color: '#4B8CF7', action: () => eco.navigateTo('xp', { screen: 'projects' }) },
    { icon: '🔍', label: 'Search',      sub: '',        color: '#8888AA', action: () => eco.navigateTo('aura', { screen: 'search' }) },
  ]
  return (
    <div className="space-y-4 animate-fadeUp">
      <div className="grid grid-cols-3 gap-3">
        {tools.map((t, i) => (
          <button key={i} className="pressable flex flex-col items-center gap-2.5 py-5 rounded-2xl"
            style={{ background: 'var(--color-eco-surface)', border: '1px solid var(--glass-06)' }}
            onClick={t.action}>
            <span className="text-3xl">{t.icon}</span>
            <div className="font-display font-black text-xs text-eco-text">{t.label}</div>
            {t.sub && (
              <span className="font-display font-bold text-[8px] px-2 py-0.5 rounded-full"
                style={{ background: `${t.color}16`, color: t.color }}>{t.sub}</span>
            )}
          </button>
        ))}
      </div>
      {/* Identity card */}
      <button className="pressable block w-full text-left p-4 rounded-2xl" onClick={eco.showProfileMenu}
        style={{ background: 'var(--color-eco-surface)', border: '1px solid var(--glass-06)' }}>
        <div className="flex items-center gap-3 mb-3">
          <img src="https://i.pravatar.cc/150?img=3" className="w-10 h-10 rounded-xl object-cover" alt="You" />
          <div>
            <div className="font-display font-black text-sm text-eco-text">Alex Kato</div>
            <div className="font-body text-xs text-eco-muted">@alex.kato · Jinja</div>
          </div>
        </div>
        <div className="grid grid-cols-4 gap-2">
          {[['XP','75','#4B8CF7'],['Aura','140','#D4AF37'],['Rizz','42','#FF2878'],['Motion','28','#FF6B1A']].map(([l,v,c]) => (
            <div key={l} className="flex flex-col items-center py-2 rounded-xl" style={{ background: `${c}0F` }}>
              <span className="font-display font-black text-base" style={{ color: c }}>{v}</span>
              <span className="font-body text-[9px] text-eco-muted">{l}</span>
            </div>
          ))}
        </div>
      </button>
    </div>
  )
}

/* ── Browser ── */
function BrowserTab() {
  return (
    <div className="flex flex-col h-full items-center justify-center px-8 text-center" style={{ background: 'var(--color-eco-bg)' }}>
      <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl mb-5"
        style={{ background: 'var(--glass-08)' }}>🌐</div>
      <div className="font-display font-black text-xl text-eco-text mb-2">Browser is coming soon</div>
      <p className="font-body text-sm text-eco-muted leading-relaxed max-w-[260px]">
        Real web search takes real infrastructure — we're building it properly rather than faking it. Check back soon.
      </p>
      <div className="mt-6 px-4 py-2 rounded-full" style={{ background: 'var(--glass-06)' }}>
        <span className="font-display font-bold text-[10px] tracking-widest uppercase" style={{ color: 'var(--color-eco-subtle)' }}>
          In development
        </span>
      </div>
    </div>
  )
}

function BellIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" stroke="#6A6A8E" strokeWidth="1.8" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" stroke="#6A6A8E" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}
