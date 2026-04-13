/* ============================================================
   Peninsula Insider — Newsletter Enhancement v5
   Native branded form → direct Beehiiv API POST.
   Guaranteed delivery. No iframes needed for submission.
   ============================================================ */

(function () {
  'use strict';

  var BEEHIIV_API = 'https://api.beehiiv.com/v2/publications/pub_91e9b723-53c4-456e-a857-9faa2d61864b/subscriptions';
  var API_KEY = 'n3Ve1nLZwPCCxC1rGVavrxaEDlS281W5x77V9kxSBG2b0OMDYoOJs9e85vYSNbex';

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

    // Hide the iframe — API handles subscription now
    iframe.style.display = 'none';

    // Build native form
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

    var errMsg = document.createElement('p');
    errMsg.className = 'pi-subscribe__error';
    errMsg.style.cssText = 'display:none;color:#c85040;font-size:0.8rem;margin-top:0.5rem;';
    container.appendChild(errMsg);

    iframe.parentNode.insertBefore(container, iframe);

    btn.addEventListener('click', function () {
      var email = input.value.trim();
      errMsg.style.display = 'none';

      if (!email || !isValidEmail(email)) {
        input.focus();
        return;
      }

      btn.classList.add('is-sending');
      btn.disabled = true;
      input.disabled = true;

      fetch(BEEHIIV_API, {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email,
          reactivate_existing: true,
          send_welcome_email: true,
          utm_source: 'website',
          utm_medium: 'subscribe_form',
          referring_site: window.location.href,
        }),
      })
        .then(function (res) {
          if (res.ok || res.status === 201 || res.status === 200) {
            showConfirmation(wrap, container);
          } else {
            return res.json().then(function (data) {
              throw new Error(data.message || 'Subscription failed');
            });
          }
        })
        .catch(function (err) {
          btn.classList.remove('is-sending');
          btn.disabled = false;
          input.disabled = false;
          errMsg.textContent = err.message || 'Something went wrong. Please try again.';
          errMsg.style.display = 'block';
        });
    });

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
