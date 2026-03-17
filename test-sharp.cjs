const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const p = "/Users/suf1234/照片备份/2021年10月11日/IMG_2558.HEIC";

async function test() {
  const start = Date.now();
  const buffer = await sharp(p).resize(400).jpeg().toBuffer();
  console.log(`Time taken: ${Date.now() - start}ms`);
  console.log(`Buffer size: ${buffer.length} bytes`);
}

test();
