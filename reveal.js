// EMBEDTHON / EMBERS '26 · Grand Results Reveal Ceremony — Kahoot-style stage
// Requires: teams.js (TEAMS_DATA), reveal-theme.css, and the /api/evaluations + /api/config endpoints.
// Flow: 2nd runner-up → 1st runner-up → Grand Champion (slot-machine fake-out) → final podium.
// Presenter: Space / → / ↓ advances, Space during a drumroll reveals immediately,
// 1–3 jump straight to a rank, A toggles the auto-advance timer, R restarts,
// F fullscreen (all chrome hidden), M mute, C confetti.

(function () {
  'use strict';

  const POLL_MS = 4000;
  const EVENT_LIB = window.EMBEDTHON_RUBRICS || {
    EVENTS: {},
    getEvent: function () {
      return { id: 'EMBEDDATHON', label: 'Embeddathon', maxTotal: 100, mode: 'DUAL_PHASE' };
    }
  };
  const CATEGORY_TITLES = {
    OVERALL: 'Overall Champions (All 24 Teams)',
    EMBEDDATHON: '⚡ Embeddathon',
    EMBEDTHON: '⚡ Embeddathon',
    PROJECT_EXPO: '🛠️ Project Expo',
    HARDWARE: '🛠️ Project Expo',
    SOFTWARE: '🛠️ Project Expo',
    PAPER: '📄 Paper Presentation',
    A: 'Section A (Teams 01–11)',
    B: 'Section B (Teams 12–24)'
  };

  // Reveal order: 2nd runner-up → 1st runner-up → champion.
  const RANKS = [
    {
      place: 3,
      index: 2,
      suffix: 'RD',
      label: '2nd Runner-Up',
      kicker: 'Taking third place…',
      color: '#b91c1c',
      deep: '#7f1d1d',
      ink: '#ffffff',
      shape: 'diamond',
      next: 'Next · 1st Runner-Up'
    },
    {
      place: 2,
      index: 1,
      suffix: 'ND',
      label: '1st Runner-Up',
      kicker: 'And the first runner-up is…',
      color: '#e85d04',
      deep: '#9a3412',
      ink: '#ffffff',
      shape: 'circle',
      next: 'Now · Grand Champion'
    },
    {
      place: 1,
      index: 0,
      suffix: 'ST',
      label: 'Grand Champion',
      kicker: 'And your champion is…',
      color: '#ffb703',
      deep: '#f97316',
      ink: '#2b1200',
      shape: 'triangle',
      next: 'Show final podium'
    }
  ];

  const STEP_WELCOME = 0;
  const STEP_PODIUM = 4;
  const CONFETTI_COLORS = ['#ffd166', '#ffb703', '#f97316', '#e63946', '#fff4e0'];
  const CROWN_SVG = `
    <svg viewBox="0 0 64 52" fill="none" aria-hidden="true">
      <path d="M5 42 3 12l14 10L32 3l15 19 14-10-2 30Z" fill="currentColor" stroke="#7a4a00" stroke-width="3" stroke-linejoin="round"/>
      <rect x="5" y="42.5" width="54" height="7" rx="3.5" fill="currentColor" stroke="#7a4a00" stroke-width="3"/>
    </svg>`;

  const $ = (id) => document.getElementById(id);
  const el = {
    stage: $('ceremonyStageArena'),
    category: $('stageCategorySelect'),
    indicator: $('stageStepIndicator'),
    prev: $('btnPrevStep'),
    next: $('btnNextStep'),
    nextLabel: $('btnNextLabel'),
    confetti: $('btnConfettiBurst'),
    audioBtn: $('btnAudioToggle'),
    audioIcon: $('audioIcon'),
    audioText: $('audioStatusText'),
    fsBtn: $('btnFullscreenToggle'),
    fsIcon: $('fsIcon'),
    syncBadge: $('liveSyncStatusBadge'),
    modal: $('standingsModal'),
    openModal: $('btnOpenStandingsModal'),
    closeModal: $('btnCloseStandingsModal'),
    modalFilter: $('modalSectionFilter'),
    modalBody: $('standingsTableBody'),
    auto: $('autoControl'),
    autoSelect: $('autoAdvanceSelect'),
    autoCount: $('autoCountdown'),
    emberField: $('emberField'),
    psychBtn: $('btnPsychToggle'),
    psychIcon: $('psychIcon'),
    psychText: $('psychStatusText'),
    projectorBtn: $('btnProjectorToggle')
  };

  const EVENT_THEMES = {
    PAPER: {
      accent: '#6366f1',
      deep: '#312e81',
      intro: 'Track 3 · Research & Technical Rigor · Multipurpose Hall',
      orderLabel: 'Prize 1 of 4 · Opening Honors'
    },
    HARDWARE: {
      accent: '#f59e0b',
      deep: '#92400e',
      intro: 'Track 2 · Physical Engineering & Embedded Prototypes · Edusat Hall',
      orderLabel: 'Prize 2 of 4 · Hardware Showcase'
    },
    SOFTWARE: {
      accent: '#10b981',
      deep: '#065f46',
      intro: 'Track 2 · Intelligent Systems & Full-Stack Innovation · Edusat Hall',
      orderLabel: 'Prize 3 of 4 · Software Showcase'
    },
    EMBEDDATHON: {
      accent: '#ea580c',
      deep: '#7c2d12',
      intro: 'Track 1 · 24-Hour Flagship Hackathon · The Grand Finale',
      orderLabel: 'Prize 4 of 4 · Grand Finale'
    }
  };

  // Psych beat config flag per track & rank: at most 2 ranks in the entire ceremony.
  const PSYCH_CONFIG = {
    PAPER: { 1: false, 2: false, 3: false },
    HARDWARE: { 1: true, 2: false, 3: false },
    SOFTWARE: { 1: false, 2: false, 3: false },
    EMBEDDATHON: { 1: true, 2: false, 3: false },
    PROJECT_EXPO: { 1: true, 2: false, 3: false },
    OVERALL: { 1: true, 2: false, 3: false },
    A: { 1: false, 2: false, 3: false },
    B: { 1: false, 2: false, 3: false }
  };

  const state = {
    category: 'PAPER',
    step: STEP_WELCOME,
    gate: null,
    live: [],
    locked: [],
    eventRows: {},
    maxTotal: 50,
    pending: false,
    syncFailed: false,
    hasScores: false,
    muted: sessionStorage.getItem('embers_reveal_muted') === '1',
    psychEnabled: true,
    projectorMode: false,
    timers: [],
    checksum: '',
    auto: {
      seconds: 0,
      last: 10,
      remaining: 0,
      timer: null,
      hold: false
    }
  };

  const prefersReducedMotion = () =>
    typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function saveCeremonyState() {
    try {
      sessionStorage.setItem('embers_reveal_state', JSON.stringify({
        category: state.category,
        step: state.step,
        psychEnabled: state.psychEnabled,
        projectorMode: state.projectorMode
      }));
    } catch (e) { /* ignore storage quota */ }
  }

  function restoreCeremonyState() {
    try {
      const raw = sessionStorage.getItem('embers_reveal_state');
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (e) {
      return null;
    }
  }

  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));

  const later = (fn, ms) => { state.timers.push(setTimeout(fn, ms)); };
  const clearTimers = () => { state.timers.forEach(clearTimeout); state.timers = []; };

  // =============================================================
  // Sound — Mixkit + project-supplied samples with procedural fallbacks.
  // Credits: assets/sfx/CREDITS.md
  // =============================================================
  const SFX_URLS = {
    whooshFast: 'assets/sfx/whoosh-fast-1489.mp3',
    whooshDeep: 'assets/sfx/whoosh-deep.mp3',
    drumroll566: 'assets/sfx/drumroll-566.mp3',
    impact577: 'assets/sfx/impact-577.mp3',
    fanfareRunnerUp: 'assets/sfx/fanfare-horns.mp3',
    podiumBrass: 'assets/sfx/podium-brass.mp3',
    applause: 'assets/sfx/applause-crowd.mp3',
    fakeRiser: 'assets/sfx/fake-build-riser.mp3'
  };

  const audio = {
    ctx: null,
    bus: null,
    noise: null,
    drumrollNode: null,
    slotNode: null,
    samples: Object.create(null),
    loading: Object.create(null),
    ready: false,
    ensureCtx() {
      if (!this.ctx) {
        const C = window.AudioContext || window.webkitAudioContext;
        if (!C) return null;
        try { this.ctx = new C(); } catch (e) { console.warn('Web Audio unavailable:', e); return null; }
      }
      if (!this.bus) {
        this.bus = this.ctx.createGain();
        this.bus.gain.value = state.muted ? 0 : 1;
        const compressor = this.ctx.createDynamicsCompressor();
        compressor.threshold.value = -16;
        compressor.knee.value = 20;
        compressor.ratio.value = 6;
        compressor.attack.value = 0.003;
        compressor.release.value = 0.3;
        this.bus.connect(compressor).connect(this.ctx.destination);
      }
      return this.ctx;
    },
    get() {
      if (state.muted) return null;
      const ctx = this.ensureCtx();
      if (!ctx) return null;
      if (ctx.state === 'suspended') ctx.resume();
      return ctx;
    },
    setMuted(muted) {
      if (!this.ctx || !this.bus) return;
      const t = this.ctx.currentTime;
      this.bus.gain.cancelScheduledValues(t);
      this.bus.gain.setTargetAtTime(muted ? 0 : 1, t, 0.02);
    },
    async preload() {
      // Fetch audio bytes without instantiating AudioContext before a user gesture.
      // Decode using OfflineAudioContext so no live AudioContext starts on page load.
      const OfflineCtx = window.OfflineAudioContext || window.webkitOfflineAudioContext;
      await Promise.all(Object.entries(SFX_URLS).map(async ([key, url]) => {
        if (this.samples[key] || this.loading[key]) return;
        this.loading[key] = true;
        try {
          const res = await fetch(url, { cache: 'force-cache' });
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const data = await res.arrayBuffer();
          if (OfflineCtx) {
            const off = new OfflineCtx(2, 44100, 44100);
            this.samples[key] = await off.decodeAudioData(data);
          } else {
            this.rawBuffers = this.rawBuffers || Object.create(null);
            this.rawBuffers[key] = data;
          }
        } catch (e) {
          console.warn(`Sound effect unavailable (${url}):`, e.message || e);
        } finally {
          this.loading[key] = false;
        }
      }));
      this.ready = true;
    },
    playSample(name, volume = 0.7, opts = {}) {
      const ctx = this.get();
      if (!ctx) return null;
      const buffer = this.samples[name];
      if (!buffer) return null;

      const { rate = 1, offset = 0, duration = 0, fadeOut = 0.08, loop = false } = opts;
      const src = ctx.createBufferSource();
      src.buffer = buffer;
      src.playbackRate.value = rate;
      src.loop = loop;

      const gain = ctx.createGain();
      const t = ctx.currentTime;
      const maxOut = duration ? Math.min(duration, buffer.duration / rate) : buffer.duration / rate;
      gain.gain.setValueAtTime(Math.max(0.0001, volume), t);
      if (fadeOut && maxOut > fadeOut) {
        gain.gain.setValueAtTime(Math.max(0.0001, volume), t + maxOut - fadeOut);
        gain.gain.linearRampToValueAtTime(0.0001, t + maxOut);
      }
      src.connect(gain).connect(this.bus || ctx.destination);

      const bufferSeconds = loop
        ? undefined
        : Math.min(buffer.duration - offset, (duration || buffer.duration / rate) * rate);
      src.start(t, Math.max(0, offset), bufferSeconds);
      if (!loop) {
        try { src.stop(t + maxOut + 0.03); } catch (e) { /* already stopped */ }
      }
      return { src, gain, duration: maxOut };
    },
    noiseSource(ctx, dur, fn) {
      const n = Math.floor(ctx.sampleRate * dur);
      const buf = ctx.createBuffer(1, n, ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < n; i++) d[i] = fn(i);
      const src = ctx.createBufferSource();
      src.buffer = buf;
      return src;
    },
    tone(freq, dur, vol, type = 'triangle', slide = 0, delay = 0) {
      const ctx = this.get(); if (!ctx) return;
      const t = ctx.currentTime + delay;
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = type;
      o.frequency.setValueAtTime(freq, t);
      if (slide) o.frequency.exponentialRampToValueAtTime(freq * slide, t + dur);
      g.gain.setValueAtTime(vol, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + dur);
      o.connect(g).connect(this.bus || ctx.destination);
      o.start(t); o.stop(t + dur + 0.02);
    },
    tick(freq = 2200, delay = 0) {
      const rate = Math.max(0.75, Math.min(1.6, freq / 2200));
      const play = () => this.playSample('slotTick', 0.32, { rate, duration: 0.085, fadeOut: 0.03 });
      if (this.samples.slotTick) {
        if (delay) setTimeout(play, delay * 1000); else play();
      } else {
        this.tone(freq, 0.05, 0.2, 'triangle', 0.67, delay);
      }
    },
    click() {
      if (!this.playSample('slotTick', 0.45, { rate: 0.82, duration: 0.075, fadeOut: 0.02 })) {
        this.tone(900, 0.03, 0.2, 'triangle');
      }
    },
    chime() {
      [[880, 0.2], [1320, 0.12], [1760, 0.07], [2640, 0.03]].forEach(([f, v], i) => {
        this.tone(f, 1.1, v, 'sine', 0, i * 0.04);
      });
    },
    hit() {
      // 577 is a 14s tension roll; its 5.2s drum slam is the landing hit.
      if (this.playSample('impact577', 0.95, { offset: 5.15, duration: 1.2, fadeOut: 0.25 })) {
        this.playSample('whooshFast', 0.4, { rate: 1.04, duration: 1.05, fadeOut: 0.25 });
      } else {
        this.tone(120, 0.45, 0.5, 'sine', 0.5);
        this.tone(62, 0.6, 0.35, 'sine', 0.7);
        this.chime();
      }
    },
    fakeBuild() {
      if (!this.playSample('fakeRiser', 0.8, { duration: 1.42, fadeOut: 0.05 })) {
        const ctx = this.get(); if (!ctx) return;
        const dur = 1.2, t = ctx.currentTime;
        const src = this.noiseSource(ctx, dur, (i) => (Math.random() * 2 - 1) * Math.min(1, i / (ctx.sampleRate * 0.8)));
        const f = ctx.createBiquadFilter();
        f.type = 'highpass';
        f.frequency.setValueAtTime(300, t);
        f.frequency.exponentialRampToValueAtTime(5000, t + dur);
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.05, t);
        g.gain.exponentialRampToValueAtTime(0.45, t + dur);
        src.connect(f).connect(g).connect(this.bus || ctx.destination);
        src.start(t); src.stop(t + dur);
      }
    },
    stingCut() {
      // Restrained single cinematic sting cut for the psych beat (no cartoon/comedic sound).
      if (!this.playSample('impact577', 0.55, { offset: 5.15, duration: 0.45, fadeOut: 0.15 })) {
        this.tone(220, 0.25, 0.22, 'triangle', 0.75);
      }
    },
    psychFart() {
      this.stingCut();
    },
    winnerBell() {
      this.chime();
      this.playSample('whooshFast', 0.28, { rate: 1.15, duration: 0.7, fadeOut: 0.2 });
    },
    runnerUpFanfare() {
      if (!this.playSample('fanfareRunnerUp', 0.7, { fadeOut: 0.2 })) {
        [[523.25, 0.42], [659.25, 0.42], [783.99, 0.5], [1046.5, 0.7], [1318.5, 0.85]]
          .forEach(([f, dur], i) => this.tone(f, dur, 0.18, 'triangle', 0, i * 0.13));
      }
    },
    podiumFanfare() {
      if (!this.playSample('podiumBrass', 0.82, { duration: 8.5, fadeOut: 1.5 })) {
        [[523.25, 0.42], [659.25, 0.42], [783.99, 0.5], [1046.5, 0.7], [1318.5, 0.85]]
          .forEach(([f, dur], i) => this.tone(f, dur, 0.18, 'triangle', 0, i * 0.13));
        [1046.5, 1318.5, 1568].forEach((f, i) => this.tone(f, 1.5, 0.1, 'sine', 0, 0.62 + i * 0.02));
      }
      this.applause();
    },
    applause(volume = 0.27) {
      this.playSample('applause', volume, { offset: 0.15, duration: 6.5, fadeOut: 1.5 });
    },
    slotSpin(dur = 2.3) {
      this.stopSlotSpin();
      const handle = this.playSample('drumroll566', 0.45, { duration: dur, fadeOut: 0.15 });
      if (handle) this.slotNode = handle;
    },
    stopSlotSpin() {
      if (!this.slotNode) return;
      const { src, gain } = this.slotNode;
      const ctx = this.ctx;
      if (ctx) {
        const t = ctx.currentTime;
        try {
          gain.gain.cancelScheduledValues(t);
          gain.gain.setTargetAtTime(0.0001, t, 0.03);
        } catch (e) { /* gain already finished */ }
        try { src.stop(t + 0.15); } catch (e) { /* already stopped */ }
      }
      this.slotNode = null;
    },
    whoosh(deep = false) {
      if (!this.playSample(deep ? 'whooshDeep' : 'whooshFast', deep ? 0.52 : 0.46, {
        rate: deep ? 0.96 : 1.04,
        duration: deep ? 2.4 : 1.1,
        fadeOut: 0.3
      })) {
        const ctx = this.get(); if (!ctx) return;
        const dur = 0.55;
        const t = ctx.currentTime;
        const src = this.noiseSource(ctx, dur, (i) => (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.2)));
        const f = ctx.createBiquadFilter();
        f.type = 'bandpass'; f.Q.value = 1.3;
        f.frequency.setValueAtTime(deep ? 300 : 650, t);
        f.frequency.exponentialRampToValueAtTime(deep ? 1400 : 2600, t + dur);
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.28, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + dur);
        src.connect(f).connect(g).connect(this.bus || ctx.destination);
        src.start(t); src.stop(t + dur);
      }
    },
    drumroll(dur) {
      this.stopDrumroll();
      // 566 has its big hit around 3.0s; start late enough to land on the reveal.
      const offset = Math.max(0, 3.0 - dur);
      const handle = this.playSample('drumroll566', 0.65, {
        offset,
        duration: dur,
        fadeOut: 0.12
      });
      if (handle) {
        this.drumrollNode = handle;
        return;
      }

      // Procedural fallback if the sample is unavailable.
      const ctx = this.get(); if (!ctx) return;
      const t = ctx.currentTime;
      const src = this.noiseSource(ctx, dur, (i) => (Math.random() * 2 - 1) * (0.6 + 0.4 * Math.sin(i / 130)));
      const f = ctx.createBiquadFilter();
      f.type = 'bandpass'; f.Q.value = 2.4;
      f.frequency.setValueAtTime(600, t);
      f.frequency.linearRampToValueAtTime(1300, t + dur);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.05, t);
      g.gain.exponentialRampToValueAtTime(0.8, t + Math.max(0.1, dur - 0.05));
      g.gain.linearRampToValueAtTime(0.001, t + dur);
      src.connect(f).connect(g).connect(this.bus || ctx.destination);
      src.start(t); src.stop(t + dur);
      this.noise = src;
      src.onended = () => { if (this.noise === src) this.noise = null; };
    },
    stopDrumroll() {
      if (this.drumrollNode) {
        const { src, gain } = this.drumrollNode;
        const ctx = this.ctx;
        if (ctx) {
          const t = ctx.currentTime;
          try {
            gain.gain.cancelScheduledValues(t);
            gain.gain.setTargetAtTime(0.0001, t, 0.04);
          } catch (e) { /* gain already finished */ }
          try { src.stop(t + 0.17); } catch (e) { /* already stopped */ }
        }
        this.drumrollNode = null;
      }
      if (this.noise) {
        try { this.noise.stop(); } catch (e) { /* already stopped */ }
        this.noise = null;
      }
    }
  };

  // =============================================================
  // Confetti
  // =============================================================
  function resetConfetti() {
    if (typeof confetti === 'function' && typeof confetti.reset === 'function') confetti.reset();
  }

  function launchConfetti(type = 'standard') {
    if (typeof confetti !== 'function') return;
    const colors = CONFETTI_COLORS;
    const small = window.innerWidth < 700;
    if (type === 'mega') {
      confetti({
        particleCount: small ? 90 : 140,
        spread: 105,
        origin: { y: 0.62 },
        colors,
        scalar: small ? 0.9 : 1.05,
        shapes: ['square', 'circle', 'star']
      });
      const end = Date.now() + (small ? 2200 : 2800);
      (function frame() {
        confetti({ particleCount: small ? 3 : 4, angle: 60, spread: 65, origin: { x: 0, y: 0.72 }, colors });
        confetti({ particleCount: small ? 3 : 4, angle: 120, spread: 65, origin: { x: 1, y: 0.72 }, colors });
        if (Date.now() < end) requestAnimationFrame(frame);
      })();
    } else if (type === 'big') {
      confetti({ particleCount: small ? 76 : 110, spread: 90, origin: { y: 0.62 }, colors, scalar: 0.95 });
      confetti({
        particleCount: small ? 24 : 32,
        spread: 120,
        origin: { y: 0.4 },
        colors,
        shapes: ['circle', 'square'],
        scalar: 0.75
      });
    } else {
      confetti({ particleCount: small ? 50 : 70, spread: 78, origin: { y: 0.65 }, colors });
    }
  }

  // =============================================================
  // Data
  // =============================================================
  const avg = (list) => list.length
    ? Math.round((list.reduce((a, b) => a + b, 0) / list.length) * 10) / 10
    : 0;

  // Ties: higher Phase 2 wins, then lower team number. Settle real ties with organisers.
  function getRevealEventMap(evals, eventId) {
    const all = evals || {};
    let map = all[eventId] && typeof all[eventId] === 'object' ? all[eventId] : null;

    if (!map && all._byEvent && all._byEvent[eventId]) {
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

  function computeEventStandings(evals, eventId) {
    const event = EVENT_LIB.getEvent(eventId);
    const map = getRevealEventMap(evals, eventId);

    const eventTeams = typeof getEventTeams === 'function'
      ? getEventTeams(eventId)
      : (typeof TEAMS_DATA !== 'undefined' ? TEAMS_DATA : []);
    const rows = eventTeams.map((team) => {
      const judges = Object.values(map[team.number] || {}).filter(Boolean);

      if (event.mode === 'SINGLE') {
        const totals = judges.map((j) => Number(j.total)).filter((v) => v > 0);
        return {
          team,
          p1: 0,
          p2: 0,
          total: avg(totals),
          judges: totals.length
        };
      }

      const p1 = avg(judges.map((j) => Number(j.phase1)).filter((v) => v > 0));
      const p2 = avg(judges.map((j) => Number(j.phase2)).filter((v) => v > 0));
      return { team, p1, p2, total: Math.round((p1 + p2) * 10) / 10, judges: judges.length };
    });

    rows.sort((a, b) => b.total - a.total || b.p2 - a.p2 || a.team.number.localeCompare(b.team.number));
    return rows;
  }

  function computeStandings(evals) {
    return {
      EMBEDDATHON: computeEventStandings(evals, 'EMBEDDATHON'),
      PROJECT_EXPO: computeEventStandings(evals, 'PROJECT_EXPO'),
      PAPER: computeEventStandings(evals, 'PAPER')
    };
  }

  function categoryEventId(category) {
    if (category === 'PAPER') return 'PAPER';
    if (category === 'PROJECT_EXPO' || category === 'HARDWARE' || category === 'SOFTWARE') return 'PROJECT_EXPO';
    return 'EMBEDDATHON';
  }

  function categoryMax(category) {
    return EVENT_LIB.getEvent(categoryEventId(category)).maxTotal;
  }

  function rowsForCategory(category) {
    const eventId = categoryEventId(category);
    const rows = state.eventRows[eventId] || [];
    if (category === 'A' || category === 'B' || category === 'HARDWARE' || category === 'SOFTWARE') {
      return rows.filter((row) => String(row.team.section || '').toUpperCase() === category);
    }
    return rows;
  }

  async function syncData() {
    try {
      const [er, cr] = await Promise.all([
        fetch('/api/evaluations', { cache: 'no-store' }),
        fetch('/api/config', { cache: 'no-store' })
      ]);
      if (!er.ok || !cr.ok) {
        state.syncFailed = true;
        updateSyncBadge();
        return;
      }
      state.syncFailed = false;
      const evals = await er.json();
      const cfg = await cr.json();
      const sum = JSON.stringify([evals, cfg]);
      if (sum === state.checksum) {
        updateSyncBadge();
        return;
      }
      state.checksum = sum;
      state.eventRows = computeStandings(evals);
      state.maxTotal = categoryMax(state.category);
      applyLive(rowsForCategory(state.category));
    } catch (err) {
      state.syncFailed = true;
      updateSyncBadge();
      console.warn('Live sync unavailable:', err);
    }
  }

  const sig = (rows) => JSON.stringify(rows.map((r) => [r.team.number, r.total]));

  function applyLive(rows) {
    state.live = rows;
    if (state.step === STEP_WELCOME || !state.locked.length) {
      state.locked = rows;
      state.pending = false;
      state.hasScores = rows.some((r) => r.judges > 0);
      render();
    } else {
      state.pending = sig(rows) !== sig(state.locked);
      updateSyncBadge();
      renderModal();
    }
  }

  function updateSyncBadge() {
    const label = el.syncBadge && el.syncBadge.lastElementChild;
    if (!label) return;
    if (state.syncFailed) {
      label.textContent = 'NETWORK OFFLINE · RETRYING SYNC';
      el.syncBadge.classList.add('is-pending');
      return;
    }
    label.textContent = state.pending ? 'NEW SCORES · HELD UNTIL REPLAY' : 'LIVE SYNC ACTIVE';
    el.syncBadge.classList.toggle('is-pending', state.pending);
  }

  // =============================================================
  // Auto-advance timer (optional)
  // =============================================================
  function updateAutoUI() {
    const on = state.auto.seconds > 0;
    if (el.auto) el.auto.classList.toggle('is-on', on);
    if (el.autoCount) {
      el.autoCount.textContent = on && state.auto.remaining > 0 ? state.auto.remaining + 's' : '';
    }
  }

  function clearAutoTimer() {
    if (state.auto.timer) {
      clearInterval(state.auto.timer);
      state.auto.timer = null;
    }
    state.auto.remaining = 0;
    updateAutoUI();
  }

  function scheduleAuto() {
    clearAutoTimer();
    if (!state.auto.seconds || state.auto.hold) return;
    state.auto.remaining = state.auto.seconds;
    updateAutoUI();
    state.auto.timer = setInterval(() => {
      if (!state.auto.seconds) { clearAutoTimer(); return; }
      state.auto.remaining -= 1;
      if (state.auto.remaining <= 0) {
        clearAutoTimer();
        next();
        return;
      }
      updateAutoUI();
    }, 1000);
  }

  function setAutoSeconds(value) {
    const seconds = Number(value) || 0;
    state.auto.seconds = seconds;
    if (seconds) state.auto.last = seconds;
    if (el.autoSelect) el.autoSelect.value = String(seconds);
    clearAutoTimer();
    if (seconds && !state.auto.hold) scheduleAuto();
    if (seconds) audio.click();
  }

  function toggleAuto() {
    if (state.auto.seconds) {
      setAutoSeconds(0);
    } else {
      const value = state.auto.last || 10;
      if (el.autoSelect) el.autoSelect.value = String(value);
      setAutoSeconds(value);
    }
  }

  const pool = () => {
    const list = state.locked;
    if (state.category === 'A' || state.category === 'B') {
      return list.filter((r) => r.team.section === state.category);
    }
    return list;
  };

  // =============================================================
  // Navigation
  // =============================================================
  function setStep(step) {
    clearTimers();
    state.gate = null;
    audio.stopDrumroll();
    audio.stopSlotSpin();
    resetConfetti();
    clearAutoTimer();
    state.step = step;
    saveCeremonyState();
    state.auto.hold = step > STEP_WELCOME && step < STEP_PODIUM;
    audio.whoosh(step >= 3);
    if (step === STEP_WELCOME) {
      state.locked = state.live;
      state.pending = false;
      state.hasScores = state.locked.some((r) => r.judges > 0);
      updateSyncBadge();
    }
    render();
  }

  function next() {
    if (state.gate) {
      const revealNow = state.gate;
      state.gate = null;
      revealNow();
      return;
    }
    if (state.step < STEP_PODIUM) setStep(state.step + 1);
    else setStep(STEP_WELCOME);
  }

  const prev = () => { if (state.step > STEP_WELCOME) setStep(state.step - 1); };

  // =============================================================
  // Rendering
  // =============================================================
  function render() {
    if (!el.stage) return;
    el.stage.scrollTop = 0;
    el.prev.disabled = state.step === STEP_WELCOME;
    if (state.step === STEP_WELCOME) renderWelcome();
    else if (state.step === STEP_PODIUM) renderPodium();
    else renderRank(state.step - 1);
  }

  const shapeTile = (color, shape, fg = '#ffffff') => `
    <span class="rv-shape-tile" style="--c:${color};--fg:${fg}">
      <span class="k-shape k-shape--${shape}" aria-hidden="true"></span>
    </span>`;

  const shapeRow = () => `
    <div class="rv-shape-row" aria-hidden="true">
      ${shapeTile('#d62828', 'triangle')}
      ${shapeTile('#f77f00', 'diamond')}
      ${shapeTile('#fcbf49', 'circle', '#3a1d0d')}
      ${shapeTile('#f4ead5', 'square', '#3a1d0d')}
    </div>`;

  function getInitials(name) {
    const parts = String(name || '').split(/[\s-]+/).filter(Boolean);
    const initials = parts.length > 1
      ? parts.slice(0, 2).map((part) => part[0]).join('')
      : String(name || '').slice(0, 2);
    return (initials || '?').toUpperCase();
  }

  function renderWelcome() {
    el.indicator.textContent = 'Stage ready · Grand reveal';
    el.nextLabel.textContent = 'Start the reveal ▶';
    const rehearsal = !state.hasScores;
    const theme = EVENT_THEMES[state.category] || EVENT_THEMES.EMBEDDATHON;

    el.stage.innerHTML = `
      <section class="rv-welcome">
        <div class="rv-welcome-card">
          <div class="rv-stripe" aria-hidden="true">
            <span style="--c:${theme.accent}"></span><span style="--c:#f77f00"></span>
            <span style="--c:#fcbf49"></span><span style="--c:${theme.deep}"></span>
          </div>
          <div class="rv-welcome-body">
            <div class="rv-welcome-logo">
              <img src="assets/embers_logo.png" alt="EMBERS '26" onerror="this.style.display='none'">
            </div>
            <p class="rv-welcome-kicker">${esc(theme.orderLabel)} · P.A. College of Engineering</p>
            <h1 class="rv-welcome-title">EMBERS <span>'26</span></h1>
            <p class="rv-welcome-sub">${esc(theme.intro)}</p>
            <div class="rv-welcome-pill" style="border-color:${theme.accent}">
              <span class="k-shape k-shape--triangle" aria-hidden="true"></span>
              ${esc(CATEGORY_TITLES[state.category])}
            </div>
            <p class="rv-welcome-status ${rehearsal ? 'is-warn' : 'is-ok'}">
              ${state.syncFailed
                ? 'Network offline · retrying live evaluation sync'
                : (rehearsal
                  ? 'Awaiting saved evaluation scores for this track'
                  : 'Verified jury evaluations loaded · results locked for reveal')}
            </p>
            <div class="rv-welcome-shapes">${shapeRow()}</div>
            <p class="rv-welcome-hint">
              <kbd>Space</kbd> / <kbd>Enter</kbd> begin · <kbd>1</kbd>–<kbd>3</kbd> jump ·
              <kbd>End</kbd> skip to result · <kbd>F</kbd> fullscreen · <kbd>M</kbd> mute
            </p>
          </div>
        </div>
      </section>`;
    state.auto.hold = false;
    scheduleAuto();
  }

  function isPsychActiveForRank(rank) {
    if (!state.psychEnabled) return false;
    const cat = (state.category || 'PAPER').toUpperCase();
    const cfg = PSYCH_CONFIG[cat] || PSYCH_CONFIG.EMBEDDATHON;
    return !!cfg[rank.place];
  }

  function pickTrackFinalistDecoy(row) {
    const finalists = pool().slice(0, 6).filter((r) => r.team.name !== row.team.name);
    const list = finalists.length ? finalists : pool().filter((r) => r.team.name !== row.team.name);
    if (!list.length) return row.team.name;
    return list[Math.floor(Math.random() * list.length)].team.name;
  }

  // Per-event & per-rank choreography so none of the 4 1st-prize finales repeat:
  // PAPER:       3rd=stamp,       2nd=elimination, 1st=decrypt (decoy glitch)
  // HARDWARE:    3rd=decrypt,     2nd=stamp,       1st=elimination (Final 2 Royale)
  // SOFTWARE:    3rd=elimination, 2nd=decrypt,     1st=stamp (3-2-1 + Error Fakeout)
  // EMBEDDATHON: 3rd=decrypt,     2nd=elimination, 1st=slot (PSYCH! Slot Machine)
  function suspenseStyleFor(rank) {
    const param = new URLSearchParams(window.location.search).get('style');
    if (param && ['slot', 'elimination', 'decrypt', 'stamp'].includes(param)) return param;
    const cat = (state.category || 'OVERALL').toUpperCase();
    const map = {
      PAPER:        { 3: 'stamp',       2: 'elimination', 1: 'decrypt' },
      HARDWARE:     { 3: 'decrypt',     2: 'stamp',       1: 'elimination' },
      SOFTWARE:     { 3: 'elimination', 2: 'decrypt',     1: 'stamp' },
      PROJECT_EXPO: { 3: 'decrypt',     2: 'stamp',       1: 'elimination' }
    };
    const plan = map[cat] || { 3: 'decrypt', 2: 'elimination', 1: 'slot' };
    return plan[rank.place] || 'slot';
  }

  function rankMarkup(row, rank) {
    const mode = suspenseStyleFor(rank);
    const members = row.team.members.map((m) => `
      <span class="rv-player ${m.is_lead ? 'is-lead' : ''}">
        ${m.is_lead ? '<span class="rv-player-star">★</span>' : ''}${esc(m.name)}
      </span>`).join('');

    const show = (v) => (state.hasScores ? v.toFixed(1) : '—');
    const note = state.hasScores ? '' : '<p class="rv-note">Rehearsal data · scores not yet saved</p>';

    let suspenseBody = '';
    if (mode === 'slot') {
      suspenseBody = `
        <div class="rv-slot-machine" id="slotMachine" aria-hidden="true">
          <span class="rv-slot-bulb rv-slot-bulb--a" aria-hidden="true"></span>
          <span class="rv-slot-bulb rv-slot-bulb--b" aria-hidden="true"></span>
          <span class="rv-slot-bulb rv-slot-bulb--c" aria-hidden="true"></span>
          <span class="rv-slot-bulb rv-slot-bulb--d" aria-hidden="true"></span>
          <div class="rv-slot-window">
            <span class="rv-slot-reel" id="slotReel">—</span>
            <span class="rv-slot-psych" aria-hidden="true">FINALIST CHECK</span>
          </div>
          <div class="rv-slot-leds" aria-hidden="true">
            <span></span><span></span><span></span><span></span><span></span><span></span>
          </div>
        </div>
        <p class="rv-slot-tag" id="slotTag">Drumroll · press Space to lock it in</p>`;
    } else if (mode === 'elimination') {
      suspenseBody = `
        <div class="rv-grid" id="elimGrid" aria-hidden="true"></div>
        <p class="rv-fx-status" id="elimTag">Elimination Royale · dropping teams one by one…</p>`;
    } else if (mode === 'decrypt') {
      suspenseBody = `
        <div class="rv-decrypt-box" aria-hidden="true">
          <span class="rv-decrypt-text" id="decryptText">████████████</span>
        </div>
        <p class="rv-fx-status" id="decryptTag">Decrypting encrypted verdict…</p>`;
    } else if (mode === 'stamp') {
      suspenseBody = `
        <div class="rv-fx-count" id="stampCount" aria-hidden="true">3</div>
        <p class="rv-suspense-hint">Countdown · press Space to reveal now</p>`;
    } else {
      suspenseBody = `
        <div class="rv-suspense-shapes" aria-hidden="true">
          <span class="k-shape k-shape--triangle"></span>
          <span class="k-shape k-shape--diamond"></span>
          <span class="k-shape k-shape--circle"></span>
          <span class="k-shape k-shape--square"></span>
        </div>
        <div class="rv-dots" aria-hidden="true"><span></span><span></span><span></span></div>
        <p class="rv-suspense-hint">Drumroll · press Space to reveal now</p>`;
    }

    return `
      <section class="rv-act ${rank.place === 1 ? 'rv-act--champion' : ''}"
        style="--rank:${rank.color};--rank-deep:${rank.deep};--rank-ink:${rank.ink}">
        <span class="rv-act-watermark k-shape k-shape--${rank.shape}" aria-hidden="true"></span>

        <div class="rv-act-top">
          <span class="rv-place-badge"><b>${rank.place}</b><small>${rank.suffix}</small></span>
          <div>
            <h2 class="rv-rank-label">${rank.label}</h2>
            <span class="rv-rank-sub">${esc(CATEGORY_TITLES[state.category])}</span>
          </div>
        </div>

        <div class="rv-act-body">
          <div class="rv-suspense ${mode === 'slot' ? 'rv-suspense--slot' : ''} ${mode === 'elimination' ? 'rv-suspense--wide' : ''}">
            <p class="rv-suspense-kicker">${rank.kicker}</p>
            ${suspenseBody}
          </div>

          <div class="rv-reveal">
            ${rank.place === 1 ? `<div class="rv-crown">${CROWN_SVG}</div>` : ''}
            <div class="rv-card">
              <div class="rv-card-top">
                <span class="rv-team-tag">TEAM ${esc(row.team.number)}</span>
                <span class="rv-sec-tag">SECTION ${esc(row.team.section)}</span>
              </div>
              <h3 class="rv-name">${esc(row.team.name)}</h3>
              ${row.team.abstract_title ? `<p class="rv-project">“${esc(row.team.abstract_title)}”</p>` : ''}
              ${row.team.college ? `<p class="rv-college">${esc(row.team.college)}</p>` : ''}
              <div class="rv-members">${members}</div>
                <div class="rv-scoreboard">
                <div class="rv-total">
                  <span class="rv-total-label">Grand Total</span>
                  <span class="rv-total-value ${state.hasScores ? '' : 'is-empty'}" data-count="${state.hasScores ? row.total : ''}">${state.hasScores ? '0.0' : '—'}</span>
                  <span class="rv-total-max">/ ${state.maxTotal}</span>
                </div>
                ${EVENT_LIB.getEvent(categoryEventId(state.category)).mode === 'SINGLE'
                  ? `<div class="rv-split"><div><span>Judges</span><strong>${row.judges || 0}</strong><small>scored</small></div></div>`
                  : `<div class="rv-split">
                      <div><span>Phase 1</span><strong>${show(row.p1)}</strong><small>/ 30</small></div>
                      <div><span>Phase 2</span><strong>${show(row.p2)}</strong><small>/ 70</small></div>
                    </div>`
                }
              </div>
              ${note}
            </div>
          </div>
        </div>
      </section>`;
  }

  function renderRank(i) {
    const rank = RANKS[i];
    const row = pool()[rank.index];
    if (!row) return renderEmptyRank(rank);

    el.stage.innerHTML = rankMarkup(row, rank);
    const act = el.stage.querySelector('.rv-act');
    // 566's big drum hit lands at ~3.0s, so leave room for it on 3rd place.
    const suspenseMs = rank.place === 2 ? 3500 : 3200;

    state.auto.hold = true;
    el.indicator.textContent = `${rank.label} · drumroll — press Space to reveal`;
    el.nextLabel.textContent = 'Reveal now ▶';
    audio.drumroll(rank.place === 1 ? 3.2 : suspenseMs / 1000);

    let landed = false;
    let slotCancelled = false;
    const reveal = () => {
      if (landed) return;
      landed = true;
      if (state.gate === reveal || state.gate === skipRank) state.gate = null;
      audio.stopDrumroll();
      audio.stopSlotSpin();
      act.classList.add('is-revealed');

      if (rank.place === 1) {
        audio.hit();
        audio.applause();
        launchConfetti('mega');
      } else if (rank.place === 2) {
        audio.hit();
        audio.runnerUpFanfare();
        launchConfetti('big');
      } else {
        audio.hit();
        launchConfetti('standard');
      }

      el.indicator.textContent = `${rank.label} · revealed`;
      el.nextLabel.textContent = rank.next + ' ▶';
      state.auto.hold = false;
      scheduleAuto();

      later(() => {
        act.querySelectorAll('[data-count]').forEach((node) => {
          const target = parseFloat(node.dataset.count);
          if (!Number.isNaN(target)) countUp(node, target, 1300);
        });
      }, 280);
    };

    const skipRank = () => {
      slotCancelled = true;
      reveal();
    };

    state.gate = skipRank;
    if (prefersReducedMotion()) {
      reveal();
      return;
    }

    const usePsych = isPsychActiveForRank(rank);
    const mode = suspenseStyleFor(rank);
    if (mode === 'slot') {
      runSlot(act, row, reveal, () => slotCancelled, usePsych);
    } else if (mode === 'elimination') {
      runElimination(act, row, reveal, () => slotCancelled, usePsych);
    } else if (mode === 'decrypt') {
      runDecrypt(act, row, reveal, () => slotCancelled, usePsych);
    } else if (mode === 'stamp') {
      runStamp(act, row, reveal, () => slotCancelled, usePsych);
    } else {
      later(reveal, suspenseMs);
    }
  }

  // Elimination Battle Royale: drop teams one by one, hold on the Final 2,
  // optionally flash the psych beat (0.6s) on configured ranks, and crown the survivor.
  function runElimination(act, row, reveal, isCancelled, usePsych) {
    const grid = act.querySelector('#elimGrid');
    const tag = act.querySelector('#elimTag');
    if (!grid) { later(reveal, 2200); return; }

    const allTeams = pool().map((r) => r.team);
    const others = allTeams.filter((t) => String(t.number) !== String(row.team.number));
    for (let i = others.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [others[i], others[j]] = [others[j], others[i]];
    }
    const chosen = [row.team, ...others.slice(0, 11)];
    for (let i = chosen.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [chosen[i], chosen[j]] = [chosen[j], chosen[i]];
    }

    grid.innerHTML = chosen.map((t) =>
      `<span class="rv-tile" data-no="${esc(t.number)}">${esc(t.name)}</span>`
    ).join('');

    const dropOrder = others.slice(0, 11);
    const decoy = dropOrder.pop();
    const gap = Math.max(95, Math.min(200, 1700 / Math.max(1, dropOrder.length)));

    dropOrder.forEach((t, k) => later(() => {
      if (isCancelled()) return;
      const tile = grid.querySelector(`[data-no="${CSS.escape(String(t.number))}"]`);
      if (tile) tile.classList.add('is-out');
      audio.tick(2100 - k * 35);
    }, 260 + k * gap));

    const finalTwoAt = 260 + dropOrder.length * gap + 180;
    later(() => {
      if (isCancelled()) return;
      const winTile = grid.querySelector(`[data-no="${CSS.escape(String(row.team.number))}"]`);
      const decoyTile = decoy ? grid.querySelector(`[data-no="${CSS.escape(String(decoy.number))}"]`) : null;
      if (winTile) winTile.classList.add('is-finalist');
      if (decoyTile) decoyTile.classList.add('is-finalist');
      if (tag) tag.textContent = decoy ? `Finalists · ${row.team.name} & ${decoy.name}` : 'Finalist confirmed';
      audio.stopDrumroll();
    }, finalTwoAt);

    if (usePsych && decoy) {
      // Held pause -> 0.6s decoy flash -> restrained sting cut -> hard-cut to real winner within 0.8s
      later(() => {
        if (isCancelled()) return;
        const decoyTile = grid.querySelector(`[data-no="${CSS.escape(String(decoy.number))}"]`);
        if (decoyTile) decoyTile.classList.add('is-winner');
        if (tag) tag.textContent = `${decoy.name}…`;
        audio.stingCut();
      }, finalTwoAt + 950);

      later(() => {
        if (isCancelled()) return;
        const winTile = grid.querySelector(`[data-no="${CSS.escape(String(row.team.number))}"]`);
        const decoyTile = grid.querySelector(`[data-no="${CSS.escape(String(decoy.number))}"]`);
        if (decoyTile) {
          decoyTile.classList.remove('is-winner', 'is-finalist');
          decoyTile.classList.add('is-decoy-out');
        }
        if (winTile) {
          winTile.classList.remove('is-finalist');
          winTile.classList.add('is-winner');
        }
        if (tag) tag.textContent = `Official Winner · ${row.team.name}`;
        audio.winnerBell();
        later(() => { if (!isCancelled()) reveal(); }, 550);
      }, finalTwoAt + 1550);
    } else {
      later(() => {
        if (isCancelled()) return;
        const winTile = grid.querySelector(`[data-no="${CSS.escape(String(row.team.number))}"]`);
        const decoyTile = decoy ? grid.querySelector(`[data-no="${CSS.escape(String(decoy.number))}"]`) : null;
        if (decoyTile) {
          decoyTile.classList.remove('is-finalist');
          decoyTile.classList.add('is-decoy-out');
        }
        if (winTile) {
          winTile.classList.remove('is-finalist');
          winTile.classList.add('is-winner');
        }
        if (tag) tag.textContent = `Official Winner · ${row.team.name}`;
        audio.winnerBell();
        later(() => { if (!isCancelled()) reveal(); }, 550);
      }, finalTwoAt + 950);
    }
  }

  // Matrix Decrypt: scrambles glyphs and locks onto the winner (no psych unless flagged).
  function runDecrypt(act, row, reveal, isCancelled, usePsych) {
    const reel = act.querySelector('#decryptText');
    const tag = act.querySelector('#decryptTag');
    if (!reel) { later(reveal, 2200); return; }

    const realName = row.team.name.toUpperCase();
    const decoyName = pickTrackFinalistDecoy(row).toUpperCase();
    const glyphs = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

    const scrambleTo = (target, ms, onDone) => {
      const start = performance.now();
      let lastLocked = -1;
      const frame = () => {
        if (isCancelled()) return;
        const p = Math.min(1, (performance.now() - start) / ms);
        const locked = Math.floor(p * target.length);
        let out = '';
        for (let i = 0; i < target.length; i++) {
          out += (target[i] === ' ' || i < locked)
            ? target[i]
            : glyphs[Math.floor(Math.random() * glyphs.length)];
        }
        reel.textContent = out;
        if (locked !== lastLocked) { lastLocked = locked; audio.click(); }
        if (p < 1) later(frame, 48);
        else { reel.textContent = target; onDone(); }
      };
      frame();
    };

    if (usePsych) {
      scrambleTo(decoyName, 1400, () => {
        if (isCancelled()) return;
        reel.classList.add('is-decoy');
        if (tag) tag.textContent = `${decoyName}…`;
        audio.stingCut();
        later(() => {
          if (isCancelled()) return;
          reel.classList.remove('is-decoy');
          reel.textContent = realName;
          if (tag) tag.textContent = `Official Winner · ${row.team.name}`;
          audio.winnerBell();
          later(() => { if (!isCancelled()) reveal(); }, 500);
        }, 600);
      });
    } else {
      scrambleTo(realName, 2000, () => {
        if (isCancelled()) return;
        if (tag) tag.textContent = `Official Winner · ${row.team.name}`;
        audio.winnerBell();
        later(() => { if (!isCancelled()) reveal(); }, 500);
      });
    }
  }

  function runStamp(act, row, reveal, isCancelled, usePsych) {
    const counter = act.querySelector('#stampCount');
    if (!counter) { later(reveal, 2200); return; }
    ['3', '2', '1'].forEach((n, k) => later(() => {
      if (isCancelled()) return;
      counter.textContent = n;
      audio.tick(1800 + k * 300);
    }, k * 700));

    if (usePsych && row) {
      const decoy = pickTrackFinalistDecoy(row);
      later(() => {
        if (isCancelled()) return;
        counter.classList.add('is-decoy');
        counter.textContent = decoy;
        audio.stopDrumroll();
        audio.stingCut();
      }, 2150);
      later(() => {
        if (isCancelled()) return;
        counter.classList.remove('is-decoy');
        counter.textContent = row.team.name;
        audio.winnerBell();
        later(() => { if (!isCancelled()) reveal(); }, 450);
      }, 2750);
    } else {
      later(() => { if (!isCancelled()) reveal(); }, 2200);
    }
  }

  // Champion-only slot machine: spin through the field, fake out on a decoy,
  // then snap to the real winner at the last moment.
  function runSlot(act, row, reveal, isCancelled, usePsych) {
    const reel = act.querySelector('#slotReel');
    const tag = act.querySelector('#slotTag');
    const machine = act.querySelector('#slotMachine');
    if (!reel || !tag || !machine) {
      later(reveal, 2200);
      return;
    }

    const names = pool().map((r) => r.team.name).filter((n) => n !== row.team.name);
    const decoy = pickTrackFinalistDecoy(row);
    const spinMs = 2200;
    const started = performance.now();
    let finished = false;

    const finish = () => {
      if (finished || isCancelled()) return;
      finished = true;
      reel.classList.remove('is-spinning', 'is-decoy', 'is-fake');
      machine.classList.remove('is-decoy', 'is-fake');
      reveal();
    };

    const step = () => {
      if (isCancelled()) return;
      const p = Math.min(1, (performance.now() - started) / spinMs);
      reel.textContent = names[Math.floor(Math.random() * names.length)] || row.team.name;

      if (p < 1) {
        later(step, 55 + 360 * Math.pow(p, 2.6));
        return;
      }

      reel.classList.remove('is-spinning');
      audio.stopSlotSpin();

      if (usePsych) {
        // Flash track finalist decoy for 0.6s with one restrained sting cut, then hard-cut to real winner.
        reel.textContent = decoy;
        reel.classList.add('is-decoy');
        machine.classList.add('is-decoy');
        tag.textContent = 'Finalist verification…';
        audio.stopDrumroll();
        audio.stingCut();

        later(() => {
          if (isCancelled()) return;
          reel.classList.remove('is-decoy', 'is-fake');
          reel.classList.add('is-real');
          reel.textContent = row.team.name;
          machine.classList.remove('is-decoy', 'is-fake');
          machine.classList.add('is-real');
          tag.textContent = `Official Champion · ${row.team.name}`;
          audio.winnerBell();
          later(finish, 550);
        }, 600);
      } else {
        reel.textContent = row.team.name;
        reel.classList.add('is-real');
        machine.classList.add('is-real');
        tag.textContent = `Official Champion · ${row.team.name}`;
        audio.winnerBell();
        later(finish, 550);
      }
    };

    reel.classList.add('is-spinning');
    audio.slotSpin(2.3);
    step();
    later(finish, 7000);
  }

  function renderEmptyRank(rank) {
    el.indicator.textContent = `${rank.label} · no entries`;
    el.nextLabel.textContent = rank.next + ' ▶';
    el.stage.innerHTML = `
      <section class="rv-final">
        <p class="rv-final-kicker">No teams in this category</p>
        <h1 class="rv-final-title">${esc(CATEGORY_TITLES[state.category])}</h1>
        <div class="rv-final-shapes">${shapeRow()}</div>
      </section>`;
    state.auto.hold = false;
    scheduleAuto();
  }

  function countUp(node, target, ms) {
    const start = performance.now();
    const tick = (now) => {
      const p = Math.min(1, (now - start) / ms);
      const eased = 1 - Math.pow(1 - p, 3);
      node.textContent = (target * eased).toFixed(1);
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  // =============================================================
  // Final podium
  // =============================================================
  function renderPodium() {
    el.indicator.textContent = 'Ceremony complete · Final podium';
    el.nextLabel.textContent = 'Replay ceremony 🔄';

    const rows = pool();
    const slot = (row, place, label) => {
      const crown = place === 1 ? `<div class="rv-podium-crown">${CROWN_SVG}</div>` : '';
      if (!row) {
        return `
          <div class="rv-podium-col rv-podium-col--${place}">
            ${crown}
            <div class="rv-podium-player">
              <span class="rv-podium-avatar rv-podium-avatar--${place}" aria-hidden="true">?</span>
              <span class="rv-podium-label">${label}</span>
              <span class="rv-podium-name">Awaiting</span>
              <span class="rv-podium-score">—<small>/ ${state.maxTotal}</small></span>
            </div>
            <div class="rv-podium-block rv-podium-block--${place}">${place}</div>
          </div>`;
      }
      return `
        <div class="rv-podium-col rv-podium-col--${place}">
          ${crown}
          <div class="rv-podium-player">
            <span class="rv-podium-avatar rv-podium-avatar--${place}" aria-hidden="true">${esc(getInitials(row.team.name))}</span>
            <span class="rv-podium-label">${label}</span>
            <span class="rv-podium-name">${esc(row.team.name)}</span>
            <span class="rv-podium-team">TEAM ${esc(row.team.number)} · ${esc(row.team.college || row.team.section)}</span>
            <span class="rv-podium-score">
              ${state.hasScores ? row.total.toFixed(1) : '—'}<small>/ ${state.maxTotal}</small>
            </span>
          </div>
          <div class="rv-podium-block rv-podium-block--${place}">${place}</div>
        </div>`;
    };

    el.stage.innerHTML = `
      <section class="rv-final">
        <div class="rv-spotlights" aria-hidden="true">
          <span class="rv-spot rv-spot--2"></span>
          <span class="rv-spot rv-spot--1"></span>
          <span class="rv-spot rv-spot--3"></span>
        </div>
        <p class="rv-final-kicker">That's a wrap · ${state.hasScores ? 'Verified final honors' : 'Rehearsal preview'}</p>
        <h1 class="rv-final-title">${esc(CATEGORY_TITLES[state.category])}</h1>
        <div class="rv-podium">
          ${slot(rows[1], 2, '1st Runner-Up')}
          ${slot(rows[0], 1, 'Grand Champion')}
          ${slot(rows[2], 3, '2nd Runner-Up')}
        </div>
        <div class="rv-final-shapes">${shapeRow()}</div>
      </section>`;

    audio.podiumFanfare();
    launchConfetti('big');
    later(() => launchConfetti('standard'), 900);
    state.auto.hold = false;
    scheduleAuto();
  }

  // =============================================================
  // Standings modal (always shows the locked snapshot)
  // =============================================================
  function renderModal() {
    if (!el.modalBody) return;
    const f = el.modalFilter ? el.modalFilter.value : 'ALL';
    const rows = state.locked.filter((r) => f === 'ALL' || r.team.section === f);
    const show = (v) => (state.hasScores ? v.toFixed(1) : '—');
    const event = EVENT_LIB.getEvent(categoryEventId(state.category));
    const isSingle = event.mode === 'SINGLE';

    const modalSub = $('standingsModalSub');
    if (modalSub) {
      modalSub.textContent = isSingle
        ? `${event.icon} ${event.label} · Jury average out of ${event.maxTotal} marks`
        : 'Phase 1 Mentoring (30%) + Phase 2 Final Expo (70%) = Total Score (100%)';
    }

    const theadRow = $('standingsTheadRow');
    if (theadRow) {
      theadRow.innerHTML = isSingle
        ? `
          <th class="is-center">Rank</th>
          <th>Team</th>
          <th>Team Name &amp; Project</th>
          <th class="is-center">Sec</th>
          <th class="is-center">Judges</th>
          <th class="is-right">Average (${event.maxTotal})</th>`
        : `
          <th class="is-center">Rank</th>
          <th>Team</th>
          <th>Team Name &amp; Project</th>
          <th class="is-center">Sec</th>
          <th class="is-center">Phase 1 (/30)</th>
          <th class="is-center">Phase 2 (/70)</th>
          <th class="is-right">Total (/100)</th>`;
    }

    el.modalBody.innerHTML = rows.map((r, i) => {
      const cells = isSingle
        ? `
        <td class="is-center">${r.judges}</td>
        <td class="is-right"><span class="rv-table-total">${show(r.total)}</span></td>`
        : `
        <td class="is-center">${show(r.p1)}</td>
        <td class="is-center">${show(r.p2)}</td>
        <td class="is-right"><span class="rv-table-total">${show(r.total)}</span></td>`;

      return `
      <tr class="${i === 0 ? 'is-leader' : ''}">
        <td class="is-center"><strong>#${i + 1}</strong></td>
        <td class="rv-table-num">T-${esc(r.team.number)}</td>
        <td>
          <span class="rv-table-team">${esc(r.team.name)}</span>
          <span class="rv-table-sub">${esc(r.team.abstract_title || '')}</span>
        </td>
        <td class="is-center"><span class="rv-table-sec">${esc(r.team.section)}</span></td>
        ${cells}
      </tr>`;
    }).join('');
  }

  const openModal = () => {
    clearAutoTimer();
    resetConfetti();
    el.modal.classList.add('is-open');
    el.modal.setAttribute('aria-hidden', 'false');
    renderModal();
  };
  const closeModal = () => {
    el.modal.classList.remove('is-open');
    el.modal.setAttribute('aria-hidden', 'true');
    if (state.auto.seconds) scheduleAuto();
  };

  // =============================================================
  // Controls
  // =============================================================
  function toggleFullscreen() {
    if (document.fullscreenElement) document.exitFullscreen();
    else document.documentElement.requestFullscreen().catch((e) => console.warn('Fullscreen error:', e));
  }

  function toggleAudio() {
    state.muted = !state.muted;
    try { sessionStorage.setItem('embers_reveal_muted', state.muted ? '1' : '0'); } catch (e) {}
    audio.setMuted(state.muted);
    if (state.muted) {
      audio.stopDrumroll();
      audio.stopSlotSpin();
    } else {
      audio.get();
    }
    el.audioIcon.textContent = state.muted ? '🔇' : '🔊';
    el.audioText.textContent = state.muted ? 'MUTED' : 'SOUND ON';
  }

  function updatePsychUI() {
    if (el.psychBtn) el.psychBtn.setAttribute('aria-pressed', state.psychEnabled ? 'true' : 'false');
    if (el.psychIcon) el.psychIcon.textContent = state.psychEnabled ? '⚡' : '⏸️';
    if (el.psychText) el.psychText.textContent = state.psychEnabled ? 'PSYCH ON' : 'PSYCH OFF';
  }

  function togglePsych() {
    state.psychEnabled = !state.psychEnabled;
    updatePsychUI();
    saveCeremonyState();
  }

  function updateProjectorUI() {
    document.body.classList.toggle('is-projector', state.projectorMode);
    if (el.projectorBtn) {
      el.projectorBtn.setAttribute('aria-pressed', state.projectorMode ? 'true' : 'false');
      el.projectorBtn.classList.toggle('rv-tool-btn--solid', state.projectorMode);
    }
  }

  function toggleProjector() {
    state.projectorMode = !state.projectorMode;
    updateProjectorUI();
    saveCeremonyState();
  }

  function updateBannerForCategory() {
    const bannerEvent = $('revealBannerEvent');
    const bannerSub = $('revealBannerSub');
    if (!bannerEvent || !bannerSub) return;
    if (state.category === 'PAPER') {
      bannerEvent.textContent = "EMBERS '26 · TRACK 3";
      bannerEvent.style.color = '#818cf8';
      bannerSub.textContent = "Technical Paper Presentation Valedictory (Multipurpose Hall)";
    } else if (state.category === 'PROJECT_EXPO' || state.category === 'HARDWARE' || state.category === 'SOFTWARE') {
      bannerEvent.textContent = "EMBERS '26 · TRACK 2";
      bannerEvent.style.color = '#fbbf24';
      bannerSub.textContent = "National Project Expo & Working Model Exhibition (Edusat Hall)";
    } else if (['EMBEDDATHON', 'EMBEDTHON', 'A', 'B'].includes(state.category)) {
      bannerEvent.textContent = "EMBEDTHON '26 · TRACK 1";
      bannerEvent.style.color = '#ea580c';
      bannerSub.textContent = "24-Hour Internal Hackathon Valedictory (Labs 1 & 2)";
    } else {
      bannerEvent.textContent = "EMBERS '26";
      bannerEvent.style.color = '#ff9f43';
      bannerSub.textContent = "Grand Valedictory & Prize Distribution Ceremony";
    }
  }

  function bind() {
    el.next.addEventListener('click', () => { next(); el.next.blur(); });
    el.prev.addEventListener('click', () => { prev(); el.prev.blur(); });
    el.confetti.addEventListener('click', () => {
      audio.tick(1800);
      launchConfetti('standard');
      el.confetti.blur();
    });
    el.audioBtn.addEventListener('click', toggleAudio);
    if (el.psychBtn) el.psychBtn.addEventListener('click', togglePsych);
    if (el.projectorBtn) el.projectorBtn.addEventListener('click', toggleProjector);
    el.fsBtn.addEventListener('click', toggleFullscreen);
    if (el.autoSelect) {
      el.autoSelect.addEventListener('change', (e) => setAutoSeconds(e.target.value));
    }

    document.addEventListener('fullscreenchange', () => {
      const isFullscreen = !!document.fullscreenElement;
      document.body.classList.toggle('is-fullscreen', isFullscreen);
      el.fsIcon.textContent = isFullscreen ? '✕' : '⛶';
    });

    el.category.addEventListener('change', (e) => {
      state.category = e.target.value;
      state.maxTotal = categoryMax(state.category);
      applyLive(rowsForCategory(state.category));
      updateBannerForCategory();
      setStep(STEP_WELCOME);
    });

    el.openModal.addEventListener('click', openModal);
    el.closeModal.addEventListener('click', closeModal);
    el.modalFilter.addEventListener('change', renderModal);
    el.modal.addEventListener('click', (e) => { if (e.target === el.modal) closeModal(); });

    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        if (el.modal && el.modal.classList.contains('is-open')) closeModal();
        return;
      }
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes(e.target.tagName)) return;
      if (el.modal.classList.contains('is-open')) return;

      const key = e.key.toLowerCase();
      if (e.key === 'End' || (e.shiftKey && e.key === 'Enter')) {
        e.preventDefault();
        if (state.gate) {
          const skipNow = state.gate;
          state.gate = null;
          skipNow();
        } else {
          setStep(STEP_PODIUM);
        }
      } else if (/^[1-3]$/.test(e.key)) {
        e.preventDefault();
        setStep(Number(e.key));
      } else if (e.key === ' ' || e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === 'Enter') {
        e.preventDefault();
        next();
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        prev();
      } else if (key === 'a') {
        e.preventDefault();
        toggleAuto();
      } else if (key === 'r') {
        e.preventDefault();
        setStep(STEP_WELCOME);
      } else if (key === 'f') {
        e.preventDefault();
        toggleFullscreen();
      } else if (key === 'm') {
        e.preventDefault();
        toggleAudio();
      } else if (key === 'c') {
        e.preventDefault();
        launchConfetti('standard');
      }
    });
  }

  // =============================================================
  // Init
  // =============================================================
  function seedEmbers() {
    if (!el.emberField) return;
    const frag = document.createDocumentFragment();
    for (let i = 0; i < 28; i++) {
      const spark = document.createElement('span');
      const size = (1.4 + Math.random() * 3.6).toFixed(1);
      spark.style.cssText = [
        `--x:${(Math.random() * 100).toFixed(2)}%`,
        `--s:${size}px`,
        `--d:${(6 + Math.random() * 8).toFixed(2)}s`,
        `--delay:${(-Math.random() * 12).toFixed(2)}s`,
        `--o:${(0.25 + Math.random() * 0.55).toFixed(2)}`,
        `--drift:${((Math.random() * 2 - 1) * 70).toFixed(0)}px`
      ].join(';');
      frag.appendChild(spark);
    }
    el.emberField.appendChild(frag);
  }

  async function init() {
    document.body.classList.add('ceremony-brand');

    seedEmbers();
    updateAutoUI();
    void audio.preload();
    if (document.fullscreenElement) document.body.classList.add('is-fullscreen');

    const saved = restoreCeremonyState();
    const params = new URLSearchParams(location.search);
    const rawCategory = (params.get('category') || params.get('track') || params.get('event') || '').toUpperCase();
    let urlCategory = rawCategory;
    if (rawCategory === 'EXPO' || rawCategory === 'PROJECT_EXPO' || rawCategory === 'TRACK_2' || rawCategory === 'TRACK2') urlCategory = 'PROJECT_EXPO';
    if (rawCategory === 'PAPER' || rawCategory === 'TRACK_3' || rawCategory === 'TRACK3') urlCategory = 'PAPER';
    if (rawCategory === 'EMBEDDATHON' || rawCategory === 'EMBEDTHON' || rawCategory === 'TRACK_1' || rawCategory === 'TRACK1' || rawCategory === 'HACKATHON') urlCategory = 'EMBEDDATHON';

    const targetCategory = urlCategory || (saved && saved.category) || 'PAPER';
    if (targetCategory && el.category) {
      const exists = Array.from(el.category.options).some((o) => o.value === targetCategory);
      if (exists) el.category.value = targetCategory;
    }
    if (el.category && el.category.value) state.category = el.category.value;
    if (saved) {
      if (typeof saved.psychEnabled === 'boolean') state.psychEnabled = saved.psychEnabled;
      if (typeof saved.projectorMode === 'boolean') state.projectorMode = saved.projectorMode;
    }
    if (el.audioIcon) el.audioIcon.textContent = state.muted ? '🔇' : '🔊';
    if (el.audioText) el.audioText.textContent = state.muted ? 'MUTED' : 'SOUND ON';
    updatePsychUI();
    updateProjectorUI();

    state.maxTotal = categoryMax(state.category);
    state.eventRows = computeStandings({});

    bind();
    updateBannerForCategory();

    applyLive(rowsForCategory(state.category));
    await syncData();
    if (saved && typeof saved.step === 'number' && saved.step >= STEP_WELCOME && saved.step <= STEP_PODIUM && !urlCategory) {
      setStep(saved.step);
    }
    setInterval(syncData, POLL_MS);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
