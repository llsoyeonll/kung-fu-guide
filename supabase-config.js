window.NINEYIN_CONFIG = {
  version: '0.0.32',
  url: 'https://hwokqidewryewohdrwow.supabase.co',
  anonKey: 'sb_publishable_R5JVuXX59SnIpunEOsIYMA_K2FakDQs',
  demoMode: false,
  storagePrefix: 'nineyin-community',
  defaultAvatar: 'assets/default-profile.webp?v=0.0.32',
  brandIcon: 'assets/site-icon.webp',
  guideUrl: 'index.html',
  forumUrl: 'forum/index.html'
};

(() => {
  if (document.getElementById('nineyinPartnersServicesScript')) return;
  const script = document.createElement('script');
  script.id = 'nineyinPartnersServicesScript';
  script.src = 'partners-services.js?v=0.0.36';
  script.async = false;
  document.head.appendChild(script);
})();
