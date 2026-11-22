// EMBEDTHON '26 - Multi-Judge Dynamic Scoring Portal
// All judges evaluate all 4 criteria rubrics (Prototype 35, Complexity 25, Innovation 20, Presentation 20)
// Supports dynamic number of judges, unique judge login, and real-time live sync.

(function () {
  'use strict';

  const STORAGE_KEY_AUTH = 'embedthon_active_judge_v3';
  const STORAGE_KEY_CURRENT = 'embedthon_current_team_v3';

  // State
  let teams = typeof TEAMS_DATA !== 'undefined' ? TEAMS_DATA : [];
  let currentTeamIndex = 0;
  let activeSectionFilter = 'A';
  let currentView = 'scoring';

  // Config & Multi-Judge evaluations master
  let juryConfig = { numJudges: 3, judges: [] };
  let masterEvaluations = {};
  let currentJudge = null; // { id: 'J1', name: 'Judge 1', isAdmin: false }
  let lastDataChecksum = '';
  let pollingInterval = null;

  // Selected judge in login modal
  let selectedLoginJudgeId = 'J1';

  // -------------------------------------------------------------
  // DOM References
  // -------------------------------------------------------------
  // Login Overlay
  const loginOverlay = document.getElementById('loginOverlay');
  const loginJudgeSlotsContainer = document.getElementById('loginJudgeSlotsContainer');
  const loginPinInput = document.getElementById('loginPinInput');
  const loginNameInput = document.getElementById('loginNameInput');
  const pinHintBadge = document.getElementById('pinHintBadge');
  const loginErrorMessage = document.getElementById('loginErrorMessage');
  const btnLoginSubmit = document.getElementById('btnLoginSubmit');

  // Header
  const activeJudgeBadge = document.getElementById('activeJudgeBadge');
  const btnJudgeSwitch = document.getElementById('btnJudgeSwitch');
  const btnOpenSetupModal = document.getElementById('btnOpenSetupModal');
  const subHeaderJudgeRole = document.getElementById('subHeaderJudgeRole');
  const navSectionBadge = document.getElementById('navSectionBadge');
  const progressPill = document.getElementById('progressPill');

  // Tabs & Views
  const tabTeamView = document.getElementById('tabTeamView');
  const tabRoster = document.getElementById('tabRoster');
  const tabLeaderboard = document.getElementById('tabLeaderboard');
  const viewScoring = document.getElementById('viewScoring');
  const viewRoster = document.getElementById('viewRoster');
  const viewLeaderboard = document.getElementById('viewLeaderboard');

  // Section buttons
  const btnSwitchSecA = document.getElementById('btnSwitchSecA');
  const btnSwitchSecB = document.getElementById('btnSwitchSecB');

  // Team pills & modals
  const teamPillsRow = document.getElementById('teamPillsRow');
  const btnOpenTeamGridModal = document.getElementById('btnOpenTeamGridModal');
  const modalTeamGrid = document.getElementById('modalTeamGrid');
  const btnCloseGridModal = document.getElementById('btnCloseGridModal');
  const gridSectionA = document.getElementById('gridSectionA');
  const gridSectionB = document.getElementById('gridSectionB');

  // Team Detail Elements
  const teamSectionLabel = document.getElementById('teamSectionLabel');
  const evalStatusBadge = document.getElementById('evalStatusBadge');
  const teamBigNumber = document.getElementById('teamBigNumber');
  const teamBigName = document.getElementById('teamBigName');
  const teamSubtitle = document.getElementById('teamSubtitle');
  const memberCountBadge = document.getElementById('memberCountBadge');
  const membersContainer = document.getElementById('membersContainer');

  // Jury Consensus Panel
  const consensusProgressBadge = document.getElementById('consensusProgressBadge');
  const juryStatusRow = document.getElementById('juryStatusRow');
  const juryAverageScoreDisplay = document.getElementById('juryAverageScoreDisplay');
  const scoringFormHeaderJudge = document.getElementById('scoringFormHeaderJudge');

  // Rubric Inputs (All Judges score all 4 rubrics)
  const inputCrit1 = document.getElementById('inputCrit1'); // 35
  const inputCrit2 = document.getElementById('inputCrit2'); // 25
  const inputCrit3 = document.getElementById('inputCrit3'); // 20
  const inputCrit4 = document.getElementById('inputCrit4'); // 20
  const displayTotalMarks = document.getElementById('displayTotalMarks');
  const displayPhase1 = document.getElementById('displayPhase1');
  const displayPhase2 = document.getElementById('displayPhase2');
  const scoreGradeBadge = document.getElementById('scoreGradeBadge');
  const inputRemarks = document.getElementById('inputRemarks');

  const btnSaveEvaluation = document.getElementById('btnSaveEvaluation');
  const btnNextTeam = document.getElementById('btnNextTeam');
  const saveFeedbackNotice = document.getElementById('saveFeedbackNotice');

  // Bottom Navigation
  const bnavPrev = document.getElementById('bnavPrev');
  const bnavNext = document.getElementById('bnavNext');
  const bnavCenter = document.getElementById('bnavCenter');
  const bnavTeamLabel = document.getElementById('bnavTeamLabel');
  const bnavScoreLabel = document.getElementById('bnavScoreLabel');

  // Roster Directory
  const searchTeamsInput = document.getElementById('searchTeamsInput');
  const rosterListGrid = document.getElementById('rosterListGrid');
  const rosterShowingCount = document.getElementById('rosterShowingCount');
  const rosterFilterButtons = document.querySelectorAll('.roster-filter-btn');

  // Leaderboard
  const leaderboardSectionSelect = document.getElementById('leaderboardSectionSelect');
  const leaderboardTheadTr = document.getElementById('leaderboardTheadTr');
  const leaderboardTbody = document.getElementById('leaderboardTbody');
  const btnExportCSV = document.getElementById('btnExportCSV');
  const btnShareWhatsApp = document.getElementById('btnShareWhatsApp');
  const btnResetEvaluations = document.getElementById('btnResetEvaluations');

  // Jury Setup Modal
  const modalJurySetup = document.getElementById('modalJurySetup');
  const btnCloseSetupModal = document.getElementById('btnCloseSetupModal');
  const numJudgesButtonGroup = document.getElementById('numJudgesButtonGroup');
  const adminJudgeSlotsList = document.getElementById('adminJudgeSlotsList');
  const inputAdminPinForConfig = document.getElementById('inputAdminPinForConfig');
  const btnSaveJuryConfig = document.getElementById('btnSaveJuryConfig');

  // -------------------------------------------------------------
  // Initialization
  // -------------------------------------------------------------
  async function init() {
    loadSavedTeamIndex();
    checkSavedAuth();

    // Fetch initial config and evaluations from server
    await fetchServerConfig();
    await fetchServerEvaluations();

    renderLoginJudgeSlots();
    renderTeamPills();
    renderTeamGridModal();
    loadTeamIntoForm(currentTeamIndex);

    bindEvents();
    renderRosterList();
    renderLeaderboard();

    // Start Real-Time Live Polling (every 3 seconds)
    startLiveSync();
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

          // Dynamically re-render affected views without disturbing inputs
          updateProgressUI();
          renderJuryConsensus();
          renderTeamPills();
          renderRosterList();
          renderLeaderboard();
        }
      }
    } catch (e) {
      // Offline fallback: keep local state
    }
  }

  async function fetchServerConfig() {
    try {
      const res = await fetch('/api/config', { cache: 'no-store' });
      if (res.ok) {
        juryConfig = await res.json();
      }
    } catch (e) {
      console.warn('Failed to load server config, using fallback', e);
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
      console.warn('Failed to load server evaluations', e);
    }
  }

  // -------------------------------------------------------------
  // Authentication & Judge Selection
  // -------------------------------------------------------------
  function checkSavedAuth() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_AUTH);
      if (saved) {
        currentJudge = JSON.parse(saved);
        updateActiveJudgeUI();
        loginOverlay.classList.add('hidden');
      } else {
        loginOverlay.classList.remove('hidden');
      }
    } catch (e) {
      loginOverlay.classList.remove('hidden');
    }
  }

  function updateActiveJudgeUI() {
    if (!currentJudge) {
      activeJudgeBadge.textContent = 'Login';
      subHeaderJudgeRole.textContent = 'JUDGE EVALUATION';
      scoringFormHeaderJudge.textContent = 'Score Entry';
      return;
    }

    activeJudgeBadge.textContent = currentJudge.name ? `${currentJudge.id} · ${currentJudge.name}` : currentJudge.id;
    subHeaderJudgeRole.textContent = `LOGGED IN AS ${currentJudge.name.toUpperCase()} (${currentJudge.id})`;
    scoringFormHeaderJudge.textContent = `Your Score as ${currentJudge.name} (${currentJudge.id})`;

    loadCurrentJudgeScoresForTeam();
    renderJuryConsensus();
  }

  function renderLoginJudgeSlots() {
    loginJudgeSlotsContainer.innerHTML = '';
    const judges = juryConfig.judges || [];

    judges.forEach((j) => {
      const isSelected = j.id === selectedLoginJudgeId;
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `p-2.5 rounded-xl border text-left transition flex flex-col justify-between active:scale-95 ${
        isSelected
          ? 'bg-[#ea580c] text-white border-[#ea580c] shadow-xs'
          : 'bg-[#fdfbf7] text-[#1e293b] border-[#e3dccd] hover:bg-[#f6f1e6]'
      }`;

      btn.innerHTML = `
        <span class="text-xs font-black">${j.id}</span>
        <span class="text-[11px] font-bold truncate">${j.name}</span>
      `;

      btn.addEventListener('click', () => {
        selectedLoginJudgeId = j.id;
        loginPinInput.value = '';
        loginNameInput.value = j.name;
        pinHintBadge.textContent = `PIN: ${j.pin}`;
        renderLoginJudgeSlots();
      });

      loginJudgeSlotsContainer.appendChild(btn);
    });

    // Also add Admin / Coordinator slot
    const isAdminSelected = selectedLoginJudgeId === 'ADMIN';
    const adminBtn = document.createElement('button');
    adminBtn.type = 'button';
    adminBtn.className = `p-2.5 rounded-xl border text-left transition flex flex-col justify-between col-span-2 active:scale-95 ${
      isAdminSelected
        ? 'bg-[#0f172a] text-white border-[#0f172a] shadow-xs'
        : 'bg-[#f6f1e6] text-[#475569] border-[#e3dccd]'
    }`;

    adminBtn.innerHTML = `
      <div class="flex items-center justify-between">
        <span class="text-xs font-black">⚙️ Coordinator / Admin</span>
        <span class="text-[10px] text-slate-400">Manage jury</span>
      </div>
    `;

    adminBtn.addEventListener('click', () => {
      selectedLoginJudgeId = 'ADMIN';
      loginPinInput.value = '';
      loginNameInput.value = 'Coordinator';
      pinHintBadge.textContent = 'PIN: 2026';
      renderLoginJudgeSlots();
    });

    loginJudgeSlotsContainer.appendChild(adminBtn);

    // Initial pin hint
    const active = judges.find((x) => x.id === selectedLoginJudgeId);
    if (active) {
      pinHintBadge.textContent = `PIN: ${active.pin}`;
      loginNameInput.value = active.name;
    } else if (selectedLoginJudgeId === 'ADMIN') {
      pinHintBadge.textContent = 'PIN: 2026';
      loginNameInput.value = 'Coordinator';
    }
  }

  async function handleLogin() {
    loginErrorMessage.classList.add('hidden');
    const pin = loginPinInput.value.trim();
    const customName = loginNameInput.value.trim();

    if (!pin) {
      showLoginError('Please enter your 4-digit security PIN.');
      return;
    }

    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          judgeId: selectedLoginJudgeId,
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

      updateActiveJudgeUI();
      loginOverlay.classList.add('hidden');
      updateProgressUI();
      loadTeamIntoForm(currentTeamIndex);
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
      renderLoginJudgeSlots();
      loginPinInput.value = '';
      loginOverlay.classList.remove('hidden');
    }
  }

  // -------------------------------------------------------------
  // Progress & Multi-Judge Status
  // -------------------------------------------------------------
  function updateProgressUI() {
    const totalTeams = teams.length;
    let myScoredCount = 0;
    const judgeId = currentJudge ? currentJudge.id : 'J1';

    teams.forEach((t) => {
      const teamEvals = masterEvaluations[t.number] || {};
      if (teamEvals[judgeId] && teamEvals[judgeId].total > 0) {
        myScoredCount++;
      }
    });

    progressPill.textContent = `${myScoredCount} / ${totalTeams} Scored (${judgeId})`;
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
    activeSectionFilter = team.section;

    navSectionBadge.textContent = `SECTION ${team.section}`;
    teamSectionLabel.textContent = `SECTION ${team.section}`;

    if (team.section === 'A') {
      btnSwitchSecA.className = 'px-2.5 py-1 text-xs font-black rounded bg-[#ea580c] text-white transition shadow-xs';
      btnSwitchSecB.className = 'px-2.5 py-1 text-xs font-semibold rounded text-[#475569] hover:text-[#0f172a] transition';
    } else {
      btnSwitchSecB.className = 'px-2.5 py-1 text-xs font-black rounded bg-[#ea580c] text-white transition shadow-xs';
      btnSwitchSecA.className = 'px-2.5 py-1 text-xs font-semibold rounded text-[#475569] hover:text-[#0f172a] transition';
    }

    teamBigNumber.textContent = team.number;
    teamBigName.textContent = team.name;
    teamSubtitle.textContent = `${team.member_count} members · Section ${team.section} · Allotment for EmbedThon '26`;
    memberCountBadge.textContent = `${team.member_count} REGISTERED`;

    bnavTeamLabel.textContent = `Save Team #${team.number}`;

    renderTeamMembers(team.members);
    loadCurrentJudgeScoresForTeam();
    renderJuryConsensus();
    renderTeamPills();

    saveFeedbackNotice.classList.add('hidden');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function renderTeamMembers(members) {
    membersContainer.innerHTML = '';
    members.forEach((m, idx) => {
      const isLead = idx === 0 || m.is_lead;
      const card = document.createElement('div');
      card.className = `p-2 rounded-xl border transition flex items-center justify-between gap-2 ${
        isLead ? 'bg-[#fff8f3] border-[#fed7aa] shadow-xs' : 'bg-white border-[#e3dccd]'
      }`;

      card.innerHTML = `
        <div class="flex items-center gap-2 min-w-0">
          <span class="text-xs font-black font-serif-pace ${isLead ? 'text-[#ea580c]' : 'text-[#64748b]'}">
            ${m.slot}
          </span>
          <div class="truncate">
            <div class="flex items-center gap-1 truncate">
              <span class="text-xs font-bold text-[#1e293b] truncate">${m.name}</span>
              ${isLead ? '<span class="text-[9px] font-black px-1.5 py-0.1 rounded bg-[#ea580c] text-white uppercase">Lead</span>' : ''}
            </div>
            <div class="text-[10px] text-[#64748b] font-mono">${m.usn || '—'}</div>
          </div>
        </div>

        <div class="flex items-center gap-1 flex-shrink-0">
          ${m.phone ? `
            <a href="${m.tel_link || 'tel:' + m.phone}" class="p-1.5 rounded-lg bg-[#f6f1e6] text-[#334155] border border-[#cbd5e1] active:scale-95" title="Call">
              <svg class="w-3.5 h-3.5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/></svg>
            </a>
            ${m.wa_link ? `
            <a href="${m.wa_link}" target="_blank" rel="noopener noreferrer" class="p-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 active:scale-95" title="WhatsApp">
              <svg class="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981z"/></svg>
            </a>` : ''}
          ` : ''}
        </div>
      `;
      membersContainer.appendChild(card);
    });
  }

  // -------------------------------------------------------------
  // Load Scores for Current Judge & Display Consensus
  // -------------------------------------------------------------
  function loadCurrentJudgeScoresForTeam() {
    const team = teams[currentTeamIndex];
    if (!team) return;

    const judgeId = currentJudge ? currentJudge.id : 'J1';
    const teamEvals = masterEvaluations[team.number] || {};
    const myEval = teamEvals[judgeId] || {};

    inputCrit1.value = myEval.crit1 !== undefined ? myEval.crit1 : '';
    inputCrit2.value = myEval.crit2 !== undefined ? myEval.crit2 : '';
    inputCrit3.value = myEval.crit3 !== undefined ? myEval.crit3 : '';
    inputCrit4.value = myEval.crit4 !== undefined ? myEval.crit4 : '';
    inputRemarks.value = myEval.remarks || '';

    recalcRubricTotal();

    if (myEval.total !== undefined && myEval.total > 0) {
      evalStatusBadge.className = 'px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300';
      evalStatusBadge.textContent = `✓ You Scored: ${myEval.total} pts`;
      bnavScoreLabel.textContent = `${myEval.total} / 100 Marks (Tap to re-save)`;
    } else {
      evalStatusBadge.className = 'px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200';
      evalStatusBadge.textContent = 'Pending Your Score';
      bnavScoreLabel.textContent = '0 / 100 Marks (Tap to save)';
    }
  }

  function renderJuryConsensus() {
    const team = teams[currentTeamIndex];
    if (!team) return;

    const teamEvals = masterEvaluations[team.number] || {};
    const judges = juryConfig.judges || [];
    const numConfigured = juryConfig.numJudges || judges.length || 3;

    juryStatusRow.innerHTML = '';
    let scoredCount = 0;
    const scores = [];

    judges.forEach((j) => {
      const ev = teamEvals[j.id];
      const isScored = ev && ev.total !== undefined && ev.total > 0;
      const isMe = currentJudge && currentJudge.id === j.id;

      if (isScored) {
        scoredCount++;
        scores.push(ev.total);
      }

      const badge = document.createElement('div');
      badge.className = `p-2 rounded-lg border text-center transition ${
        isScored
          ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
          : 'bg-[#fdfbf7] border-[#e3dccd] text-[#64748b]'
      }`;

      badge.innerHTML = `
        <div class="text-[10px] font-bold truncate flex items-center justify-center gap-1">
          <span>${j.name}</span>
          ${isMe ? '<span class="text-[8px] bg-[#ea580c] text-white px-1 rounded">YOU</span>' : ''}
        </div>
        <div class="text-xs font-black mt-0.5 font-mono">
          ${isScored ? `${ev.total} pts ✓` : 'Pending ⏳'}
        </div>
      `;

      juryStatusRow.appendChild(badge);
    });

    consensusProgressBadge.textContent = `${scoredCount} / ${numConfigured} Judged`;

    if (scores.length > 0) {
      const avg = (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1);
      juryAverageScoreDisplay.textContent = `${avg} / 100 (${scores.length} ${scores.length === 1 ? 'judge' : 'judges'})`;
    } else {
      juryAverageScoreDisplay.textContent = '— / 100 (Awaiting scores)';
    }
  }

  // -------------------------------------------------------------
  // Rubric Recalculations
  // -------------------------------------------------------------
  function recalcRubricTotal() {
    let c1 = parseFloat(inputCrit1.value);
    let c2 = parseFloat(inputCrit2.value);
    let c3 = parseFloat(inputCrit3.value);
    let c4 = parseFloat(inputCrit4.value);

    if (c1 > 35) { c1 = 35; inputCrit1.value = 35; }
    if (c2 > 25) { c2 = 25; inputCrit2.value = 25; }
    if (c3 > 20) { c3 = 20; inputCrit3.value = 20; }
    if (c4 > 20) { c4 = 20; inputCrit4.value = 20; }

    const numC1 = isNaN(c1) ? 0 : c1;
    const numC2 = isNaN(c2) ? 0 : c2;
    const numC3 = isNaN(c3) ? 0 : c3;
    const numC4 = isNaN(c4) ? 0 : c4;

    const phase1Total = numC1 + numC2;
    const phase2Total = numC3 + numC4;
    const grandTotal = Math.min(100, Math.max(0, phase1Total + phase2Total));

    displayTotalMarks.textContent = grandTotal % 1 === 0 ? grandTotal : grandTotal.toFixed(1);
    displayPhase1.textContent = phase1Total % 1 === 0 ? phase1Total : phase1Total.toFixed(1);
    displayPhase2.textContent = phase2Total % 1 === 0 ? phase2Total : phase2Total.toFixed(1);

    bnavScoreLabel.textContent = `${grandTotal} / 100 Marks`;

    if (grandTotal >= 85) {
      scoreGradeBadge.className = 'inline-block text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800';
      scoreGradeBadge.textContent = 'Outstanding';
    } else if (grandTotal >= 70) {
      scoreGradeBadge.className = 'inline-block text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-blue-100 text-blue-800';
      scoreGradeBadge.textContent = 'Excellent';
    } else if (grandTotal >= 50) {
      scoreGradeBadge.className = 'inline-block text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-100 text-amber-800';
      scoreGradeBadge.textContent = 'Good';
    } else if (grandTotal > 0) {
      scoreGradeBadge.className = 'inline-block text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-slate-100 text-slate-700';
      scoreGradeBadge.textContent = 'Average';
    } else {
      scoreGradeBadge.className = 'inline-block text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-orange-100 text-[#ea580c]';
      scoreGradeBadge.textContent = 'Not Scored';
    }

    return { grandTotal, phase1Total, phase2Total, c1: numC1, c2: numC2, c3: numC3, c4: numC4 };
  }

  // -------------------------------------------------------------
  // Save Evaluation & Push to Server
  // -------------------------------------------------------------
  async function saveCurrentEvaluation() {
    if (!currentJudge) {
      loginOverlay.classList.remove('hidden');
      return;
    }

    const team = teams[currentTeamIndex];
    if (!team) return;

    const { grandTotal, phase1Total, phase2Total, c1, c2, c3, c4 } = recalcRubricTotal();

    const today = new Date();
    const formattedDate = `${today.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} ${today.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;

    const payload = {
      teamNumber: team.number,
      judgeId: currentJudge.id,
      judgeName: currentJudge.name,
      crit1: c1,
      crit2: c2,
      crit3: c3,
      crit4: c4,
      phase1: phase1Total,
      phase2: phase2Total,
      total: grandTotal,
      remarks: inputRemarks.value.trim(),
      updatedAt: formattedDate
    };

    // Update locally immediately
    if (!masterEvaluations[team.number]) masterEvaluations[team.number] = {};
    masterEvaluations[team.number][currentJudge.id] = payload;

    updateProgressUI();
    renderJuryConsensus();
    renderTeamPills();
    renderRosterList();
    renderLeaderboard();

    // Send to backend
    try {
      const res = await fetch('/api/evaluations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        const data = await res.json();
        if (data.teamEvaluations) {
          masterEvaluations[team.number] = data.teamEvaluations;
          renderJuryConsensus();
        }
      }
    } catch (e) {
      console.warn('Saved offline in memory, server sync pending', e);
    }

    saveFeedbackNotice.textContent = `✓ Saved Team #${team.number} (${currentJudge.name}: ${grandTotal} pts)`;
    saveFeedbackNotice.classList.remove('hidden');

    elEvalStatusBadge.className = 'px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300';
    elEvalStatusBadge.textContent = `✓ You Scored: ${grandTotal} pts`;

    setTimeout(() => {
      saveFeedbackNotice.classList.add('hidden');
    }, 3000);
  }

  // -------------------------------------------------------------
  // Events
  // -------------------------------------------------------------
  function bindEvents() {
    // Login form
    btnLoginSubmit.addEventListener('click', handleLogin);
    btnJudgeSwitch.addEventListener('click', handleLogout);

    // Rubric inputs
    [inputCrit1, inputCrit2, inputCrit3, inputCrit4].forEach((inp) => {
      inp.addEventListener('input', recalcRubricTotal);
    });

    // Preset pills
    document.querySelectorAll('.quick-rubric-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const targetId = btn.dataset.target;
        const val = parseFloat(btn.dataset.val) || 0;
        const inp = document.getElementById(targetId);
        if (inp) {
          inp.value = val;
          recalcRubricTotal();
        }
      });
    });

    // Stepper buttons
    document.querySelectorAll('.step-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const targetId = btn.dataset.target;
        const step = parseFloat(btn.dataset.step) || 0;
        const inp = document.getElementById(targetId);
        if (inp) {
          const cur = parseFloat(inp.value) || 0;
          const max = parseFloat(inp.max) || 100;
          inp.value = Math.min(max, Math.max(0, cur + step));
          recalcRubricTotal();
        }
      });
    });

    // Remarks chips
    document.querySelectorAll('.remark-chip').forEach((btn) => {
      btn.addEventListener('click', () => {
        const text = btn.textContent.trim();
        const cur = inputRemarks.value.trim();
        inputRemarks.value = cur ? `${cur} | ${text}` : text;
      });
    });

    // Save buttons
    btnSaveEvaluation.addEventListener('click', saveCurrentEvaluation);
    bnavCenter.addEventListener('click', saveCurrentEvaluation);

    // Prev / Next
    btnNextTeam.addEventListener('click', () => {
      saveCurrentEvaluation();
      if (currentTeamIndex < teams.length - 1) loadTeamIntoForm(currentTeamIndex + 1);
      else alert('You reached the last team (#24). Check Leaderboard for full rankings!');
    });

    bnavNext.addEventListener('click', () => {
      saveCurrentEvaluation();
      if (currentTeamIndex < teams.length - 1) loadTeamIntoForm(currentTeamIndex + 1);
      else loadTeamIntoForm(0);
    });

    bnavPrev.addEventListener('click', () => {
      saveCurrentEvaluation();
      if (currentTeamIndex > 0) loadTeamIntoForm(currentTeamIndex - 1);
      else loadTeamIntoForm(teams.length - 1);
    });

    // Section buttons
    btnSwitchSecA.addEventListener('click', () => {
      activeSectionFilter = 'A';
      const firstA = teams.findIndex((t) => t.section === 'A');
      loadTeamIntoForm(firstA >= 0 ? firstA : 0);
    });

    btnSwitchSecB.addEventListener('click', () => {
      activeSectionFilter = 'B';
      const firstB = teams.findIndex((t) => t.section === 'B');
      loadTeamIntoForm(firstB >= 0 ? firstB : 11);
    });

    // Grid Modal
    btnOpenTeamGridModal.addEventListener('click', () => {
      renderTeamGridModal();
      modalTeamGrid.classList.remove('hidden');
    });

    btnCloseGridModal.addEventListener('click', () => modalTeamGrid.classList.add('hidden'));
    modalTeamGrid.addEventListener('click', (e) => {
      if (e.target === modalTeamGrid) modalTeamGrid.classList.add('hidden');
    });

    // Tabs
    tabTeamView.addEventListener('click', () => switchView('scoring'));
    tabRoster.addEventListener('click', () => switchView('roster'));
    tabLeaderboard.addEventListener('click', () => switchView('leaderboard'));

    // Search & Filter
    searchTeamsInput.addEventListener('input', renderRosterList);
    rosterFilterButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        rosterFilterButtons.forEach((b) => {
          b.className = 'roster-filter-btn px-2.5 py-1 rounded-md font-semibold text-[#475569] hover:bg-[#f6f1e6]';
        });
        btn.className = 'roster-filter-btn px-2.5 py-1 rounded-md font-bold bg-[#0f172a] text-white';
        renderRosterList(btn.dataset.filter);
      });
    });

    // Leaderboard controls
    leaderboardSectionSelect.addEventListener('change', renderLeaderboard);
    btnExportCSV.addEventListener('click', exportCSV);
    btnShareWhatsApp.addEventListener('click', shareWhatsApp);
    btnResetEvaluations.addEventListener('click', resetAllEvaluations);

    // Jury Setup Modal
    btnOpenSetupModal.addEventListener('click', openJurySetupModal);
    btnCloseSetupModal.addEventListener('click', () => modalJurySetup.classList.add('hidden'));
    modalJurySetup.addEventListener('click', (e) => {
      if (e.target === modalJurySetup) modalJurySetup.classList.add('hidden');
    });
    btnSaveJuryConfig.addEventListener('click', saveJuryConfiguration);
  }

  // -------------------------------------------------------------
  // View Switcher
  // -------------------------------------------------------------
  function switchView(viewName) {
    currentView = viewName;
    viewScoring.classList.add('hidden');
    viewRoster.classList.add('hidden');
    viewLeaderboard.classList.add('hidden');

    tabTeamView.className = 'tab-btn px-2.5 py-2 rounded-lg text-xs font-semibold text-[#475569] hover:bg-[#f6f1e6] transition flex items-center gap-1';
    tabRoster.className = 'tab-btn px-2.5 py-2 rounded-lg text-xs font-semibold text-[#475569] hover:bg-[#f6f1e6] transition flex items-center gap-1';
    tabLeaderboard.className = 'tab-btn px-2.5 py-2 rounded-lg text-xs font-semibold text-[#475569] hover:bg-[#f6f1e6] transition flex items-center gap-1';

    if (viewName === 'scoring') {
      viewScoring.classList.remove('hidden');
      tabTeamView.className = 'tab-btn px-3 py-2 rounded-lg text-xs font-bold transition flex items-center gap-1.5 bg-[#0f172a] text-white';
    } else if (viewName === 'roster') {
      viewRoster.classList.remove('hidden');
      tabRoster.className = 'tab-btn px-3 py-2 rounded-lg text-xs font-bold transition flex items-center gap-1.5 bg-[#0f172a] text-white';
      renderRosterList();
    } else if (viewName === 'leaderboard') {
      viewLeaderboard.classList.remove('hidden');
      tabLeaderboard.className = 'tab-btn px-3 py-2 rounded-lg text-xs font-bold transition flex items-center gap-1.5 bg-[#0f172a] text-white';
      renderLeaderboard();
    }
  }

  // -------------------------------------------------------------
  // Roster Directory
  // -------------------------------------------------------------
  let currentRosterFilter = 'all';

  function renderRosterList(filterOverride) {
    if (filterOverride) currentRosterFilter = filterOverride;
    const q = (searchTeamsInput.value || '').toLowerCase().trim();
    const myId = currentJudge ? currentJudge.id : 'J1';

    const filtered = teams.filter((t) => {
      if (currentRosterFilter === 'A' && t.section !== 'A') return false;
      if (currentRosterFilter === 'B' && t.section !== 'B') return false;

      const teamEvals = masterEvaluations[t.number] || {};
      const isMyScored = teamEvals[myId] && teamEvals[myId].total > 0;

      if (currentRosterFilter === 'evaluated' && !isMyScored) return false;
      if (currentRosterFilter === 'pending' && isMyScored) return false;

      if (!q) return true;
      return t.number.includes(q) || t.name.toLowerCase().includes(q) ||
        t.members.some((m) => m.name.toLowerCase().includes(q) || m.usn.toLowerCase().includes(q));
    });

    rosterShowingCount.textContent = `${filtered.length} teams`;
    rosterListGrid.innerHTML = '';

    filtered.forEach((t) => {
      const idx = teams.findIndex((item) => item.number === t.number);
      const teamEvals = masterEvaluations[t.number] || {};
      const myEv = teamEvals[myId] || {};
      const lead = t.members[0] || {};

      // Compute average
      const allTotals = Object.values(teamEvals).filter((v) => v && v.total > 0).map((v) => v.total);
      const avg = allTotals.length ? (allTotals.reduce((a, b) => a + b, 0) / allTotals.length).toFixed(1) : null;

      const card = document.createElement('div');
      card.className = 'bg-white p-3 rounded-xl border border-[#e3dccd] flex items-center justify-between gap-2 shadow-xs';

      card.innerHTML = `
        <div class="flex items-center gap-2.5 min-w-0">
          <span class="text-xl font-black text-[#ea580c] font-serif-pace">#${t.number}</span>
          <div class="truncate">
            <div class="flex items-center gap-1.5 truncate">
              <span class="text-xs font-extrabold text-[#1e293b] truncate">${t.name}</span>
              <span class="text-[9px] px-1.5 py-0.2 rounded font-bold ${t.section === 'A' ? 'bg-orange-100 text-orange-800' : 'bg-blue-100 text-blue-800'}">Sec ${t.section}</span>
            </div>
            <div class="text-[10px] text-[#64748b] truncate">
              Lead: ${lead.name || '—'} · ${allTotals.length}/${juryConfig.numJudges || 3} Judged
            </div>
          </div>
        </div>

        <div class="flex items-center gap-2 flex-shrink-0">
          ${avg ? `<span class="text-xs font-black text-[#ea580c] bg-orange-50 px-2 py-0.5 rounded-lg border border-orange-200">Avg: ${avg}</span>` : '<span class="text-[10px] text-[#94a3b8]">Pending</span>'}
          <button type="button" class="btn-grade-roster px-2.5 py-1.5 rounded-lg bg-[#0f172a] text-white text-xs font-bold active:scale-95" data-idx="${idx}">
            ${myEv.total > 0 ? 'Edit' : 'Score'}
          </button>
        </div>
      `;

      card.querySelector('.btn-grade-roster').addEventListener('click', () => {
        loadTeamIntoForm(idx);
        switchView('scoring');
      });

      rosterListGrid.appendChild(card);
    });
  }

  // -------------------------------------------------------------
  // Dynamic Leaderboard (Multi-Judge Columns & Live Ranks)
  // -------------------------------------------------------------
  function renderLeaderboard() {
    const sec = leaderboardSectionSelect.value;
    const judges = juryConfig.judges || [];
    const list = teams.filter((t) => sec === 'ALL' || t.section === sec);

    // Build Table Header Dynamically for All Judges
    leaderboardTheadTr.innerHTML = `
      <th class="py-2 px-2 text-center w-8">#</th>
      <th class="py-2 px-2 w-10 font-serif-pace text-[#ea580c]">Team</th>
      <th class="py-2 px-2.5">Team Name</th>
      <th class="py-2 px-1.5 text-center w-8">Sec</th>
      ${judges.map((j) => `<th class="py-2 px-2 text-center font-mono font-bold text-slate-700">${j.id}</th>`).join('')}
      <th class="py-2 px-2.5 text-right font-black text-[#ea580c]">Avg Score</th>
      <th class="py-2 px-2 text-center w-14">Action</th>
    `;

    // Calculate aggregated team rankings
    const ranked = list.map((t) => {
      const teamEvals = masterEvaluations[t.number] || {};
      const judgeScores = {};
      const validScores = [];

      judges.forEach((j) => {
        const ev = teamEvals[j.id];
        if (ev && ev.total !== undefined && ev.total > 0) {
          judgeScores[j.id] = ev.total;
          validScores.push(ev.total);
        } else {
          judgeScores[j.id] = null;
        }
      });

      const avg = validScores.length ? validScores.reduce((a, b) => a + b, 0) / validScores.length : -1;

      return {
        team: t,
        judgeScores: judgeScores,
        numScored: validScores.length,
        avgScore: avg
      };
    });

    ranked.sort((a, b) => b.avgScore - a.avgScore);
    leaderboardTbody.innerHTML = '';

    ranked.forEach((item, index) => {
      const t = item.team;
      const idx = teams.findIndex((x) => x.number === t.number);
      const tr = document.createElement('tr');
      tr.className = 'hover:bg-[#fdfbf7]';

      let rankIcon = `${index + 1}`;
      if (item.avgScore > 0) {
        if (index === 0) rankIcon = '🥇';
        else if (index === 1) rankIcon = '🥈';
        else if (index === 2) rankIcon = '🥉';
      }

      tr.innerHTML = `
        <td class="py-2 px-2 text-center font-bold text-[#64748b]">${rankIcon}</td>
        <td class="py-2 px-2 font-black text-[#ea580c] font-serif-pace">#${t.number}</td>
        <td class="py-2 px-2.5">
          <div class="font-bold text-[#1e293b] truncate max-w-[110px]">${t.name}</div>
        </td>
        <td class="py-2 px-1.5 text-center">
          <span class="text-[9px] font-bold px-1 py-0.2 rounded ${t.section === 'A' ? 'bg-orange-100 text-orange-800' : 'bg-blue-100 text-blue-800'}">${t.section}</span>
        </td>
        ${judges.map((j) => {
          const s = item.judgeScores[j.id];
          return `<td class="py-2 px-2 text-center font-mono text-[11px] ${s ? 'font-bold text-[#1e293b]' : 'text-slate-300'}">${s !== null ? s : '—'}</td>`;
        }).join('')}
        <td class="py-2 px-2.5 text-right font-black text-sm text-[#ea580c]">
          ${item.avgScore > 0 ? item.avgScore.toFixed(1) : '—'}
        </td>
        <td class="py-2 px-2 text-center">
          <button type="button" class="btn-lb-jump text-xs font-bold text-[#ea580c] hover:underline" data-idx="${idx}">
            Score
          </button>
        </td>
      `;

      tr.querySelector('.btn-lb-jump').addEventListener('click', () => {
        loadTeamIntoForm(idx);
        switchView('scoring');
      });

      leaderboardTbody.appendChild(tr);
    });
  }

  // -------------------------------------------------------------
  // Team Pills Bar & Grid
  // -------------------------------------------------------------
  function renderTeamPills() {
    teamPillsRow.innerHTML = '';
    const sectionTeams = teams.filter((t) => t.section === activeSectionFilter);
    const myId = currentJudge ? currentJudge.id : 'J1';

    sectionTeams.forEach((t) => {
      const idx = teams.findIndex((item) => item.number === t.number);
      const isCurrent = idx === currentTeamIndex;
      const teamEvals = masterEvaluations[t.number] || {};
      const myScore = teamEvals[myId] ? teamEvals[myId].total : null;

      const pill = document.createElement('button');
      pill.type = 'button';
      pill.className = `flex-shrink-0 px-2.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border active:scale-95 ${
        isCurrent
          ? 'bg-[#ea580c] text-white border-[#ea580c] shadow-xs'
          : myScore
          ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
          : 'bg-[#f6f1e6] text-[#475569] border-[#e3dccd]'
      }`;

      let badge = '';
      if (myScore) {
        badge = `<span class="text-[9px] bg-emerald-600 text-white rounded px-1">${myScore}</span>`;
      }

      pill.innerHTML = `<span>#${t.number}</span> <span class="max-w-[70px] truncate font-semibold text-[11px]">${t.name}</span> ${badge}`;

      pill.addEventListener('click', () => {
        loadTeamIntoForm(idx);
      });

      teamPillsRow.appendChild(pill);
    });
  }

  function renderTeamGridModal() {
    gridSectionA.innerHTML = '';
    gridSectionB.innerHTML = '';
    const myId = currentJudge ? currentJudge.id : 'J1';

    teams.forEach((t, idx) => {
      const teamEvals = masterEvaluations[t.number] || {};
      const myScore = teamEvals[myId] ? teamEvals[myId].total : null;

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `p-2 rounded-xl text-center border transition flex flex-col items-center justify-center active:scale-95 ${
        idx === currentTeamIndex
          ? 'bg-[#ea580c] text-white border-[#ea580c]'
          : myScore
          ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
          : 'bg-[#fdfbf7] text-[#1e293b] border-[#e3dccd]'
      }`;

      btn.innerHTML = `
        <span class="text-sm font-black font-serif-pace">#${t.number}</span>
        <span class="text-[10px] font-bold truncate w-full">${t.name}</span>
        ${myScore ? `<span class="text-[9px] font-black text-emerald-700">${myScore} pts</span>` : '<span class="text-[9px] text-[#94a3b8]">—</span>'}
      `;

      btn.addEventListener('click', () => {
        modalTeamGrid.classList.add('hidden');
        loadTeamIntoForm(idx);
      });

      if (t.section === 'A') gridSectionA.appendChild(btn);
      else gridSectionB.appendChild(btn);
    });
  }

  // -------------------------------------------------------------
  // Jury Setup Modal & Number of Judges Selector
  // -------------------------------------------------------------
  let pendingNumJudges = 3;

  function openJurySetupModal() {
    pendingNumJudges = juryConfig.numJudges || 3;
    renderNumJudgesButtons();
    renderAdminJudgeSlotsList();
    inputAdminPinForConfig.value = '';
    modalJurySetup.classList.remove('hidden');
  }

  function renderNumJudgesButtons() {
    numJudgesButtonGroup.innerHTML = '';
    [2, 3, 4, 5].forEach((num) => {
      const isSelected = num === pendingNumJudges;
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `btn-num-judge py-2 font-black rounded-lg border text-center transition ${
        isSelected ? 'bg-[#ea580c] text-white border-[#ea580c]' : 'bg-[#fdfbf7] text-[#1e293b] border-[#e3dccd] hover:bg-[#f6f1e6]'
      }`;
      btn.textContent = `${num} Judges`;
      btn.addEventListener('click', () => {
        pendingNumJudges = num;
        renderNumJudgesButtons();
        renderAdminJudgeSlotsList();
      });
      numJudgesButtonGroup.appendChild(btn);
    });
  }

  function renderAdminJudgeSlotsList() {
    adminJudgeSlotsList.innerHTML = '';
    for (let i = 1; i <= pendingNumJudges; i++) {
      const jid = `J${i}`;
      const existing = (juryConfig.judges || []).find((x) => x.id === jid) || {
        id: jid,
        name: `Judge ${i}`,
        pin: `${i}${i}${i}${i}`
      };

      const row = document.createElement('div');
      row.className = 'p-2 bg-[#fdfbf7] rounded-lg border border-[#e3dccd] flex items-center justify-between text-xs';
      row.innerHTML = `
        <span class="font-black text-[#ea580c] w-8">${jid}</span>
        <input type="text" class="judge-slot-name px-2 py-1 bg-white border border-[#cbd5e1] rounded text-xs flex-1 mx-2" value="${existing.name}" placeholder="Judge Name">
        <input type="text" class="judge-slot-pin px-1.5 py-1 bg-white border border-[#cbd5e1] rounded text-xs w-16 text-center font-mono" value="${existing.pin}" placeholder="PIN" maxlength="6">
      `;
      adminJudgeSlotsList.appendChild(row);
    }
  }

  async function saveJuryConfiguration() {
    const adminPin = inputAdminPinForConfig.value.trim();
    if (!adminPin) {
      alert('Please enter Admin PIN (Default: 2026) to update jury setup.');
      return;
    }

    const rows = adminJudgeSlotsList.querySelectorAll('div');
    const judgesPayload = [];
    rows.forEach((row, idx) => {
      const i = idx + 1;
      const nameInput = row.querySelector('.judge-slot-name');
      const pinInput = row.querySelector('.judge-slot-pin');
      judgesPayload.push({
        id: `J${i}`,
        name: nameInput.value.trim() || `Judge ${i}`,
        pin: pinInput.value.trim() || `${i}${i}${i}${i}`
      });
    });

    try {
      const res = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminPin: adminPin,
          numJudges: pendingNumJudges,
          judges: judgesPayload
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        alert(data.error || 'Failed to update configuration.');
        return;
      }

      juryConfig = { numJudges: data.numJudges, judges: data.judges };
      modalJurySetup.classList.add('hidden');
      renderLoginJudgeSlots();
      renderJuryConsensus();
      renderLeaderboard();
      alert(`Jury configuration updated to ${pendingNumJudges} judges!`);
    } catch (e) {
      alert('Error updating configuration.');
    }
  }

  // -------------------------------------------------------------
  // CSV Export & WhatsApp Share
  // -------------------------------------------------------------
  function exportCSV() {
    const judges = juryConfig.judges || [];
    let header = 'Team Number,Team Name,Section,Members,Lead Name';
    judges.forEach((j) => { header += `,${j.name} (${j.id}) Total`; });
    header += ',Jury Average Score (100),Phase 1 Avg (60),Phase 2 Avg (40),All Remarks\n';

    let csv = header;

    teams.forEach((t) => {
      const teamEvals = masterEvaluations[t.number] || {};
      const lead = t.members[0] ? t.members[0].name : '';
      let row = `"${t.number}","${t.name}","${t.section}","${t.member_count}","${lead}"`;

      const scores = [];
      const remarksList = [];

      judges.forEach((j) => {
        const ev = teamEvals[j.id];
        if (ev && ev.total > 0) {
          row += `,"${ev.total}"`;
          scores.push(ev.total);
          if (ev.remarks) remarksList.push(`${j.id}: ${ev.remarks}`);
        } else {
          row += ',"—"';
        }
      });

      const avg = scores.length ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(2) : '';
      const rem = remarksList.join(' | ').replace(/"/g, '""');

      row += `,"${avg}","","","${rem}"\n`;
      csv += row;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `EmbedThon_26_Official_MultiJudge_Scores_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
  }

  function shareWhatsApp() {
    let text = `*EMBEDTHON '26 — Official Multi-Judge Leaderboard*\n`;
    text += `*P.A. College of Engineering · Dept. of CSE*\n\n`;

    const judges = juryConfig.judges || [];
    const ranked = teams
      .map((t) => {
        const teamEvals = masterEvaluations[t.number] || {};
        const scores = Object.values(teamEvals).filter((v) => v && v.total > 0).map((v) => v.total);
        const avg = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
        return { num: t.number, name: t.name, sec: t.section, avg: avg, count: scores.length };
      })
      .filter((r) => r.avg > 0)
      .sort((a, b) => b.avg - a.avg);

    if (ranked.length === 0) {
      alert('No teams have been scored yet.');
      return;
    }

    text += `*Current Standings (Average Across Judges):*\n`;
    ranked.forEach((r, idx) => {
      const icon = idx === 0 ? '🥇 ' : idx === 1 ? '🥈 ' : idx === 2 ? '🥉 ' : `${idx + 1}. `;
      text += `${icon}Team #${r.num} *${r.name}* (Sec ${r.sec}) — *${r.avg.toFixed(1)}/100* (${r.count} ${r.count === 1 ? 'judge' : 'judges'})\n`;
    });

    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(() => {
        alert('Leaderboard copied to clipboard! Paste into WhatsApp.');
      });
    } else {
      prompt('Copy WhatsApp text:', text);
    }
  }

  async function resetAllEvaluations() {
    const pin = prompt('Enter Admin PIN to reset all scores on server:');
    if (!pin) return;

    try {
      const res = await fetch('/api/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminPin: pin })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        masterEvaluations = {};
        updateProgressUI();
        loadTeamIntoForm(currentTeamIndex);
        renderLeaderboard();
        alert('All scores have been reset.');
      } else {
        alert(data.error || 'Reset failed.');
      }
    } catch (e) {
      alert('Network error.');
    }
  }

  window.addEventListener('DOMContentLoaded', init);
})();
