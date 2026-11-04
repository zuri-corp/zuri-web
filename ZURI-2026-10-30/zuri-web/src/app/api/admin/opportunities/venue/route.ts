import {getAuthorizedAdmin} from '@/lib/supabase/authorizeAdmin';
import {opportunitiesConfigured,opportunityJson} from '@/lib/opportunities/server';
import {studioBody} from '@/lib/studio/server';
import {reservePaidCall} from '@/lib/opportunities/metered';
import {geocodeVenue} from '@/lib/opportunities/connectors';
export async function POST(request:Request){try{
 if(!opportunitiesConfigured()||process.env.ZURI_MAPS_PERMITTED!=='true'||!process.env.GOOGLE_MAPS_SERVER_KEY)return opportunityJson({error:'Venue lookup awaits configured credentials and licensing review.'},503);
 const access=await getAuthorizedAdmin();if('error'in access)return opportunityJson({error:access.error},access.status);
 const b=await studioBody(request) as {address?:string};if(typeof b.address!=='string'||b.address.length>240||!b.address.trim())return opportunityJson({error:'Enter a venue address.'},400);
 const meter=await reservePaidCall('maps',Number(process.env.ZURI_MAPS_REQUEST_MICROS));if(!meter)return opportunityJson({error:'Venue request budget is unavailable.'},429);
 try{const venue=await geocodeVenue(b.address,process.env.GOOGLE_MAPS_SERVER_KEY);await meter.finish(true);return opportunityJson({venue,notice:'Place ID only. Confirm against source evidence before linking. Google Maps attribution required.'});}catch{await meter.finish(false);return opportunityJson({error:'Venue lookup failed; cost reservation retained.'},503);}
 }catch{return opportunityJson({error:'Venue lookup unavailable.'},503);}}
