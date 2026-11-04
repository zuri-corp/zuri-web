import { mkdir, writeFile } from 'node:fs/promises';

const sites = [
 ['chatgpt','https://chatgpt.com/'],['claude','https://claude.com/'],['gemini','https://gemini.google/about/'],['perplexity','https://www.perplexity.ai/'],['zapier','https://zapier.com/'],
 ['xero','https://www.xero.com/'],['zoho-books','https://www.zoho.com/books/'],['freshbooks','https://www.freshbooks.com/'],['wave','https://www.waveapps.com/'],
 ['notion','https://www.notion.com/'],['workspace','https://workspace.google.com/'],['slack','https://slack.com/'],['trello','https://trello.com/'],['asana','https://asana.com/'],
 ['canva','https://www.canva.com/'],['figma','https://www.figma.com/'],['buffer','https://buffer.com/'],['brevo','https://www.brevo.com/'],
 ['bitwarden','https://bitwarden.com/'],['1password','https://1password.com/'],['cloudflare','https://www.cloudflare.com/'],['wordpress','https://wordpress.org/'],['shopify','https://www.shopify.com/'],
];
const out = 'public/brands/tools';
await mkdir(out,{recursive:true});
const records = [];
async function get(url) {
 const response = await fetch(url,{signal:AbortSignal.timeout(16000),headers:{'user-agent':'Mozilla/5.0 (compatible; ZURI asset preparation)'}});
 if(!response.ok)throw Error(`HTTP ${response.status}`);
 return response;
}
async function collect([id,site]) {
 const candidates=[];
 try {
  const page=await get(site); const html=await page.text();
  for(const tag of html.matchAll(/<link\b[^>]*>/gi)) {
   const attrs=Object.fromEntries([...tag[0].matchAll(/([\w-]+)\s*=\s*["']([^"']*)["']/g)].map(m=>[m[1].toLowerCase(),m[2]]));
   if(/(^|\s)(icon|apple-touch-icon|shortcut)(\s|$)/i.test(attrs.rel??'')&&attrs.href) {
    const url=new URL(attrs.href.replaceAll('&amp;','&'),page.url);
    if(url.protocol==='https:')candidates.push({url:url.href,score:attrs.rel.includes('apple')?3:attrs.type==='image/svg+xml'?2:1});
   }
  }
 }catch{}
 candidates.sort((a,b)=>b.score-a.score);
 candidates.push({url:new URL('/favicon.ico',site).href,score:0});
 for(const {url} of candidates) {
  try {
   const response=await get(url);const type=response.headers.get('content-type')??'';
   const bytes=Buffer.from(await response.arrayBuffer());
   if(bytes.length>2_000_000||bytes.length<30)continue;
   let ext=type.includes('svg')?'svg':type.includes('png')?'png':type.includes('webp')?'webp':type.includes('jpeg')?'jpg':type.includes('icon')?'ico':'';
   if(!ext){if(bytes[0]===0&&bytes[1]===0&&bytes[2]===1)ext='ico';else continue;}
   if(ext==='svg'&&(/<script|<foreignObject|\bon\w+\s*=|(?:href|xlink:href)\s*=\s*["'](?:https?:|javascript:)/i.test(bytes.toString())))continue;
   const file=`${id}.${ext}`;await writeFile(`${out}/${file}`,bytes);
   records.push({id,site,source:response.url,file:`/brands/tools/${file}`,kind:'official-site icon',reviewed:'2026-10-19'});
   console.log(`${id}: ${file}`);return;
  }catch{}
 }
 records.push({id,site,file:null,kind:'plain-text reference',reviewed:'2026-10-19'});console.log(`${id}: text only`);
}
for(let index=0;index<sites.length;index+=5)await Promise.all(sites.slice(index,index+5).map(collect));
records.push({id:'quickbooks',site:'https://quickbooks.intuit.com/global/accounting-software/',file:null,kind:'plain-text reference; Intuit requires a written logo licence',policy:'https://www.intuit.com/legal/trademark/'});
records.push({id:'adobe-express',site:'https://www.adobe.com/express/',file:null,kind:'plain-text reference; Adobe requires a logo licence',policy:'https://www.adobe.com/legal/permissions/trademarks.html'});
records.sort((a,b)=>a.id.localeCompare(b.id));
await writeFile(`${out}/manifest.json`,JSON.stringify(records,null,2)+'\n');
console.log(`Saved ${records.filter(r=>r.file).length} official-source icons; ${records.filter(r=>!r.file).length} text-only listings.`);
