const toggle = document.getElementById('toggle');
const statusEl = document.getElementById('status');
const countEl = document.getElementById('count');

chrome.storage.sync.get('enabled', (data) => {
  const isOn = data.enabled !== false;
  toggle.checked = isOn;
  statusEl.textContent = isOn ? 'Activado' : 'Desactivado';
});

toggle.addEventListener('change', () => {
  const isOn = toggle.checked;
  statusEl.textContent = isOn ? 'Activado' : 'Desactivado';
  chrome.storage.sync.set({ enabled: isOn });
  chrome.tabs.query({ url: '*://*.youtube.com/*' }, (tabs) => {
    for (const tab of tabs) {
      chrome.tabs.sendMessage(tab.id, { type: 'TOGGLE', enabled: isOn });
    }
  });
});

chrome.storage.local.get('totalBlocked', (data) => {
  countEl.textContent = data.totalBlocked || 0;
});

chrome.storage.onChanged.addListener((changes) => {
  if (changes.totalBlocked) {
    countEl.textContent = changes.totalBlocked.newValue || 0;
  }
});
