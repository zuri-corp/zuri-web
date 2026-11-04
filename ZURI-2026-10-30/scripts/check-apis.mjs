import {fileURLToPath} from 'node:url';
import path from 'node:path';
const root=fileURLToPath(new URL('../',import.meta.url));
try{process.loadEnvFile(path.join(root,'zuri-web/.env.local'));}catch{}
const groups={
 'Supabase public connection':['NEXT_PUBLIC_SUPABASE_URL','NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY'],
 'Website admin / opportunity storage (server only)':['SUPABASE_URL','SUPABASE_SECRET_KEY'],
 'X discovery worker (server only)':['X_BEARER_TOKEN','ZURI_OPPORTUNITY_WORKER_SECRET'],
 'Google venue lookup (server only)':['GOOGLE_MAPS_SERVER_KEY','ZURI_MAPS_REQUEST_MICROS'],
 'OpenAI gateway (server only)':['OPENAI_API_KEY','ZURI_AI_INTENT_MODEL','ZURI_AI_INTENT_INPUT_MICROS_PER_MILLION','ZURI_AI_INTENT_OUTPUT_MICROS_PER_MILLION','ZURI_AI_CHAT_MODEL','ZURI_AI_CHAT_INPUT_MICROS_PER_MILLION','ZURI_AI_CHAT_OUTPUT_MICROS_PER_MILLION'],
};
for(const [name,keys]of Object.entries(groups))console.log(`${name}: ${keys.every(k=>!!process.env[k])?'settings present (not credential validation)':'incomplete'}`);
for(const key of ['ZURI_PUBLIC_EDGE_ENABLED','ZURI_AI_EDGE_ENABLED','ZURI_AI_ENABLED','ZURI_OPPORTUNITIES_ENABLED','ZURI_MAPS_PERMITTED'])console.log(`${key}: ${process.env[key]??'unset'}`);
console.log('Secrets are never printed. Quicket, payments and native push are not activated integrations.');
if(process.argv.includes('--live')){
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
 if(!url||!key)throw Error('Add the public Supabase settings first.');
 const target=new URL(url);if(target.protocol!=='https:'||!target.hostname.endsWith('.supabase.co'))throw Error('Live check expects an HTTPS Supabase project URL.');
 for(const [name,body]of [['health',null],['private account denial',{action:'account.get'}]]){
  const response=await fetch(`${target.origin}/functions/v1/zuri-api`,{method:body?'POST':'GET',headers:{apikey:key,...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(15000),redirect:'error'});
  console.log(`${name}: HTTP ${response.status}`);
  if(response.status!==(body?401:200))process.exitCode=1;
 }
 console.log('Read-only health and denied access only. No ingestion, sign-in emails, customer writes or AI calls.');
}
