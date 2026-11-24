const { fetchGist, updateGistFile } = require('./_gist');
const { validateAuthEnv, requireEnv, safeEqual } = require('./_auth');

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
    validateAuthEnv();
    const expectedAdminPin = requireEnv('ADMIN_PIN');
    const body = req.body || {};
    const adminPin = String(body.adminPin || '').trim();

    const gist = await fetchGist();
    let config = {};
    if (gist.files && gist.files['config.json']) {
      try {
        config = JSON.parse(gist.files['config.json'].content);
      } catch (e) {}
    }

    if (!safeEqual(adminPin, config.adminPin || expectedAdminPin)) {
      return res.status(401).json({ success: false, error: 'Invalid Admin PIN.' });
    }

    await updateGistFile('evaluations.json', '{}');
    return res.status(200).json({ success: true, message: 'All scores have been reset on server.' });
  } catch (error) {
    console.error('Reset API error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
};
