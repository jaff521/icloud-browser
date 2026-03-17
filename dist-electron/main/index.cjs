const { app, BrowserWindow, ipcMain, dialog, protocol, session, net } = require('electron');
const path = require('path');
const fs = require('fs');
const { Readable } = require('stream');
const util = require('util');

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

console.log('[Main] 主进程启动');

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
      corsEnabled: true
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
  if (ext.endsWith('.mov')) return 'video/quicktime';
  if (ext.endsWith('.mp4')) return 'video/mp4';
  if (ext.endsWith('.webm')) return 'video/webm';
  return 'application/octet-stream';
}

// 将本地协议 URL 转换回文件路径
function fromLocalUrl(url) {
  if (url.startsWith(`${localProtocol}://`)) {
    let filePath = url.slice(`${localProtocol}://`.length);
    // URL 解码
    filePath = decodeURIComponent(filePath);
    // 确保路径以 / 开头 (fix for macOS paths when using encodeURIComponent)
    if (!filePath.startsWith('/')) {
      filePath = '/' + filePath;
    }
    return filePath;
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
    show: false
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
    const urlObj = new URL(request.url);
    // Remove leading slash on Windows if it's like /C:/...
    let filePath = fromLocalUrl(request.url.split('?')[0]);
    const type = urlObj.searchParams.get('type'); // 'thumbnail' | 'preview' | 'video-thumb'

    logToFile('[Protocol] Request:', filePath, 'Type:', type, 'Raw URL:', request.url);

    try {
      let finalPath = filePath;
      let mimeType = getMimeType(filePath);
      
      const isHeic = filePath.toLowerCase().endsWith('.heic');
      const isVideo = mimeType.startsWith('video/');
      
      if (isVideo && type === 'video-thumb') {
         try {
           finalPath = await imageProcessor.processVideoThumbnail(filePath, type);
           mimeType = 'image/jpeg';
           logToFile('[Protocol] Processed video thumbnail path:', finalPath, 'MIME:', mimeType);
         } catch (err) {
           logToFile('[Protocol] Video thumbnail processing failed:', err);
         }
      } else if (!isVideo && (isHeic || type === 'thumbnail')) {
         const processType = type || (isHeic ? 'preview' : null);
         if (processType) {
            try {
              finalPath = await imageProcessor.processImage(filePath, processType);
              mimeType = 'image/jpeg';
              logToFile('[Protocol] Processed image path:', finalPath, 'MIME:', mimeType);
            } catch (err) {
              logToFile('[Protocol] Image processing failed:', err);
              if (isHeic) {
                const svgContent = `
                  <svg width="200" height="200" xmlns="http://www.w3.org/2000/svg">
                    <rect width="100%" height="100%" fill="#f0f0f0"/>
                    <text x="50%" y="50%" font-family="system-ui, sans-serif" font-size="14" fill="#666" text-anchor="middle" dy=".3em">Preview Unavailable</text>
                    <text x="50%" y="65%" font-family="system-ui, sans-serif" font-size="10" fill="#999" text-anchor="middle" dy=".3em">(HEIC Conversion Failed)</text>
                  </svg>
                `;
                return new Response(svgContent, {
                  status: 200,
                  headers: { 'Content-Type': 'image/svg+xml' }
                });
              }
            }
         }
      }

      if (fs.existsSync(finalPath)) {
        const fileUrl = require('url').pathToFileURL(finalPath).href;
        return net.fetch(fileUrl);
      } else {
        logToFile(`[Protocol] File not found on disk: ${finalPath}`);
      }
    } catch (error) {
      logToFile('[Protocol] Critical Error:', error.message);
      logToFile('[Protocol] Stack:', error.stack);
    }

    return new Response('Not Found', {
      status: 404,
      headers: { 'Content-Type': 'text/plain' }
    });
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
  console.log('[Main] 扫描完成，找到', count, '张照片');
  return count;
});

app.whenReady().then(() => {
  console.log('[Main] app.ready');
  imageProcessor.initialize();
  registerLocalProtocol();
  database.loadMetadata();
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
