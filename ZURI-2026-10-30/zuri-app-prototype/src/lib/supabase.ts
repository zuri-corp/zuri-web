
import { createClient } from '@supabase/supabase-js'
import publicConfig from '../data/publicBackend.json'

export const supabase = createClient(publicConfig.url, publicConfig.publishableKey)
