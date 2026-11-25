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
    adminPin: '',
    internalJudges: [
      { id: 'INT-1', name: 'Fizan', role: 'CSE Faculty Mentor', pin: '3842' },
      { id: 'INT-2', name: 'Rafan', role: 'CSE Faculty Mentor', pin: '7195' }
    ],
    externalJudges: [
      { id: 'EXT-1', name: 'Muadh Bin Mohammed Ali', role: 'External Jury (Embeddathon)', pin: '6428' },
      { id: 'EXT-2', name: 'Mohammed Nouman', role: 'External Jury (Embeddathon)', pin: '9153' },
      { id: 'EXP-1', name: 'Suhail Afzal', role: 'Project Expo Evaluator', pin: '4817' },
      { id: 'EXP-2', name: 'Dr. Mohammed Hafeez M.K.', role: 'Project Expo Evaluator', pin: '2639' },
      { id: 'PPR-1', name: 'Dr. Saleem Malik', role: 'Technical Paper Evaluator', pin: '8531' },
      { id: 'PPR-2', name: 'ROULATH SANI MOIDEEN', role: 'Technical Paper Evaluator', pin: '1794' }
    ],
    judgeAssignments: {
      'INT-1': { events: ['EMBEDDATHON'], eventId: 'EMBEDDATHON', venue: 'Computer Labs 1 & 2', slotTitle: 'Track 1: Embeddathon Phase 1' },
      'INT-2': { events: ['EMBEDDATHON'], eventId: 'EMBEDDATHON', venue: 'Computer Labs 1 & 2', slotTitle: 'Track 1: Embeddathon Phase 1' },
      'EXT-1': { events: ['EMBEDDATHON'], eventId: 'EMBEDDATHON', venue: 'Computer Labs 1 & 2', slotTitle: 'Track 1: Embeddathon Phase 2' },
      'EXT-2': { events: ['EMBEDDATHON'], eventId: 'EMBEDDATHON', venue: 'Computer Labs 1 & 2', slotTitle: 'Track 1: Embeddathon Phase 2' },
      'EXP-1': { events: ['PROJECT_EXPO'], eventId: 'PROJECT_EXPO', venue: 'Edusat Hall', slotTitle: 'Track 2: Project Expo Stalls 01–36' },
      'EXP-2': { events: ['PROJECT_EXPO'], eventId: 'PROJECT_EXPO', venue: 'Edusat Hall', slotTitle: 'Track 2: Project Expo Stalls 01–36' },
      'PPR-1': { events: ['PAPER'], eventId: 'PAPER', venue: 'Multipurpose Hall', slotTitle: 'Track 3: Paper Presentation PP-01 to PP-12' },
      'PPR-2': { events: ['PAPER'], eventId: 'PAPER', venue: 'Multipurpose Hall', slotTitle: 'Track 3: Paper Presentation PP-01 to PP-12' }
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
  // Initialization & Zero-Trust Session Gate
  // -------------------------------------------------------------
  let hiddenAt = 0;
  let idleTimer = null;
  const BACKGROUND_LOCK_MS = 10 * 1000; // Re-lock if user leaves Chrome > 10s
  const IDLE_LOCK_MS = 10 * 60 * 1000;  // Re-lock after 10 min idle

  function resetIdleTimer() {
    if (idleTimer) clearTimeout(idleTimer);
    if (adminMainContainer && !adminMainContainer.classList.contains('hidden')) {
      idleTimer = setTimeout(() => { void lockConsole(true, 'Session timed out due to inactivity.'); }, IDLE_LOCK_MS);
    }
  }

  async function init() {
    bindEvents();
    setupMobileSecurityGuards();
    await checkAuthentication();
  }

  function setupMobileSecurityGuards() {
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        hiddenAt = Date.now();
      } else if (document.visibilityState === 'visible') {
        if (hiddenAt && (Date.now() - hiddenAt) >= BACKGROUND_LOCK_MS) {
          void lockConsole(true, 'Locked on return from background. Enter Admin PIN.');
        }
        hiddenAt = 0;
      }
    });

    window.addEventListener('pageshow', (e) => {
      if (e.persisted) {
        void lockConsole(false);
        void checkAuthentication();
      }
    });

    ['pointerdown', 'keydown', 'touchstart'].forEach((evt) => {
      window.addEventListener(evt, resetIdleTimer, { passive: true });
    });
  }

  async function lockConsole(clearServer = false, message = '') {
    if (pollingInterval) {
      clearInterval(pollingInterval);
      pollingInterval = null;
    }
    if (idleTimer) {
      clearTimeout(idleTimer);
      idleTimer = null;
    }
    localStorage.removeItem(STORAGE_KEY_AUTH);
    sessionStorage.removeItem('embedthon_admin_pin');
    sessionStorage.removeItem('embedthon_session_token');
    if (clearServer) {
      try { await fetch('/api/session', { method: 'DELETE', credentials: 'same-origin' }); } catch (e) {}
    }
    if (adminMainContainer) adminMainContainer.classList.add('hidden');
    if (adminAuthGate) adminAuthGate.classList.remove('hidden');
    if (gateAdminPin) {
      gateAdminPin.value = '';
      gateAdminPin.focus();
    }
    if (message && gateErrorMessage) {
      gateErrorMessage.textContent = message;
      gateErrorMessage.classList.remove('hidden');
    }
  }

  async function checkAuthentication() {
    // Never trust localStorage; always verify server-signed HttpOnly session cookie.
    localStorage.removeItem(STORAGE_KEY_AUTH);
    try {
      const res = await fetch('/api/session', { credentials: 'same-origin', cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (data && data.authenticated && data.session && data.session.isAdmin) {
          await unlockConsole();
          return;
        }
      }
    } catch (e) {}

    await lockConsole(false);
  }

  async function unlockConsole() {
    adminAuthGate.classList.add('hidden');
    adminMainContainer.classList.remove('hidden');
    resetIdleTimer();

    await Promise.all([
      fetchConfig(),
      fetchEvaluations(),
      fetchEmbersLogistics()
    ]);

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
    startLivePolling();
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
        credentials: 'same-origin',
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

      if (data.token) sessionStorage.setItem('embedthon_session_token', data.token);
      sessionStorage.setItem('embedthon_admin_pin', pin);
      await unlockConsole();
    } catch (e) {
      gateErrorMessage.textContent = 'Network error. Server authentication required.';
      gateErrorMessage.classList.remove('hidden');
    }
  }

  async function handleLogout() {
    if (confirm('Log out from Admin Console?')) {
      await lockConsole(true);
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

  function getAssignmentEvents(assignment) {
    if (!assignment) return [];
    if (Array.isArray(assignment.events) && assignment.events.length) {
      return assignment.events.map(e => String(e || '').trim().toUpperCase()).filter(Boolean);
    }
    if (Array.isArray(assignment.eventIds) && assignment.eventIds.length) {
      return assignment.eventIds.map(e => String(e || '').trim().toUpperCase()).filter(Boolean);
    }
    if (assignment.eventId) {
      const eid = String(assignment.eventId).trim().toUpperCase();
      if (eid === 'ALL') return ['EMBEDDATHON', 'PROJECT_EXPO', 'PAPER'];
      return [eid];
    }
    return [];
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
      const scoredCount = countJudgeScores(j.id);
      const assigned = (draftConfig.judgeAssignments || {})[j.id];
      const evs = getAssignmentEvents(assigned);
      const assignmentText = evs.length
        ? `${evs.map(eid => EVENTS[eid] ? `${EVENTS[eid].icon} ${EVENTS[eid].shortLabel}` : eid).join(' + ')}${assigned.venue ? ' · ' + assigned.venue : ''}${assigned.start ? ' · ' + assigned.start + (assigned.end ? '–' + assigned.end : '') : ''}`
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

        <div class="pt-1.5 border-t border-[#fed7aa]/60">
          <div class="flex items-center justify-between gap-1 flex-wrap mb-1">
            <span class="text-[9px] font-bold text-[#64748b] uppercase">Deploy To Track(s):</span>
            <div class="flex items-center gap-1 flex-wrap">
              ${['EMBEDDATHON', 'PROJECT_EXPO', 'PAPER'].map((trackId) => {
                const ev = EVENTS[trackId] || { icon: '🎯', shortLabel: trackId };
                const isAssigned = evs.includes(trackId);
                return `
                  <button type="button" class="btn-roster-toggle-track px-2 py-0.5 rounded text-[10px] font-black transition active:scale-95 ${
                    isAssigned
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-white border border-[#cbd5e1] text-slate-600 hover:border-slate-400'
                  }" data-judge="${j.id}" data-event="${trackId}">
                    ${ev.icon} ${ev.shortLabel} ${isAssigned ? '✓' : '+'}
                  </button>
                `;
              }).join('')}
              <button type="button" class="btn-roster-toggle-all px-1.5 py-0.5 rounded text-[9px] font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition" data-judge="${j.id}">
                ${evs.length === 3 ? 'Clear' : 'All 3'}
              </button>
            </div>
          </div>
          <div class="text-[10px] font-bold ${evs.length ? 'text-[#ea580c]' : 'text-[#94a3b8]'} truncate">📍 ${assignmentText}</div>
        </div>
      `;

      adminInternalRosterList.appendChild(card);
    });

    // 2. External Judges (Phase 2)
    adminExternalRosterList.innerHTML = '';
    (draftConfig.externalJudges || []).forEach((j, idx) => {
      const scoredCount = countJudgeScores(j.id);
      const assigned = (draftConfig.judgeAssignments || {})[j.id];
      const evs = getAssignmentEvents(assigned);
      const assignmentText = evs.length
        ? `${evs.map(eid => EVENTS[eid] ? `${EVENTS[eid].icon} ${EVENTS[eid].shortLabel}` : eid).join(' + ')}${assigned.venue ? ' · ' + assigned.venue : ''}${assigned.start ? ' · ' + assigned.start + (assigned.end ? '–' + assigned.end : '') : ''}`
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

        <div class="pt-1.5 border-t border-indigo-200">
          <div class="flex items-center justify-between gap-1 flex-wrap mb-1">
            <span class="text-[9px] font-bold text-[#64748b] uppercase">Deploy To Track(s):</span>
            <div class="flex items-center gap-1 flex-wrap">
              ${['EMBEDDATHON', 'PROJECT_EXPO', 'PAPER'].map((trackId) => {
                const ev = EVENTS[trackId] || { icon: '🎯', shortLabel: trackId };
                const isAssigned = evs.includes(trackId);
                return `
                  <button type="button" class="btn-roster-toggle-track px-2 py-0.5 rounded text-[10px] font-black transition active:scale-95 ${
                    isAssigned
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-white border border-[#cbd5e1] text-slate-600 hover:border-slate-400'
                  }" data-judge="${j.id}" data-event="${trackId}">
                    ${ev.icon} ${ev.shortLabel} ${isAssigned ? '✓' : '+'}
                  </button>
                `;
              }).join('')}
              <button type="button" class="btn-roster-toggle-all px-1.5 py-0.5 rounded text-[9px] font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition" data-judge="${j.id}">
                ${evs.length === 3 ? 'Clear' : 'All 3'}
              </button>
            </div>
          </div>
          <div class="text-[10px] font-bold ${evs.length ? 'text-indigo-700' : 'text-[#94a3b8]'} truncate">📍 ${assignmentText}</div>
        </div>
      `;

      adminExternalRosterList.appendChild(card);
    });

    bindJudgeInputs();
  }

  function toggleJudgeTrack(judgeId, trackId) {
    const liveAssignments = getJudgeAssignments();
    const assignment = { ...(liveAssignments[judgeId] || {}) };
    let evs = getAssignmentEvents(assignment);
    if (evs.includes(trackId)) {
      evs = evs.filter((e) => e !== trackId);
    } else {
      evs.push(trackId);
    }
    if (evs.length > 0) {
      assignment.events = evs;
      assignment.eventId = evs[0];
      if (!assignment.venue) {
        assignment.venue = evs.map((e) => EVENTS[e] ? EVENTS[e].venue : '').filter(Boolean).join(' & ');
      }
      liveAssignments[judgeId] = assignment;
    } else {
      delete liveAssignments[judgeId];
    }
    renderJudgeRosters();
    renderJudgeAllocations();
    renderVenueBoard();
  }

  function toggleAllJudgeTracks(judgeId) {
    const liveAssignments = getJudgeAssignments();
    const assignment = { ...(liveAssignments[judgeId] || {}) };
    let evs = getAssignmentEvents(assignment);
    const allTracks = ['EMBEDDATHON', 'PROJECT_EXPO', 'PAPER'];
    if (evs.length === 3) {
      delete liveAssignments[judgeId];
    } else {
      assignment.events = allTracks;
      assignment.eventId = 'EMBEDDATHON';
      if (!assignment.venue) assignment.venue = 'All Campus Tracks & Venues';
      liveAssignments[judgeId] = assignment;
    }
    renderJudgeRosters();
    renderJudgeAllocations();
    renderVenueBoard();
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

    // Roster Track Toggle Buttons
    document.querySelectorAll('.btn-roster-toggle-track').forEach((btn) => {
      btn.onclick = (e) => {
        e.preventDefault();
        const judgeId = btn.dataset.judge;
        const trackId = btn.dataset.event;
        toggleJudgeTrack(judgeId, trackId);
      };
    });
    document.querySelectorAll('.btn-roster-toggle-all').forEach((btn) => {
      btn.onclick = (e) => {
        e.preventDefault();
        const judgeId = btn.dataset.judge;
        toggleAllJudgeTracks(judgeId);
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
        events: [],
        eventId: '',
        venue: '',
        slotId: '',
        day: '',
        start: '',
        end: '',
        slotTitle: '',
        ...(assignments[judge.id] || {})
      };

      const assignedEvents = getAssignmentEvents(assignment);
      const isInternal = judge.type === 'INTERNAL';
      const slots = embersSchedule || [];

      const card = document.createElement('div');
      card.className = `p-3.5 rounded-2xl border space-y-2.5 text-xs ${
        isInternal ? 'bg-[#fff8f3] border-[#fed7aa]' : 'bg-indigo-50/40 border-indigo-200'
      }`;

      card.innerHTML = `
        <div class="flex items-center justify-between gap-2">
          <div class="flex items-center gap-2 min-w-0">
            <span class="px-2 py-0.5 rounded ${isInternal ? 'bg-[#ea580c]' : 'bg-indigo-600'} text-white font-mono font-black text-[10px]">${judge.id}</span>
            <span class="text-xs font-black text-[#0f172a] truncate">${judge.name}</span>
            <span class="text-[10px] text-[#64748b] truncate hidden sm:inline">(${judge.role || 'Jury'})</span>
          </div>
          <div class="flex items-center gap-1">
            ${assignedEvents.map(evId => `<span class="text-[9px] font-black px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-200">${EVENTS[evId] ? EVENTS[evId].icon + ' ' + EVENTS[evId].shortLabel : evId}</span>`).join('')}
            <span class="text-[9px] font-black uppercase px-1.5 py-0.5 rounded ${isInternal ? 'bg-orange-100 text-[#ea580c]' : 'bg-indigo-100 text-indigo-700'}">${judge.type}</span>
          </div>
        </div>

        <div class="space-y-2">
          <div>
            <div class="flex items-center justify-between mb-1.5 flex-wrap gap-1">
              <label class="text-[9px] font-bold text-[#64748b] uppercase">Assigned Events & Tracks (Select all that apply):</label>
              <button type="button" class="btn-alloc-toggle-all text-[10px] font-bold text-indigo-600 hover:underline cursor-pointer" data-judge="${judge.id}">
                ${assignedEvents.length === 3 ? 'Clear all tracks' : '⚡ Deploy to All 3 Tracks'}
              </button>
            </div>
            <div class="flex items-center gap-1.5 flex-wrap">
              ${((EVENT_LIB.EVENT_ORDER && EVENT_LIB.EVENT_ORDER.length) ? EVENT_LIB.EVENT_ORDER : ['EMBEDDATHON', 'PROJECT_EXPO', 'PAPER']).map((eventId) => {
                const ev = EVENTS[eventId];
                if (!ev) return '';
                const isChecked = assignedEvents.includes(eventId);
                return `
                  <button type="button" class="btn-alloc-event-pill px-2.5 py-1 rounded-lg text-xs font-black transition active:scale-95 cursor-pointer flex items-center gap-1.5 ${
                    isChecked
                      ? 'bg-[#0f172a] text-white shadow-xs border-2 border-[#0f172a]'
                      : 'bg-white text-slate-600 border border-[#cbd5e1] hover:bg-slate-50'
                  }" data-judge="${judge.id}" data-event="${eventId}">
                    <span>${ev.icon}</span>
                    <span>${ev.shortLabel}</span>
                    <span class="text-[9px] px-1.5 py-0.2 rounded font-black ${isChecked ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-600'}">${isChecked ? 'ASSIGNED ✓' : '+'}</span>
                  </button>
                `;
              }).join('')}
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <label class="block text-[9px] font-bold text-[#64748b] uppercase mb-0.5">Assigned Venue / Location</label>
              <input type="text" list="venuePresetsList" value="${assignment.venue || ''}" placeholder="e.g. Edusat Hall & Multi Hall" class="alloc-venue-input w-full px-2.5 py-1.5 text-xs font-bold bg-white border border-[#cbd5e1] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#ea580c]" data-judge="${judge.id}">
            </div>

            <div>
              <label class="block text-[9px] font-bold text-[#64748b] uppercase mb-0.5">Schedule Slot (Optional)</label>
              <select class="alloc-slot-select w-full px-2 py-1.5 text-xs font-bold bg-white border border-[#cbd5e1] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#ea580c]" data-judge="${judge.id}">
                <option value="">— Flexible across all slots —</option>
                ${slots.map((slot) => `<option value="${slot.id}" ${assignment.slotId === slot.id ? 'selected' : ''}>${buildSlotLabel(slot)}</option>`).join('')}
              </select>
            </div>
          </div>
        </div>

        <div class="flex items-center justify-between gap-2 pt-1.5 border-t ${isInternal ? 'border-[#fed7aa]' : 'border-indigo-200'}">
          <span class="text-[10px] font-bold ${assignedEvents.length ? 'text-[#0f172a]' : 'text-[#94a3b8]'} truncate">
            ${assignedEvents.length ? '📍 ' + (assignment.venue || 'Campus Venue') + ' · ' + assignedEvents.map(e => EVENTS[e] ? EVENTS[e].shortLabel : e).join(', ') : 'Not deployed to an event'}
          </span>
          <button type="button" class="alloc-clear px-2 py-0.5 rounded text-[9px] font-black text-rose-600 hover:bg-rose-50 transition cursor-pointer" data-judge="${judge.id}">Clear Allocation</button>
        </div>
      `;

      judgeAllocationList.appendChild(card);
    });

    judgeAllocationList.onclick = function (e) {
      const clearBtn = e.target.closest('.alloc-clear');
      if (clearBtn) {
        const judgeId = clearBtn.dataset.judge;
        const liveAssignments = getJudgeAssignments();
        delete liveAssignments[judgeId];
        renderJudgeAllocations();
        renderVenueBoard();
        renderJudgeRosters();
        return;
      }

      const pillBtn = e.target.closest('.btn-alloc-event-pill');
      if (pillBtn) {
        const judgeId = pillBtn.dataset.judge;
        const eventId = pillBtn.dataset.event;
        toggleJudgeTrack(judgeId, eventId);
        return;
      }

      const toggleAllBtn = e.target.closest('.btn-alloc-toggle-all');
      if (toggleAllBtn) {
        const judgeId = toggleAllBtn.dataset.judge;
        toggleAllJudgeTracks(judgeId);
        return;
      }
    };

    judgeAllocationList.oninput = function (e) {
      const target = e.target;
      const judgeId = target.dataset.judge;
      if (!judgeId) return;
      const liveAssignments = getJudgeAssignments();
      const assignment = liveAssignments[judgeId] || { events: [], eventId: '' };

      if (target.classList.contains('alloc-venue-input')) {
        assignment.venue = target.value;
        liveAssignments[judgeId] = assignment;
      }
    };

    judgeAllocationList.onchange = function (e) {
      const target = e.target;
      const judgeId = target.dataset.judge;
      if (!judgeId) return;
      const liveAssignments = getJudgeAssignments();
      const assignment = liveAssignments[judgeId] || { events: [], eventId: '' };

      if (target.classList.contains('alloc-venue-input')) {
        assignment.venue = target.value;
        liveAssignments[judgeId] = assignment;
        renderVenueBoard();
        renderJudgeRosters();
      } else if (target.classList.contains('alloc-slot-select')) {
        const slot = getSlotById(target.value);
        assignment.slotId = slot ? slot.id : '';
        assignment.day = slot ? String(slot.day || '') : '';
        assignment.start = slot ? slot.start || '' : '';
        assignment.end = slot ? slot.end || '' : '';
        assignment.slotTitle = slot ? slot.title || '' : '';
        if (slot && slot.venue && !assignment.venue) assignment.venue = slot.venue;
        liveAssignments[judgeId] = assignment;
        renderVenueBoard();
        renderJudgeRosters();
      }
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

      const deployed = judges.filter((judge) => {
        const a = assignments[judge.id];
        if (!a) return false;
        const evs = getAssignmentEvents(a);
        return evs.includes(eventId);
      });

      const venueSet = [];
      deployed.forEach((judge) => {
        const a = assignments[judge.id];
        const venue = a.venue || event.venue;
        if (venue && !venueSet.includes(venue)) venueSet.push(venue);
      });
      const venueLabel = venueSet.length ? venueSet.join(' / ') : event.venue;

      const judgeLines = deployed.length
        ? deployed.map((judge) => {
            const a = assignments[judge.id];
            const evs = getAssignmentEvents(a);
            const isMulti = evs.length > 1;
            const time = a.start ? `${a.start}${a.end ? '–' + a.end : ''}` : '';
            return `
              <div class="flex items-center justify-between gap-1 text-[10px] py-0.5">
                <div class="flex items-center gap-1.5 min-w-0">
                  <span class="font-bold truncate text-[#0f172a]">${judge.id} · ${judge.name}</span>
                  ${isMulti ? '<span class="text-[8px] font-black px-1 rounded bg-purple-100 text-purple-700">MULTI</span>' : ''}
                </div>
                <span class="font-mono text-[#64748b] whitespace-nowrap text-[9px]">${time || 'Active'}</span>
              </div>
            `;
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

    const matrixHeaderTitle = document.getElementById('matrixHeaderTitle');
    if (matrixHeaderTitle) {
      matrixHeaderTitle.textContent = `📋 Live Evaluation Master Matrix (${eventTeams.length} Teams · ${event.label})`;
    }

    const filteredTeams = eventTeams.filter((t) => {
      if (filterSec === 'ALL') return true;
      if (eventId === 'PROJECT_EXPO') {
        if (filterSec === 'HARDWARE' || filterSec === 'Hardware') return (t.section === 'HARDWARE' || t.project_type === 'Hardware');
        if (filterSec === 'SOFTWARE' || filterSec === 'Software') return (t.section === 'SOFTWARE' || t.project_type === 'Software');
      }
      return t.section === filterSec || event.mode === 'SINGLE';
    });
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

        const leadName = t.lead || (t.members && t.members[0] ? t.members[0].name : '');
        const memberCount = t.member_count || (t.members ? t.members.length : 1);
        const secLabel = event.mode === 'SINGLE' ? (t.stall || t.slot || t.section || '') : t.section;

        tr.innerHTML = `
          <td class="py-2.5 px-2.5 font-black font-serif-pace text-[#ea580c]">#${t.number}</td>
          <td class="py-2.5 px-3 font-bold text-[#0f172a] truncate max-w-[150px]">
            <div>${t.name}</div>
            <span class="text-[9px] text-[#64748b] font-normal truncate block">${leadName} · ${memberCount} members${t.college ? ' · ' + t.college : ''}</span>
          </td>
          <td class="py-2.5 px-1.5 text-center font-bold text-[#64748b] text-[10px]">${secLabel}</td>
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

        const leadName = t.lead || (t.members && t.members[0] ? t.members[0].name : '');
        const memberCount = t.member_count || (t.members ? t.members.length : 1);

        tr.innerHTML = `
          <td class="py-2.5 px-2.5 font-black font-serif-pace text-[#ea580c]">#${t.number}</td>
          <td class="py-2.5 px-3 font-bold text-[#0f172a] truncate max-w-[150px]">
            <div>${t.name}</div>
            <span class="text-[9px] text-[#64748b] font-normal truncate block">${leadName} · ${memberCount} members</span>
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

    function generateUniquePin() {
      const existing = new Set([
        ...(draftConfig.internalJudges || []).map(j => String(j.pin)),
        ...(draftConfig.externalJudges || []).map(j => String(j.pin))
      ]);
      let pin = '';
      for (let attempt = 0; attempt < 1000; attempt++) {
        pin = String(Math.floor(1000 + Math.random() * 9000));
        if (!existing.has(pin)) return pin;
      }
      return String(Math.floor(1000 + Math.random() * 9000));
    }

    // Add Judges
    if (btnAdminAddInternal) {
      btnAdminAddInternal.addEventListener('click', () => {
        const nextNum = (draftConfig.internalJudges || []).length + 1;
        const newJudge = {
          id: `INT-${nextNum}`,
          name: `Internal Judge ${nextNum}`,
          role: 'CSE Faculty Mentor',
          pin: generateUniquePin()
        };
        draftConfig.internalJudges.push(newJudge);
        // Default to Embeddathon
        draftConfig.judgeAssignments[newJudge.id] = {
          events: ['EMBEDDATHON'],
          eventId: 'EMBEDDATHON',
          venue: 'Computer Labs 1 & 2',
          slotTitle: 'Track 1: Embeddathon'
        };
        renderJudgeRosters();
        renderJudgeAllocations();
        renderVenueBoard();
      });
    }

    if (btnAdminAddExternal) {
      btnAdminAddExternal.addEventListener('click', () => {
        const nextNum = (draftConfig.externalJudges || []).length + 1;
        const newJudge = {
          id: `EXT-${nextNum}`,
          name: `External Judge ${nextNum}`,
          role: 'Industry / IEEE Jury',
          pin: generateUniquePin()
        };
        draftConfig.externalJudges.push(newJudge);
        // Default to Project Expo or Embeddathon
        draftConfig.judgeAssignments[newJudge.id] = {
          events: ['PROJECT_EXPO'],
          eventId: 'PROJECT_EXPO',
          venue: 'Edusat Hall',
          slotTitle: 'Track 2: Project Expo'
        };
        renderJudgeRosters();
        renderJudgeAllocations();
        renderVenueBoard();
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
      matrixEventFilter.addEventListener('change', () => {
        const evId = matrixEventFilter.value;
        if (matrixSectionFilter) {
          if (evId === 'PROJECT_EXPO') {
            matrixSectionFilter.innerHTML = `
              <option value="ALL">All Stalls (42 Teams · 7 HW + 35 SW)</option>
              <option value="HARDWARE">Hardware Track (HW 01–07)</option>
              <option value="SOFTWARE">Software Track (SW 01–35)</option>
            `;
          } else if (evId === 'PAPER') {
            matrixSectionFilter.innerHTML = `
              <option value="ALL">All Papers (12 Papers)</option>
            `;
          } else {
            matrixSectionFilter.innerHTML = `
              <option value="ALL">All Sections (24 Teams)</option>
              <option value="A">Section A (01–11)</option>
              <option value="B">Section B (12–24)</option>
            `;
          }
          activeMatrixFilter = 'ALL';
        }
        renderMatrix();
      });
    }

    // Export & Reset
    if (btnAdminExportCSV) btnAdminExportCSV.addEventListener('click', exportCSV);
    if (btnAdminShareWhatsApp) btnAdminShareWhatsApp.addEventListener('click', shareWhatsApp);
    if (btnAdminResetScores) btnAdminResetScores.addEventListener('click', resetAllEvaluations);
  }

  document.addEventListener('DOMContentLoaded', init);
})();
