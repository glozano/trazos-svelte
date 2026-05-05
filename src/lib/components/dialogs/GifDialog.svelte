<script>
    import Dialog, { Content } from '@smui/dialog';
    import IconButton from '@smui/icon-button';
    import GiphyLogo from '$lib/images/giphy_logo.png'
    export let showDialog = false;
    import { onDestroy, onMount } from 'svelte';
    import { registerGifCreator } from '$lib/stores/gifStore';
    import {p,canvas} from '$lib/stores/boardStore';
    import { GIF_DEFAULTS } from '$lib/config/gif';
    import { captureCanvasFrames, encodeGif, getGifDimensions } from '$lib/utils/gif';

    const states = {
        idle: 'idle',
        capturing: 'capturing',
        encoding: 'encoding',
        preview: 'preview',
        uploading: 'uploading',
        uploaded: 'uploaded',
        error: 'error'
    };

    let status = states.idle;
    let gifStatus = '';
    let currentGif = null;
    let currentGiphyId = null;
    let currentMp4Url = null;
    let errorMessage = '';
    let unregisterGifCreator = null;

    $: loading = status === states.capturing || status === states.encoding || status === states.uploading;
    $: hasPreview = Boolean(currentGif) && (status === states.preview || status === states.uploaded);
    $: uploadSuccess = status === states.uploaded;
    $: downloadUrl = uploadSuccess ? currentMp4Url : currentGif;
    $: downloadLabel = uploadSuccess ? 'Descargar o compartir de Giphy' : 'Descargar GIF';

    onMount(() => {
        unregisterGifCreator = registerGifCreator(createGif);
    });

    onDestroy(() => {
        unregisterGifCreator?.();
    });

    async function createGif() {
        resetUploadState();
        status = states.capturing;
        gifStatus = 'Grabando el lienzo';

        try {
            const dimensions = getGifDimensions($canvas, GIF_DEFAULTS.width);
            const frames = await captureCanvasFrames($p, {
                seconds: GIF_DEFAULTS.seconds,
                fps: GIF_DEFAULTS.fps
            });

            status = states.encoding;
            gifStatus = 'Generando GIF';
            const dataUrl = await encodeGif(frames, dimensions);

            currentGif = dataUrl;
            status = states.preview;
            gifStatus = '';
        } catch (error) {
            showError(error);
        }
    }

    const uploadToGiphy = async () => {
        if (!currentGif || status === states.uploading) return;

        try {
            status = states.uploading;
            gifStatus = 'Subiendo GIF a GIPHY';

            const response = await fetch('/api/gifs/giphy', {
                method: 'POST',
                body: currentGif,
                headers: {
                    'Content-Type': 'text/plain'
                }
            });

            const data = await response.json().catch(() => null);
            if (!response.ok) {
                throw new Error(data?.error || 'No se pudo subir el GIF');
            }

            currentGiphyId = data.id;
            currentMp4Url = data.mp4Url;
            currentGif = data.gifUrl;
            status = states.uploaded;
            gifStatus = '';
        } catch (error) {
            showError(error);
        }
    };

    var copyLink = function () {
        if(currentGiphyId){
            gifStatus = "¡Copiado!";
            navigator.clipboard.writeText(currentGif);
            setTimeout(function(){
                gifStatus = "";
            },1500)
        }else{
            gifStatus = "Algo salió mal subiendo el GIF, proba de nuevo!";
            setTimeout(function(){
                gifStatus = "";
            },3000)
        }

    };

    function resetUploadState() {
        currentGif = null;
        currentGiphyId = null;
        currentMp4Url = null;
        errorMessage = '';
        gifStatus = '';
    }

    function showError(error) {
        status = states.error;
        errorMessage = error?.message || 'Algo salió mal, proba de nuevo!';
        gifStatus = errorMessage;
        console.error('GIF error:', error);
    }
</script>

<Dialog bind:open={showDialog}>
    {#if loading}
        <Content>
            <div class="gif-dialog">
                <div class="giphy-header">
                    <img src={GiphyLogo} alt="GIPHY"/>
                </div>
                <div class="trazos-spinner"></div>
                <div class="gif-status">
                    {gifStatus}
                </div>
            </div>
        </Content>
    {:else if hasPreview}
        <Content>
            <div class="gif-dialog">
                    <div class="giphy-header">
                        <img src={GiphyLogo} alt="GIPHY"/>
                    </div>
                <img src={currentGif}  alt="Generated Gif" class="gen-gif"/>
                <div class="gif-actions">
                    {#if !uploadSuccess}
                        <div class="vertical-btn">
                            <IconButton class="material-icons link" on:click={createGif}>
                                refresh
                            </IconButton>
                            <span>Generar de nuevo</span>
                        </div>
                        <div class="vertical-btn">
                            <IconButton class="material-icons download" on:click={uploadToGiphy} disabled={!currentGif}>
                                upload
                            </IconButton>
                            <span>Subir a GIPHY y compartir</span>
                        </div>
                        <div class="vertical-btn">
                            <IconButton class="material-icons download" target="_blank" href={downloadUrl} download="trazos.gif">
                                download
                            </IconButton>
                            <span>{downloadLabel}</span>
                        </div>
                    {:else}
                        <div class="vertical-btn">
                            <IconButton class="material-icons link" on:click={()=>{copyLink()}}>
                                link
                            </IconButton>
                            <span>Copiar link</span>
                        </div>
                        <div class="vertical-btn">
                            <IconButton class="material-icons download" target="_blank" href={downloadUrl}>
                                download
                            </IconButton>
                            <span>{downloadLabel}</span>
                        </div>
                        
                    {/if}
                </div>
            </div>  
        </Content>
    {:else}
        <Content>
            <div class="gif-dialog">
                <div class="giphy-header">
                    <img src={GiphyLogo} alt="GIPHY"/>
                </div>
                <div class="gif-status">
                    {gifStatus || errorMessage || 'No se pudo generar el GIF'}
                </div>
                <div class="gif-actions">
                    <div class="vertical-btn">
                        <IconButton class="material-icons link" on:click={createGif}>
                            refresh
                        </IconButton>
                        <span>Intentar de nuevo</span>
                    </div>
                </div>
            </div>
        </Content>
    {/if}
    
    
    
</Dialog>

<style>
    .gif-dialog{
        min-height: 30vh;
        justify-content: space-between;
        display: flex;
        flex-direction: column;
        align-items: center;
    }
    .gen-gif{
        height: 35vh;
        padding: 32px;
    }
    .gif-actions{
        display: flex;
        justify-content: center;
        width: 100%;
        align-items: baseline;
    }
    .vertical-btn{
        display: flex;
        flex:1;
        flex-direction: column;
        margin: 0 8px;
        justify-items: center;
        /* max-width: 180px; */
        text-align: center;
    }
    :global(.vertical-btn button, .vertical-btn a){
        margin:auto;
        background: #00FF00;
        border-radius: 100%;
        color: #2a2a2e;
        margin-bottom: 8px;
    }
    .trazos-spinner {
        position: absolute;
        width: 10vh;
        height: 10vh;
        top: 50%;
        left: 50%;
        margin-top: -5vh; /* As 10vh/2 = 5vh */
        margin-left: -5vh; /* As 10vh/2 = 5vh */
        perspective: 60vh;
        }

        .trazos-spinner:before,
        .trazos-spinner:after {
        content: " ";
        position: absolute;
        width: 100%;
        height: 100%;
        border-radius: 50%;
        }

        .trazos-spinner:before {
        left: -8vh; /* As 10vh/1.5 = 6.6667vh, but you wanted to move it further from the original */
        background: linear-gradient(135deg, rgb(122, 255, 118), rgba(61, 220, 43, 0.95));
        transform: translateZ(0vh);
        z-index: 1;
        animation: rotation1 1.5s ease-out infinite;
        }

        .trazos-spinner:after {
        right: -8vh; /* As 10vh/1.5 = 6.6667vh, but you wanted to move it further from the original */
        background: linear-gradient(135deg, rgba(226, 176, 255, 1), rgba(159, 68, 211, 0.95));
        transform: translateZ(0vh);
        z-index: 1;
        animation: rotation2 1.5s ease-out infinite;
        }

        @keyframes rotation1 {
        25% {
            left: 0;
            transform: translateZ(-10vh);
        }
        50% {
            left: 6.6667vh; /* As 10vh/1.5 = 6.6667vh */
            transform: translateZ(0vh);
        }
        75% {
            left: 0;
            transform: translateZ(20vh);
            z-index: 2;
        }
        }

        @keyframes rotation2 {
        25% {
            right: 0;
            transform: translateZ(20vh);
            z-index: 2;
        }
        50% {
            right: 6.6667vh; /* As 10vh/1.5 = 6.6667vh */
            transform: translateZ(0vh);
        }
        75% {
            right: 0;
            transform: translateZ(-10vh);
        }
        }

</style>
