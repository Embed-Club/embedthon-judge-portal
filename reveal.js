// EMBEDTHON '26 · Grand Results Reveal Ceremony Script
// Standalone Projector-Ready Presentation Engine

(function () {
  'use strict';

  // -------------------------------------------------------------
  // Global State
  // -------------------------------------------------------------
  let masterEvaluations = {};
  let juryConfig = {};
  let currentCategory = 'OVERALL';
  let currentStep = 0; // 0: Welcome, 1: 3rd, 2: 2nd, 3: 1st, 4: Podium
  let winnersList = [];
  let isSoundMuted = false;
  let pollingInterval = null;
  let lastDataChecksum = '';

  // Elements
  const stageArena = document.getElementById('ceremonyStageArena');
  const stageCategorySelect = document.getElementById('stageCategorySelect');
  const stageStepIndicator = document.getElementById('stageStepIndicator');
  const btnPrevStep = document.getElementById('btnPrevStep');
  const btnNextStep = document.getElementById('btnNextStep');
  const btnNextLabel = document.getElementById('btnNextLabel');
  const btnConfettiBurst = document.getElementById('btnConfettiBurst');
  const btnAudioToggle = document.getElementById('btnAudioToggle');
  const audioIcon = document.getElementById('audioIcon');
  const audioStatusText = document.getElementById('audioStatusText');
  const btnFullscreenToggle = document.getElementById('btnFullscreenToggle');
  const fsIcon = document.getElementById('fsIcon');
  const liveSyncStatusBadge = document.getElementById('liveSyncStatusBadge');
  const standingsModal = document.getElementById('standingsModal');
  const btnOpenStandingsModal = document.getElementById('btnOpenStandingsModal');
  const btnCloseStandingsModal = document.getElementById('btnCloseStandingsModal');
  const modalSectionFilter = document.getElementById('modalSectionFilter');
  const standingsTableBody = document.getElementById('standingsTableBody');

  // =============================================================
  // Native Procedural Web Audio API Sound Engine
  // =============================================================
  class StageSoundEngine {
    constructor() {
      this.ctx = null;
    }

    init() {
      if (!this.ctx) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (AudioCtx) this.ctx = new AudioCtx();
      }
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
    }

    // 1. Snare Drumroll Crescendo
    playDrumroll(duration = 2.0) {
      if (isSoundMuted) return;
      this.init();
      if (!this.ctx) return;

      const t = this.ctx.currentTime;
      const bufferSize = Math.floor(this.ctx.sampleRate * duration);
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);

      for (let i = 0; i < bufferSize; i++) {
        const flutter = 0.6 + 0.4 * Math.sin(i / 130);
        data[i] = (Math.random() * 2 - 1) * flutter;
      }

      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(600, t);
      filter.frequency.linearRampToValueAtTime(1250, t + duration);
      filter.Q.value = 2.4;

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.06, t);
      gain.gain.exponentialRampToValueAtTime(0.85, t + duration - 0.05);
      gain.gain.linearRampToValueAtTime(0.001, t + duration);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      noise.start(t);
      noise.stop(t + duration);
    }

    // 2. Bright Cymbal Crash
    playCymbalCrash() {
      if (isSoundMuted) return;
      this.init();
      if (!this.ctx) return;

      const t = this.ctx.currentTime;
      const duration = 2.5;
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
      filter.frequency.setValueAtTime(4500, t);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.9, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + duration);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      noise.start(t);
      noise.stop(t + duration);
    }

    // 3. Victory Brass Fanfares
    playFanfare(rank = 1) {
      if (isSoundMuted) return;
      this.init();
      if (!this.ctx) return;

      const t = this.ctx.currentTime;

      // Bronze: Warm Triad (Rank 3)
      if (rank === 3) {
        this._playHornNote(261.63, t, 0.35, 0.45); // C4
        this._playHornNote(329.63, t + 0.16, 0.35, 0.5); // E4
        this._playHornNote(392.00, t + 0.32, 0.7, 0.65); // G4
        this._playHornNote(523.25, t + 0.5, 1.4, 0.8); // C5
        setTimeout(() => this.playCymbalCrash(), 480);
      }
      // Silver: Bright Fanfare (Rank 2)
      else if (rank === 2) {
        this._playHornNote(293.66, t, 0.25, 0.5); // D4
        this._playHornNote(369.99, t + 0.14, 0.25, 0.55); // F#4
        this._playHornNote(440.00, t + 0.28, 0.45, 0.7); // A4
        this._playHornNote(587.33, t + 0.42, 1.6, 0.85); // D5
        setTimeout(() => this.playCymbalCrash(), 400);
      }
      // Gold: Majestic Royal Champion Fanfare (Rank 1)
      else {
        const notes = [
          { f: 261.63, start: 0, dur: 0.16, vol: 0.7 },
          { f: 261.63, start: 0.16, dur: 0.16, vol: 0.7 },
          { f: 261.63, start: 0.32, dur: 0.16, vol: 0.7 },
          { f: 349.23, start: 0.48, dur: 0.45, vol: 0.85 },
          { f: 440.00, start: 0.95, dur: 0.22, vol: 0.85 },
          { f: 523.25, start: 1.18, dur: 2.2, vol: 0.95 },
          { f: 659.25, start: 1.18, dur: 2.2, vol: 0.8 },
          { f: 783.99, start: 1.18, dur: 2.2, vol: 0.9 }
        ];

        notes.forEach(n => {
          this._playHornNote(n.f, t + n.start, n.dur, n.vol);
        });

        setTimeout(() => this.playCymbalCrash(), 1150);
        setTimeout(() => this.playCrowdCheer(4.0), 1200);
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
      osc2.frequency.setValueAtTime(freq * 1.003, startTime);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(freq * 1.6, startTime);
      filter.frequency.linearRampToValueAtTime(freq * 3.6, startTime + 0.08);

      gain.gain.setValueAtTime(0.001, startTime);
      gain.gain.linearRampToValueAtTime(vol, startTime + 0.04);
      gain.gain.setValueAtTime(vol * 0.85, startTime + duration - 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

      osc1.connect(filter);
      osc2.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      osc1.start(startTime);
      osc2.start(startTime);
      osc1.stop(startTime + duration + 0.05);
      osc2.stop(startTime + duration + 0.05);
    }

    // 4. Celebratory Crowd Applause / Cheer
    playCrowdCheer(duration = 3.5) {
      if (isSoundMuted) return;
      this.init();
      if (!this.ctx) return;

      const t = this.ctx.currentTime;
      const bufferSize = Math.floor(this.ctx.sampleRate * duration);
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);

      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * (0.8 + 0.2 * Math.sin(i / 800));
      }

      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1400, t);
      filter.Q.value = 1.2;

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.02, t);
      gain.gain.linearRampToValueAtTime(0.45, t + 0.4);
      gain.gain.setValueAtTime(0.4, t + duration - 0.8);
      gain.gain.exponentialRampToValueAtTime(0.001, t + duration);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      noise.start(t);
      noise.stop(t + duration);
    }
  }

  const soundEngine = new StageSoundEngine();

  // =============================================================
  // Confetti Animation Helper
  // =============================================================
  function launchConfetti(type = 'standard') {
    if (typeof confetti !== 'function') return;

    if (type === 'mega') {
      // Golden grand champion burst
      const duration = 3.5 * 1000;
      const end = Date.now() + duration;
      const colors = ['#ea580c', '#f59e0b', '#fbbf24', '#0f172a', '#ffffff'];

      (function frame() {
        confetti({
          particleCount: 5,
          angle: 60,
          spread: 70,
          origin: { x: 0, y: 0.7 },
          colors: colors
        });
        confetti({
          particleCount: 5,
          angle: 120,
          spread: 70,
          origin: { x: 1, y: 0.7 },
          colors: colors
        });
        if (Date.now() < end) requestAnimationFrame(frame);
      })();
    } else {
      confetti({
        particleCount: 80,
        spread: 80,
        origin: { y: 0.65 },
        colors: ['#ea580c', '#f59e0b', '#0f172a', '#cbd5e1']
      });
    }
  }

  // =============================================================
  // Data Calculation & Sync
  // =============================================================
  async function fetchServerData() {
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
          recomputeStandings();
        }
      }
    } catch (e) {
      console.warn('Live sync fallback to local demo data:', e);
      if (!winnersList.length) recomputeStandings();
    }
  }

  function recomputeStandings() {
    const rawList = (typeof TEAMS_DATA !== 'undefined' ? TEAMS_DATA : []).map((t) => {
      const teamEvals = masterEvaluations[t.number] || {};
      const p1Scores = Object.values(teamEvals).filter((x) => x && x.phase1 > 0).map((x) => x.phase1);
      const p2Scores = Object.values(teamEvals).filter((x) => x && x.phase2 > 0).map((x) => x.phase2);

      const p1Avg = p1Scores.length ? Number((p1Scores.reduce((a, b) => a + b, 0) / p1Scores.length).toFixed(1)) : 0;
      const p2Avg = p2Scores.length ? Number((p2Scores.reduce((a, b) => a + b, 0) / p2Scores.length).toFixed(1)) : 0;
      const grandTotal = Number((p1Avg + p2Avg).toFixed(1));

      return {
        team: t,
        p1Avg,
        p2Avg,
        grandTotal,
        numJudges: Object.keys(teamEvals).length
      };
    });

    const filtered = rawList
      .filter((item) => currentCategory === 'OVERALL' || item.team.section === currentCategory)
      .sort((a, b) => b.grandTotal - a.grandTotal);

    // If no evaluations are saved yet (preview mode), provide top 3 preview
    if (!filtered.length || filtered[0].grandTotal === 0) {
      const pool = (currentCategory === 'OVERALL' ? TEAMS_DATA.slice(0, 3) : TEAMS_DATA.filter(x => x.section === currentCategory).slice(0, 3));
      winnersList = pool.map((t, idx) => ({
        team: t,
        p1Avg: idx === 0 ? 28.5 : idx === 1 ? 27.0 : 25.5,
        p2Avg: idx === 0 ? 66.5 : idx === 1 ? 64.0 : 61.5,
        grandTotal: idx === 0 ? 95.0 : idx === 1 ? 91.0 : 87.0,
        isPreview: true
      }));
    } else {
      winnersList = filtered;
    }

    renderStage();
    renderStandingsTable();
  }

  function getCategoryTitle(cat) {
    if (cat === 'A') return 'Section A (Teams 01–11)';
    if (cat === 'B') return 'Section B (Teams 12–24)';
    return 'Overall Champions (All 24 Teams)';
  }

  // =============================================================
  // Stage Rendering
  // =============================================================
  function renderStage() {
    if (!stageArena) return;

    btnPrevStep.disabled = currentStep === 0;

    if (currentStep === 0) {
      renderWelcomeStep();
    } else if (currentStep === 1) {
      renderWinnerCardStep(2, 3); // Rank 3 (index 2)
    } else if (currentStep === 2) {
      renderWinnerCardStep(1, 2); // Rank 2 (index 1)
    } else if (currentStep === 3) {
      renderWinnerCardStep(0, 1); // Rank 1 (index 0)
    } else if (currentStep === 4) {
      renderPodiumStep();
    }
  }

  // --- Step 0: Welcome Stage ---
  function renderWelcomeStep() {
    stageStepIndicator.textContent = 'Stage Ready · Grand Reveal';
    btnNextLabel.textContent = 'Begin Announcement ▶';

    const isPreview = winnersList.some(x => x.isPreview);

    stageArena.innerHTML = `
      <div class="max-w-xl w-full space-y-5 my-auto anim-card-pop">
        
        <!-- Official Crest & Circular Laurel -->
        <div class="relative inline-block mx-auto">
          <div class="w-28 h-28 sm:w-32 sm:h-32 rounded-full border-4 border-[#fed7aa] bg-white shadow-xl flex items-center justify-center p-3.5 mx-auto">
            <img src="assets/pace_crest.png" alt="PACE Crest" class="w-full h-full object-contain">
          </div>
          <div class="absolute -bottom-2 inset-x-0 mx-auto w-max px-3 py-0.5 rounded-full bg-[#ea580c] text-white text-[10px] font-black uppercase tracking-wider shadow-sm">
            Official Valedictory
          </div>
        </div>

        <!-- Official Department Header -->
        <div class="space-y-1">
          <h2 class="text-xs sm:text-sm font-extrabold tracking-widest uppercase text-[#64748b]">
            P.A. College of Engineering · Mangaluru
          </h2>
          <h1 class="text-xl sm:text-3xl font-black uppercase text-[#0f172a] font-serif-pace tracking-wide">
            EMBEDTHON '26 & EMBERS '26
          </h1>
          <p class="text-xs sm:text-sm font-bold text-[#ea580c] uppercase tracking-wider">
            Grand Results Reveal Ceremony
          </p>
        </div>

        <!-- Selected Category & Status Card -->
        <div class="p-4 rounded-2xl bg-white border-2 border-[#fed7aa] shadow-md space-y-2 text-center">
          <span class="text-[11px] font-black uppercase text-[#64748b] block tracking-wide">Selected Award Category</span>
          <div class="inline-block px-4 py-1.5 rounded-full bg-[#fff8f3] border border-[#ea580c]/30 text-sm font-black text-[#ea580c]">
            ${getCategoryTitle(currentCategory)}
          </div>
          <p class="text-xs text-[#475569] pt-1">
            ${isPreview ? '⚠️ No evaluation scores saved yet. Displaying demo rehearsal mode.' : '✅ Verified live jury evaluations loaded from server.'}
          </p>
        </div>

        <!-- Big Launch Action Button -->
        <div class="pt-2">
          <button type="button" class="w-full py-4 px-8 rounded-2xl bg-[#ea580c] hover:bg-[#c2410c] font-black text-sm sm:text-base uppercase tracking-wider text-white shadow-xl active:scale-[0.98] transition flex items-center justify-center gap-2" onclick="window.nextStageStep()">
            <span>Start Reveal Ceremony</span>
            <span>▶</span>
          </button>
          <p class="text-[11px] text-[#64748b] mt-2">
            Tip: Press <kbd class="px-1.5 py-0.5 rounded bg-slate-200 font-mono text-[10px] text-slate-800">Space</kbd> or <kbd class="px-1.5 py-0.5 rounded bg-slate-200 font-mono text-[10px] text-slate-800">→</kbd> to advance
          </p>
        </div>

      </div>
    `;
  }

  // --- Step 1, 2, 3: Individual Winner Card Unveil ---
  function renderWinnerCardStep(winnerIndex, rankNumber) {
    const item = winnersList[winnerIndex];
    if (!item) return;

    const isChamp = rankNumber === 1;
    const isSilver = rankNumber === 2;
    const isBronze = rankNumber === 3;

    stageStepIndicator.textContent = `Rank ${rankNumber} · ${isChamp ? 'Grand Champion' : isSilver ? '1st Runner-Up' : '2nd Runner-Up'}`;
    btnNextLabel.textContent = isChamp ? 'View Complete Podium 🏆 ▶' : isSilver ? 'Reveal Champion 👑 ▶' : 'Next: 1st Runner-Up 🥈 ▶';

    // Play procedural sound & effects
    soundEngine.playDrumroll(isChamp ? 2.3 : 1.8);
    setTimeout(() => {
      soundEngine.playFanfare(rankNumber);
      if (isChamp) {
        launchConfetti('mega');
      } else {
        launchConfetti('standard');
      }
    }, isChamp ? 2200 : 1700);

    const badgeColor = isChamp ? 'bg-[#ea580c] text-white shadow-md' : isSilver ? 'bg-[#0f172a] text-white shadow-md' : 'bg-[#b45309] text-white shadow-md';
    const cardBorder = isChamp ? 'border-4 border-[#ea580c] anim-gold-glow' : isSilver ? 'border-2 border-slate-400 shadow-xl' : 'border-2 border-amber-600 shadow-xl';
    const trophyEmoji = isChamp ? '👑' : isSilver ? '🥈' : '🥉';
    const rankTitle = isChamp ? '1ST PLACE · GRAND CHAMPION' : isSilver ? '2ND PLACE · 1ST RUNNER-UP' : '3RD PLACE · 2ND RUNNER-UP';

    const membersHtml = item.team.members.map(m => `
      <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${m.is_lead ? 'bg-[#ea580c] text-white shadow-xs' : 'bg-[#f6f1e6] text-[#1e293b] border border-[#e3dccd]'}">
        ${m.is_lead ? '★ ' : ''}${m.name}
        <span class="text-[9px] opacity-75 font-mono">(${m.usn.slice(-3)})</span>
      </span>
    `).join('');

    stageArena.innerHTML = `
      <div class="max-w-lg w-full space-y-4 my-auto anim-card-pop">
        
        <!-- Rank Announcement Ribbon -->
        <div class="inline-flex items-center gap-2 px-5 py-2 rounded-full ${badgeColor} text-xs sm:text-sm font-black tracking-widest uppercase">
          <span class="text-base sm:text-lg">${trophyEmoji}</span>
          <span>${rankTitle}</span>
        </div>

        <!-- Main Certificate Style Winner Card -->
        <div class="p-6 sm:p-8 rounded-3xl bg-white ${cardBorder} space-y-5 text-center relative overflow-hidden">
          
          <!-- PACE Department Sub-header -->
          <div class="flex items-center justify-between border-b border-[#f0ebe0] pb-2 text-[10px] text-[#64748b] uppercase tracking-wider font-bold">
            <span>P.A. College of Engineering</span>
            <span class="text-[#ea580c]">Dept. of CSE · EmbedThon '26</span>
          </div>

          <!-- Team Number & Project -->
          <div class="space-y-1.5 pt-1">
            <span class="text-xs font-mono font-black text-[#ea580c] tracking-widest uppercase">
              TEAM ${item.team.number} · SECTION ${item.team.section}
            </span>
            <h2 class="text-2xl sm:text-3xl font-black text-[#0f172a] font-serif-pace tracking-tight leading-tight">
              ${item.team.name}
            </h2>
            <p class="text-xs sm:text-sm text-[#475569] font-medium italic max-w-md mx-auto">
              "${item.team.abstract_title || 'Autonomous Embedded System Design'}"
            </p>
          </div>

          <!-- Team Members Roster -->
          <div class="space-y-1.5 pt-1">
            <span class="text-[10px] font-black uppercase text-[#64748b] block">Team Members</span>
            <div class="flex flex-wrap justify-center gap-1.5">
              ${membersHtml}
            </div>
          </div>

          <!-- Official Score Breakdown Matrix -->
          <div class="grid grid-cols-3 gap-2 pt-2 border-t border-[#f0ebe0]">
            <div class="p-2.5 rounded-xl bg-[#f6f1e6] border border-[#e3dccd]">
              <span class="text-[9px] font-black uppercase text-[#64748b] block">Phase 1 (30%)</span>
              <span class="text-base sm:text-lg font-black text-[#0f172a] font-mono">${item.p1Avg}</span>
              <span class="text-[9px] text-slate-400 block">/ 30</span>
            </div>
            <div class="p-2.5 rounded-xl bg-[#f6f1e6] border border-[#e3dccd]">
              <span class="text-[9px] font-black uppercase text-[#64748b] block">Phase 2 (70%)</span>
              <span class="text-base sm:text-lg font-black text-[#0f172a] font-mono">${item.p2Avg}</span>
              <span class="text-[9px] text-slate-400 block">/ 70</span>
            </div>
            <div class="p-2.5 rounded-xl bg-[#fff8f3] border-2 border-[#fed7aa]">
              <span class="text-[9px] font-black uppercase text-[#ea580c] block">Grand Total</span>
              <span class="text-lg sm:text-xl font-black text-[#ea580c] font-mono">${item.grandTotal}</span>
              <span class="text-[9px] text-[#ea580c]/70 block">/ 100</span>
            </div>
          </div>

        </div>

      </div>
    `;
  }

  // --- Step 4: Grand Olympic Podium ---
  function renderPodiumStep() {
    stageStepIndicator.textContent = 'Ceremony Complete · Grand Olympic Podium';
    btnNextLabel.textContent = 'Replay Ceremony 🔄';

    launchConfetti('mega');

    const champ = winnersList[0];
    const silver = winnersList[1];
    const bronze = winnersList[2];

    stageArena.innerHTML = `
      <div class="max-w-4xl w-full space-y-6 my-auto anim-card-pop">
        
        <!-- Header -->
        <div class="text-center space-y-1">
          <h2 class="text-xs sm:text-sm font-black tracking-widest uppercase text-[#ea580c]">
            Official Final Honors Podium
          </h2>
          <h1 class="text-2xl sm:text-4xl font-black uppercase text-[#0f172a] font-serif-pace">
            ${getCategoryTitle(currentCategory)}
          </h1>
        </div>

        <!-- 3-Tier Olympic Podium Layout -->
        <div class="grid grid-cols-3 gap-2 sm:gap-4 items-end pt-4 pb-2">
          
          <!-- 2ND PLACE (SILVER) -->
          <div class="flex flex-col items-center space-y-2">
            <div class="p-3 sm:p-4 rounded-2xl bg-white border-2 border-slate-300 shadow-md w-full text-center space-y-1">
              <span class="text-2xl sm:text-3xl block">🥈</span>
              <span class="text-[10px] sm:text-xs font-black uppercase text-slate-600 block">2nd Place</span>
              <span class="text-xs sm:text-sm font-black text-[#0f172a] truncate block font-serif-pace">${silver ? silver.team.name : 'Team'}</span>
              <span class="text-[10px] text-[#64748b] block font-mono">T-${silver ? silver.team.number : '--'}</span>
              <div class="pt-1 font-mono text-sm sm:text-base font-black text-slate-700">${silver ? silver.grandTotal : '0'} <span class="text-[10px] text-slate-400">/100</span></div>
            </div>
            <div class="w-full bg-slate-700 h-28 sm:h-36 rounded-t-2xl flex items-center justify-center text-white font-black text-2xl sm:text-3xl border-t-4 border-slate-400 shadow-lg">
              2
            </div>
          </div>

          <!-- 1ST PLACE (GOLD / CHAMPION) -->
          <div class="flex flex-col items-center space-y-2 -mt-6">
            <div class="p-4 sm:p-5 rounded-2xl bg-white border-4 border-[#ea580c] anim-gold-glow w-full text-center space-y-1.5 relative">
              <span class="text-3xl sm:text-4xl block">👑</span>
              <span class="text-xs sm:text-sm font-black uppercase text-[#ea580c] block tracking-wide">Grand Champion</span>
              <span class="text-sm sm:text-lg font-black text-[#0f172a] truncate block font-serif-pace">${champ ? champ.team.name : 'Champion'}</span>
              <span class="text-xs text-[#64748b] block font-mono">T-${champ ? champ.team.number : '--'}</span>
              <div class="pt-1 font-mono text-base sm:text-xl font-black text-[#ea580c]">${champ ? champ.grandTotal : '0'} <span class="text-xs text-[#ea580c]/70">/100</span></div>
            </div>
            <div class="w-full bg-[#0f172a] h-40 sm:h-52 rounded-t-2xl flex flex-col items-center justify-center text-white font-black text-3xl sm:text-4xl border-t-4 border-[#ea580c] shadow-2xl relative">
              <span>1</span>
              <span class="text-[10px] tracking-widest text-amber-400 uppercase font-sans mt-1">CHAMPION</span>
            </div>
          </div>

          <!-- 3RD PLACE (BRONZE) -->
          <div class="flex flex-col items-center space-y-2">
            <div class="p-3 sm:p-4 rounded-2xl bg-white border-2 border-amber-600/40 shadow-md w-full text-center space-y-1">
              <span class="text-2xl sm:text-3xl block">🥉</span>
              <span class="text-[10px] sm:text-xs font-black uppercase text-amber-700 block">3rd Place</span>
              <span class="text-xs sm:text-sm font-black text-[#0f172a] truncate block font-serif-pace">${bronze ? bronze.team.name : 'Team'}</span>
              <span class="text-[10px] text-[#64748b] block font-mono">T-${bronze ? bronze.team.number : '--'}</span>
              <div class="pt-1 font-mono text-sm sm:text-base font-black text-amber-800">${bronze ? bronze.grandTotal : '0'} <span class="text-[10px] text-slate-400">/100</span></div>
            </div>
            <div class="w-full bg-amber-950 h-20 sm:h-28 rounded-t-2xl flex items-center justify-center text-amber-200 font-black text-xl sm:text-2xl border-t-4 border-amber-600 shadow-md">
              3
            </div>
          </div>

        </div>

        <!-- Post-Ceremony Action Options -->
        <div class="flex flex-wrap items-center justify-center gap-3 pt-3">
          <button type="button" class="py-2.5 px-4 rounded-xl bg-[#ea580c] hover:bg-[#c2410c] text-white font-black text-xs flex items-center gap-1.5 shadow-md active:scale-95 transition" onclick="window.triggerConfettiBurst()">
            <span>🎉 Launch Confetti</span>
          </button>

          <button type="button" class="py-2.5 px-4 rounded-xl bg-[#0f172a] hover:bg-slate-800 text-white font-black text-xs flex items-center gap-1.5 shadow-md active:scale-95 transition" onclick="window.openStandingsModal()">
            <span>📋 View Full Standings (24 Teams)</span>
          </button>

          <button type="button" class="py-2.5 px-4 rounded-xl bg-white hover:bg-[#f6f1e6] border border-[#e3dccd] text-[#0f172a] font-bold text-xs flex items-center gap-1.5 shadow-xs active:scale-95 transition" onclick="window.replayCeremony()">
            <span>🔄 Replay Ceremony</span>
          </button>
        </div>

      </div>
    `;
  }

  // =============================================================
  // Step Navigation Controls
  // =============================================================
  function nextStep() {
    if (currentStep < 4) {
      currentStep++;
      renderStage();
    } else {
      currentStep = 0;
      renderStage();
    }
  }

  function prevStep() {
    if (currentStep > 0) {
      currentStep--;
      renderStage();
    }
  }

  window.nextStageStep = nextStep;
  window.triggerConfettiBurst = () => {
    soundEngine.playCymbalCrash();
    launchConfetti('mega');
  };
  window.replayCeremony = () => {
    currentStep = 0;
    renderStage();
  };
  window.openStandingsModal = () => {
    if (standingsModal) standingsModal.classList.remove('hidden');
    renderStandingsTable();
  };

  // =============================================================
  // Standings Modal Rendering
  // =============================================================
  function renderStandingsTable() {
    if (!standingsTableBody) return;
    const filter = modalSectionFilter ? modalSectionFilter.value : 'ALL';

    const ranked = (typeof TEAMS_DATA !== 'undefined' ? TEAMS_DATA : []).map((t) => {
      const teamEvals = masterEvaluations[t.number] || {};
      const p1Scores = Object.values(teamEvals).filter((x) => x && x.phase1 > 0).map((x) => x.phase1);
      const p2Scores = Object.values(teamEvals).filter((x) => x && x.phase2 > 0).map((x) => x.phase2);

      const p1Avg = p1Scores.length ? Number((p1Scores.reduce((a, b) => a + b, 0) / p1Scores.length).toFixed(1)) : 0;
      const p2Avg = p2Scores.length ? Number((p2Scores.reduce((a, b) => a + b, 0) / p2Scores.length).toFixed(1)) : 0;
      const grandTotal = Number((p1Avg + p2Avg).toFixed(1));

      return { team: t, p1Avg, p2Avg, grandTotal, numJudges: Object.keys(teamEvals).length };
    })
    .filter(x => filter === 'ALL' || x.team.section === filter)
    .sort((a, b) => b.grandTotal - a.grandTotal);

    standingsTableBody.innerHTML = ranked.map((item, idx) => {
      const isTop3 = idx < 3;
      const rankBadge = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`;
      const rowBg = idx === 0 ? 'bg-amber-50/70 font-semibold' : idx === 1 ? 'bg-slate-50' : idx === 2 ? 'bg-orange-50/40' : '';

      return `
        <tr class="hover:bg-[#f6f1e6]/60 transition ${rowBg}">
          <td class="py-2 px-3 text-center font-bold text-xs ${isTop3 ? 'text-base' : 'text-slate-500'}">${rankBadge}</td>
          <td class="py-2 px-3 font-mono font-black text-[#ea580c]">T-${item.team.number}</td>
          <td class="py-2 px-3">
            <span class="font-bold text-[#0f172a] block font-serif-pace">${item.team.name}</span>
            <span class="text-[10px] text-[#64748b] truncate block max-w-xs">${item.team.abstract_title || 'Project'}</span>
          </td>
          <td class="py-2 px-2 text-center">
            <span class="px-1.5 py-0.5 rounded text-[10px] font-bold ${item.team.section === 'A' ? 'bg-sky-50 text-sky-700' : 'bg-emerald-50 text-emerald-700'}">Sec ${item.team.section}</span>
          </td>
          <td class="py-2 px-2.5 text-center font-mono font-bold text-slate-700">${item.p1Avg}</td>
          <td class="py-2 px-2.5 text-center font-mono font-bold text-slate-700">${item.p2Avg}</td>
          <td class="py-2 px-3 text-right font-mono font-black text-sm text-[#ea580c]">${item.grandTotal}</td>
        </tr>
      `;
    }).join('');
  }

  // =============================================================
  // Fullscreen & Audio Controls
  // =============================================================
  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        console.warn('Fullscreen error:', err);
      });
      if (fsIcon) fsIcon.textContent = '✕';
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
      if (fsIcon) fsIcon.textContent = '⛶';
    }
  }

  function toggleAudio() {
    isSoundMuted = !isSoundMuted;
    if (audioIcon) audioIcon.textContent = isSoundMuted ? '🔇' : '🔊';
    if (audioStatusText) audioStatusText.textContent = isSoundMuted ? 'MUTED' : 'SOUND ON';
  }

  // =============================================================
  // Event Bindings & Shortcuts
  // =============================================================
  function bindEvents() {
    if (btnNextStep) btnNextStep.addEventListener('click', nextStep);
    if (btnPrevStep) btnPrevStep.addEventListener('click', prevStep);
    if (btnConfettiBurst) btnConfettiBurst.addEventListener('click', () => launchConfetti('standard'));
    if (btnAudioToggle) btnAudioToggle.addEventListener('click', toggleAudio);
    if (btnFullscreenToggle) btnFullscreenToggle.addEventListener('click', toggleFullscreen);

    if (stageCategorySelect) {
      stageCategorySelect.addEventListener('change', (e) => {
        currentCategory = e.target.value;
        currentStep = 0;
        recomputeStandings();
      });
    }

    if (btnOpenStandingsModal) {
      btnOpenStandingsModal.addEventListener('click', () => {
        standingsModal.classList.remove('hidden');
        renderStandingsTable();
      });
    }

    if (btnCloseStandingsModal) {
      btnCloseStandingsModal.addEventListener('click', () => {
        standingsModal.classList.add('hidden');
      });
    }

    if (modalSectionFilter) {
      modalSectionFilter.addEventListener('change', renderStandingsTable);
    }

    // Keyboard Shortcuts
    window.addEventListener('keydown', (e) => {
      // Don't trigger if interacting with form elements
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes(e.target.tagName)) return;

      if (e.key === ' ' || e.key === 'ArrowRight' || e.key === 'Enter') {
        e.preventDefault();
        nextStep();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        prevStep();
      } else if (e.key.toLowerCase() === 'f') {
        e.preventDefault();
        toggleFullscreen();
      } else if (e.key.toLowerCase() === 'm') {
        e.preventDefault();
        toggleAudio();
      } else if (e.key.toLowerCase() === 'c') {
        e.preventDefault();
        launchConfetti('standard');
      } else if (e.key === 'Escape') {
        if (standingsModal && !standingsModal.classList.contains('hidden')) {
          standingsModal.classList.add('hidden');
        }
      }
    });
  }

  // =============================================================
  // Initialization
  // =============================================================
  async function init() {
    bindEvents();
    await fetchServerData();

    // Start background sync polling every 4 seconds
    pollingInterval = setInterval(fetchServerData, 4000);
  }

  // Kickoff on DOM loaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
