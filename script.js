//info date

const btnSend = document.querySelector('#enter')
const inputTarea = document.querySelector('#input')
const listaTareas = document.querySelector('#lista')
const fecha = document.querySelector('#fecha')
const check = 'fa-check-circle'
const uncheck = 'fa-circle'
const lineThrough = 'line-through'
let id = 0
const list = []


// fecha

const date = new Date();
fecha.innerHTML = date.toLocaleDateString('es-ES', {weekday:'long',month:'short', day:'numeric'})

//funcion agregar tarea

function agregarTarea (tarea, id, realizado, eliminado){
    if(eliminado){
        return
    }

    const REALIZADO = realizado ? check : uncheck
    const LINE = realizado ? lineThrough : ''

    const elemento =  `
        <li id="elemento">
            <span class="${REALIZADO}" data="realizado" id="${id}">O</span>
            <p class="text ${LINE}"> ${tarea} </p>
            <span  data="eliminado" id="${id}">X</span>
        </li>`
    
    listaTareas.insertAdjacentHTML("afterbegin", elemento) //indicamos que inserte el elemento html
}

//funcion tarea realizada

function tareaRealizada(element){
    element.classList.toggle(check) //indicamos con toggle que coloque la clase que no este activa
    element.classList.toggle(uncheck)
    element.parentNode.querySelector('.text').classList.toggle(lineThrough) //parentNode identifica los elementos hijos
    list[element.id].realizado = list[element.id].realizado ? false : true
}

//funcion eliminar tarea

function tareaEliminada(element){
    element.parentNode.parentNode.removeChild(element.parentNode) //indicamos que elimine el elemento hijo en este caso el LI.
    list[element.id].eliminado = true
}

btnSend.addEventListener('click', ()=>{
    const tarea = inputTarea.value 
    if(tarea){
        agregarTarea(tarea, id, false, false)
        list.push({
            nombre: tarea,
            id: id,
            realizado: false,
            eliminado: false

        })
    }
    inputTarea.value = ''
    id++
})

document.addEventListener('keyup', function(event){ //se utiliza para activar la funcion ENTER para enviar la información
    if(event.key=='Enter'){
        const tarea = inputTarea.value
        if(tarea){
            agregarTarea(tarea, id, false, false)
            list.push({
                nombre: tarea,
                id: id,
                realizado: false,
                eliminado: false
            })
        }
        inputTarea.value=''
        id++
    }
})

listaTareas.addEventListener('click', function(event){
    const element = event.target
    const elementData = element.attributes.data.value
    if(elementData === 'realizado'){
        tareaRealizada(element)
    }else if(elementData === 'eliminado'){
        tareaEliminada(element)
    }
})