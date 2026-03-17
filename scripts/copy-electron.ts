import fs from 'fs';
import path from 'path';

const srcDir = path.resolve('./src-electron');
const distDir = path.resolve('./dist-electron');

if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

function copyDir(src: string, dest: string) {
  if (!fs.existsSync(src)) {
    console.warn(`Source directory does not exist: ${src}`);
    return;
  }

  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }

  fs.readdirSync(src, { withFileTypes: true }).forEach((entry) => {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      if (!fs.existsSync(destPath)) {
        fs.mkdirSync(destPath, { recursive: true });
      }
      copyDir(srcPath, destPath);
    } else if (entry.isFile()) {
      fs.copyFileSync(srcPath, destPath);
      console.log(`Copied: ${srcPath} -> ${destPath}`);
    }
  });
}

copyDir(path.join(srcDir, 'main'), path.join(distDir, 'main'));
copyDir(path.join(srcDir, 'preload'), path.join(distDir, 'preload'));
fs.copyFileSync(path.join(srcDir, 'database.cjs'), path.join(distDir, 'database.cjs'));

console.log('Electron files copied to dist-electron/');
