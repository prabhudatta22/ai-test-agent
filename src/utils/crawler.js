const fs = require('fs');
const config = require('../config');
const QueueManager = require('./queueManager');
const browserManager = require('./browserManager');
const { extractDOM } = require('./domExtractor');
const { extractLinks } = require('./linkExtractor');
const { savePage } = require('./storage');
const { normalizeUrl, getHostname, isSameDomain } = require('./utils');

const visited = new Set();
const queue = new QueueManager();

let baseHostname;

async function performLogin() {
  console.log('Performing login...');
  const page = await browserManager.newPage();

  try {
    await page.goto(config.login.loginUrl, {
      timeout: config.navigationTimeout,
      waitUntil: 'networkidle'
    });

    await page.fill(config.login.selectors.usernameInput, config.login.username);
    await page.fill(config.login.selectors.passwordInput, config.login.password);
    await page.click(config.login.selectors.submitButton);

    await page.waitForLoadState('networkidle');

    await browserManager.saveSession();
    console.log('Login successful.');
  } catch (err) {
    console.error('Login failed:', err.message);
    process.exit(1);
  } finally {
    await page.close();
  }
}

async function crawl() {
  await browserManager.init();

  baseHostname = getHostname(config.startUrl);
  console.log(`🔒 Domain locked to: ${baseHostname}`);

  if (!fs.existsSync(config.sessionFile)) {
    await performLogin();
  }

  queue.enqueue({ url: config.startUrl, depth: 0 });

  while (!queue.isEmpty()) {
    const { url, depth } = queue.dequeue();

    if (depth > config.maxDepth) continue;

    const normalized = normalizeUrl(url);
    if (!normalized || visited.has(normalized)) continue;

    // 🔒 HARD DOMAIN CHECK BEFORE VISIT
    if (!isSameDomain(baseHostname, normalized)) {
      continue;
    }

    console.log(`Crawling: ${url} | Depth: ${depth}`);
    visited.add(normalized);

    const page = await browserManager.newPage();

    try {
      await page.goto(url, {
        timeout: config.navigationTimeout,
        waitUntil: 'networkidle'
      });

      // 🔒 HARD DOMAIN CHECK AFTER REDIRECT
      const currentUrl = page.url();
      if (!isSameDomain(baseHostname, currentUrl)) {
        console.log(`⚠ Redirected outside domain. Skipping: ${currentUrl}`);
        await page.close();
        continue;
      }

      const title = await page.title();
      const elements = await extractDOM(page);

      savePage(title || 'Untitled', {
        url: currentUrl,
        depth,
        elements
      });

      const links = await extractLinks(page, baseHostname);

      for (const link of links) {
        if (!visited.has(link)) {
          queue.enqueue({ url: link, depth: depth + 1 });
        }
      }

    } catch (err) {
      console.error(`Failed: ${url}`, err.message);
    } finally {
      await page.close();
    }
  }

  await browserManager.close();
}

module.exports = { start: crawl };