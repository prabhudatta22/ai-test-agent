const axios = require('axios');
const cheerio = require('cheerio');
const { retry } = require('../utils/retry');
const { getEnv, requireEnv } = require('../utils/env');

function normalizeConfluenceBaseUrl(rawUrl) {
    const raw = String(rawUrl || '').trim();
    if (!raw) return '';

    // Remove trailing slashes
    let url = raw.replace(/\/+$/g, '');

    // Confluence Cloud REST base typically includes `/wiki`.
    // If user provided the site root, add `/wiki` automatically.
    if (!url.endsWith('/wiki')) {
        // Avoid double-appending if `/wiki/` or `/wiki` is already present.
        if (!url.includes('/wiki')) {
            url = `${url}/wiki`;
        }
    }

    return url;
}

function getClient() {
    // Read env at runtime so importing this module doesn't crash pipelines that want to fall back.
    const baseUrlRaw = getEnv('CONFLUENCE_BASE_URL') || getEnv('BASE_URL');
    const baseURL = normalizeConfluenceBaseUrl(baseUrlRaw);
    const USERNAME = getEnv('CONFLUENCE_USERNAME');
    const API_TOKEN = getEnv('CONFLUENCE_API_TOKEN');

    // Fail fast with a clear message if not configured.
    requireEnv('CONFLUENCE_USERNAME');
    requireEnv('CONFLUENCE_API_TOKEN');
    if (!baseURL) {
        throw new Error('Missing env var CONFLUENCE_BASE_URL (or BASE_URL). Please set it in .env');
    }

    return axios.create({
        baseURL,
        auth: {
            username: USERNAME,
            password: API_TOKEN,
        },
        headers: {
            Accept: 'application/json',
        },
       // timeout: 15000,
    });
}

/**
 * Get Confluence page content by space key and title
 */
async function getConfluenceContent(spaceKey, pageTitle) {
    const client = getClient();

    const response = await retry(
        async () => {
            return await client.get('/rest/api/content', {
                params: {
                    title: pageTitle,
                    spaceKey,
                    expand: 'body.storage,version'
                }
            });
        },
        3,
        20000,
        {
            shouldRetry: (err) => {
                const status = err?.response?.status;
                // Don't retry auth/config/not-found issues.
                if (status === 401 || status === 403 || status === 404) return false;
                return true;
            }
        }
    );

    if (!response.data.results.length) {
        throw new Error(`Page not found: ${spaceKey} - ${pageTitle}`);
    }

    const page = response.data.results[0];
    const html = page.body.storage.value;

    const cleanedText = cleanConfluenceHTML(html);

    return cleanedText;
}

/**
 * Clean HTML but preserve meaningful structure
 */
function cleanConfluenceHTML(html) {
    const $ = cheerio.load(html);

    // Remove scripts/styles
    $('script, style').remove();

    // Convert tables to readable text
    $('table').each((_, table) => {
        const rows = [];
        $(table).find('tr').each((_, row) => {
            const cols = [];
            $(row).find('th, td').each((_, col) => {
                cols.push($(col).text().trim());
            });
            rows.push(cols.join(' | '));
        });
        $(table).replaceWith('\n' + rows.join('\n') + '\n');
    });

    // Preserve headings
    $('h1, h2, h3, h4').each((_, el) => {
        const text = $(el).text().trim();
        $(el).replaceWith(`\n\n## ${text}\n`);
    });

    return $('body').text().replace(/\n\s*\n/g, '\n\n').trim();
}

/**
 * Optional: Fetch page by ID instead of title (more stable)
 */
async function getConfluenceContentById(pageId) {
    const client = getClient();

    const response = await retry(
        async () => {
            return await client.get(`/rest/api/content/${pageId}`, {
                params: {
                    expand: 'body.storage,version'
                }
            });
        },
        3,
        20000,
        {
            shouldRetry: (err) => {
                const status = err?.response?.status;
                if (status === 401 || status === 403 || status === 404) return false;
                return true;
            }
        }
    );

    const html = response.data.body.storage.value;
    return cleanConfluenceHTML(html);
}

module.exports = {
    getConfluenceContent,
    getConfluenceContentById
};