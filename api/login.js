const { fetchGist, updateGistFile } = require('./_gist');

const DEFAULT_CONFIG = {
  activePhase: 'PHASE_1',
  adminPin: '2026',
  internalJudges: [
    { id: 'INT-1', name: 'Internal Judge 1', role: 'CSE Faculty Mentor', pin: '1111' },
    { id: 'INT-2', name: 'Internal Judge 2', role: 'CSE Faculty Mentor', pin: '2222' }
  ],
  externalJudges: [
    { id: 'EXT-1', name: 'External Judge 1', role: 'Industry Expert', pin: '3333' },
    { id: 'EXT-2', name: 'External Judge 2', role: 'IEEE Jury Member', pin: '4444' }
  ]
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

    // 1. Admin login
    if (judgeId === 'ADMIN') {
      if (pin === String(config.adminPin || '2026')) {
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
        return res.status(401).json({ success: false, error: 'Invalid Admin PIN (Default: 2026).' });
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
        isAdmin: false
      }
    });
  } catch (error) {
    console.error('Login API error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
};
