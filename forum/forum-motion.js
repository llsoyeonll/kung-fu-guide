
(() => {
  'use strict';
  const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce) return;

  document.documentElement.classList.add('forum-motion-ready');

  const selector = [
    '.forum-toolbar', '.post-card',
    '.user-search', '.user-card',
    '.profile-card', '.profile-about', '.profile-edit',
    '.create-card'
  ].join(',');

  const mark = root => {
    const nodes = Array.from((root || document).querySelectorAll(selector));
    nodes.forEach((el, index) => {
      if (el.classList.contains('motion-reveal')) return;
      el.classList.add('motion-reveal');
      el.style.setProperty('--motion-delay', `${Math.min((index % 6) * 55, 275)}ms`);
    });
    return nodes;
  };

  const show = el => el.classList.add('is-visible');
  const observer = 'IntersectionObserver' in window
    ? new IntersectionObserver(entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            show(entry.target);
            observer.unobserve(entry.target);
          }
        });
      }, { threshold: .08, rootMargin: '0px 0px -28px 0px' })
    : null;

  const observe = root => {
    mark(root).forEach(el => {
      if (el.dataset.motionBound) return;
      el.dataset.motionBound = '1';
      if (observer) observer.observe(el); else show(el);
    });
  };

  observe(document);

  // Форум и каталог пользователей добавляют карточки динамически.
  const dynamicRoots = ['posts', 'usersGrid'];
  dynamicRoots.forEach(id => {
    const root = document.getElementById(id);
    if (!root || !('MutationObserver' in window)) return;
    new MutationObserver(mutations => { for (const m of mutations) for (const n of m.addedNodes) if (n.nodeType === 1) observe(n); }).observe(root, { childList: true, subtree: true });
  });
})();
