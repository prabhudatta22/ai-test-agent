const fs = require('fs');
const path = require('path');
const config = require('../config');

function savePage(title, data) {
  if (!fs.existsSync(config.outputDir)) {
    fs.mkdirSync(config.outputDir);
  }

  const safeTitle = title.replace(/[^\w\s]/gi, '_').replace(/\s+/g, '_');
  const filePath = path.join(config.outputDir, `${safeTitle}.json`);

  const json = {
    [title]: data
  };

  fs.writeFileSync(filePath, JSON.stringify(json, null, 2));
}

module.exports = { savePage };