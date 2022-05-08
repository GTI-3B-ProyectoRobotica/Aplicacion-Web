//===================================================================================================================================================
// nombre del archivo: gestionProductos.js
// Fecha: 04/05/2022
// Descripcion: En este archivo se encuentran los funciones de logica de la pagina de gestion.html
//===================================================================================================================================================

const IP_PUERTO = "http://localhost:8080"


document.addEventListener('DOMContentLoaded', event => {


    var body_tabla_productos = document.getElementById("bodyTablaStock");

    var api_res = new Api(IP_PUERTO)

    /**
     * obtenerProductos()
     * Funcion que se llama al entrar a la pagina de gestion.html 
     * que obtiene los productos y los pinta en una tabla
     */
    async function obtenerProductos(){
        var productos =  await api_res.getProductos(1)
       

        if(productos.length >0){
            productos.forEach(producto=>{
                body_tabla_productos.appendChild(producto.toFilaTabla())
            })
        }else{
            // TODO html vacio en gestion
        }
    }




    obtenerProductos();
})