<div class={`canvas-stage ${handModeActive ? 'hand-mode' : 'pencil-mode'} ${isPanning ? 'panning' : ''}`}>
    <P5 {sketch} />

    {#if handModeActive}
        <div class="viewport-indicator">
            <div class="indicator-label">Canvas {Math.round(boardWidth)} x {Math.round(boardHeight)}</div>
            <div class="indicator-subtext">
                View {Math.round(offsetX)}, {Math.round(offsetY)} - {Math.round(visibleRight)}, {Math.round(visibleBottom)}
            </div>
            <div class="mini-map" style={`--mini-map-height:${miniMapHeight}px;`}>
                <div
                    class="mini-map-view"
                    style={`left:${viewRectLeftPct}%;top:${viewRectTopPct}%;width:${viewRectWidthPct}%;height:${viewRectHeightPct}%;`}
                ></div>
            </div>
        </div>
    {/if}

    <div class="counter">
        <!-- Lineas totales: {gesturesPerFrame} <br/> -->
    </div>
</div>

<script>
    import P5 from 'p5-svelte';
    import { onMount, onDestroy } from 'svelte';
    import Ribbon from '$lib/andiamo/ribbon';
    import { StrokeGesture } from '$lib/andiamo/stroke';
    import { p, canvas, currentRibbon, currentGesture, prevGesture, canvasParams, layers, reset, openModals } from '$lib/stores/boardStore';
    import { id, socket, boardCanvasSize, clientConnect, updateBoardViewport } from '$lib/stores/socketStore';
    import { loadCanvasUsername } from '$lib/stores/usernameStore';
    import MultiMap from '$lib/andiamo/multimap';
    import HashMap from '$lib/andiamo/hashmap';
    import { DELETE_FACTOR } from '$lib/andiamo/parameters';

    const REPLAY_SPEED_MULTIPLIER = 2;
    const REPLAY_MAX_GAP_MS = 120;
    const REPLAY_MAX_EVENTS_PER_FRAME = 80;

    const MINIMAP_WIDTH = 160;
    const MINIMAP_MIN_HEIGHT = 72;
    const MINIMAP_MAX_HEIGHT = 130;

    var _p5;
    var replayQueue = [];
    var replayStartAt = null;
    var otherRibbons = new HashMap();
    var myGesturesPerFrame = 0;
    var myGestureCount = 0;
    var otherGesturesCount = 0;
    var otherGesturesPerFrame = 0;
    var otherGestures = [
        new MultiMap(),
        new MultiMap(),
        new MultiMap(),
        new MultiMap()
    ];

    var viewportWidth = 0;
    var viewportHeight = 0;
    var boardWidth = 0;
    var boardHeight = 0;
    var offsetX = 0;
    var offsetY = 0;
    var maxOffsetX = 0;
    var maxOffsetY = 0;

    var isPanning = false;
    var panStartX = 0;
    var panStartY = 0;
    var panBaseOffsetX = 0;
    var panBaseOffsetY = 0;

    var miniMapHeight = MINIMAP_MIN_HEIGHT;
    var viewRectWidthPct = 100;
    var viewRectHeightPct = 100;
    var viewRectLeftPct = 0;
    var viewRectTopPct = 0;
    var visibleRight = 0;
    var visibleBottom = 0;
    var handModeActive = false;

    $: handModeActive = $canvasParams.interactionMode === 'hand';
    $: boardWidth = Math.max(viewportWidth, Number($boardCanvasSize?.width) || 0);
    $: boardHeight = Math.max(viewportHeight, Number($boardCanvasSize?.height) || 0);
    $: maxOffsetX = Math.max(0, boardWidth - viewportWidth);
    $: maxOffsetY = Math.max(0, boardHeight - viewportHeight);
    $: offsetX = clamp(offsetX, 0, maxOffsetX);
    $: offsetY = clamp(offsetY, 0, maxOffsetY);
    $: miniMapHeight = clamp((boardHeight / Math.max(1, boardWidth)) * MINIMAP_WIDTH, MINIMAP_MIN_HEIGHT, MINIMAP_MAX_HEIGHT);

    $: viewRectWidthPct = boardWidth ? clamp((viewportWidth / boardWidth) * 100, 8, 100) : 100;
    $: viewRectHeightPct = boardHeight ? clamp((viewportHeight / boardHeight) * 100, 8, 100) : 100;
    $: viewRectLeftPct = boardWidth ? clamp((offsetX / boardWidth) * 100, 0, 100 - viewRectWidthPct) : 0;
    $: viewRectTopPct = boardHeight ? clamp((offsetY / boardHeight) * 100, 0, 100 - viewRectHeightPct) : 0;
    $: visibleRight = Math.min(boardWidth, offsetX + viewportWidth);
    $: visibleBottom = Math.min(boardHeight, offsetY + viewportHeight);

    onMount(() => {
        var storedUsername = loadCanvasUsername();

        if ($socket) {
            $socket.on('externalMouseEvent', externalMouseEvent);
            $socket.on('deleteEvent', deleteHandler);
            $socket.on('previousLines', function(lines) {
                replayQueue = buildReplayQueue(lines);
                replayStartAt = null;
            });
            clientConnect(storedUsername);
        } else {
            clientConnect(storedUsername);
        }

        syncViewport(window.innerWidth, window.innerHeight);
    });

    onDestroy(() => {
        if ($socket) {
            $socket.off('externalMouseEvent', externalMouseEvent);
            $socket.off('deleteEvent', deleteHandler);
            $socket.off('previousLines');
        }
        if ($p) $p.remove();
        if ($socket) $socket.disconnect();
    });

    const sketch = (p5) => {
        $p = p5;
        _p5 = p5;

        p5.setup = () => {
            var w = window.innerWidth;
            var h = window.innerHeight;
            $canvas = p5.createCanvas(w, h);
            syncViewport(w, h);
            reset();
        };

        p5.windowResized = () => {
            var w = window.innerWidth;
            var h = window.innerHeight;
            p5.resizeCanvas(w, h);
            syncViewport(w, h);
            return false;
        };

        p5.draw = () => {
            p5.background(0);
            otherGesturesCount = 0;
            myGestureCount = 0;
            drainReplayQueue(p5);

            var t = p5.millis();

            p5.push();
            p5.translate(-offsetX, -offsetY);

            for (var i = $layers.length - 1; 0 <= i; i--) {
                var other = otherGestures[i];
                for (var j = 0; j < other.values().length; j++) {
                    var gesture = other.values()[j];
                    gesture.update(t);
                    gesture.draw();
                    if (!gesture.visible && !gesture.looping) {
                        other.remove(gesture.id);
                    }
                    otherGesturesCount++;
                }

                for (var k = 0; k < $layers[i].length; k++) {
                    var myGesture = $layers[i][k];
                    myGesture.update(t);
                    myGesture.draw();
                    if (!myGesture.visible && !myGesture.looping) {
                        $layers[i].splice(k, 1);
                    }
                    myGestureCount++;
                }

                if ($currentGesture != null && $canvasParams.layer == i) {
                    $currentGesture.update(t);
                    $currentGesture.draw();
                }
            }

            p5.pop();

            otherGesturesPerFrame = otherGesturesCount;
            myGesturesPerFrame = myGestureCount;
        };

        p5.mousePressed = () => gestureStart(p5);
        p5.mouseDragged = () => gestureDrag(p5);
        p5.mouseReleased = () => gestureFinish(p5);
        p5.touchStarted = () => gestureStart(p5);
        p5.touchMoved = () => gestureDrag(p5);
        p5.touchEnded = () => gestureFinish(p5);
    };

    function syncViewport(width, height) {
        var normalizedWidth = Math.max(1, Math.round(width || 0));
        var normalizedHeight = Math.max(1, Math.round(height || 0));
        viewportWidth = normalizedWidth;
        viewportHeight = normalizedHeight;
        updateBoardViewport(normalizedWidth, normalizedHeight);
    }

    function clamp(value, min, max) {
        return Math.max(min, Math.min(max, value));
    }

    function parseEventTimestamp(timestamp) {
        if (!timestamp) return null;
        var millis = new Date(timestamp).getTime();
        if (Number.isFinite(millis)) return millis;
        return null;
    }

    function buildReplayQueue(lines) {
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

    function drainReplayQueue(p5) {
        if (!replayQueue.length) return;
        if (replayStartAt === null) replayStartAt = p5.millis();
        var elapsed = p5.millis() - replayStartAt;
        var processed = 0;
        while (
            replayQueue.length &&
            replayQueue[0].at <= elapsed &&
            processed < REPLAY_MAX_EVENTS_PER_FRAME
        ) {
            var item = replayQueue.shift();
            externalMouseEvent(item.data);
            processed++;
        }
    }

    function getBoardPointer(p5) {
        return {
            x: clamp(p5.mouseX + offsetX, 0, Math.max(1, boardWidth)),
            y: clamp(p5.mouseY + offsetY, 0, Math.max(1, boardHeight))
        };
    }

    function startPan(p5) {
        isPanning = true;
        panStartX = p5.mouseX;
        panStartY = p5.mouseY;
        panBaseOffsetX = offsetX;
        panBaseOffsetY = offsetY;
    }

    function dragPan(p5) {
        if (!isPanning) return false;
        var deltaX = p5.mouseX - panStartX;
        var deltaY = p5.mouseY - panStartY;
        offsetX = clamp(panBaseOffsetX - deltaX, 0, maxOffsetX);
        offsetY = clamp(panBaseOffsetY - deltaY, 0, maxOffsetY);
        return false;
    }

    function endPan() {
        isPanning = false;
        return false;
    }

    function externalMouseEvent(data) {
        if (data.e === 'PRESS') {
            var pressStart = _p5.millis();
            var layer = data.layer;
            var newGesture = new StrokeGesture(_p5, $canvasParams.dissapearing, data.fixed, null, layer, $canvasParams.loopMultiplier);
            newGesture.setStartTime(pressStart);
            otherGestures[layer].put(data.id, newGesture);

            var newRibbon = new Ribbon(_p5);
            newRibbon.init(data.stroke_weight);
            otherRibbons.put(data.id, newRibbon);

            var other = otherGestures[layer].get(data.id);
            newRibbon.addPoint(other[other.length - 1], pressStart, data.color, $canvasParams.alpha, data.x, data.y);
        }

        if (data.e === 'DRAGGED') {
            var dragLayer = data.layer;
            var dragged = otherGestures[dragLayer].get(data.id);
            if (!dragged || !dragged.length) return;
            var otherGesture = dragged[dragged.length - 1];
            var otherRibbon = otherRibbons.get(data.id);
            if (!otherRibbon) return;

            var dragStart = otherGesture.getStartTime();
            var t = dragStart + data.t;
            otherRibbon.addPoint(otherGesture, t, data.color, $canvasParams.alpha, data.x, data.y);
        }

        if (data.e === 'RELEASED') {
            var releaseLayer = data.layer;
            var released = otherGestures[releaseLayer].get(data.id);
            if (!released || !released.length) return;
            var releasedGesture = released[released.length - 1];
            var releasedRibbon = otherRibbons.get(data.id);
            if (!releasedRibbon) return;

            var releaseStart = releasedGesture.getStartTime();
            var releasedT1 = releaseStart + data.t;
            releasedRibbon.addPoint(releasedGesture, releasedT1, data.color, $canvasParams.alpha, data.x, data.y);
            releasedGesture.setLooping(data.looping);
            releasedGesture.setEndTime(releasedT1);
        }
    }

    function deleteHandler(data) {
        var layer = data.layer;
        var gestureId = data.id;
        var gestures = null;
        if (otherGestures[layer]) gestures = otherGestures[layer].get(gestureId);
        if (!gestures || !gestures.length) return;
        for (var idx in gestures) {
            var gesture = gestures[idx];
            gesture.looping = false;
            gesture.fadeOutFact = DELETE_FACTOR;
        }
    }

    function gestureStart(p5) {
        if ($openModals) return false;

        if (handModeActive) {
            startPan(p5);
            return false;
        }

        var t0 = p5.millis();
        var point = getBoardPointer(p5);

        $currentGesture = new StrokeGesture(
            p5,
            $canvasParams.dissapearing,
            $canvasParams.fixed,
            $prevGesture,
            $canvasParams.layer,
            $canvasParams.loopMultiplier
        );
        $currentGesture.setStartTime(t0);

        $currentRibbon = new Ribbon(p5);
        $currentRibbon.init($canvasParams.ribbonWidth);
        $currentRibbon.addPoint($currentGesture, t0, $canvasParams.color, $canvasParams.alpha, point.x, point.y);

        var movement = {
            e: 'PRESS',
            x: point.x,
            y: point.y,
            t: t0,
            color: $canvasParams.color,
            stroke_weight: $canvasParams.ribbonWidth,
            layer: $canvasParams.layer,
            fixed: $canvasParams.fixed,
            id: $id
        };

        $socket.emit('externalMouseEvent', movement);
        return false;
    }

    function gestureDrag(p5) {
        if (handModeActive) return dragPan(p5);
        if ($openModals) return false;

        if ($currentGesture) {
            var t = p5.millis();
            var t0 = $currentGesture.getStartTime();
            var point = getBoardPointer(p5);

            var movement = {
                e: 'DRAGGED',
                x: point.x,
                y: point.y,
                t: t - t0,
                color: $canvasParams.color,
                stroke_weight: $canvasParams.ribbonWidth,
                layer: $canvasParams.layer,
                id: $id
            };
            $socket.emit('externalMouseEvent', movement);

            $currentRibbon.addPoint($currentGesture, t, $canvasParams.color, $canvasParams.alpha, point.x, point.y);
        }

        return false;
    }

    function gestureFinish(p5) {
        if (handModeActive) return endPan();
        if ($openModals) return false;

        if ($currentGesture) {
            var t1 = p5.millis();
            var t0 = $currentGesture.getStartTime();
            var point = getBoardPointer(p5);

            $currentRibbon.addPoint($currentGesture, t1, $canvasParams.color, $canvasParams.alpha, point.x, point.y);
            $currentGesture.setLooping($canvasParams.looping);
            $currentGesture.setEndTime(t1);

            if ($currentGesture.visible) {
                $layers[$canvasParams.layer] = [...$layers[$canvasParams.layer], $currentGesture];
            }

            var movement = {
                e: 'RELEASED',
                x: point.x,
                y: point.y,
                t: t1 - t0,
                color: $canvasParams.color,
                stroke_weight: $canvasParams.ribbonWidth,
                layer: $canvasParams.layer,
                looping: $canvasParams.looping,
                id: $id
            };

            $socket.emit('externalMouseEvent', movement);

            $prevGesture = $currentGesture;
            $currentGesture = null;
        }

        return false;
    }
</script>

<style>
    .canvas-stage {
        inset: 0;
        position: fixed;
    }

    .canvas-stage.pencil-mode :global(canvas) {
        cursor: crosshair;
    }

    .canvas-stage.hand-mode :global(canvas) {
        cursor: grab;
    }

    .canvas-stage.hand-mode.panning :global(canvas) {
        cursor: grabbing;
    }

    .canvas-stage :global(canvas) {
        display: block;
        touch-action: none;
    }

    .viewport-indicator {
        background: rgba(12, 18, 15, 0.9);
        border: 1px solid rgba(0, 255, 102, 0.42);
        border-radius: 10px;
        bottom: 78px;
        color: #dcffe8;
        font-family: var(--trz-font-ui);
        left: 14px;
        letter-spacing: 0.02em;
        padding: 10px;
        pointer-events: none;
        position: fixed;
        width: 182px;
        z-index: 140;
    }

    .indicator-label {
        font-size: 0.68rem;
        font-weight: 600;
        margin-bottom: 2px;
        text-transform: uppercase;
    }

    .indicator-subtext {
        color: #9fd3b2;
        font-size: 0.62rem;
        margin-bottom: 8px;
    }

    .mini-map {
        background: linear-gradient(180deg, rgba(255, 255, 255, 0.06), rgba(255, 255, 255, 0.03));
        border: 1px solid rgba(255, 255, 255, 0.14);
        border-radius: 8px;
        height: var(--mini-map-height);
        overflow: hidden;
        position: relative;
        width: 160px;
    }

    .mini-map-view {
        background: rgba(0, 255, 102, 0.16);
        border: 2px solid rgba(0, 255, 102, 0.9);
        border-radius: 5px;
        box-sizing: border-box;
        min-height: 8px;
        min-width: 8px;
        position: absolute;
    }

    .counter {
        color: white;
        display: none;
        font-size: x-large;
        margin: 32px;
        position: absolute;
        right: 0;
        z-index: 9999999;
    }

    @media (max-width: 720px) {
        .viewport-indicator {
            bottom: 146px;
        }
    }
</style>
