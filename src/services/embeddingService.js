const OpenAI = require('openai');
const { requireEnv, getEnv } = require('../utils/env');

// Keep this in one place so every consumer uses the same embedding model + dimension.
const DEFAULT_EMBEDDING_MODEL = 'text-embedding-3-small';

function getOpenAIClient() {
  const apiKey = requireEnv('OPENAI_API_KEY');
  return new OpenAI({ apiKey });
}

/**
 * Create an embedding for a piece of text.
 *
 * @param {string} text
 * @param {{ model?: string }} [opts]
 * @returns {Promise<number[]>}
 */
async function createEmbedding(text, { model } = {}) {
  const client = getOpenAIClient();
  const finalModel = model || getEnv('OPENAI_EMBEDDING_MODEL', DEFAULT_EMBEDDING_MODEL);

  const response = await client.embeddings.create({
    model: finalModel,
    input: String(text || '')
  });

  const embedding = response?.data?.[0]?.embedding;
  if (!Array.isArray(embedding)) {
    throw new Error('OpenAI embedding response did not include an embedding vector');
  }
  return embedding;
}

module.exports = {
  DEFAULT_EMBEDDING_MODEL,
  createEmbedding,
};
