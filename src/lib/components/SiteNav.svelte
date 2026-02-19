<script>
  import '$lib/styles/trazos-theme.css';
  import { goto } from '$app/navigation';
  import { createEventDispatcher } from 'svelte';
  import { COMMUNITY_URL } from '$lib/config/site';
  import { generateRoomId } from '$lib/utils/board';
  import logo from '$lib/images/logo.png';

  export let current = '';
  export let labels;
  export let language = 'es';

  const dispatch = createEventDispatcher();
  let drawerOpen = false;

  function onLanguageChange(event) {
    drawerOpen = false;
    dispatch('languageChange', event.target.value);
  }

  function goToNewBoard() {
    drawerOpen = false;
    goto(`/board/${generateRoomId()}`);
  }

  function closeDrawer() {
    drawerOpen = false;
  }
</script>

<header class="site-nav">
  <a class="brand" href="/">
    <img class="brand-logo" src={logo} alt="Trazos.club" />
  </a>
  <button
    class="menu-toggle"
    type="button"
    on:click={() => (drawerOpen = true)}
    aria-label="Open menu"
    aria-expanded={drawerOpen}>☰</button
  >
  <nav class="links">
    <a class:active={current === 'home'} href="/">{labels.home}</a>
    <a class:active={current === 'info'} href="/info">{labels.info}</a>
    <a class:active={current === 'services'} href="/services">{labels.services}</a>
    <a href={COMMUNITY_URL} target="_blank" rel="noopener noreferrer">{labels.community}</a>
  </nav>
  <div class="actions">
    <button class="draw-cta" type="button" on:click={goToNewBoard}>{labels.draw}</button>
    <label class="language">
      <select value={language} on:change={onLanguageChange}>
        <option value="es">ES</option>
        <option value="en">EN</option>
      </select>
    </label>
  </div>
</header>

<button
  class:open={drawerOpen}
  class="drawer-backdrop"
  type="button"
  on:click={closeDrawer}
  aria-label="Close menu backdrop"></button>
<aside class:open={drawerOpen} class="mobile-drawer">
  <div class="drawer-head">
    <!-- <img class="drawer-logo" src={logo} alt="Trazos.club" /> -->
    <button type="button" class="drawer-close" on:click={closeDrawer} aria-label="Close menu">×</button>
  </div>

  <nav class="drawer-links">
    <a class:active={current === 'home'} href="/" on:click={closeDrawer}>{labels.home}</a>
    <a class:active={current === 'info'} href="/info" on:click={closeDrawer}>{labels.info}</a>
    <a class:active={current === 'services'} href="/services" on:click={closeDrawer}>{labels.services}</a>
    <a href={COMMUNITY_URL} target="_blank" rel="noopener noreferrer" on:click={closeDrawer}
      >{labels.community}</a
    >
  </nav>

  <div class="drawer-actions">
    <button class="draw-cta" type="button" on:click={goToNewBoard}>{labels.draw}</button>
    <label class="language">
      <span>{labels.language}</span>
      <select value={language} on:change={onLanguageChange}>
        <option value="es">ES</option>
        <option value="en">EN</option>
      </select>
    </label>
  </div>
</aside>

<style>
  .site-nav {
    align-items: center;
    background: rgba(6, 10, 15, 0.78);
    backdrop-filter: blur(6px);
    border-bottom: 1px solid rgba(0, 255, 0, 0.2);
    display: grid;
    gap: 20px;
    grid-template-columns: 1fr auto auto;
    left: 0;
    padding: 18px 28px;
    position: fixed;
    right: 0;
    top: 0;
    z-index: 50;
  }

  .brand {
    align-items: center;
    display: flex;
    text-decoration: none;
  }

  .brand-logo {
    display: block;
    height: 28px;
    width: auto;
  }

  .menu-toggle {
    background: transparent;
    border: none;
    color: var(--trz-accent);
    display: none;
    font-family: var(--trz-font-ui);
    font-size: 1rem;
    line-height: 1;
    padding: 7px 10px;
  }

  .links {
    display: flex;
    gap: 16px;
  }

  .links a {
    color: var(--trz-muted);
    font-family: var(--trz-font-ui);
    font-size: 0.88rem;
    letter-spacing: 0.05em;
    text-decoration: none;
    text-transform: uppercase;
  }

  .links a.active,
  .links a:hover {
    color: var(--trz-accent);
  }

  .actions {
    align-items: center;
    display: flex;
    gap: 14px;
  }

  .draw-cta {
    background: var(--trz-accent);
    border: 0;
    border-radius: 999px;
    color: #111;
    cursor: pointer;
    font-family: var(--trz-font-ui);
    font-size: 0.82rem;
    font-weight: 700;
    letter-spacing: 0.05em;
    padding: 10px 18px;
    text-transform: uppercase;
  }

  .language {
    align-items: center;
    color: var(--trz-muted);
    display: flex;
    font-family: var(--trz-font-ui);
    font-size: 0.82rem;
    gap: 8px;
    text-transform: uppercase;
  }

  .language select {
    background: var(--trz-dark-soft);
    border: 1px solid #40444a;
    border-radius: 14px;
    color: #f5f7f8;
    font-family: var(--trz-font-ui);
    font-size: 0.78rem;
    padding: 5px 8px;
  }

  .drawer-backdrop {
    background: rgba(0, 0, 0, 0.45);
    border: 0;
    inset: 0;
    opacity: 0;
    padding: 0;
    pointer-events: none;
    position: fixed;
    transition: opacity 0.2s ease;
    z-index: 59;
  }

  .drawer-backdrop.open {
    opacity: 1;
    pointer-events: auto;
  }

  .mobile-drawer {
    background: var(--trz-dark);
    border-left: 1px solid rgba(0, 255, 0, 0.25);
    bottom: 0;
    padding: 18px 16px;
    position: fixed;
    right: 0;
    top: 0;
    transform: translateX(102%);
    transition: transform 0.24s ease;
    width: min(82vw, 340px);
    z-index: 60;
  }

  .mobile-drawer.open {
    transform: translateX(0);
  }

  .drawer-head {
    align-items: center;
    display: flex;
    justify-content: space-between;
    margin-bottom: 16px;
  }

  .drawer-logo {
    height: 26px;
    width: auto;
  }

  .drawer-close {
    background: transparent;
    border: 0;
    color: var(--trz-accent);
    cursor: pointer;
    font-size: 1.5rem;
    line-height: 1;
    padding: 0;
  }

  .drawer-links {
    border-top: 1px solid rgba(0, 255, 0, 0.2);
    display: flex;
    flex-direction: column;
    gap: 16px;
    padding-top: 14px;
  }

  .drawer-links a {
    color: var(--trz-muted);
    font-family: var(--trz-font-ui);
    letter-spacing: 0.05em;
    text-decoration: none;
    text-transform: uppercase;
  }

  .drawer-links a.active,
  .drawer-links a:hover {
    color: var(--trz-accent);
  }

  .drawer-actions {
    border-top: 1px solid rgba(0, 255, 0, 0.2);
    display: flex;
    flex-direction: column;
    gap: 12px;
    margin-top: 18px;
    padding-top: 14px;
  }

  @media (max-width: 1024px) {
    .site-nav {
      grid-template-columns: 1fr auto;
      padding: 14px 16px;
    }

    .links {
      display: none;
    }

    .actions {
      display: none;
    }

    .menu-toggle {
      display: inline-flex;
    }
  }
</style>
