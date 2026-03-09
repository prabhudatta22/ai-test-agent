// Standalone runner to ingest historical tests into MongoDB Atlas Vector Search.
// Usage examples:
//   node src/agents/vectorIngestAgent.js xray ./output/xray-tests.json
//   node src/agents/vectorIngestAgent.js prd ./output/generated-tests.json

require('dotenv').config();

const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');
const { indexTestcase } = require('../vector/testcaseVectorService');
const { closeMongo } = require('../vector/mongoVectorStore');

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function mapXrayTestToDoc(xrayTest) {
  return {
    externalId: xrayTest.testKey,
    source: 'xray',
    title: xrayTest.summary || '',
    description: xrayTest.description || '',
    steps: xrayTest.steps || [],
    expected: (xrayTest.steps || []).map((s) => s.expectedResult).filter(Boolean).join('\n'),
    module: '',
    priority: '',
    tags: [xrayTest.type, xrayTest.status].filter(Boolean),
    meta: {
      status: xrayTest.status,
      type: xrayTest.type,
      preconditions: xrayTest.preconditions || [],
    },
  };
}

function mapPrdTestToDoc(prdTest, i) {
  // Matches schema from BRDToManual.rule
  return {
    externalId: prdTest.testId || `PRD_TC_${String(i + 1).padStart(4, '0')}`,
    source: 'prd',
    title: prdTest.title || '',
    description: prdTest.description || '',
    steps: prdTest.steps || '',
    expected: prdTest.expected || '',
    module: prdTest.module || '',
    priority: prdTest.priority || '',
    tags: [prdTest.TestType].filter(Boolean),
    meta: prdTest,
  };
}

async function run() {
  const source = (process.argv[2] || '').toLowerCase();
  const fileArg = process.argv[3];

  if (!['xray', 'prd'].includes(source) || !fileArg) {
    logger.error('Usage: node src/agents/vectorIngestAgent.js <xray|prd> <path-to-json>');
    process.exitCode = 1;
    return;
  }

  const filePath = path.resolve(process.cwd(), fileArg);
  const json = readJson(filePath);
  const items = Array.isArray(json) ? json : json?.tests || [];

  logger.info(`Ingesting ${items.length} ${source} testcases from ${filePath}`);

  let ok = 0;
  let fail = 0;

  for (let i = 0; i < items.length; i += 1) {
    const t = items[i];
    try {
      const doc = source === 'xray' ? mapXrayTestToDoc(t) : mapPrdTestToDoc(t, i);
      await indexTestcase(doc);
      ok += 1;

      if (ok % 25 === 0) {
        logger.info(`Progress: ${ok}/${items.length} indexed`);
      }
    } catch (e) {
      fail += 1;
      logger.warn(`Failed indexing item ${i}: ${e.message}`);
    }
  }

  await closeMongo();

  logger.success(`Done. Indexed=${ok}, failed=${fail}`);
}

run();
