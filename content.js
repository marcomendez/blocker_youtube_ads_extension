(function () {
  'use strict';

  let enabled = true;
  const isMusic = location.hostname === 'music.youtube.com';

  const YT_SELECTORS = [
    'ytd-ad-slot-renderer',
    'ytd-display-ad-renderer',
    'ytd-promoted-sparkles-web-renderer',
    'ytd-promoted-video-renderer',
    'ytd-in-feed-ad-tile-renderer',
    'ytd-rich-item-renderer[is-ad]',
    'ytd-merch-shelf-renderer',
    'ytd-player-legacy-desktop-watch-ads-renderer',
    'ytp-ad-player-overlay',
    'ytp-ad-overlay-container',
    'ytp-ad-image-overlay',
    'ytp-ad-text-overlay',
    '.video-ads',
    'ytd-ad-slot-renderer[ad-duration]',
    '#masthead-ad',
    '.ytd-video-masthead-ad-v3-renderer',
  ];

  const MUSIC_SELECTORS = [
    'ytmusic-mealbar-promo-renderer',
    'ytmusic-pivot-bar-renderer[is-promo]',
    'ytmusic-inline-badge-renderer',
    'ytmusic-banner-promo-renderer',
    'ytmusic-navigation-button-renderer[is-promo]',
    '.ytmusic-ad-container',
    '#ad-container',
    'ytmusic-promo-badge-renderer',
  ];

  const AD_SELECTORS = isMusic ? MUSIC_SELECTORS : YT_SELECTORS;

  function removeAds() {
    if (!enabled) return;
    for (const sel of AD_SELECTORS) {
      for (const el of document.querySelectorAll(sel)) {
        el.remove();
      }
    }
    for (const el of document.querySelectorAll('[is-promo], [ad-active]')) {
      if (isMusic) el.remove();
    }
    tryAutoSkip();
    muteAdSegment();
  }

  function tryAutoSkip() {
    let btn;
    if (isMusic) {
      btn = document.querySelector('ytmusic-skip-ad-button');
    } else {
      btn = document.querySelector(
        '.ytp-ad-skip-button, .ytp-ad-skip-button-modern'
      );
    }
    if (btn) btn.click();
  }

  function muteAdSegment() {
    const video = document.querySelector('video');
    if (!video) return;

    let adShowing;
    if (isMusic) {
      adShowing = !!(
        document.querySelector('ytmusic-player-bar[ad-active]') ||
        document.querySelector('.ytmusic-ad-container') ||
        document.querySelector('ytmusic-mealbar-promo-renderer')
      );
    } else {
      adShowing = !!document.querySelector('.ytp-ad-player-overlay');
    }

    video.muted = adShowing;
  }

  const style = document.createElement('style');
  style.id = 'yab-hide-style';
  style.textContent = `
    ${AD_SELECTORS.join(',\n    ')} {
      display: none !important;
    }
    ytd-watch-next-secondary-results-renderer {
      z-index: auto !important;
    }
  `;
  document.documentElement.appendChild(style);

  removeAds();

  const observer = new MutationObserver(() => removeAds());
  observer.observe(document.body || document.documentElement, {
    childList: true,
    subtree: true,
  });

  if (isMusic) {
    setInterval(() => {
      if (!enabled) return;
      const video = document.querySelector('video');
      const skipBtn = document.querySelector('ytmusic-skip-ad-button');
      const adActive = !!(
        document.querySelector('ytmusic-player-bar[ad-active]') ||
        document.querySelector('.ytmusic-ad-container') ||
        document.querySelector('ytmusic-mealbar-promo-renderer') ||
        document.querySelector('[is-promo]')
      );
      if (skipBtn) skipBtn.click();
      if (video) video.muted = adActive;
    }, 1000);
  }

  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === 'TOGGLE') {
      enabled = msg.enabled;
      if (enabled) {
        removeAds();
        style.textContent = `
          ${AD_SELECTORS.join(',\n    ')} {
            display: none !important;
          }
          ytd-watch-next-secondary-results-renderer {
            z-index: auto !important;
          }
        `;
      } else {
        style.textContent = '';
      }
    }
  });

  chrome.storage.sync.get('enabled', (data) => {
    if (data.enabled === false) {
      enabled = false;
      style.textContent = '';
    }
  });

  const countObserver = new MutationObserver(() => {
    if (!enabled) return;
    let count = 0;
    for (const sel of AD_SELECTORS) {
      count += document.querySelectorAll(sel).length;
    }
    count += document.querySelectorAll('[is-promo], [ad-active]').length;
    chrome.runtime.sendMessage({ type: 'AD_COUNT', count });
  });
  countObserver.observe(document.body || document.documentElement, {
    childList: true,
    subtree: true,
  });
})();
