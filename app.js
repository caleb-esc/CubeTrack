const STORE_KEY="cubetrack_data_v1", ID_KEY="cubetrack_extension_id";
const $=id=>document.getElementById(id);
let state=JSON.parse(localStorage.getItem(STORE_KEY)||'{"solves":[],"practice":{}}');
state.solves ||= []; state.practice ||= {};
let remaining=3600, elapsedSinceMinute=0, tick=null;
$("extensionId").value=localStorage.getItem(ID_KEY)||"";
$("only333").addEventListener("change",render);
$("saveId").onclick=()=>{localStorage.setItem(ID_KEY,$("extensionId").value.trim());message("Extension ID saved in this browser.");};
function message(s){$("syncMessage").textContent=s}
function save(){localStorage.setItem(STORE_KEY,JSON.stringify(state));render()}
function today(){const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`}
function sec(ms){return (ms/1000).toFixed(2)+"s"}
function filtered(){return state.solves.filter(s=>!$("only333").checked||String(s.puzzle||"333")==="333")}
function render(){
 const solves=filtered(), valid=solves.filter(s=>!s.dnf);
 const best=(key)=>valid.length?Math.min(...valid.map(s=>s[key]).filter(Number.isFinite)):null;
 const bestSingle=best("seconds");
 const bestAo5=bestRollingAverage(solves,5);
 $("bestSingle").textContent=bestSingle===null?"--":sec(bestSingle*1000);
 $("bestAo5").textContent=bestAo5===null?"--":sec(bestAo5*1000);
 $("solveCount").textContent=solves.length;
 const mins=state.practice[today()]||0; $("practiceToday").textContent=`${mins} / 60 min`;
 const targets=[20,15,12,10], b=best("seconds");
 $("milestones").innerHTML=targets.map(t=>{let pct=b===null?0:Math.max(0,Math.min(100,(30-b)/(30-t)*100));return `<div class="milestone"><div class="milestone-head"><b>Sub-${t}</b><span>${b===null?"Awaiting solves":b<t?"Achieved":sec(b*1000)}</span></div><div class="bar"><span style="width:${pct}%"></span></div></div>`}).join("");
 $("solveRows").innerHTML=solves.slice().sort((a,b)=>b.timestamp-a.timestamp).slice(0,30).map(s=>`<tr><td>${s.dnf?"DNF":sec(s.seconds*1000)}</td><td class="${s.penalty?"penalty":""}">${s.penalty||"—"}</td><td>${escapeHtml(s.session||"csTimer")}</td><td>${s.timestamp?new Date(s.timestamp).toLocaleString():"—"}</td></tr>`).join("")||'<tr><td colspan="4">No solves imported yet.</td></tr>';
}
function bestRollingAverage(list,n){
 const ordered=list.slice().sort((a,b)=>a.timestamp-b.timestamp);
 let best=null;
 for(let i=0;i+n<=ordered.length;i++){
   const window=ordered.slice(i,i+n);
   const dnfs=window.filter(s=>s.dnf||!Number.isFinite(s.seconds)).length;
   if(dnfs>1)continue;
   const vals=window.map(s=>(s.dnf||!Number.isFinite(s.seconds))?Infinity:s.seconds).sort((a,b)=>a-b);
   vals.shift(); vals.pop();
   const avg=vals.some(v=>!Number.isFinite(v))?null:vals.reduce((a,b)=>a+b,0)/vals.length;
   if(avg!==null&&(best===null||avg<best))best=avg;
 }
 return best;
}
function escapeHtml(s){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
$("syncButton").onclick=async()=>{
 const id=$("extensionId").value.trim(); if(!id){message("Paste your Chrome extension ID and save it first.");return}
 message("Contacting CubeTrack Bridge…");
 try{
  const response=await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error("No response. Check that the extension is installed and csTimer is open.")),8000);chrome.runtime.sendMessage(id,{type:"CUBETRACK_GET_SOLVES"},r=>{clearTimeout(timer);if(chrome.runtime.lastError)reject(new Error(chrome.runtime.lastError.message));else resolve(r)})});
  if(!response?.ok)throw new Error(response?.error||"The bridge returned an error.");
  const incoming=response.solves||[];
  const seen=new Set(state.solves.map(s=>s.id));
  let added=0;
  for(const s of incoming){if(!s.id||seen.has(s.id))continue;state.solves.push(s);seen.add(s.id);added++}
  save();message(`Sync complete: ${added} new solves added (${incoming.length} available from ${response.sessions||0} session(s)).`);
 }catch(e){message(e.message)}
};
$("exportButton").onclick=()=>{const blob=new Blob([JSON.stringify(state,null,2)],{type:"application/json"});const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="cubetrack-backup.json";a.click();URL.revokeObjectURL(a.href)};
$("importFile").onchange=async e=>{const f=e.target.files[0];if(!f)return;try{const d=JSON.parse(await f.text());if(!Array.isArray(d.solves))throw Error("Invalid CubeTrack backup");state=d;save();message("Backup imported.");}catch(err){message("Import failed: "+err.message)}};
function showClock(){const m=Math.floor(remaining/60),s=remaining%60;$("clock").textContent=String(m).padStart(2,"0")+":"+String(s).padStart(2,"0");$("timerProgress").style.width=((3600-remaining)/3600*100)+"%"}
function addPracticeMinute(){state.practice[today()]=(state.practice[today()]||0)+1;save()}
$("startTimer").onclick=()=>{if(tick||remaining<=0)return;$("timerMessage").textContent="Practice session running.";tick=setInterval(()=>{remaining--;elapsedSinceMinute++;if(elapsedSinceMinute>=60){elapsedSinceMinute=0;addPracticeMinute()}showClock();if(remaining<=0){clearInterval(tick);tick=null;$("timerMessage").textContent="One hour complete. Great work!"}},1000)};
$("pauseTimer").onclick=()=>{if(tick){clearInterval(tick);tick=null;$("timerMessage").textContent="Paused."}};
$("resetTimer").onclick=()=>{if(tick)clearInterval(tick);tick=null;remaining=3600;elapsedSinceMinute=0;showClock();$("timerMessage").textContent="Ready when you are."};
showClock();render();
