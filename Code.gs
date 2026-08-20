const SHEET_NAME = 'Tasks';
const HEADERS = ['ID','Task','Owner','Priority','Status','Progress','Latest Update','Created At','Updated At'];

function setupSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);
  sheet.clear();
  sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
  sheet.setFrozenRows(1);
  sheet.getRange('A1:I1').setFontWeight('bold').setBackground('#0f4c81').setFontColor('#ffffff');
  sheet.setColumnWidths(1, 1, 170); sheet.setColumnWidth(2, 260); sheet.setColumnWidth(3, 120);
  sheet.setColumnWidth(4, 100); sheet.setColumnWidth(5, 140); sheet.setColumnWidth(6, 90);
  sheet.setColumnWidth(7, 480); sheet.setColumnWidths(8, 2, 160);
  sheet.getRange('D2:D').setDataValidation(SpreadsheetApp.newDataValidation().requireValueInList(['High','Medium','Low'], true).build());
  sheet.getRange('E2:E').setDataValidation(SpreadsheetApp.newDataValidation().requireValueInList(['Not Started','In Progress','At Risk','Blocked','Near Completion','Completed'], true).build());
  sheet.getRange('F2:F').setDataValidation(SpreadsheetApp.newDataValidation().requireNumberBetween(0,5).build()).setNumberFormat('0');
  sheet.getRange('H2:I').setNumberFormat('yyyy-mm-dd hh:mm');
}

function doGet(e) {
  try { return json_({ok:true, tasks:listTasks_()}); }
  catch (err) { return json_({ok:false,error:String(err.message||err)}); }
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(15000);
    const body = JSON.parse((e.postData && e.postData.contents) || '{}');
    if (body.action === 'create') return json_({ok:true, task:createTask_(body)});
    if (body.action === 'update') return json_({ok:true, task:updateTask_(body)});
    return json_({ok:false,error:'Unknown action'});
  } catch (err) { return json_({ok:false,error:String(err.message||err)}); }
  finally { try { lock.releaseLock(); } catch (_) {} }
}

function listTasks_() {
  const sheet = getSheet_(); const last = sheet.getLastRow(); if (last < 2) return [];
  return sheet.getRange(2,1,last-1,HEADERS.length).getValues().filter(r=>r[0]).map(rowToTask_);
}
function createTask_(b) {
  validate_(b); const now=new Date(); const id=Utilities.getUuid();
  getSheet_().appendRow([id,b.task.trim(),b.owner.trim(),b.priority,b.status,Number(b.progress),b.update||'',now,now]);
  return {id:id};
}
function updateTask_(b) {
  validate_(b); if(!b.id) throw new Error('Missing task ID'); const sheet=getSheet_(); const finder=sheet.getRange(2,1,Math.max(sheet.getLastRow()-1,1),1).createTextFinder(b.id).matchEntireCell(true).findNext();
  if(!finder) throw new Error('Task not found'); const row=finder.getRow(); const created=sheet.getRange(row,8).getValue()||new Date();
  sheet.getRange(row,1,1,HEADERS.length).setValues([[b.id,b.task.trim(),b.owner.trim(),b.priority,b.status,Number(b.progress),b.update||'',created,new Date()]]); return {id:b.id};
}
function validate_(b) {
  const statuses=['Not Started','In Progress','At Risk','Blocked','Near Completion','Completed']; const priorities=['High','Medium','Low'];
  if(!b.task||!b.owner) throw new Error('Task and owner are required'); if(!priorities.includes(b.priority)) throw new Error('Invalid priority'); if(!statuses.includes(b.status)) throw new Error('Invalid status'); if(Number(b.progress)<0||Number(b.progress)>5) throw new Error('Progress must be 0–5');
}
function rowToTask_(r){return {id:String(r[0]),task:String(r[1]||''),owner:String(r[2]||''),priority:String(r[3]||''),status:String(r[4]||''),progress:Number(r[5]||0),update:String(r[6]||''),createdAt:date_(r[7]),updatedAt:date_(r[8])}}
function date_(v){return v instanceof Date?v.toISOString():String(v||'')}
function getSheet_(){const s=SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);if(!s)throw new Error('Run setupSheet() once first');return s}
function json_(data){return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON)}