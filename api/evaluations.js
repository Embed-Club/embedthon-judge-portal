const { fetchGist, updateGistFile } = require('./_gist');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const gist = await fetchGist();
    let evaluations = {};

    if (gist.files && gist.files['evaluations.json']) {
      try {
        evaluations = JSON.parse(gist.files['evaluations.json'].content);
      } catch (e) {
        evaluations = {};
      }
    }

    if (req.method === 'GET') {
      return res.status(200).json(evaluations);
    }

    if (req.method === 'POST') {
      const body = req.body || {};
      const teamNumber = String(body.teamNumber || '').padStart(2, '0');
      const judgeId = String(body.judgeId || '').trim().toUpperCase();
      const judgeName = String(body.judgeName || '').trim();

      if (!teamNumber || !judgeId) {
        return res.status(400).json({ success: false, error: 'teamNumber and judgeId are required.' });
      }

      if (!evaluations[teamNumber]) {
        evaluations[teamNumber] = {};
      }

      const c1 = Number(body.crit1) || 0;
      const c2 = Number(body.crit2) || 0;
      const c3 = Number(body.crit3) || 0;
      const c4 = Number(body.crit4) || 0;
      const total = Number(body.total) || (c1 + c2 + c3 + c4);

      evaluations[teamNumber][judgeId] = {
        judgeId: judgeId,
        judgeName: judgeName,
        crit1: c1,
        crit2: c2,
        crit3: c3,
        crit4: c4,
        phase1: Number(body.phase1) || (c1 + c2),
        phase2: Number(body.phase2) || (c3 + c4),
        total: total,
        remarks: String(body.remarks || '').trim(),
        updatedAt: body.updatedAt || new Date().toISOString()
      };

      await updateGistFile('evaluations.json', JSON.stringify(evaluations, null, 2));

      const teamScores = evaluations[teamNumber];
      const validTotals = Object.values(teamScores).filter(v => v && typeof v.total === 'number' && v.total > 0).map(v => v.total);
      const avgTotal = validTotals.length ? Number((validTotals.reduce((a, b) => a + b, 0) / validTotals.length).toFixed(2)) : 0;

      return res.status(200).json({
        success: true,
        teamNumber: teamNumber,
        judgeId: judgeId,
        numJudgesScored: validTotals.length,
        averageTotal: avgTotal,
        teamEvaluations: teamScores
      });
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Evaluations API error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
};
