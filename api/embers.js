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

function normalizeReg(r) {
  if (!r) return null;
  const lead = (r.members && r.members.length) ? (r.members.find(m => m.is_lead) || r.members[0]) : null;
  const leadDept = (lead && lead.dept) ? lead.dept : (r.dept || '');
  const title = r.title || r.project_title || r.paper_title || r.team_name || 'Project Prototype';
  const leaderName = r.leaderName || r.lead_name || (lead ? lead.name : '') || 'Team Leader';
  const phone = r.phone || r.lead_phone || (lead ? lead.phone : '') || '';
  const email = r.email || r.lead_email || (lead ? lead.email : '') || '';
  const usn = r.usn || r.lead_usn || (lead ? lead.usn : '') || '';
  const college = r.college || 'P.A. College of Engineering, Mangaluru';
  const dept = r.dept || leadDept || 'Engineering';
  const membersCount = r.membersCount || r.member_count || (r.members ? r.members.length : 1);
  const feePaid = (r.feePaid !== undefined) ? r.feePaid : (r.fee_paid !== undefined ? r.fee_paid : true);
  const verified = (r.verified !== undefined) ? r.verified : true;
  const domain = r.domain || r.paper_domain || r.project_type || 'Engineering Innovation';
  
  let track = r.track || '';
  if (!track && r.event_choice) {
    const ec = String(r.event_choice).toLowerCase();
    if (ec.includes('embed') || ec.includes('hackathon')) {
      track = 'Track 1: Embeddathon';
    } else if (ec.includes('both')) {
      track = 'Track 2: Project Expo & Track 3: Paper';
    } else if (ec.includes('expo') || ec.includes('exhibition') || ec.includes('project')) {
      track = 'Track 2: Project Expo';
    } else if (ec.includes('paper')) {
      track = 'Track 3: Paper Presentation';
    } else {
      track = r.event_choice;
    }
  }

  return {
    ...r,
    id: r.id || 'REG',
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
    track: track || 'Track 2: Project Expo',
    assignedStall: r.assignedStall || r.assigned_stall || ''
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
        embersData = { ...embersData, ...JSON.parse(gist.files['embers_data.json'].content) };
      }
    } catch (e) {
      console.warn('Gist fetch warning (using in-memory fallback):', e.message);
    }

    if (req.method === 'GET') {
      if (Array.isArray(embersData.registrations)) {
        embersData.registrations = embersData.registrations.map(normalizeReg).filter(Boolean);
      }
      return res.status(200).json(embersData);
    }

    if (req.method === 'POST') {
      const body = req.body || {};
      const action = body.action || req.query.action || 'sync';

      // Security Check: Secret Webhook Token or Admin PIN Protection
      const SECRET_TOKEN = process.env.EMBERS_WEBHOOK_TOKEN || 'EMBERS_SYNC_2026';
      const ADMIN_PIN = process.env.ADMIN_PIN || '5012';
      const providedAuth = req.headers['x-embers-token'] || body.token || body.adminPin;

      if (providedAuth !== SECRET_TOKEN && providedAuth !== ADMIN_PIN) {
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

      // 3. Add single manual registration
      else if (action === 'add_registration') {
        const reg = body.registration;
        if (reg) {
          reg.id = reg.id || `REG-${Date.now()}`;
          embersData.registrations.unshift(reg);
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
