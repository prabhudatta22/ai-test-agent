const { MongoClient } = require("mongodb");
const OpenAI = require("openai");
const fs = require("fs");

const uri = "mongodb://dboxapp-klov-report-server-01:86nArtcJZvnNRB8P2Yyag9uF@dbox1-mongo-common.mgmt.dbox.internal:27017";

const db = "klov";
const client = new MongoClient(uri);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

async function getEmbedding(text) {

  const response = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: text
  });

  return response.data[0].embedding;
}

async function indexTests() {

  await client.connect();

  const db = client.db("qa-ai");
  const collection = db.collection("testcases");

  const tests = JSON.parse(fs.readFileSync("xray-tests.json"));

  for (const test of tests) {

    const text = `
      ${test.summary}
      ${test.description}
      ${test.steps.map(s => s.action).join(" ")}
    `;

    const embedding = await getEmbedding(text);

    await collection.insertOne({
      ...test,
      embedding
    });
  }

  console.log("Test cases indexed");
}

async function searchTests(query) {

  const embedding = await getEmbedding(query);

  const db = client.db("qa-ai");
  const collection = db.collection("testcases");

  const results = await collection.aggregate([
    {
      $vectorSearch: {
        index: "testVectorIndex",
        path: "embedding",
        queryVector: embedding,
        numCandidates: 100,
        limit: 5
      }
    }
  ]).toArray();

  return results;
}

async function searchTests(query) {

  const embedding = await getEmbedding(query);

  const db = client.db("qa-ai");
  const collection = db.collection("testcases");

  const results = await collection.aggregate([
    {
      $vectorSearch: {
        index: "testVectorIndex",
        path: "embedding",
        queryVector: embedding,
        numCandidates: 100,
        limit: 5
      }
    }
  ]).toArray();

  return results;
}