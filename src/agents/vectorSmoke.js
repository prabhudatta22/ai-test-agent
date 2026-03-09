// Minimal smoke test to verify VectorDB wiring works.
// It will index 1 synthetic testcase and then search for it.
//
// Usage:
//   node src/agents/vectorSmoke.js

require('dotenv').config();

const logger = require('../utils/logger');
const { indexTestcase, searchTestcases } = require('../vector/testcaseVectorService');
const { closeMongo } = require('../vector/mongoVectorStore');

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

  logger.info('Indexing smoke testcase...');
  await indexTestcase(seed);

  logger.info('Searching for smoke testcase...');
  const results = await searchTestcases('invalid password login error message', { limit: 3, numCandidates: 50 });

  for (const r of results) {
    logger.info(`- score=${(r.score ?? 0).toFixed(4)} ${r.externalId} :: ${r.title}`);
  }

  const hit = results.find((r) => r.externalId === seed.externalId);
  if (!hit) {
    throw new Error('Smoke test failed: did not retrieve the inserted testcase. Check Atlas vector index and numDimensions.');
  }

  logger.success('VectorDB smoke test passed.');
  await closeMongo();
}

run().catch(async (e) => {
  logger.error(e.message);
  try {
    await closeMongo();
  } catch (_) {
    // ignore
  }
  process.exitCode = 1;
});
