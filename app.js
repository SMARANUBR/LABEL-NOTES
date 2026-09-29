(function(){
"use strict";
const CFG = window.NOTEBOOK_CONFIG || {};
const OWNER = String(CFG.ownerEmail||"").trim().toLowerCase();
const $ = id => document.getElementById(id);
const root = $("root");

/* ---------- small helpers ---------- */
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
const DOW=["Sun","Mon","Tue","Wed","Thu","Fri","Sat"], DOW_LONG=["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
const MON=["January","February","March","April","May","June","July","August","September","October","November","December"];
const fmtLong = s => { const d=parse(s); return `${DOW_LONG[d.getDay()]}, ${d.getDate()} ${MON[d.getMonth()]} ${d.getFullYear()}`; };
const fmtTime = t => { const d=new Date(t); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; };
const esc = s => String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const nowISO = () => new Date().toISOString();
let toastTimer; function toast(t){ const el=$("toast"); el.textContent=t; el.classList.add("show"); clearTimeout(toastTimer); toastTimer=setTimeout(()=>el.classList.remove("show"),3200); }
const COLORS=["#3D5AFE","#8E44AD","#E63946","#E67E22","#2A9D8F","#D81B60","#2E7D32","#607D8B","#6D4C41"];
const colorFor = id => { let h=0; for(const c of String(id)) h=(h*31+c.charCodeAt(0))>>>0; return COLORS[h%COLORS.length]; };
const brand = `<h1><span style="width:12px;height:12px;border-radius:50%;background:var(--rec);display:inline-block"></span>Label Notebook</h1>`;

/* ---------- setup check ---------- */
if(!CFG.firebase || !CFG.firebase.apiKey || CFG.firebase.apiKey==="PASTE_HERE" || !OWNER || OWNER==="you@example.com"){
  root.innerHTML=`<div class="gate"><div class="card">${brand}<p>This notebook isn't set up yet. Open <strong>config.js</strong>, paste your Firebase settings and the owner's email, then upload it again. The setup guide walks you through it.</p></div></div>`;
  return;
}
if(!window.firebase){
  root.innerHTML=`<div class="gate"><div class="card">${brand}<p>Couldn't load. Connect to the internet and open the app once. After that it works offline.</p></div></div>`;
  return;
}

firebase.initializeApp(CFG.firebase);
const auth=firebase.auth(), fs=firebase.firestore();
fs.enablePersistence({synchronizeTabs:true}).catch(()=>{});

/* ---------- state ---------- */
const S = { user:null, member:false, isOwner:false, team:[], teamLoaded:false, notes:{}, notesReady:false, profiles:{},
  view:"day", date:todayISO(), calMonth:todayISO().slice(0,7), filter:null, mine:false, query:"",
  editing:null, draftTag:"meeting", pending:false, fromCache:true, legacy:null, showTeam:false };
let unsub=[];
function stopAll(){ unsub.forEach(f=>{try{f();}catch(e){}}); unsub=[]; }

/* ---------- auth screens ---------- */
function gate(html){ root.innerHTML=`<div class="gate"><div class="card">${brand}${html}</div></div>`; }
function authScreen(mode="in", msg=""){
  const up=mode==="up", reset=mode==="reset";
  gate(`<p>${reset?"Enter your email and we'll send you a link to set a new password.":up?"Create your account. Use the email the label owner added to the team.":"Sign in to the label's shared notebook."}</p>
    ${up?`<label class="field"><span>Your name</span><input id="aName" autocomplete="name" placeholder="e.g. Aditya"></label>`:""}
    <label class="field"><span>Email</span><input id="aEmail" type="email" autocomplete="email" inputmode="email"></label>
    ${reset?"":`<label class="field"><span>Password</span><input id="aPass" type="password" autocomplete="${up?"new-password":"current-password"}" ${up?'placeholder="At least 6 characters"':""}></label>`}
    <div class="err" id="aErr">${esc(msg)}</div>
    <button class="btn primary" id="aGo">${reset?"Send reset link":up?"Create account":"Sign in"}</button>
    <div class="switch">
      ${mode!=="in"?`<button class="link" data-mode="in">Back to sign in</button>`:`<button class="link" data-mode="up">New here? Create account</button><button class="link" data-mode="reset">Forgot password?</button>`}
    </div>`);
  root.querySelectorAll("[data-mode]").forEach(b=>b.onclick=()=>authScreen(b.dataset.mode));
  const go=async()=>{
    const email=$("aEmail").value.trim(), pass=$("aPass")?.value||"", name=$("aName")?.value.trim()||"";
    const err=m=>{ $("aErr").textContent=m; $("aGo").disabled=false; };
    if(!email) return err("Enter your email.");
    $("aGo").disabled=true;
    try{
      if(reset){ await auth.sendPasswordResetEmail(email); authScreen("in","Reset link sent. Check your inbox (and spam), then sign in with your new password."); return; }
      if(up){
        if(!name) return err("Enter your name so the team knows who wrote each note.");
        const cred=await auth.createUserWithEmailAndPassword(email,pass);
        await cred.user.updateProfile({displayName:name});
        await cred.user.sendEmailVerification();
      } else await auth.signInWithEmailAndPassword(email,pass);
    }catch(e){ err(authError(e)); }
  };
  $("aGo").onclick=go;
  root.querySelectorAll("input").forEach(i=>i.addEventListener("keydown",e=>{ if(e.key==="Enter") go(); }));
}
function authError(e){
  const c=e&&e.code||"";
  if(c.includes("invalid-credential")||c.includes("wrong-password")||c.includes("user-not-found")) return "That email and password don't match. Try again or reset your password.";
  if(c.includes("email-already-in-use")) return "An account with this email already exists. Sign in instead.";
  if(c.includes("weak-password")) return "Use a password with at least 6 characters.";
  if(c.includes("invalid-email")) return "That doesn't look like a valid email.";
  if(c.includes("network")) return "No internet connection. Connect and try again.";
  if(c.includes("too-many-requests")) return "Too many tries. Wait a few minutes and try again.";
  return "Something went wrong: "+(e.message||c);
}
function verifyScreen(u){
  gate(`<p>We sent a verification link to <strong>${esc(u.email)}</strong>. Open it, then come back and tap the button below.</p>
    <div class="err" id="vErr"></div>
    <button class="btn primary" id="vDone">I've verified my email</button>
    <div class="switch"><button class="link" id="vResend">Resend the email</button><button class="link" id="vOut">Sign out</button></div>`);
  $("vDone").onclick=async()=>{ await u.reload(); if(auth.currentUser.emailVerified){ await auth.currentUser.getIdToken(true); onUser(auth.currentUser); } else $("vErr").textContent="Not verified yet. Check your inbox and spam folder."; };
  $("vResend").onclick=async()=>{ try{ await u.sendEmailVerification(); toast("Verification email sent again."); }catch(e){ toast("Wait a minute before resending."); } };
  $("vOut").onclick=()=>auth.signOut();
}
function waitingScreen(){
  gate(`<p>You're signed in as <strong>${esc(S.user.email)}</strong>, but you haven't been added to the team yet.</p>
    <p>Ask the notebook owner to add this email in <em>Team members</em>. This page opens the notebook automatically once they do.</p>
    <div class="switch"><button class="link" id="wOut">Sign out</button></div>`);
  $("wOut").onclick=()=>auth.signOut();
}

auth.onAuthStateChanged(u=>{ stopAll(); S.notes={}; S.notesReady=false; S.teamLoaded=false; S.member=false; S.profiles={}; S.legacy=null; if(!u) return authScreen(); onUser(u); });

function onUser(u){
  S.user=u;
  if(!u.emailVerified) return verifyScreen(u);
  const email=u.email.toLowerCase();
  S.isOwner = email===OWNER;
  gate(`<p>Opening the notebook…</p>`);
  unsub.push(fs.doc("config/team").onSnapshot(snap=>{
    S.team=(snap.exists && Array.isArray(snap.data().emails)) ? snap.data().emails : [];
    S.teamLoaded=true;
    const was=S.member;
    S.member = S.isOwner || S.team.includes(email);
    if(S.member && !was) startNotebook();
    else if(!S.member){ if(was) stopNotes(); waitingScreen(); }
    else render();
  }, e=>{ if(S.isOwner){ S.member=true; startNotebook(); } else waitingScreen(); }));
}

/* ---------- notebook data ---------- */
let notesUnsub=null;
function stopNotes(){ if(notesUnsub){ notesUnsub(); notesUnsub=null; } S.notes={}; S.notesReady=false; }
function startNotebook(){
  buildShell();
  fs.doc("profiles/"+S.user.uid).set({name:S.user.displayName||S.user.email.split("@")[0], email:S.user.email.toLowerCase()},{merge:true}).catch(()=>{});
  notesUnsub=fs.collection("notes").orderBy("date","desc").limit(3000).onSnapshot({includeMetadataChanges:true}, snap=>{
    const next={};
    snap.docs.forEach(d=>{ const v=d.data(); if(v && typeof v.text==="string" && v.date) next[d.id]={id:d.id,...v}; });
    S.notes=next; S.notesReady=true; S.pending=snap.metadata.hasPendingWrites; S.fromCache=snap.metadata.fromCache;
    loadProfiles();
    if(!S.editing) render(); else renderSide();
  }, e=>{ toast(e.code==="permission-denied"?"You don't have access to the notes. Ask the owner to add your email.":"Lost connection to the notebook. It will retry."); });
  unsub.push(()=>notesUnsub&&notesUnsub());
  unsub.push(fs.collection("profiles").onSnapshot(snap=>{ snap.docs.forEach(d=>S.profiles[d.id]=d.data()); render(); }, ()=>{}));
  checkLegacy();
}
function loadProfiles(){}
const all=()=>Object.values(S.notes);
const byDate=()=>{ const m={}; all().forEach(n=>(m[n.date]=m[n.date]||[]).push(n)); return m; };
const entriesFor=d=>all().filter(n=>n.date===d).sort((a,b)=>a.createdAt.localeCompare(b.createdAt));
const openFollowUps=()=>all().filter(n=>n.followUp&&!n.done).sort((a,b)=>a.date.localeCompare(b.date)||a.createdAt.localeCompare(b.createdAt));
const passes=n=>(!S.filter||n.tag===S.filter)&&(!S.mine||n.author===S.user.uid);
const nameOf=uid=>!uid?"Someone":uid===S.user.uid?"You":(S.profiles[uid]?.name||"Someone");
function highlight(text,q){ const safe=esc(text); if(!q) return safe; const re=new RegExp(esc(q).replace(/[.*+?^${}()|[\]\\]/g,"\\$&"),"gi"); return safe.replace(re,m=>`<mark>${m}</mark>`); }

function fail(e){ toast(e&&e.code==="permission-denied"?"You don't have permission to do that.":"Couldn't save. It will retry when you're back online."); }
function addNote(){
  const ta=$("newText"), text=ta.value.trim();
  if(!text){ ta.focus(); toast("Write something first."); return; }
  const tag=$("newTag").value, who=$("newWho").value.trim(), fu=$("newFu").checked; S.draftTag=tag;
  const now=new Date(), d=parse(S.date); d.setHours(now.getHours(),now.getMinutes(),now.getSeconds(),now.getMilliseconds());
  fs.collection("notes").add({date:S.date, text, tag, who, followUp:fu, done:false, createdAt:d.toISOString(), updatedAt:nowISO(), author:S.user.uid, editedBy:S.user.uid}).catch(fail);
  ta.value=""; $("newWho").value=""; $("newFu").checked=false; ta.focus();
  toast(navigator.onLine?"Note added for the team":"Saved. It will reach the team when you're back online.");
}
const updateNote=(id,patch)=>fs.doc("notes/"+id).update({...patch, updatedAt:nowISO(), editedBy:S.user.uid}).catch(fail);
const deleteNote=id=>fs.doc("notes/"+id).delete().catch(fail);

/* ---------- carry over notes from the earlier offline app on this device ---------- */
function checkLegacy(){
  try{
    const raw=localStorage.getItem("label-notebook-store-v2"); if(!raw) return;
    if(localStorage.getItem("label-notebook-imported-"+S.user.uid)) return;
    const s=JSON.parse(raw); const list=Object.values(s.entries||{}).filter(e=>e&&typeof e.text==="string"&&e.date);
    if(list.length) S.legacy=list;
  }catch(e){}
}
async function importLegacy(){
  const list=S.legacy; S.legacy=null; render();
  let batch=fs.batch(), n=0, inBatch=0;
  for(const e of list){
    batch.set(fs.collection("notes").doc(), {date:e.date, text:e.text, tag:TAG[e.tag]?e.tag:"admin", who:e.who||"", followUp:!!e.followUp, done:!!e.done,
      createdAt:e.createdAt||nowISO(), updatedAt:nowISO(), author:S.user.uid, editedBy:S.user.uid});
    n++; inBatch++;
    if(inBatch===400){ await batch.commit().catch(fail); batch=fs.batch(); inBatch=0; }
  }
  if(inBatch) await batch.commit().catch(fail);
  localStorage.setItem("label-notebook-imported-"+S.user.uid,"1");
  toast(`Added ${n} notes from this device to the team notebook.`);
}
function dismissLegacy(){ S.legacy=null; localStorage.setItem("label-notebook-imported-"+S.user.uid,"skipped"); render(); }

/* ---------- team admin (owner only) ---------- */
function teamPanel(){
  if(!S.isOwner) return "";
  const list=S.team.slice().sort();
  return `<div class="box order-last">
    <p class="side-title" style="margin-bottom:4px">Team members</p>
    <p class="hint" style="margin:0">Add the email each person will sign up with. Only these people can open the notebook.</p>
    <ul class="members">
      <li><span>${esc(OWNER)} (you, owner)</span></li>
      ${list.map(e=>`<li><span>${esc(e)}</span><button class="link" data-rm="${esc(e)}" aria-label="Remove ${esc(e)}">Remove</button></li>`).join("")}
    </ul>
    <div class="addrow"><input id="addEmail" type="email" placeholder="name@email.com" aria-label="Email to add"><button class="btn" id="addBtn">Add</button></div>
  </div>`;
}
async function addMember(){
  const el=$("addEmail"); const e=el.value.trim().toLowerCase();
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)){ toast("Enter a full email address."); return; }
  if(e===OWNER||S.team.includes(e)){ toast("That person is already on the team."); return; }
  try{ await fs.doc("config/team").set({emails:firebase.firestore.FieldValue.arrayUnion(e)},{merge:true}); el.value=""; toast(`Added ${e}. They can now sign up with this email.`); }
  catch(err){ toast("Couldn't add. Check that firestore.rules has your email as the owner."); }
}
async function removeMember(e){
  if(!confirm(`Remove ${e} from the notebook? They'll lose access straight away. Their notes stay.`)) return;
  try{ await fs.doc("config/team").set({emails:firebase.firestore.FieldValue.arrayRemove(e)},{merge:true}); toast(`Removed ${e}.`); }
  catch(err){ toast("Couldn't remove that person."); }
}

/* ---------- layout ---------- */
function buildShell(){
  root.innerHTML=`<div class="app" id="app">
  <aside>
    <div class="brand"><span class="dot" aria-hidden="true"></span>Label Notebook</div>
    <div class="status" id="status"></div>
    <input id="search" class="search" type="search" placeholder="Search all team notes" aria-label="Search all team notes">
    <div class="box">
      <div class="cal-head"><button class="icon-btn" id="calPrev" aria-label="Previous month">‹</button><strong id="calTitle"></strong><button class="icon-btn" id="calNext" aria-label="Next month">›</button></div>
      <div class="cal" id="cal"></div>
    </div>
    <button class="side-link" id="fuLink">Open follow-ups <span class="count zero" id="fuCount">0</span></button>
    <div class="tag-wrap"><p class="side-title">Filter</p><div class="tags" id="tagFilters"></div></div>
    <div id="teamSlot" class="order-last"></div>
    <div class="box order-last" style="display:flex;flex-direction:column;gap:8px">
      <p class="hint" style="margin:0" id="whoami"></p>
      <button class="btn" id="exportBtn">Export all notes (.md)</button>
      <button class="btn" id="installBtn" hidden>Install app</button>
      <button class="btn" id="outBtn">Sign out</button>
    </div>
  </aside>
  <main id="main"></main></div>`;
  let st; $("search").addEventListener("input",ev=>{ clearTimeout(st); st=setTimeout(()=>{ S.query=ev.target.value; S.view=S.query.trim()?"search":"day"; S.editing=null; render(); },150); });
  if(deferredPrompt) $("installBtn").hidden=false;
  render();
}
function statusLine(){
  const online=navigator.onLine;
  const cls=!online?"off":S.pending?"pending":"";
  const txt=!online?"Offline. Changes will sync when you reconnect.":S.pending?"Syncing your changes…":"Up to date with the team";
  return `<span class="sync-dot ${cls}"></span>${txt}`;
}
function renderSide(){
  if(!$("cal")) return;
  $("status").innerHTML=statusLine();
  const days=byDate(), [y,m]=S.calMonth.split("-").map(Number);
  $("calTitle").textContent=`${MON[m-1]} ${y}`;
  const first=new Date(y,m-1,1), start=new Date(first); start.setDate(1-first.getDay()); const t=todayISO();
  let html=DOW.map(d=>`<div class="dow" aria-hidden="true">${d[0]}</div>`).join("");
  for(let i=0;i<42;i++){ const d=new Date(start); d.setDate(start.getDate()+i); const s=iso(d);
    const cls=[d.getMonth()!==m-1?"out":"", s===t?"today":"", s===S.date&&S.view==="day"?"sel":"", days[s]?"has":""].join(" ");
    html+=`<button class="${cls}" data-date="${s}" aria-label="${fmtLong(s)}${days[s]?`, ${days[s].length} notes`:""}">${d.getDate()}</button>`; }
  $("cal").innerHTML=html;
  const n=openFollowUps().filter(passes).length, c=$("fuCount"); c.textContent=n; c.classList.toggle("zero",n===0);
  $("fuLink").setAttribute("aria-current",S.view==="followups"?"true":"false");
  $("tagFilters").innerHTML=`<button class="chip" data-mine="1" aria-pressed="${S.mine}">My notes</button>`+
    TAGS.map(tg=>`<button class="chip" data-filter="${tg.id}" aria-pressed="${S.filter===tg.id}"><i style="background:${tagColor(tg.id)}"></i>${esc(tg.label)}</button>`).join("");
  const slot=$("teamSlot"); const focusAdd=document.activeElement?.id==="addEmail", addVal=$("addEmail")?.value||"";
  slot.innerHTML=teamPanel(); if($("addEmail")){ $("addEmail").value=addVal; if(focusAdd) $("addEmail").focus(); }
  $("whoami").textContent=`Signed in as ${S.user.displayName||S.user.email}`;
}
function entryHTML(e,opts={}){
  if(S.editing===e.id){
    return `<div class="entry"><div class="time">${fmtTime(e.createdAt)}</div><div class="edit">
      <label class="sr" for="ed-${e.id}">Edit note</label><textarea id="ed-${e.id}">${esc(e.text)}</textarea>
      <div class="row">
        <select id="edtag-${e.id}" aria-label="Category">${TAGS.map(t=>`<option value="${t.id}" ${t.id===e.tag?"selected":""}>${esc(t.label)}</option>`).join("")}</select>
        <input type="text" id="edwho-${e.id}" value="${esc(e.who||"")}" placeholder="Person / company" aria-label="Person or company">
        <label class="check"><input type="checkbox" id="edfu-${e.id}" ${e.followUp?"checked":""}> Needs follow-up</label>
        <button class="btn primary" data-act="save-edit" data-id="${e.id}">Save changes</button><button class="btn" data-act="cancel-edit">Cancel</button>
      </div></div></div>`;
  }
  const tg=TAG[e.tag]||TAG.admin, nm=nameOf(e.author);
  const initial=((e.author===S.user.uid?(S.user.displayName||S.user.email):nm)[0]||"?").toUpperCase();
  const edited=e.editedBy&&e.editedBy!==e.author?`, edited by ${esc(nameOf(e.editedBy))}`:"";
  return `<div class="entry ${e.followUp&&e.done?"is-done":""}">
    <div class="time">${fmtTime(e.createdAt)}</div>
    <div>
      <div class="meta">
        <span class="tag"><i style="background:${tagColor(e.tag)}"></i>${esc(tg.label)}</span>
        ${e.who?`<span class="who">${esc(e.who)}</span>`:""}
        ${e.followUp?`<button class="fu ${e.done?"done":""}" data-act="toggle-done" data-id="${e.id}" aria-pressed="${!!e.done}">${e.done?"Followed up":"Follow up"}</button>`:""}
      </div>
      <div class="text">${highlight(e.text,opts.q)}</div>
      <div class="actions">
        <span class="by"><span class="avatar" style="background:${colorFor(e.author)}">${esc(initial)}</span>${esc(nm)}${edited}</span>
        <button class="link" data-act="edit" data-id="${e.id}">Edit</button>
        <button class="link" data-act="move" data-id="${e.id}">Move to date</button>
        <button class="link" data-act="delete" data-id="${e.id}">Delete</button>
      </div>
    </div></div>`;
}
function banners(){
  let h="";
  if(S.legacy){ const n=S.legacy.length; h+=`<div class="banner"><p>This device has ${n} ${n===1?"note":"notes"} from the offline version of the app. Add ${n===1?"it":"them"} to the team notebook?</p><div style="display:flex;gap:8px"><button class="btn primary" data-act="legacy-yes">Add to team</button><button class="btn" data-act="legacy-no">Not now</button></div></div>`; }
  if(S.isOwner && S.teamLoaded && !S.team.length) h+=`<div class="banner"><p>You're the only one here. Add your label members' emails under <strong>Team members</strong> so they can join.</p></div>`;
  return h;
}
function renderDay(){
  const s=S.date, d=parse(s), t=todayISO(), days=byDate(), monday=addDays(s,-((d.getDay()+6)%7));
  let strip=""; for(let i=0;i<7;i++){ const ds=addDays(monday,i), dd=parse(ds), n=(days[ds]||[]).length;
    const bars=Array.from({length:Math.min(n,6)},(_,k)=>`<b style="height:${6+((k*5+dd.getDate())%8)}px"></b>`).join("");
    strip+=`<button class="${ds===s?"sel":""} ${ds===t?"today":""}" data-date="${ds}" aria-label="${fmtLong(ds)}, ${n} notes"><span class="d">${DOW[dd.getDay()]}</span><span class="n">${dd.getDate()}</span><span class="bars" aria-hidden="true">${bars}</span></button>`; }
  const dayAll=entriesFor(s), list=dayAll.filter(passes);
  const rel=s===t?"today":s===addDays(t,-1)?"yesterday":s===addDays(t,1)?"tomorrow":"";
  const filt=[S.mine?"your":"", S.filter?TAG[S.filter].label:""].filter(Boolean).join(" ");
  return `${banners()}
  <div class="day-head">
    <h1 class="big-date" style="margin:0"><span class="num">${d.getDate()}</span><span class="rest">${MON[d.getMonth()]} ${d.getFullYear()} <span>${DOW_LONG[d.getDay()]}${rel?`, ${rel}`:""}</span></span></h1>
    <div class="nav"><button class="icon-btn" data-act="shift" data-n="-1" aria-label="Previous day">‹</button><button class="btn" data-act="today" ${s===t?"disabled":""}>Today</button><button class="icon-btn" data-act="shift" data-n="1" aria-label="Next day">›</button><input class="btn" type="date" id="jump" value="${s}" aria-label="Jump to date"></div>
  </div>
  <div class="strip">${strip}</div>
  <div class="composer">
    <label class="sr" for="newText">New note</label><textarea id="newText" placeholder="What happened? Calls, decisions, release updates, ideas…"></textarea>
    <div class="row"><div class="left">
      <select id="newTag" aria-label="Category">${TAGS.map(tg=>`<option value="${tg.id}" ${tg.id===S.draftTag?"selected":""}>${esc(tg.label)}</option>`).join("")}</select>
      <input type="text" id="newWho" placeholder="Person / company" aria-label="Person or company">
      <label class="check"><input type="checkbox" id="newFu"> Needs follow-up</label></div>
      <div class="left"><span class="hint kbd">Ctrl + Enter to save</span><button class="btn primary" data-act="add">Add note</button></div></div>
  </div>
  ${filt?`<p class="sub">Showing ${esc(filt)} notes only. <button class="link" data-act="clear-filter">Show all</button></p>`:""}
  <div class="entries">${!S.notesReady?`<div class="empty"><strong>Loading the team's notes…</strong></div>`:list.length?list.map(e=>entryHTML(e)).join(""):
    `<div class="empty"><strong>${dayAll.length?"Nothing matches the filter":"No team notes for this day yet"}</strong>${dayAll.length?"Clear the filter to see the rest.":"Add the first one above. Everyone on the team sees it straight away."}</div>`}</div>`;
}
function grouped(items,q){ const m={}; items.forEach(e=>(m[e.date]=m[e.date]||[]).push(e));
  return Object.keys(m).sort().reverse().map(d=>`<div class="group-date"><span>${fmtLong(d)}</span><button class="link" data-act="goto" data-date="${d}">Open day</button></div><div class="entries">${m[d].sort((a,b)=>a.createdAt.localeCompare(b.createdAt)).map(e=>entryHTML(e,{q})).join("")}</div>`).join(""); }
function renderFollowUps(){ const items=openFollowUps().filter(passes);
  return `<h1 class="section-title">Open follow-ups</h1><p class="sub">Everything the team marked "Needs follow-up" that isn't done yet, across all dates.</p>
  ${items.length?grouped(items):`<div class="empty"><strong>All caught up</strong>Tick "Needs follow-up" on a note and it stays here until someone marks it done.</div>`}`; }
function renderSearch(){ const q=S.query.trim().toLowerCase();
  const items=all().filter(e=>passes(e)&&((e.text||"").toLowerCase().includes(q)||(e.who||"").toLowerCase().includes(q)||(TAG[e.tag]?.label||"").toLowerCase().includes(q)||nameOf(e.author).toLowerCase().includes(q)));
  return `<h1 class="section-title">Search</h1><p class="sub">${items.length} ${items.length===1?"note matches":"notes match"} “${esc(S.query.trim())}”. <button class="link" data-act="clear-search">Clear search</button></p>
  ${items.length?grouped(items,S.query.trim()):`<div class="empty"><strong>No matches</strong>Try a person's name, a song title or a company.</div>`}`; }
function render(){
  const main=$("main"); if(!main) return;
  renderSide();
  const focusNew=document.activeElement?.id==="newText", draft=$("newText")?.value||"", dw=$("newWho")?.value||"", df=$("newFu")?.checked||false;
  main.innerHTML=S.view==="followups"?renderFollowUps():S.view==="search"?renderSearch():renderDay();
  if(S.view==="day"&&$("newText")){ $("newText").value=draft; $("newWho").value=dw; $("newFu").checked=df; if(focusNew) $("newText").focus(); }
  if(S.editing){ const el=$("ed-"+S.editing); if(el){ el.focus(); el.setSelectionRange(el.value.length,el.value.length); } }
}

/* ---------- events ---------- */
function goDay(d){ S.view="day"; S.date=d; S.calMonth=d.slice(0,7); S.editing=null; render(); window.scrollTo({top:0}); }
document.addEventListener("click",ev=>{
  const b=ev.target.closest("button"); if(!b||b.disabled||!$("app")) return;
  if((b.closest("#cal")||b.closest(".strip"))&&b.dataset.date){ goDay(b.dataset.date); return; }
  if(b.dataset.filter){ S.filter=S.filter===b.dataset.filter?null:b.dataset.filter; render(); return; }
  if(b.dataset.mine){ S.mine=!S.mine; render(); return; }
  if(b.dataset.rm){ removeMember(b.dataset.rm); return; }
  if(b.id==="addBtn"){ addMember(); return; }
  if(b.id==="calPrev"||b.id==="calNext"){ const [y,m]=S.calMonth.split("-").map(Number); const d=new Date(y,m-1+(b.id==="calNext"?1:-1),1); S.calMonth=`${d.getFullYear()}-${pad(d.getMonth()+1)}`; renderSide(); return; }
  if(b.id==="fuLink"){ S.view=S.view==="followups"?"day":"followups"; S.editing=null; render(); return; }
  if(b.id==="exportBtn"){ exportAll(); return; }
  if(b.id==="installBtn"){ promptInstall(); return; }
  if(b.id==="outBtn"){ if(confirm("Sign out of the notebook on this device?")) auth.signOut(); return; }
  const act=b.dataset.act, id=b.dataset.id; if(!act) return;
  switch(act){
    case "add": addNote(); break;
    case "shift": goDay(addDays(S.date,Number(b.dataset.n))); break;
    case "today": goDay(todayISO()); break;
    case "goto": goDay(b.dataset.date); break;
    case "clear-filter": S.filter=null; S.mine=false; render(); break;
    case "clear-search": S.query=""; $("search").value=""; S.view="day"; render(); break;
    case "legacy-yes": importLegacy(); break;
    case "legacy-no": dismissLegacy(); break;
    case "edit": S.editing=id; render(); break;
    case "cancel-edit": S.editing=null; render(); break;
    case "save-edit": { const text=$("ed-"+id).value.trim(); if(!text){ toast("A note can't be empty. Use Delete to remove it."); return; }
      const fu=$("edfu-"+id).checked; updateNote(id,{text, tag:$("edtag-"+id).value, who:$("edwho-"+id).value.trim(), followUp:fu, done:fu?!!S.notes[id].done:false});
      S.editing=null; render(); toast("Changes saved"); break; }
    case "toggle-done": updateNote(id,{done:!S.notes[id].done}); break;
    case "delete": if(!confirm("Delete this note for everyone? This can't be undone.")) return; deleteNote(id); toast("Note deleted"); break;
    case "move": { const e=S.notes[id]; const target=prompt("Move this note to which date? (YYYY-MM-DD)",e.date);
      if(!target||target===e.date) return;
      if(!/^\d{4}-\d{2}-\d{2}$/.test(target)||isNaN(parse(target))){ toast("Use the format YYYY-MM-DD, e.g. 2026-10-05."); return; }
      const t=parse(target), c=new Date(e.createdAt); t.setHours(c.getHours(),c.getMinutes(),c.getSeconds());
      updateNote(id,{date:target, createdAt:t.toISOString()}); toast(`Moved to ${fmtLong(target)}`); break; }
  }
});
document.addEventListener("change",ev=>{ if(ev.target.id==="jump"&&ev.target.value) goDay(ev.target.value); if(ev.target.id==="newTag") S.draftTag=ev.target.value; });
document.addEventListener("keydown",ev=>{
  if(ev.target.id==="addEmail"&&ev.key==="Enter"){ addMember(); return; }
  if((ev.ctrlKey||ev.metaKey)&&ev.key==="Enter"){ if(ev.target.id==="newText"){ ev.preventDefault(); addNote(); } else if(ev.target.id?.startsWith("ed-")){ ev.preventDefault(); document.querySelector('[data-act="save-edit"]')?.click(); } }
  if(ev.key==="Escape"&&S.editing){ S.editing=null; render(); }
});
window.addEventListener("online",()=>renderSide()); window.addEventListener("offline",()=>renderSide());

/* ---------- export ---------- */
function exportAll(){
  const days=byDate(), dates=Object.keys(days).sort();
  if(!dates.length){ toast("There are no notes to export yet."); return; }
  let md=`# Label Notebook (team)\n\nExported ${fmtLong(todayISO())}\n`;
  dates.forEach(d=>{ md+=`\n## ${fmtLong(d)}\n\n`; entriesFor(d).forEach(e=>{ const fu=e.followUp?(e.done?" [followed up]":" [FOLLOW UP]"):"";
    md+=`- **${fmtTime(e.createdAt)}, ${TAG[e.tag]?.label||e.tag}**${e.who?` (${e.who})`:""}${fu}, by ${nameOf(e.author)}: ${e.text.replace(/\n/g,"\n  ")}\n`; }); });
  const file=new File([md],`label-notebook-team-${todayISO()}.md`,{type:"text/markdown"});
  if(navigator.canShare&&navigator.canShare({files:[file]})&&/Android|iPhone|iPad|Mobile/i.test(navigator.userAgent)){ navigator.share({files:[file]}).catch(()=>{}); return; }
  const url=URL.createObjectURL(file), a=document.createElement("a"); a.href=url; a.download=file.name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(url),4000);
}

/* ---------- install + offline shell ---------- */
let deferredPrompt=null;
window.addEventListener("beforeinstallprompt",e=>{ e.preventDefault(); deferredPrompt=e; const b=$("installBtn"); if(b) b.hidden=false; });
window.addEventListener("appinstalled",()=>{ const b=$("installBtn"); if(b) b.hidden=true; toast("Installed. Open Label Notebook from your apps."); });
async function promptInstall(){ if(!deferredPrompt) return; deferredPrompt.prompt(); await deferredPrompt.userChoice.catch(()=>{}); deferredPrompt=null; const b=$("installBtn"); if(b) b.hidden=true; }
if("serviceWorker" in navigator && location.protocol!=="file:") navigator.serviceWorker.register("sw.js").catch(()=>{});
})();
