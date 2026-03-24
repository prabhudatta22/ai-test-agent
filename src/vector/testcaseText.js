/**
 * Convert a testcase object into a canonical text used for embeddings.
 * Keeping this stable improves de-dup and retrieval.
 */
function normalizeWhitespace(s) {
  return String(s || '').replace(/\s+/g, ' ').trim();
}

function stringifySteps(steps) {
  if (!steps) return '';
  if (typeof steps === 'string') return steps;
  if (Array.isArray(steps)) {
    return steps
      .map((s) => {
        if (typeof s === 'string') return s;
        if (s == null) return '';
        // support Xray step shape
        return [s.action, s.data, s.expectedResult, s.result]
          .filter(Boolean)
          .join(' | ');
      })
      .filter(Boolean)
      .join('\n');
  }
  return JSON.stringify(steps);
}

function buildEmbeddingText({ title, description, steps, expected, module, priority, tags, source } = {}) {
  const parts = [
    `source: ${source || ''}`,
    `module: ${module || ''}`,
    `priority: ${priority || ''}`,
    `tags: ${(tags || []).join(', ')}`,
    `title: ${title || ''}`,
    `description: ${description || ''}`,
    `steps:\n${stringifySteps(steps)}`,
    `expected: ${typeof expected === 'string' ? expected : JSON.stringify(expected || '')}`,
  ];

  return normalizeWhitespace(parts.join('\n'));
}

module.exports = { buildEmbeddingText };
