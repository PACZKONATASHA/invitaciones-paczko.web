/* ══════════════════════════════════════════
   PACZKO · Invitaciones digitales
   ══════════════════════════════════════════ */
(function () {
  'use strict';

  var raiz  = document.documentElement;
  var suave = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var nav    = document.getElementById('nav');
  var wa     = document.querySelector('.wa-float');
  var deck   = document.getElementById('deck');
  var slides = deck ? [].slice.call(deck.querySelectorAll('.slide')) : [];

  /* El deck de pantallas completas necesita una pantalla grande: hay
     secciones (las invitaciones, el recorrido) que en un celular no
     entran ni cerca. Ahí la página vuelve al scroll de siempre. */
  var pantallaDeck = window.matchMedia('(min-width: 901px) and (min-height: 620px)');
  var modoDeck = !!(deck && slides.length > 1 && pantallaDeck.matches);

  /* Si se cruza ese límite (agrandar la ventana, rotar la tablet) se
     rearma la página en el modo que corresponde. */
  if (deck && pantallaDeck.addEventListener) {
    var relojModo = null;
    pantallaDeck.addEventListener('change', function () {
      clearTimeout(relojModo);
      relojModo = setTimeout(function () { window.location.reload(); }, 350);
    });
  }


  /* ══════════════════════════════════════════
     1 · DECK: una sección por pantalla
     El scroll no baja la página: cambia de sección
     con un fundido. Las secciones más altas que la
     pantalla se desplazan por dentro y recién al
     llegar al borde se pasa a la siguiente.
     ══════════════════════════════════════════ */

  var actual    = 0;
  var bloqueado = false;
  var acumulado = 0;
  var relojAcum = null;
  var relojCandado = null;
  var temporizadores = [];

  var UMBRAL  = 28;    // px de rueda necesarios para cambiar de sección
  var CANDADO = 950;   // ms de espera entre cambios
  var BORDE   = 3;     // px de tolerancia al medir el borde del scroll interno

  function scrollerDe(i) {
    return slides[i].querySelector('.slide__scroll');
  }

  function indiceDe(id) {
    for (var i = 0; i < slides.length; i++) {
      if (slides[i].getAttribute('data-id') === id) return i;
      if (slides[i].querySelector('#' + id)) return i;
    }
    return -1;
  }

  function limpiarTiempos() {
    temporizadores.forEach(clearTimeout);
    temporizadores = [];
  }

  function esperar(fn, ms) {
    temporizadores.push(setTimeout(fn, ms));
  }

  /* Las animaciones de entrada se disparan cuando la sección aparece
     y se rearman al salir, así se vuelven a ver al volver. */
  function revelar(slide) {
    var els = slide.querySelectorAll('.reveal');
    [].forEach.call(els, function (el, n) {
      if (!suave) { el.classList.add('is-in'); return; }
      esperar(function () { el.classList.add('is-in'); }, 140 + Math.min(n, 9) * 95);
    });
  }

  function rearmar(slide) {
    [].forEach.call(slide.querySelectorAll('.reveal'), function (el) {
      el.classList.remove('is-in');
    });
  }

  function ir(i) {
    if (!modoDeck) return;
    i = Math.max(0, Math.min(slides.length - 1, i));
    if (i === actual && slides[i].classList.contains('is-active')) return;

    var previa = slides[actual];
    var nueva  = slides[i];
    actual = i;

    limpiarTiempos();          // corta los reveals que quedaban en cola
    clearTimeout(relojCandado);
    bloqueado = true;
    relojCandado = setTimeout(function () { bloqueado = false; }, CANDADO);

    if (previa !== nueva) {
      previa.classList.remove('is-active');
      previa.dispatchEvent(new CustomEvent('slide:leave'));
      // Recién cuando terminó el fundido: si sigue afuera, se rearma.
      setTimeout(function () {
        if (previa.classList.contains('is-active')) return;
        rearmar(previa);
        var sc = previa.querySelector('.slide__scroll');
        if (sc) sc.scrollTop = 0;
      }, CANDADO);
    }

    nueva.classList.add('is-active');
    nueva.dispatchEvent(new CustomEvent('slide:enter'));
    revelar(nueva);
    pintarEstado();
  }

  /* Baja dentro de la sección si todavía queda contenido;
     si no, pasa a la siguiente. */
  function avanzar(dir) {
    var sc = scrollerDe(actual);
    if (sc) {
      var sobra = sc.scrollHeight - sc.clientHeight;
      if (sobra > BORDE) {
        var arriba = sc.scrollTop <= BORDE;
        var abajo  = sc.scrollTop >= sobra - BORDE;
        if ((dir > 0 && !abajo) || (dir < 0 && !arriba)) {
          sc.scrollBy({ top: dir * sc.clientHeight * 0.85, behavior: suave ? 'smooth' : 'auto' });
          return;
        }
      }
    }
    ir(actual + dir);
  }


  /* ── Estado visual: nav, puntos, flecha, WhatsApp ── */
  var puntos  = [];
  var btnNext = document.getElementById('deckNext');

  function pintarFlecha() {
    if (!btnNext) return;
    var sc = scrollerDe(actual);
    var quedaDentro = sc && (sc.scrollHeight - sc.clientHeight - sc.scrollTop) > 40;
    var ultima = actual === slides.length - 1;
    // En el hero ya está la línea animada que invita a bajar.
    var sobra = actual === 0 || (ultima && !quedaDentro);
    btnNext.classList.toggle('is-off', sobra);
  }

  function pintarEstado() {
    var slide  = slides[actual];
    var oscura = slide.getAttribute('data-tone') === 'dark';

    raiz.classList.toggle('slide-dark', oscura);
    nav.classList.toggle('is-stuck', !slide.classList.contains('slide--hero'));
    if (wa) wa.classList.toggle('is-in', actual > 0);

    puntos.forEach(function (p, n) {
      p.classList.toggle('is-on', n === actual);
      p.setAttribute('aria-current', n === actual ? 'true' : 'false');
    });

    pintarFlecha();
  }

  function armarPuntos() {
    var caja = document.getElementById('deckDots');
    if (!caja) return;

    slides.forEach(function (s, i) {
      var titulo = s.getAttribute('data-label') || ('Sección ' + (i + 1));
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'dots__dot';
      b.innerHTML = '<span class="dots__dot-label"></span><span class="dots__dot-line"></span>';
      b.firstChild.textContent = titulo;
      b.setAttribute('aria-label', 'Ir a ' + titulo);
      b.addEventListener('click', function () { ir(i); });
      caja.appendChild(b);
      puntos.push(b);
    });
  }


  if (modoDeck) {
    raiz.classList.add('deck-on');
    armarPuntos();

    /* ── Rueda del mouse / trackpad ── */
    deck.addEventListener('wheel', function (e) {
      if (raiz.classList.contains('menu-abierto')) return;

      var d = e.deltaY;
      if (!d) return;

      var sc = scrollerDe(actual);
      if (sc) {
        var sobra = sc.scrollHeight - sc.clientHeight;
        if (sobra > BORDE) {
          var arriba = sc.scrollTop <= BORDE;
          var abajo  = sc.scrollTop >= sobra - BORDE;
          // Todavía queda contenido en esta sección: que scrollee por dentro.
          if ((d > 0 && !abajo) || (d < 0 && !arriba)) { acumulado = 0; return; }
        }
      }

      e.preventDefault();
      if (bloqueado) return;

      acumulado += d;
      clearTimeout(relojAcum);
      relojAcum = setTimeout(function () { acumulado = 0; }, 220);

      if (acumulado > UMBRAL)       { acumulado = 0; ir(actual + 1); }
      else if (acumulado < -UMBRAL) { acumulado = 0; ir(actual - 1); }
    }, { passive: false });

    /* ── Deslizar con el dedo ── */
    var tY = 0, tX = 0, tocando = false;

    deck.addEventListener('touchstart', function (e) {
      tocando = e.touches.length === 1;
      if (!tocando) return;
      tY = e.touches[0].clientY;
      tX = e.touches[0].clientX;
    }, { passive: true });

    deck.addEventListener('touchend', function (e) {
      if (!tocando || bloqueado) return;
      tocando = false;

      var t  = e.changedTouches[0];
      var dy = tY - t.clientY;
      var dx = Math.abs(tX - t.clientX);
      if (Math.abs(dy) < 55 || dx > Math.abs(dy)) return;

      var sc = scrollerDe(actual);
      if (sc) {
        var sobra = sc.scrollHeight - sc.clientHeight;
        if (sobra > BORDE) {
          if (dy > 0 && sc.scrollTop < sobra - BORDE) return;
          if (dy < 0 && sc.scrollTop > BORDE) return;
        }
      }
      ir(actual + (dy > 0 ? 1 : -1));
    }, { passive: true });

    /* ── Teclado ── */
    document.addEventListener('keydown', function (e) {
      if (raiz.classList.contains('menu-abierto')) return;
      // Con el visor abierto, las flechas pasan de diseño (ver punto 8).
      if (raiz.classList.contains('zoom-abierto')) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      // Mientras se completa el formulario, las teclas son para escribir.
      if (e.target.closest && e.target.closest('input, textarea, select')) return;

      switch (e.key) {
        case 'ArrowDown':
        case 'PageDown': e.preventDefault(); avanzar(1);  break;
        case 'ArrowUp':
        case 'PageUp':   e.preventDefault(); avanzar(-1); break;
        case 'Home':     e.preventDefault(); ir(0); break;
        case 'End':      e.preventDefault(); ir(slides.length - 1); break;
      }
    });

    /* ── Los enlaces internos saltan de sección ── */
    document.addEventListener('click', function (e) {
      var a = e.target.closest && e.target.closest('a[href^="#"]');
      if (!a) return;
      var id = a.getAttribute('href').slice(1);
      if (!id) return;
      var i = indiceDe(id);
      if (i < 0) return;
      e.preventDefault();
      ir(i);
    });

    /* ── Flecha de avance ── */
    if (btnNext) btnNext.addEventListener('click', function () { avanzar(1); });

    /* ── El scroll interno también repinta la flecha ── */
    slides.forEach(function (s) {
      var sc = s.querySelector('.slide__scroll');
      if (!sc) return;
      sc.addEventListener('scroll', function () {
        if (s.classList.contains('is-active')) pintarFlecha();
      }, { passive: true });
    });

    window.addEventListener('resize', pintarFlecha);

    /* ── Arranque: la sección del enlace, o el hero ── */
    var inicial = window.location.hash ? indiceDe(window.location.hash.slice(1)) : -1;
    actual = inicial > 0 ? inicial : 0;
    slides[actual].classList.add('is-active');
    pintarEstado();
    revelar(slides[actual]);
    slides[actual].dispatchEvent(new CustomEvent('slide:enter'));
  }


  /* ══════════════════════════════════════════
     2 · Sin deck (fallback): página de scroll normal
     ══════════════════════════════════════════ */
  if (!modoDeck) {
    var aparecer = document.querySelectorAll('.reveal');

    if ('IntersectionObserver' in window) {
      var obsReveal = new IntersectionObserver(function (entradas) {
        entradas.forEach(function (e) {
          if (e.isIntersecting) {
            e.target.classList.add('is-in');
            obsReveal.unobserve(e.target);
          }
        });
      }, { threshold: 0.14, rootMargin: '0px 0px -8% 0px' });

      [].forEach.call(aparecer, function (el) { obsReveal.observe(el); });
    } else {
      [].forEach.call(aparecer, function (el) { el.classList.add('is-in'); });
    }

    var alScrollear = function () {
      var y = window.scrollY || window.pageYOffset;
      nav.classList.toggle('is-stuck', y > 80);
      if (wa) wa.classList.toggle('is-in', y > window.innerHeight * 0.6);
    };
    window.addEventListener('scroll', alScrollear, { passive: true });
    alScrollear();
  }


  /* ══════════════════════════════════════════
     3 · Menú de celular
     ══════════════════════════════════════════ */
  var burger = document.getElementById('navBurger');
  var menu   = document.getElementById('navMenu');

  function cerrarMenu() {
    nav.classList.remove('is-open');
    raiz.classList.remove('menu-abierto');
    document.body.classList.remove('menu-abierto');
    if (burger) burger.setAttribute('aria-expanded', 'false');
  }

  if (burger && menu) {
    burger.addEventListener('click', function () {
      var abierto = nav.classList.toggle('is-open');
      raiz.classList.toggle('menu-abierto', abierto);
      document.body.classList.toggle('menu-abierto', abierto);
      burger.setAttribute('aria-expanded', abierto ? 'true' : 'false');
      burger.setAttribute('aria-label', abierto ? 'Cerrar menú' : 'Abrir menú');
    });

    menu.addEventListener('click', function (e) {
      if (e.target.closest('a')) cerrarMenu();
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') cerrarMenu();
    });

    window.addEventListener('resize', function () {
      if (window.innerWidth > 900) cerrarMenu();
    });
  }


  /* ══════════════════════════════════════════
     4 · Videos (paso 02 y la frase final):
         se reproducen sólo al ver su sección
     ══════════════════════════════════════════ */
  var video         = document.getElementById('tourVideo');
  var videoHistoria = document.getElementById('storyVideo');
  var btnSonido     = document.getElementById('tourSound');
  var iconoSonido   = document.getElementById('tourSoundIcon');

  function reproducir(v) {
    var p = v.play();
    if (p && p.catch) p.catch(function () {});
  }

  function reproducirAlVer(v) {
    var slideVideo = v.closest('.slide');

    if (modoDeck && slideVideo) {
      slideVideo.addEventListener('slide:enter', function () { reproducir(v); });
      slideVideo.addEventListener('slide:leave', function () { v.pause(); });
      if (slideVideo.classList.contains('is-active')) reproducir(v);
    } else if ('IntersectionObserver' in window) {
      var obsVideo = new IntersectionObserver(function (entradas) {
        entradas.forEach(function (e) {
          if (e.isIntersecting) reproducir(v); else v.pause();
        });
      }, { threshold: 0.45 });
      obsVideo.observe(v);
    }
  }

  if (video) reproducirAlVer(video);
  if (videoHistoria) reproducirAlVer(videoHistoria);

  if (btnSonido && video) {
    btnSonido.addEventListener('click', function () {
      video.muted = !video.muted;
      iconoSonido.textContent = video.muted ? '🔇' : '🔊';
      if (!video.muted) reproducir(video);
    });
  }


  /* ══════════════════════════════════════════
     5 · Paso 03: la tarjeta se desplaza sola,
         como si el invitado bajara
     ══════════════════════════════════════════ */
  var tarjeta = document.getElementById('cardScroll');

  if (tarjeta && suave) {
    var animando = false;
    var inicio   = 0;
    var rafId    = null;
    var manual   = false;

    var PAUSA  = 1400;   // ms quieta arriba antes de bajar
    var BAJADA = 5200;   // ms de recorrido
    var ESPERA = 1800;   // ms quieta abajo antes de volver

    var recorrer = function (t) {
      if (!inicio) inicio = t;
      var pasado = t - inicio;
      var total  = tarjeta.scrollHeight - tarjeta.clientHeight;
      var ciclo  = PAUSA + BAJADA + ESPERA;
      var d = pasado % ciclo;
      var p;

      if (d < PAUSA) {
        p = 0;
      } else if (d < PAUSA + BAJADA) {
        var x = (d - PAUSA) / BAJADA;
        p = x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2; // easeInOut
      } else {
        p = 1;
      }

      tarjeta.scrollTop = total * p;
      if (animando) rafId = requestAnimationFrame(recorrer);
    };

    var frenar = function () {
      animando = false;
      if (rafId) cancelAnimationFrame(rafId);
      rafId = null;
    };

    var arrancar = function () {
      if (manual || animando) return;
      animando = true;
      inicio = 0;
      rafId = requestAnimationFrame(recorrer);
    };

    tarjeta.addEventListener('pointerdown', function () { manual = true; frenar(); });
    tarjeta.addEventListener('wheel', function () { manual = true; frenar(); }, { passive: true });

    var slideTarjeta = tarjeta.closest('.slide');

    if (modoDeck && slideTarjeta) {
      slideTarjeta.addEventListener('slide:enter', arrancar);
      slideTarjeta.addEventListener('slide:leave', frenar);
      if (slideTarjeta.classList.contains('is-active')) arrancar();
    } else if ('IntersectionObserver' in window) {
      var obsTarjeta = new IntersectionObserver(function (entradas) {
        entradas.forEach(function (e) {
          if (e.isIntersecting) arrancar(); else frenar();
        });
      }, { threshold: 0.5 });
      obsTarjeta.observe(tarjeta);
    }
  }


  /* ══════════════════════════════════════════
     6 · Formulario: arma el mensaje con todos
         los datos y lo abre en WhatsApp
     ══════════════════════════════════════════ */
  var form      = document.getElementById('orderForm');
  var errorForm = document.getElementById('orderError');
  var WHATSAPP  = '5493786417162';

  function valor(nombre) {
    var campo = form.elements[nombre];
    return campo ? campo.value.trim() : '';
  }

  // "2026-08-30" → "domingo 30 de agosto de 2026"
  function fechaLarga(iso) {
    if (!iso) return '';
    var d = new Date(iso + 'T12:00:00');
    if (isNaN(d)) return iso;
    return d.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  }

  if (form) {
    form.addEventListener('input', function (e) {
      var campo = e.target.closest('.field');
      if (campo && e.target.value.trim()) campo.classList.remove('is-error');
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();

      var faltan = [].filter.call(form.querySelectorAll('[required]'), function (c) {
        var vacio = !c.value.trim();
        c.closest('.field').classList.toggle('is-error', vacio);
        return vacio;
      });

      errorForm.hidden = !faltan.length;
      if (faltan.length) { faltan[0].focus(); return; }

      var horario = valor('desde') && valor('hasta')
        ? 'De ' + valor('desde') + ' a ' + valor('hasta') + ' hs'
        : (valor('desde') ? 'Desde las ' + valor('desde') + ' hs' : '');

      var filas = [
        ['Evento',     valor('tipo')],
        ['Mi nombre',  valor('cliente')],
        ['Nombre',     valor('nombre')],
        ['Edad',       valor('edad') ? valor('edad') + ' años' : ''],
        ['Fecha',      fechaLarga(valor('fecha'))],
        ['Horario',    horario],
        ['Lugar',      valor('lugar')],
        ['Dirección',  valor('direccion')],
        ['Temática',   valor('tematica')],
        ['Colores',    valor('colores')],
        ['Canción',    valor('cancion')],
        ['Video',      valor('video')],
        ['Comentarios', valor('mensaje')]
      ];

      var texto = '¡Hola! Quiero hacer una invitación digital personalizada ✨\n\n' +
        filas.filter(function (f) { return f[1]; })
             .map(function (f) { return '*' + f[0] + ':* ' + f[1]; })
             .join('\n');

      window.location.href = 'https://wa.me/' + WHATSAPP + '?text=' + encodeURIComponent(texto);
    });
  }


  /* ══════════════════════════════════════════
     7 · Diseños: "Quiero una así" lleva al
         formulario con el evento, la temática
         y los colores del diseño ya cargados
     ══════════════════════════════════════════ */
  var ideas = document.getElementById('ideas');

  // El salto al formulario lo resuelve el enlace (o el deck); acá sólo se cargan los datos.
  function cargarIdea(idea) {
    if (!form) return;
    ['tipo', 'tematica', 'colores'].forEach(function (nombre) {
      var dato  = idea.getAttribute('data-' + nombre);
      var campo = form.elements[nombre];
      if (!dato || !campo) return;

      campo.value = dato;
      var caja = campo.closest('.field');
      caja.classList.remove('is-error', 'is-sugerido');
      void caja.offsetWidth;   // así el destello se repite si eligen otro diseño
      caja.classList.add('is-sugerido');
    });
  }

  if (ideas) {
    ideas.addEventListener('click', function (e) {
      var enlace = e.target.closest('a[href="#formulario"]');
      var idea   = enlace && enlace.closest('.idea');
      if (idea) cargarIdea(idea);
    });
  }


  /* ══════════════════════════════════════════
     8 · Visor: al tocar una portada se abre
         en grande, con flechas (o deslizando
         el dedo) para pasar al diseño de al lado
     ══════════════════════════════════════════ */
  var zoom = document.getElementById('zoom');

  if (ideas && zoom) {
    var tarjetas    = [].slice.call(ideas.querySelectorAll('.idea'));
    var escenario   = document.getElementById('zoomStage');
    var zoomTipo    = document.getElementById('zoomType');
    var zoomNombre  = document.getElementById('zoomName');
    var zoomDesc    = document.getElementById('zoomDesc');
    var zoomCta     = document.getElementById('zoomCta');
    var zoomCerrar  = zoom.querySelector('.zoom__close');
    var enZoom      = 0;
    var antesDeZoom = null;   // lo que tenía el foco, para devolvérselo al cerrar
    var relojZoom   = null;

    var textoDe = function (idea, sel) {
      var el = idea.querySelector(sel);
      return el ? el.textContent : '';
    };

    var mostrarZoom = function (n) {
      enZoom = (n + tarjetas.length) % tarjetas.length;
      var idea   = tarjetas[enZoom];
      var nombre = textoDe(idea, '.idea__name');

      // La copia es sólo para mirar: va en un <div>, sin el rótulo del hover
      // y sin ids repetidos (los <use> del SVG siguen apuntando a la galería).
      var copia = document.createElement('div');
      copia.className = idea.querySelector('.idea__cover').className;
      copia.innerHTML = idea.querySelector('.idea__cover').innerHTML;
      copia.setAttribute('role', 'img');
      copia.setAttribute('aria-label', 'Diseño ' + nombre);
      [].forEach.call(copia.querySelectorAll('.idea__hover'), function (el) { el.remove(); });
      [].forEach.call(copia.querySelectorAll('[id]'), function (el) { el.removeAttribute('id'); });
      [].forEach.call(copia.querySelectorAll('img'), function (el) { el.removeAttribute('loading'); });

      escenario.innerHTML = '';
      escenario.appendChild(copia);
      zoomTipo.textContent   = textoDe(idea, '.idea__type');
      zoomNombre.textContent = nombre;
      zoomDesc.textContent   = textoDe(idea, '.idea__desc');
      zoomCta.setAttribute('aria-label', 'Quiero una invitación como el diseño ' + nombre);
    };

    var abrirZoom = function (n) {
      antesDeZoom = document.activeElement;
      mostrarZoom(n);
      clearTimeout(relojZoom);
      zoom.hidden = false;
      raiz.classList.add('zoom-abierto');
      void zoom.offsetWidth;   // así arranca el fundido
      zoom.classList.add('is-open');
      zoomCerrar.focus({ preventScroll: true });
    };

    var cerrarZoom = function (devolverFoco) {
      if (zoom.hidden) return;
      zoom.classList.remove('is-open');
      raiz.classList.remove('zoom-abierto');
      relojZoom = setTimeout(function () {
        zoom.hidden = true;
        escenario.innerHTML = '';
      }, suave ? 350 : 0);
      if (devolverFoco && antesDeZoom && antesDeZoom.focus) antesDeZoom.focus({ preventScroll: true });
    };

    tarjetas.forEach(function (idea, n) {
      idea.querySelector('.idea__cover').addEventListener('click', function () { abrirZoom(n); });
    });

    [].forEach.call(zoom.querySelectorAll('[data-zoom-cerrar]'), function (el) {
      el.addEventListener('click', function () { cerrarZoom(true); });
    });
    document.getElementById('zoomPrev').addEventListener('click', function () { mostrarZoom(enZoom - 1); });
    document.getElementById('zoomNext').addEventListener('click', function () { mostrarZoom(enZoom + 1); });

    // "Quiero una así": carga los datos, cierra el visor y el enlace sigue al formulario.
    zoomCta.addEventListener('click', function () {
      cargarIdea(tarjetas[enZoom]);
      cerrarZoom(false);
    });

    document.addEventListener('keydown', function (e) {
      if (zoom.hidden) return;

      if (e.key === 'Escape')     { cerrarZoom(true); return; }
      if (e.key === 'ArrowLeft')  { e.preventDefault(); mostrarZoom(enZoom - 1); return; }
      if (e.key === 'ArrowRight') { e.preventDefault(); mostrarZoom(enZoom + 1); return; }

      // El Tab da vueltas adentro del visor
      if (e.key === 'Tab') {
        var focos   = zoom.querySelectorAll('button, a[href]');
        var primero = focos[0];
        var ultimo  = focos[focos.length - 1];
        if (!zoom.contains(document.activeElement)) { e.preventDefault(); primero.focus(); }
        else if (e.shiftKey && document.activeElement === primero) { e.preventDefault(); ultimo.focus(); }
        else if (!e.shiftKey && document.activeElement === ultimo) { e.preventDefault(); primero.focus(); }
      }
    });

    /* Deslizar con el dedo pasa de diseño; mientras tanto la página
       de atrás no se mueve (con dos dedos se puede seguir haciendo zoom). */
    var zX = 0, zY = 0, zUnDedo = false;

    zoom.addEventListener('touchstart', function (e) {
      zUnDedo = e.touches.length === 1;
      if (!zUnDedo) return;
      zX = e.touches[0].clientX;
      zY = e.touches[0].clientY;
    }, { passive: true });

    zoom.addEventListener('touchmove', function (e) {
      if (e.touches.length === 1) e.preventDefault();
      else zUnDedo = false;
    }, { passive: false });

    zoom.addEventListener('touchend', function (e) {
      if (!zUnDedo || e.touches.length) return;
      zUnDedo = false;
      var t  = e.changedTouches[0];
      var dx = t.clientX - zX;
      var dy = t.clientY - zY;
      if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) mostrarZoom(enZoom + (dx < 0 ? 1 : -1));
    }, { passive: true });
  }


  /* ══════════════════════════════════════════
     9 · Footer: el año del © siempre al día
     ══════════════════════════════════════════ */
  var anio = document.getElementById('footYear');
  if (anio) anio.textContent = new Date().getFullYear();
})();
