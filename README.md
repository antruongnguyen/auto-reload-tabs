# Auto Reload Tabs Chrome Extension

A modern Chrome extension that automatically reloads browser tabs with customizable intervals, featuring a beautiful glass-morphism UI and advanced timer management.

## ✨ Features

- **🔄 Automatic Tab Reloading**: Set custom intervals from 1 second to 23 hours
- **🎨 Modern Glass-morphism UI**: Beautiful, intuitive interface with backdrop blur effects
- **⚡ Visual Indicators**: Lightning bolt badges and tab title markers
- **🎯 Multi-tab Management**: Stop all timers across all tabs with one click
- **🎛️ Smart Controls**: Input fields lock when timer is active
- **⏱️ Real-time Countdown**: Live countdown with smooth animations
- **🖱️ Context Menu Integration**: Right-click access on pages and extension icon
- **💾 Persistent Settings**: Timer settings survive browser sessions and page navigation

## 🚀 Installation

### From Chrome Web Store
*Coming soon - will be published to Chrome Web Store*

### Development Installation
1. Clone this repository
2. Install dependencies: `npm install`
3. Build the extension: `npm run build`
4. Open Chrome and go to `chrome://extensions/`
5. Enable "Developer mode"
6. Click "Load unpacked" and select the `dist` folder

## 🛠️ Development

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Setup
```bash
git clone https://github.com/your-username/auto-reload-tabs.git
cd auto-reload-tabs
npm install
```

### Available Scripts
- `npm run dev` - Development build with watch mode
- `npm run build` - Production build
- `npm run build:prod` - Optimized production build
- `npm run lint` - Run ESLint
- `npm run format` - Format code with Prettier
- `npm run package` - Build and package extension for distribution
- `npm run clean` - Clean build directories

### Project Structure
```
src/
├── manifest.json          # Extension manifest
├── scripts/
│   ├── background.js      # Service worker
│   ├── content.js         # Content script
│   └── utils.js           # Shared utilities
├── popup/
│   ├── popup.html         # Popup interface
│   └── popup.js           # Popup controller
└── icons/                 # Extension icons

dist/                      # Built extension (generated)
```

### Build Tools
- **Vite**: Fast build tool with HMR support
- **@crxjs/vite-plugin**: Chrome extension development plugin
- **ESLint**: Code linting
- **Prettier**: Code formatting

## 📋 Usage

### Basic Usage
1. **Start Timer**: Click the extension icon and press "▶ Start Timer"
2. **Set Interval**: Use time inputs or preset buttons (10s, 30s, 1m, 5m, 10m, 30m, 1h, 2h)
3. **Stop Timer**: Click "⏹ Stop Timer" to halt reloading
4. **Stop All**: Use the dropdown menu to stop all active timers across tabs

### Context Menu
- Right-click on any webpage or the extension icon
- Select "Auto Reload" → "Start/Stop Auto Reload" or "Configure Timer"

### Visual Indicators
- **Extension Badge**: Lightning bolt (⚡) appears when timer is active
- **Tab Title**: Lightning bolt prefix shows in tab titles during reload

## 🔧 Technical Details

### Permissions
- `tabs` - Required for tab reloading and management
- `contextMenus` - Right-click menu integration  
- `storage` - Persist timer settings across sessions

### Architecture
- **Manifest V3** compatible
- **Service Worker** background script for timer management
- **Content Script** for tab title modifications
- **Glass-morphism UI** with backdrop blur effects
- **Modular ES6** code structure with utilities

### Browser Compatibility
- Chrome 88+
- Chromium-based browsers (Edge, Brave, etc.)

## 🚀 CI/CD & Release

### Automated Workflows
- **Build & Test**: Runs on every push and PR
- **Release**: Automatically packages and releases on version tags
- **Chrome Web Store**: Auto-publishes to Chrome Web Store on releases

### Release Process
1. Update version in `package.json` and `src/manifest.json`
2. Create and push a version tag: `git tag v2.0.0 && git push origin v2.0.0`
3. GitHub Actions will automatically:
   - Build and test the extension
   - Create a GitHub release with artifacts
   - Publish to Chrome Web Store

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes and ensure tests pass
4. Run linting: `npm run lint`
5. Format code: `npm run format`
6. Commit changes: `git commit -m 'Add amazing feature'`
7. Push to branch: `git push origin feature/amazing-feature`
8. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Glass-morphism design inspiration from modern web design trends
- Chrome Extension APIs and documentation
- Vite and modern build tool ecosystem

## 📞 Support

- 🐛 **Bug Reports**: [GitHub Issues](https://github.com/your-username/auto-reload-tabs/issues)
- 💡 **Feature Requests**: [GitHub Discussions](https://github.com/your-username/auto-reload-tabs/discussions)
- 📧 **Contact**: Create an issue for general questions

---

**Made with ❤️ by the Auto Reload Extension Team**