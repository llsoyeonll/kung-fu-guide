(async()=>{
  await NineYinAccount.access;
  const root=document.getElementById('postView');
  const current=NineYinAccount.getCurrent();
  const esc=s=>String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const bytes=n=>{n=Number(n||0);if(n<1024)return `${n} Б`;if(n<1024*1024)return `${(n/1024).toFixed(1)} КБ`;return `${(n/1024/1024).toFixed(1)} МБ`;};
  const stickers={
    male:[
      ['male_01','Привет','assets/stickers/male/male_01.webp'],
      ['male_02','Спасибо','assets/stickers/male/male_02.webp'],
      ['male_03','Хм','assets/stickers/male/male_03.webp'],
      ['male_04','Злой','assets/stickers/male/male_04.webp'],
      ['male_05','Где мой урон','assets/stickers/male/male_05.webp'],
      ['male_06','GG','assets/stickers/male/male_06.webp'],
      ['male_07','Гайд читал','assets/stickers/male/male_07.webp']
    ],
    female:[
      ['female_01','Спасибо','assets/stickers/female/female_01.webp'],
      ['female_02','Ой','assets/stickers/female/female_02.webp'],
      ['female_03','Хи-хи','assets/stickers/female/female_03.webp'],
      ['female_04','Злость','assets/stickers/female/female_04.webp'],
      ['female_05','Плачу','assets/stickers/female/female_05.webp'],
      ['female_06','Ура','assets/stickers/female/female_06.webp']
    ]
  };
  const stickerByKey=Object.fromEntries([...stickers.male,...stickers.female].map(x=>[x[0],x]));
  const id=new URLSearchParams(location.search).get('id');
  if(!id){root.innerHTML='<div class="forum-empty"><h2>Запись не найдена</h2><p>Не указан идентификатор записи.</p></div>';return;}
  let post;
  try{
    post=await NineYinAccount.getPost(id);
    if(!post){root.innerHTML='<div class="forum-empty"><h2>Запись не найдена</h2><p>Возможно, она была удалена.</p></div>';return;}
    const date=new Date(post.created_at).toLocaleDateString('ru-RU',{day:'numeric',month:'long',year:'numeric'});
    const images=(post.content_images||[]).map((src,i)=>`<figure><img src="${esc(src)}" alt="Изображение ${i+1} к записи" draggable="false"><figcaption>Изображение ${i+1}</figcaption></figure>`).join('');
    root.innerHTML=`<header class="post-view-head"><div class="post-view-tags">${post.pinned?'<span class="pinned-badge">◆ Закреплено</span>':''}<span class="category-badge">${esc(post.category)}</span><span class="server-tag ${esc(post.server)}">${post.server==='taiwan'?'Тайвань':'Пиратка CN'}</span></div><h1>${esc(post.title)}</h1><p class="post-view-excerpt">${esc(post.excerpt)}</p><div class="post-view-author"><img src="${esc(post.avatar||NineYinAccount.defaultAvatar)}" alt="" draggable="false"><div><strong>${esc(post.author)}</strong><span>${date}</span></div></div></header><div class="post-view-content">${esc(post.content).replace(/\n/g,'<br>')}</div>${images?`<section class="post-gallery"><h2>Изображения к записи</h2><div class="post-gallery-grid">${images}</div></section>`:''}<section class="comments-section" id="commentsSection"><div class="comments-title-row"><h2>Комментарии <span id="commentsCount">0</span></h2></div><form class="comment-form" id="commentForm"><label class="comment-text-label"><span>Ваш комментарий</span><textarea id="commentText" maxlength="4000" placeholder="Напишите комментарий или выберите стикер..."></textarea></label><div class="comment-form-actions"><button class="comment-sticker-toggle" id="commentStickerToggle" type="button" aria-expanded="false">🙂 Стикеры</button><label class="comment-attach-button">📎 Прикрепить файлы<input id="commentFiles" type="file" multiple accept="image/png,image/jpeg,image/webp,image/gif,application/pdf,text/plain,application/zip,.zip"></label><span class="comment-file-hint">до 3 файлов, каждый до 12 МБ</span><button class="comment-submit" type="submit">Отправить</button></div><div class="sticker-picker" id="stickerPicker" hidden><div class="sticker-picker-head"><div class="sticker-tabs" role="tablist"><button type="button" class="active" data-sticker-tab="male" role="tab">Мужские</button><button type="button" data-sticker-tab="female" role="tab">Женские</button></div><button class="sticker-picker-close" id="stickerPickerClose" type="button" aria-label="Закрыть">×</button></div><div class="sticker-grid" id="stickerGrid"></div></div><div class="selected-sticker" id="selectedSticker" hidden><span>Выбран стикер</span><img id="selectedStickerImg" alt="" draggable="false"><strong id="selectedStickerName"></strong><button id="clearSticker" type="button">Убрать</button></div><div class="comment-selected-files" id="commentSelectedFiles"></div><p class="comment-status" id="commentStatus"></p></form><div class="comments-list" id="commentsList"><div class="comments-empty">Загрузка комментариев...</div></div></section>`;
  }catch(err){root.innerHTML=`<div class="forum-empty"><h2>Не удалось открыть запись</h2><p>${esc(err.message)}</p></div>`;return;}

  const form=document.getElementById('commentForm');
  const text=document.getElementById('commentText');
  const files=document.getElementById('commentFiles');
  const selected=document.getElementById('commentSelectedFiles');
  const status=document.getElementById('commentStatus');
  const list=document.getElementById('commentsList');
  const count=document.getElementById('commentsCount');
  const picker=document.getElementById('stickerPicker');
  const stickerToggle=document.getElementById('commentStickerToggle');
  const stickerGrid=document.getElementById('stickerGrid');
  const selectedSticker=document.getElementById('selectedSticker');
  const selectedStickerImg=document.getElementById('selectedStickerImg');
  const selectedStickerName=document.getElementById('selectedStickerName');
  let activeStickerTab='male';
  let selectedStickerKey='';

  function renderStickerGrid(){
    stickerGrid.innerHTML=stickers[activeStickerTab].map(([key,name,src])=>`<button type="button" class="sticker-option${selectedStickerKey===key?' selected':''}" data-sticker-key="${key}" title="${esc(name)}"><img src="${src}" alt="${esc(name)}" draggable="false"><span>${esc(name)}</span></button>`).join('');
    stickerGrid.querySelectorAll('[data-sticker-key]').forEach(btn=>btn.addEventListener('click',()=>selectSticker(btn.dataset.stickerKey)));
  }
  function selectSticker(key){
    const item=stickerByKey[key]; if(!item)return;
    selectedStickerKey=key;
    selectedStickerImg.src=item[2];
    selectedStickerImg.alt=item[1];
    selectedStickerName.textContent=item[1];
    selectedSticker.hidden=false;
    stickerToggle.classList.add('has-selection');
    stickerToggle.textContent='🙂 Стикер выбран';
    picker.hidden=true; stickerToggle.setAttribute('aria-expanded','false');
    renderStickerGrid();
  }
  function clearSticker(){
    selectedStickerKey=''; selectedSticker.hidden=true;
    selectedStickerImg.removeAttribute('src'); selectedStickerName.textContent='';
    stickerToggle.classList.remove('has-selection'); stickerToggle.textContent='🙂 Стикеры';
    renderStickerGrid();
  }
  document.querySelectorAll('[data-sticker-tab]').forEach(btn=>btn.addEventListener('click',()=>{
    activeStickerTab=btn.dataset.stickerTab;
    document.querySelectorAll('[data-sticker-tab]').forEach(x=>x.classList.toggle('active',x===btn));
    renderStickerGrid();
  }));
  stickerToggle.addEventListener('click',()=>{picker.hidden=!picker.hidden;stickerToggle.setAttribute('aria-expanded',String(!picker.hidden));if(!picker.hidden)renderStickerGrid();});
  document.getElementById('stickerPickerClose').addEventListener('click',()=>{picker.hidden=true;stickerToggle.setAttribute('aria-expanded','false');});
  document.getElementById('clearSticker').addEventListener('click',clearSticker);
  renderStickerGrid();

  function fileMarkup(a){
    if(!a.url)return '';
    if(String(a.mime_type||'').startsWith('image/')) return `<figure class="comment-image-frame"><img src="${esc(a.url)}" alt="${esc(a.file_name)}" draggable="false"><figcaption>${esc(a.file_name)}</figcaption></figure>`;
    return `<a class="comment-file-link" href="${esc(a.url)}" target="_blank" rel="noopener">📎 <span>${esc(a.file_name)}</span><small>${bytes(a.file_size)}</small></a>`;
  }
  function stickerMarkup(key){
    const item=stickerByKey[key];
    if(!item)return '';
    return `<div class="comment-sticker-wrap"><img class="comment-sticker" src="${item[2]}" alt="Стикер: ${esc(item[1])}" title="${esc(item[1])}" draggable="false"></div>`;
  }
  async function drawComments(){
    try{
      const comments=await NineYinAccount.listComments(id);
      count.textContent=comments.length;
      if(!comments.length){list.innerHTML='<div class="comments-empty">Комментариев пока нет. Будьте первым.</div>';return;}
      const canAdmin=NineYinAccount.isAdmin();
      list.innerHTML=comments.map(c=>{
        const d=new Date(c.created_at).toLocaleString('ru-RU',{day:'numeric',month:'long',year:'numeric',hour:'2-digit',minute:'2-digit'});
        const canDelete=canAdmin||String(c.author_id)===String(current.user?.id);
        const attachments=(c.attachments||[]).map(fileMarkup).join('');
        const body=String(c.content||'').trim()?`<div class="comment-body">${esc(c.content).replace(/\n/g,'<br>')}</div>`:'';
        const sticker=stickerMarkup(c.sticker_key);
        return `<article class="comment-card" data-comment-id="${c.id}"><header class="comment-head"><div class="comment-author"><img src="${esc(c.avatar||NineYinAccount.defaultAvatar)}" alt="" draggable="false"><div><strong>${esc(c.author)}</strong><span>${d}</span></div></div>${canDelete?'<button class="comment-delete" type="button">Удалить</button>':''}</header>${body}${sticker}${attachments?`<div class="comment-attachments">${attachments}</div>`:''}</article>`;
      }).join('');
      list.querySelectorAll('.comment-delete').forEach(btn=>btn.addEventListener('click',async()=>{
        const card=btn.closest('.comment-card');
        if(!confirm('Удалить комментарий?'))return;
        btn.disabled=true;
        try{await NineYinAccount.deleteComment(card.dataset.commentId);await drawComments();}catch(e){alert(e.message||'Не удалось удалить комментарий.');btn.disabled=false;}
      }));
    }catch(e){list.innerHTML=`<div class="comments-empty error">Ошибка загрузки комментариев: ${esc(e.message)}</div>`;}
  }
  files.addEventListener('change',()=>{
    const chosen=[...(files.files||[])];
    if(chosen.length>3){status.textContent='Можно прикрепить не более 3 файлов.';status.className='comment-status error';files.value='';selected.innerHTML='';return;}
    status.textContent='';status.className='comment-status';
    selected.innerHTML=chosen.map(f=>`<span>📎 ${esc(f.name)} <small>${bytes(f.size)}</small></span>`).join('');
  });
  form.addEventListener('submit',async e=>{
    e.preventDefault();
    const btn=e.submitter || form.querySelector('.comment-submit');
    const body=String(text.value||'').trim();
    if(!body && !selectedStickerKey){
      status.textContent='Напишите комментарий или выберите стикер.';
      status.className='comment-status error';
      return;
    }
    if(btn) btn.disabled=true;
    status.textContent=selectedStickerKey?'Отправляем комментарий со стикером...':'Отправляем комментарий...';
    status.className='comment-status';
    try{
      const sent=await NineYinAccount.createComment(id,body,files.files,selectedStickerKey);
      if(selectedStickerKey && !sent?.sticker_key) throw new Error('Стикер не сохранился. Обновите страницу и попробуйте ещё раз.');
      text.value='';files.value='';selected.innerHTML='';clearSticker();
      status.textContent='Комментарий добавлен.';status.className='comment-status success';
      await drawComments();
    }catch(err){
      console.error('Comment submit failed',err);
      status.textContent=err.message||'Не удалось добавить комментарий.';
      status.className='comment-status error';
    } finally {
      if(btn) btn.disabled=false;
    }
  });
  await drawComments();
})();
