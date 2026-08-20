const STATUSES=["Not Started","In Progress","At Risk","Blocked","Near Completion","Completed"];
const PROGRESS_LABELS=["Not started","Initiated","Underway","Significant progress","Near completion","Completed"];
const $=s=>document.querySelector(s); let tasks=[];
const api=window.APP_CONFIG?.API_URL||"";
function esc(v=""){return String(v).replace(/[&<>'"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[c]))}
function slug(v){return String(v).toLowerCase().replace(/\s+/g,"-")}
function setState(t,error=false){$("#saveState").textContent=t;$("#saveState").classList.toggle("error",error)}
async function request(action,payload={}){
 if(!api||api.includes("PASTE_YOUR")) throw new Error("Add your Apps Script /exec URL to config.js");
 const r=await fetch(api+(action==="list"?"?action=list&t="+Date.now():""),action==="list"?{}:{method:"POST",headers:{"Content-Type":"text/plain;charset=utf-8"},body:JSON.stringify({action,...payload})});
 const data=await r.json(); if(!data.ok) throw new Error(data.error||"Request failed"); return data;
}
async function load(){try{setState("Loading…");tasks=(await request("list")).tasks||[];populateFilters();render();setState("Up to date")}catch(e){setState(e.message,true)}}
function populateFilters(){
 const current=$("#ownerFilter").value; const owners=[...new Set(tasks.map(t=>t.owner).filter(Boolean))].sort();
 $("#ownerFilter").innerHTML='<option value="">All owners</option>'+owners.map(o=>`<option>${esc(o)}</option>`).join(""); $("#ownerFilter").value=current;
}
function bars(n){n=Number(n)||0;return `<div class="bars" aria-label="${n} of 5">${[1,2,3,4,5].map(i=>`<span class="bar ${i<=n?'on':''}"></span>`).join("")}<span class="progress-label">${n}/5</span></div>`}
function filtered(){const q=$("#searchInput").value.toLowerCase(),s=$("#statusFilter").value,o=$("#ownerFilter").value;return tasks.filter(t=>(!q||`${t.task} ${t.update}`.toLowerCase().includes(q))&&(!s||t.status===s)&&(!o||t.owner===o))}
function render(){
 const list=filtered(); $("#taskBody").innerHTML=list.map(t=>`<tr><td><strong>${esc(t.task)}</strong></td><td>${esc(t.owner)}</td><td>${esc(t.priority)}</td><td><span class="badge ${slug(t.status)}">${esc(t.status)}</span></td><td>${bars(t.progress)}</td><td class="update" title="${esc(t.update)}">${esc(t.update)||"—"}</td><td class="row-actions"><button data-edit="${esc(t.id)}">Edit</button></td></tr>`).join("");
 $("#emptyState").hidden=!!list.length; $("#totalCount").textContent=tasks.length; $("#doneCount").textContent=tasks.filter(t=>t.status==="Completed").length; $("#riskCount").textContent=tasks.filter(t=>["At Risk","Blocked"].includes(t.status)).length; $("#activeCount").textContent=tasks.filter(t=>t.status!=="Completed").length;
}
function openTask(t={}){$("#dialogTitle").textContent=t.id?"Edit task":"Add task";$("#taskId").value=t.id||"";$("#taskName").value=t.task||"";$("#taskOwner").value=t.owner||"Viom";$("#taskPriority").value=t.priority||"Medium";$("#taskStatus").value=t.status||"Not Started";$("#taskProgress").value=Number(t.progress)||0;$("#taskUpdate").value=t.update||"";$("#taskDialog").showModal();$("#taskName").focus()}
async function save(e){e.preventDefault();const item={id:$("#taskId").value,task:$("#taskName").value.trim(),owner:$("#taskOwner").value.trim(),priority:$("#taskPriority").value,status:$("#taskStatus").value,progress:Number($("#taskProgress").value),update:$("#taskUpdate").value.trim()};try{setState("Saving…");await request(item.id?"update":"create",item);$("#taskDialog").close();await load()}catch(e){setState(e.message,true)}}
function summary(){const list=filtered();$("#summaryText").value=list.map(t=>`• ${t.task}\n  - Status: ${t.status} (${t.progress}/5 – ${PROGRESS_LABELS[t.progress]})\n  - Update: ${t.update||"No update provided."}`).join("\n\n")||"No tasks in the current view.";$("#summaryDialog").showModal()}
STATUSES.forEach(s=>{$("#taskStatus").add(new Option(s,s));$("#statusFilter").add(new Option(s,s))});PROGRESS_LABELS.forEach((s,i)=>$("#taskProgress").add(new Option(`${i}/5 – ${s}`,i)));
$("#addBtn").onclick=()=>openTask();$("#refreshBtn").onclick=load;$("#summaryBtn").onclick=summary;$("#closeDialog").onclick=$("#cancelBtn").onclick=()=>$("#taskDialog").close();$("#closeSummary").onclick=()=>$("#summaryDialog").close();$("#taskForm").onsubmit=save;$("#copySummary").onclick=async()=>{await navigator.clipboard.writeText($("#summaryText").value);$("#copySummary").textContent="Copied";setTimeout(()=>$("#copySummary").textContent="Copy to clipboard",1200)};["#searchInput","#statusFilter","#ownerFilter"].forEach(s=>$(s).addEventListener("input",render));$("#taskBody").onclick=e=>{const id=e.target.dataset.edit;if(id)openTask(tasks.find(t=>t.id===id))};load();