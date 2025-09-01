// app.js (top or DOMContentLoaded)
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("./service-worker.js?v=7");
}
document.addEventListener('DOMContentLoaded', ()=>{
  // Display today's date
  const today = new Date();
  document.getElementById('date-label').textContent = today.toLocaleDateString(undefined, { 
    year:'numeric', month:'long', day:'numeric' 
  });

  const timeCol = document.getElementById('time-col');
  const actCol = document.getElementById('act-col');

  for (let i=0; i<48; i++) {
    const tcell = document.createElement('div');
    tcell.className = 'slot-cell';
    timeCol.appendChild(tcell);

    const acell = document.createElement('div');
    acell.className = 'slot-cell';
    acell.dataset.idx = i;
    acell.addEventListener('click', ()=>{
      // Toggle a demo color for now
      if (acell.style.backgroundColor) {
        acell.style.backgroundColor = '';
      } else {
        acell.style.backgroundColor = '#ff7bd3';
      }
    });
    actCol.appendChild(acell);
  }
});
