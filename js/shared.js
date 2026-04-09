// ========================================================================
// THE PENINSULA INSIDER — Shared JavaScript
// ========================================================================

// ===== SIMPLE PASSWORD GATE =====
(function() {
  var PASSWORD = 'JWR25';
  var STORAGE_KEY = 'peninsula-insider-auth';
  var allowedPaths = ['/404.html'];

  if (allowedPaths.indexOf(window.location.pathname) !== -1) return;
  if (sessionStorage.getItem(STORAGE_KEY) === PASSWORD) return;

  document.documentElement.style.visibility = 'hidden';

  var attempts = 0;
  while (attempts < 3) {
    var entered = window.prompt('Enter site password');
    if (entered === PASSWORD) {
      sessionStorage.setItem(STORAGE_KEY, PASSWORD);
      document.documentElement.style.visibility = '';
      return;
    }
    if (entered === null) {
      window.location.href = 'https://www.google.com';
      return;
    }
    attempts += 1;
  }

  document.body.innerHTML = '<div style="min-height:100vh;display:flex;align-items:center;justify-content:center;padding:2rem;font-family:Georgia,serif;background:#f7f3ee;color:#1d1d1b;text-align:center"><div><h1 style="margin-bottom:0.75rem">Private preview</h1><p style="margin:0;color:#6b6259">Incorrect password.</p></div></div>';
  document.documentElement.style.visibility = '';
})();

// ===== HAMBURGER MENU =====
const hamburger = document.getElementById('hamburger');
const navMobile = document.getElementById('navMobile');

window.closeMenu = function() {
  hamburger.classList.remove('open');
  hamburger.setAttribute('aria-expanded', 'false');
  navMobile.classList.remove('open');
  document.body.style.overflow = '';
};

hamburger.addEventListener('click', function(e) {
  e.stopPropagation();
  const isOpen = navMobile.classList.contains('open');
  if (isOpen) {
    window.closeMenu();
  } else {
    hamburger.classList.add('open');
    hamburger.setAttribute('aria-expanded', 'true');
    navMobile.classList.add('open');
    document.body.style.overflow = 'hidden';
  }
});

document.addEventListener('click', function(e) {
  if (navMobile.classList.contains('open') &&
      !navMobile.contains(e.target) &&
      !hamburger.contains(e.target)) {
    window.closeMenu();
  }
});

// ===== NAV SCROLL EFFECT =====
const nav = document.getElementById('nav');
let lastScroll = 0;
window.addEventListener('scroll', function() {
  if (window.scrollY > 50) {
    nav.classList.add('scrolled');
  } else {
    nav.classList.remove('scrolled');
  }
  lastScroll = window.scrollY;
}, { passive: true });

// ===== BACK TO TOP =====
const backToTop = document.getElementById('backToTop');
window.addEventListener('scroll', function() {
  if (window.scrollY > 600) {
    backToTop.classList.add('visible');
  } else {
    backToTop.classList.remove('visible');
  }
}, { passive: true });

// ===== SCROLL REVEAL =====
(function() {
  const reveals = document.querySelectorAll('.reveal');
  if (!reveals.length) return;

  const observer = new IntersectionObserver(function(entries) {
    entries.forEach(function(entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, {
    threshold: 0.1,
    rootMargin: '0px 0px -40px 0px'
  });

  reveals.forEach(function(el) { observer.observe(el); });
})();

// ===== ACTIVE NAV (pathname-based) =====
(function() {
  var path = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-dropdown a, .nav-mobile a').forEach(function(link) {
    var href = link.getAttribute('href');
    if (!href) return;
    var linkPage = href.split('#')[0] || 'index.html';
    if (linkPage === path) {
      link.style.color = 'var(--dark)';
      var parentLi = link.closest('li');
      if (parentLi) {
        var trigger = parentLi.querySelector('.nav-group-trigger');
        if (trigger) trigger.style.color = 'var(--dark)';
      }
    }
  });
})();

// ===== COLLAPSIBLE TIERS =====
document.querySelectorAll('.tier-section').forEach(function(section, i) {
  var header = section.querySelector('.tier-header');
  if (!header) return;
  if (i > 0) {
    section.classList.add('collapsed');
    header.classList.add('collapsed');
  }
  header.addEventListener('click', function() {
    section.classList.toggle('collapsed');
    header.classList.toggle('collapsed');
  });
});

// ===== FOOTER SUBSCRIBE FORM =====
(function() {
  var form = document.getElementById('subscribeForm');
  if (!form) return;
  var input = form.querySelector('input[type="email"]');
  var button = form.querySelector('button[type="submit"]');
  var msg = document.getElementById('subscribeMsg');

  // Supabase edge function endpoint
  var ENDPOINT = 'https://pkrvoxvswcghshfbtxtx.supabase.co/functions/v1/public-lead-intake';

  function showMsg(text, type) {
    msg.textContent = text;
    msg.className = 'subscribe-msg visible ' + type;
  }

  form.addEventListener('submit', function(e) {
    e.preventDefault();
    var email = input.value.trim();
    if (!email) return;

    button.disabled = true;
    var originalText = button.textContent;
    button.textContent = 'Sending';
    msg.className = 'subscribe-msg';
    msg.textContent = '';

    fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: email,
        source: 'peninsulainsider.com.au',
        source_detail: window.location.pathname,
        form_name: 'footer_subscribe',
        source_page: window.location.href
      })
    })
    .then(function(res) {
      return res.json().then(function(data) { return { ok: res.ok, data: data }; });
    })
    .then(function(result) {
      if (result.ok) {
        showMsg('Thank you. You are subscribed.', 'success');
        input.value = '';
        button.textContent = originalText;
      } else {
        var errorText = (result.data && result.data.error) || 'Something went wrong';
        if (errorText.toLowerCase().indexOf('invalid') !== -1) {
          showMsg('Please enter a valid email address.', 'error');
        } else {
          showMsg('Something went wrong. Please try again.', 'error');
        }
        button.textContent = originalText;
      }
    })
    .catch(function() {
      showMsg('Connection error. Please try again.', 'error');
      button.textContent = originalText;
    })
    .finally(function() {
      setTimeout(function() { button.disabled = false; }, 800);
    });
  });
})();

// ===== CROSS-PAGE SEARCH =====
(function() {
  var overlay = document.getElementById('searchOverlay');
  var input = document.getElementById('searchInput');
  var resultsEl = document.getElementById('searchResults');
  var trigger = document.getElementById('searchTrigger');
  var activeIdx = -1;
  var searchIndex = null;

  function loadIndex() {
    if (searchIndex) return Promise.resolve(searchIndex);
    var base = document.querySelector('script[src*="shared.js"]');
    var jsPath = base ? base.src.replace('shared.js', 'search-index.json') : 'js/search-index.json';
    return fetch(jsPath)
      .then(function(r) { return r.json(); })
      .then(function(data) { searchIndex = data; return data; })
      .catch(function() { searchIndex = []; return []; });
  }

  function highlightMatch(text, query) {
    if (!query) return text;
    var escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return text.replace(new RegExp('(' + escaped + ')', 'gi'), '<mark>$1</mark>');
  }

  function search(query) {
    resultsEl.innerHTML = '';
    activeIdx = -1;
    if (!query || query.length < 2) {
      resultsEl.removeAttribute('data-no-results');
      return;
    }
    if (!searchIndex) return;
    var q = query.toLowerCase();
    var matches = searchIndex.filter(function(item) {
      return (item.title + ' ' + item.location + ' ' + item.desc + ' ' + (item.badge || '')).toLowerCase().indexOf(q) !== -1;
    });

    if (matches.length === 0) {
      resultsEl.setAttribute('data-no-results', '');
      return;
    }
    resultsEl.removeAttribute('data-no-results');

    var groups = {};
    matches.forEach(function(m) {
      if (!groups[m.section]) groups[m.section] = [];
      groups[m.section].push(m);
    });

    Object.keys(groups).forEach(function(section) {
      var label = document.createElement('div');
      label.className = 'search-group-label';
      label.textContent = section;
      resultsEl.appendChild(label);

      groups[section].forEach(function(m) {
        var div = document.createElement('div');
        div.className = 'search-result';
        div.innerHTML = '<span class="search-result-icon">' + (m.emoji || '') + '</span>'
          + '<div class="search-result-text">'
          + '<div class="search-result-title">' + highlightMatch(m.title, query) + '</div>'
          + '<div class="search-result-meta">' + highlightMatch(m.location || '', query) + '</div>'
          + '</div>';
        div.addEventListener('click', function() { goTo(m); });
        resultsEl.appendChild(div);
      });
    });
  }

  function goTo(item) {
    closeSearch();
    var target = item.page + (item.anchor ? '#' + item.anchor : '');
    var currentPage = window.location.pathname.split('/').pop() || 'index.html';
    if (item.page === currentPage) {
      var el = document.getElementById(item.anchor);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        highlightEl(el);
      }
    } else {
      window.location.href = target;
    }
  }

  function highlightEl(el) {
    el.style.outline = '2px solid var(--gold)';
    el.style.outlineOffset = '6px';
    el.style.transition = 'outline-color 1s';
    setTimeout(function() {
      el.style.outlineColor = 'transparent';
      setTimeout(function() { el.style.outline = ''; el.style.outlineOffset = ''; }, 1000);
    }, 2000);
  }

  function openSearch() {
    loadIndex().then(function() {
      overlay.classList.add('open');
      input.value = '';
      resultsEl.innerHTML = '';
      resultsEl.removeAttribute('data-no-results');
      activeIdx = -1;
      setTimeout(function() { input.focus(); }, 50);
    });
  }

  function closeSearch() {
    overlay.classList.remove('open');
    input.value = '';
    activeIdx = -1;
  }

  function navigateResults(dir) {
    var items = resultsEl.querySelectorAll('.search-result');
    if (!items.length) return;
    items.forEach(function(i) { i.classList.remove('active'); });
    activeIdx += dir;
    if (activeIdx < 0) activeIdx = items.length - 1;
    if (activeIdx >= items.length) activeIdx = 0;
    items[activeIdx].classList.add('active');
    items[activeIdx].scrollIntoView({ block: 'nearest' });
  }

  trigger.addEventListener('click', openSearch);
  overlay.addEventListener('click', function(e) { if (e.target === overlay) closeSearch(); });
  input.addEventListener('input', function() { search(input.value); });
  input.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') { closeSearch(); e.preventDefault(); }
    if (e.key === 'ArrowDown') { navigateResults(1); e.preventDefault(); }
    if (e.key === 'ArrowUp') { navigateResults(-1); e.preventDefault(); }
    if (e.key === 'Enter') {
      var items = resultsEl.querySelectorAll('.search-result');
      if (activeIdx >= 0 && items[activeIdx]) items[activeIdx].click();
      else if (items.length) items[0].click();
      e.preventDefault();
    }
  });

  document.addEventListener('keydown', function(e) {
    if ((e.key === '/' || (e.metaKey && e.key === 'k') || (e.ctrlKey && e.key === 'k')) && !overlay.classList.contains('open')) {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      e.preventDefault();
      openSearch();
    }
    if (e.key === 'Escape' && overlay.classList.contains('open')) closeSearch();
  });

  // Hash scroll highlight on page load
  if (window.location.hash) {
    var id = window.location.hash.slice(1);
    setTimeout(function() {
      var el = document.getElementById(id);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        highlightEl(el);
      }
    }, 400);
  }
})();
