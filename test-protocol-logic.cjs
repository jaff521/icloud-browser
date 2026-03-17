
const path = require('path');
const url = require('url');

const localProtocol = 'local-file';

function fromLocalUrl(urlStr) {
  if (urlStr.startsWith(`${localProtocol}://`)) {
    let filePath = urlStr.slice(`${localProtocol}://`.length);
    // URL 解码
    console.log('Before decode:', filePath);
    filePath = decodeURIComponent(filePath);
    console.log('After decode:', filePath);
    // 确保路径以 / 开头 (fix for macOS paths when using encodeURIComponent)
    if (!filePath.startsWith('/')) {
      filePath = '/' + filePath;
    }
    return filePath;
  }
  return decodeURIComponent(urlStr);
}

// Test cases
const tests = [
    {
        name: 'Standard English Path',
        input: 'local-file:///Users/name/Photos/IMG_1234.HEIC',
        expected: '/Users/name/Photos/IMG_1234.HEIC'
    },
    {
        name: 'Path with Spaces',
        input: 'local-file:///Users/name/My%20Photos/IMG_1234.HEIC',
        expected: '/Users/name/My Photos/IMG_1234.HEIC'
    },
    {
        name: 'Path with Chinese Characters (Encoded)',
        // /Users/name/照片备份/2023年
        // encodeURIComponent('/Users/name/照片备份/2023年')
        // %2FUsers%2Fname%2F%E7%85%A7%E7%89%87%E5%A4%87%E4%BB%BD%2F2023%E5%B9%B4
        input: 'local-file://%2FUsers%2Fname%2F%E7%85%A7%E7%89%87%E5%A4%87%E4%BB%BD%2F2023%E5%B9%B4%2FIMG_001.HEIC',
        expected: '/Users/name/照片备份/2023年/IMG_001.HEIC'
    },
    {
        name: 'Browser style URL (triple slash)',
        input: 'local-file:///Users/suf1234/%E7%85%A7%E7%89%87%E5%A4%87%E4%BB%BD/IMG_4671.HEIC',
        expected: '/Users/suf1234/照片备份/IMG_4671.HEIC'
    }
];

console.log('--- Starting Protocol Logic Tests ---');

let passed = 0;
for (const t of tests) {
    console.log(`
Test: ${t.name}`);
    console.log(`Input: ${t.input}`);
    const result = fromLocalUrl(t.input);
    console.log(`Result: ${result}`);
    console.log(`Expected: ${t.expected}`);
    
    if (result === t.expected) {
        console.log('✅ PASS');
        passed++;
    } else {
        console.log('❌ FAIL');
    }
}

console.log(`
Passed ${passed} / ${tests.length}`);
