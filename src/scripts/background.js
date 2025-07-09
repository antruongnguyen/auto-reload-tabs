import { TimerManager, BadgeManager, ContextMenuManager, ServiceWorkerManager } from './utils.js';

// Initialize context menus and recover timers on installation/startup
chrome.runtime.onInstalled.addListener(async () => {
  ContextMenuManager.create();
  await TimerManager.recoverTimers();
  await ServiceWorkerManager.manageKeepAlive();
});

// Also recover timers on service worker startup
chrome.runtime.onStartup.addListener(async () => {
  await TimerManager.recoverTimers();
  await ServiceWorkerManager.manageKeepAlive();
});

// Update context menu on tab activation
chrome.tabs.onActivated.addListener((activeInfo) => {
  ContextMenuManager.update(activeInfo.tabId);
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  switch (info.menuItemId) {
    case 'start-auto-reload':
      await TimerManager.start(tab.id);
      BadgeManager.update(tab.id, true);
      ContextMenuManager.update(tab.id);
      await ServiceWorkerManager.manageKeepAlive();
      break;
    case 'stop-auto-reload':
      await TimerManager.stop(tab.id);
      BadgeManager.update(tab.id, false);
      ContextMenuManager.update(tab.id);
      await ServiceWorkerManager.manageKeepAlive();
      break;
    case 'configure-auto-reload':
      chrome.action.openPopup();
      break;
  }
});

// Clean up when tabs are removed
chrome.tabs.onRemoved.addListener(async (tabId) => {
  await TimerManager.stop(tabId);
  await ServiceWorkerManager.manageKeepAlive();
});

// Handle tab updates and restore timers
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, _tab) => {
  if (TimerManager.isActive(tabId)) {
    if (changeInfo.status === 'complete') {
      const result = await chrome.storage.local.get(`tab_${tabId}`);
      const tabData = result[`tab_${tabId}`];
      if (tabData && tabData.active) {
        await TimerManager.start(tabId, tabData.interval);
        setTimeout(() => {
          BadgeManager.update(tabId, true);
        }, 100);
      }
    }

    if (changeInfo.status === 'loading') {
      ContextMenuManager.update(tabId);
    }
  }
});

// Handle messages from popup and content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  const tabId = request.tabId;
  
  // Handle async operations
  const handleAsync = async () => {
    switch (request.action) {
      case 'getCurrentTabId':
        return { tabId: sender.tab.id };

      case 'setReloadInterval':
        if (TimerManager.isActive(tabId)) {
          await TimerManager.start(tabId, request.interval);
        }
        return { success: true };

      case 'getReloadStatus':
        return {
          active: TimerManager.isActive(tabId),
          interval: TimerManager.getInterval(tabId),
          timeRemaining: Math.ceil(TimerManager.getTimeRemaining(tabId)),
        };

      case 'startAutoReload':
        await TimerManager.start(tabId, request.interval);
        BadgeManager.update(tabId, true);
        await ServiceWorkerManager.manageKeepAlive();
        return { success: true };

      case 'stopAutoReload':
        await TimerManager.stop(tabId);
        BadgeManager.update(tabId, false);
        await ServiceWorkerManager.manageKeepAlive();
        return { success: true };

      case 'stopAllTimers':
        await TimerManager.stopAll();
        await ServiceWorkerManager.manageKeepAlive();
        return { success: true };
    }
  };

  // Execute async handler and send response
  handleAsync().then(sendResponse).catch(error => {
    console.error('Error handling message:', error);
    sendResponse({ error: error.message });
  });

  // Return true to indicate we will send a response asynchronously
  return true;
});
