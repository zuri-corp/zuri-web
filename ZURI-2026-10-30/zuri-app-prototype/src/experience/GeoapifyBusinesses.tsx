
import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

type Business = {
  id: string
  name: string
  address: string
  category: string
  latitude: number
  longitude: number
  source?: string
  claimed?: boolean
}

const categories = [
  { value: 'restaurants', label: 'Restaurants' },
  { value: 'cafes', label: 'Cafés' },
  { value: 'hotels', label: 'Hotels' },
  { value: 'shops', label: 'Shops' },
  { value: 'hospitals', label: 'Hospitals' },
  { value: 'banks', label: 'Banks' },
  { value: 'sports', label: 'Sports' },
]

const DEFAULT_LOCATION = {
  name: 'Kampala',
  latitude: 0.3476,
  longitude: 32.5825,
}

export default function GeoapifyBusinesses() {
  const [category, setCategory] = useState('restaurants')
  const [businesses, setBusinesses] = useState<Business[]>([])
  const [selected, setSelected] = useState<Business | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [refreshKey, setRefreshKey] = useState(0)

  const loadBusinesses = useCallback(async () => {
    setLoading(true)
    setError('')
    setSelected(null)

    try {
      const { data, error: functionError } =
        await supabase.functions.invoke('geoapify-places', {
          body: {
            category,
            latitude: DEFAULT_LOCATION.latitude,
            longitude: DEFAULT_LOCATION.longitude,
          },
        })

      if (functionError) throw functionError
      if (data?.error) throw Error(data.error)

      if (!Array.isArray(data?.businesses)) {
        throw Error('Unexpected response from Geoapify.')
      }

      const clean = data.businesses.filter(
        (business: Business) =>
          typeof business.id === 'string' &&
          typeof business.name === 'string' &&
          business.name.trim().length > 1 &&
          business.name !== 'Unnamed place' &&
          Number.isFinite(business.latitude) &&
          Number.isFinite(business.longitude)
      )

      setBusinesses(clean)
    } catch (err) {
      setBusinesses([])
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to load nearby places.'
      )
    } finally {
      setLoading(false)
    }
  }, [category])

  useEffect(() => {
    void loadBusinesses()
  }, [loadBusinesses, refreshKey])

  const directionsUrl = (business: Business) =>
    `https://www.google.com/maps/search/?api=1&query=${
      business.latitude
    },${business.longitude}`

  return (
    <section className="cw-external-businesses">
      {selected ? (
        <article className="cw-card">
          <button
            type="button"
            className="cw-link"
            onClick={() => setSelected(null)}
          >
            ← Back to places
          </button>

          <small>External listing · Geoapify</small>
          <h2>{selected.name}</h2>
          <p>{selected.address}</p>
          <p>{selected.category}</p>

          <a
            className="cw-primary"
            href={directionsUrl(selected)}
            target="_blank"
            rel="noopener noreferrer"
          >
            Get directions ↗
          </a>

          <p>
            This place has not been verified as a
            ZURI-managed Space.
          </p>

          <button
            type="button"
            className="cw-link"
            disabled
            title="Business claiming is coming next"
          >
            Claim this place (coming soon)
          </button>
        </article>
      ) : (
        <>
          <h2>Explore places</h2>
          <p>
            Discover businesses and services around{' '}
            {DEFAULT_LOCATION.name}.
          </p>

          <div
            className="cw-category-list"
            role="group"
            aria-label="Place categories"
            style={{
              display: 'flex',
              gap: 8,
              overflowX: 'auto',
              padding: '8px 0 16px',
            }}
          >
            {categories.map(item => (
              <button
                key={item.value}
                type="button"
                className="cw-link"
                aria-pressed={category === item.value}
                onClick={() => setCategory(item.value)}
                style={{
                  flexShrink: 0,
                  borderRadius: 20,
                  padding: '8px 12px',
                  border: '1px solid currentColor',
                  opacity: category === item.value ? 1 : 0.65,
                  fontWeight:
                    category === item.value ? 700 : 400,
                }}
              >
                {item.label}
              </button>
            ))}
          </div>

          {loading && (
            <p role="status">Loading nearby places…</p>
          )}

          {error && (
            <div role="alert" className="cw-card">
              <p>{error}</p>
              <button
                type="button"
                className="cw-primary"
                onClick={() => setRefreshKey(n => n + 1)}
              >
                Try again
              </button>
            </div>
          )}

          {!loading && !error && (
            <p>{businesses.length} places found</p>
          )}

          {!loading && businesses.map(business => (
            <button
              type="button"
              className="cw-result"
              key={business.id}
              onClick={() => setSelected(business)}
            >
              <span>
                <small>
                  {business.category} · External listing
                </small>
                <strong>{business.name}</strong>
                <p>{business.address}</p>
              </span>
              <span aria-hidden="true">›</span>
            </button>
          ))}

          {!loading && !error && businesses.length === 0 && (
            <p>
              No named places found in this category.
              Try another category.
            </p>
          )}
        </>
      )}
    </section>
  )
}
