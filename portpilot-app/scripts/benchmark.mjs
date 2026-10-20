import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {performance} from 'node:perf_hooks';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {LiveOsAdapter} from '../src/adapters.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));
const walk=dir=>fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(dir,e.name)):[path.join(dir,e.name)]);
const startup=[];
for(let i=0;i<3;i++){const t=performance.now();execFileSync(process.execPath,[path.join(root,'src','cli.mjs'),'--help'],{windowsHide:true,stdio:'ignore'});startup.push(Number((performance.now()-t).toFixed(2)));}
const refresh=[];let listenerCount;
for(let i=0;i<3;i++){const t=performance.now();listenerCount=(await new LiveOsAdapter().listPortObservations()).length;refresh.push(Number((performance.now()-t).toFixed(2)));}
const files=['src','examples'].flatMap(d=>walk(path.join(root,d))).concat([path.join(root,'package.json'),path.join(root,'README.md'),path.join(root,'LICENSE')]);
const report={measuredAt:new Date().toISOString(),machine:'PortSteward Windows workspace host',os:os.type()+' '+os.release(),arch:os.arch(),node:process.version,
  method:'Three fresh CLI --help starts; three sequential full local TCP discovery calls; source-package bytes exclude preinstalled Node/PowerShell runtimes, Git, tests, docs and user data.',
  startupMs:startup,refreshMs:refresh,listenerCount,sourcePackageBytes:files.reduce((n,f)=>n+fs.statSync(f).size,0),externalPackageCount:0,
  baseline:'First usable Windows implementation. Prior supplied CLI printed no output, so no valid before/after functional performance claim is made.'};
console.log(JSON.stringify(report,null,2));
