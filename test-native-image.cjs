const { app, nativeImage } = require('electron');
const path = require('path');

app.whenReady().then(async () => {
  try {
    const p = "/Users/suf1234/照片备份/重阳节, 2021年10月14日/IMG_6867.HEIC";
    const img = await nativeImage.createThumbnailFromPath(p, { width: 400, height: 400 });
    console.log("Success! size:", img.getSize());
  } catch (e) {
    console.error("Failed:", e);
  }
  app.quit();
});
