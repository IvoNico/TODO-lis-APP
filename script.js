// === Todo con memoria por día + progreso + arrastre automático + pendientes arriba ===

// Selectores base
const btnSend       = document.querySelector('#enter');
const inputTarea    = document.querySelector('#input');
const listaTareas   = document.querySelector('#lista');
const fechaLabel    = document.querySelector('#fecha');
const datePicker    = document.querySelector('#datePicker');
const prevDayBtn    = document.querySelector('#prevDay');
const nextDayBtn    = document.querySelector('#nextDay');
const progressBar   = document.querySelector('#progressBar');
const progressText  = document.querySelector('#progressText');

// Utilidades de fecha
const pad = (n) => String(n).padStart(2,'0');
const keyFromDate = (d) => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
const dateFromKey = (k) => { const [y,m,d] = k.split('-').map(Number); return new Date(y, m-1, d); };

// Storage
const STORAGE_KEY = 'TODO_BY_DATE_V3'; // <- usa SIEMPRE V3
let STATE = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
migrateFromV2(); // por si tenías V2

let CURRENT_KEY = keyFromDate(new Date());
datePicker.value = CURRENT_KEY;
updateFechaLabel();

let list = ensureList();

// Cargar pendientes de días anteriores al día actual
ensureCarryForwardFor(CURRENT_KEY);
render();

// ============ Helpers ============
const newId = () => (crypto?.randomUUID ? crypto.randomUUID() :
                     `${Date.now().toString(36)}${Math.random().toString(36).slice(2,8)}`);

function ensureList(){
  if(!Array.isArray(STATE[CURRENT_KEY])) STATE[CURRENT_KEY] = [];
  // Asegura "origin" y "createdAt" en tareas viejas
  STATE[CURRENT_KEY] = STATE[CURRENT_KEY].map(t => ({
    ...t,
    origin: t.origin || t.id,
    createdAt: t.createdAt || Date.now()
  }));
  return STATE[CURRENT_KEY];
}
function save(){
  STATE[CURRENT_KEY] = list;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(STATE));
}
function updateFechaLabel(){
  const d = dateFromKey(CURRENT_KEY);
  const lbl = d.toLocaleDateString('es-ES', { weekday:'long', month:'short', day:'numeric' });
  fechaLabel.textContent = lbl.charAt(0).toUpperCase() + lbl.slice(1);
}
function escapeHtml(str){
  return str.replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
}

// ============ Carry-forward ============
/**
 * Trae al día currKey todas las tareas cuyo último estado (en cualquier día < currKey)
 * esté PENDIENTE (no realizado y no eliminado). Evita duplicados por "origin".
 */
function ensureCarryForwardFor(currKey){
  const keys = Object.keys(STATE).filter(k => k < currKey).sort();
  if(keys.length === 0) return;

  // Normaliza origin/createdAt en días pasados
  keys.forEach(k => {
    if(Array.isArray(STATE[k])){
      STATE[k] = STATE[k].map(t => ({ ...t, origin: t.origin || t.id, createdAt: t.createdAt || Date.now() }));
    }
  });

  // Último estado por origin
  const latestByOrigin = new Map();
  keys.forEach(k => {
    (STATE[k] || []).forEach(t => {
      latestByOrigin.set(t.origin, { ...t, _date:k });
    });
  });

  list = ensureList();
  const existingOrigins = new Set(list.filter(t => !t.eliminado).map(t => t.origin));

  let added = 0;
  latestByOrigin.forEach((t, origin) => {
    if(t.eliminado) return;
    if(t.realizado) return;          // solo arrastramos pendientes
    if(existingOrigins.has(origin)) return; // ya está en el día actual
    list.push({
      id: newId(),
      origin,
      nombre: t.nombre,
      realizado: false,
      eliminado: false,
      createdAt: Date.now()
    });
    added++;
  });

  if(added) save();
}

// ============ Render ============
function agregarTarea(tarea, id, realizado){
  const LINE = realizado ? 'line-through' : '';
  const DONE = realizado ? 'done' : '';
  const item = `
    <li class="${DONE}" data-id="${id}">
      <button class="check"  data-action="toggle" data-id="${id}" aria-label="Completar"></button>
      <p class="text ${LINE}">${escapeHtml(tarea)}</p>
      <button class="delete" data-action="delete" data-id="${id}" aria-label="Eliminar"></button>
    </li>`;
  listaTareas.insertAdjacentHTML('beforeend', item);
}

/* Orden: pendientes arriba, hechas abajo; dentro de cada bloque por createdAt asc */
function getVisibleTasksSorted(){
  const visible = list.filter(t => !t.eliminado);
  return visible.sort((a,b) => {
    const byDone = Number(a.realizado) - Number(b.realizado);
    if(byDone !== 0) return byDone; // false(0) primero
    return (a.createdAt||0) - (b.createdAt||0);
  });
}

function render(){
  listaTareas.innerHTML = '';
  getVisibleTasksSorted().forEach(t => agregarTarea(t.nombre, t.id, t.realizado));
  updateProgress();
}

function updateProgress(){
  const total = list.filter(t => !t.eliminado).length;
  const done  = list.filter(t => !t.eliminado && t.realizado).length;
  const pct   = total ? Math.round((done / total) * 100) : 0;
  progressBar.style.width = `${pct}%`;
  progressText.textContent = `${pct}% • ${done}/${total}`;
}

// ============ CRUD ============
function addFromInput(){
  const tarea = inputTarea.value.trim();
  if(!tarea) return;

  const id = newId();
  const task = { id, origin:id, nombre: tarea, realizado: false, eliminado: false, createdAt: Date.now() };
  list.push(task);
  inputTarea.value = '';
  save();
  render(); // re-render para respetar el orden (pendientes arriba)
}

function toggleTask(id){
  const idx = list.findIndex(t => t.id === id);
  if(idx === -1) return;
  list[idx].realizado = !list[idx].realizado;
  save();
  render(); // re-render para que, si pasa a done, baje de sección
}

function deleteTask(id){
  const idx = list.findIndex(t => t.id === id);
  if(idx === -1) return;
  list[idx].eliminado = true;
  save();
  render();
}

// ============ Eventos ============
btnSend.addEventListener('click', addFromInput);
inputTarea.addEventListener('keyup', (e) => { if(e.key === 'Enter') addFromInput(); });

listaTareas.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-action]');
  if(!btn) return;
  const id = btn.dataset.id;
  const action = btn.dataset.action;
  if(action === 'toggle') toggleTask(id);
  if(action === 'delete') deleteTask(id);
});

// Cambio de día: siempre aplicar arrastre al entrar
datePicker.addEventListener('change', () => {
  CURRENT_KEY = datePicker.value;
  list = ensureList();
  ensureCarryForwardFor(CURRENT_KEY);
  updateFechaLabel();
  render();
});
prevDayBtn.addEventListener('click', () => {
  const d = dateFromKey(CURRENT_KEY); d.setDate(d.getDate() - 1);
  CURRENT_KEY = keyFromDate(d);
  datePicker.value = CURRENT_KEY;
  list = ensureList();
  ensureCarryForwardFor(CURRENT_KEY);
  updateFechaLabel();
  render();
});
nextDayBtn.addEventListener('click', () => {
  const d = dateFromKey(CURRENT_KEY); d.setDate(d.getDate() + 1);
  CURRENT_KEY = keyFromDate(d);
  datePicker.value = CURRENT_KEY;
  list = ensureList();
  ensureCarryForwardFor(CURRENT_KEY);
  updateFechaLabel();
  render();
});

// ============ Migración desde V2 ============
function migrateFromV2(){
  const V2 = localStorage.getItem('TODO_BY_DATE_V2');
  if(!V2) return;
  try{
    const old = JSON.parse(V2);
    if(old && typeof old === 'object'){
      // Copiamos todo manteniendo fechas
      Object.keys(old).forEach(k => {
        const arr = Array.isArray(old[k]) ? old[k] : [];
        const dest = Array.isArray(STATE[k]) ? STATE[k] : [];
        const mapped = arr.map(x => {
          const id = (x.id?.toString()) || newId();
          return {
            id,
            origin: x.origin || id,
            nombre: x.nombre ?? 'Tarea',
            realizado: !!x.realizado,
            eliminado: !!x.eliminado,
            createdAt: x.createdAt || Date.now()
          };
        });
        STATE[k] = [...dest, ...mapped];
      });
      localStorage.setItem(STORAGE_KEY, JSON.stringify(STATE));
      localStorage.removeItem('TODO_BY_DATE_V2');
    }
  }catch(e){/* ignore */}
}
