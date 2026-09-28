(() => {
  'use strict';

  const normalizeNavigation = () => {
    document.querySelectorAll('.topnav a[href]').forEach((link) => {
      const href = (link.getAttribute('href') || '').split('#')[0];
      if (href.endsWith('partnership.html')) link.textContent = 'Партнеры';
      if (href.endsWith('topup.html')) link.remove();
    });
  };

  const enhancePartnersPage = () => {
    const file = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
    if (file !== 'partnership.html') return;

    document.title = 'Партнеры и услуги — Легенды Кунг-Фу';

    const header = document.querySelector('.partnership-page-header');
    if (header) {
      const kicker = header.querySelector('.collection-kicker');
      const title = header.querySelector('h1');
      const paragraphs = header.querySelectorAll(':scope > p:not(.collection-kicker)');
      if (kicker) kicker.textContent = 'Партнеры · услуги · сообщества';
      if (title) title.textContent = 'Партнеры и услуги';
      if (paragraphs[0]) paragraphs[0].textContent = 'Проверенные партнеры проекта: пополнение, русификаторы, игровые инструменты и сообщества.';

      if (!document.querySelector('.partner-service-nav')) {
        const nav = document.createElement('nav');
        nav.className = 'partner-service-nav';
        nav.setAttribute('aria-label', 'Услуги партнеров');
        nav.innerHTML = `
          <a href="#topup-services"><span>₽</span><strong>Пополнение</strong></a>
          <a href="#translation-services"><span>RU</span><strong>Русификаторы</strong></a>
          <a href="#tools-services"><span>⚙</span><strong>Игровые инструменты</strong></a>
          <a href="#community-services"><span>D</span><strong>Сообщества</strong></a>
        `;
        header.insertAdjacentElement('afterend', nav);
      }
    }

    const community = document.querySelector('.contact-hub');
    if (community) community.id = 'community-services';

    const partnerSection = document.querySelector('.partner-section');
    if (partnerSection) {
      partnerSection.id = 'topup-services';
      const heading = partnerSection.querySelector('.partner-section-heading');
      if (heading) {
        const h2 = heading.querySelector('h2');
        const p = heading.querySelector('p');
        if (h2) h2.textContent = 'Партнеры и доступные услуги';
        if (p) p.textContent = 'Пополнение, переводы и игровые инструменты собраны прямо в карточках партнеров — без повторяющихся контактов и цен.';

        if (!heading.querySelector('.merged-topup-note')) {
          const note = document.createElement('aside');
          note.className = 'merged-topup-note';
          note.innerHTML = `
            <strong>Перед пополнением</strong>
            <p>Российские банковские карты могут не поддерживаться зарубежными игровыми сервисами. Стоимость зависит от курса и может меняться — перед оплатой уточняйте актуальную цену и способ зачисления у выбранного партнера.</p>
          `;
          heading.appendChild(note);
        }
      }
    }

    const taiwan = document.querySelector('.taiwan-seller-block');
    if (taiwan) {
      taiwan.id = 'tools-services';
      taiwan.dataset.service = 'topup tools';
    }

    const translator = document.querySelector('.pirate-translator-block');
    if (translator) translator.id = 'translation-services';

    const daddy = document.querySelector('.partner-profile');
    if (daddy) daddy.dataset.service = 'topup translation';

    if (!document.getElementById('partnersServicesStyle')) {
      const style = document.createElement('style');
      style.id = 'partnersServicesStyle';
      style.textContent = `
        .partner-service-nav{
          display:grid;
          grid-template-columns:repeat(4,minmax(0,1fr));
          gap:10px;
          margin:0 0 28px;
        }
        .partner-service-nav a{
          display:flex;
          min-height:64px;
          align-items:center;
          justify-content:center;
          gap:10px;
          padding:12px 14px;
          border:1px solid rgba(224,176,73,.32);
          background:linear-gradient(180deg,rgba(11,31,43,.88),rgba(5,18,29,.94));
          color:#e8d29a;
          text-decoration:none;
          box-shadow:0 10px 24px rgba(0,0,0,.16);
          transition:.18s ease;
        }
        .partner-service-nav a:hover,
        .partner-service-nav a:focus-visible{
          transform:translateY(-2px);
          border-color:rgba(240,195,93,.72);
          color:#ffe6a5;
          box-shadow:0 14px 28px rgba(0,0,0,.24),0 0 16px rgba(220,169,65,.08);
        }
        .partner-service-nav span{
          display:grid;
          width:31px;
          height:31px;
          place-items:center;
          border:1px solid rgba(224,176,73,.36);
          border-radius:50%;
          color:#e8bb5e;
          font-size:11px;
          font-weight:800;
        }
        .partner-service-nav strong{font-size:13px;letter-spacing:.03em}
        .merged-topup-note{
          margin-top:18px;
          padding:14px 16px;
          border:1px solid rgba(224,176,73,.25);
          border-left:3px solid #dcae4b;
          background:rgba(214,164,77,.055);
          text-align:left;
        }
        .merged-topup-note strong{color:#e9c675}
        .merged-topup-note p{margin:5px 0 0!important;color:#aebbc3!important;font-size:13px;line-height:1.55}
        #topup-services,#translation-services,#tools-services,#community-services{scroll-margin-top:96px}
        @media(max-width:860px){.partner-service-nav{grid-template-columns:repeat(2,minmax(0,1fr))}}
        @media(max-width:520px){.partner-service-nav{grid-template-columns:1fr}.partner-service-nav a{min-height:54px}}
      `;
      document.head.appendChild(style);
    }
  };

  const run = () => {
    normalizeNavigation();
    enhancePartnersPage();
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run, { once: true });
  else run();
})();
