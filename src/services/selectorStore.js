const fs = require('fs');

const FILE = 'selector-memory.json';

function loadSelectors() {
    if (!fs.existsSync(FILE)) return {};
    return JSON.parse(fs.readFileSync(FILE));
}

function saveSelectors(data) {
    fs.writeFileSync(FILE, JSON.stringify(data, null, 2));
}

function getHealedSelector(selector) {
  const memory = loadMemory();

  const match = memory.mappings
    .filter(m => m.badSelector === selector)
    .sort((a, b) => b.confidence - a.confidence)[0];

  return match ? match.fixedSelector : selector;
}

module.exports = { loadSelectors, saveSelectors };