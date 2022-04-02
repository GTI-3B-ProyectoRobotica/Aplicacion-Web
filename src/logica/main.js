//===================================================================================================================================================
// nombre del archivo: main.js
// Fecha: 29/03/2022
// Descripcion: En este archivo se encuentran todas las funiones que utiliza la app del transportista: connect(),disconnect(),enviarRobotZonaRecogida().
//===================================================================================================================================================
document.addEventListener('DOMContentLoaded', event => {

    console.log("entro en la pagina")
    document.getElementById("btn_con").addEventListener("click", connect)
    document.getElementById("btn_dis").addEventListener("click", disconnect)
    document.getElementById("btn_con_verificar").addEventListener("click", enviarRobotZonaRecogida)

    data = {
        // ros connection
        ros: null,
        rosbridge_address: 'ws://127.0.0.1:9090/',
        connected: false,
    }
    //==========================================================================================================================
    // Funcion connect()
    //==========================================================================================================================
    function connect(){

	    console.log("Clic en connect")
	
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
    //==========================================================================================================================
    // Funcion enviarRobotZonaRecogida()
    //==========================================================================================================================
    function enviarRobotZonaRecogida(){
        
	    console.log("Clic en enviarRobotZonaRecogida")
	
	    ubiLlegadaProductos = getPosicionZonaLlegadaProductos()

        console.log(ubiLlegadaProductos["zona1"])

        data.service_busy = true
        data.service_response = ''

        //definimos los datos del servicio
        let service = new ROSLIB.Service({
            ros: data.ros,
            name: '/mover-a-zona',
            serviceType: 'custom_interface/srv/MyMoveMsg'
        })

        let request = new ROSLIB.ServiceRequest({
            move: ubiLlegadaProductos
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
    }
    //==========================================================================================================================
    // Funcion enviarRobotZonaRecogida()
    //==========================================================================================================================
    // zona1:xi$xs$yi$ys; <---- getPosicionZonaLlegadaProductos
    function getPosicionZonaLlegadaProductos(){

        console.log("El codigo llego a getPosicionZonaLlegadaProductos")
        
	    ubiLlegadaProductos = {
            "zona1": {
            'xi': 1, 
            'xs': 2, 
            'yi': 1,
            'ys': 2,
            },
        } 

        return ubiLlegadaProductos
    }
    //==========================================================================================================================
    // Funcion disconnect()
    //==========================================================================================================================
    function disconnect(){
	      data.ros.close()        
	      data.connected = false
        console.log('Clic en botón de desconexión')
        mostrar('Clic en botón de desconexión')
    }  
    //==========================================================================================================================
    // Funcion mostrar()
    //==========================================================================================================================  
    function mostrar(texto) {
        document.getElementById("consola").innerHTML = texto;
    }
});