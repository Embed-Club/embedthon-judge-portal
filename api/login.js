const { fetchGist, updateGistFile } = require('./_gist');

const DEFAULT_CONFIG = {
  activePhase: 'PHASE_1',
  adminPin: '5012',
  internalJudges: [
    { id: 'INT-1', name: 'Fizan', role: 'CSE Faculty Mentor', pin: '1111' },
    { id: 'INT-2', name: 'Rafan', role: 'CSE Faculty Mentor', pin: '2222' }
  ],
  externalJudges: [
    { id: 'EXT-1', name: 'Muadh Bin Mohammed Ali', role: 'External Jury (Embeddathon)', pin: '3333', eventId: 'EMBEDDATHON' },
    { id: 'EXT-2', name: 'Mohammed Nouman', role: 'External Jury (Embeddathon)', pin: '4444', eventId: 'EMBEDDATHON' },
    { id: 'EXP-1', name: 'Suhail Afzal', role: 'Project Expo Evaluator', pin: '5555', eventId: 'PROJECT_EXPO' },
    { id: 'EXP-2', name: 'Dr. Mohammed Hafeez M.K.', role: 'Project Expo Evaluator', pin: '6666', eventId: 'PROJECT_EXPO' },
    { id: 'PPR-1', name: 'Dr. Saleem Malik', role: 'Technical Paper Evaluator', pin: '7777', eventId: 'PAPER' },
    { id: 'PPR-2', name: 'ROULATH SANI MOIDEEN', role: 'Technical Paper Evaluator', pin: '8888', eventId: 'PAPER' }
  ],
  judgeAssignments: {
    'INT-1': { eventId: 'EMBEDDATHON', venue: 'Computer Labs 1 & 2', slotId: 'S3', day: 1, start: '10:30', end: '13:00', slotTitle: 'Track 1: Embeddathon Phase 1 (Mentoring)' },
    'INT-2': { eventId: 'EMBEDDATHON', venue: 'Computer Labs 1 & 2', slotId: 'S3', day: 1, start: '10:30', end: '13:00', slotTitle: 'Track 1: Embeddathon Phase 1 (Mentoring)' },
    'EXT-1': { eventId: 'EMBEDDATHON', venue: 'Computer Labs 1 & 2', slotId: 'S5', day: 2, start: '10:00', end: '13:00', slotTitle: 'Track 1: Embeddathon Phase 2 (External Jury)' },
    'EXT-2': { eventId: 'EMBEDDATHON', venue: 'Computer Labs 1 & 2', slotId: 'S5', day: 2, start: '10:00', end: '13:00', slotTitle: 'Track 1: Embeddathon Phase 2 (External Jury)' },
    'EXP-1': { eventId: 'PROJECT_EXPO', venue: 'Edusat Hall', slotId: 'S8', day: 2, start: '09:30', end: '12:45', slotTitle: 'Track 2: Project Expo Stalls 01–36' },
    'EXP-2': { eventId: 'PROJECT_EXPO', venue: 'Edusat Hall', slotId: 'S8', day: 2, start: '09:30', end: '12:45', slotTitle: 'Track 2: Project Expo Stalls 01–36' },
    'PPR-1': { eventId: 'PAPER', venue: 'Multipurpose Hall', slotId: 'S9', day: 2, start: '09:30', end: '12:45', slotTitle: 'Track 3: Paper Presentation PP-01 to PP-12' },
    'PPR-2': { eventId: 'PAPER', venue: 'Multipurpose Hall', slotId: 'S9', day: 2, start: '09:30', end: '12:45', slotTitle: 'Track 3: Paper Presentation PP-01 to PP-12' }
  }
};

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const body = req.body || {};
    const judgeId = String(body.judgeId || '').trim().toUpperCase();
    const pin = String(body.pin || '').trim();
    const customName = String(body.judgeName || '').trim();

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

    // 1. Admin login
    if (judgeId === 'ADMIN') {
      if (pin === String(config.adminPin || '5012')) {
        return res.status(200).json({
          success: true,
          judge: {
            id: 'ADMIN',
            name: customName || 'Chief Coordinator',
            type: 'ADMIN',
            isAdmin: true
          }
        });
      } else {
        return res.status(401).json({ success: false, error: 'Invalid Admin PIN.' });
      }
    }

    // 2. Search in internal judges
    const allInternal = config.internalJudges || [];
    const allExternal = config.externalJudges || [];

    let matched = allInternal.find(j => j.id.toUpperCase() === judgeId);
    let judgeType = 'INTERNAL';

    if (!matched) {
      matched = allExternal.find(j => j.id.toUpperCase() === judgeId);
      judgeType = 'EXTERNAL';
    }

    if (!matched) {
      return res.status(404).json({ success: false, error: `Judge ID '${judgeId}' not found.` });
    }

    if (String(matched.pin || '') !== pin) {
      return res.status(401).json({ success: false, error: `Incorrect PIN for ${matched.name}.` });
    }

    const finalName = customName || matched.name;
    if (customName && customName !== matched.name) {
      matched.name = customName;
      await updateGistFile('config.json', JSON.stringify(config, null, 2));
    }

    return res.status(200).json({
      success: true,
      judge: {
        id: matched.id,
        name: finalName,
        type: judgeType,
        role: matched.role || (judgeType === 'INTERNAL' ? 'Internal Judge (Phase 1)' : 'External Judge (Phase 2)'),
        isAdmin: false,
        assignment: config.judgeAssignments[matched.id] || null
      }
    });
  } catch (error) {
    console.error('Login API error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
};
