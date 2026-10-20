import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
const root=fileURLToPath(new URL('../',import.meta.url));
const walk=dir=>fs.readdirSync(dir,{withFileTypes:true}).flatMap(entry=>entry.isDirectory()?walk(path.join(dir,entry.name)):[path.join(dir,entry.name)]);
const sources=['src','test','examples','scripts'].flatMap(dir=>walk(path.join(root,dir))).filter(file=>file.endsWith('.mjs'));
for(const file of sources)execFileSync(process.execPath,['--check',file],{stdio:'inherit',windowsHide:true});
console.log('Syntax checked '+sources.length+' JavaScript modules.');
