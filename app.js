document.addEventListener('DOMContentLoaded',()=>{
  console.log('Fairy Pixel Tracker ready');
  const today=new Date();
  document.getElementById('today-label').textContent=today.toDateString();
  const grid=document.getElementById('grid');
  for(let i=0;i<48;i++){const time=document.createElement('div');time.className='time-cell';
    const h=Math.floor(i/2), m=i%2?'30':'00';time.textContent=`${h.toString().padStart(2,'0')}:${m}`;
    const slot=document.createElement('div');slot.className='slot-cell';
    grid.appendChild(time);grid.appendChild(slot);}
});