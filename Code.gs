const SHEET_NAME='Tasks';
const HEADERS=['ID','Task','Owner','Priority','Status','Progress','Latest Update','Manager Attention','Decision / Support Required','Archived','Created At','Updated At'];

function setupSheet(){
  const ss=SpreadsheetApp.getActiveSpreadsheet();
  const sh=ss.getSheetByName(SHEET_NAME)||ss.insertSheet(SHEET_NAME);
  sh.clear();
  sh.getRange(1,1,1,HEADERS.length).setValues([HEADERS]);
  formatSheet_(sh);
}

function upgradeSheetToV2(){
  const sh=SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  if(!sh)throw new Error('Tasks sheet not found');
  const old=sh.getRange(1,1,1,sh.getLastColumn()).getValues()[0];
  if(old.length===9&&old[0]==='ID'){
    sh.insertColumnsAfter(7,3);
    sh.getRange(1,1,1,HEADERS.length).setValues([HEADERS]);
    const rows=sh.getLastRow()-1;
    if(rows>0)sh.getRange(2,8,rows,3).setValues(Array.from({length:rows},()=>[false,'',false]));
  }else if(old.join('|')!==HEADERS.join('|')){
    throw new Error('Unexpected sheet columns. Back up the sheet and align the headers with HEADERS.');
  }
  formatSheet_(sh);
}

function formatSheet_(sh){
  sh.setFrozenRows(1);
  sh.getRange(1,1,1,HEADERS.length).setFontWeight('bold').setBackground('#0f4c81').setFontColor('#ffffff');
  [170,260,120,100,140,90,460,130,360,90,155,155].forEach((w,i)=>sh.setColumnWidth(i+1,w));
  sh.getRange('D2:D').setDataValidation(SpreadsheetApp.newDataValidation().requireValueInList(['High','Medium','Low'],true).build());
  sh.getRange('E2:E').setDataValidation(SpreadsheetApp.newDataValidation().requireValueInList(['Not Started','In Progress','At Risk','Blocked','Near Completion','Completed'],true).build());
  sh.getRange('F2:F').setDataValidation(SpreadsheetApp.newDataValidation().requireNumberBetween(0,5).build()).setNumberFormat('0');
  sh.getRange('H2:H').insertCheckboxes();
  sh.getRange('J2:J').insertCheckboxes();
  sh.getRange('K2:L').setNumberFormat('yyyy-mm-dd hh:mm');
}

function doGet(e){
  try{return output_({ok:true,tasks:list_(String(e.parameter.archived)==='true')});}
  catch(err){return output_({ok:false,error:String(err.message||err)});}
}

function doPost(e){
  const lock=LockService.getScriptLock();
  try{
    lock.waitLock(15000);
    const b=JSON.parse((e.postData&&e.postData.contents)||'{}');
    if(b.action==='create')return output_({ok:true,result:create_(b)});
    if(b.action==='update')return output_({ok:true,result:update_(b)});
    if(['archive','restore','delete'].includes(b.action))return output_({ok:true,result:lifecycle_(b.action,b.id)});
    return output_({ok:false,error:'Unknown action'});
  }catch(err){return output_({ok:false,error:String(err.message||err)});}
  finally{try{lock.releaseLock();}catch(_){}}
}

function list_(archived){
  const sh=sheet_(),last=sh.getLastRow();
  if(last<2)return [];
  return sh.getRange(2,1,last-1,HEADERS.length).getValues().filter(r=>r[0]&&Boolean(r[9])===archived).map(row_);
}

function create_(b){
  validate_(b);
  const id=Utilities.getUuid(),now=new Date();
  sheet_().appendRow([id,b.task.trim(),b.owner.trim(),b.priority,b.status,Number(b.progress),b.update||'',Boolean(b.managerAttention),b.support||'',false,now,now]);
  return id;
}

function update_(b){
  validate_(b);
  const sh=sheet_(),row=find_(sh,b.id);
  const created=sh.getRange(row,11).getValue()||new Date();
  const archived=Boolean(sh.getRange(row,10).getValue());
  sh.getRange(row,1,1,HEADERS.length).setValues([[b.id,b.task.trim(),b.owner.trim(),b.priority,b.status,Number(b.progress),b.update||'',Boolean(b.managerAttention),b.support||'',archived,created,new Date()]]);
  return b.id;
}

function lifecycle_(action,id){
  const sh=sheet_(),row=find_(sh,id);
  if(action==='delete'){
    if(!Boolean(sh.getRange(row,10).getValue()))throw new Error('Archive a task before deleting it permanently');
    sh.deleteRow(row);
    return 'deleted';
  }
  sh.getRange(row,10).setValue(action==='archive');
  sh.getRange(row,12).setValue(new Date());
  return action;
}

function validate_(b){
  const statuses=['Not Started','In Progress','At Risk','Blocked','Near Completion','Completed'];
  const priorities=['High','Medium','Low'];
  if(!b.task||!b.owner)throw new Error('Task and owner are required');
  if(!priorities.includes(b.priority))throw new Error('Invalid priority');
  if(!statuses.includes(b.status))throw new Error('Invalid status');
  const p=Number(b.progress);
  if(!Number.isInteger(p)||p<0||p>5)throw new Error('Progress must be 0 to 5');
}

function row_(r){return{id:String(r[0]),task:String(r[1]||''),owner:String(r[2]||''),priority:String(r[3]||''),status:String(r[4]||''),progress:Number(r[5]||0),update:String(r[6]||''),managerAttention:Boolean(r[7]),support:String(r[8]||''),archived:Boolean(r[9])};}
function find_(sh,id){if(!id)throw new Error('Missing task ID');const n=sh.getLastRow()-1;if(n<1)throw new Error('Task not found');const c=sh.getRange(2,1,n,1).createTextFinder(id).matchEntireCell(true).findNext();if(!c)throw new Error('Task not found');return c.getRow();}
function sheet_(){const sh=SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);if(!sh)throw new Error('Run setupSheet() first');return sh;}
function output_(data){return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);}
