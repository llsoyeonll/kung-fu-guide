(()=>{
  if(document.querySelector('.guide-floating-nav')) return;

  const wrap=document.createElement('nav');
  wrap.className='guide-floating-nav';
  wrap.setAttribute('aria-label','Навигация по странице');
  wrap.innerHTML=`
    <button type="button" class="guide-go-back" aria-label="Вернуться назад" title="Вернуться назад">←</button>
    <button type="button" class="guide-to-top" aria-label="Наверх" title="Наверх">↑</button>
  `;
  document.body.appendChild(wrap);

  const back=wrap.querySelector('.guide-go-back');
  const top=wrap.querySelector('.guide-to-top');

  const file=(location.pathname.split('/').pop()||'').toLowerCase();
  const fallback=(file==='meridian-guide.html'||file==='jade-dolls.html')?'beginners.html':'index.html';

  back.addEventListener('click',()=>{
    let sameOriginRef=false;
    try{
      sameOriginRef=Boolean(document.referrer)&&new URL(document.referrer).origin===location.origin;
    }catch(_){}
    if(sameOriginRef && history.length>1){
      history.back();
    }else{
      location.href=fallback;
    }
  });

  const updateTop=()=>{
    top.classList.toggle('is-visible',window.scrollY>420);
  };
  window.addEventListener('scroll',updateTop,{passive:true});
  updateTop();

  top.addEventListener('click',()=>{
    window.scrollTo({
      top:0,
      behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'
    });
  });
})();
