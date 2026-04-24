<script>
  import '$lib/styles/trazos-theme.css';
  import { INSTAGRAM_URL } from '$lib/config/site';
  import { copy } from '$lib/i18n/copy';
  import { languageStore } from '$lib/stores/languageStore';

  $: text = copy[$languageStore];
</script>

<footer class="site-footer">
  <a href="/contact">{text.footer.contact}</a>
  <a
    class="instagram-link"
    href={INSTAGRAM_URL}
    target="_blank"
    rel="noopener noreferrer"
    aria-label={text.footer.instagram}>
    <svg viewBox="0 0 24 24" role="img" aria-hidden="true">
      <rect x="3.5" y="3.5" width="17" height="17" rx="4.5"></rect>
      <circle cx="12" cy="12" r="4"></circle>
      <circle cx="17.5" cy="6.5" r="1.2"></circle>
    </svg>
    <span>{text.footer.instagram}</span>
  </a>
</footer>

<style>
  .site-footer {
    align-items: center;
    border-top: 1px solid rgba(0, 255, 0, 0.2);
    display: flex;
    gap: 16px;
    justify-content: center;
    margin-top: 30px;
    padding: 18px 20px 24px;
  }

  .site-footer a {
    color: var(--trz-muted);
    font-family: var(--trz-font-ui);
    font-size: 0.78rem;
    letter-spacing: 0.05em;
    text-decoration: none;
    text-transform: uppercase;
  }

  .site-footer a:hover {
    color: var(--trz-accent);
  }

  .instagram-link {
    align-items: center;
    display: inline-flex;
    gap: 8px;
  }

  .instagram-link svg {
    fill: none;
    height: 16px;
    stroke: currentColor;
    stroke-width: 1.6;
    width: 16px;
  }
</style>
