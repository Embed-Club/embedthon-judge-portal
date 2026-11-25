const { validateAuthEnv, getSessionFromRequest, clearSessionCookie } = require('./_auth');

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');

  if (req.method === 'DELETE' || req.method === 'POST') {
    clearSessionCookie(res);
    return res.status(200).json({ success: true, authenticated: false });
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    validateAuthEnv();
    const session = getSessionFromRequest(req);
    if (!session) {
      return res.status(401).json({ authenticated: false });
    }
    return res.status(200).json({
      authenticated: true,
      session: {
        id: session.id,
        type: session.type,
        isAdmin: !!session.isAdmin,
        exp: session.exp
      }
    });
  } catch (err) {
    return res.status(500).json({ authenticated: false, error: err.message });
  }
};
