const sharp = require('sharp');
console.log(JSON.stringify(sharp.format, null, 2));
console.log('Versions:', JSON.stringify(sharp.versions, null, 2));
