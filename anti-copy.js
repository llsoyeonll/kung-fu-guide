(() => {
  'use strict';
  const editable='input,textarea,select,option,[contenteditable="true"]';
  const isEditable=el=>!!(el&&el.closest&&el.closest(editable));
  document.body.classList.add('protected-content');

  const protectedImageSelector='.appearance-item-image,.catalog-item-card img,.artifact-item-image,.weapon-artifact-image';
  const protectImage=img=>{
    if(!(img instanceof HTMLImageElement)) return;
    img.draggable=false;
    img.setAttribute('draggable','false');
    img.style.webkitUserDrag='none';
    img.style.userSelect='none';
    img.style.webkitUserSelect='none';
    img.setAttribute('oncontextmenu','return false');
  };
  const watermarkImage=img=>{
    if(!(img instanceof HTMLImageElement) || !img.matches(protectedImageSelector) || img.closest('.nineyin-protected-image')) return;
    const parent=img.parentNode;
    if(!parent) return;
    const wrap=document.createElement('span');
    wrap.className='nineyin-protected-image';
    parent.insertBefore(wrap,img);
    wrap.appendChild(img);
    for(const cls of ['mark-a','mark-b']){
      const mark=document.createElement('span');
      mark.className='nineyin-image-watermark '+cls;
      mark.textContent='Soyeon';
      mark.setAttribute('aria-hidden','true');
      wrap.appendChild(mark);
    }
  };
  const processNode=node=>{
    if(!(node instanceof Element)) return;
    if(node instanceof HTMLImageElement){ protectImage(node); watermarkImage(node); }
    node.querySelectorAll?.('img').forEach(img=>{ protectImage(img); watermarkImage(img); });
  };
  document.querySelectorAll('img').forEach(img=>{ protectImage(img); watermarkImage(img); });

  const normalizeLegacyCharacterLinks=()=>{
    document.querySelectorAll('a[href]').forEach(link=>{
      const raw=link.getAttribute('href')||'';
      const base=raw.split('#')[0].split('?')[0];
      if(!base.endsWith('character.html')) return;
      const hash=raw.includes('#') ? `#${raw.split('#').slice(1).join('#')}` : '';
      link.setAttribute('href', `beginners.html${hash}`);
      const text=(link.textContent||'').trim();
      if(text==='О персонаже') link.textContent='Справочник новичкам';
      else if(text==='← О персонаже') link.textContent='← Справочник новичкам';
    });
  };

  const normalizePetsBackLink=()=>{
    const shell=document.querySelector('.pet-guide-site-shell');
    if(!shell) return;

    const oldLink=document.querySelector('.pet-page-header .collection-kicker a');
    if(oldLink){
      oldLink.setAttribute('href','beginners.html');
      oldLink.textContent='← К СПРАВОЧНИКУ НОВИЧКАМ';
    }

    if(!document.getElementById('nineyin-pets-back-style')){
      const style=document.createElement('style');
      style.id='nineyin-pets-back-style';
      style.textContent=`
        .nineyin-pets-back-wrap{display:flex;justify-content:flex-start;margin:18px 0 28px}
        .nineyin-pets-back-wrap.bottom{justify-content:center;margin:34px 0 12px}
        .nineyin-pets-back-btn{display:inline-flex;align-items:center;gap:10px;padding:12px 18px;border:1px solid rgba(224,176,73,.7);background:rgba(5,20,31,.88);color:#f6df9e!important;text-decoration:none!important;font-weight:800;letter-spacing:.04em;text-transform:uppercase;box-shadow:0 0 18px rgba(224,176,73,.08);transition:.2s ease}
        .nineyin-pets-back-btn:hover{transform:translateY(-1px);border-color:#e0b049;box-shadow:0 0 22px rgba(224,176,73,.16)}
      `;
      document.head.appendChild(style);
    }

    const page=document.querySelector('.pet-guide-page-content');
    const header=document.querySelector('.pet-page-header');
    if(page && header && !document.querySelector('.nineyin-pets-back-wrap.top')){
      const topWrap=document.createElement('div');
      topWrap.className='nineyin-pets-back-wrap top';
      topWrap.innerHTML='<a class="nineyin-pets-back-btn" href="beginners.html">← К справочнику новичкам</a>';
      header.insertAdjacentElement('afterend',topWrap);
    }

    if(page && !document.querySelector('.nineyin-pets-back-wrap.bottom')){
      const bottomWrap=document.createElement('div');
      bottomWrap.className='nineyin-pets-back-wrap bottom';
      bottomWrap.innerHTML='<a class="nineyin-pets-back-btn" href="beginners.html">← К справочнику новичкам</a>';
      page.appendChild(bottomWrap);
    }
  };

  const normalizePartnersCommunityHeading=()=>{
    const file=(location.pathname.split('/').pop()||'index.html').toLowerCase();
    if(file!=='partnership.html') return;
    const heading=document.querySelector('.contact-hub-heading');
    if(heading){
      const description=heading.querySelector('p');
      if(description) description.remove();
      const title=heading.querySelector('h2');
      if(title){
        title.style.width='100%';
        title.style.maxWidth='none';
        title.style.whiteSpace='nowrap';
      }
      heading.style.display='block';
      heading.style.width='100%';
      heading.style.maxWidth='none';
    }

    if(!document.getElementById('nineyin-partner-links-fix')){
      const style=document.createElement('style');
      style.id='nineyin-partner-links-fix';
      style.textContent=`
        @media (min-width:760px){
          .partner-links{
            display:grid!important;
            grid-template-columns:minmax(390px,1fr) minmax(320px,1fr)!important;
            width:100%!important;
            max-width:none!important;
          }
          .partner-links .translator-link .contact-link-copy strong{
            white-space:nowrap!important;
            font-size:clamp(1rem,1.45vw,1.15rem)!important;
          }
        }
      `;
      document.head.appendChild(style);
    }
  };

  const normalizeTaiwanSellerPricing=()=>{
    const file=(location.pathname.split('/').pop()||'index.html').toLowerCase();
    if(file!=='partnership.html') return;
    const block=document.querySelector('.taiwan-seller-block');
    if(!block) return;

    const description=block.querySelector('.partner-description');
    if(description){
      description.textContent='Помогает с пополнением золота на официальном сервере Тайвани. Стоимость рассчитывается с учётом текущего курса доллара.';
    }

    const grid=block.querySelector('.seller-price-grid');
    if(grid){
      [...grid.querySelectorAll('article')].forEach(article=>{
        const strong=(article.querySelector('strong')?.textContent||'').trim();
        if(strong==='5 $' || strong==='15 $' || strong==='MyCard') article.remove();
      });
      grid.style.gridTemplateColumns='1fr';
      grid.style.maxWidth='520px';
    }
  };

  normalizeLegacyCharacterLinks();
  normalizePetsBackLink();
  normalizePartnersCommunityHeading();
  normalizeTaiwanSellerPricing();

  const observer=new MutationObserver(mutations=>{
    for(const mutation of mutations){
      for(const node of mutation.addedNodes) processNode(node);
    }
    normalizeLegacyCharacterLinks();
    normalizePetsBackLink();
    normalizePartnersCommunityHeading();
    normalizeTaiwanSellerPricing();
  });
  observer.observe(document.body,{childList:true,subtree:true});

  const block=e=>{
    if(!isEditable(e.target)){
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation?.();
      return false;
    }
  };
  for(const type of ['contextmenu','dragstart','copy','cut','selectstart']){
    document.addEventListener(type,block,true);
  }
  document.addEventListener('pointerdown',e=>{
    if(e.button===2 && e.target instanceof HTMLImageElement) block(e);
  },true);

  document.addEventListener('keydown',e=>{
    const k=(e.key||'').toLowerCase();
    const ctrl=e.ctrlKey||e.metaKey, shift=e.shiftKey;
    const blocked = k==='f12' || k==='printscreen' ||
      (ctrl&&!isEditable(e.target)&&['a','c','x','s','u','p'].includes(k)) ||
      (ctrl&&shift&&['i','j','c','s','k'].includes(k));
    if(blocked){
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation?.();
    }
  },true);

  // Deliberately no focus-loss blackout: it caused visual problems and does not prevent OS-level screenshots.
})();
