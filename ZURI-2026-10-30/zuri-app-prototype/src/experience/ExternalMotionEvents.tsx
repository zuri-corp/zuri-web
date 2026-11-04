
import { useEffect, useState } from 'react'
import {
  getMotionEvents,
  type ImportedMotionEvent,
} from '../lib/motion-events'

export default function ExternalMotionEvents() {
  const [events, setEvents] = useState<ImportedMotionEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true

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
  }, [])

  return (
    <section className="cw-external-events">
      <h3>Discover upcoming events</h3>
      <p>Approved listings from external event partners.</p>

      {loading && <p role="status">Loading events…</p>}

      {error && <p role="alert">{error}</p>}

      {!loading && !error && events.length === 0 && (
        <p>No upcoming external events are available.</p>
      )}

      {!loading && !error && events.map(event => (
        <article className="cw-card" key={event.id}>
          {event.image?.original_url && (
            <img
              src={event.image.original_url}
              alt={event.image.alt || event.title}
              loading="lazy"
              style={{
                width: '100%',
                aspectRatio: '16 / 9',
                objectFit: 'cover',
                borderRadius: 12,
              }}
            />
          )}

          <small>{event.source} · External event</small>

          <h3>{event.title}</h3>

          {event.next_occurrence_at && (
            <p>
              {new Date(event.next_occurrence_at).toLocaleString(
                'en-UG',
                { dateStyle: 'medium', timeStyle: 'short' }
              )}
            </p>
          )}

          {(event.location?.venue || event.location?.city) && (
            <p>
              {[event.location.venue, event.location.city]
                .filter(Boolean)
                .join(', ')}
            </p>
          )}

          {event.description && (
            <p>{event.description}</p>
          )}

          {event.registration_url?.startsWith('https://') && (
            <a
              className="cw-primary"
              href={event.registration_url}
              target="_blank"
              rel="noopener noreferrer"
            >
              View event / Book externally ↗
            </a>
          )}
        </article>
      ))}
    </section>
  )
}
