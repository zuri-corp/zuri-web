import {useState} from 'react';
import {ScopedMedia} from './ObjectLayout';
import {ActivityCard,type Activity} from './ObjectActivity';
import {Modal} from './UsabilityUI';
export default function MediaGallery({posts}:{posts:Activity[]}){const [selected,setSelected]=useState<Activity|null>(null);return <><div className="ux-media-grid">{posts.filter(post=>post.media_id&&(!post.media_mime||post.media_mime.startsWith('image/')||post.media_mime.startsWith('video/'))).map(post=><button key={post.id} className="ux-media-tile" aria-label={'Open media: '+(post.title||post.body||'Shared moment')} onClick={()=>setSelected(post)}><ScopedMedia id={post.id} mime={post.media_mime} preview alt=""/>{post.media_mime?.startsWith('video/')&&<span className="ux-video-mark">▷</span>}</button>)}</div>{selected&&<Modal label="Shared media" onClose={()=>setSelected(null)}><ActivityCard post={selected}/></Modal>}</>;}
