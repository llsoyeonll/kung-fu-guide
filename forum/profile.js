(async()=>{
  await NineYinAccount.access;
  const current=NineYinAccount.getCurrent(),f=document.getElementById('profileEditForm'),file=document.getElementById('editAvatar'),status=document.getElementById('profileStatus');
  const i18n=window.NineYinI18n;
  const t=s=>i18n?.t(s)||s;
  const labels={taiwan:'Тайвань',pirate:'Пиратка CN',america:'Америка',china:'Китай',malaysia:'Малайзия',both:'Тайвань и Пиратка CN'};
  const label=s=>t(labels[s]||s||'—');
  function paint(p){
    document.getElementById('profileAvatar').src=p.avatar_url||NineYinAccount.defaultAvatar;
    document.getElementById('editAvatarPreview').src=p.avatar_url||NineYinAccount.defaultAvatar;
    document.getElementById('profileName').textContent=p.display_name;
    document.getElementById('profileGame').textContent=`${t('Игровой ник')}: ${p.game_nickname}`;
    document.getElementById('profileServer').textContent=label(p.server);
    document.getElementById('profileEmail').textContent=current.user.email;
    document.getElementById('profileDate').textContent=new Date(p.created_at||current.user.created_at).toLocaleDateString(i18n?.getLanguage()==='en'?'en-US':'ru-RU');
    document.getElementById('profileAbout').textContent=p.about;
    f.elements.display_name.value=p.display_name;f.elements.game_nickname.value=p.game_nickname;f.elements.server.value=p.server;f.elements.about.value=p.about;
  }
  paint(current.profile);
  file.addEventListener('change',e=>{const x=e.target.files?.[0];if(x)document.getElementById('editAvatarPreview').src=URL.createObjectURL(x)});
  f.addEventListener('submit',async e=>{e.preventDefault();const b=e.submitter;b.disabled=true;status.textContent=t('Сохраняем...');status.className='wide form-status';try{const fd=new FormData(f);const p=await NineYinAccount.saveOwnProfile(Object.fromEntries(fd),file.files?.[0]);paint(p);status.textContent=t('Изменения сохранены.')}catch(err){status.textContent=err.message;status.className='wide form-status error'}finally{b.disabled=false}});
})();
