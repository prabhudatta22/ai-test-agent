const { callAI } = require('../services/openaiClient');
const { loadSelectors, saveSelectors } = require('../services/selectorStore');

async function healSelector(failedSelector, domSnapshot) {

    const prompt = `
Selector "${failedSelector}" failed.
Suggest alternative selector from DOM below.
Return only selector string.
${domSnapshot}
`;

    const newSelector = await callAI(prompt);

    const store = loadSelectors();
    store[failedSelector] = newSelector.trim();
    saveSelectors(store);

    return newSelector.trim();
}

module.exports = { healSelector };