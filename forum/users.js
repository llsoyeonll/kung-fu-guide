(async()=>{
  await NineYinAccount.access;
  const grid=document.getElementById('usersGrid'),count=document.getElementById('userCount'),search=document.getElementById('userSearch');
  let users=[];
  const current=NineYinAccount.getCurrent();
  const admin=NineYinAccount.isAdmin();
  const esc=s=>String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function card(u){
    const blocked=Boolean(u.is_blocked);
    const protectedAccount=u.role==='admin'||u.id===current.user?.id;
    return `<article class="user-card user-card-simple${blocked?' user-card-blocked':''}" data-user-id="${esc(u.id)}">
      <img src="${esc(u.avatar_url||NineYinAccount.defaultAvatar)}" alt="">
      <h2>${esc(u.game_nickname||'Без игрового ника')}</h2>
      ${admin?`<div class="user-admin-state ${blocked?'blocked':'active'}">${blocked?'Заблокирован':'Активен'}</div>
      <button class="user-block-btn ${blocked?'unblock':''}" type="button" data-block-user="${esc(u.id)}" data-blocked="${blocked?'1':'0'}" ${protectedAccount?'disabled':''}>${protectedAccount?'Администратор':(blocked?'Разблокировать':'Заблокировать')}</button>`:''}
    </article>`;
  }
  function draw(){
    const q=search.value.trim().toLowerCase();
    const visible=admin?users:users.filter(u=>!u.is_blocked);
    const rows=visible.filter(u=>!q||String(u.game_nickname||'').toLowerCase().includes(q));
    count.textContent=visible.length;
    grid.innerHTML=rows.length?rows.map(card).join(''):'<div class="demo-hint">Пользователи не найдены.</div>';
  }
  async function reload(){users=await NineYinAccount.listProfiles();draw()}
  try{await reload()}catch(e){grid.innerHTML=`<div class="demo-hint">Ошибка загрузки пользователей: ${esc(e.message)}</div>`}
  search.addEventListener('input',draw);
  document.getElementById('userClear').addEventListener('click',()=>{search.value='';draw();search.focus()});
  grid.addEventListener('click',async e=>{
    const btn=e.target.closest('[data-block-user]');
    if(!btn||btn.disabled||!admin)return;
    const id=btn.dataset.blockUser,blocked=btn.dataset.blocked==='1';
    const cardEl=btn.closest('.user-card');
    const nick=cardEl?.querySelector('h2')?.textContent||'пользователя';
    const action=blocked?'разблокировать':'заблокировать';
    if(!confirm(`${action[0].toUpperCase()+action.slice(1)} пользователя «${nick}»?`))return;
    btn.disabled=true;
    try{
      await NineYinAccount.setUserBlocked(id,!blocked);
      await reload();
    }catch(err){
      alert(err.message||'Не удалось изменить статус пользователя.');
      btn.disabled=false;
    }
  });
})();
