
import { supabase } from './supabase'
import { activeOccurrence, occurrenceTime } from './motion-event-dates'

export type ImportedMotionEvent = {
  id: string
  source: string
  title: string
  description: string | null
  category: string | null
  starts_at: string | null
  ends_at: string | null
  sessions?: { starts_at?: string | null; ends_at?: string | null }[] | null
  source_payload?: { source_url?: string; time_known?: boolean } | null
  next_occurrence_at: string | null
  location: {
    venue?: string
    city?: string
    country?: string
  } | null
  image: {
    original_url?: string | null
    alt?: string
  } | null
  registration_url: string | null
}

export async function getMotionEvents(): Promise<ImportedMotionEvent[]> {
  const rows: ImportedMotionEvent[] = []
  const now = Date.now()
  for (let offset = 0; ; offset += 100) {
    const { data, error } = await supabase
      .from('motion_imported_events')
      .select('id,source,title,description,category,starts_at,ends_at,sessions,source_payload,next_occurrence_at,location,image,registration_url')
      .eq('verification_status', 'verified')
      .eq('publication_status', 'published')
      .or(`next_occurrence_at.gte.${new Date(now).toISOString()},ends_at.gte.${new Date(now).toISOString()}`)
      .order('id', { ascending: true })
      .range(offset, offset + 99)
    if (error) throw error
    const page = (data ?? []) as ImportedMotionEvent[]
    rows.push(...page)
    if (page.length < 100) break
  }
  return rows.flatMap(event => {
    const next = activeOccurrence(event, now)
    return next ? [{ ...event, next_occurrence_at: next }] : []
  }).sort((a, b) => occurrenceTime(a.next_occurrence_at!) - occurrenceTime(b.next_occurrence_at!))
}

export async function getMotionEvent(id:string):Promise<ImportedMotionEvent|null>{
 if(!/^(quicket|x):[a-zA-Z0-9_-]+$/.test(id))return null;
 const {data,error}=await supabase.from('motion_imported_events')
 .select('id,source,title,description,category,starts_at,ends_at,sessions,source_payload,next_occurrence_at,location,image,registration_url')
 .eq('id',id).eq('verification_status','verified').eq('publication_status','published').maybeSingle();
 if(error)throw error;
 if(!data)return null;
 const event=data as ImportedMotionEvent;
 return {...event,next_occurrence_at:activeOccurrence(event)||event.next_occurrence_at};
}
