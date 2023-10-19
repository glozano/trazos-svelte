<script>
    import { fade } from 'svelte/transition';
    import LoopIcon from '$lib/components/icons/LoopIcon.svelte';
    import NoloopIcon from '$lib/components/icons/NoloopIcon.svelte';
    import trash from '$lib/images/icons/delete.png';
    import {canvasParams, layers} from '$lib/stores/boardStore';
    import {deleteLayer} from '$lib/stores/socketStore';
    import FloatingOption from '$lib/components/canvas/FloatingOption.svelte';
    import LayersIcon from '$lib/components/icons/LayersIcon.svelte';
    import {DELETE_FACTOR} from '$lib/andiamo/parameters';
    import SpeedIcon from '$lib/components/icons/SpeedIcon.svelte';
    import { onMount } from 'svelte';

    let minSize = 0.1;
    let maxSize = 2;
   
    let maxSpeed = 8;
    let minSpeed = 0;
    let speedInputValue;

    var colors = [
        { "css": "#000000", "rgb": [0, 0, 0] },
        { "css": "#ffffff", "rgb": [255, 255, 255] },
        { "css": "#ff0000", "rgb": [255, 0, 0] },
        { "css": "#ff4b00", "rgb": [255, 75, 0] },
        { "css": "#ffff00", "rgb": [255, 255, 0] },
        { "css": "#00ff6e", "rgb": [0, 255, 110] },
        { "css": "#0049ff", "rgb": [0, 73, 255] },
        { "css": "#af00ff", "rgb": [175, 0, 255] }
    ];

    let _layers = [0,1,2,3];

    onMount(() => {
        speedInputValue = adjustSpeed($canvasParams.loopMultiplier);
    });

    function triggerDelete(i){
        for (var j = $layers[i].length - 1; j >= 0; j--) {
            $layers[i][j].looping = false;
            $layers[i][j].fadeOutFact = DELETE_FACTOR;
        }
        deleteLayer(i);
    }
    
    function adjustSpeed(input) {
        if(input == minSpeed){
            $canvasParams.fixed = true;
        }else{
            $canvasParams.fixed = false;
        }
        return map(input, minSpeed, maxSpeed, maxSpeed, minSpeed);
    }

    const map = (value, x1, y1, x2, y2) => (value - x1) * (y2 - x2) / (y1 - x1) + x2;

    function setColor(color){
        $canvasParams.color = color;
    }

</script>


<div class="bottom-bar">
    <div class="floating-left">
        <FloatingOption>
            <div slot="optionSelector">
                <div class="layers-selector">
                    {#each _layers as layer}
                        <div class="layer-line">
                            <div 
                                class="layer-button" 
                                style={`background-color:${$canvasParams.layer == layer ? "#45ff4d59" : "#45454d91"}`}
                                on:click={()=>{$canvasParams.layer = layer}}
                                
                                >
                                <svg viewBox="187.6805 115.4854 102.155 46.7506" width="40" height="19">
                                <g id="g-4" transform="matrix(1, 0, 0, 1, -302.90844726562506, -708)">
                                    <path id="path-7" style="fill: none; fill-opacity: 1; stroke: rgb(32, 32, 32); stroke-width: 4.735; stroke-linecap: butt; stroke-linejoin: bevel; stroke-miterlimit: 10; stroke-dasharray: none; stroke-opacity: 1;" d="M 592.744 847.073 L 541.666 870.236 L 490.589 847.073"></path>
                                    <path d="m 541.69918,866.34295 -45.79625,-21.42875 45.79625,-21.42875 45.795,21.42875 -45.795,21.42875 z" 
                                    style={`fill:${$canvasParams.layer == layer ? "#00FF00" : "#202020"};fill-opacity:1;stroke:${$canvasParams.layer == layer ? "#00FF00" : "#696969"};stroke-width:3.75;stroke-linecap:butt;stroke-linejoin:miter;stroke-miterlimit:10;stroke-dasharray:none;stroke-opacity:1`} 
                                    id="path-8"></path>
                                </g>
                                </svg>
                                <span>
                                    Capa {layer+1}
                                </span>
                            </div>
                            <div class="layer-delete" on:click={()=>triggerDelete(layer)}>
                                <img src={trash} alt="delete-layer"/>
                            </div>
                        </div>
                    {/each}
                </div>
            </div>
            <div slot="selectedOption">
                <div class="selected-layer">
                    <LayersIcon active={$canvasParams.layer}></LayersIcon>
                </div>    
            </div>
        </FloatingOption>
    </div>
    <div class="floating-right">
        <FloatingOption>
            <div slot="selectedOption">
                <!-- on:click={()=>$canvasParams.looping = !$canvasParams.looping} -->
                <div class="selected-loop" on:click={()=>$canvasParams.looping = !$canvasParams.looping}>
                    {#if $canvasParams.looping}
                        <LoopIcon></LoopIcon>
                    {:else}
                        <NoloopIcon></NoloopIcon>
                    {/if}
                </div>    
            </div>
        </FloatingOption>
        <FloatingOption>
            <div slot="optionSelector">
                <div class="range-slider">
                    <input 
                        bind:value={speedInputValue} 
                        on:input={() => $canvasParams.loopMultiplier = adjustSpeed(speedInputValue)}
                        class="input-range" 
                        orient="vertical" 
                        type="range" 
                        step="0.1" 
                        min="{minSpeed}" 
                        max="{maxSpeed}"
                        >
                </div>
            </div>
            <div slot="selectedOption">
                <div class={`selected-speed ${$canvasParams.fixed ? "fixed" : ""}`}>
                    <SpeedIcon speed={$canvasParams.loopMultiplier} minSpeed="{minSpeed}" maxSpeed="{maxSpeed}" ></SpeedIcon>
                </div>    
            </div>
        </FloatingOption>
        <FloatingOption>
            <div slot="optionSelector">
                <div class="range-slider">
                    <input bind:value={$canvasParams.ribbonWidth} class="input-range" orient="vertical" type="range" step="0.1" min="{minSize}" max="{maxSize}">
                </div>
            </div>
            <div slot="selectedOption">
                <div class="selected-size" 
                    style={`
                        width: ${map($canvasParams.ribbonWidth,minSize,maxSize,10,95)}%; 
                        height: ${map($canvasParams.ribbonWidth,minSize,maxSize,10,95)}%;`
                    }
                />
            </div>
        </FloatingOption>
        <FloatingOption>
            <div slot="optionSelector">
                <div class="color-options" transition:fade={{ delay: 100, duration: 200 }}>
                    {#each colors as color, i}
                        <div class="floating-opt color-opt" on:click={()=>setColor(color.rgb)}>
                            <div class="selected-color" style="background-color: {color.css};"></div>
                        </div>
                    {/each}
                </div>
            </div>
            <div slot="selectedOption">
                <div class="selected-color" style={`background-color: ${colors.find(color => JSON.stringify(color.rgb) === JSON.stringify($canvasParams.color)).css}`}/>
            </div>
        </FloatingOption>
    </div>
</div>

<style lang="scss">
    .bottom-bar{
        display: flex;
        flex-direction: row;
        position: fixed;
        bottom: 0;
        width:100%;
        justify-content: space-between;
        align-items: end;
    }
   
    .floating-right{
        display: flex;
        flex-direction: row;
        align-items: end;
    }
    .selected-layer,.selected-speed,.selected-loop{
        display: flex;
        margin: auto;
    }
    
    .selected-color{
        width: 90%;
        margin: auto;
        height: 90%;
        border-radius: 100%;
    }
    .selected-size{
        background-color: rgb(176, 176, 176);
        margin: auto;
        align-self: center;
        width: 100%;
        height: 100%;
        border-radius: 100%;
    }
    /* Slider */
    .range-slider{
        background-color: #212125;
        border-radius: 20px;
        display: flex;
        margin:8px;
        padding: 20px 0;
        border: 0.5px solid rgba(128, 128, 128, 0.634);
    }
    .input-range {
        height: 250px;
        width: 100%;
        accent-color: #00ff00;
        writing-mode: bt-lr; /* IE */
        -webkit-appearance: slider-vertical; /* WebKit */
    }

    input[type="range"]::-webkit-slider-thumb {
        box-shadow: 0 0 4px 0 #00ff00;
        border-radius: 100%;
    }

    input[type="range"]::-webkit-slider-runnable-track  {
        -webkit-appearance: none;
        box-shadow: none;
        border: none;
        background: transparent;
    }

    /* Layers */

    .layers-selector{
        position: absolute;
        bottom: 75px;
        background-color: #212125;
        display: flex;
        flex-direction: column;
        padding: 8px;
        border-radius: 12px;
        margin-left: 8px;
    }
    .layer-line{
        display: flex;
        align-items: center;
        padding:4px;
    }
    .layer-button{
        display: flex;
        flex-direction: row;
        align-items: center;
        background-color: #45454d91;
        border-radius: 6px;
        margin-right: 16px;
        padding-left: 8px;
        cursor: pointer;
    }
    .layer-button span{
        font-family: monospace;
        display: block;
        padding: 20px;
    }
    .layers-selector svg{
        
    }
    .layers-selector img{
        width: 20px;
    }
    .layer-delete{
        cursor: pointer;
    }

    :global(.fixed svg){
        fill:  rgb(176, 176, 176) !important;
    }

    @media (min-width: 768px){
        .bottom-bar{
            display: flex;
            flex-direction: column-reverse;
            position: fixed;
            width: auto;
            top: 80px;
            justify-content: start;
        }
        .floating-right{
            flex-direction: column-reverse;
            align-items: end;
        }
        .color-options{
            display: flex;
            flex-direction: row;
            width: fit-content;
            position: absolute;
            left: 70px;
        }
        .floating-opt{
            display: flex;
            flex-direction: row-reverse;
            justify-content: start;
        }
        .floating-opt-wrapper{
            display: flex;
            flex-direction: row-reverse;
            justify-content: start;
        }
        .input-range {
            appearance:auto;
            height: 15px;
            margin: 0 16px;
        }
        .range-slider{
            position: absolute;
            left: 70px;
            height: 15px;
            width: 350px;
        }
        .layers-selector{
            left:75px;
            width: max-content;
            bottom: auto;
        }
    }
</style>