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

      const existing = evaluations[teamNumber][judgeId] || {};

      // Phase 1: Mentoring (Max 30)
      const p1_c1 = body.p1_crit1 !== undefined ? Number(body.p1_crit1) : (existing.p1_crit1 || 0);
      const p1_c2 = body.p1_crit2 !== undefined ? Number(body.p1_crit2) : (existing.p1_crit2 || 0);
      const p1_c3 = body.p1_crit3 !== undefined ? Number(body.p1_crit3) : (existing.p1_crit3 || 0);
      const p1_total = Number((p1_c1 + p1_c2 + p1_c3).toFixed(1));

      // Phase 2: Final External (Max 70)
      const p2_c1 = body.p2_crit1 !== undefined ? Number(body.p2_crit1) : (existing.p2_crit1 || 0);
      const p2_c2 = body.p2_crit2 !== undefined ? Number(body.p2_crit2) : (existing.p2_crit2 || 0);
      const p2_c3 = body.p2_crit3 !== undefined ? Number(body.p2_crit3) : (existing.p2_crit3 || 0);
      const p2_c4 = body.p2_crit4 !== undefined ? Number(body.p2_crit4) : (existing.p2_crit4 || 0);
      const p2_total = Number((p2_c1 + p2_c2 + p2_c3 + p2_c4).toFixed(1));

      const grandTotal = Number((p1_total + p2_total).toFixed(1));

      evaluations[teamNumber][judgeId] = {
        judgeId: judgeId,
        judgeName: judgeName,
        // Phase 1 details
        p1_crit1: p1_c1,
        p1_crit2: p1_c2,
        p1_crit3: p1_c3,
        phase1: p1_total,
        // Phase 2 details
        p2_crit1: p2_c1,
        p2_crit2: p2_c2,
        p2_crit3: p2_c3,
        p2_crit4: p2_c4,
        phase2: p2_total,
        // Combined
        total: grandTotal,
        remarks: String(body.remarks !== undefined ? body.remarks : (existing.remarks || '')).trim(),
        updatedAt: body.updatedAt || new Date().toISOString()
      };

      await updateGistFile('evaluations.json', JSON.stringify(evaluations, null, 2));

      return res.status(200).json({
        success: true,
        teamNumber: teamNumber,
        judgeId: judgeId,
        teamEvaluations: evaluations[teamNumber]
      });
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Evaluations API error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
};
