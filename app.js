// ===== Utilities & State =====
const $ = (sel, root=document) => root.querySelector(sel);
const $$ = (sel, root=document) => Array.from(root.querySelectorAll(sel));

const STORAGE_KEY = "hht_v1";
const DEFAULT_ACTIVITIES = [
  { id: "1", name: "Sleep", color: "#334155", emoji: "😴", favorite: true },
  { id: "2", name: "Work/Study", color: "#16a34a", emoji: "💻", favorite: true },
  { id: "3", name: "Exercise", color: "#ef4444", emoji: "🏃", favorite: false },
  { id: "4", name: "Eat/Meal", color: "#f59e0b", emoji: "🍽️", favorite: false },
  { id: "5", name: "Chores", color: "#06b6d4", emoji: "🧹", favorite: false },
  { id: "6", name: "Social", color: "#f472b6", emoji: "🗣️", favorite: false },
  { id: "7", name: "Read", color: "#8b5cf6", emoji: "📚", favorite: true },
  { id: "8", name: "Crochet", color: "#10b981", emoji: "🧶", favorite: false },
  { id: "9", name: "Commute", color: "#3b82f6", emoji: "🚌", favorite: false },
  { id: "10", name: "Screen/TV", color: "#94a3b8", emoji: "📺", favorite: false },
  { id: "11", name: "Admin", color: "#a3e635", emoji: "🧾", favorite: false },
  { id: "12", name: "Break/Rest", color: "#22c55e", emoji: "☕", favorite: false },
  { id: "99", name: "Other", color: "#64748b", emoji: "❓", favorite: false },
];

// App state kept in localStorage under STORAGE_KEY.
// Structure: { activities: [], days: { "YYYY-MM-DD": { slots: [actId|null]*48, rating: n, moods: "a,b" } }, reminders: {...} }
function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    const init = {
      activities: DEFAULT_ACTIVITIES,
      days: {},
      reminders: { enabled: false, intervalMin: 30 }
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(init));
    return init;
  }
  try { return JSON.parse(raw); } catch { return { activities: DEFAULT_ACTIVITIES, days: {}, reminders: { enabled:false, intervalMin:30 } }; }
}
function saveState(s) { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); }

let state = loadState();
let currentDate = new Date();
let selectedActId = (state.activities[0] || {}).id || null;
let isDragging = false;

function fmtDateISO(d) { return d.toISOString().slice(0,10); }
function setDateInput(d) { $("#date-picker").value = fmtDateISO(d); }
function getDayRec(dateStr) {
  if (!state.days[dateStr]) {
    state.days[dateStr] = { slots: Array(48).fill(null), rating: null, moods: "" };
  }
  return state.days[dateStr];
}

function timeLabelForIndex(idx) {
  const minutes = idx * 30;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const hh = String(h).padStart(2,"0");
  const mm = String(m).padStart(2,"0");
  return `${hh}:${mm}`;
}

function renderGrid() {
  const grid = $("#grid");
  grid.innerHTML = "";
  const dateStr = $("#date-picker").value;
  const day = getDayRec(dateStr);

  for (let i = 0; i < 48; i++) {
    const row = document.createElement("div");
    row.className = "slot-row";

    const timeCell = document.createElement("div");
    timeCell.className = "time-cell";
    timeCell.textContent = timeLabelForIndex(i);
    row.appendChild(timeCell);

    const slotCell = document.createElement("div");
    slotCell.className = "slot-cell";
    const act = state.activities.find(a => a.id === day.slots[i]);
    if (act) {
      slotCell.style.background = act.color;
      slotCell.dataset.act = act.id;
      slotCell.dataset.label = `${act.emoji || ""} ${act.id}`.trim();
    } else {
      slotCell.style.background = "#0f172a";
      delete slotCell.dataset.act;
      delete slotCell.dataset.label;
    }
    slotCell.dataset.idx = i;
    slotCell.addEventListener("mousedown", onSlotDown);
    slotCell.addEventListener("mouseenter", onSlotEnter);
    slotCell.addEventListener("touchstart", onSlotTouch, {passive:false});
    slotCell.addEventListener("touchmove", onSlotTouchMove, {passive:false});
    row.appendChild(slotCell);

    grid.appendChild(row);
  }
}

function onSlotDown(e) {
  e.preventDefault();
  isDragging = true;
  applyToSlot(e.currentTarget);
}
function onSlotEnter(e) {
  if (isDragging) applyToSlot(e.currentTarget);
}
function onMouseUp() { isDragging = false; $$(".slot-cell").forEach(c=>c.classList.remove("dragging")); }
document.addEventListener("mouseup", onMouseUp);

// Touch support
function elementFromTouch(touch) {
  return document.elementFromPoint(touch.clientX, touch.clientY);
}
function onSlotTouch(e) {
  e.preventDefault();
  isDragging = true;
  const t = e.touches[0];
  const el = elementFromTouch(t);
  if (el && el.classList.contains("slot-cell")) applyToSlot(el);
}
function onSlotTouchMove(e) {
  e.preventDefault();
  const t = e.touches[0];
  const el = elementFromTouch(t);
  if (el && el.classList.contains("slot-cell")) applyToSlot(el);
}
document.addEventListener("touchend", ()=>{ isDragging=false; });

function applyToSlot(cell) {
  const idx = Number(cell.dataset.idx);
  const dateStr = $("#date-picker").value;
  const day = getDayRec(dateStr);
  day.slots[idx] = selectedActId;
  saveState(state);
  renderGrid();
}

function renderLegend() {
  const legend = $("#legend");
  legend.innerHTML = "";
  state.activities.forEach(a => {
    const div = document.createElement("div");
    div.className = "legend-item";
    div.addEventListener("click", ()=>{ selectedActId = a.id; refreshQuickPickerHighlight(); });

    const sw = document.createElement("div");
    sw.className = "swatch";
    sw.style.background = a.color;

    const name = document.createElement("div");
    name.innerHTML = `<strong>${a.emoji || ""} ${a.name}</strong> <span class="id">(${a.id})</span>`;

    const badge = document.createElement("div");
    badge.textContent = a.favorite ? "★" : "";

    div.appendChild(sw);
    div.appendChild(name);
    div.appendChild(badge);
    legend.appendChild(div);
  });
}

function renderQuickPicker() {
  const qp = $("#quick-picker");
  qp.innerHTML = "";
  state.activities.filter(a => a.favorite).forEach(a => {
    const btn = document.createElement("button");
    btn.className = "quick-btn";
    btn.textContent = `${a.emoji || ""} ${a.name}`;
    btn.title = `Set activity ${a.id}`;
    btn.addEventListener("click", ()=>{ selectedActId = a.id; refreshQuickPickerHighlight(); });
    btn.dataset.act = a.id;
    qp.appendChild(btn);
  });
  refreshQuickPickerHighlight();
}
function refreshQuickPickerHighlight() {
  $$(".quick-btn").forEach(b => b.classList.toggle("active", b.dataset.act === selectedActId));
}

function renderDayMeta() {
  const dateStr = $("#date-picker").value;
  const day = getDayRec(dateStr);
  $("#day-rating").value = day.rating ?? "";
  $("#mood-tags").value = day.moods ?? "";
}

// ===== Activities Modal =====
function openActivities() {
  const modal = $("#activities-modal");
  const list = $("#activities-list");
  list.innerHTML = "";
  state.activities.forEach(a => {
    const row = document.createElement("div");
    row.className = "activity-row";
    row.innerHTML = `
      <div class="swatch" style="background:${a.color}"></div>
      <div><strong>${a.name}</strong> <span class="id">(${a.id})</span></div>
      <div>${a.emoji || ""}</div>
      <div><label><input type="checkbox" ${a.favorite ? "checked":""} data-act="${a.id}" class="fav-box"> Fav</label></div>
      <div><button class="edit-btn" data-act="${a.id}">Edit</button></div>
      <div><button class="del-btn" data-act="${a.id}">Delete</button></div>
    `;
    list.appendChild(row);
  });

  list.addEventListener("click", (e)=>{
    if (e.target.classList.contains("edit-btn")) {
      const id = e.target.dataset.act;
      const a = state.activities.find(x => x.id === id);
      if (a) {
        $("#act-id").value = a.id;
        $("#act-name").value = a.name;
        $("#act-emoji").value = a.emoji || "";
        $("#act-color").value = a.color;
        $("#act-favorite").checked = !!a.favorite;
      }
    } else if (e.target.classList.contains("del-btn")) {
      const id = e.target.dataset.act;
      state.activities = state.activities.filter(x => x.id !== id);
      saveState(state);
      openActivities(); // re-render
      renderLegend();
      renderQuickPicker();
    } else if (e.target.classList.contains("fav-box")) {
      const id = e.target.dataset.act;
      const a = state.activities.find(x => x.id === id);
      a.favorite = e.target.checked;
      saveState(state);
      renderQuickPicker();
    }
  }, { once: true });

  modal.showModal();
}

function saveActivityFromForm() {
  const id = $("#act-id").value.trim();
  const name = $("#act-name").value.trim();
  const emoji = $("#act-emoji").value.trim();
  const color = $("#act-color").value.trim();
  const favorite = $("#act-favorite").checked;

  if (!id || !name || !color) { alert("ID, Name, and Color are required."); return; }
  const existing = state.activities.find(a => a.id === id);
  if (existing) {
    existing.name = name; existing.emoji = emoji; existing.color = color; existing.favorite = favorite;
  } else {
    state.activities.push({ id, name, emoji, color, favorite });
  }
  saveState(state);
  renderLegend();
  renderQuickPicker();
  $("#activities-modal").close();
}

// ===== Stats =====
function openStats() {
  const modal = $("#stats-modal");
  // default to current week (Mon-Sun)
  const now = new Date($("#date-picker").value);
  const day = now.getDay(); // 0 Sun
  const diffToMon = (day === 0 ? -6 : 1 - day);
  const monday = new Date(now);
  monday.setDate(now.getDate() + diffToMon);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  $("#stats-from").value = monday.toISOString().slice(0,10);
  $("#stats-to").value = sunday.toISOString().slice(0,10);
  refreshStats();
  modal.showModal();
}

function collectStats(fromStr, toStr) {
  const out = {}; // actId -> slot count
  const from = new Date(fromStr);
  const to = new Date(toStr);
  to.setHours(23,59,59,999);
  for (const [dateStr, rec] of Object.entries(state.days)) {
    const d = new Date(dateStr + "T00:00:00");
    if (d >= from && d <= to) {
      rec.slots.forEach(id => { if (id) out[id] = (out[id]||0)+1; });
    }
  }
  return out;
}
function drawBarChart(canvas, labels, values) {
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0,0,canvas.width, canvas.height);
  const maxVal = Math.max(1, ...values);
  const padding = 24;
  const barW = Math.max(8, (canvas.width - padding*2) / values.length - 6);
  const chartH = canvas.height - padding*2;
  values.forEach((v, i)=>{
    const h = (v / maxVal) * chartH;
    const x = padding + i*(barW+6);
    const y = canvas.height - padding - h;
    ctx.fillRect(x, y, barW, h);
    ctx.fillText(labels[i], x, canvas.height - padding + 12);
  });
  // y-axis ticks (hours)
  ctx.fillText("hours", 4, 12);
}

function refreshStats() {
  const fromStr = $("#stats-from").value;
  const toStr = $("#stats-to").value;
  const counts = collectStats(fromStr, toStr); // in half-hours
  const entries = Object.entries(counts).sort((a,b)=>b[1]-a[1]);
  const labels = entries.map(([id]) => {
    const a = state.activities.find(x=>x.id === id);
    return (a?.emoji || "") + (a?.name || id);
  });
  const hours = entries.map(([_, slots]) => (slots*0.5));
  const canvas = $("#stats-chart");
  drawBarChart(canvas, labels, hours);

  // table
  const tblDiv = $("#stats-table");
  const rows = entries.map(([id,slots])=>{
    const a = state.activities.find(x=>x.id === id);
    return `<tr><td>${a?.emoji || ""} ${a?.name || id}</td><td>${(slots*0.5).toFixed(1)}</td></tr>`;
  }).join("");
  tblDiv.innerHTML = `<table><thead><tr><th>Activity</th><th>Hours</th></tr></thead><tbody>${rows || "<tr><td colspan=2>No data</td></tr>"}</tbody></table>`;
}

// ===== Reminders =====
let reminderTimer = null;
function scheduleReminders() {
  if (reminderTimer) clearInterval(reminderTimer);
  if (!state.reminders.enabled) return;
  const iv = Math.max(1, Number(state.reminders.intervalMin)) * 60 * 1000;
  reminderTimer = setInterval(async ()=>{
    if ("Notification" in window) {
      if (Notification.permission === "granted") {
        new Notification("Half-Hour Tracker", { body: "Log what you're doing for this block." });
      } else if (Notification.permission !== "denied") {
        const perm = await Notification.requestPermission();
        if (perm === "granted") new Notification("Half-Hour Tracker", { body: "Reminders enabled." });
      }
    }
    // vibration fallback
    if (navigator.vibrate) navigator.vibrate(100);
  }, iv);
}

// ===== Export / Import =====
function exportData() {
  const data = JSON.stringify(state, null, 2);
  const blob = new Blob([data], {type: "application/json"});
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "halfhour-tracker-data.json";
  a.click();

  // Also generate CSV (one row per day with 48 slots + rating + moods)
  const dates = Object.keys(state.days).sort();
  const header = ["date", ...Array.from({length:48}, (_,i)=>`slot_${i}`), "rating", "moods"];
  const rows = dates.map(d => {
    const rec = state.days[d];
    return [d, ...rec.slots.map(x=>x||""), rec.rating??"", (rec.moods||"").replace(/,/g,";")];
  });
  const csv = [header.join(","), ...rows.map(r=>r.join(","))].join("\n");
  const b2 = new Blob([csv], {type:"text/csv"});
  const a2 = document.createElement("a");
  a2.href = URL.createObjectURL(b2);
  a2.download = "halfhour-tracker-export.csv";
  a2.click();
}

function importData(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const incoming = JSON.parse(reader.result);
      if (!incoming.activities || !incoming.days) throw new Error("Bad format");
      state = incoming;
      saveState(state);
      renderAll();
      alert("Import complete!");
    } catch(e) {
      alert("Import failed: " + e.message);
    }
  };
  reader.readAsText(file);
}

// ===== PWA Registration =====
if ("serviceWorker" in navigator) {
  window.addEventListener("load", ()=>{
    navigator.serviceWorker.register("./service-worker.js").catch(()=>{});
  });
}

// ===== Event Wiring & Initial Render =====
function renderAll() {
  renderLegend();
  renderQuickPicker();
  renderGrid();
  renderDayMeta();
  scheduleReminders();
}

window.addEventListener("DOMContentLoaded", ()=>{
  // Date picker defaults to today
  setDateInput(new Date());

  $("#prev-day").addEventListener("click", ()=>{
    const d = new Date($("#date-picker").value);
    d.setDate(d.getDate() - 1);
    setDateInput(d); renderAll();
  });
  $("#next-day").addEventListener("click", ()=>{
    const d = new Date($("#date-picker").value);
    d.setDate(d.getDate() + 1);
    setDateInput(d); renderAll();
  });
  $("#date-picker").addEventListener("change", renderAll);

  $("#open-activities").addEventListener("click", openActivities);
  $("#save-activity").addEventListener("click", saveActivityFromForm);

  $("#open-stats").addEventListener("click", openStats);
  $("#refresh-stats").addEventListener("click", refreshStats);

  $("#open-reminders").addEventListener("click", ()=>$("#reminders-modal").showModal());
  $("#apply-reminders").addEventListener("click", ()=>{
    state.reminders.enabled = $("#reminders-enabled").checked;
    state.reminders.intervalMin = Number($("#reminder-interval").value || 30);
    saveState(state); scheduleReminders();
    $("#reminders-modal").close();
  });

  $("#export-data").addEventListener("click", exportData);
  $("#import-data").addEventListener("change", (e)=>{
    const file = e.target.files?.[0];
    if (file) importData(file);
    e.target.value = "";
  });

  $("#reset-day").addEventListener("click", ()=>{
    if (confirm("Clear all slots, rating, and moods for this day?")) {
      const dateStr = $("#date-picker").value;
      state.days[dateStr] = { slots: Array(48).fill(null), rating: null, moods: "" };
      saveState(state); renderAll();
    }
  });

  $("#day-rating").addEventListener("change", ()=>{
    const dateStr = $("#date-picker").value;
    const rec = getDayRec(dateStr);
    const val = Number($("#day-rating").value);
    rec.rating = isNaN(val) ? null : val;
    saveState(state);
  });

  $("#mood-tags").addEventListener("change", ()=>{
    const dateStr = $("#date-picker").value;
    const rec = getDayRec(dateStr);
    rec.moods = $("#mood-tags").value.trim();
    saveState(state);
  });

  $("#help-btn").addEventListener("click", ()=>$("#help-modal").showModal());

  renderAll();
});
