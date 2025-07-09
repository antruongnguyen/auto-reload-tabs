import { TimerManager, BadgeManager, ContextMenuManager } from './utils.js';

// Initialize context menus on installation
chrome.runtime.onInstalled.addListener(() => {
  ContextMenuManager.create();
});

// Update context menu on tab activation
chrome.tabs.onActivated.addListener((activeInfo) => {
  if (TimerManager.isActive(activeInfo.tabId)) {
    ContextMenuManager.update(activeInfo.tabId);
  }
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener((info, tab) => {
  switch (info.menuItemId) {
    case 'start-auto-reload':
      TimerManager.start(tab.id);
      BadgeManager.update(tab.id, true);
      ContextMenuManager.update(tab.id);
      break;
    case 'stop-auto-reload':
      TimerManager.stop(tab.id);
      BadgeManager.update(tab.id, false);
      ContextMenuManager.update(tab.id);
      break;
    case 'configure-auto-reload':
      chrome.action.openPopup();
      break;
  }
});

// Clean up when tabs are removed
chrome.tabs.onRemoved.addListener((tabId) => {
  TimerManager.stop(tabId);
});

// Handle tab updates and restore timers
chrome.tabs.onUpdated.addListener((tabId, changeInfo, _tab) => {
  if (TimerManager.isActive(tabId)) {
    if (changeInfo.status === 'complete') {
      chrome.storage.local.get(`tab_${tabId}`, (result) => {
        const tabData = result[`tab_${tabId}`];
        if (tabData && tabData.active) {
          TimerManager.start(tabId, tabData.interval);
          setTimeout(() => {
            BadgeManager.update(tabId, true);
          }, 100);
        }
      });
    }

    if (changeInfo.status === 'loading') {
      ContextMenuManager.update(tabId);
    }
  }
});

// Handle messages from popup and content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  const tabId = request.tabId;
  switch (request.action) {
    case 'getCurrentTabId':
      sendResponse({ tabId: sender.tab.id });
      break;

    case 'setReloadInterval':
      if (TimerManager.isActive(tabId)) {
        TimerManager.start(tabId, request.interval);
      }
      sendResponse({ success: true });
      break;

    case 'getReloadStatus':
      sendResponse({
        active: TimerManager.isActive(tabId),
        interval: TimerManager.getInterval(tabId),
        timeRemaining: Math.ceil(TimerManager.getTimeRemaining(tabId)),
      });
      break;

    case 'startAutoReload':
      TimerManager.start(tabId, request.interval);
      BadgeManager.update(tabId, true);
      sendResponse({ success: true });
      break;

    case 'stopAutoReload':
      TimerManager.stop(tabId);
      BadgeManager.update(tabId, false);
      sendResponse({ success: true });
      break;

    case 'stopAllTimers':
      TimerManager.stopAll();
      sendResponse({ success: true });
      break;
  }
});
