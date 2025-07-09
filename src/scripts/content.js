/**
 * Content script for tab title management
 */

const TAB_MARKER = '⚡ ';
let originalTitle = document.title;

function isExtensionContextValid() {
  try {
    return chrome.runtime && chrome.runtime.id;
  } catch (e) {
    return false;
  }
}

// Check for reload status on page load
chrome.runtime.sendMessage({ action: 'getCurrentTabId' }, (response) => {
  if (response && response.tabId) {
    chrome.storage.local.get(`tab_${response.tabId}`, (result) => {
      const tabData = result[`tab_${response.tabId}`];
      if (tabData && tabData.active && !document.title.startsWith(TAB_MARKER)) {
        originalTitle = document.title;
        document.title = TAB_MARKER + document.title;
      }
    });
  }
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (!isExtensionContextValid()) return;

  if (request.action === 'updateTabTitle') {
    if (request.active) {
      if (!document.title.startsWith(TAB_MARKER)) {
        originalTitle = document.title;
        document.title = TAB_MARKER + document.title;
      }
    } else {
      if (document.title.startsWith(TAB_MARKER)) {
        document.title = originalTitle;
      }
    }
    sendResponse({ success: true });
  }
});

document.addEventListener('contextmenu', (e) => {
  if (!isExtensionContextValid()) return;

  try {
    chrome.runtime.sendMessage({
      action: 'contextMenu',
      pageX: e.pageX,
      pageY: e.pageY,
    });
  } catch (error) {
    console.debug('Extension context invalidated, ignoring contextmenu event');
  }
});
