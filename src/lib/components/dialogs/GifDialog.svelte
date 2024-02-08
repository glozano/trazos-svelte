<script>
    import Dialog, { Title, Content, Actions } from '@smui/dialog';
    import IconButton from '@smui/icon-button';
    import GiphyLogo from '$lib/images/giphy_logo.png'
    import { page } from '$app/stores';
    export let showDialog = false;
    import { gifStore } from '$lib/stores/gifStore';
    import {p,canvas} from '$lib/stores/boardStore';
    import { createGIF } from 'gifshot';

    let gifStatus = "Grabando el lienzo";
    // "Generando Gif"

    let loading = true;
    let uploadSuccess = false;
    
    const urlSplit = $page.url.href.split('/');
    const hostAndPort = urlSplit[0] + '//' + urlSplit[2] + '/';

    let currentGif = null;
    let currentGiphyId = null;
    let giphyResponse = null;

    var _createGif = function(cb){
        loading = true;
        var r = $canvas.width / $canvas.height;
        var gifw = 500;
        var gifh = Math.round(gifw / r);
        gifStatus = "Grabando el lienzo";
        $p.saveFrames("out", "png", 5, 6, function(data) {
            gifStatus = "Generando GIF";
            var images = []
            for (var i = 0; i < data.length; i++) {
                images.push(data[i].imageData);
            }
            var settings = {
                'images': images,
                'gifWidth': gifw,
                'gifHeight': gifh
            };
            createGIF(settings, function(gif) {
                if(!gif.error) {
                    console.log("Gif created successfuly");
                    loading = false;
                    currentGif = gif.image;
                }else{
                    console.log("Error creating gif");
                }
            });
        });
    }

    // var uploadToServer = function(cb){
    //     $.ajax({
    //         type: "POST",
    //         url: hostAndPort + 'files',
    //         data: gif.currentGif,
    //         success: function(data) {
    //             console.log("Success uploading to server");
    //             cb(data)
    //         },
    //         error: function(obj){
    //             console.log("Error uploading to server");
    //             cb(obj);
    //         },
    //         dataType: 'json'
    //     });
    // }
    const uploadToServer = async () => {
        try {
            const response = await fetch(hostAndPort + 'files', {
                method: 'POST',
                body: currentGif,
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error('Network response was not ok');
            }

            const data = await response.json();
            console.log("Success uploading to server");
            return data;
        } catch (error) {
            console.error("Error uploading to server", error);
            throw error;
        }
    };

    const uploadToGiphy = async () => {
        try {
            loading = true;
            gifStatus = "Preparando GIF";
            const serverData = await uploadToServer();
            gifStatus = "Subiendo GIF a GIPHY";
            // console.log("Subiendo a GIPHY");
            const formData = new FormData();
            formData.append('api_key', 'phMDT8Jy1QVT2ftqfB8XKbRoaG0RDT7K');
            formData.append('username', 'trazosclub');
            formData.append('source_image_url', hostAndPort + serverData.filename);
            formData.append('tags', 'trazos,trazosclub,processing,collaborative,drawing,draw');

            const response = await fetch('https://upload.giphy.com/v1/gifs', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                throw new Error('Network response was not ok');
            }

            giphyResponse = await response.json();
            loading = false;
            currentGiphyId = giphyResponse.data.id;
            currentGif = "https://media.giphy.com/media/" + currentGiphyId + "/giphy.gif";
            uploadSuccess=true;
            // console.log("Success uploading to giphy");
        } catch (error) {
            loading=false;
            gifStatus = "Algo salió mal subiendo el GIF, proba de nuevo!";
            setTimeout(() => {
                gifStatus = "";
            }, 3000);
            console.error("There was an error when uploading to Giphy", error);
        }
    };

    var copyLink = function () {
        if(currentGiphyId){
            gifStatus = "¡Copiado!";
            navigator.clipboard.writeText("https://media.giphy.com/media/"+currentGiphyId+"/giphy.gif");
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

    // var download = function () {
    //     // $("#download").attr("href",);
    // };



    $gifStore.triggerCreateGif = _createGif;
</script>

<Dialog bind:open={showDialog}>
    {#if loading}
        <Content>
            <div class="gif-dialog">
                <div class="giphy-header">
                    <img src={GiphyLogo}/>
                </div>
                <div class="trazos-spinner"></div>
                <div class="gif-status">
                    {gifStatus}
                </div>
            </div>
        </Content>
    {:else}
        <Content>
            <div class="gif-dialog">
                    <div class="giphy-header">
                        <img src={GiphyLogo}/>
                    </div>
                <img src={currentGif}  alt="Generated Gif" class="gen-gif"/>
                <div class="gif-actions">
                    {#if !uploadSuccess}
                        <div class="vertical-btn">
                            <IconButton class="material-icons link" on:click={()=>{_createGif()}}>
                                refresh
                            </IconButton>
                            <span>Generar de nuevo</span>
                        </div>
                        <div class="vertical-btn">
                            <IconButton class="material-icons download" on:click={()=>{uploadToGiphy()}}>
                                upload
                            </IconButton>
                            <span>Subir a GIPHY y compartir</span>
                        </div>            
                    {:else}
                        <div class="vertical-btn">
                            <IconButton class="material-icons link" on:click={()=>{copyLink()}}>
                                link
                            </IconButton>
                            <span>Copiar link</span>
                        </div>
                        <div class="vertical-btn">
                            <IconButton class="material-icons download" target="_blank" href={"https://media.giphy.com/media/"+currentGiphyId+"/giphy.mp4"}>
                                download
                            </IconButton>
                            <span>Descargar o compartir de Giphy</span>
                        </div>
                        
                    {/if}
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