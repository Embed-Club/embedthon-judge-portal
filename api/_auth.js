const crypto = require('crypto');

const REQUIRED_ENV_VARS = [
  'GITHUB_TOKEN',
  'GIST_ID',
  'ADMIN_PIN',
  'EMBERS_WEBHOOK_TOKEN',
  'JUDGE_PINS_JSON',
  'SESSION_SECRET'
];

function requireEnv(name) {
  const val = process.env[name];
  if (!val || !String(val).trim()) {
    throw new Error(`[AUTH_STARTUP_ERROR] Missing required environment variable: ${name}`);
  }
  return String(val).trim();
}

function validateAuthEnv() {
  const missing = REQUIRED_ENV_VARS.filter((k) => !process.env[k] || !String(process.env[k]).trim());
  if (missing.length > 0) {
    throw new Error(`[AUTH_STARTUP_ERROR] Missing required environment variables: ${missing.join(', ')}`);
  }
  // Validate JUDGE_PINS_JSON is valid JSON
  try {
    const parsed = JSON.parse(process.env.JUDGE_PINS_JSON);
    if (!parsed || typeof parsed !== 'object') throw new Error('must be object');
  } catch (e) {
    throw new Error(`[AUTH_STARTUP_ERROR] JUDGE_PINS_JSON must be valid JSON mapping judgeId -> PIN: ${e.message}`);
  }
}

// Timing-safe string comparison
function safeEqual(a, b) {
  const bufA = Buffer.from(String(a || ''), 'utf8');
  const bufB = Buffer.from(String(b || ''), 'utf8');
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

// Sliding-window in-memory rate limiter for serverless warm instances
const loginAttempts = new Map();
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000;

function checkRateLimit(key) {
  const now = Date.now();
  const entry = loginAttempts.get(key) || [];
  const recent = entry.filter((ts) => now - ts < WINDOW_MS);
  if (recent.length >= MAX_ATTEMPTS) {
    const retryAfterSec = Math.ceil((WINDOW_MS - (now - recent[0])) / 1000);
    return { allowed: false, retryAfterSec };
  }
  return { allowed: true, retryAfterSec: 0 };
}

function recordFailedAttempt(key) {
  const now = Date.now();
  const entry = (loginAttempts.get(key) || []).filter((ts) => now - ts < WINDOW_MS);
  entry.push(now);
  loginAttempts.set(key, entry);
}

function clearRateLimit(key) {
  loginAttempts.delete(key);
}

function signSessionToken(payload) {
  const secret = requireEnv('SESSION_SECRET');
  const data = Buffer.from(JSON.stringify({ ...payload, iat: Date.now() })).toString('base64url');
  const sig = crypto.createHmac('sha256', secret).update(data).digest('base64url');
  return `${data}.${sig}`;
}

function verifySessionToken(token) {
  if (!token || typeof token !== 'string' || !token.includes('.')) return null;
  const secret = requireEnv('SESSION_SECRET');
  const [data, sig] = token.split('.');
  const expected = crypto.createHmac('sha256', secret).update(data).digest('base64url');
  if (!safeEqual(sig, expected)) return null;
  try {
    return JSON.parse(Buffer.from(data, 'base64url').toString('utf8'));
  } catch (e) {
    return null;
  }
}

function stripSecretsFromConfig(config) {
  const safe = { ...config };
  delete safe.adminPin;
  if (Array.isArray(safe.internalJudges)) {
    safe.internalJudges = safe.internalJudges.map(({ pin, ...rest }) => rest);
  }
  if (Array.isArray(safe.externalJudges)) {
    safe.externalJudges = safe.externalJudges.map(({ pin, ...rest }) => rest);
  }
  return safe;
}

module.exports = {
  REQUIRED_ENV_VARS,
  requireEnv,
  validateAuthEnv,
  safeEqual,
  checkRateLimit,
  recordFailedAttempt,
  clearRateLimit,
  signSessionToken,
  verifySessionToken,
  stripSecretsFromConfig
};
