(() => {
  'use strict';

  const grid = document.getElementById('petCatalogGrid');

  // 0.0.34: старое служебное название заменяем на более аккуратное.
  document.querySelectorAll('.pet-catalog-card').forEach(card => {
    const title = card.querySelector('h3');
    const image = card.querySelector('img');
    if (title && title.textContent.trim() === 'Название не добавлено') title.textContent = 'Без названия';
    if (image && image.alt.trim() === 'Название не добавлено') image.alt = 'Без названия';
  });

  // 0.0.34: новая третья страница — 10 добавленных пользователем питомцев.
  if (grid && !grid.querySelector('[data-pet-page="3"]')) {
    const newCards = Array.from({length: 10}, (_, index) => {
      const n = index + 1;
      const nn = String(n).padStart(2, '0');
      return `<article class="pet-catalog-card" data-pet-page="3">
        <div class="pet-card-image-wrap">
          <img src="assets/pets/pet-03-${nn}.webp?v=0.0.34" alt="Без названия" loading="lazy" decoding="async">
        </div>
        <div class="pet-card-copy">
          <h3>Без названия</h3>
          <p>Нет описания</p>
          <div class="pet-code-row" data-private-pet-code="pet_p3_${nn}" hidden>
            <span>КОД ПИТОМЦА</span><strong>Не указан</strong>
          </div>
        </div>
      </article>`;
    }).join('');
    grid.insertAdjacentHTML('beforeend', newCards);
  }

  const numberBox = document.querySelector('.pet-page-numbers');
  if (numberBox && !numberBox.querySelector('[data-pet-page-button="3"]')) {
    numberBox.insertAdjacentHTML(
      'beforeend',
      '<button class="pet-page-number" type="button" data-pet-page-button="3">3</button>'
    );
  }

  const cards = [...document.querySelectorAll('[data-pet-page]')];
  const buttons = [...document.querySelectorAll('[data-pet-page-button]')];
  const prev = document.getElementById('petPrevPage');
  const next = document.getElementById('petNextPage');
  const counter = document.getElementById('petPageCount');
  const totalPages = Math.max(1, ...cards.map(card => Number(card.dataset.petPage) || 1));
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
