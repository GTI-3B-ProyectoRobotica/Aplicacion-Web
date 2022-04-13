//===================================================================================================================================================
// nombre del archivo: main.js
// Fecha: 29/03/2022
// Descripcion: En este archivo se encuentran todas las funiones que utiliza la app del transportista: connect(),disconnect(),enviarRobotZonaRecogida().
//===================================================================================================================================================

const IP_PUERTO = "http://localhost:8080"

const IP_ROS = "ws://192.168.85.207:9090/"




var mapaCanvas = null;

 /**
     * Cancela los puntos y no guarda la zona
     */
function borrar_zona(zona){
    console.log("Borrar ----------------");
    console.log(mapaCanvas.mapa.zonas);
    let indice = mapaCanvas.mapa.zonas.indexOf(zona);
    mapaCanvas.mapa.zonas.splice(indice,1)
    console.log("Se borro el indice: ",indice);
    console.log(mapaCanvas.mapa.zonas);
    console.log("-----------------------");
    mapaCanvas.borrar_canvas()
 }


document.addEventListener('DOMContentLoaded', event => {

    document.getElementById("btn_esc").addEventListener("click", escan)
    document.getElementById("btn_get_map").addEventListener("click", btn_get_mapa)
    document.getElementById("btn_dis").addEventListener("click", disconnect)

    // añadir zonas -----------------------------------
    var btn_add_zona = document.getElementById("btn_add_zona")
    var btn_add_zona_transportista = document.getElementById("btn_add_zona_transportista")
    var btn_cancelar_add_zona = document.getElementById("btn_cancelar_add_zona")
    var bloque_guardar_zona = document.getElementById("div_guardar_zona")
    var btn_guardar_add_zona_transportista = document.getElementById("btn_guardar_add_zona_transportista")

    var tabla_zonas = document.getElementById("tabla_zonas");

    btn_add_zona.addEventListener("click", add_zona);
    btn_add_zona_transportista.addEventListener("click", add_zona_transportista);
    btn_guardar_add_zona_transportista.addEventListener("click", guardar_add_zona_transportista);
    btn_cancelar_add_zona.addEventListener("click", cancelar_add_zona);
    document.getElementById("btn_guardar_add_zona").addEventListener("click", guardar_add_zona);

    var is_add_zona_enable = false;
    var zonaACrear = [] // tendra max dos puntos

    // canvas --------------------------------------
    var canvas = document.getElementById("canvas")
    var ctx = canvas.getContext("2d");

    // ros2
    data = {
        // ros connection
        ros: null,
        rosbridge_address: IP_ROS,
        connected: false,
    }


    // ........................................................................................................................
    // ........................................................................................................................
    // ........................................................................................................................
    // Logica ROS2

    //==========================================================================================================================
    // Funcion connect()
    //==========================================================================================================================
    async function conectar(){
        data.ros = new ROSLIB.Ros({
            url: data.rosbridge_address
        })
        // Define callbacks
        data.ros.on("connection", () => {
            data.connected = true
            console.log("Conexion con ROSBridge correcta")
            mostrar("Conexion con ROSBridge correcta")
        })
        data.ros.on("error", (error) => {
            console.log("Se ha producido algun error mientras se intentaba realizar la conexion")
            console.log(error)
            mostrar(error)
        })
        data.ros.on("close", () => {
            data.connected = false
            console.log("Conexion con ROSBridge cerrada")
            mostrar("Conexion con ROSBridge cerrada")
        })
    }


    async function escan() {
        conectar()
        enviarEscanear()
    }

    //==========================================================================================================================
    // Funcion btn_get_mapa()
    //==========================================================================================================================
    async function btn_get_mapa() {

        try {

            btn_add_zona.style.display = "none"

            // obtener imagen del mapa del servidor
            let mapa = await obtenerMapa(1)

            mapaCanvas = new CanvasMapa(ctx,mapa)
            
            btn_add_zona.style.display = "block"
            btn_add_zona_transportista.style.display = "block"

            


            mapaCanvas.canvas.addEventListener("click", function (event) {
                
                // funcion on click del canvas-------------------------------------------
                if(is_add_zona_enable){

                    // obtener el punto
                    var ctx = mapaCanvas.canvas.getContext("2d");
                    ctx.beginPath();
                    pos = getMousePos(event, mapaCanvas.canvas);
                    

                    if(zonaACrear.length < 2){
                        // si hay 0 o uno hacer append del punto
                        zonaACrear.push(pos)
                        mapaCanvas.pintar_punto(pos.x,pos.y)
                    }
                    

                }
                


            },false)

        } catch (err) {
            console.log(err)
            //mostrar(err)

        }

    }

    function getMousePos(event, canvas) {
        var rect = canvas.getBoundingClientRect();
        return {
            x: Math.floor(event.clientX - rect.left),
            y: Math.floor(event.clientY - rect.top)
        };
    }
    //==========================================================================================================================
    // Funcion grabarZonas() (ROS)
    //==========================================================================================================================
    async function guardar_zona_ros2(){
        conectar()
        // transformar el mapaCanvas.zonas al formato admitido por el servidor ros2
        let zona =  "transportista:" + posicionInicial.x + "," + posicionInicial.y+ "," + posicionFinal.x + "," + posicionFinal.y
       // let zona =  "transportista:" + 3 + "," + 1 + "," + 3 + "," + 2 + ";"
        try {
            
            console.log("Enviar zonas al servicio")

            data.service_busy = true
            data.service_response = ''

            let service = new ROSLIB.Service({
                ros: data.ros,
                name: '/automatix_guardar_zona',
                serviceType: 'automatix_custom_interface/srv/GuardarZona'
            })
            let request = new ROSLIB.ServiceRequest({
                zonas: zona
            })

            service.callService(request, (result) => {
                data.service_busy = false
                data.service_response = JSON.stringify(result)
                actualizar_fichero_servicio_ir_zona()
                mostrar(JSON.stringify(result))
            }, (error) => {
                data.service_busy = false
                console.error(error)
                mostrar(error)
            })
        } catch (error) {
            mostrar(error)
        }

    }
    
    
    //==========================================================================================================================
    // Funcion cambio_base_punto() 
    //==========================================================================================================================

    /**
     * Cambiar base del punto de pixeles a puntos del ros2
     * @param {x:N,y:N} punto punto a cambiar de base
     * @returns {x:N,y:N}
     */
    function cambio_base_punto(punto){
        
        let y = mapaCanvas.altura - punto.y // girar la y porque el robot lo interpreta al reves, el origen de cordenadas esta arriba
                                            // en el mapa esta abajo
        return {
            x: punto.x*mapa.resolucion*mapa.maxMapaX/maxXCanvas,
            y: y*mapa.resolucion*mapa.maxMapaY/maxYCanvas,
            
        }
    }

    //==========================================================================================================================
    // Funcion actualizar_fichero_servicio_ir_zona() (ROS)
    //==========================================================================================================================

    async function actualizar_fichero_servicio_ir_zona(){
        try {

            data.service_busy = true
            data.service_response = ''

            let service = new ROSLIB.Service({
                ros: data.ros,
                name: '/IrZona',
                serviceType: 'automatix_custom_interface/srv/IrZona'
            })
            let request = new ROSLIB.ServiceRequest({
                zona: "zonas_added"
            })

            service.callService(request, (result) => {
                data.service_busy = false
                data.service_response = JSON.stringify(result)
                
                mostrar(JSON.stringify(result))
            }, (error) => {
                data.service_busy = false
                console.error(error)
                mostrar(error)
            })
        } catch (error) {
            mostrar(error)
        }


    }
    //==========================================================================================================================
    // Funcion escanear() (ROS)
    //==========================================================================================================================

    async function enviarEscanear() {
        try {
            console.log("Clic en enviarRobotEscanear")

            data.service_busy = true
            data.service_response = ''

            //definimos los datos del servicio
            let service = new ROSLIB.Service({
                ros: data.ros,
                name: '/escaneo_autonomo',
                serviceType: 'custom_interface/srv/EscanearMsg'
            })

            let request = new ROSLIB.ServiceRequest({
                escanear: "escanear"
            })

            service.callService(request, (result) => {
                data.service_busy = false
                data.service_response = JSON.stringify(result)
                mostrar(JSON.stringify(result))
            }, (error) => {
                data.service_busy = false
                console.error(error)
                mostrar(error)
            })
        } catch (error) {
            mostrar(error)
        }
    }
    //==========================================================================================================================
    // Funcion disconnect()
    //==========================================================================================================================
    function disconnect() {
        data.ros.close()
        data.connected = false
        console.log('Clic en botón de desconexión')
        mostrar('Clic en botón de desconexión')
    }

    // ........................................................................................................................
    // ........................................................................................................................
    // ........................................................................................................................
    // Logica API REST
    //==========================================================================================================================
    // Funcion obtenerMapa()
    //==========================================================================================================================
    // idMapa:N   ------>
    // mapa:Mapa; <---- obtenerMapa() 
    /**
     * @param idMapa id del mapa del cual se obtienen la zona
     * @returns Mapa
     */
    async function obtenerMapa(idMapa) {
        console.log("El codigo llego a obtenerMapa")
        // peticion api
        let respuesta = await fetch(IP_PUERTO + "/mapa?idMapa=" + idMapa, {
            headers: { 'User-Agent': 'Automatix', 'Content-Type': 'application/json' },
        }).then(response => {
            if (response.status == 204) {
                //ok pero vacío
                return {};
            } else if (response.status == 200) {
                // ok con contenido 
                return response.json();
            } else {

                // error
                throw Error("Error en obtenerMapa(): " + response.toString())
            }
        }).then(mapaJson => {
            return Mapa.MapaFromJson(mapaJson);
        }) //then
        return respuesta
    }



    // ........................................................................................................................
    // ........................................................................................................................
    // ........................................................................................................................
    // Logica VIEW
    //==========================================================================================================================
    // Funcion mostrar()
    //==========================================================================================================================  
    function mostrar(texto) {
        document.getElementById("consola").innerHTML = texto;
    }

    //==========================================================================================================================
    // ZONA añadir zonas en el canvas
    //==========================================================================================================================  
    
    /**
     * Habilita los botones de guardar zona con el input para el nombre
     */
    function add_zona(){
        is_add_zona_enable = true;
        btn_add_zona.style.display = "none"
        btn_add_zona_transportista.style.display = "none"
        btn_cancelar_add_zona.style.display = "block"
        bloque_guardar_zona.style.display = "block"
    }   
    /**
     * Comprueba que hay dos puntos pulsados en el mapa y un nombre que no sea "transportista"
     */
    function guardar_add_zona(){
        let nombre = document.getElementById("input_nombre_guardar_zona").value
        if(nombre.trim().length > 0 && zonaACrear.length==2 && nombre.trim() != "transportista"){
            mapaCanvas.mapa.zonas.push(new Zona(nombre, zonaACrear[0].x,zonaACrear[0].y,zonaACrear[1].x,zonaACrear[1].y))
            mapaCanvas.borrar_canvas()
            guardar_zona_ros2()
            cancelar_add_zona()
        }else{
            mostrar("Para crear una zona deben haber dos puntos y un nombre")
        }
        
    }
    /**
     * Habiltia los botones para guardar una zona transportista
     * si no existe una zona transportista ya creada
     */
    function add_zona_transportista(){
        if(!mapaCanvas.mapa.hasZonaTransportista()){
            is_add_zona_enable = true;
            btn_add_zona.style.display = "none"
            btn_add_zona_transportista.style.display = "none"
            btn_guardar_add_zona_transportista.style.display = "block"
            btn_cancelar_add_zona.style.display = "block"
        }else{
            mostrar("Ya existe una zona de llegada de paquetes, borrala y crea una nueva si quieres modificarla")
        }
        
    }
    /**
     * Comprueba que hay dos puntos pulsados en el mapa, guarda esa zona con el nombre de "transportista"
     */
    function guardar_add_zona_transportista(){
        if(zonaACrear.length==2){
            mapaCanvas.mapa.zonas.push(new Zona("transportista", zonaACrear[0].x,zonaACrear[0].y,zonaACrear[1].x,zonaACrear[1].y))
            mapaCanvas.borrar_canvas()
            guardar_zona_ros2()
            cancelar_add_zona()
        }else{
            mostrar("Para crear una zona deben haber dos puntos marcados en el mapa")
        }
        
    }
    /**
     * Cancela los puntos y no guarda la zona
     */
    function cancelar_add_zona(){
        is_add_zona_enable = false;
        btn_add_zona.style.display = "block"
        btn_add_zona_transportista.style.display = "block"
        btn_cancelar_add_zona.style.display = "none"
        bloque_guardar_zona.style.display = "none"
        btn_guardar_add_zona_transportista.style.display = "none"
        mapaCanvas.borrar_canvas();
        zonaACrear = []
        document.getElementById("input_nombre_guardar_zona").value = ""
    }

    //==========================================================================================================================
    // FIN ZONA añadir zonas en el canvas
    //==========================================================================================================================  
   
});

// ........................................................................................................................
// ........................................................................................................................
// ........................................................................................................................
// MODELO
//==============================================================================================================================
//Objeto Zona
//==============================================================================================================================
class Zona {
    // constructor parametrizado
    // nombre, (x,y) superior, (x,y) inferiro y color asociado (se pone al pintar en el canvas)
    constructor(nombre, xInferior, yInferior, xSuperior, ySuperior) {
        this.nombre = nombre;
        this.xInferior = xInferior;
        this.yInferior = yInferior;
        this.xSuperior = xSuperior;
        this.ySuperior = ySuperior;

        this.color = ""

        // calcular el punto mas cerca del 0 y el mas lejos para la representacion
        let d1 = Math.sqrt(Math.pow(this.xInferior - 0,2) + Math.pow(this.yInferior - 0,2))
        let d2 = Math.sqrt(Math.pow(this.xSuperior - 0,2) + Math.pow(this.ySuperior - 0,2))

        if(d1<d2){
            this.punto_pequenyo = {
                x: this.xInferior,
                y: this.yInferior
            }
            this.punto_grande = {
                x: this.xSuperior,
                y: this.ySuperior
            }
        }else{
            this.punto_grande = {
                x: this.xInferior,
                y: this.yInferior
            }
            this.punto_pequenyo = {
                x: this.xSuperior,
                y: this.ySuperior
            }
        }

        
    }

    // constructor desde el json
    static ZonaFromJson(json) {
        return new Zona(json.nombre, json['xInferior'], json['yInferior'], json['xSuperior'], json['ySuperior'])
    }
    /**
     * @returns string con formato nombre:xinferior$xsuperior$yinferior$ysuperior;
     */
    toString() {
        return this.nombre + ":" + this.xInferior + "$" + this.xSuperior + "$" + this.yInferior + "$" + this.ySuperior + ";"
    }

    /**
     * @returns Objeto html de una fila en formato para mostrarlo en una tabla html
     */
    toFilaTabla(){

        var fila = document.createElement('tr');
        var color = document.createElement('td');
        color.style.width = "1rem"
        color.style.backgroundColor = this.color
        var nombre = document.createElement('td');
        nombre.innerText = this.nombre
        var botonTd = document.createElement('td');
        var btn = document.createElement('input');

        btn.type = "button";
        btn.className = "btn";
        var zona = this;
        btn.onclick = (function() {return function() {borrar_zona(zona);}})();
        btn.value = "Eliminar"
        botonTd.append(btn)

        fila.append(color)
        fila.append(nombre)
        fila.append(botonTd)
        return fila
    }
}
//==============================================================================================================================
//Objeto Mapa
//==============================================================================================================================
class Mapa {
    // constructor parametrizado
    constructor(imagen, resolucion) {
        this.imagen = imagen;
        this.resolucion = resolucion;
        this.zonas = [
            new Zona("zona1",41,34,243,197),
            new Zona("zona2",560,45,627,130),
            new Zona("zona3",272,148,355,403),
        ]
    }

    /**
     * Devuelve un string con formato de tabla html con sus zonas
     */
    zonasToTabla(){
        let tabla = document.createElement('table');
        this.zonas.forEach(zona => {
            tabla.append(zona.toFilaTabla())
        });

        return tabla;
    }

    /**
     * @returns T/F si tiene una zona con nombre "transportista"
     */
     hasZonaTransportista(){
        
        for(let i = 0; i<this.zonas.length;i++){
            if(this.zonas[i].nombre == "transportista"){
                return true;
            }
        }
        return false;
    }

    // constructor desde el json
    static MapaFromJson(json) {
        return new Mapa(json.imagen, json.resolucion)
    }
}


//==============================================================================================================================
// Clase que representa un mapa en un canvas donde se pueden pintar rectangulos y puntos
//==============================================================================================================================
class CanvasMapa{

    

    constructor(contexto, mapa){
    
        this.canvas = contexto.canvas;
        this.context = contexto;
        this.context.moveTo(0, 0);
        this.mapa = mapa;

        this.defaultCanvasWidth = 300
        this.defaultCanvasHeight = 150
        
        this.altura = 0 // usado para calcular la poscion de los puntos x,y del robot (el mapa lo interpreta al reves que el canvas)

        this.tamEscaladoImagen = 5

        this.dibujarMapa();
    }

    /**
     * Dibuja la imagen del mapa en el canvas
     */
    dibujarMapa(){
        
        this.image = new Image();
        this.image.src = "data:image/png;base64," + this.mapa.imagen
       
        var objeto = this;

        this.image.onload = function(){
            objeto.redimensionar_mapa(objeto.tamEscaladoImagen)
            objeto.pintar_zonas()
            tabla_zonas.innerHTML = ""
            tabla_zonas.append(objeto.mapa.zonasToTabla())
             
        };
    }
    /**
     * Metodo para redimensionar un png de un canvas x veces
     * @param tam factor de escalado
     */
    redimensionar_mapa(tam){
        var canvasTemp = canvas;
    
        this.mapa.maxMapaX = this.image.width;
        this.mapa.maxMapaY = this.image.height;

        this.canvas.width = this.image.width*tam// tamaño para el html
        this.canvas.height = this.image.height*tam
    
        
        this.context.clearRect(0,0,canvasTemp.width, canvasTemp.height);
        this.altura = this.defaultCanvasHeight
        this.context.drawImage(this.image,
            0,0, this.image.width, this.image.height,0,0,this.canvas.width,this.canvas.height);
    }

     //==========================================================================================================================
    // Funcion  pintar_zonas()
    //========================================================================================================================== 
    /**
     *pinta rectangulos en el canvas con las posiciones de las zonas
     */
    pintar_zonas(){
        let cont = 0
        this.mapa.zonas.forEach(zona => {
            let color =  this.selectColor(++cont,this.mapa.zonas.length);
            this.context.fillStyle = color;
            zona.color = color;
            
            // void ctx.fillRect(x, y, width, height);
            let width = zona.punto_grande.x-zona.punto_pequenyo.x;
            let height = zona.punto_grande.y-zona.punto_pequenyo.y
            this.context.fillRect(zona.punto_pequenyo.x,zona.punto_pequenyo.y,width,height);
        });
        
    }

    /**
     * Dibuja un punto en un canvas
     * 
     * @param {int} x posicion x en del rato del canvas 
     * @param {int} y posicion y en pixeles del canvas del punto a dibujar
     * @param {*} canvas donde se va a pintar el punto
     */
     pintar_punto(x,y){
        

        this.context.beginPath();
        
        this.context.arc(x, y, 1, 0, 2 * Math.PI, false);
        this.context.fillStyle = 'black';
        this.context.fill();
        this.context.lineWidth = 5;
        this.context.strokeStyle = '#000';
        this.context.stroke();
    }
    /**
     * Funcion para limpiar el canvas
     * @param {*} canvas canvas el cual queremos borrar
     */
    borrar_canvas(){
    
        this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.dibujarMapa()
    }
    
    /**
     * Divide el ciruclo en n colores y devuelve uno de esos
     * 
     * @param {int} colorNum numero de la division del color que quieres que devuelvas
     * @param {int} colors numero de divisiones del circulo cromatico
     * @returns el color en hsl con 60% de transparencias
     */
    selectColor(colorNum, colors){
        if (colors < 1) colors = 1; // defaults to one color - avoid divide by zero
        return "hsl(" + (colorNum * (360 / colors) % 360) + ",100%,50%,60%)";
    }

}


