(async()=>{
  await NineYinAccount.access;
  const grid=document.getElementById('usersGrid'),count=document.getElementById('userCount'),search=document.getElementById('userSearch');
  let users=[];
  const current=NineYinAccount.getCurrent();
  const admin=NineYinAccount.isAdmin();
  const i18n=window.NineYinI18n;
  const t=s=>i18n?.t(s)||s;
  const esc=s=>String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const serverLabels={taiwan:'Тайвань',pirate:'Пиратка CN',america:'Америка',china:'Китай',malaysia:'Малайзия',both:'Тайвань и Пиратка CN'};
  const serverLabel=s=>t(serverLabels[s]||'Сервер не выбран');
  function card(u){
    const blocked=Boolean(u.is_blocked);
    const confirmed=Boolean(u.email_confirmed);
    const completed=Boolean(u.profile_completed);
    const protectedAccount=u.role==='admin'||u.id===current.user?.id;
    const name=u.game_nickname||u.display_name||(completed?'Без игрового ника':'Профиль не заполнен');
    const stateText=!confirmed?(blocked?'Не подтвержден · Заблокирован':'Не подтвержден'):(blocked?'Заблокирован':'Активен');
    const stateClass=!confirmed?'unconfirmed':(blocked?'blocked':'active');
    return `<article class="user-card user-card-simple${blocked?' user-card-blocked':''}${!confirmed?' user-card-unconfirmed':''}" data-user-id="${esc(u.id)}">
      <img src="${esc(u.avatar_url||NineYinAccount.defaultAvatar)}" alt="">
      <h2 class="notranslate">${esc(name)}</h2>
      <div class="user-server">${esc(t('Сервер'))}: ${esc(serverLabel(u.server))}</div>
      ${admin?`<div class="user-admin-state ${stateClass}">${esc(t(stateText))}</div>
      <button class="user-block-btn ${blocked?'unblock':''}" type="button" data-block-user="${esc(u.id)}" data-blocked="${blocked?'1':'0'}" ${protectedAccount?'disabled':''}>${protectedAccount?esc(t('Администратор')):esc(t(blocked?'Разблокировать':'Заблокировать'))}</button>`:''}
    </article>`;
  }
  function draw(){
    const q=search.value.trim().toLowerCase();
    const visible=admin?users:users.filter(u=>u.email_confirmed&&u.profile_completed&&!u.is_blocked);
    const rows=visible.filter(u=>!q||String(u.game_nickname||u.display_name||'').toLowerCase().includes(q));
    count.textContent=visible.length;
    grid.innerHTML=rows.length?rows.map(card).join(''):`<div class="demo-hint">${esc(t('Пользователи не найдены.'))}</div>`;
  }
  async function reload(){users=await NineYinAccount.listProfiles();draw()}
  try{await reload()}catch(e){grid.innerHTML=`<div class="demo-hint">${esc(t('Ошибка загрузки пользователей:'))} ${esc(e.message)}</div>`}
  search.addEventListener('input',draw);
  document.getElementById('userClear').addEventListener('click',()=>{search.value='';draw();search.focus()});
  grid.addEventListener('click',async e=>{
    const btn=e.target.closest('[data-block-user]');
    if(!btn||btn.disabled||!admin)return;
    const id=btn.dataset.blockUser,blocked=btn.dataset.blocked==='1';
    const cardEl=btn.closest('.user-card');
    const nick=cardEl?.querySelector('h2')?.textContent||t('пользователя');
    const question=blocked?`${t('Разблокировать пользователя')} «${nick}»?`:`${t('Заблокировать пользователя')} «${nick}»?`;
    if(!confirm(question))return;
    btn.disabled=true;
    try{await NineYinAccount.setUserBlocked(id,!blocked);await reload()}
    catch(err){alert(err.message||t('Не удалось изменить статус пользователя.'));btn.disabled=false}
  });
  window.addEventListener('nineyin:language-changed',draw);
})();
