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