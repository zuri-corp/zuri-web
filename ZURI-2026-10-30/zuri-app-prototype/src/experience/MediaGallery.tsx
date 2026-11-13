import {useState} from 'react';
import {ScopedMedia} from './ObjectLayout';
import {ActivityCard,type Activity} from './ObjectActivity';
import MediaViewer from './MediaViewer';
import {AppGlyph} from './AppGlyph';

export default function MediaGallery({posts}:{posts:Activity[]}){
 const [selection,setSelection]=useState('');
 const media=posts.filter(post=>post.media_id&&(!post.media_mime||/^(image|video)\//.test(post.media_mime)));
 const index=media.findIndex(post=>post.id===selection);
 return <><div className="ux-media-grid">{media.map(post=><button key={post.id} className="ux-media-tile" aria-label={'Open media: '+(post.title||post.body||'Shared moment')} onClick={()=>setSelection(post.id)}>
  <ScopedMedia id={post.id} mime={post.media_mime} preview alt=""/>
  {post.media_mime?.startsWith('video/')&&<span className="ux-video-mark"><AppGlyph name="next" size={17}/></span>}
 </button>)}</div>{index>=0&&<MediaViewer index={index} count={media.length} onChange={i=>setSelection(media[i].id)} onClose={()=>setSelection('')}><ActivityCard key={selection} post={media[index]}/></MediaViewer>}</>;
}
