import type {PublicProfile} from '@/lib/publishing/model';
import {profileHref} from '@/lib/content/website';
export function siteOrigin(value=process.env.NEXT_PUBLIC_SITE_URL):string|null{
 if(!value)return null;
 try{const url=new URL(value);if(url.username||url.password)return null;if(url.protocol!=='https:'&&!(url.protocol==='http:'&&['localhost','127.0.0.1'].includes(url.hostname)))return null;return url.origin}catch{return null}
}
export function profileSchema(item:PublicProfile,origin:string|null){
 if(item.sample||item.previewOnly)return null;
 const url=origin?`${origin}${profileHref(item)}`:undefined;
 return {'@context':'https://schema.org','@type':'ProfilePage',...(url?{'@id':url,url}:{}),name:item.name,description:item.description,mainEntity:{'@type':item.kind==='person'?'Person':'Organization',name:item.name,description:item.description,...(url?{url}:{}),...(item.image?{image:item.image}:{}),...(item.location?{address:item.location}:{}),...(item.public_email?{email:item.public_email}:{}),...(item.public_phone?{telephone:item.public_phone}:{}),...(item.website?{sameAs:[item.website]}:{}),...(item.offerings.length?{hasOfferCatalog:{'@type':'OfferCatalog',name:'What we offer',itemListElement:item.offerings.map(name=>({'@type':'Offer',itemOffered:{'@type':'Thing',name}}))}}:{})}};
}
export function safeJsonLd(value:unknown){return JSON.stringify(value).replace(/</g,'\\u003c').replace(/\u2028/g,'\\u2028').replace(/\u2029/g,'\\u2029')}
export function profileCanonical(item:PublicProfile|null){const origin=siteOrigin();return item&&!item.sample&&!item.previewOnly&&origin?{canonical:`${origin}${profileHref(item)}`} : undefined}

