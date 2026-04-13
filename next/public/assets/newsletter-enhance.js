/* ============================================================
   Peninsula Insider — Newsletter Enhancement v4
   Keeps the Beehiiv iframe for reliable delivery. Listens for
   the beehiiv:success-toast postMessage event, then overlays
   a beautiful PI-branded confirmation animation.
   ============================================================ */

(function () {
  'use strict';

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  function init() {
    // Listen for Beehiiv's success event from any iframe
    window.addEventListener('message', function (event) {
      if (!event.data || typeof event.data !== 'string') return;

      var data;
      try { data = JSON.parse(event.data); } catch (e) { return; }

      if (data.type === 'beehiiv:success-toast' || data.type === 'beehiiv:success') {
        // Find the nearest newsletter wrap and show confirmation
        var wraps = document.querySelectorAll('.newsletter__embed-wrap');
        for (var i = 0; i < wraps.length; i++) {
          var iframe = wraps[i].querySelector('.beehiiv-embed, .newsletter__embed');
          if (iframe && event.source === iframe.contentWindow) {
            showConfirmation(wraps[i]);
            break;
          }
        }
        // If we couldn't match the source, just confirm the first one
        if (wraps.length && !document.querySelector('.pi-confirm')) {
          showConfirmation(wraps[0]);
        }
      }
    });
  }

  function showConfirmation(wrap) {
    // Fade out the iframe and disclaimer
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
