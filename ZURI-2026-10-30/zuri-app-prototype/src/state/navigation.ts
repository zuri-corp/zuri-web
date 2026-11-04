import { useRef, useSyncExternalStore } from 'react'

export type AppName = 'aura' | 'rizz' | 'xp' | 'motion'
export interface CrossAppRoute { screen: string; params?: Record<string, any> }
export type Destination = { app: AppName | 'home'; route: CrossAppRoute }
const schemas: Record<AppName, Record<string, string[]>> = {
  aura: { home: [], pings_list: [], ping_detail: ['pingId'], space_detail: ['spaceId'], space_business: ['spaceId'], owner_dashboard: ['spaceId'], societies: [], society_detail: ['societyId'], topic_chat: ['topicId'], spaces: [], find: [], find_category: ['category'], product_detail: ['productId'], wallet: [], search: [] },
  motion: { home: [], events_list: [], event_detail: ['eventId'], ticket_select: ['eventId'], ticket_confirm: ['eventId', 'ticketType', 'price'], trips: [], hosted_space: ['eventId'], memories: ['eventId'], chat: [], search: [], my_tickets: [] },
  rizz: { home: [], discover: [], create: [], music: [], chat: [], reels: [], creator: ['userId'], encounter: [] },
  xp: { home: [], discover: [], projects: [], chat: [], project_detail: ['projectId'], creator_detail: ['userId'] },
}
export function parseDestination(hash: string): Destination {
  try {
    const url = new URL(hash.replace(/^#/, '') || '/', 'https://zuri.local')
    const [app, screen = 'home'] = url.pathname.split('/').filter(Boolean)
    if (!app || !Object.prototype.hasOwnProperty.call(schemas, app)) return { app: 'home', route: { screen: 'home' } }
    const keys = schemas[app as AppName][screen]
    const params = Object.fromEntries(url.searchParams)
    if (!keys || keys.some(key => !params[key])) return { app: app as AppName, route: { screen: 'home' } }
    if ('price' in params) {
      const price = Number(params.price)
      if (!Number.isSafeInteger(price) || price < 0) return { app: app as AppName, route: { screen: 'home' } }
      return { app: app as AppName, route: { screen, params: { ...params, price } } }
    }
    return { app: app as AppName, route: { screen, params } }
  } catch { return { app: 'home', route: { screen: 'home' } } }
}
export function destinationHash(app: AppName | 'home', route: CrossAppRoute = { screen: 'home' }) {
  if (app === 'home') return '#/'
  const params = new URLSearchParams(Object.entries(route.params || {}).map(([key, value]) => [key, String(value)]))
  return `#/${app}/${route.screen}${params.size ? '?' + params : ''}`
}
const remembered = new Map<AppName, CrossAppRoute>()
function remember() {
  const destination = parseDestination(window.location.hash)
  if (destination.app !== 'home') remembered.set(destination.app, destination.route)
}
export function navigate(app: AppName | 'home', route?: CrossAppRoute) {
  remember()
  const hash = destinationHash(app, route || (app === 'home' ? undefined : remembered.get(app)))
  if (hash === window.location.hash) return
  window.history.pushState({ zuriDepth: (window.history.state?.zuriDepth || 0) + 1 }, '', hash)
  window.dispatchEvent(new Event('zuri:navigate'))
}
export function goBack(fallback: AppName | 'home' = 'home') {
  if (window.history.state?.zuriDepth > 0) window.history.back()
  else navigate(fallback, { screen: 'home' })
}
function subscribe(listener: () => void) {
  const notify = () => { remember(); listener() }
  for (const name of ['hashchange', 'popstate', 'zuri:navigate']) window.addEventListener(name, notify)
  return () => { for (const name of ['hashchange', 'popstate', 'zuri:navigate']) window.removeEventListener(name, notify) }
}
export function useDestination() {
  const hash = useSyncExternalStore(subscribe, () => window.location.hash)
  return parseDestination(hash)
}
export function useModuleNavigation<S extends { id: string }>(app: AppName, tabs: Record<string, string>) {
  const destination = useDestination()
  const lastScreen = useRef<S>({ id: 'home' } as S)
  if (destination.app === app) lastScreen.current = { ...destination.route.params, id: destination.route.screen } as S
  const screen = lastScreen.current
  const navTab = Object.entries(tabs).find(([, id]) => id === screen.id)?.[0] || ''
  return { screen, navTab,
    push: (next: S) => { const { id, ...params } = next; navigate(app, { screen: id, params }) },
    pop: () => goBack(app),
    switchNav: (tab: string) => navigate(app, { screen: tabs[tab] || 'home' }),
  }
}

