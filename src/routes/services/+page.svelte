<script>
  import '$lib/styles/trazos-theme.css';
  import SiteNav from '$lib/components/SiteNav.svelte';
  import heroImage from '$lib/images/services/hero-services.jpeg';
  import workshopImage from '$lib/images/services/services-workshop.jpeg';
  import performanceImage from '$lib/images/services/services-perfo.jpeg';
  import activityImage from '$lib/images/services/services-activity.jpeg';
  import { copy } from '$lib/i18n/copy';
  import { languageStore } from '$lib/stores/languageStore';

  $: text = copy[$languageStore];
  
  $: presentationCards = [
    {
      ...text.services.presentations[0],
      image: workshopImage,
      contactHref: '/contact?reason=talleres',
      presentationHref: "https://drive.google.com/file/d/1T1ZsfmctS5gUi-7HYe0DtBfGGciCsj0g/view?usp=sharing"
    },
    {
      ...text.services.presentations[1],
      image: performanceImage,
      contactHref: '/contact?reason=eventos',
      presentationHref: "https://drive.google.com/file/d/1GWz7d7x6X80zHDbshQl1WJVXM4dW_k31/view?usp=sharing"
    },
    {
      ...text.services.presentations[2],
      image: activityImage,
      contactHref: '/contact?reason=actividades_colaborativas',
      presentationHref: "https://drive.google.com/file/d/1Sd0pqqVF2p180yhipRQc2FhEhn8Q5Are/view?usp=sharing"
    }
  ];
</script>

<div class="services-page trazos-page">
  <SiteNav
    current="services"
    labels={text.nav}
    language={$languageStore}
    on:languageChange={(event) => languageStore.set(event.detail)}
  />

  <main class="content">
    <header class="hero">
      <div class="hero-media">
        <img class="hero-image" src={heroImage} alt={text.services.title} />
        <h1 class="trazos-title">{text.services.title}</h1>
      </div>
      <div class="hero-copy">
        <p>{text.services.lead[0]}</p>
        <p>{text.services.lead[1]}</p>
      </div>
    </header>

    <section class="service-grid-wrap">
      <h2>{text.services.presentationsTitle}</h2>
      <div class="service-grid">
        {#each presentationCards as card}
          <article class="presentation-card">
            <img src={card.image} alt={card.title} />
            <div class="card-body">
              <h3>{card.title}</h3>
              <p>{card.subtitle}</p>
              <div class="card-actions">
                <a
                  class="trazos-button small neutral"
                  href={card.presentationHref}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {text.services.viewPresentationCta}
                  <span class="material-icons icon-external" aria-hidden="true">open_in_new</span>
                </a>
                <a class="trazos-button ghost small" href={card.contactHref}>
                  {text.services.contactFormatCta}
                </a>
              </div>
            </div>
          </article>
        {/each}
      </div>
      <p class="closing">{text.services.closing}</p>
    </section>
  </main>
</div>

<style>
  .services-page {
    background: var(--trz-dark);
    min-height: 100vh;
  }

  .content {
    margin: 0 auto;
    max-width: 1040px;
  }

  .hero {
    margin-bottom: 34px;
  }

  .hero-media {
    position: relative;
  }

  .hero-image {
    display: block;
    height: min(38vw, 400px);
    margin-bottom: 24px;
    margin-left: calc(50% - 50vw);
    object-position: center top;
    object-fit: cover;
    width: 100vw;
  }

  h1 {
    font-size: 2.1rem;
    margin-bottom: 16px;
    padding: 12px 18px;
    text-align: center;
  }

  .hero-copy {
    text-align: center;
  }

  .hero p {
    line-height: 1.5;
    margin: 0 auto 12px;
    max-width: 740px;
  }

  .service-grid-wrap {
    color: var(--trz-muted);
    margin: 0 auto;
    padding: 26px 22px;
  }

  .service-grid-wrap h2 {
    color: var(--trz-accent);
    font-family: var(--trz-font-display);
    font-size: 1.2rem;
    font-weight: 500;
    margin: 0 0 18px;
    text-align: center;
    text-transform: uppercase;
  }

  .service-grid {
    display: flex;
    flex-direction: column;
    gap: 14px;
  }

  .presentation-card {
    background: rgba(6, 10, 15, 0.72);
    border: 1px solid rgba(0, 255, 0, 0.2);
    border-radius: 14px;
    color: inherit;
    display: grid;
    gap: 0;
    grid-template-columns: minmax(220px, 320px) minmax(0, 1fr);
    min-height: 170px;
    overflow: hidden;
  }

  .presentation-card img {
    display: block;
    height: 100%;
    object-fit: cover;
    width: 100%;
  }

  .card-body {
    padding: 16px;
  }

  .card-body h3 {
    color: var(--trz-accent);
    font-family: var(--trz-font-display);
    font-size: 1.1rem;
    margin: 0 0 10px;
    text-transform: uppercase;
  }

  .card-body p {
    color: var(--trz-muted);
    line-height: 1.5;
    margin: 0 0 14px;
  }

  .card-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
  }

  .trazos-button.small {
    align-items: center;
    display: inline-flex;
    font-size: 0.74rem;
    gap: 6px;
    min-height: 36px;
    min-width: 0;
    padding: 8px 14px;
  }

  .icon-external {
    font-size: 1rem;
    line-height: 1;
  }

  .closing {
    color: var(--trz-muted);
    margin: 20px 0 2px;
    text-align: center;
  }

  @media (max-width: 940px) {
    .hero-image {
      height: clamp(220px, 60vw, 320px);
      margin-bottom: 18px;
    }

    h1 {
      bottom: 16px;
      font-size: 1.4rem;
      width: calc(100vw - 30px);
    }

    .presentation-card {
      grid-template-columns: 1fr;
      min-height: 0;
    }

    .presentation-card img {
      aspect-ratio: 16 / 9;
      height: auto;
    }
  }

  @media (min-width: 1201px) {
    .hero-image {
      object-position: center -120px;
    }
  }
</style>
