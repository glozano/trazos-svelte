<script>
  import '$lib/styles/trazos-theme.css';
  import SiteNav from '$lib/components/SiteNav.svelte';
  import { copy } from '$lib/i18n/copy';
  import { languageStore } from '$lib/stores/languageStore';

  const contactEmail = 'info@trazos.club';

  $: text = copy[$languageStore];
  $: ui =
    $languageStore === 'es'
      ? {
          eyebrow: 'Sostenido por la comunidad',
          heroTagline:
            'Software libre, dibujo colectivo y una plataforma abierta que existe porque muchas personas la sostienen.',
          primaryCta: 'Aporte mensual',
          secondaryCta: 'Aporte unico',
          impactTitle: 'Tu aporte hace posible',
          impactItems: [
            {
              number: '01',
              title: 'Infraestructura',
              text: 'Hosting, tiempo de servidor, mantenimiento y estabilidad para que la plataforma siga online.'
            },
            {
              number: '02',
              title: 'Comunidad',
              text: 'Coordinacion, acompanamiento y continuidad de una red que crece entre proyectos artisticos, educativos y colectivos.'
            },
            {
              number: '03',
              title: 'Desarrollo',
              text: 'Mejoras, correcciones y nuevas etapas para que Trazos Club siga libre, util y vivo.'
            }
          ],
          methodsTitle: 'Aporte unico',
          methodsLead:
            'Si queres hacer un aporte por unica vez, podes hacerlo por Mercado Pago o por PayPal si estas fuera de Argentina.',
          monthlyTitle: 'Aportes mensuales',
          monthlyLead:
            'Si queres que Trazos Club tenga continuidad, el aporte mensual es la forma mas estable de acompanarlo.',
          monthlySuffix: '/ mes',
          monthlyButton: 'Elegir este aporte',
          shareEyebrow: 'Hacer circular tambien es apoyar',
          shareTitle: 'Nombrar el software libre fortalece la red',
          shareLead:
            'Cada vez que compartis la plataforma, ayudas a darle visibilidad al trabajo colectivo y a que mas personas la usen, la cuiden y la recomienden.',
          shareActions: [
            'Menciona trazos.club',
            'Usa #TrazosClub y #SoftwareLibre',
            'Etiqueta @trazos.club'
          ],
          otherWaysTitle: 'Otra forma de colaborar',
          otherWaysText:
            'Si queres proponer una alianza, una actividad o un apoyo de otra clase, escribinos y coordinamos.',
          otherWaysCta: 'Escribir a info@trazos.club'
        }
      : {
          eyebrow: 'Community-supported',
          heroTagline:
            'Free software, collective drawing, and an open platform that exists because people keep it alive.',
          primaryCta: 'Monthly support',
          secondaryCta: 'One-time support',
          impactTitle: 'Your contribution sustains',
          impactItems: [
            {
              number: '01',
              title: 'Infrastructure',
              text: 'Hosting, server time, maintenance, and stability so the platform stays online.'
            },
            {
              number: '02',
              title: 'Community',
              text: 'Coordination, care, and continuity for a network growing across artistic, educational, and collective projects.'
            },
            {
              number: '03',
              title: 'Development',
              text: 'Improvements, fixes, and new stages so Trazos Club remains free, useful, and alive.'
            }
          ],
          methodsTitle: 'One-time support',
          methodsLead:
            'If you want to make a one-time contribution, you can do it through Mercado Pago or PayPal if you are outside of Argentina.',
          monthlyTitle: 'Monthly contributions',
          monthlyLead:
            'If you want Trazos Club to grow with continuity, monthly support is the strongest way to back it.',
          monthlySuffix: '/ month',
          monthlyButton: 'Choose this level',
          shareEyebrow: 'Sharing also helps',
          shareTitle: 'Making free software visible strengthens the network',
          shareLead:
            'Every time you share the platform, you help more people find it, use it, care for it, and recommend it.',
          shareActions: [
            'Mention trazos.club',
            'Use #TrazosClub and #SoftwareLibre',
            'Tag @trazos.club'
          ],
          otherWaysTitle: 'Another way to collaborate',
          otherWaysText:
            'If you want to propose an alliance, an activity, or another kind of support, write to us and we can coordinate it.',
          otherWaysCta: 'Write to info@trazos.club'
        };

  function getAmount(label) {
    const match = label.match(/\$(\d+)/);
    if (!match) return label;

    return new Intl.NumberFormat($languageStore === 'es' ? 'es-AR' : 'en-US').format(Number(match[1]));
  }

  $: methods = text.socios.supportMethods.map((method, index) => ({
    ...method,
    description:
      method.title === 'PayPal'
        ? $languageStore === 'es'
          ? 'Si estas fuera de Argentina.'
          : 'If you are outside of Argentina.'
        : method.description,
    number: String(index + 1).padStart(2, '0'),
    id: index === 0 ? 'aporte-unico' : 'mercado-pago'
  }));

  $: plans = text.socios.monthlyOptions.map((option, index) => ({
    ...option,
    amount: getAmount(option.label),
    featured: index === 1
  }));
</script>

<div class="support-page trazos-page">
  <SiteNav
    current="socios"
    labels={text.nav}
    language={$languageStore}
    on:languageChange={(event) => languageStore.set(event.detail)}
  />

  <main class="content">
    <section class="hero">
      <div class="hero-copy card">
        <p class="eyebrow">{ui.eyebrow}</p>
        <h1 class="trazos-title">{text.socios.leadTitle}</h1>
        <p class="hero-tagline">{ui.heroTagline}</p>
        {#each text.socios.intro as paragraph}
          <p class="hero-body">{paragraph}</p>
        {/each}
        <div class="hero-actions">
          <a class="trazos-button" href="#mensual">{ui.primaryCta}</a>
          <a class="trazos-button ghost" href="#aporte-unico">{ui.secondaryCta}</a>
        </div>
      </div>

      <aside class="impact-panel card">
        <p class="panel-label">{ui.impactTitle}</p>
        <div class="impact-list">
          {#each ui.impactItems as item}
            <article class="impact-item">
              <span class="impact-number">{item.number}</span>
              <div>
                <h2>{item.title}</h2>
                <p>{item.text}</p>
              </div>
            </article>
          {/each}
        </div>
      </aside>
    </section>

    <section class="monthly-section" id="mensual">
      <div class="section-head">
        <h2>{ui.monthlyTitle}</h2>
        <p>{ui.monthlyLead}</p>
      </div>

      <div class="plans-grid">
        {#each plans as plan}
          <article class:featured={plan.featured} class="plan-card">
            <p class="plan-amount">
              <span class="currency">$</span>{plan.amount}
              <span class="suffix">{ui.monthlySuffix}</span>
            </p>
            <a
              class:ghost={!plan.featured}
              class="trazos-button"
              href={plan.href}
              target="_blank"
              rel="noopener noreferrer"
            >
              {ui.monthlyButton}
            </a>
          </article>
        {/each}
      </div>
    </section>

    <section class="methods-section" id="aporte-unico">
      <div class="section-head">
        <h2>{ui.methodsTitle}</h2>
        <p>{ui.methodsLead}</p>
      </div>

      <div class="methods-grid">
        {#each methods as method}
          <article class="method-card" id={method.id}>
            <div class="method-topline">
              <span class="method-number">{method.number}</span>
              <h3>{method.title}</h3>
            </div>
            <p>{method.description}</p>
            <a
              class="trazos-button"
              href={method.href}
              target="_blank"
              rel="noopener noreferrer"
            >
              {method.cta}
            </a>
          </article>
        {/each}
      </div>
    </section>

    <section class="share-section card">
      <div class="share-copy">
        <p class="eyebrow">{ui.shareEyebrow}</p>
        <h2>{ui.shareTitle}</h2>
        <p>{ui.shareLead}</p>
      </div>
      <div class="share-actions" aria-label={ui.shareTitle}>
        {#each ui.shareActions as action}
          <span>{action}</span>
        {/each}
      </div>
    </section>

    <section class="other-ways card">
      <div>
        <h2>{ui.otherWaysTitle}</h2>
        <p>{ui.otherWaysText}</p>
      </div>
      <a class="trazos-button neutral" href={`mailto:${contactEmail}`}>{ui.otherWaysCta}</a>
    </section>
  </main>
</div>

<style>
  .support-page {
    background:
      radial-gradient(circle at 20% 0%, rgba(0, 255, 0, 0.16), transparent 32%),
      radial-gradient(circle at 100% 10%, rgba(255, 255, 255, 0.08), transparent 20%),
      linear-gradient(180deg, #05090d 0%, #0a1218 45%, #081116 100%);
    min-height: 100vh;
    position: relative;
  }

  .support-page::before {
    background:
      linear-gradient(90deg, rgba(255, 255, 255, 0.03) 1px, transparent 1px),
      linear-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 1px);
    background-size: 36px 36px;
    content: '';
    inset: 0;
    mask-image: linear-gradient(180deg, rgba(0, 0, 0, 0.9), transparent 90%);
    pointer-events: none;
    position: fixed;
  }

  .content {
    margin: 0 auto;
    max-width: 1180px;
    padding: 120px 20px 64px;
    position: relative;
    z-index: 1;
  }

  .card {
    backdrop-filter: blur(10px);
    background: rgba(7, 12, 17, 0.76);
    border: 1px solid rgba(120, 255, 152, 0.16);
    border-radius: 24px;
    box-shadow: 0 24px 80px rgba(0, 0, 0, 0.28);
  }

  .hero {
    display: grid;
    gap: 20px;
    grid-template-columns: minmax(0, 1.18fr) minmax(300px, 0.82fr);
    margin-bottom: 40px;
  }

  .hero-copy,
  .impact-panel,
  .share-section,
  .other-ways {
    padding: 28px;
  }

  .eyebrow,
  .panel-label {
    color: var(--trz-accent);
    font-family: var(--trz-font-ui);
    font-size: 0.78rem;
    letter-spacing: 0.14em;
    margin: 0 0 12px;
    text-transform: uppercase;
  }

  h1 {
    font-size: clamp(2.6rem, 6vw, 4.6rem);
    line-height: 0.96;
    margin: 0 0 18px;
    max-width: 10ch;
  }

  .hero-tagline {
    color: #f2f5f7;
    font-family: var(--trz-font-ui);
    font-size: clamp(1rem, 2vw, 1.2rem);
    line-height: 1.55;
    margin: 0 0 14px;
    max-width: 58ch;
  }

  .hero-body {
    line-height: 1.7;
    margin: 0 0 14px;
    max-width: 72ch;
  }

  .hero-actions {
    display: none;
  }

  .impact-panel {
    align-self: stretch;
    display: grid;
  }

  .impact-list {
    display: grid;
    gap: 16px;
  }

  .impact-item {
    align-items: start;
    border-top: 1px solid rgba(120, 255, 152, 0.14);
    display: grid;
    gap: 14px;
    grid-template-columns: auto 1fr;
    padding-top: 16px;
  }

  .impact-item:first-child {
    border-top: 0;
    padding-top: 0;
  }

  .impact-number,
  .method-number {
    color: var(--trz-accent);
    font-family: var(--trz-font-display);
    font-size: 1.2rem;
    line-height: 1;
  }

  .impact-item h2,
  .section-head h2,
  .share-copy h2,
  .other-ways h2 {
    color: #f2f5f7;
    font-family: var(--trz-font-display);
    font-size: clamp(1.2rem, 1.8vw, 1.8rem);
    font-weight: 600;
    line-height: 1.2;
    margin: 0 0 8px;
  }

  .impact-item p,
  .section-head p,
  .method-card p,
  .share-copy p,
  .other-ways p {
    line-height: 1.65;
    margin: 0;
  }

  .methods-section,
  .monthly-section,
  .share-section {
    margin-bottom: 40px;
  }

  .section-head {
    margin-bottom: 18px;
    max-width: 780px;
  }

  .methods-grid {
    display: grid;
    gap: 16px;
    grid-template-columns: repeat(2, minmax(220px, 1fr));
  }

  .method-card,
  .plan-card {
    background: rgba(7, 12, 17, 0.76);
    border: 1px solid rgba(120, 255, 152, 0.14);
    border-radius: 24px;
    display: grid;
    gap: 12px;
    justify-items: center;
    min-height: 0;
    padding: 20px 18px;
    text-align: center;
  }

  .method-topline {
    align-items: center;
    display: flex;
    gap: 10px;
    justify-content: center;
  }

  .method-card h3 {
    color: #f2f5f7;
    font-family: var(--trz-font-ui);
    font-size: 1rem;
    letter-spacing: 0.06em;
    margin: 0;
    text-transform: uppercase;
  }

  .monthly-section {
    padding: 0;
  }

  .plans-grid {
    display: grid;
    gap: 16px;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  }

  .plan-card.featured {
    background: linear-gradient(180deg, rgba(10, 22, 15, 0.96), rgba(7, 12, 17, 0.92));
    border-color: rgba(0, 255, 0, 0.42);
    box-shadow: 0 0 0 1px rgba(0, 255, 0, 0.12), 0 20px 60px rgba(0, 0, 0, 0.24);
    transform: translateY(-6px);
  }

  .plan-amount {
    align-items: end;
    color: #f2f5f7;
    display: flex;
    flex-wrap: wrap;
    font-family: var(--trz-font-display);
    font-size: clamp(2.2rem, 5vw, 3.2rem);
    gap: 4px;
    line-height: 0.94;
    justify-content: center;
    margin: 0;
  }

  .currency {
    font-size: 0.56em;
    opacity: 0.88;
    transform: translateY(-0.18em);
  }

  .suffix {
    color: var(--trz-muted);
    font-family: var(--trz-font-ui);
    font-size: 0.32em;
    letter-spacing: 0.06em;
    margin-left: 4px;
    text-transform: uppercase;
  }

  .share-section {
    align-items: center;
    background:
      linear-gradient(135deg, rgba(0, 255, 0, 0.16), rgba(255, 255, 255, 0.04)),
      rgba(7, 12, 17, 0.76);
    display: grid;
    gap: 22px;
    grid-template-columns: minmax(0, 1fr) minmax(280px, 0.9fr);
  }

  .share-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    justify-content: flex-end;
  }

  .share-actions span {
    background: rgba(6, 10, 15, 0.64);
    border: 1px solid rgba(255, 255, 255, 0.14);
    border-radius: 18px;
    color: #f2f5f7;
    font-family: var(--trz-font-ui);
    font-size: 0.92rem;
    line-height: 1.4;
    padding: 14px 16px;
  }

  .other-ways {
    align-items: center;
    display: flex;
    gap: 18px;
    justify-content: space-between;
  }

  .plan-card :global(.trazos-button),
  .method-card :global(.trazos-button) {
    display: inline-flex;
    justify-content: center;
    justify-self: center;
    min-width: 0;
    padding: 8px 12px;
    text-align: center;
    width: min(100%, 168px);
  }

  @media (max-width: 980px) {
    .hero,
    .methods-grid,
    .share-section {
      grid-template-columns: 1fr;
    }

    .share-actions {
      justify-content: start;
    }
  }

  @media (max-width: 720px) {
    .content {
      padding: 106px 16px 40px;
    }

    .hero-actions {
      display: grid;
      gap: 10px;
      grid-template-columns: 1fr;
      margin: 22px 0 18px;
    }

    .hero-copy,
    .impact-panel,
    .share-section,
    .other-ways {
      padding: 22px 18px;
    }

    h1 {
      max-width: none;
    }

    .other-ways {
      align-items: start;
      flex-direction: column;
    }

    .plan-card.featured {
      transform: none;
    }
  }
</style>
