import {spawnSync} from 'node:child_process';
import {copyFile,access} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const root=fileURLToPath(new URL('../',import.meta.url));
const npm=process.env.npm_execpath;
if(!npm)throw Error('Run this helper through npm run, as described in START-HERE.md.');
function run(project,args){const result=spawnSync(process.execPath,[npm,...args],{cwd:path.join(root,project),stdio:'inherit',env:process.env});if(result.status!==0)process.exit(result.status??1);}
async function env(){const target=path.join(root,'zuri-web/.env.local');try{await access(target);}catch{await copyFile(path.join(root,'zuri-web/.env.testing.example'),target);console.log('Created local testing configuration with public settings only.');}}
switch(process.argv[2]){
 case 'setup':await env();run('zuri-app-prototype',['ci']);run('zuri-web',['ci']);break;
 case 'build':run('zuri-app-prototype',['run','typecheck']);run('zuri-web',['run','build:app']);run('zuri-web',['run','build','--','--webpack']);break;
 case 'test':run('zuri-app-prototype',['test']);run('zuri-web',['test']);break;
 case 'dev':run('zuri-web',['run','dev','--','-p','3015']);break;
 case 'start':run('zuri-web',['start','--','-p','3015']);break;
 case 'app-dev':run('zuri-app-prototype',['run','dev']);break;
 case 'app-build':run('zuri-app-prototype',['run','build']);break;
 default:throw Error('Unknown command.');
}
