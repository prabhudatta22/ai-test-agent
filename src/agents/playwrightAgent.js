const { callAI } = require('../services/openaiClient');
const { writeFile } = require('../utils/fileManager');
const fs = require('fs');
const path = require('path');

async function generatePlaywright(testCases) {
    const manualRule = fs.readFileSync('src/rules/ManualToPlaywright.rule', 'utf-8');
    const locatorPath = fs.readFileSync('src/pages/CreatePostPage.js', 'utf-8');

    const navPath = path.join(__dirname, '..', 'nav', 'pms.nav');
    const navContents = fs.existsSync(navPath) ? fs.readFileSync(navPath, 'utf8') : '';

    // ManualToPlaywright.rule contains placeholders: ${jsFile} and ${navFile}
    const json = typeof testCases === 'string' ? testCases : JSON.stringify(testCases, null, 2);
    let prompt = manualRule.replace('${jsFile}', json);
    prompt = prompt.replace('${navFile}', navContents).replace('${locatorFile}', locatorPath);

    const code = await callAI(prompt, {
      model: process.env.OPENAI_MODEL || 'gpt-4.1-mini',
      temperature: 0.2,

    });

    // const cleaned = String(code || '')
    //   .replace(/^```[a-zA-Z]*\n?/g, '')
    //   .replace(/```\s*$/g, '')
    //   .trim();

   // writeFile('playwright-tests/generated.spec.js', cleaned + '\n');
    return code;
}

module.exports = { generatePlaywright };