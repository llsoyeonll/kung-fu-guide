(async()=>{
  await NineYinAccount.access;
  try{ if(NineYinAccount.refreshProfile) await NineYinAccount.refreshProfile(); }catch(e){ console.warn('Не удалось обновить роль пользователя',e); }
  const adminPanel=document.getElementById('adminCategoryPanel');
  const adminAccess=NineYinAccount.isAdmin();
  if(adminPanel) adminPanel.hidden=!adminAccess;
  const f=document.getElementById('createPostForm'),status=document.getElementById('createStatus'),images=document.getElementById('postImages'),previews=document.getElementById('postImagePreviews');
  const categorySelect=document.getElementById('postCategory');
  const categoryForm=document.getElementById('categoryForm');
  const categoryList=document.getElementById('categoryAdminList');
  const categoryStatus=document.getElementById('categoryStatus');
  const esc=s=>String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let categories=[];

  async function loadCategories(){
    categories=await NineYinAccount.listCategories();
    categorySelect.innerHTML=categories.length?'<option value="">Выберите категорию</option>'+categories.map(c=>`<option value="${esc(c.name)}">${esc(c.name)}</option>`).join(''):'<option value="">Категорий пока нет</option>';
    categorySelect.disabled=!categories.length;
    if(categoryList){categoryList.innerHTML=categories.length?categories.map(c=>`<div class="category-admin-row"><span>${esc(c.name)}</span><button type="button" data-delete-category="${esc(c.id)}">Удалить</button></div>`).join(''):'<div class="demo-hint">Категорий пока нет. Добавьте первую.</div>';}
  }

  try{await loadCategories()}catch(err){categorySelect.innerHTML='<option value="">Ошибка загрузки категорий</option>';status.textContent=err.message;status.className='wide form-status error'}

  if(categoryForm && adminAccess){
    categoryForm.addEventListener('submit',async e=>{
      e.preventDefault();const btn=e.submitter;btn.disabled=true;categoryStatus.textContent='Добавляем категорию...';categoryStatus.className='form-status';
      try{await NineYinAccount.addCategory(document.getElementById('categoryName').value);document.getElementById('categoryName').value='';await loadCategories();categoryStatus.textContent='Категория добавлена.'}
      catch(err){categoryStatus.textContent=err.message;categoryStatus.className='form-status error'}finally{btn.disabled=false}
    });
    categoryList.addEventListener('click',async e=>{
      const btn=e.target.closest('[data-delete-category]');if(!btn)return;
      btn.disabled=true;categoryStatus.textContent='Удаляем категорию...';
      try{await NineYinAccount.removeCategory(btn.dataset.deleteCategory);await loadCategories();categoryStatus.textContent='Категория удалена.'}
      catch(err){categoryStatus.textContent=err.message;categoryStatus.className='form-status error'}
    });
  }

  if(images){
    images.addEventListener('change',()=>{
      const files=[...(images.files||[])].slice(0,6);
      if(!files.length){previews.hidden=true;previews.innerHTML='';return;}
      previews.hidden=false;
      previews.innerHTML=files.map((file,i)=>`<div class="post-image-preview"><img src="${URL.createObjectURL(file)}" alt="Предпросмотр ${i+1}"><span>${esc(file.name)}</span></div>`).join('');
    });
  }

  f.addEventListener('submit',async e=>{
    e.preventDefault();const b=e.submitter;b.disabled=true;status.textContent='Публикуем запись...';status.className='wide form-status';
    try{
      const fd=new FormData(f);const files=[...(images.files||[])];if(files.length>6)throw new Error('Можно добавить не более 6 изображений.');const row=await NineYinAccount.createPost(Object.fromEntries(fd),files);
      if(NineYinAccount.isAdmin() && document.getElementById('pinOnCreate')?.checked) await NineYinAccount.setPostPinned(row.id,true);
      status.textContent='Запись опубликована. Возвращаемся на форум...';setTimeout(()=>location.href='index.html',700)
    }catch(err){status.textContent=err.message;status.className='wide form-status error'}finally{b.disabled=false}
  });
})();
