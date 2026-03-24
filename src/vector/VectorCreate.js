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
  return getEnv('MONGODB_VECTOR_INDEX', 'embedding_vector_index');
}

function getVectorDimensions() {
  const raw = Number(getEnv('MONGODB_VECTOR_DIMENSIONS', '1536'));
  if (!raw || Number.isNaN(raw)) {
    throw new Error('MONGODB_VECTOR_DIMENSIONS must be a valid number (e.g. 1536).');
  }
  return raw;
}

async function run() {
  const client = new MongoClient(getMongoUri());

  try {
    await client.connect();
    console.log('Connected successfully to MongoDB.');

    const db = client.db(getMongoDbName());
    const collection = db.collection(getMongoCollectionName());

    const indexDefinition = {
      mappings: {
        dynamic: false,
        fields: {
          embedding: {
            type: 'vector',
            numDimensions: getVectorDimensions(),
            similarity: 'cosine',
          },
        },
      },
    };

    const result = await collection.createSearchIndex({
      name: getVectorIndexName(),
      definition: indexDefinition,
    });

    console.log('Vector index created:', result);
  } catch (err) {
    console.error('Error creating MongoDB vector index:', err);
  } finally {
    await client.close();
  }
}

run();