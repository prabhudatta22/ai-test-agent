const { QdrantClient } = require('@qdrant/js-client-rest');
const crypto = require('crypto');
const { getEnv } = require('../utils/env');

function getQdrantUrl() {
  return getEnv('QDRANT_URL', 'http://localhost:6333');
}

function getQdrantCollection() {
  return getEnv('QDRANT_COLLECTION', 'testcases');
}

function getQdrantDistance() {
  // cosine|dot|euclid
  return getEnv('QDRANT_DISTANCE', 'Cosine');
}

// Singleton-ish client
let _client;
function getClient() {
  if (_client) return _client;
  _client = new QdrantClient({ url: getQdrantUrl() });
  return _client;
}

async function ensureCollection({ vectorSize, distance } = {}) {
  const client = getClient();
  const collection_name = getQdrantCollection();

  const size = Number(vectorSize);
  if (!size || Number.isNaN(size)) {
    throw new Error('Qdrant ensureCollection requires vectorSize');
  }

  try {
    const info = await client.getCollection(collection_name);
    // If the collection already exists, validate dimensions match.
    const existingSize = info?.config?.params?.vectors?.size;
    if (existingSize && Number(existingSize) !== size) {
      throw new Error(
        `Qdrant collection '${collection_name}' has vector size ${existingSize}, but your embedding model returned ${size}. ` +
          `Either delete/recreate the collection, or use the same embedding model as when it was created.`
      );
    }
    return { ok: true, created: false };
  } catch (e) {
    const status = e?.status;
    // If it does not exist, Qdrant returns 404
    if (status && status !== 404) throw e;
  }

  await client.createCollection(collection_name, {
    vectors: {
      size,
      distance: distance || getQdrantDistance(),
    },
  });

  // Create payload indexes for filtering (best-effort; harmless if repeated)
  const idxFields = ['source', 'externalId', 'module', 'priority'];
  for (const field_name of idxFields) {
    try {
      await client.createPayloadIndex(collection_name, {
        field_name,
        field_schema: 'keyword',
      });
    } catch (_) {
      // ignore
    }
  }

  return { ok: true, created: true };
}

function toPointId(externalId, source) {
  // Qdrant point IDs must be either an integer or a UUID.
  // We generate a deterministic UUID from (source + externalId) so “upsert” is stable.
  const raw = `${source || 'unknown'}::${externalId || ''}`;
  const hash = crypto.createHash('sha256').update(raw).digest();

  // Take first 16 bytes and force UUID v4 + RFC4122 variant
  const b = Buffer.from(hash.subarray(0, 16));
  b[6] = (b[6] & 0x0f) | 0x40; // version 4
  b[8] = (b[8] & 0x3f) | 0x80; // variant 10

  const hex = b.toString('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function toVectorCandidate(point) {
  const payload = point?.payload || {};
  return {
    id: point?.id,
    externalId: payload.externalId,
    source: payload.source,
    title: payload.title,
    description: payload.description,
    module: payload.module,
    priority: payload.priority,
    tags: payload.tags,
    score: point?.score,
    createdAt: payload.createdAt,
    updatedAt: payload.updatedAt,
    raw: payload,
    meta: payload.meta,
  };
}

/**
 * Upsert a testcase into Qdrant.
 *
 * Doc schema matches mongoVectorStore upsertTestcase.
 */
async function upsertTestcase(doc) {
  const client = getClient();
  const collection_name = getQdrantCollection();

  const now = new Date().toISOString();
  const pointId = toPointId(doc.externalId, doc.source);

  await ensureCollection({ vectorSize: doc.embedding?.length, distance: getQdrantDistance() });

  const payload = {
    ...doc,
    createdAt: doc.createdAt || now,
    updatedAt: now,
  };
  // Avoid storing the embedding twice.
  delete payload.embedding;

  await client.upsert(collection_name, {
    wait: true,
    points: [
      {
        id: pointId,
        vector: doc.embedding,
        payload,
      },
    ],
  });

  return { ok: true };
}

/**
 * Semantic search in Qdrant.
 *
 * @param {{queryEmbedding:number[], limit?:number, numCandidates?:number, filter?:any}} args
 */
async function semanticSearch({ queryEmbedding, limit = 10, filter = {} } = {}) {
  const client = getClient();
  const collection_name = getQdrantCollection();

  await ensureCollection({ vectorSize: queryEmbedding?.length, distance: getQdrantDistance() });

  // Translate a *subset* of Mongo-like filters used by this repo.
  // Supported:
  // { source: { $eq: 'prd' } }
  // { source: 'prd' }
  const must = [];
  if (filter && typeof filter === 'object') {
    for (const [key, value] of Object.entries(filter)) {
      if (value && typeof value === 'object' && '$eq' in value) {
        must.push({ key, match: { value: value.$eq } });
      } else if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
        must.push({ key, match: { value } });
      }
    }
  }

  const qdrantFilter = must.length ? { must } : undefined;

  const results = await client.search(collection_name, {
    vector: queryEmbedding,
    limit,
    with_payload: true,
    ...(qdrantFilter ? { filter: qdrantFilter } : {}),
  });

  return (results || []).map(toVectorCandidate);
}

async function closeVectorStore() {
  // REST client has no sockets to close; keep API parity.
  _client = undefined;
}

module.exports = {
  ensureCollection,
  upsertTestcase,
  semanticSearch,
  closeVectorStore,
};
