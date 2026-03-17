const { app, nativeImage } = require('electron');
app.whenReady().then(async () => {
  try {
    const p = "/Users/suf1234/照片备份/重阳节, 2021年10月14日/IMG_6867.HEIC"; // Get an actual HEIC path from logs
    const img = await nativeImage.createThumbnailFromPath(p, { width: 200, height: 200 });
    console.log("Success! size:", img.getSize());
  } catch(e) {
    console.error("Failed:", e);
  }
  app.quit();
});
