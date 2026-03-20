const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

async function processIcon(inputPath, outputPath) {
  try {
    const metadata = await sharp(inputPath).metadata();
    const size = Math.min(metadata.width, metadata.height);
    const radius = Math.floor(size * 0.17); // macOS rounded corner radius is approx 17%

    // Create a rounded rectangle mask
    const mask = Buffer.from(
      `<svg><rect x="0" y="0" width="${size}" height="${size}" rx="${radius}" ry="${radius}" fill="white" /></svg>`
    );

    await sharp(inputPath)
      .resize(size, size)
      .composite([{
        input: mask,
        blend: 'dest-in'
      }])
      .png()
      .toFile(outputPath);

    console.log(`Successfully processed icon: ${outputPath}`);
  } catch (err) {
    console.error('Error processing icon:', err);
    process.exit(1);
  }
}

const input = process.argv[2];
const output = process.argv[3];

if (!input || !output) {
  console.error('Usage: node process-icon.cjs <input> <output>');
  process.exit(1);
}

processIcon(input, output);
