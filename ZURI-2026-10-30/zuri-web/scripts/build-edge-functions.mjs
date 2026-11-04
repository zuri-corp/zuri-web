import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';import path from 'node:path';import {createHash} from 'node:crypto';
import {rolldown} from '../../zuri-app-prototype/node_modules/rolldown/dist/index.mjs';
const root=fileURLToPath(new URL('../',import.meta.url)),generated=path.join(root,'supabase/generated'),output=path.join(root,'supabase/deploy');
await mkdir(generated,{recursive:true});await mkdir(output,{recursive:true});
const original=path.join(root,'src/lib/ai/gateway.ts');let source=await readFile(original,'utf8');
function replaceOnce(find,replacement){if(!source.includes(find))throw Error('Gateway adapter is stale: '+find.slice(0,70));source=source.replace(find,replacement);}
source=source.replace(/^import .*from '(?:next\/server|@\/lib\/supabase\/(?:server|admin)|@\/lib\/http\/origin)';\r?\n/gm,'');
source=source.replace(/^import \{edgeAI\} from '\.\/edge-proxy';\r?\n/m,'').replace(/^  if\(process\.env\.ZURI_AI_EDGE_ENABLED==='true'\)return edgeAI\([^\n]+\r?\n/gm,'');
const principalStart=source.indexOf('async function principal()'),statusStart=source.indexOf('export async function aiStatus');if(principalStart<0||statusStart<0)throw Error('Gateway authentication adapter changed.');source=source.slice(0,principalStart)+source.slice(statusStart);
replaceOnce("export async function aiStatus(mode:AIMode='intent')", "export async function aiStatus(mode:AIMode='intent',actor:string,client:any)");
replaceOnce('  await connection();','');replaceOnce('try{const actor=await principal();','try{');replaceOnce("createAdminClient().rpc('zuri_ai_status'","client.rpc('zuri_ai_status'");
replaceOnce('export async function aiRequest(request:Request, forcedMode?:AIMode)', 'export async function aiRequest(request:Request, forcedMode:AIMode|undefined,actor:string,client:any)');
source=source.replace(/^  if\(!sameOrigin\(request\)\).*\r?\n/m,'');
const actorStart=source.indexOf('  let actor:string|null;'),actorEnd=source.indexOf('  if(!actor)return',actorStart);if(actorStart<0||actorEnd<0)throw Error('Gateway principal boundary changed.');source=source.slice(0,actorStart)+source.slice(actorEnd);
replaceOnce('  const client=createAdminClient();','');
replaceOnce('!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || !process.env.SUPABASE_URL || !process.env.SUPABASE_SECRET_KEY','!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY || !process.env.SUPABASE_SERVICE_ROLE_KEY');
source=source.replace(/from '([^']+)'/g,(all,id)=>{if(!id.startsWith('.'))return all;return `from '${path.resolve(path.dirname(original),id).replaceAll('\\','/')}.ts'`;});
await writeFile(path.join(generated,'ai-gateway.ts'),'// GENERATED authentication adapter; canonical logic stays in src/lib/ai.\n'+source);
const inputs=new Map();
for(const name of ['zuri-api','zuri-media','zuri-ai']){
 const bundle=await rolldown({input:path.join(root,`supabase/functions/${name}/index.ts`),platform:'neutral',external:id=>id.startsWith('npm:')||id.startsWith('node:'),plugins:[{
  name:'zuri-portable-server',
  resolveId(id){if(id.startsWith('@/'))return path.join(root,'src',id.slice(2))+'.ts';},
  async transform(code,id){if(!id.startsWith(root))return;inputs.set(path.relative(root,id).replaceAll('\\','/'),createHash('sha256').update(code).digest('hex'));
   code=code.replace(/^import ['"]server-only['"];?\r?\n/gm,'');
   if(/\bprocess\.env\b/.test(code))code="import process from 'node:process';\n"+code;
   if(/\bBuffer\./.test(code))code="import {Buffer} from 'node:buffer';\n"+code;
   return {code};
  }
 }]});
 await bundle.write({file:path.join(output,`${name}.ts`),format:'esm',minify:false});await bundle.close();
}
await writeFile(path.join(output,'sources.json'),JSON.stringify({generatedBy:'scripts/build-edge-functions.mjs',files:Object.fromEntries(inputs)},null,2)+'\n');
console.log('Built three standalone Supabase functions from the canonical source. No secrets are bundled.');
