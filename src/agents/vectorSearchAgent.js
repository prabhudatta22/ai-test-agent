// Standalone runner for semantic search in MongoDB Atlas Vector Search.
// Usage:
//   node src/agents/vectorSearchAgent.js "login with invalid password" 5

require('dotenv').config();

const logger = require('../utils/logger');
const { searchTestcases } = require('../vector/testcaseVectorService');
const { closeMongo } = require('../vector/mongoVectorStore');

async function run() {
  const query = process.argv.slice(2).join(' ').trim();
  if (!query) {
    logger.error('Usage: node src/agents/vectorSearchAgent.js <query text>');
    process.exitCode = 1;
    return;
  }

  const results = await searchTestcases(query, { limit: 5, numCandidates: 100 });

  logger.info(`Top matches for: ${query}`);
  for (const r of results) {
    logger.info(`- score=${(r.score ?? 0).toFixed(4)} [${r.source}] ${r.externalId} :: ${r.title}`);
  }

  await closeMongo();
}

run();
