import {useState} from 'react';
import {cloudRequest,uploadCloud,type CloudAccountState} from './cloudClient';
import {AttachmentPreview,CropPhotoInput} from './SpaceUI';
import {AppGlyph} from './AppGlyph';

const interests=['Technology','Sport','Music','Food','Business','Art','Learning','Travel','Community','Wellness'];
type Profile=NonNullable<CloudAccountState['profile']>;
export default function ProfileWelcome({account,onDone}:{account:CloudAccountState;onDone:(profile?:Profile)=>void}){
 const [step,setStep]=useState(0),[name,setName]=useState(account.profile?.display_name||''),[bio,setBio]=useState(account.profile?.bio||'');
 const [file,setFile]=useState<File|null>(null),[selected,setSelected]=useState<string[]>([]);
 const [visible,setVisible]=useState(account.profile?.is_public??false),[busy,setBusy]=useState(false),[error,setError]=useState('');
 async function finish(){
  if(busy)return;
  setBusy(true);setError('');
  try{
   const avatar=file?(await uploadCloud(file)).id:account.profile?.avatar_media_id??null;
   const profile=await cloudRequest<Profile>('profile.save',{handle:null,location:'',links:[],...account.profile,display_name:name.trim(),bio:bio.trim(),avatar_media_id:avatar,is_public:visible,receive_invites:visible&&account.profile?.receive_invites===true});
   try{localStorage.setItem('zuri-interests:'+account.user_id,JSON.stringify(selected));}catch{}
   onDone(profile);
  }catch(e){setError(e instanceof Error?e.message:'Your profile could not be saved.');}
  finally{setBusy(false);}
 }
 return <section className="cw-card zs-welcome" aria-labelledby="welcome-title">
  <AppGlyph name="lounge" size={32}/><small>Step {step+1} of 2</small>
  <h2 id="welcome-title">{step===0?'Make ZURI yours':'What are you into?'}</h2>
  <form onSubmit={e=>{e.preventDefault();if(step===0&&name.trim())setStep(1);else if(step===1)void finish();}}>
   {step===0?<><label>Your name<input autoComplete="name" required maxLength={80} value={name} onChange={e=>setName(e.target.value)}/></label>
    <label>A little about you<textarea maxLength={600} value={bio} onChange={e=>setBio(e.target.value)}/></label>
    <CropPhotoInput label="Profile photo · optional" onChange={setFile}/>{file&&<AttachmentPreview file={file} onRemove={()=>setFile(null)}/>}
   </>:<><p>Pick a few interests to keep on this device, or skip them.</p><div className="zs-interest-pills">{interests.map(interest=><button type="button" key={interest} aria-pressed={selected.includes(interest)} onClick={()=>setSelected(previous=>previous.includes(interest)?previous.filter(item=>item!==interest):[...previous,interest])}>{interest}</button>)}</div>
    <label className="cw-check"><input type="checkbox" checked={visible} onChange={e=>setVisible(e.target.checked)}/>Let people find my profile in Lore</label>
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
