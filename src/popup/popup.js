import { TimeFormatter } from '../scripts/utils.js';

/**
 * Popup interface controller
 */
class PopupController {
  constructor() {
    this.currentTabId = null;
    this.countdownInterval = null;
    this.elements = {};

    this.initializeElements();
    this.setupEventListeners();
    this.initialize();
  }

  initializeElements() {
    this.elements = {
      actionBtn: document.getElementById('actionBtn'),
      dropdownBtn: document.getElementById('dropdownBtn'),
      dropdownMenu: document.getElementById('dropdownMenu'),
      stopAllBtn: document.getElementById('stopAllBtn'),
      countdownDisplay: document.getElementById('countdownDisplay'),
      timerStatus: document.getElementById('timerStatus'),
      countdown: document.getElementById('countdown'),
      hoursInput: document.getElementById('hours'),
      minutesInput: document.getElementById('minutes'),
      secondsInput: document.getElementById('seconds'),
      presetButtons: document.querySelectorAll('.preset-btn'),
      intervalSection: document.getElementById('intervalSection'),
      timeLabels: document.querySelectorAll('.time-label'),
    };
  }

  async initialize() {
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });
    this.currentTabId = tab.id;
    this.updateStatus();
  }

  setupEventListeners() {
    // Main action button
    this.elements.actionBtn.addEventListener('click', () =>
      this.handleActionClick()
    );

    // Dropdown functionality
    this.elements.dropdownBtn.addEventListener('click', (e) =>
      this.toggleDropdown(e)
    );
    document.addEventListener('click', () => this.closeDropdown());

    // Stop all timers
    this.elements.stopAllBtn.addEventListener('click', () =>
      this.handleStopAll()
    );

    // Preset buttons
    this.elements.presetButtons.forEach((button) => {
      button.addEventListener('click', () => this.handlePresetClick(button));
    });

    // Tab updates
    chrome.tabs.onUpdated.addListener((tabId, changeInfo, _tab) => {
      if (tabId === this.currentTabId && changeInfo.status === 'complete') {
        this.updateStatus();
      }
    });

    // Cleanup on unload
    window.addEventListener('beforeunload', () => this.cleanup());
  }

  updateCountdown() {
    try {
      chrome.runtime.sendMessage(
        {
          action: 'getReloadStatus',
          tabId: this.currentTabId,
        },
        (response) => {
          if (chrome.runtime.lastError) {
            this.cleanup();
            return;
          }

          if (response && response.active && response.timeRemaining > 0) {
            this.elements.countdown.textContent = TimeFormatter.format(
              response.timeRemaining
            );
            this.elements.timerStatus.textContent = 'Next reload in';
            this.elements.countdownDisplay.classList.add('show', 'active');
          } else if (response && response.active) {
            this.elements.countdown.textContent = 'Reloading...';
            this.elements.timerStatus.textContent = 'Reloading now';
            this.elements.countdownDisplay.classList.add('show', 'active');
          } else {
            this.elements.countdownDisplay.classList.remove('show', 'active');
          }
        }
      );
    } catch (error) {
      console.debug('Extension context invalidated during countdown update');
      this.cleanup();
    }
  }

  updateStatus() {
    try {
      chrome.runtime.sendMessage(
        {
          action: 'getReloadStatus',
          tabId: this.currentTabId,
        },
        (response) => {
          if (chrome.runtime.lastError) {
            console.debug('Extension context invalidated during status update');
            return;
          }

          if (response && response.active) {
            this.setActiveState(response);
          } else {
            this.setInactiveState();
          }
        }
      );
    } catch (error) {
      console.debug('Extension context invalidated during status update');
    }
  }

  setActiveState(response) {
    this.elements.actionBtn.textContent = '⏹ Stop Timer';
    this.elements.actionBtn.className = 'action-button stop-btn';

    const { hours, minutes, seconds } = TimeFormatter.toInputs(
      response.interval
    );

    this.elements.hoursInput.value = hours;
    this.elements.minutesInput.value = minutes;
    this.elements.secondsInput.value = seconds;

    this.elements.countdownDisplay.classList.add('show', 'active');
    this.lockIntervalControls(true);
    this.updatePresetButtonState(response.interval / 1000);

    if (this.countdownInterval) clearInterval(this.countdownInterval);
    this.countdownInterval = setInterval(() => this.updateCountdown(), 1000);
    this.updateCountdown();
  }

  setInactiveState() {
    this.elements.actionBtn.textContent = '▶ Start Timer';
    this.elements.actionBtn.className = 'action-button start-btn';

    this.elements.countdownDisplay.classList.remove('show', 'active');
    this.lockIntervalControls(false);
    this.clearPresetButtonState();

    this.cleanup();
  }

  handleActionClick() {
    try {
      chrome.runtime.sendMessage(
        {
          action: 'getReloadStatus',
          tabId: this.currentTabId,
        },
        (response) => {
          if (chrome.runtime.lastError) {
            console.debug(
              'Extension context invalidated during action button click'
            );
            return;
          }

          if (response && response.active) {
            this.stopTimer();
          } else {
            this.startTimer();
          }
        }
      );
    } catch (error) {
      console.debug('Extension context invalidated during action button click');
    }
  }

  startTimer() {
    const interval = TimeFormatter.parseInputs(
      parseInt(this.elements.hoursInput.value) || 0,
      parseInt(this.elements.minutesInput.value) || 0,
      parseInt(this.elements.secondsInput.value) || 0
    );

    chrome.runtime.sendMessage(
      {
        action: 'startAutoReload',
        tabId: this.currentTabId,
        interval,
      },
      () => {
        if (!chrome.runtime.lastError) {
          this.updateStatus();
        }
      }
    );
  }

  stopTimer() {
    chrome.runtime.sendMessage(
      {
        action: 'stopAutoReload',
        tabId: this.currentTabId,
      },
      () => {
        if (!chrome.runtime.lastError) {
          this.updateStatus();
        }
      }
    );
  }

  toggleDropdown(e) {
    e.stopPropagation();
    this.elements.dropdownMenu.classList.toggle('show');
  }

  closeDropdown() {
    this.elements.dropdownMenu.classList.remove('show');
  }

  async handleStopAll() {
    try {
      this.closeDropdown();

      const tabs = await chrome.tabs.query({});
      const promises = tabs.map((tab) =>
        chrome.runtime
          .sendMessage({
            action: 'stopAutoReload',
            tabId: tab.id,
          })
          .catch(() => {})
      );

      await Promise.all(promises);
      this.updateStatus();
    } catch (error) {
      console.debug('Extension context invalidated during stop all');
    }
  }

  handlePresetClick(button) {
    const seconds = parseInt(button.dataset.seconds);
    const {
      hours,
      minutes,
      seconds: secs,
    } = TimeFormatter.toInputs(seconds * 1000);

    this.elements.hoursInput.value = hours;
    this.elements.minutesInput.value = minutes;
    this.elements.secondsInput.value = secs;

    this.updatePresetButtonState(seconds);
  }

  lockIntervalControls(locked) {
    this.elements.intervalSection.classList.toggle('locked', locked);

    this.elements.hoursInput.disabled = locked;
    this.elements.minutesInput.disabled = locked;
    this.elements.secondsInput.disabled = locked;

    this.elements.presetButtons.forEach((btn) => {
      btn.disabled = locked;
    });

    this.elements.timeLabels.forEach((label) => {
      label.classList.toggle('disabled', locked);
    });
  }

  updatePresetButtonState(currentSeconds) {
    this.elements.presetButtons.forEach((btn) => {
      const btnSeconds = parseInt(btn.dataset.seconds);
      btn.classList.toggle('active', btnSeconds === currentSeconds);
    });
  }

  clearPresetButtonState() {
    this.elements.presetButtons.forEach((btn) =>
      btn.classList.remove('active')
    );
  }

  cleanup() {
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
      this.countdownInterval = null;
    }
  }
}

// Initialize popup when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new PopupController();
});
