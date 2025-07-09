/**
 * Utility functions for the Auto Reload extension
 */

export const TimerManager = {
  timers: new Map(),
  intervals: new Map(),
  startTimes: new Map(),

  start(tabId, interval = 30000) {
    this.stop(tabId);

    this.startTimes.set(tabId, Date.now());

    const timer = setInterval(() => {
      chrome.tabs
        .get(tabId)
        .then(() => {
          chrome.tabs.reload(tabId);
          this.startTimes.set(tabId, Date.now());
        })
        .catch(() => {
          this.stop(tabId);
        });
    }, interval);

    this.timers.set(tabId, timer);
    this.intervals.set(tabId, interval);

    chrome.storage.local.set({
      [`tab_${tabId}`]: {
        active: true,
        interval,
        startTime: this.startTimes.get(tabId),
      },
    });
  },

  stop(tabId) {
    const timer = this.timers.get(tabId);
    if (timer) {
      clearInterval(timer);
      this.timers.delete(tabId);
      this.intervals.delete(tabId);
      this.startTimes.delete(tabId);
    }

    chrome.storage.local.remove(`tab_${tabId}`);
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

  stopAll() {
    for (const tabId of this.timers.keys()) {
      this.stop(tabId);
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

  update(tabId) {
    const isActive = TimerManager.isActive(tabId);

    chrome.contextMenus.update('start-auto-reload', {
      visible: !isActive,
    });

    chrome.contextMenus.update('stop-auto-reload', {
      visible: isActive,
    });
  },
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
