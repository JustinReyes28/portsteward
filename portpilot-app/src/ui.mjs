export function printable(value) {
  return String(value ?? '').replace(/\x1b\[[0-?]*[ -/]*[@-~]/g,'').replace(/[\u0000-\u001f\u007f-\u009f]/g,' ');
}
export function wrapText(value,width) {
  const text=printable(value);const lines=[];
  for(let i=0;i<text.length;i+=width)lines.push(text.slice(i,i+width));
  return lines.length?lines:[''];
}
export function renderDashboardFrame(dashboard,{activeTab='OVERVIEW',selectedIndex=0,selectedPort=null,actionPreview=null,
  bannerMessage='',uiState='NORMAL',theme='dark',width=100,height=40,detailOffset=0}={}) {
  if(width<40||height<10)return 'PortSteward: enlarge terminal to at least 40 columns and 10 rows.\n';
  width=Math.min(width,160);height=Math.max(10,height);
  const lines=['PortSteward 0.1.0-alpha.1 | '+theme.toUpperCase()+' | '+uiState,
    '[1] Projects  [2] Ports  [3] Details  [4] History | '+activeTab,
    '-'.repeat(width)];
  if(bannerMessage)lines.push(...wrapText(bannerMessage,width).slice(0,3));
  if(dashboard.recoveryNotice)lines.push(...wrapText(dashboard.recoveryNotice,width));
  const projectLine=p=>(p.favorite?'* ':'  ')+p.id+' | '+p.name+' | '+p.expectedPorts.join(',')+' | group: '+(p.group||'-');
  const portLine=m=>(m.port===selectedPort?'> ':'')+m.port+' PID '+(m.observation.pid??'?')+' '+m.confidence+' | '+
    (m.primaryProject?.name||'Owner unverified')+
    (m.conflictProjects.length?' | CONFLICT('+m.matchedProjects.length+') configured: '+m.matchedProjects.map(p=>p.name).join(','):'');
  const selected=dashboard.portMatches[selectedIndex];
  let body=[];
  if(activeTab==='PROJECTS')body=dashboard.projects.map(projectLine);
  else if(activeTab==='PORTS')body=dashboard.portMatches.map(portLine);
  else if(activeTab==='HISTORY')body=dashboard.recentRuns.map(r=>r.status.toUpperCase()+' | '+r.projectName+' | port '+r.port+' | PID '+(r.pid||'-')+(r.lastError?' | '+r.lastError:''));
  else if(activeTab==='DETAILS') {
    if(selected) {
      const o=selected.observation;
      body=['Port: '+o.port+' | Address: '+o.localAddress,'PID: '+o.pid,'Start token: '+(o.processStartTime||'unavailable'),
        'Executable: '+(o.executablePath||'unavailable'),'Command: '+(o.command||'unavailable'),'Observed: '+o.observedAt,
        'Evidence: '+selected.confidence,selected.explanation,'Configured candidates: '+selected.matchedProjects.map(p=>p.name).join(', ')];
    }
  } else {
    body=['SAVED PROJECTS',...dashboard.projects.map(projectLine),'LIVE LISTENERS',...dashboard.portMatches.map(portLine),
      'HISTORY',...dashboard.recentRuns.slice(0,4).map(r=>r.status+' '+r.projectName)];
  }
  if(!body.length)body=[activeTab==='PROJECTS'?'No profiles. Press A to add a project.':activeTab==='HISTORY'?'No launches recorded.':'No matching listeners. Space refreshes; / changes the project filter.'];
  const footer=['-'.repeat(width),
    'Tab/1-4 views | Up/Down select | Space refresh | F favorites | / project | G group',
    activeTab==='PROJECTS'?'A add E edit D delete L launch V favorite U undo I import X export':'Enter details | S preview stop | R preview managed restart',
    'T theme | Q quit | Esc cancel | '+dashboard.projects.length+' profiles, '+dashboard.portMatches.length+' listeners'];
  const room=Math.max(1,height-lines.length-footer.length);
  if(activeTab==='DETAILS') {
    const wrapped=body.flatMap(line=>wrapText(line,width));
    lines.push(...wrapped.slice(detailOffset,detailOffset+room));
    if(wrapped.length>detailOffset+room)lines[lines.length-1]='More details below; Down scrolls.';
  } else {
    const offset=activeTab==='OVERVIEW'?0:Math.max(0,selectedIndex-room+1);
    const visible=body.slice(offset,offset+room);
    lines.push(...visible.map((line,index)=>printable((activeTab!=='OVERVIEW'&&index+offset===selectedIndex?'> ':'  ')+line).slice(0,width)));
  }
  if(actionPreview)lines.push(...formatPreview(actionPreview).flatMap(line=>wrapText(line,width)));
  return lines.concat(footer).map(line=>printable(line).slice(0,width)).join('\n');
}
export function formatPreview(p) {
  if(p.kind==='launch')return ['LAUNCH PREVIEW','Project: '+p.project.name,'Folder: '+p.project.rootPath,
    'Executable: '+p.project.launchExecutable,'Argument array: '+JSON.stringify(p.project.launchArgs),'Expected port: '+p.port];
  return [p.kind==='restart'?'RESTART PREVIEW':'STOP PREVIEW','Project: '+(p.projectName||'unverified'),
    'Port/address: '+p.port+' / '+(p.localAddress||'?'),'PID: '+p.pid,'Start token: '+p.processStartTime,
    'Executable: '+p.executablePath,'Command: '+(p.command||'unavailable'),'Evidence: '+p.confidence,
    p.restartPolicyNote||p.reason||'',
    ...(p.kind==='restart'&&p.run?['Restart executable: '+p.run.launchExecutable,'Restart args: '+JSON.stringify(p.run.launchArgs),'Restart folder: '+p.run.rootPath]:[])].map(printable);
}
