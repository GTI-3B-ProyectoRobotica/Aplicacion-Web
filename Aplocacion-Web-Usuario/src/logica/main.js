//===================================================================================================================================================
// nombre del archivo: main.js
// Fecha: 29/03/2022
// Descripcion: En este archivo se encuentran todas las funiones que utiliza la app del transportista: connect(),disconnect(),enviarRobotZonaRecogida().
//===================================================================================================================================================

const IP_PUERTO = "http://192.168.85.84:8080"

const IP_ROS = "ws://192.168.85.207:9090/"

var ALTURA = 0

var maxXCanvas = 0;
var maxYCanvas = 0;

var mapa = null;

var posicion = []

document.addEventListener('DOMContentLoaded', event => {

    console.log("entro en la pagina")
    document.getElementById("btn_esc").addEventListener("click", escan)
    document.getElementById("btn_get_map").addEventListener("click", btn_get_mapa)
    document.getElementById("btn_dis").addEventListener("click", disconnect)
    document.getElementById("btn_guardar_zona").addEventListener("click", guardar_zona)

    var canvas = document.getElementById("canvas")
    var ctx = canvas.getContext("2d");

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

            tam = 5
            defaultCanvasWidth = 300
            defaultCanvasHeight = 150

            mapa = await obtenerMapa(1)
            var image = new Image();
            image.src = "data:image/png;base64," + mapa.imagen
            image.onload = function () {

                var canvas2 = ctx.canvas ;
                maxXCanvas = image.width * tam
                maxYCanvas = image.height * tam

                mapa.maxMapaX = image.width;
                mapa.maxMapaY = image.height;


                canvas.style.width = image.width * tam
                canvas.style.height = image.height * tam
                ctx.clearRect(0,0,canvas2.width, canvas2.height);
                ALTURA = image.height*tam;
                ctx.drawImage(image, 0,0,
                    image.width*tam,image.height*tam,
                    0,0, defaultCanvasWidth*tam,defaultCanvasHeight*tam);

            }


            canvas.addEventListener("click", function (event) {

                var ctx = canvas.getContext("2d");
                ctx.beginPath();
                pos = relativePos(event, ctx.canvas);
                console.log(pos)
                console.log("posicion final= ", posicion)
                console.log("posicion inicial= ", pos)
                if(posicion.length < 2){
                    posicion.push(pos)
                }
            })

        } catch (err) {
            console.log(err)
            //mostrar(err)

        }

    }

    function relativePos(event, element) {
        var rect = element.getBoundingClientRect();
        console.log(ALTURA)
        return {
            x: Math.floor(event.clientX - rect.left),
            y: ALTURA - Math.floor(event.clientY - rect.top)
        };
    }
    //==========================================================================================================================
    // Funcion grabarZonas() (ROS)
    //==========================================================================================================================
    async function guardar_zona(){
        conectar()
        console.log("Entro en guardar zona")
        let posicionInicial = cambio_base_punto(posicion[0],)
        let posicionFinal = cambio_base_punto(posicion[1])

        console.log(posicionInicial)
        console.log(posicionFinal)
        let nombre_zona = document.getElementById("input_nombre")
        let zona =  "transportista:" + posicionInicial.x + "," + posicionInicial.y+ "," + posicionFinal.x + "," + posicionFinal.y  + ";"
       // let zona =  "transportista:" + 3 + "," + 1 + "," + 3 + "," + 2 + ";"
        try {
            
            console.log("Clic en guardar_zona")

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
        
        return {
            x: punto.x*mapa.resolucion*mapa.maxMapaX/maxXCanvas,
            y: punto.y*mapa.resolucion*mapa.maxMapaY/maxYCanvas,
            
        }
    }

    //==========================================================================================================================
    // Funcion actualizar_fichero_servicio_ir_zona() (ROS)
    //==========================================================================================================================

    async function actualizar_fichero_servicio_ir_zona(){
        console.log("Entro en actualizar zona")
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
    constructor(nombre, xInferior, yInferior, xSuperior, ySuperior) {
        this.nombre = nombre;
        this.xInferior = xInferior;
        this.yInferior = yInferior;
        this.xSuperior = xSuperior;
        this.ySuperior = ySuperior;
    }
    // constructor desde el json
    static ZonaFromJson(json) {
        console.log("Desde constructor")
        console.log(json)
        return new Zona(json.nombre, json['xInferior'], json['yInferior'], json['xSuperior'], json['ySuperior'])
    }
    /**
     * @returns string con formato nombre:xinferior$xsuperior$yinferior$ysuperior;
     */
    toString() {
        return this.nombre + ":" + this.xInferior + "$" + this.xSuperior + "$" + this.yInferior + "$" + this.ySuperior + ";"
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
    }
    // constructor desde el json
    static MapaFromJson(json) {
        console.log("Desde constructor")
        console.log(json)
        return new Mapa(json.imagen, json.resolucion)
    }
}

