import type {MetadataRoute} from 'next';
import {siteOrigin} from '@/lib/discovery/profiles';
export default function robots():MetadataRoute.Robots{const origin=siteOrigin();return {rules:{userAgent:'*',allow:'/',disallow:['/admin','/api','/pamoja/manage','/pamoja/login','/pamoja/claim','/pamoja/account','/pamoja/moments']},...(origin?{sitemap:origin+'/sitemap.xml'}:{})}}
