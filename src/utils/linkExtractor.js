const { normalizeUrl, isSameDomain } = require('./utils');

async function extractLinks(page, baseHostname) {
  const links = await page.evaluate(() =>
    Array.from(document.querySelectorAll('a[href]')).map(a => a.href)
  );

  return links
    .map(link => normalizeUrl(link))
    .filter(link => link)
    .filter(link => isSameDomain(baseHostname, link));
}

module.exports = { extractLinks };