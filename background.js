let reloadTimers = {};
let reloadIntervals = {};
let reloadStartTimes = {};

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "auto-reload-menu",
    title: "Auto Reload",
    contexts: ["page", "action"]
  });
  
  chrome.contextMenus.create({
    id: "start-auto-reload",
    parentId: "auto-reload-menu",
    title: "Start Auto Reload",
    contexts: ["page", "action"]
  });
  
  chrome.contextMenus.create({
    id: "stop-auto-reload",
    parentId: "auto-reload-menu",
    title: "Stop Auto Reload",
    contexts: ["page", "action"]
  });
  
  chrome.contextMenus.create({
    id: "configure-auto-reload",
    parentId: "auto-reload-menu",
    title: "Configure Timer",
    contexts: ["page", "action"]
  });
});

chrome.tabs.onActivated.addListener((activeInfo) => {
  // Only update context menu for tabs with active timers
  if (reloadTimers[activeInfo.tabId]) {
    updateContextMenu(activeInfo.tabId);
  }
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  switch (info.menuItemId) {
    case "start-auto-reload":
      startAutoReload(tab.id);
      break;
    case "stop-auto-reload":
      stopAutoReload(tab.id);
      break;
    case "configure-auto-reload":
      chrome.action.openPopup();
      break;
  }
});

function startAutoReload(tabId, interval = 30000) {
  if (reloadTimers[tabId]) {
    clearInterval(reloadTimers[tabId]);
  }
  
  reloadStartTimes[tabId] = Date.now();
  
  reloadTimers[tabId] = setInterval(() => {
    // Check if tab still exists before attempting to reload
    chrome.tabs.get(tabId).then(() => {
      chrome.tabs.reload(tabId);
      reloadStartTimes[tabId] = Date.now();
    }).catch(() => {
      // Tab no longer exists, clean up the timer
      stopAutoReload(tabId);
    });
  }, interval);
  
  reloadIntervals[tabId] = interval;
  
  chrome.storage.local.set({
    [`tab_${tabId}`]: {
      active: true,
      interval: interval,
      startTime: reloadStartTimes[tabId]
    }
  });
  
  updateBadge(tabId, true);
  updateContextMenu(tabId);
}

function stopAutoReload(tabId) {
  if (reloadTimers[tabId]) {
    clearInterval(reloadTimers[tabId]);
    delete reloadTimers[tabId];
    delete reloadIntervals[tabId];
    delete reloadStartTimes[tabId];
  }
  
  chrome.storage.local.remove(`tab_${tabId}`);
  updateBadge(tabId, false);
  updateContextMenu(tabId);
}

function updateBadge(tabId, active) {
  // Check if tab still exists before updating badge
  chrome.tabs.get(tabId).then(() => {
    chrome.action.setBadgeText({
      tabId: tabId,
      text: active ? "⚡" : ""
    });
    chrome.action.setBadgeBackgroundColor({
      tabId: tabId,
      color: "#444444"
    });
    
    // Update tab title to show reload status
    chrome.tabs.sendMessage(tabId, {
      action: "updateTabTitle",
      active: active
    }).catch(() => {
      // Ignore errors if content script is not loaded
    });
  }).catch(() => {
    // Tab no longer exists, ignore badge update
  });
}

function updateContextMenu(tabId) {
  const isActive = !!reloadTimers[tabId];
  
  chrome.contextMenus.update("start-auto-reload", {
    visible: !isActive
  });
  
  chrome.contextMenus.update("stop-auto-reload", {
    visible: isActive
  });
}

chrome.tabs.onRemoved.addListener((tabId) => {
  stopAutoReload(tabId);
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  // Only handle updates for tabs with active timers
  if (reloadTimers[tabId]) {
    if (changeInfo.status === "complete") {
      chrome.storage.local.get(`tab_${tabId}`, (result) => {
        const tabData = result[`tab_${tabId}`];
        if (tabData && tabData.active) {
          startAutoReload(tabId, tabData.interval);
          // Ensure tab title is updated after reload
          setTimeout(() => {
            updateBadge(tabId, true);
          }, 100);
        }
      });
    }
    
    if (changeInfo.status === "loading") {
      updateContextMenu(tabId);
    }
  }
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "getCurrentTabId") {
    sendResponse({ tabId: sender.tab.id });
  } else if (request.action === "setReloadInterval") {
    const { tabId, interval } = request;
    if (reloadTimers[tabId]) {
      startAutoReload(tabId, interval);
    }
    sendResponse({ success: true });
  } else if (request.action === "getReloadStatus") {
    const { tabId } = request;
    const active = !!reloadTimers[tabId];
    let timeRemaining = 0;
    
    if (active && reloadStartTimes[tabId]) {
      const elapsed = Date.now() - reloadStartTimes[tabId];
      timeRemaining = Math.max(0, (reloadIntervals[tabId] - elapsed) / 1000);
    }
    
    sendResponse({
      active: active,
      interval: reloadIntervals[tabId] || 30000,
      timeRemaining: Math.ceil(timeRemaining)
    });
  } else if (request.action === "startAutoReload") {
    const { tabId, interval } = request;
    startAutoReload(tabId, interval);
    sendResponse({ success: true });
  } else if (request.action === "stopAutoReload") {
    const { tabId } = request;
    stopAutoReload(tabId);
    sendResponse({ success: true });
  }
});
