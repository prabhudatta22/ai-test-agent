require('dotenv').config();
const logger = require('./utils/logger');
const { getEnv } = require('./utils/env');
const { runPipeline } = require('./app/pipeline');

function readPipelineArgsFromEnv() {
  return {
    spaceKey: getEnv('SPACE_KEY', 'PAYROLL'),
    pageTitle: getEnv('PAGE_TITLE', 'Payroll Gaps Compilation 2'),
    point: getEnv('POINT', 'PAYRL-117726'),
    prdFile: getEnv('PRD_FILE', undefined),
  };
}

(async () => {
  try {
    const args = readPipelineArgsFromEnv();
    await runPipeline(args);
  } catch (err) {
    const status = err?.response?.status;
    if (status) {
      logger.error(`${err.message} (HTTP ${status})`);
    } else {
      logger.error(err?.stack || err?.message || String(err));
    }
    process.exitCode = 1;
  }
})();