const { MongoClient } = require("mongodb");

const uri = "mongodb+srv://prabhudatta:Prabhu123!!@dbox.m2lkauu.mongodb.net/";


async function run() {
  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log("Connected successfully");

    const db = client.db("dbox-ai-test-agent");
    const collection = db.collection("testcases");

    const indexDefinition = {
      mappings: {
        dynamic: false,
        fields: {
          embedding: {
            type: "vector",
            numDimensions: 1536,
            similarity: "cosine"
          }
        }
      }
    };

    const result = await collection.createSearchIndex({
      name: "embedding_vector_index",
      definition: indexDefinition
    });

    console.log("Vector index created:", result);

  } catch (err) {
    console.error("Error:", err);
  } finally {
    await client.close();
  }
}

run();