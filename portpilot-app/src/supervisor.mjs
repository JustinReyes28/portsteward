import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {OwnershipConfidence,evaluateObservationOwnership,validateProjectInput} from './domain.mjs';
export class PortPilotSupervisor {
  constructor({store,adapter}) {this.store=store;this.adapter=adapter;this.previews=new Map();}
  async inspectDashboard({filterProjectId=null,favoritesOnly=false,group=null,ports}={}) {
    let state=this.store.load();const recoveryNotice=this.store.lastRecoveryNotice;
    const observations=await this.adapter.listPortObservations({ports});
    for(const run of state.managedRuns.filter(r=>r.status==='running')) {
      const live=await this.adapter.getProcessByPid(run.pid);
      if(!live||(!live.accessDenied&&live.processStartTime!==run.processStartTime)) {
        this.store.recordManagedRun({runId:run.runId,status:'exited',endedAt:new Date().toISOString(),lastError:live?'Recorded identity no longer matches.':null});
      }
    }
    state=this.store.load();
    const include=p=>(!favoritesOnly||p.favorite)&&(!filterProjectId||p.id===filterProjectId)&&(!group||p.group===group);
    const projects=state.projects.filter(include);
    const matches=observations.map(obs=>evaluateObservationOwnership(obs,state.projects,state.managedRuns));
    return {observedAt:new Date().toISOString(),projects,allProjectsCount:state.projects.length,
      portMatches:matches.filter(m=>(!favoritesOnly&&!filterProjectId&&!group)||m.matchedProjects.some(include)),
      recentRuns:state.managedRuns.filter(r=>(!filterProjectId||r.projectId===filterProjectId)&&(!favoritesOnly&&!group||projects.some(p=>p.id===r.projectId))).slice(0,100),recoveryNotice};
  }
  saveProject(input){return this.store.upsertProject(validateProjectInput(input));}
  cancelPreview(){this.previews.clear();}
  _issue(payload) {
    this.previews.clear();
    const token={...structuredClone(payload),token:randomUUID(),expiresAt:Date.now()+10*60*1000};
    this.previews.set(token.token,structuredClone(token));return token;
  }
  _consume(input,kind) {
    const token=this.previews.get(input?.token);this.previews.clear();
    if(!token||token.kind!==kind||token.expiresAt<Date.now())throw new Error('Preview expired, cancelled or already used. Preview the action again.');
    return token;
  }
  async previewStopByPort(port,{pid=null,address=null}={}) {
    this.cancelPreview();
    const state=this.store.load();
    const rows=(await this.adapter.listPortObservations({ports:[Number(port)]})).filter(row=>row.port===Number(port)&&(!pid||row.pid===Number(pid))&&(!address||row.localAddress===address));
    const identities=new Set(rows.map(r=>r.pid+':'+r.processStartTime));
    if(!rows.length)return {canStop:false,canRestart:false,port:Number(port),reason:'No active listener found on port '+port+'.'};
    if(identities.size>1)return {canStop:false,canRestart:false,port:Number(port),reason:'Multiple processes listen on this port. Select its PID and address explicitly.'};
    const obs=rows[0];const ownership=evaluateObservationOwnership(obs,state.projects,state.managedRuns);
    if(obs.accessDenied||!obs.pid||!obs.processStartTime||!obs.executablePath)return {canStop:false,canRestart:false,port:obs.port,pid:obs.pid,reason:'Stop unavailable: identity details are inaccessible due to OS privilege boundaries.'};
    if(!this.adapter.enforceIdentityBindingSupported)return {canStop:false,canRestart:false,port:obs.port,pid:obs.pid,reason:'Current OS adapter cannot guarantee identity-bound process termination.'};
    const managed=ownership.confidence===OwnershipConfidence.EXACT_MANAGED;
    return this._issue({kind:'stop',canStop:true,canRestart:managed,port:obs.port,pid:obs.pid,localAddress:obs.localAddress,
      processStartTime:obs.processStartTime,executablePath:obs.executablePath,command:obs.command,workingDirectory:obs.workingDirectory,
      projectName:ownership.primaryProject?.name||ownership.managedRun?.projectName||null,projectId:ownership.primaryProject?.id||ownership.managedRun?.projectId||null,
      managedRunId:ownership.managedRun?.runId||null,run:ownership.managedRun||null,confidence:ownership.confidence,
      conflictProjects:ownership.conflictProjects.map(p=>p.name),restartPolicyNote:managed?'Exact managed run; eligible for controlled restart.':'External process: restart is unavailable; no launch command is inferred.'});
  }
  async _stop(preview) {
    const live=await this.adapter.getProcessByPid(preview.pid);
    if(!live||live.accessDenied||live.processStartTime!==preview.processStartTime)
      return {ok:false,code:'IDENTITY_MISMATCH_PID_REUSED',message:'Stop refused (PID Reuse Protection): process identity changed or is unavailable.'};
    const result=await this.adapter.stopProcessBound({pid:preview.pid,expectedStartTime:preview.processStartTime,expectedExecutablePath:preview.executablePath});
    if(result.stopped&&preview.managedRunId) {
      try {this.store.recordManagedRun({runId:preview.managedRunId,status:'stopped',endedAt:result.stoppedAt});}
      catch(error){return {ok:true,historyUpdated:false,code:'STOPPED_HISTORY_WRITE_FAILED',message:'Process stopped, but history could not be saved: '+error.message,pid:preview.pid,port:preview.port};}
    }
    return {ok:result.stopped,code:result.code,message:result.message,pid:preview.pid,port:preview.port};
  }
  async executeConfirmedStop(input) {
    try{return await this._stop(this._consume(input,'stop'));}
    catch(error){return {ok:false,code:'INVALID_PREVIEW_TOKEN',message:input?.reason||error.message};}
  }
  previewLaunch(projectId,{preferredPort=null}={}) {
    const project=this.store.load().projects.find(p=>p.id===projectId);
    if(!project)throw new Error('Project "'+projectId+'" not found.');
    const port=preferredPort===null?project.expectedPorts[0]:Number(preferredPort);
    if(!project.expectedPorts.includes(port))throw new Error('Choose one of this profile’s configured ports.');
    return this._issue({kind:'launch',project,port});
  }
  async _launch(project,port) {
    const runId='run-'+randomUUID();
    const logPath=path.join(path.dirname(this.store.filePath),'logs',runId+'.log');
    const outcome=await this.adapter.spawnManagedProcess({executable:project.launchExecutable,args:project.launchArgs,workingDirectory:project.rootPath,port,logPath});
    const entry={runId,projectId:project.id,projectName:project.name,port,
      launchExecutable:project.launchExecutable,launchArgs:[...project.launchArgs],rootPath:project.rootPath,logPath,
      pid:outcome.pid||null,processStartTime:outcome.processStartTime||null,executablePath:outcome.executablePath||null,
      startedAt:new Date().toISOString(),endedAt:outcome.launched?null:new Date().toISOString(),status:outcome.launched?'running':'failed',lastError:outcome.launched?null:outcome.message};
    let run;
    try {run=this.store.recordManagedRun(entry);}
    catch(error) {
      let cleanup='';
      if(outcome.launched) {
        const stopped=await this.adapter.stopProcessBound({pid:outcome.pid,expectedStartTime:outcome.processStartTime,expectedExecutablePath:outcome.executablePath});
        cleanup=stopped.stopped?' The newly launched process was stopped.':' Cleanup was refused; inspect PID '+outcome.pid+'.';
      }
      return {ok:false,code:'LAUNCH_HISTORY_WRITE_FAILED',message:'Run could not be recorded: '+error.message+cleanup};
    }
    return {ok:outcome.launched,code:outcome.launched?'MANAGED_RUN_STARTED':outcome.code,run,runId,message:outcome.launched?'Launched "'+project.name+'" on port '+port+' with PID '+outcome.pid+'.':outcome.message};
  }
  async executeConfirmedLaunch(input) {
    try{const p=this._consume(input,'launch');return await this._launch(p.project,p.port);}
    catch(error){return {ok:false,code:'LAUNCH_REFUSED',message:error.message};}
  }
  async launchProject(id,options={}) {return this.executeConfirmedLaunch(this.previewLaunch(id,options));}
  async previewRestartByPort(port,options={}) {
    const p=await this.previewStopByPort(port,options);
    if(!p.canStop)return {...p,reason:p.reason||'Stop unavailable.'};
    if(!p.canRestart){this.cancelPreview();return {...p,canStop:false,reason:'Restart refused: process was not launched by PortSteward.'};}
    return this._issue({...p,kind:'restart'});
  }
  async executeConfirmedRestart(input) {
    try {
      const p=this._consume(input,'restart');
      if(!p.run||!p.canRestart)return {ok:false,code:'UNMANAGED_PROCESS_RESTART_REFUSED',message:'Restart requires an exact managed run.'};
      const stopped=await this._stop(p);if(!stopped.ok)return stopped;
      if(stopped.historyUpdated===false)return {...stopped,ok:false,code:'RESTART_HISTORY_WRITE_FAILED',message:'Process stopped; restart refused because history could not be saved.'};
      const original=validateProjectInput({id:p.run.projectId,name:p.run.projectName,rootPath:p.run.rootPath,
        expectedPorts:[p.run.port],launchExecutable:p.run.launchExecutable,launchArgs:p.run.launchArgs});
      const launched=await this._launch(original,p.run.port);
      if(!launched.ok)return {...launched,message:'Process stopped, but re-launch failed: '+launched.message};
      return {ok:true,code:'MANAGED_RUN_RESTARTED',previousPid:p.pid,previousRunId:p.managedRunId,newRun:launched.run,
        message:'Restarted "'+p.projectName+'" on port '+p.port+': stopped PID '+p.pid+' and launched PID '+launched.run.pid+'.'};
    }catch(error){return {ok:false,code:'RESTART_REFUSED',message:error.message};}
  }
  async restartByPort(port) {
    const p=await this.previewRestartByPort(port);
    if(!p.canRestart)return {ok:false,code:'UNMANAGED_PROCESS_RESTART_REFUSED',message:p.reason};
    return this.executeConfirmedRestart(p);
  }
}
