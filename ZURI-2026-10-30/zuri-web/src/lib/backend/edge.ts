/** Portable HTTP boundary shared by Supabase functions and local tests. */
export type Env=(name:string)=>string|undefined;
export function corsHeaders(request:Request,env:Env){
 const origin=request.headers.get('origin');
 const allowed=(env('ZURI_ALLOWED_ORIGINS')??'http://localhost:3015,http://127.0.0.1:3015,http://localhost:8443,http://127.0.0.1:8443').split(',').map(s=>s.trim()).filter(Boolean);
 if(origin&&!allowed.includes(origin))throw Error('origin');
 return {'Access-Control-Allow-Origin':origin??allowed[0]??'null','Access-Control-Allow-Headers':'authorization,apikey,content-type,x-client-info','Access-Control-Allow-Methods':'GET,POST,OPTIONS','Access-Control-Max-Age':'600','Vary':'Origin','Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'};
}
export async function edgeBytes(request:Request,limit:number){
 if(Number(request.headers.get('content-length'))>limit)throw Error('size');
 const reader=request.body?.getReader();if(!reader)return new Uint8Array();let length=0;const chunks:Uint8Array[]=[];
 try{while(true){const {done,value}=await reader.read();if(done)break;length+=value.length;if(length>limit){await reader.cancel();throw Error('size');}chunks.push(value);}}finally{reader.releaseLock();}
 const bytes=new Uint8Array(length);let at=0;for(const chunk of chunks){bytes.set(chunk,at);at+=chunk.length;}return bytes;
}
export async function edgeJson(request:Request,limit=64000){
 if(request.headers.get('content-type')?.split(';')[0].trim().toLowerCase()!=='application/json')throw Error('content');
 const value=JSON.parse(new TextDecoder().decode(await edgeBytes(request,limit)));
 if(!value||typeof value!=='object'||Array.isArray(value))throw Error('json');return value as Record<string,unknown>;
}
export function mediaMime(bytes:Uint8Array){
 const starts=(v:number[])=>v.every((b,i)=>bytes[i]===b),text=(a:number,b:number)=>new TextDecoder().decode(bytes.slice(a,b));
 if(starts([255,216,255]))return 'image/jpeg';if(starts([137,80,78,71,13,10,26,10]))return 'image/png';
 if(text(0,4)==='RIFF'&&text(8,12)==='WEBP')return 'image/webp';
 if(text(0,5)==='%PDF-')return 'application/pdf';if(text(4,8)==='ftyp'&&['isom','iso2','mp41','mp42','avc1'].includes(text(8,12)))return 'video/mp4';return null;
}
export function databaseStatus(code?:string){return ({'42501':403,'22023':400,'23505':409,'23514':400,'23502':400,'22P02':400,'40001':409,'P0001':429} as Record<string,number>)[code??'']??503;}
