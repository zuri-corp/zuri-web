import {createClient} from '@supabase/supabase-js';
import publicConfig from '../data/publicBackend.json';
import {resolvePublicConnection} from './publicConnection';
const config=resolvePublicConnection(import.meta.env,publicConfig);
// This client serves public imported events only. Account access is handled by
// cloudClient, with its own verified sessions; public browsing must not wait on it.
export const supabase=createClient(config.url,config.publishableKey,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
