<script>
  import '$lib/styles/trazos-theme.css';
  import { goto } from '$app/navigation';
  import { copy } from '$lib/i18n/copy';
  import { languageStore } from '$lib/stores/languageStore';
  import { generateRoomId } from '$lib/utils/board';

  let roomInput = '';
  $: text = copy[$languageStore];
  $: closeLabel = $languageStore === 'es' ? 'Cerrar' : 'Close';

  function createBoard() {
    goto(`/board/${generateRoomId()}`);
  }

  function joinBoard() {
    const normalizedRoom = roomInput.trim();
    if (!normalizedRoom) return;
    goto(`/board/${normalizedRoom}`);
  }
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
          <button class="trazos-button" type="button" on:click={createBoard}>{text.boards.newBoard}</button>
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
    background: rgba(6, 10, 15, 0.86);
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
    background: var(--trz-light);
    border: 1px solid #d9dde0;
    border-radius: 14px;
    color: var(--trz-light-text);
    padding: 20px;
    text-align: left;
  }

  h2 {
    color: var(--trz-light-text);
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
