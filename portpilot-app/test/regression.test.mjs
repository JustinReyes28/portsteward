import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {PassThrough,Writable} from 'node:stream';
import {validateProjectInput,doesObservationMatchProjectPath,evaluateObservationOwnership} from '../src/domain.mjs';
import {RegistryStore} from '../src/storage.mjs';
import {FakeOsAdapter} from '../src/adapters.mjs';
import {PortPilotSupervisor} from '../src/supervisor.mjs';
import {renderDashboardFrame,formatPreview,printable} from '../src/ui.mjs';
import {runInteractive} from '../src/interactive.mjs';
import {main} from '../src/cli.mjs';
const profile=(id='web',port=3000)=>({id,name:'Sample '+id,rootPath:'C:\\Sample Projects\\'+id,expectedPorts:[port],launchExecutable:'C:\\Program Files\\nodejs\\node.exe',launchArgs:['server.mjs','literal $() & ;'],group:'work'});
function harness(t,rows=[]) {
  const base=path.resolve(os.tmpdir()),dir=fs.mkdtempSync(path.join(base,'portsteward-regression-'));
  t.after(()=>{const target=path.resolve(dir);assert.ok(target.startsWith(base+path.sep));assert.ok(path.basename(target).startsWith('portsteward-regression-'));fs.rmSync(target,{recursive:true,force:true});});
  const store=new RegistryStore(path.join(dir,'registry.json')),adapter=new FakeOsAdapter(rows);
  return {dir,store,adapter,s:new PortPilotSupervisor({store,adapter})};
}
test('Profiles reject malformed argument arrays, relative roots, coercions and control characters',()=>{
  for(const bad of [{launchArgs:'node app.js'},{launchArgs:[12]},{rootPath:'relative'},{expectedPorts:['3000']},{favorite:'false'},{name:'bad\x1b[31m'}])
    assert.throws(()=>validateProjectInput({...profile(),...bad}));
  assert.deepEqual(validateProjectInput(profile()).launchArgs,['server.mjs','literal $() & ;']);
});
test('Path matching uses complete path boundaries including UNC and case rules',()=>{
  assert.equal(doesObservationMatchProjectPath('C:\\Apps\\web',{command:'node C:\\OtherC:\\Apps\\web\\server.js'}),false);
  assert.equal(doesObservationMatchProjectPath('C:\\Apps\\web',{workingDirectory:'C:\\Apps\\web-admin'}),false);
  assert.equal(doesObservationMatchProjectPath('C:\\Sample Projects\\web',{command:'node "C:\\Sample Projects\\web\\server.mjs"'}),true);
  assert.equal(doesObservationMatchProjectPath('\\\\SERVER\\share\\web',{workingDirectory:'\\\\server\\SHARE\\WEB'}),true);
});
test('Port-only expectations do not claim a verified owner',()=>{
  const match=evaluateObservationOwnership({port:3000,pid:55,command:'node unknown.js'},[profile()]);
  assert.equal(match.confidence,'port-only');assert.equal(match.primaryProject,null);assert.equal(match.matchedProjects.length,1);
});
test('Undo persists across commands and does not restore stale process history',t=>{
  const {store}=harness(t);store.upsertProject(profile());store.upsertProject(profile('api',4000));
  const fresh=new RegistryStore(store.filePath);assert.equal(fresh.undoLastProjectEdit().length,1);
  assert.throws(()=>fresh.undoLastProjectEdit(),/No recent/);
});
test('Import validates all profiles and duplicates before writing; imported runs grant no authority',t=>{
  const {store}=harness(t);store.upsertProject(profile());const before=fs.readFileSync(store.filePath,'utf8');
  assert.throws(()=>store.importProfilesJson(JSON.stringify({schemaVersion:1,projects:[profile('api'),{bad:true}]})));
  assert.equal(fs.readFileSync(store.filePath,'utf8'),before);
  assert.throws(()=>store.importProfilesJson(JSON.stringify({schemaVersion:1,projects:[profile(),profile()]})),/Duplicate/);
  store.importProfilesJson(JSON.stringify({schemaVersion:1,projects:[profile()],managedRuns:[{pid:1,status:'running'}]}));
  assert.equal(store.load().managedRuns.length,0);
  assert.equal(JSON.parse(store.exportProfilesJson()).managedRuns,undefined);
});
test('Unsupported schema is never silently rolled back to an older backup',t=>{
  const {store}=harness(t);store.upsertProject(profile());fs.writeFileSync(store.filePath,'{"schemaVersion":99}');
  assert.throws(()=>store.load(),/Unsupported/);assert.equal(JSON.parse(fs.readFileSync(store.filePath)).schemaVersion,99);
});
test('Active registry writer lock refuses concurrent mutation and preserves bytes',t=>{
  const {store}=harness(t);store.upsertProject(profile());const before=fs.readFileSync(store.filePath,'utf8');
  fs.writeFileSync(store.lockPath,'test writer');assert.throws(()=>store.upsertProject(profile('api')),/locked/);
  fs.unlinkSync(store.lockPath);assert.equal(fs.readFileSync(store.filePath,'utf8'),before);
});
test('A race after pre-stop revalidation is refused by the bound adapter',async t=>{
  const {s,adapter}=harness(t,[{port:3000,pid:2222,processStartTime:'old',executablePath:'node'}]);
  const preview=await s.previewStopByPort(3000),bound=adapter.stopProcessBound.bind(adapter);
  adapter.stopProcessBound=(token)=>{adapter.simulatePidReuseRace(2222,{newStartTime:'replacement'});return bound(token);};
  const result=await s.executeConfirmedStop(preview);assert.equal(result.ok,false);assert.equal(adapter.getProcessByPid(2222).processStartTime,'replacement');
});
test('Preview capabilities reject fabrication, reuse, expiry and cancellation',async t=>{
  const {s,adapter}=harness(t,[{port:3000,pid:3333,processStartTime:'old',executablePath:'node'}]);
  let p=await s.previewStopByPort(3000);s.cancelPreview();assert.equal((await s.executeConfirmedStop(p)).ok,false);
  assert.equal((await s.executeConfirmedStop({...p,token:'forged'})).ok,false);
  p=await s.previewStopByPort(3000);s.previews.get(p.token).expiresAt=Date.now()-1;
  assert.equal((await s.executeConfirmedStop(p)).ok,false);assert.ok(adapter.getProcessByPid(3333));
  p=await s.previewStopByPort(3000);assert.equal((await s.executeConfirmedStop(p)).ok,true);
  assert.equal((await s.executeConfirmedStop(p)).ok,false);
});
test('Managed restart preserves original run definition after a profile edit',async t=>{
  const {s,store}=harness(t);const original=profile();s.saveProject(original);
  const first=await s.launchProject('web');assert.equal(first.ok,true);
  s.saveProject({...original,launchArgs:['edited-command.mjs'],rootPath:'C:\\Changed'});
  const restarted=await s.restartByPort(3000);assert.equal(restarted.ok,true);
  assert.deepEqual(restarted.newRun.launchArgs,original.launchArgs);assert.equal(restarted.newRun.rootPath,original.rootPath);
  assert.equal(store.load().projects[0].launchArgs[0],'edited-command.mjs');
});
test('Discovery failure propagates; favorites, project and group filters retain evidence',async t=>{
  const {s,adapter}=harness(t,[{port:3000,pid:99}]);s.saveProject({...profile(),favorite:true});
  assert.equal((await s.inspectDashboard({group:'work',favoritesOnly:true})).portMatches.length,1);
  assert.equal((await s.inspectDashboard({filterProjectId:'absent'})).portMatches.length,0);
  adapter.listPortObservations=()=>{throw new Error('Discovery unavailable');};
  await assert.rejects(s.inspectDashboard(),/Discovery unavailable/);
});
test('Multiple observed identities on a port require an explicit PID selection',async t=>{
  const {s,adapter}=harness(t,[{port:3000,pid:31},{port:4000,pid:32}]);const rows=adapter.listPortObservations();
  adapter.listPortObservations=()=>[rows[0],{...rows[1],port:3000}];
  assert.equal((await s.previewStopByPort(3000)).canStop,false);
  assert.equal((await s.previewStopByPort(3000,{pid:31})).pid,31);
});
test('Terminal views preserve selected rows, full preview identity and plain error states',()=>{
  const projects=Array.from({length:30},(_,i)=>({...profile('p'+i),name:'Row '+i}));
  const dash={projects,portMatches:[],recentRuns:[]};
  const view=renderDashboardFrame(dash,{activeTab:'PROJECTS',selectedIndex:29,width:80,height:14});
  assert.match(view,/> .*p29/);assert.ok(view.split('\n').every(line=>line.length<=80));
  assert.match(renderDashboardFrame(dash,{width:20}),/enlarge terminal/);
  for(const uiState of ['NORMAL','EMPTY','LOADING','FAILURE','CANCELLED','COMPLETED'])assert.match(renderDashboardFrame(dash,{uiState}),new RegExp(uiState));
  const full='C:\\Long Project Name\\'.repeat(30);assert.ok(formatPreview({kind:'stop',executablePath:full}).join('\n').includes(full));
  assert.equal(printable('\x1b[31mevil\ntext'),'evil text');
});
test('CLI profile persistence works across invocations without installation',async t=>{
  const {dir,store}=harness(t),file=path.join(dir,'profile.json');fs.writeFileSync(file,JSON.stringify(profile()));
  let printed='';const output={write:s=>{printed+=s;}},io={input:{isTTY:false},output,error:output};
  assert.equal(await main(['projects','add',file,'--config',store.filePath],io),0);
  printed='';await main(['projects','list','--json','--config',store.filePath],io);
  assert.equal(JSON.parse(printed)[0].id,'web');await main(['projects','undo','--config',store.filePath],io);
  assert.equal(store.load().projects.length,0);
});
const waitFor=async(predicate)=>{const until=Date.now()+5000;while(!predicate()){if(Date.now()>until)throw new Error('Terminal event timed out.');await new Promise(r=>setTimeout(r,5));}};
test('Keyboard flow navigates, cancels a profile draft, confirms launch and toggles theme',async t=>{
  const {s,store}=harness(t);s.saveProject(profile());
  const input=new PassThrough();input.isTTY=true;input.setRawMode=()=>{};
  let frames='';const output=new Writable({write(chunk,encoding,callback){frames+=chunk.toString();callback();}});
  output.isTTY=true;output.columns=90;output.rows=24;
  const running=runInteractive(s,{input,output});
  const key=(text,name=text)=>input.emit('keypress',text,{name});
  await waitFor(()=>frames.includes('PORTS'));key('1');await waitFor(()=>frames.includes('| PROJECTS'));
  key('a');await waitFor(()=>frames.includes('Project id:'));key('', 'escape');await waitFor(()=>frames.includes('CANCELLED'));
  assert.equal(store.load().projects.length,1);
  frames='';key('l');await waitFor(()=>frames.includes('LAUNCH PREVIEW'));
  for(const c of 'LAUNCH')key(c);key('\r','return');
  await waitFor(()=>store.load().managedRuns.length===1);assert.equal(store.load().managedRuns[0].status,'running');
  frames='';key('t');await waitFor(()=>frames.includes('LIGHT'));
  output.columns=35;output.emit('resize');await waitFor(()=>frames.includes('enlarge terminal'));
  key('q');await running;assert.equal(input.listenerCount('keypress'),0);
});

test('A history write failure cleans up the newly launched process using its bound identity',async t=>{
  const {s,store,adapter}=harness(t);s.saveProject(profile());
  store.recordManagedRun=()=>{throw new Error('Simulated disk full');};
  const result=await s.launchProject('web');
  assert.equal(result.ok,false);assert.equal(result.code,'LAUNCH_HISTORY_WRITE_FAILED');
  assert.equal(adapter.listPortObservations().length,0);assert.match(result.message,/newly launched process was stopped/);
});
test('A successful stop followed by failed history persistence is reported truthfully and restart is refused',async t=>{
  const {s,store,adapter}=harness(t);s.saveProject(profile());await s.launchProject('web');
  const p=await s.previewRestartByPort(3000);
  store.recordManagedRun=()=>{throw new Error('Simulated disk full');};
  const result=await s.executeConfirmedRestart(p);
  assert.equal(result.ok,false);assert.equal(result.code,'RESTART_HISTORY_WRITE_FAILED');
  assert.match(result.message,/Process stopped/);assert.equal(adapter.listPortObservations().length,0);
});
test('Invalid CLI PID is rejected before any process discovery',async()=>{
  await assert.rejects(main(['stop','3000','--pid','wrong','--yes']),/positive integer/);
});

test('Backup failure distinguishes a committed primary from an unchanged operation',t=>{
  const {store}=harness(t);const atomic=store._atomic.bind(store);
  store._atomic=(target,text)=>{if(target===store.bakPath)throw new Error('Simulated backup full');return atomic(target,text);};
  assert.throws(()=>store.upsertProject(profile()),/primary was saved.*backup/i);
  assert.equal(store.load().projects.length,1);
});
test('An initial terminal discovery failure retains a usable recovery view',async t=>{
  const {s,adapter}=harness(t);const list=adapter.listPortObservations.bind(adapter);adapter.listPortObservations=()=>{throw new Error('Local discovery failed');};
  const input=new PassThrough();input.isTTY=true;input.setRawMode=()=>{};
  let frames='';const output=new Writable({write(chunk,encoding,callback){frames+=chunk.toString();callback();}});output.isTTY=true;output.columns=90;output.rows=24;
  const running=runInteractive(s,{input,output});await waitFor(()=>frames.includes('FAILURE'));
  assert.match(frames,/Local discovery failed/);adapter.listPortObservations=list;
  frames='';input.emit('keypress',' ',{name:'space'});await waitFor(()=>frames.includes('NORMAL'));
  input.emit('keypress','q',{name:'q'});await running;
});
