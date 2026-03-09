const { MongoClient } = require('mongodb');
const { requireEnv, getEnv } = require('../utils/env');

function getMongoUri() {
  return requireEnv('MONGODB_URI');
}

function getMongoDbName() {
  return getEnv('MONGODB_DB', 'qa-ai');
}

function getMongoCollectionName() {
  return getEnv('MONGODB_COLLECTION', 'testcases');
}

function getVectorIndexName() {
  return getEnv('MONGODB_VECTOR_INDEX', 'testVectorIndex');
}

/**
 * Singleton-ish client so scripts don't create too many connections.
 */
let _client;
async function getClient() {
  if (_client) return _client;
  _client = new MongoClient(getMongoUri());
  await _client.connect();
  return _client;
}

function toVectorCandidate(doc) {
  // Standardize output shape for the rest of the code.
  return {
    id: doc._id,
    externalId: doc.externalId,
    source: doc.source,
    title: doc.title,
    description: doc.description,
    module: doc.module,
    priority: doc.priority,
    tags: doc.tags,
    score: doc.score,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
    raw: doc,
  };
}

/**
 * Upsert a testcase into MongoDB.
 *
 * @param {{
 *  externalId: string,
 *  source: 'xray'|'prd',
 *  title: string,
 *  description: string,
 *  steps?: any,
 *  expected?: any,
 *  module?: string,
 *  priority?: string,
 *  tags?: string[],
 *  embedding: number[],
 *  text: string,
 *  meta?: any
 * }} doc
 */
async function upsertTestcase(doc) {
  const client = await getClient();
  const db = client.db(getMongoDbName());
  const collection = db.collection(getMongoCollectionName());

  const now = new Date();
  const filter = { externalId: doc.externalId, source: doc.source };

  await collection.updateOne(
    filter,
    {
      $set: {
        ...doc,
        updatedAt: now,
      },
      $setOnInsert: {
        createdAt: now,
      },
    },
    { upsert: true }
  );

  return { ok: true };
}

/**
 * Semantic search over testcases.
 *
 * IMPORTANT: Requires MongoDB Atlas Search index with vector mapping for `embedding`.
 */
async function semanticSearch({ queryEmbedding, limit = 10, numCandidates = 100, filter = {} }) {
  const client = await getClient();
  const db = client.db(getMongoDbName());
  const collection = db.collection(getMongoCollectionName());

  const pipeline = [
    {
      $vectorSearch: {
        index: getVectorIndexName(),
        path: 'embedding',
        queryVector: queryEmbedding,
        numCandidates,
        limit,
        filter,
      },
    },
    {
      $addFields: {
        score: { $meta: 'vectorSearchScore' },
      },
    },
  ];

  const results = await collection.aggregate(pipeline).toArray();
  return results.map(toVectorCandidate);
}

async function closeMongo() {
  if (!_client) return;
  await _client.close();
  _client = undefined;
}

module.exports = {
  upsertTestcase,
  semanticSearch,
  closeMongo,
};
