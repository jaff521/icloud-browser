const { contextBridge, ipcRenderer } = require('electron');

console.log('[Preload] 预加载脚本加载');

contextBridge.exposeInMainWorld('electronAPI', {
  selectDirectory: () => {
    console.log('[Preload] 调用 selectDirectory');
    return ipcRenderer.invoke('select-directory');
  },
  getYears: () => {
    console.log('[Preload] 调用 getYears');
    return ipcRenderer.invoke('get-years');
  },
  getMonths: (year) => {
    console.log('[Preload] 调用 getMonths, year:', year);
    return ipcRenderer.invoke('get-months', year);
  },
  getDays: (year, month) => {
    console.log('[Preload] 调用 getDays, year:', year, 'month:', month);
    return ipcRenderer.invoke('get-days', year, month);
  },
  getPhotos: (year, month, day, page, limit) => {
    console.log('[Preload] 调用 getPhotos, date:', year, month, day, 'page:', page);
    return ipcRenderer.invoke('get-photos', year, month, day, page, limit);
  },
  getPhotoCount: (year, month, day) => {
    console.log('[Preload] 调用 getPhotoCount, date:', year, month, day);
    return ipcRenderer.invoke('get-photo-count', year, month, day);
  },
  scanDirectory: (rootPath) => {
    console.log('[Preload] 调用 scanDirectory, path:', rootPath);
    return ipcRenderer.invoke('scan-directory', rootPath);
  }
});
