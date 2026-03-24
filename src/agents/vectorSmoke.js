// Minimal smoke test to verify VectorDB wiring works.
// It will index 1 synthetic testcase and then search for it.
//
// Usage:
//   node src/agents/vectorSmoke.js

require('dotenv').config();

const logger = require('../utils/logger');
const { indexTestcase, searchTestcases } = require('../vector/testcaseVectorService');
const { closeVectorStore } = require('../vector/vectorStore');
const { reportVectorUpsert, reportVectorEnrichmentExecution } = require('../vector/vectorExecutionReporter');
const { reportVectorCounts } = require('../vector/vectorExecutionReporter');
const { getEnv } = require('../utils/env');

function isVerbose() {
  return String(getEnv('VECTOR_REPORT_VERBOSE', 'false')).toLowerCase() === 'true';
}

async function run() {
  const seed = {
    externalId: 'SMOKE_TC_001',
    source: 'prd',
    title: 'User login with invalid password shows error',
    description: 'Validate error message for invalid credentials',
    steps: '1. Open login page\n2. Enter valid username\n3. Enter invalid password\n4. Click Login',
    expected: 'User remains on login page and sees an invalid credentials error message',
    module: 'Authentication',
    priority: 'High',
    tags: ['Functional'],
    meta: { smoke: true },
  };

  if (isVerbose()) logger.info('Indexing smoke testcase...');
  const upsertRes = await indexTestcase(seed);
  reportVectorUpsert({ inserted: upsertRes?.inserted, tc: seed });

  if (isVerbose()) logger.info('Searching for smoke testcase...');
  const results = await searchTestcases('invalid password login error message', { limit: 3, numCandidates: 50 });

  reportVectorEnrichmentExecution({
    query: 'invalid password login error message',
    hits: results,
    decision: 'search',
  });

  if (isVerbose()) {
    for (const r of results) {
      logger.info(`- score=${(r.score ?? 0).toFixed(4)} ${r.externalId} :: ${r.title}`);
    }
  }

  reportVectorCounts({
    upserted: 1,
    usedForAutomation: results.length,
  });

  const hit = results.find((r) => r.externalId === seed.externalId);
  if (!hit) {
    throw new Error('Smoke test failed: did not retrieve the inserted testcase. Check Atlas vector index and numDimensions.');
  }

  if (isVerbose()) logger.success('VectorDB smoke test passed.');
  await closeVectorStore();
}

run().catch(async (e) => {
  logger.error(e.message);
  try {
    await closeVectorStore();
  } catch (_) {
    // ignore
  }
  process.exitCode = 1;
});
