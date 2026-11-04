import {useState} from 'react';
import {PhotoField} from './PhotoField';
import type {MobileProps} from './MobileWorlds';
import type {LocalData} from './model';

export function IdentityAvatar({data,large=false}:{data:LocalData;large?:boolean}){
 return <span className={'id-avatar'+(large?' id-avatar-large':'')} aria-hidden="true">{data.avatar?<img src={data.avatar} alt=""/>:data.name.trim().slice(0,1).toUpperCase()}</span>;
}
export function IdentityEditor({data,update,notify}:Pick<MobileProps,'data'|'update'|'notify'>){
 const [editing,setEditing]=useState(false),[error,setError]=useState('');
 return <section className="id-editor"><button className="zx-secondary" aria-expanded={editing} onClick={()=>{setEditing(!editing);setError('');}}>Edit profile</button>{editing&&<form data-draft-key="identity" onSubmit={e=>{e.preventDefault();const form=new FormData(e.currentTarget),name=String(form.get('name')||'').trim(),bio=String(form.get('bio')||'').trim(),avatar=String(form.get('avatar')||'');if(!name){setError('Enter a display name.');return;}update(d=>({...d,name,bio,avatar}));setEditing(false);notify('Profile updated across ZURI on this device.');}}><PhotoField name="avatar" label="Profile photo" initial={data.avatar}/><label>Display name<input name="name" autoComplete="nickname" required maxLength={60} defaultValue={data.name}/></label><label>About you<textarea name="bio" maxLength={300} rows={4} defaultValue={data.bio}/></label><small>Your name, photo and introduction are shared across your ZURI profile.</small>{error&&<p className="zx-alert" role="alert">{error}</p>}<div className="id-buttons"><button className="zx-primary">Save changes</button><button type="button" className="zx-text" onClick={()=>{setEditing(false);setError('');}}>Cancel</button></div></form>}</section>;
}
