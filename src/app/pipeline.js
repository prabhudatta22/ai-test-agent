const fs = require('fs');
const path = require('path');

const logger = require('../utils/logger');
const { getEnv } = require('../utils/env');
const { writeFile, readFile } = require('../utils/fileManager');

const { getConfluenceContent } = require('../services/confluenceService');
const { extractStructuredRequirements } = require('../agents/prdAgent');
const { generateTestCasesAsArray } = require('../agents/testCaseAgent');
const { generatePlaywright } = require('../agents/playwrightAgent');
const { parseMultiFileOutput, writeGeneratedFiles } = require('../utils/multiFileWriter');
const { generatePOM } = require('../agents/generatePageObjectAgent');

const { indexTestcase } = require('../vector/testcaseVectorService');
const { closeVectorStore } = require('../vector/vectorStore');
const { enrichPrdTestsWithVector } = require('../vector/prdTestcaseEnrichment');
const { reportVectorUpsert, reportVectorCounts } = require('../vector/vectorExecutionReporter');

function isVectorVerbose() {
  return String(getEnv('VECTOR_REPORT_VERBOSE', 'false')).toLowerCase() === 'true';
}

function fileExists(p) {
  try {
    return fs.existsSync(p);
  } catch (_) {
    return false;
  }
}

async function fetchPrd({ spaceKey, pageTitle, prdFile }) {
  logger.info('Fetching PRD...');
  try {
    return await getConfluenceContent(spaceKey, pageTitle);
  } catch (e) {
    const status = e?.response?.status;
    const localPath = prdFile || process.env.PRD_FILE || 'sample_prd.txt';
    if (status === 401 || status === 403) {
      logger.warn(`Confluence auth failed (${status}). Falling back to local PRD file: ${localPath}`);
      return fs.readFileSync(localPath, 'utf8');
    }
    throw e;
  }
}

/**
 * Main PRD -> Manual tests -> Playwright pipeline.
 * Keeps behavior-compatible defaults but moves orchestration out of `src/index.js`.
 */
async function runPipeline({
  spaceKey,
  pageTitle,
  point,
  prdFile,
  outputDir = 'output',
  uiControlsPath = path.join('output', 'ui-controls.json'),
} = {}) {
  if (!spaceKey || !pageTitle) {
    throw new Error('runPipeline requires spaceKey and pageTitle');
  }

  const prd = await fetchPrd({ spaceKey, pageTitle, prdFile });

  logger.info('Structuring PRD...');
  const structured = await extractStructuredRequirements(prd);

  logger.info('Generating manual test cases...');
  const generatedCases = await generateTestCasesAsArray(structured);

  const vectorEnabled = String(getEnv('VECTORDB_ENABLED', 'false')).toLowerCase() === 'true';
  logger.info(`VECTORDB_ENABLED=${vectorEnabled}`);

  let finalCases = generatedCases;
  if (vectorEnabled) {
    const dedupThreshold = Number(getEnv('VECTOR_DUP_THRESHOLD', '0.86'));
    const ingestOnlyNew = String(getEnv('VECTOR_INGEST_ONLY_NEW', 'true')).toLowerCase() === 'true';
    if (isVectorVerbose()) {
      logger.info(`VECTORDB_ENABLED=true -> vector searching existing testcases and merging (threshold=${dedupThreshold})...`);
    }

    try {
      const enriched = await enrichPrdTestsWithVector(finalCases, { threshold: dedupThreshold });
      finalCases = enriched.tests;

      if (isVectorVerbose()) {
        logger.info(
          `Vector enrichment done. reused=${enriched.stats.reused}, updated=${enriched.stats.updated}, new=${enriched.stats.new}, failed=${enriched.stats.failed}`
        );
      }

      const docsToUpsert = ingestOnlyNew ? enriched.upsertsNew || [] : enriched.upserts || [];

      let upsertedCount = 0;
      for (const doc of docsToUpsert) {
        const res = await indexTestcase(doc);
        reportVectorUpsert({ inserted: res?.inserted, tc: doc });
        upsertedCount += 1;
      }

      reportVectorCounts({ upserted: upsertedCount, usedForAutomation: finalCases.length });
    } finally {
      await closeVectorStore();
    }
  }

  logger.info('Saving manual test cases (JSON)...');
  const outJsonPath = path.join(outputDir, `${spaceKey}_${pageTitle}_test_cases.json`.replaceAll(' ', '_'));
  writeFile(outJsonPath, JSON.stringify(finalCases, null, 2));

  // Best-effort cleanup of legacy output (non-fatal)
  const legacyCsvPath = path.join(outputDir, `${spaceKey}_${pageTitle}_test_cases.csv`.replaceAll(' ', '_'));
  try {
    if (fileExists(legacyCsvPath)) fs.unlinkSync(legacyCsvPath);
  } catch (e) {
    logger.warn(`Could not remove legacy file ${legacyCsvPath}: ${e.message}`);
  }

  // Page objects are optional; don’t fail the whole pipeline if locators are missing.
  if (point && fileExists(uiControlsPath)) {
    logger.info('Generating Page Object...');
    try {
      // ensure file is readable early
      readFile(uiControlsPath);
      generatePOM(uiControlsPath, path.join(outputDir, `${point}_POM.js`.replaceAll(' ', '_')));
    } catch (e) {
      logger.warn(`Page Object generation skipped: ${e.message}`);
    }
  } else {
    logger.warn(`Page Object generation skipped (missing POINT or ${uiControlsPath}).`);
  }

  logger.info('Generating Playwright tests...');
  const playwrighttest = await generatePlaywright(finalCases);

  logger.info('Saving Playwright tests...');
  const parsedFiles = parseMultiFileOutput(playwrighttest);
  if (parsedFiles.length > 0) {
    writeGeneratedFiles(parsedFiles);
  } else if (point) {
    writeFile(path.join(outputDir, `${point}.test.js`.replaceAll(' ', '_')), playwrighttest);
  } else {
    writeFile(path.join(outputDir, `generated.test.js`), playwrighttest);
  }

  logger.success('AI Automation Agent Completed Successfully!');

  return {
    outJsonPath,
    testCount: Array.isArray(finalCases) ? finalCases.length : 0,
  };
}

module.exports = { runPipeline };

