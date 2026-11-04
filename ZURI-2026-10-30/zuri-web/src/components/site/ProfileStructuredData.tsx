import {profileSchema,safeJsonLd,siteOrigin} from '@/lib/discovery/profiles';
import type {PublicProfile} from '@/lib/publishing/model';
export default function ProfileStructuredData({item}:{item:PublicProfile}){const schema=profileSchema(item,siteOrigin());return schema?<script type="application/ld+json" dangerouslySetInnerHTML={{__html:safeJsonLd(schema)}}/>:null}
