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
    const adminPin = String(body.adminPin || '').trim();

    const gist = await fetchGist();
    let config = { adminPin: '2026' };
    if (gist.files && gist.files['config.json']) {
      try {
        config = JSON.parse(gist.files['config.json'].content);
      } catch (e) {}
    }

    if (adminPin !== String(config.adminPin || '2026')) {
      return res.status(401).json({ success: false, error: 'Invalid Admin PIN (Default: 2026).' });
    }

    await updateGistFile('evaluations.json', '{}');
    return res.status(200).json({ success: true, message: 'All scores have been reset on server.' });
  } catch (error) {
    console.error('Reset API error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
};
