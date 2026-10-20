import fs from 'node:fs';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {SCHEMA_VERSION,validateProjectInput} from './domain.mjs';
function profiles(items) {
  if(!Array.isArray(items))throw new Error('Config projects must be an array.');
  const result=items.map(validateProjectInput);
  if(new Set(result.map(p=>p.id)).size!==result.length)throw new Error('Duplicate project ids.');
  return result;
}
export class RegistryStore {
  constructor(filePath) {
    this.filePath=path.resolve(filePath);this.bakPath=this.filePath+'.bak';
    this.lockPath=this.filePath+'.lock';this.lastRecoveryNotice=null;
  }
  createDefaultState(){return {schemaVersion:SCHEMA_VERSION,updatedAt:new Date().toISOString(),projects:[],managedRuns:[],undoProjects:null};}
  _validate(parsed) {
    if(!parsed||typeof parsed!=='object'||Array.isArray(parsed))throw new Error('Root config must be an object.');
    if(parsed.schemaVersion!==SCHEMA_VERSION) {
      const error=new Error('Unsupported schemaVersion '+parsed.schemaVersion+'. The original file was preserved.');
      error.code='UNSUPPORTED_SCHEMA';throw error;
    }
    if(!Array.isArray(parsed.managedRuns))throw new Error('Config managedRuns must be an array.');
    for(const r of parsed.managedRuns) {
      if(!r||typeof r.runId!=='string'||typeof r.projectId!=='string'||!['running','exited','failed','stopped'].includes(r.status))throw new Error('Invalid managed-run history.');
      if(r.status==='running'&&(!Number.isInteger(r.pid)||r.pid<=0||typeof r.processStartTime!=='string'||!r.processStartTime))throw new Error('Running history requires a valid identity.');
    }
    if(new Set(parsed.managedRuns.map(r=>r.runId)).size!==parsed.managedRuns.length)throw new Error('Duplicate run ids.');
    return {...parsed,projects:profiles(parsed.projects),undoProjects:parsed.undoProjects?profiles(parsed.undoProjects):null};
  }
  _read(target){return this._validate(JSON.parse(fs.readFileSync(target,'utf8')));}
  _lock(fn) {
    fs.mkdirSync(path.dirname(this.filePath),{recursive:true});
    let fd;
    try{fd=fs.openSync(this.lockPath,'wx');}
    catch(error){if(error.code==='EEXIST')throw new Error('Registry locked by another writer. Close other commands; verify any crashed writer has exited before removing '+this.lockPath);throw error;}
    try{fs.writeFileSync(fd,JSON.stringify({pid:process.pid,createdAt:new Date().toISOString()}));return fn();}
    finally{fs.closeSync(fd);fs.unlinkSync(this.lockPath);}
  }
  _atomic(target,text) {
    const temp=target+'.'+randomUUID()+'.tmp';let fd;
    try{fd=fs.openSync(temp,'wx');fs.writeFileSync(fd,text,'utf8');fs.fsyncSync(fd);fs.closeSync(fd);fd=undefined;fs.renameSync(temp,target);}
    finally{if(fd!==undefined)fs.closeSync(fd);if(fs.existsSync(temp))fs.unlinkSync(temp);}
  }
  _write(state) {
    const validated=this._validate({...state,updatedAt:new Date().toISOString()});
    const payload=JSON.stringify(validated,null,2)+'\n';
    this._atomic(this.filePath,payload);
    try{this._atomic(this.bakPath,payload);}catch(error){throw new Error('Registry primary was saved, but backup update failed: '+error.message);}
    return validated;
  }
  _load() {
    this.lastRecoveryNotice=null;
    if(!fs.existsSync(this.filePath)&&!fs.existsSync(this.bakPath))return this.createDefaultState();
    try{return this._read(this.filePath);}
    catch(error) {
      if(error.code==='UNSUPPORTED_SCHEMA')throw error;
      if(!fs.existsSync(this.bakPath))throw new Error('Registry could not be loaded: '+error.message);
      const recovered=this._read(this.bakPath);
      if(fs.existsSync(this.filePath))fs.renameSync(this.filePath,this.filePath+'.corrupt-'+Date.now());
      this._write(recovered);this.lastRecoveryNotice='Recovered registry from backup after missing or corrupt primary file. Corrupt content was preserved.';
      return recovered;
    }
  }
  load(){return this._lock(()=>this._load());}
  _edit(fn){return this._lock(()=>{const state=this._load();const result=fn(state);this._write(state);return result;});}
  upsertProject(input) {
    const validated=validateProjectInput(input);
    return this._edit(state=>{
      const index=state.projects.findIndex(p=>p.id===validated.id);state.undoProjects=structuredClone(state.projects);
      const project={...validated,createdAt:index<0?validated.createdAt:state.projects[index].createdAt,updatedAt:new Date().toISOString()};
      if(index<0)state.projects.push(project);else state.projects[index]=project;return project;
    });
  }
  removeProject(id){return this._edit(state=>{
    const found=state.projects.find(p=>p.id===id);if(!found)throw new Error('Project "'+id+'" not found.');
    state.undoProjects=structuredClone(state.projects);state.projects=state.projects.filter(p=>p.id!==id);return found;
  });}
  toggleFavorite(id){return this._edit(state=>{
    const project=state.projects.find(p=>p.id===id);if(!project)throw new Error('Project "'+id+'" not found.');
    state.undoProjects=structuredClone(state.projects);project.favorite=!project.favorite;project.updatedAt=new Date().toISOString();return project;
  });}
  undoLastProjectEdit(){return this._edit(state=>{
    if(!state.undoProjects)throw new Error('No recent project registry edit is available to undo.');
    state.projects=state.undoProjects;state.undoProjects=null;return state.projects;
  });}
  recordManagedRun(entry){return this._edit(state=>{
    const index=state.managedRuns.findIndex(r=>r.runId===entry.runId);const record=index<0?entry:{...state.managedRuns[index],...entry};
    if(index<0)state.managedRuns.unshift(record);else state.managedRuns[index]=record;
    let completed=0;state.managedRuns=state.managedRuns.filter(r=>r.status==='running'||++completed<=100);return record;
  });}
  exportProfilesJson(){return JSON.stringify({schemaVersion:SCHEMA_VERSION,projects:this.load().projects},null,2)+'\n';}
  importProfilesJson(text,{merge=true}={}) {
    const parsed=JSON.parse(text);if(parsed?.schemaVersion!==SCHEMA_VERSION)throw new Error('Unsupported import schema version.');
    const incoming=profiles(parsed.projects);
    return this._edit(state=>{
      state.undoProjects=structuredClone(state.projects);
      if(!merge)state.projects=incoming;else for(const p of incoming){const index=state.projects.findIndex(x=>x.id===p.id);if(index<0)state.projects.push(p);else state.projects[index]=p;}
      return state.projects;
    });
  }
}
