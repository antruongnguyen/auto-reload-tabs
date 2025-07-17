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

// Monitor tab discarding and recovery
async function monitorTabDiscarding() {
  const activeTimers = await chrome.storage.local.get('activeTimers');
  const timerList = activeTimers.activeTimers || [];

  for (const tabId of timerList) {
    try {
      const tab = await chrome.tabs.get(tabId);

      if (tab.discarded && TimerManager.isActive(tabId)) {
        // Tab was discarded, reload it to restore functionality
        console.debug(`Reloading discarded tab ${tabId} to restore auto-reload functionality`);
        await chrome.tabs.reload(tabId);
      }
    } catch (error) {
      // Tab no longer exists, clean up will be handled by timer manager
    }
  }
}

// Start monitoring for tab discarding every 2 minutes
setInterval(monitorTabDiscarding, 120000);

// Handle messages from popup and content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  const tabId = request.tabId || (sender.tab ? sender.tab.id : null);

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

      case 'tabKeepAlive':
        // Handle keep-alive message from content script
        // This helps maintain extension-content script connection
        return { received: true };
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
