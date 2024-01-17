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

<div class="canvas-wrapper">
    <Header></Header>

    <TrazosCanvas></TrazosCanvas>
    
    <FloatingDrawingOptions></FloatingDrawingOptions>
</div>


<style>
    .canvas-wrapper{
        position: fixed;
    }
</style>