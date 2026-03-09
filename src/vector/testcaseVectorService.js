const { createEmbedding } = require('../services/embeddingService');
const { buildEmbeddingText } = require('./testcaseText');
const { upsertTestcase, semanticSearch } = require('./mongoVectorStore');

/**
 * Index (upsert) a testcase by generating an embedding.
 */
async function indexTestcase(tc) {
  const text = buildEmbeddingText(tc);
  const embedding = await createEmbedding(text);

  await upsertTestcase({
    ...tc,
    text,
    embedding,
  });

  return { ok: true };
}

/**
 * Search by query string.
 */
async function searchTestcases(query, { limit = 10, numCandidates = 100, filter = {} } = {}) {
  const queryEmbedding = await createEmbedding(query);
  return semanticSearch({ queryEmbedding, limit, numCandidates, filter });
}

/**
 * Duplicate check: return candidates above a threshold.
 */
async function findDuplicates(tc, { threshold = 0.86, limit = 5 } = {}) {
  const text = buildEmbeddingText(tc);
  const queryEmbedding = await createEmbedding(text);
  const candidates = await semanticSearch({ queryEmbedding, limit, numCandidates: 200, filter: {} });
  return candidates.filter((c) => (c.score ?? 0) >= threshold);
}

module.exports = {
  indexTestcase,
  searchTestcases,
  findDuplicates,
};
