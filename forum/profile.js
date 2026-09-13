(async()=>{
  await NineYinAccount.access;
  const current=NineYinAccount.getCurrent(),f=document.getElementById('profileEditForm'),file=document.getElementById('editAvatar'),status=document.getElementById('profileStatus');
  const i18n=window.NineYinI18n;
  const t=s=>i18n?.t(s)||s;
  const labels={taiwan:'Тайвань',pirate:'Пиратка CN',america:'Америка',china:'Китай',malaysia:'Малайзия',both:'Тайвань и Пиратка CN'};
  const label=s=>t(labels[s]||s||'—');
  let croppedAvatarBlob=null, croppedAvatarUrl='';

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

  function ensureCropper(){
    let modal=document.getElementById('avatarCropModal');
    if(modal)return modal;
    modal=document.createElement('div');
    modal.id='avatarCropModal';
    modal.className='avatar-crop-modal';
    modal.hidden=true;
    modal.innerHTML=`<section class="avatar-crop-dialog" role="dialog" aria-modal="true" aria-labelledby="avatarCropTitle">
      <div class="avatar-crop-head"><div><span>${t('Фото профиля')}</span><h2 id="avatarCropTitle">${t('Выберите область изображения')}</h2><p>${t('Перемещайте фотографию внутри круглой рамки и настройте масштаб.')}</p></div><button type="button" class="avatar-crop-close" aria-label="${t('Отмена')}">×</button></div>
      <div class="avatar-crop-body">
        <div class="avatar-crop-stage" id="avatarCropStage"><img id="avatarCropImage" alt=""><div class="avatar-crop-window" aria-hidden="true"></div></div>
        <aside class="avatar-crop-tools"><div class="avatar-crop-live"><span>${t('Предпросмотр')}</span><img id="avatarCropPreview" alt=""></div><label>${t('Масштаб')}<input id="avatarCropZoom" type="range" min="1" max="3" step="0.01" value="1"></label><p>${t('В профиле будет отображаться только область внутри круглой рамки.')}</p></aside>
      </div>
      <div class="avatar-crop-actions"><button type="button" class="avatar-crop-cancel">${t('Отмена')}</button><button type="button" class="avatar-crop-apply">${t('Применить')}</button></div>
    </section>`;
    document.body.append(modal);
    return modal;
  }

  const crop={img:null,url:'',naturalW:0,naturalH:0,stageW:0,stageH:0,cropSize:0,cropLeft:0,cropTop:0,baseScale:1,zoom:1,x:0,y:0,drag:false,px:0,py:0};
  function cropEls(){const m=ensureCropper();return{m,stage:m.querySelector('#avatarCropStage'),img:m.querySelector('#avatarCropImage'),preview:m.querySelector('#avatarCropPreview'),zoom:m.querySelector('#avatarCropZoom')}}
  function clampCrop(){
    const scale=crop.baseScale*crop.zoom, rw=crop.naturalW*scale, rh=crop.naturalH*scale;
    const minX=crop.cropLeft+crop.cropSize-rw, maxX=crop.cropLeft;
    const minY=crop.cropTop+crop.cropSize-rh, maxY=crop.cropTop;
    crop.x=Math.min(maxX,Math.max(minX,crop.x)); crop.y=Math.min(maxY,Math.max(minY,crop.y));
  }
  function renderCrop(){
    const {img}=cropEls(),scale=crop.baseScale*crop.zoom;
    img.style.width=`${crop.naturalW*scale}px`;img.style.height=`${crop.naturalH*scale}px`;img.style.transform=`translate(${crop.x}px,${crop.y}px)`;
    img.style.transformOrigin='0 0';
  }
  function recalcCrop(reset=true){
    const {stage}=cropEls(),r=stage.getBoundingClientRect();
    crop.stageW=r.width;crop.stageH=r.height;crop.cropSize=Math.min(r.width,r.height)*.78;crop.cropLeft=(r.width-crop.cropSize)/2;crop.cropTop=(r.height-crop.cropSize)/2;
    stage.style.setProperty('--crop-size',`${crop.cropSize}px`);
    crop.baseScale=Math.max(crop.cropSize/crop.naturalW,crop.cropSize/crop.naturalH);
    if(reset){crop.zoom=1;const scale=crop.baseScale;crop.x=(crop.stageW-crop.naturalW*scale)/2;crop.y=(crop.stageH-crop.naturalH*scale)/2;cropEls().zoom.value='1'}
    clampCrop();renderCrop();
  }
  async function openCropper(selected){
    if(!selected)return;
    if(selected.size>8*1024*1024){status.textContent=t('Файл слишком большой. Максимум 8 МБ.');status.className='wide form-status error';file.value='';return}
    const {m,img,preview,zoom,stage}=cropEls();
    if(crop.url)URL.revokeObjectURL(crop.url);
    crop.url=URL.createObjectURL(selected);img.src=crop.url;preview.src=crop.url;m.hidden=false;document.documentElement.classList.add('avatar-crop-open');
    await new Promise((res,rej)=>{img.onload=res;img.onerror=rej});
    crop.naturalW=img.naturalWidth;crop.naturalH=img.naturalHeight;recalcCrop(true);
    requestAnimationFrame(()=>recalcCrop(true));

    const move=e=>{if(!crop.drag)return;e.preventDefault();const dx=e.clientX-crop.px,dy=e.clientY-crop.py;crop.px=e.clientX;crop.py=e.clientY;crop.x+=dx;crop.y+=dy;clampCrop();renderCrop()};
    const up=e=>{crop.drag=false;stage.classList.remove('dragging');try{stage.releasePointerCapture(e.pointerId)}catch{}};
    stage.onpointerdown=e=>{crop.drag=true;crop.px=e.clientX;crop.py=e.clientY;stage.classList.add('dragging');stage.setPointerCapture(e.pointerId)};
    stage.onpointermove=move;stage.onpointerup=up;stage.onpointercancel=up;
    zoom.oninput=()=>{const oldScale=crop.baseScale*crop.zoom,cx=(crop.cropLeft+crop.cropSize/2-crop.x)/oldScale,cy=(crop.cropTop+crop.cropSize/2-crop.y)/oldScale;crop.zoom=Number(zoom.value);const newScale=crop.baseScale*crop.zoom;crop.x=crop.cropLeft+crop.cropSize/2-cx*newScale;crop.y=crop.cropTop+crop.cropSize/2-cy*newScale;clampCrop();renderCrop()};
  }
  function closeCropper(resetFile=false){const {m}=cropEls();m.hidden=true;document.documentElement.classList.remove('avatar-crop-open');if(resetFile)file.value=''}
  async function applyCrop(){
    const {img}=cropEls(),scale=crop.baseScale*crop.zoom;
    const sx=Math.max(0,(crop.cropLeft-crop.x)/scale),sy=Math.max(0,(crop.cropTop-crop.y)/scale),sw=Math.min(crop.naturalW-sx,crop.cropSize/scale),sh=Math.min(crop.naturalH-sy,crop.cropSize/scale);
    const canvas=document.createElement('canvas');canvas.width=768;canvas.height=768;const ctx=canvas.getContext('2d',{alpha:false});ctx.fillStyle='#06131f';ctx.fillRect(0,0,768,768);ctx.drawImage(img,sx,sy,sw,sh,0,0,768,768);
    const blob=await new Promise((res,rej)=>canvas.toBlob(b=>b?res(b):rej(new Error(t('Не удалось обработать изображение'))),'image/webp',.9));
    croppedAvatarBlob=blob;if(croppedAvatarUrl)URL.revokeObjectURL(croppedAvatarUrl);croppedAvatarUrl=URL.createObjectURL(blob);document.getElementById('editAvatarPreview').src=croppedAvatarUrl;closeCropper(false);status.textContent=t('Область фото выбрана. Нажмите «Сохранить изменения».');status.className='wide form-status';
  }

  paint(current.profile);
  const modal=ensureCropper();
  file.addEventListener('change',e=>{const x=e.target.files?.[0];if(x)openCropper(x).catch(err=>{status.textContent=err.message||t('Не удалось открыть изображение.');status.className='wide form-status error';file.value=''})});
  modal.querySelector('.avatar-crop-close').addEventListener('click',()=>closeCropper(true));
  modal.querySelector('.avatar-crop-cancel').addEventListener('click',()=>closeCropper(true));
  modal.querySelector('.avatar-crop-apply').addEventListener('click',()=>applyCrop().catch(err=>{status.textContent=err.message;status.className='wide form-status error'}));
  modal.addEventListener('click',e=>{if(e.target===modal)closeCropper(true)});
  window.addEventListener('keydown',e=>{if(e.key==='Escape'&&!modal.hidden)closeCropper(true)});
  window.addEventListener('resize',()=>{if(!modal.hidden&&crop.naturalW)recalcCrop(false)});

  f.addEventListener('submit',async e=>{e.preventDefault();const b=e.submitter;b.disabled=true;status.textContent=t('Сохраняем...');status.className='wide form-status';try{const fd=new FormData(f);const p=await NineYinAccount.saveOwnProfile(Object.fromEntries(fd),croppedAvatarBlob||file.files?.[0]);paint(p);croppedAvatarBlob=null;file.value='';status.textContent=t('Изменения сохранены.')}catch(err){status.textContent=err.message;status.className='wide form-status error'}finally{b.disabled=false}});
})();
