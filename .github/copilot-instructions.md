# Electron App Development Guide

## Agent Skills
- Proficient in macOS desktop app development
- Familiar with Electron and other cross-platform frameworks

## Architecture Overview
This is a minimal Electron application with three main components:
- **Main Process** (`main.js`): Controls app lifecycle and creates browser windows
- **Renderer Process** (`index.html` + `renderer.js`): UI and client-side logic
- **Preload Script** (`preload.js`): Secure bridge for IPC communication

## IPC Communication Pattern
Use `contextBridge` in preload to expose safe APIs to renderer. Always whitelist IPC channels for security.

**Example from codebase:**
```javascript
// preload.js - Expose API with whitelisted channels
contextBridge.exposeInMainWorld('electronAPI', {
  send: (channel, data) => {
    const validChannels = ['toMain']
    if (validChannels.includes(channel)) ipcRenderer.send(channel, data)
  },
  on: (channel, func) => {
    const validChannels = ['fromMain']
    if (validChannels.includes(channel)) {
      ipcRenderer.on(channel, (event, ...args) => func(...args))
    }
  }
})

// renderer.js - Use exposed API
window.electronAPI.send('toMain', 'Ping from renderer')
window.electronAPI.on('fromMain', (msg) => {
  document.getElementById('reply').innerText = msg
})

// main.js - Handle IPC
ipcMain.on('toMain', (event, args) => {
  console.log('Received in main:', args)
  event.sender.send('fromMain', 'Pong from main')
})
```

## Development Workflow
- **Run app**: `npm start` (launches Electron)
- **Debug main process**: Use VS Code debugger with Electron launch config
- **Debug renderer**: Open DevTools in app window (Ctrl+Shift+I)

## Key Files
- `package.json`: Defines main entry point (`main.js`) and start script (`npm start`)
- `main.js`: Window creation, app lifecycle, IPC handlers
- `preload.js`: Security boundary with whitelisted IPC channels
- `renderer.js`: DOM manipulation and IPC calls
- `index.html`: Basic UI structure with button for ping/pong demo

## Conventions
- IPC channels: Use descriptive names like 'toMain', 'fromMain'; whitelist in preload.js
- Error handling: Log to console in main process
- Window config: Set `webPreferences.preload` in BrowserWindow options
- UI text: May include Chinese characters (e.g., "发送到主进程")

## Security Notes
Never expose `ipcRenderer` directly. Always use `contextBridge` with channel validation.

## Adding New Features
- For new IPC communication: Update whitelisted channels in `preload.js`, add handler in `main.js`, call from `renderer.js`
- Follow the existing ping/pong pattern for request-response IPC