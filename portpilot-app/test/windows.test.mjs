import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import net from 'node:net';
import {execFile} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {RegistryStore} from '../src/storage.mjs';
import {LiveOsAdapter} from '../src/adapters.mjs';
import {PortPilotSupervisor} from '../src/supervisor.mjs';

const appRoot=fileURLToPath(new URL('../',import.meta.url));
const cli=path.join(appRoot,'src','cli.mjs');
const invoke=(args)=>new Promise(resolve=>execFile(process.execPath,[cli,...args],{cwd:appRoot,windowsHide:true,timeout:45000},(error,stdout,stderr)=>resolve({code:error?.code||0,stdout,stderr})));
const freePorts=async()=> {
  const servers=[net.createServer(),net.createServer()];
  await Promise.all(servers.map(s=>new Promise(resolve=>s.listen(0,'127.0.0.1',resolve))));
  const ports=servers.map(s=>s.address().port);
  await Promise.all(servers.map(s=>new Promise(resolve=>s.close(resolve))));
  return ports;
};
test('Windows live journey: actual listeners, native mismatch refusal, CLI restart and isolated second app', {skip:process.platform!=='win32',timeout:120000},async t=>{
  const base=path.resolve(os.tmpdir());
  const dir=fs.mkdtempSync(path.join(base,'portsteward-live-'));
  const store=new RegistryStore(path.join(dir,'config','registry.json'));
  const adapter=new LiveOsAdapter();const s=new PortPilotSupervisor({store,adapter});
  const [webPort,apiPort]=await freePorts();
  const server=fs.readFileSync(path.join(appRoot,'examples','sample-server.mjs'),'utf8');
  const make=(id,name,port)=>{
    const folder=path.join(dir,name);fs.mkdirSync(folder,{recursive:true});fs.writeFileSync(path.join(folder,'server.mjs'),server);
    return {id,name,rootPath:folder,expectedPorts:[port],launchExecutable:process.execPath,launchArgs:[path.join(folder,'server.mjs'),String(port),name,'literal $() & ; arg'],favorite:true,group:'local-test'};
  };
  let external,web,api;
  try {
    // Create an external test listener; it is not entered in managed history.
    const legacy=make('legacy','Legacy External',webPort);
    external=await adapter.spawnManagedProcess({executable:legacy.launchExecutable,args:legacy.launchArgs,workingDirectory:legacy.rootPath,port:webPort,logPath:path.join(dir,'legacy.log')});
    assert.equal(external.launched,true,external.message);
    const webProfile=make('web','Sample Web With Spaces',webPort);
    const apiProfile=make('api','Sample API With Spaces',apiPort);apiProfile.expectedPorts.push(webPort);
    // Exercise the public CLI's profile path as well as the supervisor API.
    const profileFile=path.join(dir,'profiles.json');
    fs.writeFileSync(profileFile,JSON.stringify({schemaVersion:1,projects:[webProfile,apiProfile]}));
    const imported=await invoke(['profiles','import',profileFile,'--config',store.filePath,'--json']);assert.equal(imported.code,0,imported.stderr);
    const conflict=await s.inspectDashboard({ports:[webPort,apiPort]});
    const actual=conflict.portMatches.find(row=>row.port===webPort);assert.equal(actual.observation.pid,external.pid);
    assert.equal(actual.matchedProjects.length,2);assert.equal(actual.managedRun,null);
    assert.equal((await s.restartByPort(webPort)).ok,false);
    // Wrong creation token exercises the actual native retained-handle check.
    const rejected=await adapter.stopProcessBound({pid:external.pid,expectedStartTime:String(BigInt(external.processStartTime)+1n),expectedExecutablePath:external.executablePath});
    assert.equal(rejected.stopped,false);assert.equal(rejected.code,'IDENTITY_MISMATCH_PID_REUSED');
    assert.equal((await fetch('http://127.0.0.1:'+webPort)).status,200);
    const preview=await s.previewStopByPort(webPort);assert.equal((await s.executeConfirmedStop(preview)).ok,true);
    external=null;
    // Noninteractive launch without explicit confirmation must leave the port free.
    const noConfirm=await invoke(['launch','web','--config',store.filePath]);assert.notEqual(noConfirm.code,0);assert.match(noConfirm.stderr,/No confirmation/);
    assert.equal((await adapter.listPortObservations({ports:[webPort]})).length,0);
    const launched=await invoke(['launch','web','--yes','--json','--config',store.filePath]);assert.equal(launched.code,0,launched.stderr);
    web=JSON.parse(launched.stdout).run;assert.match(launched.stderr,/Argument array/);
    api=(await s.launchProject('api')).run;assert.equal(api.status,'running',api.lastError);
    const beforeApi=(await (await fetch('http://127.0.0.1:'+apiPort)).json()).pid;
    const restart=await invoke(['restart',String(webPort),'--pid',String(web.pid),'--yes','--json','--config',store.filePath]);
    assert.equal(restart.code,0,restart.stderr);const restarted=JSON.parse(restart.stdout);web=restarted.newRun;
    assert.notEqual(restarted.previousPid,web.pid);
    const served=await (await fetch('http://127.0.0.1:'+webPort)).json();
    assert.equal(served.pid,web.pid);assert.equal(served.args[2],'literal $() & ; arg');
    assert.equal((await (await fetch('http://127.0.0.1:'+apiPort)).json()).pid,beforeApi);
    const exact=await s.inspectDashboard({ports:[webPort,apiPort]});
    assert.equal(exact.portMatches.find(row=>row.port===webPort).confidence,'exact-managed');
    const [failurePort]=await freePorts();
    const missing=make('missing','Missing Executable',failurePort);missing.launchExecutable=path.join(dir,'no-such-executable.exe');
    s.saveProject(missing);const failure=await s.launchProject('missing');assert.equal(failure.ok,false);assert.match(failure.message,/ENOENT|not found/i);
    assert.equal(store.load().projects.length,3);
    // Real child exit is reconciled as an observed exit on the next refresh.
    const stoppedApi=await adapter.stopProcessBound({pid:api.pid,expectedStartTime:api.processStartTime,expectedExecutablePath:api.executablePath});
    assert.equal(stoppedApi.stopped,true);api=null;
    const reconciled=await s.inspectDashboard({ports:[webPort,apiPort]});
    assert.equal(reconciled.recentRuns.find(r=>r.projectId==='api').status,'exited');
    t.diagnostic(JSON.stringify({webPort,apiPort,restartedPid:web.pid,secondAppUnaffected:true,nativeMismatchRefused:true,unconfirmedLaunchRefused:true,missingExecutableHandled:true,exitReconciled:true}));
  } finally {
    for(const r of [external,web,api])if(r?.pid) {
      const stopped=await adapter.stopProcessBound({pid:r.pid,expectedStartTime:r.processStartTime,expectedExecutablePath:r.executablePath});
      if(!stopped.stopped)t.diagnostic('Cleanup outcome for test PID '+r.pid+': '+stopped.code);
    }
    const resolved=path.resolve(dir);
    if(!resolved.startsWith(base+path.sep)||!path.basename(resolved).startsWith('portsteward-live-'))throw new Error('Unexpected test cleanup path.');
    fs.rmSync(resolved,{recursive:true,force:true});
  }
});
