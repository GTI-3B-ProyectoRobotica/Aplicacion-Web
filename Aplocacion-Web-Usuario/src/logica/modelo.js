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
        return this.nombre + ":" + this.xInferior + "," + this.xSuperior + "," + this.yInferior + "," + this.ySuperior
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
        btn.classList.add("iconoEliminar")
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
    constructor(imagen, resolucion, zonas) {
        this.imagen = imagen;
        this.resolucion = resolucion;
        
        this.zonas = []
        for(let i = 0; i<zonas.length;i++){
            this.zonas.push(Zona.ZonaFromJson(zonas[i]))
        }
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
        return new Mapa(json.imagen, json.resolucion,json.zonas)
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

        this.tamEscaladoImagen = 5 //Por defecto, 5

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
            this.context.fillRect(
                zona.punto_pequenyo.x*this.tamEscaladoImagen,
                zona.punto_pequenyo.y*this.tamEscaladoImagen,
                width*this.tamEscaladoImagen,
                height*this.tamEscaladoImagen);
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
    actualizar_canvas(){
    
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
