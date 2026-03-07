// chalk v5 is ESM-only. When required from CommonJS it sits under `.default`.
// Support both shapes so the repo works regardless of chalk version.
// eslint-disable-next-line global-require
const chalkImport = require('chalk');
const chalk = chalkImport.default || chalkImport;

const logger = {
    info: (msg) => console.log(chalk.blue(String(msg))),
    success: (msg) => console.log(chalk.green(String(msg))),
    warn: (msg) => console.log(chalk.yellow(String(msg))),
    error: (msg) => console.log(chalk.red(String(msg)))
};

module.exports = logger;