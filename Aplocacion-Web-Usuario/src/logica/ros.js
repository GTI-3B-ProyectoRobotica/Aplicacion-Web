// ==============================================================
// Clase para comunicarse con el robot mediante ROS bridge
// ==============================================================

// LOS IMPORTS SE HACEN DESDE EL HTML

class ROS2{


    // ros2
    data = {
        // ros connection
        ros: null,
        rosbridge_address: null,
        connected: false,
    }

    /**
     * 
     * @param {String} ip_puerto Ip y puerto que apunta al rosbridge (XXX.XXX.XXX.XXX:YYYY)
     */
    constructor(ip_puerto){
        this.data.rosbridge_address = ip_puerto
    }

    
    //==========================================================================================================================
    // Funcion disconnect()
    //==========================================================================================================================
    disconnect() {
        this.data.ros.close()
        this.data.connected = false
        console.log('Desconectar ros')
    }

     //==========================================================================================================================
    // Funcion connect()
    //==========================================================================================================================
    async conectar(){
        this.data.ros = new ROSLIB.Ros({
            url: this.data.rosbridge_address
        })
        // Define callbacks
        this.data.ros.on("connection", () => {
            this.data.connected = true
            console.log("Conexion con ROSBridge correcta")
        })
        this.data.ros.on("error", (error) => {
            console.log("Se ha producido algun error mientras se intentaba realizar la conexion")
            console.log(error)
        })
        this.data.ros.on("close", () => {
            this.data.connected = false
            console.log("Conexion con ROSBridge cerrada")
        })
    }


    //==========================================================================================================================
    // Funcion grabarZonas() (ROS)
    //==========================================================================================================================
    /**
     * 
     * @param {[Zona]} zonas zonas a guardar
     * @returns Respuesta del servicio guardar zona
     */
    async guardar_zona_ros2(zonas,mapaCanvas){
        this.conectar()
       let strZonas = ""
       for(let i = 0;i<zonas.length;i++){
           // cambiar de base a la del ros2 
            let punto1 = this.cambio_base_punto(zonas[i].xInferior,zonas[i].yInferior,mapaCanvas)
            let punto2 = this.cambio_base_punto(zonas[i].xSuperior,zonas[i].ySuperior,mapaCanvas)
            let zonaTemp = new Zona(zonas[i].nombre,punto1.x,punto1.y,punto2.x,punto2.y)

            strZonas+= (i+1) != zonas.length ? zonaTemp.toString()+";" : zonaTemp.toString()
       }
       console.log(strZonas);
     
        try {
            
            console.log("Enviar zonas al servicio")

            this.data.service_busy = true
            this.data.service_response = ''

            let service = new ROSLIB.Service({
                ros: this.data.ros,
                name: '/automatix_guardar_zona',
                serviceType: 'automatix_custom_interface/srv/GuardarZona'
            })
            let request = new ROSLIB.ServiceRequest({
                zonas: strZonas
            })

            service.callService(request, (result) => {
                this.data.service_busy = false
                this.data.service_response = JSON.stringify(result)
                this.actualizar_fichero_servicio_ir_zona()
                return JSON.stringify(result)
            }, (error) => {
                this.data.service_busy = false
                console.error("Error en guardar zona"+error)
                return error
            })
        } catch (error) {
            return error
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
    cambio_base_punto(xP,yP,mapaCanvas){
        
        let y = mapaCanvas.canvas.height - yP // girar la y porque el robot lo interpreta al reves, el origen de cordenadas esta arriba
                                            // en el mapa esta abajo
        console.log(mapaCanvas);
        return {
            x: xP*mapaCanvas.mapa.resolucion*mapaCanvas.mapa.maxMapaX/mapaCanvas.canvas.width,
            y: y*mapaCanvas.mapa.resolucion*mapaCanvas.mapa.maxMapaY/mapaCanvas.canvas.height,
            
        }
    }

    //==========================================================================================================================
    // Funcion actualizar_fichero_servicio_ir_zona() (ROS)
    //==========================================================================================================================
    /**
     * @returns Respuesta del servicio
     */
    async actualizar_fichero_servicio_ir_zona(){
        try {

            this.data.service_busy = true
            this.data.service_response = ''

            let service = new ROSLIB.Service({
                ros: this.data.ros,
                name: '/IrZona',
                serviceType: 'automatix_custom_interface/srv/IrZona'
            })
            let request = new ROSLIB.ServiceRequest({
                zona: "zonas_added"
            })

            service.callService(request, (result) => {
                this.data.service_busy = false
                this.data.service_response = JSON.stringify(result)
                
                console.log(JSON.stringify(result))
            }, (error) => {
                this.data.service_busy = false
                console.error("Error en actualizar fichero de ir zona: "+error)
                return error
            })
        } catch (error) {
            return error
        }


    }
    //==========================================================================================================================
    // Funcion escanear() (ROS)
    //==========================================================================================================================

    /**
     * Envia la orden de escanar al servicio /escaneo_autonomo del robot
     * @returns Devuelve un mensaje de error o correcto
     */
    async enviarEscanear() {
        try {
            console.log("Clic en enviarRobotEscanear")

            this.data.service_busy = true
            this.data.service_response = ''

            //definimos los datos del servicio
            let service = new ROSLIB.Service({
                ros: this.data.ros,
                name: '/escaneo_autonomo',
                serviceType: 'custom_interface/srv/EscanearMsg'
            })

            let request = new ROSLIB.ServiceRequest({
                escanear: "escanear"
            })

            service.callService(request, (result) => {
                this.data.service_busy = false
                this.data.service_response = JSON.stringify(result)
                return JSON.stringify(result)
            }, (error) => {
                this.data.service_busy = false
                console.error("Eror en enviar robot escanear"+error)
                return error
            })
        } catch (error) {
            console.error("Eror en enviar robot escanear"+error)
            return error
        }
    }


}