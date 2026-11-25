import {useEffect,useRef,useState} from 'react';
import {cloudRequest,type CloudEntity,type CloudRecord} from './cloudClient';
import {ContextPicker,WorldLoader} from './UsabilityUI';
import {ObjectComposer} from './ObjectActivity';
import {AppGlyph} from './AppGlyph';

function StudioCamera({onPhoto,onText,onDrafts,onShare}:{onPhoto:(file:File)=>void;onText:()=>void;onDrafts:()=>void;onShare?:()=>void}){
 const [started,setStarted]=useState(false),[facing,setFacing]=useState<'user'|'environment'>('environment'),[error,setError]=useState(''),[mode,setMode]=useState<'photo'|'video'>('photo'),[recording,setRecording]=useState(false);
 const video=useRef<HTMLVideoElement>(null),picker=useRef<HTMLInputElement>(null),nativeVideo=useRef<HTMLInputElement>(null),stream=useRef<MediaStream|null>(null),recorder=useRef<MediaRecorder|null>(null),alive=useRef(true),cameraRequest=useRef(0),timer=useRef<ReturnType<typeof setTimeout>|null>(null);
 useEffect(()=>{alive.current=true;return()=>{alive.current=false;cameraRequest.current++;if(timer.current)clearTimeout(timer.current);if(recorder.current?.state==='recording')recorder.current.stop();stream.current?.getTracks().forEach(track=>track.stop());};},[]);
 async function start(nextFacing=facing,withAudio=false){const request=++cameraRequest.current;try{stream.current?.getTracks().forEach(track=>track.stop());const media=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:nextFacing},width:{ideal:3840},height:{ideal:2160},frameRate:{ideal:30}},audio:withAudio});if(!alive.current||request!==cameraRequest.current){media.getTracks().forEach(track=>track.stop());return null;}stream.current=media;if(video.current){video.current.srcObject=media;await video.current.play();}if(!alive.current||request!==cameraRequest.current){media.getTracks().forEach(track=>track.stop());return null;}setStarted(true);setError('');return media;}catch{if(alive.current&&request===cameraRequest.current){setStarted(false);setError(withAudio?'Camera or microphone unavailable. You can select an MP4 from your device.':'Camera is unavailable. You can still choose media from your device.');}return null;}}
 function flip(){const next=facing==='environment'?'user':'environment';setFacing(next);void start(next);}
 function shutter(){const player=video.current;if(!player||!player.videoWidth||!player.videoHeight){setError('The camera is still starting. Try again in a moment.');return;}const canvas=document.createElement('canvas');canvas.width=player.videoWidth;canvas.height=player.videoHeight;const context=canvas.getContext('2d');if(!context){setError('The photo could not be captured. Try choosing one from your device.');return;}context.drawImage(player,0,0,canvas.width,canvas.height);canvas.toBlob(blob=>{if(blob&&alive.current)onPhoto(new File([blob],'zuri-'+Date.now()+'.jpg',{type:'image/jpeg'}));else if(alive.current)setError('The photo could not be captured. Please try again.');},'image/jpeg',.95);}
 async function record(){if(recording){recorder.current?.stop();return;}if(typeof MediaRecorder==='undefined'||!MediaRecorder.isTypeSupported('video/mp4')){setError('Opening your device camera for MP4 recording.');nativeVideo.current?.click();return;}const media=await start(facing,true);if(!media)return;try{const parts:Blob[]=[];let total=0;const next=new MediaRecorder(media,{mimeType:'video/mp4',videoBitsPerSecond:2500000});recorder.current=next;next.ondataavailable=e=>{if(e.data.size){parts.push(e.data);total+=e.data.size;}if(total>9*1024*1024&&next.state==='recording')next.stop();};next.onstop=()=>{if(timer.current)clearTimeout(timer.current);setRecording(false);media.getTracks().forEach(track=>track.stop());if(alive.current&&parts.length){const blob=new Blob(parts,{type:'video/mp4'});if(blob.size>10*1024*1024){setError('This recording is over 10 MB. Try a shorter clip.');void start();return;}onPhoto(new File([blob],'zuri-'+Date.now()+'.mp4',{type:'video/mp4'}));}};next.start(500);setRecording(true);timer.current=setTimeout(()=>{if(next.state==='recording')next.stop();},25000);}catch{setError('Recording could not start. Choose an MP4 from your device.');void start();}}
 useEffect(()=>{void start();},[]);
 return <section className="oc-camera"><video ref={video} className={started?'is-live':''} playsInline muted aria-label="Camera preview"/><header><button type="button" className="oc-moments-launch" aria-label="Choose a moment or device media" disabled={recording} onClick={()=>picker.current?.click()}><AppGlyph name="Moments" size={19}/><span>Moments</span></button><button type="button" className="oc-camera-drafts" onClick={onDrafts} disabled={recording}>Drafts</button>{onShare&&<button type="button" className="oc-camera-drafts" onClick={onShare} disabled={recording}>Share</button>}<button type="button" aria-label={facing==='environment'?'Use selfie camera':'Use rear camera'} onClick={flip} disabled={!started||recording}><AppGlyph name="refresh" size={21}/></button></header><input ref={nativeVideo} type="file" accept="video/mp4" capture={facing} hidden onChange={event=>{const file=event.currentTarget.files?.[0];if(file?.type==='video/mp4'&&file.size<=10*1024*1024)onPhoto(file);else if(file)setError('Choose an MP4 video under 10 MB.');event.currentTarget.value='';}}/><input ref={picker} type="file" accept="image/*,video/mp4" hidden onChange={event=>{const file=event.currentTarget.files?.[0];if(file)onPhoto(file);event.currentTarget.value='';}}/>{!started&&<div className="oc-camera-empty"><button className="zs-primary" onClick={()=>void start()}>Enable camera</button></div>}{error&&<p role="alert">{error}</p>}<div className="oc-camera-controls"><div className="oc-camera-modes"><button type="button" disabled={recording} onClick={onText}>Text</button><button type="button" disabled={recording} aria-pressed={mode==='photo'} onClick={()=>setMode('photo')}>Photo</button><button type="button" disabled={recording} aria-pressed={mode==='video'} onClick={()=>setMode('video')}>Video</button></div><button type="button" className={'oc-shutter'+(recording?' is-recording':'')} aria-label={mode==='photo'?'Take photo':recording?'Stop recording':'Start recording'} disabled={!started} onClick={()=>mode==='photo'?shutter():void record()}><span/></button><button type="button" className="oc-gallery-button" aria-label="Choose media" disabled={recording} onClick={()=>picker.current?.click()}><AppGlyph name="Moments" size={21}/></button></div></section>;
}
export default function CloudCreate({userId,drafts,onOpen}:{userId:string;drafts:CloudRecord[];onOpen:(kind:string,id:string)=>void}){
 const [entities,setEntities]=useState<CloudEntity[]>([]),[chapters,setChapters]=useState<CloudRecord[]>([]),[id,setId]=useState(''),[draft,setDraft]=useState<CloudRecord|null>(null),[shared,setShared]=useState(''),[showShare,setShowShare]=useState(false),[error,setError]=useState(''),[loading,setLoading]=useState(true),[surface,setSurface]=useState<'camera'|'compose'|'drafts'>('camera'),[studioFile,setStudioFile]=useState<File|null>(null),[contexts,setContexts]=useState<string[]>([]),[chapterIds,setChapterIds]=useState<string[]>([]);
 useEffect(()=>{let active=true;Promise.all([cloudRequest<CloudEntity[]>('entities.contexts'),cloudRequest<CloudRecord[]>('records.list',{kind:'chapter'})]).then(([rows,saved])=>{if(active){setEntities(rows.filter(e=>e.status==='published'&&!e.invitation_pending&&(e.kind!=='channel'||e.owner_id===userId)));setChapters(saved);}}).catch(e=>{if(active)setError(e.message);}).finally(()=>{if(active)setLoading(false);});return()=>{active=false;};},[userId]);
 const privateOnly=id.startsWith('chapter:'),destination=entities.find(e=>e.id===id),primaryChapter=privateOnly?id.slice(8):'',allowed=entities.filter(e=>e.id!==id&&(destination?.visibility!=='private'||e.visibility==='private'));
 const shareDraft=async(network:'tiktok'|'snapchat'|'youtube')=>{try{await navigator.clipboard.writeText(shared);window.open(network==='youtube'?'https://www.youtube.com/upload':network==='tiktok'?'https://www.tiktok.com/upload':'https://www.snapchat.com/','_blank','noopener,noreferrer');}catch{setError('Could not copy the caption. Please copy it before opening the app.');}};
 const destinations=[...entities.map(e=>({id:e.id,kind:e.kind,title:e.title,visibility:e.visibility})),...chapters.map(ch=>({id:'chapter:'+ch.id,kind:'chapter',title:String(ch.content.title||'Chapter'),visibility:'private'}))];
 return <section className="oc-create">
  {surface==='camera'?<><StudioCamera onDrafts={()=>setSurface('drafts')} onShare={shared?()=>setShowShare(true):undefined} onText={()=>{setStudioFile(null);setDraft(null);setSurface('compose');}} onPhoto={file=>{setDraft(null);setStudioFile(file);setSurface('compose');}}/>{showShare&&<section className="oc-draft-export oc-share-overlay"><button type="button" className="zs-text-button" onClick={()=>setShowShare(false)}>Close</button><strong>Share your caption</strong><p>Open another app to finish sharing.</p><div><a href={'https://wa.me/?text='+encodeURIComponent(shared)} target="_blank" rel="noreferrer">WhatsApp</a><a href={'https://twitter.com/intent/tweet?text='+encodeURIComponent(shared)} target="_blank" rel="noreferrer">X</a><button type="button" onClick={()=>void shareDraft('tiktok')}>TikTok</button><button type="button" onClick={()=>void shareDraft('snapchat')}>Snapchat</button><button type="button" onClick={()=>void shareDraft('youtube')}>YouTube</button></div></section>}</>:surface==='drafts'?<section className="oc-studio-drafts"><button type="button" className="zs-text-button" onClick={()=>setSurface('camera')}><AppGlyph name="back" size={18}/> Camera</button><h2>Drafts</h2>{drafts.length?drafts.map(row=><div className="oc-draft" key={row.id}><strong>{String(row.content.title||'Draft')}</strong><p>{String(row.content.text||'')}</p><button type="button" className="zs-text-button" onClick={()=>{setDraft(row);setSurface('compose');}}>Open draft</button></div>):<p>No saved drafts yet.</p>}</section>:<>
   <header className="oc-post-head"><button type="button" className="zs-text-button" aria-label="Back to camera" onClick={()=>setSurface('camera')}><AppGlyph name="back" size={18}/></button><strong>New post</strong><button type="submit" form="studio-post-form" className="zs-primary">{privateOnly?'Save':'Share'}</button></header>
   <ObjectComposer studio key={draft?.id||'new'} entityId={id} canPublish={!!id} onNeedsDestination={()=>setError('Choose where to share your post.')} privateOnly={privateOnly} prefillFile={studioFile} contexts={privateOnly?[]:contexts} chapters={[...new Set([...(primaryChapter?[primaryChapter]:[]),...chapterIds])]} initialText={String(draft?.content.text||'')} initialMediaId={String(draft?.content.mediaId||'')} onSaved={saved=>{setShared(saved?.body||'');setStudioFile(null);setDraft(null);setId('');setContexts([]);setChapterIds([]);setSurface('camera');}}/>
   {(
    <>
     <ContextPicker
      multiple={false}
      label="Share with"
      options={destinations}
      value={id ? [id] : []}
      onChange={values=>{
       setId(values[0] || '');
       setError('');
       setContexts([]);
       setChapterIds([]);
      }}
     />
     {id ? (
      <ContextPicker
       label="Add context · optional"
       options={[
        ...(!privateOnly ? allowed.map(entity=>({id:entity.id,kind:entity.kind,title:entity.title,visibility:entity.visibility})) : []),
        ...chapters
         .filter(chapter=>chapter.id!==primaryChapter)
         .map(chapter=>({id:'chapter:'+chapter.id,kind:'chapter',title:String(chapter.content.title||'Chapter'),visibility:'private'})),
       ]}
       value={[...contexts,...chapterIds.map(chapterId=>'chapter:'+chapterId)]}
       onChange={values=>{
        setContexts(values.filter(value=>!value.startsWith('chapter:')));
        setChapterIds(values.filter(value=>value.startsWith('chapter:')).map(value=>value.slice(8)));
       }}
      />
     ) : null}
    </>
   )}
  </>}
  {surface!=='camera'&&!loading&&!entities.length&&<button className="zs-primary" onClick={()=>onOpen('new-channel','new')}>Create a Channel</button>}{surface!=='camera'&&loading&&<WorldLoader world="rizz" label="Opening your studio…"/>}{error&&<p role="alert">{error}</p>}
 </section>;
}
