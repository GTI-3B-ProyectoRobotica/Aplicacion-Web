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
    mapaCanvas.actualizar_canvas()
 }


document.addEventListener('DOMContentLoaded', event => {

    document.getElementById("btn_esc").addEventListener("click", btn_escan)
    document.getElementById("btn_get_map").addEventListener("click", btn_get_mapa)
    //document.getElementById("btn_dis").addEventListener("click", btn_disconnect)

    // añadir zonas -----------------------------------
    var btn_add_zona = document.getElementById("btn_add_zona")
    var btn_add_zona_transportista = document.getElementById("btn_add_zona_transportista")
    var btn_cancelar_add_zona = document.getElementById("btn_cancelar_add_zona")
    var bloque_guardar_zona = document.getElementById("div_guardar_zona")
    var btn_guardar_add_zona_transportista = document.getElementById("btn_guardar_add_zona_transportista")
    var div_carga = document.getElementById("carga")
    var div_infomacion = document.getElementById("informacion")

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

    


    var api_res = new Api(IP_PUERTO)
    var rosbridge = new ROS2(IP_ROS)


    function btn_disconnect(){
        rosbridge.disconnect();
    }

    /**
     * Callback del boton escanear
     */
    async function btn_escan() {
        rosbridge.conectar()
        let res = await rosbridge.enviarEscanear()
    }

    /**
     * Callback de la funcion get mapa
     */
    async function btn_get_mapa() {

        try {

            btn_add_zona.style.display = "none"

            // obtener imagen del mapa del servidor
            modo_carga(true);
            let mapa = await api_res.obtenerMapa(1)
            modo_carga(false);

            mapaCanvas = new CanvasMapa(ctx,mapa)
            mapaCanvas.mapa.id = 1
            
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

    /**
     * Funcion que devuelve un punto xy de un canvas al hacerle click
     * 
     * @param {*} event evento click
     * @param {*} canvas canvas donde se hace click
     * @returns Punto x,y clickado del canvas
     */
    function getMousePos(event, canvas) {
        var rect = canvas.getBoundingClientRect();
        return {
            x: Math.floor(event.clientX - rect.left),
            y: Math.floor(event.clientY - rect.top)
        };
    }
    

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
    async function guardar_add_zona(){
        let nombre = document.getElementById("input_nombre_guardar_zona").value
        if(nombre.trim().length > 0 && zonaACrear.length==2 && nombre.trim() != "transportista"){
            let escala = mapaCanvas.tamEscaladoImagen;
            let nuevaZona = new Zona(nombre, zonaACrear[0].x/escala,zonaACrear[0].y/escala,zonaACrear[1].x/escala,zonaACrear[1].y/escala)
            mapaCanvas.mapa.zonas.push(nuevaZona)
            // TODO poner aqui algo de carga en plan un metodo que haga que la vista entre en un modo de carga
            modo_carga(true);
            
            let respuestaApi = await api_res.guardar_zonas(mapaCanvas.mapa.zonas,mapaCanvas.mapa.id)
            if(respuestaApi.status == 200){
                let respuesta = await rosbridge.guardar_zona_ros2(mapaCanvas.mapa.zonas,mapaCanvas)
            }else{
                borrar_zona(nuevaZona)
                mostrar(respuestaApi.message)
            }
            modo_carga(false);
            // TODO quitar el modo carga
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
     async function guardar_add_zona_transportista(){
        if(zonaACrear.length==2){
            let escala = mapaCanvas.tamEscaladoImagen; // guardarlo sin escala
            let nuevaZona = new Zona("transportista", zonaACrear[0].x/escala,zonaACrear[0].y/escala,zonaACrear[1].x/escala,zonaACrear[1].y/escala)
            mapaCanvas.mapa.zonas.push(nuevaZona)
            // TODO poner aqui algo de carga en plan un metodo que haga que la vista entre en un modo de carga
            modo_carga(true);
            
            let respuestaApi = await api_res.guardar_zonas(mapaCanvas.mapa.zonas,mapaCanvas.mapa.id)
            if(respuestaApi.status == 200){
                let respuesta = await rosbridge.guardar_zona_ros2(mapaCanvas.mapa.zonas,mapaCanvas)
            }else{
                borrar_zona(nuevaZona)
                mostrar(respuestaApi.message)
            }
            modo_carga(false);

            // TODO quitar el modo carga
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
        mapaCanvas.actualizar_canvas();
        zonaACrear = []
        document.getElementById("input_nombre_guardar_zona").value = ""
    }

    function modo_carga(isCarga){
        if(isCarga){
            // esconder bloque-info
            div_infomacion.style.display = "none";
            // mostrar carga
            div_carga.style.display = "block";
        }else{
            // mostrar bloque-info
            div_infomacion.style.display = "block";
            // esconder carga
            div_carga.style.display = "none";

        }
    }
});


