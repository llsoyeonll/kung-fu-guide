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
