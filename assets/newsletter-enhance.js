/* ============================================================
   Peninsula Insider — Newsletter Enhancement
   Replaces Beehiiv iframes with native branded forms and
   smooth inline confirmation. Falls back gracefully if JS
   fails — the original iframe remains functional.
   ============================================================ */

(function () {
  'use strict';

  // Beehiiv publication ID extracted from the embed URL
  var PUB_ID = '4d3b47c5-1958-4372-be0d-aa3d28710a1c';
  var BEEHIIV_URL = 'https://subscribe-forms.beehiiv.com/' + PUB_ID;

  // Wait for DOM
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  function init() {
    var wraps = document.querySelectorAll('.newsletter__embed-wrap');
    for (var i = 0; i < wraps.length; i++) {
      upgradeEmbed(wraps[i]);
    }
  }

  function upgradeEmbed(wrap) {
    var iframe = wrap.querySelector('.beehiiv-embed, .newsletter__embed');
    if (!iframe) return;

    // Build the native form
    var form = document.createElement('form');
    form.className = 'pi-subscribe';
    form.setAttribute('novalidate', '');

    var row = document.createElement('div');
    row.className = 'pi-subscribe__row';

    var input = document.createElement('input');
    input.type = 'email';
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

    // Replace the iframe with the native form
    iframe.replaceWith(form);

    // Handle submission
    form.addEventListener('submit', function (e) {
      e.preventDefault();

      var email = input.value.trim();
      if (!email || !isValidEmail(email)) {
        input.focus();
        input.classList.add('is-invalid');
        return;
      }

      // Disable form
      btn.classList.add('is-sending');
      btn.disabled = true;
      input.disabled = true;

      // Submit to Beehiiv via hidden iframe (avoids CORS)
      submitToBeehiiv(email);

      // Show confirmation after a short beat (optimistic)
      setTimeout(function () {
        showConfirmation(wrap, form);
      }, 700);
    });

    // Clear invalid state on input
    input.addEventListener('input', function () {
      input.classList.remove('is-invalid');
    });
  }

  function submitToBeehiiv(email) {
    // Method 1: Hidden form → hidden iframe (most reliable)
    var frameName = 'pi-sub-' + Date.now();

    var hiddenFrame = document.createElement('iframe');
    hiddenFrame.name = frameName;
    hiddenFrame.setAttribute('aria-hidden', 'true');
    hiddenFrame.style.cssText = 'position:absolute;width:0;height:0;border:0;overflow:hidden;clip:rect(0,0,0,0)';
    document.body.appendChild(hiddenFrame);

    var hiddenForm = document.createElement('form');
    hiddenForm.method = 'POST';
    hiddenForm.action = BEEHIIV_URL;
    hiddenForm.target = frameName;
    hiddenForm.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden';

    var emailField = document.createElement('input');
    emailField.type = 'hidden';
    emailField.name = 'email';
    emailField.value = email;
    hiddenForm.appendChild(emailField);

    document.body.appendChild(hiddenForm);
    hiddenForm.submit();

    // Clean up after delivery
    setTimeout(function () {
      if (hiddenFrame.parentNode) hiddenFrame.remove();
      if (hiddenForm.parentNode) hiddenForm.remove();
    }, 5000);

    // Method 2: Fetch backup (no-cors — fire and forget)
    try {
      fetch(BEEHIIV_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: 'email=' + encodeURIComponent(email)
      });
    } catch (e) {
      // Silent — the hidden iframe method is the primary
    }
  }

  function showConfirmation(wrap, form) {
    // Fade out the form
    form.classList.add('is-leaving');

    // Fade out the disclaimer too
    var disclaimer = wrap.querySelector('.newsletter__disclaimer');
    if (disclaimer) {
      disclaimer.classList.add('pi-disclaimer-leaving');
    }

    setTimeout(function () {
      // Remove the form
      form.remove();

      // Build the confirmation
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
          'Watch for The Insider\u2019s Dispatch \u2014 your first issue arrives within the fortnight. ' +
          'In the meantime, start with our <a href="/journal" style="color:var(--gold,#B69A6B);text-decoration:underline;text-underline-offset:3px">latest from the Journal</a>.' +
        '</p>';

      // Insert before disclaimer (or append to wrap)
      if (disclaimer && disclaimer.parentNode) {
        disclaimer.replaceWith(confirm);
      } else {
        wrap.appendChild(confirm);
      }

      // Trigger the entrance animation on next frame
      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          confirm.classList.add('is-visible');
        });
      });
    }, 350);
  }

  function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }
})();
