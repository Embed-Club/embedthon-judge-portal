const { fetchGist } = require('./_gist');
const {
  validateAuthEnv,
  requireEnv,
  safeEqual,
  checkRateLimit,
  recordFailedAttempt,
  clearRateLimit,
  signSessionToken,
  setSessionCookie
} = require('./_auth');

const DEFAULT_CONFIG = {
  activePhase: 'PHASE_1',
  internalJudges: [
    { id: 'INT-1', name: 'Fizan', role: 'CSE Faculty Mentor' },
    { id: 'INT-2', name: 'Rafan', role: 'CSE Faculty Mentor' }
  ],
  externalJudges: [
    { id: 'EXT-1', name: 'Muadh Bin Mohammed Ali', role: 'External Jury (Embeddathon)', eventId: 'EMBEDDATHON' },
    { id: 'EXT-2', name: 'Mohammed Nouman', role: 'External Jury (Embeddathon)', eventId: 'EMBEDDATHON' },
    { id: 'EXP-1', name: 'Suhail Afzal', role: 'Project Expo Evaluator', eventId: 'PROJECT_EXPO' },
    { id: 'EXP-2', name: 'Dr. Mohammed Hafeez M.K.', role: 'Project Expo Evaluator', eventId: 'PROJECT_EXPO' },
    { id: 'PPR-1', name: 'Dr. Saleem Malik', role: 'Technical Paper Evaluator', eventId: 'PAPER' },
    { id: 'PPR-2', name: 'ROULATH SANI MOIDEEN', role: 'Technical Paper Evaluator', eventId: 'PAPER' }
  ],
  judgeAssignments: {
    'INT-1': { events: ['EMBEDDATHON'], eventId: 'EMBEDDATHON', venue: 'Computer Labs 1 & 2', slotId: 'S3', day: 1, start: '10:30', end: '13:00', slotTitle: 'Track 1: Embeddathon Phase 1 (Mentoring)' },
    'INT-2': { events: ['EMBEDDATHON'], eventId: 'EMBEDDATHON', venue: 'Computer Labs 1 & 2', slotId: 'S3', day: 1, start: '10:30', end: '13:00', slotTitle: 'Track 1: Embeddathon Phase 1 (Mentoring)' },
    'EXT-1': { events: ['EMBEDDATHON'], eventId: 'EMBEDDATHON', venue: 'Computer Labs 1 & 2', slotId: 'S5', day: 2, start: '10:00', end: '13:00', slotTitle: 'Track 1: Embeddathon Phase 2 (External Jury)' },
    'EXT-2': { events: ['EMBEDDATHON'], eventId: 'EMBEDDATHON', venue: 'Computer Labs 1 & 2', slotId: 'S5', day: 2, start: '10:00', end: '13:00', slotTitle: 'Track 1: Embeddathon Phase 2 (External Jury)' },
    'EXP-1': { events: ['PROJECT_EXPO'], eventId: 'PROJECT_EXPO', venue: 'Edusat Hall', slotId: 'S8', day: 2, start: '09:30', end: '12:45', slotTitle: 'Track 2: Project Expo Stalls 01–36' },
    'EXP-2': { events: ['PROJECT_EXPO'], eventId: 'PROJECT_EXPO', venue: 'Edusat Hall', slotId: 'S8', day: 2, start: '09:30', end: '12:45', slotTitle: 'Track 2: Project Expo Stalls 01–36' },
    'PPR-1': { events: ['PAPER'], eventId: 'PAPER', venue: 'Multipurpose Hall', slotId: 'S9', day: 2, start: '09:30', end: '12:45', slotTitle: 'Track 3: Paper Presentation PP-01 to PP-12' },
    'PPR-2': { events: ['PAPER'], eventId: 'PAPER', venue: 'Multipurpose Hall', slotId: 'S9', day: 2, start: '09:30', end: '12:45', slotTitle: 'Track 3: Paper Presentation PP-01 to PP-12' }
  }
};

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', 'https://embers26.vercel.app');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    validateAuthEnv();
    const expectedAdminPin = requireEnv('ADMIN_PIN');
    const judgePinsMap = JSON.parse(requireEnv('JUDGE_PINS_JSON'));

    const body = req.body || {};
    const judgeId = String(body.judgeId || '').trim().toUpperCase();
    const pin = String(body.pin || '').trim();
    const customName = String(body.judgeName || '').trim();
    const clientIp = String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown').split(',')[0].trim();
    const rateKey = `${clientIp}:${judgeId}`;

    const rl = checkRateLimit(rateKey);
    if (!rl.allowed) {
      res.setHeader('Retry-After', String(rl.retryAfterSec));
      return res.status(429).json({ success: false, error: `Too many failed attempts. Retry in ${rl.retryAfterSec}s.` });
    }

    const gist = await fetchGist();
    let config = { ...DEFAULT_CONFIG };
    if (gist.files && gist.files['config.json']) {
      try {
        config = { ...config, ...JSON.parse(gist.files['config.json'].content) };
      } catch (e) {}
    }

    if (!config.internalJudges || !config.internalJudges.length) {
      config.internalJudges = DEFAULT_CONFIG.internalJudges;
    }
    if (!config.externalJudges || !config.externalJudges.length) {
      config.externalJudges = DEFAULT_CONFIG.externalJudges;
    }
    config.judgeAssignments = {
      ...DEFAULT_CONFIG.judgeAssignments,
      ...(config.judgeAssignments || {})
    };

    // Alias resolution for simple judge IDs or names
    const ID_ALIASES = {
      '1': 'INT-1', 'FIZAN': 'INT-1', 'INT1': 'INT-1', 'INT-1': 'INT-1',
      '2': 'INT-2', 'RAFAN': 'INT-2', 'INT2': 'INT-2', 'INT-2': 'INT-2',
      '3': 'EXT-1', 'MUADH': 'EXT-1', 'EXT1': 'EXT-1', 'EXT-1': 'EXT-1',
      '4': 'EXT-2', 'NOUMAN': 'EXT-2', 'MOHAMMED NOUMAN': 'EXT-2', 'EXT2': 'EXT-2', 'EXT-2': 'EXT-2',
      '5': 'EXP-1', 'SUHAIL': 'EXP-1', 'SUHAIL AFZAL': 'EXP-1', 'EXP1': 'EXP-1', 'EXP-1': 'EXP-1',
      '6': 'EXP-2', 'HAFEEZ': 'EXP-2', 'DR. MOHAMMED HAFEEZ M.K.': 'EXP-2', 'DR HAFEEZ': 'EXP-2', 'EXP2': 'EXP-2', 'EXP-2': 'EXP-2',
      '7': 'PPR-1', 'SALEEM': 'PPR-1', 'DR. SALEEM MALIK': 'PPR-1', 'DR SALEEM': 'PPR-1', 'PPR1': 'PPR-1', 'PPR-1': 'PPR-1',
      '8': 'PPR-2', 'ROULATH': 'PPR-2', 'ROULATH SANI MOIDEEN': 'PPR-2', 'ROULATH SANI': 'PPR-2', 'PPR2': 'PPR-2', 'PPR-2': 'PPR-2',
      'ADMIN': 'ADMIN', 'COORDINATOR': 'ADMIN'
    };
    const resolvedId = ID_ALIASES[judgeId] || judgeId;

    // 1. Admin login
    if (resolvedId === 'ADMIN') {
      if (safeEqual(pin, config.adminPin || expectedAdminPin)) {
        clearRateLimit(rateKey);
        const token = signSessionToken({ id: 'ADMIN', type: 'ADMIN', isAdmin: true });
        setSessionCookie(res, token, true);
        return res.status(200).json({
          success: true,
          token,
          judge: {
            id: 'ADMIN',
            name: customName || 'Chief Coordinator',
            type: 'ADMIN',
            isAdmin: true
          }
        });
      } else {
        recordFailedAttempt(rateKey);
        return res.status(401).json({ success: false, error: 'Invalid Admin PIN.' });
      }
    }

    // 2. Search in internal judges
    const allInternal = config.internalJudges || [];
    const allExternal = config.externalJudges || [];

    let matched = allInternal.find(j => j.id.toUpperCase() === resolvedId || j.name.toUpperCase().includes(resolvedId));
    let judgeType = 'INTERNAL';

    if (!matched) {
      matched = allExternal.find(j => j.id.toUpperCase() === resolvedId || j.name.toUpperCase().includes(resolvedId));
      judgeType = 'EXTERNAL';
    }

    if (!matched) {
      recordFailedAttempt(rateKey);
      return res.status(404).json({ success: false, error: `Judge '${judgeId}' not found.` });
    }

    const expectedPin = String(judgePinsMap[matched.id] || matched.pin || '');
    if (!expectedPin || !safeEqual(expectedPin, pin)) {
      recordFailedAttempt(rateKey);
      return res.status(401).json({ success: false, error: `Incorrect PIN for ${matched.name}.` });
    }
    clearRateLimit(rateKey);

    const finalName = customName || matched.name;
    const judgeToken = signSessionToken({ id: matched.id, type: judgeType, isAdmin: false });
    setSessionCookie(res, judgeToken, false);
    if (customName && customName !== matched.name) {
      matched.name = customName;
      await updateGistFile('config.json', JSON.stringify(config, null, 2));
    }

    const rawAsgn = (config.judgeAssignments && config.judgeAssignments[matched.id]) ? config.judgeAssignments[matched.id] : null;
    let resolvedAsgn = null;
    if (rawAsgn) {
      const evs = Array.isArray(rawAsgn.events) && rawAsgn.events.length
        ? rawAsgn.events
        : (rawAsgn.eventId ? [rawAsgn.eventId] : (matched.eventId ? [matched.eventId] : []));
      resolvedAsgn = {
        ...rawAsgn,
        events: evs,
        eventId: rawAsgn.eventId || (evs[0] || 'EMBEDDATHON')
      };
    } else if (matched.eventId) {
      resolvedAsgn = {
        events: [matched.eventId],
        eventId: matched.eventId,
        venue: '',
        slotTitle: ''
      };
    }

    return res.status(200).json({
      success: true,
      judge: {
        id: matched.id,
        name: finalName,
        type: judgeType,
        role: matched.role || (judgeType === 'INTERNAL' ? 'Internal Judge (Phase 1)' : 'External Judge (Phase 2)'),
        isAdmin: false,
        assignment: resolvedAsgn
      }
    });
  } catch (error) {
    console.error('Login API error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
};
