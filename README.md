# Auto Reload Tabs Chrome Extension

A Chrome extension that automatically reloads browser tabs at specified intervals, similar to Vivaldi's built-in auto-reload feature.

## Features

- Right-click context menu to start/stop auto-reload
- Customizable reload intervals (seconds, minutes, hours)
- Preset timer buttons for quick setup
- Visual badge indicator showing reload status
- Multiple tabs can be tracked simultaneously
- Persistent settings that survive page navigation

## Installation

1. Open Chrome and go to `chrome://extensions/`
2. Enable "Developer mode" in the top right
3. Click "Load unpacked" and select the extension directory
4. The extension icon will appear in the toolbar

## Usage

### Using Context Menu
1. Right-click on any webpage
2. Select "Auto Reload" from the context menu
3. Choose "Start Auto Reload" to begin with default 30-second interval
4. Choose "Stop Auto Reload" to disable
5. Choose "Configure Timer" to open settings popup

### Using Extension Popup
1. Click the extension icon in the toolbar
2. Set custom intervals using hours, minutes, and seconds inputs
3. Use preset buttons for common intervals (10s, 30s, 1m, 5m, 10m, 30m, 1h)
4. Click "Start" to begin auto-reload
5. Click "Stop" to disable

## Files Structure

- `manifest.json` - Extension configuration
- `background.js` - Service worker handling timers and context menus
- `content.js` - Content script for page interaction
- `popup.html` - Extension popup interface
- `popup.js` - Popup functionality
- `icon16.svg`, `icon48.svg`, `icon128.svg` - Extension icons

## Permissions

This extension requires the following permissions:

### `tabs`
**Purpose**: Core functionality for tab management and reload operations
**Usage**: 
- `chrome.tabs.reload()` - Automatically reload tabs at specified intervals
- `chrome.tabs.get()` - Verify tab existence before operations to prevent errors
- `chrome.tabs.query()` - Get current active tab for popup interface
- `chrome.tabs.onRemoved` - Clean up timers when tabs are closed
- `chrome.tabs.onUpdated` - Restore timer state after page navigation

### `contextMenus`
**Purpose**: Right-click menu integration for easy access to reload controls
**Usage**:
- `chrome.contextMenus.create()` - Add "Auto Reload" menu items to page and extension icon contexts
- `chrome.contextMenus.update()` - Show/hide start/stop options based on current tab state
- `chrome.contextMenus.onClicked` - Handle user selections from context menu

### `storage`
**Purpose**: Persist timer settings across browser sessions
**Usage**:
- `chrome.storage.local.set()` - Save timer configuration (interval, active state, start time) per tab
- `chrome.storage.local.get()` - Restore timer settings when tabs are refreshed or browser restarts
- `chrome.storage.local.remove()` - Clean up storage when timers are stopped or tabs closed

### Content Script (`<all_urls>`)
**Purpose**: Tab title modification to show visual reload indicator
**Usage**:
- Inject content script into all web pages to modify `document.title`
- Add/remove reload emoji (⚡) prefix when timer starts/stops
- Communicate with background script for tab-specific operations

## Security & Privacy

- **No Data Collection**: Extension does not collect, store, or transmit any personal data
- **Local Storage Only**: All settings are stored locally using Chrome's storage API
- **No Network Access**: Extension operates entirely offline with no external connections
- **Minimal Permissions**: Only requests essential permissions for core functionality
