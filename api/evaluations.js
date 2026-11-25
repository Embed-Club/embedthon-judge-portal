const { fetchGist, updateGistFile } = require('./_gist');
const { validateAuthEnv, verifySessionToken, requireEnv, safeEqual } = require('./_auth');
const { EVENTS, getEvent } = require('../rubrics.js');

function clamp(value, min, max) {
  const n = Number(value);
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(min, n));
}

function round1(value) {
  return Number(Number(value).toFixed(1));
}

// Normalise both legacy flat evaluations ({ "01": { "INT-1": {...} } })
// and the new event-keyed structure ({ "PAPER": { "01": {...} } }).
function normalizeEvaluations(raw) {
  const out = {};
  Object.keys(EVENTS).forEach((eventId) => {
    out[eventId] = {};
  });

  if (!raw || typeof raw !== 'object') return out;

  Object.keys(raw).forEach((key) => {
    const value = raw[key];
    if (!value || typeof value !== 'object') return;

    if (EVENTS[key]) {
      out[key] = value;
      return;
    }

    // Legacy Embeddathon records were stored directly under team numbers.
    if (/^\d{1,2}$/.test(key)) {
      out.EMBEDDATHON[key.padStart(2, '0')] = value;
      return;
    }

    // Legacy clients may have sent a nested _byEvent bag.
    if (key === '_byEvent') {
      Object.keys(value).forEach((eventId) => {
        if (EVENTS[eventId] && value[eventId] && typeof value[eventId] === 'object') {
          out[eventId] = { ...out[eventId], ...value[eventId] };
        }
      });
    }
  });

  return out;
}

function computeEmbeddathonRecord(body, existing) {
  // Phase 1: Mentoring (Max 30)
  const p1_c1 = clamp(body.p1_crit1 !== undefined ? body.p1_crit1 : existing.p1_crit1, 0, 10);
  const p1_c2 = clamp(body.p1_crit2 !== undefined ? body.p1_crit2 : existing.p1_crit2, 0, 10);
  const p1_c3 = clamp(body.p1_crit3 !== undefined ? body.p1_crit3 : existing.p1_crit3, 0, 10);
  const p1_total = round1(p1_c1 + p1_c2 + p1_c3);

  // Phase 2: Final External (Max 70)
  const p2_c1 = clamp(body.p2_crit1 !== undefined ? body.p2_crit1 : existing.p2_crit1, 0, 25);
  const p2_c2 = clamp(body.p2_crit2 !== undefined ? body.p2_crit2 : existing.p2_crit2, 0, 20);
  const p2_c3 = clamp(body.p2_crit3 !== undefined ? body.p2_crit3 : existing.p2_crit3, 0, 15);
  const p2_c4 = clamp(body.p2_crit4 !== undefined ? body.p2_crit4 : existing.p2_crit4, 0, 10);
  const p2_total = round1(p2_c1 + p2_c2 + p2_c3 + p2_c4);

  return {
    p1_crit1: p1_c1,
    p1_crit2: p1_c2,
    p1_crit3: p1_c3,
    phase1: p1_total,
    p2_crit1: p2_c1,
    p2_crit2: p2_c2,
    p2_crit3: p2_c3,
    p2_crit4: p2_c4,
    phase2: p2_total,
    total: round1(p1_total + p2_total)
  };
}

function computeSingleEventRecord(eventId, body, existing) {
  const event = getEvent(eventId);
  const inputScores = body.scores && typeof body.scores === 'object' ? body.scores : existing.scores || {};
  const scores = {};
  let total = 0;

  (event.criteria || []).forEach((criterion) => {
    const value = clamp(
      inputScores[criterion.key] !== undefined ? inputScores[criterion.key] : 0,
      0,
      criterion.max
    );
    scores[criterion.key] = value;
    total += value;
  });

  return {
    scores: scores,
    total: round1(total)
  };
}

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
        evaluations = normalizeEvaluations(JSON.parse(gist.files['evaluations.json'].content));
      } catch (e) {
        evaluations = normalizeEvaluations({});
      }
    } else {
      evaluations = normalizeEvaluations({});
    }

    if (req.method === 'GET') {
      return res.status(200).json(evaluations);
    }

    if (req.method === 'POST') {
      validateAuthEnv();
      const authHeader = req.headers['authorization'] ? String(req.headers['authorization']).replace(/^Bearer\s+/i, '').trim() : '';
      const session = verifySessionToken(authHeader);
      const body = req.body || {};
      const adminPin = String(body.adminPin || '');
      const isAdminPin = adminPin && safeEqual(adminPin, requireEnv('ADMIN_PIN'));
      if (!session && !isAdminPin) {
        return res.status(401).json({ success: false, error: 'Unauthorized: Judge or Admin session token required.' });
      }
      const eventId = String(body.eventId || 'EMBEDDATHON').trim().toUpperCase();
      const teamNumber = String(body.teamNumber || '').padStart(2, '0');
      const judgeId = String(body.judgeId || '').trim().toUpperCase();
      const judgeName = String(body.judgeName || '').trim();
      const event = EVENTS[eventId];

      if (!event) {
        return res.status(400).json({ success: false, error: `Unknown event '${eventId}'.` });
      }

      if (!teamNumber || !judgeId) {
        return res.status(400).json({ success: false, error: 'teamNumber and judgeId are required.' });
      }

      if (!evaluations[eventId]) evaluations[eventId] = {};
      if (!evaluations[eventId][teamNumber]) evaluations[eventId][teamNumber] = {};

      const existing = evaluations[eventId][teamNumber][judgeId] || {};
      const computed =
        event.mode === 'SINGLE'
          ? computeSingleEventRecord(eventId, body, existing)
          : computeEmbeddathonRecord(body, existing);

      evaluations[eventId][teamNumber][judgeId] = {
        judgeId: judgeId,
        judgeName: judgeName,
        eventId: eventId,
        eventLabel: event.label,
        ...computed,
        remarks: String(body.remarks !== undefined ? body.remarks : existing.remarks || '').trim(),
        updatedAt: body.updatedAt || new Date().toISOString()
      };

      await updateGistFile('evaluations.json', JSON.stringify(evaluations, null, 2));

      return res.status(200).json({
        success: true,
        eventId: eventId,
        teamNumber: teamNumber,
        judgeId: judgeId,
        teamEvaluations: evaluations[eventId][teamNumber]
      });
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Evaluations API error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
};
