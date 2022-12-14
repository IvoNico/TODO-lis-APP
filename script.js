//info date

const btnSend = document.querySelector('#enter')
const inputTarea = document.querySelector('#input')
const listaTareas = document.querySelector('#lista')
const fecha = document.querySelector('#fecha')
const check = 'fa-check-circle'
const uncheck = 'fa-circle'
const lineThrough = 'line-through'
let id 
let list 
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
    localStorage.setItem('TODO', JSON.stringify(list))
    inputTarea.value = ''
    id++
})

document.addEventListener('keyup', function(event){ //se utiliza para activar la funcion ENTER para enviar la informaci??n
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
        localStorage.setItem('TODO', JSON.stringify(list))
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
    localStorage.setItem('TODO', JSON.stringify(list)) //cada ves que se actualice la informacion la vamos a guardar en el localStorage
})

//Local storage getItem

let data = localStorage.getItem('TODO')
if(data){
    list = JSON.parse(data)
    id = list.lenght
    cargarLista(list)
}else{
    list=[]
    id=0
}

function cargarLista(DATA) {
    DATA.forEach(function(i){
        agregarTarea(i.nombre,i.id,i.realizado,i.eliminado)
    });
}