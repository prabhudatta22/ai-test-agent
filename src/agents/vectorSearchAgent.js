// Standalone runner for semantic search in MongoDB Atlas Vector Search.
// Usage:
//   node src/agents/vectorSearchAgent.js "login with invalid password" 5

require('dotenv').config();

const logger = require('../utils/logger');
const { searchTestcases } = require('../vector/testcaseVectorService');
const { closeVectorStore } = require('../vector/vectorStore');
const { reportVectorEnrichmentExecution, reportVectorCounts } = require('../vector/vectorExecutionReporter');
const { getEnv } = require('../utils/env');

function isVerbose() {
  return String(getEnv('VECTOR_REPORT_VERBOSE', 'false')).toLowerCase() === 'true';
}

async function run() {
  const query = process.argv.slice(2).join(' ').trim();
  if (!query) {
    logger.error('Usage: node src/agents/vectorSearchAgent.js <query text>');
    process.exitCode = 1;
    return;
  }

  const results = await searchTestcases(query, { limit: 5, numCandidates: 100 });

  if (isVerbose()) {
    logger.info(`Top matches for: ${query}`);
    for (const r of results) {
      logger.info(`- score=${(r.score ?? 0).toFixed(4)} [${r.source}] ${r.externalId} :: ${r.title}`);
    }
  }

  // Also output a structured blob for automation/CI consumption.
  reportVectorEnrichmentExecution({ query, hits: results, decision: 'search', threshold: undefined });

  // Minimal console summary (requested): no upserts during search; count how many matches returned.
  reportVectorCounts({ upserted: 0, usedForAutomation: results.length });

  await closeVectorStore();
}

run();
