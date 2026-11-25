// EMBERS / EMBEDTHON '26 - Multi-Event, Multi-Judge Scoring Portal
// Paper Presentation (50) · Project Expo (50) · Embeddathon (dual-phase 100)
// Real-time synchronization across phone browsers via Vercel Serverless & Cloud Persistence

(function () {
  'use strict';

  const STORAGE_KEY_AUTH = 'embedthon_judge_auth_v4';
  const STORAGE_KEY_CURRENT = 'embedthon_current_team_v4';
  const STORAGE_KEY_EVENT = 'embedthon_active_event_v1';

  const EVENT_LIB = window.EMBEDTHON_RUBRICS || {
    EVENTS: {},
    EVENT_ORDER: [],
    getEvent: function () {
      return { id: 'EMBEDDATHON', label: 'Embeddathon', maxTotal: 100, mode: 'DUAL_PHASE', criteria: [] };
    },
    quickValues: function (max) {
      return [max];
    }
  };
  const EVENTS = EVENT_LIB.EVENTS || {};

  // State
  let teams = typeof TEAMS_DATA !== 'undefined' ? TEAMS_DATA : [];
  let currentTeamIndex = 0;
  let activeSectionFilter = 'A';
  let currentView = 'scoring';
  let activeEventId = 'EMBEDDATHON';
  let singleEventInputs = {};
  let renderedSingleEventId = null;

  // Config & Master Evaluations
  let juryConfig = {
    activePhase: 'PHASE_1',
    adminPin: '5012',
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
  let currentJudge = null; // { id, name, role, type: 'INTERNAL' | 'EXTERNAL' | 'ADMIN', isAdmin }
  let lastDataChecksum = '';
  let pollingInterval = null;

  // Selected judge and track in login modal
  let selectedLoginJudgeId = 'INT-1';
  let selectedLoginEventId = 'EMBEDDATHON';

  // -------------------------------------------------------------
  // DOM References
  // -------------------------------------------------------------
  // Login Overlay
  const loginOverlay = document.getElementById('loginOverlay');
  const loginJudgeIdSelect = document.getElementById('loginJudgeIdSelect');
  const loginPhaseNotice = document.getElementById('loginPhaseNotice');
  const loginActivePhaseTitle = document.getElementById('loginActivePhaseTitle');
  const loginActivePhaseSub = document.getElementById('loginActivePhaseSub');
  const loginInternalSlotsContainer = document.getElementById('loginInternalSlotsContainer');
  const loginExternalSlotsContainer = document.getElementById('loginExternalSlotsContainer');
  const btnSelectAdminLogin = document.getElementById('btnSelectAdminLogin');
  const loginPinInput = document.getElementById('loginPinInput');
  const loginNameInput = document.getElementById('loginNameInput');
  const pinHintBadge = document.getElementById('pinHintBadge');
  const loginErrorMessage = document.getElementById('loginErrorMessage');
  const btnLoginSubmit = document.getElementById('btnLoginSubmit');
  const loginAssignedBadge = document.getElementById('loginAssignedBadge');
  const loginTrackPills = document.getElementById('loginTrackPills');
  const loginTrackDesc = document.getElementById('loginTrackDesc');
  const quickSectionSwitchWrapper = document.getElementById('quickSectionSwitchWrapper');

  // Header & Subheader
  const activeJudgeBadge = document.getElementById('activeJudgeBadge');
  const btnJudgeSwitch = document.getElementById('btnJudgeSwitch');
  const btnOpenSetupModal = document.getElementById('btnOpenSetupModal');
  const subHeaderJudgeRole = document.getElementById('subHeaderJudgeRole');
  const navSectionBadge = document.getElementById('navSectionBadge');
  const progressPill = document.getElementById('progressPill');

  // Views & Tabs
  const tabTeamView = document.getElementById('tabTeamView');
  const tabRoster = document.getElementById('tabRoster');
  const tabLeaderboard = document.getElementById('tabLeaderboard');
  const viewScoring = document.getElementById('viewScoring');
  const viewRoster = document.getElementById('viewRoster');
  const viewLeaderboard = document.getElementById('viewLeaderboard');

  // Section Switches
  const btnSwitchSecA = document.getElementById('btnSwitchSecA');
  const btnSwitchSecB = document.getElementById('btnSwitchSecB');

  // Team Navigation Pills & Modal
  const teamPillsRow = document.getElementById('teamPillsRow');
  const btnOpenTeamGridModal = document.getElementById('btnOpenTeamGridModal');
  const modalTeamGrid = document.getElementById('modalTeamGrid');
  const btnCloseGridModal = document.getElementById('btnCloseGridModal');
  const gridSectionA = document.getElementById('gridSectionA');
  const gridSectionB = document.getElementById('gridSectionB');

  // Team Details
  const teamSectionLabel = document.getElementById('teamSectionLabel');
  const evalStatusBadge = document.getElementById('evalStatusBadge');
  const teamBigNumber = document.getElementById('teamBigNumber');
  const teamBigName = document.getElementById('teamBigName');
  const teamSubtitle = document.getElementById('teamSubtitle');
  const memberCountBadge = document.getElementById('memberCountBadge');
  const membersContainer = document.getElementById('membersContainer');

  // Event / Track Selector
  const eventSelectorCard = document.getElementById('eventSelectorCard');
  const eventTabsRow = document.getElementById('eventTabsRow');
  const judgeAssignmentBadge = document.getElementById('judgeAssignmentBadge');
  const eventVenueLabel = document.getElementById('eventVenueLabel');
  const eventAssignmentSchedule = document.getElementById('eventAssignmentSchedule');

  // Jury Consensus Panel
  const juryConsensusTitle = document.getElementById('juryConsensusTitle');
  const phaseStatusSummaryBadge = document.getElementById('phaseStatusSummaryBadge');
  const dualPhaseConsensusGrid = document.getElementById('dualPhaseConsensusGrid');
  const singleEventConsensusPanel = document.getElementById('singleEventConsensusPanel');
  const singleEventJuryLabel = document.getElementById('singleEventJuryLabel');
  const singleEventAvgMax = document.getElementById('singleEventAvgMax');
  const singleEventJudgeBadges = document.getElementById('singleEventJudgeBadges');
  const singleEventAvgDisplay = document.getElementById('singleEventAvgDisplay');
  const singleEventCriteriaAverages = document.getElementById('singleEventCriteriaAverages');
  const singleEventConsensusBox = document.getElementById('singleEventConsensusBox');
  const singleEventConsensusLabel = document.getElementById('singleEventConsensusLabel');
  const singleEventConsensusTotal = document.getElementById('singleEventConsensusTotal');
  const grandCumulativeBox = document.getElementById('grandCumulativeBox');
  const internalJudgesBadges = document.getElementById('internalJudgesBadges');
  const internalAvgDisplay = document.getElementById('internalAvgDisplay');
  const externalJudgesBadges = document.getElementById('externalJudgesBadges');
  const externalAvgDisplay = document.getElementById('externalAvgDisplay');
  const cumulativeScoreDisplay = document.getElementById('cumulativeScoreDisplay');

  // Scoring Form Header & Hero Box
  const scoringFormTitle = document.getElementById('scoringFormTitle');
  const scoringFormSubtitle = document.getElementById('scoringFormSubtitle');
  const scoringRoleBadge = document.getElementById('scoringRoleBadge');
  const heroScoreLabel = document.getElementById('heroScoreLabel');
  const displayScoreValue = document.getElementById('displayScoreValue');
  const displayMaxPossible = document.getElementById('displayMaxPossible');
  const scorePhaseSubtitle = document.getElementById('scorePhaseSubtitle');
  const scoreRatingBadge = document.getElementById('scoreRatingBadge');

  // Phase 1 Inputs (Mentoring - Max 30)
  const phase1RubricsSection = document.getElementById('phase1RubricsSection');
  const inputP1Crit1 = document.getElementById('inputP1Crit1'); // 10
  const inputP1Crit2 = document.getElementById('inputP1Crit2'); // 10
  const inputP1Crit3 = document.getElementById('inputP1Crit3'); // 10

  // Single-rubric event section (Paper / Project Expo)
  const singleEventRubricsSection = document.getElementById('singleEventRubricsSection');
  const singleEventRubricTitle = document.getElementById('singleEventRubricTitle');
  const singleEventRubricList = document.getElementById('singleEventRubricList');

  // Phase 2 Inputs (External Final - Max 70)
  const phase2RubricsSection = document.getElementById('phase2RubricsSection');
  const inputP2Crit1 = document.getElementById('inputP2Crit1'); // 25
  const inputP2Crit2 = document.getElementById('inputP2Crit2'); // 20
  const inputP2Crit3 = document.getElementById('inputP2Crit3'); // 15
  const inputP2Crit4 = document.getElementById('inputP2Crit4'); // 10

  // Remarks & Save
  const inputRemarks = document.getElementById('inputRemarks');
  const btnSaveEvaluation = document.getElementById('btnSaveEvaluation');
  const btnNextTeam = document.getElementById('btnNextTeam');
  const saveFeedbackNotice = document.getElementById('saveFeedbackNotice');

  // Bottom Sticky Nav
  const bnavPrev = document.getElementById('bnavPrev');
  const bnavNext = document.getElementById('bnavNext');
  const bnavCenter = document.getElementById('bnavCenter');
  const bnavTeamLabel = document.getElementById('bnavTeamLabel');
  const bnavScoreLabel = document.getElementById('bnavScoreLabel');

  // Roster View
  const searchTeamsInput = document.getElementById('searchTeamsInput');
  const rosterListGrid = document.getElementById('rosterListGrid');
  const rosterShowingCount = document.getElementById('rosterShowingCount');
  const rosterFilterButtons = document.querySelectorAll('.roster-filter-btn');

  // Leaderboard View
  const leaderboardSectionSelect = document.getElementById('leaderboardSectionSelect');
  const leaderboardEventSelect = document.getElementById('leaderboardEventSelect');
  const leaderboardThead = document.getElementById('leaderboardThead');
  const leaderboardTitle = document.getElementById('leaderboardTitle');
  const leaderboardSubtitle = document.getElementById('leaderboardSubtitle');
  const leaderboardTbody = document.getElementById('leaderboardTbody');
  const btnExportCSV = document.getElementById('btnExportCSV');
  const btnShareWhatsApp = document.getElementById('btnShareWhatsApp');
  const btnResetEvaluations = document.getElementById('btnResetEvaluations');

  // Results Reveal Ceremony Elements
  const revealCeremonyOverlay = document.getElementById('revealCeremonyOverlay');
  const ceremonyCanvas = document.getElementById('ceremonyCanvas');
  const btnCeremonyAudioToggle = document.getElementById('btnCeremonyAudioToggle');
  const audioIcon = document.getElementById('audioIcon');
  const audioStatusText = document.getElementById('audioStatusText');
  const ceremonyCategorySelect = document.getElementById('ceremonyCategorySelect');
  const btnCloseCeremony = document.getElementById('btnCloseCeremony');
  const ceremonyStageArena = document.getElementById('ceremonyStageArena');
  const btnCeremonyPrevStep = document.getElementById('btnCeremonyPrevStep');
  const btnCeremonyConfetti = document.getElementById('btnCeremonyConfetti');
  const ceremonyStepIndicator = document.getElementById('ceremonyStepIndicator');
  const btnCeremonyNextStep = document.getElementById('btnCeremonyNextStep');
  const btnCeremonyNextLabel = document.getElementById('btnCeremonyNextLabel');

  // Ceremony state
  let ceremonyAudioEngine = null;
  let ceremonyCurrentStep = 0; // 0: Welcome, 1: 3rd place, 2: 2nd place, 3: Champion, 4: Podium
  let ceremonyCategory = 'OVERALL';
  let ceremonyWinnersList = [];
  let ceremonyMaxTotal = 100;
  let ceremonyEventId = 'EMBEDDATHON';

  // Admin Modal Elements
  const modalJurySetup = document.getElementById('modalJurySetup');
  const btnCloseSetupModal = document.getElementById('btnCloseSetupModal');
  const phaseActivationButtonGroup = document.getElementById('phaseActivationButtonGroup');
  const adminInternalJudgesList = document.getElementById('adminInternalJudgesList');
  const btnAddInternalJudge = document.getElementById('btnAddInternalJudge');
  const adminExternalJudgesList = document.getElementById('adminExternalJudgesList');
  const btnAddExternalJudge = document.getElementById('btnAddExternalJudge');
  const inputAdminPinForConfig = document.getElementById('inputAdminPinForConfig');
  const btnSaveJuryConfig = document.getElementById('btnSaveJuryConfig');

  // In-memory draft for Admin Config modal
  let draftAdminConfig = null;

  function refreshTeamsForActiveEvent() {
    teams = typeof getEventTeams === 'function'
      ? getEventTeams(activeEventId)
      : (typeof TEAMS_DATA !== 'undefined' ? TEAMS_DATA : []);
    if (currentTeamIndex >= teams.length) currentTeamIndex = 0;
  }

  // -------------------------------------------------------------
  // Initialization
  // -------------------------------------------------------------
  async function init() {
    loadSavedEventId();
    refreshTeamsForActiveEvent();
    loadSavedTeamIndex();

    // 1. Fetch server config and evaluations
    await fetchServerConfig();
    await fetchServerEvaluations();

    // 2. Check saved authentication
    checkSavedAuth();

    // 3. Render base components
    refreshTeamsForActiveEvent();
    renderLoginJudgeSlots();
    renderEventSelector();
    renderTeamPills();
    renderTeamGridModal();
    loadTeamIntoForm(currentTeamIndex);

    // 4. Bind events
    bindEvents();
    renderRosterList();
    renderLeaderboard();

    // 5. Start real-time sync polling
    startLiveSync();

    // Check if launched for reveal ceremony directly
    if (window.location.hash === '#ceremony' || localStorage.getItem('open_ceremony_on_load') === 'true') {
      localStorage.removeItem('open_ceremony_on_load');
      setTimeout(() => {
        openCeremonyModal();
      }, 400);
    }
  }

  // -------------------------------------------------------------
  // Event / Rubric Helpers
  // -------------------------------------------------------------
  function getActiveEvent() {
    return EVENT_LIB.getEvent(activeEventId);
  }

  function isSingleEventMode() {
    return getActiveEvent().mode === 'SINGLE';
  }

  function loadSavedEventId() {
    // 1. Detect dedicated page from pathname or dataset
    const pageAttr = document.body && document.body.dataset && document.body.dataset.pageEvent;
    if (pageAttr && (EVENTS[pageAttr] || pageAttr === 'EMBEDDATHON')) {
      activeEventId = pageAttr;
      saveActiveEvent();
      return;
    }

    const path = (window.location.pathname || '').toLowerCase();
    if (path.endsWith('expo.html')) {
      activeEventId = 'PROJECT_EXPO';
      saveActiveEvent();
      return;
    }
    if (path.endsWith('paper.html')) {
      activeEventId = 'PAPER';
      saveActiveEvent();
      return;
    }
    if (path.endsWith('hackathon.html')) {
      activeEventId = 'EMBEDDATHON';
      saveActiveEvent();
      return;
    }

    // 2. URL search parameters
    try {
      const params = new URLSearchParams(window.location.search);
      const urlEvent = (params.get('event') || params.get('track') || '').toUpperCase();
      if (urlEvent) {
        if (urlEvent === 'PAPER' || urlEvent === 'TRACK_3' || urlEvent === 'TRACK3') {
          activeEventId = 'PAPER';
          saveActiveEvent();
          return;
        }
        if (urlEvent === 'PROJECT_EXPO' || urlEvent === 'EXPO' || urlEvent === 'TRACK_2' || urlEvent === 'TRACK2') {
          activeEventId = 'PROJECT_EXPO';
          saveActiveEvent();
          return;
        }
        if (urlEvent === 'EMBEDDATHON' || urlEvent === 'EMBEDTHON' || urlEvent === 'TRACK_1' || urlEvent === 'TRACK1' || urlEvent === 'HACKATHON') {
          activeEventId = 'EMBEDDATHON';
          saveActiveEvent();
          return;
        }
      }
    } catch (e) {}

    try {
      const saved = localStorage.getItem(STORAGE_KEY_EVENT);
      if (saved && (EVENTS[saved] || saved === 'EMBEDDATHON')) {
        activeEventId = saved;
      }
    } catch (e) {}
  }

  function saveActiveEvent() {
    try {
      localStorage.setItem(STORAGE_KEY_EVENT, activeEventId);
    } catch (e) {}
  }

  function getJudgeEvents(assignment) {
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

  function getJudgeAssignment(judgeId) {
    const configured = (juryConfig.judgeAssignments || {})[judgeId];
    if (configured) return configured;
    if (currentJudge && currentJudge.id === judgeId && currentJudge.assignment) {
      return currentJudge.assignment;
    }
    const DEFAULT_ASSIGNMENTS = {
      'INT-1': { events: ['EMBEDDATHON'], eventId: 'EMBEDDATHON', venue: 'Computer Labs 1 & 2', slotTitle: 'Track 1: Embeddathon Phase 1' },
      'INT-2': { events: ['EMBEDDATHON'], eventId: 'EMBEDDATHON', venue: 'Computer Labs 1 & 2', slotTitle: 'Track 1: Embeddathon Phase 1' },
      'EXT-1': { events: ['EMBEDDATHON'], eventId: 'EMBEDDATHON', venue: 'Computer Labs 1 & 2', slotTitle: 'Track 1: Embeddathon Phase 2' },
      'EXT-2': { events: ['EMBEDDATHON'], eventId: 'EMBEDDATHON', venue: 'Computer Labs 1 & 2', slotTitle: 'Track 1: Embeddathon Phase 2' },
      'EXP-1': { events: ['PROJECT_EXPO'], eventId: 'PROJECT_EXPO', venue: 'Edusat Hall', slotTitle: 'Track 2: Project Expo Stalls 01–36' },
      'EXP-2': { events: ['PROJECT_EXPO'], eventId: 'PROJECT_EXPO', venue: 'Edusat Hall', slotTitle: 'Track 2: Project Expo Stalls 01–36' },
      'PPR-1': { events: ['PAPER'], eventId: 'PAPER', venue: 'Multipurpose Hall', slotTitle: 'Track 3: Paper Presentation PP-01 to PP-12' },
      'PPR-2': { events: ['PAPER'], eventId: 'PAPER', venue: 'Multipurpose Hall', slotTitle: 'Track 3: Paper Presentation PP-01 to PP-12' }
    };
    return DEFAULT_ASSIGNMENTS[judgeId] || null;
  }

  function getEventMap(eventId) {
    const all = masterEvaluations || {};
    let map = null;

    if (all[eventId] && typeof all[eventId] === 'object') {
      map = all[eventId];
    } else if (all._byEvent && all._byEvent[eventId] && typeof all._byEvent[eventId] === 'object') {
      map = all._byEvent[eventId];
    }

    // Backward compatibility: legacy data was stored flat under team numbers.
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
    return getEventMap(eventId || activeEventId)[teamNumber] || {};
  }

  function getJudgeEventEval(teamNumber, judgeId, eventId) {
    return getTeamEventEvals(teamNumber, eventId)[judgeId] || null;
  }

  function setJudgeEventEval(eventId, teamNumber, judgeId, record) {
    if (!masterEvaluations[eventId] || typeof masterEvaluations[eventId] !== 'object') {
      masterEvaluations[eventId] = {};
    }
    if (!masterEvaluations[eventId][teamNumber]) {
      masterEvaluations[eventId][teamNumber] = {};
    }
    masterEvaluations[eventId][teamNumber][judgeId] = record;
  }

  function getAllJudges() {
    return [...(juryConfig.internalJudges || []), ...(juryConfig.externalJudges || [])];
  }

  function hasJudgeScored(evalObj, eventId) {
    if (!evalObj) return false;
    if (eventId === 'EMBEDDATHON') {
      return Number(evalObj.phase1 || 0) > 0 || Number(evalObj.phase2 || 0) > 0 || Number(evalObj.total || 0) > 0;
    }
    return Number(evalObj.total || 0) > 0;
  }

  function getEventStandings(eventId) {
    const evTeams = typeof getEventTeams === 'function' ? getEventTeams(eventId) : teams;
    return evTeams.map((team) => {
      const teamEvals = getTeamEventEvals(team.number, eventId);
      const values = Object.values(teamEvals).filter(Boolean);

      if (eventId === 'EMBEDDATHON') {
        const p1Scores = values.map((x) => Number(x.phase1)).filter((v) => v > 0);
        const p2Scores = values.map((x) => Number(x.phase2)).filter((v) => v > 0);
        const p1Avg = p1Scores.length ? Number((p1Scores.reduce((a, b) => a + b, 0) / p1Scores.length).toFixed(1)) : 0;
        const p2Avg = p2Scores.length ? Number((p2Scores.reduce((a, b) => a + b, 0) / p2Scores.length).toFixed(1)) : 0;
        return {
          team: team,
          p1Avg: p1Avg,
          p2Avg: p2Avg,
          grandTotal: Number((p1Avg + p2Avg).toFixed(1)),
          numJudges: values.filter((x) => hasJudgeScored(x, eventId)).length,
          evals: values
        };
      }

      const totalScores = values.map((x) => Number(x.total)).filter((v) => v > 0);
      const avg = totalScores.length
        ? Number((totalScores.reduce((a, b) => a + b, 0) / totalScores.length).toFixed(1))
        : 0;
      return {
        team: team,
        p1Avg: 0,
        p2Avg: 0,
        grandTotal: avg,
        numJudges: totalScores.length,
        evals: values
      };
    });
  }

  function renderEventSelector() {
    if (!eventTabsRow) return;

    const assignment = currentJudge ? getJudgeAssignment(currentJudge.id) : null;
    const assignedEvents = getJudgeEvents(assignment);
    const isLockedToAssignment = Boolean(currentJudge && !currentJudge.isAdmin && assignedEvents.length > 0);

    const order = EVENT_LIB.EVENT_ORDER && EVENT_LIB.EVENT_ORDER.length
      ? EVENT_LIB.EVENT_ORDER
      : ['PAPER', 'PROJECT_EXPO', 'EMBEDDATHON'];

    eventTabsRow.innerHTML = '';
    order.forEach((eventId) => {
      const event = EVENTS[eventId];
      if (!event) return;
      const isActive = eventId === activeEventId;
      const isAssigned = assignedEvents.includes(eventId) || assignedEvents.includes('ALL');
      const isBlocked = isLockedToAssignment && !isAssigned;

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = isActive
        ? 'px-2 py-2 rounded-xl border-2 text-left transition bg-[#0f172a] text-white border-[#0f172a] shadow-sm'
        : isBlocked
        ? 'px-2 py-2 rounded-xl border text-left transition bg-slate-50 text-slate-400 border-slate-200 opacity-40 cursor-not-allowed'
        : 'px-2 py-2 rounded-xl border text-left transition active:scale-95 bg-[#fdfbf7] text-[#1e293b] border-[#e3dccd] hover:bg-[#f6f1e6]';

      btn.innerHTML = `
        <div class="flex items-center justify-between">
          <span class="text-base leading-none">${event.icon}</span>
          ${isAssigned ? '<span class="text-[7px] font-black px-1.5 py-0.2 rounded bg-emerald-500 text-white">YOUR TRACK</span>' : ''}
        </div>
        <span class="text-[9px] font-black block truncate mt-1">${event.shortLabel}</span>
        <span class="text-[8px] font-bold block ${isActive ? 'text-orange-200' : 'text-[#64748b]'}">${event.maxTotal} pts</span>
      `;

      if (isBlocked) {
        const assignedLabels = assignedEvents.map(e => EVENT_LIB.getEvent(e).shortLabel).join(' & ');
        btn.title = `Your login is assigned to ${assignedLabels}. Switch judge to change event.`;
        btn.addEventListener('click', () => {
          alert(`Your jury assignment (${currentJudge.id}) is designated for: ${assignedLabels} (${assignment.venue || ''}). Switch judge or log out to evaluate another track.`);
        });
      } else {
        btn.addEventListener('click', () => {
          if (eventId === 'PROJECT_EXPO') {
            window.location.href = 'expo.html';
          } else if (eventId === 'PAPER') {
            window.location.href = 'paper.html';
          } else {
            window.location.href = 'hackathon.html';
          }
        });
      }
      eventTabsRow.appendChild(btn);
    });

    // Update Reveal Ceremony Button URLs so they scope directly to activeEventId
    const btnLaunchCeremony = document.getElementById('btnLaunchCeremony');
    if (btnLaunchCeremony) {
      btnLaunchCeremony.href = `reveal.html?category=${activeEventId}`;
    }

    updateAssignmentUI();
  }

  function updateAssignmentUI() {
    const event = getActiveEvent();
    const assignment = currentJudge ? getJudgeAssignment(currentJudge.id) : null;

    if (eventVenueLabel) {
      eventVenueLabel.textContent = `📍 ${assignment && assignment.venue ? assignment.venue : event.venue}`;
    }

    if (judgeAssignmentBadge) {
      const assignedEvs = getJudgeEvents(assignment);
      if (assignedEvs.length > 1) {
        judgeAssignmentBadge.textContent = `🎯 Multi-Track: ${assignedEvs.map(e => EVENT_LIB.getEvent(e).shortLabel).join(' & ')}`;
        judgeAssignmentBadge.className = 'text-[9px] font-black px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 border border-purple-200';
      } else if (assignedEvs.length === 1) {
        const assignedEvent = EVENT_LIB.getEvent(assignedEvs[0]);
        judgeAssignmentBadge.textContent = `${assignedEvent.icon} Assigned · ${assignedEvent.shortLabel}`;
        judgeAssignmentBadge.className = 'text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200';
      } else if (currentJudge) {
        judgeAssignmentBadge.textContent = 'All Tracks (Open)';
        judgeAssignmentBadge.className = 'text-[9px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200';
      } else {
        judgeAssignmentBadge.textContent = 'Not assigned';
        judgeAssignmentBadge.className = 'text-[9px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-[#475569] border border-slate-200';
      }
    }

    if (eventAssignmentSchedule) {
      if (assignment && (assignment.start || assignment.day)) {
        const dayText = assignment.day ? `Day ${assignment.day}` : '';
        const timeText = assignment.start ? `${assignment.start}${assignment.end ? '–' + assignment.end : ''}` : '';
        const slotText = assignment.slotTitle || '';
        eventAssignmentSchedule.textContent = [dayText, timeText, slotText].filter(Boolean).join(' · ') || 'Schedule assigned';
      } else if (currentJudge) {
        eventAssignmentSchedule.textContent = 'No venue slot assigned';
      } else {
        eventAssignmentSchedule.textContent = 'Login to view your slot';
      }
    }
  }

  function setActiveEvent(eventId) {
    if (!EVENTS[eventId]) return;
    activeEventId = eventId;
    saveActiveEvent();
    refreshTeamsForActiveEvent();
    currentTeamIndex = 0;
    renderedSingleEventId = null;
    applyEventMode();
    renderEventSelector();
    loadTeamIntoForm(currentTeamIndex);
    renderJuryConsensus();
    renderTeamPills();
    renderTeamGridModal();
    renderRosterList(searchTeamsInput ? searchTeamsInput.value : '');
    renderLeaderboard();
    updateProgressUI();
  }

  // -------------------------------------------------------------
  // Real-Time Live Sync Polling
  // -------------------------------------------------------------
  function startLiveSync() {
    if (pollingInterval) clearInterval(pollingInterval);
    pollingInterval = setInterval(async () => {
      await syncDataSilently();
    }, 3000);
  }

  async function syncDataSilently() {
    try {
      const [evalRes, cfgRes] = await Promise.all([
        fetch('/api/evaluations', { cache: 'no-store' }),
        fetch('/api/config', { cache: 'no-store' })
      ]);

      if (evalRes.ok && cfgRes.ok) {
        const evals = await evalRes.json();
        const cfg = await cfgRes.json();

        const checksum = JSON.stringify(evals) + '_' + JSON.stringify(cfg);
        if (checksum !== lastDataChecksum) {
          lastDataChecksum = checksum;
          masterEvaluations = evals;
          juryConfig = cfg;

          // Re-render views dynamically
          updatePhaseNotice();
          updateAssignmentUI();
          if (loginOverlay && !loginOverlay.classList.contains('hidden')) {
            renderLoginJudgeSlots();
          }
          updateProgressUI();
          renderJuryConsensus();
          renderTeamPills();
          renderRosterList();
          renderLeaderboard();
        }
      }
    } catch (e) {
      // Offline fallback: keep local data
    }
  }

  async function fetchServerConfig() {
    try {
      const res = await fetch('/api/config', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (data && (data.internalJudges || data.externalJudges)) {
          juryConfig = data;
        }
      }
    } catch (e) {
      console.warn('Using local fallback config:', e);
    }
  }

  async function fetchServerEvaluations() {
    try {
      const res = await fetch('/api/evaluations', { cache: 'no-store' });
      if (res.ok) {
        masterEvaluations = await res.json();
        lastDataChecksum = JSON.stringify(masterEvaluations);
      }
    } catch (e) {
      console.warn('Using local fallback evaluations:', e);
    }
  }

  // -------------------------------------------------------------
  // Authentication & Judge Profiles
  // -------------------------------------------------------------
  function checkSavedAuth() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_AUTH);
      if (saved) {
        currentJudge = JSON.parse(saved);
        updateActiveJudgeUI();
        if (loginOverlay) loginOverlay.classList.add('hidden');

        // Check if on hub index page
        const path = (window.location.pathname || '').toLowerCase();
        const isHub = path.endsWith('index.html') || path === '/' || path.endsWith('/');
        if (isHub && currentJudge) {
          if (currentJudge.isAdmin || currentJudge.id === 'ADMIN') {
            window.location.href = 'admin.html';
            return;
          }
          const asgn = (currentJudge.assignment && currentJudge.assignment.eventId) || activeEventId || 'EMBEDDATHON';
          if (asgn === 'PROJECT_EXPO') {
            window.location.href = 'expo.html';
            return;
          } else if (asgn === 'PAPER') {
            window.location.href = 'paper.html';
            return;
          } else if (asgn === 'EMBEDDATHON') {
            window.location.href = 'hackathon.html';
            return;
          }
        }
      } else {
        if (loginOverlay) loginOverlay.classList.remove('hidden');
      }
    } catch (e) {
      if (loginOverlay) loginOverlay.classList.remove('hidden');
    }
  }

  function updatePhaseNotice() {
    if (isSingleEventMode()) {
      const event = getActiveEvent();
      if (loginActivePhaseTitle) loginActivePhaseTitle.textContent = `${event.icon} ${event.label} · ${event.maxTotal} Marks`;
      if (loginActivePhaseSub) loginActivePhaseSub.textContent = `Single-jury rubric · ${event.venue}`;
      if (phaseStatusSummaryBadge) phaseStatusSummaryBadge.textContent = `${event.icon} ${event.shortLabel} · /${event.maxTotal}`;
      return;
    }

    const phase = juryConfig.activePhase || 'PHASE_1';
    let phaseLabel = 'Phase 1: Mentoring Active';
    if (phase === 'PHASE_2') phaseLabel = 'Phase 2: Final Expo Active';
    if (phase === 'BOTH') phaseLabel = 'Both Phases Active (Mentoring & Final)';

    if (loginActivePhaseTitle) loginActivePhaseTitle.textContent = phaseLabel;
    if (loginActivePhaseSub) loginActivePhaseSub.textContent = 'Internal Judges score Phase 1 (30%) · External score Phase 2 (70%)';
    if (phaseStatusSummaryBadge) phaseStatusSummaryBadge.textContent = phaseLabel;
  }

  function updateActiveJudgeUI() {
    if (currentJudge) {
      const assignment = getJudgeAssignment(currentJudge.id);
      if (assignment && assignment.eventId && EVENTS[assignment.eventId] && assignment.eventId !== activeEventId) {
        activeEventId = assignment.eventId;
        renderedSingleEventId = null;
        saveActiveEvent();
      }
    }

    updatePhaseNotice();
    renderEventSelector();

    if (!currentJudge) {
      activeJudgeBadge.textContent = 'Login';
      subHeaderJudgeRole.textContent = 'JUDGE EVALUATION';
      return;
    }

    const event = getActiveEvent();
    const typeTag = currentJudge.isAdmin
      ? 'ADMIN'
      : currentJudge.type === 'INTERNAL'
      ? 'INTERNAL MENTOR'
      : 'EXTERNAL JURY';
    const assignment = getJudgeAssignment(currentJudge.id);
    const venueTag = assignment && assignment.venue ? ` · ${assignment.venue}` : '';

    activeJudgeBadge.textContent = `${currentJudge.id} · ${currentJudge.name}`;
    subHeaderJudgeRole.textContent = `${event.icon} ${event.shortLabel.toUpperCase()} · ${typeTag}${venueTag}`;

    adaptFormToJudgeRole();
    loadCurrentJudgeScoresForTeam();
    renderJuryConsensus();
    updateProgressUI();
  }

  function applyEventMode() {
    adaptFormToJudgeRole();
  }

  function adaptFormToJudgeRole() {
    if (!currentJudge) return;

    const event = getActiveEvent();

    if (event.mode === 'SINGLE') {
      ensureSingleEventRubric(event);
      singleEventRubricsSection.classList.remove('hidden');
      phase1RubricsSection.classList.add('hidden');
      phase2RubricsSection.classList.add('hidden');

      scoringRoleBadge.textContent = currentJudge.isAdmin
        ? 'Coordinator / Admin'
        : currentJudge.type === 'INTERNAL'
        ? '🏛️ Internal Mentor'
        : '🌟 External Jury';
      scoringFormTitle.textContent = `${event.icon} ${event.label} Score`;
      scoringFormSubtitle.textContent = `Rubric: ${event.criteria
        .map((c) => `${c.label} ${c.max}`)
        .join(' · ')}`;
      heroScoreLabel.textContent = 'Your Score';
      displayMaxPossible.textContent = `/ ${event.maxTotal}`;
      scorePhaseSubtitle.textContent = `${event.label} · ${event.maxTotal} Marks`;
      phaseStatusSummaryBadge.textContent = `${event.icon} ${event.shortLabel} · /${event.maxTotal}`;
      return;
    }

    singleEventRubricsSection.classList.add('hidden');

    if (currentJudge.isAdmin) {
      scoringRoleBadge.textContent = 'Coordinator / Admin';
      scoringFormTitle.textContent = 'Dual-Phase Evaluation Entry';
      scoringFormSubtitle.textContent = 'Evaluating Phase 1 (30%) & Phase 2 (70%)';
      heroScoreLabel.textContent = 'Grand Total Score';
      displayMaxPossible.textContent = '/ 100';
      scorePhaseSubtitle.textContent = 'Full Rubric Evaluation (100%)';
      phase1RubricsSection.classList.remove('hidden');
      phase2RubricsSection.classList.remove('hidden');
      enableInputs(phase1RubricsSection, true);
      enableInputs(phase2RubricsSection, true);
    } else if (currentJudge.type === 'INTERNAL') {
      scoringRoleBadge.textContent = '🏛️ Internal Mentor';
      scoringFormTitle.textContent = 'Phase 1 Mentoring Score';
      scoringFormSubtitle.textContent = 'Weightage: 30% · Criteria 1–3 (Max 30 Marks)';
      heroScoreLabel.textContent = 'Your Mentoring Score';
      displayMaxPossible.textContent = '/ 30';
      scorePhaseSubtitle.textContent = 'Phase 1 Mentoring (30%)';
      phase1RubricsSection.classList.remove('hidden');
      phase2RubricsSection.classList.add('hidden');
      enableInputs(phase1RubricsSection, true);
    } else if (currentJudge.type === 'EXTERNAL') {
      scoringRoleBadge.textContent = '🌟 External Jury';
      scoringFormTitle.textContent = 'Phase 2 Final Evaluation Score';
      scoringFormSubtitle.textContent = 'Weightage: 70% · Criteria 1–4 (Max 70 Marks)';
      heroScoreLabel.textContent = 'Your Evaluation Score';
      displayMaxPossible.textContent = '/ 70';
      scorePhaseSubtitle.textContent = 'Phase 2 Final Evaluation (70%)';
      phase1RubricsSection.classList.add('hidden');
      phase2RubricsSection.classList.remove('hidden');
      enableInputs(phase2RubricsSection, true);
    }

    updatePhaseNotice();
  }

  function ensureSingleEventRubric(event) {
    if (!singleEventRubricList) return;
    if (renderedSingleEventId === event.id) return;

    renderedSingleEventId = event.id;
    singleEventInputs = {};
    singleEventRubricTitle.textContent = `${event.icon} ${event.label} Rubric (Max ${event.maxTotal} Marks)`;
    singleEventRubricList.innerHTML = '';

    event.criteria.forEach((criterion, index) => {
      const quick = EVENT_LIB.quickValues(criterion.max);
      const card = document.createElement('div');
      card.className = 'p-2.5 bg-[#fdfbf7] rounded-xl border border-[#e3dccd] space-y-1.5';
      card.innerHTML = `
        <div class="flex items-start justify-between gap-2">
          <div>
            <span class="text-xs font-extrabold text-[#1e293b] block">${index + 1}. ${criterion.label}</span>
            <span class="text-[10px] text-[#64748b] block">${criterion.subtitle || criterion.hint || ''}</span>
          </div>
          <div class="flex items-center gap-1 bg-white px-2 py-1 rounded-lg border border-[#cbd5e1] flex-shrink-0">
            <input type="number" id="inputEvt_${criterion.key}" min="0" max="${criterion.max}" step="0.5" placeholder="0" class="w-10 text-center text-xs font-black text-[#ea580c] focus:outline-none">
            <span class="text-[10px] font-bold text-[#64748b]">/ ${criterion.max}</span>
          </div>
        </div>
        <div class="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-0.5">
          <span class="text-[9px] font-bold text-[#64748b] uppercase">Quick:</span>
          ${quick
            .map(
              (value) => `
            <button type="button" class="quick-pill-btn px-2.5 py-1 text-xs font-bold bg-white border border-[#cbd5e1] rounded-lg text-[#334155]" data-target="inputEvt_${criterion.key}" data-val="${value}">${value}${value === criterion.max ? '★' : ''}</button>`
            )
            .join('')}
          <button type="button" class="step-btn px-2 py-0.5 rounded-lg text-xs font-black bg-[#f6f1e6] border" data-target="inputEvt_${criterion.key}" data-step="-1">−</button>
          <button type="button" class="step-btn px-2 py-0.5 rounded-lg text-xs font-black bg-[#f6f1e6] border" data-target="inputEvt_${criterion.key}" data-step="1">+</button>
        </div>
      `;

      singleEventRubricList.appendChild(card);
      singleEventInputs[criterion.key] = card.querySelector('input');
    });

    singleEventRubricList.oninput = function () {
      recalculateScores();
    };

    singleEventRubricList.onclick = function (event_) {
      const quickBtn = event_.target.closest('.quick-pill-btn');
      const stepBtn = event_.target.closest('.step-btn');

      if (quickBtn) {
        const target = document.getElementById(quickBtn.getAttribute('data-target'));
        if (target) {
          target.value = quickBtn.getAttribute('data-val');
          recalculateScores();
        }
        return;
      }

      if (stepBtn) {
        const target = document.getElementById(stepBtn.getAttribute('data-target'));
        if (!target) return;
        const max = parseFloat(target.getAttribute('max')) || 100;
        const min = parseFloat(target.getAttribute('min')) || 0;
        const step = parseFloat(stepBtn.getAttribute('data-step')) || 0;
        const current = parseFloat(target.value) || 0;
        target.value = Math.min(max, Math.max(min, current + step));
        recalculateScores();
      }
    };
  }

  function enableInputs(container, enabled) {
    if (!container) return;
    const inputs = container.querySelectorAll('input, button');
    inputs.forEach((el) => {
      el.disabled = !enabled;
    });
  }

  function renderLoginJudgeSlots() {
    updatePhaseNotice();

    if (loginJudgeIdSelect) {
      if (!selectedLoginJudgeId) {
        const path = (window.location.pathname || '').toLowerCase();
        if (path.endsWith('expo.html')) selectedLoginJudgeId = 'EXP-1';
        else if (path.endsWith('paper.html')) selectedLoginJudgeId = 'PPR-1';
        else selectedLoginJudgeId = 'INT-1';
      }
      loginJudgeIdSelect.value = selectedLoginJudgeId;
    }

    // Render Internal Judges (if legacy grid is present)
    if (loginInternalSlotsContainer) {
      loginInternalSlotsContainer.innerHTML = '';
      const internalList = juryConfig.internalJudges || [];
      internalList.forEach((j) => {
        const isSelected = selectedLoginJudgeId === j.id;
        const assignment = getJudgeAssignment(j.id);
        const evs = getJudgeEvents(assignment);
        const assignmentLabel = evs.length
          ? `${evs.map(e => EVENT_LIB.getEvent(e).shortLabel).join(' + ')}${assignment.venue ? ' · ' + assignment.venue : ''}`
          : 'Track 1: Embeddathon';
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = `p-2 rounded-xl border text-left transition flex flex-col justify-between active:scale-95 ${
          isSelected
            ? 'bg-[#ea580c] text-white border-[#ea580c] shadow-xs'
            : 'bg-[#fdfbf7] text-[#1e293b] border-[#e3dccd] hover:bg-[#f6f1e6]'
        }`;

        btn.innerHTML = `
          <span class="text-xs font-black tracking-wide">${j.id}</span>
          <span class="text-[10px] font-bold truncate">${j.name}</span>
          <span class="text-[8px] opacity-75 truncate">${j.role || 'Internal'}</span>
          <span class="text-[8px] font-bold truncate ${isSelected ? 'text-orange-100' : 'text-[#ea580c]'}">${assignmentLabel}</span>
        `;

        btn.addEventListener('click', () => {
          selectedLoginJudgeId = j.id;
          if (loginJudgeIdSelect) loginJudgeIdSelect.value = j.id;
          if (loginPinInput) {
            loginPinInput.value = '';
            loginPinInput.focus();
          }
          if (loginNameInput) loginNameInput.value = j.name;
          const asgn = getJudgeAssignment(j.id);
          const asgnEvents = getJudgeEvents(asgn);
          if (asgnEvents.length) {
            selectedLoginEventId = asgnEvents.includes(activeEventId) ? activeEventId : asgnEvents[0];
          }
          renderLoginJudgeSlots();
        });

        loginInternalSlotsContainer.appendChild(btn);
      });
    }

    // Render External Judges (if legacy grid is present)
    if (loginExternalSlotsContainer) {
      loginExternalSlotsContainer.innerHTML = '';
      const externalList = juryConfig.externalJudges || [];
      externalList.forEach((j) => {
        const isSelected = selectedLoginJudgeId === j.id;
        const assignment = getJudgeAssignment(j.id);
        const evs = getJudgeEvents(assignment);
        const assignmentLabel = evs.length
          ? `${evs.map(e => EVENT_LIB.getEvent(e).shortLabel).join(' + ')}${assignment.venue ? ' · ' + assignment.venue : ''}`
          : 'Assigned Track';
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = `p-2 rounded-xl border text-left transition flex flex-col justify-between active:scale-95 ${
          isSelected
            ? 'bg-[#ea580c] text-white border-[#ea580c] shadow-xs'
            : 'bg-[#fdfbf7] text-[#1e293b] border-[#e3dccd] hover:bg-[#f6f1e6]'
        }`;

        btn.innerHTML = `
          <span class="text-xs font-black tracking-wide">${j.id}</span>
          <span class="text-[10px] font-bold truncate">${j.name}</span>
          <span class="text-[8px] opacity-75 truncate">${j.role || 'External'}</span>
          <span class="text-[8px] font-bold truncate ${isSelected ? 'text-orange-100' : 'text-[#ea580c]'}">${assignmentLabel}</span>
        `;

        btn.addEventListener('click', () => {
          selectedLoginJudgeId = j.id;
          if (loginJudgeIdSelect) loginJudgeIdSelect.value = j.id;
          if (loginPinInput) {
            loginPinInput.value = '';
            loginPinInput.focus();
          }
          if (loginNameInput) loginNameInput.value = j.name;
          const asgn = getJudgeAssignment(j.id);
          const asgnEvents = getJudgeEvents(asgn);
          if (asgnEvents.length) {
            selectedLoginEventId = asgnEvents.includes(activeEventId) ? activeEventId : asgnEvents[0];
          }
          renderLoginJudgeSlots();
        });

        loginExternalSlotsContainer.appendChild(btn);
      });
    }

    // Admin option styling & click handler
    if (btnSelectAdminLogin) {
      const isAdmin = selectedLoginJudgeId === 'ADMIN';
      btnSelectAdminLogin.className = isAdmin
        ? 'w-full p-2 rounded-xl border text-left transition flex items-center justify-between bg-[#0f172a] text-white border-[#0f172a] shadow-xs cursor-pointer'
        : 'w-full p-2 rounded-xl border text-left transition flex items-center justify-between bg-[#f6f1e6] text-[#475569] border-[#e3dccd] hover:bg-[#efe8da] cursor-pointer';
      btnSelectAdminLogin.onclick = () => {
        selectedLoginJudgeId = 'ADMIN';
        if (loginJudgeIdSelect) loginJudgeIdSelect.value = 'ADMIN';
        if (loginPinInput) {
          loginPinInput.value = '';
          loginPinInput.focus();
        }
        if (loginNameInput) loginNameInput.value = 'Chief Coordinator';
        renderLoginJudgeSlots();
      };
    }

    // Auto-sync or configure assigned event track in modal
    const selectedAssignment = getJudgeAssignment(selectedLoginJudgeId);
    const selectedEvs = getJudgeEvents(selectedAssignment);
    if (selectedEvs.length) {
      if (!selectedEvs.includes(selectedLoginEventId)) {
        selectedLoginEventId = selectedEvs[0];
      }
      if (loginAssignedBadge) {
        loginAssignedBadge.textContent = selectedEvs.length > 1
          ? `Multi-Track: ${selectedEvs.map(e => EVENT_LIB.getEvent(e).shortLabel).join(' & ')}`
          : `Assigned: ${EVENT_LIB.getEvent(selectedEvs[0]).shortLabel}`;
        loginAssignedBadge.className = 'text-[9px] font-black px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200';
      }
    } else {
      if (loginAssignedBadge) {
        loginAssignedBadge.textContent = 'Select Event';
        loginAssignedBadge.className = 'text-[9px] font-black px-2 py-0.5 rounded-full bg-orange-100 text-[#ea580c] border border-orange-200';
      }
    }

    if (loginTrackPills) {
      const trackBtns = loginTrackPills.querySelectorAll('.login-track-btn');
      trackBtns.forEach((btn) => {
        const ev = btn.getAttribute('data-event');
        const isSelected = ev === selectedLoginEventId;
        if (isSelected) {
          btn.className = 'login-track-btn p-2 rounded-xl border-2 text-center transition bg-[#0f172a] text-white border-[#0f172a] shadow-xs cursor-pointer';
        } else {
          btn.className = 'login-track-btn p-2 rounded-xl border text-center transition bg-[#fdfbf7] text-[#1e293b] border-[#e3dccd] hover:bg-[#f6f1e6] cursor-pointer';
        }
        btn.onclick = () => {
          selectedLoginEventId = ev;
          renderLoginJudgeSlots();
        };
      });
    }

    if (loginTrackDesc) {
      const activeEv = EVENT_LIB.getEvent(selectedLoginEventId);
      loginTrackDesc.textContent = `${activeEv.icon} ${activeEv.label} · ${activeEv.venue} (${activeEv.maxTotal} Marks Total)`;
    }
  }

  async function handleLogin() {
    if (loginErrorMessage) loginErrorMessage.classList.add('hidden');
    const judgeId = (loginJudgeIdSelect ? loginJudgeIdSelect.value : selectedLoginJudgeId) || 'INT-1';
    selectedLoginJudgeId = judgeId;
    const pin = loginPinInput ? loginPinInput.value.trim() : '';
    const customName = loginNameInput ? loginNameInput.value.trim() : '';

    if (!pin) {
      showLoginError('Please enter your security PIN.');
      if (loginPinInput) loginPinInput.focus();
      return;
    }

    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          judgeId: judgeId,
          pin: pin,
          judgeName: customName
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        showLoginError(data.error || 'Login failed. Incorrect PIN.');
        return;
      }

      currentJudge = data.judge;
      localStorage.setItem(STORAGE_KEY_AUTH, JSON.stringify(currentJudge));

      // If Admin logged in, open the separate Admin Management Console!
      if (currentJudge.isAdmin || currentJudge.id === 'ADMIN') {
        window.location.href = 'admin.html';
        return;
      }

      // Route judge smoothly to their designated event
      const judgeEvs = getJudgeEvents(currentJudge.assignment);
      const currentPath = (window.location.pathname || '').toLowerCase();
      const onExpo = currentPath.endsWith('expo.html');
      const onPaper = currentPath.endsWith('paper.html');
      const onHack = currentPath.endsWith('hackathon.html');

      let targetEventId = selectedLoginEventId;
      if (onExpo && (judgeEvs.includes('PROJECT_EXPO') || judgeEvs.length === 0)) {
        targetEventId = 'PROJECT_EXPO';
      } else if (onPaper && (judgeEvs.includes('PAPER') || judgeEvs.length === 0)) {
        targetEventId = 'PAPER';
      } else if (onHack && (judgeEvs.includes('EMBEDDATHON') || judgeEvs.length === 0)) {
        targetEventId = 'EMBEDDATHON';
      } else if (judgeEvs.length && !judgeEvs.includes(targetEventId)) {
        targetEventId = judgeEvs[0];
      } else if (!targetEventId) {
        targetEventId = (currentJudge.assignment && currentJudge.assignment.eventId) || activeEventId || 'EMBEDDATHON';
      }

      setActiveEvent(targetEventId);

      // Route judge to the appropriate page
      if (targetEventId === 'PROJECT_EXPO') {
        if (!onExpo) {
          window.location.href = 'expo.html';
          return;
        }
      } else if (targetEventId === 'PAPER') {
        if (!onPaper) {
          window.location.href = 'paper.html';
          return;
        }
      } else {
        if (!onHack) {
          window.location.href = 'hackathon.html';
          return;
        }
      }

      updateActiveJudgeUI();
      loginOverlay.classList.add('hidden');
      loadTeamIntoForm(0);
      renderLeaderboard();
    } catch (e) {
      showLoginError('Network error connecting to evaluation server.');
    }
  }

  function showLoginError(msg) {
    loginErrorMessage.textContent = msg;
    loginErrorMessage.classList.remove('hidden');
  }

  function handleLogout() {
    if (confirm('Switch to a different judge login?')) {
      localStorage.removeItem(STORAGE_KEY_AUTH);
      currentJudge = null;
      window.location.href = 'index.html';
    }
  }

  // -------------------------------------------------------------
  // Progress & Multi-Judge Status
  // -------------------------------------------------------------
  function updateProgressUI() {
    const totalTeams = teams.length;
    let myScoredCount = 0;
    const judgeId = currentJudge ? currentJudge.id : 'INT-1';
    const event = getActiveEvent();

    teams.forEach((t) => {
      const scoreObj = getJudgeEventEval(t.number, judgeId, activeEventId);
      if (scoreObj && hasJudgeScored(scoreObj, activeEventId)) {
        myScoredCount++;
      }
    });

    if (progressPill) {
      progressPill.textContent = `${event.shortLabel}: ${myScoredCount} / ${totalTeams} Scored (${judgeId})`;
    }
  }

  // -------------------------------------------------------------
  // Team Navigation & Form Loading
  // -------------------------------------------------------------
  function loadSavedTeamIndex() {
    try {
      const val = parseInt(localStorage.getItem(STORAGE_KEY_CURRENT), 10);
      if (!isNaN(val) && val >= 0 && val < teams.length) currentTeamIndex = val;
    } catch (e) {}
  }

  function loadTeamIntoForm(index) {
    if (index < 0 || index >= teams.length) return;
    currentTeamIndex = index;
    localStorage.setItem(STORAGE_KEY_CURRENT, index.toString());

    const team = teams[index];
    if (!team) return;
    activeSectionFilter = team.section || 'A';

    if (activeEventId === 'PAPER') {
      if (navSectionBadge) navSectionBadge.textContent = 'TRACK 3 · PAPER';
      if (teamSectionLabel) teamSectionLabel.textContent = `PAPER ${team.number} · MULTIPURPOSE HALL`;
      if (quickSectionSwitchWrapper) quickSectionSwitchWrapper.classList.add('hidden');
    } else if (activeEventId === 'PROJECT_EXPO') {
      const isHw = (team.section === 'HARDWARE' || team.project_type === 'Hardware');
      if (navSectionBadge) navSectionBadge.textContent = isHw ? 'TRACK 2 · HARDWARE' : 'TRACK 2 · SOFTWARE';
      if (teamSectionLabel) teamSectionLabel.textContent = `${team.stall || 'STALL ' + team.number} · EDUSAT HALL`;
      if (quickSectionSwitchWrapper) quickSectionSwitchWrapper.classList.remove('hidden');
    } else {
      if (navSectionBadge) navSectionBadge.textContent = `SECTION ${team.section}`;
      if (teamSectionLabel) teamSectionLabel.textContent = `TEAM PROFILE · SECTION ${team.section}`;
      if (quickSectionSwitchWrapper) quickSectionSwitchWrapper.classList.remove('hidden');
    }

    if (btnSwitchSecA && btnSwitchSecB) {
      const isSecA = activeEventId === 'PROJECT_EXPO'
        ? (team.section === 'HARDWARE' || team.project_type === 'Hardware')
        : team.section === 'A';
      if (isSecA) {
        btnSwitchSecA.className = 'px-2.5 py-1 text-xs font-black rounded bg-[#ea580c] text-white transition shadow-xs';
        btnSwitchSecB.className = 'px-2.5 py-1 text-xs font-semibold rounded text-[#475569] hover:text-[#0f172a] transition';
      } else {
        btnSwitchSecB.className = 'px-2.5 py-1 text-xs font-black rounded bg-[#ea580c] text-white transition shadow-xs';
        btnSwitchSecA.className = 'px-2.5 py-1 text-xs font-semibold rounded text-[#475569] hover:text-[#0f172a] transition';
      }
    }

    if (teamBigNumber) teamBigNumber.textContent = team.number;
    if (teamBigName) teamBigName.textContent = team.name;
    if (teamSubtitle) {
      if (activeEventId === 'PAPER') {
        const clg = team.college ? ` · ${team.college}` : '';
        teamSubtitle.textContent = `${team.slot || 'PP-' + team.number} · ${team.venue || 'Multipurpose Hall'}${clg} · Dept: ${team.dept || 'Engineering'}`;
      } else if (activeEventId === 'PROJECT_EXPO') {
        const clg = team.college ? ` · ${team.college}` : '';
        teamSubtitle.textContent = `${team.stall || 'Stall ' + team.number} · ${team.venue || 'Edusat Hall'}${clg} · Dept: ${team.dept || 'Engineering'}`;
      } else {
        teamSubtitle.textContent = `${team.member_count || (team.members ? team.members.length : 4)} members · Section ${team.section} · Labs 1 & 2`;
      }
    }
    if (memberCountBadge) {
      if (activeEventId === 'PAPER') memberCountBadge.textContent = team.lead ? `AUTHOR: ${team.lead}` : 'RESEARCH PAPER';
      else if (activeEventId === 'PROJECT_EXPO') memberCountBadge.textContent = team.stall || `STALL ${team.number}`;
      else memberCountBadge.textContent = `${team.member_count || (team.members ? team.members.length : 4)} REGISTERED`;
    }

    if (bnavTeamLabel) {
      const prefix = activeEventId === 'PAPER' ? 'Paper #' : activeEventId === 'PROJECT_EXPO' ? 'Stall #' : 'Team #';
      bnavTeamLabel.textContent = `Save ${prefix}${team.number}`;
    }

    renderTeamMembers(team.members || (team.lead ? [{ slot: '01', name: team.lead, is_lead: true }] : []));
    applyEventMode();
    loadCurrentJudgeScoresForTeam();
    renderJuryConsensus();
    renderTeamPills();

    if (saveFeedbackNotice) saveFeedbackNotice.classList.add('hidden');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function renderTeamMembers(members) {
    if (!membersContainer) return;
    membersContainer.innerHTML = '';
    (members || []).forEach((m, idx) => {
      const isLead = idx === 0 || m.is_lead;
      const card = document.createElement('div');
      card.className = `p-2 rounded-xl border transition flex items-center justify-between gap-2 ${
        isLead ? 'bg-[#fff8f3] border-[#fed7aa] shadow-xs' : 'bg-white border-[#e3dccd]'
      }`;

      card.innerHTML = `
        <div class="flex items-center gap-2 min-w-0">
          <span class="text-xs font-black font-serif-pace ${isLead ? 'text-[#ea580c]' : 'text-[#64748b]'}">
            ${m.slot || (idx + 1).toString().padStart(2, '0')}
          </span>
          <div class="truncate">
            <div class="flex items-center gap-1 truncate">
              <span class="text-xs font-bold text-[#1e293b] truncate">${m.name}</span>
              ${isLead ? '<span class="text-[9px] font-black px-1.5 py-0.2 rounded bg-[#ea580c] text-white uppercase">Lead</span>' : ''}
            </div>
            ${m.usn ? `
            <div class="text-[10px] text-[#64748b] flex items-center gap-1.5 truncate">
              <span class="font-mono font-medium">${m.usn}</span>
              ${m.sem_sec ? `<span>·</span><span>${m.sem_sec}</span>` : ''}
            </div>` : ''}
          </div>
        </div>
        <div class="text-right text-[10px] text-[#64748b] font-medium hidden sm:block">
          PA College of Engg.
        </div>
      `;

      membersContainer.appendChild(card);
    });
  }

  function loadCurrentJudgeScoresForTeam() {
    const team = teams[currentTeamIndex];
    if (!team) return;

    const judgeId = currentJudge ? currentJudge.id : 'INT-1';
    const evalData = getJudgeEventEval(team.number, judgeId, activeEventId) || {};

    if (isSingleEventMode()) {
      const event = getActiveEvent();
      event.criteria.forEach((criterion) => {
        const input = singleEventInputs[criterion.key];
        if (!input) return;
        const value = evalData.scores && evalData.scores[criterion.key] !== undefined
          ? evalData.scores[criterion.key]
          : '';
        input.value = value;
      });
    } else {
      // Populate Phase 1
      if (inputP1Crit1) inputP1Crit1.value = evalData.p1_crit1 !== undefined ? evalData.p1_crit1 : '';
      if (inputP1Crit2) inputP1Crit2.value = evalData.p1_crit2 !== undefined ? evalData.p1_crit2 : '';
      if (inputP1Crit3) inputP1Crit3.value = evalData.p1_crit3 !== undefined ? evalData.p1_crit3 : '';

      // Populate Phase 2
      if (inputP2Crit1) inputP2Crit1.value = evalData.p2_crit1 !== undefined ? evalData.p2_crit1 : '';
      if (inputP2Crit2) inputP2Crit2.value = evalData.p2_crit2 !== undefined ? evalData.p2_crit2 : '';
      if (inputP2Crit3) inputP2Crit3.value = evalData.p2_crit3 !== undefined ? evalData.p2_crit3 : '';
      if (inputP2Crit4) inputP2Crit4.value = evalData.p2_crit4 !== undefined ? evalData.p2_crit4 : '';
    }

    if (inputRemarks) inputRemarks.value = evalData.remarks || '';

    recalculateScores();
  }

  function recalculateScores() {
    let activeScore = 0;
    let maxPossible = 30;

    if (isSingleEventMode()) {
      const event = getActiveEvent();
      activeScore = 0;
      maxPossible = event.maxTotal;
      event.criteria.forEach((criterion) => {
        const input = singleEventInputs[criterion.key];
        const value = Math.min(criterion.max, Math.max(0, parseFloat(input && input.value) || 0));
        activeScore += value;
      });
      activeScore = Number(activeScore.toFixed(1));
    } else {
      const p1_c1 = Math.min(10, Math.max(0, parseFloat(inputP1Crit1?.value) || 0));
      const p1_c2 = Math.min(10, Math.max(0, parseFloat(inputP1Crit2?.value) || 0));
      const p1_c3 = Math.min(10, Math.max(0, parseFloat(inputP1Crit3?.value) || 0));
      const p1_total = Number((p1_c1 + p1_c2 + p1_c3).toFixed(1));

      const p2_c1 = Math.min(25, Math.max(0, parseFloat(inputP2Crit1?.value) || 0));
      const p2_c2 = Math.min(20, Math.max(0, parseFloat(inputP2Crit2?.value) || 0));
      const p2_c3 = Math.min(15, Math.max(0, parseFloat(inputP2Crit3?.value) || 0));
      const p2_c4 = Math.min(10, Math.max(0, parseFloat(inputP2Crit4?.value) || 0));
      const p2_total = Number((p2_c1 + p2_c2 + p2_c3 + p2_c4).toFixed(1));

      if (currentJudge && currentJudge.type === 'INTERNAL') {
        activeScore = p1_total;
        maxPossible = 30;
      } else if (currentJudge && currentJudge.type === 'EXTERNAL') {
        activeScore = p2_total;
        maxPossible = 70;
      } else {
        // Admin
        activeScore = Number((p1_total + p2_total).toFixed(1));
        maxPossible = 100;
      }
    }

    if (displayScoreValue) displayScoreValue.textContent = activeScore;
    if (bnavScoreLabel) bnavScoreLabel.textContent = `Score: ${activeScore} / ${maxPossible}`;

    // Rating badge calculation
    const pct = maxPossible > 0 ? (activeScore / maxPossible) * 100 : 0;
    if (scoreRatingBadge) {
      if (activeScore === 0) {
        scoreRatingBadge.textContent = 'Not Scored';
        scoreRatingBadge.className = 'inline-block text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-slate-100 text-[#64748b]';
      } else if (pct >= 85) {
        scoreRatingBadge.textContent = 'Outstanding';
        scoreRatingBadge.className = 'inline-block text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800';
      } else if (pct >= 70) {
        scoreRatingBadge.textContent = 'Good';
        scoreRatingBadge.className = 'inline-block text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-blue-100 text-blue-800';
      } else if (pct >= 50) {
        scoreRatingBadge.textContent = 'Satisfactory';
        scoreRatingBadge.className = 'inline-block text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-100 text-amber-800';
      } else {
        scoreRatingBadge.textContent = 'Needs Work';
        scoreRatingBadge.className = 'inline-block text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-rose-100 text-rose-800';
      }
    }
  }

  // -------------------------------------------------------------
  // Jury Consensus Panel
  // -------------------------------------------------------------
  function renderJuryConsensus() {
    const team = teams[currentTeamIndex];
    if (!team) return;

    const event = getActiveEvent();
    const teamEvals = getTeamEventEvals(team.number, activeEventId);

    if (event.mode === 'SINGLE') {
      if (juryConsensusTitle) juryConsensusTitle.textContent = `${event.icon} ${event.label} Jury Consensus`;
      if (dualPhaseConsensusGrid) dualPhaseConsensusGrid.classList.add('hidden');
      if (singleEventConsensusPanel) singleEventConsensusPanel.classList.remove('hidden');
      if (grandCumulativeBox) grandCumulativeBox.classList.add('hidden');

      const judgeMap = {};
      getAllJudges().forEach((j) => {
        const assignment = getJudgeAssignment(j.id);
        const assignedEvs = getJudgeEvents(assignment);
        const isAssignedHere = assignedEvs.length === 0 || assignedEvs.includes(activeEventId) || assignedEvs.includes('ALL');
        const isCurrent = currentJudge && currentJudge.id === j.id;
        if (isAssignedHere || isCurrent) judgeMap[j.id] = j;
      });
      Object.keys(teamEvals).forEach((judgeId) => {
        if (!judgeMap[judgeId]) {
          judgeMap[judgeId] = { id: judgeId, name: teamEvals[judgeId].judgeName || judgeId };
        }
      });

      const scoredTotals = [];
      if (singleEventJudgeBadges) {
        singleEventJudgeBadges.innerHTML = '';
        Object.keys(judgeMap).forEach((judgeId) => {
          const judge = judgeMap[judgeId];
          const ev = teamEvals[judgeId];
          const hasScored = ev && Number(ev.total) > 0;
          if (hasScored) scoredTotals.push(Number(ev.total));

          const row = document.createElement('div');
          row.className = 'flex items-center justify-between text-[10px] py-0.5';
          row.innerHTML = `
            <span class="font-bold truncate text-[#1e293b]">${judge.name}:</span>
            <span class="font-mono font-black ${hasScored ? 'text-emerald-700' : 'text-[#94a3b8]'}">
              ${hasScored ? `${ev.total} / ${event.maxTotal}` : 'Pending'}
            </span>
          `;
          singleEventJudgeBadges.appendChild(row);
        });
      }

      if (singleEventJuryLabel) singleEventJuryLabel.textContent = `${event.shortLabel} Jury`;
      if (singleEventAvgMax) singleEventAvgMax.textContent = `/ ${event.maxTotal}`;
      if (singleEventConsensusLabel) singleEventConsensusLabel.textContent = `${event.icon} ${event.shortLabel} Jury Average:`;
      if (singleEventConsensusTotal) singleEventConsensusTotal.textContent = '/ ' + event.maxTotal;

      const avg = scoredTotals.length
        ? Number((scoredTotals.reduce((a, b) => a + b, 0) / scoredTotals.length).toFixed(1))
        : 0;
      const avgText = scoredTotals.length ? `${avg} / ${event.maxTotal}` : `— / ${event.maxTotal}`;
      if (singleEventAvgDisplay) singleEventAvgDisplay.textContent = avgText;
      if (singleEventConsensusTotal) singleEventConsensusTotal.textContent = avgText;

      if (singleEventCriteriaAverages) {
        singleEventCriteriaAverages.innerHTML = '';
        event.criteria.forEach((criterion) => {
          const values = Object.values(teamEvals)
            .filter((ev) => ev && ev.scores && Number(ev.scores[criterion.key]) > 0)
            .map((ev) => Number(ev.scores[criterion.key]));
          const cAvg = values.length
            ? (values.reduce((a, b) => a + b, 0) / values.length).toFixed(1)
            : '—';
          const row = document.createElement('div');
          row.className = 'flex items-center justify-between gap-1';
          row.innerHTML = `
            <span class="truncate text-[#475569] font-semibold">${criterion.label}</span>
            <span class="font-mono font-black text-[#1e293b]">${cAvg} / ${criterion.max}</span>
          `;
          singleEventCriteriaAverages.appendChild(row);
        });
      }

      if (phaseStatusSummaryBadge) {
        phaseStatusSummaryBadge.textContent = `${event.icon} ${event.shortLabel} · ${scoredTotals.length} scored`;
        phaseStatusSummaryBadge.className = 'text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200';
      }
      return;
    }

    if (juryConsensusTitle) juryConsensusTitle.textContent = 'Jury Status & Consensus';
    if (dualPhaseConsensusGrid) dualPhaseConsensusGrid.classList.remove('hidden');
    if (singleEventConsensusPanel) singleEventConsensusPanel.classList.add('hidden');
    if (grandCumulativeBox) grandCumulativeBox.classList.remove('hidden');

    const internalList = juryConfig.internalJudges || [];
    const externalList = juryConfig.externalJudges || [];

    // Render Internal Judges
    if (internalJudgesBadges) {
      internalJudgesBadges.innerHTML = '';
      const p1Scores = [];

      internalList.forEach((j) => {
        const ev = teamEvals[j.id];
        const hasScored = ev && typeof ev.phase1 === 'number' && ev.phase1 > 0;
        if (hasScored) p1Scores.push(ev.phase1);

        const row = document.createElement('div');
        row.className = 'flex items-center justify-between text-[10px] py-0.5';
        row.innerHTML = `
          <span class="font-bold truncate text-[#1e293b]">${j.name}:</span>
          <span class="font-mono font-black ${hasScored ? 'text-emerald-700' : 'text-[#94a3b8]'}">
            ${hasScored ? `${ev.phase1} pts` : 'Pending'}
          </span>
        `;
        internalJudgesBadges.appendChild(row);
      });

      const p1Avg = p1Scores.length ? (p1Scores.reduce((a, b) => a + b, 0) / p1Scores.length).toFixed(1) : '—';
      if (internalAvgDisplay) {
        internalAvgDisplay.textContent = p1Avg !== '—' ? `${p1Avg} / 30` : '— / 30';
      }
    }

    // Render External Judges
    if (externalJudgesBadges) {
      externalJudgesBadges.innerHTML = '';
      const p2Scores = [];

      externalList.forEach((j) => {
        const ev = teamEvals[j.id];
        const hasScored = ev && typeof ev.phase2 === 'number' && ev.phase2 > 0;
        if (hasScored) p2Scores.push(ev.phase2);

        const row = document.createElement('div');
        row.className = 'flex items-center justify-between text-[10px] py-0.5';
        row.innerHTML = `
          <span class="font-bold truncate text-[#1e293b]">${j.name}:</span>
          <span class="font-mono font-black ${hasScored ? 'text-emerald-700' : 'text-[#94a3b8]'}">
            ${hasScored ? `${ev.phase2} pts` : 'Pending'}
          </span>
        `;
        externalJudgesBadges.appendChild(row);
      });

      const p2Avg = p2Scores.length ? (p2Scores.reduce((a, b) => a + b, 0) / p2Scores.length).toFixed(1) : '—';
      if (externalAvgDisplay) {
        externalAvgDisplay.textContent = p2Avg !== '—' ? `${p2Avg} / 70` : '— / 70';
      }
    }

    // Calculate Grand Cumulative Score
    if (cumulativeScoreDisplay) {
      const p1AvgNum = parseFloat(internalAvgDisplay ? internalAvgDisplay.textContent : '0') || 0;
      const p2AvgNum = parseFloat(externalAvgDisplay ? externalAvgDisplay.textContent : '0') || 0;
      const totalCombined = (p1AvgNum + p2AvgNum).toFixed(1);

      if (p1AvgNum > 0 || p2AvgNum > 0) {
        cumulativeScoreDisplay.textContent = `${totalCombined} / 100`;
      } else {
        cumulativeScoreDisplay.textContent = '— / 100';
      }
    }

    updatePhaseNotice();
  }

  // -------------------------------------------------------------
  // Save Evaluation
  // -------------------------------------------------------------
  async function saveCurrentEvaluation() {
    if (!currentJudge) {
      loginOverlay.classList.remove('hidden');
      return;
    }

    const team = teams[currentTeamIndex];
    if (!team) return;

    const event = getActiveEvent();
    let payload;
    let record;

    if (event.mode === 'SINGLE') {
      const scores = {};
      let total = 0;
      event.criteria.forEach((criterion) => {
        const input = singleEventInputs[criterion.key];
        const value = Math.min(criterion.max, Math.max(0, parseFloat(input && input.value) || 0));
        scores[criterion.key] = Number(value.toFixed(1));
        total += scores[criterion.key];
      });

      payload = {
        eventId: event.id,
        teamNumber: team.number,
        judgeId: currentJudge.id,
        judgeName: currentJudge.name,
        scores: scores,
        remarks: inputRemarks ? inputRemarks.value.trim() : '',
        updatedAt: new Date().toISOString()
      };

      record = {
        ...payload,
        eventLabel: event.label,
        total: Number(total.toFixed(1))
      };
    } else {
      const p1_c1 = Math.min(10, Math.max(0, parseFloat(inputP1Crit1?.value) || 0));
      const p1_c2 = Math.min(10, Math.max(0, parseFloat(inputP1Crit2?.value) || 0));
      const p1_c3 = Math.min(10, Math.max(0, parseFloat(inputP1Crit3?.value) || 0));

      const p2_c1 = Math.min(25, Math.max(0, parseFloat(inputP2Crit1?.value) || 0));
      const p2_c2 = Math.min(20, Math.max(0, parseFloat(inputP2Crit2?.value) || 0));
      const p2_c3 = Math.min(15, Math.max(0, parseFloat(inputP2Crit3?.value) || 0));
      const p2_c4 = Math.min(10, Math.max(0, parseFloat(inputP2Crit4?.value) || 0));

      payload = {
        eventId: 'EMBEDDATHON',
        teamNumber: team.number,
        judgeId: currentJudge.id,
        judgeName: currentJudge.name,
        p1_crit1: p1_c1,
        p1_crit2: p1_c2,
        p1_crit3: p1_c3,
        p2_crit1: p2_c1,
        p2_crit2: p2_c2,
        p2_crit3: p2_c3,
        p2_crit4: p2_c4,
        remarks: inputRemarks ? inputRemarks.value.trim() : '',
        updatedAt: new Date().toISOString()
      };

      record = {
        ...payload,
        phase1: Number((p1_c1 + p1_c2 + p1_c3).toFixed(1)),
        phase2: Number((p2_c1 + p2_c2 + p2_c3 + p2_c4).toFixed(1)),
        total: Number((p1_c1 + p1_c2 + p1_c3 + p2_c1 + p2_c2 + p2_c3 + p2_c4).toFixed(1))
      };
    }

    // Update local cache optimistically
    setJudgeEventEval(event.id, team.number, currentJudge.id, record);

    renderJuryConsensus();
    renderTeamPills();
    renderTeamGridModal();
    updateProgressUI();

    // Show feedback banner
    if (saveFeedbackNotice) {
      saveFeedbackNotice.textContent = `✓ ${event.shortLabel} score for Team #${team.number} saved and synced!`;
      saveFeedbackNotice.classList.remove('hidden');
      setTimeout(() => {
        saveFeedbackNotice.classList.add('hidden');
      }, 2500);
    }

    // Send to server
    try {
      await fetch('/api/evaluations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    } catch (e) {
      console.warn('Saved score locally, will sync when online');
    }
  }

  // -------------------------------------------------------------
  // Team Navigation Pills & Grid Modal
  // -------------------------------------------------------------
  function renderTeamPills() {
    if (!teamPillsRow) return;
    teamPillsRow.innerHTML = '';

    const currentJudgeId = currentJudge ? currentJudge.id : 'INT-1';

    teams.forEach((t, idx) => {
      const isSelected = idx === currentTeamIndex;
      const evalObj = getJudgeEventEval(t.number, currentJudgeId, activeEventId);
      const isScoredByMe = evalObj && hasJudgeScored(evalObj, activeEventId);

      const pill = document.createElement('button');
      pill.type = 'button';
      pill.className = `flex-shrink-0 px-3 py-1.5 rounded-xl border text-xs font-black font-serif-pace transition flex items-center gap-1.5 ${
        isSelected
          ? 'bg-[#ea580c] text-white border-[#ea580c] shadow-xs'
          : isScoredByMe
          ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
          : 'bg-white text-[#1e293b] border-[#cbd5e1]'
      }`;

      pill.innerHTML = `
        <span>#${t.number}</span>
        ${isScoredByMe ? '<span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>' : ''}
      `;

      pill.addEventListener('click', () => {
        loadTeamIntoForm(idx);
      });

      teamPillsRow.appendChild(pill);
    });
  }

  function renderTeamGridModal() {
    if (!gridSectionA || !gridSectionB) return;
    gridSectionA.innerHTML = '';
    gridSectionB.innerHTML = '';

    const currentJudgeId = currentJudge ? currentJudge.id : 'INT-1';
    const isSingle = isSingleEventMode();

    teams.forEach((t, idx) => {
      const isSelected = idx === currentTeamIndex;
      const evalObj = getJudgeEventEval(t.number, currentJudgeId, activeEventId);
      const hasScore = evalObj && hasJudgeScored(evalObj, activeEventId);

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `p-2 rounded-xl border text-center transition flex flex-col items-center justify-center ${
        isSelected
          ? 'bg-[#ea580c] text-white border-[#ea580c]'
          : hasScore
          ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
          : 'bg-white text-[#1e293b] border-[#e3dccd]'
      }`;

      btn.innerHTML = `
        <span class="text-xs font-black font-serif-pace">#${t.number}</span>
        <span class="text-[9px] font-bold truncate max-w-full">${t.name}</span>
      `;

      btn.addEventListener('click', () => {
        modalTeamGrid.classList.add('hidden');
        loadTeamIntoForm(idx);
      });

      if (activeEventId === 'PAPER') {
        gridSectionA.appendChild(btn);
      } else if (activeEventId === 'PROJECT_EXPO') {
        if (t.section === 'HARDWARE' || t.project_type === 'Hardware') {
          gridSectionA.appendChild(btn);
        } else {
          gridSectionB.appendChild(btn);
        }
      } else if (t.section === 'A') {
        gridSectionA.appendChild(btn);
      } else {
        gridSectionB.appendChild(btn);
      }
    });
  }

  // -------------------------------------------------------------
  // Roster Directory View
  // -------------------------------------------------------------
  function renderRosterList(filterQuery = '') {
    if (!rosterListGrid) return;
    rosterListGrid.innerHTML = '';

    const query = filterQuery.toLowerCase().trim();
    let count = 0;

    teams.forEach((t, idx) => {
      let matchSection = true;
      if (activeEventId === 'EMBEDDATHON') {
        matchSection = activeSectionFilter === 'ALL' || t.section === activeSectionFilter;
      } else if (activeEventId === 'PROJECT_EXPO') {
        if (activeSectionFilter === 'ALL' || activeSectionFilter === 'all') matchSection = true;
        else if (activeSectionFilter === 'Hardware' || activeSectionFilter === 'HARDWARE') matchSection = (t.section === 'HARDWARE' || t.project_type === 'Hardware');
        else if (activeSectionFilter === 'Software' || activeSectionFilter === 'SOFTWARE') matchSection = (t.section === 'SOFTWARE' || t.project_type === 'Software');
      }
      const matchQuery =
        !query ||
        t.number.includes(query) ||
        t.name.toLowerCase().includes(query) ||
        (t.members && t.members.some((m) => (m.name && m.name.toLowerCase().includes(query)) || (m.usn && m.usn.toLowerCase().includes(query)))) ||
        (t.lead && t.lead.toLowerCase().includes(query));

      if (matchSection && matchQuery) {
        count++;
        const card = document.createElement('div');
        card.className =
          'p-3 bg-white rounded-xl border border-[#e3dccd] hover:border-[#ea580c] transition cursor-pointer shadow-xs flex items-center justify-between gap-3';

        const event = getActiveEvent();
        const teamEvals = getTeamEventEvals(t.number, activeEventId);

        let scoreSummaryHtml = '';

        if (event.mode === 'SINGLE') {
          const totals = Object.values(teamEvals)
            .filter((x) => x && Number(x.total) > 0)
            .map((x) => Number(x.total));
          const avg = totals.length
            ? (totals.reduce((a, b) => a + b, 0) / totals.length).toFixed(1)
            : '—';
          scoreSummaryHtml = `
            <div class="text-[10px] font-bold text-[#64748b]">Avg: <span class="font-black text-[#ea580c]">${avg}</span> / ${event.maxTotal}</div>
            <div class="text-[10px] font-bold text-[#64748b]">${totals.length} judge${totals.length === 1 ? '' : 's'}</div>
          `;
        } else {
          const p1Scores = Object.values(teamEvals).filter((x) => x && x.phase1 > 0).map((x) => x.phase1);
          const p2Scores = Object.values(teamEvals).filter((x) => x && x.phase2 > 0).map((x) => x.phase2);
          const p1Avg = p1Scores.length ? (p1Scores.reduce((a, b) => a + b, 0) / p1Scores.length).toFixed(1) : '—';
          const p2Avg = p2Scores.length ? (p2Scores.reduce((a, b) => a + b, 0) / p2Scores.length).toFixed(1) : '—';
          scoreSummaryHtml = `
            <div class="text-[10px] font-bold text-[#64748b]">P1: <span class="font-black text-[#ea580c]">${p1Avg}</span> / 30</div>
            <div class="text-[10px] font-bold text-[#64748b]">P2: <span class="font-black text-[#ea580c]">${p2Avg}</span> / 70</div>
          `;
        }

        const secBadge = activeEventId === 'PAPER'
          ? 'Track 3 · Paper'
          : activeEventId === 'PROJECT_EXPO'
          ? (t.stall || 'Track 2 · Expo')
          : `Sec ${t.section}`;
        const leadText = t.lead || (t.members && t.members[0] ? t.members[0].name : 'N/A');
        const countText = t.member_count ? `${t.member_count} Members` : (t.dept || 'Engineering');

        card.innerHTML = `
          <div class="flex items-center gap-2.5 min-w-0">
            <span class="text-sm font-black font-serif-pace text-[#ea580c] bg-[#fff8f3] px-2 py-1 rounded-lg border border-[#fed7aa]">
              #${t.number}
            </span>
            <div class="min-w-0">
              <div class="flex items-center gap-1.5 truncate">
                <span class="text-xs font-black text-[#0f172a] truncate">${t.name}</span>
                <span class="text-[9px] font-bold px-1.5 py-0.2 rounded bg-slate-100 text-[#475569]">${secBadge}</span>
              </div>
              <p class="text-[10px] text-[#64748b] truncate">
                Lead: ${leadText} · ${countText}${t.college ? ' · ' + t.college : ''}
              </p>
            </div>
          </div>
          <div class="text-right flex-shrink-0">
            ${scoreSummaryHtml}
          </div>
        `;

        card.addEventListener('click', () => {
          switchView('scoring');
          loadTeamIntoForm(idx);
        });

        rosterListGrid.appendChild(card);
      }
    });

    if (rosterShowingCount) {
      rosterShowingCount.textContent = `${count} teams`;
    }
  }

  // -------------------------------------------------------------
  // Standings / Leaderboard View
  // -------------------------------------------------------------
  function renderLeaderboard() {
    if (!leaderboardTbody) return;
    leaderboardTbody.innerHTML = '';

    const event = getActiveEvent();
    const selectedSec = leaderboardSectionSelect ? leaderboardSectionSelect.value : 'ALL';
    if (leaderboardEventSelect) leaderboardEventSelect.value = activeEventId;

    if (leaderboardTitle) leaderboardTitle.textContent = `${event.icon} ${event.label} Standings`;
    if (leaderboardSubtitle) {
      leaderboardSubtitle.textContent = event.mode === 'SINGLE'
        ? `Live jury ranking · total ${event.maxTotal} marks (${event.criteria.map((c) => c.max).join(' + ')})`
        : 'Phase 1 (30%) + Phase 2 (70%) = Total (100%)';
    }

    if (leaderboardThead) {
      if (event.mode === 'SINGLE') {
        leaderboardThead.innerHTML = `
          <tr class="bg-[#f6f1e6] border-b border-[#e3dccd] text-[#64748b] font-bold uppercase text-[10px]">
            <th class="py-2 px-2 text-center w-8">#</th>
            <th class="py-2 px-2 w-10 font-serif-pace text-[#ea580c]">Team</th>
            <th class="py-2 px-2.5">Team Name</th>
            <th class="py-2 px-1 text-center">Sec</th>
            <th class="py-2 px-2 text-center">Judges</th>
            <th class="py-2 px-2.5 text-right font-black text-[#ea580c]">Avg / ${event.maxTotal}</th>
            <th class="py-2 px-2 text-center w-12">Action</th>
          </tr>
        `;
      } else {
        leaderboardThead.innerHTML = `
          <tr class="bg-[#f6f1e6] border-b border-[#e3dccd] text-[#64748b] font-bold uppercase text-[10px]">
            <th class="py-2 px-2 text-center w-8">#</th>
            <th class="py-2 px-2 w-10 font-serif-pace text-[#ea580c]">Team</th>
            <th class="py-2 px-2.5">Team Name</th>
            <th class="py-2 px-1 text-center">Sec</th>
            <th class="py-2 px-2 text-right font-bold text-slate-700">P1 (30)</th>
            <th class="py-2 px-2 text-right font-bold text-slate-700">P2 (70)</th>
            <th class="py-2 px-2.5 text-right font-black text-[#ea580c]">Total</th>
            <th class="py-2 px-2 text-center w-12">Action</th>
          </tr>
        `;
      }
    }

    const ranked = getEventStandings(activeEventId)
      .filter((item) => selectedSec === 'ALL' || item.team.section === selectedSec)
      .sort((a, b) => b.grandTotal - a.grandTotal);

    ranked.forEach((item, rankIdx) => {
      const tr = document.createElement('tr');
      tr.className = rankIdx % 2 === 0 ? 'bg-white' : 'bg-[#fdfbf7]';

      if (event.mode === 'SINGLE') {
        tr.innerHTML = `
          <td class="py-2.5 px-2 text-center font-bold text-[#64748b] text-[11px]">${rankIdx + 1}</td>
          <td class="py-2.5 px-2 font-black font-serif-pace text-[#ea580c]">#${item.team.number}</td>
          <td class="py-2.5 px-2.5 font-bold text-[#0f172a] truncate max-w-[140px]">${item.team.name}</td>
          <td class="py-2.5 px-1 text-center font-bold text-[#64748b] text-[10px]">${item.team.section}</td>
          <td class="py-2.5 px-2 text-center font-bold text-[#64748b]">${item.numJudges}</td>
          <td class="py-2.5 px-2.5 text-right font-black text-sm text-[#ea580c]">${item.grandTotal > 0 ? `${item.grandTotal} / ${event.maxTotal}` : '—'}</td>
          <td class="py-2.5 px-2 text-center">
            <button type="button" class="btn-grade-team px-2 py-0.5 rounded text-[10px] font-black bg-[#f6f1e6] hover:bg-[#ea580c] hover:text-white transition" data-num="${item.team.number}">
              Score
            </button>
          </td>
        `;
      } else {
        tr.innerHTML = `
          <td class="py-2.5 px-2 text-center font-bold text-[#64748b] text-[11px]">${rankIdx + 1}</td>
          <td class="py-2.5 px-2 font-black font-serif-pace text-[#ea580c]">#${item.team.number}</td>
          <td class="py-2.5 px-2.5 font-bold text-[#0f172a] truncate max-w-[140px]">${item.team.name}</td>
          <td class="py-2.5 px-1 text-center font-bold text-[#64748b] text-[10px]">${item.team.section}</td>
          <td class="py-2.5 px-2 text-right font-bold text-slate-700">${item.p1Avg > 0 ? item.p1Avg : '—'}</td>
          <td class="py-2.5 px-2 text-right font-bold text-slate-700">${item.p2Avg > 0 ? item.p2Avg : '—'}</td>
          <td class="py-2.5 px-2.5 text-right font-black text-sm text-[#ea580c]">${item.grandTotal > 0 ? item.grandTotal : '—'}</td>
          <td class="py-2.5 px-2 text-center">
            <button type="button" class="btn-grade-team px-2 py-0.5 rounded text-[10px] font-black bg-[#f6f1e6] hover:bg-[#ea580c] hover:text-white transition" data-num="${item.team.number}">
              Score
            </button>
          </td>
        `;
      }

      tr.querySelector('.btn-grade-team').addEventListener('click', () => {
        const idx = teams.findIndex((x) => x.number === item.team.number);
        if (idx !== -1) {
          switchView('scoring');
          loadTeamIntoForm(idx);
        }
      });

      leaderboardTbody.appendChild(tr);
    });
  }

  // -------------------------------------------------------------
  // Admin Jury & Phase Configuration Modal
  // -------------------------------------------------------------
  function openAdminSetupModal() {
    if (!currentJudge || !currentJudge.isAdmin) {
      // Must be Admin
      selectedLoginJudgeId = 'ADMIN';
      loginPinInput.value = '';
      if (loginNameInput) loginNameInput.value = 'Chief Coordinator';
      renderLoginJudgeSlots();
      loginOverlay.classList.remove('hidden');
      return;
    }

    // Clone juryConfig to draft
    draftAdminConfig = JSON.parse(JSON.stringify(juryConfig));
    renderAdminSetupUI();
    modalJurySetup.classList.remove('hidden');
  }

  function renderAdminSetupUI() {
    if (!draftAdminConfig) return;

    // 1. Phase activation buttons
    const phaseBtns = phaseActivationButtonGroup.querySelectorAll('.btn-phase-toggle');
    phaseBtns.forEach((btn) => {
      const p = btn.getAttribute('data-phase');
      const isSelected = draftAdminConfig.activePhase === p;
      if (isSelected) {
        btn.className =
          'btn-phase-toggle p-2 text-left rounded-lg border font-bold flex items-center justify-between transition bg-[#fff7ed] border-[#ea580c] text-[#ea580c]';
      } else {
        btn.className =
          'btn-phase-toggle p-2 text-left rounded-lg border font-bold flex items-center justify-between transition bg-white border-[#cbd5e1] text-[#475569] hover:bg-[#f6f1e6]';
      }
    });

    // 2. Internal Judges List (Phase 1)
    adminInternalJudgesList.innerHTML = '';
    (draftAdminConfig.internalJudges || []).forEach((j, index) => {
      const row = document.createElement('div');
      row.className = 'p-2 rounded-lg border border-[#e3dccd] bg-[#fdfbf7] space-y-1';
      row.innerHTML = `
        <div class="flex items-center justify-between">
          <span class="text-[10px] font-black text-[#ea580c] uppercase">${j.id}</span>
          ${
            draftAdminConfig.internalJudges.length > 1
              ? `<button type="button" class="btn-del-int text-[9px] text-red-600 font-bold hover:underline" data-idx="${index}">Remove</button>`
              : ''
          }
        </div>
        <div class="grid grid-cols-2 gap-1.5">
          <input type="text" value="${j.name}" placeholder="Judge Name" class="input-int-name px-2 py-1 text-xs border border-[#cbd5e1] rounded bg-white font-bold text-[#0f172a]" data-idx="${index}">
          <input type="text" value="${j.pin}" placeholder="PIN (e.g. 1111)" class="input-int-pin px-2 py-1 text-xs border border-[#cbd5e1] rounded bg-white font-mono text-[#0f172a]" data-idx="${index}">
        </div>
        <input type="text" value="${j.role || ''}" placeholder="Designation / Role" class="input-int-role w-full px-2 py-1 text-[11px] border border-[#cbd5e1] rounded bg-white text-[#64748b]" data-idx="${index}">
      `;

      adminInternalJudgesList.appendChild(row);
    });

    // 3. External Judges List (Phase 2)
    adminExternalJudgesList.innerHTML = '';
    (draftAdminConfig.externalJudges || []).forEach((j, index) => {
      const row = document.createElement('div');
      row.className = 'p-2 rounded-lg border border-[#e3dccd] bg-[#fdfbf7] space-y-1';
      row.innerHTML = `
        <div class="flex items-center justify-between">
          <span class="text-[10px] font-black text-[#ea580c] uppercase">${j.id}</span>
          ${
            draftAdminConfig.externalJudges.length > 1
              ? `<button type="button" class="btn-del-ext text-[9px] text-red-600 font-bold hover:underline" data-idx="${index}">Remove</button>`
              : ''
          }
        </div>
        <div class="grid grid-cols-2 gap-1.5">
          <input type="text" value="${j.name}" placeholder="Judge Name" class="input-ext-name px-2 py-1 text-xs border border-[#cbd5e1] rounded bg-white font-bold text-[#0f172a]" data-idx="${index}">
          <input type="text" value="${j.pin}" placeholder="PIN (e.g. 3333)" class="input-ext-pin px-2 py-1 text-xs border border-[#cbd5e1] rounded bg-white font-mono text-[#0f172a]" data-idx="${index}">
        </div>
        <input type="text" value="${j.role || ''}" placeholder="Designation / Company / Jury" class="input-ext-role w-full px-2 py-1 text-[11px] border border-[#cbd5e1] rounded bg-white text-[#64748b]" data-idx="${index}">
      `;

      adminExternalJudgesList.appendChild(row);
    });

    bindAdminDynamicInputs();
  }

  function bindAdminDynamicInputs() {
    // Phase selector buttons
    const phaseBtns = phaseActivationButtonGroup.querySelectorAll('.btn-phase-toggle');
    phaseBtns.forEach((btn) => {
      btn.onclick = () => {
        draftAdminConfig.activePhase = btn.getAttribute('data-phase');
        renderAdminSetupUI();
      };
    });

    // Internal inputs
    adminInternalJudgesList.querySelectorAll('.input-int-name').forEach((el) => {
      el.oninput = (e) => {
        const idx = parseInt(e.target.dataset.idx, 10);
        draftAdminConfig.internalJudges[idx].name = e.target.value;
      };
    });
    adminInternalJudgesList.querySelectorAll('.input-int-pin').forEach((el) => {
      el.oninput = (e) => {
        const idx = parseInt(e.target.dataset.idx, 10);
        draftAdminConfig.internalJudges[idx].pin = e.target.value;
      };
    });
    adminInternalJudgesList.querySelectorAll('.input-int-role').forEach((el) => {
      el.oninput = (e) => {
        const idx = parseInt(e.target.dataset.idx, 10);
        draftAdminConfig.internalJudges[idx].role = e.target.value;
      };
    });
    adminInternalJudgesList.querySelectorAll('.btn-del-int').forEach((el) => {
      el.onclick = (e) => {
        const idx = parseInt(e.target.dataset.idx, 10);
        draftAdminConfig.internalJudges.splice(idx, 1);
        renderAdminSetupUI();
      };
    });

    // External inputs
    adminExternalJudgesList.querySelectorAll('.input-ext-name').forEach((el) => {
      el.oninput = (e) => {
        const idx = parseInt(e.target.dataset.idx, 10);
        draftAdminConfig.externalJudges[idx].name = e.target.value;
      };
    });
    adminExternalJudgesList.querySelectorAll('.input-ext-pin').forEach((el) => {
      el.oninput = (e) => {
        const idx = parseInt(e.target.dataset.idx, 10);
        draftAdminConfig.externalJudges[idx].pin = e.target.value;
      };
    });
    adminExternalJudgesList.querySelectorAll('.input-ext-role').forEach((el) => {
      el.oninput = (e) => {
        const idx = parseInt(e.target.dataset.idx, 10);
        draftAdminConfig.externalJudges[idx].role = e.target.value;
      };
    });
    adminExternalJudgesList.querySelectorAll('.btn-del-ext').forEach((el) => {
      el.onclick = (e) => {
        const idx = parseInt(e.target.dataset.idx, 10);
        draftAdminConfig.externalJudges.splice(idx, 1);
        renderAdminSetupUI();
      };
    });
  }

  async function saveAdminJuryConfig() {
    const enteredPin = inputAdminPinForConfig.value.trim();
    if (!enteredPin) {
      alert('Please enter Admin PIN to apply changes.');
      return;
    }

    try {
      const res = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminPin: enteredPin,
          activePhase: draftAdminConfig.activePhase,
          internalJudges: draftAdminConfig.internalJudges,
          externalJudges: draftAdminConfig.externalJudges
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        alert(data.error || 'Failed to update config. Incorrect Admin PIN.');
        return;
      }

      juryConfig.activePhase = data.activePhase;
      juryConfig.internalJudges = data.internalJudges;
      juryConfig.externalJudges = data.externalJudges;
      juryConfig.judgeAssignments = data.judgeAssignments || juryConfig.judgeAssignments || {};

      modalJurySetup.classList.add('hidden');
      alert('✓ Jury setup and active phase updated successfully!');

      renderLoginJudgeSlots();
      updateActiveJudgeUI();
      renderJuryConsensus();
      renderLeaderboard();
    } catch (e) {
      alert('Error updating configuration on server.');
    }
  }

  // -------------------------------------------------------------
  // View Switching
  // -------------------------------------------------------------
  function switchView(viewName) {
    currentView = viewName;

    // Reset tabs
    [tabTeamView, tabRoster, tabLeaderboard].forEach((t) => {
      t.className = 'flex-1 py-2 font-bold text-xs border-b-2 border-transparent text-[#64748b] transition';
    });

    viewScoring.classList.add('hidden');
    viewRoster.classList.add('hidden');
    viewLeaderboard.classList.add('hidden');

    if (viewName === 'scoring') {
      tabTeamView.className = 'flex-1 py-2 font-bold text-xs border-b-2 border-[#ea580c] text-[#ea580c] transition';
      viewScoring.classList.remove('hidden');
    } else if (viewName === 'roster') {
      tabRoster.className = 'flex-1 py-2 font-bold text-xs border-b-2 border-[#ea580c] text-[#ea580c] transition';
      viewRoster.classList.remove('hidden');
      renderRosterList();
    } else if (viewName === 'leaderboard') {
      tabLeaderboard.className = 'flex-1 py-2 font-bold text-xs border-b-2 border-[#ea580c] text-[#ea580c] transition';
      viewLeaderboard.classList.remove('hidden');
      renderLeaderboard();
    }
  }

  // -------------------------------------------------------------
  // Event Bindings
  // -------------------------------------------------------------
  function bindEvents() {
    // Login
    if (loginJudgeIdSelect) {
      loginJudgeIdSelect.addEventListener('change', (e) => {
        selectedLoginJudgeId = e.target.value;
        if (loginPinInput) {
          loginPinInput.value = '';
          loginPinInput.focus();
        }
      });
    }

    if (btnLoginSubmit) btnLoginSubmit.addEventListener('click', handleLogin);
    if (loginPinInput) {
      loginPinInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') handleLogin();
      });
    }

    if (btnSelectAdminLogin) {
      btnSelectAdminLogin.addEventListener('click', () => {
        selectedLoginJudgeId = 'ADMIN';
        if (loginJudgeIdSelect) loginJudgeIdSelect.value = 'ADMIN';
        if (loginPinInput) {
          loginPinInput.value = '';
          loginPinInput.focus();
        }
        if (loginNameInput) loginNameInput.value = 'Chief Coordinator';
        renderLoginJudgeSlots();
      });
    }

    // Switch Judge
    btnJudgeSwitch.addEventListener('click', handleLogout);

    // Open Admin Management Console Page
    btnOpenSetupModal.addEventListener('click', () => {
      window.location.href = 'admin.html';
    });
    btnCloseSetupModal.addEventListener('click', () => {
      modalJurySetup.classList.add('hidden');
    });

    // Add Internal / External Judge in Admin Modal
    btnAddInternalJudge.addEventListener('click', () => {
      if (!draftAdminConfig) draftAdminConfig = JSON.parse(JSON.stringify(juryConfig));
      const nextNum = (draftAdminConfig.internalJudges || []).length + 1;
      draftAdminConfig.internalJudges.push({
        id: `INT-${nextNum}`,
        name: `Internal Judge ${nextNum}`,
        role: 'Faculty Mentor',
        pin: `${nextNum}${nextNum}${nextNum}${nextNum}`
      });
      renderAdminSetupUI();
    });

    btnAddExternalJudge.addEventListener('click', () => {
      if (!draftAdminConfig) draftAdminConfig = JSON.parse(JSON.stringify(juryConfig));
      const nextNum = (draftAdminConfig.externalJudges || []).length + 1;
      draftAdminConfig.externalJudges.push({
        id: `EXT-${nextNum}`,
        name: `External Judge ${nextNum}`,
        role: 'Industry / IEEE Jury',
        pin: `${nextNum + 2}${nextNum + 2}${nextNum + 2}${nextNum + 2}`
      });
      renderAdminSetupUI();
    });

    btnSaveJuryConfig.addEventListener('click', saveAdminJuryConfig);

    // Navigation Tabs
    tabTeamView.addEventListener('click', () => switchView('scoring'));
    tabRoster.addEventListener('click', () => switchView('roster'));
    tabLeaderboard.addEventListener('click', () => switchView('leaderboard'));

    // Section / Category Switching
    if (btnSwitchSecA) {
      btnSwitchSecA.addEventListener('click', () => {
        if (activeEventId === 'PROJECT_EXPO') {
          const idx = teams.findIndex((x) => x.section === 'HARDWARE' || x.project_type === 'Hardware');
          if (idx !== -1) loadTeamIntoForm(idx);
        } else {
          const idx = teams.findIndex((x) => x.section === 'A');
          if (idx !== -1) loadTeamIntoForm(idx);
        }
      });
    }

    if (btnSwitchSecB) {
      btnSwitchSecB.addEventListener('click', () => {
        if (activeEventId === 'PROJECT_EXPO') {
          const idx = teams.findIndex((x) => x.section === 'SOFTWARE' || x.project_type === 'Software');
          if (idx !== -1) loadTeamIntoForm(idx);
        } else {
          const idx = teams.findIndex((x) => x.section === 'B');
          if (idx !== -1) loadTeamIntoForm(idx);
        }
      });
    }

    // Grid Modal
    btnOpenTeamGridModal.addEventListener('click', () => {
      renderTeamGridModal();
      modalTeamGrid.classList.remove('hidden');
    });
    btnCloseGridModal.addEventListener('click', () => {
      modalTeamGrid.classList.add('hidden');
    });

    // Rubrics Inputs (Realtime recalculation)
    [inputP1Crit1, inputP1Crit2, inputP1Crit3, inputP2Crit1, inputP2Crit2, inputP2Crit3, inputP2Crit4].forEach(
      (input) => {
        if (!input) return;
        input.addEventListener('input', recalculateScores);
      }
    );

    // Quick Pill Buttons
    document.querySelectorAll('.quick-pill-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const targetId = btn.getAttribute('data-target');
        const val = btn.getAttribute('data-val');
        const el = document.getElementById(targetId);
        if (el) {
          el.value = val;
          recalculateScores();
        }
      });
    });

    // Step Buttons (+ / -)
    document.querySelectorAll('.step-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const targetId = btn.getAttribute('data-target');
        const step = parseFloat(btn.getAttribute('data-step')) || 0;
        const el = document.getElementById(targetId);
        if (el) {
          const max = parseFloat(el.getAttribute('max')) || 100;
          const min = parseFloat(el.getAttribute('min')) || 0;
          let current = parseFloat(el.value) || 0;
          current = Math.min(max, Math.max(min, current + step));
          el.value = current;
          recalculateScores();
        }
      });
    });

    // Remark Quick Chips
    document.querySelectorAll('.remark-chip').forEach((btn) => {
      btn.addEventListener('click', () => {
        if (!inputRemarks) return;
        const text = btn.textContent.trim();
        if (inputRemarks.value) {
          inputRemarks.value += ` | ${text}`;
        } else {
          inputRemarks.value = text;
        }
      });
    });

    // Save & Next
    btnSaveEvaluation.addEventListener('click', saveCurrentEvaluation);
    btnNextTeam.addEventListener('click', () => {
      saveCurrentEvaluation();
      if (currentTeamIndex < teams.length - 1) {
        loadTeamIntoForm(currentTeamIndex + 1);
      } else {
        alert('You have reached the last team in the roster!');
      }
    });

    // Bottom Navigation Bar
    bnavPrev.addEventListener('click', () => {
      if (currentTeamIndex > 0) {
        loadTeamIntoForm(currentTeamIndex - 1);
      }
    });

    bnavNext.addEventListener('click', () => {
      if (currentTeamIndex < teams.length - 1) {
        loadTeamIntoForm(currentTeamIndex + 1);
      }
    });

    bnavCenter.addEventListener('click', saveCurrentEvaluation);

    // Roster search
    searchTeamsInput.addEventListener('input', (e) => {
      renderRosterList(e.target.value);
    });

    rosterFilterButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        rosterFilterButtons.forEach((b) => {
          b.className = 'roster-filter-btn px-2.5 py-1 rounded-md font-semibold text-[#475569] hover:bg-[#f6f1e6]';
        });
        btn.className = 'roster-filter-btn px-2.5 py-1 rounded-md font-bold bg-[#0f172a] text-white';
        activeSectionFilter = btn.getAttribute('data-filter') === 'all' ? 'ALL' : btn.getAttribute('data-filter');
        renderRosterList(searchTeamsInput.value);
      });
    });

    // Leaderboard Section Select
    leaderboardSectionSelect.addEventListener('change', renderLeaderboard);

    if (leaderboardEventSelect) {
      leaderboardEventSelect.addEventListener('change', (e) => {
        setActiveEvent(e.target.value);
      });
    }

    // Export CSV
    btnExportCSV.addEventListener('click', exportLeaderboardCSV);

    // Share WhatsApp
    btnShareWhatsApp.addEventListener('click', shareWhatsAppSummary);

    // Reset
    btnResetEvaluations.addEventListener('click', resetAllEvaluations);

    // Results Reveal Ceremony Bindings
    // The leaderboard CTA is a normal link to the dedicated reveal.html stage.
    // Keep the legacy overlay available only through its explicit #ceremony entry point.
    if (btnCloseCeremony) {
      btnCloseCeremony.addEventListener('click', closeCeremonyModal);
    }
    if (btnCeremonyAudioToggle) {
      btnCeremonyAudioToggle.addEventListener('click', toggleCeremonyAudio);
    }
    if (ceremonyCategorySelect) {
      ceremonyCategorySelect.addEventListener('change', (e) => {
        ceremonyCategory = e.target.value;
        startCeremony(ceremonyCategory);
      });
    }
    if (btnCeremonyPrevStep) {
      btnCeremonyPrevStep.addEventListener('click', prevCeremonyStep);
    }
    if (btnCeremonyNextStep) {
      btnCeremonyNextStep.addEventListener('click', nextCeremonyStep);
    }
    if (btnCeremonyConfetti) {
      btnCeremonyConfetti.addEventListener('click', () => {
        triggerConfettiBurst('mega');
        if (ceremonyAudioEngine) ceremonyAudioEngine.playCymbalCrash();
      });
    }
  }

  // -------------------------------------------------------------
  // CSV Export & WhatsApp
  // -------------------------------------------------------------
  function exportLeaderboardCSV() {
    const event = getActiveEvent();
    const ranked = getEventStandings(activeEventId).sort((a, b) => b.grandTotal - a.grandTotal);

    let csv = '';

    if (event.mode === 'SINGLE') {
      const criterionHeaders = event.criteria
        .map((c) => `"${c.label} (Max ${c.max})"`)
        .join(',');
      csv = `Rank,Team Number,Team Name,Section,Event,Judges,${criterionHeaders},Average (${event.maxTotal})\n`;

      ranked.forEach((item, idx) => {
        const criterionAverages = event.criteria.map((criterion) => {
          const values = item.evals
            .filter((ev) => ev && ev.scores && Number(ev.scores[criterion.key]) > 0)
            .map((ev) => Number(ev.scores[criterion.key]));
          return values.length
            ? (values.reduce((a, b) => a + b, 0) / values.length).toFixed(1)
            : '0';
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
    link.setAttribute('download', `EMBEDTHON_26_${activeEventId}_Scores_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  function shareWhatsAppSummary() {
    const event = getActiveEvent();
    let msg = `*EMBEDTHON '26 · ${event.icon} ${event.label.toUpperCase()} STANDINGS*\nP.A. College of Engineering · Dept. of CSE\nTotal: ${event.maxTotal} marks\n\n`;

    const top5 = getEventStandings(activeEventId)
      .sort((a, b) => b.grandTotal - a.grandTotal)
      .slice(0, 5);

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
      loadTeamIntoForm(currentTeamIndex);
      renderLeaderboard();
      updateProgressUI();
    } catch (e) {
      alert('Error connecting to reset endpoint.');
    }
  }

  // =============================================================
  // WEB AUDIO API SYNTHESIZER & SOUND FX ENGINE
  // Multi-track procedural audio: Heartbeat, Drumroll, Fanfare, Cymbal, Cheer
  // =============================================================
  class CeremonyAudioEngine {
    constructor() {
      this.ctx = null;
      this.muted = sessionStorage.getItem('embers_reveal_muted') === '1';
    }

    init() {
      if (this.muted) return;
      if (!this.ctx) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (AudioCtx) {
          this.ctx = new AudioCtx();
        }
      }
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
    }

    toggleMute() {
      this.muted = !this.muted;
      try { sessionStorage.setItem('embers_reveal_muted', this.muted ? '1' : '0'); } catch (e) {}
      return this.muted;
    }

    // 1. Suspense Heartbeat Pulse
    playHeartbeat() {
      if (this.muted) return;
      this.init();
      if (!this.ctx) return;

      const t = this.ctx.currentTime;
      this._playThump(t, 65, 0.5);
      this._playThump(t + 0.12, 52, 0.4);
    }

    _playThump(startTime, freq, vol) {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startTime);
      osc.frequency.exponentialRampToValueAtTime(32, startTime + 0.18);

      gain.gain.setValueAtTime(vol, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.2);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + 0.22);
    }

    // 2. Realistic Drumroll with Crescendo
    playDrumroll(duration = 2.0) {
      if (this.muted) return;
      this.init();
      if (!this.ctx) return;

      const t = this.ctx.currentTime;
      const bufferSize = Math.floor(this.ctx.sampleRate * duration);
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);

      for (let i = 0; i < bufferSize; i++) {
        // High frequency snare noise with flutter envelope
        const flutter = 0.6 + 0.4 * Math.sin(i / 120);
        data[i] = (Math.random() * 2 - 1) * flutter;
      }

      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(550, t);
      filter.frequency.linearRampToValueAtTime(1200, t + duration);
      filter.Q.value = 2.2;

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.05, t);
      gain.gain.exponentialRampToValueAtTime(0.75, t + duration - 0.05);
      gain.gain.linearRampToValueAtTime(0.001, t + duration);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      noise.start(t);
      noise.stop(t + duration);
    }

    // 3. Shimmering Cymbal Crash & Impact
    playCymbalCrash() {
      if (this.muted) return;
      this.init();
      if (!this.ctx) return;

      const t = this.ctx.currentTime;
      const duration = 2.2;
      const bufferSize = Math.floor(this.ctx.sampleRate * duration);
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);

      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.setValueAtTime(5000, t);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.85, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + duration);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      noise.start(t);
      noise.stop(t + duration);
    }

    // 4. Celebratory Brass Fanfares (Bronze, Silver, Gold Champion)
    playFanfare(rank = 1) {
      if (this.muted) return;
      this.init();
      if (!this.ctx) return;

      const t = this.ctx.currentTime;

      // Bronze: Warm Triad (Rank 3)
      if (rank === 3) {
        this._playHornNote(261.63, t, 0.35, 0.45); // C4
        this._playHornNote(329.63, t + 0.15, 0.35, 0.5); // E4
        this._playHornNote(392.00, t + 0.3, 0.7, 0.6); // G4
        this._playHornNote(523.25, t + 0.45, 1.3, 0.75); // C5
      }
      // Silver: Bright Fanfare (Rank 2)
      else if (rank === 2) {
        this._playHornNote(293.66, t, 0.25, 0.5); // D4
        this._playHornNote(369.99, t + 0.12, 0.25, 0.5); // F#4
        this._playHornNote(440.00, t + 0.24, 0.4, 0.65); // A4
        this._playHornNote(587.33, t + 0.36, 1.5, 0.8); // D5
        this.playCymbalCrash();
      }
      // Gold / Grand Champion (Rank 1): Royal Majestic Fanfare
      else {
        const notes = [
          { f: 261.63, start: 0, dur: 0.16, vol: 0.65 }, // C4
          { f: 261.63, start: 0.16, dur: 0.16, vol: 0.65 }, // C4
          { f: 261.63, start: 0.32, dur: 0.16, vol: 0.65 }, // C4
          { f: 349.23, start: 0.48, dur: 0.45, vol: 0.8 }, // F4
          { f: 440.00, start: 0.95, dur: 0.22, vol: 0.8 }, // A4
          { f: 523.25, start: 1.18, dur: 2.0, vol: 0.9 }, // C5
          { f: 659.25, start: 1.18, dur: 2.0, vol: 0.75 }, // E5
          { f: 783.99, start: 1.18, dur: 2.0, vol: 0.85 } // G5
        ];

        notes.forEach(n => {
          this._playHornNote(n.f, t + n.start, n.dur, n.vol);
        });

        this.playCymbalCrash();
        setTimeout(() => this.playCheerApplause(3.8), 1100);
      }
    }

    _playHornNote(freq, startTime, duration, vol) {
      const osc1 = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      const filter = this.ctx.createBiquadFilter();
      const gain = this.ctx.createGain();

      osc1.type = 'sawtooth';
      osc1.frequency.setValueAtTime(freq, startTime);

      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(freq * 1.003, startTime); // chorus detune

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(freq * 1.5, startTime);
      filter.frequency.linearRampToValueAtTime(freq * 3.8, startTime + 0.08);
      filter.frequency.exponentialRampToValueAtTime(freq * 1.8, startTime + duration);

      gain.gain.setValueAtTime(0.001, startTime);
      gain.gain.linearRampToValueAtTime(vol, startTime + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

      osc1.connect(filter);
      osc2.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      osc1.start(startTime);
      osc2.start(startTime);
      osc1.stop(startTime + duration);
      osc2.stop(startTime + duration);
    }

    // 5. Crowd Cheering & Applause Simulation
    playCheerApplause(duration = 3.5) {
      if (this.muted) return;
      this.init();
      if (!this.ctx) return;

      const t = this.ctx.currentTime;
      const bufferSize = Math.floor(this.ctx.sampleRate * duration);
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);

      for (let i = 0; i < bufferSize; i++) {
        const noise = Math.random() * 2 - 1;
        const clapWave = Math.sin(i / 90) * Math.sin(i / 140);
        data[i] = noise * 0.35 + (clapWave > 0.4 ? noise * 0.65 : 0);
      }

      const src = this.ctx.createBufferSource();
      src.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1100, t);
      filter.Q.value = 1.1;

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.01, t);
      gain.gain.linearRampToValueAtTime(0.45, t + 0.3);
      gain.gain.exponentialRampToValueAtTime(0.01, t + duration);

      src.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      src.start(t);
      src.stop(t + duration);
    }
  }

  // -------------------------------------------------------------
  // Confetti Blast Engine
  // -------------------------------------------------------------
  function triggerConfettiBurst(intensity = 'medium') {
    if (typeof confetti === 'function') {
      if (intensity === 'small') {
        confetti({
          particleCount: 45,
          spread: 60,
          origin: { y: 0.65 }
        });
      } else if (intensity === 'medium') {
        confetti({
          particleCount: 90,
          spread: 80,
          origin: { y: 0.6 }
        });
      } else if (intensity === 'mega') {
        // Multi-stage cannon blast
        const count = 220;
        const defaults = { origin: { y: 0.68 } };
        function fire(ratio, opts) {
          confetti(Object.assign({}, defaults, opts, {
            particleCount: Math.floor(count * ratio)
          }));
        }

        fire(0.25, { spread: 26, startVelocity: 55 });
        fire(0.2, { spread: 60 });
        fire(0.35, { spread: 100, decay: 0.91, scalar: 0.8 });
        fire(0.1, { spread: 120, startVelocity: 25, decay: 0.92, scalar: 1.2 });
        fire(0.1, { spread: 120, startVelocity: 45 });

        // Left & Right celebratory streams
        const end = Date.now() + 2500;
        const colors = ['#ea580c', '#f59e0b', '#3b82f6', '#10b981', '#ffffff', '#ffd700'];
        (function frame() {
          confetti({ particleCount: 3, angle: 60, spread: 55, origin: { x: 0 }, colors: colors });
          confetti({ particleCount: 3, angle: 120, spread: 55, origin: { x: 1 }, colors: colors });
          if (Date.now() < end) requestAnimationFrame(frame);
        })();
      }
    }
  }

  // -------------------------------------------------------------
  // Ceremony Modal Orchestration
  // -------------------------------------------------------------
  function openCeremonyModal() {
    if (!ceremonyAudioEngine) {
      ceremonyAudioEngine = new CeremonyAudioEngine();
    }
    ceremonyAudioEngine.init();

    if (revealCeremonyOverlay) {
      revealCeremonyOverlay.classList.remove('hidden');
    }

    startCeremony(ceremonyCategory || 'OVERALL');
  }

  function closeCeremonyModal() {
    if (revealCeremonyOverlay) {
      revealCeremonyOverlay.classList.add('hidden');
    }
  }

  function toggleCeremonyAudio() {
    if (!ceremonyAudioEngine) {
      ceremonyAudioEngine = new CeremonyAudioEngine();
    }
    const isNowMuted = ceremonyAudioEngine.toggleMute();
    if (audioIcon) audioIcon.textContent = isNowMuted ? '🔇' : '🔊';
    if (audioStatusText) audioStatusText.textContent = isNowMuted ? 'MUTED' : 'SOUND ON';
  }

  function startCeremony(category = 'OVERALL') {
    ceremonyCategory = category;
    ceremonyCurrentStep = 0;
    ceremonyWinnersList = computeCeremonyRankings(category);

    renderCeremonyStage();
  }

  function computeCeremonyRankings(category) {
    let eventId = 'EMBEDDATHON';
    if (EVENTS[category]) {
      eventId = category;
    } else if (category === 'OVERALL') {
      eventId = activeEventId;
    }

    const event = EVENT_LIB.getEvent(eventId);
    ceremonyEventId = eventId;
    ceremonyMaxTotal = event.maxTotal;

    const list = getEventStandings(eventId)
      .filter((item) => category === 'OVERALL' || EVENTS[category] || item.team.section === category)
      .sort((a, b) => b.grandTotal - a.grandTotal);

    // If no evaluations are saved yet (demo preview mode), provide top 3 preview
    if (!list.length || list[0].grandTotal === 0) {
      const previewTeams = category === 'OVERALL' || EVENTS[category]
        ? teams.slice(0, 3)
        : teams.filter((x) => x.section === category).slice(0, 3);

      return previewTeams.map((t, idx) => ({
        team: t,
        p1Avg: event.mode === 'DUAL_PHASE' ? (idx === 0 ? 28.5 : idx === 1 ? 27.0 : 25.5) : 0,
        p2Avg: event.mode === 'DUAL_PHASE' ? (idx === 0 ? 66.5 : idx === 1 ? 64.0 : 61.5) : 0,
        grandTotal: Number((event.maxTotal * (idx === 0 ? 0.95 : idx === 1 ? 0.91 : 0.87)).toFixed(1)),
        isPreview: true
      }));
    }

    return list.slice(0, 3);
  }

  function prevCeremonyStep() {
    if (ceremonyCurrentStep > 0) {
      ceremonyCurrentStep--;
      renderCeremonyStage();
    }
  }

  function nextCeremonyStep() {
    if (ceremonyCurrentStep < 4) {
      ceremonyCurrentStep++;
      renderCeremonyStage();
    } else {
      // Replay
      ceremonyCurrentStep = 0;
      renderCeremonyStage();
    }
  }
  window.nextCeremonyStep = nextCeremonyStep;
  window.triggerConfettiBurst = triggerConfettiBurst;
  window.shareWhatsAppSummary = shareWhatsAppSummary;
  window.openCeremonyModal = openCeremonyModal;

  function renderCeremonyStage() {
    if (!ceremonyStageArena) return;

    if (btnCeremonyPrevStep) {
      btnCeremonyPrevStep.disabled = ceremonyCurrentStep === 0;
    }

    if (ceremonyCurrentStep === 0) {
      renderWelcomeStep();
    } else if (ceremonyCurrentStep === 1) {
      renderWinnerCardStep(2, 3); // 3rd Place (Index 2, Rank 3 Bronze)
    } else if (ceremonyCurrentStep === 2) {
      renderWinnerCardStep(1, 2); // 2nd Place (Index 1, Rank 2 Silver)
    } else if (ceremonyCurrentStep === 3) {
      renderWinnerCardStep(0, 1); // 1st Place (Index 0, Rank 1 Champion)
    } else if (ceremonyCurrentStep === 4) {
      renderPodiumStep();
    }
  }

  function getCategoryTitle(cat) {
    if (cat === 'A') return 'Section A Winners';
    if (cat === 'B') return 'Section B Winners';
    if (EVENTS[cat]) return `${EVENTS[cat].icon} ${EVENTS[cat].label} Winners`;
    return 'Overall Champions';
  }

  // --- Step 0: Welcome Stage (Official PACE Letterhead & Banner Theme) ---
  function renderWelcomeStep() {
    if (ceremonyStepIndicator) ceremonyStepIndicator.textContent = 'Stage Ready';
    if (btnCeremonyNextLabel) btnCeremonyNextLabel.textContent = 'Begin Announcement ▶';

    const count = ceremonyWinnersList.length;
    const isPreview = ceremonyWinnersList.some(x => x.isPreview);

    ceremonyStageArena.innerHTML = `
      <div class="max-w-md w-full space-y-4 my-auto anim-card-reveal">
        <!-- Official Certificate Seal -->
        <div class="w-24 h-24 mx-auto rounded-full bg-white border-4 border-[#ea580c] p-2.5 shadow-xl anim-gold-pulse flex items-center justify-center">
          <img src="assets/pace_crest.png" alt="PACE Crest" class="w-full h-full object-contain">
        </div>
        
        <div class="space-y-1">
          <span class="text-[10px] font-black tracking-widest text-[#ea580c] uppercase block">
            P.A. College of Engineering · Dept. of Computer Science & Engineering
          </span>
          <h1 class="text-2xl sm:text-3xl font-black uppercase text-[#0f172a] tracking-wider font-serif-pace">
            Official Results Reveal
          </h1>
          <p class="text-xs font-bold text-[#475569]">
            EMBEDTHON '26 · EMBERS '26 Valedictory Ceremony
          </p>
          <div class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#f6f1e6] border border-[#e3dccd] text-[10px] font-bold text-[#64748b] mt-1">
            <span>In Association with IEEE CEDA Chapter & Embed Club</span>
          </div>
        </div>

        <div class="p-4 bg-white border-2 border-[#fed7aa] rounded-2xl shadow-xs text-xs space-y-2 text-left">
          <div class="flex items-center justify-between">
            <span class="text-[#64748b] font-bold uppercase text-[10px]">Award Category:</span>
            <span class="font-black text-[#ea580c]">${getCategoryTitle(ceremonyCategory)}</span>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-[#64748b] font-bold uppercase text-[10px]">Jury Consensus:</span>
            <span class="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">Computed & Verified ✓</span>
          </div>
          ${isPreview ? '<p class="text-[10px] text-amber-800 bg-amber-50 p-2 rounded-lg border border-amber-200 pt-1 italic">💡 Running in Demo Preview mode. Real scores update dynamically once judges submit marks.</p>' : ''}
        </div>

        <button type="button" class="w-full py-3.5 px-6 rounded-xl bg-[#ea580c] hover:bg-[#c2410c] font-black text-sm uppercase tracking-wider text-white shadow-md active:scale-95 transition" onclick="window.nextCeremonyStep()">
          Announce Winners 🏆
        </button>
      </div>
    `;
  }

  // --- Step 1, 2, 3: Individual Winner Card Step (Official Banner & Card Theme) ---
  function renderWinnerCardStep(winnerIndex, rankNumber) {
    const item = ceremonyWinnersList[winnerIndex];
    if (!item) {
      renderPodiumStep();
      return;
    }

    const t = item.team;
    const isChamp = rankNumber === 1;
    const isSilver = rankNumber === 2;

    const rankBadgeClass = isChamp
      ? 'bg-[#ea580c] text-white shadow-orange-300'
      : isSilver
      ? 'bg-[#0f172a] text-white shadow-slate-300'
      : 'bg-[#b45309] text-white shadow-amber-300';

    const rankBadgeText = isChamp
      ? '👑 1ST PLACE · GRAND CHAMPION'
      : isSilver
      ? '🥈 2ND PLACE · 1ST RUNNER-UP'
      : '🥉 3RD PLACE · 2ND RUNNER-UP';

    const animClass = isChamp ? 'anim-gold-pulse' : isSilver ? 'anim-silver-pulse' : 'anim-bronze-pulse';
    const borderAccent = isChamp ? 'border-2 border-[#ea580c]' : isSilver ? 'border-2 border-slate-400' : 'border-2 border-amber-700';

    if (ceremonyStepIndicator) {
      ceremonyStepIndicator.textContent = `Rank ${rankNumber} · ${isChamp ? 'Champion' : isSilver ? '1st Runner-Up' : '2nd Runner-Up'}`;
    }
    if (btnCeremonyNextLabel) {
      btnCeremonyNextLabel.textContent = isChamp ? 'View Complete Podium 🏆 ▶' : isSilver ? 'Reveal Champion 👑 ▶' : 'Next: 1st Runner-Up ▶';
    }

    // Trigger sound effects & suspense
    if (ceremonyAudioEngine) {
      ceremonyAudioEngine.playDrumroll(isChamp ? 2.2 : 1.8);
      setTimeout(() => {
        ceremonyAudioEngine.playFanfare(rankNumber);
        triggerConfettiBurst(isChamp ? 'mega' : isSilver ? 'medium' : 'small');
      }, isChamp ? 2000 : 1600);
    }

    // Render Stage using the official Letterhead card style!
    ceremonyStageArena.innerHTML = `
      <div class="max-w-md w-full space-y-3.5 my-auto anim-card-reveal">
        
        <!-- Trophy & Rank Header -->
        <div class="space-y-1 text-center">
          <div class="inline-block px-3.5 py-1 rounded-full text-xs font-black uppercase tracking-wider ${rankBadgeClass} shadow-md">
            ${rankBadgeText}
          </div>
          <div class="text-4xl sm:text-5xl font-black ${isChamp ? 'text-[#ea580c] anim-float' : isSilver ? 'text-slate-600' : 'text-amber-700'}">
            ${isChamp ? '🏆' : isSilver ? '🥈' : '🥉'}
          </div>
        </div>

        <!-- Main Official Certificate Card -->
        <div class="p-4 sm:p-5 bg-white rounded-2xl ${borderAccent} shadow-xl text-left space-y-3 shimmer-bar ${animClass}">
          
          <!-- Top Card Ribbon with Pace Crest & Team Number -->
          <div class="flex items-center justify-between border-b border-[#fed7aa] pb-2 bg-[#fff8f3] -mx-4 -mt-4 sm:-mx-5 sm:-mt-5 p-3 sm:p-4 rounded-t-2xl">
            <div class="flex items-center gap-2">
              <img src="assets/pace_crest.png" alt="PACE Crest" class="h-7 w-auto object-contain">
              <div>
                <span class="text-[9px] font-black text-[#ea580c] uppercase tracking-wider block">TEAM ALLOTMENT</span>
                <span class="text-2xl font-black font-serif-pace text-[#0f172a] leading-none">#${t.number}</span>
              </div>
            </div>
            <div class="text-right">
              <span class="text-[9px] font-bold text-[#64748b] uppercase tracking-wider block">SECTION</span>
              <span class="text-xs font-black px-2 py-0.5 rounded bg-white text-[#ea580c] border border-[#fed7aa] shadow-2xs">
                SEC ${t.section}
              </span>
            </div>
          </div>

          <!-- Team Title & Subtitle -->
          <div>
            <h2 class="text-lg sm:text-xl font-black text-[#0f172a] leading-tight font-serif-pace">
              ${t.name}
            </h2>
            <p class="text-[11px] text-[#64748b] mt-0.5">
              ${t.member_count} Registered Members · Lead: <strong class="text-[#0f172a]">${t.members[0]?.name || 'N/A'}</strong>
            </p>
          </div>

          <!-- Members Grid in official chip style -->
          <div class="grid grid-cols-2 gap-1.5 pt-1 text-[10px]">
            ${t.members.map((m, mIdx) => `
              <div class="p-1.5 rounded-lg bg-[#fdfbf7] border border-[#e3dccd] truncate ${mIdx === 0 ? 'border-[#fed7aa] bg-[#fff8f3]' : ''}">
                <div class="flex items-center justify-between truncate">
                  <span class="font-bold text-[#1e293b] truncate">${m.name}</span>
                  ${mIdx === 0 ? '<span class="text-[8px] font-black px-1 rounded bg-[#ea580c] text-white uppercase flex-shrink-0">Lead</span>' : ''}
                </div>
                <span class="font-mono text-[9px] text-[#64748b] block">${m.usn}</span>
              </div>
            `).join('')}
          </div>

          <!-- Final Score Pill Matrix matching consensus style -->
          ${ceremonyEventId === 'EMBEDDATHON'
            ? `<div class="pt-2 border-t border-[#f0ebe0] grid grid-cols-3 gap-2 text-center">
            <div class="p-2 rounded-xl bg-[#fdfbf7] border border-[#e3dccd]">
              <span class="text-[9px] text-[#64748b] block font-bold uppercase">Phase 1 (30%)</span>
              <span class="text-xs font-black text-[#0f172a]">${item.p1Avg} / 30</span>
            </div>
            <div class="p-2 rounded-xl bg-[#fdfbf7] border border-[#e3dccd]">
              <span class="text-[9px] text-[#64748b] block font-bold uppercase">Phase 2 (70%)</span>
              <span class="text-xs font-black text-[#0f172a]">${item.p2Avg} / 70</span>
            </div>
            <div class="p-2 rounded-xl bg-[#fff7ed] border-2 border-[#ea580c]">
              <span class="text-[9px] text-[#ea580c] block font-black uppercase">Grand Total</span>
              <span class="text-sm font-black text-[#ea580c]">${item.grandTotal} / 100</span>
            </div>
          </div>`
            : `<div class="pt-2 border-t border-[#f0ebe0]">
            <div class="p-2 rounded-xl bg-[#fff7ed] border-2 border-[#ea580c] text-center">
              <span class="text-[9px] text-[#ea580c] block font-black uppercase">${EVENT_LIB.getEvent(ceremonyEventId).label} Jury Average</span>
              <span class="text-sm font-black text-[#ea580c]">${item.grandTotal} / ${ceremonyMaxTotal}</span>
            </div>
          </div>`}

        </div>

        <div class="text-[10px] text-[#64748b] font-medium text-center">
          Department of Computer Science & Engineering · P.A. College of Engineering
        </div>

      </div>
    `;
  }

  // --- Step 4: Complete Olympic Podium Stage (Official Theme) ---
  function renderPodiumStep() {
    if (ceremonyStepIndicator) ceremonyStepIndicator.textContent = 'Podium Complete 🏆';
    if (btnCeremonyNextLabel) btnCeremonyNextLabel.textContent = 'Replay Ceremony 🔄';

    const champ = ceremonyWinnersList[0];
    const silver = ceremonyWinnersList[1];
    const bronze = ceremonyWinnersList[2];

    ceremonyStageArena.innerHTML = `
      <div class="max-w-lg w-full space-y-4 my-auto anim-card-reveal">
        
        <!-- Header Banner -->
        <div class="space-y-0.5 text-center">
          <div class="flex items-center justify-center gap-2 mb-1">
            <img src="assets/pace_crest.png" alt="PACE Crest" class="h-8 w-auto object-contain">
          </div>
          <div class="text-xs font-black text-[#ea580c] uppercase tracking-widest">
            EMBEDTHON '26 · OFFICIAL PODIUM
          </div>
          <h2 class="text-xl sm:text-2xl font-black text-[#0f172a] uppercase tracking-wider font-serif-pace">
            ${getCategoryTitle(ceremonyCategory)}
          </h2>
          <p class="text-[10px] text-[#64748b]">P.A. College of Engineering · Dept. of CSE</p>
        </div>

        <!-- 3-Tier Olympic Podium in official theme colors -->
        <div class="grid grid-cols-3 gap-2 sm:gap-3 items-end pt-3 pb-2">
          
          <!-- Silver (2nd) -->
          <div class="text-center space-y-1.5">
            <span class="text-2xl sm:text-3xl block">🥈</span>
            <div class="p-2.5 rounded-t-xl bg-gradient-to-b from-slate-200 to-slate-400 border-t-4 border-slate-100 shadow-md space-y-1 text-slate-900 min-h-[140px] flex flex-col justify-between">
              <div>
                <span class="text-[9px] font-black uppercase px-1.5 py-0.2 rounded bg-slate-900 text-white">2ND RANK</span>
                <div class="text-base sm:text-lg font-black font-serif-pace mt-1 text-[#0f172a]">#${silver ? silver.team.number : '—'}</div>
                <div class="text-[11px] font-bold text-[#0f172a] truncate">${silver ? silver.team.name : 'Awaiting'}</div>
              </div>
              <div class="font-black text-xs sm:text-sm bg-white/80 text-[#0f172a] py-0.5 rounded shadow-2xs">
                ${silver ? silver.grandTotal : '—'} / ${ceremonyMaxTotal}
              </div>
            </div>
          </div>

          <!-- Gold (1st Champion Elevated) -->
          <div class="text-center space-y-1.5">
            <span class="text-3xl sm:text-4xl block anim-float">👑</span>
            <div class="p-3 rounded-t-xl bg-gradient-to-b from-[#ea580c] via-orange-600 to-[#c2410c] border-t-4 border-amber-300 shadow-xl space-y-1 text-white min-h-[180px] flex flex-col justify-between anim-gold-pulse">
              <div>
                <span class="text-[9px] font-black uppercase px-2 py-0.5 rounded bg-amber-300 text-slate-950 shadow-2xs">1ST CHAMPION</span>
                <div class="text-xl sm:text-2xl font-black font-serif-pace mt-1 text-white">#${champ ? champ.team.number : '—'}</div>
                <div class="text-xs sm:text-sm font-black text-amber-100 truncate">${champ ? champ.team.name : 'Awaiting'}</div>
              </div>
              <div class="font-black text-sm sm:text-base bg-white text-[#ea580c] py-1 rounded shadow-xs">
                ${champ ? champ.grandTotal : '—'} / ${ceremonyMaxTotal}
              </div>
            </div>
          </div>

          <!-- Bronze (3rd) -->
          <div class="text-center space-y-1.5">
            <span class="text-2xl sm:text-3xl block">🥉</span>
            <div class="p-2.5 rounded-t-xl bg-gradient-to-b from-amber-600 to-amber-800 border-t-4 border-amber-300 shadow-md space-y-1 text-white min-h-[110px] flex flex-col justify-between">
              <div>
                <span class="text-[9px] font-black uppercase px-1.5 py-0.2 rounded bg-amber-950 text-amber-200">3RD RANK</span>
                <div class="text-base sm:text-lg font-black font-serif-pace mt-1 text-white">#${bronze ? bronze.team.number : '—'}</div>
                <div class="text-[11px] font-bold text-amber-100 truncate">${bronze ? bronze.team.name : 'Awaiting'}</div>
              </div>
              <div class="font-black text-xs sm:text-sm bg-white/80 text-amber-950 py-0.5 rounded shadow-2xs">
                ${bronze ? bronze.grandTotal : '—'} / ${ceremonyMaxTotal}
              </div>
            </div>
          </div>

        </div>

        <!-- Action Buttons in official theme -->
        <div class="pt-2 flex items-center justify-center gap-2 flex-wrap">
          <button type="button" class="py-2.5 px-4 rounded-xl bg-[#ea580c] hover:bg-[#c2410c] text-white font-black text-xs flex items-center gap-1.5 shadow-md active:scale-95 transition" onclick="triggerConfettiBurst('mega'); if (ceremonyAudioEngine) ceremonyAudioEngine.playCymbalCrash();">
            <span>🎉 Celebrate With Confetti</span>
          </button>
          <button type="button" class="py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-md active:scale-95 transition" onclick="shareWhatsAppSummary()">
            <span>📲 Share Official Results</span>
          </button>
        </div>

      </div>
    `;
  }


  // -------------------------------------------------------------
  // Start on Load
  // -------------------------------------------------------------
  document.addEventListener('DOMContentLoaded', init);
})();
