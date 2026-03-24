const { getEnv } = require('../utils/env');

function getVectorStoreType() {
  const raw = String(getEnv('VECTOR_STORE', 'mongo')).toLowerCase();
  // Convenience: when vector pipeline is enabled, most users want qdrant.
  // Allow VECTOR_STORE=auto and decide based on QDRANT_URL presence.
  if (raw === 'auto') {
    const qUrl = String(getEnv('QDRANT_URL', '')).trim();
    if (qUrl) return 'qdrant';
    return 'mongo';
  }
  // Backwards/forgiving: some environments set VECTOR_STORE to a Qdrant URL.
  // If it looks like an HTTP URL, treat it as qdrant.
  if (raw.startsWith('http://') || raw.startsWith('https://')) return 'qdrant';
  return raw;
}

function getVectorStoreModule() {
  const type = getVectorStoreType();
  if (type === 'qdrant') return require('./qdrantVectorStore');
  return require('./mongoVectorStore');
}

function upsertTestcase(doc) {
  return getVectorStoreModule().upsertTestcase(doc);
}

function semanticSearch(args) {
  return getVectorStoreModule().semanticSearch(args);
}

async function closeVectorStore() {
  const mod = getVectorStoreModule();
  if (typeof mod.closeVectorStore === 'function') return mod.closeVectorStore();
  if (typeof mod.closeMongo === 'function') return mod.closeMongo();
}

module.exports = {
  getVectorStoreType,
  upsertTestcase,
  semanticSearch,
  closeVectorStore,
};
