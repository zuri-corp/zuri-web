import {createServerSupabaseClient} from '@/lib/supabase/server';
export async function GET(request:Request){
 const query=new URL(request.url).searchParams.get('q')?.trim()??'';if(query.length<2||query.length>100)return Response.json({error:'Search with 2–100 characters.'},{status:400});
 try{const client=await createServerSupabaseClient(),{data,error}=await client.rpc('zuri_discover',{query});return Response.json(error?{error:'Discovery is unavailable.'}:{data},{status:error?503:200,headers:{'Cache-Control':'private, no-store'}});}catch{return Response.json({error:'Discovery is not connected.'},{status:503});}
}
