const { MongoClient, ObjectId } = require('mongodb');
const { HfInference } = require('@huggingface/inference');
const { requireEnv, getEnv } = require('../utils/env');

/**
 * NOTE: This is an experimental/legacy helper that uses a separate
 * Hugging Face embedding pipeline and its own MongoDB vector index
 * (`hf_embedding` / `hf_vector_index`). It is intentionally isolated
 * from the main vector store used by `testcaseVectorService`.
 */

function getMongoUri() {
  return requireEnv('MONGODB_URI');
}

function getMongoDbName() {
  return getEnv('MONGODB_DB', 'qa-ai');
}

function getMongoCollectionName() {
  return getEnv('MONGODB_COLLECTION', 'testcases');
}

function getHfVectorIndexName() {
  return getEnv('HF_VECTOR_INDEX', 'hf_vector_index');
}

// 384 dimensions for all-MiniLM-L6-v2 (HF experiment only)
const VECTOR_DIMENSIONS = 384;

function getHfClient() {
  const apiKey = getEnv('HUGGINGFACE_API_KEY', '').trim();
  const model = getEnv('HUGGINGFACE_MODEL', '').trim();
  if (!apiKey || !model) {
    throw new Error(
      'HUGGINGFACE_API_KEY and HUGGINGFACE_MODEL must be set to use src/vector/vectorsearch.js (experimental HF script).'
    );
  }
  return { hf: new HfInference(apiKey), model };
}

async function getEmbedding(hf, model, text) {
  if (!text) return new Array(VECTOR_DIMENSIONS).fill(0);
  const response = await hf.featureExtraction({
    model,
    inputs: text,
  });
  return response;
}

async function run() {
  // Optional hard gate so this doesn’t get run accidentally in prod.
  const enabled = String(getEnv('ENABLE_HF_VECTOR_EXPERIMENT', 'false')).toLowerCase() === 'true';
  if (!enabled) {
    console.error(
      'HF vector experiment is disabled. Set ENABLE_HF_VECTOR_EXPERIMENT=true to run src/vector/vectorsearch.js.'
    );
    process.exitCode = 1;
    return;
  }

  const { hf, model } = getHfClient();
  const client = new MongoClient(getMongoUri());

  try {
    await client.connect();
    console.log('Connected successfully to MongoDB.');

    const db = client.db(getMongoDbName());
    const collection = db.collection(getMongoCollectionName());

    // === 1. FIND THE TARGET DOCUMENT ===
    const targetId = getEnv('HF_EXPERIMENT_TARGET_ID', '').trim() || '';
    let targetDoc = await collection.findOne({ _id: new ObjectId(targetId) });

    // Ensure it's found (fallback to another generic doc if needed)
    if (!targetDoc) {
      targetDoc = await collection.findOne({});
      if (!targetDoc) {
        throw new Error('No documents found in collection to use as a target.');
      }
      console.log('Target doc not found, using generic document:', targetDoc._id);
    }

    // === 2. GENERATE AND SAVE ITS EMBEDDING ===
    const textToEmbed = `Summary: ${targetDoc.Summary || ''} Description: ${targetDoc.Description || ''}`;
    console.log(`\nGenerating ${VECTOR_DIMENSIONS}-dimensional embedding for content: "${textToEmbed.slice(0, 100)}..."`);

    const embedding = await getEmbedding(hf, model, textToEmbed);

    console.log(`Saving HF embedding to document ${targetDoc._id}...`);
    await collection.updateOne(
      { _id: targetDoc._id },
      { $set: { hf_embedding: embedding } } // Saving into `hf_embedding`
    );

    // === 3. PERFORM A VECTOR SEARCH ===
    const searchTerm = getEnv('HF_EXPERIMENT_QUERY', 'scheduler');
    console.log(`\nGenerating search query embedding for keyword: "${searchTerm}"...`);
    const queryEmbedding = await getEmbedding(hf, model, searchTerm);

    console.log('\nExecuting $vectorSearch pipeline...');
    const pipeline = [
      {
        $vectorSearch: {
          index: getHfVectorIndexName(),
          path: 'hf_embedding',
          queryVector: queryEmbedding,
          numCandidates: 100,
          limit: 5,
        },
      },
      {
        $project: {
          _id: 1,
          Summary: 1,
          Description: 1,
          score: { $meta: 'vectorSearchScore' },
        },
      },
    ];

    try {
      const results = await collection.aggregate(pipeline).toArray();

      console.log(`Found ${results.length} nearest neighbors:`);
      results.forEach((doc, idx) => {
        console.log(`\n--- Result ${idx + 1} (Similarity Score: ${doc.score}) ---`);
        console.log(`ID: ${doc._id}`);
        console.log(`Summary: ${doc.Summary}`);
        console.log(`Description: ${doc.Description}`);
      });
    } catch (searchError) {
      console.error(
        `\nVector search failed. Ensure you have created the Atlas Vector Search Index named '${getHfVectorIndexName()}'.`
      );
      console.error('Index configuration should be:');
      console.log(
        `{ "fields": [{ "type": "vector", "path": "hf_embedding", "numDimensions": ${VECTOR_DIMENSIONS}, "similarity": "cosine" }] }`
      );
      console.error(searchError);
    }
  } catch (err) {
    console.error('HF vector experiment script failed:', err);
  } finally {
    await client.close();
    console.log('\nConnection closed.');
  }
}

run().catch((e) => {
  console.error('Unexpected failure:', e);
  process.exitCode = 1;
});