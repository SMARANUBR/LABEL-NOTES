(function(){
"use strict";
const TAGS = [
  {id:"meeting",label:"Meeting"},{id:"ar",label:"A&R"},{id:"release",label:"Release"},
  {id:"marketing",label:"Marketing"},{id:"licensing",label:"Licensing"},{id:"legal",label:"Legal"},
  {id:"artist",label:"Artist"},{id:"finance",label:"Finance"},{id:"admin",label:"Admin"},{id:"idea",label:"Idea"}
];
const TAG = Object.fromEntries(TAGS.map(t=>[t.id,t]));
const tagColor = id => `var(--t-${TAG[id]?id:"admin"})`;

const pad = n => String(n).padStart(2,"0");
const iso = d => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
const parse = s => { const [y,m,d]=s.split("-").map(Number); return new Date(y,m-1,d); };
const addDays = (s,n) => { const d=parse(s); d.setDate(d.getDate()+n); return iso(d); };
const todayISO = () => iso(new Date());
const DOW = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const DOW_LONG = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
const MON = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const fmtLong = s => { const d=parse(s); return `${DOW_LONG[d.getDay()]}, ${d.getDate()} ${MON[d.getMonth()]} ${d.getFullYear()}`; };
const fmtTime = t => { const d=new Date(t); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; };
const fmtStamp = t => { const d=new Date(t); return `${d.getDate()} ${MON[d.getMonth()].slice(0,3)}, ${fmtTime(t)}`; };
const newId = () => Date.now().toString(36)+Math.random().toString(36).slice(2,8);
const nowISO = () => new Date().toISOString();
const esc = s => String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const $ = id => document.getElementById(id);

/* ---------- storage: every note is a record keyed by id; deletions leave a tombstone so sync can merge ---------- */
const KEY = "label-notebook-store-v2";
function blankStore(){ return {entries:{}, deleted:{}, meta:{device: guessDevice(), lastSyncOut:null, lastSyncIn:null}}; }
function guessDevice(){ return /Android|iPhone|iPad|Mobile/i.test(navigator.userAgent) ? "Phone" : "PC"; }
function load(){
  try{
    const raw = localStorage.getItem(KEY);
    if(!raw) return blankStore();
    const s = JSON.parse(raw);
    return {entries:s.entries||{}, deleted:s.deleted||{}, meta:Object.assign(blankStore().meta, s.meta||{})};
  }catch(e){ return blankStore(); }
}
let store = load();
function save(){
  try{ localStorage.setItem(KEY, JSON.stringify(store)); }
  catch(e){ toast("This device blocked saving. Create a sync file now so nothing is lost."); }
}
if(navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(()=>{});

function rebuildDays(){
  const days={};
  Object.values(store.entries).forEach(e=>{ (days[e.date]=days[e.date]||{date:e.date,entries:[]}).entries.push(e); });
  state.days=days;
}
function addEntry(e){ e.updatedAt=nowISO(); store.entries[e.id]=e; save(); rebuildDays(); }
function updateEntry(id, patch){ const e=store.entries[id]; if(!e) return; Object.assign(e, patch, {updatedAt:nowISO()}); save(); rebuildDays(); }
function deleteEntry(id){ delete store.entries[id]; store.deleted[id]=nowISO(); save(); rebuildDays(); }

/* ---------- state ---------- */
const state = { view:"day", date:todayISO(), calMonth:null, filter:null, query:"", days:{}, editing:null, draftTag:"meeting" };
state.calMonth = state.date.slice(0,7);
rebuildDays();

/* ---------- helpers ---------- */
let toastTimer;
function toast(t){ const el=$("toast"); el.textContent=t; el.classList.add("show"); clearTimeout(toastTimer); toastTimer=setTimeout(()=>el.classList.remove("show"),3200); }
function entriesFor(date){ return (state.days[date]?.entries||[]).slice().sort((a,b)=>a.createdAt.localeCompare(b.createdAt)); }
function allEntries(){ return Object.values(store.entries); }
function openFollowUps(){ return allEntries().filter(e=>e.followUp && !e.done).sort((a,b)=>a.date.localeCompare(b.date)||a.createdAt.localeCompare(b.createdAt)); }
function passesFilter(e){ return !state.filter || e.tag===state.filter; }
function highlight(text,q){
  const safe=esc(text); if(!q) return safe;
  const re=new RegExp(esc(q).replace(/[.*+?^${}()|[\]\\]/g,"\\$&"),"gi");
  return safe.replace(re,m=>`<mark>${m}</mark>`);
}
function setStatus(){
  const n=allEntries().length;
  $("status").textContent = `${n} ${n===1?"note":"notes"} on this ${store.meta.device.toLowerCase()}, works offline`;
  const parts=[];
  if(store.meta.lastSyncOut) parts.push(`Last sync file made ${fmtStamp(store.meta.lastSyncOut)}.`);
  if(store.meta.lastSyncIn) parts.push(`Last synced in ${fmtStamp(store.meta.lastSyncIn)}.`);
  $("syncInfo").textContent = parts.length ? parts.join(" ") : "Make a sync file here, then open it on your other device.";
}

/* ---------- sidebar ---------- */
function renderSide(){
  const [y,m] = state.calMonth.split("-").map(Number);
  $("calTitle").textContent = `${MON[m-1]} ${y}`;
  const first = new Date(y,m-1,1); const start = new Date(first); start.setDate(1-first.getDay());
  const t = todayISO();
  let html = DOW.map(d=>`<div class="dow" aria-hidden="true">${d[0]}</div>`).join("");
  for(let i=0;i<42;i++){
    const d=new Date(start); d.setDate(start.getDate()+i); const s=iso(d);
    const cls=[d.getMonth()!==m-1?"out":"", s===t?"today":"", s===state.date&&state.view==="day"?"sel":"", state.days[s]?"has":""].join(" ");
    html+=`<button class="${cls}" data-date="${s}" aria-label="${fmtLong(s)}${state.days[s]?`, ${state.days[s].entries.length} notes`:""}">${d.getDate()}</button>`;
  }
  $("cal").innerHTML=html;
  const n=openFollowUps().length; const c=$("fuCount");
  c.textContent=n; c.classList.toggle("zero",n===0);
  $("fuLink").setAttribute("aria-current", state.view==="followups"?"true":"false");
  $("tagFilters").innerHTML = TAGS.map(tg=>`<button class="chip" data-filter="${tg.id}" aria-pressed="${state.filter===tg.id}"><i style="background:${tagColor(tg.id)}"></i>${esc(tg.label)}</button>`).join("");
  setStatus();
}

/* ---------- entries ---------- */
function entryHTML(e, opts={}){
  const date=e.date;
  if(state.editing===e.id){
    return `<div class="entry"><div class="time">${fmtTime(e.createdAt)}</div><div class="edit">
      <label class="sr" for="ed-${e.id}">Edit note</label>
      <textarea id="ed-${e.id}">${esc(e.text)}</textarea>
      <div class="row">
        <select id="edtag-${e.id}" aria-label="Category">${TAGS.map(t=>`<option value="${t.id}" ${t.id===e.tag?"selected":""}>${esc(t.label)}</option>`).join("")}</select>
        <input type="text" id="edwho-${e.id}" value="${esc(e.who||"")}" placeholder="Person / company" aria-label="Person or company">
        <label class="check"><input type="checkbox" id="edfu-${e.id}" ${e.followUp?"checked":""}> Needs follow-up</label>
        <button class="btn primary" data-act="save-edit" data-id="${e.id}">Save changes</button>
        <button class="btn" data-act="cancel-edit">Cancel</button>
      </div></div></div>`;
  }
  const tg=TAG[e.tag]||TAG.admin;
  return `<div class="entry ${e.followUp&&e.done?"is-done":""}">
    <div class="time">${fmtTime(e.createdAt)}</div>
    <div>
      <div class="meta">
        <span class="tag"><i style="background:${tagColor(e.tag)}"></i>${esc(tg.label)}</span>
        ${e.who?`<span class="who">${esc(e.who)}</span>`:""}
        ${e.followUp?`<button class="fu ${e.done?"done":""}" data-act="toggle-done" data-id="${e.id}" aria-pressed="${!!e.done}">${e.done?"Followed up":"Follow up"}</button>`:""}
      </div>
      <div class="text">${highlight(e.text, opts.q)}</div>
      <div class="actions">
        <button class="link" data-act="edit" data-id="${e.id}">Edit</button>
        <button class="link" data-act="move" data-id="${e.id}">Move to date</button>
        <button class="link" data-act="delete" data-id="${e.id}">Delete</button>
      </div>
    </div></div>`;
}

function renderDay(){
  const s=state.date, d=parse(s), t=todayISO();
  const offset=(d.getDay()+6)%7; const monday=addDays(s,-offset);
  let strip="";
  for(let i=0;i<7;i++){
    const ds=addDays(monday,i), dd=parse(ds), n=(state.days[ds]?.entries.length)||0;
    const bars=Array.from({length:Math.min(n,6)},(_,k)=>`<b style="height:${6+((k*5+dd.getDate())%8)}px"></b>`).join("");
    strip+=`<button class="${ds===s?"sel":""} ${ds===t?"today":""}" data-date="${ds}" aria-label="${fmtLong(ds)}, ${n} notes"><span class="d">${DOW[dd.getDay()]}</span><span class="n">${dd.getDate()}</span><span class="bars" aria-hidden="true">${bars}</span></button>`;
  }
  const list=entriesFor(s).filter(passesFilter), total=entriesFor(s).length;
  const rel = s===t?"today":s===addDays(t,-1)?"yesterday":s===addDays(t,1)?"tomorrow":"";
  return `
  <div class="day-head">
    <h1 class="big-date" style="margin:0"><span class="num">${d.getDate()}</span><span class="rest">${MON[d.getMonth()]} ${d.getFullYear()} <span>${DOW_LONG[d.getDay()]}${rel?`, ${rel}`:""}</span></span></h1>
    <div class="nav">
      <button class="icon-btn" data-act="shift" data-n="-1" aria-label="Previous day">‹</button>
      <button class="btn" data-act="today" ${s===t?"disabled":""}>Today</button>
      <button class="icon-btn" data-act="shift" data-n="1" aria-label="Next day">›</button>
      <input class="btn" type="date" id="jump" value="${s}" aria-label="Jump to date">
    </div>
  </div>
  <div class="strip">${strip}</div>
  <div class="composer">
    <label class="sr" for="newText">New note</label>
    <textarea id="newText" placeholder="What happened? Calls, decisions, release updates, ideas…"></textarea>
    <div class="row">
      <div class="left">
        <select id="newTag" aria-label="Category">${TAGS.map(tg=>`<option value="${tg.id}" ${tg.id===state.draftTag?"selected":""}>${esc(tg.label)}</option>`).join("")}</select>
        <input type="text" id="newWho" placeholder="Person / company" aria-label="Person or company">
        <label class="check"><input type="checkbox" id="newFu"> Needs follow-up</label>
      </div>
      <div class="left"><span class="hint kbd">Ctrl + Enter to save</span><button class="btn primary" data-act="add">Add note</button></div>
    </div>
  </div>
  ${state.filter?`<p class="sub">Showing ${esc(TAG[state.filter].label)} notes only. <button class="link" data-act="clear-filter">Show all</button></p>`:""}
  <div class="entries">
    ${list.length? list.map(e=>entryHTML(e)).join("") :
      `<div class="empty"><strong>${total?"Nothing in this category today":"No notes for this day yet"}</strong>${total?"Clear the filter to see the rest.":"Write the first one above: meetings, release tasks, anything worth remembering."}</div>`}
  </div>`;
}

function groupedList(items, q){
  const byDate={}; items.forEach(e=>(byDate[e.date]=byDate[e.date]||[]).push(e));
  return Object.keys(byDate).sort().reverse().map(d=>`
    <div class="group-date"><span>${fmtLong(d)}</span><button class="link" data-act="goto" data-date="${d}">Open day</button></div>
    <div class="entries">${byDate[d].sort((a,b)=>a.createdAt.localeCompare(b.createdAt)).map(e=>entryHTML(e,{q})).join("")}</div>`).join("");
}
function renderFollowUps(){
  const items=openFollowUps().filter(passesFilter);
  return `<h1 class="section-title">Open follow-ups</h1>
  <p class="sub">Every note marked "Needs follow-up" that isn't done yet, across all dates.</p>
  ${items.length?groupedList(items):`<div class="empty"><strong>All caught up</strong>Tick "Needs follow-up" when you add a note and it will show up here until it's done.</div>`}`;
}
function renderSearch(){
  const q=state.query.trim().toLowerCase();
  const items=allEntries().filter(e=>passesFilter(e) && ((e.text||"").toLowerCase().includes(q) || (e.who||"").toLowerCase().includes(q) || (TAG[e.tag]?.label||"").toLowerCase().includes(q)));
  return `<h1 class="section-title">Search</h1>
  <p class="sub">${items.length} ${items.length===1?"note matches":"notes match"} “${esc(state.query.trim())}”. <button class="link" data-act="clear-search">Clear search</button></p>
  ${items.length?groupedList(items,state.query.trim()):`<div class="empty"><strong>No matches</strong>Try a person's name, a song title or a company.</div>`}`;
}

function render(){
  renderSide();
  const main=$("main");
  const focusNew = document.activeElement?.id==="newText";
  const draft=$("newText")?.value||"", draftWho=$("newWho")?.value||"", draftFu=$("newFu")?.checked||false;
  main.innerHTML = state.view==="followups"?renderFollowUps(): state.view==="search"?renderSearch(): renderDay();
  if(state.view==="day"){ const ta=$("newText"); if(ta){ ta.value=draft; $("newWho").value=draftWho; $("newFu").checked=draftFu; if(focusNew) ta.focus(); } }
  if(state.editing){ const el=$("ed-"+state.editing); if(el){ el.focus(); el.setSelectionRange(el.value.length,el.value.length);} }
}

/* ---------- actions ---------- */
function goDay(d){ state.view="day"; state.date=d; state.calMonth=d.slice(0,7); state.editing=null; render(); window.scrollTo({top:0}); }
function addNote(){
  const ta=$("newText"); const text=ta.value.trim();
  if(!text){ ta.focus(); toast("Write something first."); return; }
  const tag=$("newTag").value, who=$("newWho").value.trim(), fu=$("newFu").checked;
  state.draftTag=tag;
  const now=new Date(), d=parse(state.date); d.setHours(now.getHours(),now.getMinutes(),now.getSeconds(),now.getMilliseconds());
  addEntry({id:newId(), date:state.date, text, tag, who, followUp:fu, done:false, createdAt:d.toISOString()});
  ta.value=""; $("newWho").value=""; $("newFu").checked=false;
  render(); $("newText")?.focus(); toast("Note added");
}

document.addEventListener("click", ev=>{
  const b=ev.target.closest("button"); if(!b) return;
  if((b.closest("#cal")||b.closest(".strip")) && b.dataset.date){ goDay(b.dataset.date); return; }
  if(b.dataset.filter){ state.filter = state.filter===b.dataset.filter?null:b.dataset.filter; render(); return; }
  if(b.id==="calPrev"||b.id==="calNext"){ const [y,m]=state.calMonth.split("-").map(Number); const d=new Date(y,m-1+(b.id==="calNext"?1:-1),1); state.calMonth=`${d.getFullYear()}-${pad(d.getMonth()+1)}`; renderSide(); return; }
  if(b.id==="fuLink"){ state.view = state.view==="followups"?"day":"followups"; state.editing=null; render(); return; }
  if(b.id==="exportBtn"){ exportMarkdown(); return; }
  if(b.id==="syncOut"){ createSyncFile(); return; }
  if(b.id==="syncIn"){ $("syncFile").click(); return; }
  if(b.id==="installBtn"){ promptInstall(); return; }
  const act=b.dataset.act; if(!act) return;
  const id=b.dataset.id;
  switch(act){
    case "add": addNote(); break;
    case "shift": goDay(addDays(state.date, Number(b.dataset.n))); break;
    case "today": goDay(todayISO()); break;
    case "goto": goDay(b.dataset.date); break;
    case "clear-filter": state.filter=null; render(); break;
    case "clear-search": state.query=""; $("search").value=""; state.view="day"; render(); break;
    case "edit": state.editing=id; render(); break;
    case "cancel-edit": state.editing=null; render(); break;
    case "save-edit": {
      const text=$("ed-"+id).value.trim();
      if(!text){ toast("A note can't be empty. Use Delete to remove it."); return; }
      const fu=$("edfu-"+id).checked;
      updateEntry(id,{text, tag:$("edtag-"+id).value, who:$("edwho-"+id).value.trim(), followUp:fu, done: fu ? store.entries[id].done : false});
      state.editing=null; render(); toast("Changes saved"); break;
    }
    case "toggle-done": updateEntry(id,{done:!store.entries[id].done}); render(); break;
    case "delete":
      if(!confirm("Delete this note? This can't be undone.")) return;
      deleteEntry(id); render(); toast("Note deleted"); break;
    case "move": {
      const e=store.entries[id]; const target=prompt("Move this note to which date? (YYYY-MM-DD)", e.date);
      if(!target || target===e.date) return;
      if(!/^\d{4}-\d{2}-\d{2}$/.test(target) || isNaN(parse(target))){ toast("Use the format YYYY-MM-DD, e.g. 2026-10-05."); return; }
      const t=parse(target), c=new Date(e.createdAt); t.setHours(c.getHours(),c.getMinutes(),c.getSeconds());
      updateEntry(id,{date:target, createdAt:t.toISOString()}); render(); toast(`Moved to ${fmtLong(target)}`); break;
    }
  }
});
document.addEventListener("change", ev=>{
  if(ev.target.id==="jump" && ev.target.value) goDay(ev.target.value);
  if(ev.target.id==="newTag") state.draftTag=ev.target.value;
});
document.addEventListener("keydown", ev=>{
  if((ev.ctrlKey||ev.metaKey) && ev.key==="Enter"){
    if(ev.target.id==="newText"){ ev.preventDefault(); addNote(); }
    else if(ev.target.id?.startsWith("ed-")){ ev.preventDefault(); document.querySelector('[data-act="save-edit"]')?.click(); }
  }
  if(ev.key==="Escape" && state.editing){ state.editing=null; render(); }
});
let searchTimer;
$("search").addEventListener("input", ev=>{
  clearTimeout(searchTimer);
  searchTimer=setTimeout(()=>{ state.query=ev.target.value; state.view=state.query.trim()?"search":"day"; state.editing=null; render(); },150);
});

/* ---------- files: share sheet on phones, download on PC ---------- */
async function deliverFile(filename, text, mime){
  const file = new File([text], filename, {type:mime});
  if(navigator.canShare && navigator.canShare({files:[file]}) && /Android|iPhone|iPad|Mobile/i.test(navigator.userAgent)){
    try{ await navigator.share({files:[file], title:filename}); return true; }
    catch(e){ if(e && e.name==="AbortError") return false; }
  }
  const url=URL.createObjectURL(file); const a=document.createElement("a");
  a.href=url; a.download=filename; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(()=>URL.revokeObjectURL(url), 4000);
  return true;
}

/* ---------- sync ---------- */
async function createSyncFile(){
  const stamp = nowISO();
  const payload = {app:"label-notebook", version:2, from:store.meta.device, createdAt:stamp, entries:store.entries, deleted:store.deleted};
  const name = `label-notebook-sync-${store.meta.device.toLowerCase()}-${todayISO()}.json`;
  const ok = await deliverFile(name, JSON.stringify(payload), "application/json");
  if(ok){ store.meta.lastSyncOut=stamp; save(); setStatus(); toast("Sync file ready. Open it on your other device with Open sync file."); }
}

function mergeIn(payload){
  let added=0, updated=0, removed=0;
  const inEntries = payload.entries||{}, inDeleted = payload.deleted||{};
  // tombstones first: a deletion wins if it happened after the note's last edit
  for(const [id, delAt] of Object.entries(inDeleted)){
    const mine=store.entries[id];
    if(mine && mine.updatedAt <= delAt){ delete store.entries[id]; removed++; }
    if(!store.deleted[id] || store.deleted[id] < delAt) store.deleted[id]=delAt;
  }
  for(const [id, theirs] of Object.entries(inEntries)){
    if(!theirs || typeof theirs.text!=="string" || !/^\d{4}-\d{2}-\d{2}$/.test(theirs.date||"")) continue;
    const delAt = store.deleted[id];
    if(delAt && delAt >= (theirs.updatedAt||"")) continue;
    const mine = store.entries[id];
    if(!mine){ store.entries[id]={...theirs}; added++; if(delAt) delete store.deleted[id]; }
    else if((theirs.updatedAt||"") > (mine.updatedAt||"")){ store.entries[id]={...theirs}; updated++; }
  }
  return {added, updated, removed};
}

$("syncFile").addEventListener("change", async ev=>{
  const f=ev.target.files && ev.target.files[0]; ev.target.value="";
  if(!f) return;
  try{
    const payload = JSON.parse(await f.text());
    if(payload.app!=="label-notebook") throw new Error("wrong file");
    const r = mergeIn(payload);
    store.meta.lastSyncIn = nowISO(); save(); rebuildDays(); render();
    const parts=[]; if(r.added) parts.push(`${r.added} new`); if(r.updated) parts.push(`${r.updated} updated`); if(r.removed) parts.push(`${r.removed} removed`);
    toast(parts.length ? `Synced from ${payload.from||"other device"}: ${parts.join(", ")}.` : "Already up to date. Nothing new in that file.");
  }catch(e){
    toast("That isn't a Label Notebook sync file. Pick the .json file made with Create sync file.");
  }
});

/* ---------- markdown export ---------- */
function exportMarkdown(){
  const dates=Object.keys(state.days).sort();
  if(!dates.length){ toast("There are no notes to export yet."); return; }
  let md=`# Label Notebook\n\nExported ${fmtLong(todayISO())}\n`;
  dates.forEach(d=>{
    md+=`\n## ${fmtLong(d)}\n\n`;
    entriesFor(d).forEach(e=>{
      const fu=e.followUp?(e.done?" [followed up]":" [FOLLOW UP]"):"";
      md+=`- **${fmtTime(e.createdAt)}, ${TAG[e.tag]?.label||e.tag}**${e.who?` (${e.who})`:""}${fu}: ${e.text.replace(/\n/g,"\n  ")}\n`;
    });
  });
  deliverFile(`label-notebook-${todayISO()}.md`, md, "text/markdown");
}

/* ---------- install + offline ---------- */
let deferredPrompt=null;
window.addEventListener("beforeinstallprompt", e=>{ e.preventDefault(); deferredPrompt=e; $("installBtn").hidden=false; });
window.addEventListener("appinstalled", ()=>{ $("installBtn").hidden=true; toast("Installed. Open Label Notebook from your apps."); });
async function promptInstall(){
  if(!deferredPrompt) return;
  deferredPrompt.prompt(); await deferredPrompt.userChoice.catch(()=>{}); deferredPrompt=null; $("installBtn").hidden=true;
}
if("serviceWorker" in navigator && location.protocol!=="file:"){
  navigator.serviceWorker.register("sw.js").catch(()=>{});
}
// other open windows of the app on the same device stay in step
window.addEventListener("storage", ev=>{ if(ev.key===KEY){ store=load(); rebuildDays(); if(!state.editing) render(); } });

render();
})();
