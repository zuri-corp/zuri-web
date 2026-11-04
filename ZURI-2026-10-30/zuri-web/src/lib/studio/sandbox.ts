import {emptyStudio,studioMutation,type StudioState} from './model';
export function newSandbox():StudioState{return {...emptyStudio(),userId:'sandbox-developer',admin:true,spaces:[{id:'10000000-0000-4000-8000-000000000001',name:'Garden House · fictional sandbox Space'}]};}
/** An explicitly simulated review environment, never used by a server API. */
export function sandboxChange(previous:StudioState,raw:unknown):StudioState{
 const {action,payload:p}=studioMutation(raw),s=structuredClone(previous),now=new Date().toISOString();
 const id=()=>crypto.randomUUID();
 const version=()=>{const v=s.versions.find(v=>v.id===p.versionId);if(!v)throw Error('Version unavailable.');return v;};
 const tool=(key:unknown)=>{const t=s.tools.find(t=>t.id===key);if(!t)throw Error('Tool unavailable.');return t;};
 switch(action){
 case 'register':if(s.developers.length)throw Error('This sandbox already has a developer profile.');s.developers.push({id:id(),...p,verified:false});break;
 case 'create':{if(!s.developers.some(d=>d.id===p.developerId))throw Error('Register a developer profile first.');const m=p.manifest as Record<string,unknown>;if(s.tools.some(t=>t.slug===m.slug))throw Error('That Tool address already exists.');const tid=id();s.tools.push({id:tid,developer_id:p.developerId,slug:m.slug,name:m.name,suspended:false,published_version_id:null});s.versions.push({id:id(),tool_id:tid,manifest:m,status:'draft'});break;}
 case 'version':{const t=tool(p.toolId),m=p.manifest as Record<string,unknown>;if(m.slug!==t.slug)throw Error('Keep the same Tool address.');if(s.versions.some(v=>v.tool_id===t.id&&v.manifest.version===m.version))throw Error('Use a new version number.');s.versions.push({id:id(),tool_id:t.id,manifest:m,status:'draft'});break;}
 case 'submit':if(version().status!=='draft')throw Error('Only draft versions can be submitted.');version().status='submitted';break;
 case 'verify':{const d=s.developers.find(d=>d.id===p.developerId);if(!d)throw Error('Developer unavailable.');d.verified=true;break;}
 case 'approve':case 'reject':{const v=version();if(v.status!=='submitted')throw Error('This version is not awaiting review.');if(action==='approve'&&!s.developers.find(d=>d.id===tool(v.tool_id).developer_id)?.verified)throw Error('Verify the developer before approval.');v.status=action==='approve'?'approved':'rejected';v.review_reference=p.reference;break;}
 case 'publish':{const v=version(),t=tool(v.tool_id);if(v.status!=='approved'||t.suspended)throw Error('Approval and an active Tool are required.');t.published_version_id=v.id;break;}
 case 'suspend':tool(p.toolId).suspended=true;break;
 case 'install':{const v=version(),t=tool(v.tool_id);if(t.suspended||t.published_version_id!==v.id||v.status!=='approved')throw Error('Only the approved published version can be installed.');if(!s.spaces.some(x=>x.id===p.spaceId))throw Error('Space management access required.');if(s.installations.some(i=>i.space_id===p.spaceId&&i.tool_id===t.id&&!i.revoked))throw Error('Revoke the existing installation before consenting to a new version.');s.installations.push({id:id(),space_id:p.spaceId,tool_id:t.id,version_id:v.id,revoked:false,permissions:v.manifest.permissions});break;}
 case 'revoke':{const i=s.installations.find(i=>i.id===p.installationId);if(!i)throw Error('Installation unavailable.');i.revoked=true;break;}
 case 'issue-key':case 'revoke-key':case 'budget':case 'team':throw Error('Real credentials, budgets and team membership are unavailable in the browser sandbox.');
 case 'booking-create':{const i=s.installations.find(i=>i.id===p.installationId),t=i&&tool(i.tool_id);if(!i||i.revoked||t?.suspended||!i.permissions.some((x:{capability:string})=>x.capability==='bookings.create'))throw Error('An active installation and bookings.create permission are required.');if(s.bookings.some(b=>b.space_id===i.space_id&&b.status!=='cancelled'&&b.startsAt<String(p.endsAt)&&b.endsAt>String(p.startsAt)))throw Error('That appointment overlaps an existing request.');s.bookings.push({id:id(),...p,installation_id:i.id,space_id:i.space_id,status:'requested'});s.usage.push({id:id(),installation_id:i.id,operation:'bookings.create',created_at:now});break;}
 case 'booking-status':{const b=s.bookings.find(b=>b.id===p.bookingId),i=b&&s.installations.find(i=>i.id===b.installation_id);if(!b||!i||i.revoked||tool(i.tool_id).suspended)throw Error('Active installation required.');if(!i.permissions.some((x:{capability:string})=>x.capability==='bookings.manage'))throw Error('bookings.manage permission required.');if(b.status!=='requested')throw Error('Only pending requests can change status.');b.status=p.status;break;}
 }
 s.audit.unshift({id:id(),action,reference:p.reference||'Browser sandbox action; not a production decision.',created_at:now});return s;
}
