const logger = require('../utils/logger');
const { getEnv } = require('../utils/env');

function isVerbose() {
  return String(getEnv('VECTOR_REPORT_VERBOSE', 'false')).toLowerCase() === 'true';
}

function summarizeTc(tc) {
  if (!tc || typeof tc !== 'object') return {};
  return {
    externalId: tc.externalId || tc.testId || '',
    source: tc.source || 'prd',
    title: tc.title || '',
    module: tc.module || '',
    priority: tc.priority || '',
  };
}

/**
 * Print a concise console summary for:
 * - which testcases were considered "new" vs "reused" (based on vector enrichment stats)
 * - which existing testcases were matched (vector hits)
 *
 * This is intentionally just reporting; it doesn't influence any logic.
 */
function reportVectorEnrichmentExecution({ query, hits, decision, threshold, generatedTc, reusedTc } = {}) {
  if (!isVerbose()) return;
  const safeHits = Array.isArray(hits) ? hits : [];
  const top = safeHits.slice(0, 5).map((h) => ({
    score: Number((h.score ?? 0).toFixed(4)),
    externalId: h.externalId,
    source: h.source,
    title: h.title,
  }));

  logger.json({
    event: 'vector.execution.candidate',
    decision: decision || 'unknown',
    threshold: typeof threshold === 'number' ? threshold : undefined,
    queryPreview: query ? String(query).slice(0, 160) : undefined,
    generated: summarizeTc(generatedTc),
    reused: summarizeTc(reusedTc),
    topMatches: top,
  });
}

function reportVectorUpsert({ inserted, tc } = {}) {
  if (!isVerbose()) return;
  logger.json({
    event: 'vector.upsert',
    inserted,
    testcase: summarizeTc(tc),
  });
}

function reportVectorCounts({ upserted = 0, usedForAutomation = 0 } = {}) {
  logger.info(`Vector summary: upserted=${upserted}, usedForAutomation=${usedForAutomation}`);
}

module.exports = {
  reportVectorEnrichmentExecution,
  reportVectorUpsert,
  reportVectorCounts,
};
