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

const ADMIN_SESSION_TTL_MS = 30 * 60 * 1000; // 30 minutes
const JUDGE_SESSION_TTL_MS = 8 * 60 * 60 * 1000; // 8 hours
const SESSION_COOKIE_NAME = 'embers_session';

function signSessionToken(payload) {
  const secret = requireEnv('SESSION_SECRET');
  const ttl = payload && payload.isAdmin ? ADMIN_SESSION_TTL_MS : JUDGE_SESSION_TTL_MS;
  const now = Date.now();
  const data = Buffer.from(JSON.stringify({ ...payload, iat: now, exp: now + ttl })).toString('base64url');
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
    const parsed = JSON.parse(Buffer.from(data, 'base64url').toString('utf8'));
    if (!parsed || (parsed.exp && Date.now() > parsed.exp)) return null;
    return parsed;
  } catch (e) {
    return null;
  }
}

function parseCookies(req) {
  const header = req && req.headers && req.headers.cookie ? String(req.headers.cookie) : '';
  const out = {};
  header.split(';').forEach((part) => {
    const idx = part.indexOf('=');
    if (idx <= 0) return;
    const k = part.slice(0, idx).trim();
    const v = decodeURIComponent(part.slice(idx + 1).trim());
    out[k] = v;
  });
  return out;
}

function getSessionFromRequest(req) {
  const authHeader = req.headers && req.headers['authorization']
    ? String(req.headers['authorization']).replace(/^Bearer\s+/i, '').trim()
    : '';
  if (authHeader) {
    const fromHeader = verifySessionToken(authHeader);
    if (fromHeader) return fromHeader;
  }
  const cookies = parseCookies(req);
  if (cookies[SESSION_COOKIE_NAME]) {
    return verifySessionToken(cookies[SESSION_COOKIE_NAME]);
  }
  return null;
}

function setSessionCookie(res, token, isAdmin) {
  const maxAge = isAdmin ? Math.floor(ADMIN_SESSION_TTL_MS / 1000) : Math.floor(JUDGE_SESSION_TTL_MS / 1000);
  const parts = [
    `${SESSION_COOKIE_NAME}=${encodeURIComponent(token)}`,
    `Max-Age=${maxAge}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Strict'
  ];
  if (process.env.VERCEL || process.env.NODE_ENV === 'production') {
    parts.push('Secure');
  }
  res.setHeader('Set-Cookie', parts.join('; '));
}

function clearSessionCookie(res) {
  const parts = [
    `${SESSION_COOKIE_NAME}=`,
    'Max-Age=0',
    'Path=/',
    'HttpOnly',
    'SameSite=Strict'
  ];
  if (process.env.VERCEL || process.env.NODE_ENV === 'production') {
    parts.push('Secure');
  }
  res.setHeader('Set-Cookie', parts.join('; '));
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
  getSessionFromRequest,
  setSessionCookie,
  clearSessionCookie,
  stripSecretsFromConfig
};
