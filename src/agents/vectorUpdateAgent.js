// Standalone runner to create/update a testcase in the configured vector store.
//
// Usage:
//   node src/agents/vectorUpdateAgent.js ./path/to/testcase.json
//
// Input JSON must match the vector-store document schema:
// {
//   "externalId": "TC001",
//   "source": "prd"|"xray",
//   "title": "...",
//   "description": "...",
//   "steps": "..."|[],
//   "expected": "...",
//   "module": "...",
//   "priority": "...",
//   "tags": ["..."],
//   "meta": { ... }
// }

require('dotenv').config();

const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');
const { indexTestcase } = require('../vector/testcaseVectorService');
const { closeVectorStore } = require('../vector/vectorStore');

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

async function run() {
  const fileArg = process.argv[2];
  if (!fileArg) {
    logger.error('Usage: node src/agents/vectorUpdateAgent.js <path-to-testcase-json>');
    process.exitCode = 1;
    return;
  }

  const filePath = path.resolve(process.cwd(), fileArg);
  const doc = readJson(filePath);

  if (!doc?.externalId || !doc?.source) {
    throw new Error('Input JSON must include externalId and source');
  }

  logger.info(`Upserting testcase ${doc.source}:${doc.externalId} from ${filePath}`);
  await indexTestcase(doc);
  logger.success('Upsert complete.');
  await closeVectorStore();
}

run().catch(async (e) => {
  logger.error(e.stack || e.message);
  try {
    await closeVectorStore();
  } catch (_) {
    // ignore
  }
  process.exitCode = 1;
});
