const fs = require('fs');
const path = require('path');

console.log('[Database] 模块加载');

const METADATA_FILENAME = 'metadata.db';

let metadata = {
  rootPath: '',
  lastScanTime: 0,
  photos: []
};

function getMetadataPath() {
  return path.join(process.env.APPDATA || (process.platform === 'darwin' ? path.join(require('os').homedir(), 'Library/Application Support') : path.join(require('os').homedir(), '.config')), 'iCloud Browser', METADATA_FILENAME);
}

function loadMetadata() {
  const metadataPath = getMetadataPath();
  console.log('[Database] metadataPath:', metadataPath);
  try {
    if (fs.existsSync(metadataPath)) {
      const data = fs.readFileSync(metadataPath, 'utf-8');
      metadata = JSON.parse(data);
      console.log('[Database] 已加载现有元数据，照片数:', metadata.photos.length);
    }
  } catch (error) {
    console.error('[Database] 加载元数据错误:', error);
  }
  return metadata;
}

function saveMetadata() {
  const metadataPath = getMetadataPath();
  const dir = path.dirname(metadataPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));
  console.log('[Database] 元数据已保存到:', metadataPath);
}

function scanDirectory(rootPath) {
  console.log('[Database] scanDirectory 被调用, rootPath:', rootPath);
  loadMetadata();
  metadata.rootPath = rootPath;
  metadata.lastScanTime = Date.now();
  metadata.photos = [];

  const supportedExtensions = ['.heic', '.jpg', '.jpeg', '.png', '.mov', '.mp4', '.webp', '.gif', '.webm'];
  // 匹配目录名中的 YYYY年MM月DD日 格式
  const dateDirPattern = /(\d{4})年(\d{2})月(\d{2})日/;
  console.log('[Database] 支持的扩展名:', supportedExtensions);
  console.log('[Database] 目录日期正则:', dateDirPattern);

  let scannedFiles = 0;
  let matchedFiles = 0;

  function scanDir(currentDir, year, month, day) {
    if (!fs.existsSync(currentDir)) {
      console.log('[Database] 目录不存在:', currentDir);
      return;
    }

    const entries = fs.readdirSync(currentDir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);

      if (entry.isDirectory()) {
        // 检查目录名是否包含日期格式
        const dateMatch = entry.name.match(dateDirPattern);
        if (dateMatch) {
          // 更新日期信息并递归扫描子目录
          scanDir(fullPath, dateMatch[1], dateMatch[2], dateMatch[3]);
        } else {
          // 如果没有日期信息，保持当前日期继续扫描
          scanDir(fullPath, year, month, day);
        }
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name);

        // 只处理支持的文件格式
        if (supportedExtensions.includes(ext.toLowerCase())) {
          scannedFiles++;

          // 必须有日期信息才处理
          if (year && month && day) {
            matchedFiles++;
            const photo = {
              id: metadata.photos.length + 1,
              filename: entry.name,
              filePath: fullPath,
              year: year,
              month: month,
              day: day,
              dateCreated: `${year}-${month}-${day}`,
              isVideo: ext.toLowerCase() === '.mov' || ext.toLowerCase() === '.mp4' || ext.toLowerCase() === '.webm' ? 1 : 0
            };
            metadata.photos.push(photo);

            // 只打印前5个匹配的文件
            if (matchedFiles <= 5) {
              console.log('[Database] 匹配到文件:', entry.name, '日期:', year + '-' + month + '-' + day);
            }
          }
        }
      }
    }
  }

  scanDir(rootPath, null, null, null);
  console.log('[Database] 扫描统计: 扫描文件数:', scannedFiles, '匹配文件数:', matchedFiles);
  saveMetadata();
  return metadata.photos.length;
}

function getPhotos(options) {
  const { year, month, day, page = 1, limit = 50 } = options || {};

  let filtered = metadata.photos;
  if (year) {
    filtered = filtered.filter(p => p.year === year);
    if (month) {
      filtered = filtered.filter(p => p.month === month);
      if (day) {
        filtered = filtered.filter(p => p.day === day);
      }
    }
  }

  const sorted = filtered.sort((a, b) => {
    if (a.year !== b.year) return b.year.localeCompare(a.year);
    if (a.month !== b.month) return b.month.localeCompare(a.month);
    return b.day.localeCompare(a.day);
  });

  const start = (page - 1) * limit;
  return sorted.slice(start, start + limit);
}

function getYears() {
  const years = [...new Set(metadata.photos.map(p => p.year))];
  return years.sort().reverse();
}

function getMonths(year) {
  const months = metadata.photos
    .filter(p => p.year === year)
    .map(p => p.month);
  return [...new Set(months)].sort().reverse();
}

function getDays(year, month) {
  const days = metadata.photos
    .filter(p => p.year === year && p.month === month)
    .map(p => p.day);
  return [...new Set(days)].sort().reverse();
}

function getPhotoCount(year, month, day) {
  let filtered = metadata.photos;
  if (year) {
    filtered = filtered.filter(p => p.year === year);
    if (month) {
      filtered = filtered.filter(p => p.month === month);
      if (day) {
        filtered = filtered.filter(p => p.day === day);
      }
    }
  }
  return filtered.length;
}

module.exports = {
  loadMetadata,
  saveMetadata,
  scanDirectory,
  getPhotos,
  getYears,
  getMonths,
  getDays,
  getPhotoCount
};
