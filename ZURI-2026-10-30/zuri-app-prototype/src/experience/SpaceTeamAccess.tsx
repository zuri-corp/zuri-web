import {useEffect,useState} from 'react';
import {cloudRequest} from './cloudClient';

type Status={role?:string|null;pending_transfer?:boolean};
export default function SpaceTeamAccess({id,onAccepted}:{id:string;onAccepted:()=>void}){
 const [status,setStatus]=useState<Status|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState('');
 useEffect(()=>{let live=true;cloudRequest<Status>('spaces.team.status',{id}).then(value=>live&&setStatus(value)).catch(()=>live&&setStatus(null));return()=>{live=false;};},[id]);
 if(!status?.role&&!status?.pending_transfer)return null;
 async function accept(){if(busy)return;setBusy(true);setError('');try{await cloudRequest('spaces.transfer.accept',{id});onAccepted();setStatus({role:'owner'});}catch(e){setError(e instanceof Error?e.message:'Ownership could not be accepted.');}finally{setBusy(false);}}
 return <section className="oc-space-access">{status.pending_transfer?<><strong>Ownership transfer waiting</strong><p>You have been asked to take ownership of this Space. Accepting makes you the business owner and keeps the previous owner as an administrator.</p><button className="zs-primary" disabled={busy} onClick={()=>void accept()}>{busy?'Accepting…':'Accept ownership'}</button></>:<p>You are part of this Space’s private business team as <strong>{status.role}</strong>.</p>}{error&&<p role="alert">{error}</p>}</section>;
}
