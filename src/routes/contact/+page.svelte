<script>
  import { onMount } from 'svelte';
  import { env as publicEnv } from '$env/dynamic/public';
  import '$lib/styles/trazos-theme.css';
  import { page } from '$app/stores';
  import SiteNav from '$lib/components/SiteNav.svelte';
  import { copy } from '$lib/i18n/copy';
  import { languageStore } from '$lib/stores/languageStore';

  $: text = copy[$languageStore];
  const reasonKeys = [
    'seminarios',
    'talleres',
    'eventos',
    'actividades_colaborativas',
    'desarrollos_tecnologicos',
    'comunidad',
    'colaborar',
    'otros'
  ];
  let isSubmitting = false;
  let submitStatus = 'idle';
  let statusMessage = '';
  let lastPrefill = '';
  const turnstileSiteKey = String(publicEnv.PUBLIC_TURNSTILE_SITE_KEY || '').trim();
  const turnstileEnabled = turnstileSiteKey.length > 0;
  let turnstileContainer;
  let turnstileWidgetId = null;
  let turnstileToken = '';
  let formValues = {
    reason: 'otros',
    name: '',
    email: '',
    subject: '',
    message: '',
    website: ''
  };

  function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  function getTurnstile() {
    if (typeof window === 'undefined') return null;
    return window.turnstile || null;
  }

  function renderTurnstileWidget() {
    const turnstile = getTurnstile();
    if (!turnstileEnabled || !turnstile || !turnstileContainer || turnstileWidgetId !== null) {
      return false;
    }

    turnstileWidgetId = turnstile.render(turnstileContainer, {
      sitekey: turnstileSiteKey,
      theme: 'dark',
      language: $languageStore === 'es' ? 'es' : 'en',
      callback(token) {
        turnstileToken = token;
      },
      'expired-callback'() {
        turnstileToken = '';
      },
      'error-callback'() {
        turnstileToken = '';
      }
    });

    return true;
  }

  onMount(() => {
    if (!turnstileEnabled) return undefined;

    const intervalId = window.setInterval(() => {
      if (renderTurnstileWidget()) {
        window.clearInterval(intervalId);
      }
    }, 250);

    renderTurnstileWidget();

    return () => {
      window.clearInterval(intervalId);
      const turnstile = getTurnstile();
      if (turnstile && turnstileWidgetId !== null) {
        turnstile.remove(turnstileWidgetId);
        turnstileWidgetId = null;
      }
    };
  });

  $: {
    const prefillReason = $page.url.searchParams.get('reason');
    if (prefillReason && prefillReason !== lastPrefill && reasonKeys.includes(prefillReason)) {
      formValues = { ...formValues, reason: prefillReason };
      lastPrefill = prefillReason;
    }
  }

  async function submitContact(event) {
    event.preventDefault();
    submitStatus = 'idle';
    statusMessage = '';

    const payload = {
      reason: formValues.reason.trim(),
      name: formValues.name.trim(),
      email: formValues.email.trim(),
      subject: formValues.subject.trim(),
      message: formValues.message.trim(),
      website: formValues.website.trim()
    };

    if (turnstileEnabled && !turnstileToken) {
      submitStatus = 'error';
      statusMessage = text.contact.status.turnstileMissing;
      return;
    }

    if (
      !reasonKeys.includes(payload.reason) ||
      payload.name.length < 2 ||
      payload.name.length > 120 ||
      !isValidEmail(payload.email) ||
      payload.subject.length < 3 ||
      payload.subject.length > 160 ||
      payload.message.length < 10 ||
      payload.message.length > 3000
    ) {
      submitStatus = 'error';
      statusMessage = text.contact.status.error;
      return;
    }

    isSubmitting = true;
    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...payload,
          turnstileToken
        })
      });
      const result = await response.json();
      if (!response.ok || !result.ok) {
        throw new Error('contact_failed');
      }

      submitStatus = 'success';
      statusMessage = text.contact.status.success;
      formValues = { reason: 'otros', name: '', email: '', subject: '', message: '', website: '' };
    } catch (error) {
      submitStatus = 'error';
      statusMessage = text.contact.status.error;
    } finally {
      if (turnstileEnabled) {
        const turnstile = getTurnstile();
        if (turnstile && turnstileWidgetId !== null) {
          turnstile.reset(turnstileWidgetId);
        }
        turnstileToken = '';
      }

      isSubmitting = false;
    }
  }
</script>

<svelte:head>
  {#if turnstileEnabled}
    <script
      src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
      async
      defer
    ></script>
  {/if}
</svelte:head>

<div class="contact-page trazos-page">
  <SiteNav
    current=""
    labels={text.nav}
    language={$languageStore}
    on:languageChange={(event) => languageStore.set(event.detail)}
  />

  <main class="content">
    <section class="contact-card">
      <h1 class="trazos-title">{text.contact.title}</h1>
      <p>{text.contact.subtitle}</p>
      <form class="contact-form" on:submit={submitContact}>
        <input bind:value={formValues.website} type="text" tabindex="-1" autocomplete="off" />
        <label>
          <span>{text.contact.fields.reason}</span>
          <select bind:value={formValues.reason} required>
            {#each reasonKeys as key}
              <option value={key}>{text.contact.reasons[key]}</option>
            {/each}
          </select>
        </label>
        <label>
          <span>{text.contact.fields.name}</span>
          <input bind:value={formValues.name} type="text" minlength="2" maxlength="120" required />
        </label>
        <label>
          <span>{text.contact.fields.email}</span>
          <input bind:value={formValues.email} type="email" maxlength="160" required />
        </label>
        <label>
          <span>{text.contact.fields.subject}</span>
          <input
            bind:value={formValues.subject}
            type="text"
            minlength="3"
            maxlength="160"
            required
          />
        </label>
        <label>
          <span>{text.contact.fields.message}</span>
          <textarea
            bind:value={formValues.message}
            rows="8"
            minlength="10"
            maxlength="3000"
            required
          ></textarea>
        </label>
        {#if turnstileEnabled}
          <div class="turnstile-field">
            <span>{text.contact.fields.verification}</span>
            <div class="turnstile-widget" bind:this={turnstileContainer}></div>
          </div>
        {/if}
        <button class="trazos-button" type="submit" disabled={isSubmitting}>
          {isSubmitting ? text.contact.status.sending : text.contact.fields.submit}
        </button>
      </form>
      {#if submitStatus !== 'idle'}
        <p class:ok={submitStatus === 'success'} class="status">{statusMessage}</p>
      {/if}
    </section>
  </main>
</div>

<style>
  .contact-page {
    background: var(--trz-dark);
    min-height: 100vh;
  }

  .content {
    margin: 0 auto;
    max-width: 900px;
    padding: 120px 20px 60px;
  }

  .contact-card {
    background: rgba(6, 10, 15, 0.82);
    border: 1px solid rgba(0, 255, 0, 0.2);
    border-radius: 16px;
    margin: 0 auto;
    padding: 22px;
  }

  h1 {
    font-size: 2rem;
    margin: 0 0 8px;
  }

  .contact-card p {
    margin: 0 0 14px;
  }

  .contact-form {
    display: grid;
    gap: 12px;
  }

  .contact-form label {
    display: grid;
    gap: 6px;
    text-align: left;
  }

  .contact-form span {
    font-family: var(--trz-font-ui);
    font-size: 0.8rem;
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }

  .contact-form input,
  .contact-form select,
  .contact-form textarea {
    background: #ffffff;
    border: 1px solid #b9c0c7;
    border-radius: 12px;
    color: var(--trz-light-text);
    font-family: var(--trz-font-body);
    padding: 10px 12px;
  }

  .contact-form input[type='text'][tabindex='-1'] {
    display: none;
  }

  .contact-form textarea {
    resize: vertical;
  }

  .contact-form button[disabled] {
    opacity: 0.75;
    pointer-events: none;
  }

  .turnstile-field {
    align-items: start;
  }

  .turnstile-widget {
    min-height: 65px;
  }

  .status {
    color: #ff6f6f;
    margin-top: 12px;
  }

  .status.ok {
    color: var(--trz-accent);
  }
</style>
