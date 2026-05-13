let totalBlocked = 0;

chrome.runtime.onMessage.addListener((msg, sender) => {
  if (msg.type === 'AD_COUNT') {
    totalBlocked += msg.count;
    chrome.storage.local.set({ totalBlocked });
  }
});

chrome.action.onClicked.addListener((tab) => {
  chrome.action.setPopup({ tabId: tab.id, popup: 'popup/popup.html' });
});
