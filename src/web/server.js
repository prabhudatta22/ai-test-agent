require('dotenv').config();

const path = require('path');
const express = require('express');
const multer = require('multer');
const JSZip = require('jszip');

const { getConfluenceContentById } = require('../services/confluenceService');
const { extractStructuredRequirements } = require('../agents/prdAgent');
const { generateTestCasesAsArray } = require('../agents/testCaseAgent');
const { generatePlaywright } = require('../agents/playwrightAgent');
const { parseMultiFileOutput } = require('../utils/multiFileWriter');
const { enrichPrdTestsWithVector, toVectorDoc } = require('../vector/prdTestcaseEnrichment');
const { indexTestcase } = require('../vector/testcaseVectorService');
const { closeVectorStore } = require('../vector/vectorStore');
const { getEnv } = require('../utils/env');
const { createJob, updateJob, getJob, listJobs, getArtifactPath } = require('./jobStore');

const app = express();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

function parseConfluencePageId(prdLink) {
  const raw = String(prdLink || '').trim();
  if (!raw) return '';
  const fromParam = raw.match(/[?&]pageId=(\d+)/i);
  if (fromParam) return fromParam[1];
  const fromPath = raw.match(/\/pages\/(\d+)/i);
  if (fromPath) return fromPath[1];
  return '';
}

function uniqueBySignature(cases) {
  const map = new Map();
  let duplicatesRemoved = 0;
  for (const tc of Array.isArray(cases) ? cases : []) {
    const signature = [
      String(tc?.title || '').trim().toLowerCase(),
      String(tc?.description || '').trim().toLowerCase(),
      String(tc?.steps || '').trim().toLowerCase(),
      String(tc?.expected || '').trim().toLowerCase(),
      String(tc?.module || '').trim().toLowerCase(),
      String(tc?.TestType || '').trim().toLowerCase(),
    ].join('||');
    if (!map.has(signature)) map.set(signature, tc);
    else duplicatesRemoved += 1;
  }
  return { cases: [...map.values()], duplicatesRemoved };
}

function normalizeCase(tc) {
  const out = { ...(tc || {}) };
  if (Array.isArray(out.steps)) out.steps = out.steps.join('\n');
  if (typeof out.steps !== 'string') out.steps = String(out.steps || '');
  if (typeof out.expected !== 'string') out.expected = String(out.expected || '');
  if (!out.testId) out.testId = '';
  return out;
}

async function buildManualTestcases({ prdLink, jiraTicket }) {
  const pageId = parseConfluencePageId(prdLink);
  if (!pageId) throw new Error('Invalid PRD link. Provide a Confluence link that contains pageId=... or /pages/<id>.');
  if (!jiraTicket || !String(jiraTicket).trim()) throw new Error('JIRA ticket is required.');

  let upserted = 0;
  try {
    const prdText = await getConfluenceContentById(pageId);
    const structured = await extractStructuredRequirements(prdText);
    const generatedCases = await generateTestCasesAsArray(structured);

    const threshold = Number(getEnv('VECTOR_DUP_THRESHOLD', '0.86'));
    const enriched = await enrichPrdTestsWithVector(generatedCases, { threshold, limit: 5 });
    const normalized = enriched.tests.map(normalizeCase);
    const deduped = uniqueBySignature(normalized);

    for (let i = 0; i < deduped.cases.length; i += 1) {
      const doc = toVectorDoc(deduped.cases[i], i);
      await indexTestcase(doc);
      upserted += 1;
    }

    return {
      fileName: `${String(jiraTicket).trim()}_manual_testcases.json`.replace(/\s+/g, '_'),
      data: deduped.cases,
      stats: {
        generated: Array.isArray(generatedCases) ? generatedCases.length : 0,
        reusedFromDb: enriched.stats?.reused || 0,
        newFromModel: enriched.stats?.new || 0,
        vectorFailed: enriched.stats?.failed || 0,
        signatureDuplicatesRemoved: deduped.duplicatesRemoved,
        finalUnique: deduped.cases.length,
        upserted,
        dedupThreshold: threshold,
      },
    };
  } finally {
    try {
      await closeVectorStore();
    } catch (_) {
      // ignore cleanup errors
    }
  }
}

app.get('/health', (_req, res) => {
  res.json({ ok: true });
});

app.post('/api/manual-testcases', async (req, res) => {
  const { prdLink, jiraTicket } = req.body || {};
  try {
    const built = await buildManualTestcases({ prdLink, jiraTicket });
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${built.fileName}"`);
    res.setHeader('X-Upserted-Count', String(built.stats.upserted));
    res.setHeader('X-Dedup-Removed', String(built.stats.signatureDuplicatesRemoved));
    return res.send(JSON.stringify(built.data, null, 2));
  } catch (error) {
    const msg = error.message || 'Manual testcase generation failed.';
    const status = msg.startsWith('Invalid PRD link') || msg === 'JIRA ticket is required.' ? 400 : 500;
    return res.status(status).json({ error: msg });
  }
});

app.post('/api/playwright-tests', upload.single('manualTestcaseFile'), async (req, res) => {
  const file = req.file;
  const repoLink = String(req.body?.playwrightRepoLink || '').trim();
  if (!file) {
    return res.status(400).json({ error: 'manualTestcaseFile is required.' });
  }
  if (!repoLink) {
    return res.status(400).json({ error: 'Playwright repo link is required.' });
  }

  try {
    const jsonText = file.buffer.toString('utf8');
    const parsed = JSON.parse(jsonText);
    if (!Array.isArray(parsed)) {
      return res.status(400).json({ error: 'Uploaded manual testcase JSON must be an array.' });
    }

    const generated = await generatePlaywright(parsed);
    const parsedFiles = parseMultiFileOutput(generated);

    const zip = new JSZip();
    zip.file(
      'README.txt',
      [
        'Generated by ai-test-agent web workflow.',
        `Playwright repo link provided: ${repoLink}`,
        '',
        'If output contains multiple files, they are included below.',
      ].join('\n')
    );

    if (parsedFiles.length > 0) {
      for (const f of parsedFiles) {
        zip.file(f.filePath, f.content);
      }
    } else {
      zip.file('generated.spec.js', String(generated || ''));
    }

    const zipBuffer = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', 'attachment; filename="playwright-tests.zip"');
    return res.send(zipBuffer);
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Playwright generation failed.' });
  }
});

app.post('/api/manual-testcases/jobs', async (req, res) => {
  const { prdLink, jiraTicket } = req.body || {};
  const job = createJob('manual-testcases', { prdLink, jiraTicket });
  res.status(202).json({ jobId: job.id, status: job.status });

  setImmediate(async () => {
    updateJob(job.id, { status: 'running', startedAt: new Date().toISOString() });
    try {
      const built = await buildManualTestcases({ prdLink, jiraTicket });
      const artifactPath = getArtifactPath(job.id, built.fileName);
      require('fs').writeFileSync(artifactPath, JSON.stringify(built.data, null, 2), 'utf8');
      updateJob(job.id, {
        status: 'completed',
        finishedAt: new Date().toISOString(),
        output: { ...built.stats, fileName: built.fileName, artifactPath },
      });
    } catch (error) {
      updateJob(job.id, {
        status: 'failed',
        finishedAt: new Date().toISOString(),
        error: error.message || 'Job failed',
      });
    }
  });
});

app.post('/api/playwright-tests/jobs', upload.single('manualTestcaseFile'), async (req, res) => {
  const repoLink = String(req.body?.playwrightRepoLink || '').trim();
  if (!req.file) return res.status(400).json({ error: 'manualTestcaseFile is required.' });
  if (!repoLink) return res.status(400).json({ error: 'Playwright repo link is required.' });

  const job = createJob('playwright-tests', { repoLink, fileName: req.file.originalname || 'manual.json' });
  const fileBuffer = Buffer.from(req.file.buffer);
  res.status(202).json({ jobId: job.id, status: job.status });

  setImmediate(async () => {
    updateJob(job.id, { status: 'running', startedAt: new Date().toISOString() });
    try {
      const parsed = JSON.parse(fileBuffer.toString('utf8'));
      if (!Array.isArray(parsed)) throw new Error('Uploaded manual testcase JSON must be an array.');
      const generated = await generatePlaywright(parsed);
      const parsedFiles = parseMultiFileOutput(generated);
      const zip = new JSZip();
      zip.file('README.txt', `Playwright repo link provided: ${repoLink}\n`);
      if (parsedFiles.length > 0) {
        for (const f of parsedFiles) zip.file(f.filePath, f.content);
      } else {
        zip.file('generated.spec.js', String(generated || ''));
      }
      const zipBuffer = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
      const fileName = 'playwright-tests.zip';
      const artifactPath = getArtifactPath(job.id, fileName);
      require('fs').writeFileSync(artifactPath, zipBuffer);
      updateJob(job.id, {
        status: 'completed',
        finishedAt: new Date().toISOString(),
        output: { fileName, artifactPath, filesGenerated: parsedFiles.length || 1 },
      });
    } catch (error) {
      updateJob(job.id, {
        status: 'failed',
        finishedAt: new Date().toISOString(),
        error: error.message || 'Job failed',
      });
    }
  });
});

app.get('/api/jobs', (req, res) => {
  const limit = Number(req.query?.limit || 20);
  res.json({ jobs: listJobs(limit) });
});

app.get('/api/jobs/:id', (req, res) => {
  const job = getJob(req.params.id);
  if (!job) return res.status(404).json({ error: 'Job not found' });
  return res.json(job);
});

app.get('/api/jobs/:id/download', (req, res) => {
  const job = getJob(req.params.id);
  if (!job) return res.status(404).json({ error: 'Job not found' });
  if (job.status !== 'completed' || !job.output?.artifactPath) {
    return res.status(400).json({ error: 'Job output not ready' });
  }
  return res.download(job.output.artifactPath, job.output.fileName || 'artifact');
});

const port = Number(getEnv('WEB_PORT', '3000'));
app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`Web app running at http://localhost:${port}`);
});

