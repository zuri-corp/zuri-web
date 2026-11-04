import { createClient } from '@supabase/supabase-js';
const required = ['SUPABASE_URL', 'SUPABASE_SECRET_KEY', 'NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY'];
const missing = required.filter(name => !process.env[name]);
if (missing.length) {
  console.error(`Missing secure environment configuration: ${missing.join(', ')}`);
  process.exit(2);
}
if (process.env.SUPABASE_URL.replace(/\/$/, '') !== process.env.NEXT_PUBLIC_SUPABASE_URL.replace(/\/$/, '')) {
  console.error('Server and browser Supabase URLs must refer to the same project.');
  process.exit(2);
}
const client = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, {auth:{persistSession:false,autoRefreshToken:false}});
const contracts = {
  admin_users: 'user_id',
  enquiries: 'id,name,email,phone,source,wedding_date,location,guest_count,package_interest,message,status,created_at',
  enquiry_notes: 'id,enquiry_id,content,author_id,created_at',
  zuri_pamoja_accounts: 'user_id,display_name,updated_at',
  zuri_pamoja_managers: 'content_id,user_id,granted_at,revoked_at',
  zuri_pamoja_settings: 'content_id,moments_enabled',
  zuri_pamoja_moments: 'id,content_id,display_name,note,permission_reference,status,created_at,published_at,reviewed_by,review_reference,author_id,request_id,permission_version',
  zuri_pamoja_management_audit: 'id,content_id,actor_id,action,subject_id,reference,created_at',
  zuri_website_content: 'id,kind,slug,status,data,published_data,consent_verified,consent_reference,revision,published_revision,published_at,updated_at,created_by,updated_by',
};
let failed = false;
for (const [table,columns] of Object.entries(contracts)) {
  const {error} = await client.from(table).select(columns).limit(0);
  if (error) {failed = true; console.error(`${table}: contract check failed (${error.code || 'connection_error'}).`);}
  else console.log(`${table}: expected columns are accessible.`);
}
const publicClient=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
const {error:publicError}=await publicClient.from('zuri_website_content').select('kind,slug,status,published_data,published_at').limit(0);
if(publicError){failed=true;console.error(`Public projection: failed (${publicError.code||'connection_error'}).`);}else console.log('Public projection: accessible columns.');
for(const columns of ['data','consent_reference','created_by']){const {error}=await publicClient.from('zuri_website_content').select(columns).limit(0);if(!error){failed=true;console.error(`Privacy check failed: browser key can select private column ${columns}.`);}else if(error.code==='42501')console.log(`Privacy check: private column ${columns} denied.`);else{failed=true;console.error(`Privacy check inconclusive for ${columns} (${error.code||'connection_error'}).`);}}
for(const table of ['zuri_pamoja_accounts','zuri_pamoja_managers','zuri_pamoja_settings','zuri_pamoja_moments','zuri_pamoja_management_audit']){const {error}=await publicClient.from(table).select('*').limit(0);if(error?.code!=='42501'){failed=true;console.error(`${table}: private-table denial check failed or inconclusive.`);}else console.log(`${table}: browser access denied.`);}
const {data:momentProbe,error:momentError}=await publicClient.rpc('zuri_public_moments',{address:'__zuri_contract_probe__'});if(momentError||momentProbe?.enabled!==false||momentProbe?.items?.length!==0){failed=true;console.error('Public Moments contract check failed.');}else console.log('Public Moments contract: empty reserved probe succeeds.');
for(const name of ['zuri_pamoja_manage','zuri_pamoja_review']){const {error}=await publicClient.rpc(name,{actor:null,action:'list',content_id:null,payload:{}});if(error?.code!=='42501'){failed=true;console.error(`${name}: private-function denial check failed or inconclusive.`);}else console.log(`${name}: browser execution denied.`);}
const {error:contributorDenied}=await publicClient.rpc('zuri_pamoja_contribute',{actor:null,action:'list',payload:{page:1}});if(contributorDenied?.code!=='42501'){failed=true;console.error('Contribution function: browser execution denial failed or inconclusive.');}else console.log('Contribution function: browser execution denied.');
console.log('Read-only checks; no customer records returned or modified. Constraints, RLS, login/refresh and write persistence still need live staging verification.');
process.exitCode = failed ? 1 : 0;
