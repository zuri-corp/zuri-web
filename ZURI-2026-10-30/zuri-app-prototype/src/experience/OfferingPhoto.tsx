import {useEffect,useState} from 'react';
import {contextMediaUrl} from './cloudClient';
export function useContextPhoto(id:string|undefined,kind:string){const [url,setUrl]=useState('');useEffect(()=>{let active=true;setUrl('');if(id)contextMediaUrl(id,kind).then(value=>{if(active)setUrl(value);}).catch(()=>{});return()=>{active=false;};},[id,kind]);return url;}
export default function OfferingPhoto({id,title}:{id:string;title:string}){const url=useContextPhoto(id,'offering-photo');return url?<img className="sr-offer-photo" src={url} alt={title} loading="lazy"/>:null;}
