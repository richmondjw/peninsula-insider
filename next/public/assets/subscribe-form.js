/* Peninsula Insider — first-party subscribe form handler
   Reads endpoint and source from data attributes on .newsletter__form.
   Handles loading / success / error states inline, no page reload. */
(function () {
  'use strict';

  function initSubscribeForms() {
    document.querySelectorAll('.newsletter__form').forEach(function (form) {
      if (form._piSubscribeInit) return;
      form._piSubscribeInit = true;

      var input    = form.querySelector('.newsletter__input');
      var btn      = form.querySelector('.newsletter__submit');
      var label    = form.querySelector('.newsletter__submit-label');
      var status   = form.querySelector('.newsletter__status');
      var endpoint = form.dataset.endpoint;
      var source   = form.dataset.source || 'website';

      form.addEventListener('submit', function (e) {
        e.preventDefault();

        var email = (input.value || '').trim();
        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          status.textContent = 'Please enter a valid email address.';
          status.className   = 'newsletter__status newsletter__status--err';
          input.focus();
          return;
        }

        btn.disabled       = true;
        label.textContent  = 'Joining\u2026';
        status.textContent = '';
        status.className   = 'newsletter__status';

        fetch(endpoint, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ email: email, source: source }),
        })
          .then(function (res) { return res.json(); })
          .then(function (data) {
            if (data.ok) {
              label.textContent  = 'You\u2019re in';
              status.textContent = data.message || 'You\u2019re in. Wednesday\u2019s dispatch is on its way.';
              status.className   = 'newsletter__status newsletter__status--ok';
              input.value        = '';
              input.disabled     = true;
            } else {
              label.textContent = 'Subscribe';
              btn.disabled      = false;
              status.textContent = data.message || 'Something went wrong. Please try again.';
              status.className   = 'newsletter__status newsletter__status--err';
            }
          })
          .catch(function () {
            label.textContent  = 'Subscribe';
            btn.disabled       = false;
            status.textContent = 'Something went wrong. Please try again.';
            status.className   = 'newsletter__status newsletter__status--err';
          });
      });
    });
  }

  initSubscribeForms();
  document.addEventListener('astro:page-load', initSubscribeForms);
})();
