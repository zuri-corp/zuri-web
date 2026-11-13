export const state = { user: { id: 'admin-1', email: 'admin@example.test' }, allowed: true, authError: null, dbError: null, exists: true, calls: [], notes: [], contents: [], contentError: null, failCAS: false, rpcError: null, rpcData: [], storageError:null,bucketPublic:false,motionEvents:[],zuriEvents:[],zuriPings:[],eventError:null,eventQueries:[] };
export function reset() { Object.assign(state, { user: { id: 'admin-1' }, allowed: true, authError: null, dbError: null, exists: true, calls: [], notes: [], contents: [], contentError: null, failCAS: false, rpcError: null, rpcData: [], storageError:null,bucketPublic:false,motionEvents:[],zuriEvents:[],zuriPings:[],eventError:null,eventQueries:[] }); }
export async function createServerSupabaseClient() { return {...createAdminClient(false,'user'),auth:{getUser:async()=>({data:{user:state.user},error:state.authError}),getSession:async()=>({data:{session:state.user?{access_token:'test-session-token'}:null},error:null}),signOut:async()=>{state.user=null;return {error:null};}}}; }
export function createPublicSupabaseClient() { return createAdminClient(true,'public'); }
function eventResult(call){
 if(state.eventError)return {data:null,error:state.eventError};
 const now=Date.now(),motion=call.table==='motion_imported_events',ping=call.filters.some(([key,value])=>key==='kind'&&value==='ping');
 let rows=(motion?state.motionEvents:ping?state.zuriPings:state.zuriEvents).filter(row=>call.filters.filter(([key])=>key!=='or').every(([key,value])=>Array.isArray(value)?value.includes(row[key]):row[key]===value));
 if(motion)rows=rows.filter(row=>row.verification_status==='verified'&&row.publication_status==='published');
 else {
  rows=rows.filter(row=>row.kind===(ping?'ping':'event')&&row.status==='published');
  if(call.client==='user')rows=rows.filter(row=>row.visibility==='public'||row.visibleTo?.includes(state.user?.id));
 }
 rows=rows.filter(row=>Date.parse(row.next_occurrence_at||row.starts_at||'')>=now||Date.parse(row.ends_at||'')>=now);
 if(call.order)rows=rows.slice().sort((a,b)=>String(a[call.order.column]||'').localeCompare(String(b[call.order.column]||''))*(call.order.ascending?1:-1));
 const fields=call.columns.split(',').map(key=>key.trim());
 return {data:rows.slice(0,call.limit).map(row=>Object.fromEntries(fields.map(key=>[key,row[key]]))),error:null};
}
export function createAdminClient(publicRead=false,clientKind='admin') {
  return {storage:{getBucket:async(bucket)=>{state.calls.push({storage:bucket,operation:"bucket"});return {data:{public:state.bucketPublic===true},error:state.storageError}},from(bucket){return {upload:async(path,bytes,options)=>{state.calls.push({storage:bucket,operation:'upload',path,bytes:bytes.length,options});return {error:state.storageError}},remove:async paths=>{state.calls.push({storage:bucket,operation:'remove',paths});return {error:null}},createSignedUrl:async(path,seconds)=>{state.calls.push({storage:bucket,operation:'sign',path,seconds});return {data:{signedUrl:'https://storage.example.test/signed-photo.jpg'},error:state.storageError}}}}},rpc(name,args) { state.calls.push({rpc:name,args}); return Promise.resolve({data:state.rpcData,error:state.rpcError}); }, from(table) {
    if(table==='motion_imported_events'||table==='zuri_entities'){
      const call={table,filters:[],columns:'',client:clientKind,limit:0,order:null};
      state.eventQueries.push(call);
      const eventQuery={
        select(columns){call.columns=columns;return eventQuery;},
        eq(key,value){call.filters.push([key,value]);return eventQuery;},
        in(key,values){call.filters.push([key,values]);return eventQuery;},
        or(value){call.filters.push(['or',value]);return eventQuery;},
        order(column,options){call.order={column,ascending:options?.ascending!==false};return eventQuery;},
        limit(value){call.limit=value;return Promise.resolve(eventResult(call));},
      };
      return eventQuery;
    }
    const call = { table, operation: 'read', value: null, filters: [], columns: '' }; state.calls.push(call);
    function contentResult(single) {
      if(state.contentError)return {data:null,error:state.contentError};
      let matches=state.contents.filter(row=>call.filters.every(([key,value])=>Array.isArray(value)?value.includes(row[key]):row[key]===value));
      if(publicRead)matches=matches.filter(row=>row.status==='published'&&row.published_data&&(row.kind==='story'||row.consent_verified));
      if(call.operation==='insert'){
        if(state.contents.some(row=>row.kind===call.value.kind&&row.slug===call.value.slug))return {data:null,error:{code:'23505'}};
        const row={id:'550e8400-e29b-41d4-a716-446655440000',revision:1,published_revision:null,published_at:null,updated_at:'2026-10-13T16:00:00Z',...call.value};state.contents.push(row);matches=[row];
      }
      if(call.operation==='update'){
        if(state.failCAS)return {data:null,error:null};
        for(const row of matches)Object.assign(row,call.value);
      }
      const data=matches.map(row=>Object.fromEntries(call.columns.split(',').map(key=>[key,row[key]])));
      return {data:single?(data[0]??null):data,error:null};
    }
    const q = {
      select(columns) { call.columns = columns; return q; }, eq(key, value) { call.filters.push([key, value]); return q; }, order() { return q; }, in(key,values) { call.filters.push([key,values]); return q; },
      range(from,to) { const result=contentResult(false); const rows=result.data??[]; return Promise.resolve({...result,count:rows.length,data:rows.slice(from,to+1)}); },
      limit() { return table === 'zuri_website_content' ? Promise.resolve(contentResult(false)) : Promise.resolve({ data: state.notes, error: state.dbError }); },
      update(value) { call.operation = 'update'; call.value = value; return q; },
      insert(value) { call.operation = 'insert'; call.value = value; return q; },
      maybeSingle() { if(table === 'zuri_website_content') return Promise.resolve(contentResult(true)); return Promise.resolve({ data: table === 'admin_users' ? (state.allowed ? {user_id:'admin-1'} : null) : (state.exists ? {id:'record-1', ...call.value} : null), error: state.dbError }); },
      single() { if(table === 'zuri_website_content') return Promise.resolve(contentResult(true)); return Promise.resolve({data: {id:'note-1', ...call.value}, error:state.dbError}); },
      then(resolve,reject) { return Promise.resolve({error: state.dbError}).then(resolve,reject); },
    }; return q;
  } };
}
