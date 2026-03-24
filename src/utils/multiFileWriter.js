const fs = require('fs');
const path = require('path');

/**
 * Parse AI output containing multiple JS files separated by markers:
 *   // FILE: <relative/path>
 *
 * Returns: Array<{ filePath: string, content: string }>
 */
function parseMultiFileOutput(raw) {
  const text = String(raw || '').replace(/\r\n/g, '\n');
  const marker = /^\/\/\s*FILE:\s*(.+)$/gm;
  const matches = [...text.matchAll(marker)];

  if (matches.length === 0) {
    return [];
  }

  const files = [];
  for (let i = 0; i < matches.length; i += 1) {
    const start = matches[i].index;
    const headerLine = matches[i][0];
    const relPath = matches[i][1].trim();
    const nextStart = i + 1 < matches.length ? matches[i + 1].index : text.length;

    const bodyStart = start + headerLine.length;
    const body = text.slice(bodyStart, nextStart).replace(/^\n+/, '');
    files.push({ filePath: relPath, content: body.trimEnd() + '\n' });
  }
  return files;
}

function writeGeneratedFiles(files, { rootDir = process.cwd() } = {}) {
  const written = [];
  for (const f of files) {
    const target = path.resolve(rootDir, f.filePath);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, f.content, 'utf8');
    written.push(target);
  }
  return written;
}

module.exports = {
  parseMultiFileOutput,
  writeGeneratedFiles,
};
