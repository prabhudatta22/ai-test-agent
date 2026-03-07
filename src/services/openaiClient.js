const axios = require('axios');
const { retry } = require('../utils/retry');
const { requireEnv } = require('../utils/env');


async function callAI(prompt, { model, temperature = 0.2, maxOutputTokens = 2500, timeoutMs = 180_000 } = {}) {
  const apiKey = requireEnv('OPENAI_API_KEY');

  const finalModel =  'gpt-4.1-mini';

  const payload = {
    model: finalModel,
    input: prompt,
    temperature,
    //max_output_tokens: maxOutputTokens,
  };

  const response = await axios.post('https://api.openai.com/v1/responses', payload, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    //timeout: timeoutMs,
  });

  return response.data.output?.[0]?.content?.[0]?.text ?? '';
}


module.exports = { callAI };
