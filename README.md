┌─────────────────────────────┐
│        Confluence PRD       │
└──────────────┬──────────────┘
               ↓
┌─────────────────────────────┐
│  PRD Parser + Cleaner       │
└──────────────┬──────────────┘
               ↓
┌─────────────────────────────┐
│  AI Test Case Generator     │  (Strict JSON schema)
└──────────────┬──────────────┘
               ↓
┌─────────────────────────────┐
│  Playwright Generator       │
└──────────────┬──────────────┘
               ↓
┌─────────────────────────────┐
│  Test Execution Engine      │
│  + Self-Healing Layer       │
└──────────────┬──────────────┘
               ↓
┌─────────────────────────────┐
│  Failure Analyzer Agent     │
│  (DOM diff + Patch engine)  │
└─────────────────────────────┘

Result:

An internal AI Test Architect that:

Reads PRD
Generates tests
Writes Playwright
Runs it
Fixes broken selectors automatically
Learns over time

npm start
npx playwright test <testfilename>

---

## Qdrant vector DB (recommended)

### Step 1 — One-time bootstrap ingestion (de-duplicated)

1) Start Qdrant (local):

```bash
docker run -p 6333:6333 -p 6334:6334 qdrant/qdrant
```

2) Set env:

```env
OPENAI_API_KEY="..."
VECTOR_STORE="qdrant"
QDRANT_URL="http://localhost:6333"
QDRANT_COLLECTION="testcases"

# Semantic de-dup during ingestion
VECTOR_DEDUP_ENABLED="true"
VECTOR_DUP_THRESHOLD="0.86"
```

3) Ingest Xray export (skips semantic duplicates):

```bash
node src/agents/xrayAgent.js "project = VIB AND issuetype = Test" ./output/xray-tests.json
node src/agents/vectorIngestAgent.js xray ./output/xray-tests.json
```

### Step 2 — Every `npm start` run reuses existing tests + ingests only new PRD tests

Set:

```env
VECTORDB_ENABLED="true"
VECTOR_STORE="qdrant"
QDRANT_URL="http://localhost:6333"
QDRANT_COLLECTION="testcases"

# Only ingest PRD testcases that were classified as "new" by vector enrichment
VECTOR_INGEST_ONLY_NEW="true"
VECTOR_DUP_THRESHOLD="0.86"
```

Then run:

```bash
npm start
```

The run will:
1) Generate many PRD testcases (expanded coverage)
2) Vector-search existing tests and reuse close matches
3) Upsert only the genuinely-new PRD testcases into Qdrant
4) Write final PRD testcases to `output/<SPACE>_<TITLE>_test_cases.json`

## Xray Export (xrayAgent)

This repo includes a small exporter that pulls Xray **Cloud** test cases via GraphQL.

### Prerequisites

Set these in `.env`:

```env
XRAY_CLIENT_ID="..."
XRAY_CLIENT_SECRET="..."
# Optional (defaults shown)
XRAY_AUTH_URL="https://xray.cloud.getxray.app/api/v2/authenticate"
XRAY_GRAPHQL_URL="https://xray.cloud.getxray.app/api/v2/graphql"
```

### Run

```bash
# Default JQL: project = VIB AND issuetype = Test
node src/agents/xrayAgent.js

# Custom JQL + custom output file
node src/agents/xrayAgent.js "issuetype = Test" ./output/xray-tests.json
```

### Smoke test

```bash
node src/agents/xraySmoke.js "issuetype = Test"
```


PRD Agent
     ↓
TestCase Agent
     ↓
Playwright Agent
     ↓
Execution Service
     ↓
Healing Agent
     ↓
Selector Trainer
     ↓
Selector Memory



For symatec search of test cases: 
Xray / PRD / Manual Tests
          │
          ▼
     Test Case JSON
          │
          ▼
   Text Embeddings
 (OpenAI / Local model)
          │
          ▼
      Vector DB
       (Qdrant)
          │
          ▼
Semantic Search for similar tests

                Product Requirement Document
                          │
                          ▼
                  Requirement Parser
                     (LLM Agent)
                          │
                          ▼
                QA Knowledge Vector DB
               (existing test repository)
                          │
              ┌───────────┴───────────┐
              ▼                       ▼
        Existing Tests          Missing Scenarios
        (Similarity Search)      (Gap Detection)
              │                       │
              ▼                       ▼
        Reuse Tests             Generate New Tests
              │                       │
              └───────────┬───────────┘
                          ▼
                  Test Case Library
                          │
                          ▼
                Automation Generator
                (Playwright Scripts)
                          │
                          ▼
                     CI/CD Pipeline
                          │
                          ▼
                    Execution Results
                          │
                          ▼
                AI Failure Analyzer
                          │
                          ▼
                Self-Healing Automation

MongoDB ventor architecture:
PRD
 │
 ▼
AI Requirement Parser
 │
 ▼
MongoDB Vector Collection
 │
 ├── test metadata
 ├── embeddings
 └── test steps
 │
 ▼
Semantic Test Search
 │
 ▼
Playwright Test Generator

---

# MongoDB Atlas Vector DB for Testcases

This repo can store historical test knowledge (Xray + PRD-generated tests) in **MongoDB Atlas** and use **$vectorSearch** for:

- Semantic search for existing test cases
- Avoid generating duplicate tests
- Retrieve relevant scenarios during PRD analysis
- Train an AI agent on historical test knowledge

## Prerequisites

### 1) Environment variables

Add these to `.env`:

```env
# OpenAI
OPENAI_API_KEY="..."
# Optional
OPENAI_EMBEDDING_MODEL="text-embedding-3-small"

# Vector store switch:
# - mongo (default): MongoDB Atlas Vector Search ($vectorSearch)
# - qdrant: local Qdrant at http://localhost:6333
VECTOR_STORE="mongo"

# MongoDB Atlas
MONGODB_URI="mongodb+srv://<user>:<pass>@<cluster>/<optional-default-db>?retryWrites=true&w=majority"
MONGODB_DB="qa-ai"
MONGODB_COLLECTION="testcases"

# Atlas Search vector index name (created manually in Atlas UI)
MONGODB_VECTOR_INDEX="testVectorIndex"

# Optional: enable indexing PRD-generated testcases during `npm start`
VECTORDB_ENABLED="false"

# Duplicate threshold for PRD indexing (higher => stricter de-dup)
VECTOR_DUP_THRESHOLD="0.86"
```

### Qdrant (local) configuration

If you want to use **Qdrant** instead of MongoDB:

```env
VECTOR_STORE="qdrant"
QDRANT_URL="http://localhost:6333"
QDRANT_COLLECTION="testcases"
# Optional:
QDRANT_DISTANCE="Cosine"
```

The app will auto-create the collection on first upsert/search using the embedding vector length.

### 2) Create the Atlas Vector Search index

In Atlas UI: **Database → Search → Create Index** on collection `${MONGODB_DB}.${MONGODB_COLLECTION}`.

Use an index definition similar to:

```json
{
  "fields": [
    {
      "type": "vector",
      "path": "embedding",
      "numDimensions": 1536,
      "similarity": "cosine"
    },
    { "type": "filter", "path": "source" },
    { "type": "filter", "path": "externalId" }
  ]
}
```

Notes:

- `text-embedding-3-small` returns **1536** dimensions.
- The code uses `$vectorSearch` with `path: "embedding"`.

## Ingest historical testcases

### Ingest Xray export

1) Export tests from Xray:

```bash
node src/agents/xrayAgent.js "project = VIB AND issuetype = Test" ./output/xray-tests.json
```

2) Ingest into MongoDB vector store:

```bash
node src/agents/vectorIngestAgent.js xray ./output/xray-tests.json
```

### Ingest PRD-generated tests

If you already have a JSON array of generated testcases (matching `BRDToManual.rule` schema):

```bash
node src/agents/vectorIngestAgent.js prd ./output/generated-tests.json
```

## Semantic search

```bash
node src/agents/vectorSearchAgent.js "login with invalid password"
```

By default the console prints only a minimal summary line:

`Vector summary: upserted=<n>, usedForAutomation=<n>`

To enable verbose per-testcase JSON logs (for debugging), set:

```bash
VECTOR_REPORT_VERBOSE=true
```

## Update/modify an existing testcase in the Vector DB

Write a JSON file containing a single testcase doc (same schema used by `vectorIngestAgent`) and run:

```bash
node src/agents/vectorUpdateAgent.js ./output/one-testcase.json
```

## Auto de-dup during PRD run

Set:

```env
VECTORDB_ENABLED="true"
```

When you run:

```bash
npm start
```

the agent will:

1) Generate manual testcases from PRD
2) For each testcase, run vector similarity search
3) Skip indexing if a close match is found (threshold controlled via `VECTOR_DUP_THRESHOLD`)


#####################################
1. Configure `.env` (see README): `OPENAI_API_KEY`, `MONGODB_URI`, `MONGODB_DB`, `MONGODB_COLLECTION`, `MONGODB_VECTOR_INDEX`.

2. Create Atlas Search vector index (README includes JSON). Ensure `numDimensions=1536`.

3. Ingest Xray:

   - `node src/agents/xrayAgent.js "project = VIB AND issuetype = Test" ./output/xray-tests.json`
   - `node src/agents/vectorIngestAgent.js xray ./output/xray-tests.json`

4. Search:
   - `node src/agents/vectorSearchAgent.js "login with invalid password"`

5. Smoke test:
   - `node src/agents/vectorSmoke.js`

Success criteria met: embeddings created with OpenAI, stored in MongoDB Atlas, searchable via `$vectorSearch`, and used for PRD de-dup/indexing.


npm install @qdrant/js-client-rest openai fs
http://localhost:6333/dashboard

RP_ENABLE=false PW_CHANNEL=chromium npx playwright test output/VIB-1039.test.js


npm install
npm run web:start