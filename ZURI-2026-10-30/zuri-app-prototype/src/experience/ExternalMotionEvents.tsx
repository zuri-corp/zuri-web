
import { useEffect, useState } from 'react'
import { EventCard } from './EventPresentation'
import { AppGlyph } from './AppGlyph'
import {
  getMotionEvents,
  type ImportedMotionEvent,
} from '../lib/motion-events'

export default function ExternalMotionEvents({onOpen}:{onOpen:(id:string)=>void}) {
  const [events, setEvents] = useState<ImportedMotionEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [refresh, setRefresh] = useState(0)
  const [query, setQuery] = useState('')
  const [shown, setShown] = useState(12)
  const [filtersOpen,setFiltersOpen] = useState(false)
  const [category,setCategory] = useState('all')
  const filtered = events.filter(event => (category === 'all' || event.category === category) && [event.title, event.category, event.location?.venue, event.location?.city].filter(Boolean).join(' ').toLowerCase().includes(query.trim().toLowerCase()))
  const categories=[...new Set(events.map(event=>event.category).filter(Boolean))]

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
      <div className="cw-event-search">
        <label><span className="zs-sr-only">Search events</span><AppGlyph name="Find" size={18}/><input type="search" value={query} placeholder="Search events, places or interests" onChange={e => { setQuery(e.target.value); setShown(12) }} /></label>
        <button type="button" aria-label="Filter events" aria-expanded={filtersOpen} className="cw-event-filter" onClick={() => setFiltersOpen(value=>!value)}><AppGlyph name="options" size={19}/></button>
        <button type="button" aria-label="Refresh events" className="cw-event-filter" disabled={loading} onClick={() => setRefresh(value => value + 1)}><AppGlyph name="refresh" size={19}/></button>
      </div>
      {filtersOpen&&<div className="cw-event-filters"><label>Category<select value={category} onChange={e=>{setCategory(e.target.value);setShown(12)}}><option value="all">All categories</option>{categories.map(value=><option key={value}>{value}</option>)}</select></label></div>}

      {loading && <p role="status">Loading events…</p>}

      {error && <p role="alert">{error}</p>}

      {!loading && !error && events.length === 0 && (
        <p>No upcoming external events are available. Try refreshing in a moment.</p>
      )}

      {!loading && !error && events.length > 0 && <p role="status">{filtered.length} {filtered.length === 1 ? 'event' : 'events'}{query || category !== 'all' ? ' matching your search' : ' to explore'} · Times in East Africa Time</p>}
      {!loading && !error && events.length > 0 && filtered.length === 0 && <p>No matches. Try another place, category, or source.</p>}
      <div className="cw-event-grid">
      {filtered.slice(0, shown).map(event => <EventCard key={event.id} event={event} onOpen={()=>onOpen(event.id)}/>)}
      </div>
      {filtered.length > shown && <button type="button" className="cw-link" onClick={() => setShown(value => value + 12)}>Show more events ({filtered.length - shown} remaining)</button>}
    </section>
  )
}
