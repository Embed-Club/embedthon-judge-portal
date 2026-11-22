const { fetchGist, updateGistFile } = require('./_gist');

const DEFAULT_CONFIG = {
  numJudges: 3,
  adminPin: '2026',
  judges: [
    { id: 'J1', name: 'Judge 1', pin: '1111' },
    { id: 'J2', name: 'Judge 2', pin: '2222' },
    { id: 'J3', name: 'Judge 3', pin: '3333' }
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

    if (req.method === 'GET') {
      return res.status(200).json({
        numJudges: config.numJudges || 3,
        judges: config.judges || []
      });
    }

    if (req.method === 'POST') {
      const body = req.body || {};
      const adminPin = String(body.adminPin || '').trim();

      if (adminPin !== String(config.adminPin || '2026')) {
        return res.status(401).json({ success: false, error: 'Invalid Admin PIN (Default: 2026).' });
      }

      const newNum = Math.max(1, Math.min(10, parseInt(body.numJudges, 10) || 3));
      const existingMap = {};
      (config.judges || []).forEach(j => { existingMap[j.id] = j; });

      const updatedJudges = [];
      const incomingJudges = body.judges || [];

      for (let i = 1; i <= newNum; i++) {
        const jid = `J${i}`;
        const provided = incomingJudges.find(x => x.id === jid);
        if (provided) {
          updatedJudges.push(provided);
        } else if (existingMap[jid]) {
          updatedJudges.push(existingMap[jid]);
        } else {
          updatedJudges.push({
            id: jid,
            name: `Judge ${i}`,
            pin: `${i}${i}${i}${i}`
          });
        }
      }

      config.numJudges = newNum;
      config.judges = updatedJudges;

      await updateGistFile('config.json', JSON.stringify(config, null, 2));

      return res.status(200).json({
        success: true,
        numJudges: config.numJudges,
        judges: config.judges
      });
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Config API error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
};
