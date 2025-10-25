// === Todo con memoria por día + progreso ===

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

// Almacenamiento por día
const STORAGE_KEY = 'TODO_BY_DATE_V2';
let STATE = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
let CURRENT_KEY = keyFromDate(new Date());

// Inicializa datePicker y cabecera
datePicker.value = CURRENT_KEY;
updateFechaLabel();

// Lista activa del día
let list = ensureList();
render();

// ================== Funciones ==================
function ensureList(){
  if(!Array.isArray(STATE[CURRENT_KEY])) STATE[CURRENT_KEY] = [];
  return STATE[CURRENT_KEY];
}
function save(){
  STATE[CURRENT_KEY] = list;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(STATE));
}
function updateFechaLabel(){
  const d = dateFromKey(CURRENT_KEY);
  fechaLabel.textContent = d.toLocaleDateString('es-ES', { weekday:'long', month:'short', day:'numeric' });
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

  const id = (crypto.randomUUID ? crypto.randomUUID() :
             `${Date.now().toString(36)}${Math.random().toString(36).slice(2,8)}`);

  const task = { id, nombre: tarea, realizado: false, eliminado: false, createdAt: Date.now() };
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

// Navegación por días
datePicker.addEventListener('change', () => {
  CURRENT_KEY = datePicker.value;
  list = ensureList();
  updateFechaLabel();
  render();
});

prevDayBtn.addEventListener('click', () => {
  const d = dateFromKey(CURRENT_KEY); d.setDate(d.getDate() - 1);
  CURRENT_KEY = keyFromDate(d);
  datePicker.value = CURRENT_KEY;
  list = ensureList();
  updateFechaLabel();
  render();
});

nextDayBtn.addEventListener('click', () => {
  const d = dateFromKey(CURRENT_KEY); d.setDate(d.getDate() + 1);
  CURRENT_KEY = keyFromDate(d);
  datePicker.value = CURRENT_KEY;
  list = ensureList();
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
      STATE[today].push(...arr.map(x => ({
        id: (x.id?.toString()) || `${Date.now()}-${Math.random().toString(36).slice(2,7)}`,
        nombre: x.nombre ?? 'Tarea',
        realizado: !!x.realizado,
        eliminado: !!x.eliminado,
        createdAt: Date.now()
      })));
      localStorage.removeItem('TODO');
      localStorage.setItem(STORAGE_KEY, JSON.stringify(STATE));
      if(CURRENT_KEY === today){ list = STATE[today]; render(); }
    }
  } catch(e) { /* ignore */ }
})();
