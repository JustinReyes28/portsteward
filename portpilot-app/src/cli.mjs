#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {pathToFileURL,fileURLToPath} from 'node:url';
import {parseArgs} from 'node:util';
import {createInterface} from 'node:readline/promises';
import {RegistryStore} from './storage.mjs';
import {LiveOsAdapter} from './adapters.mjs';
import {PortPilotSupervisor} from './supervisor.mjs';
import {renderDashboardFrame,formatPreview,printable} from './ui.mjs';
import {runInteractive} from './interactive.mjs';
import {runBetaTaskWalkthrough} from './demo.mjs';
export {runBetaTaskWalkthrough} from './demo.mjs';

export const HELP = [
'PortSteward — local project-aware TCP port management',
'Usage: node src/cli.mjs [command] [options]',
'',
'list                         Inspect live listeners (default outside a TTY)',
'interactive                  Open keyboard dashboard (default in a TTY)',
'details PORT                 Full observed process details',
'projects [list]              Saved profiles',
'projects add FILE.json       Add/edit one validated profile',
'projects remove ID           Remove profile (undo available)',
'projects favorite ID         Toggle favorite',
'projects group ID NAME       Set group (- clears)',
'projects undo                Undo the last registry edit',
'profiles export FILE.json    Export profiles to a new file',
'profiles import FILE.json    Merge profiles; --replace replaces profiles',
'launch ID                    Preview and confirm a saved command',
'stop PORT                    Preview and confirm identity-bound stop',
'restart PORT                 Preview and confirm exact managed restart',
'history                      Recent launches and observed outcomes',
'examples DIRECTORY           Create two local sample apps and profiles',
'demo                         Deterministic simulation; no real processes',
'',
'Options: --config FILE, --json, --project ID, --favorites, --group NAME,',
'         --port N (launch), --pid N, --start-time TOKEN, --yes, --theme dark|light',
'No installation or network connection is required. Live control: Windows only.',
'--yes explicitly confirms the printed preview. Without it, a TTY prompt is required.',
'Wrapper commands whose listener runs in a descendant are unsupported in v1.',
].join('\n');

export async function main(args=process.argv.slice(2),io={input:process.stdin,output:process.stdout,error:process.stderr}) {
  const {values,positionals}=parseArgs({args,allowPositionals:true,options:{
    config:{type:'string'},json:{type:'boolean'},yes:{type:'boolean'},project:{type:'string'},favorites:{type:'boolean'},
    group:{type:'string'},pid:{type:'string'},port:{type:'string'},'start-time':{type:'string'},replace:{type:'boolean'},
    theme:{type:'string'},help:{type:'boolean',short:'h'},'demo-walkthrough':{type:'boolean'}}});
  const output=value=>io.output.write(values.json?JSON.stringify(value,null,2)+'\n':typeof value==='string'?value+'\n':JSON.stringify(value,null,2)+'\n');
  if(values.help||positionals[0]==='help'){output(HELP);return 0;}
  if(values.theme&&!['light','dark'].includes(values.theme))throw new Error('Theme must be light or dark.');
  if(values.pid&&(!Number.isInteger(Number(values.pid))||Number(values.pid)<=0))throw new Error('PID must be a positive integer.');
  const command=values['demo-walkthrough']?'demo':positionals[0]||(io.input.isTTY&&io.output.isTTY?'interactive':'list');
  if(command==='demo'){output(await runBetaTaskWalkthrough());return 0;}
  const config=values.config||path.join(process.env.LOCALAPPDATA||path.join(os.homedir(),'.local','share'),'PortSteward','registry.json');
  const store=new RegistryStore(config);
  const supervisor=new PortPilotSupervisor({store,adapter:new LiveOsAdapter()});
  const options={filterProjectId:values.project,favoritesOnly:values.favorites,group:values.group};
  const confirmation=async(preview,word)=>{
    io.error.write(formatPreview(preview).join('\n')+'\n');
    if(values['start-time']&&values['start-time']!==preview.processStartTime)throw new Error('Provided start token is stale. No process changed.');
    if(values.yes)return true;
    if(!io.input.isTTY)throw new Error('No confirmation provided. Use a TTY, or deliberately confirm the printed preview with --yes.');
    const prompt=createInterface({input:io.input,output:io.error});
    try{return (await prompt.question('Type '+word+' to confirm (anything else cancels): '))===word;}
    finally{prompt.close();}
  };
  if(command==='interactive'){await runInteractive(supervisor,{...io,theme:values.theme||'dark'});return 0;}
  if(command==='projects') {
    const sub=positionals[1]||'list',id=positionals[2];
    if(sub==='add'){if(!id)throw new Error('Provide a project JSON file.');output(supervisor.saveProject(JSON.parse(fs.readFileSync(id,'utf8'))));}
    else if(sub==='remove')output(store.removeProject(id));
    else if(sub==='favorite')output(store.toggleFavorite(id));
    else if(sub==='undo')output(store.undoLastProjectEdit());
    else if(sub==='group') {
      const profile=store.load().projects.find(p=>p.id===id);if(!profile)throw new Error('Unknown project id.');
      if(!positionals[3])throw new Error('Provide a group name, or - to clear it.');
      output(supervisor.saveProject({...profile,group:positionals[3]==='-'?'':positionals[3]}));
    } else if(sub==='list')output(store.load().projects.filter(p=>(!values.project||p.id===values.project)&&(!values.favorites||p.favorite)&&(!values.group||p.group===values.group)));
    else throw new Error('Unknown projects command. See --help.');
    return 0;
  }
  if(command==='profiles') {
    const sub=positionals[1],file=positionals[2];if(!file)throw new Error('Provide a profile JSON file.');
    if(sub==='export'){fs.writeFileSync(file,store.exportProfilesJson(),{flag:'wx'});output('Exported profiles to '+path.resolve(file));}
    else if(sub==='import')output(store.importProfilesJson(fs.readFileSync(file,'utf8'),{merge:!values.replace}));
    else throw new Error('Use profiles export or profiles import.');return 0;
  }
  if(command==='examples') {
    const directory=path.resolve(positionals[1]||'portsteward-examples');fs.mkdirSync(directory,{recursive:true});
    const template=fs.readFileSync(fileURLToPath(new URL('../examples/sample-server.mjs',import.meta.url)),'utf8');
    const projects=[['sample-web','Sample Web',3000],['sample-api','Sample API',4000]].map(([id,name,port])=>{
      const folder=path.join(directory,name);fs.mkdirSync(folder,{recursive:true});
      fs.writeFileSync(path.join(folder,'server.mjs'),template,{flag:'wx'});
      return {id,name,rootPath:folder,expectedPorts:port===3000?[3000]:[4000,3000],launchExecutable:process.execPath,launchArgs:[path.join(folder,'server.mjs'),String(port),name],favorite:true,group:'samples'};
    });
    const file=path.join(directory,'profiles.json');fs.writeFileSync(file,JSON.stringify({schemaVersion:1,projects},null,2),{flag:'wx'});
    output('Created sample apps and '+file+'. Import the profiles, then launch sample-web from its preview.');return 0;
  }
  if(command==='launch'||command==='stop'||command==='restart') {
    const target=positionals[1];if(!target)throw new Error('Provide a project id or TCP port.');
    let preview;
    if(command==='launch')preview=supervisor.previewLaunch(target,{preferredPort:values.port?Number(values.port):null});
    else {
      const port=Number(target);if(!Number.isInteger(port)||port<1||port>65535)throw new Error('Provide a valid TCP port.');
      const selection={pid:values.pid?Number(values.pid):null};
      preview=command==='stop'?await supervisor.previewStopByPort(port,selection):await supervisor.previewRestartByPort(port,selection);
      if(!preview.canStop)throw new Error(preview.reason);
    }
    if(!await confirmation(preview,command.toUpperCase())){supervisor.cancelPreview();output('Cancelled; no process changed.');return 0;}
    const result=command==='launch'?await supervisor.executeConfirmedLaunch(preview):command==='stop'?await supervisor.executeConfirmedStop(preview):await supervisor.executeConfirmedRestart(preview);
    output(result);return result.ok?0:1;
  }
  if(command==='list'||command==='details'||command==='history') {
    const dash=await supervisor.inspectDashboard(options);
    if(command==='history')output(dash.recentRuns);
    else if(command==='details') {
      const matches=dash.portMatches.filter(m=>m.port===Number(positionals[1])&&(!values.pid||m.observation.pid===Number(values.pid)));
      if(!matches.length)throw new Error('No matching listener.');
      output(values.json?matches:matches.map(m=>JSON.stringify(m,null,2)).join('\n'));
    } else output(values.json?dash:renderDashboardFrame(dash,{activeTab:'OVERVIEW',width:io.output.columns||120,height:1000,theme:values.theme||'dark'}));
    return 0;
  }
  throw new Error('Unknown command "'+command+'". See --help.');
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href) {
  main().then(code=>{process.exitCode=code;}).catch(error=>{console.error('PortSteward: '+printable(error.message));process.exitCode=1;});
}
