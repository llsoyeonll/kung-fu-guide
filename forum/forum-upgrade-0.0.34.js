(() => {
  'use strict';

  const VERSION = '0.0.35';

  function addStyles() {
    if (document.getElementById('forum-upgrade-0034-style')) return;
    const style = document.createElement('style');
    style.id = 'forum-upgrade-0034-style';
    style.textContent = `
      .topic-status{
        display:inline-flex;min-height:28px;padding:0 10px;align-items:center;justify-content:center;
        border:1px solid;font-size:11px;font-weight:800;letter-spacing:.04em;text-transform:uppercase;
      }
      .topic-status.waiting{color:#f3c86d;border-color:rgba(216,166,73,.64);background:rgba(105,73,18,.22)}
      .topic-status.completed{color:#8dd4b0;border-color:rgba(70,159,116,.58);background:rgba(25,93,64,.22)}
      .post-side-badges{
        display:grid;gap:7px;align-self:center;justify-self:end;min-width:90px;
      }
      .post-side-badges .server-tag,
      .post-side-badges .topic-status{
        width:100%;min-width:90px;box-sizing:border-box;
      }
      .post-view-badges-stack{
        display:inline-grid;gap:7px;align-items:stretch;vertical-align:top;
      }
      .post-view-badges-stack .server-tag,
      .post-view-badges-stack .topic-status{
        min-width:104px;box-sizing:border-box;
      }
      .post-status-editor{
        display:flex;align-items:center;flex-wrap:wrap;gap:9px;margin:0 28px 20px;padding:12px 14px;
        border:1px solid rgba(214,164,77,.2);background:rgba(4,17,28,.68);
      }
      .post-status-editor>span{margin-right:4px;color:#b8c3cb;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.08em}
      .post-status-editor button{
        min-height:32px;padding:0 12px;border:1px solid rgba(214,164,77,.38);background:rgba(7,25,38,.9);
        color:#c8d0d6;cursor:pointer;font:700 12px/1 "Golos Text",system-ui,sans-serif;
      }
      .post-status-editor button:hover,.post-status-editor button.active{
        border-color:#d9aa52;color:#ffdf93;background:rgba(90,63,17,.26)
      }
      .post-status-editor button[data-thread-status="completed"].active{
        border-color:rgba(70,159,116,.72);color:#9de1be;background:rgba(25,93,64,.28)
      }
      .post-status-editor small{margin-left:auto;color:#8ea0ad;font-size:11px}
      .profile-forum-stats{
        display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:16px;padding-top:16px;
        border-top:1px solid rgba(214,164,77,.18)
      }
      .profile-forum-stats>div{
        display:grid;gap:4px;min-width:0;padding:12px 8px;border:1px solid rgba(214,164,77,.22);
        background:linear-gradient(180deg,rgba(12,35,49,.74),rgba(4,17,27,.82));text-align:center
      }
      .profile-forum-stats strong{
        color:#f0c66c;font-family:"Cormorant Garamond",Georgia,serif;font-size:28px;line-height:1
      }
      .profile-forum-stats span{
        color:#9aabb7;font-size:10px;font-weight:700;letter-spacing:.08em;text-transform:uppercase
      }
      @media(max-width:700px){
        .post-status-editor{margin:0 16px 16px}
        .post-status-editor small{width:100%;margin-left:0}
      }
    `;
    document.head.appendChild(style);
  }

  function statusInfo(value) {
    return value === 'completed'
      ? { key: 'completed', label: 'Завершен' }
      : { key: 'waiting', label: 'Жду ответа' };
  }

  async function makeClient() {
    const cfg = window.NINEYIN_CONFIG;
    if (!cfg?.url || !cfg?.anonKey || !window.supabase) return null;
    const client = window.supabase.createClient(cfg.url, cfg.anonKey, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false }
    });
    const { data } = await client.auth.getSession();
    if (!data?.session?.user) return null;
    return { client, session: data.session };
  }

  async function decorateForumIndex(client) {
    const posts = document.getElementById('posts');
    if (!posts) return;

    let map = {};
    async function refreshMap() {
      const { data, error } = await client.from('posts')
        .select('id,thread_status')
        .eq('status', 'published');
      if (error) throw error;
      map = Object.fromEntries((data || []).map(row => [String(row.id), row.thread_status || 'waiting']));
      paint();
    }

    function paint() {
      posts.querySelectorAll('.post-card[data-post-id]').forEach(card => {
        const id = String(card.dataset.postId || '');
        const server = card.querySelector('.post-side .server-tag');
        if (!server) return;

        let stack = server.closest('.post-side-badges');
        if (!stack) {
          stack = document.createElement('div');
          stack.className = 'post-side-badges';
          server.insertAdjacentElement('beforebegin', stack);
          stack.appendChild(server);
        }

        let badge = stack.querySelector('.topic-status');
        if (!badge) {
          badge = document.createElement('span');
          stack.appendChild(badge);
        }

        const info = statusInfo(map[id] || 'waiting');
        badge.className = `topic-status ${info.key}`;
        badge.textContent = info.label;

        // Если старая версия успела вставить статус рядом с категорией — удаляем его.
        card.querySelectorAll('.post-topline .topic-status').forEach(oldBadge => oldBadge.remove());
      });
    }

    const observer = new MutationObserver(() => paint());
    observer.observe(posts, { childList: true, subtree: true });
    await refreshMap();
  }

  async function decorateProfile(client, userId) {
    const card = document.querySelector('.profile-card');
    if (!card || card.querySelector('.profile-forum-stats')) return;

    const [{ count: published, error: postError }, { count: answered, error: commentError }] = await Promise.all([
      client.from('posts').select('id', { count: 'exact', head: true }).eq('author_id', userId).eq('status', 'published'),
      client.from('comments').select('id', { count: 'exact', head: true }).eq('author_id', userId)
    ]);
    if (postError) throw postError;
    if (commentError) throw commentError;

    const stats = document.createElement('div');
    stats.className = 'profile-forum-stats';
    stats.setAttribute('aria-label', 'Статистика форума');
    stats.innerHTML = `
      <div><strong>${Number(published || 0)}</strong><span>Опубликовано</span></div>
      <div><strong>${Number(answered || 0)}</strong><span>Отвечено</span></div>
    `;
    card.appendChild(stats);
  }

  async function decoratePost(client, userId) {
    const id = new URLSearchParams(location.search).get('id');
    if (!id) return;

    const { data: post, error } = await client.from('posts')
      .select('id,author_id,thread_status')
      .eq('id', Number(id))
      .maybeSingle();
    if (error) throw error;
    if (!post) return;

    const root = document.getElementById('postView');

    async function waitFor(selector, timeout = 5000) {
      const existing = root?.querySelector(selector) || document.querySelector(selector);
      if (existing) return existing;
      return new Promise(resolve => {
        const started = Date.now();
        const observer = new MutationObserver(() => {
          const found = root?.querySelector(selector) || document.querySelector(selector);
          if (found || Date.now() - started > timeout) {
            observer.disconnect();
            resolve(found || null);
          }
        });
        observer.observe(root || document.body, { childList: true, subtree: true });
      });
    }

    const tags = await waitFor('.post-view-tags');
    if (!tags) return;

    const server = tags.querySelector('.server-tag');
    if (!server) return;

    let stack = server.closest('.post-view-badges-stack');
    if (!stack) {
      stack = document.createElement('span');
      stack.className = 'post-view-badges-stack';
      server.insertAdjacentElement('beforebegin', stack);
      stack.appendChild(server);
    }

    // Удаляем статус из общей строки тегов, если он остался после старой версии.
    tags.querySelectorAll(':scope > .topic-status').forEach(oldBadge => oldBadge.remove());

    let badge = stack.querySelector('.topic-status');
    if (!badge) {
      badge = document.createElement('span');
      stack.appendChild(badge);
    }

    function paint(value) {
      const info = statusInfo(value);
      badge.className = `topic-status ${info.key}`;
      badge.textContent = info.label;
      document.querySelectorAll('[data-thread-status]').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.threadStatus === info.key);
      });
    }
    paint(post.thread_status || 'waiting');

    if (String(post.author_id) !== String(userId)) return;

    const content = await waitFor('.post-view-content');
    if (!content || document.querySelector('.post-status-editor')) return;

    const editor = document.createElement('div');
    editor.className = 'post-status-editor';
    editor.innerHTML = `
      <span>Статус темы</span>
      <button type="button" data-thread-status="waiting">Жду ответа</button>
      <button type="button" data-thread-status="completed">Завершен</button>
      <small id="postStatusPatchMessage"></small>
    `;
    content.insertAdjacentElement('beforebegin', editor);
    paint(post.thread_status || 'waiting');

    editor.querySelectorAll('[data-thread-status]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const next = btn.dataset.threadStatus;
        const message = editor.querySelector('#postStatusPatchMessage');
        editor.querySelectorAll('button').forEach(x => x.disabled = true);
        message.textContent = 'Сохраняем...';
        try {
          const { data, error: updateError } = await client.from('posts')
            .update({ thread_status: next, updated_at: new Date().toISOString() })
            .eq('id', Number(id))
            .eq('author_id', userId)
            .select('id,thread_status')
            .maybeSingle();
          if (updateError) throw updateError;
          if (!data) throw new Error('Изменить статус может только автор записи.');
          post.thread_status = data.thread_status;
          paint(post.thread_status);
          message.textContent = 'Статус обновлён.';
        } catch (err) {
          message.textContent = err?.message || 'Не удалось изменить статус.';
        } finally {
          editor.querySelectorAll('button').forEach(x => x.disabled = false);
        }
      });
    });
  }

  async function init() {
    addStyles();
    if (!window.NineYinAccount) return;
    await NineYinAccount.access;

    const ctx = await makeClient();
    if (!ctx) return;

    const page = location.pathname.split('/').pop() || 'index.html';
    try {
      if (page === 'index.html' || page === '') await decorateForumIndex(ctx.client);
      else if (page === 'profile.html') await decorateProfile(ctx.client, ctx.session.user.id);
      else if (page === 'post.html') await decoratePost(ctx.client, ctx.session.user.id);
    } catch (err) {
      console.error(`Forum upgrade ${VERSION} failed:`, err);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => init(), { once: true });
  } else {
    init();
  }
})();
