const { callAI } = require('../services/openaiClient');

const fs = require('fs');

function stripCodeFences(text) {
  return String(text || '')
    .replace(/^```[a-zA-Z]*\n?/g, '')
    .replace(/```\s*$/g, '')
    .trim();
}

function extractJsonObject(text) {
  const raw = stripCodeFences(text);
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) return raw;
  return raw.slice(start, end + 1);
}

async function extractStructuredRequirements(prdText) {
    const prompt = `
Convert PRD into structured JSON with features and acceptance criteria.
Return ONLY JSON.
PRD:
${prdText}
`;

    // callAI expects a string prompt (it will put it into the Responses API payload)
    const response = await callAI(prompt);
    const jsonText = extractJsonObject(response);
    return JSON.parse(jsonText);
}

module.exports = { extractStructuredRequirements };