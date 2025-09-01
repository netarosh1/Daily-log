// ----- State -----
const $ = (s, r=document)=>r.querySelector(s);
const $$ = (s, r=document)=>Array.from(r.querySelectorAll(s));
const STORAGE_KEY = "fairy_pixel_state_v1";

const DEFAULT_ACTS = [
  { id:"1", name:"Sleep", color:"#334155", favorite:true },
  { id:"2", name:"Work/Study", color:"#16a34a", favorite:true },
  { id:"3", name:"Exercise", color:"#ef4444", favorite:false },
  { id:"4", name:"Meal", color:"#f59e0b", favorite:false },
  { id:"5", name:"Read", color:"#8b5cf6", favorite:true },
  { id:"99", name:"Other", color:"#64748b", favorite:false }
];

function loadState(){
  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const init = { activities: DEFAULT_ACTS, days:{}, reminders:{enabled:false, intervalMin:30} };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(init));
      return init;
    }
    return JSON.parse(raw);
  }catch{ return { activities: DEFAULT_ACTS, days:{}, reminders:{enabled:false, intervalMin:30} }; }
}
function saveState(){ localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }

let state = loadState();
let selectedColor = $("#current-color") ? $("#current-color").value : "#ff7bd3";

// ----- Date utils -----
function fmtISO(d){ return d.toISOString().slice(0,10); }
function ensureDay(dateStr){
  if (!state.days[dateStr]) state.days[dateStr] = { slots:Array(48).fill(null), rating:null, moods:"" };
  return state.days[dateStr];
}

// ----- Render 2 columns -----
function renderColumns(){
  const dateStr = $("#date-picker").value;
  const day = ensureDay(dateStr);

  const timeCol = $("#time-col"); const actCol = $("#act-col");
  timeCol.innerHTML = ""; actCol.innerHTML = "";

  for(let i=0;i<48;i++){
    const tcell = document.createElement("div");
    tcell.className = "slot-cell";
    timeCol.appendChild(tcell);

    const acell = document.createElement("div");
    acell.className = "slot-cell";
    if (day.slots[i]) { acell.style.backgroundColor = day.slots[i]; acell.classList.add("filled"); }
    acell.dataset.idx = i;
    acell.addEventListener("click", ()=>{
      day.slots[i] = day.slots[i] ? null : selectedColor;
      saveState();
      renderColumns();
    });
    actCol.appendChild(acell);
  }

  $("#day-rating").value = day.rating ?? "";
  $("#day-moods").value = day.moods ?? "";
}

// ----- Activities modal -----
function openActivities(){
  const list = $("#activities-list");
  list.innerHTML = "";
  state.activities.forEach(a=>{
    const row = document.createElement("div");
    row.className = "activity-row";
    row.innerHTML = `
      <span class="swatch" style="background:${a.color}"></span>
      <div><strong>${a.name}</strong> <small>(${a.id})</small></div>
      <button type="button" class="outline small pick" data-color="${a.color}">Pick</button>
      <button type="button" class="outline small edit" data-id="${a.id}">Edit</button>
      <button type="button" class="outline small del" data-id="${a.id}">Delete</button>
    `;
    list.appendChild(row);
  });
  list.onclick = (e)=>{
    const t = e.target;
    if (t.classList.contains("pick")){
      selectedColor = t.dataset.color;
      $("#current-color").value = rgbToHex(selectedColor);
    } else if (t.classList.contains("edit")){
      const a = state.activities.find(x=>x.id===t.dataset.id);
      if (a){ $("#act-id").value=a.id; $("#act-name").value=a.name; $("#act-color").value=a.color; $("#act-fav").checked=!!a.favorite; }
    } else if (t.classList.contains("del")){
      state.activities = state.activities.filter(x=>x.id!==t.dataset.id);
      saveState(); openActivities();
    }
  };
  $("#activities-modal").showModal();
}

function saveActivity(){
  const id = $("#act-id").value.trim();
  const name = $("#act-name").value.trim();
  const color = $("#act-color").value.trim();
  const fav = $("#act-fav").checked;
  if (!id || !name || !color) { alert("ID, Name, and Color are required."); return; }
  const ex = state.activities.find(a=>a.id===id);
  if (ex){ ex.name=name; ex.color=color; ex.favorite=fav; }
  else state.activities.push({ id, name, color, favorite:fav });
  saveState();
  $("#activities-modal").close();
}

// ----- Stats -----
function defaultWeekRange(){
  const now = new Date($("#date-picker").value);
  const d = now.getDay();
  const diff = (d===0 ? -6 : 1-d);
  const monday = new Date(now); monday.setDate(now.getDate()+diff);
  const sunday = new Date(monday); sunday.setDate(monday.getDate()+6);
  $("#stats-from").value = monday.toISOString().slice(0,10);
  $("#stats-to").value = sunday.toISOString().slice(0,10);
}
function openStats(){ defaultWeekRange(); refreshStats(); $("#stats-modal").showModal(); }

function collectStats(fromStr, toStr){
  const out = {};
  const from = new Date(fromStr), to = new Date(toStr); to.setHours(23,59,59,999);
  for(const [dateStr, rec] of Object.entries(state.days)){
    const d = new Date(dateStr + "T00:00:00");
    if (d>=from && d<=to){
      rec.slots.forEach(c=>{ if(c){ out[c]=(out[c]||0)+1; } });
    }
  }
  return out; // color -> slot count
}
function refreshStats(){
  const counts = collectStats($("#stats-from").value, $("#stats-to").value);
  const entries = Object.entries(counts).sort((a,b)=>b[1]-a[1]);
  // chart
  const canvas = $("#stats-chart"); const ctx = canvas.getContext("2d");
  ctx.clearRect(0,0,canvas.width,canvas.height);
  const max = Math.max(1, ...entries.map(([,n])=>n));
  const padding = 24; const chartH = canvas.height - padding*2;
  const barW = Math.max(10, (canvas.width - padding*2) / Math.max(1, entries.length) - 6);
  entries.forEach(([color, slots], i)=>{
    const h = (slots / max) * chartH;
    const x = padding + i*(barW+6), y = canvas.height - padding - h;
    ctx.fillStyle = color; ctx.fillRect(x,y,barW,h);
  });
  // table
  const rows = entries.map(([color, slots])=>`<tr><td><span class="swatch" style="background:${color}"></span></td><td>${(slots*0.5).toFixed(1)} h</td></tr>`).join("");
  $("#stats-table").innerHTML = `<table><thead><tr><th>Color</th><th>Hours</th></tr></thead><tbody>${rows||"<tr><td colspan=2>No data</td></tr>"}</tbody></table>`;
}

// ----- Export / Import -----
function doExport(){
  const data = JSON.stringify(state, null, 2);
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([data], {type:"application/json"}));
  a.download = "fairy-pixel-data.json";
  a.click();

  // CSV (one row per day)
  const header = ["date", ...Array.from({length:48}, (_,i)=>`slot_${i}`), "rating", "moods"];
  const dates = Object.keys(state.days).sort();
  const rows = dates.map(d=>{
    const rec = state.days[d];
    return [d, ...rec.slots.map(c=>c||""), rec.rating??"", (rec.moods||"").replace(/,/g,";")];
  });
  const csv = [header.join(","), ...rows.map(r=>r.join(","))].join("\n");
  const a2 = document.createElement("a");
  a2.href = URL.createObjectURL(new Blob([csv], {type:"text/csv"}));
  a2.download = "fairy-pixel-export.csv";
  a2.click();
}
function doImport(file){
  const reader = new FileReader();
  reader.onload = ()=>{
    try{
      const incoming = JSON.parse(reader.result);
      if (!incoming.activities || !incoming.days) throw new Error("Bad format");
      state = incoming; saveState(); renderColumns(); alert("Import complete!");
    }catch(e){ alert("Import failed: "+ e.message); }
  };
  reader.readAsText(file);
}

// ----- Reminders -----
let reminderTimer = null;
function scheduleReminders(){
  if (reminderTimer) clearInterval(reminderTimer);
  if (!state.reminders.enabled) return;
  const iv = Math.max(1, Number(state.reminders.intervalMin)) * 60 * 1000;
  reminderTimer = setInterval(async ()=>{
    if ("Notification" in window){
      if (Notification.permission === "granted"){
        new Notification("Log your 30-min block ✨");
      } else if (Notification.permission !== "denied"){
        const perm = await Notification.requestPermission();
        if (perm === "granted") new Notification("Reminders enabled");
      }
    }
    if (navigator.vibrate) navigator.vibrate(80);
  }, iv);
}

// ----- Helpers -----
function rgbToHex(c){
  // handle named/hex; if it's already hex, return
  if (c && c.startsWith("#")) return c;
  const ctx = document.createElement("canvas").getContext("2d");
  ctx.fillStyle = c; const rgb = ctx.fillStyle; // standardized
  const m = rgb.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (!m) return "#ffffff";
  const r = Number(m[1]).toString(16).padStart(2,"0");
  const g = Number(m[2]).toString(16).padStart(2,"0");
  const b = Number(m[3]).toString(16).padStart(2,"0");
  return "#"+r+g+b;
}

// ----- Init -----
document.addEventListener("DOMContentLoaded", ()=>{
  // Set date
  const today = new Date();
  $("#date-picker").value = today.toISOString().slice(0,10);
  $("#date-label").textContent = today.toLocaleDateString(undefined, { month:"long", day:"numeric", year:"numeric" });

  // Render
  renderColumns();

  // Date navigation
  $("#prev-day").addEventListener("click", ()=>{
    const d = new Date($("#date-picker").value); d.setDate(d.getDate()-1);
    $("#date-picker").value = d.toISOString().slice(0,10);
    $("#date-label").textContent = d.toLocaleDateString(undefined, { month:"long", day:"numeric", year:"numeric" });
    renderColumns();
  });
  $("#next-day").addEventListener("click", ()=>{
    const d = new Date($("#date-picker").value); d.setDate(d.getDate()+1);
    $("#date-picker").value = d.toISOString().slice(0,10);
    $("#date-label").textContent = d.toLocaleDateString(undefined, { month:"long", day:"numeric", year:"numeric" });
    renderColumns();
  });
  $("#date-picker").addEventListener("change", ()=>{
    const d = new Date($("#date-picker").value);
    $("#date-label").textContent = d.toLocaleDateString(undefined, { month:"long", day:"numeric", year:"numeric" });
    renderColumns();
  });

  // Current color
  $("#current-color").addEventListener("input", (e)=>{ selectedColor = e.target.value; });
  $("#apply-to-all").addEventListener("click", ()=>{
    const dateStr = $("#date-picker").value;
    const day = ensureDay(dateStr);
    for(let i=0;i<48;i++){ if (!day.slots[i]) day.slots[i] = selectedColor; }
    saveState(); renderColumns();
  });

  // Activities
  $("#open-activities").addEventListener("click", openActivities);
  $("#save-activity").addEventListener("click", saveActivity);

  // Stats
  $("#open-stats").addEventListener("click", openStats);
  $("#refresh-stats").addEventListener("click", refreshStats);

  // Export/Import
  $("#do-export").addEventListener("click", doExport);
  $("#do-import").addEventListener("change", (e)=>{ const f=e.target.files?.[0]; if(f) doImport(f); e.target.value=""; });

  // Reminders
  $("#open-reminders").addEventListener("click", ()=>{
    $("#rem-enabled").checked = !!state.reminders.enabled;
    $("#rem-interval").value = state.reminders.intervalMin || 30;
    $("#reminders-modal").showModal();
  });
  $("#apply-reminders").addEventListener("click", ()=>{
    state.reminders.enabled = $("#rem-enabled").checked;
    state.reminders.intervalMin = Number($("#rem-interval").value || 30);
    saveState(); scheduleReminders(); $("#reminders-modal").close();
  });
  scheduleReminders();

  // Day meta
  $("#day-rating").addEventListener("change", ()=>{
    const d = $("#date-picker").value;
    const rec = ensureDay(d);
    const v = Number($("#day-rating").value);
    rec.rating = isNaN(v) ? null : v; saveState();
  });
  $("#day-moods").addEventListener("change", ()=>{
    const d = $("#date-picker").value;
    const rec = ensureDay(d);
    rec.moods = $("#day-moods").value.trim(); saveState();
  });

  // PWA SW
  if ("serviceWorker" in navigator){
    navigator.serviceWorker.register("./service-worker.js?v=1").catch(()=>{});
  }
});
