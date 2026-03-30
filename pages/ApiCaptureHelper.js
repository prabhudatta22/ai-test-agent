/**
 * Captures XHR/Fetch network calls during Playwright UI tests and supports
 * lightweight API validation via page.request (same cookies/storage as the page).
 *
 * Usage:
 *   const capture = createApiCapture(page);
 *   capture.start();
 *   // ... UI steps ...
 *   const summary = await capture.stop();
 *   await validateCapturedApis(page, expect, summary, { replayGetOnly: true });
 */

const DEFAULT_IGNORE_SUBSTRINGS = [
  'google-analytics',
  'googletagmanager',
  'doubleclick',
  'hotjar',
  'segment.io',
  'sentry.io',
  'newrelic',
  'browser-intake',
  'datadog',
];

function normalizeUrlForDedupe(url) {
  try {
    const u = new URL(url);
    u.hash = '';
    ['utm_source', 'utm_medium', 'utm_campaign', '_', 't', 'ts'].forEach((k) =>
      u.searchParams.delete(k)
    );
    return `${u.origin}${u.pathname}${u.search}`;
  } catch {
    return url.split('#')[0];
  }
}

function shouldCapture(request, options) {
  const rt = request.resourceType();
  if (rt !== 'xhr' && rt !== 'fetch') return false;
  const url = request.url();
  if (!url || url.startsWith('data:') || url.startsWith('blob:')) return false;

  const lower = url.toLowerCase();
  const ignore = options.ignoreSubstrings || DEFAULT_IGNORE_SUBSTRINGS;
  if (ignore.some((s) => lower.includes(s))) return false;

  if (options.urlAllowlist?.length) {
    return options.urlAllowlist.some((re) => re.test(url));
  }
  if (options.urlDenylist?.length) {
    if (options.urlDenylist.some((re) => re.test(url))) return false;
  }

  const staticExt = /\.(js|mjs|cjs|css|png|jpe?g|gif|webp|svg|ico|woff2?|ttf|map)(\?|$)/i;
  if (staticExt.test(url.split('?')[0])) return false;

  return true;
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {{
 *   ignoreSubstrings?: string[],
 *   urlAllowlist?: RegExp[],
 *   urlDenylist?: RegExp[],
 * }} [options]
 */
function createApiCapture(page, options = {}) {
  /** @type {Map<string, { method: string, url: string, normalizedUrl: string, postData: string|null, status: number|null, resourceType: string }>} */
  const byKey = new Map();

  /** @type {(req: import('@playwright/test').Request) => void} */
  let onRequest;
  /** @type {(res: import('@playwright/test').Response) => void} */
  let onResponse;

  let started = false;

  function upsertRequest(req) {
    if (!shouldCapture(req, options)) return;
    const method = req.method();
    const url = req.url();
    const normalizedUrl = normalizeUrlForDedupe(url);
    const key = `${method} ${normalizedUrl}`;
    const postData = req.postData() || null;
    const prev = byKey.get(key);
    byKey.set(key, {
      method,
      url,
      normalizedUrl,
      postData,
      status: prev?.status ?? null,
      resourceType: req.resourceType(),
    });
  }

  function upsertResponse(res) {
    const req = res.request();
    if (!shouldCapture(req, options)) return;
    const method = req.method();
    const url = req.url();
    const normalizedUrl = normalizeUrlForDedupe(url);
    const key = `${method} ${normalizedUrl}`;
    const postData = req.postData() || null;
    const prev = byKey.get(key);
    byKey.set(key, {
      method,
      url,
      normalizedUrl,
      postData,
      status: res.status(),
      resourceType: req.resourceType(),
    });
  }

  return {
    start() {
      if (started) return;
      started = true;
      onRequest = (req) => upsertRequest(req);
      onResponse = (res) => upsertResponse(res);
      page.on('request', onRequest);
      page.on('response', onResponse);
    },

    async stop() {
      if (!started) return { endpoints: [], records: [] };
      started = false;
      if (onRequest) page.off('request', onRequest);
      if (onResponse) page.off('response', onResponse);
      const records = [...byKey.values()];
      const outPath = process.env.API_CAPTURE_OUT;
      if (outPath) {
        try {
          const fs = require('fs');
          const path = require('path');
          const target = path.resolve(process.cwd(), outPath);
          fs.mkdirSync(path.dirname(target), { recursive: true });
          fs.writeFileSync(target, JSON.stringify(records, null, 2), 'utf8');
        } catch {
          // non-fatal
        }
      }
      return { endpoints: records, records };
    },

    /** @returns {typeof byKey extends Map<any, infer V> ? V[] : never} */
    snapshot() {
      return [...byKey.values()];
    },
  };
}

/**
 * Replays safe, idempotent requests using page.request (inherits auth cookies).
 * Mutating methods are skipped unless replayMutating=true (use with care).
 *
 * @param {import('@playwright/test').Page} page
 * @param {import('@playwright/test').Expect} expect
 * @param {{ endpoints: Array<{ method: string, url: string, postData: string|null, status: number|null }> }} summary
 * @param {{ replayGetOnly?: boolean, replayMutating?: boolean, maxCalls?: number }} [opts]
 */
async function validateCapturedApis(page, expect, summary, opts = {}) {
  const replayGetOnly = opts.replayGetOnly !== false;
  const replayMutating = opts.replayMutating === true;
  const maxCalls = Number(opts.maxCalls || process.env.API_CAPTURE_MAX_REPLAY || 25);

  const list = (summary.endpoints || summary.records || []).filter(Boolean);
  const seen = new Set();
  let count = 0;

  for (const ep of list) {
    if (count >= maxCalls) break;
    const method = String(ep.method || 'GET').toUpperCase();
    const url = ep.url;
    if (!url) continue;

    if (replayGetOnly && !['GET', 'HEAD', 'OPTIONS'].includes(method)) {
      if (!replayMutating) {
        if (typeof ep.status === 'number') {
          expect(ep.status, `Captured ${method} ${url} should have been attempted`).toBeLessThan(600);
        }
        continue;
      }
    }

    const dedupeKey = `${method} ${normalizeUrlForDedupe(url)}`;
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);

    let res;
    try {
      if (method === 'GET' || method === 'HEAD') {
        res = await page.request.fetch(url, { method });
      } else if (replayMutating && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
        const headers = {};
        if (ep.postData) {
          try {
            JSON.parse(ep.postData);
            headers['content-type'] = 'application/json';
          } catch {
            headers['content-type'] = 'application/x-www-form-urlencoded';
          }
        }
        res = await page.request.fetch(url, {
          method,
          data: ep.postData || undefined,
          headers,
        });
      } else {
        continue;
      }
    } catch (e) {
      expect.soft(false, `API replay failed for ${method} ${url}: ${e.message}`).toBe(true);
      continue;
    }

    count += 1;
    expect
      .soft(res.ok(), `${method} ${url} — expected ok(), got ${res.status()}`)
      .toBeTruthy();
  }
}

module.exports = {
  createApiCapture,
  validateCapturedApis,
  normalizeUrlForDedupe,
};
