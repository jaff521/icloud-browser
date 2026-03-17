const { execFile } = require('child_process');
const util = require('util');
const path = require('path');
const execFilePromise = util.promisify(execFile);
const p = "/Users/suf1234/照片备份/2021年10月11日/IMG_2558.HEIC";
const tempDir = process.cwd();

async function testSips() {
  const start = Date.now();
  await execFilePromise('sips', ['-Z', '200', '-s', 'format', 'jpeg', p, '--out', path.join(tempDir, 'out_sips.jpg')]);
  console.log('sips time:', Date.now() - start);
}

async function testQlmanage() {
  const start = Date.now();
  await execFilePromise('qlmanage', ['-t', '-s', '200', '-o', tempDir, p]);
  console.log('qlmanage time:', Date.now() - start);
}

async function run() {
  await testSips();
  await testQlmanage();
}
run();
