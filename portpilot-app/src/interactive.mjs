import readline from 'node:readline';
import fs from 'node:fs';
import {renderDashboardFrame,formatPreview,printable} from './ui.mjs';

export async function runInteractive(supervisor,{input=process.stdin,output=process.stdout,theme='dark'}={}) {
  if(!input.isTTY||!output.isTTY)throw new Error('Interactive mode needs a terminal. Use list --json for scripts.');
  const state={tab:'PORTS',index:0,detailOffset:0,favorites:false,project:null,group:null,banner:'',uiState:'NORMAL',busy:false,prompt:null};
  let dashboard={projects:[],portMatches:[],recentRuns:[]};
  let finish;
  const done=new Promise(resolve=>{finish=resolve;});
  const draw=()=>{
    const width=output.columns||100,height=output.rows||30;
    const frame=renderDashboardFrame(dashboard,{activeTab:state.tab,selectedIndex:state.index,detailOffset:state.detailOffset,
      bannerMessage:state.banner,uiState:state.uiState,theme,width,height});
    const accent=theme==='light'?'\x1b[34m':'\x1b[96m';
    output.write('\x1b[2J\x1b[H'+accent+frame.split('\n')[0]+'\x1b[0m\n'+frame.split('\n').slice(1).join('\n')+'\n');
    if(state.prompt)output.write(printable(state.prompt.label)+'\n> '+printable(state.prompt.value));
  };
  const refresh=async()=> {
    state.uiState='LOADING';draw();
    dashboard=await supervisor.inspectDashboard({filterProjectId:state.project,favoritesOnly:state.favorites,group:state.group});
    state.uiState='NORMAL';draw();
  };
  const ask=(label,initial='')=>new Promise((resolve,reject)=>{
    state.prompt={label,value:'',initial,resolve,reject};draw();
  });
  const confirm=async(preview,word)=> {
    const answer=await ask(formatPreview(preview).join(' | ')+'\nType '+word+' to confirm, or Esc to cancel:');
    return answer===word;
  };
  const form=async(existing)=> {
    const field=async(label,value='')=>{
      const entered=await ask(label+(value?' [blank keeps '+printable(value)+']':'')+':');
      return entered||value;
    };
    const id=existing?.id||await field('Project id');
    const name=await field('Name',existing?.name||id);
    const rootPath=await field('Absolute project folder',existing?.rootPath||process.cwd());
    const ports=await field('Expected ports, comma separated',existing?.expectedPorts.join(',')||'3000');
    const executable=await field('Launch executable (no shell command)',existing?.launchExecutable||process.execPath);
    const args=JSON.parse(await field('Launch args as a JSON array',JSON.stringify(existing?.launchArgs||[])));
    const groupAnswer=await field('Group (- clears)',existing?.group||'');
    supervisor.saveProject({id,name,rootPath,expectedPorts:ports.split(',').map(Number),launchExecutable:executable,launchArgs:args,
      favorite:existing?.favorite||false,group:groupAnswer==='-'?'':groupAnswer});
  };
  const cancel=()=>{supervisor.cancelPreview();state.banner='Cancelled; no process changed.';state.uiState='CANCELLED';};
  const keyHandler=async(text,key={})=> {
    if(state.prompt) {
      const prompt=state.prompt;
      if(key.name==='escape'||(key.ctrl&&key.name==='c')) {state.prompt=null;prompt.reject(Object.assign(new Error('Cancelled'),{cancelled:true}));return;}
      if(key.name==='return') {state.prompt=null;prompt.resolve(prompt.value||prompt.initial);return;}
      if(key.name==='backspace')prompt.value=prompt.value.slice(0,-1);
      else if(text&&!key.ctrl&&!key.meta&&key.name!=='tab')prompt.value+=text.replace(/[\u0000-\u001f\u007f]/g,'');
      draw();return;
    }
    if(key.ctrl&&key.name==='c'){finish();return;}
    if(state.busy)return;
    const char=String(text||'').toLowerCase();
    if(char==='q'){finish();return;}
    state.busy=true;
    try {
      const tabs=['PROJECTS','PORTS','DETAILS','HISTORY'];
      if(['1','2','3','4'].includes(char)||key.name==='tab') {
        supervisor.cancelPreview();state.tab=key.name==='tab'?tabs[(tabs.indexOf(state.tab)+1)%4]:tabs[Number(char)-1];state.index=0;state.detailOffset=0;
      } else if(key.name==='up'||key.name==='down') {
        const delta=key.name==='up'?-1:1;
        if(state.tab==='DETAILS')state.detailOffset=Math.max(0,state.detailOffset+delta);
        else {const length=state.tab==='PROJECTS'?dashboard.projects.length:state.tab==='HISTORY'?dashboard.recentRuns.length:dashboard.portMatches.length;state.index=Math.min(Math.max(0,length-1),Math.max(0,state.index+delta));}
      } else if(key.name==='escape'){cancel();}
      else if(char==='t'){theme=theme==='dark'?'light':'dark';}
      else if(char==='f'){supervisor.cancelPreview();state.favorites=!state.favorites;state.index=0;await refresh();}
      else if(char==='/'){supervisor.cancelPreview();state.project=await ask('Project id filter (blank clears):')||null;state.index=0;await refresh();}
      else if(char==='g'){supervisor.cancelPreview();state.group=await ask('Group filter (blank clears):')||null;state.index=0;await refresh();}
      else if(char===' '){supervisor.cancelPreview();await refresh();}
      else if(state.tab==='PROJECTS') {
        const project=dashboard.projects[state.index];
        if(char==='a')await form();
        else if(char==='e'&&project)await form(project);
        else if(char==='d'&&project){if(await ask('Delete '+project.name+'? Type DELETE; Esc cancels:')==='DELETE')supervisor.store.removeProject(project.id);else cancel();}
        else if(char==='v'&&project)supervisor.store.toggleFavorite(project.id);
        else if(char==='u')supervisor.store.undoLastProjectEdit();
        else if(char==='l'&&project) {
          const preview=supervisor.previewLaunch(project.id);
          if(await confirm(preview,'LAUNCH')){state.banner='Launching saved command...';draw();const result=await supervisor.executeConfirmedLaunch(preview);state.banner=result.message;state.uiState=result.ok?'COMPLETED':'FAILURE';}else cancel();
        } else if(char==='x'){const file=await ask('Export destination (new JSON file):');fs.writeFileSync(file,supervisor.store.exportProfilesJson(),{flag:'wx'});state.banner='Exported profiles to '+file;}
        else if(char==='i'){const file=await ask('Profile JSON to import (merge only; does not run commands):');const data=fs.readFileSync(file,'utf8');if(await ask('Merge profiles from '+file+'? Type IMPORT:')==='IMPORT')supervisor.store.importProfilesJson(data);else cancel();}
        const message=state.banner,uiState=state.uiState;await refresh();state.banner=message;state.uiState=uiState;
      } else if(state.tab==='PORTS'||state.tab==='DETAILS') {
        const match=dashboard.portMatches[state.index];
        if(key.name==='return'){state.tab='DETAILS';state.detailOffset=0;}
        else if((char==='s'||char==='r')&&match) {
          const options={pid:match.observation.pid,address:match.observation.localAddress};
          const preview=char==='r'?await supervisor.previewRestartByPort(match.port,options):await supervisor.previewStopByPort(match.port,options);
          if(!preview.canStop)throw new Error(preview.reason);
          if(await confirm(preview,char==='r'?'RESTART':'STOP')) {
            state.banner='Applying confirmed action...';draw();
            const result=char==='r'?await supervisor.executeConfirmedRestart(preview):await supervisor.executeConfirmedStop(preview);
            await refresh();state.banner=result.message;state.uiState=result.ok?'COMPLETED':'FAILURE';
          }else cancel();
        }
      }
    } catch(error){supervisor.cancelPreview();state.banner=error.cancelled?'Cancelled; no process changed.':error.message;state.uiState=error.cancelled?'CANCELLED':'FAILURE';}
    finally{state.busy=false;draw();}
  };
  const resized=()=>draw();
  readline.emitKeypressEvents(input);input.setRawMode(true);input.resume();
  input.on('keypress',keyHandler);output.on('resize',resized);
  try{
    try{await refresh();}catch(error){state.banner=error.message;state.uiState='FAILURE';draw();}
    await done;
  }
  finally{supervisor.cancelPreview();input.off('keypress',keyHandler);output.off('resize',resized);input.setRawMode(false);input.pause();output.write('\x1b[0m\nPortSteward closed. Managed servers remain running; reopen to inspect them.\n');}
}
