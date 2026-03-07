const fs = require("fs");
const path = require("path");

const MEMORY_FILE = path.join(process.cwd(), "selector-memory.json");

function loadMemory() {
  if (!fs.existsSync(MEMORY_FILE)) {
    return { mappings: [] };
  }
  return JSON.parse(fs.readFileSync(MEMORY_FILE, "utf-8"));
}

function saveMemory(memory) {
  fs.writeFileSync(MEMORY_FILE, JSON.stringify(memory, null, 2));
}

/**
 * Train selector model with corrected Playwright selector
 * @param {Object} data
 * @param {string} data.pageUrl
 * @param {string} data.testName
 * @param {string} data.badSelector
 * @param {string} data.fixedSelector
 * @param {string} data.elementDescription
 */
function trainSelectorModel(data) {
  const memory = loadMemory();

  const existing = memory.mappings.find(
    m =>
      m.badSelector === data.badSelector &&
      m.pageUrl === data.pageUrl
  );

  if (existing) {
    existing.fixedSelector = data.fixedSelector;
    existing.confidence = (existing.confidence || 1) + 1;
    existing.lastUpdated = new Date().toISOString();
  } else {
    memory.mappings.push({
      pageUrl: data.pageUrl,
      testName: data.testName,
      elementDescription: data.elementDescription,
      badSelector: data.badSelector,
      fixedSelector: data.fixedSelector,
      confidence: 1,
      createdAt: new Date().toISOString()
    });
  }

  saveMemory(memory);

  console.log("Selector training updated.");
}

module.exports = { trainSelectorModel };