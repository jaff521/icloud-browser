const { app } = require('electron');

app.whenReady().then(async () => {
  try {
    const p = "/Users/suf1234/照片备份/2021年10月11日/IMG_2558.HEIC";
    const start = Date.now();
    const icon = await app.getFileIcon(p, { size: 'normal' });
    console.log(`getFileIcon time: ${Date.now() - start}ms`);
    console.log('Icon size:', icon.getSize());
    
    // Also test quicklook if there is a way
  } catch (e) {
    console.error("Failed:", e);
  }
  app.quit();
});
