const { fetchGist, updateGistFile } = require('./_gist');

const DEFAULT_SCHEDULE = [
  // DAY 1: NOV 24, 2026
  { id: "S1", day: 1, date: "2026-11-24", start: "08:30", end: "09:30", title: "Reporting & ID Verification", venue: "Foyer Help Desk", track: "ALL", desc: "Physical College ID verification, kit distribution & badge collection", status: "SCHEDULED" },
  { id: "S2", day: 1, date: "2026-11-24", start: "09:30", end: "10:15", title: "Inaugural Ceremony & Keynote", venue: "Auditorium", track: "ALL", desc: "Welcome address by HoD CSE, lighting of the lamp & IEEE keynote", status: "SCHEDULED" },
  { id: "S3", day: 1, date: "2026-11-24", start: "10:30", end: "13:00", title: "Track 1: Embeddathon — Hackathon Kickoff", venue: "Computer Labs 1 & 2", track: "TRACK_1", desc: "Problem statement reveal, hardware staging, and Phase 1 prototype development", status: "SCHEDULED" },
  { id: "S4", day: 1, date: "2026-11-24", start: "13:00", end: "14:00", title: "Networking Lunch & Prayer Break", venue: "Dining Hall", track: "ALL", desc: "Buffet lunch served for all registered participants and jury", status: "SCHEDULED" },
  { id: "S5", day: 1, date: "2026-11-24", start: "14:00", end: "16:30", title: "Phase 1: Mentoring & Evaluation Rounds", venue: "Labs & Stalls", track: "TRACK_1", desc: "Internal CSE Faculty Mentors evaluate progress (30% weightage)", status: "SCHEDULED" },
  { id: "S6", day: 1, date: "2026-11-24", start: "16:30", end: "17:00", title: "Day 1 Wrap-up & Hardware Lock-in", venue: "Edusat Hall", track: "TRACK_1", desc: "Overnight prototype testing briefing & Day 2 preparations", status: "SCHEDULED" },

  // DAY 2: NOV 25, 2026
  { id: "S7", day: 2, date: "2026-11-25", start: "08:45", end: "09:30", title: "Day 2 Participant Reporting & Setup", venue: "Edusat & Multipurpose Hall", track: "ALL", desc: "Prototype setup at designated stalls & slide decks uploaded", status: "SCHEDULED" },
  { id: "S8", day: 2, date: "2026-11-25", start: "09:30", end: "12:45", title: "Track 2: Project Exhibition / Expo (Live)", venue: "Edusat Hall", track: "TRACK_2", desc: "Working hardware prototypes & live software demonstrations before External Jury (70%)", status: "SCHEDULED" },
  { id: "S9", day: 2, date: "2026-11-25", start: "09:30", end: "12:45", title: "Track 3: Technical Paper Competition", venue: "Multipurpose Hall", track: "TRACK_3", desc: "IEEE 2-column paper presentations & defense before academic evaluator panel", status: "SCHEDULED" },
  { id: "S10", day: 2, date: "2026-11-25", start: "12:45", end: "13:45", title: "Symposium Lunch & Refreshments", venue: "Dining Hall", track: "ALL", desc: "Lunch break for delegates, participants, faculty & judges", status: "SCHEDULED" },
  { id: "S11", day: 2, date: "2026-11-25", start: "14:00", end: "15:15", title: "Jury Consolidation & Result Finalization", venue: "Coordinator Control Room", track: "ALL", desc: "Internal (30%) + External (70%) scores aggregated into final merit ledger", status: "SCHEDULED" },
  { id: "S12", day: 2, date: "2026-11-25", start: "15:30", end: "16:45", title: "Grand Valedictory Ceremony & Results Reveal", venue: "Main Auditorium", track: "ALL", desc: "Live Projector Reveal Ceremony, Olympic Podium, Trophy & Certificate Handover", status: "SCHEDULED" }
];

let OFFICIAL_REGISTRATIONS = [];
try {
  OFFICIAL_REGISTRATIONS = require('./registrations.json');
} catch (e) {
  OFFICIAL_REGISTRATIONS = [];
}

const DEFAULT_EMBERS_DATA = {
  schedule: DEFAULT_SCHEDULE,
  registrations: OFFICIAL_REGISTRATIONS,
  googleSheetConfig: {
    sheetCsvUrl: "",
    lastSyncedAt: "2026-11-23T19:40:00Z",
    syncStatus: `SYNCED (${OFFICIAL_REGISTRATIONS.length} Official Registrations)`
  }
};

function cleanStr(val, fallback = '') {
  if (val === undefined || val === null) return fallback;
  const s = String(val).trim();
  const lower = s.toLowerCase();
  if (lower === '' || lower === 'undefined' || lower === 'null' || lower === 'none' || lower === 'n/a') {
    return fallback;
  }
  return s;
}

function normalizeReg(r) {
  if (!r) return null;
  const lead = (r.members && r.members.length) ? (r.members.find(m => m.is_lead) || r.members[0]) : null;
  const leadDept = (lead && lead.dept) ? lead.dept : (r.dept || '');

  let title = cleanStr(r.title) || cleanStr(r.project_title) || cleanStr(r.paper_title) || cleanStr(r.name) || cleanStr(r.team_name) || 'Project Prototype';
  let leaderName = cleanStr(r.leaderName) || cleanStr(r.lead_name) || cleanStr(r.lead) || (lead ? cleanStr(lead.name) : '') || 'Team Leader';
  let phone = cleanStr(r.phone) || cleanStr(r.lead_phone) || (lead ? cleanStr(lead.phone) : '') || '';
  let email = cleanStr(r.email) || cleanStr(r.lead_email) || (lead ? cleanStr(lead.email) : '') || '';
  let usn = cleanStr(r.usn) || cleanStr(r.lead_usn) || (lead ? cleanStr(lead.usn) : '') || '--';
  let college = cleanStr(r.college) || cleanStr(r.institution) || 'P.A. College of Engineering, Mangaluru';
  let dept = cleanStr(r.dept) || cleanStr(r.department) || cleanStr(leadDept) || 'Engineering';
  let membersCount = parseInt(r.membersCount) || parseInt(r.member_count) || (r.members && r.members.length ? r.members.length : 1);
  let feePaid = (r.feePaid !== false && r.fee_paid !== false);
  let verified = (r.verified !== false);
  let domain = cleanStr(r.domain) || cleanStr(r.paper_domain) || cleanStr(r.project_type) || 'Engineering Innovation';
  let assignedStall = cleanStr(r.assignedStall) || cleanStr(r.assigned_stall) || cleanStr(r.stall) || cleanStr(r.slot) || '';
  
  // Resolve Track
  let track = cleanStr(r.track) || cleanStr(r.event) || cleanStr(r.event_choice) || '';
  const trackLower = track.toLowerCase();
  const idLower = cleanStr(r.id).toLowerCase();

  if (idLower.startsWith('emb-') || trackLower.includes('embed') || trackLower.includes('hackathon') || trackLower === 'track 1') {
    track = 'Track 1: Embeddathon';
  } else if (trackLower.includes('both') || (trackLower.includes('expo') && trackLower.includes('paper')) || trackLower.includes('dual')) {
    track = 'Track 2: Project Expo & Track 3: Paper';
  } else if (idLower.startsWith('ppr-') || idLower.startsWith('pp-') || trackLower.includes('paper') || trackLower.includes('research') || trackLower === 'track 3') {
    track = 'Track 3: Paper Presentation';
  } else if (idLower.startsWith('exp-') || trackLower.includes('expo') || trackLower.includes('exhibition') || trackLower.includes('hardware') || trackLower.includes('software') || trackLower.includes('project') || trackLower === 'track 2') {
    track = 'Track 2: Project Expo';
  } else if (!track) {
    track = 'Track 2: Project Expo';
  }

  // Master Roster Lookup & Healer
  if (Array.isArray(OFFICIAL_REGISTRATIONS) && OFFICIAL_REGISTRATIONS.length > 0) {
    const rId = cleanStr(r.id);
    const matched = OFFICIAL_REGISTRATIONS.find(t => {
      if (rId && t.id && (t.id === rId || t.id.toLowerCase() === rId.toLowerCase())) return true;
      if (college && t.college && college.length >= 3) {
        const c1 = college.toLowerCase();
        const c2 = (t.college || '').toLowerCase();
        if ((c1.includes('shree devi') && c2.includes('shree devi')) ||
            (c1.includes('rit') && c2.includes('rit')) ||
            (c1 === 'bit' && (c2.includes('bearys') || c2.includes('bit'))) ||
            (c1 === 'pace' && (c2.includes('p.a.') || c2.includes('pace')))) {
          return true;
        }
      }
      return false;
    });

    if (matched) {
      if (title === 'Project Prototype') title = matched.title || matched.team_name || title;
      if (leaderName === 'Team Leader') leaderName = matched.leaderName || matched.lead_name || leaderName;
      if (dept === 'Engineering') dept = matched.dept || dept;
      if (college === 'P.A. College of Engineering, Mangaluru' && matched.college) college = matched.college;
      if (!assignedStall) assignedStall = matched.assignedStall || '';
      if (usn === '--' && matched.usn) usn = matched.usn;
      if (!phone && matched.phone) phone = matched.phone;
      if (!email && matched.email) email = matched.email;
      if (matched.track) track = matched.track;
      if (matched.membersCount) membersCount = matched.membersCount;
    }
  }

  return {
    ...r,
    id: cleanStr(r.id) || 'REG',
    title,
    leaderName,
    phone,
    email,
    usn,
    college,
    dept,
    membersCount,
    feePaid,
    verified,
    domain,
    track,
    assignedStall
  };
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-embers-token');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    let embersData = { ...DEFAULT_EMBERS_DATA };

    // Try fetching from GitHub Gist
    try {
      const gist = await fetchGist();
      if (gist.files && gist.files['embers_data.json']) {
        const parsed = JSON.parse(gist.files['embers_data.json'].content);
        if (parsed.registrations && Array.isArray(parsed.registrations)) {
          const clean = parsed.registrations.map(normalizeReg).filter(Boolean).filter(r => {
            const title = r.title || '';
            const name = r.leaderName || '';
            return title !== 'undefined' && name !== 'undefined' && title !== 'Untitled Innovation' && (title.length > 2 || name.length > 2);
          });
          if (clean.length >= OFFICIAL_REGISTRATIONS.length) {
            parsed.registrations = clean;
          } else {
            // Merge all official registrations with any valid spot registrations
            const spotRegs = clean.filter(r => (r.id || '').startsWith('SPOT-') || r.is_spot);
            parsed.registrations = [...OFFICIAL_REGISTRATIONS, ...spotRegs];
          }
        }
        embersData = { ...embersData, ...parsed };
      }
    } catch (e) {
      console.warn('Gist fetch warning (using in-memory fallback):', e.message);
    }

    if (req.method === 'GET') {
      if (!embersData.registrations || !embersData.registrations.length) {
        embersData.registrations = OFFICIAL_REGISTRATIONS;
      }
      embersData.registrations = embersData.registrations.map(normalizeReg).filter(Boolean);
      return res.status(200).json(embersData);
    }

    if (req.method === 'POST') {
      const body = req.body || {};
      const action = body.action || req.query.action || 'sync';

      // Security Check: Secret Webhook Token, Admin PIN Protection, or Spot Registration
      const SECRET_TOKEN = process.env.EMBERS_WEBHOOK_TOKEN || 'EMBERS_SYNC_2026';
      const ADMIN_PIN = process.env.ADMIN_PIN || '5012';
      const providedAuth = req.headers['x-embers-token'] || body.token || body.adminPin;
      const isSpotReg = (action === 'spot_registration' || action === 'public_registration');

      if (!isSpotReg && providedAuth !== SECRET_TOKEN && providedAuth !== ADMIN_PIN) {
        return res.status(401).json({ error: 'Unauthorized: Invalid x-embers-token or Admin PIN. Access Denied.' });
      }

      // 1. Google Forms Webhook or Batch Sync
      if (action === 'sync_responses' || action === 'webhook') {
        const newRows = body.records || (body.record ? [body.record] : []);
        if (Array.isArray(newRows)) {
          newRows.forEach(item => {
            const id = item.id || `REG-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
            const existingIdx = embersData.registrations.findIndex(r => r.id === id || (r.email && r.email.toLowerCase() === (item.email || '').toLowerCase()));
            const record = {
              id: id,
              timestamp: item.timestamp || new Date().toISOString(),
              track: item.track || "Track 1: Embeddathon",
              title: item.title || item.projectTitle || "Untitled Project",
              college: item.college || "P.A. College of Engineering",
              dept: item.dept || "Computer Science & Engineering",
              leaderName: item.leaderName || item.name || "Participant",
              email: item.email || "",
              phone: item.phone || item.whatsapp || "",
              usn: item.usn || "",
              membersCount: item.membersCount || 1,
              members: item.members || [],
              abstract: item.abstract || "",
              domain: item.domain || "Embedded Systems & IoT",
              hardwareReq: item.hardwareReq || "None",
              feePaid: item.feePaid !== false,
              verified: item.verified || false,
              assignedStall: item.assignedStall || ""
            };

            if (existingIdx >= 0) {
              embersData.registrations[existingIdx] = { ...embersData.registrations[existingIdx], ...record };
            } else {
              embersData.registrations.push(record);
            }
          });
        }

        embersData.googleSheetConfig = {
          ...embersData.googleSheetConfig,
          lastSyncedAt: new Date().toISOString(),
          syncStatus: "SUCCESS",
          sheetCsvUrl: body.sheetCsvUrl || embersData.googleSheetConfig.sheetCsvUrl
        };
      }

      // 2. Save Schedule edits
      else if (action === 'save_schedule') {
        if (Array.isArray(body.schedule)) {
          embersData.schedule = body.schedule;
        }
      }

      // 3. Add single manual registration or Spot Registration
      else if (action === 'add_registration' || action === 'spot_registration') {
        const reg = body.registration;
        if (reg) {
          const spotCount = (embersData.registrations || []).filter(r => (r.id || '').startsWith('SPOT-')).length + 1;
          reg.id = reg.id || `SPOT-${String(spotCount).padStart(3, '0')}`;
          reg.timestamp = reg.timestamp || new Date().toISOString();
          reg.is_spot = true;
          embersData.registrations.unshift(normalizeReg(reg));
        }
      }

      // 4. Update single registration (e.g. check-in, stall allocation)
      else if (action === 'update_registration') {
        const reg = body.registration;
        if (reg && reg.id) {
          const idx = embersData.registrations.findIndex(r => r.id === reg.id);
          if (idx >= 0) {
            embersData.registrations[idx] = { ...embersData.registrations[idx], ...reg };
          }
        }
      }

      // 5. Delete registration
      else if (action === 'delete_registration') {
        const id = body.id;
        embersData.registrations = embersData.registrations.filter(r => r.id !== id);
      }

      // Persist to Gist
      try {
        await updateGistFile('embers_data.json', JSON.stringify(embersData, null, 2));
      } catch (e) {
        console.warn('Gist update warning:', e.message);
      }

      return res.status(200).json({ success: true, data: embersData });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('API /api/embers error:', err);
    return res.status(500).json({ error: err.message });
  }
};
