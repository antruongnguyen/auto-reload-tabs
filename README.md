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

- `tabs` - Required to reload tabs
- `contextMenus` - For right-click menu integration
- `storage` - To persist timer settings
- `activeTab` - To interact with current tab