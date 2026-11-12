import {readFile} from 'node:fs/promises';import ts from 'typescript';
import {resolve as baseResolve,load as baseLoad} from './typescript-loader.mjs';
export async function resolve(specifier,context,nextResolve){
 if(specifier.startsWith('.')&&!/\.[a-z]+$/i.test(specifier)){try{return await nextResolve(specifier+'.tsx',context);}catch{}}
 return baseResolve(specifier,context,nextResolve);
}
export async function load(url,context,nextLoad){
 if(url.endsWith('.json'))return {format:'module',shortCircuit:true,source:'export default '+await readFile(new URL(url),'utf8')+';'};
 if(url.endsWith('.tsx'))return {format:'module',shortCircuit:true,source:ts.transpileModule(await readFile(new URL(url),'utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText};
 return baseLoad(url,context,nextLoad);
}
