// EMBERS '26 · Management & Google Forms Sync Engine
// Department of Computer Science & Engineering, P.A. College of Engineering

(function () {
  'use strict';

  // -------------------------------------------------------------
  // State
  // -------------------------------------------------------------
  let schedule = [];
  let registrations = [];
  let googleSheetConfig = {
    sheetCsvUrl: '',
    lastSyncedAt: '',
    syncStatus: 'NOT_SYNCED'
  };

  let activeTab = 'schedule';
  let activeDayFilter = 'ALL';
  let activeTrackFilter = 'ALL';
  let searchQuery = '';
  let regTrackFilterVal = 'ALL';

  // DOM Elements
  const tabBtnSchedule = document.getElementById('tabBtnSchedule');
  const tabBtnRegistrations = document.getElementById('tabBtnRegistrations');
  const tabBtnVenues = document.getElementById('tabBtnVenues');
  const tabBtnWebhook = document.getElementById('tabBtnWebhook');

  const tabContentSchedule = document.getElementById('tabContentSchedule');
  const tabContentRegistrations = document.getElementById('tabContentRegistrations');
  const tabContentVenues = document.getElementById('tabContentVenues');
  const tabContentWebhook = document.getElementById('tabContentWebhook');

  const scheduleTimelineContainer = document.getElementById('scheduleTimelineContainer');
  const scheduleTrackFilter = document.getElementById('scheduleTrackFilter');
  const registrationsTableBody = document.getElementById('registrationsTableBody');
  const searchRegistrationsInput = document.getElementById('searchRegistrationsInput');
  const regTrackFilter = document.getElementById('regTrackFilter');

  const statTotalRegs = document.getElementById('statTotalRegs');
  const statTrack1Count = document.getElementById('statTrack1Count');
  const statTrack2Count = document.getElementById('statTrack2Count');
  const statTrack3Count = document.getElementById('statTrack3Count');
  const statSyncStatus = document.getElementById('statSyncStatus');
  const statLastSynced = document.getElementById('statLastSynced');
  const syncIndicatorText = document.getElementById('syncIndicatorText');

  const btnSyncGoogleSheet = document.getElementById('btnSyncGoogleSheet');
  const syncSpinner = document.getElementById('syncSpinner');
  const inputGoogleSheetCsvUrl = document.getElementById('inputGoogleSheetCsvUrl');
  const btnSaveSheetUrl = document.getElementById('btnSaveSheetUrl');
  const dropZoneCSV = document.getElementById('dropZoneCSV');
  const fileInputCSV = document.getElementById('fileInputCSV');
  const btnExportRegistrationsCSV = document.getElementById('btnExportRegistrationsCSV');
  const btnCopyAppsScript = document.getElementById('btnCopyAppsScript');

  // Modals
  const modalSlot = document.getElementById('modalSlot');
  const btnOpenAddSlotModal = document.getElementById('btnOpenAddSlotModal');
  const btnCloseSlotModal = document.getElementById('btnCloseSlotModal');
  const formSlot = document.getElementById('formSlot');
  const slotIdInput = document.getElementById('slotIdInput');
  const slotDayInput = document.getElementById('slotDayInput');
  const slotTrackInput = document.getElementById('slotTrackInput');
  const slotStartInput = document.getElementById('slotStartInput');
  const slotEndInput = document.getElementById('slotEndInput');
  const slotTitleInput = document.getElementById('slotTitleInput');
  const slotVenueInput = document.getElementById('slotVenueInput');
  const slotDescInput = document.getElementById('slotDescInput');
  const modalSlotTitle = document.getElementById('modalSlotTitle');

  const modalAddReg = document.getElementById('modalAddReg');
  const btnOpenAddRegModal = document.getElementById('btnOpenAddRegModal');
  const btnCloseAddRegModal = document.getElementById('btnCloseAddRegModal');
  const formAddReg = document.getElementById('formAddReg');

  // Auth Gate Elements
  const embersAuthGate = document.getElementById('embersAuthGate');
  const embersMainContainer = document.getElementById('embersMainContainer');
  const gateEmbersPin = document.getElementById('gateEmbersPin');
  const btnGateUnlock = document.getElementById('btnGateUnlock');
  const gateErrorMessage = document.getElementById('gateErrorMessage');
  const formEmbersAuth = document.getElementById('formEmbersAuth');
  const btnEmbersLogout = document.getElementById('btnEmbersLogout');

  // =============================================================
  // Coordinator Authentication
  // =============================================================
  function checkAuth() {
    // Strictly require session PIN verification so the admin gate is always enforced
    const savedPin = sessionStorage.getItem('embers_admin_pin');

    if (savedPin === '5012') {
      unlockConsole(savedPin);
    } else {
      if (embersAuthGate) embersAuthGate.classList.remove('hidden');
      if (embersMainContainer) embersMainContainer.classList.add('hidden');
      if (gateEmbersPin) setTimeout(() => gateEmbersPin.focus(), 100);
    }
  }

  function unlockConsole(pin) {
    sessionStorage.setItem('embers_admin_pin', pin);
    if (embersAuthGate) embersAuthGate.classList.add('hidden');
    if (embersMainContainer) embersMainContainer.classList.remove('hidden');
  }

  async function handleUnlock() {
    if (!gateEmbersPin) return;
    const pin = gateEmbersPin.value.trim();
    if (!pin) {
      showGateError('Please enter the master Admin PIN.');
      return;
    }

    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          judgeId: 'ADMIN',
          pin: pin,
          judgeName: 'Chief Coordinator'
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        showGateError(data.error || 'Incorrect Admin PIN.');
        return;
      }

      unlockConsole(pin);
    } catch (e) {
      // Local fallback
      if (pin === '5012') {
        unlockConsole(pin);
      } else {
        showGateError('Incorrect Admin PIN.');
      }
    }
  }

  function showGateError(msg) {
    if (gateErrorMessage) {
      gateErrorMessage.textContent = msg;
      gateErrorMessage.classList.remove('hidden');
    }
  }

  function handleLogout() {
    sessionStorage.removeItem('embers_admin_pin');
    localStorage.removeItem('embedthon_admin_auth');
    localStorage.removeItem('embers_admin_pin');
    if (embersAuthGate) embersAuthGate.classList.remove('hidden');
    if (embersMainContainer) embersMainContainer.classList.add('hidden');
    if (gateEmbersPin) {
      gateEmbersPin.value = '';
      gateEmbersPin.focus();
    }
  }

  // =============================================================
  // Secure API Helper
  // =============================================================
  const EMBERS_SECRET_TOKEN = 'EMBERS_SYNC_2026';

  async function postEmbersApi(action, data = {}) {
    try {
      const currentPin = sessionStorage.getItem('embers_admin_pin') || '5012';
      const payload = {
        action,
        token: EMBERS_SECRET_TOKEN,
        adminPin: currentPin,
        ...data
      };
      const res = await fetch('/api/embers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-embers-token': EMBERS_SECRET_TOKEN
        },
        body: JSON.stringify(payload)
      });
      return await res.json();
    } catch (e) {
      console.warn('API error for ' + action, e);
    }
  }

  // =============================================================
  // Initialization & Data Loading
  // =============================================================
  async function init() {
    bindEvents();
    checkAuth();
    await loadEmbersData();
  }

  function cleanStr(val, fallback = '') {
    if (val === undefined || val === null) return fallback;
    const s = String(val).trim();
    const lower = s.toLowerCase();
    if (lower === '' || lower === 'undefined' || lower === 'null' || lower === 'none' || lower === 'n/a') {
      return fallback;
    }
    return s;
  }

  function normalizeRegistration(r) {
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

    // Smart Roster Healer: if title or leader are missing, restore from master teams data
    if (typeof PROJECT_EXPO_TEAMS !== 'undefined' || typeof PAPER_TEAMS !== 'undefined' || typeof TEAMS_DATA !== 'undefined') {
      const allMaster = [
        ...(typeof TEAMS_DATA !== 'undefined' ? TEAMS_DATA : []),
        ...(typeof PROJECT_EXPO_TEAMS !== 'undefined' ? PROJECT_EXPO_TEAMS : []),
        ...(typeof PAPER_TEAMS !== 'undefined' ? PAPER_TEAMS : [])
      ];

      const rId = cleanStr(r.id);
      const matched = allMaster.find(t => {
        if (rId && t.slot && t.slot === rId) return true;
        if (rId && t.number && (t.number === rId || `EXP-${t.number}` === rId || `PPR-${t.number}` === rId || `EMB-${t.number}` === rId)) return true;
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
        if (title === 'Project Prototype') title = matched.name || matched.abstract_title || title;
        if (leaderName === 'Team Leader') leaderName = matched.lead || (matched.members && matched.members[0] ? matched.members[0].name : leaderName);
        if (dept === 'Engineering') dept = matched.dept || (matched.section ? `CSE (Section ${matched.section})` : dept);
        if (college === 'P.A. College of Engineering, Mangaluru' && matched.college) college = matched.college;
        if (!assignedStall) assignedStall = matched.stall || matched.slot || '';
        if (usn === '--' && matched.members && matched.members[0] && matched.members[0].usn) usn = matched.members[0].usn;
        if (!phone && matched.phone) phone = matched.phone;
        if (!email && matched.email) email = matched.email;
        if (matched.project_type) domain = `${matched.project_type} Track`;
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

  async function loadEmbersData() {
    try {
      const res = await fetch('/api/embers', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        schedule = data.schedule || [];
        const rawRegs = data.registrations || [];
        registrations = rawRegs.map(normalizeRegistration).filter(Boolean);
        googleSheetConfig = data.googleSheetConfig || googleSheetConfig;
      }
    } catch (e) {
      console.warn('Local fallback for EMBERS data:', e);
    }

    // Seed registrations from teams.js if empty
    if (!registrations.length && typeof TEAMS_DATA !== 'undefined') {
      const embedRegs = (TEAMS_DATA || []).map((t) => {
        const lead = t.members.find(m => m.is_lead) || t.members[0];
        return {
          id: `EMB-${t.number}`,
          timestamp: '2026-11-20T10:00:00.000Z',
          track: 'Track 1: Embeddathon',
          title: t.abstract_title || `${t.name} Prototype`,
          college: 'P.A. College of Engineering, Mangaluru',
          dept: `CSE (Section ${t.section})`,
          leaderName: lead ? lead.name : 'Team Leader',
          email: lead ? lead.email : '',
          phone: lead ? lead.phone : '',
          usn: lead ? lead.usn : '',
          membersCount: t.members.length,
          members: t.members,
          abstract: t.abstract || '',
          domain: 'Embedded Systems & IoT',
          hardwareReq: '230V Power Socket, Display Table',
          feePaid: true,
          verified: true,
          assignedStall: 'Computer Labs 1 & 2'
        };
      });

      const expoRegs = (typeof PROJECT_EXPO_TEAMS !== 'undefined' ? PROJECT_EXPO_TEAMS : []).map((t) => {
        const lead = t.members && t.members.length ? (t.members.find(m => m.is_lead) || t.members[0]) : null;
        return {
          id: `EXP-${t.number}`,
          timestamp: '2026-11-20T10:00:00.000Z',
          track: 'Track 2: Project Expo',
          title: t.name,
          college: t.college || 'P.A. College of Engineering',
          dept: t.dept || 'Engineering',
          leaderName: t.lead || (lead ? lead.name : 'Team Leader'),
          email: t.email || (lead ? lead.email : ''),
          phone: t.phone || (lead ? lead.phone : ''),
          usn: lead ? lead.usn : '',
          membersCount: t.member_count || (t.members ? t.members.length : 1),
          members: t.members || [],
          abstract: t.abstract || '',
          domain: t.project_type ? `${t.project_type} Track` : (t.category || 'Engineering Innovation'),
          hardwareReq: t.project_type === 'Hardware' ? '230V Power Socket & Display Table' : 'Standard Table Space & Wi-Fi',
          feePaid: true,
          verified: true,
          assignedStall: t.stall || `Stall ${t.number}`
        };
      });

      const paperRegs = (typeof PAPER_TEAMS !== 'undefined' ? PAPER_TEAMS : []).map((t) => {
        const lead = t.members && t.members.length ? (t.members.find(m => m.is_lead) || t.members[0]) : null;
        return {
          id: `PPR-${t.number}`,
          timestamp: '2026-11-20T10:00:00.000Z',
          track: 'Track 3: Paper Presentation',
          title: t.name,
          college: t.college || 'P.A. College of Engineering',
          dept: t.dept || 'Engineering',
          leaderName: t.lead || (lead ? lead.name : 'Author'),
          email: t.email || (lead ? lead.email : ''),
          phone: t.phone || (lead ? lead.phone : ''),
          usn: lead ? lead.usn : '',
          membersCount: t.member_count || (t.members ? t.members.length : 1),
          members: t.members || [],
          abstract: t.abstract || '',
          domain: t.domain || 'Technical Research Paper',
          hardwareReq: 'Projector & Mic',
          feePaid: true,
          verified: true,
          assignedStall: t.slot || `PP-${t.number}`
        };
      });

      registrations = [...embedRegs, ...expoRegs, ...paperRegs];
    }

    if (inputGoogleSheetCsvUrl && googleSheetConfig.sheetCsvUrl) {
      inputGoogleSheetCsvUrl.value = googleSheetConfig.sheetCsvUrl;
    }

    updateMetrics();
    renderSchedule();
    renderRegistrations();
  }

  // =============================================================
  // Metrics & Stats
  // =============================================================
  function updateMetrics() {
    const total = registrations.length;
    const t1 = registrations.filter(r => (r.track || '').includes('Embeddathon') || (r.track || '').includes('Track 1')).length;
    const t2 = registrations.filter(r => (r.track || '').includes('Exhibition') || (r.track || '').includes('Expo') || (r.track || '').includes('Track 2')).length;
    const t3 = registrations.filter(r => (r.track || '').includes('Paper') || (r.track || '').includes('Track 3')).length;

    if (statTotalRegs) statTotalRegs.textContent = total;
    if (statTrack1Count) statTrack1Count.textContent = t1;
    if (statTrack2Count) statTrack2Count.textContent = t2;
    if (statTrack3Count) statTrack3Count.textContent = t3;

    if (statLastSynced) {
      statLastSynced.textContent = googleSheetConfig.lastSyncedAt
        ? `Last synced: ${new Date(googleSheetConfig.lastSyncedAt).toLocaleTimeString()}`
        : 'Direct Google Sheet Connected';
    }

    if (syncIndicatorText) {
      syncIndicatorText.textContent = `${total} Teams Synced`;
    }
  }

  // =============================================================
  // Tab Switching
  // =============================================================
  function switchTab(tab) {
    activeTab = tab;
    [tabBtnSchedule, tabBtnRegistrations, tabBtnVenues, tabBtnWebhook].forEach(b => {
      b.className = 'tab-btn px-4 py-2 rounded-xl text-xs font-black transition flex items-center gap-1.5 bg-[#f6f1e6] text-[#475569] hover:bg-[#efe8da]';
    });

    [tabContentSchedule, tabContentRegistrations, tabContentVenues, tabContentWebhook].forEach(c => {
      c.classList.add('hidden');
    });

    if (tab === 'schedule') {
      tabBtnSchedule.className = 'tab-btn px-4 py-2 rounded-xl text-xs font-black transition flex items-center gap-1.5 bg-[#ea580c] text-white shadow-xs';
      tabContentSchedule.classList.remove('hidden');
      renderSchedule();
    } else if (tab === 'registrations') {
      tabBtnRegistrations.className = 'tab-btn px-4 py-2 rounded-xl text-xs font-black transition flex items-center gap-1.5 bg-[#ea580c] text-white shadow-xs';
      tabContentRegistrations.classList.remove('hidden');
      renderRegistrations();
    } else if (tab === 'venues') {
      tabBtnVenues.className = 'tab-btn px-4 py-2 rounded-xl text-xs font-black transition flex items-center gap-1.5 bg-[#ea580c] text-white shadow-xs';
      tabContentVenues.classList.remove('hidden');
    } else if (tab === 'webhook') {
      tabBtnWebhook.className = 'tab-btn px-4 py-2 rounded-xl text-xs font-black transition flex items-center gap-1.5 bg-[#ea580c] text-white shadow-xs';
      tabContentWebhook.classList.remove('hidden');
    }
  }

  // =============================================================
  // Schedule Management
  // =============================================================
  function renderSchedule() {
    if (!scheduleTimelineContainer) return;

    const filtered = schedule.filter(item => {
      const dayMatch = activeDayFilter === 'ALL' || String(item.day) === String(activeDayFilter);
      const trackMatch = activeTrackFilter === 'ALL' || item.track === activeTrackFilter || item.track === 'ALL';
      return dayMatch && trackMatch;
    });

    if (!filtered.length) {
      scheduleTimelineContainer.innerHTML = `
        <div class="bg-white p-8 rounded-2xl border border-[#e3dccd] text-center space-y-2">
          <span class="text-3xl">📅</span>
          <p class="text-xs font-bold text-[#64748b]">No scheduled slots found for the selected filter.</p>
          <button type="button" onclick="window.openAddSlotModal()" class="px-3 py-1.5 rounded-lg bg-[#ea580c] text-white font-bold text-xs">+ Add First Slot</button>
        </div>
      `;
      return;
    }

    scheduleTimelineContainer.innerHTML = filtered.map(slot => {
      const isDay1 = slot.day === 1;
      const trackBadge = slot.track === 'TRACK_1'
        ? '<span class="px-2 py-0.5 rounded text-[9px] font-black uppercase bg-orange-100 text-[#ea580c] border border-orange-200">Track 1: Embeddathon</span>'
        : slot.track === 'TRACK_2'
        ? '<span class="px-2 py-0.5 rounded text-[9px] font-black uppercase bg-amber-100 text-amber-800 border border-amber-200">Track 2: Project Expo</span>'
        : slot.track === 'TRACK_3'
        ? '<span class="px-2 py-0.5 rounded text-[9px] font-black uppercase bg-indigo-100 text-indigo-800 border border-indigo-200">Track 3: Paper Competition</span>'
        : '<span class="px-2 py-0.5 rounded text-[9px] font-black uppercase bg-slate-100 text-slate-700 border border-slate-200">All Tracks / General</span>';

      return `
        <div class="bg-white p-4 rounded-2xl border border-[#e3dccd] hover:border-[#fed7aa] shadow-xs transition flex items-start justify-between flex-wrap sm:flex-nowrap gap-3">
          
          <!-- Time & Day Indicator Column -->
          <div class="flex items-center gap-3 min-w-[170px] flex-shrink-0">
            <div class="w-10 h-10 rounded-xl ${isDay1 ? 'bg-orange-50 text-[#ea580c] border border-orange-200' : 'bg-amber-50 text-amber-700 border border-amber-200'} flex flex-col items-center justify-center font-black text-center flex-shrink-0">
              <span class="text-[8px] uppercase tracking-wider">Day</span>
              <span class="text-sm leading-tight">${slot.day}</span>
            </div>
            <div>
              <span class="text-xs font-black font-mono text-[#0f172a] block tracking-tight">${slot.start} – ${slot.end}</span>
              <span class="text-[10px] text-[#64748b] block">${isDay1 ? 'Nov 24, 2026' : 'Nov 25, 2026'}</span>
            </div>
          </div>

          <!-- Main Slot Info -->
          <div class="flex-1 space-y-1 min-w-0">
            <div class="flex items-center gap-2 flex-wrap">
              <h4 class="text-sm font-black text-[#0f172a]">${slot.title}</h4>
              ${trackBadge}
            </div>
            <p class="text-xs text-[#475569] leading-relaxed">${slot.desc || ''}</p>
            <div class="flex items-center gap-2 pt-0.5 text-[10px] text-[#64748b]">
              <span class="flex items-center gap-1 font-bold text-[#0f172a]">
                <span>📍</span>
                <span>${slot.venue}</span>
              </span>
            </div>
          </div>

          <!-- Actions -->
          <div class="flex items-center gap-1.5 self-center flex-shrink-0">
            <button type="button" class="p-1.5 rounded-lg bg-[#f6f1e6] hover:bg-[#efe8da] text-[#475569] text-xs font-bold transition" onclick="window.editSlot('${slot.id}')" title="Edit Slot">
              ✏️
            </button>
            <button type="button" class="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 text-xs font-bold transition" onclick="window.deleteSlot('${slot.id}')" title="Delete Slot">
              🗑️
            </button>
          </div>

        </div>
      `;
    }).join('');
  }

  window.openAddSlotModal = function () {
    modalSlotTitle.textContent = 'Add Schedule Slot';
    formSlot.reset();
    slotIdInput.value = '';
    modalSlot.classList.remove('hidden');
  };

  window.editSlot = function (id) {
    const slot = schedule.find(s => s.id === id);
    if (!slot) return;
    modalSlotTitle.textContent = 'Edit Schedule Slot';
    slotIdInput.value = slot.id;
    slotDayInput.value = slot.day;
    slotTrackInput.value = slot.track;
    slotStartInput.value = slot.start;
    slotEndInput.value = slot.end;
    slotTitleInput.value = slot.title;
    slotVenueInput.value = slot.venue;
    slotDescInput.value = slot.desc || '';
    modalSlot.classList.remove('hidden');
  };

  window.deleteSlot = async function (id) {
    if (!confirm('Are you sure you want to remove this scheduled slot?')) return;
    schedule = schedule.filter(s => s.id !== id);
    renderSchedule();
    await saveScheduleToServer();
  };

  async function handleSaveSlot(e) {
    e.preventDefault();
    const id = slotIdInput.value || `SLOT-${Date.now()}`;
    const newSlot = {
      id: id,
      day: parseInt(slotDayInput.value),
      date: slotDayInput.value === '1' ? '2026-11-24' : '2026-11-25',
      track: slotTrackInput.value,
      start: slotStartInput.value,
      end: slotEndInput.value,
      title: slotTitleInput.value.trim(),
      venue: slotVenueInput.value.trim(),
      desc: slotDescInput.value.trim(),
      status: 'SCHEDULED'
    };

    const idx = schedule.findIndex(s => s.id === id);
    if (idx >= 0) {
      schedule[idx] = newSlot;
    } else {
      schedule.push(newSlot);
    }

    schedule.sort((a, b) => a.day - b.day || a.start.localeCompare(b.start));
    modalSlot.classList.add('hidden');
    renderSchedule();
    await saveScheduleToServer();
  }

  async function saveScheduleToServer() {
    await postEmbersApi('save_schedule', { schedule: schedule });
  }

  // =============================================================
  // Google Forms Live Sync & CSV Import
  // =============================================================
  async function syncGoogleSheetCsv(url) {
    if (!url) {
      url = inputGoogleSheetCsvUrl ? inputGoogleSheetCsvUrl.value.trim() : '';
    }
    if (!url) {
      alert('Please enter your Google Sheet published CSV URL first.');
      return;
    }

    if (syncSpinner) syncSpinner.classList.remove('hidden');

    try {
      // Fetch sheet CSV via direct or proxy
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const csvText = await res.text();
      parseAndImportCsv(csvText, url);
    } catch (err) {
      alert(`Could not fetch directly due to CORS or access: ${err.message}. You can download the CSV from Google Sheets and drag & drop it into the box below!`);
    } finally {
      if (syncSpinner) syncSpinner.classList.add('hidden');
    }
  }

  function parseCSVToRows(text) {
    const rows = [];
    let row = [];
    let field = '';
    let inQuotes = false;

    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      const next = text[i + 1];

      if (inQuotes) {
        if (c === '"') {
          if (next === '"') {
            field += '"';
            i++;
          } else {
            inQuotes = false;
          }
        } else {
          field += c;
        }
      } else {
        if (c === '"') {
          inQuotes = true;
        } else if (c === ',') {
          row.push(field.trim());
          field = '';
        } else if (c === '\r') {
          // ignore
        } else if (c === '\n') {
          row.push(field.trim());
          if (row.some(cell => cell.length > 0)) {
            rows.push(row);
          }
          row = [];
          field = '';
        } else {
          field += c;
        }
      }
    }
    if (field || row.length > 0) {
      row.push(field.trim());
      if (row.some(cell => cell.length > 0)) {
        rows.push(row);
      }
    }
    return rows;
  }

  function parseAndImportCsv(csvText, sourceUrl = '') {
    const rows = parseCSVToRows(csvText);
    if (rows.length < 2) {
      alert('CSV file appears empty or missing data rows.');
      return;
    }

    const headers = rows[0].map(h => cleanStr(h).toLowerCase());
    
    // Exact or priority fuzzy column detection
    const findExactOrFuzzyCol = (priorityKeywords) => {
      for (const kw of priorityKeywords) {
        const idx = headers.findIndex(h => h.includes(kw.toLowerCase()));
        if (idx >= 0) return idx;
      }
      return -1;
    };

    const colTimestamp = findExactOrFuzzyCol(['timestamp', 'date', 'time']);
    const colTrack = findExactOrFuzzyCol(['select event', 'track', 'event']);
    const colTitle = findExactOrFuzzyCol(['project title', 'paper title', 'title of project', 'title']);
    const colTeamName = findExactOrFuzzyCol(['team name', 'team']);
    const colCollege = findExactOrFuzzyCol(['college/institution', 'institution', 'college']);
    const colDept = findExactOrFuzzyCol(['department', 'dept', 'branch']);
    const colLeaderName = findExactOrFuzzyCol(['full name', 'leader name', 'lead name', 'team leader', 'name']);
    const colEmail = findExactOrFuzzyCol(['email', 'email address']);
    const colPhone = findExactOrFuzzyCol(['phone/whatsapp', 'whatsapp', 'phone', 'mobile', 'contact']);
    const colUsn = findExactOrFuzzyCol(['usn', 'roll number', 'roll no']);
    const colCount = findExactOrFuzzyCol(['members count', 'team size', 'total number', 'members']);
    const colAbstract = findExactOrFuzzyCol(['brief summary / abstract', 'abstract', 'description', 'synopsis']);
    const colDomain = findExactOrFuzzyCol(['paper topic / domain', 'domain', 'category', 'project type']);
    const colHw = findExactOrFuzzyCol(['hardware', 'power', 'requirement']);

    const newRecords = [];

    for (let i = 1; i < rows.length; i++) {
      const clean = rows[i];
      const getVal = (idx) => (idx >= 0 && idx < clean.length ? cleanStr(clean[idx]) : '');

      const parsedTitle = getVal(colTitle) || getVal(colTeamName) || 'Project Prototype';
      const parsedLead = getVal(colLeaderName) || 'Team Leader';
      const parsedColl = getVal(colCollege) || 'P.A. College of Engineering, Mangaluru';
      const parsedDept = getVal(colDept) || 'Engineering';

      const rawRec = {
        id: `GOOGLE-${Date.now()}-${i}`,
        timestamp: getVal(colTimestamp) || new Date().toISOString(),
        track: getVal(colTrack) || 'Track 2: Project Expo',
        title: parsedTitle,
        team_name: getVal(colTeamName) || parsedTitle,
        college: parsedColl,
        dept: parsedDept,
        leaderName: parsedLead,
        email: getVal(colEmail),
        phone: getVal(colPhone),
        usn: getVal(colUsn),
        membersCount: parseInt(getVal(colCount)) || 1,
        abstract: getVal(colAbstract),
        domain: getVal(colDomain) || 'Engineering Innovation',
        hardwareReq: getVal(colHw) || 'Standard Table Space & Power',
        feePaid: true,
        verified: true,
        assignedStall: ''
      };

      const normalized = normalizeRegistration(rawRec);
      if (normalized) {
        newRecords.push(normalized);
      }
    }

    // Merge or push to registrations
    newRecords.forEach(nr => {
      const existingIdx = registrations.findIndex(r => (r.email && nr.email && r.email.toLowerCase() === nr.email.toLowerCase()) || (r.id && nr.id && r.id === nr.id));
      if (existingIdx >= 0) {
        registrations[existingIdx] = { ...registrations[existingIdx], ...nr };
      } else {
        registrations.push(nr);
      }
    });

    googleSheetConfig.lastSyncedAt = new Date().toISOString();
    googleSheetConfig.syncStatus = 'SUCCESS';
    if (sourceUrl) googleSheetConfig.sheetCsvUrl = sourceUrl;

    updateMetrics();
    renderRegistrations();

    // Sync to backend
    postEmbersApi('sync_responses', {
      records: newRecords,
      sheetCsvUrl: sourceUrl
    });

    alert(`Successfully synced ${newRecords.length} responses from Google Forms!`);
  }

  // =============================================================
  // Registrations Directory Table Rendering
  // =============================================================
  function renderRegistrations() {
    if (!registrationsTableBody) return;

    const filtered = registrations.filter(r => {
      const q = searchQuery.toLowerCase();
      const matchQuery = !q ||
        (r.title || '').toLowerCase().includes(q) ||
        (r.leaderName || '').toLowerCase().includes(q) ||
        (r.college || '').toLowerCase().includes(q) ||
        (r.usn || '').toLowerCase().includes(q) ||
        (r.email || '').toLowerCase().includes(q);

      const matchTrack = regTrackFilterVal === 'ALL' || (r.track || '').includes(regTrackFilterVal);
      return matchQuery && matchTrack;
    });

    if (!filtered.length) {
      registrationsTableBody.innerHTML = `
        <tr>
          <td colspan="8" class="py-8 text-center text-xs text-[#64748b]">
            No registrations found matching your query.
          </td>
        </tr>
      `;
      return;
    }

    registrationsTableBody.innerHTML = filtered.map((r, idx) => {
      const displayTitle = cleanStr(r.title) || cleanStr(r.project_title) || cleanStr(r.paper_title) || cleanStr(r.name) || cleanStr(r.team_name) || 'Project Prototype';
      const displayLeader = cleanStr(r.leaderName) || cleanStr(r.lead_name) || cleanStr(r.lead) || (r.members && r.members[0] ? cleanStr(r.members[0].name) : '') || 'Team Leader';
      const displayCollege = cleanStr(r.college) || cleanStr(r.institution) || 'P.A. College of Engineering, Mangaluru';
      const displayDept = cleanStr(r.dept) || cleanStr(r.department) || (r.members && r.members[0] ? cleanStr(r.members[0].dept) : '') || 'Engineering';
      const displayUsn = cleanStr(r.usn) || cleanStr(r.lead_usn) || (r.members && r.members[0] ? cleanStr(r.members[0].usn) : '') || '--';
      const displayDomain = cleanStr(r.domain) || cleanStr(r.paper_domain) || cleanStr(r.project_type) || 'Engineering Innovation';
      const displayPhone = cleanStr(r.phone) || cleanStr(r.lead_phone) || (r.members && r.members[0] ? cleanStr(r.members[0].phone) : '');
      const displayEmail = cleanStr(r.email) || cleanStr(r.lead_email) || (r.members && r.members[0] ? cleanStr(r.members[0].email) : '');
      const displayStall = cleanStr(r.assignedStall) || cleanStr(r.assigned_stall) || cleanStr(r.stall) || cleanStr(r.slot) || '';
      const displayId = cleanStr(r.id) || `REG-${idx + 1}`;
      const isFeePaid = (r.feePaid !== false && r.fee_paid !== false);

      return `
        <tr class="hover:bg-[#f6f1e6]/60 transition text-xs">
          <td class="py-2.5 px-3 text-center font-mono font-bold text-slate-500">${idx + 1}</td>
          
          <!-- Track & Title -->
          <td class="py-2.5 px-3">
            <div class="flex items-center gap-1.5 mb-0.5">
              ${trackBadgeShort(r.track)}
              <span class="text-[10px] text-[#64748b] font-mono">${displayId}</span>
            </div>
            <span class="font-extrabold text-[#0f172a] block font-serif-pace text-sm leading-tight">${displayTitle}</span>
            <span class="text-[10px] text-[#64748b] block italic truncate max-w-xs">${displayDomain}</span>
          </td>

          <!-- Team Leader & Contact -->
          <td class="py-2.5 px-3">
            <span class="font-bold text-[#0f172a] block">${displayLeader}</span>
            <span class="text-[10px] text-[#64748b] font-mono block">${displayUsn}</span>
            <div class="flex items-center gap-2 pt-0.5 text-[10px]">
              ${displayPhone ? `<a href="https://wa.me/${displayPhone.replace(/[^0-9]/g, '')}" target="_blank" class="text-emerald-600 font-bold hover:underline flex items-center gap-0.5"><span>📱</span><span>${displayPhone}</span></a>` : ''}
              ${displayEmail ? `<a href="mailto:${displayEmail}" class="text-blue-600 font-bold hover:underline">✉️</a>` : ''}
            </div>
          </td>

          <!-- College & Dept -->
          <td class="py-2.5 px-3">
            <span class="font-bold text-[#0f172a] block truncate max-w-[180px]">${displayCollege}</span>
            <span class="text-[10px] text-[#64748b] block truncate max-w-[180px]">${displayDept}</span>
          </td>

          <!-- Team Size -->
          <td class="py-2.5 px-2 text-center">
            <span class="px-2 py-0.5 rounded-full text-xs font-bold bg-[#f6f1e6] text-[#0f172a] border border-[#e3dccd]">
              ${r.membersCount || (r.members && r.members.length) || 1} pax
            </span>
          </td>

          <!-- Stall / Presentation Slot -->
          <td class="py-2.5 px-2.5 text-center">
            <input type="text" value="${displayStall}" placeholder="Assign..." 
                   class="w-20 text-center font-mono text-xs font-bold bg-white border border-[#cbd5e1] rounded-lg px-1 py-0.5 focus:ring-1 focus:ring-[#ea580c]"
                   onchange="window.updateStall('${displayId}', this.value)">
          </td>

          <!-- Fee Status Toggle -->
          <td class="py-2.5 px-2 text-center">
            <button type="button" class="px-2 py-0.5 rounded text-[10px] font-black uppercase transition ${isFeePaid ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-rose-100 text-rose-800 border border-rose-300'}"
                    onclick="window.toggleFeeStatus('${displayId}')">
              ${isFeePaid ? 'PAID ✓' : 'UNPAID ✕'}
            </button>
          </td>

          <!-- Actions -->
          <td class="py-2.5 px-3 text-right">
            <button type="button" class="p-1 rounded hover:bg-rose-50 text-rose-600 font-bold transition text-xs" onclick="window.deleteRegistration('${displayId}')" title="Delete Team">
              🗑️
            </button>
          </td>
        </tr>
      `;
    }).join('');
  }

  function trackBadgeShort(track) {
    const t = String(track || '').toLowerCase();
    if (t.includes('embed') || t.includes('hackathon') || t.includes('track 1')) {
      return '<span class="px-1.5 py-0.5 rounded text-[9px] font-black uppercase bg-orange-100 text-[#ea580c]">Track 1</span>';
    }
    if (t.includes('both') || (t.includes('track 2') && t.includes('track 3')) || t.includes('dual')) {
      return '<span class="px-1.5 py-0.5 rounded text-[9px] font-black uppercase bg-purple-100 text-purple-800">Track 2 & 3</span>';
    }
    if (t.includes('paper') || t.includes('research') || t.includes('track 3')) {
      return '<span class="px-1.5 py-0.5 rounded text-[9px] font-black uppercase bg-indigo-100 text-indigo-800">Track 3</span>';
    }
    return '<span class="px-1.5 py-0.5 rounded text-[9px] font-black uppercase bg-amber-100 text-amber-800">Track 2</span>';
  }

  window.updateStall = async function (id, value) {
    const reg = registrations.find(r => r.id === id);
    if (reg) {
      reg.assignedStall = value.trim();
      postEmbersApi('update_registration', { registration: reg });
    }
  };

  window.toggleFeeStatus = async function (id) {
    const reg = registrations.find(r => r.id === id);
    if (reg) {
      reg.feePaid = !reg.feePaid;
      renderRegistrations();
      postEmbersApi('update_registration', { registration: reg });
    }
  };

  window.deleteRegistration = async function (id) {
    if (!confirm('Remove this team from the EMBERS directory?')) return;
    registrations = registrations.filter(r => r.id !== id);
    updateMetrics();
    renderRegistrations();
    postEmbersApi('delete_registration', { id: id });
  };

  // =============================================================
  // Export to CSV
  // =============================================================
  function exportRegistrationsCSV() {
    if (!registrations.length) {
      alert('No registrations available to export.');
      return;
    }

    const headers = ['Reg ID', 'Track', 'Project / Paper Title', 'Leader Name', 'Email', 'Phone', 'USN', 'College', 'Department', 'Members Count', 'Domain', 'Assigned Stall', 'Fee Paid'];
    const rows = registrations.map(r => [
      r.id,
      r.track,
      r.title,
      r.leaderName,
      r.email,
      r.phone,
      r.usn,
      r.college,
      r.dept,
      r.membersCount,
      r.domain,
      r.assignedStall,
      r.feePaid ? 'YES' : 'NO'
    ]);

    const csvContent = [headers.join(','), ...rows.map(row => row.map(cell => `"${String(cell || '').replace(/"/g, '""')}"`).join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `EMBERS_26_Registrations_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // =============================================================
  // Event Bindings
  // =============================================================
  function bindEvents() {
    // Authentication Gate & Lock
    if (btnGateUnlock) btnGateUnlock.addEventListener('click', handleUnlock);
    if (formEmbersAuth) formEmbersAuth.addEventListener('submit', (e) => { e.preventDefault(); handleUnlock(); });
    if (gateEmbersPin) {
      gateEmbersPin.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') handleUnlock();
      });
    }
    if (btnEmbersLogout) btnEmbersLogout.addEventListener('click', handleLogout);

    // Tabs
    tabBtnSchedule.addEventListener('click', () => switchTab('schedule'));
    tabBtnRegistrations.addEventListener('click', () => switchTab('registrations'));
    tabBtnVenues.addEventListener('click', () => switchTab('venues'));
    tabBtnWebhook.addEventListener('click', () => switchTab('webhook'));

    // Schedule day filter buttons
    document.querySelectorAll('.btn-day-filter').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('.btn-day-filter').forEach(b => {
          b.className = 'btn-day-filter px-3 py-1 rounded-lg text-xs font-bold text-[#64748b] hover:text-[#0f172a]';
        });
        e.target.className = 'btn-day-filter px-3 py-1 rounded-lg text-xs font-bold bg-white text-[#ea580c] shadow-xs';
        activeDayFilter = e.target.dataset.day;
        renderSchedule();
      });
    });

    if (scheduleTrackFilter) {
      scheduleTrackFilter.addEventListener('change', (e) => {
        activeTrackFilter = e.target.value;
        renderSchedule();
      });
    }

    // Modal Slot
    if (btnOpenAddSlotModal) btnOpenAddSlotModal.addEventListener('click', window.openAddSlotModal);
    if (btnCloseSlotModal) btnCloseSlotModal.addEventListener('click', () => modalSlot.classList.add('hidden'));
    if (formSlot) formSlot.addEventListener('submit', handleSaveSlot);

    // Google Sheet sync button
    if (btnSyncGoogleSheet) {
      btnSyncGoogleSheet.addEventListener('click', () => syncGoogleSheetCsv());
    }

    if (btnSaveSheetUrl) {
      btnSaveSheetUrl.addEventListener('click', () => {
        const url = inputGoogleSheetCsvUrl.value.trim();
        if (url) {
          googleSheetConfig.sheetCsvUrl = url;
          syncGoogleSheetCsv(url);
        }
      });
    }

    // File Drag and Drop
    if (dropZoneCSV) {
      dropZoneCSV.addEventListener('click', () => fileInputCSV.click());
      dropZoneCSV.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZoneCSV.classList.add('bg-orange-100');
      });
      dropZoneCSV.addEventListener('dragleave', () => dropZoneCSV.classList.remove('bg-orange-100'));
      dropZoneCSV.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZoneCSV.classList.remove('bg-orange-100');
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
          handleFile(e.dataTransfer.files[0]);
        }
      });
    }

    if (fileInputCSV) {
      fileInputCSV.addEventListener('change', (e) => {
        if (e.target.files && e.target.files[0]) {
          handleFile(e.target.files[0]);
        }
      });
    }

    function handleFile(file) {
      const reader = new FileReader();
      reader.onload = function (evt) {
        parseAndImportCsv(evt.target.result, file.name);
      };
      reader.readAsText(file);
    }

    // Search and filters
    if (searchRegistrationsInput) {
      searchRegistrationsInput.addEventListener('input', (e) => {
        searchQuery = e.target.value;
        renderRegistrations();
      });
    }

    if (regTrackFilter) {
      regTrackFilter.addEventListener('change', (e) => {
        regTrackFilterVal = e.target.value;
        renderRegistrations();
      });
    }

    if (btnExportRegistrationsCSV) {
      btnExportRegistrationsCSV.addEventListener('click', exportRegistrationsCSV);
    }

    // Copy Apps script
    if (btnCopyAppsScript) {
      btnCopyAppsScript.addEventListener('click', () => {
        const code = document.getElementById('codeAppsScript').innerText;
        navigator.clipboard.writeText(code).then(() => {
          btnCopyAppsScript.textContent = 'Copied! ✓';
          setTimeout(() => btnCopyAppsScript.textContent = 'Copy Script', 2000);
        });
      });
    }

    // Manual Reg modal
    if (btnOpenAddRegModal) {
      btnOpenAddRegModal.addEventListener('click', () => {
        formAddReg.reset();
        modalAddReg.classList.remove('hidden');
      });
    }

    if (btnCloseAddRegModal) {
      btnCloseAddRegModal.addEventListener('click', () => modalAddReg.classList.add('hidden'));
    }

    if (formAddReg) {
      formAddReg.addEventListener('submit', (e) => {
        e.preventDefault();
        const newReg = {
          id: `MANUAL-${Date.now()}`,
          timestamp: new Date().toISOString(),
          track: document.getElementById('regTrackSelect').value,
          title: document.getElementById('regTitleInput').value.trim(),
          college: document.getElementById('regCollegeInput').value.trim(),
          dept: document.getElementById('regDeptInput').value.trim(),
          leaderName: document.getElementById('regLeaderNameInput').value.trim(),
          email: document.getElementById('regEmailInput').value.trim(),
          phone: document.getElementById('regPhoneInput').value.trim(),
          usn: document.getElementById('regUsnInput').value.trim(),
          membersCount: parseInt(document.getElementById('regMembersCountInput').value) || 1,
          domain: document.getElementById('regDomainInput').value.trim() || 'Engineering Innovation',
          assignedStall: document.getElementById('regStallInput').value.trim(),
          abstract: document.getElementById('regAbstractInput').value.trim(),
          feePaid: true,
          verified: true
        };

        registrations.unshift(newReg);
        modalAddReg.classList.add('hidden');
        updateMetrics();
        renderRegistrations();

        postEmbersApi('add_registration', { registration: newReg });
      });
    }
  }

  // Kickoff
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
