
import { useEffect, useState } from 'react'
import { EventCard } from './EventPresentation'
import {
  getMotionEvents,
  type ImportedMotionEvent,
} from '../lib/motion-events'

export default function ExternalMotionEvents({onOpen}:{onOpen:(id:string)=>void}) {
  const [events, setEvents] = useState<ImportedMotionEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [refresh, setRefresh] = useState(0)
  const [source, setSource] = useState('all')
  const [query, setQuery] = useState('')
  const [shown, setShown] = useState(12)
  const filtered = events.filter(event => (source === 'all' || event.source === source) && [event.title, event.category, event.location?.venue, event.location?.city].filter(Boolean).join(' ').toLowerCase().includes(query.trim().toLowerCase()))

  useEffect(() => {
    let active = true
    setLoading(true)
    setError('')

    getMotionEvents()
      .then(rows => {
        if (active) setEvents(rows)
      })
      .catch(() => {
        if (active) setError('External events could not be loaded.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [refresh])

  return (
    <section className="cw-external-events">
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', marginBlock: 16 }}>
        <label>Search events <input type="search" value={query} placeholder="Music, business, Kampala…" onChange={e => { setQuery(e.target.value); setShown(12) }} /></label>
        <label>Source <select value={source} onChange={e => { setSource(e.target.value); setShown(12) }}>
          <option value="all">All sources</option>
          <option value="quicket">Quicket</option>
          <option value="x">X announcements</option>
        </select></label>
        <button type="button" className="cw-link" disabled={loading} onClick={() => setRefresh(value => value + 1)}>Refresh events</button>
      </div>

      {loading && <p role="status">Loading events…</p>}

      {error && <p role="alert">{error}</p>}

      {!loading && !error && events.length === 0 && (
        <p>No upcoming external events are available. Try refreshing in a moment.</p>
      )}

      {!loading && !error && events.length > 0 && <p role="status">{filtered.length} {filtered.length === 1 ? 'event' : 'events'}{query || source !== 'all' ? ' matching your search' : ' to explore'} · Times in East Africa Time</p>}
      {!loading && !error && events.length > 0 && filtered.length === 0 && <p>No matches. Try another place, category, or source.</p>}
      <div className="cw-event-grid">
      {!loading && !error && filtered.slice(0, shown).map(event => <EventCard key={event.id} event={event} onOpen={()=>onOpen(event.id)}/>)}
      </div>
      {!loading && !error && filtered.length > shown && <button type="button" className="cw-link" onClick={() => setShown(value => value + 12)}>Show more events ({filtered.length - shown} remaining)</button>}
    </section>
  )
}
