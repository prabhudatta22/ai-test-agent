// Quick smoke-check for Xray Cloud connectivity.
//
// Usage:
//   node src/agents/xraySmoke.js
//   node src/agents/xraySmoke.js "project = VIB AND issuetype = Test"
//
require('dotenv').config();

const { getXrayTests } = require('../services/xrayService');

(async () => {
  const jql = process.argv[2] || 'issuetype = "Test" order by created DESC';
  const tests = await getXrayTests(jql);
  console.log(`OK. Returned ${tests.length} tests for JQL: ${jql}`);
  if (tests[0]) {
    console.log('Sample:', {
      testKey: tests[0].testKey,
      summary: tests[0].summary,
      type: tests[0].type,
      steps: tests[0].steps?.length
    });
  }
})().catch((e) => {
  console.error('Xray smoke failed:', e.response?.data || e.message);
  process.exitCode = 1;
});
