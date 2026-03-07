function cleanEnvValue(value) {
  if (value == null) return undefined;
  let v = String(value).trim();

  // Remove a trailing semicolon that commonly appears in copied `.env` values.
  // Example: KEY="abc";
  if (v.endsWith(';')) v = v.slice(0, -1).trim();

  // Remove wrapping quotes
  if (
    (v.startsWith('"') && v.endsWith('"')) ||
    (v.startsWith("'") && v.endsWith("'"))
  ) {
    v = v.slice(1, -1);
  }

  // After unquoting, handle any lingering trailing semicolon.
  if (v.endsWith(';')) v = v.slice(0, -1).trim();

  return v;
}

function getEnv(name, fallback) {
  const raw = process.env[name];
  const cleaned = cleanEnvValue(raw);
  return cleaned || fallback;
}

function requireEnv(name) {
 
  const value = getEnv(name);
  if (!value) {
    throw new Error(
      `Missing env var ${name}. Please set it in .env (without trailing semicolons).`
    );
  }
  return value;
}

module.exports = { cleanEnvValue, getEnv, requireEnv };
