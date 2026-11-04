import { useMemo, useSyncExternalStore } from 'react'
import { initialState, restoreState, purchase, STORAGE_KEY, type PrototypeState, type Purchase } from './core'

let state: PrototypeState
try { state = restoreState(localStorage.getItem(STORAGE_KEY)) } catch { state = initialState() }
const listeners = new Set<() => void>()
let storageError = false
export const hasStorageError = () => storageError
export function updateState(update: (previous: PrototypeState) => PrototypeState) {
  state = update(state)
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); storageError = false } catch { storageError = true }
  listeners.forEach(listener => listener())
}
export function completePurchase(input: Purchase): boolean {
  const next = purchase(state, input)
  if (!next) return false
  updateState(() => next)
  return true
}
export function usePrototype() {
  return useSyncExternalStore(listener => { listeners.add(listener); return () => { listeners.delete(listener) } }, () => state)
}
export function useRecords() {
  const state = usePrototype()
  return useMemo(() => ({ content: state.contentItems, events: state.events, pings: state.pings,
    projects: state.projects, spaces: state.spaces,
    eventMap: Object.fromEntries(state.events.map(item => [item.id, item])),
    pingMap: Object.fromEntries(state.pings.map(item => [item.id, item])),
    projectMap: Object.fromEntries(state.projects.map(item => [item.id, item])),
    spaceMap: Object.fromEntries(state.spaces.map(item => [item.id, item])),
  }), [state])
}
