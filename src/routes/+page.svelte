<script>
    import Button, { Label } from '@smui/button';
    import { goto } from '$app/navigation';
    import FloatingDrawingOptions from '$lib/components/canvas/DrawingOptions.svelte';
    import Header from '$lib/components/Header.svelte';

    import logo from '$lib/images/logo.png'
    import BackgroundSketch from '$lib/components/BackgroundSketch.svelte';

    function generateRandomString(length) {
        const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
        let result = '';
        for (let i = 0; i < length; i++) {
            result += characters.charAt(Math.floor(Math.random() * characters.length));
        }
        return result;
    }

    function goToBoard() {
       goto(`/board/${generateRandomString(6)}`, true );
    }
</script>
<div class="home">
    <Header></Header>
    <BackgroundSketch></BackgroundSketch>
    <FloatingDrawingOptions></FloatingDrawingOptions>
    <div class="home-wrapper">
        <div class="home">
            <img class="home-logo" src={logo} alt="Trazos club"/>
            <Button on:click={() => goToBoard()} variant="raised">
                <Label>¡A dibujar!</Label>
            </Button>
            <Button on:click={() => goto('/info')} variant="outlined" class="test">
                <Label>¿Qué es Trazos Club?</Label>
            </Button>
        </div>    
        
    </div>
    
    
</div>


<style>
    
    .home-wrapper{
        display: flex;
        position: fixed;
        background-color: rgba(0, 0, 0, 0.6);
        height: 100vh;
        width: 100vw;
        justify-content: center;
        z-index: 10;
    }
    .home{
        width:50vw;
        margin: auto;
        justify-self: center;
        display: flex;
        flex-direction: column;
        align-items: center;
    }
    .home-logo{
        margin-bottom:32px;
        width: inherit;
        max-width: 600px;
        min-width: 400px;
    }
    :global(.home .mdc-button){
        border-radius: 30px;
        margin-bottom: 16px;
        padding: 24px;
        width: 300px;
    }
    :global(.home canvas){
        position: absolute;
        left: 0;
    }
    
</style>
