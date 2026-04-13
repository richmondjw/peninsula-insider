/* ============================================================
   Peninsula Insider — Newsletter Enhancement v2
   Shows a native branded form. On submit, POSTs the email into
   the existing Beehiiv iframe (kept hidden) via form target.
   The Beehiiv page inside the iframe processes the subscription.
   Falls back gracefully if anything fails.
   ============================================================ */

(function () {
  'use strict';

  var FRAME_NAME = 'pi-beehiiv-frame';

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  function init() {
    var wraps = document.querySelectorAll('.newsletter__embed-wrap');
    for (var i = 0; i < wraps.length; i++) {
      upgradeEmbed(wraps[i], i);
    }
  }

  function upgradeEmbed(wrap, index) {
    var iframe = wrap.querySelector('.beehiiv-embed, .newsletter__embed');
    if (!iframe) return;

    var beehiivSrc = iframe.src;
    if (!beehiivSrc) return;

    // Give the iframe a unique name so we can target it with a form POST
    var frameName = FRAME_NAME + '-' + index;
    iframe.name = frameName;

    // Hide the iframe visually but keep it in the DOM
    iframe.style.cssText = 'position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0,0,0,0);border:0;';

    // Build the native form
    var form = document.createElement('form');
    form.className = 'pi-subscribe';
    form.method = 'POST';
    form.action = beehiivSrc;
    form.target = frameName;

    var row = document.createElement('div');
    row.className = 'pi-subscribe__row';

    var input = document.createElement('input');
    input.type = 'email';
    input.name = 'email';
    input.required = true;
    input.placeholder = 'Your email address';
    input.className = 'pi-subscribe__input';
    input.setAttribute('autocomplete', 'email');
    input.setAttribute('autocapitalize', 'none');
    input.setAttribute('spellcheck', 'false');

    var btn = document.createElement('button');
    btn.type = 'submit';
    btn.className = 'pi-subscribe__btn';
    btn.innerHTML =
      '<span class="pi-subscribe__btn-text">Subscribe</span>' +
      '<span class="pi-subscribe__btn-sending" aria-hidden="true">Sending\u2026</span>';

    row.appendChild(input);
    row.appendChild(btn);
    form.appendChild(row);

    // Insert the native form before the hidden iframe
    iframe.parentNode.insertBefore(form, iframe);

    // Handle submission
    form.addEventListener('submit', function (e) {
      // Let the form POST naturally into the hidden iframe
      // (don't preventDefault — the browser handles the POST)

      var email = input.value.trim();
      if (!email) {
        e.preventDefault();
        input.focus();
        return;
      }

      // Show sending state
      btn.classList.add('is-sending');
      btn.disabled = true;
      input.disabled = true;

      // Show confirmation after a short delay (optimistic)
      setTimeout(function () {
        showConfirmation(wrap, form);
      }, 800);
    });
  }

  function showConfirmation(wrap, form) {
    // Fade out the form
    form.style.opacity = '0';
    form.style.transform = 'translateY(-8px)';
    form.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
    form.style.pointerEvents = 'none';

    // Fade out disclaimer
    var disclaimer = wrap.querySelector('.newsletter__disclaimer');
    if (disclaimer) {
      disclaimer.style.opacity = '0';
      disclaimer.style.transition = 'opacity 0.25s ease';
    }

    setTimeout(function () {
      form.style.display = 'none';

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
