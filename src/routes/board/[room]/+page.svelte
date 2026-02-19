<script>
    import '$lib/styles/trazos-theme.css';
    import { onDestroy, onMount } from 'svelte';
    import TrazosCanvas from '$lib/components/canvas/TrazosCanvas.svelte';
    import FloatingDrawingOptions from '$lib/components/canvas/DrawingOptions.svelte';
    import {boardJoinEvent, boardReady, initSocket, joinedExistingBoard, onlineUsernames, onlineUsers} from '$lib/stores/socketStore';
    import { page } from '$app/stores';
    import Header from '$lib/components/Header.svelte';
    import { canvasUsername, loadCanvasUsername } from '$lib/stores/usernameStore';
    import { languageStore } from '$lib/stores/languageStore';
    
    var roomId = $page.params.room;
    var createPrivateBoard = $page.url.searchParams.get('private') === '1';
    initSocket(roomId, { private: createPrivateBoard });

    let joinNotification = null;
    let joinNotificationId = null;
    let joinToastTimeout = null;
    let showOnlineUsers = false;
    let renameModalTrigger = 0;

    function normalizeUsername(username) {
        if (typeof username !== 'string') return '';
        return username.trim().toLocaleLowerCase();
    }

    onMount(() => {
        loadCanvasUsername();
    });

    onDestroy(() => {
        if (joinToastTimeout) clearTimeout(joinToastTimeout);
    });

    $: forceUsernamePrompt = $boardReady && $joinedExistingBoard && !$canvasUsername;
    $: onlineUsersLabel = $languageStore === 'es' ? 'en línea' : 'online';
    $: joinedMessage = $languageStore === 'es' ? 'se unió a la sala' : 'joined the board';
    $: onlineListTitle = $languageStore === 'es' ? 'Usuarios conectados' : 'Connected users';
    $: anonymousUserLabel = $languageStore === 'es' ? 'Sin sobrenombre' : 'No nickname';
    $: selfLabel = $languageStore === 'es' ? 'Tú' : 'You';
    $: renameLabel = $languageStore === 'es' ? 'Cambiar nombre' : 'Change name';
    $: selfNormalizedUsername = normalizeUsername($canvasUsername);
    $: selfUsernameIndex = $onlineUsernames.findIndex(
        (username) => Boolean(selfNormalizedUsername) && normalizeUsername(username) === selfNormalizedUsername
    );

    $: if (!forceUsernamePrompt && $boardJoinEvent && $boardJoinEvent.id !== joinNotificationId) {
        if ($boardJoinEvent.username) {
            joinNotificationId = $boardJoinEvent.id;
            joinNotification = `${$boardJoinEvent.username} ${joinedMessage}`;
            if (joinToastTimeout) clearTimeout(joinToastTimeout);
            joinToastTimeout = setTimeout(() => {
                joinNotification = null;
            }, 2600);
        }
    }
</script>

<div class="canvas-wrapper">
    <Header forceUsernamePrompt={forceUsernamePrompt} {renameModalTrigger}></Header>

    <div class="presence-control">
      <button
          class="presence-pill"
          type="button"
          on:click={() => (showOnlineUsers = !showOnlineUsers)}
          aria-expanded={showOnlineUsers}
          aria-label={onlineListTitle}
      >
          <span class="presence-dot"></span>
          <span>{$onlineUsers} {onlineUsersLabel}</span>
      </button>
    </div>
    {#if showOnlineUsers}
        <div class="online-users-list">
            <h2>{onlineListTitle}</h2>
            <ul>
                {#if $onlineUsernames.length}
                    {#each $onlineUsernames as username, index}
                        <li>
                            <span>{username || anonymousUserLabel}</span>
                            {#if index === selfUsernameIndex}
                                <span class="online-user-meta">
                                    <span class="self-tag">{selfLabel}</span>
                                    <button
                                        class="rename-list-btn"
                                        type="button"
                                        aria-label={renameLabel}
                                        title={renameLabel}
                                        on:click={() => {
                                            renameModalTrigger += 1;
                                        }}
                                    >✎</button>
                                </span>
                            {/if}
                        </li>
                    {/each}
                {:else}
                    <li>{anonymousUserLabel}</li>
                {/if}
            </ul>
        </div>
    {/if}
    {#if joinNotification}
        <div class="join-toast">{joinNotification}</div>
    {/if}

    <TrazosCanvas></TrazosCanvas>
    
    <FloatingDrawingOptions></FloatingDrawingOptions>
</div>


<style>
    .canvas-wrapper{
        position: fixed;
        width: 100%;
    }
    .presence-control{
        align-items: center;
        display: flex;
        gap: 6px;
        position: fixed;
        right: 18px;
        top: 74px;
        z-index: 120;
    }
    .presence-pill{
        align-items: center;
        background: rgba(136, 136, 136, 0.267);
        border: 0;
        border-radius: 999px;
        cursor: pointer;
        display: flex;
        gap: 8px;
        color: #ffffff;
        font-family: var(--trz-font-ui);
        font-size: 0.78rem;
        letter-spacing: 0.04em;
        padding: 8px 12px;
    }
    .presence-dot{
        background: #00ff66;
        border-radius: 999px;
        display: inline-block;
        height: 8px;
        width: 8px;
    }
    .online-users-list{
        background: rgba(20, 25, 30, 0.92);
        border-radius: 10px;
        color: #f5f7f9;
        font-family: var(--trz-font-ui);
        max-width: min(240px, 70vw);
        padding: 10px 12px;
        position: fixed;
        right: 18px;
        top: 114px;
        z-index: 120;
    }
    .online-users-list h2{
        font-size: 0.72rem;
        letter-spacing: 0.05em;
        margin: 0 0 8px;
        text-transform: uppercase;
    }
    .online-users-list ul{
        list-style: none;
        margin: 0;
        max-height: 180px;
        overflow-y: auto;
        padding: 0;
    }
    .online-users-list li{
        align-items: center;
        border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        display: flex;
        font-size: 0.8rem;
        justify-content: space-between;
        padding: 6px 0;
    }
    .self-tag{
        background: rgba(0, 255, 102, 0.22);
        border-radius: 999px;
        color: #b5ffd2;
        font-family: var(--trz-font-ui);
        font-size: 0.65rem;
        letter-spacing: 0.04em;
        padding: 2px 7px;
        text-transform: uppercase;
    }
    .online-user-meta{
        align-items: center;
        display: inline-flex;
        gap: 6px;
    }
    .rename-list-btn{
        align-items: center;
        background: rgba(255, 255, 255, 0.16);
        border: 0;
        border-radius: 999px;
        color: #f7fbff;
        cursor: pointer;
        display: inline-flex;
        font-size: 0.78rem;
        height: 20px;
        justify-content: center;
        line-height: 1;
        width: 20px;
    }
    .rename-list-btn:hover{
        background: rgba(255, 255, 255, 0.25);
    }
    .online-users-list li:last-child{
        border-bottom: 0;
    }
    .join-toast{
        background: rgba(10, 16, 11, 0.96);
        border: 1px solid rgba(0, 255, 0, 0.6);
        border-radius: 12px;
        color: #f5fff4;
        font-family: var(--trz-font-ui);
        font-size: 0.78rem;
        letter-spacing: 0.03em;
        max-width: min(320px, 72vw);
        padding: 10px 12px;
        position: fixed;
        right: 18px;
        top: 114px;
        z-index: 120;
    }

    @media (max-width: 720px) {
        .presence-control {
            right: 12px;
            top: 68px;
        }
        .online-users-list {
            right: 12px;
            top: 102px;
        }
        .join-toast {
            right: 12px;
            top: 144px;
        }
    }
</style>
