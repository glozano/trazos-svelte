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
  const drawerId = 'site-nav-drawer';
  let drawerOpen = false;

  function onLanguageChange(event) {
    dispatch('languageChange', event.target.value);
  }

  function goToNewBoard() {
    drawerOpen = false;
    goto(`/board/${generateRoomId()}`);
  }

  function openDrawer() {
    drawerOpen = true;
  }

  function closeDrawer() {
    drawerOpen = false;
  }
</script>

<header class="site-nav">
  <a class="brand" href="/">
    <img class="brand-logo" src={logo} alt="Trazos.club" />
  </a>

 
  <nav class="links" aria-label="Primary navigation">
    <a class:active={current === 'home'} href="/">{labels.home}</a>
    <a class:active={current === 'info'} href="/info">{labels.info}</a>
    <a class:active={current === 'socios'} href="/socios">{labels.socios}</a>
    <a class:active={current === 'services'} href="/services">{labels.services}</a>
    <a href={COMMUNITY_URL} target="_blank" rel="noopener noreferrer">
      {labels.community}
    </a>
  </nav>

  <div class="actions">
    <label class="language">
      <span class="visually-hidden">{labels.language}</span>
      <select value={language} on:change={onLanguageChange} aria-label={labels.language}>
        <option value="es">ES</option>
        <option value="en">EN</option>
      </select>
    </label>
    <button class="draw-cta" type="button" on:click={goToNewBoard}>{labels.draw}</button>
  </div>

  <label class="language mobile-language">
    <span class="visually-hidden">{labels.language}</span>
    <select value={language} on:change={onLanguageChange} aria-label={labels.language}>
      <option value="es">ES</option>
      <option value="en">EN</option>
    </select>
  </label>

  <button
    class="menu-toggle"
    type="button"
    on:click={openDrawer}
    aria-controls={drawerId}
    aria-expanded={drawerOpen}
    aria-label={drawerOpen ? 'Close menu' : 'Open menu'}>☰</button
  >

</header>

<button
  class:open={drawerOpen}
  class="drawer-backdrop"
  type="button"
  on:click={closeDrawer}
  aria-label="Close menu backdrop"></button>

<aside id={drawerId} class:open={drawerOpen} class="mobile-drawer" aria-hidden={!drawerOpen}>
  <div class="drawer-head">
    <a class="drawer-brand" href="/" on:click={closeDrawer}>
      <img class="drawer-logo" src={logo} alt="Trazos.club" />
    </a>
    <button type="button" class="drawer-close" on:click={closeDrawer} aria-label="Close menu">×</button>
  </div>

  <nav class="drawer-links" aria-label="Mobile navigation">
    <a class:active={current === 'home'} href="/" on:click={closeDrawer}>{labels.home}</a>
    <a class:active={current === 'info'} href="/info" on:click={closeDrawer}>{labels.info}</a>
    <a class:active={current === 'socios'} href="/socios" on:click={closeDrawer}>{labels.socios}</a>
    <a class:active={current === 'services'} href="/services" on:click={closeDrawer}>{labels.services}</a>
    <a href={COMMUNITY_URL} target="_blank" rel="noopener noreferrer" on:click={closeDrawer}>
      {labels.community} <span class="external-indicator" aria-hidden="true">&#8599;</span>
    </a>
    <button class="draw-cta" type="button" on:click={goToNewBoard}>{labels.draw}</button>
  </nav>
</aside>

<style>
  .site-nav {
    align-items: center;
    background: rgba(6, 10, 15, 0.82);
    backdrop-filter: blur(8px);
    border-bottom: 1px solid rgba(0, 255, 0, 0.2);
    display: grid;
    gap: 16px;
    grid-template-columns: 1fr auto 1fr;
    left: 0;
    padding: 14px 24px;
    position: fixed;
    right: 0;
    top: 0;
    z-index: 60;
  }

  .brand {
    justify-self: start;
    text-decoration: none;
  }

  .brand-logo {
    display: block;
    height: 30px;
    width: auto;
  }

  .links {
    align-items: center;
    display: inline-flex;
    gap: 18px;
    justify-self: center;
  }

  .links a {
    color: var(--trz-muted);
    font-family: var(--trz-font-ui);
    font-size: 0.92rem;
    letter-spacing: 0.04em;
    text-decoration: none;
    text-transform: uppercase;
    transition: color 0.18s ease;
  }

  .links a.active,
  .links a:hover {
    color: var(--trz-accent);
  }

  .actions {
    align-items: center;
    display: inline-flex;
    gap: 10px;
    justify-self: end;
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
    display: inline-flex;
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

  .menu-toggle {
    align-items: center;
    background: transparent;
    border:none;
    color: #00ff04;
    cursor: pointer;
    display: none;
    font-family: var(--trz-font-display);
    font-size: 1.36rem;
    height: 46px;
    justify-content: center;
    line-height: 1;
    width: 46px;
  }

  .mobile-language {
    display: none;
  }

  .drawer-backdrop {
    background: rgba(0, 0, 0, 0.48);
    border: 0;
    inset: 0;
    opacity: 0;
    padding: 0;
    pointer-events: none;
    position: fixed;
    transition: opacity 0.2s ease;
    z-index: 69;
  }

  .drawer-backdrop.open {
    opacity: 1;
    pointer-events: auto;
  }

  .mobile-drawer {
    background: linear-gradient(180deg, #071016 0%, #0b141d 100%);
    border-left: 1px solid rgba(120, 255, 152, 0.26);
    bottom: 0;
    display: flex;
    flex-direction: column;
    padding: 18px 16px 20px;
    position: fixed;
    right: 0;
    top: 0;
    transform: translateX(102%);
    transition: transform 0.24s ease;
    width: min(84vw, 340px);
    z-index: 70;
  }

  .mobile-drawer.open {
    transform: translateX(0);
  }

  .drawer-head {
    align-items: center;
    display: flex;
    justify-content: space-between;
  }

  .drawer-brand {
    margin: 0 auto 0 0;
  }

  .drawer-logo {
    display: block;
    height: 30px;
    width: auto;
  }

  .drawer-close {
    background: transparent;
    border: 0;
    color: var(--trz-accent);
    cursor: pointer;
    font-size: 1.7rem;
    line-height: 1;
    padding: 0;
  }

  .drawer-links {
    align-items: center;
    border-top: 1px solid rgba(0, 255, 0, 0.2);
    display: flex;
    flex: 1;
    flex-direction: column;
    gap: 14px;
    padding-top: 32px;
    margin-top:32px;
    text-align: center;
  }

  .drawer-links button {
    font-size: 1.04rem;
    letter-spacing: 0.05em;
    padding: 8px 32px;
  }

  .drawer-links a{
    color: #d6dce1;
    font-family: var(--trz-font-ui);
    font-size: 1.04rem;
    letter-spacing: 0.05em;
    text-decoration: none;
    text-transform: uppercase;
    transition: color 0.16s ease;
  }

  .drawer-links a.active,
  .drawer-links a:hover {
    color: var(--trz-accent);
  }

  .external-indicator {
    font-size: 0.82rem;
    margin-left: 4px;
  }

  .visually-hidden {
    border: 0;
    clip: rect(0 0 0 0);
    clip-path: inset(50%);
    height: 1px;
    overflow: hidden;
    position: absolute;
    white-space: nowrap;
    width: 1px;
  }

  @media (max-width: 1024px) {
    .site-nav {
      grid-template-columns: auto 1fr auto;
      padding: 10px 12px;
    }

    .brand,
    .links,
    .actions {
      display: none;
    }

    .menu-toggle {
      display: inline-flex;
      justify-self: end;
    }

    .mobile-language {
      display: inline-flex;
      justify-self: start;
    }
  }
</style>
