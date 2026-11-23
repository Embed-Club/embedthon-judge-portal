const { fetchGist, updateGistFile } = require('./_gist');

const DEFAULT_CONFIG = {
  activePhase: 'PHASE_1', // 'PHASE_1', 'PHASE_2', 'BOTH'
  adminPin: '5012',
  internalJudges: [
    { id: 'INT-1', name: 'Fizan', role: 'CSE Faculty Mentor', pin: '1234' },
    { id: 'INT-2', name: 'Rafan', role: 'CSE Faculty Mentor', pin: '1234' }
  ],
  externalJudges: [
    { id: 'EXT-1', name: 'Muadh Bin Mohammed Ali', role: 'External Jury (Embeddathon)', pin: '1234', eventId: 'EMBEDDATHON' },
    { id: 'EXT-2', name: 'Mohammed Nouman', role: 'External Jury (Embeddathon)', pin: '1234', eventId: 'EMBEDDATHON' },
    { id: 'EXP-1', name: 'Suhail Afzal', role: 'Project Expo Evaluator', pin: '1234', eventId: 'PROJECT_EXPO' },
    { id: 'EXP-2', name: 'Dr. Mohammed Hafeez M.K.', role: 'Project Expo Evaluator', pin: '1234', eventId: 'PROJECT_EXPO' },
    { id: 'PPR-1', name: 'Dr. Saleem Malik', role: 'Technical Paper Evaluator', pin: '1234', eventId: 'PAPER' },
    { id: 'PPR-2', name: 'ROULATH SANI MOIDEEN', role: 'Technical Paper Evaluator', pin: '1234', eventId: 'PAPER' }
  ],
  // Judge deployment: event/track, venue and schedule slot.
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
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const gist = await fetchGist();
    let config = DEFAULT_CONFIG;

    if (gist.files && gist.files['config.json']) {
      try {
        config = JSON.parse(gist.files['config.json'].content);
      } catch (e) {
        config = DEFAULT_CONFIG;
      }
    }

    if (!config.internalJudges || !config.internalJudges.length) config.internalJudges = DEFAULT_CONFIG.internalJudges;
    if (!config.externalJudges || !config.externalJudges.length) config.externalJudges = DEFAULT_CONFIG.externalJudges;
    if (!config.activePhase) config.activePhase = 'PHASE_1';
    config.judgeAssignments = {
      ...DEFAULT_CONFIG.judgeAssignments,
      ...(config.judgeAssignments || {})
    };

    if (req.method === 'GET') {
      if (!gist.files || !gist.files['config.json'] || !JSON.parse(gist.files['config.json'].content).internalJudges) {
        await updateGistFile('config.json', JSON.stringify(config, null, 2));
      }
      return res.status(200).json(config);
    }

    if (req.method === 'POST') {
      const body = req.body || {};
      const adminPin = String(body.adminPin || '').trim();

      if (adminPin !== String(config.adminPin || '5012')) {
        return res.status(401).json({ success: false, error: 'Invalid Admin PIN.' });
      }

      if (body.activePhase && ['PHASE_1', 'PHASE_2', 'BOTH'].includes(body.activePhase)) {
        config.activePhase = body.activePhase;
      }

      if (Array.isArray(body.internalJudges)) {
        config.internalJudges = body.internalJudges;
      }

      if (Array.isArray(body.externalJudges)) {
        config.externalJudges = body.externalJudges;
      }

      if (body.newAdminPin && String(body.newAdminPin).trim().length >= 4) {
        config.adminPin = String(body.newAdminPin).trim();
      }

      if (body.judgeAssignments && typeof body.judgeAssignments === 'object') {
        const cleanAssignments = {};
        Object.keys(body.judgeAssignments).forEach((judgeId) => {
          const assignment = body.judgeAssignments[judgeId];
          if (!assignment || typeof assignment !== 'object') return;
          const eventId = String(assignment.eventId || assignment.event || '').trim().toUpperCase();
          if (!['PAPER', 'PROJECT_EXPO', 'EMBEDDATHON'].includes(eventId)) return;
          cleanAssignments[judgeId] = {
            eventId: eventId,
            venue: String(assignment.venue || '').trim(),
            slotId: String(assignment.slotId || '').trim(),
            day: assignment.day !== undefined ? String(assignment.day) : '',
            start: String(assignment.start || '').trim(),
            end: String(assignment.end || '').trim(),
            slotTitle: String(assignment.slotTitle || '').trim()
          };
        });
        config.judgeAssignments = cleanAssignments;
      }

      await updateGistFile('config.json', JSON.stringify(config, null, 2));

      return res.status(200).json({
        success: true,
        activePhase: config.activePhase,
        internalJudges: config.internalJudges,
        externalJudges: config.externalJudges,
        judgeAssignments: config.judgeAssignments,
        adminPin: config.adminPin
      });
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Config API error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
};
