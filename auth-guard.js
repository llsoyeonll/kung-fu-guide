(() => {
  'use strict';

  const CONFIG = {
    url: 'https://hwokqidewryewohdrwow.supabase.co',
    anonKey: 'sb_publishable_R5JVuXX59SnIpunEOsIYMA_K2FakDQs'
  };

  async function run() {
    try {
      if (!window.supabase?.createClient) throw new Error('Supabase недоступен');
      const client = window.supabase.createClient(CONFIG.url, CONFIG.anonKey, {
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
      });
      const { data, error } = await client.auth.getSession();
      if (error) throw error;
      const user = data?.session?.user || null;
      if (!user || !user.email_confirmed_at) {
        const next = location.pathname.split('/').pop() + location.search + location.hash;
        location.replace(`profile.html?redirect=${encodeURIComponent(next)}`);
        return;
      }
      document.documentElement.classList.remove('auth-pending');
    } catch (error) {
      const next = location.pathname.split('/').pop() + location.search + location.hash;
      location.replace(`profile.html?redirect=${encodeURIComponent(next)}`);
    }
  }

  run();
})();