/* ============================================================
   Peninsula Insider — Newsletter Enhancement v6
   The Beehiiv iframe + embed.js handles subscription delivery.
   This script listens for the success postMessage event and
   overlays a PI-branded confirmation animation.
   The iframe is visible and functional — we just enhance the
   post-subscribe experience.
   ============================================================ */

(function () {
  'use strict';

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  function init() {
    // Centre the iframe within its wrapper
    var iframes = document.querySelectorAll('.newsletter__embed');
    for (var i = 0; i < iframes.length; i++) {
      iframes[i].style.margin = '0 auto';
      iframes[i].style.display = 'block';
    }

    // Listen for Beehiiv success events
    window.addEventListener('message', function (event) {
      var data;
      if (!event.data) return;

      // Beehiiv sends either a string or object
      if (typeof event.data === 'string') {
        try { data = JSON.parse(event.data); } catch (e) { return; }
      } else {
        data = event.data;
      }

      // Check for success event
      if (data && (data.type === 'beehiiv:success-toast' || data.type === 'beehiiv:success')) {
        var wraps = document.querySelectorAll('.newsletter__embed-wrap');
        for (var i = 0; i < wraps.length; i++) {
          showConfirmation(wraps[i]);
        }
      }
    });
  }

  function showConfirmation(wrap) {
    // Don't show twice
    if (wrap.querySelector('.pi-confirm')) return;

    // Fade out iframe and disclaimer
    var iframe = wrap.querySelector('.beehiiv-embed, .newsletter__embed');
    if (iframe) {
      iframe.style.transition = 'opacity 0.3s ease';
      iframe.style.opacity = '0';
    }

    var disclaimer = wrap.querySelector('.newsletter__disclaimer');
    if (disclaimer) {
      disclaimer.style.transition = 'opacity 0.25s ease';
      disclaimer.style.opacity = '0';
    }

    setTimeout(function () {
      if (iframe) iframe.style.display = 'none';

      var confirm = document.createElement('div');
      confirm.className = 'pi-confirm';
      confirm.innerHTML =
        '<div class="pi-confirm__icon">' +
          '<svg class="pi-confirm__check" viewBox="0 0 24 24" aria-hidden="true">' +
            '<polyline points="6 12 10 16 18 8"></polyline>' +
          '</svg>' +
        '</div>' +
        '<h3 class="pi-confirm__title">You\u2019re in.</h3>' +
        '<p class="pi-confirm__body">' +
          'Watch for The Insider\u2019s Dispatch \u2014 your first issue arrives this week. ' +
          'In the meantime, start with our <a href="/journal" style="color:var(--gold,#B69A6B);text-decoration:underline;text-underline-offset:3px">latest from the Journal</a>.' +
        '</p>';

      if (disclaimer) {
        disclaimer.replaceWith(confirm);
      } else {
        wrap.appendChild(confirm);
      }

      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          confirm.classList.add('is-visible');
        });
      });
    }, 350);
  }
})();
