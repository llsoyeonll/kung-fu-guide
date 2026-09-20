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

  function ensureHistoryModal(){
    let modal=document.getElementById('loginHistoryModal');
    if(modal) return modal;
    modal=document.createElement('div');
    modal.id='loginHistoryModal';
    modal.className='login-history-modal';
    modal.hidden=true;
    modal.innerHTML=`<div class="login-history-backdrop" data-history-close></div>
      <section class="login-history-dialog" role="dialog" aria-modal="true" aria-labelledby="loginHistoryTitle">
        <header class="login-history-head">
          <div>
            <p class="login-history-kicker">ТОЛЬКО ДЛЯ АДМИНИСТРАТОРА</p>
            <h2 id="loginHistoryTitle">История входов</h2>
            <p class="login-history-user" id="loginHistoryUser"></p>
          </div>
          <button class="login-history-close" type="button" data-history-close aria-label="Закрыть">×</button>
        </header>
        <div class="login-history-note">Геолокация определяется по внешнему IP и может показывать VPN, прокси или узел мобильного оператора вместо реального города пользователя.</div>
        <div class="login-history-content" id="loginHistoryContent"></div>
      </section>`;
    document.body.appendChild(modal);
    modal.addEventListener('click',e=>{
      if(e.target.closest('[data-history-close]')) closeHistory();
    });
    document.addEventListener('keydown',e=>{
      if(e.key==='Escape'&&!modal.hidden) closeHistory();
    });
    return modal;
  }

  function closeHistory(){
    const modal=document.getElementById('loginHistoryModal');
    if(!modal) return;
    modal.hidden=true;
    document.body.classList.remove('login-history-open');
  }

  function fmtDate(value){
    if(!value) return '—';
    const d=new Date(value);
    if(Number.isNaN(d.getTime())) return String(value);
    return d.toLocaleString('ru-RU',{year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit'});
  }

  function deviceLabel(ua){
    ua=String(ua||'');
    let device='Неизвестное устройство';
    if(/iPhone/i.test(ua)) device='iPhone';
    else if(/iPad/i.test(ua)) device='iPad';
    else if(/Android/i.test(ua)){
      const m=ua.match(/Android[^;)]*;\s*([^;)]+?)(?:\s+Build\/[^;)]+)?[;)]/i);
      device=m?.[1]?.trim()||'Android';
    }else if(/Windows/i.test(ua)) device='Windows';
    else if(/Macintosh|Mac OS X/i.test(ua)) device='macOS';
    else if(/Linux/i.test(ua)) device='Linux';

    let browser='Браузер';
    if(/YaBrowser/i.test(ua)) browser='Яндекс Браузер';
    else if(/OPR\//i.test(ua)) browser=/Edition Yx GX/i.test(ua)?'Opera GX':'Opera';
    else if(/Firefox\//i.test(ua)) browser='Firefox';
    else if(/CriOS\//i.test(ua)) browser='Chrome iOS';
    else if(/Chrome\//i.test(ua)) browser='Chrome';
    else if(/Safari\//i.test(ua)) browser='Safari';

    return `${device} · ${browser}`;
  }

  function locationLabel(row){
    const parts=[];
    for(const value of [row.city,row.region,row.country_name||row.country_code]){
      const text=String(value||'').trim();
      if(text&&!parts.some(x=>x.toLowerCase()===text.toLowerCase())) parts.push(text);
    }
    return parts.length?parts.join(', '):'Не определено';
  }

  function historyRows(rows){
    if(!rows.length) return `<div class="login-history-empty">У этого пользователя пока нет сохранённых сессий.</div>`;
    return `<div class="login-history-list">${rows.map((row,index)=>`
      <article class="login-history-row">
        <div class="login-history-row-top">
          <strong>Вход ${rows.length-index}</strong>
          <time>${esc(fmtDate(row.logged_in_at))}</time>
        </div>
        <div class="login-history-grid">
          <div><span>IP</span><b class="notranslate">${esc(row.ip_address||'—')}</b></div>
          <div><span>Геолокация</span><b>${esc(locationLabel(row))}</b></div>
          <div><span>Устройство</span><b>${esc(deviceLabel(row.user_agent))}</b></div>
          <div><span>Сеть</span><b>${esc([row.asn,row.organization].filter(Boolean).join(' · ')||'Не определено')}</b></div>
        </div>
        <details class="login-history-details">
          <summary>Технические данные</summary>
          <div class="login-history-ua notranslate">${esc(row.user_agent||'User-Agent отсутствует')}</div>
        </details>
      </article>`).join('')}</div>`;
  }

  async function openHistory(userId,nick){
    if(!admin) return;
    const modal=ensureHistoryModal();
    const content=modal.querySelector('#loginHistoryContent');
    modal.querySelector('#loginHistoryUser').textContent=nick||'Пользователь';
    content.innerHTML=`<div class="login-history-loading">Загружаю историю входов…</div>`;
    modal.hidden=false;
    document.body.classList.add('login-history-open');

    try{
      let rows=await NineYinAccount.getUserLoginHistory(userId);
      content.innerHTML=historyRows(rows);

      const needsGeo=rows.some(r=>r.ip_address&&!r.geo_updated_at);
      if(needsGeo){
        const info=document.createElement('div');
        info.className='login-history-geo-progress';
        info.textContent='Уточняю геолокацию IP…';
        content.prepend(info);
        try{
          await NineYinAccount.resolveUserLoginGeo(userId);
          rows=await NineYinAccount.getUserLoginHistory(userId);
          content.innerHTML=historyRows(rows);
        }catch(err){
          info.textContent='Не удалось уточнить часть геолокации. IP, устройство и время входа всё равно показаны.';
          info.classList.add('is-error');
        }
      }
    }catch(err){
      content.innerHTML=`<div class="login-history-error">${esc(err.message||'Не удалось загрузить историю входов.')}</div>`;
    }
  }

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
      <div class="user-admin-actions">
        <button class="user-history-btn" type="button" data-login-history="${esc(u.id)}" data-user-name="${esc(name)}">История входов</button>
        <button class="user-block-btn ${blocked?'unblock':''}" type="button" data-block-user="${esc(u.id)}" data-blocked="${blocked?'1':'0'}" ${protectedAccount?'disabled':''}>${protectedAccount?esc(t('Администратор')):esc(t(blocked?'Разблокировать':'Заблокировать'))}</button>
      </div>`:''}
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
    const historyBtn=e.target.closest('[data-login-history]');
    if(historyBtn&&admin){
      await openHistory(historyBtn.dataset.loginHistory,historyBtn.dataset.userName);
      return;
    }

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
