(function(){
"use strict";
const CFG = window.NOTEBOOK_CONFIG || {};
const OWNER = String(CFG.ownerEmail||"").trim().toLowerCase();
const $ = id => document.getElementById(id);
const root = $("root"), sheetRoot = $("sheetRoot");

/* ================= helpers ================= */
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
const fmtShort = s => { const d=parse(s); return `${DOW[d.getDay()]} ${d.getDate()} ${MON[d.getMonth()].slice(0,3)}`; };
const fmtTime = t => { const d=new Date(t); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; };
const relDay = s => { const t=todayISO(); return s===t?"Today":s===addDays(t,-1)?"Yesterday":s===addDays(t,1)?"Tomorrow":""; };
const esc = s => String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const nowISO = () => new Date().toISOString();
const store = { get(k){ try{ return localStorage.getItem(k); }catch(e){ return null; } }, set(k,v){ try{ localStorage.setItem(k,v); }catch(e){} } };
let toastTimer; function toast(t){ const el=$("toast"); el.textContent=t; el.classList.add("show"); clearTimeout(toastTimer); toastTimer=setTimeout(()=>el.classList.remove("show"),3200); }
const COLORS=["#3D5AFE","#8E44AD","#E63946","#E67E22","#2A9D8F","#D81B60","#2E7D32","#607D8B","#6D4C41"];
const colorFor = id => { let h=0; for(const c of String(id)) h=(h*31+c.charCodeAt(0))>>>0; return COLORS[h%COLORS.length]; };
const isPhone = () => window.matchMedia("(max-width:719px)").matches;
const I = {
  notes:'<svg viewBox="0 0 24 24"><rect x="4" y="3" width="16" height="18" rx="3"/><path d="M8 8h8M8 12h8M8 16h5"/></svg>',
  fu:'<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M8 12.5l2.5 2.5L16 9.5"/></svg>',
  search:'<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>',
  more:'<svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="3.5"/><path d="M5 20c1.2-3.6 4-5.5 7-5.5s5.8 1.9 7 5.5"/></svg>',
  plus:'<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>',
  cal:'<svg viewBox="0 0 24 24"><rect x="4" y="5" width="16" height="15" rx="3"/><path d="M4 10h16M9 3v4M15 3v4"/></svg>',
  edit:'<svg viewBox="0 0 24 24"><path d="M4 20h4L19 9l-4-4L4 16z"/></svg>',
  move:'<svg viewBox="0 0 24 24"><rect x="4" y="5" width="16" height="15" rx="3"/><path d="M4 10h16M10 15h6M13 12l3 3-3 3"/></svg>',
  copy:'<svg viewBox="0 0 24 24"><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/></svg>',
  trash:'<svg viewBox="0 0 24 24"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/></svg>',
  lock:'<svg viewBox="0 0 24 24"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>',
  people:'<svg viewBox="0 0 24 24"><circle cx="9" cy="8" r="3"/><path d="M3 19c.8-3 3.2-4.5 6-4.5s5.2 1.5 6 4.5M16 5.5a3 3 0 0 1 0 5.5M18 14.5c1.5.6 2.5 2 3 4.5"/></svg>',
  down:'<svg viewBox="0 0 24 24" width="16" height="16" style="stroke:currentColor;fill:none;stroke-width:2"><path d="M6 9l6 6 6-6"/></svg>'
};
window.addEventListener("error",ev=>{ if(/Loading|Opening/.test(root.textContent)) root.innerHTML=`<div class="gate"><div class="box"><h1><span class="rec"></span>Keep Up with UBR</h1><p>The app hit an error: <strong>${esc(ev.message)}</strong></p><p>Most often this means config.js has a typo (a missing quote mark or comma). Re-copy it from Firebase and upload it again.</p></div></div>`; });
const brand = `<h1><span class="rec"></span>Keep Up with UBR</h1>`;
function gate(html){ sheetRoot.innerHTML=""; root.innerHTML=`<div class="gate"><div class="box">${brand}${html}</div></div>`; }

/* ================= setup check ================= */
if(!CFG.firebase || !CFG.firebase.apiKey || CFG.firebase.apiKey==="PASTE_HERE" || !OWNER || OWNER==="you@example.com"){
  gate(`<p>This notebook isn't set up yet. Open <strong>config.js</strong>, paste your Firebase settings and the owner's email, then upload it again.</p>`); return;
}
if(!window.firebase){ gate(`<p>Couldn't load. Connect to the internet and open the app once. After that it works offline.</p>`); return; }
firebase.initializeApp(CFG.firebase);
const auth=firebase.auth(), fs=firebase.firestore();
fs.enablePersistence({synchronizeTabs:true}).catch(()=>{});

/* ================= state ================= */
const S = { user:null, member:false, isOwner:false, team:[], teamLoaded:false, profiles:{},
  notes:{}, notesReady:false, pending:false, space:"team", projects:{}, projectsReady:false,
  view:"notes", date:todayISO(), calMonth:todayISO().slice(0,7), filter:null, mine:false, query:"", fuTab:"open",
  draft:{tag:"meeting"}, composerOpen:false, sheet:null, seenAt:"", legacy:null };
let unsub=[], notesUnsub=null;
function stopAll(){ unsub.forEach(f=>{try{f();}catch(e){}}); unsub=[]; if(notesUnsub){ notesUnsub(); notesUnsub=null; } }
const myEmail=()=>S.user.email.toLowerCase();
const notesCol=()=>S.space==="team"?fs.collection("notes"):fs.collection("projects/"+S.space+"/notes");

/* ================= sign-in screens ================= */
function explain(code){
  if(code==="permission-denied") return "Firebase blocked access. In firestore.rules, check the owner email is exactly the email you signed in with (all lowercase), then click Publish again. Also check ownerEmail in config.js is the same.";
  if(code==="not-found"||code==="failed-precondition") return "The database wasn't found. In Firebase, open Firestore Database and create the database (Standard edition, location asia-south1).";
  if(code==="unavailable") return "Can't reach the database. Check your internet, and that projectId in config.js matches your Firebase project.";
  return "Error code: "+code+". Send a screenshot of this screen for help.";
}
function problem(code){ gate(`<p><strong>The notebook can't open yet.</strong></p><p>${esc(explain(code))}</p><p class="hint">Signed in as ${esc(S.user?S.user.email:"")}</p><div class="gate-links"><button class="btn" id="pRetry">Try again</button><button class="link" id="pOut">Sign out</button></div>`);
  $("pRetry").onclick=()=>location.reload(); $("pOut").onclick=()=>auth.signOut(); }
function authScreen(mode="in", msg=""){
  const up=mode==="up", reset=mode==="reset";
  gate(`<p>${reset?"Enter your email and we'll send a link to set a new password.":up?"Create your account with the email the label owner added to the team.":"Sign in to the label's shared notebook."}</p>
    ${up?`<label class="field"><span>Your name</span><input class="input" id="aName" autocomplete="name" placeholder="e.g. Aditya"></label>`:""}
    <label class="field"><span>Email</span><input class="input" id="aEmail" type="email" autocomplete="email" inputmode="email"></label>
    ${reset?"":`<label class="field"><span>Password</span><input class="input" id="aPass" type="password" autocomplete="${up?"new-password":"current-password"}" ${up?'placeholder="At least 6 characters"':""}></label>`}
    <div class="err" id="aErr">${esc(msg)}</div>
    <button class="btn primary block" id="aGo">${reset?"Send reset link":up?"Create account":"Sign in"}</button>
    <div class="gate-links">${mode!=="in"?`<button class="link" data-mode="in">Back to sign in</button>`:`<button class="link" data-mode="up">New here? Create account</button><button class="link" data-mode="reset">Forgot password?</button>`}</div>`);
  root.querySelectorAll("[data-mode]").forEach(b=>b.onclick=()=>authScreen(b.dataset.mode));
  const go=async()=>{
    const email=$("aEmail").value.trim(), pass=$("aPass")?.value||"", name=$("aName")?.value.trim()||"";
    const err=m=>{ $("aErr").textContent=m; $("aGo").disabled=false; };
    if(!email) return err("Enter your email.");
    $("aGo").disabled=true;
    try{
      if(reset){ await auth.sendPasswordResetEmail(email); authScreen("in","Reset link sent. Check your inbox (and spam), then sign in with your new password."); return; }
      if(up){ if(!name) return err("Enter your name so the team knows who wrote each note.");
        const cred=await auth.createUserWithEmailAndPassword(email,pass); await cred.user.updateProfile({displayName:name}); await cred.user.sendEmailVerification();
        onUser(cred.user);
      } else await auth.signInWithEmailAndPassword(email,pass);
    }catch(e){ err(authError(e)); }
  };
  $("aGo").onclick=go; root.querySelectorAll("input").forEach(i=>i.addEventListener("keydown",e=>{ if(e.key==="Enter") go(); }));
  $(up?"aName":"aEmail").focus();
}
function authError(e){ const c=e&&e.code||"";
  if(/invalid-credential|wrong-password|user-not-found/.test(c)) return "That email and password don't match. Try again or reset your password.";
  if(c.includes("email-already-in-use")) return "An account with this email already exists. Sign in instead.";
  if(c.includes("weak-password")) return "Use a password with at least 6 characters.";
  if(c.includes("invalid-email")) return "That doesn't look like a valid email.";
  if(c.includes("network")) return "No internet connection. Connect and try again.";
  if(c.includes("too-many-requests")) return "Too many tries. Wait a few minutes and try again.";
  return "Something went wrong: "+(e.message||c); }
function verifyScreen(u){
  gate(`<p>We sent a verification link to <strong>${esc(u.email)}</strong>. Open it, then come back and tap the button below.</p><div class="err" id="vErr"></div>
    <button class="btn primary block" id="vDone">I've verified my email</button>
    <div class="gate-links"><button class="link" id="vResend">Resend the email</button><button class="link" id="vOut">Sign out</button></div>`);
  $("vDone").onclick=async()=>{ await u.reload(); if(auth.currentUser.emailVerified){ await auth.currentUser.getIdToken(true); onUser(auth.currentUser); } else $("vErr").textContent="Not verified yet. Check your inbox and spam folder."; };
  $("vResend").onclick=async()=>{ try{ await u.sendEmailVerification(); toast("Verification email sent again."); }catch(e){ toast("Wait a minute before resending."); } };
  $("vOut").onclick=()=>auth.signOut();
}
function waitingScreen(){
  gate(`<p>You're signed in as <strong>${esc(S.user.email)}</strong>, but you haven't been added to the team yet.</p>
    <p>Ask the notebook owner to add this email in <em>Settings → Team members</em>. This page opens automatically once they do.</p>
    <div class="gate-links"><button class="link" id="wOut">Sign out</button></div>`);
  $("wOut").onclick=()=>auth.signOut();
}

auth.onAuthStateChanged(u=>{ stopAll(); Object.assign(S,{notes:{},notesReady:false,teamLoaded:false,member:false,profiles:{},legacy:null,projects:{},projectsReady:false,sheet:null}); if(!u) return authScreen(); onUser(u); });
function onUser(u){
  S.user=u;
  if(!u.emailVerified) return verifyScreen(u);
  S.isOwner = myEmail()===OWNER;
  gate(`<p>Opening the notebook…</p>`);
  const slow=setTimeout(()=>{ if(!S.teamLoaded) problem("unavailable"); },15000); unsub.push(()=>clearTimeout(slow));
  unsub.push(fs.doc("config/team").onSnapshot(snap=>{
    S.team=(snap.exists&&Array.isArray(snap.data().emails))?snap.data().emails:[]; S.teamLoaded=true;
    const was=S.member; S.member=S.isOwner||S.team.includes(myEmail());
    if(S.member&&!was) startNotebook(); else if(!S.member){ if(notesUnsub){ notesUnsub(); notesUnsub=null; } waitingScreen(); } else render();
  }, e=>{ S.teamLoaded=true; problem(e.code||"unknown"); }));
}

/* ================= data ================= */
function startNotebook(){
  buildShell();
  fs.doc("profiles/"+S.user.uid).set({name:S.user.displayName||S.user.email.split("@")[0], email:myEmail()},{merge:true}).catch(()=>{});
  const saved=store.get("ln-space-"+S.user.uid)||"team";
  setSpace("team");
  unsub.push(fs.collection("projects").where("members","array-contains",myEmail()).onSnapshot(snap=>{
    const next={}; snap.docs.forEach(d=>next[d.id]={id:d.id,...d.data()});
    S.projects=next; const first=!S.projectsReady; S.projectsReady=true;
    if(first&&saved!=="team"&&next[saved]){ setSpace(saved); return; }
    if(S.space!=="team"&&!next[S.space]){ toast("That project was deleted or you were removed from it."); setSpace("team"); return; }
    render();
  }, ()=>{ S.projectsReady=true; }));
  unsub.push(fs.collection("profiles").onSnapshot(snap=>{ snap.docs.forEach(d=>S.profiles[d.id]=d.data()); render(); }, ()=>{}));
  checkLegacy();
}
function setSpace(id){
  if(id!=="team"&&!S.projects[id]) id="team";
  // remember when you last looked at the notebook you're leaving
  if(S.space) store.set("ln-seen-"+S.user.uid+"-"+S.space, nowISO());
  S.space=id; S.filter=null; S.mine=false; store.set("ln-space-"+S.user.uid,id);
  S.seenAt=store.get("ln-seen-"+S.user.uid+"-"+id)||nowISO();
  if(notesUnsub){ notesUnsub(); notesUnsub=null; }
  S.notes={}; S.notesReady=false;
  const space=id;
  notesUnsub=notesCol().orderBy("date","desc").limit(3000).onSnapshot({includeMetadataChanges:true}, snap=>{
    if(space!==S.space) return;
    const next={}; snap.docs.forEach(d=>{ const v=d.data(); if(v&&typeof v.text==="string"&&v.date) next[d.id]={id:d.id,...v}; });
    S.notes=next; S.notesReady=true; S.pending=snap.metadata.hasPendingWrites;
    render();
  }, e=>{ if(space!=="team"){ toast("You no longer have access to that project."); setSpace("team"); return; } problem(e.code||"unknown"); });
  render();
}
window.addEventListener("beforeunload",()=>{ if(S.user&&S.space) store.set("ln-seen-"+S.user.uid+"-"+S.space, nowISO()); });
document.addEventListener("visibilitychange",()=>{ if(document.hidden&&S.user&&S.space) store.set("ln-seen-"+S.user.uid+"-"+S.space, nowISO()); });

const all=()=>Object.values(S.notes);
const byDate=()=>{ const m={}; all().forEach(n=>(m[n.date]=m[n.date]||[]).push(n)); return m; };
const entriesFor=d=>all().filter(n=>n.date===d).sort((a,b)=>a.createdAt.localeCompare(b.createdAt));
const openFU=()=>all().filter(n=>n.followUp&&!n.done);
const passes=n=>(!S.filter||n.tag===S.filter)&&(!S.mine||n.author===S.user.uid);
const nameOf=uid=>!uid?"Someone":uid===S.user.uid?"You":(S.profiles[uid]?.name||"Someone");
const realName=uid=>uid===S.user.uid?(S.user.displayName||S.user.email):(S.profiles[uid]?.name||"?");
const isNew=n=>n.editedBy&&n.editedBy!==S.user.uid&&(n.updatedAt||"")>S.seenAt;
const spaceName=(id=S.space)=>id==="team"?"Team notebook":(S.projects[id]?.name||"Project");
const teamEmails=()=>[...new Set([OWNER,...S.team])].sort();
function emailName(e){ if(e===myEmail()) return "You"; const p=Object.values(S.profiles).find(x=>x.email===e); return p&&p.name?p.name:e; }
const canManage=p=>p&&(p.createdBy===S.user.uid||S.isOwner);
function fail(e){ toast(e&&e.code==="permission-denied"?"You don't have permission to do that.":"Couldn't save. It will retry when you're back online."); }
function highlight(text,q){ const safe=esc(text); if(!q) return safe; const re=new RegExp(esc(q).replace(/[.*+?^${}()|[\]\\]/g,"\\$&"),"gi"); return safe.replace(re,m=>`<mark>${m}</mark>`); }

function saveNote(fields, id){
  if(id){ notesCol().doc(id).update({...fields, updatedAt:nowISO(), editedBy:S.user.uid}).catch(fail); return; }
  const now=new Date(), d=parse(fields.date); d.setHours(now.getHours(),now.getMinutes(),now.getSeconds(),now.getMilliseconds());
  notesCol().add({...fields, done:false, createdAt:d.toISOString(), updatedAt:nowISO(), author:S.user.uid, editedBy:S.user.uid}).catch(fail);
}
const updateNote=(id,patch)=>notesCol().doc(id).update({...patch, updatedAt:nowISO(), editedBy:S.user.uid}).catch(fail);
const deleteNote=id=>notesCol().doc(id).delete().catch(fail);

/* legacy notes from the offline app on this device */
function checkLegacy(){ try{ const raw=store.get("label-notebook-store-v2"); if(!raw||store.get("label-notebook-imported-"+S.user.uid)) return;
  const s=JSON.parse(raw); const list=Object.values(s.entries||{}).filter(e=>e&&typeof e.text==="string"&&e.date); if(list.length) S.legacy=list; }catch(e){} }
async function importLegacy(){
  const list=S.legacy; S.legacy=null; render();
  let batch=fs.batch(), n=0, k=0;
  for(const e of list){ batch.set(fs.collection("notes").doc(),{date:e.date,text:e.text,tag:TAG[e.tag]?e.tag:"admin",who:e.who||"",followUp:!!e.followUp,done:!!e.done,createdAt:e.createdAt||nowISO(),updatedAt:nowISO(),author:S.user.uid,editedBy:S.user.uid}); n++; if(++k===400){ await batch.commit().catch(fail); batch=fs.batch(); k=0; } }
  if(k) await batch.commit().catch(fail);
  store.set("label-notebook-imported-"+S.user.uid,"1"); toast(`Added ${n} notes to the Team notebook.`);
}

/* team members (owner) */
async function addMember(){
  const el=$("addEmail"); const e=el.value.trim().toLowerCase();
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)){ toast("Enter a full email address."); return; }
  if(e===OWNER||S.team.includes(e)){ toast("That person is already on the team."); return; }
  try{ await fs.doc("config/team").set({emails:firebase.firestore.FieldValue.arrayUnion(e)},{merge:true}); el.value=""; toast(`Added ${e}. Send them the app link so they can sign up.`); }
  catch(err){ toast("Couldn't add. Check that firestore.rules has your email as the owner."); }
}
function removeMember(e){ confirmSheet({title:"Remove from team?", body:`${e} will lose access to every notebook straight away. Their notes stay.`, ok:"Remove", danger:true,
  onOk:async()=>{ try{ await fs.doc("config/team").set({emails:firebase.firestore.FieldValue.arrayRemove(e)},{merge:true}); toast(`Removed ${e}.`); }catch(err){ toast("Couldn't remove that person."); } } }); }

/* projects */
async function saveProject(id){
  const name=$("pjName").value.trim(); if(!name){ toast("Give the project a name."); $("pjName").focus(); return; }
  const members=[...new Set([myEmail(),...[...document.querySelectorAll("[data-pjm]:checked")].map(x=>x.value)])];
  $("pjSave").disabled=true;
  try{
    if(id){ await fs.doc("projects/"+id).update({name,members,updatedAt:nowISO()}); closeSheet(); toast("Project updated"); }
    else { const ref=fs.collection("projects").doc(); await ref.set({name,members,createdBy:S.user.uid,createdAt:nowISO(),updatedAt:nowISO()});
      S.projects[ref.id]={id:ref.id,name,members,createdBy:S.user.uid}; closeSheet(); S.view="notes"; setSpace(ref.id);
      toast(`Created "${name}". Only its members can see it.`); }
  }catch(e){ $("pjSave").disabled=false; toast(e.code==="permission-denied"?"Firebase blocked that. Paste the latest firestore.rules and click Publish.":"Couldn't save the project."); }
}
function leaveProject(id){ const p=S.projects[id]; if(!p) return;
  confirmSheet({title:`Leave "${p.name}"?`, body:"You won't see its notes any more unless someone adds you back.", ok:"Leave project", danger:true,
    onOk:async()=>{ try{ await fs.doc("projects/"+id).update({members:firebase.firestore.FieldValue.arrayRemove(myEmail())}); setSpace("team"); toast(`You left "${p.name}".`); }catch(e){ toast("Couldn't leave the project."); } } }); }
function deleteProject(id){ const p=S.projects[id]; if(!p) return;
  confirmSheet({title:`Delete "${p.name}"?`, body:"This deletes the project and all its notes for everyone. It can't be undone.", ok:"Delete project", danger:true,
    onOk:async()=>{ try{ const snap=await fs.collection("projects/"+id+"/notes").get(); let b=fs.batch(), n=0;
      for(const d of snap.docs){ b.delete(d.ref); if(++n%400===0){ await b.commit(); b=fs.batch(); } } await b.commit(); await fs.doc("projects/"+id).delete(); setSpace("team"); toast(`Deleted "${p.name}".`); }catch(e){ toast("Couldn't delete the project."); } } }); }

/* ================= shell ================= */
function buildShell(){
  root.innerHTML=`<div class="shell">
    <aside class="side" aria-label="Navigation">
      <div class="brand"><span class="rec"></span>Keep Up with UBR</div>
      <div><p class="side-label">Notebooks</p><div class="nav" id="sideNbs"></div></div>
      <div><p class="side-label">Go to</p><div class="nav" id="sideNav"></div></div>
      <div class="side-foot" id="sideFoot"></div>
    </aside>
    <div>
      <main id="main">
        <div class="topbar" id="topbar"></div>
        <div id="view"></div>
      </main>
    </div>
  </div>
  <button class="fab" id="fab" aria-label="New note">+</button>
  <nav class="tabbar" id="tabbar" aria-label="Sections"></nav>`;
  $("fab").onclick=()=>openSheet({type:"compose"});
  render();
}
const VIEWS=[{id:"notes",label:"Notes",icon:I.notes},{id:"followups",label:"Follow-ups",icon:I.fu},{id:"search",label:"Search",icon:I.search},{id:"more",label:"Settings",icon:I.more}];
function syncHTML(){ const on=navigator.onLine; const cls=!on?"off":S.pending?"pending":""; return `<span class="sync ${cls}"><i></i>${!on?"Offline, will sync later":S.pending?"Syncing…":"Up to date"}</span>`; }
function avatar(uid,cls=""){ const n=realName(uid); return `<span class="av ${cls}" style="background:${colorFor(uid)}" aria-hidden="true">${esc((n[0]||"?").toUpperCase())}</span>`; }
function nbList(){
  const list=Object.values(S.projects).sort((a,b)=>a.name.localeCompare(b.name));
  return [{id:"team",name:"Team notebook",sub:"Everyone on the team"},...list.map(p=>({id:p.id,name:p.name,sub:`Private, ${p.members.length} ${p.members.length===1?"person":"people"}`}))];
}
function renderChrome(){
  if(!$("sideNbs")) return;
  const fuN=openFU().length;
  $("sideNbs").innerHTML=nbList().map(n=>`<button class="nav-btn" data-space="${n.id}" aria-current="${S.space===n.id}"><span class="nb-dot" style="background:${n.id==="team"?"var(--ink)":colorFor(n.id)}"></span><span class="grow">${esc(n.name)}</span>${n.id!=="team"?`<span style="opacity:.6;display:flex">${I.lock.replace('<svg','<svg width="15" height="15" style="stroke:currentColor;fill:none;stroke-width:2"')}</span>`:""}</button>`).join("")+
    `<button class="nav-btn" data-act="new-project" style="color:var(--ink-2)">${I.plus}<span class="grow">New project</span></button>`;
  $("sideNav").innerHTML=VIEWS.map(v=>`<button class="nav-btn" data-view="${v.id}" aria-current="${S.view===v.id}">${v.icon}<span class="grow">${v.label}</span>${v.id==="followups"?`<span class="badge ${fuN?"":"zero"}">${fuN}</span>`:""}</button>`).join("");
  $("sideFoot").innerHTML=`${avatar(S.user.uid,"lg")}<div style="min-width:0"><div class="me-name">${esc(S.user.displayName||S.user.email)}</div>${syncHTML()}</div>`;
  const cur=S.space;
  $("topbar").innerHTML=`<button class="nb-switch" data-act="notebooks" aria-label="Switch notebook"><span class="nb-dot" style="background:${cur==="team"?"var(--ink)":colorFor(cur)}"></span><span class="t">${esc(spaceName())}</span>${I.down}</button>${syncHTML()}`;
  $("tabbar").innerHTML=VIEWS.map(v=>`<button data-view="${v.id}" aria-current="${S.view===v.id}">${v.icon}${v.label}${v.id==="followups"&&fuN?`<span class="badge">${fuN}</span>`:""}</button>`).join("");
  $("fab").style.visibility=(S.view==="notes"||S.view==="followups")?"visible":"hidden";
}

/* ================= views ================= */
function whereLine(){
  const pj=S.space!=="team"?S.projects[S.space]:null;
  return `<div class="where ${pj?"":"team"}"><span class="nb-dot" style="background:${pj?colorFor(pj.id):"var(--ink)"}"></span><strong>${esc(spaceName())}</strong>
    <span>${pj?`private to ${pj.members.length} ${pj.members.length===1?"person":"people"}`:"visible to the whole team"}</span>
    ${pj?`<button class="link" data-act="project" data-id="${pj.id}">${canManage(pj)?"Edit project":"See members"}</button>`:""}</div>`;
}
function composerHTML(p, note){
  const d=note||{}; const tag=note?note.tag:S.draft.tag;
  return `<div class="composer ${p==="i"?"inline":""} ${p!=="i"||S.composerOpen?"open":""}" id="${p}Comp">
    <label class="sr" for="${p}Text">Note</label>
    <textarea id="${p}Text" placeholder="${p==="i"?"Write a note for "+(relDay(S.date).toLowerCase()||fmtShort(S.date))+"…":"What happened? Calls, decisions, release updates, ideas…"}">${esc(d.text||"")}</textarea>
    <div class="more">
      <div class="cats" role="group" aria-label="Category">${TAGS.map(t=>`<button type="button" class="cat" data-cat="${t.id}" data-p="${p}" aria-pressed="${t.id===tag}"><i style="background:${tagColor(t.id)}"></i>${esc(t.label)}</button>`).join("")}</div>
      <input class="input" id="${p}Who" value="${esc(d.who||"")}" placeholder="Person or company (optional)" aria-label="Person or company">
      ${p!=="i"?`<label class="field" style="margin:0"><span>Day</span><input class="input" type="date" id="${p}Date" value="${esc(d.date||S.date)}"></label>`:""}
      <div class="foot">
        <label class="switch"><input type="checkbox" id="${p}Fu" ${d.followUp?"checked":""}> Needs follow-up</label>
        <div style="display:flex;gap:8px">${p==="i"?`<button class="btn" data-act="collapse">Cancel</button>`:""}<button class="btn primary" data-act="save-note" data-p="${p}" ${note?`data-id="${note.id}"`:""}>${note?"Save changes":"Add note"}</button></div>
      </div>
    </div>
  </div>`;
}
function noteHTML(n,opts={}){
  const tg=TAG[n.tag]||TAG.admin;
  const edited=n.editedBy&&n.editedBy!==n.author?` · edited by ${esc(nameOf(n.editedBy))}`:"";
  return `<article class="note ${n.followUp&&n.done?"is-done":""}" style="--c:${tagColor(n.tag)}">
    <div class="top"><span class="cat-name">${esc(tg.label)}</span><span>${opts.showDate?esc(fmtShort(n.date))+", ":""}${fmtTime(n.createdAt)}</span>${isNew(n)?`<span class="new">New</span>`:""}</div>
    <button class="menu-btn" data-act="note-menu" data-id="${n.id}" aria-label="Note options">⋯</button>
    <div class="text">${highlight(n.text,opts.q)}</div>
    <div class="bottom">
      ${n.followUp?`<button class="fu ${n.done?"done":""}" data-act="toggle-done" data-id="${n.id}" aria-pressed="${!!n.done}"><span class="box">${n.done?"✓":""}</span>${n.done?"Done":"Mark done"}</button>`:""}
      ${n.who?`<span class="person">${esc(n.who)}</span>`:""}
      <span class="hint" style="display:inline-flex;align-items:center;gap:6px;font-size:13px">${avatar(n.author)}${esc(nameOf(n.author))}${edited}</span>
    </div>
  </article>`;
}
function filterChips(){
  return `<div class="chips" role="group" aria-label="Filter notes">
    <button class="chip" data-act="filter-all" aria-pressed="${!S.filter&&!S.mine}">All</button>
    <button class="chip" data-act="filter-mine" aria-pressed="${S.mine}">Mine</button>
    ${TAGS.map(t=>`<button class="chip" data-filter="${t.id}" aria-pressed="${S.filter===t.id}"><i style="background:${tagColor(t.id)}"></i>${esc(t.label)}</button>`).join("")}
  </div>`;
}
function banners(){
  let h="";
  if(!store.get("ln-welcome-"+S.user.uid)) h+=`<div class="welcome"><h2>Welcome, ${esc((S.user.displayName||"").split(" ")[0]||"there")}</h2>
    <ol><li>Write notes for any day. Tap the big date to jump to another day.</li><li>Switch on <strong>Needs follow-up</strong> for anything to chase. It stays in <strong>Follow-ups</strong> until someone marks it done.</li><li>Use <strong>projects</strong> for private notebooks with just a few people, like a single release.</li></ol>
    <button class="btn" data-act="welcome-ok">Got it</button></div>`;
  if(S.legacy&&S.space==="team"){ const n=S.legacy.length; h+=`<div class="banner"><p>This device has ${n} ${n===1?"note":"notes"} from the offline app. Add ${n===1?"it":"them"} to the Team notebook?</p><div style="display:flex;gap:8px"><button class="btn primary" data-act="legacy-yes">Add</button><button class="btn" data-act="legacy-no">Not now</button></div></div>`; }
  if(S.isOwner&&S.teamLoaded&&!S.team.length&&S.space==="team") h+=`<div class="banner"><p>You're the only one here. Add your team so they can join.</p><button class="btn" data-view="more">Add team members</button></div>`;
  return h;
}
function viewNotes(){
  const s=S.date, d=parse(s), t=todayISO(), days=byDate(), monday=addDays(s,-((d.getDay()+6)%7));
  let week=""; for(let i=0;i<7;i++){ const ds=addDays(monday,i), dd=parse(ds), n=(days[ds]||[]).length;
    week+=`<button class="${ds===s?"sel":""} ${ds===t?"today":""}" data-date="${ds}" aria-label="${fmtLong(ds)}, ${n} notes"><span class="d">${DOW[dd.getDay()]}</span><span class="n">${dd.getDate()}</span><span class="pips" aria-hidden="true">${"<b></b>".repeat(Math.min(n,4))}</span></button>`; }
  const dayAll=entriesFor(s), list=dayAll.filter(passes), rel=relDay(s);
  return `<div class="notes-layout"><div class="col-main">${banners()}${whereLine()}
  <div class="day-head">
    <button class="date-btn" data-act="calendar" aria-label="Pick a date. Showing ${fmtLong(s)}"><span class="num">${d.getDate()}</span><span class="rest">${MON[d.getMonth()]} <span>${rel||DOW_LONG[d.getDay()]}</span>${I.down}</span></button>
    <div class="day-nav"><button class="icon-btn" data-act="shift" data-n="-1" aria-label="Previous day">‹</button>${s!==t?`<button class="btn" data-act="today">Today</button>`:""}<button class="icon-btn" data-act="shift" data-n="1" aria-label="Next day">›</button></div>
  </div>
  <div class="week">${week}</div>
  ${composerHTML("i")}
  ${dayAll.length?filterChips():""}
  <div class="list">${!S.notesReady?`<div class="empty"><strong>Loading notes…</strong></div>`:list.length?list.map(n=>noteHTML(n)).join(""):
    `<div class="empty"><strong>${dayAll.length?"Nothing matches this filter":"No notes for "+(rel?rel.toLowerCase():"this day")+" yet"}</strong>${dayAll.length?`<button class="link" data-act="filter-all">Show all notes</button>`:(isPhone()?"Tap the red + button to add the first one.":"Write the first one in the box above.")}</div>`}</div>
  </div>${railHTML()}</div>`;
}
function railHTML(){
  const t=todayISO();
  const open=openFU().sort((a,b)=>a.date.localeCompare(b.date)||a.createdAt.localeCompare(b.createdAt));
  const pj=S.space!=="team"?S.projects[S.space]:null;
  const people=pj?pj.members:teamEmails();
  return `<aside class="rail" aria-label="Overview">
    <section class="card"><div id="railCal">${calendarHTML()}</div></section>
    <section class="card"><h3>Follow-ups <span class="hint">${open.length} to do</span></h3>
      ${open.length?`<div class="mini">${open.slice(0,6).map(n=>`<button data-date="${n.date}"><i style="background:${n.date<t?"var(--rec)":tagColor(n.tag)}"></i><span>${esc(n.text)}</span><small>${esc(relDay(n.date)||fmtShort(n.date))}, ${esc(nameOf(n.author))}</small></button>`).join("")}</div>
        ${open.length>6?`<button class="link" data-view="followups">See all ${open.length}</button>`:""}`:`<p class="hint" style="margin:0">Nothing to chase. Switch on "Needs follow-up" when adding a note.</p>`}
    </section>
    <section class="card"><h3>${pj?"In this project":"The team"} <span class="hint">${people.length}</span></h3>
      <div class="mini">${people.slice(0,8).map(e=>`<div style="display:flex;align-items:center;gap:10px;padding:6px 8px;font-size:14px"><span class="av" style="background:${colorFor(e)}">${esc((emailName(e)[0]||"?").toUpperCase())}</span>${esc(emailName(e))}</div>`).join("")}</div>
      ${pj?`<button class="link" data-act="project" data-id="${pj.id}">${canManage(pj)?"Edit project":"See members"}</button>`:S.isOwner?`<button class="link" data-view="more">Manage team</button>`:""}
    </section>
  </aside>`;
}
function grouped(items,q){ const m={}; items.forEach(e=>(m[e.date]=m[e.date]||[]).push(e));
  return Object.keys(m).sort().reverse().map(d=>`<div class="group"><span>${esc(relDay(d)||fmtShort(d))}</span><button class="link" data-act="goto" data-date="${d}">Open day</button></div><div class="list">${m[d].sort((a,b)=>a.createdAt.localeCompare(b.createdAt)).map(e=>noteHTML(e,{q})).join("")}</div>`).join(""); }
function viewFollowups(){
  const t=todayISO();
  const open=openFU().filter(passes).sort((a,b)=>a.date.localeCompare(b.date)||a.createdAt.localeCompare(b.createdAt));
  const done=all().filter(n=>n.followUp&&n.done&&passes(n)).sort((a,b)=>(b.updatedAt||"").localeCompare(a.updatedAt||"")).slice(0,60);
  const sec=(title,items,hint)=>items.length?`<div class="group"><span>${title}</span><span class="hint">${hint||items.length}</span></div><div class="list">${items.map(n=>noteHTML(n,{showDate:true})).join("")}</div>`:"";
  let body;
  if(S.fuTab==="open"){
    body=open.length? sec("Earlier",open.filter(n=>n.date<t))+sec("Today",open.filter(n=>n.date===t))+sec("Coming up",open.filter(n=>n.date>t))
      : `<div class="empty"><strong>All caught up</strong>Switch on "Needs follow-up" when adding a note and it waits here until someone marks it done.</div>`;
  } else body=done.length?`<div class="list">${done.map(n=>noteHTML(n,{showDate:true})).join("")}</div>`:`<div class="empty"><strong>Nothing marked done yet</strong>Tap "Mark done" on a follow-up once it's handled.</div>`;
  return `${whereLine()}<h1 class="page-title">Follow-ups</h1><p class="sub">Things the team still needs to chase in ${esc(spaceName())}. Tap the circle to mark one done.</p>
    <div class="seg" role="group"><button data-act="fu-tab" data-tab="open" aria-pressed="${S.fuTab==="open"}">To do (${open.length})</button><button data-act="fu-tab" data-tab="done" aria-pressed="${S.fuTab==="done"}">Done</button></div>
    ${filterChips()}${body}`;
}
function viewSearch(){
  const q=S.query.trim().toLowerCase();
  const items=q?all().filter(e=>passes(e)&&((e.text||"").toLowerCase().includes(q)||(e.who||"").toLowerCase().includes(q)||(TAG[e.tag]?.label||"").toLowerCase().includes(q)||nameOf(e.author).toLowerCase().includes(q))):[];
  return `${whereLine()}<h1 class="page-title">Search</h1>
    <input class="input search-big" id="searchBox" type="search" value="${esc(S.query)}" placeholder="Search ${esc(spaceName())}: names, songs, companies…" aria-label="Search notes">
    ${filterChips()}
    ${!q?`<p class="hint">Search looks through every note in ${esc(spaceName())}, including who wrote it.</p>`:items.length?`<p class="hint">${items.length} ${items.length===1?"note":"notes"} found</p>${grouped(items,S.query.trim())}`:`<div class="empty"><strong>No matches</strong>Try a person's name, a song title or a company.</div>`}`;
}
function viewMore(){
  const people=teamEmails();
  return `<h1 class="page-title">Settings</h1><p class="sub">Your account, your team and the app.</p>
  <section class="card"><h2>Your account</h2>
    <div class="who" style="margin:10px 0 14px">${avatar(S.user.uid,"lg")}<div><div class="me-name">${esc(S.user.displayName||"")}</div><div class="hint">${esc(S.user.email)}</div></div></div>
    <label class="label" for="myName">Name shown on your notes</label>
    <div style="display:flex;gap:8px"><input class="input" id="myName" value="${esc(S.user.displayName||"")}"><button class="btn" data-act="save-name">Save</button></div>
    <div style="margin-top:14px"><button class="btn danger" data-act="sign-out">Sign out</button></div>
  </section>
  <section class="card"><h2>Team members</h2>
    <p class="hint" style="margin:0">${S.isOwner?"Only people on this list can open the notebook. Add the email each person will sign up with, then send them the app link.":"Everyone who can open the Team notebook. The owner manages this list."}</p>
    <ul class="members">${people.map(e=>`<li><span class="who"><span>${esc(emailName(e))}${emailName(e)!==e?`<br><span class="hint">${esc(e)}</span>`:""}</span></span>${e===OWNER?`<span class="hint">Owner</span>`:S.isOwner?`<button class="link" style="color:var(--rec)" data-rm="${esc(e)}">Remove</button>`:""}</li>`).join("")}</ul>
    ${S.isOwner?`<div style="display:flex;gap:8px"><input class="input" id="addEmail" type="email" placeholder="name@email.com" aria-label="Email to add"><button class="btn primary" id="addBtn">Add</button></div>
      <button class="btn" style="margin-top:10px" data-act="copy-link">Copy app link to share</button>`:""}
  </section>
  <section class="card"><h2>Notebooks</h2>
    <p class="hint" style="margin:0 0 10px">Projects are private notebooks for just the people you choose.</p>
    <div class="menu-list">${nbList().map(n=>`<button data-space="${n.id}" class="${S.space===n.id?"on":""}"><span class="nb-dot" style="background:${n.id==="team"?"var(--ink)":colorFor(n.id)}"></span><span>${esc(n.name)}<small>${esc(n.sub)}</small></span></button>`).join("")}
    <button data-act="new-project">${I.plus}<span>New project</span></button></div>
  </section>
  <section class="card"><h2>App</h2>
    <div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:8px">
      ${deferredPrompt?`<button class="btn primary" data-act="install">Install app</button>`:""}
      <button class="btn" data-act="export">Export ${esc(spaceName())} (.md)</button>
      <button class="btn" data-act="show-welcome">Show the quick guide again</button>
    </div>
    <p class="hint" style="margin:12px 0 0">${syncHTML()}</p>
  </section>`;
}

/* ================= render ================= */
function render(){
  if(!$("view")) return;
  renderChrome();
  const v=$("view");
  const keep={ text:$("iText")?.value, who:$("iWho")?.value, fu:$("iFu")?.checked, focus:document.activeElement?.id,
    addEmail:$("addEmail")?.value, myName:$("myName")?.value, selStart:document.activeElement?.selectionStart };
  $("main").classList.toggle("wide",S.view==="notes");
  v.innerHTML=S.view==="followups"?viewFollowups():S.view==="search"?viewSearch():S.view==="more"?viewMore():viewNotes();
  if(keep.text!=null&&$("iText")){ $("iText").value=keep.text; $("iWho").value=keep.who||""; $("iFu").checked=!!keep.fu; }
  if(keep.addEmail&&$("addEmail")) $("addEmail").value=keep.addEmail;
  if(keep.myName!=null&&$("myName")&&keep.focus==="myName") $("myName").value=keep.myName;
  if(keep.focus&&$(keep.focus)&&!S.sheet){ const el=$(keep.focus); el.focus(); if(keep.selStart!=null&&el.setSelectionRange) try{ el.setSelectionRange(keep.selStart,keep.selStart); }catch(e){} }
}
function go(view){ S.view=view; if(view!=="notes") S.composerOpen=false; render(); window.scrollTo({top:0}); if(view==="search") setTimeout(()=>$("searchBox")?.focus(),30); }
function goDay(d){ S.date=d; S.calMonth=d.slice(0,7); S.view="notes"; closeSheet(); render(); window.scrollTo({top:0}); }

/* ================= sheets ================= */
function openSheet(sh){ S.sheet=sh; renderSheet(); }
function closeSheet(){ S.sheet=null; sheetRoot.innerHTML=""; }
function confirmSheet(o){ openSheet({type:"confirm",...o}); }
function renderSheet(){
  const sh=S.sheet; if(!sh){ sheetRoot.innerHTML=""; return; }
  let h="";
  if(sh.type==="compose"){ const n=sh.id?S.notes[sh.id]:null;
    h=`<h2>${n?"Edit note":"New note"}</h2><p class="sub">${esc(spaceName())}</p>${composerHTML("s",n)}`; }
  else if(sh.type==="note-menu"){ const n=S.notes[sh.id]; if(!n) return closeSheet();
    h=`<h2>Note</h2><p class="sub">${esc(n.text.slice(0,90))}${n.text.length>90?"…":""}</p><div class="menu-list">
      <button data-act="edit" data-id="${n.id}">${I.edit}Edit</button>
      <button data-act="move" data-id="${n.id}">${I.move}Move to another day</button>
      ${n.followUp?"":`<button data-act="make-fu" data-id="${n.id}">${I.fu}Add to follow-ups</button>`}
      <button data-act="copy" data-id="${n.id}">${I.copy}Copy text</button>
      <button class="danger" data-act="delete" data-id="${n.id}">${I.trash}Delete</button></div>`; }
  else if(sh.type==="move"){ const n=S.notes[sh.id]; if(!n) return closeSheet();
    h=`<h2>Move to another day</h2><p class="sub">Currently on ${esc(fmtLong(n.date))}</p><input class="input" type="date" id="moveDate" value="${n.date}">
      <div class="actions"><button class="btn" data-act="close">Cancel</button><button class="btn primary" data-act="do-move" data-id="${n.id}">Move note</button></div>`; }
  else if(sh.type==="calendar"){ h=`<h2>Pick a day</h2><div id="calBody">${calendarHTML()}</div><div class="actions"><button class="btn" data-act="today">Go to today</button><button class="btn" data-act="close">Close</button></div>`; }
  else if(sh.type==="notebooks"){
    h=`<h2>Notebooks</h2><p class="sub">Choose where to read and write notes.</p><div class="menu-list">
      ${nbList().map(n=>`<button data-space="${n.id}" class="${S.space===n.id?"on":""}"><span class="nb-dot" style="background:${n.id==="team"?"var(--ink)":colorFor(n.id)}"></span><span>${esc(n.name)}<small>${esc(n.sub)}</small></span></button>`).join("")}
      <button data-act="new-project">${I.plus}<span>New project<small>A private notebook for a few people</small></span></button></div>`; }
  else if(sh.type==="project"){ h=projectHTML(sh.id); }
  else if(sh.type==="confirm"){ h=`<h2>${esc(sh.title)}</h2><p class="sub">${esc(sh.body)}</p><div class="actions"><button class="btn" data-act="close">Cancel</button><button class="btn ${sh.danger?"danger":"primary"}" data-act="confirm-ok">${esc(sh.ok)}</button></div>`; }
  sheetRoot.innerHTML=`<div class="overlay" data-act="overlay"><div class="sheet" role="dialog" aria-modal="true">${h}</div></div>`;
  const first=sheetRoot.querySelector("textarea, input:not([type=checkbox]), .actions .primary, .menu-list button");
  if(first) setTimeout(()=>first.focus(),20);
}
function calendarHTML(){
  const days=byDate(), [y,m]=S.calMonth.split("-").map(Number), first=new Date(y,m-1,1), start=new Date(first); start.setDate(1-first.getDay()); const t=todayISO();
  let g=DOW.map(d=>`<div class="dow" aria-hidden="true">${d[0]}</div>`).join("");
  for(let i=0;i<42;i++){ const d=new Date(start); d.setDate(start.getDate()+i); const s=iso(d);
    g+=`<button class="${d.getMonth()!==m-1?"out":""} ${s===t?"today":""} ${s===S.date?"sel":""} ${days[s]?"has":""}" data-date="${s}" aria-label="${fmtLong(s)}${days[s]?`, ${days[s].length} notes`:""}">${d.getDate()}</button>`; }
  return `<div class="cal-head"><button class="icon-btn" data-act="cal-move" data-n="-1" aria-label="Previous month">‹</button><strong>${MON[m-1]} ${y}</strong><button class="icon-btn" data-act="cal-move" data-n="1" aria-label="Next month">›</button></div><div class="cal">${g}</div>`;
}
function projectHTML(id){
  const p=id?S.projects[id]:null; if(id&&!p) return "";
  const manage=!p||canManage(p), current=new Set(p?p.members:[myEmail()]), people=teamEmails();
  if(!manage) return `<h2>${esc(p.name)}</h2><p class="sub">Only these people can see this project.</p>
    <ul class="members">${p.members.map(e=>`<li><span>${esc(emailName(e))}${emailName(e)!==e?`<br><span class="hint">${esc(e)}</span>`:""}</span></li>`).join("")}</ul>
    <p class="hint">Only the person who created the project (or the owner) can change who's in it.</p>
    <div class="actions"><button class="btn danger" data-act="leave-project" data-id="${p.id}">Leave project</button><button class="btn primary" data-act="close">Done</button></div>`;
  return `<h2>${p?"Edit project":"New project"}</h2><p class="sub">${p?"Change the name or who can see it.":"A private notebook, e.g. for one release or artist. Only the people you tick can see it."}</p>
    <label class="label" for="pjName">Project name</label><input class="input" id="pjName" value="${esc(p?p.name:"")}" placeholder="e.g. Ve Mahiya release">
    <span class="label">Who can see it</span>
    <div class="people">${people.map(e=>{ const me=e===myEmail(); return `<label class="person-row"><input type="checkbox" data-pjm value="${esc(e)}" ${current.has(e)||me?"checked":""} ${me?"disabled":""}><span>${esc(emailName(e))}${emailName(e)!==e?`<br><span class="hint">${esc(e)}</span>`:""}</span></label>`; }).join("")}</div>
    ${people.length<=1?`<p class="hint">Only team members can be added. ${S.isOwner?"Add them in Settings → Team members first.":"Ask the owner to add them to the team first."}</p>`:""}
    <div class="actions">${p?`<button class="btn danger" data-act="delete-project" data-id="${p.id}" style="margin-right:auto">Delete</button>`:""}<button class="btn" data-act="close">Cancel</button><button class="btn primary" id="pjSave" data-act="save-project" ${p?`data-id="${p.id}"`:""}>${p?"Save changes":"Create project"}</button></div>`;
}
function submitComposer(p, id){
  const text=$(p+"Text").value.trim();
  if(!text){ $(p+"Text").focus(); toast("Write something first."); return; }
  const active=document.querySelector(`[data-cat][data-p="${p}"][aria-pressed="true"]`);
  const tag=active?active.dataset.cat:"meeting"; S.draft.tag=tag;
  const date=$(p+"Date")?.value||(id?S.notes[id].date:S.date);
  const fields={text, tag, who:$(p+"Who").value.trim(), followUp:$(p+"Fu").checked, date};
  if(id&&!fields.followUp) fields.done=false;
  saveNote(fields, id);
  if(p==="s"){ closeSheet(); if(!id&&date!==S.date){ S.date=date; S.calMonth=date.slice(0,7); } }
  else { $("iText").value=""; $("iWho").value=""; $("iFu").checked=false; S.composerOpen=false; }
  render();
  toast(id?"Changes saved":navigator.onLine?`Added to ${spaceName()}`:"Saved. It will sync when you're back online.");
}

/* ================= events ================= */
document.addEventListener("click",ev=>{
  if(!$("view")) return;
  const ov=ev.target.closest("[data-act=overlay]"); if(ov&&ev.target===ov){ closeSheet(); return; }
  const b=ev.target.closest("button"); if(!b||b.disabled) return;
  if(b.dataset.view){ closeSheet(); go(b.dataset.view); return; }
  if(b.dataset.space){ closeSheet(); if(b.dataset.space!==S.space) setSpace(b.dataset.space); if(S.view==="more") S.view="notes"; render(); return; }
  if(b.dataset.date){ goDay(b.dataset.date); return; }
  if(b.dataset.cat){ document.querySelectorAll(`[data-cat][data-p="${b.dataset.p}"]`).forEach(x=>x.setAttribute("aria-pressed",x===b?"true":"false")); if(b.dataset.p==="i") S.draft.tag=b.dataset.cat; return; }
  if(b.dataset.filter){ S.filter=S.filter===b.dataset.filter?null:b.dataset.filter; render(); return; }
  if(b.dataset.rm){ removeMember(b.dataset.rm); return; }
  if(b.id==="addBtn"){ addMember(); return; }
  const act=b.dataset.act, id=b.dataset.id; if(!act) return;
  switch(act){
    case "close": closeSheet(); break;
    case "confirm-ok": { const f=S.sheet&&S.sheet.onOk; closeSheet(); if(f) f(); break; }
    case "shift": goDay(addDays(S.date,Number(b.dataset.n))); break;
    case "today": goDay(todayISO()); break;
    case "goto": goDay(b.dataset.date); break;
    case "calendar": S.calMonth=S.date.slice(0,7); openSheet({type:"calendar"}); break;
    case "cal-move": { const [y,m]=S.calMonth.split("-").map(Number); const d=new Date(y,m-1+Number(b.dataset.n),1); S.calMonth=`${d.getFullYear()}-${pad(d.getMonth()+1)}`; if($("calBody")) $("calBody").innerHTML=calendarHTML(); if($("railCal")) $("railCal").innerHTML=calendarHTML(); break; }
    case "notebooks": openSheet({type:"notebooks"}); break;
    case "new-project": openSheet({type:"project"}); break;
    case "project": openSheet({type:"project",id}); break;
    case "save-project": saveProject(id); break;
    case "leave-project": leaveProject(id); break;
    case "delete-project": deleteProject(id); break;
    case "filter-all": S.filter=null; S.mine=false; render(); break;
    case "filter-mine": S.mine=!S.mine; render(); break;
    case "fu-tab": S.fuTab=b.dataset.tab; render(); break;
    case "collapse": S.composerOpen=false; $("iText").value=""; render(); break;
    case "save-note": submitComposer(b.dataset.p, id); break;
    case "note-menu": openSheet({type:"note-menu",id}); break;
    case "edit": openSheet({type:"compose",id}); break;
    case "move": openSheet({type:"move",id}); break;
    case "do-move": { const n=S.notes[id], target=$("moveDate").value; if(!target){ toast("Pick a day."); return; }
      if(target!==n.date){ const t=parse(target), c=new Date(n.createdAt); t.setHours(c.getHours(),c.getMinutes(),c.getSeconds()); updateNote(id,{date:target,createdAt:t.toISOString()}); toast(`Moved to ${fmtLong(target)}`); }
      closeSheet(); break; }
    case "make-fu": updateNote(id,{followUp:true,done:false}); closeSheet(); toast("Added to follow-ups"); break;
    case "copy": { const n=S.notes[id]; navigator.clipboard?.writeText(n.text).then(()=>toast("Copied")).catch(()=>toast("Couldn't copy on this device.")); closeSheet(); break; }
    case "delete": confirmSheet({title:"Delete this note?", body:"It will be deleted for everyone in "+spaceName()+". This can't be undone.", ok:"Delete", danger:true, onOk:()=>{ deleteNote(id); toast("Note deleted"); }}); break;
    case "toggle-done": { const n=S.notes[id]; updateNote(id,{done:!n.done}); toast(n.done?"Moved back to follow-ups":"Marked done"); break; }
    case "welcome-ok": store.set("ln-welcome-"+S.user.uid,"1"); render(); break;
    case "show-welcome": store.set("ln-welcome-"+S.user.uid,""); try{ localStorage.removeItem("ln-welcome-"+S.user.uid); }catch(e){} go("notes"); break;
    case "legacy-yes": importLegacy(); break;
    case "legacy-no": S.legacy=null; store.set("label-notebook-imported-"+S.user.uid,"skipped"); render(); break;
    case "save-name": { const nm=$("myName").value.trim(); if(!nm){ toast("Enter a name."); return; }
      S.user.updateProfile({displayName:nm}).then(()=>{ fs.doc("profiles/"+S.user.uid).set({name:nm},{merge:true}).catch(()=>{}); toast("Name updated"); render(); }).catch(()=>toast("Couldn't update your name.")); break; }
    case "sign-out": confirmSheet({title:"Sign out?", body:"You'll need your email and password to sign back in on this device.", ok:"Sign out", onOk:()=>auth.signOut()}); break;
    case "copy-link": navigator.clipboard?.writeText(location.href.split("#")[0].replace(/index\.html$/,"")).then(()=>toast("App link copied. Paste it into WhatsApp or email.")).catch(()=>toast(location.href)); break;
    case "export": exportAll(); break;
    case "install": promptInstall(); break;
  }
});
document.addEventListener("focusin",ev=>{ if(ev.target.id==="iText"&&!S.composerOpen){ S.composerOpen=true; $("iComp")?.classList.add("open"); } });
document.addEventListener("input",ev=>{ if(ev.target.id==="searchBox"){ clearTimeout(window.__st); window.__st=setTimeout(()=>{ S.query=ev.target.value; render(); },150); } });
document.addEventListener("keydown",ev=>{
  if(ev.key==="Escape"){ if(S.sheet){ closeSheet(); return; } if(S.composerOpen){ S.composerOpen=false; render(); } return; }
  if(ev.target.id==="addEmail"&&ev.key==="Enter"){ addMember(); return; }
  if(ev.target.id==="pjName"&&ev.key==="Enter"){ saveProject(S.sheet&&S.sheet.id); return; }
  if(ev.target.id==="myName"&&ev.key==="Enter"){ document.querySelector('[data-act="save-name"]')?.click(); return; }
  if((ev.ctrlKey||ev.metaKey)&&ev.key==="Enter"){ if(ev.target.id==="iText"){ ev.preventDefault(); submitComposer("i"); } else if(ev.target.id==="sText"){ ev.preventDefault(); submitComposer("s", S.sheet&&S.sheet.id); } }
  // "n" opens a new note (when not typing)
  if(ev.key==="n"&&!ev.ctrlKey&&!ev.metaKey&&!/INPUT|TEXTAREA/.test(ev.target.tagName)&&!S.sheet&&$("view")){ ev.preventDefault(); if(isPhone()) openSheet({type:"compose"}); else { go("notes"); setTimeout(()=>$("iText")?.focus(),20); } }
});
window.addEventListener("online",renderChrome); window.addEventListener("offline",renderChrome);

/* ================= export / install ================= */
function exportAll(){
  const days=byDate(), dates=Object.keys(days).sort(); if(!dates.length){ toast("There are no notes to export yet."); return; }
  let md=`# ${spaceName()}\n\nExported ${fmtLong(todayISO())}\n`;
  dates.forEach(d=>{ md+=`\n## ${fmtLong(d)}\n\n`; entriesFor(d).forEach(e=>{ const fu=e.followUp?(e.done?" [done]":" [FOLLOW UP]"):"";
    md+=`- **${fmtTime(e.createdAt)}, ${TAG[e.tag]?.label||e.tag}**${e.who?` (${e.who})`:""}${fu}, by ${nameOf(e.author)}: ${e.text.replace(/\n/g,"\n  ")}\n`; }); });
  const file=new File([md],`${spaceName().toLowerCase().replace(/[^a-z0-9]+/g,"-")}-${todayISO()}.md`,{type:"text/markdown"});
  if(navigator.canShare&&navigator.canShare({files:[file]})&&isPhone()){ navigator.share({files:[file]}).catch(()=>{}); return; }
  const url=URL.createObjectURL(file), a=document.createElement("a"); a.href=url; a.download=file.name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(url),4000);
}
let deferredPrompt=null;
window.addEventListener("beforeinstallprompt",e=>{ e.preventDefault(); deferredPrompt=e; if(S.view==="more") render(); });
window.addEventListener("appinstalled",()=>{ deferredPrompt=null; toast("Installed. Open Keep Up with UBR from your apps."); });
async function promptInstall(){ if(!deferredPrompt) return; deferredPrompt.prompt(); await deferredPrompt.userChoice.catch(()=>{}); deferredPrompt=null; render(); }
if("serviceWorker" in navigator && location.protocol!=="file:") navigator.serviceWorker.register("sw.js").catch(()=>{});
})();
