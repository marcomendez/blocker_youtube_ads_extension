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
    '.ytp-ad-persistent-progress-bar-container',
    '.ytp-ad-progress-list',
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

  function adPlayerVisible() {
    return !!(
      document.querySelector('#movie_player.ad-showing') ||
      document.querySelector('.html5-video-player.ad-showing')
    );
  }

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
    const video = document.querySelector('video');
    if (isMusic) {
      btn = document.querySelector('ytmusic-skip-ad-button');
    } else {
      btn = document.querySelector(
        '.ytp-ad-skip-button, .ytp-ad-skip-button-modern'
      );
    }
    if (btn) btn.click();

    if (video && adPlayerVisible()) {
      video.muted = true;
      video.playbackRate = 16;
      video.currentTime = 1e10;
      const player = document.getElementById('movie_player');
      if (player && typeof player.stopVideo === 'function') {
        player.stopVideo();
      }
    }
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
      adShowing = adPlayerVisible();
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
    .html5-video-player.ad-showing video {
      opacity: 0 !important;
    }
  `;
  document.documentElement.appendChild(style);

  removeAds();

  const body = document.body || document.documentElement;
  const domObserver = new MutationObserver(() => removeAds());
  domObserver.observe(body, { childList: true, subtree: true });

  const playerEl = document.getElementById('movie_player') ||
    document.querySelector('.html5-video-player');
  if (playerEl) {
    const attrObserver = new MutationObserver(() => {
      if (!enabled) return;
      if (playerEl.classList.contains('ad-showing')) {
        removeAds();
        const video = document.querySelector('video');
        if (video) {
          video.muted = true;
          video.currentTime = 1e10;
          video.playbackRate = 16;
        }
        const skipBtn = document.querySelector(
          '.ytp-ad-skip-button, .ytp-ad-skip-button-modern'
        );
        if (skipBtn) skipBtn.click();
      }
    });
    attrObserver.observe(playerEl, {
      attributes: true,
      attributeFilter: ['class'],
    });
  }

  setInterval(() => {
    if (!enabled) return;
    const video = document.querySelector('video');
    if (isMusic) {
      const skipBtn = document.querySelector('ytmusic-skip-ad-button');
      const adActive = !!(
        document.querySelector('ytmusic-player-bar[ad-active]') ||
        document.querySelector('.ytmusic-ad-container') ||
        document.querySelector('ytmusic-mealbar-promo-renderer') ||
        document.querySelector('[is-promo]')
      );
      if (skipBtn) skipBtn.click();
      if (video) video.muted = adActive;
    } else {
      const skipBtn = document.querySelector(
        '.ytp-ad-skip-button, .ytp-ad-skip-button-modern'
      );
      if (adPlayerVisible()) {
        if (skipBtn) skipBtn.click();
        if (video) {
          video.muted = true;
          video.currentTime = 1e10;
          video.playbackRate = 16;
        }
        const player = document.getElementById('movie_player');
        if (player && typeof player.stopVideo === 'function') {
          player.stopVideo();
        }
      }
    }
  }, 300);

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
          .html5-video-player.ad-showing video {
            opacity: 0 !important;
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
    count +=
      document.querySelectorAll('[is-promo], [ad-active]').length +
      document.querySelectorAll(
        '#movie_player.ad-showing, .html5-video-player.ad-showing'
      ).length;
    chrome.runtime.sendMessage({ type: 'AD_COUNT', count });
  });
  countObserver.observe(body, { childList: true, subtree: true });
})();
