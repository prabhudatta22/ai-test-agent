const fs = require('fs');
const path = require('path');

function writeFile(filePath, content) {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, content, 'utf-8');
}

function readFile(filePath) {
    return fs.readFileSync(filePath, 'utf-8');
}

module.exports = { writeFile, readFile };