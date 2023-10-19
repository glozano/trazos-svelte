<script>
    import Button, { Label } from '@smui/button';
    import { goto } from '$app/navigation';

    import logo from '$lib/images/logo.png'

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

<div class="home-wrapper">
    <div class="home">
        <img class="home-logo" src={logo} alt="Trazos club"/>
    
        <Button on:click={() => goToBoard()} variant="raised">
            <Label>¡A dibujar!</Label>
          </Button>
    </div>    
</div>


<style>
    
    .home-wrapper{
        display: flex;
        height: 100vh;
        justify-content: center;
    }
    .home{
        width:300px;
        margin: auto;
        justify-self: center;
        display: flex;
        flex-direction: column;
    }
    .home-logo{
        margin-bottom:32px;
    }
    :global(.home .mdc-button){
        border-radius: 30px;
    }
</style>
