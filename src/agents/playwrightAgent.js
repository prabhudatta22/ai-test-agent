const { callAI } = require('../services/openaiClient');
const fs = require('fs');
const path = require('path');

function readExistingPages(pagesDir) {
  const resolved = path.resolve(process.cwd(), pagesDir);
  if (!fs.existsSync(resolved)) return '';
  const files = fs
    .readdirSync(resolved)
    .filter((f) => f.endsWith('.js'))
    .sort();

  const chunks = [];
  for (const f of files) {
    const p = path.join(resolved, f);
    try {
      const content = fs.readFileSync(p, 'utf8');
      chunks.push(`// --- ${pagesDir}/${f} ---\n${content}`);
    } catch {
      // ignore
    }
  }
  return chunks.join('\n\n');
}

async function generatePlaywright(testCases) {
    const manualRule = fs.readFileSync('src/rules/ManualToPlaywright.rule', 'utf-8');
    const existingPages = readExistingPages('pages');

    const navPath = path.join(__dirname, '..', 'nav', 'pms.nav');
    const navContents = fs.existsSync(navPath) ? fs.readFileSync(navPath, 'utf8') : '';

    // ManualToPlaywright.rule contains placeholders: ${jsFile}, ${navFile}, ${existingPages}
    const json = typeof testCases === 'string' ? testCases : JSON.stringify(testCases, null, 2);
    let prompt = manualRule.replace('${jsFile}', json);
    prompt = prompt.replace('${navFile}', navContents).replace('${existingPages}', existingPages);

    const code = await callAI(prompt, {
      model: process.env.OPENAI_MODEL || 'gpt-4.1-mini',
      temperature: 0.2,

    });

    // const cleaned = String(code || '')
    //   .replace(/^```[a-zA-Z]*\n?/g, '')
    //   .replace(/```\s*$/g, '')
    //   .trim();

    return code;
}

module.exports = { generatePlaywright };