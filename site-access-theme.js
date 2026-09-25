(() => {
  'use strict';

  const THEME_KEY = 'nineyin-theme';
  const PENDING_TARGET_KEY = 'nineyin-pending-target';
  const inForum = location.pathname.includes('/forum/');
  const themeCssHref = inForum ? '../light-theme.css?v=0.0.35' : 'light-theme.css?v=0.0.35';

  function isGuideHome() {
    if (inForum) return false;
    const p = location.pathname.replace(/\/+$/, '');
    return p === '' || p.endsWith('/kung-fu-guide') || p.endsWith('/index.html') || location.pathname === '/';
  }

  function loadThemeCss() {
    if (document.getElementById('nineyinLightThemeCss')) return;
    const link = document.createElement('link');
    link.id = 'nineyinLightThemeCss';
    link.rel = 'stylesheet';
    link.href = themeCssHref;
    document.head.appendChild(link);
  }

  function preferredTheme() {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved === 'light' || saved === 'dark') return saved;
    return 'dark';
  }

  function applyTheme(theme, persist = false) {
    document.documentElement.dataset.nineyinTheme = theme;
    if (persist) localStorage.setItem(THEME_KEY, theme);
    const btn = document.getElementById('nineyinThemeToggle');
    if (btn) {
      const light = theme === 'light';
      btn.setAttribute('aria-label', light ? 'Включить тёмную тему' : 'Включить светлую тему');
      btn.setAttribute('title', light ? 'Тёмная тема' : 'Светлая тема');
      btn.innerHTML = `<span aria-hidden="true">${light ? '☾' : '☀'}</span><span class="nineyin-theme-label">${light ? 'Тёмная' : 'Светлая'}</span>`;
    }
  }

  function injectThemeToggle() {
    if (document.getElementById('nineyinThemeToggle')) return;
    const btn = document.createElement('button');
    btn.id = 'nineyinThemeToggle';
    btn.className = 'nineyin-theme-toggle';
    btn.type = 'button';
    btn.addEventListener('click', () => {
      const next = document.documentElement.dataset.nineyinTheme === 'light' ? 'dark' : 'light';
      applyTheme(next, true);
    });
    document.body.appendChild(btn);
    applyTheme(document.documentElement.dataset.nineyinTheme || preferredTheme());
  }

  function exposeGuestHome() {
    const overlay = document.getElementById('nyaOverlay');
    if (overlay) overlay.hidden = true;
    document.documentElement.classList.remove('nineyin-account-pending');
    document.documentElement.classList.add('nineyin-guest-home');
    document.body.classList.remove('nineyin-access-granted', 'nineyin-authenticated');
    document.body.classList.add('nineyin-guest-home');
    document.body.style.overflow = 'auto';
  }

  function isProtectedInternalLink(anchor) {
    const raw = anchor.getAttribute('href') || '';
    if (!raw || raw.startsWith('#') || raw.startsWith('mailto:') || raw.startsWith('tel:') || raw.startsWith('javascript:')) return false;
    let url;
    try { url = new URL(raw, location.href); } catch { return false; }
    if (url.origin !== location.origin) return false;
    if (url.pathname === location.pathname && (!url.hash || url.hash)) return false;
    return true;
  }

  function protectHomeLinks() {
    document.addEventListener('click', (event) => {
      if (!isGuideHome() || !document.documentElement.classList.contains('nineyin-guest-home')) return;
      const anchor = event.target.closest('a[href]');
      if (!anchor || !isProtectedInternalLink(anchor)) return;
      event.preventDefault();
      const target = new URL(anchor.href, location.href).href;
      sessionStorage.setItem(PENDING_TARGET_KEY, target);
      const wantsRegister = /registration\.html(?:$|[?#])/.test(target);
      if (window.NineYinAccount?.openAuth) {
        window.NineYinAccount.openAuth(wantsRegister ? 'register' : 'login');
      }
    }, true);
  }

  function redirectAfterLogin() {
    window.addEventListener('nineyin:access-granted', () => {
      const target = sessionStorage.getItem(PENDING_TARGET_KEY);
      if (!target) return;
      sessionStorage.removeItem(PENDING_TARGET_KEY);
      location.href = target;
    });
  }

  async function handlePublicHome() {
    if (!isGuideHome()) return;
    let attempts = 0;
    while (!window.NineYinAccount && attempts < 120) {
      await new Promise(r => setTimeout(r, 50));
      attempts++;
    }
    if (!window.NineYinAccount) {
      exposeGuestHome();
      return;
    }
    try { await window.NineYinAccount.ready; } catch {}
    const current = window.NineYinAccount.getCurrent?.() || {};
    if (!current.user) exposeGuestHome();
  }

  loadThemeCss();
  applyTheme(preferredTheme());
  redirectAfterLogin();
  protectHomeLinks();

  const start = () => {
    injectThemeToggle();
    handlePublicHome();
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();
