const topbar = document.querySelector(".topbar");
const siteShell = document.querySelector(".site-shell");
const cursorAura = document.querySelector(".cursor-aura");
const cards = document.querySelectorAll(".guide-card, .directory-card, .collection-entry");
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const finePointer = window.matchMedia("(pointer: fine)");

const isEditableTarget = (target) => {
  return target instanceof HTMLElement && (
    target.matches("input, textarea, [contenteditable='true']") ||
    Boolean(target.closest("input, textarea, [contenteditable='true']"))
  );
};

document.addEventListener("selectstart", (event) => {
  if (!isEditableTarget(event.target)) event.preventDefault();
});

document.addEventListener("copy", (event) => {
  if (!isEditableTarget(event.target)) event.preventDefault();
});

document.addEventListener("cut", (event) => {
  if (!isEditableTarget(event.target)) event.preventDefault();
});

document.addEventListener("contextmenu", (event) => {
  if (!isEditableTarget(event.target)) event.preventDefault();
});

document.addEventListener("dragstart", (event) => {
  if (event.target instanceof HTMLImageElement || event.target instanceof HTMLAnchorElement) {
    event.preventDefault();
  }
});

document.addEventListener("keydown", (event) => {
  if (isEditableTarget(event.target) || !(event.ctrlKey || event.metaKey)) return;

  if (["a", "c", "s", "u", "x"].includes(event.key.toLowerCase())) {
    event.preventDefault();
  }
});

const updateTopbar = () => {
  topbar?.classList.toggle("is-scrolled", window.scrollY > 24);
};

updateTopbar();
window.addEventListener("scroll", updateTopbar, { passive: true });

// 0.0.21: heavy cursor parallax/card tilt disabled for smoother scrolling.
const tableCarousel = document.querySelector("[data-table-carousel]");

if (tableCarousel) {
  const slides = Array.from(tableCarousel.querySelectorAll("[data-table-slide]"));
  const contentsLinks = Array.from(document.querySelectorAll("[data-table-index]"));
  const previousButton = tableCarousel.querySelector("[data-table-prev]");
  const nextButton = tableCarousel.querySelector("[data-table-next]");
  const title = tableCarousel.querySelector("[data-table-title]");
  const counter = tableCarousel.querySelector("[data-table-counter]");
  let activeIndex = Math.max(0, slides.findIndex((slide) => `#${slide.id}` === window.location.hash));

  const formatIndex = (value) => String(value).padStart(2, "0");

  const showTable = (index, updateHash = false) => {
    if (!slides.length) return;

    activeIndex = (index + slides.length) % slides.length;

    slides.forEach((slide, slideIndex) => {
      const isActive = slideIndex === activeIndex;
      slide.classList.toggle("is-active", isActive);
      slide.hidden = !isActive;
    });

    contentsLinks.forEach((link) => {
      const isActive = Number(link.dataset.tableIndex) === activeIndex;
      link.classList.toggle("is-active", isActive);
      if (isActive) link.setAttribute("aria-current", "true");
      else link.removeAttribute("aria-current");
    });

    const activeSlide = slides[activeIndex];
    if (title) title.textContent = activeSlide.dataset.title || "Полезная таблица";
    if (counter) counter.textContent = `${formatIndex(activeIndex + 1)} / ${formatIndex(slides.length)}`;

    const hasMultipleTables = slides.length > 1;
    if (previousButton) previousButton.disabled = !hasMultipleTables;
    if (nextButton) nextButton.disabled = !hasMultipleTables;

    if (updateHash && activeSlide.id) {
      history.replaceState(null, "", `#${activeSlide.id}`);
      tableCarousel.scrollIntoView({ behavior: reduceMotion.matches ? "auto" : "smooth", block: "start" });
    }
  };

  previousButton?.addEventListener("click", () => showTable(activeIndex - 1, true));
  nextButton?.addEventListener("click", () => showTable(activeIndex + 1, true));

  contentsLinks.forEach((link) => {
    link.addEventListener("click", () => showTable(Number(link.dataset.tableIndex), true));
  });

  showTable(activeIndex);
}

// Shared copy/image protection is handled by anti-copy.js.

/* ==========================================================
   0.0.34 — улучшения главной, питомцев, школ/фракций/сект
   ========================================================== */
(() => {
  const patchStyle = document.createElement("style");
  patchStyle.id = "nineyin-patch-0034";
  patchStyle.textContent = `
    .home-quick-links{
      display:flex;
      justify-content:center;
      margin:-3px 0 20px;
    }
    .terminology-link{
      display:inline-flex;
      min-height:34px;
      padding:0 16px;
      align-items:center;
      justify-content:center;
      gap:8px;
      border:1px solid rgba(230,183,93,.58);
      background:linear-gradient(180deg,rgba(29,37,36,.76),rgba(7,20,30,.92));
      box-shadow:inset 0 0 18px rgba(230,183,93,.035),0 8px 22px rgba(0,0,0,.18);
      color:#efd58e;
      font:700 .72rem/1 "Golos Text",Arial,sans-serif;
      letter-spacing:.075em;
      text-decoration:none;
      text-transform:uppercase;
      transition:transform .18s ease,border-color .18s ease,box-shadow .18s ease,color .18s ease;
    }
    .terminology-link span{font-size:.92rem;color:#e4b858}
    .terminology-link:hover,.terminology-link:focus-visible{
      transform:translateY(-2px);
      border-color:rgba(246,210,128,.95);
      box-shadow:inset 0 0 22px rgba(230,183,93,.07),0 10px 26px rgba(0,0,0,.26),0 0 18px rgba(230,183,93,.09);
      color:#fff0bc;
    }
    .terminology-link:focus-visible{outline:1px solid #f0c66b;outline-offset:3px}

    .directory-image-card{position:relative;background:radial-gradient(circle at 50% 42%,rgba(24,67,88,.32),rgba(4,17,28,.95) 72%)}
    .directory-image-card img{background:rgba(4,17,28,.78)}
    .directory-image-card.image-ready img{animation:directoryImageReady .34s ease both}
    .directory-image-card.image-missing img{opacity:0}
    .directory-image-card.image-missing::after{
      content:"Изображение временно недоступно";
      position:absolute;
      inset:18px 14px 54px;
      display:grid;
      place-items:center;
      border:1px dashed rgba(226,183,91,.3);
      color:#9baab5;
      font:600 .68rem/1.45 "Golos Text",Arial,sans-serif;
      text-align:center;
      letter-spacing:.03em;
    }
    @keyframes directoryImageReady{from{opacity:.15;filter:blur(2px)}to{opacity:1;filter:none}}

    .pet-intro{
      position:relative;
      isolation:isolate;
      overflow:hidden;
      border:1px solid rgba(225,176,73,.52)!important;
      background:
        radial-gradient(circle at 16% 15%,rgba(38,139,154,.09),transparent 29%),
        radial-gradient(circle at 88% 80%,rgba(210,158,59,.07),transparent 30%),
        linear-gradient(145deg,rgba(4,24,36,.97),rgba(4,17,29,.96))!important;
      box-shadow:0 22px 48px rgba(0,0,0,.24),inset 0 0 36px rgba(220,171,71,.025);
    }
    .pet-intro::before{
      content:"";
      position:absolute;
      inset:10px;
      z-index:0;
      pointer-events:none;
      border:1px solid rgba(225,176,73,.14);
    }
    .pet-intro::after{
      content:"";
      position:absolute;
      z-index:0;
      width:220px;height:220px;right:-72px;top:-82px;
      border:1px solid rgba(224,176,73,.14);
      border-radius:50%;
      box-shadow:0 0 0 18px rgba(224,176,73,.018),0 0 0 36px rgba(77,176,184,.012);
      pointer-events:none;
    }
    .pet-intro-copy,.pet-intro-art{position:relative;z-index:1}
    .pet-intro-copy::after{
      content:"◇  ◇  ◇";
      display:block;
      width:max-content;
      margin-top:22px;
      color:rgba(229,183,87,.48);
      font-size:.68rem;
      letter-spacing:.65em;
    }
    .pet-intro-art{
      position:relative;
      padding:10px!important;
      background:linear-gradient(145deg,rgba(218,172,76,.16),rgba(25,88,102,.1))!important;
      box-shadow:0 14px 32px rgba(0,0,0,.25)!important;
    }
    .pet-intro-art::before{
      content:"";
      position:absolute;
      inset:4px;
      z-index:2;
      pointer-events:none;
      border:1px solid rgba(240,202,120,.36);
      box-shadow:inset 0 0 22px rgba(228,183,89,.06);
    }
    .pet-intro-art img{
      display:block;
      width:100%;
      filter:saturate(1.09) contrast(1.055) brightness(1.025);
    }
    .pet-intro-art figcaption{
      position:relative;
      z-index:3;
      margin-top:0!important;
      border-top:1px solid rgba(229,183,87,.28);
      background:linear-gradient(180deg,rgba(5,23,35,.96),rgba(3,14,24,.98))!important;
    }
    @media(max-width:720px){
      .home-quick-links{margin:0 0 16px}
      .terminology-link{width:100%;max-width:310px}
      .pet-intro::after{width:150px;height:150px;right:-60px;top:-55px}
    }
  `;
  document.head.appendChild(patchStyle);

  // 1. Главная: небольшая кнопка "Основная Терминология".
  if (document.body.classList.contains("compact-home") && !document.querySelector(".terminology-link")) {
    const hero = document.querySelector(".hero-header");
    if (hero) {
      const wrap = document.createElement("div");
      wrap.className = "home-quick-links";
      wrap.setAttribute("aria-label", "Быстрые ссылки");
      wrap.innerHTML = `<a class="terminology-link"
        href="https://docs.google.com/spreadsheets/d/e/2PACX-1vTh4YK_HLykgF5yNfI5aqqsV29Ii_MYzkpWZbDvmtjQ23Hv84uy4O_eqR9fPG2A7mPa6pDjLkkYELdK/pubhtml"
        target="_blank" rel="noopener noreferrer">Основная Терминология <span aria-hidden="true">↗</span></a>`;
      hero.insertAdjacentElement("afterend", wrap);
    }
  }

  // 3. Школы / Фракции / Секты: повторная загрузка картинок вместо пустых квадратов.
  const directoryImages = [...document.querySelectorAll(".directory-image-card img")];
  directoryImages.forEach((img) => {
    let retries = 0;
    const card = img.closest(".directory-image-card");
    img.loading = "eager";

    const loaded = () => {
      card?.classList.remove("image-missing");
      card?.classList.add("image-ready");
    };

    const retry = () => {
      if (retries >= 2) {
        card?.classList.add("image-missing");
        return;
      }
      retries += 1;
      const raw = img.getAttribute("src") || "";
      try {
        const url = new URL(raw, location.href);
        url.searchParams.set("_retry", String(Date.now() + retries));
        setTimeout(() => { img.src = url.href; }, 180 * retries);
      } catch {
        card?.classList.add("image-missing");
      }
    };

    img.addEventListener("load", loaded);
    img.addEventListener("error", retry);
    if (img.complete) {
      if (img.naturalWidth > 0) loaded();
      else retry();
    }
  });

  // 5. Верхняя картинка питомцев — чуть более чёткая загрузка + декоративная рамка.
  const introPetImage = document.querySelector(".pet-intro-art img");
  if (introPetImage) {
    introPetImage.loading = "eager";
    introPetImage.decoding = "async";
    introPetImage.setAttribute("fetchpriority", "high");
  }
})();
