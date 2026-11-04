
import { supabase } from './supabase'

export type ImportedMotionEvent = {
  id: string
  source: string
  title: string
  description: string | null
  category: string | null
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
  const { data, error } = await supabase
    .from('motion_imported_events')
    .select('id,source,title,description,category,next_occurrence_at,location,image,registration_url')
    .eq('verification_status', 'verified')
    .eq('publication_status', 'published')
    .gte('next_occurrence_at', new Date().toISOString())
    .order('next_occurrence_at', { ascending: true })

  if (error) throw error

  return (data ?? []) as ImportedMotionEvent[]
}
