const STATUSES=["Not Started","In Progress","At Risk","Blocked","Near Completion","Completed"];
const LABELS=["Not started","Initiated","Underway","Significant progress","Near completion","Completed"];
const $=s=>document.querySelector(s);
let tasks=[],archiveView=false,pendingAction=null;
const API=window.APP_CONFIG&&window.APP_CONFIG.API_URL;

function safe(v=""){return String(v).replace(/[&<>'"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[c]));}
function state(text,error=false){$("#state").textContent=text;$("#state").classList.toggle("error",error);}
async function api(action,payload={}){
  if(!API||!API.startsWith("https://script.google.com/macros/s/")||!API.endsWith("/exec"))throw new Error("Invalid Apps Script URL in config.js");
  const options=action==="list"?{cache:"no-store"}:{method:"POST",headers:{"Content-Type":"text/plain;charset=utf-8"},body:JSON.stringify({action,...payload})};
  const url=action==="list"?`${API}?archived=${archiveView}&t=${Date.now()}`:API;
  const response=await fetch(url,options);
  const text=await response.text();
  let data;try{data=JSON.parse(text);}catch(e){throw new Error("Apps Script did not return JSON. Check deployment access and redeploy Code.gs.");}
  if(!data.ok)throw new Error(data.error||"Apps Script request failed");
  return data;
}
async function load(){try{state("Loading...");tasks=(await api("list")).tasks||[];owners();render();state("Up to date");}catch(e){console.error(e);state(e.message,true);}}
function owners(){const old=$("#ownerFilter").value;const values=[...new Set(tasks.map(t=>t.owner).filter(Boolean))].sort();$("#ownerFilter").innerHTML='<option value="">All owners</option>'+values.map(v=>`<option value="${safe(v)}">${safe(v)}</option>`).join("");$("#ownerFilter").value=values.includes(old)?old:"";}
function visible(){const q=$("#searchInput").value.toLowerCase().trim(),s=$("#statusFilter").value,o=$("#ownerFilter").value,h=$("#hideCompleted").checked;return tasks.filter(t=>(!q||`${t.task} ${t.owner} ${t.update} ${t.support}`.toLowerCase().includes(q))&&(!s||t.status===s)&&(!o||t.owner===o)&&(!h||t.status!=="Completed"));}
function attention(t){return t.managerAttention||t.status==="At Risk"||t.status==="Blocked";}
function statusOptions(value){return STATUSES.map(s=>`<option value="${s}" ${s===value?"selected":""}>${s}</option>`).join("");}
function bars(t){const p=Number(t.progress)||0;return `<div class="bars">${[1,2,3,4,5].map(i=>`<button type="button" class="bar ${i<=p?"on":""}" data-progress="${i}" data-id="${safe(t.id)}" title="${i}/5 - ${LABELS[i]}"></button>`).join("")}<button type="button" class="reset" data-progress="0" data-id="${safe(t.id)}">0</button><span>${p}/5</span></div>`;}
function render(){const list=visible();$("#taskBody").innerHTML=list.map(t=>`<tr><td><strong>${safe(t.task)}</strong>${t.support?'<br><small>Support requested</small>':""}</td><td>${safe(t.owner)}</td><td>${safe(t.priority)}</td><td>${archiveView?safe(t.status):`<select data-status="${safe(t.id)}">${statusOptions(t.status)}</select>`}</td><td>${archiveView?`${t.progress}/5`:bars(t)}</td><td class="update" title="${safe(t.update)}">${safe(t.update)||"-"}</td><td>${attention(t)?'<span class="attention">Required</span>':"-"}</td><td class="actions">${archiveView?`<button data-restore="${safe(t.id)}">Restore</button><button class="danger" data-delete="${safe(t.id)}">Delete</button>`:`<button data-edit="${safe(t.id)}">Edit</button><button data-copy="${safe(t.id)}">Copy</button><button data-archive="${safe(t.id)}">Archive</button>`}</td></tr>`).join("");$("#empty").hidden=list.length>0;$("#totalCount").textContent=tasks.length;$("#activeCount").textContent=tasks.filter(t=>t.status!=="Completed").length;$("#attentionCount").textContent=tasks.filter(attention).length;$("#completedCount").textContent=tasks.filter(t=>t.status==="Completed").length;}
function openForm(t={}){$("#formTitle").textContent=t.id?"Edit task":"Add task";$("#taskId").value=t.id||"";$("#taskName").value=t.task||"";$("#taskOwner").value=t.owner||"Viom";$("#taskPriority").value=t.priority||"Medium";$("#taskStatus").value=t.status||"Not Started";$("#taskProgress").value=Number(t.progress)||0;$("#taskUpdate").value=t.update||"";$("#taskSupport").value=t.support||"";$("#taskAttention").checked=!!t.managerAttention;$("#taskDialog").showModal();}
function formData(){return{id:$("#taskId").value,task:$("#taskName").value.trim(),owner:$("#taskOwner").value.trim(),priority:$("#taskPriority").value,status:$("#taskStatus").value,progress:Number($("#taskProgress").value),update:$("#taskUpdate").value.trim(),support:$("#taskSupport").value.trim(),managerAttention:$("#taskAttention").checked};}
async function save(e){e.preventDefault();const t=formData();if(t.status==="Completed")t.progress=5;if(t.progress===5)t.status="Completed";try{state("Saving...");await api(t.id?"update":"create",t);$("#taskDialog").close();await load();}catch(e){state(e.message,true);}}
async function update(id,changes){const t=tasks.find(x=>x.id===id);if(!t)return;const next={...t,...changes};if(changes.status==="Completed")next.progress=5;if(changes.progress===5)next.status="Completed";if(changes.progress<5&&next.status==="Completed")next.status="In Progress";try{state("Saving...");await api("update",next);await load();}catch(e){state(e.message,true);}}
async function action(name,id){try{state("Saving...");await api(name,{id});await load();}catch(e){state(e.message,true);}}
function confirm(title,text,fn){$("#confirmTitle").textContent=title;$("#confirmText").textContent=text;pendingAction=fn;$("#confirmDialog").showModal();}
function lines(v){return String(v||"").split(/\r?\n/).map(x=>x.replace(/^[\s•●▪◦*-]+/,"").replace(/\s+/g," ").trim()).filter(Boolean);}
function summary(){const list=visible();$("#summaryNote").textContent=$("#hideCompleted").checked?"Completed tasks are excluded.":"Completed tasks are included when visible.";const output=list.map(t=>{const p=Number(t.progress)||0,u=lines(t.update);const a=[`• ${t.task}`,`  Status: ${t.status}`,`  Progress: ${p}/5 (${LABELS[p]})`,`  Update:`,...(u.length?u:["No update provided."]).map(x=>`    • ${x}`)];const support=lines(t.support);if(support.length)a.push("  Support required:",...support.map(x=>`    • ${x}`));if(t.managerAttention)a.push("  Manager attention required");return a.join("\n");}).join("\n\n");$("#summaryText").value=output||"No tasks are available in the current view.";$("#summaryDialog").showModal();}
function theme(v){document.documentElement.dataset.theme=v;localStorage.setItem("tracker-theme",v);$("#themeBtn").textContent=v==="dark"?"Light mode":"Dark mode";}

STATUSES.forEach(s=>{$("#statusFilter").add(new Option(s,s));$("#taskStatus").add(new Option(s,s));});LABELS.forEach((l,i)=>$("#taskProgress").add(new Option(`${i}/5 - ${l}`,i)));
theme(localStorage.getItem("tracker-theme")||"light");
$("#themeBtn").onclick=()=>theme(document.documentElement.dataset.theme==="dark"?"light":"dark");
$("#addBtn").onclick=()=>openForm();$("#refreshBtn").onclick=load;$("#summaryBtn").onclick=summary;
$("#archiveBtn").onclick=()=>{archiveView=!archiveView;$("#archiveBtn").textContent=archiveView?"Back to tasks":"View archive";$("#archiveNotice").hidden=!archiveView;$("#addBtn").hidden=archiveView;load();};
$("#closeTask").onclick=$("#cancelTask").onclick=()=>$("#taskDialog").close();$("#closeSummary").onclick=()=>$("#summaryDialog").close();$("#taskForm").onsubmit=save;
$("#confirmCancel").onclick=()=>{$("#confirmDialog").close();pendingAction=null;};$("#confirmOk").onclick=async()=>{const fn=pendingAction;pendingAction=null;$("#confirmDialog").close();if(fn)await fn();};
$("#copySummary").onclick=async()=>{await navigator.clipboard.writeText($("#summaryText").value);$("#copySummary").textContent="Copied";setTimeout(()=>$("#copySummary").textContent="Copy to clipboard",1000);};
["#searchInput","#statusFilter","#ownerFilter","#hideCompleted"].forEach(s=>$(s).addEventListener("input",render));
$("#taskBody").onchange=e=>{if(e.target.dataset.status)update(e.target.dataset.status,{status:e.target.value});};
$("#taskBody").onclick=e=>{const d=e.target.dataset;if(d.progress!==undefined)return update(d.id,{progress:Number(d.progress)});if(d.edit)return openForm(tasks.find(t=>t.id===d.edit));if(d.copy){const t=tasks.find(x=>x.id===d.copy);return openForm({...t,id:"",task:`Copy of ${t.task}`,status:"Not Started",progress:0,update:""});}if(d.archive){const t=tasks.find(x=>x.id===d.archive);return confirm("Archive task",`Archive "${t.task}"?`,()=>action("archive",d.archive));}if(d.restore)return action("restore",d.restore);if(d.delete){const t=tasks.find(x=>x.id===d.delete);return confirm("Delete permanently",`Delete "${t.task}" permanently?`,()=>action("delete",d.delete));}};
load();
