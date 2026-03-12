const { getEnv } = require('../utils/env');

function getVectorStoreType() {
  return String(getEnv('VECTOR_STORE', 'mongo')).toLowerCase();
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
