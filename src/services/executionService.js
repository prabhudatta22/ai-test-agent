const { exec } = require('child_process');
const logger = require('../utils/logger');

function runTests() {
    return new Promise((resolve, reject) => {
        exec("npx playwright test", (err, stdout, stderr) => {
            if (err) {
                logger.error("Test execution failed.");
                return reject(stderr);
            }
            logger.success("Tests passed.");
            resolve(stdout);
        });
    });
}

module.exports = { runTests };