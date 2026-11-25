// EMBERS '26 · Rehearsal & Test Reveal Stage Engine (Accessible only by direct URL)
// Uses the full Kahoot-style stage, slot-machine suspense, sound bus, and animations
// from reveal.js, powered by curated fake demo data (with optional live-sync toggle).

(function () {
  'use strict';

  const POLL_MS = 4000;
  const EVENT_LIB = window.EMBEDTHON_RUBRICS || {
    EVENTS: {},
    getEvent: function (id) {
      if (id === 'PAPER') return { id: 'PAPER', label: 'Paper Presentation', icon: '📄', maxTotal: 50, mode: 'SINGLE' };
      if (id === 'PROJECT_EXPO') return { id: 'PROJECT_EXPO', label: 'Project Expo', icon: '🛠️', maxTotal: 50, mode: 'SINGLE' };
      return { id: 'EMBEDDATHON', label: 'Embeddathon', icon: '⚡', maxTotal: 100, mode: 'DUAL_PHASE' };
    }
  };

  const CATEGORY_TITLES = {
    OVERALL: 'Overall Champions (All 24 Teams)',
    EMBEDDATHON: '⚡ Embeddathon (Labs 1 & 2)',
    EMBEDTHON: '⚡ Embeddathon (Labs 1 & 2)',
    PROJECT_EXPO: '🛠️ Project Expo (Edusat Hall)',
    HARDWARE: '🛠️ Project Expo (Hardware)',
    SOFTWARE: '🛠️ Project Expo (Software)',
    PAPER: '📄 Technical Paper Presentation (Multipurpose Hall)',
    A: 'Section A (Teams 01–11)',
    B: 'Section B (Teams 12–24)'
  };

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
    projectorBtn: $('btnProjectorToggle'),
    // Test Deck Elements
    testDeck: $('testControlDeck'),
    btnToggleDataset: $('btnToggleDataset'),
    txtDatasetSource: $('txtDatasetSource'),
    btnShuffleDemo: $('btnShuffleDemo'),
    txtStageDataBadge: $('txtStageDataBadge'),
    btnToggleDeckVisibility: $('btnToggleDeckVisibility'),
    txtToggleDeck: $('txtToggleDeck'),
    testStyleSelect: $('testStyleSelect'),
    btnTestDrumroll: $('btnTestDrumroll'),
    btnTestFanfare: $('btnTestFanfare'),
    btnTestConfetti: $('btnTestConfetti'),
    btnTestApplause: $('btnTestApplause')
  };

  const state = {
    isMockMode: true,
    shuffleSeed: 1,
    style: 'mix',
    category: 'PAPER',
    step: STEP_WELCOME,
    gate: null,
    live: [],
    locked: [],
    eventRows: {},
    maxTotal: 50,
    pending: false,
    hasScores: true,
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

  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));

  const later = (fn, ms) => { state.timers.push(setTimeout(fn, ms)); };
  const clearTimers = () => { state.timers.forEach(clearTimeout); state.timers = []; };

  // =============================================================
  // Sound Engine (Master GainNode bus + DynamicsCompressor)
  // =============================================================
  const SFX_URLS = {
    whooshFast: 'assets/sfx/whoosh-fast-1489.mp3',
    whooshDeep: 'assets/sfx/whoosh-deep.mp3',
    drumroll566: 'assets/sfx/drumroll-566.mp3',
    impact577: 'assets/sfx/impact-577.mp3',
    fanfareRunnerUp: 'assets/sfx/fanfare-horns.mp3',
    podiumBrass: 'assets/sfx/podium-brass.mp3',
    winnerBell: 'assets/sfx/winner-bell.mp3',
    applause: 'assets/sfx/applause-crowd.mp3',
    fakeRiser: 'assets/sfx/fake-build-riser.mp3',
    psychFart: 'assets/sfx/psych-fart.mp3',
    slotPayout: 'assets/sfx/slot-payout.mp3',
    slotTick: 'assets/sfx/slot-tick.mp3'
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
      if (ctx.state === 'suspended') ctx.resume().catch(() => {});
      return ctx;
    },

    setMuted(muted) {
      if (!this.ctx || !this.bus) return;
      const t = this.ctx.currentTime;
      this.bus.gain.cancelScheduledValues(t);
      this.bus.gain.setTargetAtTime(muted ? 0 : 1, t, 0.02);
    },

    async preload() {
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
      if (!this.playSample('impact577', 0.55, { offset: 5.15, duration: 0.45, fadeOut: 0.15 })) {
        this.tone(220, 0.25, 0.22, 'triangle', 0.75);
      }
    },

    psychFart() {
      this.stingCut();
    },

    winnerBell() {
      if (!this.playSample('winnerBell', 0.8, { duration: 2.0, fadeOut: 0.4 })) this.chime();
      this.playSample('whooshFast', 0.28, { rate: 1.2, duration: 0.7, fadeOut: 0.2 });
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

    slotSpin(dur = 3.1) {
      this.stopSlotSpin();
      const handle = this.playSample('slotPayout', 0.85, { duration: dur, fadeOut: 0.15 });
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
        } catch (e) { /* already finished */ }
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
          } catch (e) { /* already finished */ }
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
    const base = { disableForReducedMotion: true, zIndex: 100 };
    if (type === 'mega') {
      confetti({ ...base, particleCount: 140, spread: 95, origin: { y: 0.62 }, colors: CONFETTI_COLORS });
      later(() => {
        confetti({ ...base, particleCount: 70, angle: 60, spread: 60, origin: { x: 0.05, y: 0.72 }, colors: CONFETTI_COLORS });
        confetti({ ...base, particleCount: 70, angle: 120, spread: 60, origin: { x: 0.95, y: 0.72 }, colors: CONFETTI_COLORS });
      }, 240);
    } else if (type === 'big') {
      confetti({ ...base, particleCount: 95, spread: 80, origin: { y: 0.66 }, colors: CONFETTI_COLORS });
    } else {
      confetti({ ...base, particleCount: 55, spread: 65, origin: { y: 0.7 }, colors: CONFETTI_COLORS });
    }
  }

  // =============================================================
  // Curated Fake Demo Data (Rehearsal & Test Reveal Only)
  // =============================================================
  const FAKE_DEMO_DATA = {
    EMBEDDATHON: [
      {
        number: '07',
        name: 'Apex Innovators ⚡',
        abstract_title: 'Autonomous Swarm Drones for Disaster Relief & Thermal Mapping',
        college: 'Apex Institute of Technology, Bengaluru',
        members: [{ name: 'Aryan Sharma', is_lead: true }, { name: 'Riya Menon' }, { name: 'Kabir Verma' }],
        section: 'A',
        p1: 29.2,
        p2: 68.2,
        total: 97.4
      },
      {
        number: '14',
        name: 'NeuralForge AI 🧠',
        abstract_title: 'Quantum-Resistant Neuromorphic Cryptochip on RISC-V Silicon',
        college: 'Global Cybernetics University, Mysuru',
        members: [{ name: 'Elena Vance', is_lead: true }, { name: 'Siddharth Rao' }, { name: 'Neha Kulkarni' }],
        section: 'B',
        p1: 28.3,
        p2: 65.9,
        total: 94.2
      },
      {
        number: '03',
        name: 'Veloce Dynamics 🦾',
        abstract_title: 'Sub-Millisecond Bionic Exoskeleton with Neural Force Feedback',
        college: 'Metropolis Institute of Tech, Mangaluru',
        members: [{ name: 'Marcus Vance', is_lead: true }, { name: 'Aditya Shetty' }, { name: 'Meera Nair' }],
        section: 'A',
        p1: 27.1,
        p2: 63.4,
        total: 90.5
      },
      {
        number: '19',
        name: 'Hyperion Core ☀️',
        abstract_title: 'Next-Gen Solid-State High-Capacity Smart Battery BMS',
        college: 'Solaria Engineering Academy, Udupi',
        members: [{ name: 'Zara Chen', is_lead: true }, { name: 'Vikram Hegde' }, { name: 'Pooja Bhat' }],
        section: 'B',
        p1: 26.3,
        p2: 61.5,
        total: 87.8
      },
      {
        number: '09',
        name: 'Aether Robotics 🤖',
        abstract_title: 'Vision-Guided Micro-Pesticide Precision Agriculture Harvester',
        college: 'Horizon State University, Hubballi',
        members: [{ name: 'Rohan Verma', is_lead: true }, { name: 'Tanvi Joshi' }, { name: 'Arjun Pai' }],
        section: 'A',
        p1: 25.4,
        p2: 59.2,
        total: 84.6
      },
      {
        number: '22',
        name: 'CyberPulse Labs 📡',
        abstract_title: 'Edge-AI Acoustic Vibration Fault Classifier for Jet Turbines',
        college: 'Pacific Technical Campus, Belagavi',
        members: [{ name: 'David Miller', is_lead: true }, { name: 'Sneha Kamath' }, { name: 'Rahul Iyer' }],
        section: 'B',
        p1: 24.2,
        p2: 57.0,
        total: 81.2
      },
      {
        number: '05',
        name: 'Quantum Rovers 🚀',
        abstract_title: 'All-Terrain Lunar Exploration Rover with Real-Time LiDAR SLAM',
        college: 'Astrodyne Institute of Aeronautical Tech',
        members: [{ name: 'Samantha Ray', is_lead: true }, { name: 'Nikhil Gowda' }, { name: 'Isha Shenoy' }],
        section: 'A',
        p1: 23.5,
        p2: 55.1,
        total: 78.6
      },
      {
        number: '16',
        name: 'PixelForge Core 👾',
        abstract_title: 'Sub-Milliwatt Neural Audio Speech Enhancer on ARM Cortex-M4',
        college: 'Delta Polytechnic Institute, Shivamogga',
        members: [{ name: 'Priya Sharma', is_lead: true }, { name: 'Karan Alva' }, { name: 'Divya Acharya' }],
        section: 'B',
        p1: 22.8,
        p2: 52.7,
        total: 75.5
      }
    ],
    PROJECT_EXPO: [
      {
        number: 'HW-99',
        name: 'Titan Dynamics 🦾',
        abstract_title: 'Omni-Directional Industrial Exoskeleton with Neural Force Feedback',
        college: 'Titan Polytechnic Institute, Bengaluru',
        members: [{ name: 'Elena Rostova', is_lead: true }, { name: 'Varun Prabhu' }],
        section: 'HARDWARE',
        total: 48.6
      },
      {
        number: 'SW-88',
        name: 'Synthetix Studio 🔮',
        abstract_title: 'Generative Holographic CAD Workbench with Real-Time Hand Tracking',
        college: 'Horizon State University, Mysuru',
        members: [{ name: 'Leo Sterling', is_lead: true }, { name: 'Anjali Rai' }],
        section: 'SOFTWARE',
        total: 46.8
      },
      {
        number: 'HW-77',
        name: 'HyperDrive Labs 🚄',
        abstract_title: 'Contactless MagLev Urban Rapid Transit Capsule Prototype',
        college: 'Silicon Valley Technical Campus',
        members: [{ name: 'Zainab Al-Hassan', is_lead: true }, { name: 'Ritesh Kumar' }],
        section: 'HARDWARE',
        total: 44.5
      },
      {
        number: 'SW-66',
        name: 'ShieldOS CyberSec 🛡️',
        abstract_title: 'Zero-Trust Microkernel Sandboxing for Critical Infrastructure Firmware',
        college: 'CyberCore Research University, Mangaluru',
        members: [{ name: 'Natasha Roman', is_lead: true }, { name: 'Harish Nayak' }],
        section: 'SOFTWARE',
        total: 42.4
      },
      {
        number: 'HW-55',
        name: 'GreenMatrix BioPower 🌿',
        abstract_title: 'Microbial Fuel Cell Array for Autonomous Wetland Monitoring Sensors',
        college: 'EcoTech Global Institute, Hassan',
        members: [{ name: 'Carlos Morales', is_lead: true }, { name: 'Sanya Shetty' }],
        section: 'HARDWARE',
        total: 40.2
      },
      {
        number: 'SW-44',
        name: 'MediScan Vision 🩺',
        abstract_title: 'Multi-Modal Federated AI for Microscopic Blood Pathology Diagnosis',
        college: 'Cambridge Health Sciences Institute',
        members: [{ name: 'Sarah Jenkins', is_lead: true }, { name: 'Pranav Kini' }],
        section: 'SOFTWARE',
        total: 38.5
      }
    ],
    PAPER: [
      {
        number: 'PP-01',
        name: 'Turing Scholars 📜',
        abstract_title: 'Transformers at the Edge: Ultra-Low-Bit Quantization for Sub-Milliwatt Microcontrollers',
        college: 'International AI Research Institute, Bengaluru',
        members: [{ name: 'Maya Chen', is_lead: true }, { name: 'Rohan Kulkarni' }],
        section: 'PAPER',
        total: 48.9
      },
      {
        number: 'PP-02',
        name: 'CyberPulse Research 🔬',
        abstract_title: 'Formal Verification of Autonomous Flight Neural Controllers Against Adversarial Attacks',
        college: 'Cambridge Cybernetics Laboratory',
        members: [{ name: 'Liam O\'Connor', is_lead: true }, { name: 'Deepa Rao' }],
        section: 'PAPER',
        total: 46.2
      },
      {
        number: 'PP-03',
        name: 'BioInformatics Alpha 🧬',
        abstract_title: 'In-Silico Protein-Ligand Affinity Acceleration via Geometric Graph Neural Operators',
        college: 'Stanford Genomic Computing Centre',
        members: [{ name: 'Priya Sengupta', is_lead: true }, { name: 'Akash Shetty' }],
        section: 'PAPER',
        total: 43.8
      },
      {
        number: 'PP-04',
        name: 'Quantum Logic Group ⚛️',
        abstract_title: 'Fault-Tolerant Topological Surface Code Optimization for Quantum Processors',
        college: 'Oxford Quantum Computing Institute',
        members: [{ name: 'Alexander Bohr', is_lead: true }, { name: 'Nandini Bhat' }],
        section: 'PAPER',
        total: 41.0
      },
      {
        number: 'PP-05',
        name: 'ZeroTrust Protocol Guild 🌐',
        abstract_title: 'Lattice-Based Post-Quantum Zero-Knowledge Authentication for IoT Nodes',
        college: 'ETH Zurich Cryptography Center',
        members: [{ name: 'Karin Lindqvist', is_lead: true }, { name: 'Sameer Khan' }],
        section: 'PAPER',
        total: 38.5
      }
    ]
  };

  function categoryEventId(cat) {
    if (cat === 'PROJECT_EXPO' || cat === 'HARDWARE' || cat === 'SOFTWARE') return 'PROJECT_EXPO';
    if (cat === 'PAPER') return 'PAPER';
    return 'EMBEDDATHON';
  }

  function categoryMax(cat) {
    return EVENT_LIB.getEvent(categoryEventId(cat)).maxTotal || 100;
  }

  function generateMockStandings(cat) {
    const c = (cat || 'OVERALL').toUpperCase();
    let pool = [];
    if (c === 'PAPER') {
      pool = [...FAKE_DEMO_DATA.PAPER];
    } else if (c === 'PROJECT_EXPO' || c === 'HARDWARE' || c === 'SOFTWARE') {
      if (c === 'HARDWARE') pool = FAKE_DEMO_DATA.PROJECT_EXPO.filter(t => t.section === 'HARDWARE');
      else if (c === 'SOFTWARE') pool = FAKE_DEMO_DATA.PROJECT_EXPO.filter(t => t.section === 'SOFTWARE');
      else pool = [...FAKE_DEMO_DATA.PROJECT_EXPO];
    } else if (c === 'A') {
      pool = FAKE_DEMO_DATA.EMBEDDATHON.filter(t => t.section === 'A');
    } else if (c === 'B') {
      pool = FAKE_DEMO_DATA.EMBEDDATHON.filter(t => t.section === 'B');
    } else {
      pool = [...FAKE_DEMO_DATA.EMBEDDATHON];
    }

    const ordered = state.shuffleSeed === 1
      ? pool
      : pool.map((v, idx) => {
          const charSum = (v.name || '').split('').reduce((a, ch) => a + ch.charCodeAt(0), 0);
          return { v, sort: Math.sin(state.shuffleSeed * 17.31 + charSum * 0.13 + (idx + 1) * 31.7) };
        })
        .sort((a, b) => a.sort - b.sort)
        .map(({ v }) => v);

    const event = EVENT_LIB.getEvent(categoryEventId(c));
    const isSingle = event.mode === 'SINGLE';
    const maxScore = event.maxTotal || 100;
    const baseScores = isSingle
      ? [48.6, 46.8, 44.5, 42.4, 40.2, 38.5, 36.0, 34.2]
      : [97.4, 94.2, 90.5, 87.8, 84.6, 81.2, 78.6, 75.5];

    return ordered.map((team, idx) => {
      const total = state.shuffleSeed === 1 && typeof team.total === 'number'
        ? Math.min(maxScore, team.total)
        : (idx < baseScores.length ? baseScores[idx] : Math.max(20, maxScore * 0.65 - idx * 1.5));
      const p1 = !isSingle
        ? (state.shuffleSeed === 1 && typeof team.p1 === 'number' ? team.p1 : Math.round((total * 0.3) * 10) / 10)
        : 0;
      const p2 = !isSingle
        ? (state.shuffleSeed === 1 && typeof team.p2 === 'number' ? team.p2 : Math.round((total - p1) * 10) / 10)
        : 0;

      return {
        team: {
          number: team.number || `0${idx + 1}`,
          name: team.name,
          section: team.section || 'A',
          college: team.college || 'Demo Engineering Institute',
          abstract_title: team.abstract_title || `${team.name} Prototype`,
          members: team.members && team.members.length ? team.members : [{ name: 'Demo Lead', is_lead: true }]
        },
        total: Math.round(total * 10) / 10,
        p1,
        p2,
        judges: 3
      };
    }).sort((a, b) => b.total - a.total);
  }

  function computeStandings(evals) {
    const byEvent = { EMBEDDATHON: [], PROJECT_EXPO: [], PAPER: [] };
    const eventTeams = {
      EMBEDDATHON: typeof TEAMS_DATA !== 'undefined' ? TEAMS_DATA : [],
      PROJECT_EXPO: typeof PROJECT_EXPO_TEAMS !== 'undefined' ? PROJECT_EXPO_TEAMS : [],
      PAPER: typeof PAPER_TEAMS !== 'undefined' ? PAPER_TEAMS : []
    };

    Object.keys(byEvent).forEach((evId) => {
      const ev = EVENT_LIB.getEvent(evId);
      const isDual = ev.mode !== 'SINGLE';
      byEvent[evId] = (eventTeams[evId] || []).map((t) => {
        const prefix = evId === 'EMBEDDATHON' ? '' : `${evId}:`;
        const matches = (Array.isArray(evals) ? evals : []).filter((e) => {
          const idMatch = String(e.teamId || e.team || '') === `${prefix}${t.number}` || String(e.teamNumber || '') === String(t.number);
          const evMatch = (e.eventId || 'EMBEDDATHON') === evId;
          return idMatch && evMatch;
        });

        let total = 0, p1 = 0, p2 = 0;
        if (matches.length) {
          if (isDual) {
            const p1s = matches.filter((m) => m.phase === 'PHASE1' || m.phase === '1').map((m) => Number(m.score || m.total || 0));
            const p2s = matches.filter((m) => m.phase === 'PHASE2' || m.phase === '2').map((m) => Number(m.score || m.total || 0));
            p1 = p1s.length ? p1s.reduce((a, b) => a + b, 0) / p1s.length : 0;
            p2 = p2s.length ? p2s.reduce((a, b) => a + b, 0) / p2s.length : 0;
            total = p1 + p2;
          } else {
            total = matches.reduce((a, m) => a + Number(m.score || m.total || 0), 0) / matches.length;
          }
        }
        return {
          team: {
            ...t,
            members: t.members && t.members.length ? t.members : [{ name: t.lead || 'Team Lead', is_lead: true }]
          },
          total: Math.round(total * 10) / 10,
          p1: Math.round(p1 * 10) / 10,
          p2: Math.round(p2 * 10) / 10,
          judges: matches.length
        };
      }).sort((a, b) => b.total - a.total);
    });

    return byEvent;
  }

  function rowsForCategory(cat) {
    if (state.isMockMode) {
      return generateMockStandings(cat);
    }
    const all = state.eventRows[categoryEventId(cat)] || [];
    if (cat === 'A' || cat === 'B' || cat === 'HARDWARE' || cat === 'SOFTWARE') {
      return all.filter((r) => String(r.team.section || '').toUpperCase() === cat);
    }
    return all;
  }

  const pool = () => state.locked;

  function applyLive(rows, forceLock = false) {
    state.live = rows;
    if (forceLock || state.step === STEP_WELCOME || !state.locked.length) {
      state.locked = rows;
      state.pending = false;
      state.hasScores = state.isMockMode || rows.some((r) => r.judges > 0);
      render();
    } else {
      renderModal();
    }
  }

  async function syncData(force = false) {
    if (state.isMockMode) {
      if (force) {
        applyLive(rowsForCategory(state.category), true);
      }
      if (el.txtStageDataBadge) el.txtStageDataBadge.textContent = 'MOCK DEMO MODE';
      return;
    }

    try {
      const res = await fetch('/api/evaluations', { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const evals = await res.json();
      const checksum = JSON.stringify(evals);
      if (!force && checksum === state.checksum) return;
      state.checksum = checksum;
      state.eventRows = computeStandings(evals);
      state.maxTotal = categoryMax(state.category);
      applyLive(rowsForCategory(state.category), force);
      if (el.txtStageDataBadge) el.txtStageDataBadge.textContent = 'LIVE SYNC ACTIVE';
    } catch (e) {
      console.warn('Live sync fallback:', e);
    }
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
    state.auto.hold = step > STEP_WELCOME && step < STEP_PODIUM;
    audio.whoosh(step >= 3);
    if (step === STEP_WELCOME) {
      state.locked = state.live;
      state.pending = false;
      state.hasScores = state.isMockMode || state.locked.some((r) => r.judges > 0);
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

  function prev() {
    if (state.step > STEP_WELCOME) setStep(state.step - 1);
  }

  window.advanceReveal = next;

  // =============================================================
  // Stage Rendering (Exact reveal.js CSS & Animation Architecture)
  // =============================================================
  function render() {
    if (!el.stage) return;
    el.stage.scrollTop = 0;
    if (el.prev) el.prev.disabled = state.step === STEP_WELCOME;
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
    if (el.indicator) el.indicator.textContent = 'Stage ready · Rehearsal';
    if (el.nextLabel) el.nextLabel.textContent = 'Start the reveal ▶';

    el.stage.innerHTML = `
      <section class="rv-welcome">
        <div class="rv-welcome-card">
          <div class="rv-stripe" aria-hidden="true">
            <span style="--c:#d62828"></span><span style="--c:#f77f00"></span>
            <span style="--c:#fcbf49"></span><span style="--c:#7f1d1d"></span>
          </div>
          <div class="rv-welcome-body">
            <div class="rv-welcome-logo">
              <img src="assets/embers_logo.png" alt="EMBERS '26" onerror="this.style.display='none'">
            </div>
            <p class="rv-welcome-kicker">P.A. College of Engineering · Dept. of CSE</p>
            <h1 class="rv-welcome-title">EMBEDTHON <span>'26</span></h1>
            <p class="rv-welcome-sub">&amp; EMBERS '26 · Rehearsal Results Reveal</p>
            <div class="rv-welcome-pill">
              <span class="k-shape k-shape--triangle" aria-hidden="true"></span>
              ${esc(CATEGORY_TITLES[state.category])}
            </div>
            <p class="rv-welcome-status ${state.isMockMode ? 'is-warn' : 'is-ok'}">
              ${state.isMockMode
                ? '🧪 Fake demo data loaded · safe for projector & audio rehearsal'
                : 'Live evaluation scores loaded · results locked for reveal'}
            </p>
            <div class="rv-welcome-shapes">${shapeRow()}</div>
            <p class="rv-welcome-hint">
              <kbd>Space</kbd> / <kbd>→</kbd> begin · <kbd>1</kbd>–<kbd>3</kbd> jump ·
              <kbd>S</kbd> shuffle · <kbd>A</kbd> auto-advance · <kbd>F</kbd> fullscreen · <kbd>M</kbd> mute
            </p>
          </div>
        </div>
      </section>`;
    state.auto.hold = false;
    scheduleAuto();
  }

  function suspenseStyleFor(rank) {
    if (state.style && state.style !== 'mix') return state.style;
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
    const members = (row.team.members || []).map((m) => `
      <span class="rv-player ${m.is_lead ? 'is-lead' : ''}">
        ${m.is_lead ? '<span class="rv-player-star">★</span>' : ''}${esc(m.name)}
      </span>`).join('');

    const show = (v) => (state.hasScores ? v.toFixed(1) : '—');
    const isSingle = EVENT_LIB.getEvent(categoryEventId(state.category)).mode === 'SINGLE';
    const note = state.isMockMode ? '<p class="rv-note">🧪 Simulated rehearsal data · not official marks</p>' : '';

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
            <span class="rv-slot-psych" aria-hidden="true">PSYCH!</span>
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
                <span class="rv-sec-tag">${esc(row.team.section)}</span>
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
                ${isSingle
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
    const suspenseMs = rank.place === 2 ? 3500 : 3200;

    state.auto.hold = true;
    if (el.indicator) el.indicator.textContent = `${rank.label} · drumroll — press Space to reveal`;
    if (el.nextLabel) el.nextLabel.textContent = 'Reveal now ▶';
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

      if (el.indicator) el.indicator.textContent = `${rank.label} · revealed`;
      if (el.nextLabel) el.nextLabel.textContent = rank.next + ' ▶';
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
    const mode = suspenseStyleFor(rank);
    if (mode === 'slot') {
      runSlot(act, row, reveal, () => slotCancelled);
    } else if (mode === 'elimination') {
      runElimination(act, row, reveal, () => slotCancelled);
    } else if (mode === 'decrypt') {
      runDecrypt(act, row, reveal, () => slotCancelled);
    } else if (mode === 'stamp') {
      runStamp(act, row, reveal, () => slotCancelled);
    } else {
      later(reveal, suspenseMs);
    }
  }

  function runElimination(act, row, reveal, isCancelled) {
    const grid = act.querySelector('#elimGrid');
    const tag = act.querySelector('#elimTag');
    if (!grid) { later(reveal, 3200); return; }

    const allTeams = pool().map((r) => r.team);
    const others = allTeams.filter((t) => String(t.number) !== String(row.team.number));
    for (let i = others.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [others[i], others[j]] = [others[j], others[i]];
    }
    const chosen = [row.team, ...others.slice(0, 15)];
    for (let i = chosen.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [chosen[i], chosen[j]] = [chosen[j], chosen[i]];
    }

    grid.innerHTML = chosen.map((t) =>
      `<span class="rv-tile" data-no="${esc(t.number)}">${esc(t.name)}</span>`
    ).join('');

    const dropOrder = others.slice(0, 15);
    const decoy = dropOrder.pop();
    const gap = Math.max(110, Math.min(260, 2600 / Math.max(1, dropOrder.length)));

    dropOrder.forEach((t, k) => later(() => {
      if (isCancelled()) return;
      const tile = grid.querySelector(`[data-no="${CSS.escape(String(t.number))}"]`);
      if (tile) tile.classList.add('is-out');
      audio.tick(2100 - k * 35);
    }, 350 + k * gap));

    const finalTwoAt = 350 + dropOrder.length * gap + 220;
    later(() => {
      if (isCancelled()) return;
      const winTile = grid.querySelector(`[data-no="${CSS.escape(String(row.team.number))}"]`);
      const decoyTile = decoy ? grid.querySelector(`[data-no="${CSS.escape(String(decoy.number))}"]`) : null;
      if (winTile) winTile.classList.add('is-finalist');
      if (decoyTile) decoyTile.classList.add('is-finalist');
      if (tag) tag.textContent = decoy ? `FINAL 2 STANDING · ${row.team.name} vs ${decoy.name}…` : 'FINAL SURVIVOR!';
      audio.stopDrumroll();
      audio.fakeBuild();
    }, finalTwoAt);

    later(() => {
      if (isCancelled()) return;
      const winTile = grid.querySelector(`[data-no="${CSS.escape(String(row.team.number))}"]`);
      const decoyTile = decoy ? grid.querySelector(`[data-no="${CSS.escape(String(decoy.number))}"]`) : null;
      if (decoyTile) {
        decoyTile.classList.remove('is-finalist');
        decoyTile.classList.add('is-decoy-out');
        audio.psychFart();
      }
      if (winTile) {
        winTile.classList.remove('is-finalist');
        winTile.classList.add('is-winner');
      }
      if (tag) tag.textContent = `SURVIVOR · ${row.team.name}!`;
      audio.winnerBell();
      later(() => { if (!isCancelled()) reveal(); }, 750);
    }, finalTwoAt + 1450);
  }

  function runDecrypt(act, row, reveal, isCancelled) {
    const reel = act.querySelector('#decryptText');
    const tag = act.querySelector('#decryptTag');
    if (!reel) { later(reveal, 3000); return; }

    const candidates = pool().map((r) => r.team.name).filter((n) => n !== row.team.name);
    const decoyName = (candidates[Math.floor(Math.random() * candidates.length)] || 'SYSTEM OVERRIDE').toUpperCase();
    const realName = row.team.name.toUpperCase();
    const glyphs = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#@$%&*';

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

    scrambleTo(decoyName, 1500, () => {
      if (isCancelled()) return;
      reel.classList.add('is-decoy');
      if (tag) tag.textContent = `LOCKED: ${decoyName}… WAIT A SECOND`;
      audio.tick(750);
      later(() => {
        if (isCancelled()) return;
        reel.classList.remove('is-decoy');
        if (tag) tag.textContent = 'CORRUPTED PACKET · RE-DECRYPTING…';
        audio.psychFart();
        scrambleTo(realName, 1400, () => {
          if (isCancelled()) return;
          if (tag) tag.textContent = `VERIFIED · ${row.team.name}`;
          audio.winnerBell();
          later(() => { if (!isCancelled()) reveal(); }, 550);
        });
      }, 900);
    });
  }

  function runStamp(act, row, reveal, isCancelled) {
    const counter = act.querySelector('#stampCount');
    if (!counter) { later(reveal, 2700); return; }
    ['3', '2', '1'].forEach((n, k) => later(() => {
      if (isCancelled()) return;
      counter.textContent = n;
      audio.tick(1800 + k * 300);
    }, k * 800));

    if (row && act.classList.contains('rv-act--champion')) {
      const candidates = pool().map((r) => r.team.name).filter((n) => n !== row.team.name);
      const decoy = candidates[Math.floor(Math.random() * candidates.length)] || 'OVERRIDE';
      later(() => {
        if (isCancelled()) return;
        counter.classList.add('is-decoy');
        counter.textContent = `${decoy}?`;
        audio.stopDrumroll();
        audio.fakeBuild();
      }, 2450);
      later(() => {
        if (isCancelled()) return;
        counter.textContent = 'NOPE! PSYCH!';
        audio.psychFart();
      }, 3650);
      later(() => {
        if (isCancelled()) return;
        audio.winnerBell();
        reveal();
      }, 4500);
    } else {
      later(() => { if (!isCancelled()) reveal(); }, 2450);
    }
  }

  function runSlot(act, row, reveal, isCancelled) {
    const reel = act.querySelector('#slotReel');
    const tag = act.querySelector('#slotTag');
    const machine = act.querySelector('#slotMachine');
    if (!reel || !tag || !machine) {
      later(reveal, 3200);
      return;
    }

    const names = pool().map((r) => r.team.name).filter((n) => n !== row.team.name);
    const candidates = pool().filter((r) => r.team.name !== row.team.name);
    const poolForFake = candidates.slice(Math.max(0, Math.floor(candidates.length * 0.55)));
    const decoy = (poolForFake[Math.floor(Math.random() * poolForFake.length)] || candidates[0] || {}).team?.name || names[0] || '—';
    const spinMs = 3000;
    const started = performance.now();
    let finished = false;

    const finish = () => {
      if (finished || isCancelled()) return;
      finished = true;
      reveal();
    };

    const step = () => {
      if (isCancelled()) return;
      const p = Math.min(1, (performance.now() - started) / spinMs);
      reel.textContent = names[Math.floor(Math.random() * names.length)] || row.team.name;

      if (p < 1) {
        later(step, 55 + 420 * Math.pow(p, 2.6));
        return;
      }

      reel.classList.remove('is-spinning');
      reel.textContent = decoy;
      reel.classList.add('is-decoy');
      machine.classList.add('is-decoy');
      tag.textContent = 'And the winner is…';
      audio.tick(900);
      audio.stopSlotSpin();

      later(() => {
        if (isCancelled()) return;
        audio.stopDrumroll();
        audio.fakeBuild();
      }, 500);
      later(() => {
        if (isCancelled()) return;
        reel.classList.remove('is-decoy');
        reel.classList.add('is-fake');
        machine.classList.remove('is-decoy');
        machine.classList.add('is-fake');
        tag.textContent = 'PSYCH! · Just kidding…';
        audio.psychFart();

        later(() => {
          if (isCancelled()) return;
          reel.classList.remove('is-fake');
          reel.classList.add('is-real');
          reel.textContent = row.team.name;
          machine.classList.remove('is-fake');
          machine.classList.add('is-real');
          tag.textContent = `WINNER · ${row.team.name}`;
          audio.winnerBell();
          later(finish, 650);
        }, 1000);
      }, 2000);
    };

    reel.classList.add('is-spinning');
    audio.slotSpin(3.1);
    step();
    later(finish, 9000);
  }

  function renderEmptyRank(rank) {
    if (el.indicator) el.indicator.textContent = `${rank.label} · no entries`;
    if (el.nextLabel) el.nextLabel.textContent = rank.next + ' ▶';
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
  // Final Podium (Step 4)
  // =============================================================
  function renderPodium() {
    if (el.indicator) el.indicator.textContent = 'Ceremony complete · Final podium';
    if (el.nextLabel) el.nextLabel.textContent = 'Replay ceremony 🔄';

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
            <span class="rv-podium-team">TEAM ${esc(row.team.number)} · ${esc(row.team.section)}</span>
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
        <p class="rv-final-kicker">${state.isMockMode ? '🧪 Rehearsal Preview · Fake Demo Data' : 'Live Evaluation Preview'}</p>
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
  // Standings Modal
  // =============================================================
  function renderModal() {
    if (!el.modalBody) return;
    const f = el.modalFilter ? el.modalFilter.value : 'ALL';
    const rows = state.locked.filter((r) => f === 'ALL' || String(r.team.section || '').toUpperCase() === f);
    const show = (v) => (state.hasScores ? v.toFixed(1) : '—');
    const event = EVENT_LIB.getEvent(categoryEventId(state.category));
    const isSingle = event.mode === 'SINGLE';

    const modalSub = $('standingsModalSub');
    if (modalSub) {
      const modeTag = state.isMockMode ? '🧪 FAKE DEMO DATA · ' : '';
      modalSub.textContent = modeTag + (isSingle
        ? `${event.icon || ''} ${event.label} · Jury average out of ${event.maxTotal} marks`
        : 'Phase 1 Mentoring (30%) + Phase 2 Final Expo (70%) = Total Score (100%)');
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
        <td class="rv-table-num">${esc(r.team.number)}</td>
        <td>
          <span class="rv-table-team">${esc(r.team.name)}</span>
          <span class="rv-table-sub">${esc(r.team.abstract_title || '')}</span>
        </td>
        <td class="is-center"><span class="rv-table-sec">${esc(r.team.section)}</span></td>
        ${cells}
      </tr>`;
    }).join('');
  }

  function openModal() {
    clearAutoTimer();
    resetConfetti();
    if (!el.modal) return;
    el.modal.classList.add('is-open');
    el.modal.setAttribute('aria-hidden', 'false');
    renderModal();
  }

  function closeModal() {
    if (!el.modal) return;
    el.modal.classList.remove('is-open');
    el.modal.setAttribute('aria-hidden', 'true');
    if (state.auto.seconds) scheduleAuto();
  }

  // =============================================================
  // Controls & Event Bindings
  // =============================================================
  function toggleFullscreen() {
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    } else {
      document.documentElement.requestFullscreen().catch((e) => console.warn('Fullscreen error:', e));
    }
  }

  function toggleAudio() {
    state.muted = !state.muted;
    audio.setMuted(state.muted);
    if (state.muted) {
      audio.stopDrumroll();
      audio.stopSlotSpin();
    } else {
      audio.get();
    }
    if (el.audioIcon) el.audioIcon.textContent = state.muted ? '🔇' : '🔊';
    if (el.audioText) el.audioText.textContent = state.muted ? 'MUTED' : 'SOUND ON';
  }

  function updateBannerForCategory() {
    const bannerEvent = $('revealBannerEvent');
    const bannerSub = $('revealBannerSub');
    if (!bannerEvent || !bannerSub) return;
    if (state.category === 'PAPER') {
      bannerEvent.textContent = "EMBERS '26 · TRACK 3";
      bannerEvent.style.color = '#818cf8';
      bannerSub.textContent = 'Technical Paper Presentation Rehearsal (Multipurpose Hall)';
    } else if (state.category === 'PROJECT_EXPO' || state.category === 'HARDWARE' || state.category === 'SOFTWARE') {
      bannerEvent.textContent = "EMBERS '26 · TRACK 2";
      bannerEvent.style.color = '#fbbf44';
      bannerSub.textContent = 'National Project Expo Rehearsal (Edusat Hall)';
    } else if (['EMBEDDATHON', 'EMBEDTHON', 'A', 'B'].includes(state.category)) {
      bannerEvent.textContent = "EMBEDTHON '26 · TRACK 1";
      bannerEvent.style.color = '#ea580c';
      bannerSub.textContent = '24-Hour Hackathon Rehearsal (Labs 1 & 2)';
    } else {
      bannerEvent.textContent = "EMBERS '26";
      bannerEvent.style.color = '#ff9f43';
      bannerSub.textContent = 'Rehearsal & Projector Test Simulator';
    }
  }

  function bind() {
    if (el.next) el.next.addEventListener('click', () => { next(); el.next.blur(); });
    if (el.prev) el.prev.addEventListener('click', () => { prev(); el.prev.blur(); });

    if (el.confetti) {
      el.confetti.addEventListener('click', () => {
        audio.tick(1800);
        launchConfetti('standard');
        el.confetti.blur();
      });
    }

    if (el.audioBtn) el.audioBtn.addEventListener('click', toggleAudio);
    if (el.psychBtn) {
      el.psychBtn.addEventListener('click', () => {
        state.psychEnabled = !state.psychEnabled;
        el.psychBtn.setAttribute('aria-pressed', state.psychEnabled ? 'true' : 'false');
        if (el.psychIcon) el.psychIcon.textContent = state.psychEnabled ? '⚡' : '⏸️';
        if (el.psychText) el.psychText.textContent = state.psychEnabled ? 'PSYCH ON' : 'PSYCH OFF';
      });
    }
    if (el.projectorBtn) {
      el.projectorBtn.addEventListener('click', () => {
        state.projectorMode = !state.projectorMode;
        document.body.classList.toggle('is-projector', state.projectorMode);
        el.projectorBtn.setAttribute('aria-pressed', state.projectorMode ? 'true' : 'false');
        el.projectorBtn.classList.toggle('rv-tool-btn--solid', state.projectorMode);
      });
    }
    if (el.fsBtn) el.fsBtn.addEventListener('click', toggleFullscreen);
    if (el.autoSelect) {
      el.autoSelect.addEventListener('change', (e) => setAutoSeconds(e.target.value));
    }

    document.addEventListener('fullscreenchange', () => {
      const isFs = !!document.fullscreenElement;
      document.body.classList.toggle('is-fullscreen', isFs);
      if (el.fsIcon) el.fsIcon.textContent = isFs ? '✕' : '⛶';
    });

    if (el.category) {
      el.category.addEventListener('change', (e) => {
        state.category = e.target.value;
        state.maxTotal = categoryMax(state.category);
        updateBannerForCategory();
        applyLive(rowsForCategory(state.category), true);
        setStep(STEP_WELCOME);
      });
    }

    if (el.openModal) el.openModal.addEventListener('click', openModal);
    if (el.closeModal) el.closeModal.addEventListener('click', closeModal);
    if (el.modalFilter) el.modalFilter.addEventListener('change', renderModal);
    if (el.modal) el.modal.addEventListener('click', (e) => { if (e.target === el.modal) closeModal(); });

    // Rehearsal Test Deck Controls
    if (el.btnToggleDataset) {
      el.btnToggleDataset.addEventListener('click', () => {
        state.isMockMode = !state.isMockMode;
        if (el.txtDatasetSource) {
          el.txtDatasetSource.textContent = state.isMockMode ? '✨ Mock Demo Scores' : '⚡ Live Scores';
        }
        el.btnToggleDataset.classList.toggle('rv-test-btn--active', state.isMockMode);
        if (el.txtStageDataBadge) {
          el.txtStageDataBadge.textContent = state.isMockMode ? 'MOCK DEMO MODE' : 'LIVE SYNC ACTIVE';
        }
        if (state.isMockMode) {
          applyLive(rowsForCategory(state.category), true);
        } else {
          syncData(true);
        }
      });
    }

    if (el.btnShuffleDemo) {
      el.btnShuffleDemo.addEventListener('click', () => {
        state.shuffleSeed += 1.7;
        state.isMockMode = true;
        if (el.btnToggleDataset) el.btnToggleDataset.classList.add('rv-test-btn--active');
        if (el.txtDatasetSource) el.txtDatasetSource.textContent = '✨ Mock Demo Scores';
        if (el.txtStageDataBadge) el.txtStageDataBadge.textContent = 'MOCK DEMO MODE';
        applyLive(rowsForCategory(state.category), true);
        audio.tick(1400);
      });
    }

    if (el.testStyleSelect) {
      el.testStyleSelect.addEventListener('change', (e) => {
        state.style = e.target.value || 'mix';
        if (state.step >= 1 && state.step <= 3) setStep(state.step);
      });
    }

    document.querySelectorAll('.btn-teleport-step').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const step = parseInt(e.currentTarget.getAttribute('data-step'), 10);
        if (!isNaN(step)) setStep(step);
      });
    });

    if (el.btnTestDrumroll) el.btnTestDrumroll.addEventListener('click', () => audio.drumroll(2.5));
    if (el.btnTestFanfare) el.btnTestFanfare.addEventListener('click', () => audio.runnerUpFanfare());
    if (el.btnTestConfetti) el.btnTestConfetti.addEventListener('click', () => launchConfetti('mega'));
    if (el.btnTestApplause) el.btnTestApplause.addEventListener('click', () => audio.applause(0.75));

    if (el.btnToggleDeckVisibility) {
      el.btnToggleDeckVisibility.addEventListener('click', () => {
        if (!el.testDeck) return;
        el.testDeck.classList.toggle('is-minimized');
        const isMin = el.testDeck.classList.contains('is-minimized');
        if (el.txtToggleDeck) el.txtToggleDeck.textContent = isMin ? 'Show Deck ▼' : 'Hide Deck ▲';
      });
    }

    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        if (el.modal && el.modal.classList.contains('is-open')) closeModal();
        return;
      }
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes(e.target.tagName)) return;
      if (el.modal && el.modal.classList.contains('is-open')) return;

      const key = e.key.toLowerCase();
      if (e.key === ' ' || e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === 'Enter') {
        e.preventDefault();
        next();
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        prev();
      } else if (e.key === '0') {
        e.preventDefault();
        setStep(STEP_WELCOME);
      } else if (/^[1-3]$/.test(e.key)) {
        e.preventDefault();
        setStep(Number(e.key));
      } else if (e.key === '4' || key === 'p') {
        e.preventDefault();
        setStep(STEP_PODIUM);
      } else if (key === 'a') {
        e.preventDefault();
        toggleAuto();
      } else if (key === 's') {
        e.preventDefault();
        if (el.btnShuffleDemo) el.btnShuffleDemo.click();
      } else if (key === 't') {
        e.preventDefault();
        if (el.btnToggleDeckVisibility) el.btnToggleDeckVisibility.click();
      } else if (key === 'c') {
        e.preventDefault();
        launchConfetti('mega');
      } else if (key === 'm') {
        e.preventDefault();
        toggleAudio();
      } else if (key === 'f') {
        e.preventDefault();
        toggleFullscreen();
      } else if (key === 'r') {
        e.preventDefault();
        setStep(STEP_WELCOME);
      }
    });
  }

  function seedEmbers() {
    if (!el.emberField) return;
    const frag = document.createDocumentFragment();
    for (let i = 0; i < 24; i++) {
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

  function init() {
    document.body.classList.add('ceremony-brand');
    seedEmbers();
    void audio.preload();
    bind();

    state.isMockMode = true;
    state.maxTotal = categoryMax(state.category);
    updateBannerForCategory();
    applyLive(rowsForCategory(state.category), true);
    setStep(STEP_WELCOME);

    setInterval(() => syncData(false), POLL_MS);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
