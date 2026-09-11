(async()=>{
  await NineYinAccount.access;
  const grid=document.getElementById('usersGrid'),count=document.getElementById('userCount'),search=document.getElementById('userSearch');
  let users=[];
  const esc=s=>String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function draw(){
    const q=search.value.trim().toLowerCase();
    const rows=users.filter(u=>!q||String(u.game_nickname||'').toLowerCase().includes(q));
    count.textContent=users.length;
    grid.innerHTML=rows.length?rows.map(u=>`<article class="user-card user-card-simple"><img src="${esc(u.avatar_url||NineYinAccount.defaultAvatar)}" alt=""><h2>${esc(u.game_nickname||'Без игрового ника')}</h2></article>`).join(''):'<div class="demo-hint">Пользователи не найдены.</div>';
  }
  try{users=await NineYinAccount.listProfiles();draw()}catch(e){grid.innerHTML=`<div class="demo-hint">Ошибка загрузки пользователей: ${esc(e.message)}</div>`}
  search.addEventListener('input',draw);
  document.getElementById('userClear').addEventListener('click',()=>{search.value='';draw();search.focus()});
})();
