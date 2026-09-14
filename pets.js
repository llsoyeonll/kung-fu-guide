(() => {
  'use strict';

  const cards = [...document.querySelectorAll('[data-pet-page]')];
  const buttons = [...document.querySelectorAll('[data-pet-page-button]')];
  const prev = document.getElementById('petPrevPage');
  const next = document.getElementById('petNextPage');
  const counter = document.getElementById('petPageCount');
  const totalPages = 2;
  let page = 1;

  function render() {
    cards.forEach(card => {
      card.hidden = Number(card.dataset.petPage) !== page;
    });
    buttons.forEach(btn => {
      const active = Number(btn.dataset.petPageButton) === page;
      btn.classList.toggle('is-active', active);
      if (active) btn.setAttribute('aria-current', 'page');
      else btn.removeAttribute('aria-current');
    });
    if (prev) prev.disabled = page <= 1;
    if (next) next.disabled = page >= totalPages;
    if (counter) counter.textContent = `Страница ${page} из ${totalPages}`;
  }

  function setPage(value) {
    page = Math.max(1, Math.min(totalPages, Number(value) || 1));
    render();
    document.querySelector('.pet-catalog-section')?.scrollIntoView({behavior:'smooth', block:'start'});
  }

  buttons.forEach(btn => btn.addEventListener('click', () => setPage(btn.dataset.petPageButton)));
  prev?.addEventListener('click', () => setPage(page - 1));
  next?.addEventListener('click', () => setPage(page + 1));

  async function initAdminCodes() {
    if (!window.NineYinAccount) return;
    try {
      await NineYinAccount.access;
      if (!NineYinAccount.isAdmin()) return;

      const rows = [...document.querySelectorAll('[data-private-pet-code]')];
      rows.forEach(row => row.hidden = false);

      const keys = rows.map(row => row.dataset.privatePetCode).filter(Boolean);
      const map = await NineYinAccount.getPrivateItemCodes(keys);
      rows.forEach(row => {
        const value = map[row.dataset.privatePetCode];
        const target = row.querySelector('strong');
        if (target && value) target.textContent = value;
      });
    } catch (err) {
      console.error('Private pet code load failed:', err);
    }
  }

  render();
  initAdminCodes();
})();