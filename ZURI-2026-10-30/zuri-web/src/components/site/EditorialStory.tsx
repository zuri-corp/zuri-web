import Link from 'next/link';
import type { PublicStory } from '@/lib/publishing/model';
export default function EditorialStory({story,treatment}:{story:PublicStory;treatment:'lead'|'portrait'|'wide'|'compact'}) {
 return <article id={`story-${story.slug}`} className={`editorial-story editorial-${treatment}${story.image?.startsWith('/brands/select-')?' editorial-artwork':''}`}>
 {story.image&&<Link href={`/select/${story.slug}`} className="editorial-media" aria-label={`Read ${story.title}`} style={{backgroundImage:`url(${JSON.stringify(story.image)})`}}><span className="media-open" aria-hidden="true">↗</span>{story.sample&&<span className="editorial-preview">Illustrative story</span>}</Link>}
 <div className="editorial-copy"><p className="eyebrow">{story.series||story.category}<span> / Select</span></p><h2><Link href={`/select/${story.slug}`}>{story.title}</Link></h2><p>{story.standfirst}</p><Link href={`/select/${story.slug}`} className="text-link">Read the story ↗</Link></div></article>;
}

