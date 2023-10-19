<script>
    import TopAppBar, {
        Row,
        Section,
    } from '@smui/top-app-bar';
    import IconButton from '@smui/icon-button';
    import logo from '$lib/images/logo.png'
    import ChatIcon from '$lib/components/icons/chatIcon.svelte';
    import ShareIcon from '$lib/components/icons/ShareIcon.svelte';
    import GifIcon from '$lib/components/icons/gifIcon.svelte';
    import ShareDialog from './dialogs/ShareDialog.svelte';
    import ChatDialog from './dialogs/ChatDialog.svelte';
    import GifDialog from './dialogs/GifDialog.svelte';
    import { gifStore } from '$lib/stores/gifStore';
        
    let topAppBar;
    let chatMessages = 0;
    let chatDialog = false;
    let gifDialog = false;
    let shareDialog = false;

    let triggerGifModal = () => {
        gifDialog = true; 
        $gifStore.triggerCreateGif();
    };
</script>

<TopAppBar bind:this={topAppBar} variant="fixed" class="mdc-theme--surface">
    <Row>
      <Section>
        <IconButton class="material-icons">menu</IconButton>
        <a class="logo-link" href="/"><img src={logo} alt="Trazos club" height="30"/></a>
      </Section>
      <Section align="end" toolbar>
        <IconButton aria-label="Invite friend" on:click={()=>(shareDialog = true)}>
          <ShareIcon></ShareIcon>
        </IconButton>
        <IconButton aria-label="Create GIF" on:click={triggerGifModal}>
          <GifIcon></GifIcon>
        </IconButton>
        <IconButton 
            aria-label="Open chat" 
            on:click={() => {
                chatDialog = true; 
                chatMessages = 0;
                }}>
            {#if chatMessages > 0}
                <span class="new-messages-badge">{chatMessages}</span>
            {/if}    
            <ChatIcon></ChatIcon>
        </IconButton>
      </Section>
    </Row>
  </TopAppBar>

  <ShareDialog bind:showDialog={shareDialog}></ShareDialog>
  <GifDialog bind:showDialog={gifDialog}></GifDialog>
  <ChatDialog bind:showDialog={chatDialog} bind:unreadNum={chatMessages}></ChatDialog>
   
<style>
    .logo-link{
        height: 30px;
    }
    .link-row{
        padding-top: 16px;
    }
    :global(.link-row label){
        width: 100%;
    }
    .new-messages-badge{
        background-color: #fa3e3e;
        border-radius: 100%;
        color: #fff;
        padding: 2px 5px;
        font-size: 12px;
        position: absolute;
        right: 4px;
        top: 4px;
        z-index: 99;
    }
    /* Snackbar */
    :global(.mdc-snackbar){
        margin-bottom: 75px;
    }
    :global(.mdc-snackbar__surface){
        background-color: #212125;
    }
    :global(.mdc-snackbar__label){
        color: white;
    }
    :global(.mdc-dialog .mdc-dialog__scrim) {
        background-color: rgba(255,255,255,.32);
    }
    /* Text input */
    *
    :global(.shaped-outlined
      .mdc-notched-outline
      .mdc-notched-outline__leading) {
        border-radius: 28px 0 0 28px;
        width: 28px;
    }
    *
    :global(.shaped-outlined
        .mdc-notched-outline
        .mdc-notched-outline__trailing) {
        border-radius: 0 28px 28px 0;
    }
    * :global(.shaped-outlined .mdc-notched-outline .mdc-notched-outline__notch) {
        max-width: calc(100% - 28px * 2);
    }
    *
        :global(.shaped-outlined.mdc-text-field--with-leading-icon:not(.mdc-text-field--label-floating)
        .mdc-floating-label) {
        left: 16px;
    }
    * :global(.shaped-outlined + .mdc-text-field-helper-line) {
        padding-left: 32px;
        padding-right: 28px;
    }
</style>