// ==============================================================
// Clase para comunicarse con la api rest
// ==============================================================

// LOS IMPORTS SE HACEN DESDE EL HTML

class Api{

    
    /**
     * 
     * @param {String} ip_puerto Ip y puerto que apunta al servidor rest (XXX.XXX.XXX.XXX:YYYY)
     */
    constructor(ip_puerto){
        this.ip_puerto = ip_puerto
    }


    //==========================================================================================================================
    // Funcion obtenerMapa()
    //==========================================================================================================================
    // idMapa:N   ------>
    // mapa:Mapa; <---- obtenerMapa() 
    /**
     * @param idMapa id del mapa del cual se obtienen la zona
     * @returns Mapa
     */
     async obtenerMapa(idMapa) {
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

    //==========================================================================================================================
    // Funcion getProductos()
    //==========================================================================================================================
    // idMapa:N   ------>
    // [Productos]; <---- getProductos() 
    /**
     * @param idMapa id del mapa del cual se obtienen la zona
     * @returns Mapa
     */
     async getProductos(idMapa) {
        
        var productos = []

        // peticion api
        let respuesta = await fetch(IP_PUERTO + "/productos?idmapa=" + idMapa, {
            headers: { 'User-Agent': 'Automatix', 'Content-Type': 'application/json' },
        }).then(response => {
            if (response.status == 204) {
                //ok pero vacío
                return productos;
            } else if (response.status == 200) {
                // ok con contenido 
                return response.json();
            } else {

                // error
                throw Error("Error en getProductos(): " + response.toString())
            }
        }).then(mapaJson => {
            mapaJson.forEach(json=>{
                productos.push(Producto.FromJson(json))
            })
            return productos;
        }) //then
        return respuesta
    }



    // ........................................................................................................................
    // ........................................................................................................................
    // ........................................................................................................................
    /**
     * Guardar las zonas en la bd a un mapa en especifico
     * @param {[Zona]} zonas 
     * @param idMapa
     * @param escala Escala del mapa, hay que dividir los pixeles por si luego se cambia la escala
     * @returns respuesta de la peticion
     */
    async guardar_zonas(zonas, idMapa) {

        let body = []
        zonas.forEach(zona => {

            body.push({"nombre": zona.nombre, "mapa": idMapa,"xSuperior": zona.xSuperior, "ySuperior": zona.ySuperior, "xInferior": zona.xInferior, "yInferior": zona.yInferior})
        });
        console.log(JSON.stringify(body));
        let respuesta = await fetch(IP_PUERTO + "/zonas", {
            method: "POST",
            headers: { 'User-Agent': 'Automatix', 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
            }).then(response => {
                return response
            })
        return respuesta

    }

    //==========================================================================================================================
    // Funcion borrarZonaDB()
    //==========================================================================================================================
    // nombre: texto   ------>
    // borrarZonaDB 
    /**
     * @param nombre nombre de la zona que queremos borrar
     */
     async borrarZonaDB(nombre) {
        
        console.log("El codigo llego a borrarZonaDB")

        // peticion api
        let respuesta = await fetch( IP_PUERTO+"/zona?nombre="+nombre+"",{
            headers : { 'User-Agent' : 'Automatix', 'Content-Type' : 'application/json' },
            method : "DELETE"
           }).then(response=>{
               if(response.status == 204){
                  //ok pero vacío
                  return {};
               }else if(response.status == 200){
                  // ok con contenido
                  return response.json();
               }else{

                  // error
                  throw Error("Error en borrarZonaDB: "+response.toString())
               }

           })
    }

}