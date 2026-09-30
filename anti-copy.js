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

  const normalizeBeginnerGuideBackButtons=()=>{
    const file=(location.pathname.split('/').pop()||'index.html').toLowerCase();
    const guideFiles=new Set(['meridian-guide.html','jade-dolls.html','pets.html','tables.html']);
    if(!guideFiles.has(file)) return;
    const page=document.querySelector('.page-content');
    if(!page) return;

    if(!document.getElementById('nineyin-beginner-back-style')){
      const style=document.createElement('style');
      style.id='nineyin-beginner-back-style';
      style.textContent=`
        .nineyin-guide-back-wrap{display:flex;justify-content:flex-start;margin:18px 0 28px}
        .nineyin-guide-back-wrap.bottom{justify-content:center;margin:34px 0 12px}
        .nineyin-guide-back-btn{display:inline-flex;align-items:center;gap:10px;padding:12px 18px;border:1px solid rgba(224,176,73,.7);border-radius:10px;background:linear-gradient(180deg,rgba(8,33,46,.94),rgba(4,22,33,.96));color:#f6df9e!important;text-decoration:none!important;font-weight:800;letter-spacing:.035em;box-shadow:0 8px 22px rgba(0,0,0,.2),0 0 18px rgba(224,176,73,.07);transition:transform .18s ease,border-color .18s ease,box-shadow .18s ease}
        .nineyin-guide-back-btn:hover{transform:translateY(-1px);border-color:#e0b049;box-shadow:0 10px 26px rgba(0,0,0,.24),0 0 22px rgba(224,176,73,.14)}
        @media(max-width:640px){.nineyin-guide-back-wrap{margin:14px 0 22px}.nineyin-guide-back-btn{width:100%;justify-content:center;padding:11px 14px}}
      `;
      document.head.appendChild(style);
    }

    document.querySelectorAll('.nineyin-pets-back-wrap').forEach(el=>el.remove());

    if(!page.querySelector('.nineyin-guide-back-wrap.top')){
      const top=document.createElement('div');
      top.className='nineyin-guide-back-wrap top';
      top.innerHTML='<a class="nineyin-guide-back-btn" href="beginners.html">← Назад в справочник</a>';
      page.insertBefore(top,page.firstChild);
    }
    if(!page.querySelector('.nineyin-guide-back-wrap.bottom')){
      const bottom=document.createElement('div');
      bottom.className='nineyin-guide-back-wrap bottom';
      bottom.innerHTML='<a class="nineyin-guide-back-btn" href="beginners.html">← Назад в справочник</a>';
      page.appendChild(bottom);
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

  const normalizeBotPricingForZdn=()=>{
    const file=(location.pathname.split('/').pop()||'index.html').toLowerCase();
    if(file!=='partnership.html') return;
    const block=document.querySelector('.bot-partners-block');
    if(!block) return;
    const cards=[...block.querySelectorAll('.bot-partner-card')];
    const tcn=cards.find(card=>(card.querySelector('h4')?.textContent||'').trim()==='TCN');
    const zdn=cards.find(card=>(card.querySelector('h4')?.textContent||'').trim()==='ZDN');
    if(!zdn) return;

    const price=block.querySelector('.bot-price-grid');
    const warning=block.querySelector(':scope > .partner-warning');
    let details=zdn.querySelector('.zdn-pricing-details');
    if(!details){
      details=document.createElement('div');
      details.className='zdn-pricing-details';
      const links=zdn.querySelector('.bot-link-row');
      zdn.insertBefore(details,links||null);
    }
    if(price && price.parentElement!==details) details.appendChild(price);
    if(warning && warning.parentElement!==details) details.appendChild(warning);

    if(price){
      price.setAttribute('aria-label','Стоимость ZDN');
      price.style.marginTop='14px';
    }
    if(warning){
      const strong=warning.querySelector('strong');
      const text=warning.querySelector('p');
      if(strong) strong.textContent='Оплата и пополнение ZDN';
      if(text) text.textContent='Актуальный способ оплаты смотрите в разделе Discord ZDN. Также возможно пополнение ZDN через тайваньского селлера. Лицензия приобретается либо на один аккаунт, либо на весь ПК.';
    }
    const zdnDescription=zdn.querySelector(':scope > p');
    if(zdnDescription) zdnDescription.textContent='Старый ZDN для Тайвани и Пиратки. Лицензия доступна на 30 дней.';
    const tcnDescription=tcn?.querySelector(':scope > p');
    if(tcnDescription) tcnDescription.textContent='TCN для Тайвани и Пиратки. Актуальные условия использования и оплаты смотрите на сайте и в Discord TCN.';
    const tcnDiscord=tcn?.querySelector('.contact-discord .contact-link-copy small');
    if(tcnDiscord) tcnDiscord.textContent='Поддержка и информация';
    const tcnDiscordText=tcn?.querySelector('.contact-discord .contact-link-copy span');
    if(tcnDiscordText) tcnDiscordText.textContent='Инструкции и актуальные условия';
  };

  normalizeLegacyCharacterLinks();
  normalizeBeginnerGuideBackButtons();
  normalizePartnersCommunityHeading();
  normalizeTaiwanSellerPricing();
  normalizeBotPricingForZdn();

  const observer=new MutationObserver(mutations=>{
    for(const mutation of mutations){
      for(const node of mutation.addedNodes) processNode(node);
    }
    normalizeLegacyCharacterLinks();
    normalizeBeginnerGuideBackButtons();
    normalizePartnersCommunityHeading();
    normalizeTaiwanSellerPricing();
    normalizeBotPricingForZdn();
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
    const ctrl=e.ctrlKey||e.metaKey, shift=e.shiftKey, alt=e.altKey;
    const blocked = k==='f12' || k==='printscreen' ||
      (ctrl&&!isEditable(e.target)&&['a','c','x','s','u','p'].includes(k)) ||
      (ctrl&&shift&&['i','j','c','s','k'].includes(k)) ||
      (ctrl&&alt&&['i','j','c'].includes(k));
    if(blocked){
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation?.();
    }
  },true);

  // Deliberately no focus-loss blackout: it caused visual problems and does not prevent OS-level screenshots.
})();
