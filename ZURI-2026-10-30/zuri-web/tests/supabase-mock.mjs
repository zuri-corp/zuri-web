export const state = { user: { id: 'admin-1', email: 'admin@example.test' }, allowed: true, authError: null, dbError: null, exists: true, calls: [], notes: [], contents: [], contentError: null, failCAS: false, rpcError: null, rpcData: [], storageError:null,bucketPublic:false };
export function reset() { Object.assign(state, { user: { id: 'admin-1' }, allowed: true, authError: null, dbError: null, exists: true, calls: [], notes: [], contents: [], contentError: null, failCAS: false, rpcError: null, rpcData: [], storageError:null,bucketPublic:false }); }
export async function createServerSupabaseClient() { return {rpc: (...args)=>createAdminClient().rpc(...args),auth:{getUser:async()=>({data:{user:state.user},error:state.authError}),getSession:async()=>({data:{session:state.user?{access_token:'test-session-token'}:null},error:null}),signOut:async()=>{state.user=null;return {error:null};}}}; }
export function createPublicSupabaseClient() { return createAdminClient(true); }
export function createAdminClient(publicRead=false) {
  return {storage:{getBucket:async(bucket)=>{state.calls.push({storage:bucket,operation:"bucket"});return {data:{public:state.bucketPublic===true},error:state.storageError}},from(bucket){return {upload:async(path,bytes,options)=>{state.calls.push({storage:bucket,operation:'upload',path,bytes:bytes.length,options});return {error:state.storageError}},remove:async paths=>{state.calls.push({storage:bucket,operation:'remove',paths});return {error:null}},createSignedUrl:async(path,seconds)=>{state.calls.push({storage:bucket,operation:'sign',path,seconds});return {data:{signedUrl:'https://storage.example.test/signed-photo.jpg'},error:state.storageError}}}}},rpc(name,args) { state.calls.push({rpc:name,args}); return Promise.resolve({data:state.rpcData,error:state.rpcError}); }, from(table) {
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
