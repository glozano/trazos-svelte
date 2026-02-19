<script>
  import '$lib/styles/trazos-theme.css';
  import { goto } from '$app/navigation';
  import { onDestroy, onMount } from 'svelte';
  import SiteNav from '$lib/components/SiteNav.svelte';
  import BackgroundSketch from '$lib/components/BackgroundSketch.svelte';
  import logo from '$lib/images/logo.png';
  import { copy } from '$lib/i18n/copy';
  import { languageStore } from '$lib/stores/languageStore';
  import { generateRoomId } from '$lib/utils/board';

  const ACTIVE_BOARDS_POLL_INTERVAL = 8000;

  let currentView = 'home';
  let roomInput = '';
  let activeBoards = [];
  let activeBoardsLoading = false;
  let activeBoardsPollTimer = null;

  $: text = copy[$languageStore];
  $: closeLabel = $languageStore === 'es' ? 'Volver al inicio' : 'Back to home';

  function goToBoard() {
    goto(`/board/${generateRoomId()}`);
  }

  function createPrivateBoard() {
    goto(`/board/${generateRoomId()}?private=1`);
  }

  function joinBoard() {
    const normalizedRoom = roomInput.trim();
    if (!normalizedRoom) return;
    goto(`/board/${normalizedRoom}`);
  }

  function showBoards() {
    currentView = 'boards';
  }

  function showHome() {
    currentView = 'home';
  }

  async function loadActiveBoards({ showLoading = false } = {}) {
    if (showLoading) activeBoardsLoading = true;

    try {
      const response = await fetch('/api/boards/active');
      if (!response.ok) throw new Error('active boards fetch failed');
      const data = await response.json();
      activeBoards = Array.isArray(data?.boards) ? data.boards : [];
    } catch {
      activeBoards = [];
    } finally {
      if (showLoading) activeBoardsLoading = false;
    }
  }

  function startActiveBoardsPolling() {
    if (activeBoardsPollTimer) return;

    void loadActiveBoards({ showLoading: true });
    activeBoardsPollTimer = setInterval(() => {
      void loadActiveBoards();
    }, ACTIVE_BOARDS_POLL_INTERVAL);
  }

  function stopActiveBoardsPolling() {
    if (!activeBoardsPollTimer) return;
    clearInterval(activeBoardsPollTimer);
    activeBoardsPollTimer = null;
  }

  onDestroy(() => {
    stopActiveBoardsPolling();
  });

  onMount(() => {
    startActiveBoardsPolling();
  });
</script>

<div class="home trazos-page">
  <BackgroundSketch />
  <div class="overlay"></div>
  <SiteNav
    current="home"
    labels={text.nav}
    language={$languageStore}
    on:languageChange={(event) => languageStore.set(event.detail)}
  />
  <main class="view-stage">
    <section
      class="hero panel"
      class:active={currentView === 'home'}
      aria-hidden={currentView !== 'home'}
      inert={currentView !== 'home'}
    >
      <p class="eyebrow">{text.home.eyebrow}</p>
      <img class="home-logo" src={logo} alt="Trazos.club" />
      <p class="description">{text.home.description}</p>
      <div class="actions">
        <button type="button" class="trazos-button" on:click={goToBoard}>{text.home.primaryCta}</button>
        <button type="button" class="trazos-button ghost" on:click={showBoards}>
          {text.home.secondaryCta}
          {#if activeBoards.length > 0}
            <span class="boards-counter">({activeBoards.length})</span>
          {/if}
        </button>
        <button type="button" class="trazos-button neutral" on:click={() => goto('/info')}>
          {text.home.tertiaryCta}
        </button>
      </div>
    </section>

    <section
      class="boards-shell panel"
      class:active={currentView === 'boards'}
      aria-hidden={currentView !== 'boards'}
      inert={currentView !== 'boards'}
    >
      <section class="board-modal">
        <button class="close-modal" type="button" on:click={showHome} aria-label={closeLabel}>
          &times;
        </button>

        <h1 class="trazos-title">{text.boards.title}</h1>
        <p class="board-description">{text.boards.description}</p>

        <section class="board-actions">
          <article>
            <h2>{text.boards.newBoard}</h2>
            <div class="new-board-actions">
              <button class="trazos-button" type="button" on:click={goToBoard}>{text.boards.newBoard}</button>
              <button class="trazos-button neutral" type="button" on:click={createPrivateBoard}>
                {text.boards.privateBoard}
              </button>
            </div>
            <small class="privacy-hint">{text.boards.privateHint}</small>
          </article>

          <article>
            <h2>{text.boards.joinTitle}</h2>
            <form
              on:submit|preventDefault={() => {
                joinBoard();
              }}
            >
              <input
                bind:value={roomInput}
                type="text"
                placeholder={text.boards.joinPlaceholder}
                autocomplete="off"
              />
              <button class="trazos-button" type="submit">{text.boards.joinAction}</button>
            </form>
          </article>

          <article class="active-boards">
            <h2>{text.boards.activeTitle}</h2>
            {#if activeBoardsLoading}
              <p class="active-placeholder">{text.boards.activeLoading}</p>
            {:else if !activeBoards.length}
              <p class="active-placeholder">{text.boards.activeEmpty}</p>
            {:else}
              <ul>
                {#each activeBoards as board}
                  <li>
                    <button type="button" class="board-link" on:click={() => goto(`/board/${board.id}`)}>
                      <span class="board-id">{board.id}</span>
                      <span class="board-qty">{board.connections} {text.boards.activeOnlineLabel}</span>
                    </button>
                  </li>
                {/each}
              </ul>
            {/if}
          </article>
        </section>

        <small>{text.boards.helper}</small>
      </section>
    </section>
  </main>
</div>

<style>
  .home {
    height: 100svh;
    overflow: hidden;
    position: relative;
  }

  .overlay {
    background: rgba(9, 12, 15, 0.72);
    inset: 0;
    position: fixed;
    z-index: 8;
  }

  :global(.home canvas) {
    left: 0;
    position: fixed;
    top: 0;
  }

  .view-stage {
    box-sizing: border-box;
    display: grid;
    min-height: 100%;
    padding: 96px 20px 20px;
    place-items: center;
    position: relative;
    z-index: 10;
  }

  .panel {
    grid-area: 1 / 1;
    max-height: calc(100svh - 116px);
    opacity: 0;
    overflow: auto;
    pointer-events: none;
    transform: translateY(16px) scale(0.986);
    transition:
      opacity 300ms ease,
      transform 360ms cubic-bezier(0.22, 1, 0.36, 1);
    width: min(92vw, 900px);
  }

  .panel.active {
    opacity: 1;
    pointer-events: auto;
    transform: translateY(0) scale(1);
  }

  .hero {
    align-items: center;
    box-sizing: border-box;
    color: var(--trz-muted);
    display: flex;
    flex-direction: column;
    justify-content: center;
    min-height: calc(100svh - 116px);
    padding: 16px 0;
    text-align: center;
  }

  .eyebrow {
    color: var(--trz-accent);
    font-family: var(--trz-font-ui);
    font-size: 0.82rem;
    letter-spacing: 0.12em;
    margin-bottom: 16px;
    text-transform: uppercase;
  }

  .home-logo {
    margin-bottom: 24px;
    max-width: 620px;
    min-width: 300px;
    width: 48vw;
  }

  .description {
    font-weight: 200;
    font-size: 1.08rem;
    line-height: 1.55;
    margin: 0 auto 28px;
    max-width: 720px;
  }

  .actions {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    justify-content: center;
  }

  .actions button {
    min-width: 180px;
  }

  .boards-counter {
    margin-left: 4px;
  }

  .boards-shell {
    align-items: center;
    box-sizing: border-box;
    display: flex;
    justify-content: center;
  }

  .board-modal {
    border: 0;
    overflow: visible;
    padding: 10px 0;
    position: relative;
    text-align: center;
    width: 100%;
  }

  .close-modal {
    background: transparent;
    border: 0;
    color: var(--trz-accent);
    cursor: pointer;
    font-size: 1.8rem;
    line-height: 1;
    padding: 0;
    position: absolute;
    right: 0;
    top: 0;
  }

  .board-modal .trazos-title {
    margin: 0 0 12px;
    padding-right: 48px;
  }

  .board-description {
    line-height: 1.55;
    margin: 0 auto 24px;
    max-width: 760px;
  }

  .board-actions {
    display: grid;
    gap: 14px;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  article {
    border: #e0ffe063 1px solid;
    border-radius: 14px;
    padding: 20px;
    text-align: left;
  }

  h2 {
    font-family: var(--trz-font-display);
    font-size: 1rem;
    margin: 0 0 10px;
    text-transform: uppercase;
  }

  form {
    display: flex;
    gap: 10px;
  }

  input {
    background: #ffffff;
    border: 1px solid #b9c0c7;
    border-radius: 999px;
    color: var(--trz-light-text);
    flex: 1;
    font-family: var(--trz-font-body);
    padding: 11px 14px;
  }

  .new-board-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
  }

  .privacy-hint {
    display: block;
    margin-top: 10px;
  }

  .active-boards {
    grid-column: 1 / -1;
  }

  .active-placeholder {
    margin: 0;
  }

  ul {
    display: grid;
    gap: 10px;
    list-style: none;
    margin: 0;
    padding: 0;
  }

  .board-link {
    align-items: center;
    background: #11191f;
    border: 1px solid #3e4a53;
    border-radius: 10px;
    color: #d8e1e8;
    cursor: pointer;
    display: flex;
    justify-content: space-between;
    padding: 10px 12px;
    width: 100%;
  }

  .board-link:hover {
    border-color: #00ff00;
  }

  .board-id {
    font-family: var(--trz-font-display);
    font-size: 1rem;
    letter-spacing: 0.04em;
  }

  .board-qty {
    color: #9ab0bf;
    font-family: var(--trz-font-ui);
    font-size: 0.82rem;
  }

  .board-modal > small {
    color: var(--trz-muted);
    display: block;
    margin-top: 18px;
  }

  @media (max-width: 900px) {
    .home {
      min-height: 100svh;
    }

    .view-stage {
      padding: 86px 12px 12px;
    }

    .panel {
      max-height: calc(100svh - 98px);
      width: min(96vw, 900px);
    }

    .hero {
      min-height: calc(100svh - 98px);
      padding: 8px 0;
    }

    .home-logo {
      width: 82vw;
    }

    .description {
      font-size: 1rem;
      max-width: 92%;
      font-weight: 200;
    }

    .board-modal {
      padding: 8px 0;
    }

    .board-actions {
      grid-template-columns: 1fr;
    }

    form {
      flex-direction: column;
    }
  }

</style>
