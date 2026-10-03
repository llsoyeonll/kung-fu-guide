(() => {
  'use strict';

  const CONFIG = {
    url: 'https://hwokqidewryewohdrwow.supabase.co',
    anonKey: 'sb_publishable_R5JVuXX59SnIpunEOsIYMA_K2FakDQs'
  };

  const SERVER_LABELS = {
    'private-china': 'Пиратка',
    'private-dubu': 'Приват Дубу',
    'taiwan': 'Тайвань',
    'china': 'Китай',
    'pirate': 'Пиратка',
    'pirate-cn': 'Пиратка',
    'Приват Китай': 'Пиратка',
    'Приват Дубу': 'Приват Дубу',
    'Тайвань': 'Тайвань',
    'Китай': 'Китай',
    'Пиратка': 'Пиратка'
  };

  const $ = (sel, root = document) => root.querySelector(sel);
  const esc = (value = '') => String(value).replace(/[&<>"']/g, c => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[c]));

  let client = null;
  let currentUser = null;
  let currentProfile = null;

  function mapServer(value) {
    return SERVER_LABELS[value] || value || 'Не указан';
  }

  function mapServers(values) {
    const list = Array.isArray(values) ? values : (values ? [values] : []);
    return list.map(mapServer).filter(Boolean);
  }

  function message(el, text, type = '') {
    if (!el) return;
    el.textContent = text;
    el.dataset.type = type;
  }

  function initClient() {
    if (!window.supabase?.createClient) throw new Error('Не удалось загрузить модуль авторизации.');
    client = window.supabase.createClient(CONFIG.url, CONFIG.anonKey, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
    });
    return client;
  }

  async function loadOwnProfile() {
    if (!currentUser) {
      currentProfile = null;
      return null;
    }
    const { data, error } = await client.from('profiles').select('*').eq('id', currentUser.id).maybeSingle();
    if (error) throw error;
    currentProfile = data || null;
    return currentProfile;
  }

  function showProfileState(signedIn) {
    const auth = $('#profile-auth');
    const editor = $('#profile-editor');
    if (auth) auth.hidden = signedIn;
    if (editor) editor.hidden = !signedIn;
  }

  async function renderProfile() {
    if (!currentUser) {
      currentProfile = null;
      showProfileState(false);
      return;
    }

    showProfileState(true);
    await loadOwnProfile();

    const email = $('#profile-email');
    const nickname = $('#profile-nickname');
    const serverChecks = Array.from(document.querySelectorAll('input[name="servers"]'));
    const about = $('#profile-about');

    if (email) email.value = currentUser.email || '';
    if (nickname) nickname.value = currentProfile?.game_nickname || '';
    const selectedServers = Array.isArray(currentProfile?.servers) && currentProfile.servers.length
      ? currentProfile.servers
      : (currentProfile?.server === 'both' ? ['taiwan','pirate'] : (currentProfile?.server ? [currentProfile.server] : []));
    serverChecks.forEach(input => { input.checked = selectedServers.includes(input.value); });
    if (about) about.value = currentProfile?.about || '';
  }

  async function initProfilePage() {
    initClient();

    const { data } = await client.auth.getSession();
    currentUser = data?.session?.user || null;
    await renderProfile();

    client.auth.onAuthStateChange(async (_event, session) => {
      currentUser = session?.user || null;
      await renderProfile();
    });

    $('#profile-login-form')?.addEventListener('submit', async (event) => {
      event.preventDefault();
      const msg = $('#profile-auth-message');
      const fd = new FormData(event.currentTarget);
      const email = String(fd.get('email') || '').trim().toLowerCase();
      const password = String(fd.get('password') || '');
      message(msg, 'Выполняется вход…');
      const { error } = await client.auth.signInWithPassword({ email, password });
      if (error) message(msg, error.message, 'error');
      else {
        message(msg, 'Вход выполнен.', 'success');
        const target = new URLSearchParams(location.search).get('redirect');
        if (target && !target.includes('://') && !target.startsWith('//')) location.replace(target);
      }
    });

    $('#profile-register-form')?.addEventListener('submit', async (event) => {
      event.preventDefault();
      const msg = $('#profile-auth-message');
      const fd = new FormData(event.currentTarget);
      const email = String(fd.get('email') || '').trim().toLowerCase();
      const password = String(fd.get('password') || '');
      const password2 = String(fd.get('password2') || '');

      if (password !== password2) return message(msg, 'Пароли не совпадают.', 'error');
      if (password.length < 8) return message(msg, 'Пароль должен содержать минимум 8 символов.', 'error');

      message(msg, 'Создаём аккаунт…');
      const { data, error } = await client.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: location.href }
      });
      if (error) return message(msg, error.message, 'error');
      if (!data.session) message(msg, 'Аккаунт создан. Подтвердите почту и затем войдите.', 'success');
      else message(msg, 'Аккаунт создан.', 'success');
    });

    $('#profile-form')?.addEventListener('submit', async (event) => {
      event.preventDefault();
      if (!currentUser) return;

      const msg = $('#profile-save-message');
      const fd = new FormData(event.currentTarget);
      const game_nickname = String(fd.get('game_nickname') || '').trim();
      const servers = fd.getAll('servers').map(value => String(value).trim()).filter(Boolean);
      const about = String(fd.get('about') || '').trim();

      if (!game_nickname) return message(msg, 'Укажите игровой никнейм.', 'error');
      if (!servers.length) return message(msg, 'Выберите хотя бы один сервер.', 'error');

      message(msg, 'Сохраняем профиль…');
      try {
        const payload = {
          id: currentUser.id,
          game_nickname,
          servers,
          server: servers.length === 1 ? servers[0] : (servers.includes('taiwan') && servers.includes('pirate') ? 'both' : servers[0]),
          about,
          avatar_path: null,
          profile_completed: true,
          updated_at: new Date().toISOString()
        };
        const { data, error } = await client.from('profiles').upsert(payload, { onConflict: 'id' }).select().single();
        if (error) throw error;
        currentProfile = data;
        message(msg, 'Профиль сохранён.', 'success');
      } catch (error) {
        message(msg, error.message || 'Не удалось сохранить профиль.', 'error');
      }
    });

    $('#profile-logout')?.addEventListener('click', async () => {
      await client.auth.signOut();
      location.reload();
    });
  }

  function renderUsersPage(profiles) {
    const grid = $('#users-grid');
    const counter = $('#users-counter');
    const prev = $('#users-prev');
    const next = $('#users-next');
    if (!grid) return;

    const perPage = 15;
    let page = 0;

    function render() {
      const maxPage = Math.max(0, Math.ceil(profiles.length / perPage) - 1);
      page = Math.max(0, Math.min(page, maxPage));
      const slice = profiles.slice(page * perPage, page * perPage + perPage);
      grid.innerHTML = '';

      for (const profile of slice) {
        const card = document.createElement('article');
        card.className = 'community-user-card-v69 community-user-card-v70';
        card.innerHTML = `
          <div class="community-user-body-v69">
            <h3>${esc(profile.game_nickname || 'Без никнейма')}</h3>
            <div class="community-user-servers-v71">${mapServers(profile.servers).map(server => `<span class="community-user-server-v69">${esc(server)}</span>`).join('')}</div>
          </div>`;
        grid.appendChild(card);
      }

      if (!profiles.length) {
        grid.innerHTML = '<div class="community-empty-v69">Пользователей пока нет.</div>';
      }

      if (counter) counter.textContent = profiles.length ? `${page + 1} / ${maxPage + 1}` : '0 / 0';
      if (prev) prev.disabled = page === 0;
      if (next) next.disabled = page >= maxPage;
    }

    prev?.addEventListener('click', () => { page -= 1; render(); });
    next?.addEventListener('click', () => { page += 1; render(); });
    render();
  }

  async function initUsersPage() {
    initClient();
    const grid = $('#users-grid');
    try {
      const { data, error } = await client.rpc('list_public_profiles');
      if (error) throw error;
      renderUsersPage(data || []);
    } catch (error) {
      if (grid) grid.innerHTML = `<div class="community-empty-v69">Не удалось загрузить пользователей: ${esc(error.message || '')}</div>`;
    }
  }

  window.NineYinCommunityProfile = { initProfilePage, initUsersPage, mapServer, mapServers };
})();