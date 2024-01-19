
<P5 {sketch} />
<div class="counter">
    <!-- Lineas totales: {gesturesPerFrame} <br/>
    -------- <br/>
    Lineas mias: {myGesturesPerFrame} <br/>
    -------- <br/> -->
    <!-- Lineas mias por capa <br/> -->
    <!-- -------- <br/>
    Layer 1: {$layers[0].length} <br/>
    Layer 2: {$layers[1].length} <br/>
    Layer 3: {$layers[2].length} <br/>
    Layer 4: {$layers[3].length} <br/> -->
    <!-- -------- <br/> -->
    <!-- Lineas del resto: {otherGesturesPerFrame} <br/> -->
    <!-- -------- <br/> -->
    <!-- Loaded gestures: {prevLines.length} <br/> -->
    <!-- -------- <br/> -->
    <!-- FPS: {Math.round(frameRate)} <br/>
    -------- <br/> -->
</div>   
<script>
    import  P5  from 'p5-svelte';
    import { onMount, onDestroy } from 'svelte';
    import Ribbon from '$lib/andiamo/ribbon';
    import {StrokeGesture} from '$lib/andiamo/stroke';
    import {p, canvas, currentRibbon,currentGesture,prevGesture, canvasParams, layers, reset, openModals} from '$lib/stores/boardStore';
    import {id, socket, clientConnect} from '$lib/stores/socketStore';
    import MultiMap from '$lib/andiamo/multimap';
    import HashMap from '$lib/andiamo/hashmap';
    import {DELETE_FACTOR} from '$lib/andiamo/parameters';

    var _p5;
    var loadingLines = false;
    var prevLines = [];
    var remainingLines = 0;
    var otherRibbons = new HashMap();
    var gesturesPerFrame = 0;
    var myGesturesPerFrame = 0;
    var myGestureCount = 0;
    var otherGesturesCount = 0;
    var otherGesturesPerFrame = 0;
    var frameRate =0;
    var otherGestures = [
        new MultiMap(),
        new MultiMap(), 
        new MultiMap(), 
        new MultiMap()
    ];

    onMount(() => {
        clientConnect();
        $socket.on('externalMouseEvent', externalMouseEvent);
        $socket.on('deleteEvent', deleteHandler);
        $socket.on("connect", () => {
            // setTimeout(() => {
            //     if ($socket.io.engine) {
            //     // close the low-level connection and trigger a reconnection
            //     $socket.io.engine.close();
            //     }
            // }, 10000);
        });
        $socket.on('disconnect', function() {
            
        })
        // document.addEventListener('touchstart', userTouch);
        
        // Cargar lineas previas
        $socket.on('previousLines', async function(lines){
            if(!loadingLines){
                prevLines = lines
                loadingLines = true;
            }
        });
    });
    onDestroy(()=>{
        $p.remove();
        console.log("dsiconect");
        $socket.disconnect();
    });

	const sketch = (p5) => {
        $p = p5;
        _p5 = p5;

        p5.setup = () => {
            let w = window.innerWidth;
            let h = window.innerHeight;
            $canvas = p5.createCanvas(w, h);
            reset();
		};

		p5.draw = () => {
			p5.background(0);
            otherGesturesCount = 0;
            myGestureCount = 0;
            // Cargar lineas previas
            if(prevLines.length > 0){
                // console.log("mando1");
                prevLines.splice(0,4).forEach((line)=>{
                    // console.log("mando2");
                    externalMouseEvent(line.data);
                });
            }
            var t = p5.millis();
            // Iterar sobre las capas disponibles, empezando desde la ultima
            for (var i = $layers.length - 1; 0 <= i; i--) {
                // Dibujar los trazos externos
                var other = otherGestures[i];
                for (var j = 0; j < other.values().length; j++) {
                    var gesture = other.values()[j];
                    gesture.update(t);
                    gesture.draw();
                    if(!gesture.visible && !gesture.looping){
                        other.remove(gesture.id);
                    }
                    otherGesturesCount++;
                }
                // Dibujar los trazos pasados
                for (var j = 0; j < $layers[i].length; j++) {
                    var gesture = $layers[i][j]
                    gesture.update(t);
                    gesture.draw();
                    if(!gesture.visible && !gesture.looping){
                        $layers[i].splice(j,1);
                    }
                    myGestureCount++;
                }
                // Dibujar el trazo actual si lo hubiese
                if ($currentGesture != null && $canvasParams.layer == i) {
                    $currentGesture.update(t);
                    $currentGesture.draw();
                }    
		    };
            otherGesturesPerFrame = otherGesturesCount;
            myGesturesPerFrame = myGestureCount;
            gesturesPerFrame = otherGesturesPerFrame+myGesturesPerFrame;
            if(p5.frameCount % 30 == 0) frameRate = p5.frameRate();
        }
        p5.mousePressed = (event)=>gestureStart(p5, event);
        p5.mouseDragged = (event)=>gestureDrag(p5, event);
        p5.mouseReleased = (event)=>gestureFinish(p5, event);
        p5.touchStarted = (event)=>gestureStart(p5, event);
        p5.touchMoved = (event)=>gestureDrag(p5, event);
        p5.touchEnded = (event)=>gestureFinish(p5, event);
	};


    // Parece que el dissapearing y el alpha se comparten con el board Y la velocidad tambien???
    function externalMouseEvent(data){
        /*
        MOUSE PRESS
        */

        if (data.e === "PRESS") {

            // Variables
            var t0 = _p5.millis();
            var lastGesture = null;
            var grouping = true;
            var layer = data.layer;

            // Agregamos este gesture a la lista de gestures
            var newGesture = new StrokeGesture(_p5,$canvasParams.dissapearing, data.fixed, lastGesture, layer, $canvasParams.loopMultiplier);
            newGesture.setStartTime(t0);
            otherGestures[layer].put(data.id, newGesture);

            // Agregamos un ribbon
            var newRibbon = new Ribbon(_p5);
            // Inicializamos el ribbon
            newRibbon.init(data.stroke_weight);
            otherRibbons.put(data.id, newRibbon);

            // Le agregamos este punto
            var other = otherGestures[layer].get(data.id);
            newRibbon.addPoint(other[other.length-1], t0, data.color, $canvasParams.alpha, data.x, data.y);
        }

        /*
        MOUSE DRAGGED
        */

        if (data.e === "DRAGGED") {
            var layer = data.layer;
            var other = otherGestures[layer].get(data.id);
            var otherGesture = other[other.length-1];
            var otherRibbon = otherRibbons.get(data.id);

            // Agregamos el punto
            var t0 = otherGesture.getStartTime();
            var t = t0 + data.t;
            // print("Adding point " + t0 + + " " + data.t);
            otherRibbon.addPoint(otherGesture, t, data.color, $canvasParams.alpha, data.x, data.y);
        }

        /*
        MOUSE RELEASED
        */

        if (data.e === "RELEASED") {
            var layer = data.layer;
            var other = otherGestures[layer].get(data.id);
            var otherGesture = other[other.length-1];
            var otherRibbon = otherRibbons.get(data.id);

            // Seteamos el ultimo punto
            var t0 = otherGesture.getStartTime();
            var t1 = t0 + data.t;
            // t1 = mills();
            // print("Ending gesture " + t0 + + " " + t1);

            otherRibbon.addPoint(otherGesture, t1, data.color, $canvasParams.alpha, data.x, data.y);
            // Seteamos el looping
            otherGesture.setLooping(data.looping);
            otherGesture.setEndTime(t1);
        }
    }
    
    function deleteHandler(data) {
        var layer = data.layer;
        var id = data.id;
        if(otherGestures[layer]) var gestures = otherGestures[layer].get(id);
        for (var idx in gestures) {
            var g = gestures[idx];
            // if (g.layer == layer) {
            g.looping = false;
            g.fadeOutFact = DELETE_FACTOR;
            // }
        }
    }
    
    //  Proyecto de delete por linea

    // function deleteHandler(data) {
    //     var layer = data.layer;
    //     var userId = data.user_id;
    //     var gestureId = data.gesture_id;
        
    //     if(userId == $id){
    //         for (var j = $layers[layer].length - 1; j >= 0; j--) {
    //             if($layers[layer][j].gestureId == gestureId){
    //                 $layers[layer][j].looping = false;
    //                 $layers[layer][j].fadeOutFact = DELETE_FACTOR;
    //             }
    //         }
            
    //     }else{
    //         // gestures = otherGestures[layer].get(id);
    //     }
        
    //     // for (var idx in gestures) {
    //     //     var g = gestures[idx];
    //     //     g.looping = false;
    //     //     g.fadeOutFact = DELETE_FACTOR;
    //     // }
    // }
    
    function gestureStart(p5,event){
        if ($openModals) return;

        var t0 = p5.millis();

        // Creamos el $currentGesture (este es el que se dibuja desde p5.js)
        $currentGesture = new StrokeGesture(p5,$canvasParams.dissapearing, $canvasParams.fixed, $prevGesture, $canvasParams.layer, $canvasParams.loopMultiplier);
        $currentGesture.setStartTime(t0);

        // Creamos el nuevo ribbon
        $currentRibbon = new Ribbon(p5);
        $currentRibbon.init($canvasParams.ribbonWidth);

        // Agregamos el punto al ribbon
        $currentRibbon.addPoint($currentGesture, t0, $canvasParams.color, $canvasParams.alpha, p5.mouseX, p5.mouseY);

        // Objeto que se emite
        var movement = {
            'e': "PRESS",
            'x': p5.mouseX,
            'y': p5.mouseY,
            't': t0,
            'color': $canvasParams.color,
            'stroke_weight':$canvasParams.ribbonWidth,
            'layer': $canvasParams.layer,
            'fixed':$canvasParams.fixed,
            // 'gesture_id': $currentGesture.gestureId,
            'id': $id
        }

        // Emitimos el evento a los demas clientes.
        $socket.emit("externalMouseEvent", movement);

        
    }

    function gestureDrag(p5,event) {
        if ($openModals) return;
        if ($currentGesture) {
            var t = p5.millis();
            var t0 = $currentGesture.getStartTime();

            var movement = {
                'e': "DRAGGED",
                'x': p5.mouseX,
                'y': p5.mouseY,
                't': t - t0,
                'color': $canvasParams.color,
                'stroke_weight':$canvasParams.ribbonWidth,
                'layer': $canvasParams.layer,
                // 'gesture_id': $currentGesture.gestureId,
                'id': $id
            }
            $socket.emit("externalMouseEvent", movement);

            $currentRibbon.addPoint($currentGesture, t, $canvasParams.color, $canvasParams.alpha, p5.mouseX, p5.mouseY);
        }

        return false;
    }

    function gestureFinish(p5,event) {
        if ($openModals) return;

        if ($currentGesture) {

            // Agregamos el último punto
            var t1 = p5.millis();
            var t0 = $currentGesture.getStartTime();
            $currentRibbon.addPoint($currentGesture, t1, $canvasParams.color, $canvasParams.alpha, p5.mouseX, p5.mouseY);
            $currentGesture.setLooping($canvasParams.looping);
            $currentGesture.setEndTime(t1);
            
            // Pusheamos el gesture a la capa
            if ($currentGesture.visible) {
                $layers[$canvasParams.layer]= [...$layers[$canvasParams.layer], $currentGesture];
                if($layers[$canvasParams.layer].length == 1){
                    // setFirstGesture();
                }
            }

            var movement = {
                'e': "RELEASED",
                'x': p5.mouseX,
                'y': p5.mouseY,
                't': t1 - t0,
                'color': $canvasParams.color,
                'stroke_weight':$canvasParams.ribbonWidth,
                'layer': $canvasParams.layer,
                'looping': $canvasParams.looping,
                // 'gesture_id': $currentGesture.gestureId,
                'id': $id
            }
            
            $socket.emit("externalMouseEvent", movement);

            $prevGesture = $currentGesture;
            $currentGesture = null;
        }
    }

  </script>

<style>
.counter{
    position: absolute;
    bottom: 0;
    right: 0;
    color: white;
    font-size: x-large;
    z-index: 9999999;
    margin: 32px;
    }

</style>