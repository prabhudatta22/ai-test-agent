const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.resolve(process.cwd(), 'output', 'web-jobs');
const JOBS_FILE = path.join(ROOT, 'jobs.json');

function ensureStore() {
  fs.mkdirSync(ROOT, { recursive: true });
  if (!fs.existsSync(JOBS_FILE)) fs.writeFileSync(JOBS_FILE, JSON.stringify({}, null, 2), 'utf8');
}

function readAll() {
  ensureStore();
  try {
    return JSON.parse(fs.readFileSync(JOBS_FILE, 'utf8'));
  } catch (_) {
    return {};
  }
}

function writeAll(data) {
  ensureStore();
  fs.writeFileSync(JOBS_FILE, JSON.stringify(data, null, 2), 'utf8');
}

function createJob(type, input = {}) {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const all = readAll();
  all[id] = {
    id,
    type,
    status: 'queued',
    input,
    output: null,
    error: null,
    createdAt: now,
    startedAt: null,
    finishedAt: null,
  };
  writeAll(all);
  return all[id];
}

function updateJob(id, patch) {
  const all = readAll();
  if (!all[id]) return null;
  all[id] = { ...all[id], ...patch };
  writeAll(all);
  return all[id];
}

function getJob(id) {
  const all = readAll();
  return all[id] || null;
}

function listJobs(limit = 20) {
  const all = readAll();
  return Object.values(all)
    .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))
    .slice(0, limit);
}

function getArtifactPath(jobId, fileName) {
  ensureStore();
  return path.join(ROOT, `${jobId}_${fileName}`);
}

module.exports = {
  createJob,
  updateJob,
  getJob,
  listJobs,
  getArtifactPath,
};

