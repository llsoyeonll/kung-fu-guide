(() => {
  'use strict';
  async function init(){
    if(!window.NineYinAccount) return;
    await NineYinAccount.access;
    const nodes=[...document.querySelectorAll('[data-private-item-code]')];
    nodes.forEach(n=>n.hidden=true);
    if(!NineYinAccount.isAdmin()) return;
    const keys=nodes.map(n=>n.dataset.privateItemCode).filter(Boolean);
    try{
      const map=await NineYinAccount.getPrivateItemCodes(keys);
      nodes.forEach(node=>{
        const code=map[node.dataset.privateItemCode];
        if(!code) return;
        const codeEl=node.querySelector('code');
        if(codeEl) codeEl.textContent=code;
        node.hidden=false;
      });
    }catch(err){
      console.error('Private item code load failed:',err);
    }
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
})();
