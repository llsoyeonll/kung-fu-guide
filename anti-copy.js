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
    if(!document.querySelector('.pet-guide-site-shell')) return;
    const link=document.querySelector('.pet-page-header .collection-kicker a');
    if(!link) return;
    link.setAttribute('href','beginners.html');
    link.textContent='← К СПРАВОЧНИКУ НОВИЧКАМ';
  };

  normalizeLegacyCharacterLinks();
  normalizePetsBackLink();

  const observer=new MutationObserver(mutations=>{
    for(const mutation of mutations){
      for(const node of mutation.addedNodes) processNode(node);
    }
    normalizeLegacyCharacterLinks();
    normalizePetsBackLink();
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
