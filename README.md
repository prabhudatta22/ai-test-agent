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

### Step 2.1 — PRD suite cache (NEW)

When using **Qdrant** (`VECTOR_STORE=qdrant`) the app now does a **suite-level cache lookup** *before* calling the LLM.

If a previous run already stored a full manual testcase suite for the same PRD (identified by Confluence `pageId` when available, otherwise `SPACE_KEY + PAGE_TITLE`), the agent will:

1) Fetch the suite from Qdrant via payload filter (`prdSuiteKey`)
2) Reuse those manual testcases directly (skip testcase generation LLM call)
3) Proceed to Playwright generation

This ensures deterministic runs and avoids repeatedly generating similar suites.

You can validate suite cache behavior locally with:

```bash
node src/agents/prdSuiteCacheSmoke.js
```

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


## Codebase overview: `ai-automation-agent`

This repo is an **“internal AI Test Architect”** that takes a PRD (Confluence or local file), generates **manual testcases (strict JSON)**, optionally **reuses/de-dups** against an existing testcase library via **vector search (Mongo Atlas or Qdrant)**, and then generates **Playwright tests + Page Objects**.

At a high level the pipeline is:

1) **PRD** (Confluence) →
2) **PRD structuring** (LLM) →
3) **Manual testcase generation** (LLM + strict schema) →
4) **Vector enrichment** (optional: reuse & dedup) →
5) **Playwright code generation** (LLM; multi-file output) →
6) **Run via Playwright** (`npx playwright test`)

---

## Key entrypoints (how you run it)

### 1) CLI pipeline (main)
- **File:** `src/index.js`
- **Script:** `npm start` → `node src/index.js`
- Reads pipeline args from env:
  - `SPACE_KEY`, `PAGE_TITLE`, `POINT`, `PRD_FILE`
- Calls the orchestrator: `runPipeline(args)` from `src/app/pipeline.js`.

### 2) Web server (UI/API wrapper)
- **File:** `src/web/server.js`
- **Script:** `npm run web:start` → `node src/web/server.js`
- Exposes APIs:
  - `POST /api/manual-testcases` → returns testcase JSON (and optionally indexes to vector DB)
  - `POST /api/playwright-tests` → upload testcase JSON → returns zip with generated Playwright files
  - Async job variants: `/api/*/jobs` + `/api/jobs/:id`

### 3) Standalone agents/scripts
- `src/agents/xrayAgent.js` → export tests from Xray Cloud to `output/xray-tests.json`
- `src/agents/vectorIngestAgent.js` → ingest Xray/PRD JSON into vector DB
- `src/agents/vectorSearchAgent.js` → query vector DB from CLI
- `src/agents/vectorUpdateAgent.js` → update a testcase doc in vector DB

---

## The core pipeline orchestrator

### `src/app/pipeline.js` (the “brain”)
**`runPipeline()`** is the central orchestration function. It performs:

1) **Fetch PRD**
   - `fetchPrd()` tries Confluence first (`getConfluenceContent`) and falls back to a local file (e.g. `sample_prd.txt`) if Confluence auth fails.

2) **Structure PRD with LLM**
   - `extractStructuredRequirements(prd)` from `src/agents/prdAgent.js`

3) **Generate manual testcases (strict JSON schema)**
   - `generateTestCasesAsArray(structured)` from `src/agents/testCaseAgent.js`
   - Uses `src/rules/BRDToManual.rule` (strict schema) + an “expansion” instruction block to broaden coverage.

4) **Optional vector enrichment & indexing**
   - Controlled by `VECTORDB_ENABLED`
   - If enabled:
     - `enrichPrdTestsWithVector()` (reuse/dedup) from `src/vector/prdTestcaseEnrichment.js`
     - Indexes back into vector DB using `indexTestcase()` from `src/vector/testcaseVectorService.js`
     - Supports “only ingest new” via `VECTOR_INGEST_ONLY_NEW`

5) **Write outputs**
   - Manual testcases JSON to: `output/<SPACE>_<TITLE>_test_cases.json`

6) **Generate Playwright JS**
   - `generatePlaywright(finalCases)` from `src/agents/playwrightAgent.js`
   - Uses `src/rules/ManualToPlaywright.rule` with placeholders:
     - `${jsFile}`: the testcase JSON
     - `${navFile}`: `src/nav/pms.nav` (navigation hints)
     - `${existingPages}`: concatenated existing page objects from `/pages`
   - The model is instructed to output **multi-file** content using `// FILE: ...` markers.
   - Files get parsed/written by `src/utils/multiFileWriter.js`.

7) **Optional Page Object generation**
   - If `POINT` is set and `output/ui-controls.json` exists, it runs `generatePOM()` from `src/agents/generatePageObjectAgent.js` to create a POM file.

---

## Agents (LLM-driven building blocks)

### PRD parsing
- **File:** `src/agents/prdAgent.js`
- **Function:** `extractStructuredRequirements(prdText)`
- Prompts the LLM to convert PRD text into a **structured JSON object**.

### Manual testcase generation
- **File:** `src/agents/testCaseAgent.js`
- **Functions:**
  - `generateTestCases(structuredPRD)` → returns JSON text
  - `generateTestCasesAsArray(structuredPRD)` → parses/repairs and returns an array
- Uses `BRDToManual.rule` as the strict schema contract.

### Playwright generation
- **File:** `src/agents/playwrightAgent.js`
- **Function:** `generatePlaywright(testCases)`
- Reads existing `pages/*.js` and passes them into the prompt so the model can **reuse existing POMs**.

### Healing (selector self-heal)
- **File:** `src/agents/healingAgent.js`
- **Function:** `healSelector(failedSelector, domSnapshot)`
- Prompts LLM: “selector failed → suggest alternative from DOM snapshot → return selector only”
- Persists mapping via `src/services/selectorStore.js`.

### Patch engine (stub)
- **File:** `src/agents/patchAgent.js`
- **Function:** `patchScript(existingCode, updates)`
- Currently a placeholder; intended for AST-based patches later.

### Page object generation from extracted UI controls
- **File:** `src/agents/generatePageObjectAgent.js`
- Converts a UI controls JSON into JS Page Object classes.

---

## Rules (prompt templates / “contracts”)

- **`src/rules/BRDToManual.rule`**
  - Strong constraints:
    - PRD is the only source of truth (no hallucinations)
    - Must output a JSON array with a fixed schema
    - Sequential `TC001`, `TC002`, ...

- **`src/rules/ManualToPlaywright.rule`**
  - Strong constraints:
    - Use `@playwright/test`
    - Reuse `pages/LoginPage.js` and call `logintoApp()` in `beforeEach`
    - Output multiple files using `// FILE: <path>` markers
    - Spec must be under `/output` (because `playwright.config.js` sets `testDir: ./output`)

---

## Services (external integrations)

### OpenAI
- **File:** `src/services/openaiClient.js`
- **Function:** `callAI(prompt, opts)`
- Uses **OpenAI Responses API**: `POST https://api.openai.com/v1/responses`
- Controlled by env:
  - `OPENAI_API_KEY`
  - `OPENAI_MODEL` (defaults to `gpt-4.1-mini` in several places)

### Embeddings
- **File:** `src/services/embeddingService.js`
- **Function:** `createEmbedding(text)`
- Uses `text-embedding-3-small` by default (1536 dims)

### Confluence PRD fetch
- **File:** `src/services/confluenceService.js`
- Functions:
  - `getConfluenceContent(spaceKey, pageTitle)`
  - `getConfluenceContentById(pageId)`
- Env:
  - `CONFLUENCE_BASE_URL`, `CONFLUENCE_USERNAME`, `CONFLUENCE_API_TOKEN`

### Xray Cloud exporter (GraphQL)
- **File:** `src/services/xrayService.js`
- Functions:
  - `getXrayToken()`, `getXrayTests(jql)`, `getTestsByFolder(...)`
- Env:
  - `XRAY_CLIENT_ID`, `XRAY_CLIENT_SECRET` (+ optional URLs)

### Execution runner
- **File:** `src/services/executionService.js`
- `runTests()` just shells out to `npx playwright test`.

---

## Vector search / “memory” layer

### The abstraction
- **File:** `src/vector/vectorStore.js`
- Picks backend by `VECTOR_STORE`:
  - `mongo` (default)
  - `qdrant`
  - `auto` (qdrant if `QDRANT_URL` set)
  - If `VECTOR_STORE` looks like `http(s)://...` it’s treated as qdrant.

### MongoDB Atlas Vector Search
- **File:** `src/vector/mongoVectorStore.js`
- Uses `$vectorSearch` aggregation stage.
- Requires Atlas Search vector index (`MONGODB_VECTOR_INDEX`).

### Qdrant
- **File:** `src/vector/qdrantVectorStore.js`
- Auto-creates collection on first use (validates vector size).
- Generates deterministic UUID point IDs from `source::externalId`.

### Testcase indexing/search API
- **File:** `src/vector/testcaseVectorService.js`
- `indexTestcase(tc)` → builds embedding text (`src/vector/testcaseText.js`) → embedding → upsert
- `searchTestcases(query)` → query embedding → semanticSearch

### PRD enrichment logic
- **File:** `src/vector/prdTestcaseEnrichment.js`
- For each generated testcase:
  - semantic search existing tests
  - if best score >= threshold: **reuse stored test** but still upsert new embedding/meta
  - else: treat as **new** and upsert

---

## Playwright & Page Objects

### Playwright config
- **File:** `playwright.config.js`
- Key decisions:
  - `testDir: './output'` → generated specs go into `output/`
  - Reporters include list + blob; ReportPortal optional via `RP_ENABLE=true`.

### Page object folder(s)
- `/pages/*.js` is the folder the generator reads and reuses (`readExistingPages('pages')`).
- There is also `src/pages/*` in this repo; it appears to be a second copy / alternate location. The generation prompt explicitly references `pages/LoginPage.js`, so **`/pages` is the “active” POM folder for generation**.

---

## Locator extraction (UI controls snapshot)

- **File:** `src/services/locatorService.js`
- This is a standalone script that launches Chromium, logs in, crawls links, and writes a control inventory JSON.
- It currently contains hard-coded BASE_URL/USERNAME/PASSWORD and writes `ui-controls.json` in its working directory.
- The pipeline expects `output/ui-controls.json` (note the path difference).

---

## “Where should I change X?”

- **Change PRD parsing format** → `src/agents/prdAgent.js`
- **Change manual testcase schema / strictness** → `src/rules/BRDToManual.rule`
- **Change coverage expansion behavior** → `src/agents/testCaseAgent.js` (the appended `expansion` block)
- **Change Playwright generation conventions** → `src/rules/ManualToPlaywright.rule`
- **Change vector dedup/reuse behavior** → `src/vector/prdTestcaseEnrichment.js`
- **Switch vector backend** → env `VECTOR_STORE` + `src/vector/vectorStore.js`
- **Confluence connectivity** → `src/services/confluenceService.js` (+ env)
- **Xray export details** → `src/services/xrayService.js` / `src/agents/xrayAgent.js`
- **Web endpoints** → `src/web/server.js`

---

## Notable implementation quirks (good to know)

- `src/services/openaiClient.js` defines `maxOutputTokens` and `timeoutMs` but currently comments out `max_output_tokens` and `timeout` in the axios request. If you see long or truncated outputs, this is a likely place to adjust.
- `src/services/selectorStore.js` references `loadMemory()` but doesn’t import/define it (likely meant to use `selectorTrainer.loadMemory`). The healing flow may be partially implemented.
- `locatorService.js` is more of a prototype script (hard-coded creds). The main pipeline uses `output/ui-controls.json`.

If you want, tell me **which part you’re most interested in** (CLI pipeline vs web server vs vector memory vs Playwright generation) and I’ll draw a more detailed “request → call stack” trace for that path.