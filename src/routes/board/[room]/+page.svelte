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

<style>
    :global(body){
        margin: 0;
        overscroll-behavior: none;
    }
</style>