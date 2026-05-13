(function () {
  'use strict';

  let enabled = true;
  const isMusic = location.hostname === 'music.youtube.com';
  let overlay = null;
  let adStartTime = 0;

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

  function hasSkipButton() {
    return !!document.querySelector(
      '.ytp-ad-skip-button, .ytp-ad-skip-button-modern'
    );
  }

  function showOverlay() {
    if (overlay) return;
    overlay = document.createElement('div');
    overlay.id = 'yab-overlay';
    overlay.style.cssText =
      'position:fixed;top:0;left:0;width:100%;height:100%;z-index:999999;background:#000;pointer-events:none;';
    document.body.appendChild(overlay);
  }

  function hideOverlay() {
    if (overlay) {
      overlay.remove();
      overlay = null;
    }
  }

  function killAdVideo() {
    const player = document.getElementById('movie_player');
    const video = document.querySelector('video');
    if (video) {
      video.pause();
      video.src = '';
      video.load();
      video.muted = true;
    }
    if (player && typeof player.stopVideo === 'function') {
      player.stopVideo();
    }
    const videoId = new URLSearchParams(window.location.search).get('v');
    if (videoId && player && typeof player.loadVideoById === 'function') {
      player.loadVideoById({ videoId, startSeconds: 0 });
    }
  }

  function handleAdStart() {
    if (!enabled) return;
    adStartTime = Date.now();
    const skipBtn = hasSkipButton();
    if (skipBtn) {
      document.querySelector(
        '.ytp-ad-skip-button, .ytp-ad-skip-button-modern'
      ).click();
    }
    const video = document.querySelector('video');
    if (video) video.muted = true;

    if (!skipBtn) {
      showOverlay();
    }
  }

  function handleAdEnd() {
    hideOverlay();
    adStartTime = 0;
    const video = document.querySelector('video');
    if (video) video.muted = false;
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

    if (adShowing && !isMusic && !hasSkipButton()) {
      showOverlay();
    }
    if (!adShowing) {
      hideOverlay();
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
    #movie_player.ad-showing {
      pointer-events: none !important;
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
        handleAdStart();
        removeAds();
        const video = document.querySelector('video');
        if (video) {
          video.muted = true;
          video.playbackRate = 16;
        }
      } else {
        handleAdEnd();
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
      const showing = adPlayerVisible();
      const skipBtn = hasSkipButton();

      if (showing) {
        if (skipBtn) {
          document.querySelector(
            '.ytp-ad-skip-button, .ytp-ad-skip-button-modern'
          ).click();
        }
        if (video) {
          video.muted = true;
          video.playbackRate = 16;
        }
        if (!skipBtn) {
          showOverlay();
          if (adStartTime > 0 && Date.now() - adStartTime > 5000) {
            killAdVideo();
          }
        }
      } else {
        if (adStartTime > 0) handleAdEnd();
        hideOverlay();
      }
    }
  }, 300);

  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === 'TOGGLE') {
      enabled = msg.enabled;
      if (enabled) {
        hideOverlay();
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
          #movie_player.ad-showing {
            pointer-events: none !important;
          }
        `;
      } else {
        hideOverlay();
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
