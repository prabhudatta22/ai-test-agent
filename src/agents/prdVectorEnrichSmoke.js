// Smoke test to validate PRD vector-enrichment pipeline works end-to-end.
//
// Usage:
//   VECTORDB_ENABLED=true node src/agents/prdVectorEnrichSmoke.js
//
// Requires .env for OPENAI_API_KEY + MongoDB vector config (see README).

require('dotenv').config();

const logger = require('../utils/logger');
const { enrichPrdTestsWithVector, toVectorDoc } = require('../vector/prdTestcaseEnrichment');
const { indexTestcase } = require('../vector/testcaseVectorService');
const { closeVectorStore } = require('../vector/vectorStore');
const { reportVectorCounts } = require('../vector/vectorExecutionReporter');
const { getEnv } = require('../utils/env');

function isVerbose() {
  return String(getEnv('VECTOR_REPORT_VERBOSE', 'false')).toLowerCase() === 'true';
}

async function run() {
  const synthetic = [
    {
      testId: 'TC001',
      title: 'Login with valid credentials',
      description: 'Verify user can login successfully',
      TestType: 'Functional',
      module: 'Authentication',
      priority: 'High',
      steps: '1. Open login page\n2. Enter valid username/password\n3. Click Login',
      expected: 'User lands on dashboard',
      url: '',
      username: 'user',
      password: 'pass',
      testData: '',
      successCriteria: '',
      successMessage: 'Login successful',
    },
  ];

  try {
    // Seed once
    await indexTestcase(toVectorDoc(synthetic[0], 0));

    // Enrich should now reuse it
    const enriched = await enrichPrdTestsWithVector(synthetic, { threshold: 0.7, limit: 3 });
    if (isVerbose()) logger.info(JSON.stringify(enriched.stats, null, 2));
    if (enriched.stats.reused < 1) {
      throw new Error('Expected reused >= 1');
    }
    reportVectorCounts({ upserted: 0, usedForAutomation: enriched.tests.length });
    if (isVerbose()) logger.success('PRD vector enrichment smoke passed.');
  } finally {
    await closeVectorStore();
  }
}

run().catch((e) => {
  logger.error(e.stack || e.message);
  process.exitCode = 1;
});
