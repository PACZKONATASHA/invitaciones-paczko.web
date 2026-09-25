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
  var modoDeck = !!(deck && slides.length > 1);


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
      if (e.metaKey || e.ctrlKey || e.altKey) return;

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
     4 · Paso 02: el video se reproduce al ver la sección
     ══════════════════════════════════════════ */
  var video       = document.getElementById('tourVideo');
  var btnSonido   = document.getElementById('tourSound');
  var iconoSonido = document.getElementById('tourSoundIcon');

  function reproducir() {
    if (!video) return;
    var p = video.play();
    if (p && p.catch) p.catch(function () {});
  }

  if (video) {
    var slideVideo = video.closest('.slide');

    if (modoDeck && slideVideo) {
      slideVideo.addEventListener('slide:enter', reproducir);
      slideVideo.addEventListener('slide:leave', function () { video.pause(); });
      if (slideVideo.classList.contains('is-active')) reproducir();
    } else if ('IntersectionObserver' in window) {
      var obsVideo = new IntersectionObserver(function (entradas) {
        entradas.forEach(function (e) {
          if (e.isIntersecting) reproducir(); else video.pause();
        });
      }, { threshold: 0.45 });
      obsVideo.observe(video);
    }
  }

  if (btnSonido && video) {
    btnSonido.addEventListener('click', function () {
      video.muted = !video.muted;
      iconoSonido.textContent = video.muted ? '🔇' : '🔊';
      if (!video.muted) reproducir();
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
})();
