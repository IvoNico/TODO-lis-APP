// === Todo con memoria por día + progreso + arrastre automático ===

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

// IDs
const newId = () => (crypto?.randomUUID ? crypto.randomUUID()
                 : `${Date.now().toString(36)}${Math.random().toString(36).slice(2,8)}`);

// Almacenamiento por día
const STORAGE_KEY = 'TODO_BY_DATE_V3';
let STATE = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
let CURRENT_KEY = keyFromDate(new Date());

// Inicializa datePicker y cabecera
datePicker.value = CURRENT_KEY;
updateFechaLabel();

// Lista activa del día
let list = ensureList();

// ---- Arrastre automático: crear en el día actual todas las tareas no realizadas de días anteriores (una copia por día, sin duplicados) ----
ensureCarryForwardFor(CURRENT_KEY);
render();

// ================== Funciones ==================
function ensureList(){
  if(!Array.isArray(STATE[CURRENT_KEY])) STATE[CURRENT_KEY] = [];
  // Backfill: asegura origin en tareas antiguas
  STATE[CURRENT_KEY] = STATE[CURRENT_KEY].map(t => ({ ...t, origin: t.origin || t.id }));
  return STATE[CURRENT_KEY];
}

function save(){
  STATE[CURRENT_KEY] = list;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(STATE));
}

function updateFechaLabel(){
  const d = dateFromKey(CURRENT_KEY);
  // Capitaliza el primer carácter (p.ej., "Sábado")
  const label = d.toLocaleDateString('es-ES', { weekday:'long', month:'short', day:'numeric' });
  fechaLabel.textContent = label.charAt(0).toUpperCase() + label.slice(1);
}

function escapeHtml(str){
  return str.replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
}

// Renderiza una tarea (no elimina al completar)
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

function render(){
  listaTareas.innerHTML = '';
  list.filter(t => !t.eliminado).forEach(t => {
    agregarTarea(t.nombre, t.id, t.realizado);
  });
  updateProgress();
}

function updateProgress(){
  const total = list.filter(t => !t.eliminado).length;
  const done  = list.filter(t => !t.eliminado && t.realizado).length;
  const pct   = total ? Math.round((done / total) * 100) : 0;
  progressBar.style.width = `${pct}%`;
  progressText.textContent = `${pct}% • ${done}/${total}`;
}

function addFromInput(){
  const tarea = inputTarea.value.trim();
  if(!tarea) return;

  const id = newId();
  const task = { id, origin:id, nombre: tarea, realizado: false, eliminado: false, createdAt: Date.now() };
  list.push(task);
  agregarTarea(task.nombre, task.id, task.realizado);
  inputTarea.value = '';
  save();
  updateProgress();
}

function toggleTask(id){
  const idx = list.findIndex(t => t.id === id);
  if(idx === -1) return;
  list[idx].realizado = !list[idx].realizado;

  const li = listaTareas.querySelector(`li[data-id="${id}"]`);
  if(!li) return;
  li.classList.toggle('done', list[idx].realizado);
  li.querySelector('.text').classList.toggle('line-through', list[idx].realizado);

  save();
  updateProgress();
}

function deleteTask(id){
  const idx = list.findIndex(t => t.id === id);
  if(idx === -1) return;
  list[idx].eliminado = true;

  const li = listaTareas.querySelector(`li[data-id="${id}"]`);
  if(li){
    li.classList.add('remove');
    li.addEventListener('animationend', () => {
      li.remove();
      updateProgress();
    }, { once:true });
  }
  save();
}

/**
 * Arrastre automático a CURRENT_KEY:
 * - Mira todos los días anteriores a CURRENT_KEY (ordenados).
 * - Para cada "origin" toma el estado más reciente (último día previo).
 * - Si ese estado está pendiente (no realizado, no eliminado), crea una copia en CURRENT_KEY
 *   salvo que ya exista en CURRENT_KEY una tarea con ese origin.
 */
function ensureCarryForwardFor(currKey){
  const keys = Object.keys(STATE).filter(k => k < currKey).sort(); // YYYY-MM-DD ordena bien
  if(keys.length === 0) return;

  // Backfill de origen en todos los días por si faltara
  keys.forEach(k => {
    if(!Array.isArray(STATE[k])) return;
    STATE[k] = STATE[k].map(t => ({ ...t, origin: t.origin || t.id }));
  });

  // Último estado por origin antes de currKey
  const latestByOrigin = new Map();
  keys.forEach(k => {
    const arr = STATE[k];
    if(!Array.isArray(arr)) return;
    arr.forEach(t => {
      latestByOrigin.set(t.origin, { ...t, _date:k });
    });
  });

  // Asegura lista del día actual y set de origins ya presentes
  list = ensureList();
  const existingOrigins = new Set(list.filter(t => !t.eliminado).map(t => t.origin || t.id));

  let added = 0;
  latestByOrigin.forEach((t, origin) => {
    if(t.eliminado) return;
    if(t.realizado) return;
    if(existingOrigins.has(origin)) return; // ya está en el día
    const copy = { id:newId(), origin, nombre:t.nombre, realizado:false, eliminado:false, createdAt:Date.now() };
    list.push(copy);
    added++;
  });

  if(added) save();
}

// ================== Eventos ==================
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

// Navegación por días (aplica arrastre al entrar a cada fecha)
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

// ================== Migración opcional del localStorage viejo ==================
(function migrateOld(){
  const legacy = localStorage.getItem('TODO');
  if(!legacy) return;
  try {
    const arr = JSON.parse(legacy);
    if(Array.isArray(arr)){
      const today = keyFromDate(new Date());
      if(!Array.isArray(STATE[today])) STATE[today] = [];
      STATE[today].push(...arr.map(x => {
        const id = (x.id?.toString()) || `${Date.now()}-${Math.random().toString(36).slice(2,7)}`;
        return {
          id, origin:id,
          nombre: x.nombre ?? 'Tarea',
          realizado: !!x.realizado,
          eliminado: !!x.eliminado,
          createdAt: Date.now()
        };
      }));
      localStorage.removeItem('TODO');
      localStorage.setItem(STORAGE_KEY, JSON.stringify(STATE));
      if(CURRENT_KEY === today){ list = STATE[today]; ensureCarryForwardFor(CURRENT_KEY); render(); }
    }
  } catch(e) { /* ignore */ }
})();
