/* ============================================================
   Peninsula Insider — Newsletter Enhancement v3
   Native branded form + fetch(no-cors) to Beehiiv.
   No redirects, no iframe navigation, no page changes.
   ============================================================ */

(function () {
  'use strict';

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

    var beehiivSrc = iframe.src;
    if (!beehiivSrc) return;

    // Hide the iframe — keep in DOM as fallback
    iframe.style.cssText = 'position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0,0,0,0);border:0;';

    // Build native form (NOT a <form> — just divs, so no native submission)
    var container = document.createElement('div');
    container.className = 'pi-subscribe';

    var row = document.createElement('div');
    row.className = 'pi-subscribe__row';

    var input = document.createElement('input');
    input.type = 'email';
    input.placeholder = 'Your email address';
    input.className = 'pi-subscribe__input';
    input.setAttribute('autocomplete', 'email');
    input.setAttribute('autocapitalize', 'none');
    input.setAttribute('spellcheck', 'false');

    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'pi-subscribe__btn';
    btn.innerHTML =
      '<span class="pi-subscribe__btn-text">Subscribe</span>' +
      '<span class="pi-subscribe__btn-sending" aria-hidden="true">Sending\u2026</span>';

    row.appendChild(input);
    row.appendChild(btn);
    container.appendChild(row);

    // Insert before the hidden iframe
    iframe.parentNode.insertBefore(container, iframe);

    // Handle click
    btn.addEventListener('click', function () {
      var email = input.value.trim();
      if (!email || !isValidEmail(email)) {
        input.focus();
        return;
      }

      btn.classList.add('is-sending');
      btn.disabled = true;
      input.disabled = true;

      // Fire the subscription via fetch (no-cors = fire and forget, no redirect)
      try {
        fetch(beehiivSrc, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: 'email=' + encodeURIComponent(email),
        });
      } catch (e) {
        // Silent — optimistic confirmation regardless
      }

      // Also try submitting via a hidden iframe as backup
      try {
        var hf = document.createElement('iframe');
        hf.name = 'pi-sub-' + Date.now();
        hf.setAttribute('aria-hidden', 'true');
        hf.sandbox = 'allow-scripts allow-forms allow-same-origin';
        hf.style.cssText = 'position:absolute;width:0;height:0;border:0;overflow:hidden;';
        document.body.appendChild(hf);

        var hForm = document.createElement('form');
        hForm.method = 'POST';
        hForm.action = beehiivSrc;
        hForm.target = hf.name;
        hForm.style.display = 'none';
        var hInput = document.createElement('input');
        hInput.type = 'hidden';
        hInput.name = 'email';
        hInput.value = email;
        hForm.appendChild(hInput);
        document.body.appendChild(hForm);
        hForm.submit();

        setTimeout(function () {
          if (hf.parentNode) hf.remove();
          if (hForm.parentNode) hForm.remove();
        }, 5000);
      } catch (e) {
        // Silent
      }

      // Show confirmation
      setTimeout(function () {
        showConfirmation(wrap, container);
      }, 800);
    });

    // Enter key submits
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        btn.click();
      }
    });
  }

  function showConfirmation(wrap, container) {
    container.style.opacity = '0';
    container.style.transform = 'translateY(-8px)';
    container.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
    container.style.pointerEvents = 'none';

    var disclaimer = wrap.querySelector('.newsletter__disclaimer');
    if (disclaimer) {
      disclaimer.style.opacity = '0';
      disclaimer.style.transition = 'opacity 0.25s ease';
    }

    setTimeout(function () {
      container.style.display = 'none';

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

  function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }
})();
