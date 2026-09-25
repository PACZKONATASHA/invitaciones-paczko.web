/* ══════════════════════════════════════════
   PACZKO · Invitaciones digitales
   ══════════════════════════════════════════ */
(function () {
  'use strict';

  var suave = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ── Aparición progresiva de las secciones ── */
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

    aparecer.forEach(function (el) { obsReveal.observe(el); });
  } else {
    aparecer.forEach(function (el) { el.classList.add('is-in'); });
  }

  /* ── Nav: fondo crema al bajar ── */
  var nav = document.getElementById('nav');
  var wa = document.querySelector('.wa-float');

  function alScrollear() {
    var y = window.scrollY || window.pageYOffset;
    nav.classList.toggle('is-stuck', y > 80);
    if (wa) wa.classList.toggle('is-in', y > window.innerHeight * 0.6);
  }
  window.addEventListener('scroll', alScrollear, { passive: true });
  alScrollear();

  /* ── Menú de celular ── */
  var burger = document.getElementById('navBurger');
  var menu = document.getElementById('navMenu');

  function cerrarMenu() {
    nav.classList.remove('is-open');
    document.documentElement.classList.remove('menu-abierto');
    document.body.classList.remove('menu-abierto');
    if (burger) burger.setAttribute('aria-expanded', 'false');
  }

  if (burger && menu) {
    burger.addEventListener('click', function () {
      var abierto = nav.classList.toggle('is-open');
      document.documentElement.classList.toggle('menu-abierto', abierto);
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

  /* ── Paso 02: el video se reproduce solo cuando se ve ── */
  var video = document.getElementById('tourVideo');
  var btnSonido = document.getElementById('tourSound');
  var iconoSonido = document.getElementById('tourSoundIcon');

  if (video && 'IntersectionObserver' in window) {
    var obsVideo = new IntersectionObserver(function (entradas) {
      entradas.forEach(function (e) {
        if (e.isIntersecting) {
          var p = video.play();
          if (p && p.catch) p.catch(function () {});
        } else {
          video.pause();
        }
      });
    }, { threshold: 0.45 });
    obsVideo.observe(video);
  }

  if (btnSonido && video) {
    btnSonido.addEventListener('click', function () {
      video.muted = !video.muted;
      iconoSonido.textContent = video.muted ? '🔇' : '🔊';
      if (!video.muted) {
        var p = video.play();
        if (p && p.catch) p.catch(function () {});
      }
    });
  }

  /* ── Paso 03: la tarjeta se desplaza sola, como si el invitado bajara ── */
  var tarjeta = document.getElementById('cardScroll');

  if (tarjeta && suave && 'IntersectionObserver' in window) {
    var animando = false;
    var inicio = 0;
    var rafId = null;
    var PAUSA = 1400;   // ms quieta arriba antes de bajar
    var BAJADA = 5200;  // ms de recorrido
    var ESPERA = 1800;  // ms quieta abajo antes de volver

    function recorrer(t) {
      if (!inicio) inicio = t;
      var pasado = t - inicio;
      var total = tarjeta.scrollHeight - tarjeta.clientHeight;
      var ciclo = PAUSA + BAJADA + ESPERA;
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
    }

    var manual = false;
    tarjeta.addEventListener('pointerdown', function () { manual = true; frenar(); });
    tarjeta.addEventListener('wheel', function () { manual = true; frenar(); }, { passive: true });

    function frenar() {
      animando = false;
      if (rafId) cancelAnimationFrame(rafId);
      rafId = null;
    }

    var obsTarjeta = new IntersectionObserver(function (entradas) {
      entradas.forEach(function (e) {
        if (e.isIntersecting && !manual && !animando) {
          animando = true;
          inicio = 0;
          rafId = requestAnimationFrame(recorrer);
        } else if (!e.isIntersecting) {
          frenar();
        }
      });
    }, { threshold: 0.5 });

    obsTarjeta.observe(tarjeta);
  }
})();
