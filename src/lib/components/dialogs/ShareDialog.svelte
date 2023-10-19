
<script>
    import Dialog, { Title, Content, Actions } from '@smui/dialog';
    import Icon from '@smui/textfield/icon';
    import Button, { Label } from '@smui/button';
    import { page } from '$app/stores';
    import Snackbar from '@smui/snackbar';
    import Textfield, {Input} from '@smui/textfield';
    export let showDialog = false;

    let copySnackbar;
    function copyToClipboard(text){
        navigator.clipboard.writeText(text);
        copySnackbar.open();
    }
</script>

<Dialog bind:open={showDialog} >
    <Title>Invitar al tablero</Title>
    <Content id="share-content">
        <span>Comparte la URL y dibuja con otrxs</span>
        <p class="link-row">
            <Textfield
                class="shaped-outlined"
                variant="outlined"
                value={$page.url}
                label="URL del tablero">
                <Icon class="material-icons" slot="leadingIcon">link</Icon>
            </Textfield>
        </p>
        <!-- <p class="social row">
            <span>O desde las redes: </span>
            <IconButton class="material-icons" >fa-facebook-official</IconButton>
        </p> -->
    </Content>
    <Actions>
        <Button on:click={()=>copyToClipboard($page.url)}>
            <Label>Copiar link</Label>
        </Button>
        <Button>
            <Label>Cerrar</Label>
        </Button>
    </Actions>
</Dialog>
<Snackbar bind:this={copySnackbar}>
    <Label>URL copiada 💚</Label>
</Snackbar>

<style>

</style>