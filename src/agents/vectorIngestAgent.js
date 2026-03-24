// Standalone runner to ingest historical tests into MongoDB Atlas Vector Search.
// Usage examples:
//   node src/agents/vectorIngestAgent.js xray ./output/xray-tests.json
//   node src/agents/vectorIngestAgent.js prd ./output/generated-tests.json

require('dotenv').config();

const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');
const { indexTestcase, findDuplicates } = require('../vector/testcaseVectorService');
const { closeVectorStore } = require('../vector/vectorStore');
const { reportVectorUpsert, reportVectorCounts } = require('../vector/vectorExecutionReporter');
const { getEnv } = require('../utils/env');

function isVerbose() {
  return String(getEnv('VECTOR_REPORT_VERBOSE', 'false')).toLowerCase() === 'true';
}

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

  if (isVerbose()) logger.info(`Ingesting ${items.length} ${source} testcases from ${filePath}`);

  const dedupThreshold = Number(getEnv('VECTOR_DUP_THRESHOLD', '0.86'));
  const dedupEnabled = String(getEnv('VECTOR_DEDUP_ENABLED', 'true')).toLowerCase() === 'true';
  if (isVerbose()) logger.info(`VECTOR_DEDUP_ENABLED=${dedupEnabled} threshold=${dedupThreshold}`);

  let ok = 0;
  let fail = 0;
  let upsertedCount = 0;
  let skippedDuplicates = 0;

  for (let i = 0; i < items.length; i += 1) {
    const t = items[i];
    try {
      const doc = source === 'xray' ? mapXrayTestToDoc(t) : mapPrdTestToDoc(t, i);

      // Semantic de-dup: skip indexing if a close match already exists.
      // This is crucial when doing a one-time bootstrap ingestion.
      if (dedupEnabled) {
        try {
          const dups = await findDuplicates(doc, { threshold: dedupThreshold, limit: 1 });
          if (Array.isArray(dups) && dups.length > 0) {
            skippedDuplicates += 1;
            if (isVerbose()) {
              logger.info(
                `Skip duplicate: ${doc.externalId} matched ${dups[0].externalId} score=${(dups[0].score ?? 0).toFixed(4)}`
              );
            }
            continue;
          }
        } catch (e) {
          // Fail-open: de-dup failure should not stop ingestion.
          // Most commonly happens if the vector store is not ready yet.
          logger.warn(`De-dup check failed for ${doc.externalId}: ${e.message}`);
        }
      }

      const res = await indexTestcase(doc);
      reportVectorUpsert({ inserted: res?.inserted, tc: doc });

      // Count every successful upsert operation.
      upsertedCount += 1;
      ok += 1;

      if (ok % 25 === 0) {
        if (isVerbose()) logger.info(`Progress: ${ok}/${items.length} indexed`);
      }
    } catch (e) {
      fail += 1;
      logger.warn(`Failed indexing item ${i}: ${e.message}`);
    }
  }

  await closeVectorStore();

  // Ingest is only indexing; no automation execution here.
  reportVectorCounts({ upserted: upsertedCount, usedForAutomation: 0 });

  if (isVerbose()) logger.info(`Skipped duplicates=${skippedDuplicates}`);

  if (isVerbose()) logger.success(`Done. Indexed=${ok}, failed=${fail}`);
}

run();
