
<script>
    import logo from '$lib/images/logo.png';
    import deDondeVenimos from '$lib/images/de-donde-venimos.png';
    import aDondeVamos from '$lib/images/a-donde-vamos.png';
    import { goto } from '$app/navigation';
    import logoAndiamo from '$lib/images/logo-andiamo.png';

    function scrollIntoView({ target }) {
		const el = document.querySelector(target.getAttribute('href'));
		if (!el) return;
        el.scrollIntoView({
            behavior: 'smooth'
        });
    }

    function generateRandomString(length) {
        const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
        let result = '';
        for (let i = 0; i < length; i++) {
            result += characters.charAt(Math.floor(Math.random() * characters.length));
        }
        return result;
    }

    function goToBoard() {
       goto(`/board/${generateRandomString(6)}`, true );
    }
</script>
<div class="intro-page">
    <header id="desktopHeader">
        <a on:click={() => goToBoard()} class="boton dibujar">¡A dibujar!</a>
        <nav>
            <a href="#quienes-somos" on:click|preventDefault={scrollIntoView}>Quiénes somos</a>
            <a href="#donde-venimos" on:click|preventDefault={scrollIntoView}>De dónde venimos</a>
            <a href="#donde-venimos" on:click|preventDefault={scrollIntoView}>A donde vamos</a>
        </nav>
    </header>
        <section data-anchor="introducción" id="intro">
            <img class="logo" src={logo} alt="Logo de trazos" />
            <h2>es una plataforma web para dibujo colectivo</h2>
            <div class="texto">
                <p>
                Como plataforma colaborativa, nos permite conectarnos a una página web en la que podemos dibujar con otras 
                personas y animar esos dibujos en vivo. 
                </p>
                <p>
                A través del dibujo de trazos digitales animados en tiempo simultáneo, Trazos Club abre amplias posibilidades
                    para el trabajo artístico interdisciplinario, para abordar diversos contenidos propios del ámbito escolar.
                    A la vez, por su carácter intuitivo, es accesible a un público amplio, favoreciendo la apropiación de los 
                    lenguajes expresivos por parte de la comunidad.
                </p>
                <p>
                Trazos Club es parte de una propuesta de creación de tecnologías de software libre, proyectos artísticos
                    y educativos colaborativos: el proyecto Andiamo que responde a la necesidad de generar una solución tecnológica 
                    mediante sistemas de colaboración en tiempo real, a través de los estándares para la web 2.0.
                </p>
                
                <p class="link">
                    <a href="https://drive.google.com/file/d/12xNf9T9TSBwR0Qhf21FUOYEVujw98QiI/view?usp=sharing" target="_blank">
                      <img src={logoAndiamo} alt="Andiamo Live" title="" style="">
                      <br>
                      +info de este proyecto y tutoriales en Andiamo.live
                    </a>
                  </p>
            </div>
            <a href="/board" class="boton dibujar mobile">¡A dibujar!</a><br />
        </section>
        <section data-anchor="quienes-somos" id="quienes-somos">
            <h2>QUIÉNES SOMOS</h2>
            
            <div class="columns">
                <div class="colLeft">
                    <h1>Trazos.club</h1>
                    <p>
                        es un proyecto<br>
                        ideado por
                        <a href="http://andrescolubri.net/" target="_blank">Andrés Colubri</a>
                        &amp;
                        <a href="http://marcelarapallo.com.ar" target="_blank">Marcela Rapallo</a>
                    </p>
                    <p class="second-tier">quienes forman actualmente el equipo junto a 
                        <a href="https://gastonlozano.com/" target="_blank" style="display: inline;">
                            Gaston Lozano</a>, programador, y 
                        <a href="https://www.behance.net/mang" target="_blank" style="display: inline;">
                            Manuel Gache</a>, quien diseña la identidad del proyecto.
                    </p>
                    <!-- <a href="#contactanos" id="btnContactar" class="boton">
                        Contactar
                    </a> -->
                </div>
                <div class="spacer"></div>
                <div class="colRight">
                    <p>Participaron en la programación del proyecto en sus primeros pasos: Leandro Garber, Leslie Watkins y Nahuel Coppero.</p><p style="margin-top: 20px;">Trazos Club también es un proyecto detrás del cual hay una comunidad de personas de diferentes edades que se conectan a dibujar  desde diferentes lugares del mundo. Además, se utiliza en proyectos artísticos, en ámbitos educativos, en la cotidianidad de quienes se conectan entre sí a través de la plataforma, y de todas las personas que se suman semanalmente a las jams de dibujo organizadas por el equipo de Trazos Club.</p>
                    <p style="margin-top: 20px;">
                        Queremos agradecer especialmente a quienes han participado y apoyado el proyecto: Myriam Beutelspacher, Bianca Racioppe, Ana Laura Califa, Lau Castro, Nahuel Cañada, la Universidad Nacional de las Artes y el Club Cultural Matienzo.             
                    </p>
                    <p></p>
                </div>
            </div>
        </section>
        <section data-anchor="donde-venimos" id="donde-venimos">
            <div class="columna">
                <img src={deDondeVenimos} alt="De donde venimos" />
                <h2>¿De dónde venimos?</h2>
                <div>
                    <ul>
                        <li>
                            El proyecto surgió del trabajo conjunto de Andrés Colubri y Marcela Rapallo 
                            en el desarrollo de tecnologías libres para dibujo en vivo y <a href="https://www.youtube.com/watch?v=9IcbwkoXfTs" target="_blank">obras teatrales y performáticas</a> con las plataformas <a href="http://www.moldeo.org/" target="_blank">Moldeo</a> y <a href="https://github.com/andiamo/andiamo" target="_blank">Andiamo</a>. También del trabajo de
                                Andrés Colubri en el desarrollo de <a href="https://processing.org/" target="_blank">Processing</a>, y de los proyectos pedagógicos 
                                de Marcela Rapallo centrados en el <a href="https://www.youtube.com/playlist?list=PLLA0_JIKZmaL7rd19wnZEepKbU2FPlbaX" target="_blank">dibujo en escena</a>
                                y el <a href="https://www.youtube.com/watch?v=LBqEtj6JOlU" target="_blank">dibujo colectivo</a>.
                        </li>
                        <li>
                            El primer prototipo de trazos.club se realizó gracias a ser seleccionado por el
                            Programa Universidad, Diseño y Desarrollo Productivo del Ministerio de Educación 
                            de la Nación, como proyecto de desarrollo de la <a href="http://una.edu.ar/">UNA (Universidad Nacional de las 
                            Artes de Argentina)</a>, contando con la dirección académica de Gabriel Gendin y la 
                            colaboración de un equipo interdisciplinario de estudiantes y profesores de las 
                            diferentes unidades académicas de la Universidad.
                        </li>
                        <!-- <li>
                            Participaron en la programación del proyecto en sus primeros pasos: Leandro Garber, Leslie Watkins y Nahuel Coppero.
                        </li> -->
                    </ul>
                </div>
            </div>
            <div class="columna">
                <img src={aDondeVamos} alt="A donde vamos" />
                <h2>¿A dónde vamos?</h2>
                <p>
                    <strong>Trazos.club</strong>, tal como se presenta hoy, es el comienzo de un proyecto más grande que estamos ideando los miembros del equipo, que crecerá tomando la forma de un Club de dibujo virtual, un lugar de encuentro con actividades de dibujo colectivo animado en vivo. Hoy la plataforma es un primer prototipo, una semilla, del proyecto a gran escala que deseamos concretar.
                </p>
                <!-- <p>
                    Queremos agradecer especialmente a quienes han participado y apoyado el proyecto: Damián del Valle, Myriam Beutelspacher, Bianca Racioppe, Ana Laura Califa, y el Club Cultural Matienzo.
                </p>    -->
            </div>
        </section>
</div>
<style>
.intro-page{
    font-family: 'Roboto Mono';
    font-weight: 300;
}

.clear {
    clear: both;
}

a {
    outline: 0;
}

.spacer{
    padding:24px;
}

.boton:hover {
    text-decoration: underline;
}
.boton {
    color: black !important;
    text-decoration: none;
    text-transform: uppercase;
    font-weight: bold;
    background-color: #00ff00;
    display: inline-block !important;
    padding: 0.2em 3em;
    border-radius: 33px;
    margin-top: 2em;
}
.mobile{
    display: none !important;
}

header {
    /*border-bottom: 1px solid #00FF00;*/
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    /*padding: 1em 0;*/
    padding: 0.7em 0;
    z-index: 10;

    transition: opacity 0.6s, visibility 0.6s;
}
header.hide {
    opacity: 0;
    visibility: hidden;
}
header a.dibujar {
    margin-left: 3%;
    float: left;
    cursor: pointer;
    margin-top: 0;
    line-height: 2.8em;
    padding: 0 2em;
    font-size: 0.7em;
}
header nav {
    float: right;
    line-height: 2.2em;
}
header nav a {
    display: inline-block;
    margin-right: 2em;
    text-transform: uppercase;
    text-decoration: none;
    color: #00FF00;
    font-size: 0.8em;
}
header nav a.active {
    text-decoration: underline;
}

section#intro {
    text-align: center;
    background-image: url($lib/images/fondo-intro.png);
    background-size: cover;
    background-repeat: no-repeat;
    padding-top: 3em;
    min-height: 80vh;
    display: flex;
    flex-direction: column;
    justify-content: space-around;
}

section#intro .logo{
    max-width: 600px;
    width:fit-content;
    margin:0 auto;
}

section#intro .link{
    margin-top: 32px;
}
section#intro a img {
    height: 30px;
    width: auto;
}
section#intro a {
    color: #00ff00;
}
section#intro h2 {
    font-size: 26px;
    color: #00ff00;
    font-weight: 300;
}
section#intro .texto {
    font-size: 15px;
    color: #babcbe;
    width: 50%;
    margin: 0 auto;
}

section#quienes-somos {
    background-color: white;
    color: #231f20;
    padding-top: 2.5em;
    display: flex;
    flex-direction: column;
    min-height: 70vh;
}
section#quienes-somos h1 {
    color: #231f20;
    font-size: 2.2em;
    margin: 0;
    padding: 0;
}
section#quienes-somos h2 {
    color: #00ff00;
    margin-top: 0;
    font-size: 1.4em;
    margin:auto;
}
section#quienes-somos a {
    color: #00FF00;
}

section#quienes-somos p {
    font-weight: 300;
    color: #231f20;
    font-size: 2.4em;
    margin: 0;
    padding: 0;
}

section#quienes-somos .columns{
    display: flex;
    justify-items: center;
    margin: auto;
    padding-bottom: 64px;
}

section#quienes-somos .colRight,
section#quienes-somos .colLeft
{
    margin-top: 4em;
    margin-bottom: 3em;
    flex:1;
    max-width: 500px;
}

section#quienes-somos .colLeft .second-tier {
    font-size: 1.2em;
    line-height: 36px;
    padding-top: 16px;
}

section#quienes-somos .colRight p strong {
    font-weight: bold;
    margin-top: 2em;
    display: block;
}
section#quienes-somos .colRight p {
    font-size: 0.9em;
}
section#quienes-somos .colRight ul {
    padding: 0 1em;
    margin: 0;
    margin-bottom: 1.5em;
    margin-top: 0.3em;
}
section#quienes-somos .colRight ul li {
    font-size: 0.9em;
}

section#quienes-somos .colLeft {
    text-align: right;
    line-height: 42px;
    margin-top: 3.4em;
}

section#quienes-somos .colLeft a {
    display: block;
}


section#donde-venimos {
    background-image: url($lib/images/fondo-red-verde.png);
    background-size: cover;
    background-repeat: no-repeat;
    display: flex;
    min-height: 90vh;
    padding-top: 64px;
}

section#donde-venimos strong {
    font-weight: bold;
}

section#donde-venimos .columna {
    float: left;
    width: 35%;
    text-align: center;
    padding: 0 7%;
}

section#donde-venimos img {
    width: 32%;
    margin-bottom: 2.5em;
}

section#donde-venimos h2 {
    font-weight: 300;
    color: #00FF00;
    font-size: 1.7em;
}

section#donde-venimos p,
section#donde-venimos ul li {
    font-size: 0.9em;
}

section#donde-venimos ul li {
    margin-bottom: 1em;
}

section#donde-venimos ul li a {
    color: #00FF00;
}

section#contacto {
    background-color: white;
}
section#contacto > div {
    vertical-align: baseline;
}
section#contacto h2 {
    background-color: #00FF00;
    text-align: center;
    padding: 2.5em 0;
    margin: 0;
    color: black;
    font-weight: 300;
    font-size: 1.8em;
}

section#contacto input {
    background: none;
    border: none;
    border-bottom: 1px solid gray;
    width: 30%;
    font-family: inherit;
    line-height: 4em;
}

section#contacto input.email {
    margin: 0 3.9%;
}

section#contacto textarea {
    display: block;
    width: 100%;
    background: none;
    border: none;
    border-bottom: 1px solid gray;
    resize: none;
    margin: 9em 0 4em;
    font-family: inherit;
}

section#contacto button {
    border: none;
    line-height: 3em;
    padding: 0 3%;
    cursor: pointer;

    transition: padding 0.3s, background-color 0.3s;
}
section#contacto button.enviado {
    padding: 0;
    background-color: rgba(0,0,0,0);
}
section#contacto button.enviado:hover {
    text-decoration: none;
    cursor: default;
}
section#contacto fieldset {
    border: 0;
    padding: 3em 5em;
}

footer {
    background-color: black;
    position: absolute;
    bottom: 0px;
    left: 0px;
    padding: 0.9em 0;
    text-align: right;
    width: 100%;
}
footer img {
    width: 28px;
    margin-left: 0.2em;
}

footer .flecha {
    margin: 0 1em;
}
.desktopHeader a{
    cursor: pointer;
}


@media (max-width: 1000px) {
    #desktopHeader{
        display: none;
    }
    .mobile{
        display: block !important;
    }
    .boton.mobile{
        display: block !important;
        width: 250px;
        padding: 25px;
        font-size: 2em;
        margin: 70px auto;
    }
    section#intro {
        background: none;
        justify-content: center;
        align-items: center;
    }
    section#intro .logo {
        /* width: 25%; */
    }
    section#intro h2 {
        font-size:2em;
    }
    section#intro .texto {
        font-size: 1.8em;
        width: 80%;
    }
    section#intro a img {
        width: 10%;
    }
    section#quienes-somos .colRight p {
        font-size: 1.8em;
    }
    section#quienes-somos .colRight ul li {
        font-size: 1.5em;
    }
    section#quienes-somos h2 {
        font-size: 1.8em;
    }
    section#quienes-somos .colRight {
        width: 55%;
    }
    section#quienes-somos #btnContactar{
        font-size: 1.5em;
    }
    section#donde-venimos .columna {
        float: none;
        width: 100%;
        text-align: center;
        padding: 0;
        font-size: 1.8em;
    }
    section#donde-venimos h2{
        margin: 0;
    }
    section#donde-venimos .fp-tableCell{
        padding: 30px 60px;
    }
    section#donde-venimos img {
        width: 28%;
        margin-bottom: 0;
        margin-top: 25px;
    }
    section#contacto input,section#contacto textarea {
        font-size: 1.8em;
    }
    section#contacto textarea {
        margin:3em 0 4em;
    }
    section#contacto #btnEnviar{
        font-size: 1.8em;
    }
}


</style>

    <!-- <script src="../js/lib/jquery.min.js"></script>
    <script src="../js/lib/jquery.fullPage.min.js" charset="utf-8"></script>
    <script src="../js/trazos/about.js" charset="utf-8"></script> -->
