/**
 * Utility functions for the Auto Reload extension
 */

export const TimerManager = {
  timers: new Map(),
  intervals: new Map(),
  startTimes: new Map(),

  async start(tabId, interval = 30000) {
    this.stop(tabId);

    this.startTimes.set(tabId, Date.now());

    const timer = setInterval(async () => {
      try {
        // Check if tab exists and is not discarded
        const tab = await chrome.tabs.get(tabId);

        if (tab.discarded) {
          console.debug(`Tab ${tabId} is discarded, reloading to restore functionality`);
        }

        // Reload the tab
        await chrome.tabs.reload(tabId);
        this.startTimes.set(tabId, Date.now());

        // Update storage with new start time
        await chrome.storage.local.set({
          [`tab_${tabId}`]: {
            active: true,
            interval,
            startTime: this.startTimes.get(tabId),
            lastReload: Date.now(),
          },
        });

        // Send message to content script to ensure it's active
        chrome.tabs.sendMessage(tabId, {
          action: 'timerHeartbeat',
          timestamp: Date.now()
        }).catch(() => {
          // Content script might not be ready, ignore error
        });

      } catch (error) {
        console.debug(`Tab ${tabId} no longer exists, stopping timer`);
        await this.stop(tabId);
      }
    }, interval);

    this.timers.set(tabId, timer);
    this.intervals.set(tabId, interval);

    // Store timer state in persistent storage
    await chrome.storage.local.set({
      [`tab_${tabId}`]: {
        active: true,
        interval,
        startTime: this.startTimes.get(tabId),
        lastReload: Date.now(),
      },
    });

    // Also store in global timer list for recovery
    const activeTimers = await chrome.storage.local.get('activeTimers');
    const timerList = activeTimers.activeTimers || [];
    if (!timerList.includes(tabId)) {
      timerList.push(tabId);
      await chrome.storage.local.set({ activeTimers: timerList });
    }
  },

  async stop(tabId) {
    const timer = this.timers.get(tabId);
    if (timer) {
      clearInterval(timer);
      this.timers.delete(tabId);
      this.intervals.delete(tabId);
      this.startTimes.delete(tabId);
    }

    // Remove from storage
    await chrome.storage.local.remove(`tab_${tabId}`);

    // Remove from global timer list
    const activeTimers = await chrome.storage.local.get('activeTimers');
    const timerList = activeTimers.activeTimers || [];
    const updatedList = timerList.filter(id => id !== tabId);
    await chrome.storage.local.set({ activeTimers: updatedList });
  },

  isActive(tabId) {
    return this.timers.has(tabId);
  },

  getTimeRemaining(tabId) {
    if (!this.isActive(tabId)) return 0;

    const startTime = this.startTimes.get(tabId);
    const interval = this.intervals.get(tabId);

    if (!startTime || !interval) return 0;

    const elapsed = Date.now() - startTime;
    return Math.max(0, (interval - elapsed) / 1000);
  },

  getInterval(tabId) {
    return this.intervals.get(tabId) || 30000;
  },

  async stopAll() {
    for (const tabId of this.timers.keys()) {
      await this.stop(tabId);
    }
  },

  // Recovery method to restore timers from storage
  async recoverTimers() {
    try {
      const activeTimers = await chrome.storage.local.get('activeTimers');
      const timerList = activeTimers.activeTimers || [];

      for (const tabId of timerList) {
        const result = await chrome.storage.local.get(`tab_${tabId}`);
        const tabData = result[`tab_${tabId}`];

        if (tabData && tabData.active) {
          try {
            // Check if tab still exists
            await chrome.tabs.get(tabId);

            // Calculate how much time should have passed
            const elapsed = Date.now() - tabData.startTime;
            const shouldHaveReloaded = Math.floor(elapsed / tabData.interval);

            // If we missed reloads, do one now and reset timer
            if (shouldHaveReloaded > 0) {
              await chrome.tabs.reload(tabId);
              await this.start(tabId, tabData.interval);
            } else {
              // Resume with remaining time
              const remainingTime = tabData.interval - (elapsed % tabData.interval);
              setTimeout(() => {
                this.start(tabId, tabData.interval);
              }, remainingTime);
            }
          } catch (error) {
            // Tab no longer exists, clean up
            await this.stop(tabId);
          }
        }
      }
    } catch (error) {
      console.error('Error recovering timers:', error);
    }
  },
};

export const BadgeManager = {
  update(tabId, active) {
    chrome.tabs
      .get(tabId)
      .then(() => {
        chrome.action.setBadgeText({
          tabId,
          text: active ? '⚡' : '',
        });
        chrome.action.setBadgeBackgroundColor({
          tabId,
          color: '#444444',
        });

        chrome.tabs
          .sendMessage(tabId, {
            action: 'updateTabTitle',
            active,
          })
          .catch(() => {
            // Ignore errors if content script is not loaded
          });
      })
      .catch(() => {
        // Tab no longer exists, ignore badge update
      });
  },
};

export const ContextMenuManager = {
  create() {
    chrome.contextMenus.create({
      id: 'auto-reload-menu',
      title: 'Auto Reload',
      contexts: ['page', 'action'],
    });

    chrome.contextMenus.create({
      id: 'start-auto-reload',
      parentId: 'auto-reload-menu',
      title: 'Start Auto Reload',
      contexts: ['page', 'action'],
    });

    chrome.contextMenus.create({
      id: 'stop-auto-reload',
      parentId: 'auto-reload-menu',
      title: 'Stop Auto Reload',
      contexts: ['page', 'action'],
    });

    chrome.contextMenus.create({
      id: 'configure-auto-reload',
      parentId: 'auto-reload-menu',
      title: 'Configure Timer',
      contexts: ['page', 'action'],
    });
  },

  update(_tabId) {
    // Get current active tab to update context menu for that specific tab
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs.length > 0) {
        const activeTabId = tabs[0].id;
        const isActive = TimerManager.isActive(activeTabId);

        chrome.contextMenus.update('start-auto-reload', {
          visible: !isActive,
        });

        chrome.contextMenus.update('stop-auto-reload', {
          visible: isActive,
        });
      }
    });
  },
};

export const ServiceWorkerManager = {
  keepAliveInterval: null,
  tabKeepAliveInterval: null,

  startKeepAlive() {
    // Send keep-alive message every 20 seconds
    this.keepAliveInterval = setInterval(() => {
      chrome.runtime.getPlatformInfo(() => {
        // This API call keeps the service worker alive
        if (chrome.runtime.lastError) {
          console.debug('Keep-alive ping failed:', chrome.runtime.lastError);
        }
      });
    }, 20000);
  },

  startTabKeepAlive() {
    // Prevent tab suspension by periodically interacting with active timer tabs
    this.tabKeepAliveInterval = setInterval(async () => {
      const activeTimers = await chrome.storage.local.get('activeTimers');
      const timerList = activeTimers.activeTimers || [];

      for (const tabId of timerList) {
        try {
          // Check if tab exists and is not discarded
          const tab = await chrome.tabs.get(tabId);

          // Inject a minimal script to keep tab active
          if (tab && !tab.discarded) {
            chrome.scripting.executeScript({
              target: { tabId },
              func: () => {
                // Minimal interaction to prevent suspension
                if (document.hidden) {
                  // Tab is hidden, send keep-alive signal
                  window.postMessage({ type: 'auto-reload-keep-alive' }, '*');
                }
              }
            }).catch(() => {
              // Ignore errors if script injection fails
            });
          }
        } catch (error) {
          // Tab no longer exists, will be cleaned up by timer manager
        }
      }
    }, 30000); // Every 30 seconds
  },

  stopKeepAlive() {
    if (this.keepAliveInterval) {
      clearInterval(this.keepAliveInterval);
      this.keepAliveInterval = null;
    }
  },

  stopTabKeepAlive() {
    if (this.tabKeepAliveInterval) {
      clearInterval(this.tabKeepAliveInterval);
      this.tabKeepAliveInterval = null;
    }
  },

  // Check if we have any active timers to determine if keep-alive is needed
  async shouldKeepAlive() {
    const activeTimers = await chrome.storage.local.get('activeTimers');
    const timerList = activeTimers.activeTimers || [];
    return timerList.length > 0;
  },

  async manageKeepAlive() {
    const shouldKeep = await this.shouldKeepAlive();

    if (shouldKeep) {
      if (!this.keepAliveInterval) {
        this.startKeepAlive();
      }
      if (!this.tabKeepAliveInterval) {
        this.startTabKeepAlive();
      }
    } else {
      if (this.keepAliveInterval) {
        this.stopKeepAlive();
      }
      if (this.tabKeepAliveInterval) {
        this.stopTabKeepAlive();
      }
    }
  }
};

export const TimeFormatter = {
  format(seconds) {
    if (seconds <= 0) return '';

    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    } else if (minutes > 0) {
      return `${minutes}:${secs.toString().padStart(2, '0')}`;
    } else {
      return `${secs}s`;
    }
  },

  parseInputs(hours, minutes, seconds) {
    const totalSeconds = hours * 3600 + minutes * 60 + seconds;
    return Math.max(1, totalSeconds) * 1000;
  },

  toInputs(totalMs) {
    const totalSeconds = totalMs / 1000;
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    return { hours, minutes, seconds };
  },
};
