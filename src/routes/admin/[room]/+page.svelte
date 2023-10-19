<script>
    import TrazosCanvas from '$lib/components/canvas/TrazosCanvas.svelte';
    import FloatingDrawingOptions from '$lib/components/canvas/DrawingOptions.svelte';
    import {initSocket} from '$lib/stores/socketStore';
    import { page } from '$app/stores';
    import Header from '$lib/components/Header.svelte';
    
    // var runIntro = window.location.href.includes("intro");
    var roomId = $page.params.room;
    initSocket(roomId);
    var shareModal=true;
</script>


<Header></Header>

<TrazosCanvas></TrazosCanvas>

<FloatingDrawingOptions></FloatingDrawingOptions>

<div class="counter">2000</div>

<style>
    :global(body){
        margin: 0;
        overscroll-behavior: none;
    }
    .counter{
        position: absolute;
        bottom: 0;
        right: 0;
        color: white;
        font-size: x-large;
        z-index: 9999999;
    }
</style>