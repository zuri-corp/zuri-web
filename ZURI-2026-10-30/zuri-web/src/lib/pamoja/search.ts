import type {PublicProfile} from '@/lib/publishing/model';
const stopWords=new Set('a an the for find me near in around i need want looking someone who does can help with to and or my please of is are at'.split(' '));
const groups=[['software','developer','developers','development','coding','programming','website','websites','web'],['photography','photographer','photographers','photo','photos','portrait','portraits'],['design','designer','designers','branding','identity'],['marketing','advertising','promotion','social'],['ai','artificial','intelligence','automation','machine','learning'],['cafe','cafes','coffee','workspace','workspaces'],['rugby','athlete','sport','sports'],['venue','venues','wedding','weddings','events','event'],['business','businesses','company','companies','place','places'],['person','people','creator','creators']];
export function searchText(value:string){return value.normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim()}
function oneEdit(a:string,b:string){if(Math.abs(a.length-b.length)>1)return false;let i=0,j=0,edits=0;while(i<a.length&&j<b.length){if(a[i]===b[j]){i++;j++;continue}if(++edits>1)return false;if(a.length===b.length&&a[i]===b[j+1]&&a[i+1]===b[j]){i+=2;j+=2;continue}if(a.length>=b.length)i++;if(b.length>=a.length)j++}return edits+(i<a.length||j<b.length?1:0)<=1}
export function searchProfiles(profiles:PublicProfile[],query:string,kind='all',category='all'){
 const normalized=searchText(query);const tokens=[...new Set(normalized.split(' ').filter(t=>t&&!stopWords.has(t)))];
 const results=profiles.filter(p=>(kind==='all'||p.kind===kind)&&(category==='all'||p.category===category)).map((profile,index)=>{
  const biography=profile.sample?'':profile.about;
  const name=searchText(profile.name);const haystack=searchText([profile.name,profile.category,profile.location,profile.description,biography,...profile.offerings,profile.kind==='space'?'business place company':'person creator',profile.website??'',...(profile.social_links??[]).map(l=>l.title)].join(' '));const words=haystack.split(' ');
  const match=tokens.every(t=>{const alternatives=groups.find(g=>g.includes(t))??[t];return alternatives.some(term=>haystack.includes(term))||(t.length>=5&&words.some(w=>w.length>=5&&oneEdit(t,w)))});
  return {profile,index,match,score:normalized&&name===normalized?100:normalized&&name.includes(normalized)?50:tokens.filter(t=>name.includes(t)).length*5};
 });return results.filter(r=>r.match).sort((a,b)=>b.score-a.score||a.index-b.index).map(r=>r.profile)
}
