const { fetchGist, updateGistFile } = require('./_gist');

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
    let config = { numJudges: 3, adminPin: '2026', judges: [] };
    if (gist.files && gist.files['config.json']) {
      try {
        config = JSON.parse(gist.files['config.json'].content);
      } catch (e) {}
    }

    if (judgeId === 'ADMIN') {
      if (pin === String(config.adminPin || '2026')) {
        return res.status(200).json({
          success: true,
          judge: {
            id: 'ADMIN',
            name: customName || 'Coordinator',
            isAdmin: true
          }
        });
      } else {
        return res.status(401).json({ success: false, error: 'Invalid Admin PIN (Default: 2026).' });
      }
    }

    const judges = config.judges || [];
    const matched = judges.find(j => j.id.toUpperCase() === judgeId);

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
        isAdmin: false
      }
    });
  } catch (error) {
    console.error('Login API error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
};
