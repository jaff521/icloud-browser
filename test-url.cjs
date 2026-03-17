function fromLocalUrl(url) {
  if (url.startsWith(`local-file://`)) {
    let filePath = url.slice(`local-file://`.length);
    filePath = decodeURIComponent(filePath);
    if (!filePath.startsWith('/')) {
      filePath = '/' + filePath;
    }
    return filePath;
  }
  return decodeURIComponent(url);
}

const reqUrl = 'local-file://%2FUsers%2Fsuf1234%2Ffoo.heic?type=thumbnail&size=1200';
console.log('original url:', reqUrl);

const urlObj = new URL(reqUrl);
console.log('searchParams:', urlObj.searchParams.get('type'));

const pathPart = reqUrl.split('?')[0];
console.log('pathPart:', pathPart);
console.log('fromLocalUrl:', fromLocalUrl(pathPart));
