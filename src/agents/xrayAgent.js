// Standalone runner for exporting Xray test cases.
// NOTE: this file is intended to be executed directly via `node`.
require('dotenv').config();

const fs = require("fs");
const path = require("path");

const { getXrayTests } = require("../services/xrayService");

async function run() {
  try {
    console.log("Fetching Xray test cases...");

    // Allow overriding JQL/output via CLI.
    // Example:
    //   node src/agents/xrayAgent.js "project = VIB AND issuetype = Test" ./output/xray-tests.json
    const jql = process.argv[2] || 'project = VIB AND issuetype = Test';
    const outArg = process.argv[3];
    const filePath = outArg
      ? path.resolve(process.cwd(), outArg)
      : path.resolve(process.cwd(), "output/xray-tests.json");

    const tests = await getXrayTests(jql);

    fs.writeFileSync(
      filePath,
      JSON.stringify(tests, null, 2),
      "utf8"
    );

    console.log(`Test cases saved successfully.`);
    console.log(`File location: ${filePath}`);
    console.log(`Total tests exported: ${tests.length}`);

  } catch (error) {
    console.error("Export failed:", error.message);
  }
}

run();