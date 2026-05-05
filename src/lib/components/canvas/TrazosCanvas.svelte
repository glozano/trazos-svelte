
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
    <!-- Loaded gestures: {replayQueue.length} <br/> -->
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
    import { loadCanvasUsername } from '$lib/stores/usernameStore';
    import MultiMap from '$lib/andiamo/multimap';
    import HashMap from '$lib/andiamo/hashmap';
    import {DELETE_FACTOR} from '$lib/andiamo/parameters';

    const REPLAY_SPEED_MULTIPLIER = 2;
    const REPLAY_MAX_GAP_MS = 120;
    const REPLAY_MAX_EVENTS_PER_FRAME = 80;

    var _p5;
    var replayQueue = [];
    var replayStartAt = null;
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

    function debugTrazosSocketEnabled(){
        if (typeof window === 'undefined') return false;
        return window.localStorage?.DEBUG_TRAZOS_SOCKET === 'true'
            || new URLSearchParams(window.location.search).get('debugTrazosSocket') === '1';
    }

    function debugSocketEvent(action, data){
        if (!debugTrazosSocketEnabled()) return;
        console.log('[trazos-socket]', action, {
            event: data?.e,
            id: data?.id,
            gestureId: data?.gesture_id,
            layer: data?.layer,
            x: data?.x,
            y: data?.y
        });
    }

    onMount(() => {
        var storedUsername = loadCanvasUsername();
        clientConnect(storedUsername);
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
            replayQueue = buildReplayQueue(lines);
            replayStartAt = null;
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
            drainReplayQueue(p5);
            var t = p5.millis();
            // Iterar sobre las capas disponibles, empezando desde la ultima
            for (var i = $layers.length - 1; 0 <= i; i--) {
                // Dibujar los trazos externos
                var other = otherGestures[i];
                for (var j = 0; j < other.values().length; j++) {
                    var gesture = other.values()[j];
                    gesture.update(t);
                    gesture.draw();
                    if(!gesture.visible && !gesture.looping && gesture.remoteComplete !== false){
                        otherRibbons.remove(gesture.gestureId || gesture.id);
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

    function parseEventTimestamp(timestamp){
        if(!timestamp) return null;
        var millis = new Date(timestamp).getTime();
        if(Number.isFinite(millis)) return millis;
        return null;
    }

    function buildReplayQueue(lines){
        var queue = [];
        var replayOffset = 0;
        var prevTimestamp = null;
        for (var i = 0; i < lines.length; i++) {
            var line = lines[i];
            var currentTimestamp = parseEventTimestamp(line.timestamp);
            if (prevTimestamp !== null && currentTimestamp !== null) {
                var realGap = Math.max(0, currentTimestamp - prevTimestamp);
                var cappedGap = Math.min(realGap, REPLAY_MAX_GAP_MS);
                replayOffset += cappedGap / REPLAY_SPEED_MULTIPLIER;
            } else if (i > 0) {
                replayOffset += 1000 / 60;
            }
            queue.push({
                at: replayOffset,
                data: line.data
            });
            if (currentTimestamp !== null) prevTimestamp = currentTimestamp;
        }
        return queue;
    }

    function drainReplayQueue(p5){
        if(!replayQueue.length) return;
        if(replayStartAt === null) replayStartAt = p5.millis();
        var elapsed = p5.millis() - replayStartAt;
        var processed = 0;
        while(
            replayQueue.length &&
            replayQueue[0].at <= elapsed &&
            processed < REPLAY_MAX_EVENTS_PER_FRAME
        ){
            var item = replayQueue.shift();
            externalMouseEvent(item.data);
            processed++;
        }
    }


    // Parece que el dissapearing y el alpha se comparten con el board Y la velocidad tambien???
    function externalMouseEvent(data){
        debugSocketEvent('receive', data);
        var gestureKey = data.gesture_id || data.id;
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
            newGesture.gestureId = gestureKey;
            newGesture.ownerId = data.id;
            newGesture.id = gestureKey;
            newGesture.remoteComplete = false;
            newGesture.setStartTime(t0);
            otherGestures[layer].put(gestureKey, newGesture);

            // Agregamos un ribbon
            var newRibbon = new Ribbon(_p5);
            // Inicializamos el ribbon
            newRibbon.init(data.stroke_weight);
            otherRibbons.put(gestureKey, newRibbon);

            // Le agregamos este punto
            var other = otherGestures[layer].get(gestureKey);
            newRibbon.addPoint(other[other.length-1], t0, data.color, $canvasParams.alpha, data.x, data.y);
        }

        /*
        MOUSE DRAGGED
        */

        if (data.e === "DRAGGED") {
            var layer = data.layer;
            var other = otherGestures[layer].get(gestureKey);
            if(!other || !other.length) {
                debugSocketEvent('ignore missing gesture for drag', data);
                return;
            }
            var otherGesture = other[other.length-1];
            var otherRibbon = otherRibbons.get(gestureKey);

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
            var other = otherGestures[layer].get(gestureKey);
            if(!other || !other.length) {
                debugSocketEvent('ignore missing gesture for release', data);
                return;
            }
            var otherGesture = other[other.length-1];
            var otherRibbon = otherRibbons.get(gestureKey);

            // Seteamos el ultimo punto
            var t0 = otherGesture.getStartTime();
            var t1 = t0 + data.t;
            // t1 = mills();
            // print("Ending gesture " + t0 + + " " + t1);

            otherRibbon.addPoint(otherGesture, t1, data.color, $canvasParams.alpha, data.x, data.y);
            // Seteamos el looping
            otherGesture.setLooping(data.looping);
            otherGesture.setEndTime(t1);
            otherGesture.remoteComplete = true;
        }
    }
    
    function deleteHandler(data) {
        var layer = normalizeLayer(data.layer);
        var deleteId = data.id;
        var gestureId = data.gesture_id;

        replayQueue = replayQueue.filter((item) => !replayEventMatchesDelete(item.data, data));

        if(gestureId){
            fadeGestures(otherGestures[layer] ? otherGestures[layer].get(gestureId) : []);
            fadeGestures($layers[layer].filter((gesture) => gesture.gestureId == gestureId));
            if($currentGesture && $currentGesture.gestureId == gestureId){
                $currentGesture.looping = false;
                $currentGesture.fadeOutFact = DELETE_FACTOR;
            }
            return;
        }

        fadeGestures(
            otherGestures[layer]
                ? otherGestures[layer].values().filter((gesture) => gesture.ownerId == deleteId)
                : []
        );

        if(deleteId == $id){
            fadeGestures($layers[layer]);
            if($currentGesture && $canvasParams.layer == layer){
                $currentGesture.looping = false;
                $currentGesture.fadeOutFact = DELETE_FACTOR;
            }
        }
    }

    function normalizeLayer(layer) {
        var normalized = Number(layer || 0);
        return Number.isFinite(normalized) ? normalized : 0;
    }

    function replayEventMatchesDelete(eventData, deleteData) {
        if(!eventData || !deleteData) return false;
        if(deleteData.gesture_id){
            return String(eventData.gesture_id || '') === String(deleteData.gesture_id);
        }
        if(deleteData.id == null) return false;
        return String(eventData.id) === String(deleteData.id)
            && normalizeLayer(eventData.layer) === normalizeLayer(deleteData.layer);
    }

    function fadeGestures(gestures) {
        if(!gestures) return;
        for (var idx in gestures) {
            gestures[idx].looping = false;
            gestures[idx].fadeOutFact = DELETE_FACTOR;
            gestures[idx].remoteComplete = true;
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
            'gesture_id': $currentGesture.gestureId,
            'id': $id
        }

        // Emitimos el evento a los demas clientes.
        debugSocketEvent('emit', movement);
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
                'gesture_id': $currentGesture.gestureId,
                'id': $id
            }
            debugSocketEvent('emit', movement);
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
                'gesture_id': $currentGesture.gestureId,
                'id': $id
            }
            
            debugSocketEvent('emit', movement);
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
