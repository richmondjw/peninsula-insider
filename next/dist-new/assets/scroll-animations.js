/* ============================================================
   Peninsula Insider — Scroll Animation Controller
   Intersection Observer for reveals, stagger logic for grids,
   gentle parallax for hero visuals. Zero dependencies.

   Architecture: tagElements() marks candidates with data-reveal
   attributes (no visual effect). observeReveals() then checks
   positions — below-fold elements get the CSS reveal class and
   are observed; above-fold elements are left untouched so they
   never flash or animate on load.
   ============================================================ */

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
    initParallax();
  }


  /* ----------------------------------------------------------------
     TAG ELEMENTS
     Mark candidates with data-reveal="{class}" and optional
     data-reveal-delay="{n}". No CSS classes added yet — elements
     remain fully visible until applyReveals() decides.
     ---------------------------------------------------------------- */

  function tagElements() {

    // --- COVER / HERO TYPOGRAPHY SEQUENCE ---
    var coverCopy = document.querySelector('.cover__copy');
    if (coverCopy) {
      var heroChildren = [
        coverCopy.querySelector('.cover__meta'),
        coverCopy.querySelector('.cover__headline'),
        coverCopy.querySelector('.cover__dek'),
        coverCopy.querySelector('.cover__promise')
      ];
      heroChildren.forEach(function (el, i) {
        if (el) {
          el.setAttribute('data-reveal', 'reveal-hero');
          el.setAttribute('data-reveal-delay', String(i + 1));
        }
      });
    }

    // Cover visual
    markAll('.cover__visual', 'reveal-scale');
    document.querySelectorAll('.cover__visual').forEach(function (el) {
      el.classList.add('parallax-hero');
    });

    // --- SECTION HEROES ---
    markAll('.section-hero__inner', 'reveal');
    document.querySelectorAll('.section-hero__visual').forEach(function (el) {
      el.classList.add('parallax-hero');
    });

    // --- ARTICLE / DETAIL HEROES ---
    var heroSelectors = ['.article__hero', '.venue-detail__hero', '.place-detail__hero', '.experience-detail__hero', '.itinerary-detail__hero'];
    heroSelectors.forEach(function (sel) {
      markAll(sel, 'reveal-scale');
      document.querySelectorAll(sel).forEach(function (el) {
        el.classList.add('parallax-hero');
      });
    });

    // --- SECTION HEADERS ---
    markAll('.venues__header', 'reveal-header');

    // --- FULL SECTIONS ---
    var sectionSelectors = [
      '.editorial-promise__inner',
      '.weekend-picker__inner',
      '.feature__inner',
      '.intent-strip .container > *',
      '.zone-intro__grid',
      '.seasonal-shelf .container > *',
      '.escape-callout .container > *',
      '.why-insider__inner',
      '.newsletter__inner',
      '.newsletter__stack',
      '.newsletter-signup__inner',
      '.newsletter-proof .container > *',
      '.split-intro',
      '.about-mission__grid',
      '.about-coverage__inner',
      '.contact-form__inner',
      '.prose__inner',
      '.article__body',
      '.venue-detail__body',
      '.place-detail__body'
    ];
    sectionSelectors.forEach(function (sel) {
      markAll(sel, 'reveal');
    });

    // --- ISSUE RIBBON ---
    markAll('.issue-ribbon__inner', 'reveal-fade');

    // --- EDITORIAL PROMISE POINTS ---
    staggerMark('.editorial-promise__points', '.editorial-promise__point', 'reveal-fade');

    // --- PILLAR NAV ---
    staggerMark('.pillars__inner', '.pillar', 'reveal-fade');

    // --- CARDS ---
    var cardGrids = [
      { grid: '.venues__grid', card: '.venue-card' },
      { grid: '.venues__grid--two', card: '.venue-card' },
      { grid: '.places__grid', card: '.place-card' },
      { grid: '.experience-grid', card: '.experience-card' },
      { grid: '.itinerary-grid', card: '.itinerary-card' },
      { grid: '.event-grid', card: '.event-card' },
      { grid: '.zone-intro__grid', card: '.zone-card' }
    ];
    cardGrids.forEach(function (cfg) {
      var grids = document.querySelectorAll(cfg.grid);
      for (var g = 0; g < grids.length; g++) {
        var cards = grids[g].querySelectorAll(cfg.card);
        for (var c = 0; c < cards.length; c++) {
          cards[c].setAttribute('data-reveal', 'reveal-card');
          cards[c].setAttribute('data-reveal-delay', String(Math.min(c, 7)));
        }
      }
    });

    // --- ABOUT PRINCIPLES / PROOF ---
    staggerMark('.newsletter-proof__promises', '.about-principle', 'reveal-fade');
    staggerMark('.about-principles__grid', '.about-principle', 'reveal-fade');

    // --- FEATURE IMAGE ---
    markAll('.feature__image-block', 'reveal-scale');

    // --- BREADCRUMBS ---
    markAll('.breadcrumbs', 'reveal-fade');

    // --- FACTS SIDEBAR ---
    markAll('.facts', 'reveal');
  }


  /* ----------------------------------------------------------------
     APPLY REVEALS
     Check each marked element's position. Below-fold elements get
     the CSS reveal class (hidden state) and are observed. Above-fold
     elements are left alone — they stay visible, no flash, no animation.
     ---------------------------------------------------------------- */

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
        // ABOVE THE FOLD — don't hide, don't animate. Just clean up.
        el.removeAttribute('data-reveal');
      } else {
        // BELOW THE FOLD — add the CSS class (hides element) and observe.
        el.classList.add(revealClass);
        el.removeAttribute('data-reveal');
        observer.observe(el);
      }
    }
  }


  /* ----------------------------------------------------------------
     PARALLAX
     ---------------------------------------------------------------- */

  function initParallax() {
    var heroes = document.querySelectorAll('.parallax-hero');
    if (!heroes.length) return;

    var SPEED = 0.12;
    var ticking = false;

    function updateParallax() {
      for (var i = 0; i < heroes.length; i++) {
        var el = heroes[i];
        var rect = el.getBoundingClientRect();
        var elCenter = rect.top + rect.height / 2;
        var viewCenter = window.innerHeight / 2;
        var offset = (elCenter - viewCenter) * SPEED;

        if (rect.bottom > -200 && rect.top < window.innerHeight + 200) {
          el.style.transform = 'scale(1.08) translateY(' + offset.toFixed(1) + 'px)';
        }
      }
      ticking = false;
    }

    window.addEventListener('scroll', function () {
      if (!ticking) {
        requestAnimationFrame(updateParallax);
        ticking = true;
      }
    }, { passive: true });

    updateParallax();
  }


  /* ----------------------------------------------------------------
     HELPERS
     ---------------------------------------------------------------- */

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
        children[c].setAttribute('data-reveal-delay', String(Math.min(c, 5)));
      }
    }
  }

})();
