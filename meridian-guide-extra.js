(() => {
  'use strict';
  const dialog = document.getElementById('mgLightbox');
  if (!dialog || typeof dialog.showModal !== 'function') return;
  const largeImage = dialog.querySelector('img');
  const caption = dialog.querySelector('p');
  const close = dialog.querySelector('.mg-lightbox-close');
  document.querySelectorAll('.mg-image-button').forEach(button => {
    button.addEventListener('click', () => {
      const image = button.querySelector('img');
      if (!image) return;
      largeImage.src = image.currentSrc || image.src;
      largeImage.alt = image.alt;
      caption.textContent = image.alt;
      dialog.showModal();
    });
  });
  close.addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => {
    const bounds = dialog.getBoundingClientRect();
    if (event.target === dialog && (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom)) dialog.close();
  });
})();
