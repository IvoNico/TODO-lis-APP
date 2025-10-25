<script>
// === Todo V3: memoria por día + arrastre real + pendientes arriba + sync hacia futuro + felicidades ===

const $ = (q,ctx=document)=>ctx.querySelector(q);
const btnSend=$('#enter'), inputTarea=$('#input'), listaTareas=$('#lista');
const fechaLabel=$('#fecha'), datePicker=$('#datePicker');
const prevDayBtn=$('#prevDay'), nextDayBtn=$('#nextDay');
const progressBar=$('#progressBar'), progressText=$('#progressText');

// ------- Fechas / util -------
const pad=n=>String(n).padStart(2,'0');
const keyFromDate=d=>`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
const dateFromKey=k=>{const [y,m,d]=k.split('-').map(Number);return new Date(y,m-1,d)};
const newId=()=> (crypto?.randomUUID?crypto.randomUUID():`${Date.now().toString(36)}${Math.random().toString(36).slice(2,8)}`);
const escapeHtml=s=>s.replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));

// ------- Storage -------
const STORAGE_KEY='TODO_BY_DATE_V3';
const META_KEY='TODO_META_V1'; // para “felicidades”
let STATE=JSON.parse(localStorage.getItem(STORAGE_KEY)||'{}');
let META = JSON.parse(localStorage.getItem(META_KEY)||'{}');

function saveState(){ localStorage.setItem(STORAGE_KEY, JSON.stringify(STATE)); }
function saveMeta(){ localStorage.setItem(META_KEY, JSON.stringify(META)); }

// Migración opcional desde V2
(function migrateFromV2(){
  const V2=localStorage.getItem('TODO_BY_DATE_V2'); if(!V2) return;
  try{
    const old=JSON.parse(V2);
    Object.keys(old||{}).forEach(k=>{
      const arr=Array.isArray(old[k])?old[k]:[];
      const mapped=arr.map(x=>{
        const id=(x.id?.toString())||newId();
        return {id,origin:x.origin||id,nombre:x.nombre??'Tarea',realizado:!!x.realizado,eliminado:!!x.eliminado,createdAt:x.createdAt||Date.now()};
      });
      STATE[k]=Array.isArray(STATE[k])?[...STATE[k],...mapped]:mapped;
    });
    saveState(); localStorage.removeItem('TODO_BY_DATE_V2');
  }catch{}
})();

// ------- Estado inicial -------
let CURRENT_KEY=keyFromDate(new Date());
datePicker.value=CURRENT_KEY;
updateFechaLabel();

let list=ensureList();
ensureCarryForwardFor(CURRENT_KEY); // trae pendientes previas y limpia inconsistencias
render();

// ------- Core -------
function ensureList(){
  if(!Array.isArray(STATE[CURRENT_KEY])) STATE[CURRENT_KEY]=[];
  STATE[CURRENT_KEY]=STATE[CURRENT_KEY].map(t=>({...t,origin:t.origin||t.id,createdAt:t.createdAt||Date.now()}));
  return STATE[CURRENT_KEY];
}
function updateFechaLabel(){
  const d=dateFromKey(CURRENT_KEY);
  const lbl=d.toLocaleDateString('es-ES',{weekday:'long',month:'short',day:'numeric'});
  fechaLabel.textContent=lbl.charAt(0).toUpperCase()+lbl.slice(1);
}

// ---------- Arrastre + Sincronización ----------
/**
 * 1) Calcula el último estado por origin antes de currKey.
 * 2) En el día currKey:
 *    - Si ya hay una tarea pero el último estado previo está HECHO o ELIMINADO -> la eliminamos en currKey.
 *    - Si falta una tarea cuyo último estado previo está PENDIENTE -> la añadimos.
 */
function ensureCarryForwardFor(currKey){
  const prevKeys=Object.keys(STATE).filter(k=>k<currKey).sort();
  if(prevKeys.length===0){ return; }

  // Normaliza previos
  prevKeys.forEach(k=>{
    if(Array.isArray(STATE[k])){
      STATE[k]=STATE[k].map(t=>({...t,origin:t.origin||t.id,createdAt:t.createdAt||Date.now()}));
    }
  });

  // Último estado por origin
  const latestByOrigin=new Map();
  prevKeys.forEach(k=>{
    (STATE[k]||[]).forEach(t=>{
      latestByOrigin.set(t.origin,{...t,_date:k});
    });
  });

  list=ensureList();
  let changed=false;

  // (A) Limpia tareas del día actual que no deberían existir (ya hechas/eliminadas en el histórico más reciente)
  list.forEach(t=>{
    const prev=latestByOrigin.get(t.origin);
    if(!prev) return;
    if((prev.realizado || prev.eliminado) && !t.eliminado){
      t.eliminado=true; changed=true;
    }
  });

  // (B) Agrega pendientes que faltan
  const existingOrigins=new Set(list.filter(t=>!t.eliminado).map(t=>t.origin));
  latestByOrigin.forEach((t,origin)=>{
    if(t.eliminado || t.realizado) return;
    if(existingOrigins.has(origin)) return;
    list.push({id:newId(),origin,nombre:t.nombre,realizado:false,eliminado:false,createdAt:Date.now()});
    changed=true;
  });

  if(changed) saveState();
}

/** Cuando marcas HECHA en un día, elimina copias en fechas > CURRENT_KEY para que no reaparezcan */
function propagateCompletionForward(origin){
  const futureKeys=Object.keys(STATE).filter(k=>k>CURRENT_KEY);
  let touched=false;
  futureKeys.forEach(k=>{
    if(!Array.isArray(STATE[k])) return;
    STATE[k].forEach(t=>{
      if((t.origin||t.id)===origin && !t.eliminado){
        t.eliminado=true; touched=true;
      }
    });
  });
  if(touched) saveState();
}

// ---------- Render ----------
function getVisibleTasksSorted(){
  const visible=list.filter(t=>!t.eliminado);
  return visible.sort((a,b)=>{
    const byDone=Number(a.realizado)-Number(b.realizado); // pendientes primero
    if(byDone!==0) return byDone;
    return (a.createdAt||0)-(b.createdAt||0);
  });
}
function agregarTarea(tarea,id,realizado){
  const LINE=realizado?'line-through':'', DONE=realizado?'done':'';
  listaTareas.insertAdjacentHTML('beforeend',`
    <li class="${DONE}" data-id="${id}">
      <button class="check" data-action="toggle" data-id="${id}" aria-label="Completar"></button>
      <p class="text ${LINE}">${escapeHtml(tarea)}</p>
      <button class="delete" data-action="delete" data-id="${id}" aria-label="Eliminar"></button>
    </li>`);
}
function render(){
  listaTareas.innerHTML='';
  getVisibleTasksSorted().forEach(t=>agregarTarea(t.nombre,t.id,t.realizado));
  updateProgress();
}

function updateProgress(){
  const total=list.filter(t=>!t.eliminado).length;
  const done =list.filter(t=>!t.eliminado && t.realizado).length;
  const pct  =total?Math.round(done/total*100):0;
  progressBar.style.width=`${pct}%`;
  progressText.textContent=`${pct}% • ${done}/${total}`;
  maybeCelebrate(pct,total);
}

// ---------- Felicitación ----------
function ensureCongratsUI(){
  if($('#congratsOverlay')) return;
  const el=document.createElement('div');
  el.id='congratsOverlay';
  el.className='congrats-overlay';
  el.innerHTML=`
    <div class="congrats-card" role="dialog" aria-labelledby="congratsTitle" aria-modal="true">
      <h2 id="congratsTitle">¡Felicidades! 🎉</h2>
      <p>Terminaste las tareas del día. Ahora ve a desconectar tu mente.</p>
      <button id="congratsClose" class="congrats-btn" type="button">Cerrar</button>
    </div>`;
  document.body.appendChild(el);
  $('#congratsClose').addEventListener('click',()=>{ el.classList.remove('show'); setTimeout(()=>el.remove(),150); });
}
function maybeCelebrate(pct,total){
  if(pct===100 && total>0){
    if(!(META[CURRENT_KEY]?.congratsShown)){
      ensureCongratsUI();
      META[CURRENT_KEY]={...(META[CURRENT_KEY]||{}),congratsShown:true};
      saveMeta();
      requestAnimationFrame(()=>{ $('#congratsOverlay').classList.add('show'); });
    }
  }
}

// ---------- CRUD ----------
function addFromInput(){
  const tarea=inputTarea.value.trim(); if(!tarea) return;
  const id=newId();
  list.push({id,origin:id,nombre:tarea,realizado:false,eliminado:false,createdAt:Date.now()});
  inputTarea.value='';
  saveState(); render();
}
function toggleTask(id){
  const i=list.findIndex(t=>t.id===id); if(i<0) return;
  const wasDone=list[i].realizado;
  list[i].realizado=!list[i].realizado;
  saveState();

  // Si pasó a HECHA, borrar copias en el futuro
  if(!wasDone && list[i].realizado){
    propagateCompletionForward(list[i].origin);
  }
  render();
}
function deleteTask(id){
  const i=list.findIndex(t=>t.id===id); if(i<0) return;
  const origin=list[i].origin;
  list[i].eliminado=true;
  saveState();
  // También limpiamos copias futuras si existen
  propagateCompletionForward(origin);
  render();
}

// ---------- Eventos ----------
btnSend.addEventListener('click', addFromInput);
inputTarea.addEventListener('keyup', e=>{ if(e.key==='Enter') addFromInput(); });
listaTareas.addEventListener('click', e=>{
  const btn=e.target.closest('[data-action]'); if(!btn) return;
  const {action,id}=btn.dataset;
  if(action==='toggle') toggleTask(id);
  if(action==='delete') deleteTask(id);
});

// Cambio de día: siempre sincronizar arrastre y limpieza
function goTo(key){
  CURRENT_KEY=key;
  datePicker.value=CURRENT_KEY;
  list=ensureList();
  ensureCarryForwardFor(CURRENT_KEY);
  updateFechaLabel();
  render();
}

datePicker.addEventListener('change', ()=> goTo(datePicker.value));
prevDayBtn.addEventListener('click', ()=>{ const d=dateFromKey(CURRENT_KEY); d.setDate(d.getDate()-1); goTo(keyFromDate(d)); });
nextDayBtn.addEventListener('click', ()=>{ const d=dateFromKey(CURRENT_KEY); d.setDate(d.getDate()+1); goTo(keyFromDate(d)); });
</script>

