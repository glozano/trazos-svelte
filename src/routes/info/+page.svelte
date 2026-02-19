<script>
  import '$lib/styles/trazos-theme.css';
  import SiteNav from '$lib/components/SiteNav.svelte';
  import { copy } from '$lib/i18n/copy';
  import { languageStore } from '$lib/stores/languageStore';
  import logo from '$lib/images/logo.png';
  import marcelaAvatar from '$lib/images/team/marcela-avatar.jpeg';
  import andresAvatar from '$lib/images/team/andres-avatar.jpeg';
  import gastonAvatar from '$lib/images/team/gaston-avatar.jpeg';
  import deDondeVenimos from '$lib/images/de-donde-venimos.png';
  import aDondeVamos from '$lib/images/a-donde-vamos.png';

  const pageCopy = {
    es: {
      intro: {
        navTeam: 'Quienes somos',
        navOrigin: 'De donde venimos',
        navLinks: 'Enlaces y descargas',
        paragraphs: [
          'Trazos Club es un proyecto de creacion de tecnologias de software libre, practicas artisticas, educativas y experiencias ludicas.',
          'Desde una perspectiva abierta y colaborativa, el proyecto articula desarrollo tecnologico, creacion artistica y un proyecto pedagogico construido a lo largo de anos de investigacion y practica en torno al dibujo colectivo y la animacion en tiempo real.'
        ],
        contactCta: 'Contactanos'
      },
      team: {
        heading: 'Equipo Trazos',
        introLead: 'Somos el Equipo Trazos, formado por',
        conjunction: 'y',
        introTail:
          'coordina el proyecto, mientras que el equipo desarrolla de manera colaborativa las distintas areas de trabajo.',
        paragraph2:
          'Desarrollamos tecnologias creativas basadas en el dibujo en vivo, colectivo y animado en tiempo real. Somos responsables del desarrollo del software libre Andiamo y de la plataforma Trazos Club.',
        paragraph3Lead: 'Un miembro fundacional del proyecto es',
        paragraph3:
          'quien diseno la identidad visual, el logo, participo en los primeros pasos y acompana ahora satelitalmente. Participaron tambien Leandro Garber, Leslie Watkins y Nahuel Coppero en los primeros desarrollos de programacion. Actualmente se sumo como colaboradora Jenn Jones desde el diseno.',
        paragraph4:
          'En distintas etapas acompanaron y apoyaron al proyecto Damian del Valle, Gabriel Gendin, Bianca Racioppe, Nahuel Canada, Ana Laura Califa, Paola Corona, Myriam Beutelspacher, Lau Castro, la Universidad Nacional de las Artes y el Club Cultural Matienzo.'
      },
      origin: {
        title: 'De donde venimos',
        paragraphs: [
          'El proyecto surge del trabajo conjunto de Andres Colubri y Marcela Rapallo desde el ano 2007, desarrollando tecnologias libres para dibujo en vivo y obras teatrales y performaticas con las plataformas Moldeo y Andiamo. Tambien se nutre del trabajo de Andres Colubri en el desarrollo de Processing y de los proyectos pedagogicos de Marcela Rapallo centrados en el dibujo en escena y el dibujo colectivo.',
          'La plataforma Trazos Club nacio en 2016, respondiendo a la necesidad de generar una solucion tecnologica de colaboracion en tiempo real, utilizando los estandares de la web disponibles en ese momento.',
          'El proyecto forma parte del equipo de investigacion Dibujo Abierto de la Universidad Nacional de las Artes (Argentina), con la participacion de un equipo interdisciplinario de estudiantes y docentes. El primer prototipo fue realizado gracias a su seleccion en el Programa Universidad, Diseno y Desarrollo Productivo del Ministerio de Educacion de la Nacion.',
          'Gran parte de este recorrido se construyo en contextos comunitarios, sociales y territoriales, especialmente en el marco de la educacion publica en Argentina.'
        ]
      },
      future: {
        title: 'A donde vamos',
        paragraphs: [
          'Trazos Club se encuentra actualmente gestando una nueva etapa, en una escala mayor. La plataforma trazos.club, tal como se presenta hoy, es una semilla de ese proyecto: una forma inicial que crecio a partir de raices profundas, construidas a lo largo de muchos anos de trabajo colectivo.',
          'Estas raices se formaron en el tiempo, tanto durante el proceso de creacion del proyecto como a lo largo de mas de diez anos de existencia de la plataforma, a traves de una comunidad amplia y diversa, y de innumerables encuentros, talleres, eventos y experiencias de dibujo colectivo.',
          'Hoy, la plataforma es el punto de partida de un proyecto mas grande, que sigue creciendo a partir de esa comunidad y que busca tomar la forma de un Club de dibujo: un espacio de encuentro, experimentacion y creacion compartida, centrado en el dibujo colectivo animado en vivo. La semilla ya esta en marcha y se encuentra a punto de desplegar su nueva forma.'
        ]
      },
      links: {
        title: 'Enlaces y descargas',
        trazosTitle: 'Trazos Club',
        andiamoTitle: 'Andiamo',
        trazos: [
          { label: 'Instagram de Trazos Club', href: 'https://www.instagram.com/trazos.club/' },
          { label: 'Canal de animaciones gif hechas con Trazos', href: 'https://giphy.com/channel/trazosclub' },
          {
            label: 'Descarga Tutorial Trazos Club',
            href: 'https://drive.google.com/file/d/1jazTb6eqf9TTfjj9-q-SY8PuYl1UT9-2/view?usp=sharing'
          },
          { label: 'Accede al codigo fuente', href: 'https://github.com/andiamo/fideos' }
        ],
        andiamo: [
          {
            label: 'Descarga Andiamo',
            href: 'https://drive.google.com/file/d/1xJR6hCkM_w5CIZgo7B6re3meIB4TVdsw/view?usp=sharing'
          },
          {
            label: 'Descarga Tutorial Andiamo',
            href: 'https://drive.google.com/file/d/1QABjEdGDP2fLWgBf3pu6e_8ShUoCFpjt/view?usp=sharing'
          },
          { label: 'Codigo fuente en GitHub', href: 'https://github.com/andiamo/andiamo' }
        ]
      }
    },
    en: {
      intro: {
        navTeam: 'Who we are',
        navOrigin: 'Where we come from',
        navLinks: 'Links and downloads',
        paragraphs: [
          'Trazos Club is a project for creating free software technologies, artistic and educational practices, and playful experiences.',
          'From an open and collaborative perspective, the project connects technological development, artistic creation, and a pedagogical initiative built over years of research and practice around collective drawing and real-time animation.'
        ],
        contactCta: 'Contact us'
      },
      team: {
        heading: 'Trazos Team',
        introLead: 'We are Equipo Trazos, formed by',
        conjunction: 'and',
        introTail:
          'coordinates the project, while the team develops the different areas of work collaboratively.',
        paragraph2:
          'We develop creative technologies based on live, collective, and real-time animated drawing. We are responsible for the development of Andiamo free software and the Trazos Club platform.',
        paragraph3Lead: 'A founding member of the project is',
        paragraph3:
          'who designed the visual identity and logo, participated in the first steps, and now continues in a satellite role. Leandro Garber, Leslie Watkins, and Nahuel Coppero also participated in the first programming developments. Jenn Jones has recently joined as a design collaborator.',
        paragraph4:
          'At different stages, the project was accompanied and supported by Damian del Valle, Gabriel Gendin, Bianca Racioppe, Nahuel Canada, Ana Laura Califa, Paola Corona, Myriam Beutelspacher, Lau Castro, Universidad Nacional de las Artes, and Club Cultural Matienzo.'
      },
      origin: {
        title: 'Where we come from',
        paragraphs: [
          'The project comes from the joint work of Andres Colubri and Marcela Rapallo since 2007, developing free technologies for live drawing and theatrical/performance works with Moldeo and Andiamo. It is also nourished by Andres Colubri work on Processing and Marcela Rapallo pedagogical projects focused on stage drawing and collective drawing.',
          'The Trazos Club platform was born in 2016, responding to the need for a real-time collaborative technological solution using the web standards available at that time.',
          'The project is part of the Dibujo Abierto research team at Universidad Nacional de las Artes (Argentina), with an interdisciplinary group of students and teachers. The first prototype was developed thanks to its selection in the Universidad, Diseno y Desarrollo Productivo Program of the National Ministry of Education.',
          'A large part of this trajectory was built in community, social, and territorial contexts, especially within public education in Argentina.'
        ]
      },
      future: {
        title: 'Where we are going',
        paragraphs: [
          'Trazos Club is currently shaping a new stage at a larger scale. The trazos.club platform, as presented today, is a seed of that project: an initial form that grew from deep roots built through many years of collective work.',
          'These roots were formed over time, both during the project creation process and throughout more than ten years of platform existence, through a broad and diverse community and countless meetings, workshops, events, and collective drawing experiences.',
          'Today, the platform is the starting point of a bigger project that keeps growing from that community and seeks to become a drawing Club: a space for encounter, experimentation, and shared creation centered on live animated collective drawing. The seed is already in motion and is about to unfold into its new form.'
        ]
      },
      links: {
        title: 'Links and downloads',
        trazosTitle: 'Trazos Club',
        andiamoTitle: 'Andiamo',
        trazos: [
          { label: 'Trazos Club Instagram', href: 'https://www.instagram.com/trazos.club/' },
          { label: 'Trazos gif animation channel', href: 'https://giphy.com/channel/trazosclub' },
          {
            label: 'Download Trazos Club tutorial',
            href: 'https://drive.google.com/file/d/1jazTb6eqf9TTfjj9-q-SY8PuYl1UT9-2/view?usp=sharing'
          },
          { label: 'Access source code', href: 'https://github.com/andiamo/fideos' }
        ],
        andiamo: [
          {
            label: 'Download Andiamo',
            href: 'https://drive.google.com/file/d/1xJR6hCkM_w5CIZgo7B6re3meIB4TVdsw/view?usp=sharing'
          },
          {
            label: 'Download Andiamo tutorial',
            href: 'https://drive.google.com/file/d/1QABjEdGDP2fLWgBf3pu6e_8ShUoCFpjt/view?usp=sharing'
          },
          { label: 'Source code on GitHub', href: 'https://github.com/andiamo/andiamo' }
        ]
      }
    }
  };

  $: navCopy = copy[$languageStore].nav;
  $: text = pageCopy[$languageStore];

  function scrollIntoView({ target }) {
    const el = document.querySelector(target.getAttribute('href'));
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth' });
  }
</script>

<div class="info-page trazos-page">
  <SiteNav
    current="info"
    labels={navCopy}
    language={$languageStore}
    on:languageChange={(event) => languageStore.set(event.detail)}
  />

  <section id="intro">
    <a href="/"><img class="logo" src={logo} alt="Trazos Club logo" /></a>

    <nav class="section-nav">
      <a href="#quienes-somos" on:click|preventDefault={scrollIntoView}>{text.intro.navTeam}</a>
      <a href="#de-donde-venimos" on:click|preventDefault={scrollIntoView}>{text.intro.navOrigin}</a>
      <a href="#enlaces" on:click|preventDefault={scrollIntoView}>{text.intro.navLinks}</a>
    </nav>

    <div class="texto">
      {#each text.intro.paragraphs as paragraph}
        <p>{paragraph}</p>
      {/each}
    </div>

    <a class="boton" href="/contact">{text.intro.contactCta}</a>
  </section>

  <section id="quienes-somos">
    <div class="section-inner team-inner">
      <h2 class=" team-heading">{text.team.heading}</h2>

      <div class="team-avatars">
        <a href="http://marcelarapallo.com.ar" target="_blank" rel="noopener noreferrer" class="avatar-card">
          <img src={marcelaAvatar} alt="Marcela Rapallo" />
          <span>Marcela Rapallo</span>
        </a>
        <a href="http://andrescolubri.net/" target="_blank" rel="noopener noreferrer" class="avatar-card">
          <img src={andresAvatar} alt="Andres Colubri" />
          <span>Andres Colubri</span>
        </a>
        <a href="https://gastonlozano.com/" target="_blank" rel="noopener noreferrer" class="avatar-card">
          <img src={gastonAvatar} alt="Gaston Lozano" />
          <span>Gaston Lozano</span>
        </a>
      </div>

      <div class="team-copy">
        <p class="p-1">
          {text.team.introLead}
          <a href="http://marcelarapallo.com.ar" target="_blank" rel="noopener noreferrer"
            >Marcela Rapallo</a
          >,
          <a href="http://andrescolubri.net/" target="_blank" rel="noopener noreferrer"
            >Andres Colubri</a
          >
          {text.team.conjunction}
          <a href="https://gastonlozano.com/" target="_blank" rel="noopener noreferrer"
            >Gaston Lozano</a
          >.
          <a href="http://marcelarapallo.com.ar" target="_blank" rel="noopener noreferrer"
            >Marcela Rapallo</a
          >
          {text.team.introTail}
        </p>
        <p>{text.team.paragraph2}</p>
        <p class="top-gap">
          {text.team.paragraph3Lead}
          <a href="https://www.behance.net/mang" target="_blank" rel="noopener noreferrer"
            >Manuel Gache</a
          >,
          {text.team.paragraph3}
        </p>
        <p class="top-gap">{text.team.paragraph4}</p>
      </div>
    </div>
  </section>

  <section id="de-donde-venimos">
    <div class="columna">
      <img src={deDondeVenimos} alt={text.origin.title} />
      <h2 class="trazos-title">{text.origin.title}</h2>
      {#each text.origin.paragraphs as paragraph}
        <p>{paragraph}</p>
      {/each}
    </div>

    <div class="columna">
      <img src={aDondeVamos} alt={text.future.title} />
      <h2 class="trazos-title">{text.future.title}</h2>
      {#each text.future.paragraphs as paragraph}
        <p>{paragraph}</p>
      {/each}
    </div>
  </section>

  <section id="enlaces">
    <div class="section-inner">
      <h2 class="trazos-title">{text.links.title}</h2>

      <div class="links-group">
        <h3>{text.links.trazosTitle}</h3>
        {#each text.links.trazos as item}
          <a href={item.href} target="_blank" rel="noopener noreferrer">{item.label}</a>
        {/each}
      </div>

      <div class="links-group">
        <h3>{text.links.andiamoTitle}</h3>
        {#each text.links.andiamo as item}
          <a href={item.href} target="_blank" rel="noopener noreferrer">{item.label}</a>
        {/each}
      </div>
    </div>
  </section>
</div>

<style>
  .trazos-title {
    text-transform: none;
  }

  .info-page {
    background: var(--trz-dark);
    color: var(--trz-muted);
    font-family: var(--trz-font-body);
    min-height: 100vh;
  }

  a {
    outline: 0;
  }

  #intro {
    align-items: center;
    background-image: url($lib/images/fondo-intro.png);
    background-repeat: no-repeat;
    background-size: cover;
    display: flex;
    flex-direction: column;
    padding: 112px 20px 60px;
    text-align: center;
  }

  #intro .logo {
    margin: 0 auto 14px;
    max-width: 560px;
    width: min(90vw, 560px);
  }

  #intro .texto {
    font-size: 1rem;
    line-height: 1.6;
    max-width: 840px;
  }

  #intro .texto p {
    margin: 0 0 14px;
  }

  .section-nav {
    display: flex;
    flex-wrap: wrap;
    gap: 14px;
    justify-content: center;
    margin: 8px 0 32px;
  }

  .section-nav a {
    border: 1px solid var(--trz-accent);
    border-radius: 999px;
    color: var(--trz-accent);
    display: inline-flex;
    font-family: var(--trz-font-ui);
    font-size: 0.8rem;
    letter-spacing: 0.03em;
    padding: 8px 14px;
    text-decoration: none;
    text-transform: uppercase;
  }

  .section-nav a:hover {
    background: rgba(0, 255, 0, 0.1);
  }

  .boton {
    align-items: center;
    background-color: var(--trz-accent);
    border: 0;
    border-radius: 999px;
    color: black;
    display: inline-flex;
    font-family: var(--trz-font-ui);
    font-size: 0.82rem;
    font-weight: 700;
    gap: 6px;
    letter-spacing: 0.03em;
    margin-top: 32px;
    padding: 11px 20px;
    text-decoration: none;
    text-transform: uppercase;
  }

  .section-inner {
    margin: 0 auto;
    max-width: 980px;
  }

  #quienes-somos {
    background-color: var(--trz-light);
    color: var(--trz-light-text);
    padding: 38px 20px 64px;
  }

  .team-inner {
    max-width: 980px;
  }

  .team-heading {
    margin: 0 0 20px;
    text-align: left;
  }

  #quienes-somos p {
    color: var(--trz-light-text);
    margin: 0;
  }

  #quienes-somos a {
    color: var(--trz-accent);
    text-decoration: none;
  }

  #quienes-somos a:hover {
    text-decoration: underline;
  }

  .team-avatars {
    display: flex;
    flex-wrap: wrap;
    gap: 18px;
    justify-content: flex-start;
    margin: 0 0 24px;
  }

  .avatar-card {
    align-items: center;
    color: var(--trz-light-text);
    display: flex;
    flex-direction: column;
    gap: 8px;
    text-decoration: none;
    width: min(28vw, 200px);
  }

  .avatar-card img {
    aspect-ratio: 1 / 1;
    border: 2px solid rgba(0, 255, 0, 0.5);
    border-radius: 999px;
    display: block;
    object-fit: cover;
    width: 130px;
  }

  .avatar-card span {
    color: var(--trz-light-text);
    font-family: var(--trz-font-ui);
    font-size: 0.82rem;
    letter-spacing: 0.04em;
    text-align: center;
    text-transform: uppercase;
  }

  .team-copy {
    margin: 0 8px 0 8px;
    max-width: 900px;
  }

  .team-copy p {
    font-size: 0.95rem;
    line-height: 1.62;
    text-align: left;
  }

  .team-copy .p-1{
    font-weight: 600;
    font-size: 1.1em;
    margin-bottom: 16px !important; 
  }

  .top-gap {
    margin-top: 16px !important;
  }

  #de-donde-venimos {
    background-image: url($lib/images/fondo-red-verde.png);
    background-repeat: no-repeat;
    background-size: cover;
    display: flex;
    gap: 24px;
    justify-content: center;
    padding: 54px 20px 56px;
  }

  #de-donde-venimos .columna {
    box-sizing: border-box;
    max-width: 500px;
    padding: 32px;
    text-align: center;
    width: 42%;
  }

  #de-donde-venimos img {
    margin-bottom: 1.5em;
    max-width: 120px;
    width: 32%;
  }

  #de-donde-venimos h2 {
    font-size: 1.5rem;
    margin-bottom: 16px;
  }

  #de-donde-venimos p {
    line-height: 1.62;
    margin: 0 0 10px;
    text-align: left;
  }

  #enlaces {
    background: var(--trz-dark);
    padding: 50px 20px 70px;
  }

  #enlaces .section-inner {
    text-align: center;
  }

  #enlaces h2 {
    font-size: 1.7rem;
    margin: 0 0 32px;
  }

  .links-group {
    align-items: center;
    background: rgba(6, 10, 15, 0.74);
    border: 1px solid rgba(0, 255, 0, 0.2);
    border-radius: 16px;
    display: grid;
    gap: 10px;
    margin: 0 auto 14px;
    max-width: 760px;
    padding: 20px;
  }

  .links-group h3 {
    color: var(--trz-accent);
    font-family: var(--trz-font-display);
    font-size: 1.25rem;
    margin: 0 0 8px;
    text-transform: uppercase;
  }

  .links-group a {
    color: var(--trz-muted);
    line-height: 1.5;
    text-align: center;
    text-decoration: none;
  }

  .links-group a:hover {
    color: var(--trz-accent);
    text-decoration: underline;
  }

  @media (max-width: 1000px) {
    #intro {
      background: none;
      padding-top: 96px;
    }

    #de-donde-venimos {
      flex-direction: column;
    }

    #de-donde-venimos .columna {
      max-width: none;
      padding: 20px 8px;
      width: 100%;
    }

    .team-avatars {
      justify-content: center;
    }

    .avatar-card {
      width: min(40vw, 180px);
    }

    #de-donde-venimos {
      padding: 30px 20px 44px;
    }

    #de-donde-venimos p {
      text-align: center;
    }
  }
</style>
