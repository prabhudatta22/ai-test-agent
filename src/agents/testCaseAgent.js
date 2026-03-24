const { callAI } = require('../services/openaiClient');
const fs = require('fs');

function tryRepairJsonArray(text) {
  // Simple heuristic repair for common model mistakes:
  // - trailing commas
  // - smart quotes
  // - code fences
  return String(text || '')
    .replace(/^```[a-zA-Z]*\n?/g, '')
    .replace(/```\s*$/g, '')
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/,\s*([\]}])/g, '$1')
    .trim();
}

function extractJsonArray(text) {
  const raw = String(text || '').trim();
  const start = raw.indexOf('[');
  const end = raw.lastIndexOf(']');
  if (start === -1 || end === -1 || end <= start) return raw;
  return raw.slice(start, end + 1);
}

async function generateTestCases(structuredPRD) {
//     const prompt = `
// Generate Playwright-ready test cases in JSON format.
// Return ONLY JSON array.
// Input:
// ${JSON.stringify(structuredPRD)}
// `;
    const prd = typeof structuredPRD === 'string' ? structuredPRD : JSON.stringify(structuredPRD, null, 2);
    // Expand coverage: we keep strict JSON output rules in BRDToManual.rule,
    // but add additional instruction to maximize scenario breadth.
    const baseRule = fs.readFileSync('src/rules/BRDToManual.rule', 'utf-8');

    const expansion = `

ADDITIONAL REQUIREMENT (coverage expansion)

Generate as MANY distinct test cases as reasonably possible for the PRD.

You MUST include scenarios across multiple test design methodologies, for every feature/module:
- Happy path / smoke
- Negative scenarios (invalid inputs, failures)
- Boundary/value analysis (min/max/empty/large values)
- State transitions and workflow variations
- RBAC / roles and permissions (if PRD mentions roles)
- Security checks (authz/authn, input injection, sensitive data exposure) when applicable
- Integration/API validation scenarios if PRD mentions integrations
- Performance-related acceptance criteria ONLY when PRD mentions response time / load
- Accessibility / usability checks when UI is involved (where applicable)

De-dup rule:
- Do NOT output duplicates. If two scenarios are similar, merge them or keep the stricter one.

Atomicity rule:
- Keep each test case atomic (one primary assertion).

Important: still return ONLY the JSON array in the exact schema.
`;

    const prompt = baseRule.replace('{PRD}', prd) + expansion;

    const response = await callAI(prompt, {
      model: process.env.OPENAI_MODEL || 'gpt-4.1-mini',
      temperature: 0.2,
     // maxOutputTokens: 3500,
     // timeoutMs: 90_000
    });
    const jsonText = extractJsonArray(response);
    return jsonText;
    // try {
    //   return JSON.parse(jsonText);
    // } catch (e) {
    //   // Attempt light repair and parse again.
    //   const repaired = tryRepairJsonArray(jsonText);
    //   return JSON.parse(repaired);
    // }
}

/**
 * Convenience helper: generate testcases AND parse to array.
 * Existing callers can keep using `generateTestCases`.
 */
async function generateTestCasesAsArray(structuredPRD) {
  const jsonText = await generateTestCases(structuredPRD);
  try {
    return JSON.parse(jsonText);
  } catch (e) {
    const repaired = tryRepairJsonArray(jsonText);
    return JSON.parse(repaired);
  }
}

module.exports = { generateTestCases, generateTestCasesAsArray };