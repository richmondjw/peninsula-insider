/* ============================================================
   Peninsula Insider — Scroll Animation Controller
   Intersection Observer for reveals, stagger logic for grids,
   gentle parallax for hero visuals. Zero dependencies.
   ============================================================ */

(function () {
  'use strict';

  // Bail out if the user prefers reduced motion
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  // Wait for DOM
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  function init() {
    tagElements();
    observeReveals();
    initParallax();
  }


  /* ----------------------------------------------------------------
     TAG ELEMENTS
     Walk the DOM and assign reveal classes based on existing
     component class names. No HTML editing required.
     ---------------------------------------------------------------- */

  function tagElements() {

    // --- COVER / HERO TYPOGRAPHY SEQUENCE ---
    // Homepage cover: meta → headline → dek → promise (reading order)
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
          el.classList.add('reveal-hero');
          el.setAttribute('data-reveal-delay', String(i + 1));
        }
      });
    }

    // Cover visual — parallax + reveal
    tagAll('.cover__visual', 'reveal-scale', 'parallax-hero');

    // --- SECTION HEROES (category pages, newsletter, about) ---
    tagAll('.section-hero__inner', 'reveal');
    tagAll('.section-hero__visual', 'parallax-hero');

    // --- ARTICLE / DETAIL HEROES ---
    tagAll('.article__hero', 'reveal-scale', 'parallax-hero');
    tagAll('.venue-detail__hero', 'reveal-scale', 'parallax-hero');
    tagAll('.place-detail__hero', 'reveal-scale', 'parallax-hero');
    tagAll('.experience-detail__hero', 'reveal-scale', 'parallax-hero');
    tagAll('.itinerary-detail__hero', 'reveal-scale', 'parallax-hero');

    // --- SECTION HEADERS ---
    tagAll('.venues__header', 'reveal-header');

    // --- FULL SECTIONS (fade + slide up) ---
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
      tagAll(sel, 'reveal');
    });

    // --- ISSUE RIBBON ---
    tagAll('.issue-ribbon__inner', 'reveal-fade');

    // --- EDITORIAL PROMISE POINTS (staggered fade) ---
    staggerChildren('.editorial-promise__points', '.editorial-promise__point', 'reveal-fade');

    // --- PILLAR NAV (staggered fade) ---
    staggerChildren('.pillars__inner', '.pillar', 'reveal-fade');

    // --- CARDS (staggered slide-up) ---
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
          cards[c].classList.add('reveal-card');
          cards[c].setAttribute('data-reveal-delay', String(Math.min(c, 7)));
        }
      }
    });

    // --- ABOUT PRINCIPLES / PROOF (staggered) ---
    staggerChildren('.newsletter-proof__promises', '.about-principle', 'reveal-fade');
    staggerChildren('.about-principles__grid', '.about-principle', 'reveal-fade');

    // --- FEATURE IMAGE (scale reveal) ---
    tagAll('.feature__image-block', 'reveal-scale');

    // --- BREADCRUMBS (gentle fade) ---
    tagAll('.breadcrumbs', 'reveal-fade');

    // --- FACTS SIDEBAR ---
    tagAll('.facts', 'reveal');
  }


  /* ----------------------------------------------------------------
     INTERSECTION OBSERVER — REVEAL TRIGGER
     Watches all tagged elements. Adds .is-revealed when 15% visible.
     One-shot: once revealed, stop observing.
     ---------------------------------------------------------------- */

  function observeReveals() {
    var revealClasses = ['reveal', 'reveal-card', 'reveal-hero', 'reveal-header', 'reveal-fade', 'reveal-scale'];
    var selector = revealClasses.map(function (c) { return '.' + c; }).join(',');
    var elements = document.querySelectorAll(selector);

    if (!elements.length) return;

    var observer = new IntersectionObserver(function (entries) {
      for (var i = 0; i < entries.length; i++) {
        if (entries[i].isIntersecting) {
          entries[i].target.classList.add('is-revealed');
          observer.unobserve(entries[i].target);
        }
      }
    }, {
      threshold: 0.15,
      rootMargin: '0px 0px -40px 0px'  // trigger slightly before fully in view
    });

    for (var i = 0; i < elements.length; i++) {
      // If element is already above the fold, reveal immediately
      var rect = elements[i].getBoundingClientRect();
      if (rect.top < window.innerHeight * 0.85 && rect.bottom > 0) {
        elements[i].classList.add('is-revealed');
      } else {
        observer.observe(elements[i]);
      }
    }
  }


  /* ----------------------------------------------------------------
     PARALLAX — HERO VISUALS
     Gentle vertical translate on scroll. Uses requestAnimationFrame
     for smooth 60fps performance.
     ---------------------------------------------------------------- */

  function initParallax() {
    var heroes = document.querySelectorAll('.parallax-hero');
    if (!heroes.length) return;

    var SPEED = 0.12;  // subtle — 12% of scroll distance
    var ticking = false;

    function updateParallax() {
      var scrollY = window.pageYOffset;
      for (var i = 0; i < heroes.length; i++) {
        var el = heroes[i];
        var rect = el.getBoundingClientRect();
        var elCenter = rect.top + rect.height / 2;
        var viewCenter = window.innerHeight / 2;
        var offset = (elCenter - viewCenter) * SPEED;

        // Only transform when element is near the viewport
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

    // Initial position
    updateParallax();
  }


  /* ----------------------------------------------------------------
     HELPERS
     ---------------------------------------------------------------- */

  function tagAll(selector, revealClass, extraClass) {
    var els = document.querySelectorAll(selector);
    for (var i = 0; i < els.length; i++) {
      els[i].classList.add(revealClass);
      if (extraClass) els[i].classList.add(extraClass);
    }
  }

  function staggerChildren(parentSelector, childSelector, revealClass) {
    var parents = document.querySelectorAll(parentSelector);
    for (var p = 0; p < parents.length; p++) {
      var children = parents[p].querySelectorAll(childSelector);
      for (var c = 0; c < children.length; c++) {
        children[c].classList.add(revealClass);
        children[c].setAttribute('data-reveal-delay', String(Math.min(c, 5)));
      }
    }
  }

})();
