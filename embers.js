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

  // =============================================================
  // Initialization & Data Loading
  // =============================================================
  async function init() {
    bindEvents();
    await loadEmbersData();
  }

  async function loadEmbersData() {
    try {
      const res = await fetch('/api/embers', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        schedule = data.schedule || [];
        registrations = data.registrations || [];
        googleSheetConfig = data.googleSheetConfig || googleSheetConfig;
      }
    } catch (e) {
      console.warn('Local fallback for EMBERS data:', e);
    }

    // Seed registrations from teams.js if empty
    if (!registrations.length && typeof TEAMS_DATA !== 'undefined') {
      registrations = TEAMS_DATA.map((t, idx) => {
        const lead = t.members.find(m => m.is_lead) || t.members[0];
        return {
          id: `EMB-TEAM-${t.number}`,
          timestamp: '2026-11-20T10:00:00.000Z',
          track: t.section === 'A' ? 'Track 1: Embeddathon' : 'Track 2: Project Exhibition / Expo',
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
          assignedStall: `Stall ${t.number}`
        };
      });
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
    try {
      await fetch('/api/embers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'save_schedule',
          schedule: schedule
        })
      });
    } catch (e) {
      console.warn('Failed saving schedule:', e);
    }
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

  function parseAndImportCsv(csvText, sourceUrl = '') {
    const lines = csvText.trim().split(/\r?\n/).filter(Boolean);
    if (lines.length < 2) {
      alert('CSV file appears empty or missing rows.');
      return;
    }

    const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, '').toLowerCase());
    
    // Fuzzy column detection
    const findCol = (keywords) => {
      return headers.findIndex(h => keywords.some(k => h.includes(k.toLowerCase())));
    };

    const colTimestamp = findCol(['timestamp', 'date', 'time']);
    const colTrack = findCol(['track', 'event', 'select track']);
    const colTitle = findCol(['title', 'project', 'paper']);
    const colCollege = findCol(['college', 'institution']);
    const colDept = findCol(['dept', 'department', 'semester', 'year']);
    const colName = findCol(['leader', 'name', 'full name']);
    const colEmail = findCol(['email']);
    const colPhone = findCol(['phone', 'whatsapp', 'mobile', 'contact']);
    const colUsn = findCol(['usn', 'roll']);
    const colCount = findCol(['members', 'size', 'total number']);
    const colAbstract = findCol(['abstract', 'description', 'synopsis']);
    const colDomain = findCol(['domain', 'category']);
    const colHw = findCol(['hardware', 'power', 'requirement']);

    const newRecords = [];

    for (let i = 1; i < lines.length; i++) {
      // Regex split to handle quotes
      const row = lines[i].match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || lines[i].split(',');
      const clean = row.map(v => (v || '').trim().replace(/^"|"$/g, ''));

      const rec = {
        id: `GOOGLE-${Date.now()}-${i}`,
        timestamp: colTimestamp >= 0 ? clean[colTimestamp] : new Date().toISOString(),
        track: colTrack >= 0 && clean[colTrack] ? clean[colTrack] : 'Track 1: Embeddathon',
        title: colTitle >= 0 && clean[colTitle] ? clean[colTitle] : 'Untitled Innovation',
        college: colCollege >= 0 && clean[colCollege] ? clean[colCollege] : 'P.A. College of Engineering',
        dept: colDept >= 0 && clean[colDept] ? clean[colDept] : 'CSE',
        leaderName: colName >= 0 && clean[colName] ? clean[colName] : 'Lead Participant',
        email: colEmail >= 0 && clean[colEmail] ? clean[colEmail] : '',
        phone: colPhone >= 0 && clean[colPhone] ? clean[colPhone] : '',
        usn: colUsn >= 0 && clean[colUsn] ? clean[colUsn] : '',
        membersCount: colCount >= 0 && parseInt(clean[colCount]) ? parseInt(clean[colCount]) : 1,
        abstract: colAbstract >= 0 && clean[colAbstract] ? clean[colAbstract] : '',
        domain: colDomain >= 0 && clean[colDomain] ? clean[colDomain] : 'Embedded Systems',
        hardwareReq: colHw >= 0 && clean[colHw] ? clean[colHw] : 'Standard 230V',
        feePaid: true,
        verified: true,
        assignedStall: ''
      };

      newRecords.push(rec);
    }

    // Merge or push to registrations
    newRecords.forEach(nr => {
      const existingIdx = registrations.findIndex(r => r.email && r.email.toLowerCase() === nr.email.toLowerCase());
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
    fetch('/api/embers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'sync_responses',
        records: newRecords,
        sheetCsvUrl: sourceUrl
      })
    }).catch(e => console.warn(e));

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
      const trackShort = (r.track || '').includes('Embeddathon')
        ? '<span class="px-1.5 py-0.5 rounded text-[9px] font-black uppercase bg-orange-100 text-[#ea580c]">Track 1</span>'
        : (r.track || '').includes('Expo') || (r.track || '').includes('Exhibition')
        ? '<span class="px-1.5 py-0.5 rounded text-[9px] font-black uppercase bg-amber-100 text-amber-800">Track 2</span>'
        : '<span class="px-1.5 py-0.5 rounded text-[9px] font-black uppercase bg-indigo-100 text-indigo-800">Track 3</span>';

      return `
        <tr class="hover:bg-[#f6f1e6]/60 transition text-xs">
          <td class="py-2.5 px-3 text-center font-mono font-bold text-slate-500">${idx + 1}</td>
          
          <!-- Track & Title -->
          <td class="py-2.5 px-3">
            <div class="flex items-center gap-1.5 mb-0.5">
              ${trackBadgeShort(r.track)}
              <span class="text-[10px] text-[#64748b] font-mono">${r.id}</span>
            </div>
            <span class="font-extrabold text-[#0f172a] block font-serif-pace text-sm leading-tight">${r.title}</span>
            <span class="text-[10px] text-[#64748b] block italic truncate max-w-xs">${r.domain || 'Engineering Innovation'}</span>
          </td>

          <!-- Team Leader & Contact -->
          <td class="py-2.5 px-3">
            <span class="font-bold text-[#0f172a] block">${r.leaderName}</span>
            <span class="text-[10px] text-[#64748b] font-mono block">${r.usn || '--'}</span>
            <div class="flex items-center gap-2 pt-0.5 text-[10px]">
              ${r.phone ? `<a href="https://wa.me/${r.phone.replace(/[^0-9]/g, '')}" target="_blank" class="text-emerald-600 font-bold hover:underline flex items-center gap-0.5"><span>📱</span><span>${r.phone}</span></a>` : ''}
              ${r.email ? `<a href="mailto:${r.email}" class="text-blue-600 font-bold hover:underline">✉️</a>` : ''}
            </div>
          </td>

          <!-- College & Dept -->
          <td class="py-2.5 px-3">
            <span class="font-bold text-[#0f172a] block truncate max-w-[180px]">${r.college}</span>
            <span class="text-[10px] text-[#64748b] block truncate max-w-[180px]">${r.dept}</span>
          </td>

          <!-- Team Size -->
          <td class="py-2.5 px-2 text-center">
            <span class="px-2 py-0.5 rounded-full text-xs font-bold bg-[#f6f1e6] text-[#0f172a] border border-[#e3dccd]">
              ${r.membersCount || 1} pax
            </span>
          </td>

          <!-- Stall / Presentation Slot -->
          <td class="py-2.5 px-2.5 text-center">
            <input type="text" value="${r.assignedStall || ''}" placeholder="Assign..." 
                   class="w-20 text-center font-mono text-xs font-bold bg-white border border-[#cbd5e1] rounded-lg px-1 py-0.5 focus:ring-1 focus:ring-[#ea580c]"
                   onchange="window.updateStall('${r.id}', this.value)">
          </td>

          <!-- Fee Status Toggle -->
          <td class="py-2.5 px-2 text-center">
            <button type="button" class="px-2 py-0.5 rounded text-[10px] font-black uppercase transition ${r.feePaid ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-rose-100 text-rose-800 border border-rose-300'}"
                    onclick="window.toggleFeeStatus('${r.id}')">
              ${r.feePaid ? 'PAID ✓' : 'UNPAID ✕'}
            </button>
          </td>

          <!-- Actions -->
          <td class="py-2.5 px-3 text-right">
            <button type="button" class="p-1 rounded hover:bg-rose-50 text-rose-600 font-bold transition text-xs" onclick="window.deleteRegistration('${r.id}')" title="Delete Team">
              🗑️
            </button>
          </td>
        </tr>
      `;
    }).join('');
  }

  function trackBadgeShort(track) {
    if ((track || '').includes('Embeddathon') || (track || '').includes('Track 1')) {
      return '<span class="px-1.5 py-0.2 rounded text-[9px] font-black uppercase bg-orange-100 text-[#ea580c]">Track 1</span>';
    }
    if ((track || '').includes('Expo') || (track || '').includes('Track 2')) {
      return '<span class="px-1.5 py-0.2 rounded text-[9px] font-black uppercase bg-amber-100 text-amber-800">Track 2</span>';
    }
    return '<span class="px-1.5 py-0.2 rounded text-[9px] font-black uppercase bg-indigo-100 text-indigo-800">Track 3</span>';
  }

  window.updateStall = async function (id, value) {
    const reg = registrations.find(r => r.id === id);
    if (reg) {
      reg.assignedStall = value.trim();
      fetch('/api/embers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update_registration', registration: reg })
      }).catch(e => console.warn(e));
    }
  };

  window.toggleFeeStatus = async function (id) {
    const reg = registrations.find(r => r.id === id);
    if (reg) {
      reg.feePaid = !reg.feePaid;
      renderRegistrations();
      fetch('/api/embers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update_registration', registration: reg })
      }).catch(e => console.warn(e));
    }
  };

  window.deleteRegistration = async function (id) {
    if (!confirm('Remove this team from the EMBERS directory?')) return;
    registrations = registrations.filter(r => r.id !== id);
    updateMetrics();
    renderRegistrations();
    fetch('/api/embers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete_registration', id: id })
    }).catch(e => console.warn(e));
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

        fetch('/api/embers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'add_registration', registration: newReg })
        }).catch(e => console.warn(e));
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
