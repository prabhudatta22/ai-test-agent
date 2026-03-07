const crawler = require('./utils/crawler');
const fs = require("fs-extra");
const { getXrayToken, getXrayTests, getTestsByFolder } = require("./services/xrayService");

// This file is also used as a standalone script; load `.env` automatically.
require('dotenv').config();

// (async () => {
//   try {
//     await crawler.start();
//     console.log('Crawling completed.');
//   } catch (error) {
//     console.error('Crawler failed:', error);
//   }
// })();



async function run() {

  const rootFolder = "/VIB";   // Project root
  // Xray Cloud GraphQL requires projectId/testPlanId when filtering by folder.
  // Set XRAY_PROJECT_ID in .env (preferred) or pass it in explicitly here.
  const projectId = process.env.XRAY_PROJECT_ID;

  console.log("Crawling Xray Repository...");

  const tests = await getTestsByFolder(await getXrayToken(), rootFolder, {
    projectId,
    includeDescendants: false,
    limit: 100
  });

  await fs.writeJson("../output/xray-tests.json", tests, { spaces: 2 });

  console.log(`Extracted ${tests.length} tests`);
}

run();