export type EventTiming = {
  starts_at?: string | null
  ends_at?: string | null
  next_occurrence_at: string | null
  sessions?: { starts_at?: string | null; ends_at?: string | null }[] | null
}

function stamp(value?: string | null): number {
  if (!value) return NaN
  // Quicket sessions may be stored without an offset. They use Kampala time.
  return Date.parse(/(?:Z|[+-]\d{2}:\d{2})$/.test(value) ? value : value + '+03:00')
}

export function activeOccurrence(event: EventTiming, now = Date.now()): string | null {
  if (event.sessions?.length) {
    // An event's overall end date does not mean a recurring session runs nonstop.
    const session = [...event.sessions]
      .filter(item => Number.isFinite(stamp(item.starts_at)) && stamp(item.ends_at || item.starts_at) >= now)
      .sort((a, b) => stamp(a.starts_at) - stamp(b.starts_at))[0]
    return session?.starts_at || null
  }
  const start = event.next_occurrence_at || event.starts_at
  return Number.isFinite(stamp(start)) && stamp(event.ends_at || start) >= now ? start! : null
}

export function occurrenceTime(value: string): number { return stamp(value) }

export function safeEventUrl(value?: string | null): string | undefined {
  try {
    const url = new URL(value || '')
    return url.protocol === 'https:' && !url.username && !url.password ? url.href : undefined
  } catch { return undefined }
}
