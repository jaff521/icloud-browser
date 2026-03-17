const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const sharp = require('sharp');
const { app } = require('electron');
const { execFile } = require('child_process');
const util = require('util');
const execFilePromise = util.promisify(execFile);

const LOG_FILE = path.join(process.cwd(), 'electron-debug.log');

function logToFile(...args) {
  const timestamp = new Date().toISOString();
  const message = util.format(...args);
  const logLine = `[${timestamp}] [ImageProcessor] ${message}
`;
  console.log(...args);
  try {
    fs.appendFileSync(LOG_FILE, logLine);
  } catch (e) {
    console.error('Failed to write to log file:', e);
  }
}

let cacheDir = '';

function initialize() {
  const userDataPath = app.getPath('userData');
  cacheDir = path.join(userDataPath, 'image_cache');
  
  if (!fs.existsSync(cacheDir)) {
    fs.mkdirSync(cacheDir, { recursive: true });
  }
  logToFile('Cache directory initialized:', cacheDir);
}

function getCacheKey(filePath, mtimeMs, type) {
  const data = `${filePath}:${mtimeMs}:${type}`;
  return crypto.createHash('md5').update(data).digest('hex');
}

/**
 * Process an image (specifically HEIC) and return the path to the converted/resized version.
 * @param {string} filePath - Path to the original file
 * @param {string} type - 'thumbnail' or 'preview'
 * @returns {Promise<string>} - Path to the processed file
 */
async function processImage(filePath, type = 'preview') {
  if (!cacheDir) {
    initialize();
  }

  try {
    // Check if file exists and get stats
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }
    const stat = fs.statSync(filePath);
    
    // Generate cache key
    const cacheKey = getCacheKey(filePath, stat.mtimeMs, type);
    const cacheFilePath = path.join(cacheDir, `${cacheKey}.jpg`);

    // Check cache hit
    if (fs.existsSync(cacheFilePath)) {
      logToFile('Cache hit:', cacheFilePath);
      return cacheFilePath;
    }

    // Cache miss - process image
    logToFile(`Processing ${type} for: ${filePath}`);
    
    // Check if it's HEIC
    const isHeic = filePath.toLowerCase().endsWith('.heic');

    if (isHeic) {
       // Use sips for HEIC
       try {
         const args = ['-s', 'format', 'jpeg'];
         
         if (type === 'thumbnail') {
            args.push('-Z', '200'); // Max dimension 200
            args.push('-s', 'formatOptions', '80'); // Quality 80
         } else {
            args.push('-Z', '1920'); // Max dimension 1920
            args.push('-s', 'formatOptions', '85'); // Quality 85
         }
         
         args.push(filePath);
         args.push('--out');
         args.push(cacheFilePath);

         logToFile('Running sips command:', 'sips', args.join(' '));
         const { stdout, stderr } = await execFilePromise('sips', args);
         if (stdout) logToFile('sips stdout:', stdout);
         if (stderr) logToFile('sips stderr:', stderr);

         if (fs.existsSync(cacheFilePath) && fs.statSync(cacheFilePath).size > 0) {
           return cacheFilePath;
         } else {
           throw new Error('sips produced no output or empty file');
         }
       } catch (sipsError) {
         logToFile('sips processing failed:', sipsError);
         throw sipsError; // Don't fall through to sharp for HEIC, it will likely fail too
       }
     }

     // Fallback to sharp for non-HEIC
     let pipeline = sharp(filePath);

    if (type === 'thumbnail') {
      // Thumbnail: Resize to 200px width, auto height, lower quality
      pipeline = pipeline
        .resize(200, null, { withoutEnlargement: true })
        .jpeg({ quality: 80 });
    } else {
      // Preview: Resize to reasonable screen size (e.g. 1920px), higher quality
      // Only resize if larger than target
      pipeline = pipeline
        .resize(1920, 1080, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 85 });
    }

    await pipeline.toFile(cacheFilePath);
    // console.log('[ImageProcessor] Processed and cached:', cacheFilePath);
    
    return cacheFilePath;

  } catch (error) {
    logToFile('Error processing image:', error);
    // Return original file path as fallback if everything fails
    // This allows the frontend to at least try to display something (or fail gracefully)
    // But for HEIC in browser, it won't work.
    // Ideally we should have a generic "error placeholder" image.
    // For now, rethrowing allows the caller to handle it (e.g. return 404 or original)
    throw error;
  }
}

/**
 * Process a video and return the path to the extracted thumbnail.
 */
async function processVideoThumbnail(filePath, type = 'video-thumb') {
  if (!cacheDir) initialize();

  try {
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }
    const stat = fs.statSync(filePath);
    const cacheKey = getCacheKey(filePath, stat.mtimeMs, type);
    const cacheFilePath = path.join(cacheDir, `${cacheKey}.jpg`);

    if (fs.existsSync(cacheFilePath)) {
      return cacheFilePath;
    }

    logToFile(`Processing video thumbnail for: ${filePath}`);

    // Try ffmpeg first
    try {
      const args = ['-y', '-i', filePath, '-vframes', '1', '-q:v', '2', cacheFilePath];
      logToFile('Running ffmpeg command:', 'ffmpeg', args.join(' '));
      await execFilePromise('ffmpeg', args);
      if (fs.existsSync(cacheFilePath) && fs.statSync(cacheFilePath).size > 0) {
        return cacheFilePath;
      }
    } catch (ffmpegError) {
      logToFile('ffmpeg failed, trying qlmanage:', ffmpegError.message);
      // Fallback to macOS qlmanage
      const qlArgs = ['-t', '-s', '200', '-o', cacheDir, filePath];
      logToFile('Running qlmanage command:', 'qlmanage', qlArgs.join(' '));
      await execFilePromise('qlmanage', qlArgs);
      
      const generatedName = path.basename(filePath) + '.png';
      const generatedPath = path.join(cacheDir, generatedName);
      
      if (fs.existsSync(generatedPath)) {
        // Convert the png to jpg to match the expected format and extension, using sharp
        await sharp(generatedPath).jpeg({ quality: 85 }).toFile(cacheFilePath);
        // Clean up the temporary png
        fs.unlinkSync(generatedPath);
        return cacheFilePath;
      }
    }

    throw new Error('Video thumbnail generation failed via both ffmpeg and qlmanage');
  } catch (error) {
    logToFile('Error processing video thumbnail:', error.message);
    throw error;
  }
}

module.exports = {
  initialize,
  processImage,
  processVideoThumbnail
};
