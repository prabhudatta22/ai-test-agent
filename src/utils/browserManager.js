const { chromium } = require('playwright');
const fs = require('fs');
const config = require('../config');

class BrowserManager {
  constructor() {
    this.browser = null;
    this.context = null;
  }

  async init() {
    this.browser = await chromium.launch({ headless: config.headless });

    // Reuse session if exists
    if (fs.existsSync(config.sessionFile)) {
      this.context = await this.browser.newContext({
        storageState: config.sessionFile
      });
    } else {
      this.context = await this.browser.newContext();
    }
  }

  async newPage() {
    return this.context.newPage();
  }

  async saveSession() {
    await this.context.storageState({ path: config.sessionFile });
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
    }
  }
}

module.exports = new BrowserManager();