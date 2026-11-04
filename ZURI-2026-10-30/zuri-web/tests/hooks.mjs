import { registerHooks } from 'node:module';
import { readFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import ts from 'typescript';
const root = path.resolve('src');
const mock = pathToFileURL(path.resolve('tests/supabase-mock.mjs')).href;
registerHooks({
 resolve(specifier, context, next) {
   if (specifier === '@supabase/ssr' && context.parentURL?.endsWith('/src/proxy.ts')) return {url:pathToFileURL(path.resolve('tests/ssr-mock.mjs')).href,shortCircuit:true};
   if (specifier === 'server-only') return {url: 'data:text/javascript,export {};', shortCircuit:true};
   if (specifier === 'next/server' && (context.parentURL?.endsWith('/ai/gateway.ts') || context.parentURL?.endsWith('/publishing/public.ts') || context.parentURL?.endsWith('/pamoja/public.ts') || context.parentURL?.endsWith('/studio/catalog/route.ts'))) return {url:pathToFileURL(path.resolve('tests/request-time.mjs')).href,shortCircuit:true};
   if (specifier === 'next/server') return next('next/server.js',context);
   let file;
   if(specifier.startsWith('@/')) file = path.join(root,specifier.slice(2))+'.ts';
   else if(specifier.startsWith('.') && context.parentURL?.includes('/src/') && !path.extname(specifier)) file = fileURLToPath(new URL(specifier+'.ts',context.parentURL));
   if(file) {
     const portableFile = file.replaceAll('\\', '/');
     if(portableFile.endsWith('/supabase/admin.ts') || portableFile.endsWith('/supabase/server.ts') || portableFile.endsWith('/supabase/public.ts')) return {url:mock,shortCircuit:true};
     return {url:pathToFileURL(file).href,shortCircuit:true};
   }
   return next(specifier,context);
 },
 load(url, context, next) {
   if(url.endsWith('.ts') && url.includes('/src/')) return {format:'module',source:ts.transpileModule(readFileSync(fileURLToPath(url),'utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText,shortCircuit:true};
   return next(url,context);
 }
});
