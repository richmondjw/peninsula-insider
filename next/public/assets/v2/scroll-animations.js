(function () {
  'use strict';
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  function init() {
    tagElements();
    applyReveals();
    // parallax disabled — caused scroll-driven motion
  }

  function tagElements() {
    // HERO SEQUENCE — meta, headline, dek, byline stagger 1..4
    var heroAbove = document.querySelector('.hero__above');
    if (heroAbove) {
      var seq = [
        heroAbove.querySelector('.hero__meta'),
        heroAbove.querySelector('.hero__headline'),
        heroAbove.querySelector('.hero__dek'),
        heroAbove.querySelector('.hero__byline')
      ];
      seq.forEach(function (el, i) {
        if (el) {
          el.setAttribute('data-reveal', 'reveal-hero');
          el.setAttribute('data-reveal-delay', String(i + 1));
        }
      });
    }

    // HERO IMAGE — fade-scale + parallax
    markAll('.hero__image', 'reveal-scale');
    document.querySelectorAll('.hero__image').forEach(function (el) {
      el.classList.add('parallax-hero');
    });

    // CONTENTS / TOC
    markAll('.contents__inner, .contents__grid', 'reveal');

    // SHORTLIST — intro block reveals, items stagger
    markAll('.shortlist__intro', 'reveal');
    staggerMark('.shortlist__list', '.shortlist__item', 'reveal-card');

    // WEEKEND BRIEFING — intro, cards stagger, meta list reveals
    markAll('.briefing__intro', 'reveal');
    staggerMark('.briefing__cards', '.briefing__card', 'reveal-card');
    markAll('.briefing__meta', 'reveal-fade');

    // EDITOR'S LETTER
    markAll('.letter__body', 'reveal');
    markAll('.letter__pullquote', 'reveal-fade');

    // FEATURE WELL
    markAll('.well__lead', 'reveal');
    markAll('.well__side', 'reveal');
    markAll('.well__image', 'reveal-scale');

    // DEPARTMENTS — header + venue cards stagger
    markAll('.dept__head', 'reveal-header');
    staggerMark('.dept__grid', '.venue-card', 'reveal-card');

    // ESCAPES — header + cards stagger
    markAll('.escapes__head', 'reveal-header');
    staggerMark('.escapes__grid', '.escape-card', 'reveal-card');

    // PLACES STRIP — header + circle cards stagger
    markAll('.places__head', 'reveal-header');
    staggerMark('.places__strip', '.place-card', 'reveal-card');

    // NEWSLETTER — copy block + tilted preview card
    markAll('.newsletter__copy', 'reveal');
    markAll('.newsletter__preview', 'reveal-scale');

    // COLOPHON — quiet fade
    markAll('.colophon__head, .colophon__grid, .colophon__foot', 'reveal-fade');
  }

  function applyReveals() {
    var candidates = document.querySelectorAll('[data-reveal]');
    if (!candidates.length) return;

    var observer = new IntersectionObserver(function (entries) {
      for (var i = 0; i < entries.length; i++) {
        if (entries[i].isIntersecting) {
          entries[i].target.classList.add('is-revealed');
          observer.unobserve(entries[i].target);
        }
      }
    }, {
      threshold: 0.15,
      rootMargin: '0px 0px -40px 0px'
    });

    var vh = window.innerHeight;
    for (var i = 0; i < candidates.length; i++) {
      var el = candidates[i];
      var revealClass = el.getAttribute('data-reveal');
      var rect = el.getBoundingClientRect();

      if (rect.top < vh && rect.bottom > 0) {
        // Above-fold — leave visible, no animation.
        el.removeAttribute('data-reveal');
      } else {
        el.classList.add(revealClass);
        el.removeAttribute('data-reveal');
        observer.observe(el);
      }
    }
  }

  function initParallax() {
    var heroes = document.querySelectorAll('.parallax-hero');
    if (!heroes.length) return;

    var SPEED = 0.12;
    var ticking = false;

    function update() {
      for (var i = 0; i < heroes.length; i++) {
        var el = heroes[i];
        var rect = el.getBoundingClientRect();
        var elCenter = rect.top + rect.height / 2;
        var viewCenter = window.innerHeight / 2;
        var offset = (elCenter - viewCenter) * SPEED;
        if (rect.bottom > -200 && rect.top < window.innerHeight + 200) {
          el.style.transform = 'scale(1.06) translateY(' + offset.toFixed(1) + 'px)';
        }
      }
      ticking = false;
    }

    window.addEventListener('scroll', function () {
      if (!ticking) { requestAnimationFrame(update); ticking = true; }
    }, { passive: true });

    update();
  }

  function markAll(selector, revealClass) {
    var els = document.querySelectorAll(selector);
    for (var i = 0; i < els.length; i++) {
      els[i].setAttribute('data-reveal', revealClass);
    }
  }

  function staggerMark(parentSelector, childSelector, revealClass) {
    var parents = document.querySelectorAll(parentSelector);
    for (var p = 0; p < parents.length; p++) {
      var children = parents[p].querySelectorAll(childSelector);
      for (var c = 0; c < children.length; c++) {
        children[c].setAttribute('data-reveal', revealClass);
        children[c].setAttribute('data-reveal-delay', String(Math.min(c, 7)));
      }
    }
  }
})();

/* Hero rotator — slow crossfade across all slides, every 5s */
(function () {
  'use strict';
  var slides = document.querySelectorAll('.hero__rotator .hero__slide');
  if (slides.length < 2) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  var i = 0;
  setInterval(function () {
    slides[i].classList.remove('is-active');
    i = (i + 1) % slides.length;
    slides[i].classList.add('is-active');
  }, 5000);
})();
