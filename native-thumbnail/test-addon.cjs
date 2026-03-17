const path = require('path');
const addon = require('./build/Release/macos_thumbnail.node');

const p = "/Users/suf1234/照片备份/2021年10月11日/IMG_2558.HEIC";

try {
  const start = Date.now();
  const buffer = addon.getThumbnail(p, 200);
  console.log(`Addon time: ${Date.now() - start}ms`);
  console.log(`Buffer size: ${buffer.length} bytes`);
} catch (e) {
  console.error(e);
}
