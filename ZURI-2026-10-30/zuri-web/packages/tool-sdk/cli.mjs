#!/usr/bin/env node
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {validateManifest,bookingManifest} from './manifest.mjs';
const [command,target]=process.argv.slice(2);
try{
 if(command==='check'&&target){const manifest=validateManifest(JSON.parse(await readFile(target,'utf8')));console.log(`Valid: ${manifest.name} v${manifest.version}. Validation is not approval.`);}
 else if(command==='init'&&target){const directory=path.resolve(target);await mkdir(directory);await writeFile(path.join(directory,'zuri.tool.json'),JSON.stringify(bookingManifest,null,2)+'\n');console.log('Created zuri.tool.json. Replace the example endpoint with your own service before submission.');}
 else throw Error('Usage: zuri-tool init <new-directory> | zuri-tool check <manifest.json>');
}catch(error){console.error(error.message);process.exitCode=1;}
