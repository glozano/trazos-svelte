<script>
  import '$lib/styles/trazos-theme.css';
  import { onDestroy, onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { copy } from '$lib/i18n/copy';
  import { languageStore } from '$lib/stores/languageStore';
  import { generateRoomId } from '$lib/utils/board';

  let roomInput = '';
  let activeBoards = [];
  let activeBoardsLoading = true;
  let activeBoardsPollTimer = null;
  $: text = copy[$languageStore];
  $: closeLabel = $languageStore === 'es' ? 'Cerrar' : 'Close';

  function createBoard() {
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

  async function loadActiveBoards() {
    try {
      const response = await fetch('/api/boards/active');
      if (!response.ok) throw new Error('active boards fetch failed');
      const data = await response.json();
      activeBoards = Array.isArray(data?.boards) ? data.boards : [];
    } catch {
      activeBoards = [];
    } finally {
      activeBoardsLoading = false;
    }
  }

  onMount(() => {
    loadActiveBoards();
    activeBoardsPollTimer = setInterval(loadActiveBoards, 8000);
  });

  onDestroy(() => {
    if (activeBoardsPollTimer) clearInterval(activeBoardsPollTimer);
  });
</script>

<div class="board-page trazos-page">
  <main class="modal-layer">
    <section class="board-modal">
      <button class="close-modal" type="button" on:click={() => goto('/')} aria-label={closeLabel}>
        ×
      </button>

      <h1 class="trazos-title">{text.boards.title}</h1>
      <p>{text.boards.description}</p>

      <section class="actions">
        <article>
          <h2>{text.boards.newBoard}</h2>
          <div class="new-board-actions">
            <button class="trazos-button" type="button" on:click={createBoard}>{text.boards.newBoard}</button>
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
  </main>
</div>

<style>
  .board-page {
    background: radial-gradient(circle at 30% 20%, #12262f 0%, #070b10 65%);
    height: 100svh;
    overflow: hidden;
  }

  .modal-layer {
    align-items: center;
    box-sizing: border-box;
    display: flex;
    justify-content: center;
    margin: 0 auto;
    min-height: 100%;
    padding: 20px;
  }

  .board-modal {
    background: rgba(6, 15, 8, 0.86);
    border: 1px solid rgba(0, 255, 0, 0.24);
    border-radius: 18px;
    max-height: calc(100svh - 40px);
    max-width: 900px;
    overflow: auto;
    padding: 26px;
    position: relative;
    text-align: center;
    width: min(92vw, 900px);
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
    right: 16px;
    top: 12px;
  }

  h1 {
    font-size: 2.1rem;
    margin: 0 0 12px;
  }

  p {
    line-height: 1.55;
    margin: 0 auto 24px;
    max-width: 760px;
  }

  .actions {
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
    gap: 10px;
    flex-wrap: wrap;
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

  small {
    color: var(--trz-muted);
    display: block;
    margin-top: 18px;
  }

  @media (max-width: 860px) {
    .modal-layer {
      padding: 12px;
    }

    .board-modal {
      max-height: calc(100svh - 24px);
      padding: 20px 14px;
    }

    .actions {
      grid-template-columns: 1fr;
    }

    form {
      flex-direction: column;
    }
  }
</style>
