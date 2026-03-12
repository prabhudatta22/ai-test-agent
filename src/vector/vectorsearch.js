const { MongoClient } = require('mongodb');
const { HfInference } = require('@huggingface/inference');
const { requireEnv, getEnv } = require('../utils/env');

// Put your own Hugging Face token here if you intend to run this frequently.
const hf = new HfInference(getEnv('HUGGINGFACE_API_KEY'));
const hfModel = getEnv('HUGGINGFACE_MODEL');

// 384 dimensions for all-MiniLM-L6-v2
const VECTOR_DIMENSIONS = 384;

const uri = "mongodb+srv://prabhudatta:Prabhu123!!@dbox.m2lkauu.mongodb.net/";

async function getEmbedding(text) {
    if (!text) return new Array(VECTOR_DIMENSIONS).fill(0);

    // Fallback simple embedding generator via HF Inference API
    const response = await hf.featureExtraction({
        model: hfModel,
        inputs: text,
    });
    return response;
}

async function run() {
    const client = new MongoClient(uri);

    try {
        await client.connect();
        console.log("Connected successfully to DB.");

        const db = client.db("dbox-ai-test-agent");
        const collection = db.collection("testcases");

        // === 1. FIND THE TARGET DOCUMENT ===
        const targetId = "69aff47657fdf9617119e19b";
        let targetDoc = await collection.findOne({ "_id": new (require('mongodb').ObjectId)(targetId) });

        // Ensure it's found (fallback to another generic doc if needed)
        if (!targetDoc) {
            targetDoc = await collection.findOne({});
            console.log("Target doc not found, using generic document:", targetDoc._id);
        }

        // === 2. GENERATE AND SAVE ITS EMBEDDING ===
        // We will form an embedding string based on both the Summary and Description
        const textToEmbed = `Summary: ${targetDoc.Summary || ''} Description: ${targetDoc.Description || ''}`;
        console.log(`\nGenerating 384-dimensional embedding for content: "${textToEmbed.slice(0, 100)}..."`);

        const embedding = await getEmbedding(textToEmbed);

        console.log(`Saving embedding to document ${targetDoc._id}...`);
        await collection.updateOne(
            { _id: targetDoc._id },
            { $set: { hf_embedding: embedding } } // Saving into `hf_embedding`
        );


        // === 3. PERFORM A VECTOR SEARCH ===
        const searchTerm = "scheduler";
        console.log(`\nGenerating search query embedding for keyword: "${searchTerm}"...`);
        const queryEmbedding = await getEmbedding(searchTerm);

        console.log(`\nExecuting $vectorSearch pipeline...`);
        // We must query the correct index.
        // NOTE: For this to work in Atlas, you must create a new vector search index named "hf_vector_index".
        // It should match "hf_embedding" and have 384 dimensions using the "cosine" metric!
        const pipeline = [
            {
                "$vectorSearch": {
                    "index": "hf_vector_index",
                    "path": "hf_embedding",
                    "queryVector": queryEmbedding,
                    "numCandidates": 100,
                    "limit": 5
                }
            },
            {
                "$project": {
                    "_id": 1,
                    "Summary": 1,
                    "Description": 1,
                    "score": { "$meta": "vectorSearchScore" }
                }
            }
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
            console.error("\nVector search failed. Ensure you have created the Atlas Vector Search Index named 'hf_vector_index'.");
            console.error("Index configuration should be:");
            console.log(`{ "fields": [{ "type": "vector", "path": "hf_embedding", "numDimensions": 384, "similarity": "cosine" }] }`);
        }

    } catch (err) {
        console.error("Script failed:", err);
    } finally {
        await client.close();
        console.log("\nConnection closed.");
    }
}

run().catch(console.dir);