const theme={Новости:'theme_news.webp',Гайды:'theme_guides.webp',Русификатор:'theme_rus.webp','Технические проблемы':'theme_tech.webp',Обсуждения:'theme_discuss.webp'};
function automaticCover(category,server){
  const c=String(category||'').toLowerCase();
  if(c.includes('новост'))return 'theme_news.webp';
  if(c.includes('гайд')||c.includes('руковод'))return 'theme_guides.webp';
  if(c.includes('русиф')||c.includes('перевод')||c.includes('патч'))return 'theme_rus.webp';
  if(c.includes('тех')||c.includes('ошиб')||c.includes('проблем'))return 'theme_tech.webp';
  if(c.includes('обсуж')||c.includes('скрин'))return 'theme_discuss.webp';
  return server==='taiwan'?'theme_taiwan.webp':server==='pirate'?'theme_pirate.webp':'theme_discuss.webp';
}
let allPosts=[],activeFilter='all',searchTerm='',page=1;const perPage=5;
const postsEl=document.getElementById('posts'),numbersEl=document.getElementById('pageNumbers'),searchInput=document.getElementById('searchInput'),prevBtn=document.getElementById('prevPage'),nextBtn=document.getElementById('nextPage');
const esc=s=>String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function serverLabel(s){return s==='taiwan'?'Тайвань':s==='pirate'?'Пиратка CN':'Обсуждения'}
function sortPosts(items){return [...items].sort((a,b)=>Number(Boolean(b.pinned))-Number(Boolean(a.pinned)) || String(b.pinned_at||b.created_at||'').localeCompare(String(a.pinned_at||a.created_at||'')) || String(b.created_at||'').localeCompare(String(a.created_at||'')))}
function filtered(){let items=activeFilter==='all'?allPosts:allPosts.filter(p=>p.server===activeFilter);if(searchTerm){const q=searchTerm.toLowerCase();items=items.filter(p=>`${p.title} ${p.excerpt} ${p.category} ${p.author}`.toLowerCase().includes(q))}return sortPosts(items)}
function render(){
  const items=filtered(),pages=Math.max(1,Math.ceil(items.length/perPage));page=Math.min(page,pages);const slice=items.slice((page-1)*perPage,page*perPage);const admin=NineYinAccount.isAdmin();
  postsEl.innerHTML=slice.length?slice.map((p,i)=>`<article class="post-card ${p.pinned?'post-pinned':''}" data-post-id="${esc(p.id)}">
    <div class="post-art" style="background-image:url('${esc(p.thumb)}')"></div>
    <div class="post-main"><div class="post-topline">${p.pinned?'<span class="pinned-badge">◆ Закреплено</span>':''}<span class="category-badge">${esc(p.category)}</span></div><h2 class="post-title">${esc(p.title)}</h2><p class="post-excerpt">${esc(p.excerpt)}</p></div>
    <div class="post-side"><div class="author-wrap"><div class="author-avatar"><img src="${esc(p.avatar||NineYinAccount.defaultAvatar)}" alt=""></div><div class="author-meta"><span class="author-name">${esc(p.author)}</span><span class="author-date">${esc(p.date)}</span></div></div><span class="server-tag ${esc(p.server)}">${serverLabel(p.server)}</span><div class="comments-meta"><span class="meta-icon">💬</span><span>${Number(p.comments||0)}</span></div>${admin?`<button class="admin-pin-button" type="button" data-pin-post="${esc(p.id)}" data-pinned="${p.pinned?'1':'0'}">${p.pinned?'Открепить':'Закрепить'}</button>`:''}<a class="read-link" href="post.html?id=${encodeURIComponent(p.id)}">Открыть →</a></div>
  </article>`).join(''):'<div class="forum-empty"><span>◇</span><h2>Пока нет записей</h2><p>Первая опубликованная тема появится здесь.</p></div>';
  numbersEl.innerHTML=items.length?Array.from({length:pages},(_,i)=>`<button class="page-number ${i+1===page?'active':''}" data-page="${i+1}">${i+1}</button>`).join(''):'';
  numbersEl.querySelectorAll('button').forEach(btn=>btn.addEventListener('click',()=>{page=+btn.dataset.page;render();scrollForum()}));prevBtn.disabled=page===1;nextBtn.disabled=page===pages||!items.length;
}
function scrollForum(){document.getElementById('forum').scrollIntoView({behavior:'smooth',block:'start'})}
function setFilter(filter){activeFilter=filter;page=1;document.querySelectorAll('.tab').forEach(t=>t.classList.toggle('active',t.dataset.filter===filter));render();scrollForum()}
document.querySelectorAll('.tab').forEach(btn=>btn.addEventListener('click',()=>setFilter(btn.dataset.filter)));
searchInput.addEventListener('input',()=>{searchTerm=searchInput.value.trim();page=1;render()});
prevBtn.addEventListener('click',()=>{if(page>1){page--;render();scrollForum()}});
nextBtn.addEventListener('click',()=>{const max=Math.max(1,Math.ceil(filtered().length/perPage));if(page<max){page++;render();scrollForum()}});
document.getElementById('edgePrev').addEventListener('click',()=>prevBtn.click());document.getElementById('edgeNext').addEventListener('click',()=>nextBtn.click());
document.addEventListener('keydown',e=>{if(['INPUT','TEXTAREA'].includes(document.activeElement.tagName))return;if(e.key==='ArrowLeft')prevBtn.click();if(e.key==='ArrowRight')nextBtn.click()});
postsEl.addEventListener('click',async e=>{const btn=e.target.closest('[data-pin-post]');if(!btn)return;btn.disabled=true;try{await NineYinAccount.setPostPinned(btn.dataset.pinPost,btn.dataset.pinned!=='1');await loadPosts()}catch(err){alert(err.message||'Не удалось изменить закрепление.')}finally{btn.disabled=false}});
async function loadPosts(){try{const rows=await NineYinAccount.listPosts();allPosts=rows.map(p=>({id:p.id,server:p.server,category:p.category,title:p.title,excerpt:p.excerpt||'',date:new Date(p.created_at).toLocaleDateString('ru-RU',{day:'numeric',month:'short',year:'numeric'}),author:p.author||'Пользователь',comments:p.comments_count||0,thumb:automaticCover(p.category,p.server),avatar:p.avatar||NineYinAccount.defaultAvatar,pinned:Boolean(p.pinned),pinned_at:p.pinned_at,created_at:p.created_at}));render()}catch(e){console.error(e);postsEl.innerHTML='<div class="forum-empty"><h2>Не удалось загрузить записи</h2><p>Проверьте подключение к базе.</p></div>'}}
(async()=>{await NineYinAccount.access;await loadPosts()})();
