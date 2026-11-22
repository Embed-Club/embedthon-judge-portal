const { fetchGist, updateGistFile } = require('./_gist');

const DEFAULT_CONFIG = {
  activePhase: 'PHASE_1', // 'PHASE_1', 'PHASE_2', 'BOTH'
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

    if (req.method === 'GET') {
      if (!gist.files || !gist.files['config.json'] || !JSON.parse(gist.files['config.json'].content).internalJudges) {
        await updateGistFile('config.json', JSON.stringify(config, null, 2));
      }
      return res.status(200).json(config);
    }

    if (req.method === 'POST') {
      const body = req.body || {};
      const adminPin = String(body.adminPin || '').trim();

      if (adminPin !== String(config.adminPin || '2026')) {
        return res.status(401).json({ success: false, error: 'Invalid Admin PIN (Default: 2026).' });
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

      await updateGistFile('config.json', JSON.stringify(config, null, 2));

      return res.status(200).json({
        success: true,
        activePhase: config.activePhase,
        internalJudges: config.internalJudges,
        externalJudges: config.externalJudges,
        adminPin: config.adminPin
      });
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Config API error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
};
