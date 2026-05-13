# YouTube & YouTube Music Ad Blocker

A lightweight Chrome extension that blocks advertisements on both **YouTube** and **YouTube Music** automatically.

## Features

- 🚫 Blocks video ads (pre-roll, mid-roll, overlay) on YouTube
- 🎵 Blocks audio ads and promotional banners on YouTube Music
- ⏭️ Auto-skips ads when a skip button is available
- 🔇 Auto-mutes audio ads on YouTube Music (stream ads can't be removed from DOM)
- 🔄 MutationObserver-based — catches ads as soon as they appear in the DOM
- 🎛️ Toggle on/off via the extension popup
- 📊 Ad counter shows how many ads have been blocked
- 💾 State persists across browser sessions via `chrome.storage`

## How It Works

### YouTube (`youtube.com`)

- A **MutationObserver** watches the DOM for ad elements and removes them instantly.
- CSS rules with `display: none !important` are injected at `document_start` to hide ads before they render.
- The skip button (`.ytp-ad-skip-button`) is auto-clicked when detected.
- Video ads trigger automatic muting until the ad segment ends.

### YouTube Music (`music.youtube.com`)

- **Promotional banners and upsells** (`ytmusic-mealbar-promo-renderer`, `ytmusic-pivot-bar-renderer[is-promo]`, etc.) are removed via MutationObserver.
- A **polling interval (1s)** detects audio ads by checking for `[ad-active]` attribute on the player bar.
- When an audio ad is detected, the video element is muted.
- If a skip button (`ytmusic-skip-ad-button`) appears, it is clicked automatically.

### Targeted Selectors

| Platform | Selectors |
|----------|-----------|
| **YouTube** | `ytd-ad-slot-renderer`, `ytd-display-ad-renderer`, `ytd-promoted-sparkles-web-renderer`, `ytd-in-feed-ad-tile-renderer`, `ytp-ad-player-overlay`, `.video-ads`, and more |
| **YouTube Music** | `ytmusic-mealbar-promo-renderer`, `ytmusic-pivot-bar-renderer[is-promo]`, `ytmusic-banner-promo-renderer`, `.ytmusic-ad-container`, `ytmusic-promo-badge-renderer`, and more |

> **Note:** YouTube frequently changes its DOM selectors. If the extension stops working, the selectors may need to be updated.

## Installation

### From Source (Developer Mode)

1. **Download or clone** this repository:
   ```bash
   git clone https://github.com/marcomendez/blocker_youtube_ads.git
   ```
2. Open **Chrome** and navigate to `chrome://extensions/`
3. Enable **Developer mode** (toggle in the top-right corner)
4. Click **Load unpacked**
5. Select the `blocker_youtube_ads` folder
6. The extension is now installed and active

### Usage

1. Visit **youtube.com** or **music.youtube.com** — ads are blocked automatically
2. Click the extension icon in the toolbar to open the popup
3. Use the toggle switch to enable/disable ad blocking
4. The popup shows a counter of blocked ads

## File Structure

```
blocker_youtube_ads/
├── manifest.json          # Chrome Extension Manifest V3
├── content.js             # Main ad-blocking logic
├── background.js          # Service worker (ad counter persistence)
├── popup/
│   ├── popup.html         # Popup UI
│   ├── popup.css          # Popup styles
│   └── popup.js           # Popup logic (toggle + counter)
└── icons/
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

## Compatibility

- ✅ Google Chrome (Manifest V3)
- ✅ Microsoft Edge (via "Load unpacked")
- ✅ Brave (via "Load unpacked")
- ✅ Opera (via "Load unpacked")
- ❌ Firefox (not supported — uses Manifest V3)

## Limitations

- **YouTube Music audio ads** are streamed server-side and cannot be removed from the DOM. The extension mutes them until they finish.
- Selectors may break if YouTube updates its UI. Periodic updates may be needed.
- The extension does **not** use `declarativeNetRequest` (network-level blocking), so ad requests still reach the server. Only the visual/ad playback is blocked.

## License

MIT
