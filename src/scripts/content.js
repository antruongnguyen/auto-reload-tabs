/**
 * Content script for tab title management and suspension prevention
 */

const TAB_MARKER = '⚡ ';
let originalTitle = document.title;
let isTimerActive = false;
let visibilityChangeListener = null;
let keepAliveInterval = null;
let suspensionPreventionActive = false;

function isExtensionContextValid() {
  try {
    return chrome.runtime && chrome.runtime.id;
  } catch (e) {
    return false;
  }
}

// Start monitoring page visibility and prevent suspension
function startSuspensionPrevention() {
  if (suspensionPreventionActive || !isTimerActive) return;
  suspensionPreventionActive = true;
  
  // Monitor page visibility changes
  if (!visibilityChangeListener) {
    visibilityChangeListener = () => {
      if (!isExtensionContextValid()) return;
      
      if (document.visibilityState === 'hidden' && isTimerActive) {
        // Page is hidden, increase activity to prevent suspension
        startKeepAliveActivity();
      } else if (document.visibilityState === 'visible') {
        // Page is visible, reduce activity
        stopKeepAliveActivity();
      }
    };
    document.addEventListener('visibilitychange', visibilityChangeListener);
  }
  
  // Listen for keep-alive messages from background script
  window.addEventListener('message', (event) => {
    if (event.data?.type === 'auto-reload-keep-alive' && isTimerActive) {
      // Respond to keep-alive signal
      performMinimalActivity();
    }
  });
  
  // Start immediate activity if page is already hidden
  if (document.visibilityState === 'hidden') {
    startKeepAliveActivity();
  }
}

// Start minimal background activity to prevent tab suspension
function startKeepAliveActivity() {
  if (keepAliveInterval || !isTimerActive) return;
  
  keepAliveInterval = setInterval(() => {
    if (!isExtensionContextValid() || !isTimerActive) {
      stopKeepAliveActivity();
      return;
    }
    
    performMinimalActivity();
  }, 25000); // Every 25 seconds
}

// Stop keep-alive activity
function stopKeepAliveActivity() {
  if (keepAliveInterval) {
    clearInterval(keepAliveInterval);
    keepAliveInterval = null;
  }
}

// Perform minimal activity to signal the page is active
function performMinimalActivity() {
  try {
    // Method 1: Minimal DOM manipulation
    const element = document.createElement('span');
    element.style.cssText = 'position:absolute;left:-9999px;width:1px;height:1px;opacity:0;pointer-events:none;';
    element.setAttribute('data-auto-reload-keepalive', Date.now().toString());
    document.body.appendChild(element);
    
    // Remove it immediately
    setTimeout(() => {
      if (element.parentNode) {
        element.parentNode.removeChild(element);
      }
    }, 1);
    
    // Method 2: Update localStorage
    localStorage.setItem('auto-reload-last-activity', Date.now().toString());
    
    // Method 3: Send runtime message to maintain extension connection
    if (isExtensionContextValid()) {
      chrome.runtime.sendMessage({ action: 'tabKeepAlive' }).catch(() => {
        // Ignore errors
      });
    }
  } catch (e) {
    // Ignore any errors
  }
}

// Clean up listeners and intervals
function cleanup() {
  suspensionPreventionActive = false;
  if (visibilityChangeListener) {
    document.removeEventListener('visibilitychange', visibilityChangeListener);
    visibilityChangeListener = null;
  }
  stopKeepAliveActivity();
}

// Check for reload status on page load
chrome.runtime.sendMessage({ action: 'getCurrentTabId' }, (response) => {
  if (response && response.tabId) {
    chrome.storage.local.get(`tab_${response.tabId}`, (result) => {
      const tabData = result[`tab_${response.tabId}`];
      if (tabData && tabData.active) {
        isTimerActive = true;
        if (!document.title.startsWith(TAB_MARKER)) {
          originalTitle = document.title;
          document.title = TAB_MARKER + document.title;
        }
        startSuspensionPrevention();
      }
    });
  }
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (!isExtensionContextValid()) return;

  if (request.action === 'updateTabTitle') {
    const wasActive = isTimerActive;
    isTimerActive = request.active;
    
    if (request.active) {
      if (!document.title.startsWith(TAB_MARKER)) {
        originalTitle = document.title;
        document.title = TAB_MARKER + document.title;
      }
      
      // Start suspension prevention
      if (!wasActive) {
        startSuspensionPrevention();
      }
    } else {
      if (document.title.startsWith(TAB_MARKER)) {
        document.title = originalTitle;
      }
      
      // Stop suspension prevention
      if (wasActive) {
        cleanup();
      }
    }
    sendResponse({ success: true });
  } else if (request.action === 'timerHeartbeat') {
    // Respond to heartbeat from background script
    if (isTimerActive) {
      performMinimalActivity();
      // Confirm we're still active
      sendResponse({ active: true, timestamp: Date.now() });
    } else {
      sendResponse({ active: false });
    }
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

// Clean up on page unload
window.addEventListener('beforeunload', cleanup);

// Prevent tab from being discarded
if ('onfreeze' in document) {
  document.addEventListener('freeze', (event) => {
    if (isTimerActive) {
      // Try to prevent freezing
      event.preventDefault();
      performMinimalActivity();
    }
  });
}

// Handle page freeze/resume events
if ('onresume' in document) {
  document.addEventListener('resume', () => {
    if (isTimerActive) {
      // Resume suspension prevention
      startSuspensionPrevention();
    }
  });
}
