const logger = require('../utils/logger');
const { searchTestcases } = require('./testcaseVectorService');
const { reportVectorEnrichmentExecution } = require('./vectorExecutionReporter');

/**
 * Normalize a PRD testcase into the doc shape expected by the vector store.
 * @param {any} tc
 * @param {number} i
 */
function toVectorDoc(tc, i) {
  return {
    externalId: tc.testId || `PRD_TC_${String(i + 1).padStart(4, '0')}`,
    source: 'prd',
    title: tc.title || '',
    description: tc.description || '',
    steps: tc.steps || '',
    expected: tc.expected || '',
    module: tc.module || '',
    priority: tc.priority || '',
    tags: [tc.TestType].filter(Boolean),
    meta: tc,
  };
}

/**
 * Convert vector-store doc back into the BRDToManual.rule JSON schema.
 * (We keep the original PRD schema for downstream Playwright generation.)
 */
function fromVectorDocToPrdSchema(doc) {
  const meta = doc?.raw?.meta || doc?.meta || {};
  return {
    testId: meta.testId || doc.externalId || '',
    title: meta.title || doc.title || '',
    description: meta.description || doc.description || '',
    TestType: meta.TestType || (Array.isArray(doc.tags) && doc.tags[0]) || 'Functional',
    module: meta.module || doc.module || '',
    priority: meta.priority || doc.priority || '',
    steps: meta.steps || doc.steps || '',
    expected: meta.expected || doc.expected || '',
    url: meta.url || '',
    username: meta.username || '',
    password: meta.password || '',
    testData: meta.testData || '',
    successCriteria: meta.successCriteria || '',
    successMessage: meta.successMessage || '',
    // keep any other meta fields around
    ...meta,
  };
}

/**
 * Post-process PRD generated tests by vector-searching existing tests and deciding:
 * - reuse existing (if very similar)
 * - update existing (if similar but we want to refresh the text/metadata)
 * - treat as new
 *
 * Output:
 * - tests: final array in PRD schema
 * - upserts: docs to upsert back into Mongo (embedding will be created by indexTestcase)
 * - stats
 */
async function enrichPrdTestsWithVector(prdTests, { threshold = 0.86, limit = 5 } = {}) {
  const tests = Array.isArray(prdTests) ? prdTests : [];

  const finalTests = [];
  const upserts = [];
  const upsertsNew = [];
  const decisions = [];

  const stats = {
    reused: 0,
    updated: 0,
    new: 0,
    failed: 0,
  };

  for (let i = 0; i < tests.length; i += 1) {
    const tc = tests[i];
    const doc = toVectorDoc(tc, i);

    try {
      // Search by canonical embedding text; this is more stable than title-only.
      const query = `${doc.title}\n${doc.description}\n${typeof doc.steps === 'string' ? doc.steps : JSON.stringify(doc.steps)}\n${doc.expected}`;
      const hits = await searchTestcases(query, {
        limit,
        numCandidates: 200,
        // NOTE: Leaving filter empty for now so we can match xray/prd etc.
        // If you want PRD-only matches: filter: { source: { $eq: 'prd' } }
        filter: {},
      });

      const best = hits?.[0];
      const bestScore = best?.score ?? 0;

      if (best && bestScore >= threshold) {
        // Reuse existing testcase: take stored meta so we keep stable IDs + previously curated content.
        // Still upsert the testcase (doc) to refresh embedding/meta if needed.
        finalTests.push(fromVectorDocToPrdSchema(best));
        upserts.push(doc);
        stats.reused += 1;
        decisions.push({ externalId: doc.externalId, decision: 'reused', bestScore });

        reportVectorEnrichmentExecution({
          query,
          hits,
          decision: 'reused',
          threshold,
          generatedTc: doc,
          reusedTc: best,
        });
        continue;
      }

      // Treat as new. Keep generated test.
      finalTests.push(tc);
      upserts.push(doc);
      upsertsNew.push(doc);
      stats.new += 1;

      decisions.push({ externalId: doc.externalId, decision: 'new', bestScore });

      reportVectorEnrichmentExecution({
        query,
        hits,
        decision: 'new',
        threshold,
        generatedTc: doc,
      });
    } catch (e) {
      stats.failed += 1;
      logger.warn(`Vector enrichment failed for testcase[${i}] ${doc.externalId}: ${e.message}`);
      // Fail-open: keep generated test so pipeline still works.
      finalTests.push(tc);
      upserts.push(doc);
      upsertsNew.push(doc);

      decisions.push({ externalId: doc.externalId, decision: 'failed', bestScore: undefined });

      reportVectorEnrichmentExecution({
        query: undefined,
        hits: [],
        decision: 'failed',
        threshold,
        generatedTc: doc,
      });
    }
  }

  return { tests: finalTests, upserts, upsertsNew, decisions, stats };
}

module.exports = {
  enrichPrdTestsWithVector,
  toVectorDoc,
};
