const cors={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type, x-supabase-api-version','Access-Control-Allow-Methods':'POST, OPTIONS'};
const categories:Record<string,string>={all:'catering,accommodation,commercial,healthcare,service,sport,entertainment,education,tourism',restaurants:'catering.restaurant',cafes:'catering.cafe',hotels:'accommodation',shops:'commercial',hospitals:'healthcare',banks:'service.financial',sports:'sport'};
const cache=new Map<string,{until:number;data:unknown}>(),limits=new Map<string,{until:number;count:number}>();
export async function handler(req:Request){
 const json=(data:unknown,status=200)=>Response.json(data,{status,headers:{...cors,'Cache-Control':'no-store'}});
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers:cors});if(req.method!=='POST')return json({error:'Use POST.'},405);
 try{
  const raw=await req.text();if(raw.length>2500)return json({error:'Search is too long.'},413);const body=JSON.parse(raw);
  const latitude=Number(body.latitude??.3476),longitude=Number(body.longitude??32.5825),category=String(body.category||'all'),mode=body.mode==='autocomplete'?'autocomplete':'places',query=String(body.query||'').trim().slice(0,120),offset=Number(body.offset||0),radius=Number(body.radius||15000);
  if(!Number.isFinite(latitude)||Math.abs(latitude)>90||!Number.isFinite(longitude)||Math.abs(longitude)>180||!Object.hasOwn(categories,category)||!Number.isInteger(offset)||offset<0||offset>2000||![5000,15000,30000,50000].includes(radius))return json({error:'Check the location, category or page.'},400);
  if(mode==='autocomplete'&&query.length<3)return json({suggestions:[]});
  const key=JSON.stringify([mode,category,query.toLowerCase(),latitude,longitude,radius,offset]),cached=cache.get(key);if(cached&&cached.until>Date.now())return json(cached.data);
  const caller=req.headers.get('x-forwarded-for')?.split(',')[0]||'anonymous',rate=limits.get(caller);if(rate&&rate.until>Date.now()){if(++rate.count>60)return json({error:'Search is busy. Try again shortly.'},429);}else limits.set(caller,{count:1,until:Date.now()+60000});
  if(limits.size>2000)for(const [k,v] of limits)if(v.until<Date.now())limits.delete(k);
  const apiKey=Deno.env.get('GEOAPIFY_API_KEY');if(!apiKey)return json({error:'Place search is unavailable.'},503);
  const params=new URLSearchParams({apiKey,bias:`proximity:${longitude},${latitude}`,lang:'en'});
  let endpoint='https://api.geoapify.com/v2/places';
  if(mode==='autocomplete'){endpoint='https://api.geoapify.com/v1/geocode/autocomplete';params.set('text',query);params.set('limit','6');}
  else{params.set('categories',categories[category]);params.set('filter',`circle:${longitude},${latitude},${radius}`);params.set('limit','100');params.set('offset',String(offset));if(query)params.set('name',query);}
  const response=await fetch(endpoint+'?'+params,{signal:AbortSignal.timeout(12000),redirect:'error'});if(!response.ok)return json({error:'Place search is temporarily unavailable.'},response.status===429?429:502);
  const source=await response.json(),features=Array.isArray(source.features)?source.features:[];
  const rows=features.flatMap((feature:any)=>{const p=feature.properties||{},id=p.place_id,name=mode==='autocomplete'?(p.name||p.city||p.town||p.village||p.address_line1):p.name;if(typeof id!=='string'||typeof name!=='string'||!Number.isFinite(p.lat)||!Number.isFinite(p.lon))return [];return [{id,name,address:String(p.formatted||''),category,latitude:p.lat,longitude:p.lon,source:'geoapify',claimed:false}];});
  const data=mode==='autocomplete'?{suggestions:rows}:{businesses:rows,count:rows.length,next_offset:features.length===100?offset+100:null,source:'geoapify'};
  if(cache.size>300)cache.delete(cache.keys().next().value!);cache.set(key,{until:Date.now()+300000,data});return json(data);
 }catch{return json({error:'Place search could not be completed.'},502);}
}
Deno.serve(handler);
