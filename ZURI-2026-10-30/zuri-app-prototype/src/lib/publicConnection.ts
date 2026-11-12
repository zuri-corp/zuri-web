export type PublicConnection={url:string;publishableKey:string};
export function resolvePublicConnection(environment:Record<string,unknown>|undefined,fallback:PublicConnection):PublicConnection{
 const useEnvironment=!!environment?.VITE_SUPABASE_URL||!!environment?.VITE_SUPABASE_PUBLISHABLE_KEY;
 if(useEnvironment&&(!environment?.VITE_SUPABASE_URL||!environment?.VITE_SUPABASE_PUBLISHABLE_KEY))throw Error('Set both public Supabase connection values, or use the configured public project.');
 const url=String((useEnvironment?environment?.VITE_SUPABASE_URL:fallback.url)||'').trim().replace(/\/$/,'');
 const publishableKey=String((useEnvironment?environment?.VITE_SUPABASE_PUBLISHABLE_KEY:fallback.publishableKey)||'').trim();
 let target:URL;try{target=new URL(url);}catch{throw Error('Public Supabase connection is not configured.');}
 if(target.username||target.password||target.pathname!=='/'||target.search||target.hash||!(target.protocol==='https:'||target.protocol==='http:'&&['localhost','127.0.0.1'].includes(target.hostname)))throw Error('Use a public HTTPS Supabase project connection.');
 let publicKey=publishableKey.startsWith('sb_publishable_');
 if(publishableKey.startsWith('eyJ')){try{const segment=publishableKey.split('.')[1];publicKey=JSON.parse(atob(segment.replace(/-/g,'+').replace(/_/g,'/'))).role==='anon';}catch{publicKey=false;}}
 if(!publicKey)throw Error('Use a Supabase publishable key, never a server secret in the app.');
 return {url:target.origin,publishableKey};
}
