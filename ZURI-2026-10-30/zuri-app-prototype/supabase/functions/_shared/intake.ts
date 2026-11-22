import {createClient,env,reply} from './auth.ts';
import {edgeBytes,databaseStatus} from '../../../src/lib/backend/edge.ts';
import {validateEnquiry} from '../../../src/lib/enquiries/validation.ts';
import {validatePresenceIntake,intakeMessage,photoType} from '../../../src/lib/pamoja/intake.ts';
export async function publicIntake(request:Request,headers:Record<string,string>,raw?:unknown){
 const admin=createClient(env('SUPABASE_URL')!,env('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false,autoRefreshToken:false}});
 let enquiry:Record<string,unknown>;let photos:{bytes:Uint8Array;extension:string;type:string}[]=[];let profile:ReturnType<typeof validatePresenceIntake>|undefined;
 try{
  if(raw){enquiry={...validateEnquiry(raw),source:(raw as {enquiryType?:string}).enquiryType==='tech'?'zuri-tech':'zuri-invites',status:'new'};}
  else{
   const bytes=await edgeBytes(request,7*1024*1024),form=await new Response(bytes as BodyInit,{headers:{'Content-Type':request.headers.get('content-type')!}}).formData();
   profile=validatePresenceIntake(JSON.parse(String(form.get('profile')??'')));
   const files=form.getAll('photos').filter((f):f is File=>f instanceof File&&f.size>0);if(files.length>3)throw Error('Choose up to three photographs.');
   for(const f of files){if(f.size>2097152)throw Error('Each photograph must be 2 MB or smaller.');const bytes=new Uint8Array(await f.arrayBuffer()),type=photoType(bytes);if(!type)throw Error('Use JPEG, PNG or WebP photographs.');photos.push({bytes,...type});}
   enquiry={name:profile.name,email:profile.email,phone:'',wedding_date:null,location:null,guest_count:null,package_interest:null,source:'zuri-tech',status:'new'};
  }
 }catch{return reply({error:'Check the enquiry, consent and photograph sizes.'},400,headers);}
 const remote=request.headers.get('x-forwarded-for')?.split(',').at(-1)?.trim()??'shared-unknown';
 const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(env('SUPABASE_SERVICE_ROLE_KEY')!),{name:'HMAC',hash:'SHA-256'},false,['sign']);
 const digest=[...new Uint8Array(await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(remote)))].map(v=>v.toString(16).padStart(2,'0')).join('');
 const {data:id,error:reserveError}=await admin.rpc('zuri_intake_reserve',{key_digest:digest,photo_bytes:photos.reduce((n,p)=>n+p.bytes.length,0)});
 if(reserveError)return reply({error:'Enquiry capacity is temporarily unavailable. Your form was not confirmed.',code:reserveError.code},databaseStatus(reserveError.code),headers);
 const paths:string[]=[];
 if(photos.length){const {data:bucket,error}=await admin.storage.getBucket('pamoja-intake');if(error||bucket?.public!==false)return reply({error:'Private photo staging is unavailable.'},503,headers);}
 for(const [i,photo]of photos.entries()){
  const path=`${id}/${i+1}.${photo.extension}`;const {error}=await admin.storage.from('pamoja-intake').upload(path,photo.bytes,{contentType:photo.type,upsert:false});if(error)return reply({error:'Photo delivery was not confirmed. Its reservation is held for review.'},503,headers);paths.push(path);
 }
 if(profile)enquiry.message=intakeMessage(profile,paths,new Date().toISOString());
 const {error}=await admin.from('enquiries').insert(enquiry);
 return reply(error?{error:'Delivery was not confirmed. Please keep your details.'}:{success:true},error?503:201,headers);
}
