// EMBERS / EMBEDTHON '26 - Chief Coordinator & Jury Administration Console
// Event rubrics, judge roster, venue/schedule deployment, phase activation and live matrix

(function () {
  'use strict';

  const STORAGE_KEY_AUTH = 'embedthon_judge_auth_v4';
  const EVENT_LIB = window.EMBEDTHON_RUBRICS || {
    EVENTS: {},
    EVENT_ORDER: [],
    getEvent: function () {
      return { id: 'EMBEDDATHON', label: 'Embeddathon', maxTotal: 100, mode: 'DUAL_PHASE', criteria: [] };
    }
  };
  const EVENTS = EVENT_LIB.EVENTS || {};

  let teams = typeof TEAMS_DATA !== 'undefined' ? TEAMS_DATA : [];
  let masterConfig = {
    activePhase: 'PHASE_1',
    adminPin: '5012',
    internalJudges: [
      { id: 'INT-1', name: 'Fizan', role: 'CSE Faculty Mentor', pin: '1111' },
      { id: 'INT-2', name: 'Rafan', role: 'CSE Faculty Mentor', pin: '2222' }
    ],
    externalJudges: [
      { id: 'EXT-1', name: 'Muadh Bin Mohammed Ali', role: 'External Jury (Embeddathon)', pin: '3333' },
      { id: 'EXT-2', name: 'Mohammed Nouman', role: 'External Jury (Embeddathon)', pin: '4444' },
      { id: 'EXP-1', name: 'Suhail Afzal', role: 'Project Expo Evaluator', pin: '5555' },
      { id: 'EXP-2', name: 'Dr. Mohammed Hafeez M.K.', role: 'Project Expo Evaluator', pin: '6666' },
      { id: 'PPR-1', name: 'Dr. Saleem Malik', role: 'Technical Paper Evaluator', pin: '7777' },
      { id: 'PPR-2', name: 'ROULATH SANI MOIDEEN', role: 'Technical Paper Evaluator', pin: '8888' }
    ],
    judgeAssignments: {
      'INT-1': { eventId: 'EMBEDDATHON', venue: 'Computer Labs 1 & 2', slotTitle: 'Track 1: Embeddathon Phase 1' },
      'INT-2': { eventId: 'EMBEDDATHON', venue: 'Computer Labs 1 & 2', slotTitle: 'Track 1: Embeddathon Phase 1' },
      'EXT-1': { eventId: 'EMBEDDATHON', venue: 'Computer Labs 1 & 2', slotTitle: 'Track 1: Embeddathon Phase 2' },
      'EXT-2': { eventId: 'EMBEDDATHON', venue: 'Computer Labs 1 & 2', slotTitle: 'Track 1: Embeddathon Phase 2' },
      'EXP-1': { eventId: 'PROJECT_EXPO', venue: 'Edusat Hall', slotTitle: 'Track 2: Project Expo Stalls 01–36' },
      'EXP-2': { eventId: 'PROJECT_EXPO', venue: 'Edusat Hall', slotTitle: 'Track 2: Project Expo Stalls 01–36' },
      'PPR-1': { eventId: 'PAPER', venue: 'Multipurpose Hall', slotTitle: 'Track 3: Paper Presentation PP-01 to PP-12' },
      'PPR-2': { eventId: 'PAPER', venue: 'Multipurpose Hall', slotTitle: 'Track 3: Paper Presentation PP-01 to PP-12' }
    }
  };

  let masterEvaluations = {};
  let draftConfig = null;
  let pollingInterval = null;
  let activeMatrixFilter = 'ALL';
  let embersSchedule = [];

  // DOM Elements
  const adminAuthGate = document.getElementById('adminAuthGate');
  const gateAdminPin = document.getElementById('gateAdminPin');
  const btnGateUnlock = document.getElementById('btnGateUnlock');
  const gateErrorMessage = document.getElementById('gateErrorMessage');
  const adminMainContainer = document.getElementById('adminMainContainer');
  const btnAdminLogout = document.getElementById('btnAdminLogout');
  const adminNoticeToast = document.getElementById('adminNoticeToast');
  const toastMessage = document.getElementById('toastMessage');

  // Metrics
  const metricP1Scored = document.getElementById('metricP1Scored');
  const barP1Progress = document.getElementById('barP1Progress');
  const metricP2Scored = document.getElementById('metricP2Scored');
  const barP2Progress = document.getElementById('barP2Progress');
  const metricBothComplete = document.getElementById('metricBothComplete');
  const barBothProgress = document.getElementById('barBothProgress');
  const currentActivePhaseBadge = document.getElementById('currentActivePhaseBadge');

  // Phase Cards
  const phaseCards = document.querySelectorAll('.phase-selector-card');

  // Judge Lists
  const adminInternalRosterList = document.getElementById('adminInternalRosterList');
  const btnAdminAddInternal = document.getElementById('btnAdminAddInternal');
  const adminExternalRosterList = document.getElementById('adminExternalRosterList');
  const btnAdminAddExternal = document.getElementById('btnAdminAddExternal');
  const btnSaveAllAdminChanges = document.getElementById('btnSaveAllAdminChanges');

  // Matrix
  const matrixSectionFilter = document.getElementById('matrixSectionFilter');
  const matrixEventFilter = document.getElementById('matrixEventFilter');
  const adminMatrixThead = document.getElementById('adminMatrixThead');
  const adminMatrixTbody = document.getElementById('adminMatrixTbody');

  // Judge deployment / venue / schedule
  const judgeAllocationList = document.getElementById('judgeAllocationList');
  const eventVenueBoard = document.getElementById('eventVenueBoard');
  const logisticsSourceBadge = document.getElementById('logisticsSourceBadge');
  const btnSaveJudgeAllocations = document.getElementById('btnSaveJudgeAllocations');

  // Export
  const btnAdminExportCSV = document.getElementById('btnAdminExportCSV');
  const btnAdminShareWhatsApp = document.getElementById('btnAdminShareWhatsApp');
  const btnAdminResetScores = document.getElementById('btnAdminResetScores');

  // -------------------------------------------------------------
  // Initialization
  // -------------------------------------------------------------
  async function init() {
    await fetchConfig();
    await fetchEvaluations();
    await fetchEmbersLogistics();

    checkAuthentication();
    bindEvents();

    startLivePolling();
  }

  function checkAuthentication() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_AUTH);
      if (saved) {
        const user = JSON.parse(saved);
        if (user && (user.isAdmin || user.id === 'ADMIN')) {
          unlockConsole();
          return;
        }
      }
    } catch (e) {}

    // Lock gate
    adminAuthGate.classList.remove('hidden');
    adminMainContainer.classList.add('hidden');
    if (gateAdminPin) gateAdminPin.focus();
  }

  function unlockConsole() {
    adminAuthGate.classList.add('hidden');
    adminMainContainer.classList.remove('hidden');

    draftConfig = JSON.parse(JSON.stringify(masterConfig));
    if (!draftConfig.judgeAssignments || typeof draftConfig.judgeAssignments !== 'object') {
      draftConfig.judgeAssignments = {};
    }

    renderMetrics();
    renderPhaseCards();
    renderJudgeRosters();
    renderJudgeAllocations();
    renderVenueBoard();
    renderMatrix();
  }

  async function handleGateUnlock() {
    gateErrorMessage.classList.add('hidden');
    const pin = gateAdminPin.value.trim();

    if (!pin) {
      gateErrorMessage.textContent = 'Please enter the master Admin PIN.';
      gateErrorMessage.classList.remove('hidden');
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
        gateErrorMessage.textContent = data.error || 'Incorrect Admin PIN.';
        gateErrorMessage.classList.remove('hidden');
        return;
      }

      localStorage.setItem(STORAGE_KEY_AUTH, JSON.stringify(data.judge));
      sessionStorage.setItem('embedthon_admin_pin', pin);
      unlockConsole();
    } catch (e) {
      // Local offline fallback
      if (pin === (masterConfig.adminPin || '5012')) {
        localStorage.setItem(
          STORAGE_KEY_AUTH,
          JSON.stringify({ id: 'ADMIN', name: 'Chief Coordinator', isAdmin: true })
        );
        unlockConsole();
      } else {
        gateErrorMessage.textContent = 'Network error or incorrect PIN.';
        gateErrorMessage.classList.remove('hidden');
      }
    }
  }

  function handleLogout() {
    if (confirm('Log out from Admin Console?')) {
      localStorage.removeItem(STORAGE_KEY_AUTH);
      sessionStorage.removeItem('embedthon_admin_pin');
      sessionStorage.removeItem('embers_admin_pin');
      window.location.href = 'index.html';
    }
  }

  // -------------------------------------------------------------
  // Data Fetching & Sync
  // -------------------------------------------------------------
  async function fetchConfig() {
    try {
      const res = await fetch('/api/config', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (data && (data.internalJudges || data.externalJudges)) {
          masterConfig = data;
        }
      }
    } catch (e) {
      console.warn('Using local master config fallback', e);
    }
  }

  async function fetchEvaluations() {
    try {
      const res = await fetch('/api/evaluations', { cache: 'no-store' });
      if (res.ok) {
        masterEvaluations = await res.json();
      }
    } catch (e) {
      console.warn('Using local evaluations fallback', e);
    }
  }

  const FALLBACK_SCHEDULE = [
    { id: 'S8', day: 2, date: '2026-11-25', start: '09:30', end: '12:45', title: 'Track 2: Project Exhibition / Expo (Live)', venue: 'Edusat Hall', track: 'TRACK_2' },
    { id: 'S9', day: 2, date: '2026-11-25', start: '09:30', end: '12:45', title: 'Track 3: Technical Paper Competition', venue: 'Multipurpose Hall', track: 'TRACK_3' },
    { id: 'S5', day: 1, date: '2026-11-24', start: '14:00', end: '16:30', title: 'Phase 1: Mentoring & Evaluation Rounds', venue: 'Labs & Stalls', track: 'TRACK_1' },
    { id: 'S11', day: 2, date: '2026-11-25', start: '14:00', end: '15:15', title: 'Jury Consolidation & Result Finalization', venue: 'Coordinator Control Room', track: 'ALL' }
  ];

  async function fetchEmbersLogistics() {
    try {
      const res = await fetch('/api/embers', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        embersSchedule = Array.isArray(data.schedule) ? data.schedule : [];
      }
    } catch (e) {
      console.warn('Using fallback EMBERS schedule', e);
    }

    if (!embersSchedule.length) embersSchedule = FALLBACK_SCHEDULE;

    if (logisticsSourceBadge) {
      logisticsSourceBadge.textContent = `${embersSchedule.length} schedule slots loaded`;
      logisticsSourceBadge.className = 'px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-50 text-emerald-800 border border-emerald-200';
    }
  }

  function getEventMap(eventId) {
    const all = masterEvaluations || {};
    let map = null;

    if (all[eventId] && typeof all[eventId] === 'object') {
      map = all[eventId];
    } else if (all._byEvent && all._byEvent[eventId] && typeof all._byEvent[eventId] === 'object') {
      map = all._byEvent[eventId];
    }

    if (eventId === 'EMBEDDATHON') {
      const legacy = {};
      Object.keys(all).forEach((key) => {
        if (/^\d{1,2}$/.test(key) && all[key] && typeof all[key] === 'object') {
          legacy[key.padStart(2, '0')] = all[key];
        }
      });
      map = { ...legacy, ...(map || {}) };
    }

    return map || {};
  }

  function getTeamEventEvals(teamNumber, eventId) {
    return getEventMap(eventId)[teamNumber] || {};
  }

  function getJudgeAssignments() {
    if (!draftConfig) return masterConfig.judgeAssignments || {};
    if (!draftConfig.judgeAssignments || typeof draftConfig.judgeAssignments !== 'object') {
      draftConfig.judgeAssignments = {};
    }
    return draftConfig.judgeAssignments;
  }

  function getScheduleForEvent(eventId) {
    const event = EVENTS[eventId];
    if (!event) return embersSchedule;
    return embersSchedule.filter((slot) => slot.track === event.track);
  }

  function getVenuesForEvent(eventId) {
    const event = EVENTS[eventId];
    const venues = [];
    if (event && event.venue) venues.push(event.venue);
    getScheduleForEvent(eventId).forEach((slot) => {
      if (slot.venue && !venues.includes(slot.venue)) venues.push(slot.venue);
    });
    return venues;
  }

  function getSlotById(slotId) {
    return embersSchedule.find((slot) => slot.id === slotId) || null;
  }

  function buildSlotLabel(slot) {
    const dayText = slot.day ? `Day ${slot.day}` : '';
    const timeText = slot.start ? `${slot.start}${slot.end ? '–' + slot.end : ''}` : '';
    return [dayText, timeText, slot.title].filter(Boolean).join(' · ');
  }

  function startLivePolling() {
    if (pollingInterval) clearInterval(pollingInterval);
    pollingInterval = setInterval(async () => {
      try {
        const [evalRes, cfgRes] = await Promise.all([
          fetch('/api/evaluations', { cache: 'no-store' }),
          fetch('/api/config', { cache: 'no-store' })
        ]);

        if (evalRes.ok && cfgRes.ok) {
          masterEvaluations = await evalRes.json();
          const newCfg = await cfgRes.json();

          // If active phase changed on server, update draft
          if (newCfg.activePhase && newCfg.activePhase !== masterConfig.activePhase) {
            masterConfig.activePhase = newCfg.activePhase;
            if (draftConfig) draftConfig.activePhase = newCfg.activePhase;
            renderPhaseCards();
          }

          masterConfig = newCfg;
          renderMetrics();
          renderMatrix();
        }
      } catch (e) {}
    }, 3500);
  }

  // -------------------------------------------------------------
  // Metrics Calculation & Rendering
  // -------------------------------------------------------------
  function renderMetrics() {
    const total = teams.length || 24;
    let p1Count = 0;
    let p2Count = 0;
    let bothCount = 0;

    teams.forEach((t) => {
      const teamEvals = getEventMap('EMBEDDATHON')[t.number] || {};
      const hasP1 = Object.values(teamEvals).some((x) => x && x.phase1 > 0);
      const hasP2 = Object.values(teamEvals).some((x) => x && x.phase2 > 0);

      if (hasP1) p1Count++;
      if (hasP2) p2Count++;
      if (hasP1 && hasP2) bothCount++;
    });

    if (metricP1Scored) metricP1Scored.textContent = p1Count;
    if (barP1Progress) barP1Progress.style.width = `${(p1Count / total) * 100}%`;

    if (metricP2Scored) metricP2Scored.textContent = p2Count;
    if (barP2Progress) barP2Progress.style.width = `${(p2Count / total) * 100}%`;

    if (metricBothComplete) metricBothComplete.textContent = bothCount;
    if (barBothProgress) barBothProgress.style.width = `${(bothCount / total) * 100}%`;

    // Active phase badge
    const curPhase = draftConfig ? draftConfig.activePhase : masterConfig.activePhase;
    if (currentActivePhaseBadge) {
      if (curPhase === 'PHASE_1') {
        currentActivePhaseBadge.textContent = 'Embeddathon Phase 1 Active (30%)';
        currentActivePhaseBadge.className = 'px-2.5 py-1 rounded-full text-xs font-black bg-orange-100 text-[#ea580c] border border-orange-200';
      } else if (curPhase === 'PHASE_2') {
        currentActivePhaseBadge.textContent = 'Embeddathon Phase 2 Active (70%)';
        currentActivePhaseBadge.className = 'px-2.5 py-1 rounded-full text-xs font-black bg-indigo-100 text-indigo-700 border border-indigo-200';
      } else {
        currentActivePhaseBadge.textContent = 'Embeddathon Both Phases (100%)';
        currentActivePhaseBadge.className = 'px-2.5 py-1 rounded-full text-xs font-black bg-emerald-100 text-emerald-800 border border-emerald-200';
      }
    }
  }

  // -------------------------------------------------------------
  // Phase Selector Rendering
  // -------------------------------------------------------------
  function renderPhaseCards() {
    if (!draftConfig) return;

    phaseCards.forEach((card) => {
      const p = card.getAttribute('data-phase');
      const isSelected = draftConfig.activePhase === p;

      if (isSelected) {
        if (p === 'PHASE_1') {
          card.className = 'phase-selector-card p-3.5 rounded-xl border-2 text-left transition relative cursor-pointer flex flex-col justify-between bg-[#fff8f3] border-[#ea580c] shadow-md';
        } else if (p === 'PHASE_2') {
          card.className = 'phase-selector-card p-3.5 rounded-xl border-2 text-left transition relative cursor-pointer flex flex-col justify-between bg-indigo-50/70 border-indigo-600 shadow-md';
        } else {
          card.className = 'phase-selector-card p-3.5 rounded-xl border-2 text-left transition relative cursor-pointer flex flex-col justify-between bg-emerald-50/70 border-emerald-600 shadow-md';
        }
      } else {
        card.className = 'phase-selector-card p-3.5 rounded-xl border-2 text-left transition relative cursor-pointer flex flex-col justify-between bg-white border-[#cbd5e1] hover:border-slate-400 opacity-70 hover:opacity-100';
      }
    });

    renderMetrics();
  }

  // -------------------------------------------------------------
  // Judge Roster Rendering & Dynamic Editing
  // -------------------------------------------------------------
  function countJudgeScores(judgeId) {
    let count = 0;
    Object.keys(EVENTS).forEach((eventId) => {
      Object.values(getEventMap(eventId)).forEach((teamScores) => {
        const ev = teamScores && teamScores[judgeId];
        if (!ev) return;
        if (eventId === 'EMBEDDATHON') {
          if (Number(ev.phase1) > 0 || Number(ev.phase2) > 0) count++;
        } else if (Number(ev.total) > 0) {
          count++;
        }
      });
    });
    return count;
  }

  function renderJudgeRosters() {
    if (!draftConfig) return;

    // 1. Internal Judges (Phase 1)
    adminInternalRosterList.innerHTML = '';
    (draftConfig.internalJudges || []).forEach((j, idx) => {
      // Calculate how many scores this judge has submitted across events
      const scoredCount = countJudgeScores(j.id);

      const assigned = (draftConfig.judgeAssignments || {})[j.id];
      const assignedEvent = assigned && EVENTS[assigned.eventId] ? EVENTS[assigned.eventId] : null;
      const assignmentText = assignedEvent
        ? `${assignedEvent.icon} ${assignedEvent.shortLabel}${assigned.venue ? ' · ' + assigned.venue : ''}${assigned.start ? ' · ' + assigned.start + (assigned.end ? '–' + assigned.end : '') : ''}`
        : 'No event / venue assigned';

      const card = document.createElement('div');
      card.className = 'p-3 rounded-xl border border-[#fed7aa] bg-[#fff8f3] space-y-2 text-xs shadow-2xs';

      card.innerHTML = `
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <span class="px-2 py-0.5 rounded bg-[#ea580c] text-white font-mono font-black text-[10px]">${j.id}</span>
            <span class="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.2 rounded-full">${scoredCount} scores submitted</span>
          </div>
          ${draftConfig.internalJudges.length > 1 ? `<button type="button" class="btn-remove-int text-[10px] font-bold text-red-600 hover:underline" data-idx="${idx}">Remove</button>` : ''}
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div>
            <label class="block text-[10px] font-bold text-[#64748b] uppercase mb-0.5">Judge Name</label>
            <input type="text" value="${j.name}" placeholder="e.g. Dr. Basheer" class="input-int-name w-full px-2.5 py-1.5 text-xs font-bold text-[#0f172a] bg-white border border-[#cbd5e1] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#ea580c]" data-idx="${idx}">
          </div>
          <div>
            <label class="block text-[10px] font-bold text-[#64748b] uppercase mb-0.5">Security PIN</label>
            <input type="text" value="${j.pin}" placeholder="e.g. 1111" class="input-int-pin w-full px-2.5 py-1.5 text-xs font-mono font-black text-[#ea580c] bg-white border border-[#cbd5e1] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#ea580c]" data-idx="${idx}">
          </div>
        </div>

        <div>
          <label class="block text-[10px] font-bold text-[#64748b] uppercase mb-0.5">Designation / Role</label>
          <input type="text" value="${j.role || ''}" placeholder="e.g. CSE Faculty Mentor" class="input-int-role w-full px-2.5 py-1 text-[11px] text-[#475569] bg-white border border-[#cbd5e1] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#ea580c]" data-idx="${idx}">
        </div>

        <div class="text-[10px] font-bold ${assignedEvent ? 'text-[#ea580c]' : 'text-[#94a3b8]'} truncate">📍 ${assignmentText}</div>
      `;

      adminInternalRosterList.appendChild(card);
    });

    // 2. External Judges (Phase 2)
    adminExternalRosterList.innerHTML = '';
    (draftConfig.externalJudges || []).forEach((j, idx) => {
      const scoredCount = countJudgeScores(j.id);

      const assigned = (draftConfig.judgeAssignments || {})[j.id];
      const assignedEvent = assigned && EVENTS[assigned.eventId] ? EVENTS[assigned.eventId] : null;
      const assignmentText = assignedEvent
        ? `${assignedEvent.icon} ${assignedEvent.shortLabel}${assigned.venue ? ' · ' + assigned.venue : ''}${assigned.start ? ' · ' + assigned.start + (assigned.end ? '–' + assigned.end : '') : ''}`
        : 'No event / venue assigned';

      const card = document.createElement('div');
      card.className = 'p-3 rounded-xl border border-indigo-200 bg-indigo-50/40 space-y-2 text-xs shadow-2xs';

      card.innerHTML = `
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <span class="px-2 py-0.5 rounded bg-indigo-600 text-white font-mono font-black text-[10px]">${j.id}</span>
            <span class="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.2 rounded-full">${scoredCount} scores submitted</span>
          </div>
          ${draftConfig.externalJudges.length > 1 ? `<button type="button" class="btn-remove-ext text-[10px] font-bold text-red-600 hover:underline" data-idx="${idx}">Remove</button>` : ''}
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div>
            <label class="block text-[10px] font-bold text-[#64748b] uppercase mb-0.5">Judge Name</label>
            <input type="text" value="${j.name}" placeholder="e.g. Er. S. Kumar" class="input-ext-name w-full px-2.5 py-1.5 text-xs font-bold text-[#0f172a] bg-white border border-[#cbd5e1] rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-600" data-idx="${idx}">
          </div>
          <div>
            <label class="block text-[10px] font-bold text-[#64748b] uppercase mb-0.5">Security PIN</label>
            <input type="text" value="${j.pin}" placeholder="e.g. 3333" class="input-ext-pin w-full px-2.5 py-1.5 text-xs font-mono font-black text-indigo-700 bg-white border border-[#cbd5e1] rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-600" data-idx="${idx}">
          </div>
        </div>

        <div>
          <label class="block text-[10px] font-bold text-[#64748b] uppercase mb-0.5">Organization / Jury Role</label>
          <input type="text" value="${j.role || ''}" placeholder="e.g. Industry Expert / IEEE Jury" class="input-ext-role w-full px-2.5 py-1 text-[11px] text-[#475569] bg-white border border-[#cbd5e1] rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-600" data-idx="${idx}">
        </div>

        <div class="text-[10px] font-bold ${assignedEvent ? 'text-indigo-700' : 'text-[#94a3b8]'} truncate">📍 ${assignmentText}</div>
      `;

      adminExternalRosterList.appendChild(card);
    });

    bindJudgeInputs();
  }

  function bindJudgeInputs() {
    // Internal Inputs
    adminInternalRosterList.querySelectorAll('.input-int-name').forEach((el) => {
      el.oninput = (e) => {
        const idx = parseInt(e.target.dataset.idx, 10);
        draftConfig.internalJudges[idx].name = e.target.value;
      };
    });
    adminInternalRosterList.querySelectorAll('.input-int-pin').forEach((el) => {
      el.oninput = (e) => {
        const idx = parseInt(e.target.dataset.idx, 10);
        draftConfig.internalJudges[idx].pin = e.target.value;
      };
    });
    adminInternalRosterList.querySelectorAll('.input-int-role').forEach((el) => {
      el.oninput = (e) => {
        const idx = parseInt(e.target.dataset.idx, 10);
        draftConfig.internalJudges[idx].role = e.target.value;
      };
    });
    adminInternalRosterList.querySelectorAll('.btn-remove-int').forEach((el) => {
      el.onclick = (e) => {
        const idx = parseInt(e.target.dataset.idx, 10);
        const removed = draftConfig.internalJudges[idx];
        if (removed && draftConfig.judgeAssignments) delete draftConfig.judgeAssignments[removed.id];
        draftConfig.internalJudges.splice(idx, 1);
        renderJudgeRosters();
        renderJudgeAllocations();
        renderVenueBoard();
      };
    });

    // External Inputs
    adminExternalRosterList.querySelectorAll('.input-ext-name').forEach((el) => {
      el.oninput = (e) => {
        const idx = parseInt(e.target.dataset.idx, 10);
        draftConfig.externalJudges[idx].name = e.target.value;
      };
    });
    adminExternalRosterList.querySelectorAll('.input-ext-pin').forEach((el) => {
      el.oninput = (e) => {
        const idx = parseInt(e.target.dataset.idx, 10);
        draftConfig.externalJudges[idx].pin = e.target.value;
      };
    });
    adminExternalRosterList.querySelectorAll('.input-ext-role').forEach((el) => {
      el.oninput = (e) => {
        const idx = parseInt(e.target.dataset.idx, 10);
        draftConfig.externalJudges[idx].role = e.target.value;
      };
    });
    adminExternalRosterList.querySelectorAll('.btn-remove-ext').forEach((el) => {
      el.onclick = (e) => {
        const idx = parseInt(e.target.dataset.idx, 10);
        const removed = draftConfig.externalJudges[idx];
        if (removed && draftConfig.judgeAssignments) delete draftConfig.judgeAssignments[removed.id];
        draftConfig.externalJudges.splice(idx, 1);
        renderJudgeRosters();
        renderJudgeAllocations();
        renderVenueBoard();
      };
    });
  }

  // -------------------------------------------------------------
  // Judge Deployment, Venue & Schedule Allocation
  // -------------------------------------------------------------
  function renderJudgeAllocations() {
    if (!judgeAllocationList || !draftConfig) return;

    const assignments = getJudgeAssignments();
    const judges = [
      ...(draftConfig.internalJudges || []).map((j) => ({ ...j, type: 'INTERNAL' })),
      ...(draftConfig.externalJudges || []).map((j) => ({ ...j, type: 'EXTERNAL' }))
    ];

    judgeAllocationList.innerHTML = '';

    if (!judges.length) {
      judgeAllocationList.innerHTML = '<p class="text-xs text-[#64748b]">Add judges in the roster above to allocate venues and slots.</p>';
      return;
    }

    judges.forEach((judge) => {
      const assignment = {
        eventId: '',
        venue: '',
        slotId: '',
        day: '',
        start: '',
        end: '',
        slotTitle: '',
        ...(assignments[judge.id] || {})
      };

      const event = EVENTS[assignment.eventId] || null;
      const venues = getVenuesForEvent(assignment.eventId);
      if (assignment.venue && !venues.includes(assignment.venue)) venues.push(assignment.venue);

      const slots = getScheduleForEvent(assignment.eventId);
      const currentSlot = getSlotById(assignment.slotId);
      if (currentSlot && !slots.some((slot) => slot.id === currentSlot.id)) {
        slots.push(currentSlot);
      }

      const isInternal = judge.type === 'INTERNAL';
      const card = document.createElement('div');
      card.className = `p-3 rounded-xl border space-y-2 text-xs ${
        isInternal ? 'bg-[#fff8f3] border-[#fed7aa]' : 'bg-indigo-50/40 border-indigo-200'
      }`;

      card.innerHTML = `
        <div class="flex items-center justify-between gap-2">
          <div class="flex items-center gap-2 min-w-0">
            <span class="px-2 py-0.5 rounded ${isInternal ? 'bg-[#ea580c]' : 'bg-indigo-600'} text-white font-mono font-black text-[10px]">${judge.id}</span>
            <span class="text-xs font-black text-[#0f172a] truncate">${judge.name}</span>
          </div>
          <span class="text-[9px] font-black uppercase px-1.5 py-0.5 rounded ${isInternal ? 'bg-orange-100 text-[#ea580c]' : 'bg-indigo-100 text-indigo-700'}">${judge.type}</span>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <div>
            <label class="block text-[9px] font-bold text-[#64748b] uppercase mb-0.5">Event / Track</label>
            <select class="alloc-event w-full px-2 py-1.5 text-[11px] font-bold bg-white border border-[#cbd5e1] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#ea580c]" data-judge="${judge.id}">
              <option value="">— Unassigned —</option>
              ${((EVENT_LIB.EVENT_ORDER && EVENT_LIB.EVENT_ORDER.length) ? EVENT_LIB.EVENT_ORDER : Object.keys(EVENTS)).map((eventId) => {
                const ev = EVENTS[eventId];
                return ev ? `<option value="${eventId}" ${assignment.eventId === eventId ? 'selected' : ''}>${ev.icon} ${ev.label}</option>` : '';
              }).join('')}
            </select>
          </div>

          <div>
            <label class="block text-[9px] font-bold text-[#64748b] uppercase mb-0.5">Venue</label>
            <select class="alloc-venue w-full px-2 py-1.5 text-[11px] font-bold bg-white border border-[#cbd5e1] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#ea580c]" data-judge="${judge.id}">
              <option value="">— No venue —</option>
              ${venues.map((venue) => `<option value="${venue}" ${assignment.venue === venue ? 'selected' : ''}>${venue}</option>`).join('')}
            </select>
          </div>

          <div>
            <label class="block text-[9px] font-bold text-[#64748b] uppercase mb-0.5">Schedule Slot</label>
            <select class="alloc-slot w-full px-2 py-1.5 text-[11px] font-bold bg-white border border-[#cbd5e1] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#ea580c]" data-judge="${judge.id}">
              <option value="">— No specific slot —</option>
              ${slots.map((slot) => `<option value="${slot.id}" ${assignment.slotId === slot.id ? 'selected' : ''}>${buildSlotLabel(slot)}</option>`).join('')}
            </select>
          </div>
        </div>

        <div class="flex items-center justify-between gap-2 pt-1 border-t ${isInternal ? 'border-[#fed7aa]' : 'border-indigo-200'}">
          <span class="text-[10px] font-bold ${event ? 'text-[#0f172a]' : 'text-[#94a3b8]'} truncate">
            ${event ? (assignment.slotId ? '📍 ' + (assignment.venue || event.venue) + ' · ' + (assignment.start || '') + (assignment.end ? '–' + assignment.end : '') : '📍 ' + (assignment.venue || event.venue) + ' · No slot') : 'Not deployed to an event'}
          </span>
          <button type="button" class="alloc-clear px-2 py-0.5 rounded text-[9px] font-black text-rose-600 hover:bg-rose-50 transition" data-judge="${judge.id}">Clear</button>
        </div>
      `;

      judgeAllocationList.appendChild(card);
    });

    judgeAllocationList.onchange = function (event_) {
      const target = event_.target;
      const judgeId = target.dataset.judge;
      if (!judgeId) return;

      const liveAssignments = getJudgeAssignments();
      const assignment = { ...(liveAssignments[judgeId] || {}) };

      if (target.classList.contains('alloc-event')) {
        assignment.eventId = target.value;
        assignment.slotId = '';
        assignment.day = '';
        assignment.start = '';
        assignment.end = '';
        assignment.slotTitle = '';
        assignment.venue = EVENTS[target.value] ? EVENTS[target.value].venue : '';
      } else if (target.classList.contains('alloc-venue')) {
        assignment.venue = target.value;
      } else if (target.classList.contains('alloc-slot')) {
        const slot = getSlotById(target.value);
        assignment.slotId = slot ? slot.id : '';
        assignment.day = slot ? String(slot.day || '') : '';
        assignment.start = slot ? slot.start || '' : '';
        assignment.end = slot ? slot.end || '' : '';
        assignment.slotTitle = slot ? slot.title || '' : '';
        if (slot && slot.venue) assignment.venue = slot.venue;
      }

      if (assignment.eventId) {
        liveAssignments[judgeId] = assignment;
      } else {
        delete liveAssignments[judgeId];
      }

      renderJudgeAllocations();
      renderVenueBoard();
      renderJudgeRosters();
    };

    judgeAllocationList.onclick = function (event_) {
      const target = event_.target.closest('.alloc-clear');
      if (!target) return;
      const judgeId = target.dataset.judge;
      const liveAssignments = getJudgeAssignments();
      delete liveAssignments[judgeId];
      renderJudgeAllocations();
      renderVenueBoard();
      renderJudgeRosters();
    };
  }

  function renderVenueBoard() {
    if (!eventVenueBoard || !draftConfig) return;

    const assignments = getJudgeAssignments();
    const judges = [
      ...(draftConfig.internalJudges || []),
      ...(draftConfig.externalJudges || [])
    ];
    const eventIds = (EVENT_LIB.EVENT_ORDER && EVENT_LIB.EVENT_ORDER.length) ? EVENT_LIB.EVENT_ORDER : Object.keys(EVENTS);

    eventVenueBoard.innerHTML = eventIds.map((eventId) => {
      const event = EVENTS[eventId];
      if (!event) return '';

      const deployed = judges.filter((judge) => assignments[judge.id] && assignments[judge.id].eventId === eventId);
      const venueSet = [];
      deployed.forEach((judge) => {
        const venue = assignments[judge.id].venue || event.venue;
        if (venue && !venueSet.includes(venue)) venueSet.push(venue);
      });
      const venueLabel = venueSet.length ? venueSet.join(' / ') : event.venue;

      const judgeLines = deployed.length
        ? deployed.map((judge) => {
            const a = assignments[judge.id];
            const time = a.start ? `${a.start}${a.end ? '–' + a.end : ''}` : '';
            return `<div class="flex justify-between gap-1 text-[10px]"><span class="font-bold truncate">${judge.id} · ${judge.name}</span><span class="font-mono text-[#64748b] whitespace-nowrap">${time || 'No slot'}</span></div>`;
          }).join('')
        : '<div class="text-[10px] text-[#94a3b8]">No judges deployed yet.</div>';

      return `
        <div class="p-3 rounded-xl border border-[#e3dccd] bg-[#fdfbf7] space-y-1.5">
          <div class="flex items-center justify-between gap-1">
            <span class="text-[11px] font-black text-[#0f172a]">${event.icon} ${event.shortLabel}</span>
            <span class="text-[9px] font-bold px-1.5 py-0.5 rounded bg-white border border-[#e3dccd] text-[#475569]">${deployed.length} judge${deployed.length === 1 ? '' : 's'}</span>
          </div>
          <div class="text-[10px] font-bold text-[#ea580c] flex items-center gap-1"><span>📍</span><span class="truncate">${venueLabel}</span></div>
          <div class="space-y-0.5 border-t border-[#f0ebe0] pt-1">${judgeLines}</div>
        </div>
      `;
    }).join('');
  }

  async function saveAllAdminChanges(silent) {
    const pin = silent
      ? sessionStorage.getItem('embedthon_admin_pin') || prompt('Enter Admin PIN to apply changes to all devices:')
      : prompt('Enter Admin PIN to apply changes to all devices:');
    if (!pin) return;

    sessionStorage.setItem('embedthon_admin_pin', pin);
    btnSaveAllAdminChanges.disabled = true;
    btnSaveAllAdminChanges.textContent = 'Saving & Syncing...';

    try {
      const res = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminPin: pin,
          activePhase: draftConfig.activePhase,
          internalJudges: draftConfig.internalJudges,
          externalJudges: draftConfig.externalJudges,
          judgeAssignments: draftConfig.judgeAssignments || {}
        })
      });

      const data = await res.json();
      btnSaveAllAdminChanges.disabled = false;
      btnSaveAllAdminChanges.textContent = '💾 Save & Sync All Devices';

      if (!res.ok || !data.success) {
        alert(data.error || 'Failed to update configuration. Incorrect Admin PIN.');
        return;
      }

      masterConfig.activePhase = data.activePhase;
      masterConfig.internalJudges = data.internalJudges;
      masterConfig.externalJudges = data.externalJudges;
      masterConfig.judgeAssignments = data.judgeAssignments || draftConfig.judgeAssignments || {};

      showToast('✓ Jury roster, phase, venue and schedule allocations synced across all phones!');
      renderMetrics();
      renderPhaseCards();
      renderJudgeRosters();
      renderJudgeAllocations();
      renderVenueBoard();
    } catch (e) {
      btnSaveAllAdminChanges.disabled = false;
      btnSaveAllAdminChanges.textContent = '💾 Save & Sync All Devices';
      alert('Error updating configuration on server.');
    }
  }

  function showToast(msg) {
    if (toastMessage) toastMessage.textContent = msg;
    if (adminNoticeToast) {
      adminNoticeToast.classList.remove('hidden');
      setTimeout(() => {
        adminNoticeToast.classList.add('hidden');
      }, 4000);
    }
  }

  // -------------------------------------------------------------
  // Master Matrix Table
  // -------------------------------------------------------------
  function renderMatrix() {
    if (!adminMatrixTbody) return;
    adminMatrixTbody.innerHTML = '';

    const eventId = matrixEventFilter && EVENTS[matrixEventFilter.value] ? matrixEventFilter.value : 'EMBEDDATHON';
    const event = EVENT_LIB.getEvent(eventId);
    const filterSec = activeMatrixFilter;
    const eventTeams = typeof getEventTeams === 'function' ? getEventTeams(eventId) : teams;
    const filteredTeams = eventTeams.filter((t) => filterSec === 'ALL' || t.section === filterSec || event.mode === 'SINGLE');
    const eventMap = getEventMap(eventId);

    if (adminMatrixThead) {
      if (event.mode === 'SINGLE') {
        adminMatrixThead.innerHTML = `
          <tr class="bg-[#f6f1e6] border-b border-[#e3dccd] text-[#64748b] font-bold uppercase text-[10px]">
            <th class="py-2.5 px-2.5 w-12 font-serif-pace text-[#ea580c]">Team</th>
            <th class="py-2.5 px-3">Team Name</th>
            <th class="py-2.5 px-1.5 text-center">Sec</th>
            <th class="py-2.5 px-2 text-center">Judges</th>
            <th class="py-2.5 px-2.5 text-right font-black text-[#ea580c]">Avg (${event.maxTotal})</th>
            <th class="py-2.5 px-2 text-center">Status</th>
          </tr>
        `;
      } else {
        adminMatrixThead.innerHTML = `
          <tr class="bg-[#f6f1e6] border-b border-[#e3dccd] text-[#64748b] font-bold uppercase text-[10px]">
            <th class="py-2.5 px-2.5 w-12 font-serif-pace text-[#ea580c]">Team</th>
            <th class="py-2.5 px-3">Team Name</th>
            <th class="py-2.5 px-1.5 text-center">Sec</th>
            <th class="py-2.5 px-2 text-center">Phase 1 (/30)</th>
            <th class="py-2.5 px-2 text-center">Phase 2 (/70)</th>
            <th class="py-2.5 px-2.5 text-right font-black text-[#ea580c]">Total (/100)</th>
            <th class="py-2.5 px-2 text-center">Status</th>
          </tr>
        `;
      }
    }

    filteredTeams.forEach((t, idx) => {
      const teamEvals = eventMap[t.number] || {};
      const tr = document.createElement('tr');
      tr.className = idx % 2 === 0 ? 'bg-white' : 'bg-[#fdfbf7]';

      if (event.mode === 'SINGLE') {
        const totals = Object.values(teamEvals)
          .filter((x) => x && Number(x.total) > 0)
          .map((x) => Number(x.total));
        const avg = totals.length
          ? (totals.reduce((a, b) => a + b, 0) / totals.length).toFixed(1)
          : 0;

        const statusBadge = totals.length
          ? `<span class="px-2 py-0.5 rounded-full text-[9px] font-black bg-emerald-100 text-emerald-800">${totals.length} judge${totals.length === 1 ? '' : 's'} ✓</span>`
          : '<span class="px-2 py-0.5 rounded-full text-[9px] font-bold bg-slate-100 text-slate-500">Pending</span>';

        tr.innerHTML = `
          <td class="py-2.5 px-2.5 font-black font-serif-pace text-[#ea580c]">#${t.number}</td>
          <td class="py-2.5 px-3 font-bold text-[#0f172a] truncate max-w-[150px]">
            <div>${t.name}</div>
            <span class="text-[9px] text-[#64748b] font-normal truncate block">${t.members[0]?.name || ''} · ${t.member_count} members</span>
          </td>
          <td class="py-2.5 px-1.5 text-center font-bold text-[#64748b] text-[10px]">${t.section}</td>
          <td class="py-2.5 px-2 text-center font-bold text-slate-700">${totals.length}</td>
          <td class="py-2.5 px-2.5 text-right font-black text-sm text-[#ea580c]">${avg > 0 ? `${avg} / ${event.maxTotal}` : '—'}</td>
          <td class="py-2.5 px-2 text-center">${statusBadge}</td>
        `;
      } else {
        const p1Scores = Object.values(teamEvals).filter((x) => x && x.phase1 > 0).map((x) => x.phase1);
        const p2Scores = Object.values(teamEvals).filter((x) => x && x.phase2 > 0).map((x) => x.phase2);

        const p1Avg = p1Scores.length ? (p1Scores.reduce((a, b) => a + b, 0) / p1Scores.length).toFixed(1) : 0;
        const p2Avg = p2Scores.length ? (p2Scores.reduce((a, b) => a + b, 0) / p2Scores.length).toFixed(1) : 0;
        const totalScore = (parseFloat(p1Avg) + parseFloat(p2Avg)).toFixed(1);

        let statusBadge = '';
        if (p1Scores.length > 0 && p2Scores.length > 0) {
          statusBadge = '<span class="px-2 py-0.5 rounded-full text-[9px] font-black bg-emerald-100 text-emerald-800">Complete ✓</span>';
        } else if (p1Scores.length > 0) {
          statusBadge = '<span class="px-2 py-0.5 rounded-full text-[9px] font-bold bg-orange-100 text-[#ea580c]">P1 Done</span>';
        } else if (p2Scores.length > 0) {
          statusBadge = '<span class="px-2 py-0.5 rounded-full text-[9px] font-bold bg-indigo-100 text-indigo-700">P2 Done</span>';
        } else {
          statusBadge = '<span class="px-2 py-0.5 rounded-full text-[9px] font-bold bg-slate-100 text-slate-500">Pending</span>';
        }

        tr.innerHTML = `
          <td class="py-2.5 px-2.5 font-black font-serif-pace text-[#ea580c]">#${t.number}</td>
          <td class="py-2.5 px-3 font-bold text-[#0f172a] truncate max-w-[150px]">
            <div>${t.name}</div>
            <span class="text-[9px] text-[#64748b] font-normal truncate block">${t.members[0]?.name || ''} · ${t.member_count} members</span>
          </td>
          <td class="py-2.5 px-1.5 text-center font-bold text-[#64748b] text-[10px]">${t.section}</td>
          <td class="py-2.5 px-2 text-center font-bold text-slate-700">${p1Avg > 0 ? `${p1Avg} / 30` : '—'}</td>
          <td class="py-2.5 px-2 text-center font-bold text-slate-700">${p2Avg > 0 ? `${p2Avg} / 70` : '—'}</td>
          <td class="py-2.5 px-2.5 text-right font-black text-sm text-[#ea580c]">${totalScore > 0 ? totalScore : '—'}</td>
          <td class="py-2.5 px-2 text-center">${statusBadge}</td>
        `;
      }

      adminMatrixTbody.appendChild(tr);
    });
  }

  // -------------------------------------------------------------
  // Exports & Reset
  // -------------------------------------------------------------
  function getSelectedMatrixEventId() {
    return matrixEventFilter && EVENTS[matrixEventFilter.value] ? matrixEventFilter.value : 'EMBEDDATHON';
  }

  function getAdminEventStandings(eventId) {
    const event = EVENT_LIB.getEvent(eventId);
    const eventMap = getEventMap(eventId);
    const eventTeams = typeof getEventTeams === 'function' ? getEventTeams(eventId) : teams;

    return eventTeams
      .map((team) => {
        const values = Object.values(eventMap[team.number] || {}).filter(Boolean);

        if (event.mode === 'SINGLE') {
          const totals = values.map((x) => Number(x.total)).filter((v) => v > 0);
          const avg = totals.length
            ? Number((totals.reduce((a, b) => a + b, 0) / totals.length).toFixed(1))
            : 0;
          return { team, grandTotal: avg, numJudges: totals.length, evals: values };
        }

        const p1Scores = values.map((x) => Number(x.phase1)).filter((v) => v > 0);
        const p2Scores = values.map((x) => Number(x.phase2)).filter((v) => v > 0);
        const p1Avg = p1Scores.length ? Number((p1Scores.reduce((a, b) => a + b, 0) / p1Scores.length).toFixed(1)) : 0;
        const p2Avg = p2Scores.length ? Number((p2Scores.reduce((a, b) => a + b, 0) / p2Scores.length).toFixed(1)) : 0;

        return {
          team,
          p1Avg,
          p2Avg,
          grandTotal: Number((p1Avg + p2Avg).toFixed(1)),
          numJudges: values.length,
          evals: values
        };
      })
      .sort((a, b) => b.grandTotal - a.grandTotal);
  }

  function exportCSV() {
    const eventId = getSelectedMatrixEventId();
    const event = EVENT_LIB.getEvent(eventId);
    const ranked = getAdminEventStandings(eventId);

    let csv = '';

    if (event.mode === 'SINGLE') {
      const criterionHeaders = event.criteria.map((c) => `"${c.label} (Max ${c.max})"`).join(',');
      csv = `Rank,Team Number,Team Name,Section,Event,Judges,${criterionHeaders},Average (${event.maxTotal})\n`;

      ranked.forEach((item, idx) => {
        const criterionAverages = event.criteria.map((criterion) => {
          const values = item.evals
            .filter((ev) => ev && ev.scores && Number(ev.scores[criterion.key]) > 0)
            .map((ev) => Number(ev.scores[criterion.key]));
          return values.length ? (values.reduce((a, b) => a + b, 0) / values.length).toFixed(1) : '0';
        });
        csv += `${idx + 1},#${item.team.number},"${item.team.name.replace(/"/g, '""')}",${item.team.section},"${event.label}",${item.numJudges},${criterionAverages.join(',')},${item.grandTotal}\n`;
      });
    } else {
      csv = 'Rank,Team Number,Team Name,Section,Event,Phase 1 (Mentoring 30%),Phase 2 (Final Expo 70%),Grand Total (100%)\n';
      ranked.forEach((item, idx) => {
        csv += `${idx + 1},#${item.team.number},"${item.team.name.replace(/"/g, '""')}",${item.team.section},"${event.label}",${item.p1Avg},${item.p2Avg},${item.grandTotal}\n`;
      });
    }

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `EMBEDTHON_26_${eventId}_Scores_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  function shareWhatsApp() {
    const eventId = getSelectedMatrixEventId();
    const event = EVENT_LIB.getEvent(eventId);
    let msg = `*EMBEDTHON '26 · ${event.icon} ${event.label.toUpperCase()} STANDINGS*\nP.A. College of Engineering · Dept. of CSE\nTotal: ${event.maxTotal} marks\n\n`;

    const top5 = getAdminEventStandings(eventId).slice(0, 5);

    top5.forEach((item, idx) => {
      const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `${idx + 1}.`;
      if (event.mode === 'SINGLE') {
        msg += `${medal} Team #${item.team.number}: ${item.team.name} -> Avg: *${item.grandTotal}/${event.maxTotal}* (${item.numJudges} judges)\n`;
      } else {
        msg += `${medal} Team #${item.team.number}: ${item.team.name} -> Total: *${item.grandTotal}/100* (P1: ${item.p1Avg}, P2: ${item.p2Avg})\n`;
      }
    });

    msg += `\nPortal: https://embedthon-judge-portal.vercel.app/`;
    const shareUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`;
    window.open(shareUrl, '_blank');
  }

  async function resetAllEvaluations() {
    const pin = prompt('Enter Admin PIN to erase all team evaluations:');
    if (!pin) return;

    try {
      const res = await fetch('/api/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminPin: pin })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        alert(data.error || 'Failed to reset scores.');
        return;
      }

      masterEvaluations = {};
      alert('✓ All team evaluations have been reset.');
      renderMetrics();
      renderMatrix();
    } catch (e) {
      alert('Error connecting to reset endpoint.');
    }
  }

  // -------------------------------------------------------------
  // Event Bindings
  // -------------------------------------------------------------
  function bindEvents() {
    // Gate Auth
    if (btnGateUnlock) btnGateUnlock.addEventListener('click', handleGateUnlock);
    if (gateAdminPin) {
      gateAdminPin.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') handleGateUnlock();
      });
    }

    if (btnAdminLogout) btnAdminLogout.addEventListener('click', handleLogout);

    // Phase Selection
    phaseCards.forEach((card) => {
      card.addEventListener('click', () => {
        draftConfig.activePhase = card.getAttribute('data-phase');
        renderPhaseCards();
      });
    });

    // Add Judges
    if (btnAdminAddInternal) {
      btnAdminAddInternal.addEventListener('click', () => {
        const nextNum = (draftConfig.internalJudges || []).length + 1;
        draftConfig.internalJudges.push({
          id: `INT-${nextNum}`,
          name: `Internal Judge ${nextNum}`,
          role: 'CSE Faculty Mentor',
          pin: `${nextNum}${nextNum}${nextNum}${nextNum}`
        });
        renderJudgeRosters();
        renderJudgeAllocations();
      });
    }

    if (btnAdminAddExternal) {
      btnAdminAddExternal.addEventListener('click', () => {
        const nextNum = (draftConfig.externalJudges || []).length + 1;
        draftConfig.externalJudges.push({
          id: `EXT-${nextNum}`,
          name: `External Judge ${nextNum}`,
          role: 'Industry / IEEE Jury',
          pin: `${nextNum + 2}${nextNum + 2}${nextNum + 2}${nextNum + 2}`
        });
        renderJudgeRosters();
        renderJudgeAllocations();
      });
    }

    if (btnSaveAllAdminChanges) {
      btnSaveAllAdminChanges.addEventListener('click', () => saveAllAdminChanges(false));
    }

    if (btnSaveJudgeAllocations) {
      btnSaveJudgeAllocations.addEventListener('click', () => saveAllAdminChanges(true));
    }

    // Matrix Filter
    if (matrixSectionFilter) {
      matrixSectionFilter.addEventListener('change', (e) => {
        activeMatrixFilter = e.target.value;
        renderMatrix();
      });
    }

    if (matrixEventFilter) {
      matrixEventFilter.addEventListener('change', renderMatrix);
    }

    // Export & Reset
    if (btnAdminExportCSV) btnAdminExportCSV.addEventListener('click', exportCSV);
    if (btnAdminShareWhatsApp) btnAdminShareWhatsApp.addEventListener('click', shareWhatsApp);
    if (btnAdminResetScores) btnAdminResetScores.addEventListener('click', resetAllEvaluations);
  }

  document.addEventListener('DOMContentLoaded', init);
})();
