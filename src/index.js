require('dotenv').config();
const logger = require('./utils/logger');
const fs = require('fs');

const { getConfluenceContent } = require('./services/confluenceService');
const { extractStructuredRequirements } = require('./agents/prdAgent');
const { generateTestCases } = require('./agents/testCaseAgent');
const { generatePlaywright } = require('./agents/playwrightAgent');
const { runTests } = require('./services/executionService');
const { writeFile, readFile} = require('./utils/fileManager');
const {generateClass} = require('./agents/generatePageObjectAgent');

let SPACE_KEY = 'PT';
let PAGE_TITLE = 'Design Document : Content creation templates';
let point = "VIB-1039";

function waitForUser(message = 'Press Enter to continue...') {
    return new Promise(resolve => {
        rl.question(message, () => {
            resolve();
        });
    });
}
(async () => {

    try {
        logger.info("Fetching PRD...");
        let prd;
        try {
            prd = await getConfluenceContent(SPACE_KEY, PAGE_TITLE);
        } catch (e) {
            const status = e?.response?.status;
            const prdPath = process.env.PRD_FILE || 'sample_prd.txt';
            if (status === 401 || status === 403) {
                logger.warn(
                    `Confluence auth failed (${status}). Falling back to local PRD file: ${prdPath}`
                );
                prd = fs.readFileSync(prdPath, 'utf8');
            } else {
                throw e;
            }
        }
        
        logger.info("Structuring PRD...");
        const structured = await extractStructuredRequirements(prd);

        logger.info("Generating manual test cases...");
        const testCases = await generateTestCases(structured);

        logger.info("Saving manual test cases...");
        writeFile(`output/${SPACE_KEY}_${PAGE_TITLE}_test_cases.csv`.replaceAll(' ', '_'), testCases);

        logger.info("Generating Page Object...");
        const locators = readFile('src/rules/vibe/locator.json');
        const pageObjectContent = generateClass(locators);
        writeFile(`output/${point}_PageObject.js`.replaceAll(' ', '_'), pageObjectContent);

        logger.info("Generating Playwright tests...");
        const playwrighttest = await generatePlaywright(testCases);

        logger.info("Saving Playwright tests...");
        writeFile(`output/${point}.test.js`.replaceAll(' ', '_'), playwrighttest);

        // logger.info("Running tests...");
        // await runTests();

        logger.success("AI Automation Agent Completed Successfully!");

    } catch (err) {
        const status = err?.response?.status;
        if (status) {
            logger.error(`${err.message} (HTTP ${status})`);
        } else {
            logger.error(err.message);
        }
        // Ensure the process exits with a failure code, otherwise the app can
        // appear to "hang" (e.g., due to pending timers/retries).
        process.exitCode = 1;
    }

})();