// EMBEDTHON '26 - Chief Coordinator & Jury Administration Console
// Standalone admin management page with real-time sync, phase activation, and judge roster controls

(function () {
  'use strict';

  const STORAGE_KEY_AUTH = 'embedthon_judge_auth_v4';

  let teams = typeof TEAMS_DATA !== 'undefined' ? TEAMS_DATA : [];
  let masterConfig = {
    activePhase: 'PHASE_1',
    adminPin: '2026',
    internalJudges: [
      { id: 'INT-1', name: 'Internal Judge 1', role: 'CSE Faculty Mentor', pin: '1111' },
      { id: 'INT-2', name: 'Internal Judge 2', role: 'CSE Faculty Mentor', pin: '2222' }
    ],
    externalJudges: [
      { id: 'EXT-1', name: 'External Judge 1', role: 'Industry Expert', pin: '3333' },
      { id: 'EXT-2', name: 'External Judge 2', role: 'IEEE Jury Member', pin: '4444' }
    ]
  };

  let masterEvaluations = {};
  let draftConfig = null;
  let pollingInterval = null;
  let activeMatrixFilter = 'ALL';

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
  const adminMatrixTbody = document.getElementById('adminMatrixTbody');

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

    renderMetrics();
    renderPhaseCards();
    renderJudgeRosters();
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
      unlockConsole();
    } catch (e) {
      // Local offline fallback
      if (pin === (masterConfig.adminPin || '2026')) {
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
      const teamEvals = masterEvaluations[t.number] || {};
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
        currentActivePhaseBadge.textContent = 'Phase 1 Active (Mentoring 30%)';
        currentActivePhaseBadge.className = 'px-2.5 py-1 rounded-full text-xs font-black bg-orange-100 text-[#ea580c] border border-orange-200';
      } else if (curPhase === 'PHASE_2') {
        currentActivePhaseBadge.textContent = 'Phase 2 Active (Final Expo 70%)';
        currentActivePhaseBadge.className = 'px-2.5 py-1 rounded-full text-xs font-black bg-indigo-100 text-indigo-700 border border-indigo-200';
      } else {
        currentActivePhaseBadge.textContent = 'Both Phases Active (100% Total)';
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
  function renderJudgeRosters() {
    if (!draftConfig) return;

    // 1. Internal Judges (Phase 1)
    adminInternalRosterList.innerHTML = '';
    (draftConfig.internalJudges || []).forEach((j, idx) => {
      // Calculate how many teams this judge evaluated
      let scoredCount = 0;
      Object.values(masterEvaluations).forEach((teamScores) => {
        if (teamScores[j.id] && teamScores[j.id].phase1 > 0) scoredCount++;
      });

      const card = document.createElement('div');
      card.className = 'p-3 rounded-xl border border-[#fed7aa] bg-[#fff8f3] space-y-2 text-xs shadow-2xs';

      card.innerHTML = `
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <span class="px-2 py-0.5 rounded bg-[#ea580c] text-white font-mono font-black text-[10px]">${j.id}</span>
            <span class="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.2 rounded-full">${scoredCount} / 24 teams scored</span>
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
      `;

      adminInternalRosterList.appendChild(card);
    });

    // 2. External Judges (Phase 2)
    adminExternalRosterList.innerHTML = '';
    (draftConfig.externalJudges || []).forEach((j, idx) => {
      let scoredCount = 0;
      Object.values(masterEvaluations).forEach((teamScores) => {
        if (teamScores[j.id] && teamScores[j.id].phase2 > 0) scoredCount++;
      });

      const card = document.createElement('div');
      card.className = 'p-3 rounded-xl border border-indigo-200 bg-indigo-50/40 space-y-2 text-xs shadow-2xs';

      card.innerHTML = `
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <span class="px-2 py-0.5 rounded bg-indigo-600 text-white font-mono font-black text-[10px]">${j.id}</span>
            <span class="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.2 rounded-full">${scoredCount} / 24 teams scored</span>
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
        draftConfig.internalJudges.splice(idx, 1);
        renderJudgeRosters();
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
        draftConfig.externalJudges.splice(idx, 1);
        renderJudgeRosters();
      };
    });
  }

  // -------------------------------------------------------------
  // Save All Changes to Serverless API
  // -------------------------------------------------------------
  async function saveAllAdminChanges() {
    const pin = prompt('Enter Admin PIN (Default: 2026) to apply changes to all devices:');
    if (!pin) return;

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
          externalJudges: draftConfig.externalJudges
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

      showToast('✓ Active phase and judge roster successfully synced across all phones!');
      renderMetrics();
      renderPhaseCards();
      renderJudgeRosters();
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

    const filterSec = activeMatrixFilter;
    const filteredTeams = teams.filter((t) => filterSec === 'ALL' || t.section === filterSec);

    filteredTeams.forEach((t, idx) => {
      const teamEvals = masterEvaluations[t.number] || {};

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

      const tr = document.createElement('tr');
      tr.className = idx % 2 === 0 ? 'bg-white' : 'bg-[#fdfbf7]';

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

      adminMatrixTbody.appendChild(tr);
    });
  }

  // -------------------------------------------------------------
  // Exports & Reset
  // -------------------------------------------------------------
  function exportCSV() {
    let csv = 'Rank,Team Number,Team Name,Section,Phase 1 (Mentoring 30%),Phase 2 (Final Expo 70%),Grand Total (100%)\n';

    const ranked = teams
      .map((t) => {
        const teamEvals = masterEvaluations[t.number] || {};
        const p1Scores = Object.values(teamEvals).filter((x) => x && x.phase1 > 0).map((x) => x.phase1);
        const p2Scores = Object.values(teamEvals).filter((x) => x && x.phase2 > 0).map((x) => x.phase2);

        const p1Avg = p1Scores.length ? Number((p1Scores.reduce((a, b) => a + b, 0) / p1Scores.length).toFixed(1)) : 0;
        const p2Avg = p2Scores.length ? Number((p2Scores.reduce((a, b) => a + b, 0) / p2Scores.length).toFixed(1)) : 0;
        const grandTotal = Number((p1Avg + p2Avg).toFixed(1));

        return { team: t, p1Avg, p2Avg, grandTotal };
      })
      .sort((a, b) => b.grandTotal - a.grandTotal);

    ranked.forEach((item, idx) => {
      csv += `${idx + 1},#${item.team.number},"${item.team.name.replace(/"/g, '""')}",${item.team.section},${item.p1Avg},${item.p2Avg},${item.grandTotal}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `EMBEDTHON_26_Official_Scores_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  function shareWhatsApp() {
    let msg = `*EMBEDTHON '26 · OFFICIAL EVALUATION STANDINGS*\nP.A. College of Engineering · Dept. of CSE\n\n`;

    const top5 = teams
      .map((t) => {
        const teamEvals = masterEvaluations[t.number] || {};
        const p1Scores = Object.values(teamEvals).filter((x) => x && x.phase1 > 0).map((x) => x.phase1);
        const p2Scores = Object.values(teamEvals).filter((x) => x && x.phase2 > 0).map((x) => x.phase2);

        const p1Avg = p1Scores.length ? Number((p1Scores.reduce((a, b) => a + b, 0) / p1Scores.length).toFixed(1)) : 0;
        const p2Avg = p2Scores.length ? Number((p2Scores.reduce((a, b) => a + b, 0) / p2Scores.length).toFixed(1)) : 0;
        const grandTotal = Number((p1Avg + p2Avg).toFixed(1));

        return { team: t, p1Avg, p2Avg, grandTotal };
      })
      .sort((a, b) => b.grandTotal - a.grandTotal)
      .slice(0, 5);

    top5.forEach((item, idx) => {
      const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `${idx + 1}.`;
      msg += `${medal} Team #${item.team.number}: ${item.team.name} -> Total: *${item.grandTotal}/100* (P1: ${item.p1Avg}, P2: ${item.p2Avg})\n`;
    });

    msg += `\nPortal: https://embedthon-judge-portal.vercel.app/`;
    const shareUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`;
    window.open(shareUrl, '_blank');
  }

  async function resetAllEvaluations() {
    const pin = prompt('Enter Admin PIN (Default: 2026) to erase all team evaluations:');
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
      });
    }

    if (btnSaveAllAdminChanges) {
      btnSaveAllAdminChanges.addEventListener('click', saveAllAdminChanges);
    }

    // Matrix Filter
    if (matrixSectionFilter) {
      matrixSectionFilter.addEventListener('change', (e) => {
        activeMatrixFilter = e.target.value;
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
