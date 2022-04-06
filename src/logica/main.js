//===================================================================================================================================================
// nombre del archivo: main.js
// Fecha: 29/03/2022
// Descripcion: En este archivo se encuentran todas las funiones que utiliza la app del transportista: connect(),disconnect(),enviarRobotZonaRecogida().
//===================================================================================================================================================

const IP_PUERTO = "http://192.168.87.164:8080"
const IP_ROS = "ws://192.168.85.207:9090/"

document.addEventListener('DOMContentLoaded', event => {

    console.log("entro en la pagina")
    document.getElementById("btn_dis").addEventListener("click", disconnect)
    document.getElementById("btn_con_verificar").addEventListener("click", enviarRobotZonaRecogida)

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
    async function enviarRobotZonaRecogida() {
        connect()
        try {
            console.log("Clic en enviarRobotZonaRecogida")
        
            //zonaLlegadaProductos = await getZonaLlegadaProductosByIdMapa(1)

                // enviar al servicio ros

                data.service_busy = true
                data.service_response = ''

                //definimos los datos del servicio
                let service = new ROSLIB.Service({
                    ros: data.ros,
                    name: '/IrZona',
                    serviceType: 'automatix_custom_interface/srv/IrZona'
                })

                let request = new ROSLIB.ServiceRequest({
                    //move: zonaLlegadaProductos.zonaJsontoString()
                    zona:"transportista"
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


        }catch(error){
            mostrar(error)
        }
        
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




    // ........................................................................................................................
    // ........................................................................................................................
    // ........................................................................................................................
    // Logica API REST

    //==========================================================================================================================
    // Funcion getZonaLlegadaProductosByIdMapa()
    //==========================================================================================================================
    // idMapa:N   ------>
    // zona:Zona; <---- getPosicionZonaLlegadaProductos 
    /**
     * @param idMapa id del mapa del cual se obtienen la zona
     * @returns Zona
     */
     async function getZonaLlegadaProductosByIdMapa(idMapa){

        console.log("El codigo llego a getPosicionZonaLlegadaProductos")
        
        // peticion api
        let respuesta = await fetch( IP_PUERTO+"/zona/llegada?idMapa="+idMapa,{
            headers : { 'User-Agent' : 'Automatix', 'Content-Type' : 'application/json' },
           }).then(response=>{
               if(response.status == 204){
                  //ok pero vacío
                  return {};
               }else if(response.status == 200){
                  // ok con contenido 
                  return response.json();
               }else{

                  // error
                  throw Error("Error en getPosicionZonaLlegadaProductosByIdMapa: "+response.toString())
               }


           }).then(zonaJson=>{
              return Zona.ZonaFromJson(zonaJson);
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
class Zona {

    // constructor parametrizado
    constructor(nombre,xInferior, yInferior, xSuperior, ySuperior){
        this.nombre = nombre;
        this.xInferior = xInferior;
        this.yInferior = yInferior;
        this.xSuperior = xSuperior;
        this.ySuperior = ySuperior;
    }
    // constructor desde el json
    static ZonaFromJson(json){
        console.log("Desde constructor")
        console.log(json)
        return new Zona(json.nombre,json['xInferior'],json['yInferior'],json['xSuperior'],json['ySuperior'])
    }

     /**
      * @returns string con formato nombre:xinferior$xsuperior$yinferior$ysuperior;
      */
    toString(){
        return this.nombre+":"+this.xInferior+"$"+this.xSuperior+"$"+this.yInferior+"$"+this.ySuperior+";"
    }

}
