import './hooks.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {NextRequest} from 'next/server.js';
import {refresh} from './ssr-mock.mjs';
const {proxy} = await import('../src/proxy.ts');
test('unconfigured auth never invents a session',async()=>{
 delete process.env.NEXT_PUBLIC_SUPABASE_URL;delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
 refresh.calls=0;const res=await proxy(new NextRequest('https://zuri.test/admin'));
 assert.equal(refresh.calls,0);assert.equal(res.headers.get('cache-control'),'private, no-store');
});
test('refresh writes cookies to request and response and preserves cache protection',async()=>{
 process.env.NEXT_PUBLIC_SUPABASE_URL='https://supabase.example.test';process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY='non-secret-test-value';
 refresh.calls=0;refresh.cookies=[{name:'sb-session',value:'refreshed-test-session',options:{httpOnly:true,path:'/'}}];refresh.cacheHeaders={Expires:'0',Pragma:'no-cache'};
 const request=new NextRequest('https://zuri.test/admin');const res=await proxy(request);
 assert.equal(refresh.calls,1);assert.equal(request.cookies.get('sb-session').value,'refreshed-test-session');assert.equal(res.cookies.get('sb-session').value,'refreshed-test-session');assert.equal(res.headers.get('pragma'),'no-cache');assert.equal(res.headers.get('cache-control'),'private, no-store');
});
