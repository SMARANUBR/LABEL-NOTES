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
  bell:'<svg viewBox="0 0 24 24"><path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15z"/><path d="M10 20a2 2 0 0 0 4 0"/></svg>',
  clip:'<svg viewBox="0 0 24 24"><path d="M20.5 11.5l-8.4 8.4a5 5 0 0 1-7.1-7.1l8.4-8.4a3.4 3.4 0 0 1 4.8 4.8l-8.4 8.4a1.7 1.7 0 0 1-2.4-2.4l7.7-7.7"/></svg>',
  chat:'<svg viewBox="0 0 24 24"><path d="M4 5h16v11H9l-5 4z"/><path d="M8 9.5h8M8 12.5h5"/></svg>',
  thread:'<svg viewBox="0 0 24 24"><path d="M5 4v9a3 3 0 0 0 3 3h11"/><path d="M15 12l4 4-4 4"/><path d="M9 4h10M9 8h7"/></svg>',
  back:'<svg viewBox="0 0 24 24" width="22" height="22" style="stroke:currentColor;fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round"><path d="M15 5l-7 7 7 7"/></svg>',
  send:'<svg viewBox="0 0 24 24" width="20" height="20" style="stroke:currentColor;fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round"><path d="M4 12l16-8-6 16-2.5-6.5z"/><path d="M11.5 13.5L20 4"/></svg>',
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
  draft:{tag:"meeting"}, composerOpen:false, sheet:null, seenAt:"", legacy:null,
  alerts:{}, alertsReady:false, notify:new Set(),
  rooms:{}, roomsReady:false, roomsErr:null, room:null, thread:null, roomTab:"chat", msgs:[], msgsReady:false, msgsErr:null, threads:{}, sel:null, drafts:{}, stick:false };
let unsub=[], notesUnsub=null;
function stopAll(){ if(typeof stopRoom==='function') stopRoom(); unsub.forEach(f=>{try{f();}catch(e){}}); unsub=[]; if(notesUnsub){ notesUnsub(); notesUnsub=null; } }
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

auth.onAuthStateChanged(u=>{ stopAll(); Object.assign(S,{notes:{},notesReady:false,teamLoaded:false,member:false,profiles:{},legacy:null,projects:{},projectsReady:false,sheet:null,rooms:{},roomsReady:false,room:null,thread:null,msgs:[],threads:{},sel:null,drafts:{},alerts:{},alertsReady:false}); if(!u) return authScreen(); onUser(u); });
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
  unsub.push(fs.collection("notifications").where("to","==",myEmail()).limit(150).onSnapshot(snap=>{
    const first=!S.alertsReady;
    snap.docChanges().forEach(ch=>{
      const v={id:ch.doc.id,...ch.doc.data()};
      if(ch.type==="removed"){ delete S.alerts[v.id]; return; }
      S.alerts[v.id]=v;
      if(!first&&ch.type==="added"&&!v.read) announce(v);
    });
    S.alertsReady=true; renderChrome(); if(S.view==="alerts") render();
  }, ()=>{ S.alertsReady=true; }));
  watchRooms();
  checkLegacy();
}
function setSpace(id){
  if(id!=="team"&&!S.projects[id]) id="team";
  // remember when you last looked at the notebook you're leaving
  if(S.space) store.set("ln-seen-"+S.user.uid+"-"+S.space, nowISO());
  S.space=id; S.filter=null; S.mine=false; S.atMe=false; closeMentions(); store.set("ln-space-"+S.user.uid,id);
  S.notify=new Set(defaultNotify());
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
const passes=n=>(!S.filter||n.tag===S.filter)&&(!S.mine||n.author===S.user.uid)&&(!S.atMe||mentionsMe(n));
const nameOf=uid=>!uid?"Someone":uid===S.user.uid?"You":(S.profiles[uid]?.name||"Someone");
const realName=uid=>uid===S.user.uid?(S.user.displayName||S.user.email):(S.profiles[uid]?.name||"?");
const isNew=n=>n.editedBy&&n.editedBy!==S.user.uid&&(n.updatedAt||"")>S.seenAt;
const spaceName=(id=S.space)=>id==="team"?"Team notebook":(S.projects[id]?.name||"Project");
const teamEmails=()=>[...new Set([OWNER,...S.team])].sort();
function emailName(e){ if(e===myEmail()) return "You"; const p=Object.values(S.profiles).find(x=>x.email===e); return p&&p.name?p.name:e; }
const canManage=p=>p&&(p.createdBy===S.user.uid||S.isOwner);
function fail(e){ toast(e&&e.code==="permission-denied"?"You don't have permission to do that.":"Couldn't save. It will retry when you're back online."); }
function highlight(text,q){ const safe=esc(text); if(!q) return safe; const re=new RegExp(esc(q).replace(/[.*+?^${}()|[\]\\]/g,"\\$&"),"gi"); return safe.replace(re,m=>`<mark>${m}</mark>`); }

function saveNote(fields, id, recipients){
  if(id){ notesCol().doc(id).update({...fields, updatedAt:nowISO(), editedBy:S.user.uid}).catch(fail); return; }
  const now=new Date(), d=parse(fields.date); d.setHours(now.getHours(),now.getMinutes(),now.getSeconds(),now.getMilliseconds());
  const ref=notesCol().doc();
  ref.set({...fields, done:false, createdAt:d.toISOString(), updatedAt:nowISO(), author:S.user.uid, editedBy:S.user.uid}).catch(fail);
  if(recipients&&recipients.length) sendAlerts(recipients, {noteId:ref.id, date:fields.date, text:fields.text});
}

/* ================= attachments =================
 * Files live in Firestore itself, so this works on the free Spark plan:
 *   files/{id}            name, type, size, number of pieces, which notebook (space)
 *   files/{id}/chunks/{n} the file's bytes, base64, about 700 KB per piece
 * Each note keeps a short list of its files (plus a tiny preview for images). */
const FILE_MAX=15*1048576, CHUNK=700000;
S.att={i:[],s:[]};
const fmtSize=b=>!b?"":b<1024?b+" B":b<1048576?Math.round(b/1024)+" KB":(b/1048576).toFixed(1)+" MB";
const extOf=n=>{ const m=/\.([a-z0-9]{1,6})$/i.exec(String(n||"")); return m?m[1].toLowerCase():""; };
const kindOf=a=>{ const t=String(a.type||""), e=extOf(a.name);
  if(t.startsWith("image/")) return "image";
  if(t.startsWith("audio/")||/^(mp3|wav|m4a|aac|ogg|flac|aif|aiff)$/.test(e)) return "audio";
  if(t.startsWith("video/")||/^(mp4|mov|webm|m4v)$/.test(e)) return "video";
  if(t==="application/pdf"||e==="pdf") return "pdf";
  return "doc"; };
const badge=a=>{ const k=kindOf(a); return k==="pdf"?"PDF":k==="audio"?"♪":k==="video"?"▶":(extOf(a.name).toUpperCase().slice(0,4)||"FILE"); };
const safeThumb=t=>typeof t==="string"&&t.length<60000&&/^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(t)?t:"";
const okFileId=id=>typeof id==="string"&&/^[A-Za-z0-9]{10,40}$/.test(id);
const fileURLs=new Map();
function readDataURL(blob){ return new Promise((res,rej)=>{ const r=new FileReader(); r.onload=()=>res(r.result); r.onerror=()=>rej(r.error); r.readAsDataURL(blob); }); }
async function makeThumb(file){
  if(!/^image\/(png|jpe?g|gif|webp|bmp)$/.test(file.type)) return "";
  try{ const url=URL.createObjectURL(file);
    const img=await new Promise((res,rej)=>{ const i=new Image(); i.onload=()=>res(i); i.onerror=rej; i.src=url; });
    const k=Math.min(1,320/Math.max(img.width,img.height)), c=document.createElement("canvas");
    c.width=Math.max(1,Math.round(img.width*k)); c.height=Math.max(1,Math.round(img.height*k));
    const g=c.getContext("2d"); g.fillStyle="#fff"; g.fillRect(0,0,c.width,c.height); g.drawImage(img,0,0,c.width,c.height);
    URL.revokeObjectURL(url); return c.toDataURL("image/jpeg",.72);
  }catch(e){ return ""; }
}
function attChips(p){
  return S.att[p].map(a=>{
    const th=safeThumb(a.thumb), thumb=th?`<img class="th" src="${th}" alt="">`:`<span class="th">${esc(badge(a))}</span>`;
    const st=a.status==="uploading"?`<small><span class="spin"></span>${a.pct?`Uploading ${a.pct}%`:"Preparing…"}</small>`:a.status==="error"?`<small class="bad">${esc(a.err)}</small>`:`<small>${fmtSize(a.size)}</small>`;
    return `<div class="pchip ${a.status==="error"?"failed":""}">${thumb}<span class="nm"><b title="${esc(a.name)}">${esc(a.name)}</b>${st}</span><button type="button" class="x" data-act="rm-att" data-p="${p}" data-key="${a.key}" aria-label="Remove ${esc(a.name)}">×</button></div>`;
  }).join("");
}
function refreshAtt(p){ const el=$(p+"Atts"); if(el) el.innerHTML=attChips(p); }
function addFiles(files,p){
  for(const f of Array.from(files||[])){
    if(!f.size){ toast(`"${f.name}" is empty.`); continue; }
    if(f.size>FILE_MAX){ toast(`"${f.name}" is ${fmtSize(f.size)}. Files can be up to ${fmtSize(FILE_MAX)}. For bigger files, paste a Drive link in the note.`); continue; }
    const a={key:Math.random().toString(36).slice(2,10), name:f.name||"file", type:f.type||"application/octet-stream", size:f.size, status:"uploading", pct:0, fresh:true, space:S.space};
    S.att[p].push(a); upload(f,a,p);
  }
  if(p==="i"&&!S.composerOpen){ S.composerOpen=true; $("iComp")?.classList.add("open"); }
  refreshAtt(p);
}
async function upload(f,a,p){
  try{
    a.thumb=await makeThumb(f); refreshAtt(p);
    const data=(await readDataURL(f)).split(",")[1]||"";
    a.chunks=Math.max(1,Math.ceil(data.length/CHUNK));
    const ref=fs.collection("files").doc(); a.id=ref.id;
    await ref.set({space:a.space, name:a.name, type:a.type, size:a.size, chunks:a.chunks, createdBy:S.user.uid, createdAt:nowISO()});
    for(let i=0;i<a.chunks;i++){
      if(a.cancelled) break;
      await ref.collection("chunks").doc(String(i)).set({d:data.slice(i*CHUNK,(i+1)*CHUNK)});
      a.pct=Math.round((i+1)/a.chunks*100); refreshAtt(p);
    }
    if(a.cancelled){ removeFile(a.id,a.chunks); return; }
    a.status="done"; refreshAtt(p);
  }catch(e){
    a.status="error";
    a.err=e&&e.code==="permission-denied"?"Not allowed yet: the file rules need adding in Firebase":"Upload failed. Check your connection and try again";
    if(a.id) removeFile(a.id,a.chunks);
    refreshAtt(p);
  }
}
function removeFile(id,chunks){
  if(!okFileId(id)) return;
  const b=fs.batch(); for(let i=0;i<(chunks||1);i++) b.delete(fs.doc(`files/${id}/chunks/${i}`)); b.delete(fs.doc("files/"+id));
  b.commit().catch(()=>{});
  if(fileURLs.has(id)){ URL.revokeObjectURL(fileURLs.get(id)); fileURLs.delete(id); }
}
function removeAtt(p,key){
  const L=S.att[p], i=L.findIndex(a=>a.key===key); if(i<0) return;
  const [a]=L.splice(i,1);
  if(a.status==="uploading") a.cancelled=true;
  else if(a.fresh&&a.id) removeFile(a.id,a.chunks); // never saved on a note, so tidy it away now
  refreshAtt(p);
}
function discardAtt(p){ S.att[p].forEach(a=>{ if(a.status==="uploading") a.cancelled=true; else if(a.fresh&&a.id) removeFile(a.id,a.chunks); }); S.att[p]=[]; }
const savedAtts=L=>L.filter(a=>a.status==="done"&&okFileId(a.id)).map(a=>({id:a.id,name:String(a.name).slice(0,200),type:a.type,size:a.size||0,chunks:a.chunks||1,thumb:safeThumb(a.thumb)}));
async function loadFile(a){
  if(fileURLs.has(a.id)) return fileURLs.get(a.id);
  const parts=await Promise.all(Array.from({length:a.chunks||1},(_,i)=>fs.doc(`files/${a.id}/chunks/${i}`).get().then(d=>{ if(!d.exists) throw {code:"not-found"}; return d.data().d||""; })));
  const bin=atob(parts.join("")), u=new Uint8Array(bin.length); for(let i=0;i<bin.length;i++) u[i]=bin.charCodeAt(i);
  const url=URL.createObjectURL(new Blob([u],{type:a.type||"application/octet-stream"})); fileURLs.set(a.id,url); return url;
}
function attsHTML(n){
  const L=(Array.isArray(n.attachments)?n.attachments:[]).filter(a=>a&&okFileId(a.id)); if(!L.length) return "";
  const pics=L.filter(a=>kindOf(a)==="image"&&safeThumb(a.thumb)), rest=L.filter(a=>!pics.includes(a));
  return `<div class="atts">
    ${pics.length?`<div class="att-imgs">${pics.map(a=>`<button type="button" class="att-img" data-act="open-file" data-id="${n.id}" data-file="${a.id}" aria-label="Open ${esc(a.name)}"><img src="${safeThumb(a.thumb)}" alt="${esc(a.name)}" loading="lazy"></button>`).join("")}</div>`:""}
    ${rest.length?`<div class="att-files">${rest.map(a=>`<button type="button" class="att-file" data-act="open-file" data-id="${n.id}" data-file="${a.id}"><span class="ico ${kindOf(a)}">${esc(badge(a))}</span><span class="nm"><b>${esc(a.name)}</b><small>${fmtSize(a.size)}</small></span></button>`).join("")}</div>`:""}
  </div>`;
}
async function openFile(noteId,fileId){
  const n=S.notes[noteId], a=n&&(n.attachments||[]).find(x=>x.id===fileId); if(!a) return;
  openSheet({type:"file", a, url:null, err:""});
  try{ const url=await loadFile(a); if(S.sheet&&S.sheet.type==="file"&&S.sheet.a.id===a.id){ S.sheet.url=url; renderSheet(); } }
  catch(e){ if(S.sheet&&S.sheet.type==="file"){ S.sheet.err=e&&e.code==="not-found"?"This file was deleted.":e&&e.code==="permission-denied"?"You don't have access to this file.":"Couldn't open the file. Check your connection and try again."; renderSheet(); } }
}
function fileSheetHTML(sh){
  const a=sh.a, k=kindOf(a);
  let body;
  if(sh.err) body=`<p class="err">${esc(sh.err)}</p>`;
  else if(!sh.url) body=`<p class="hint"><span class="spin"></span>Opening ${esc(fmtSize(a.size))}…</p>`;
  else if(k==="image") body=`<img class="viewer-img" src="${sh.url}" alt="${esc(a.name)}">`;
  else if(k==="audio") body=`<audio class="viewer-media" src="${sh.url}" controls autoplay></audio>`;
  else if(k==="video") body=`<video class="viewer-media" src="${sh.url}" controls playsinline></video>`;
  else if(k==="pdf"&&!isPhone()) body=`<iframe class="viewer-pdf" src="${sh.url}" title="${esc(a.name)}"></iframe>`;
  else body=`<p class="hint">Download the file to open it on this device.</p>`;
  return `<h2 class="file-title">${esc(a.name)}</h2><p class="sub">${esc(fmtSize(a.size))}</p>${body}
    <div class="actions">${sh.url?`<a class="btn" href="${sh.url}" download="${esc(a.name)}">Download</a>${k==="pdf"?`<a class="btn" href="${sh.url}" target="_blank" rel="noopener">Open in new tab</a>`:""}`:""}<button class="btn primary" data-act="close">Close</button></div>`;
}

/* ================= notifications ================= */
const spaceMembers=()=>S.space==="team"?teamEmails():(S.projects[S.space]?.members||[]);
const defaultNotify=()=>S.space==="team"?[]:spaceMembers().filter(e=>e!==myEmail());
const profileByEmail=e=>Object.values(S.profiles).find(p=>p.email===e);
/* ---- @mentions ---- */
const EVERYONE=["everyone","all"];
const rxEsc=s=>s.replace(/[.*+?^${}()|[\]\\]/g,"\\$&");
const fullName=e=>(profileByEmail(e)?.name||e.split("@")[0]).trim();
let MX={key:"",idx:null};
function mentionIndex(people=spaceMembers()){
  const key=people.join(",")+"|"+people.map(fullName).join(",");
  if(MX.key===key) return MX.idx;
  const firstCount={};
  people.forEach(e=>{ const f=fullName(e).split(/\s+/)[0].toLowerCase(); firstCount[f]=(firstCount[f]||0)+1; });
  const handles=people.map(e=>{ const n=fullName(e), f=n.split(/\s+/)[0];
    return { email:e, name:n, handle:firstCount[f.toLowerCase()]>1?n:f, alts:[...new Set([n.toLowerCase(),f.toLowerCase(),e.split("@")[0].toLowerCase()])] }; });
  const map={}; handles.forEach(h=>h.alts.forEach(a=>{ const L=map[a]||(map[a]=[]); if(!L.includes(h.email)) L.push(h.email); }));
  const words=[...Object.keys(map),...EVERYONE].sort((a,b)=>b.length-a.length).map(rxEsc);
  const rx=words.length?new RegExp(`(^|[^\\p{L}\\p{N}_@.])@(${words.join("|")})(?![\\p{L}\\p{N}_])`,"giu"):null;
  MX={key, idx:{handles, map, rx}}; return MX.idx;
}
/* every mention in a piece of text: [{start,end,emails|null(everyone)}] */
function findMentions(text,people){
  const {map,rx}=mentionIndex(people); const out=[]; if(!rx||!text) return out;
  rx.lastIndex=0; let m;
  while((m=rx.exec(text))){ const w=m[2].toLowerCase(), start=m.index+m[1].length;
    out.push({start, end:start+1+m[2].length, emails:EVERYONE.includes(w)?null:(map[w]||[])}); }
  return out;
}
function mentionedEmails(text, includeSelf, people){
  const set=new Set();
  findMentions(text,people).forEach(x=>(x.emails||people||spaceMembers()).forEach(e=>set.add(e)));
  if(!includeSelf) set.delete(myEmail());
  return [...set];
}
const mentionsIn=text=>mentionedEmails(text,false);
const mentionsMe=n=>findMentions(n.text||"").some(x=>!x.emails||x.emails.includes(myEmail()));
function noteText(text,q,people){
  const ms=findMentions(text,people); let h="", i=0;
  ms.forEach(x=>{ h+=highlight(text.slice(i,x.start),q);
    const me=!x.emails||x.emails.includes(myEmail());
    h+=`<span class="mention${me?" me":""}" title="${esc(x.emails?x.emails.map(emailName).join(", "):"Everyone here")}">${highlight(text.slice(x.start,x.end),q)}</span>`; i=x.end; });
  return h+highlight(text.slice(i),q);
}
/* suggestion popup */
const MP={el:null, ta:null, at:0, list:[], sel:0};
function caretXY(ta,pos){
  const cs=getComputedStyle(ta), d=document.createElement("div");
  ["fontFamily","fontSize","fontWeight","lineHeight","letterSpacing","paddingTop","paddingRight","paddingBottom","paddingLeft","borderTopWidth","borderLeftWidth","borderRightWidth","boxSizing","wordSpacing","textIndent"].forEach(k=>d.style[k]=cs[k]);
  Object.assign(d.style,{position:"absolute",visibility:"hidden",whiteSpace:"pre-wrap",overflowWrap:"break-word",top:"0",left:"-9999px",width:ta.offsetWidth+"px"});
  d.textContent=ta.value.slice(0,pos); const s=document.createElement("span"); s.textContent="​"; d.appendChild(s);
  document.body.appendChild(d); const r=ta.getBoundingClientRect();
  const xy={x:r.left+s.offsetLeft-ta.scrollLeft, y:r.top+s.offsetTop-ta.scrollTop, h:parseFloat(cs.lineHeight)||22};
  d.remove(); return xy;
}
function mentionQuery(ta){
  const pos=ta.selectionStart; if(pos!==ta.selectionEnd) return null;
  const m=/(^|[^\p{L}\p{N}_@.])@([\p{L}\p{N}._-]{0,24})$/u.exec(ta.value.slice(0,pos));
  return m?{at:pos-m[2].length-1, q:m[2].toLowerCase()}:null;
}
function closeMentions(){ if(MP.el){ MP.el.remove(); MP.el=null; } MP.ta=null; MP.list=[]; }
function updateMentions(ta){
  const mq=mentionQuery(ta); if(!mq){ closeMentions(); return; }
  const inRoom=ta.dataset.room, people=inRoom?(S.rooms[inRoom]?.members||[]):spaceMembers();
  const {handles}=mentionIndex(people), q=mq.q;
  const hit=h=>!q||h.name.toLowerCase().split(/\s+/).some(w=>w.startsWith(q))||h.name.toLowerCase().startsWith(q)||h.email.toLowerCase().startsWith(q);
  const list=handles.filter(h=>h.email!==myEmail()&&hit(h)).slice(0,6).map(h=>({...h, kind:"person"}));
  if(handles.length>1&&(!q||"everyone".startsWith(q)||"all".startsWith(q))) list.push({kind:"all", handle:"everyone", name:inRoom?"Everyone in this chat":S.space==="team"?"Everyone":"Everyone in this project", email:""});
  if(!list.length){ closeMentions(); return; }
  const same=MP.ta===ta&&MP.at===mq.at; MP.ta=ta; MP.at=mq.at; MP.list=list; MP.sel=same?Math.min(MP.sel,list.length-1):0;
  if(!MP.el){ MP.el=document.createElement("div"); MP.el.className="mention-pop"; MP.el.setAttribute("role","listbox"); MP.el.id="mentionPop"; document.body.appendChild(MP.el); }
  MP.el.innerHTML=`<div class="mp-h">Mention someone</div>`+list.map((h,i)=>`<div class="mp-o" role="option" id="mpo${i}" data-mi="${i}" aria-selected="${i===MP.sel}">
    ${h.kind==="all"?`<span class="av" style="width:26px;height:26px;font-size:13px;background:var(--ink)" aria-hidden="true">@</span>`:avatarEmail(h.email).replace(/width:18px;height:18px;font-size:10px/,"width:26px;height:26px;font-size:12px")}
    <span class="mp-t"><b>${esc(h.name)}</b><small>${h.kind==="all"?(inRoom?"Pings everyone in this chat":"Pings everyone who can see this notebook"):esc(h.email)}</small></span></div>`).join("");
  ta.setAttribute("aria-controls","mentionPop"); ta.setAttribute("aria-activedescendant","mpo"+MP.sel);
  const c=caretXY(ta,mq.at), vw=window.visualViewport?.width||innerWidth, vh=window.visualViewport?.height||innerHeight;
  const w=Math.min(300,vw-24); MP.el.style.width=w+"px";
  const left=Math.max(12,Math.min(c.x,vw-w-12)); const ph=MP.el.offsetHeight;
  let top=c.y+c.h+6; if(top+ph>vh-8&&c.y-ph-6>8) top=c.y-ph-6;
  MP.el.style.left=left+"px"; MP.el.style.top=top+"px";
}
function pickMention(i){
  const ta=MP.ta, h=MP.list[i]; if(!ta||!h) return;
  const pos=ta.selectionStart, ins="@"+h.handle+" ";
  ta.value=ta.value.slice(0,MP.at)+ins+ta.value.slice(pos);
  const c=MP.at+ins.length; ta.focus(); ta.setSelectionRange(c,c); closeMentions();
  if(h.kind==="person"&&!ta.dataset.room&&S.notify&&!S.sheet?.id){ S.notify.add(h.email); document.querySelectorAll(`[data-ntf="${CSS.escape(h.email)}"]`).forEach(x=>x.setAttribute("aria-pressed","true")); }
}
function insertAt(p){
  const ta=$(p+"Text"); if(!ta) return; ta.focus();
  const s=ta.selectionStart??ta.value.length, before=ta.value.slice(0,s), pre=before&&!/\s$/.test(before)?" ":"";
  ta.value=before+pre+"@"+ta.value.slice(ta.selectionEnd??s); const c=s+pre.length+1; ta.setSelectionRange(c,c); updateMentions(ta);
}
function sendAlerts(list, info){
  const b=fs.batch(), when=nowISO(), from=S.user.displayName||S.user.email;
  list.forEach(r=>{ if(!r.to||r.to===myEmail()) return;
    b.set(fs.collection("notifications").doc(), { to:r.to, type:r.type, from:S.user.uid, fromName:from,
      space:S.space, spaceName:spaceName(), noteId:info.noteId, date:info.date, text:String(info.text||"").slice(0,280),
      createdAt:when, read:false, emailed:false, sendEmail:profileByEmail(r.to)?.emailNotify!==false,
      appUrl:location.href.split("#")[0].split("?")[0] });
  });
  b.commit().catch(()=>toast("Your note was saved, but the notifications couldn't be sent."));
}
const unreadCount=()=>Object.values(S.alerts).filter(a=>!a.read).length;
function alertLine(a){
  const who=`<strong>${esc(a.fromName||"Someone")}</strong>`, where=`<strong>${esc(a.spaceName||"a notebook")}</strong>`;
  if(a.type==="mention") return `${who} mentioned you in ${where}`;
  if(a.type==="chat-mention") return `${who} mentioned you in ${where}`;
  if(a.type==="chat") return `${who} sent you a private message`;
  if(a.type==="done") return `${who} marked your follow-up done in ${where}`;
  return `${who} added a note in ${where}`;
}
function ago(t){ const m=Math.round((Date.now()-new Date(t))/60000); if(m<1) return "just now"; if(m<60) return m+" min ago"; const h=Math.round(m/60); if(h<24) return h+" h ago"; const d=Math.round(h/24); return d===1?"yesterday":d+" days ago"; }
function announce(a){
  const plain=alertLine(a).replace(/<[^>]+>/g,"");
  toast(plain);
  if(store.get("ln-popups-"+S.user.uid)==="1"&&"Notification" in window&&Notification.permission==="granted"){
    const opts={body:a.text||"", icon:"icon-192.png", tag:a.id};
    if(navigator.serviceWorker&&navigator.serviceWorker.controller) navigator.serviceWorker.ready.then(r=>r.showNotification(plain,opts)).catch(()=>{});
    else { try{ new Notification(plain,opts); }catch(e){} }
  }
}
function openAlert(id){
  const a=S.alerts[id]; if(!a) return;
  if(!a.read) fs.doc("notifications/"+id).update({read:true}).catch(()=>{});
  if(a.space==="chat"||String(a.type).startsWith("chat")){ if(!S.rooms[a.room]){ toast(S.roomsReady?"You're no longer in that chat.":"Chats are still loading. Try again in a moment."); return; } openRoom(a.room, a.thread||null); return; }
  if(a.space!=="team"&&!S.projects[a.space]){ toast("You no longer have access to that project."); return; }
  if(a.space!==S.space) setSpace(a.space);
  goDay(a.date||todayISO());
}
function markAllRead(){
  const b=fs.batch(); let n=0;
  Object.values(S.alerts).forEach(a=>{ if(!a.read){ b.update(fs.doc("notifications/"+a.id),{read:true}); n++; } });
  if(n) b.commit().catch(()=>{});
}
function notifyChips(p){
  const people=spaceMembers().filter(e=>e!==myEmail());
  if(!people.length) return `<p class="hint" style="margin:0">Add people to the team to notify them.</p>`;
  return `<div><span class="label" style="margin:0 0 6px">Notify</span><div class="cats" role="group" aria-label="People to notify">
    ${people.map(e=>`<button type="button" class="cat" data-ntf="${esc(e)}" aria-pressed="${S.notify.has(e)}">${avatarEmail(e)}${esc(emailName(e))}</button>`).join("")}
    <button type="button" class="cat" data-act="ntf-all" style="border-style:dashed">${S.space==="team"?"Everyone":"All members"}</button>
    <button type="button" class="cat" data-act="ntf-none" style="border-style:dashed">No one</button>
  </div><p class="hint" style="margin:6px 0 0">Tip: type @ in your note to mention someone, e.g. @${esc(emailName(people[0]).split(" ")[0])}. They get pinged. @everyone pings the whole ${S.space==="team"?"team":"project"}.</p></div>`;
}
function avatarEmail(e){ const p=profileByEmail(e); const n=p?.name||e; return `<span class="av" style="width:18px;height:18px;font-size:10px;background:${colorFor(e)}" aria-hidden="true">${esc((n[0]||"?").toUpperCase())}</span>`; }
const updateNote=(id,patch)=>notesCol().doc(id).update({...patch, updatedAt:nowISO(), editedBy:S.user.uid}).catch(fail);
const deleteNote=id=>{ const L=(S.notes[id]?.attachments)||[]; notesCol().doc(id).delete().then(()=>L.forEach(a=>removeFile(a.id,a.chunks))).catch(fail); };

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

/* ================= chat ================= */
const CH={msgUnsub:null, thrUnsub:null, seenTimers:{}};
const FV=()=>firebase.firestore.FieldValue;
const roomRef=id=>fs.collection("rooms").doc(id);
const roomOther=r=>(r.members||[]).find(e=>e!==myEmail())||myEmail();
const roomName=r=>!r?"Chat":r.type==="dm"?emailName(roomOther(r)).replace(/^You$/,"Just you"):(r.name||"Group");
const roomUnread=r=>!!(r&&r.last&&r.last.from!==S.user.uid&&(r.last.at||"")>((r.seen||{})[S.user.uid]||""));
const chatUnread=()=>Object.values(S.rooms).filter(roomUnread).length;
const roomList=()=>Object.values(S.rooms).sort((a,b)=>(b.updatedAt||b.createdAt||"").localeCompare(a.updatedAt||a.createdAt||""));
const uidByEmail=e=>{ const k=Object.keys(S.profiles).find(u=>S.profiles[u].email===e); return k||null; };
const canManageRoom=r=>r&&(r.createdBy===S.user.uid||S.isOwner);
const draftKey=()=>S.room+"/"+(S.thread||"");
function stamp(t){ if(!t) return ""; const d=iso(new Date(t)); return d===todayISO()?fmtTime(t):relDay(d)||fmtShort(d); }
function roomAvatar(r,size=40){
  const st=`width:${size}px;height:${size}px;font-size:${Math.round(size*.42)}px`;
  if(r.type==="dm"){ const e=roomOther(r), n=fullName(e); return `<span class="av" style="${st};background:${colorFor(uidByEmail(e)||e)}" aria-hidden="true">${esc((n[0]||"?").toUpperCase())}</span>`; }
  return `<span class="av room-av" style="${st};background:${colorFor(r.id)}" aria-hidden="true">#</span>`;
}
function watchRooms(){
  unsub.push(fs.collection("rooms").where("members","array-contains",myEmail()).onSnapshot(snap=>{
    const first=!S.roomsReady;
    snap.docChanges().forEach(ch=>{ const v={id:ch.doc.id,...ch.doc.data()};
      if(ch.type==="removed"){ delete S.rooms[v.id]; return; }
      const old=S.rooms[v.id]; S.rooms[v.id]=v;
      const looking=S.view==="chat"&&S.room===v.id&&document.visibilityState==="visible";
      if(!first&&v.last&&v.last.from!==S.user.uid&&(!old||!old.last||old.last.at!==v.last.at)&&!looking) announceChat(v);
    });
    S.roomsReady=true; S.roomsErr=null;
    if(S.room&&!S.rooms[S.room]){ toast("That chat was deleted or you were removed from it."); leaveRoomView(); }
    renderChrome(); if(S.view==="chat"){ render(); markSeen(); }
  }, e=>{ S.roomsReady=true; S.roomsErr=e.code||"unknown"; if(S.view==="chat") render(); }));
}
function announceChat(r){
  const who=r.last.fromName||"Someone", where=r.type==="dm"?"":` in ${roomName(r)}`;
  const plain=`${who}${where}${r.last.thread?` (thread: ${r.last.thread})`:""}`;
  toast(`${plain}: ${r.last.text||""}`.slice(0,140));
  if(store.get("ln-popups-"+S.user.uid)==="1"&&"Notification" in window&&Notification.permission==="granted"){
    const opts={body:r.last.text||"", icon:"icon-192.png", tag:"room-"+r.id};
    if(navigator.serviceWorker&&navigator.serviceWorker.controller) navigator.serviceWorker.ready.then(x=>x.showNotification(plain,opts)).catch(()=>{});
    else { try{ new Notification(plain,opts); }catch(e){} }
  }
}
function stopRoom(){ ["msgUnsub","thrUnsub"].forEach(k=>{ if(CH[k]){ try{CH[k]();}catch(e){} CH[k]=null; } }); }
function leaveRoomView(){ stopRoom(); S.room=null; S.thread=null; S.msgs=[]; S.threads={}; S.sel=null; closeMentions(); }
function openRoom(id, thread=null){
  if(!S.rooms[id]){ toast("You're not in that chat any more."); return; }
  closeSheet(); const sameRoom=S.room===id;
  S.view="chat"; S.room=id; S.thread=thread; S.roomTab=thread?"threads":"chat"; S.sel=null; S.stick=true;
  S.msgs=[]; S.msgsReady=false; S.msgsErr=null; if(!sameRoom) S.threads={};
  subRoom(); render(); markSeen();
  if(!isPhone()) setTimeout(()=>$("chatText")?.focus(),30);
}
function subRoom(){
  stopRoom(); const id=S.room; if(!id) return;
  const key=draftKey(), base=roomRef(id);
  const col=S.thread?base.collection("threads").doc(S.thread).collection("messages"):base.collection("messages");
  CH.msgUnsub=col.orderBy("at").limitToLast(400).onSnapshot(snap=>{ if(key!==draftKey()) return;
    S.msgs=snap.docs.map(d=>({id:d.id,...d.data()})); S.msgsReady=true; S.msgsErr=null; render(); markSeen(); },
    e=>{ if(key!==draftKey()) return; S.msgsReady=true; S.msgsErr=e.code||"unknown"; render(); });
  CH.thrUnsub=base.collection("threads").orderBy("updatedAt","desc").limit(200).onSnapshot(snap=>{ if(id!==S.room) return;
    S.threads={}; snap.docs.forEach(d=>S.threads[d.id]={id:d.id,...d.data()});
    if(S.thread&&!S.threads[S.thread]&&!snap.metadata?.hasPendingWrites&&S.msgsReady){ toast("That thread was deleted."); S.thread=null; S.roomTab="threads"; subRoom(); }
    if(S.view==="chat") render(); }, ()=>{});
}
function markSeen(){
  const r=S.rooms[S.room]; if(!r||S.view!=="chat"||document.visibilityState!=="visible") return;
  const at=r.last?.at||""; if(!at||((r.seen||{})[S.user.uid]||"")>=at) return;
  const id=r.id; clearTimeout(CH.seenTimers[id]); CH.seenTimers[id]=setTimeout(()=>{ delete CH.seenTimers[id]; roomRef(id).update({["seen."+S.user.uid]:nowISO()}).catch(()=>{}); },350);
}
document.addEventListener("visibilitychange",()=>{ if(document.visibilityState==="visible"&&S.user) markSeen(); });

function sendChat(){
  const ta=$("chatText"); if(!ta) return; const text=ta.value.trim(); const r=S.rooms[S.room];
  if(!text||!r) { ta.focus(); return; }
  const prev=r.last, at=nowISO(), me=S.user.displayName||S.user.email, base=roomRef(r.id), th=S.thread?S.threads[S.thread]:null;
  const ref=(th?base.collection("threads").doc(th.id).collection("messages"):base.collection("messages")).doc();
  ref.set({text, from:S.user.uid, fromName:me, at}).catch(e=>toast(e&&e.code==="permission-denied"?"Chat isn't switched on yet. The owner needs to add the chat rules in Firebase.":"Couldn't send. It will retry when you're back online."));
  const last={text:text.slice(0,200), from:S.user.uid, fromName:me, at, thread:th?th.title:""};
  base.update({last, updatedAt:at, ["seen."+S.user.uid]:at}).catch(()=>{});
  if(th) base.collection("threads").doc(th.id).update({count:FV().increment(1), updatedAt:at, last}).catch(()=>{});
  // pings: @mentions always; private chats ping once per unread burst
  const mentioned=mentionedEmails(text,false,r.members);
  const alerts=mentioned.map(e=>({to:e,type:"chat-mention"}));
  if(r.type==="dm"){ const other=roomOther(r), ou=uidByEmail(other);
    const burst=!prev||prev.from!==S.user.uid||!ou||((r.seen||{})[ou]||"")>=(prev.at||"");
    if(other!==myEmail()&&!mentioned.includes(other)&&burst) alerts.push({to:other,type:"chat"}); }
  if(alerts.length) sendChatAlerts(r, alerts, text, ref.id);
  ta.value=""; delete S.drafts[draftKey()]; grow(ta); closeMentions(); S.stick=true; ta.focus();
  if(!navigator.onLine) toast("Sent. It will deliver when you're back online.");
}
function sendChatAlerts(r, list, text, msgId){
  const b=fs.batch(), when=nowISO(), from=S.user.displayName||S.user.email;
  list.forEach(x=>{ if(!x.to||x.to===myEmail()) return;
    b.set(fs.collection("notifications").doc(), { to:x.to, type:x.type, from:S.user.uid, fromName:from,
      space:"chat", spaceName:r.type==="dm"?"a private chat":(r.name||"a group"), noteId:msgId, date:todayISO(), text:String(text).slice(0,280),
      createdAt:when, read:false, emailed:false, sendEmail:profileByEmail(x.to)?.emailNotify!==false,
      appUrl:location.href.split("#")[0].split("?")[0], room:r.id, thread:S.thread||"" }); });
  b.commit().catch(()=>{});
}
function grow(ta){ if(!ta) return; ta.style.height="auto"; ta.style.height=Math.min(ta.scrollHeight,180)+"px"; }

/* rooms: create, edit, leave, delete */
function startDM(email){
  const pair=[myEmail(),email].sort(), id="dm_"+pair.join("_").replace(/\//g,"_");
  if(S.rooms[id]){ openRoom(id); return; }
  const at=nowISO(), r={type:"dm", members:[...new Set(pair)], createdBy:S.user.uid, createdAt:at, updatedAt:at};
  roomRef(id).set(r,{merge:true}).catch(e=>{ toast(e&&e.code==="permission-denied"?"Chat isn't switched on yet. The owner needs to add the chat rules in Firebase.":"Couldn't start the chat."); delete S.rooms[id]; if(S.room===id){ leaveRoomView(); render(); } });
  S.rooms[id]={id,...r}; openRoom(id);
}
function saveRoom(id){
  const name=$("rmName").value.trim(); if(!name){ $("rmName").focus(); toast("Give the room a name."); return; }
  const members=[...new Set([myEmail(),...[...document.querySelectorAll("[data-rmm]:checked")].map(x=>x.value)])];
  if(!id&&members.length<2){ toast("Pick at least one other person."); return; }
  const at=nowISO();
  if(id){ roomRef(id).update({name,members,updatedAt:at}).catch(fail); closeSheet(); toast("Room updated"); render(); return; }
  const ref=fs.collection("rooms").doc(), r={type:"group", name, members, createdBy:S.user.uid, createdAt:at, updatedAt:at};
  ref.set(r).catch(e=>{ toast(e&&e.code==="permission-denied"?"Chat isn't switched on yet. The owner needs to add the chat rules in Firebase.":"Couldn't create the room."); delete S.rooms[ref.id]; if(S.room===ref.id){ leaveRoomView(); render(); } });
  S.rooms[ref.id]={id:ref.id,...r}; openRoom(ref.id); toast(`Created ${name}. Only its members can see it.`);
}
function leaveRoom(id){ const r=S.rooms[id]; if(!r) return;
  confirmSheet({title:`Leave ${roomName(r)}?`, body:"You won't see its messages any more unless someone adds you back.", ok:"Leave room", danger:true,
    onOk:()=>{ roomRef(id).update({members:FV().arrayRemove(myEmail())}).catch(fail); delete S.rooms[id]; leaveRoomView(); S.view="chat"; render(); toast("You left the room."); } }); }
async function wipe(col){ const snap=await col.get(); let b=fs.batch(), n=0; for(const d of snap.docs){ b.delete(d.ref); if(++n%400===0){ await b.commit(); b=fs.batch(); } } await b.commit(); }
function deleteRoom(id){ const r=S.rooms[id]; if(!r) return;
  confirmSheet({title:`Delete ${roomName(r)}?`, body:"This deletes the chat, its threads and every message for everyone. It can't be undone.", ok:"Delete", danger:true,
    onOk:async()=>{ try{ const base=roomRef(id); const th=await base.collection("threads").get();
      for(const t of th.docs) await wipe(t.ref.collection("messages")); await wipe(base.collection("threads")); await wipe(base.collection("messages"));
      await base.delete(); delete S.rooms[id]; leaveRoomView(); render(); toast("Deleted."); }catch(e){ toast("Couldn't delete it. Only the person who made it (or the owner) can."); } } }); }

/* threads */
function openThread(tid){ S.thread=tid; S.roomTab="threads"; S.sel=null; S.msgs=[]; S.msgsReady=false; S.stick=true; subRoom(); render(); if(!isPhone()) setTimeout(()=>$("chatText")?.focus(),30); }
function threadsBack(){ S.thread=null; S.roomTab="threads"; S.msgs=[]; S.msgsReady=false; subRoom(); render(); }
function roomTab(t){ if(S.roomTab===t&&!S.thread) return; S.roomTab=t; S.sel=null; if(S.thread||t==="chat"){ S.thread=null; S.msgs=[]; S.msgsReady=false; S.stick=true; subRoom(); } render(); }
function saveToThread(tid, ids){
  const r=S.rooms[S.room]; if(!r) return;
  const base=roomRef(r.id), at=nowISO(), me=S.user.displayName||S.user.email;
  const msgs=(ids||[]).map(id=>S.msgs.find(m=>m.id===id)).filter(Boolean).sort((a,b)=>(a.at||"").localeCompare(b.at||""));
  let ref, title;
  const b=fs.batch();
  if(!tid){ title=$("thTitle").value.trim(); if(!title){ $("thTitle").focus(); toast("Give the thread a name."); return; }
    ref=base.collection("threads").doc();
    const lm=msgs[msgs.length-1];
    b.set(ref,{title, createdBy:S.user.uid, createdByName:me, createdAt:at, updatedAt:at, count:msgs.length, last:lm?{text:lm.text.slice(0,200),from:lm.from,fromName:lm.fromName,at}:null});
    S.threads[ref.id]={id:ref.id,title,createdBy:S.user.uid,createdAt:at,updatedAt:at,count:msgs.length};
  } else { ref=base.collection("threads").doc(tid); title=S.threads[tid]?.title||"thread";
    if(msgs.length) b.update(ref,{count:FV().increment(msgs.length), updatedAt:at}); }
  msgs.forEach(m=>b.set(ref.collection("messages").doc(),{text:m.text, from:m.from, fromName:m.fromName, at:m.at, saved:true, savedBy:S.user.uid, savedByName:me, savedAt:at}));
  b.commit().catch(e=>toast(e&&e.code==="permission-denied"?"Chat isn't switched on yet. The owner needs to add the chat rules in Firebase.":"Couldn't save to the thread."));
  closeSheet(); S.sel=null;
  toast(msgs.length?`Saved ${msgs.length} ${msgs.length===1?"message":"messages"} to "${title}"`:`Started "${title}"`);
  openThread(ref.id);
}
function renameThread(tid){ const t=S.threads[tid]; const v=$("thRename")?.value.trim(); if(!t||!v) return;
  roomRef(S.room).collection("threads").doc(tid).update({title:v}).catch(fail); t.title=v; closeSheet(); render(); }
function deleteThread(tid){ const t=S.threads[tid]; if(!t) return;
  confirmSheet({title:`Delete "${t.title}"?`, body:"This deletes the thread and its messages for everyone. Messages that are also in the main chat stay there.", ok:"Delete thread", danger:true,
    onOk:async()=>{ try{ const ref=roomRef(S.room).collection("threads").doc(tid); await wipe(ref.collection("messages")); await ref.delete(); delete S.threads[tid]; threadsBack(); toast("Thread deleted."); }catch(e){ fail(e); } } }); }

/* views */
function roomRow(r){
  const L=r.last, un=roomUnread(r);
  const pre=!L?"":L.from===S.user.uid?"You: ":r.type==="group"?`${(L.fromName||"").split(" ")[0]}: `:"";
  return `<button class="room-row ${S.room===r.id?"on":""} ${un?"unread":""}" data-room="${r.id}" aria-current="${S.room===r.id}">
    ${roomAvatar(r,42)}
    <span class="rr-main"><span class="rr-top"><b>${esc(roomName(r))}</b>${r.type==="group"?`<span class="rr-n">${r.members.length}</span>`:""}<span class="rr-t">${esc(stamp(L?.at||r.createdAt))}</span></span>
    <span class="rr-last">${L?`${esc(pre)}${L.thread?`<i>${esc(L.thread)}</i> · `:""}${esc(L.text)}`:`<em>${r.type==="dm"?"Say hello":"No messages yet"}</em>`}</span></span>
    ${un?`<span class="dot" aria-label="Unread"></span>`:""}</button>`;
}
function msgsHTML(r){
  if(!S.msgsReady) return `<div class="chat-empty"><span class="spin"></span></div>`;
  if(S.msgsErr) return `<div class="chat-empty"><strong>${S.msgsErr==="permission-denied"?"Chat isn't switched on yet":"Couldn't load messages"}</strong>${S.msgsErr==="permission-denied"?"The owner needs to add the chat rules in Firebase.":"Check your connection and try again."}</div>`;
  if(!S.msgs.length) return `<div class="chat-empty">${roomAvatar(r,56)}<strong>${S.thread?"Nothing in this thread yet":r.type==="dm"?`This is the start of your chat with ${esc(roomName(r))}`:`Welcome to ${esc(roomName(r))}`}</strong>${S.thread?"Write the first message below.":r.type==="dm"?"Only the two of you can see it.":`Only the ${r.members.length} people in this room can see it. Type @ to ping someone.`}</div>`;
  let h="", prevDay="", prev=null; const sel=S.sel;
  S.msgs.forEach(m=>{
    const day=iso(new Date(m.at||Date.now()));
    if(day!==prevDay){ h+=`<div class="day-sep"><span>${esc(relDay(day)||fmtLong(day))}</span></div>`; prevDay=day; prev=null; }
    const mine=m.from===S.user.uid&&!m.saved;
    const cont=prev&&prev.from===m.from&&!!prev.saved===!!m.saved&&(new Date(m.at)-new Date(prev.at))<5*60000;
    const picked=sel&&sel.has(m.id);
    h+=`<div class="msg ${mine?"mine":""} ${cont?"cont":""} ${picked?"picked":""} ${sel?"selecting":""}" data-msg="${m.id}">
      ${sel?`<span class="pick" aria-hidden="true">${picked?"✓":""}</span>`:""}
      ${mine?"":cont?`<span class="av-sp"></span>`:avatar(m.from)}
      <div class="bub-wrap">
        ${!mine&&!cont?`<div class="m-name">${esc(m.from===S.user.uid?"You":m.fromName||"Someone")}</div>`:""}
        <button class="bub" data-act="msg" data-id="${m.id}" aria-label="Message from ${esc(m.fromName||"")}, options"${sel?` aria-pressed="${!!picked}"`:""}>${m.saved?`<span class="saved-tag">Saved from chat by ${esc(m.savedBy===S.user.uid?"you":(m.savedByName||"someone").split(" ")[0])}</span>`:""}${noteText(m.text||"",null,r.members)}</button>
        <div class="m-time">${esc(m.saved?stamp(m.at):fmtTime(m.at))}</div>
      </div></div>`;
    prev=m;
  });
  return h;
}
function threadsHTML(r){
  const list=Object.values(S.threads).sort((a,b)=>(b.updatedAt||"").localeCompare(a.updatedAt||""));
  return `<div class="thr-wrap"><div class="thr-intro"><p class="hint" style="margin:0">Threads keep specific conversations together, like one song's mix notes or a contract back-and-forth. Save messages from the chat into a thread, or start a new one.</p>
    <button class="btn primary" data-act="new-thread">${I.plus.replace('<svg','<svg width="18" height="18" style="stroke:currentColor;fill:none;stroke-width:2.2;vertical-align:-3px;margin-right:4px"')}New thread</button></div>
    ${list.length?`<div class="thr-list">${list.map(t=>`<button class="thr-row" data-act="open-thread" data-id="${t.id}">
      <span class="thr-ic" aria-hidden="true">${I.thread}</span>
      <span class="rr-main"><span class="rr-top"><b>${esc(t.title)}</b><span class="rr-t">${esc(stamp(t.updatedAt))}</span></span>
      <span class="rr-last">${t.count||0} ${t.count===1?"message":"messages"}${t.last?` · ${esc((t.last.fromName||"").split(" ")[0])}: ${esc(t.last.text)}`:""}</span></span></button>`).join("")}</div>`
      :`<div class="chat-empty" style="padding:40px 16px"><strong>No threads yet</strong>Tap any message in the chat and choose "Save to a thread".</div>`}</div>`;
}
function viewChat(){
  const r=S.room?S.rooms[S.room]:null, rooms=roomList();
  const listPane=`<aside class="rooms" aria-label="Chats">
    <div class="rooms-head"><h1 class="page-title" style="margin:0">Chat</h1><button class="btn primary" data-act="new-chat">${I.plus.replace('<svg','<svg width="18" height="18" style="stroke:currentColor;fill:none;stroke-width:2.2;vertical-align:-3px;margin-right:4px"')}New</button></div>
    ${!S.roomsReady?`<div class="chat-empty"><span class="spin"></span></div>`
      :S.roomsErr?`<div class="chat-empty"><strong>${S.roomsErr==="permission-denied"?"Chat isn't switched on yet":"Couldn't load chats"}</strong>${S.roomsErr==="permission-denied"?(S.isOwner?"Add the chat rules in Firebase (see CHAT-SETUP.md), then reload.":"Ask the notebook owner to switch chat on."):"Check your connection and reload."}</div>`
      :rooms.length?`<div class="room-list">${rooms.map(roomRow).join("")}</div>`
      :`<div class="chat-empty" style="padding:36px 12px"><strong>No chats yet</strong>Start a private chat with one person, or a group room for a release, an artist or a team.<button class="btn primary" data-act="new-chat" style="margin-top:14px">Start a chat</button></div>`}
  </aside>`;
  if(!r) return `<div class="chat">${listPane}<section class="convo none"><div class="chat-empty">${I.chat.replace('<svg','<svg width="44" height="44" style="stroke:var(--ink-2);fill:none;stroke-width:1.5"')}<strong>Pick a chat</strong>Or start a new one. Private chats and group rooms are only visible to the people in them.</div></section></div>`;
  const th=S.thread?S.threads[S.thread]:null;
  const sub=r.type==="dm"?`Private · ${esc(roomOther(r))}`:`${r.members.length} people · ${esc(r.members.map(e=>emailName(e).split(" ")[0]).join(", "))}`;
  const showMsgs=S.roomTab==="chat"||S.thread;
  const thN=Object.keys(S.threads).length;
  const head=`<header class="convo-head">
      <button class="icon-btn back" data-act="rooms-back" aria-label="All chats">${I.back}</button>
      ${roomAvatar(r,38)}
      <div class="ch-t"><h2>${esc(roomName(r))}</h2><p>${sub}</p></div>
      <button class="icon-btn" data-act="room-info" aria-label="Chat details">${I.people.replace('<svg','<svg width="20" height="20" style="stroke:currentColor;fill:none;stroke-width:1.8"')}</button>
    </header>
    <div class="convo-tabs" role="tablist"><button role="tab" data-act="room-tab" data-tab="chat" aria-selected="${S.roomTab==="chat"}">Chat</button><button role="tab" data-act="room-tab" data-tab="threads" aria-selected="${S.roomTab==="threads"}">Threads${thN?` <span class="tcount">${thN}</span>`:""}</button></div>
    ${th?`<div class="thr-bar"><button class="link" data-act="threads-back">${I.back.replace('<svg','<svg width="16" height="16" style="stroke:currentColor;fill:none;stroke-width:2;vertical-align:-3px"')} Threads</button><b>${esc(th.title)}</b><button class="icon-btn sm" data-act="thread-menu" aria-label="Thread options">⋯</button></div>`:""}`;
  const comp=S.sel?`<div class="sel-bar"><span><b>${S.sel.size}</b> selected</span><button class="btn" data-act="sel-cancel">Cancel</button><button class="btn primary" data-act="sel-save" ${S.sel.size?"":"disabled"}>Save to a thread</button></div>`
    :`<div class="chat-comp"><button class="icon-btn at" data-act="mention" data-p="chat" aria-label="Mention someone">@</button>
      <label class="sr" for="chatText">Message</label><textarea id="chatText" data-room="${r.id}" rows="1" placeholder="${th?`Reply in ${esc(th.title)}…`:`Message ${esc(roomName(r))}…`}">${esc(S.drafts[draftKey()]||"")}</textarea>
      <button class="btn primary send" data-act="send-chat" aria-label="Send">${I.send}</button></div>`;
  return `<div class="chat has-room">${listPane}<section class="convo">${head}
    ${showMsgs?`<div class="msgs" id="msgs">${msgsHTML(r)}</div>${comp}`:threadsHTML(r)}</section></div>`;
}
function newChatHTML(sh){
  const others=teamEmails().filter(e=>e!==myEmail());
  const seg=`<div class="seg" role="tablist"><button role="tab" data-act="nc-mode" data-mode="dm" aria-selected="${sh.mode!=="group"}">Private chat</button><button role="tab" data-act="nc-mode" data-mode="group" aria-selected="${sh.mode==="group"}">Group room</button></div>`;
  if(sh.mode!=="group") return `<h2>New chat</h2>${seg}<p class="sub">Just you and one person. Nobody else can see it.</p>
    ${others.length?`<div class="menu-list">${others.map(e=>`<button data-act="start-dm" data-email="${esc(e)}">${avatarEmail(e).replace(/width:18px;height:18px;font-size:10px/,"width:32px;height:32px;font-size:14px")}<span>${esc(emailName(e))}<small>${esc(e)}</small></span></button>`).join("")}</div>`:`<p class="hint">Add people to the team first (Settings → Team members).</p>`}
    <div class="actions"><button class="btn" data-act="close">Cancel</button></div>`;
  return `<h2>New chat</h2>${seg}${roomFormHTML(null)}`;
}
function roomFormHTML(r){
  const current=new Set(r?r.members:[myEmail()]), people=[...new Set([...teamEmails(),...(r?r.members:[])])];
  return `<p class="sub">${r?"Change the name or who's in it.":"A private room for a few people, like one release or one artist. Only the people you tick can see it."}</p>
    <label class="label" for="rmName">Room name</label><input class="input" id="rmName" value="${esc(r?r.name:"")}" placeholder="e.g. Ve Mahiya release">
    <span class="label">Who's in it</span>
    <div class="people">${people.map(e=>{ const me=e===myEmail(); return `<label class="person-row"><input type="checkbox" data-rmm value="${esc(e)}" ${current.has(e)||me?"checked":""} ${me?"disabled":""}><span>${esc(emailName(e))}${emailName(e)!==e?`<br><span class="hint">${esc(e)}</span>`:""}</span></label>`; }).join("")}</div>
    <div class="actions">${r?`<button class="btn danger" data-act="delete-room" data-id="${r.id}" style="margin-right:auto">Delete</button>`:""}<button class="btn" data-act="close">Cancel</button><button class="btn primary" data-act="save-room" ${r?`data-id="${r.id}"`:""}>${r?"Save changes":"Create room"}</button></div>`;
}
function roomInfoHTML(){
  const r=S.rooms[S.room]; if(!r) return "";
  if(r.type==="group"&&canManageRoom(r)) return `<h2>${esc(roomName(r))}</h2>${roomFormHTML(r)}`;
  return `<h2>${esc(roomName(r))}</h2><p class="sub">${r.type==="dm"?"A private chat. Only the two of you can see it.":"Only these people can see this room."}</p>
    <ul class="members">${r.members.map(e=>`<li><span class="who">${avatarEmail(e)}<span>${esc(emailName(e))}${emailName(e)!==e?`<br><span class="hint">${esc(e)}</span>`:""}</span></span></li>`).join("")}</ul>
    ${r.type==="group"?`<p class="hint">Only the person who made the room (or the owner) can change who's in it.</p>`:""}
    <div class="actions">${r.type==="group"?`<button class="btn danger" data-act="leave-room" data-id="${r.id}" style="margin-right:auto">Leave room</button>`:canManageRoom(r)?`<button class="btn danger" data-act="delete-room" data-id="${r.id}" style="margin-right:auto">Delete chat</button>`:""}<button class="btn primary" data-act="close">Done</button></div>`;
}
function msgMenuHTML(sh){
  const m=S.msgs.find(x=>x.id===sh.id); if(!m) return "";
  return `<h2>Message</h2><p class="sub">${esc(m.fromName||"")} · ${esc(stamp(m.at))}<br>${esc((m.text||"").slice(0,140))}${(m.text||"").length>140?"…":""}</p><div class="menu-list">
    ${S.thread?"":`<button data-act="msg-thread" data-id="${m.id}">${I.thread}<span>Save to a thread<small>Start a new thread with it, or add it to one</small></span></button>
    <button data-act="msg-select" data-id="${m.id}">${I.fu}<span>Select more messages<small>Save a whole conversation to a thread</small></span></button>`}
    <button data-act="msg-copy" data-id="${m.id}">${I.copy}<span>Copy text</span></button>
    ${m.from===S.user.uid||(S.thread&&m.savedBy===S.user.uid)?`<button class="danger" data-act="msg-delete" data-id="${m.id}">${I.trash}<span>Delete${m.saved?" from this thread":""}</span></button>`:""}</div>`;
}
function saveThreadHTML(sh){
  const n=(sh.ids||[]).length, list=Object.values(S.threads).sort((a,b)=>(b.updatedAt||"").localeCompare(a.updatedAt||""));
  const first=n?S.msgs.find(m=>m.id===sh.ids[0]):null;
  const guess=first?(first.text||"").replace(/\s+/g," ").trim().slice(0,48):"";
  return `<h2>${n?"Save to a thread":"New thread"}</h2><p class="sub">${n?`${n} ${n===1?"message":"messages"} will be copied into the thread. ${n===1?"It stays":"They stay"} in the chat too.`:"A place for one specific conversation in this room."}</p>
    <label class="label" for="thTitle">${n&&list.length?"New thread":"Thread name"}</label>
    <div style="display:flex;gap:8px"><input class="input" id="thTitle" value="${esc(guess)}" placeholder="e.g. Ve Mahiya mix notes"><button class="btn primary" data-act="thread-create">${n?"Save":"Create"}</button></div>
    ${n&&list.length?`<span class="label" style="margin-top:16px">Or add to an existing thread</span><div class="menu-list">${list.map(t=>`<button data-act="thread-add" data-id="${t.id}"><span class="thr-ic" aria-hidden="true">${I.thread}</span><span>${esc(t.title)}<small>${t.count||0} ${t.count===1?"message":"messages"}</small></span></button>`).join("")}</div>`:""}
    <div class="actions"><button class="btn" data-act="close">Cancel</button></div>`;
}
function threadMenuHTML(){
  const t=S.threads[S.thread]; if(!t) return "";
  const can=t.createdBy===S.user.uid||S.isOwner||canManageRoom(S.rooms[S.room]);
  return `<h2>${esc(t.title)}</h2><p class="sub">Started by ${esc(t.createdBy===S.user.uid?"you":t.createdByName||"someone")} · ${esc(stamp(t.createdAt))}</p>
    ${can?`<label class="label" for="thRename">Rename</label><div style="display:flex;gap:8px"><input class="input" id="thRename" value="${esc(t.title)}"><button class="btn primary" data-act="thread-rename">Save</button></div>
    <div class="actions"><button class="btn danger" data-act="thread-delete" style="margin-right:auto">Delete thread</button><button class="btn" data-act="close">Close</button></div>`
    :`<p class="hint">Only the person who started the thread can rename or delete it.</p><div class="actions"><button class="btn primary" data-act="close">Close</button></div>`}`;
}
function chatClick(act,b){
  const id=b.dataset.id;
  switch(act){
    case "new-chat": openSheet({type:"new-chat",mode:"dm"}); return true;
    case "nc-mode": S.sheet.mode=b.dataset.mode; renderSheet(); return true;
    case "start-dm": startDM(b.dataset.email); return true;
    case "save-room": saveRoom(id); return true;
    case "room-info": openSheet({type:"room-info"}); return true;
    case "leave-room": leaveRoom(id); return true;
    case "delete-room": deleteRoom(id); return true;
    case "rooms-back": leaveRoomView(); render(); return true;
    case "room-tab": roomTab(b.dataset.tab); return true;
    case "send-chat": sendChat(); return true;
    case "new-thread": openSheet({type:"save-thread",ids:[]}); return true;
    case "open-thread": openThread(id); return true;
    case "threads-back": threadsBack(); return true;
    case "thread-menu": openSheet({type:"thread-menu"}); return true;
    case "thread-rename": renameThread(S.thread); return true;
    case "thread-delete": deleteThread(S.thread); return true;
    case "thread-create": saveToThread(null, S.sheet.ids); return true;
    case "thread-add": saveToThread(id, S.sheet.ids); return true;
    case "msg": if(window.getSelection&&String(window.getSelection())) return true;
      if(S.sel){ S.sel.has(id)?S.sel.delete(id):S.sel.add(id); render(); } else openSheet({type:"msg-menu",id}); return true;
    case "msg-thread": openSheet({type:"save-thread",ids:[id]}); return true;
    case "msg-select": closeSheet(); S.sel=new Set([id]); render(); return true;
    case "sel-cancel": S.sel=null; render(); return true;
    case "sel-save": if(S.sel&&S.sel.size) openSheet({type:"save-thread",ids:[...S.sel]}); return true;
    case "msg-copy": { const m=S.msgs.find(x=>x.id===id); closeSheet(); navigator.clipboard?.writeText(m?.text||"").then(()=>toast("Copied"),()=>toast("Couldn't copy.")); return true; }
    case "msg-delete": { const base=roomRef(S.room), col=S.thread?base.collection("threads").doc(S.thread).collection("messages"):base.collection("messages");
      col.doc(id).delete().catch(fail); if(S.thread) base.collection("threads").doc(S.thread).update({count:FV().increment(-1)}).catch(()=>{});
      S.msgs=S.msgs.filter(m=>m.id!==id); closeSheet(); render(); toast("Message deleted"); return true; }
  }
  return false;
}

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
const VIEWS=[{id:"notes",label:"Notes",icon:I.notes},{id:"chat",label:"Chat",icon:I.chat},{id:"followups",label:"Follow-ups",icon:I.fu},{id:"search",label:"Search",icon:I.search},{id:"more",label:"Settings",icon:I.more}];
const SIDE_VIEWS=[VIEWS[0],VIEWS[1],{id:"alerts",label:"Notifications",icon:I.bell},VIEWS[2],VIEWS[3],VIEWS[4]];
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
  const unN=unreadCount();
  const chN=chatUnread();
  $("sideNav").innerHTML=SIDE_VIEWS.map(v=>{ const c=v.id==="followups"?fuN:v.id==="alerts"?unN:v.id==="chat"?chN:0;
    return `<button class="nav-btn" data-view="${v.id}" aria-current="${S.view===v.id}">${v.icon}<span class="grow">${v.label}</span>${v.id==="followups"||v.id==="alerts"||v.id==="chat"?`<span class="badge ${c?"":"zero"}">${c}</span>`:""}</button>`; }).join("");
  $("sideFoot").innerHTML=`${avatar(S.user.uid,"lg")}<div style="min-width:0"><div class="me-name">${esc(S.user.displayName||S.user.email)}</div>${syncHTML()}</div>`;
  const cur=S.space;
  $("topbar").innerHTML=`<button class="nb-switch" data-act="notebooks" aria-label="Switch notebook"><span class="nb-dot" style="background:${cur==="team"?"var(--ink)":colorFor(cur)}"></span><span class="t">${esc(spaceName())}</span>${I.down}</button><button class="bell-btn" data-view="alerts" aria-label="Notifications${unN?`, ${unN} unread`:""}">${I.bell}${unN?`<span class="badge">${unN>9?"9+":unN}</span>`:""}</button>`;
  $("tabbar").innerHTML=VIEWS.map(v=>`<button data-view="${v.id}" aria-current="${S.view===v.id}">${v.icon}${v.label}${v.id==="followups"&&fuN?`<span class="badge">${fuN}</span>`:v.id==="chat"&&chN?`<span class="badge">${chN}</span>`:""}</button>`).join("");
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
    <div class="pend" id="${p}Atts">${attChips(p)}</div>
    <div class="more">
      <div class="cats" role="group" aria-label="Category">${TAGS.map(t=>`<button type="button" class="cat" data-cat="${t.id}" data-p="${p}" aria-pressed="${t.id===tag}"><i style="background:${tagColor(t.id)}"></i>${esc(t.label)}</button>`).join("")}</div>
      <input class="input" id="${p}Who" value="${esc(d.who||"")}" placeholder="Person or company (optional)" aria-label="Person or company">
      ${p!=="i"?`<label class="field" style="margin:0"><span>Day</span><input class="input" type="date" id="${p}Date" value="${esc(d.date||S.date)}"></label>`:""}
      ${note?"":notifyChips(p)}
      <div class="foot">
        <div class="foot-l"><label class="switch"><input type="checkbox" id="${p}Fu" ${d.followUp?"checked":""}> Needs follow-up</label>
        <label class="btn attach-btn">${I.clip}<span>Attach files</span><input type="file" class="sr" data-attach="${p}" multiple></label>
        <button type="button" class="btn attach-btn" data-act="mention" data-p="${p}" aria-label="Mention someone"><span class="at-ic" aria-hidden="true">@</span><span>Mention</span></button></div>
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
    ${n.text?`<div class="text">${noteText(n.text,opts.q)}</div>`:""}
    ${attsHTML(n)}
    <div class="bottom">
      ${n.followUp?`<button class="fu ${n.done?"done":""}" data-act="toggle-done" data-id="${n.id}" aria-pressed="${!!n.done}"><span class="box">${n.done?"✓":""}</span>${n.done?"Done":"Mark done"}</button>`:""}
      ${n.who?`<span class="person">${esc(n.who)}</span>`:""}
      <span class="hint" style="display:inline-flex;align-items:center;gap:6px;font-size:13px">${avatar(n.author)}${esc(nameOf(n.author))}${edited}</span>
    </div>
  </article>`;
}
function filterChips(){
  return `<div class="chips" role="group" aria-label="Filter notes">
    <button class="chip" data-act="filter-all" aria-pressed="${!S.filter&&!S.mine&&!S.atMe}">All</button>
    <button class="chip" data-act="filter-mine" aria-pressed="${S.mine}">Mine</button>
    <button class="chip" data-act="filter-atme" aria-pressed="${!!S.atMe}">@ Mentions me</button>
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
  const items=q?all().filter(e=>passes(e)&&((e.text||"").toLowerCase().includes(q)||(e.who||"").toLowerCase().includes(q)||(TAG[e.tag]?.label||"").toLowerCase().includes(q)||nameOf(e.author).toLowerCase().includes(q)||(e.attachments||[]).some(a=>String(a.name).toLowerCase().includes(q)))):[];
  return `${whereLine()}<h1 class="page-title">Search</h1>
    <input class="input search-big" id="searchBox" type="search" value="${esc(S.query)}" placeholder="Search ${esc(spaceName())}: names, songs, companies…" aria-label="Search notes">
    ${filterChips()}
    ${!q?`<p class="hint">Search looks through every note in ${esc(spaceName())}, including who wrote it.</p>`:items.length?`<p class="hint">${items.length} ${items.length===1?"note":"notes"} found</p>${grouped(items,S.query.trim())}`:`<div class="empty"><strong>No matches</strong>Try a person's name, a song title or a company.</div>`}`;
}
function viewAlerts(){
  const list=Object.values(S.alerts).sort((a,b)=>(b.createdAt||"").localeCompare(a.createdAt||""));
  const unN=unreadCount();
  return `<h1 class="page-title">Notifications</h1><p class="sub">Notes your team shared with you, mentions, private messages, and follow-ups marked done.</p>
    ${unN?`<button class="btn" data-act="read-all" style="margin-bottom:12px">Mark all as read (${unN})</button>`:""}
    ${!S.alertsReady?`<div class="empty"><strong>Loading…</strong></div>`:list.length?`<div class="list">${list.map(a=>`
      <button class="alert ${a.read?"":"unread"}" data-alert="${a.id}">
        <span class="av" style="background:${colorFor(a.from)}" aria-hidden="true">${esc(((a.fromName||"?")[0]).toUpperCase())}</span>
        <span class="alert-body"><span>${alertLine(a)}</span>
          ${a.text?`<span class="alert-text">${esc(a.text)}</span>`:""}
          <span class="hint" style="font-size:13px">${esc(ago(a.createdAt))}${a.date?` · note for ${esc(relDay(a.date)||fmtShort(a.date))}`:""}</span></span>
        ${a.read?"":`<span class="dot" aria-label="Unread"></span>`}
      </button>`).join("")}</div>`:`<div class="empty"><strong>No notifications yet</strong>When someone adds a note for you, mentions you with @, or marks your follow-up done, it shows up here.</div>`}`;
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
  <section class="card"><h2>Notifications</h2>
    <label class="switch" style="display:flex"><input type="checkbox" id="optEmail" ${S.profiles[S.user.uid]?.emailNotify===false?"":"checked"}> Email me when I get a notification</label>
    <p class="hint" style="margin:0 0 6px 54px">Only for notifications you haven't already seen in the app.</p>
    <label class="switch" style="display:flex"><input type="checkbox" id="optPopup" ${store.get("ln-popups-"+S.user.uid)==="1"&&"Notification" in window&&Notification.permission==="granted"?"checked":""}> Show pop-up alerts on this device</label>
    <p class="hint" style="margin:0 0 0 54px">Pop-ups appear while the app is open. They are free and need no setup.</p>
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
  const mEl=$("msgs"); const mk={top:mEl?.scrollTop, bottom:mEl?mEl.scrollHeight-mEl.scrollTop-mEl.clientHeight<80:false, key:draftKey()};
  $("main").classList.toggle("wide",S.view==="notes"||S.view==="chat");
  $("main").classList.toggle("chatmode",S.view==="chat"); document.body.classList.toggle("in-room",S.view==="chat"&&!!S.room);
  if(S.view!=="chat"&&S.room) leaveRoomView();
  v.innerHTML=S.view==="chat"?viewChat():S.view==="alerts"?viewAlerts():S.view==="followups"?viewFollowups():S.view==="search"?viewSearch():S.view==="more"?viewMore():viewNotes();
  if(keep.text!=null&&$("iText")){ $("iText").value=keep.text; $("iWho").value=keep.who||""; $("iFu").checked=!!keep.fu; }
  if(keep.addEmail&&$("addEmail")) $("addEmail").value=keep.addEmail;
  if(keep.myName!=null&&$("myName")&&keep.focus==="myName") $("myName").value=keep.myName;
  if(keep.focus&&$(keep.focus)&&!S.sheet){ const el=$(keep.focus); el.focus(); if(keep.selStart!=null&&el.setSelectionRange) try{ el.setSelectionRange(keep.selStart,keep.selStart); }catch(e){} }
  const m2=$("msgs"); if(m2){ if(S.stick||mk.bottom||mk.key!==draftKey()||mk.top==null){ m2.scrollTop=m2.scrollHeight; if(S.msgsReady) S.stick=false; } else m2.scrollTop=mk.top; }
  grow($("chatText"));
  if(MP.ta&&!document.body.contains(MP.ta)){ const t=$(MP.ta.id); if(t&&document.activeElement===t){ MP.ta=t; updateMentions(t); } else closeMentions(); }
}
function go(view){ if(view==="chat"&&S.view!=="chat"&&!isPhone()&&!S.room){ const f=roomList()[0]; if(f){ openRoom(f.id); return; } }
  S.view=view; if(view!=="notes") S.composerOpen=false; render(); window.scrollTo({top:0}); if(view==="search") setTimeout(()=>$("searchBox")?.focus(),30); }
function goDay(d){ S.date=d; S.calMonth=d.slice(0,7); S.view="notes"; closeSheet(); render(); window.scrollTo({top:0}); }

/* ================= sheets ================= */
function openSheet(sh){
  if(S.sheet&&S.sheet.type==="compose"&&sh.type!=="compose") discardAtt("s");
  if(sh.type==="compose"){ discardAtt("s"); const n=sh.id&&S.notes[sh.id]; S.att.s=n?(n.attachments||[]).filter(a=>okFileId(a.id)).map(a=>({...a,key:a.id,status:"done",fresh:false})):[]; }
  S.sheet=sh; renderSheet(); }
function closeSheet(){ if(S.sheet&&S.sheet.type==="compose") discardAtt("s"); S.sheet=null; sheetRoot.innerHTML=""; }
function confirmSheet(o){ openSheet({type:"confirm",...o}); }
function renderSheet(){
  const sh=S.sheet; if(!sh){ sheetRoot.innerHTML=""; return; }
  let h="";
  if(sh.type==="compose"){ const n=sh.id?S.notes[sh.id]:null;
    h=`<h2>${n?"Edit note":"New note"}</h2><p class="sub">${esc(spaceName())}</p>${composerHTML("s",n)}`; }
  else if(sh.type==="file"){ h=fileSheetHTML(sh); }
  else if(sh.type==="note-menu"){ const n=S.notes[sh.id]; if(!n) return closeSheet();
    h=`<h2>Note</h2><p class="sub">${esc(n.text.slice(0,90)||((n.attachments||[]).map(a=>a.name).join(", ")))}${n.text.length>90?"…":""}</p><div class="menu-list">
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
  else if(sh.type==="new-chat"){ h=newChatHTML(sh); }
  else if(sh.type==="room-info"){ h=roomInfoHTML(); if(!h) return closeSheet(); }
  else if(sh.type==="msg-menu"){ h=msgMenuHTML(sh); if(!h) return closeSheet(); }
  else if(sh.type==="save-thread"){ h=saveThreadHTML(sh); }
  else if(sh.type==="thread-menu"){ h=threadMenuHTML(); if(!h) return closeSheet(); }
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
  if(S.att[p].some(a=>a.status==="uploading")){ toast("Hang on, files are still uploading."); return; }
  const atts=savedAtts(S.att[p]);
  if(!text&&!atts.length){ $(p+"Text").focus(); toast("Write something or attach a file first."); return; }
  const active=document.querySelector(`[data-cat][data-p="${p}"][aria-pressed="true"]`);
  const tag=active?active.dataset.cat:"meeting"; S.draft.tag=tag;
  const date=$(p+"Date")?.value||(id?S.notes[id].date:S.date);
  const fields={text, tag, who:$(p+"Who").value.trim(), followUp:$(p+"Fu").checked, date, attachments:atts};
  if(id){ const keep=new Set(atts.map(a=>a.id)); (S.notes[id].attachments||[]).filter(a=>!keep.has(a.id)).forEach(a=>removeFile(a.id,a.chunks)); }
  S.att[p].filter(a=>a.status==="error"&&a.id).forEach(a=>removeFile(a.id,a.chunks));
  S.att[p]=[];
  if(id&&!fields.followUp) fields.done=false;
  let recipients=null;
  if(id){
    const before=new Set(mentionsIn(S.notes[id].text||"")), added=mentionsIn(text).filter(e=>!before.has(e));
    if(added.length) sendAlerts(added.map(e=>({to:e,type:"mention"})),{noteId:id,date,text});
    recipients=added.map(e=>({to:e}));
  } else {
    const mentioned=new Set(mentionsIn(text));
    const picked=new Set([...S.notify,...mentioned]);
    recipients=[...picked].map(e=>({to:e, type:mentioned.has(e)?"mention":"note"}));
  }
  saveNote(fields, id, recipients);
  if(!id) S.notify=new Set(defaultNotify());
  if(p==="s"){ closeSheet(); if(!id&&date!==S.date){ S.date=date; S.calMonth=date.slice(0,7); } }
  else { $("iText").value=""; $("iWho").value=""; $("iFu").checked=false; S.composerOpen=false; }
  render();
  const nN=recipients?recipients.length:0;
  toast(id?`Changes saved${nN?`, ${nN} ${nN===1?"person":"people"} pinged`:""}`:!navigator.onLine?"Saved. It will sync when you're back online.":`Added to ${spaceName()}${nN?`, ${nN} ${nN===1?"person":"people"} notified`:""}`);
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
  if(b.dataset.ntf){ const e=b.dataset.ntf; if(S.notify.has(e)) S.notify.delete(e); else S.notify.add(e); b.setAttribute("aria-pressed",S.notify.has(e)?"true":"false"); return; }
  if(b.dataset.alert){ openAlert(b.dataset.alert); return; }
  if(b.dataset.filter){ S.filter=S.filter===b.dataset.filter?null:b.dataset.filter; render(); return; }
  if(b.dataset.rm){ removeMember(b.dataset.rm); return; }
  if(b.id==="addBtn"){ addMember(); return; }
  if(b.dataset.room){ openRoom(b.dataset.room); return; }
  const act=b.dataset.act, id=b.dataset.id; if(!act) return;
  if(chatClick(act,b)) return;
  switch(act){
    case "close": closeSheet(); break;
    case "ntf-all": spaceMembers().filter(e=>e!==myEmail()).forEach(e=>S.notify.add(e)); document.querySelectorAll("[data-ntf]").forEach(x=>x.setAttribute("aria-pressed","true")); break;
    case "ntf-none": S.notify.clear(); document.querySelectorAll("[data-ntf]").forEach(x=>x.setAttribute("aria-pressed","false")); break;
    case "read-all": markAllRead(); break;
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
    case "filter-all": S.filter=null; S.mine=false; S.atMe=false; render(); break;
    case "filter-atme": S.atMe=!S.atMe; render(); break;
    case "mention": insertAt(b.dataset.p); break;
    case "filter-mine": S.mine=!S.mine; render(); break;
    case "fu-tab": S.fuTab=b.dataset.tab; render(); break;
    case "collapse": S.composerOpen=false; $("iText").value=""; discardAtt("i"); render(); break;
    case "save-note": submitComposer(b.dataset.p, id); break;
    case "rm-att": removeAtt(b.dataset.p, b.dataset.key); break;
    case "open-file": openFile(id, b.dataset.file); break;
    case "note-menu": openSheet({type:"note-menu",id}); break;
    case "edit": openSheet({type:"compose",id}); break;
    case "move": openSheet({type:"move",id}); break;
    case "do-move": { const n=S.notes[id], target=$("moveDate").value; if(!target){ toast("Pick a day."); return; }
      if(target!==n.date){ const t=parse(target), c=new Date(n.createdAt); t.setHours(c.getHours(),c.getMinutes(),c.getSeconds()); updateNote(id,{date:target,createdAt:t.toISOString()}); toast(`Moved to ${fmtLong(target)}`); }
      closeSheet(); break; }
    case "make-fu": updateNote(id,{followUp:true,done:false}); closeSheet(); toast("Added to follow-ups"); break;
    case "copy": { const n=S.notes[id]; navigator.clipboard?.writeText(n.text).then(()=>toast("Copied")).catch(()=>toast("Couldn't copy on this device.")); closeSheet(); break; }
    case "delete": confirmSheet({title:"Delete this note?", body:"It will be deleted for everyone in "+spaceName()+". This can't be undone.", ok:"Delete", danger:true, onOk:()=>{ deleteNote(id); toast("Note deleted"); }}); break;
    case "toggle-done": { const n=S.notes[id]; updateNote(id,{done:!n.done}); toast(n.done?"Moved back to follow-ups":"Marked done");
      if(!n.done&&n.author&&n.author!==S.user.uid){ const e=S.profiles[n.author]?.email; if(e) sendAlerts([{to:e,type:"done"}],{noteId:n.id,date:n.date,text:n.text}); }
      break; }
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
document.addEventListener("change",async ev=>{
  if(ev.target.dataset&&ev.target.dataset.attach){ addFiles(ev.target.files, ev.target.dataset.attach); ev.target.value=""; return; }
  if(ev.target.id==="optEmail"){ const on=ev.target.checked; fs.doc("profiles/"+S.user.uid).set({emailNotify:on},{merge:true}).then(()=>toast(on?"Email alerts on":"Email alerts off")).catch(()=>toast("Couldn't save that setting.")); }
  if(ev.target.id==="optPopup"){
    if(!ev.target.checked){ store.set("ln-popups-"+S.user.uid,"0"); toast("Pop-ups off on this device"); return; }
    if(!("Notification" in window)){ ev.target.checked=false; toast("This browser doesn't support pop-up alerts."); return; }
    const perm=await Notification.requestPermission();
    if(perm==="granted"){ store.set("ln-popups-"+S.user.uid,"1"); toast("Pop-ups on for this device"); }
    else { ev.target.checked=false; toast("Pop-ups are blocked. Allow notifications for this site in your browser settings."); }
  }
});
document.addEventListener("paste",ev=>{
  const p=ev.target.id==="iText"?"i":ev.target.id==="sText"?"s":null; if(!p) return;
  const files=Array.from(ev.clipboardData?.files||[]); if(!files.length) return;
  ev.preventDefault();
  const stamp=new Date().toISOString().slice(0,19).replace(/[:T]/g,"-");
  addFiles(files.map((f,i)=>f.name&&!/^image\.(png|jpe?g)$/i.test(f.name)?f:new File([f],`screenshot-${stamp}${i?"-"+i:""}.${(f.type.split("/")[1]||"png").replace("jpeg","jpg")}`,{type:f.type})), p);
});
document.addEventListener("dragover",ev=>{ const c=ev.target.closest?.(".composer"); if(c&&ev.dataTransfer?.types?.includes("Files")){ ev.preventDefault(); c.classList.add("drag"); } });
document.addEventListener("dragleave",ev=>{ const c=ev.target.closest?.(".composer"); if(c&&!c.contains(ev.relatedTarget)) c.classList.remove("drag"); });
document.addEventListener("drop",ev=>{ const c=ev.target.closest?.(".composer"); if(!c||!ev.dataTransfer?.files?.length) return; ev.preventDefault(); c.classList.remove("drag"); addFiles(ev.dataTransfer.files, c.id==="sComp"?"s":"i"); });
document.addEventListener("focusin",ev=>{ if(ev.target.id==="iText"&&!S.composerOpen){ S.composerOpen=true; $("iComp")?.classList.add("open"); } });
document.addEventListener("input",ev=>{ if(ev.target.id==="chatText"){ S.drafts[draftKey()]=ev.target.value; grow(ev.target); updateMentions(ev.target); return; }
  if(ev.target.id==="iText"||ev.target.id==="sText"){ updateMentions(ev.target); return; } if(ev.target.id==="searchBox"){ clearTimeout(window.__st); window.__st=setTimeout(()=>{ S.query=ev.target.value; render(); },150); } });
/* mention picker: keys run before the app's own shortcuts */
document.addEventListener("keydown",ev=>{
  if(!MP.el||ev.target!==MP.ta) return;
  const n=MP.list.length, mv=d=>{ MP.sel=(MP.sel+d+n)%n; MP.el.querySelectorAll(".mp-o").forEach((o,i)=>o.setAttribute("aria-selected",i===MP.sel)); MP.ta.setAttribute("aria-activedescendant","mpo"+MP.sel); MP.el.querySelector(`#mpo${MP.sel}`)?.scrollIntoView({block:"nearest"}); };
  if(ev.key==="ArrowDown"){ ev.preventDefault(); ev.stopImmediatePropagation(); mv(1); }
  else if(ev.key==="ArrowUp"){ ev.preventDefault(); ev.stopImmediatePropagation(); mv(-1); }
  else if((ev.key==="Enter"&&!ev.ctrlKey&&!ev.metaKey&&!ev.shiftKey)||ev.key==="Tab"){ ev.preventDefault(); ev.stopImmediatePropagation(); pickMention(MP.sel); }
  else if(ev.key==="Escape"){ ev.preventDefault(); ev.stopImmediatePropagation(); closeMentions(); }
},true);
document.addEventListener("mousedown",ev=>{ const o=ev.target.closest?.(".mp-o"); if(o){ ev.preventDefault(); pickMention(+o.dataset.mi); } else if(MP.el&&!MP.el.contains(ev.target)&&ev.target!==MP.ta) closeMentions(); });
document.addEventListener("focusout",ev=>{ if(ev.target===MP.ta) setTimeout(()=>{ if(document.activeElement!==MP.ta) closeMentions(); },120); });
document.addEventListener("selectionchange",()=>{ const a=document.activeElement; if(MP.el&&a===MP.ta) updateMentions(a); });
window.addEventListener("resize",()=>{ if(MP.ta) updateMentions(MP.ta); });
document.addEventListener("keydown",ev=>{
  if(ev.target.id==="chatText"&&ev.key==="Enter"&&!ev.shiftKey&&!ev.isComposing&&!(isPhone()&&!ev.ctrlKey&&!ev.metaKey)){ ev.preventDefault(); sendChat(); return; }
  if((ev.target.id==="thTitle"||ev.target.id==="thRename"||ev.target.id==="rmName")&&ev.key==="Enter"){ ev.preventDefault(); document.querySelector(ev.target.id==="thTitle"?'[data-act="thread-create"]':ev.target.id==="thRename"?'[data-act="thread-rename"]':'[data-act="save-room"]')?.click(); return; }
  if(ev.key==="Escape"){ if(S.sheet){ closeSheet(); return; } if(S.sel){ S.sel=null; render(); return; } if(S.composerOpen){ S.composerOpen=false; render(); } return; }
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
    md+=`- **${fmtTime(e.createdAt)}, ${TAG[e.tag]?.label||e.tag}**${e.who?` (${e.who})`:""}${fu}, by ${nameOf(e.author)}: ${e.text.replace(/\n/g,"\n  ")}${(e.attachments||[]).length?`\n  Attachments: ${e.attachments.map(a=>a.name).join(", ")}`:""}\n`; }); });
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
