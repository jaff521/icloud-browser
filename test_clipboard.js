const { app, clipboard } = require('electron');
app.whenReady().then(() => {
  const filePath = "/Users/suf1234/照片备份/2023年12月29日/IMG_6866.HEIC";
  const plist = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd"\>
<plist version="1.0">
  <array>
    <string>${filePath}</string>
  </array>
</plist>`;
  clipboard.writeBuffer('NSFilenamesPboardType', Buffer.from(plist, 'utf8'));
  console.log("Written to clipboard!");
  setTimeout(() => app.quit(), 1000);
});
