import {useState} from 'react';
import {cloudRequest,uploadCloud,type CloudAccountState} from './cloudClient';
import {AttachmentPreview,CropPhotoInput} from './SpaceUI';
import {AppGlyph} from './AppGlyph';

const interests=['Technology','Sport','Music','Food','Business','Art','Learning','Travel','Community','Wellness'];
const goals=['Meet people','Find things to do','Grow my business','Learn something','Organise my life','Share my work'];
type Profile=NonNullable<CloudAccountState['profile']>;
export default function ProfileWelcome({account,onDone}:{account:CloudAccountState;onDone:(profile?:Profile)=>void}){
 const [step,setStep]=useState(0),[name,setName]=useState(account.profile?.display_name==='ZURI member'?'':account.profile?.display_name||''),[bio,setBio]=useState(account.profile?.bio||'');
 const [file,setFile]=useState<File|null>(null),[selected,setSelected]=useState<string[]>([]),[selectedGoals,setSelectedGoals]=useState<string[]>([]),[location,setLocation]=useState(account.profile?.location||'');
 const [visible,setVisible]=useState(account.profile?.is_public??false),[busy,setBusy]=useState(false),[error,setError]=useState('');
 async function finish(){
  if(busy)return;
  setBusy(true);setError('');
  try{
   const avatar=file?(await uploadCloud(file)).id:account.profile?.avatar_media_id??null;
   const profile=await cloudRequest<Profile>('profile.save',{handle:null,links:[],...account.profile,location:location.trim(),display_name:name.trim(),bio:bio.trim(),avatar_media_id:avatar,is_public:visible,receive_invites:visible&&account.profile?.receive_invites===true});
   try{localStorage.setItem('zuri-interests:'+account.user_id,JSON.stringify(selected));localStorage.setItem('zuri-goals:'+account.user_id,JSON.stringify(selectedGoals));}catch{}
   onDone(profile);
  }catch(e){setError(e instanceof Error?e.message:'Your profile could not be saved.');}
  finally{setBusy(false);}
 }
 return <section className="cw-card zs-welcome" aria-labelledby="welcome-title">
  <AppGlyph name="lounge" size={32}/><small>Step {step+1} of 2</small>
  <h2 id="welcome-title">{step===0?'Welcome to ZURI':'What are you into?'}</h2>
  {step===0&&<><p>Start in the Lounge. Explore places and communities in Aura, make plans in Motion, share in Rizz, and keep your Moments in Lore.</p><p>Verified new members get a small Viola allowance to try it. Ask for help finding something to do or turning an idea into a plan.</p></>}
  <form onSubmit={e=>{e.preventDefault();if(step===0&&name.trim())setStep(1);else if(step===1)void finish();}}>
   {step===0?<><label>Your name<input autoComplete="name" required maxLength={80} value={name} onChange={e=>setName(e.target.value)}/></label>
    <label>A little about you <span>· optional</span><textarea rows={1} maxLength={600} value={bio} onChange={e=>setBio(e.target.value)}/></label><label>City or area · optional<input autoComplete="address-level2" maxLength={100} value={location} onChange={e=>setLocation(e.target.value)}/></label>
    <CropPhotoInput label="Profile photo · optional" onChange={setFile}/>{file&&<AttachmentPreview file={file} onRemove={()=>setFile(null)}/>}
   </>:<><p>Choose what matters to you, or skip this step. Interests and goals stay on this device.</p><div className="zs-interest-pills">{interests.map(interest=><button type="button" key={interest} aria-pressed={selected.includes(interest)} onClick={()=>setSelected(previous=>previous.includes(interest)?previous.filter(item=>item!==interest):[...previous,interest])}>{interest}</button>)}</div><h3>What would you like to do?</h3><div className="zs-interest-pills">{goals.map(goal=><button type="button" key={goal} aria-pressed={selectedGoals.includes(goal)} onClick={()=>setSelectedGoals(previous=>previous.includes(goal)?previous.filter(item=>item!==goal):[...previous,goal])}>{goal}</button>)}</div>
    <label className="cw-check"><input type="checkbox" checked={visible} onChange={e=>setVisible(e.target.checked)}/>Let people find my profile in Lore</label><small>If public, your name, bio and location may appear in discovery.</small>
   </>}
   {error&&<p role="alert">{error}</p>}
   <div className="zs-welcome-actions">
    <button className="cw-primary" disabled={busy||!name.trim()}>{step===0?'Continue':busy?'Saving…':'Finish setup'}</button>
    {step===1&&<button type="button" className="zs-text-button" disabled={busy} onClick={()=>setStep(0)}>Back</button>}
    <button type="button" className="zs-text-button" disabled={busy} onClick={()=>onDone()}>Set up later</button>
   </div>
  </form>
 </section>;
}
