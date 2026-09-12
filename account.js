
(() => {
  'use strict';
  const cfg = window.NINEYIN_CONFIG || {};
  const PLACEHOLDER = !cfg.url || !cfg.anonKey || /PASTE_|YOUR_/i.test(String(cfg.url)+String(cfg.anonKey));
  const demo = cfg.demoMode === true || PLACEHOLDER || !window.supabase;
  const defaultAvatar = cfg.defaultAvatar || 'default-profile.webp';
  const brandIcon = cfg.brandIcon || defaultAvatar;
  const storePrefix = cfg.storagePrefix || 'nineyin-community';
  const keys = {users:`${storePrefix}:demo-users`, session:`${storePrefix}:demo-session`, posts:`${storePrefix}:demo-posts`, categories:`${storePrefix}:demo-categories`};
  const defaultCategories=['Новости','Гайды','Русификатор','Технические проблемы','Обсуждения'];
  let client = null, user = null, profile = null, accessResolved = false;
  let resolveReady, resolveAccess;
  const ready = new Promise(r => resolveReady=r);
  const access = new Promise(r => resolveAccess=r);
  const byId = id => document.getElementById(id);
  const safe = v => String(v ?? '').replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const signedCachePrefix=`${storePrefix}:signed:`;
  const profileCachePrefix=`${storePrefix}:profile:`;
  const readSessionJson=(key)=>{try{return JSON.parse(sessionStorage.getItem(key)||'null')}catch{return null}};
  const writeSessionJson=(key,value)=>{try{sessionStorage.setItem(key,JSON.stringify(value))}catch{}};
  const clearSessionPrefix=(prefix)=>{try{for(let i=sessionStorage.length-1;i>=0;i--){const k=sessionStorage.key(i);if(k&&k.startsWith(prefix))sessionStorage.removeItem(k)}}catch{}};
  const demoRead = (key, fallback) => { try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)); } catch { return fallback; } };
  const demoWrite = (key, value) => localStorage.setItem(key, JSON.stringify(value));
  const randomId = () => crypto.randomUUID ? crypto.randomUUID() : `demo-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  async function hash(text){ const buf=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text)); return [...new Uint8Array(buf)].map(x=>x.toString(16).padStart(2,'0')).join(''); }
  function getEmailRedirectTo(){
    return location.hostname.endsWith('github.io')
      ? `${location.origin}/${location.pathname.split('/').filter(Boolean)[0]}/`
      : `${location.origin}/`;
  }
  function normalizeEmail(value){ return String(value||'').trim().toLowerCase(); }
  function validateRegistrationEmail(email){
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(email)) throw new Error('Введите корректный email.');
    const [local,domain='']=email.split('@');
    if(!local || local.startsWith('.') || local.endsWith('.') || local.includes('..')) throw new Error('Проверьте адрес email — в имени ящика есть ошибка.');
    const typoDomains={
      'gamil.com':'gmail.com','gmial.com':'gmail.com','gmai.com':'gmail.com','gmail.con':'gmail.com','gmail.cm':'gmail.com',
      'yadnex.ru':'yandex.ru','yndex.ru':'yandex.ru','yandex.r':'yandex.ru','yanex.ru':'yandex.ru',
      'mail.r':'mail.ru','mai.ru':'mail.ru','mail.ry':'mail.ru','bk.r':'bk.ru','inbox.r':'inbox.ru'
    };
    if(typoDomains[domain]) throw new Error(`Проверьте домен почты. Возможно, вы имели в виду ${typoDomains[domain]}.`);
    return email;
  }
  function emailConfirmed(authUser){ return Boolean(authUser?.email_confirmed_at || authUser?.confirmed_at); }
  function authErrorMessage(err){
    const msg=String(err?.message||err||'');
    if(/email not confirmed/i.test(msg)) return 'Email не подтверждён. Откройте письмо подтверждения и перейдите по ссылке, затем войдите снова.';
    if(/invalid login credentials/i.test(msg)) return 'Неверный email или пароль.';
    if(/rate limit|too many requests|email rate limit/i.test(msg)) return 'Слишком много попыток. Подождите немного и повторите.';
    return msg || 'Ошибка авторизации.';
  }

  function injectUI(){
    if(byId('nineyinAccountRoot')) return;
    const root=document.createElement('div'); root.id='nineyinAccountRoot';
    root.innerHTML=`<div class="nya-overlay" id="nyaOverlay" hidden>
      <section class="nya-panel" role="dialog" aria-modal="true" aria-labelledby="nyaTitle">
        <div class="nya-head"><img class="nya-emblem" src="${safe(brandIcon)}" alt=""><small>СООБЩЕСТВО 9 ИНЬ</small><h2 id="nyaTitle">Доступ к сайту</h2><p id="nyaSubtitle">Войдите в общий аккаунт Руководства и Форума.</p></div>
        <div class="nya-tabs" id="nyaTabs"><button type="button" data-nya-tab="login" class="active">Войти</button><button type="button" data-nya-tab="register">Регистрация</button></div>
        <div class="nya-body">
          <div class="nya-view" data-nya-view="login"><form class="nya-form" id="nyaLoginForm"><label class="nya-field"><span>Email</span><input name="email" type="email" required autocomplete="email"></label><label class="nya-field"><span>Пароль</span><input name="password" type="password" required minlength="8" autocomplete="current-password"></label><p class="nya-message" id="nyaLoginMessage"></p><button class="nya-primary" type="submit">Войти</button><button class="nya-secondary" id="nyaResendConfirmation" type="button">Повторно отправить письмо подтверждения</button></form></div>
          <div class="nya-view" data-nya-view="register" hidden><form class="nya-form" id="nyaRegisterForm"><label class="nya-field"><span>Email</span><input name="email" type="email" required autocomplete="email"></label><label class="nya-field"><span>Повторите Email</span><input name="email2" type="email" required autocomplete="email"></label><label class="nya-field"><span>Пароль</span><input name="password" type="password" required minlength="8" autocomplete="new-password"></label><label class="nya-field"><span>Повторите пароль</span><input name="password2" type="password" required minlength="8" autocomplete="new-password"></label><div class="nya-notice"><strong>Проверка почты обязательна.</strong> После регистрации мы отправим письмо со ссылкой подтверждения. Пока пользователь не перейдёт по ссылке, вход и создание профиля будут заблокированы. На Форуме в разделе «Пользователи» будут видны только фото профиля и игровой ник. Email остаётся скрытым.</div><p class="nya-message" id="nyaRegisterMessage"></p><button class="nya-primary" type="submit">Создать аккаунт</button></form></div>
          <div class="nya-view" data-nya-view="profile" hidden><form class="nya-form" id="nyaProfileForm"><div class="nya-avatar-row"><img class="nya-avatar" id="nyaAvatarPreview" src="${safe(defaultAvatar)}" alt="Фото профиля"><div class="nya-avatar-actions"><span class="nya-label">Фото профиля</span><input id="nyaAvatarFile" type="file" accept="image/png,image/jpeg,image/webp"><small>Можно пропустить — тогда останется стандартное изображение «Нет фото профиля».</small></div></div><label class="nya-field"><span>Имя на сайте</span><input name="display_name" maxlength="40" required placeholder="Например: Soyeon"></label><label class="nya-field"><span>Игровой никнейм</span><input name="game_nickname" maxlength="60" required placeholder="Ваш ник в игре"></label><label class="nya-field"><span>Сервер</span><select name="server" required><option value="">Выберите сервер</option><option value="taiwan">Тайвань</option><option value="pirate">Пиратка</option><option value="both">Тайвань и Пиратка</option></select></label><label class="nya-field"><span>О себе</span><textarea name="about" maxlength="1000" required placeholder="Расскажите немного о себе и своём опыте в игре"></textarea></label><p class="nya-message" id="nyaProfileMessage"></p><button class="nya-primary" type="submit">Сохранить профиль и открыть сайт</button></form></div>
        </div>
      </section></div>`;
    document.body.append(root);
    root.querySelectorAll('[data-nya-tab]').forEach(b=>b.addEventListener('click',()=>showView(b.dataset.nyaTab)));
    byId('nyaLoginForm').addEventListener('submit',onLogin);
    byId('nyaRegisterForm').addEventListener('submit',onRegister);
    byId('nyaResendConfirmation').addEventListener('click',onResendConfirmation);
    byId('nyaProfileForm').addEventListener('submit',onProfileSave);
    byId('nyaAvatarFile').addEventListener('change',async e=>{const f=e.target.files?.[0]; if(!f) return; const blob=await prepareImage(f,768,.86); byId('nyaAvatarPreview').src=URL.createObjectURL(blob)});
    document.querySelectorAll('[data-nineyin-login]').forEach(el=>el.addEventListener('click',e=>{e.preventDefault();openAuth('login')}));
    document.querySelectorAll('[data-nineyin-register]').forEach(el=>el.addEventListener('click',e=>{e.preventDefault();openAuth('register')}));
    document.querySelectorAll('[data-nineyin-logout]').forEach(el=>el.addEventListener('click',async e=>{e.preventDefault();await logout()}));
  }
  function showView(name){
    document.querySelectorAll('[data-nya-view]').forEach(v=>v.hidden=v.dataset.nyaView!==name);
    document.querySelectorAll('[data-nya-tab]').forEach(b=>b.classList.toggle('active',b.dataset.nyaTab===name));
    byId('nyaTabs').hidden = name==='profile';
    byId('nyaTitle').textContent = name==='profile' ? 'Создайте профиль' : 'Доступ к сайту';
    byId('nyaSubtitle').textContent = name==='profile' ? 'Заполните обязательные данные. Фото можно оставить стандартным.' : 'Войдите в общий аккаунт Руководства и Форума.';
  }
  function openAuth(tab='login'){ byId('nyaOverlay').hidden=false; document.documentElement.classList.add('nineyin-account-pending'); document.body.classList.remove('nineyin-access-granted'); showView(tab); }
  function closeGate(){ byId('nyaOverlay').hidden=true; document.documentElement.classList.remove('nineyin-account-pending'); document.documentElement.classList.add('nineyin-access-granted'); document.body.classList.add('nineyin-access-granted','nineyin-authenticated'); updateAccountUI(); if(!accessResolved){accessResolved=true;resolveAccess({user,profile,demo});} window.dispatchEvent(new CustomEvent('nineyin:access-granted',{detail:{user,profile,demo}})); }
  function updateAccountUI(){
    const name=profile?.display_name || user?.email?.split('@')[0] || 'Профиль';
    const avatar=profile?.avatar_url || defaultAvatar;
    document.querySelectorAll('[data-nineyin-user-name]').forEach(e=>e.textContent=name);
    document.querySelectorAll('[data-nineyin-user-avatar]').forEach(e=>e.src=avatar);
    document.querySelectorAll('.nineyin-auth-only').forEach(e=>e.hidden=false);
    document.querySelectorAll('.nineyin-admin-only').forEach(e=>e.hidden=!isAdmin());
    document.body.classList.toggle('nineyin-is-admin',isAdmin());
  }
  function message(id,text,type=''){const el=byId(id); if(!el)return; el.textContent=text; el.className=`nya-message ${type}`.trim()}
  async function prepareImage(file,max=1200,quality=.84){
    if(file.size>8*1024*1024) throw new Error('Файл слишком большой. Максимум 8 МБ.');
    const img=await createImageBitmap(file); const scale=Math.min(1,max/Math.max(img.width,img.height)); const w=Math.max(1,Math.round(img.width*scale)),h=Math.max(1,Math.round(img.height*scale)); const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;canvas.getContext('2d').drawImage(img,0,0,w,h); return await new Promise((res,rej)=>canvas.toBlob(b=>b?res(b):rej(new Error('Не удалось обработать изображение')),'image/webp',quality));
  }
  async function signedFile(bucket,path,expires=3600){
    if(!path) return null;
    if(/^data:|^blob:|^https?:/i.test(String(path))) return path;
    const cacheKey=`${signedCachePrefix}${bucket}:${path}`;
    const cached=readSessionJson(cacheKey);
    if(cached?.url && cached.expiresAt>Date.now()+30000) return cached.url;
    const {data,error}=await client.storage.from(bucket).createSignedUrl(path,expires);
    if(error){ console.warn(`Signed URL failed for ${bucket}/${path}`,error); return null; }
    const url=data?.signedUrl || null;
    if(url) writeSessionJson(cacheKey,{url,expiresAt:Date.now()+Math.min(expires*800,45*60*1000)});
    return url;
  }
  async function hydrateProfile(row){
    if(!row) return row;
    const avatar_url=row.avatar_path ? (await signedFile('avatars',row.avatar_path,3600) || defaultAvatar) : defaultAvatar;
    return {...row,avatar_url};
  }
  async function loadProfile(){
    if(!user){profile=null;return null}
    if(demo){const users=demoRead(keys.users,{}); profile=users[user.email]?.profile || null; return profile}
    const {data,error}=await client.from('profiles').select('*').eq('id',user.id).maybeSingle(); if(error) throw error; profile=await hydrateProfile(data); if(profile) writeSessionJson(`${profileCachePrefix}${user.id}`,profile); return profile;
  }
  async function refreshProfile(){
    await loadProfile();
    updateAccountUI();
    return profile;
  }
  async function onLogin(e){
    e.preventDefault(); const btn=e.submitter; btn.disabled=true; message('nyaLoginMessage','Выполняется вход...');
    try{
      const fd=new FormData(e.currentTarget), email=normalizeEmail(fd.get('email')), password=String(fd.get('password'));
      validateRegistrationEmail(email);
      if(demo){const users=demoRead(keys.users,{}), rec=users[email]; if(!rec || rec.password_hash!==await hash(password)) throw new Error('Неверный email или пароль.'); localStorage.setItem(keys.session,email); user={id:rec.id,email,created_at:rec.created_at};}
      else {
        const {data,error}=await client.auth.signInWithPassword({email,password});
        if(error) throw error;
        if(!emailConfirmed(data.user)){
          await client.auth.signOut().catch(()=>{});
          user=null; profile=null;
          throw new Error('Email не подтверждён. Откройте письмо подтверждения и перейдите по ссылке, затем войдите снова.');
        }
        user=data.user;
      }
      await loadProfile(); if(!profile?.profile_completed) {fillProfileForm(); showView('profile');} else closeGate();
    }catch(err){message('nyaLoginMessage',authErrorMessage(err),'error')}finally{btn.disabled=false}
  }
  async function onRegister(e){
    e.preventDefault(); const btn=e.submitter; btn.disabled=true; message('nyaRegisterMessage','Проверяем данные и создаём аккаунт...');
    try{
      const fd=new FormData(e.currentTarget), email=validateRegistrationEmail(normalizeEmail(fd.get('email'))), email2=normalizeEmail(fd.get('email2')), p=String(fd.get('password')),p2=String(fd.get('password2'));
      if(email!==email2) throw new Error('Email и повторный Email не совпадают. Проверьте адрес.');
      if(p!==p2) throw new Error('Пароли не совпадают.'); if(p.length<8) throw new Error('Минимум 8 символов.');
      if(demo){const users=demoRead(keys.users,{}); if(users[email]) throw new Error('Такой email уже зарегистрирован.'); const rec={id:randomId(),email,password_hash:await hash(p),created_at:new Date().toISOString(),role:Object.keys(users).length===0?'admin':'user',profile:null}; users[email]=rec;demoWrite(keys.users,users);localStorage.setItem(keys.session,email);user={id:rec.id,email,created_at:rec.created_at};profile=null;fillProfileForm();showView('profile');}
      else {
        const {data,error}=await client.auth.signUp({email,password:p,options:{emailRedirectTo:getEmailRedirectTo()}});
        if(error) throw error;
        const loginForm=byId('nyaLoginForm'); if(loginForm?.elements?.email) loginForm.elements.email.value=email;
        if(!data.session || !emailConfirmed(data.user)){
          if(data.session) await client.auth.signOut().catch(()=>{});
          user=null; profile=null;
          showView('login');
          message('nyaLoginMessage','Письмо подтверждения отправлено. Аккаунт пока не активирован: откройте письмо и перейдите по ссылке. Если адрес введён неверно или такого ящика не существует, доступ к сайту получить не получится.','success');
          return;
        }
        user=data.user;await loadProfile();fillProfileForm();showView('profile');
      }
    }catch(err){message('nyaRegisterMessage',authErrorMessage(err),'error')}finally{btn.disabled=false}
  }
  async function onResendConfirmation(){
    const btn=byId('nyaResendConfirmation'); if(!btn || demo) return;
    btn.disabled=true; message('nyaLoginMessage','Отправляем письмо подтверждения...');
    try{
      const form=byId('nyaLoginForm'); const email=validateRegistrationEmail(normalizeEmail(form?.elements?.email?.value));
      const {error}=await client.auth.resend({type:'signup',email,options:{emailRedirectTo:getEmailRedirectTo()}});
      if(error) throw error;
      message('nyaLoginMessage','Если этот адрес зарегистрирован и ещё не подтверждён, письмо отправлено. Проверьте также папку «Спам».','success');
    }catch(err){message('nyaLoginMessage',authErrorMessage(err),'error')}finally{btn.disabled=false}
  }
  function fillProfileForm(){
    const f=byId('nyaProfileForm'); if(!f)return; f.elements.display_name.value=profile?.display_name||'';f.elements.game_nickname.value=profile?.game_nickname||'';f.elements.server.value=profile?.server||'';f.elements.about.value=profile?.about||'';byId('nyaAvatarPreview').src=profile?.avatar_url||defaultAvatar;
  }
  async function uploadFile(bucket,blob,path){
    const {error}=await client.storage.from(bucket).upload(path,blob,{contentType:'image/webp',upsert:true,cacheControl:'3600'});
    if(error) throw error;
    return path;
  }
  async function onProfileSave(e){
    e.preventDefault(); const btn=e.submitter;btn.disabled=true;message('nyaProfileMessage','Сохраняем профиль...');
    try{
      const fd=new FormData(e.currentTarget); const data={display_name:String(fd.get('display_name')).trim(),game_nickname:String(fd.get('game_nickname')).trim(),server:String(fd.get('server')),about:String(fd.get('about')).trim()}; if(!data.display_name||!data.game_nickname||!data.server||!data.about) throw new Error('Заполните все обязательные поля.');
      const file=byId('nyaAvatarFile').files?.[0]; let avatarPath=profile?.avatar_path||null; if(file){const blob=await prepareImage(file,768,.86); if(demo){avatarPath=await blobToDataUrl(blob)} else avatarPath=await uploadFile('avatars',blob,`${user.id}/avatar.webp`)}
      if(demo){const users=demoRead(keys.users,{}), rec=users[user.email]; rec.profile={id:user.id,...data,role:rec.role||rec.profile?.role||'user',avatar_url:avatarPath,profile_completed:true,created_at:rec.created_at,updated_at:new Date().toISOString()}; users[user.email]=rec;demoWrite(keys.users,users);profile=rec.profile;}
      else {const payload={id:user.id,...data,avatar_path:avatarPath,profile_completed:true,updated_at:new Date().toISOString()}; const {data:row,error}=await client.from('profiles').upsert(payload,{onConflict:'id'}).select().single(); if(error) throw error; profile=await hydrateProfile(row);}
      message('nyaProfileMessage','Профиль сохранён.','success');closeGate();
    }catch(err){message('nyaProfileMessage',err.message||'Не удалось сохранить профиль.','error')}finally{btn.disabled=false}
  }
  function blobToDataUrl(blob){return new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(r.result);r.onerror=rej;r.readAsDataURL(blob)})}
  async function logout(){ if(demo)localStorage.removeItem(keys.session);else await client.auth.signOut();clearSessionPrefix(profileCachePrefix);clearSessionPrefix(signedCachePrefix);user=null;profile=null;document.body.classList.remove('nineyin-authenticated','nineyin-access-granted');document.documentElement.classList.remove('nineyin-access-granted');openAuth('login');window.dispatchEvent(new Event('nineyin:logout')); }
  async function listProfiles(){
    if(demo){const users=demoRead(keys.users,{});return Object.values(users).map(x=>x.profile).filter(x=>x?.profile_completed).sort((a,b)=>String(b.created_at).localeCompare(String(a.created_at)))}
    const {data,error}=await client.from('profiles').select('id,game_nickname,avatar_path,created_at').eq('profile_completed',true).order('created_at',{ascending:false});if(error)throw error;return await Promise.all((data||[]).map(hydrateProfile));
  }
  async function saveOwnProfile(values,file){
    let avatarPath=profile?.avatar_path||null;if(file){const blob=await prepareImage(file,768,.86);avatarPath=demo?await blobToDataUrl(blob):await uploadFile('avatars',blob,`${user.id}/avatar.webp`)}
    const data={display_name:String(values.display_name||'').trim(),game_nickname:String(values.game_nickname||'').trim(),server:String(values.server||''),about:String(values.about||'').trim(),profile_completed:true,updated_at:new Date().toISOString()};
    if(demo){const users=demoRead(keys.users,{}),rec=users[user.email];rec.profile={...rec.profile,id:user.id,role:rec.role||rec.profile?.role||'user',created_at:rec.created_at,...data,avatar_url:avatarPath};users[user.email]=rec;demoWrite(keys.users,users);profile=rec.profile;updateAccountUI();return profile}
    const payload={...data,avatar_path:avatarPath};
    const {data:row,error}=await client.from('profiles').update(payload).eq('id',user.id).select().single();if(error)throw error;profile=await hydrateProfile(row);updateAccountUI();return profile;
  }
  async function createPost(values,files=[]){
    files=[...(files||[])].slice(0,6);
    const row={author_id:user.id,server:values.server,category:values.category,title:values.title,excerpt:values.excerpt,content:values.content,preview_image_path:null,created_at:new Date().toISOString(),status:'published',pinned:false,pinned_at:null};
    if(demo){
      row.id=Date.now();
      row.content_images=[];
      for(const file of files){const blob=await prepareImage(file,1800,.84);row.content_images.push(await blobToDataUrl(blob));}
      const posts=demoRead(keys.posts,[]);posts.unshift(row);demoWrite(keys.posts,posts);return row;
    }
    const {data,error}=await client.from('posts').insert(row).select().single();if(error)throw error;
    if(files.length){
      const imageRows=[];
      for(let i=0;i<files.length;i++){
        const blob=await prepareImage(files[i],1800,.84);
        const image_path=await uploadFile('post-images',blob,`${user.id}/${data.id}-${Date.now()}-${i+1}.webp`);
        imageRows.push({post_id:data.id,author_id:user.id,image_path,sort_order:i+1});
      }
      const {error:imageError}=await client.from('post_images').insert(imageRows);if(imageError)throw imageError;
    }
    return data;
  }
  async function getPost(id){
    if(demo){
      const post=demoRead(keys.posts,[]).find(p=>String(p.id)===String(id));if(!post)return null;
      const users=demoRead(keys.users,{});const rec=Object.values(users).find(x=>x?.profile?.id===post.author_id);const p=rec?.profile;
      return {...post,author:p?.display_name||p?.game_nickname||'Пользователь',avatar:p?.avatar_url||defaultAvatar,content_images:post.content_images||[]};
    }
    const {data:post,error}=await client.from('posts').select('*').eq('id',id).maybeSingle();if(error)throw error;if(!post)return null;
    const [{data:author},{data:images,error:imageError}]=await Promise.all([
      client.from('profiles').select('display_name,game_nickname,avatar_path').eq('id',post.author_id).maybeSingle(),
      client.from('post_images').select('image_path,sort_order').eq('post_id',post.id).order('sort_order',{ascending:true})
    ]);if(imageError)throw imageError;
    const hydratedAuthor=await hydrateProfile(author);
    const content_images=await Promise.all((images||[]).map(x=>signedFile('post-images',x.image_path,3600)));
    return {...post,author:author?.display_name||author?.game_nickname||'Пользователь',game_nickname:author?.game_nickname||'',avatar:hydratedAuthor?.avatar_url||defaultAvatar,content_images:content_images.filter(Boolean)};
  }
  async function listPosts(){
    if(demo) return demoRead(keys.posts,[]);
    const {data:posts,error}=await client.from('posts').select('*').eq('status','published').order('pinned',{ascending:false}).order('pinned_at',{ascending:false,nullsFirst:false}).order('created_at',{ascending:false});if(error)throw error;if(!posts?.length)return [];
    const ids=[...new Set(posts.map(p=>p.author_id).filter(Boolean))];let pmap={};if(ids.length){const {data:profiles,error:pe}=await client.from('profiles').select('id,display_name,avatar_path').in('id',ids);if(pe)throw pe;const hydrated=await Promise.all((profiles||[]).map(hydrateProfile));pmap=Object.fromEntries(hydrated.map(p=>[p.id,p]));}
    const {data:comments}=await client.from('comments').select('post_id').in('post_id',posts.map(p=>p.id));const counts={};(comments||[]).forEach(c=>counts[c.post_id]=(counts[c.post_id]||0)+1);
    return posts.map(p=>({...p,author:pmap[p.author_id]?.display_name||'Пользователь',avatar:pmap[p.author_id]?.avatar_url||defaultAvatar,comments_count:counts[p.id]||0}));
  }
  async function getPrivateItemCodes(itemKeys=[]){
    if(!isAdmin()) return {};
    const keys=[...new Set((itemKeys||[]).map(v=>String(v||'').trim()).filter(Boolean))];
    if(!keys.length) return {};
    // Codes are deliberately NOT included in the public demo bundle.
    // In production they are returned by Supabase only when RLS confirms role=admin.
    if(demo) return {};
    const {data,error}=await client.from('private_item_codes').select('item_key,item_code').in('item_key',keys);
    if(error) throw error;
    return Object.fromEntries((data||[]).map(row=>[row.item_key,row.item_code]));
  }
  function isAdmin(){return profile?.role==='admin'}
  async function listCategories(){
    if(demo){let rows=demoRead(keys.categories,null);if(!Array.isArray(rows)){rows=defaultCategories.map((name,i)=>({id:`default-${i+1}`,name,sort_order:i+1,active:true}));demoWrite(keys.categories,rows)}return rows.filter(x=>x.active!==false).sort((a,b)=>(a.sort_order||0)-(b.sort_order||0)||String(a.name).localeCompare(String(b.name),'ru'))}
    const {data,error}=await client.from('forum_categories').select('id,name,sort_order,active').eq('active',true).order('sort_order',{ascending:true}).order('name',{ascending:true});if(error)throw error;return data||[];
  }
  async function addCategory(name){
    if(!demo) await refreshProfile();
    if(!isAdmin())throw new Error('Добавлять категории может только администратор. Обновите страницу и войдите под админ-аккаунтом.');name=String(name||'').trim();if(name.length<2||name.length>50)throw new Error('Название категории: от 2 до 50 символов.');
    if(demo){const rows=await listCategories();if(rows.some(x=>x.name.toLowerCase()===name.toLowerCase()))throw new Error('Такая категория уже существует.');const row={id:randomId(),name,sort_order:rows.length+1,active:true};rows.push(row);demoWrite(keys.categories,rows);return row}
    const {data,error}=await client.from('forum_categories').insert({name,created_by:user.id}).select().single();if(error)throw error;return data;
  }
  async function removeCategory(id){
    if(!demo) await refreshProfile();
    if(!isAdmin())throw new Error('Удалять категории может только администратор.');
    if(demo){const rows=demoRead(keys.categories,[]).filter(x=>String(x.id)!==String(id));demoWrite(keys.categories,rows);return true}
    const {error}=await client.from('forum_categories').delete().eq('id',id);if(error)throw error;return true;
  }
  async function setPostPinned(id,pinned){
    if(!demo) await refreshProfile();
    if(!isAdmin())throw new Error('Закреплять записи может только администратор.');
    if(demo){const posts=demoRead(keys.posts,[]);const row=posts.find(p=>String(p.id)===String(id));if(!row)throw new Error('Запись не найдена.');row.pinned=Boolean(pinned);row.pinned_at=pinned?new Date().toISOString():null;demoWrite(keys.posts,posts);return row}
    const {error}=await client.from('posts').update({pinned:Boolean(pinned),pinned_at:pinned?new Date().toISOString():null}).eq('id',Number(id));if(error)throw error;return true;
  }
  function getCurrent(){return {user,profile,demo,defaultAvatar}}
  async function applySession(session){
    user=session?.user||null;
    if(user && !demo && !emailConfirmed(user)){
      await client.auth.signOut().catch(()=>{});
      user=null; profile=null;
      openAuth('login');
      message('nyaLoginMessage','Email не подтверждён. Перейдите по ссылке из письма, затем войдите снова.','error');
      return;
    }
    if(!user){
      profile=null;
      openAuth('login');
      return;
    }
    const cached=readSessionJson(`${profileCachePrefix}${user.id}`);
    if(cached?.id===user.id && cached?.profile_completed){
      profile=cached;
      closeGate();
      // Refresh silently so navigation is instant while role/profile changes still propagate.
      loadProfile().then(()=>updateAccountUI()).catch(err=>console.warn('Profile refresh failed:',err));
      return;
    }
    await loadProfile();
    if(profile?.profile_completed){
      closeGate();
    }else{
      fillProfileForm();
      openAuth('login');
      showView('profile');
    }
  }
  async function init(){
    injectUI();
    try{
      if(demo){
        const email=localStorage.getItem(keys.session);
        if(email){
          const users=demoRead(keys.users,{}),rec=users[email];
          if(rec) user={id:rec.id,email,created_at:rec.created_at};
        }
        if(user){
          await loadProfile();
          if(profile?.profile_completed) closeGate();
          else {fillProfileForm();openAuth('login');showView('profile');}
        }else openAuth('login');
      }else{
        client=window.supabase.createClient(cfg.url,cfg.anonKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
        const {data,error}=await client.auth.getSession();
        if(error) throw error;
        await applySession(data.session);
        client.auth.onAuthStateChange((event,session)=>{
          if(event==='INITIAL_SESSION') return;
          setTimeout(()=>applySession(session).catch(err=>console.error('Auth state sync failed:',err)),0);
        });
      }
    }catch(err){
      console.error(err);
      openAuth('login');
      message('nyaLoginMessage','Ошибка подключения к базе. Проверьте соединение и повторите вход.','error');
    }
    resolveReady({demo,user,profile});
  }
  window.NineYinAccount={ready,access,getCurrent,refreshProfile,listProfiles,saveOwnProfile,createPost,getPost,listPosts,listCategories,addCategory,removeCategory,setPostPinned,getPrivateItemCodes,isAdmin,logout,openAuth,defaultAvatar,isDemo:()=>demo};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
