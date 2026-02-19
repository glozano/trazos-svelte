<script>
  import '$lib/styles/trazos-theme.css';
  import { goto } from '$app/navigation';
  import SiteNav from '$lib/components/SiteNav.svelte';
  import BackgroundSketch from '$lib/components/BackgroundSketch.svelte';
  import logo from '$lib/images/logo.png';
  import { copy } from '$lib/i18n/copy';
  import { languageStore } from '$lib/stores/languageStore';
  import { generateRoomId } from '$lib/utils/board';

  $: text = copy[$languageStore];

  function goToBoard() {
    goto(`/board/${generateRoomId()}`);
  }
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
  <main class="hero">
    <p class="eyebrow">{text.home.eyebrow}</p>
    <img class="home-logo" src={logo} alt="Trazos.club" />
    <p class="description">{text.home.description}</p>
    <div class="actions">
      <button type="button" class="trazos-button" on:click={goToBoard}>{text.home.primaryCta}</button>
      <button type="button" class="trazos-button ghost" on:click={() => goto('/board')}>
        {text.home.secondaryCta}
      </button>
      <button type="button" class="trazos-button neutral" on:click={() => goto('/info')}>
        {text.home.tertiaryCta}
      </button>
    </div>
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

  .hero {
    align-items: center;
    box-sizing: border-box;
    color: var(--trz-muted);
    display: flex;
    flex-direction: column;
    justify-content: center;
    min-height: 100%;
    padding: 96px 20px 96px;
    position: relative;
    text-align: center;
    z-index: 10;
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

  @media (max-width: 900px) {
    .home {
      min-height: 100svh;
    }

    .hero {
      padding: 86px 16px 72px;
    }

    .home-logo {
      width: 82vw;
    }

    .description {
      font-size: 1rem;
      max-width: 92%;
    }
  }

</style>
