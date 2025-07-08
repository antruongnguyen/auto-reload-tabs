document.addEventListener('DOMContentLoaded', async () => {
  const actionBtn = document.getElementById('actionBtn');
  const countdownEl = document.getElementById('countdown');
  const hoursInput = document.getElementById('hours');
  const minutesInput = document.getElementById('minutes');
  const secondsInput = document.getElementById('seconds');
  const presetButtons = document.querySelectorAll('.preset-btn');
  const intervalSection = document.getElementById('intervalSection');
  const timeLabels = document.querySelectorAll('.time-label');

  let currentTabId;
  let countdownInterval;

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  currentTabId = tab.id;

  function formatTime(seconds) {
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
  }

  function updateCountdown() {
    try {
      chrome.runtime.sendMessage({
        action: "getReloadStatus",
        tabId: currentTabId
      }, (response) => {
        if (chrome.runtime.lastError) {
          console.debug('Extension context invalidated during countdown update');
          if (countdownInterval) {
            clearInterval(countdownInterval);
            countdownInterval = null;
          }
          return;
        }

        countdownEl.hidden = !(response && response.active);
        if (response && response.active && response.timeRemaining > 0) {
          countdownEl.textContent = formatTime(response.timeRemaining);
          countdownEl.classList.add('active');
        } else if (response && response.active) {
          countdownEl.textContent = "Reloading...";
          countdownEl.classList.add('active');
        } else {
          countdownEl.hidden = true;
          countdownEl.textContent = "";
          countdownEl.classList.remove('active');
        }
      });
    } catch (error) {
      console.debug('Extension context invalidated during countdown update');
      if (countdownInterval) {
        clearInterval(countdownInterval);
        countdownInterval = null;
      }
    }
  }

  function updateStatus() {
    try {
      chrome.runtime.sendMessage({
        action: "getReloadStatus",
        tabId: currentTabId
      }, (response) => {
        if (chrome.runtime.lastError) {
          console.debug('Extension context invalidated during status update');
          return;
        }
        
        if (response && response.active) {
          actionBtn.textContent = "Stop Auto Reload";
          actionBtn.className = "action-button stop-btn";
          
          const totalSeconds = response.interval / 1000;
          const hours = Math.floor(totalSeconds / 3600);
          const minutes = Math.floor((totalSeconds % 3600) / 60);
          const seconds = totalSeconds % 60;
          
          hoursInput.value = hours;
          minutesInput.value = minutes;
          secondsInput.value = seconds;
          
          // Lock interval controls
          lockIntervalControls(true);
          
          // Update preset button active state
          updatePresetButtonState(response.interval / 1000);
          
          if (countdownInterval) clearInterval(countdownInterval);
          countdownInterval = setInterval(updateCountdown, 1000);
          updateCountdown();
        } else {
          actionBtn.textContent = "Start Auto Reload";
          actionBtn.className = "action-button start-btn";
          countdownEl.hidden = true;
          countdownEl.textContent = "";
          countdownEl.classList.remove('active');
          
          // Unlock interval controls
          lockIntervalControls(false);
          
          // Clear preset button active state
          presetButtons.forEach(btn => btn.classList.remove('active'));
          
          if (countdownInterval) {
            clearInterval(countdownInterval);
            countdownInterval = null;
          }
        }
      });
    } catch (error) {
      console.debug('Extension context invalidated during status update');
    }
  }

  function getIntervalFromInputs() {
    const hours = parseInt(hoursInput.value) || 0;
    const minutes = parseInt(minutesInput.value) || 0;
    const seconds = parseInt(secondsInput.value) || 0;
    
    const totalSeconds = hours * 3600 + minutes * 60 + seconds;
    return Math.max(1, totalSeconds) * 1000;
  }

  function setIntervalFromSeconds(totalSeconds) {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    
    hoursInput.value = hours;
    minutesInput.value = minutes;
    secondsInput.value = seconds;
  }

  actionBtn.addEventListener('click', () => {
    try {
      chrome.runtime.sendMessage({
        action: "getReloadStatus",
        tabId: currentTabId
      }, (response) => {
        if (chrome.runtime.lastError) {
          console.debug('Extension context invalidated during action button click');
          return;
        }
        
        if (response && response.active) {
          chrome.runtime.sendMessage({
            action: "stopAutoReload",
            tabId: currentTabId
          }, () => {
            if (!chrome.runtime.lastError) {
              updateStatus();
            }
          });
        } else {
          const interval = getIntervalFromInputs();
          chrome.runtime.sendMessage({
            action: "startAutoReload",
            tabId: currentTabId,
            interval: interval
          }, () => {
            if (!chrome.runtime.lastError) {
              updateStatus();
            }
          });
        }
      });
    } catch (error) {
      console.debug('Extension context invalidated during action button click');
    }
  });

  function lockIntervalControls(locked) {
    intervalSection.classList.toggle('locked', locked);
    
    // Lock/unlock input fields
    hoursInput.disabled = locked;
    minutesInput.disabled = locked;
    secondsInput.disabled = locked;
    
    // Lock/unlock preset buttons
    presetButtons.forEach(btn => {
      btn.disabled = locked;
    });
    
    // Update time labels appearance
    timeLabels.forEach(label => {
      label.classList.toggle('disabled', locked);
    });
  }

  function updatePresetButtonState(currentSeconds) {
    presetButtons.forEach(btn => {
      const btnSeconds = parseInt(btn.dataset.seconds);
      if (btnSeconds === currentSeconds) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
  }

  presetButtons.forEach(button => {
    button.addEventListener('click', () => {
      const seconds = parseInt(button.dataset.seconds);
      setIntervalFromSeconds(seconds);
      updatePresetButtonState(seconds);
    });
  });

  chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (tabId === currentTabId && changeInfo.status === "complete") {
      updateStatus();
    }
  });

  window.addEventListener('beforeunload', () => {
    if (countdownInterval) {
      clearInterval(countdownInterval);
    }
  });

  updateStatus();
});
