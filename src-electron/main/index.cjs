const { app, BrowserWindow, ipcMain, dialog, protocol, session, net, Menu, shell, clipboard, nativeImage, nativeTheme } = require('electron');
const path = require('path');
const fs = require('fs');
const { Readable } = require('stream');
const util = require('util');
const { exec } = require('child_process');
const execPromise = util.promisify(exec);

const LOG_FILE = path.join(process.cwd(), 'electron-debug.log');

function logToFile(...args) {
  const timestamp = new Date().toISOString();
  const message = util.format(...args);
  const logLine = `[${timestamp}] ${message}
`;
  
  // Also log to console for terminal visibility
  console.log(...args);

  try {
    fs.appendFileSync(LOG_FILE, logLine);
  } catch (e) {
    console.error('Failed to write to log file:', e);
  }
}

// Clear log file on startup
try {
  fs.writeFileSync(LOG_FILE, '--- Electron Debug Log Started ---\n');
} catch (e) {
  console.error('Failed to initialize log file:', e);
}
const database = require('../database.cjs');
const imageProcessor = require('./imageProcessor.cjs');

// Settings / Config Persistence
let userConfig = { theme: 'system', rootPath: null };
let configFilePath = '';

function loadConfig() {
  configFilePath = path.join(app.getPath('userData'), 'config.json');
  try {
    if (fs.existsSync(configFilePath)) {
      const data = fs.readFileSync(configFilePath, 'utf8');
      userConfig = { ...userConfig, ...JSON.parse(data) };
    }
  } catch (e) {
    console.error('Failed to load config:', e);
  }
}

function saveConfig(updates) {
  userConfig = { ...userConfig, ...updates };
  try {
    fs.writeFileSync(configFilePath, JSON.stringify(userConfig, null, 2));
  } catch (e) {
    console.error('Failed to save config:', e);
  }
}
let macosThumbnail;
try {
  macosThumbnail = require('../../native-thumbnail/build/Release/macos_thumbnail.node');
} catch (e) {
  console.error("Failed to load macos_thumbnail addon:", e);
}
console.log('[Main] 主进程启动');

// Enable HEVC (H.265) playback support for iOS videos
app.commandLine.appendSwitch('enable-features', 'PlatformHEVCDecoderSupport');

// 注册本地协议，用于加载本地文件
const localProtocol = 'local-file';

protocol.registerSchemesAsPrivileged([
  {
    scheme: localProtocol,
    privileges: {
      secure: true,
      standard: true,
      bypassCSP: true,
      supportFetchAPI: true,
      corsEnabled: true,
      stream: true
    }
  }
]);

let mainWindow;

// 获取 MIME 类型
function getMimeType(filePath) {
  const ext = filePath.toLowerCase();
  if (ext.endsWith('.png')) return 'image/png';
  if (ext.endsWith('.jpg') || ext.endsWith('.jpeg')) return 'image/jpeg';
  if (ext.endsWith('.gif')) return 'image/gif';
  if (ext.endsWith('.svg')) return 'image/svg+xml';
  if (ext.endsWith('.webp')) return 'image/webp';
  if (ext.endsWith('.heic')) return 'image/heic';
  if (ext.endsWith('.mov')) return 'video/mp4'; // Chromium prefers video/mp4 for smooth playback over video/quicktime
  if (ext.endsWith('.mp4')) return 'video/mp4';
  if (ext.endsWith('.webm')) return 'video/webm';
  return 'application/octet-stream';
}

// 将本地协议 URL 转换回文件路径
function fromLocalUrl(url) {
  try {
    const urlObj = new URL(url);
    if (urlObj.protocol !== `${localProtocol}:`) return decodeURIComponent(url);
    // Decode the pathname which should be like '/Users/suf1234/...'
    return decodeURIComponent(urlObj.pathname);
  } catch (e) {
    if (url.startsWith(`${localProtocol}://`)) {
      let filePath = url.slice(`${localProtocol}://local/`.length);
      filePath = decodeURIComponent(filePath);
      if (!filePath.startsWith('/')) {
        filePath = '/' + filePath;
      }
      return filePath;
    }
  }
  return decodeURIComponent(url);
}

function createWindow() {
  console.log('[Main] 创建窗口');
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    title: 'iCloud Browser',
    backgroundColor: '#1d1d1f',
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.cjs'),
      contextIsolation: true,
      nodeIntegration: false
    },
    titleBarStyle: 'hiddenInset',
    vibrancy: 'sidebar',
    visualEffectState: 'active',
    trafficLightPosition: { x: 20, y: 18 },
    show: false,
    icon: path.join(__dirname, '../../build/icon.png')
  });

  const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
  console.log('[Main] 开发模式:', isDev);

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../../dist/index.html'));
  }

  mainWindow.once('ready-to-show', () => {
    console.log('[Main] 窗口准备好显示');
    mainWindow.show();
  });

  mainWindow.on('closed', () => {
    console.log('[Main] 窗口关闭');
    mainWindow = null;
  });
}

// 注册本地文件协议处理
function registerLocalProtocol() {
  protocol.handle(localProtocol, async (request) => {
    try {
      const urlObj = new URL(request.url);
      const isThumbnail = urlObj.searchParams.get('type') === 'thumbnail';
      const sizeParam = urlObj.searchParams.get('size');
      const size = sizeParam ? parseInt(sizeParam, 10) : 200;
      
      let filePath = fromLocalUrl(request.url.split('?')[0]);
      
      logToFile(`[Protocol] Fetching: ${request.url} | isThumbnail: ${isThumbnail} | size: ${size} | filePath: ${filePath} | macosThumbnail: ${!!macosThumbnail}`);

      if (!fs.existsSync(filePath)) {
        logToFile(`[Protocol] File not found on disk: ${filePath}`);
        return new Response('Not Found', { status: 404 });
      }

      // If thumbnail requested and we have the native addon loaded
      if (isThumbnail && macosThumbnail) {
        try {
          const buffer = macosThumbnail.getThumbnail(filePath, size);
          return new Response(buffer, {
            headers: { 'Content-Type': 'image/jpeg' }
          });
        } catch (e) {
          logToFile(`[Protocol] Native thumbnail generation failed for ${filePath}: ${e.message}`);
          // Fall back to original file if thumbnail fails
        }
      }

      // Serve original file directly using net.fetch to preserve Range requests
      const fileUrl = require('url').pathToFileURL(filePath).href;
      const headers = new Headers(request.headers);
      
      // Override the content-type for .mov if needed
      const overrideMime = getMimeType(filePath);
      
      const fetchRequest = new Request(fileUrl, {
        method: request.method,
        headers: headers
      });
      
      const response = await net.fetch(fetchRequest);
      
      // We need to recreate the response to inject our target mime type
      const responseHeaders = new Headers(response.headers);
      if (overrideMime) {
        responseHeaders.set('content-type', overrideMime);
      }
      
      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: responseHeaders
      });
      
    } catch (error) {
      logToFile('[Protocol] Critical Error:', error.message);
      logToFile('[Protocol] Stack:', error.stack);
      return new Response('Internal error', { status: 500 });
    }
  });
  console.log('[Main] 本地协议已注册');
}

ipcMain.handle('select-directory', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openDirectory']
  });
  if (!result.canceled && result.filePaths.length > 0) {
    return result.filePaths[0];
  }
  return null;
});

ipcMain.handle('get-years', async () => {
  return database.getYears();
});

ipcMain.handle('get-months', async (event, year) => {
  return database.getMonths(year);
});

ipcMain.handle('get-days', async (event, year, month) => {
  return database.getDays(year, month);
});

ipcMain.handle('get-photos', async (event, year, month, day, page, limit) => {
  return database.getPhotos({ year, month, day, page, limit });
});

ipcMain.handle('get-photo-count', async (event, year, month, day) => {
  return database.getPhotoCount(year, month, day);
});

ipcMain.handle('scan-directory', async (event, rootPath) => {
  const count = database.scanDirectory(rootPath);
  saveConfig({ rootPath });
  console.log('[Main] 扫描完成，找到', count, '张照片');
  return count;
});

ipcMain.handle('get-config', () => userConfig);

ipcMain.handle('save-config', (event, updates) => {
  saveConfig(updates);
  return userConfig;
});

ipcMain.handle('set-theme', (event, theme) => {
  nativeTheme.themeSource = theme;
  saveConfig({ theme });
});

ipcMain.on('show-context-menu', (event, filePaths) => {
  const count = filePaths.length;
  const isMultiple = count > 1;
  const targetPath = filePaths[0];

  const template = [
    {
      label: isMultiple ? `Reveal ${count} Items in Finder` : 'Reveal in Finder',
      click: () => { shell.showItemInFolder(targetPath); }
    },
    {
      label: isMultiple ? `Copy ${count} Images` : 'Copy Image',
      click: () => {
        try {
          // macOS native clipboard for file objects (allows pasting directly into Finder/Apps)
          const plist = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
  <array>
${filePaths.map(p => `    <string>${p}</string>`).join('\n')}
  </array>
</plist>`;
          clipboard.writeBuffer('NSFilenamesPboardType', Buffer.from(plist, 'utf8'));
          logToFile(`[Clipboard] Successfully copied ${count} files to macOS clipboard via NSFilenamesPboardType plist.`);
        } catch (e) {
          logToFile(`[Clipboard Error] Failed to copy files: ${e}`);
          // Fallback to electron's native image block for the first image
          clipboard.writeImage(nativeImage.createFromPath(targetPath));
        }
      }
    },
    { type: 'separator' },
    { role: 'shareMenu' }
  ];
  const menu = Menu.buildFromTemplate(template);
  menu.popup({ window: BrowserWindow.fromWebContents(event.sender) });
});

ipcMain.on('start-drag', (event, filePaths) => {
  const iconName = path.join(__dirname, '../../build/icon.png');
  event.sender.startDrag({
    file: filePaths[0],
    files: filePaths,
    icon: iconName
  });
});

app.whenReady().then(() => {
  console.log('[Main] app.ready');
  loadConfig();
  nativeTheme.themeSource = userConfig.theme || 'system';
  imageProcessor.initialize();
  registerLocalProtocol();
  database.loadMetadata();
  
  // Set dock icon for macOS during development
  if (process.platform === 'darwin') {
    const iconPath = path.join(__dirname, '../../build/icon.png');
    if (fs.existsSync(iconPath)) {
      app.dock.setIcon(iconPath);
    }
  }
  
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
