const { URL } = require('url');

function normalizeUrl(url) {
  try {
    const parsed = new URL(url);
    parsed.hash = '';
    return parsed.toString().replace(/\/$/, '');
  } catch {
    return null;
  }
}

function getHostname(url) {
  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
}

function isSameDomain(baseHostname, targetUrl) {
  try {
    return new URL(targetUrl).hostname === baseHostname;
  } catch {
    return false;
  }
}

module.exports = {
  normalizeUrl,
  getHostname,
  isSameDomain
};