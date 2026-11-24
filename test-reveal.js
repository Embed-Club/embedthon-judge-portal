// EMBERS '26 · Rehearsal & Test Reveal Stage Engine (Accessible only by direct URL)
// Supports simulated demo standings, live evaluation sync, step teleportation,
// winner shuffling with real team lineups from teams.js, and independent SFX testing.

(function () {
  'use strict';

  const POLL_MS = 4000;
  const EVENT_LIB = window.EMBEDTHON_RUBRICS || {
    EVENTS: {},
    getEvent: function (id) {
      if (id === 'PAPER') return { id: 'PAPER', label: 'Paper Presentation', maxTotal: 100, mode: 'SINGLE' };
      if (id === 'PROJECT_EXPO') return { id: 'PROJECT_EXPO', label: 'Project Expo', maxTotal: 100, mode: 'SINGLE' };
      return { id: 'EMBEDDATHON', label: 'Embeddathon', maxTotal: 100, mode: 'DUAL_PHASE' };
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
    // Test Deck Elements
    testDeck: $('testControlDeck'),
    btnToggleDataset: $('btnToggleDataset'),
    txtDatasetSource: $('txtDatasetSource'),
    btnShuffleDemo: $('btnShuffleDemo'),
    txtStageDataBadge: $('txtStageDataBadge'),
    btnToggleDeckVisibility: $('btnToggleDeckVisibility'),
    txtToggleDeck: $('txtToggleDeck'),
    btnTestDrumroll: $('btnTestDrumroll'),
    btnTestFanfare: $('btnTestFanfare'),
    btnTestConfetti: $('btnTestConfetti'),
    btnTestApplause: $('btnTestApplause')
  };

  const state = {
    isMockMode: true, // Default to simulated mock demo data for rehearsals
    shuffleSeed: 1,
    category: 'OVERALL',
    step: STEP_WELCOME,
    gate: null,
    live: [],
    locked: [],
    eventRows: {},
    maxTotal: 100,
    pending: false,
    hasScores: true,
    muted: false,
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
  // Sound Engine
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
    buffers: {},
    loading: {},
    drumrollNode: null,
    slotNode: null,
    noise: null,
    muted: false,
    unlocked: false,

    get() {
      if (this.muted) return null;
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return null;
      if (!this.ctx) {
        try {
          this.ctx = new AudioCtx();
        } catch (e) {
          return null;
        }
      }
      if (this.ctx.state === 'suspended' && this.unlocked) {
        this.ctx.resume().catch(() => {});
      }
      return this.ctx;
    },

    unlock() {
      this.unlocked = true;
      const ctx = this.get();
      if (ctx && ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }
    },

    async preload() {
      const ctx = this.get();
      if (!ctx) return;
      Object.entries(SFX_URLS).forEach(([key, url]) => {
        if (this.buffers[key] || this.loading[key]) return;
        this.loading[key] = fetch(url)
          .then((r) => (r.ok ? r.arrayBuffer() : null))
          .then((ab) => (ab ? ctx.decodeAudioData(ab) : null))
          .then((buf) => { if (buf) this.buffers[key] = buf; })
          .catch(() => {});
      });
    },

    playSample(name, vol = 1, opts = {}) {
      if (this.muted) return null;
      const ctx = this.get();
      if (!ctx) return null;
      const buf = this.buffers[name];
      if (!buf) return null;
      try {
        const src = ctx.createBufferSource();
        src.buffer = buf;
        const gain = ctx.createGain();
        gain.gain.value = vol;
        if (opts.rate) src.playbackRate.value = opts.rate;
        src.connect(gain).connect(ctx.destination);
        src.start(0, opts.offset || 0);
        return { src, gain };
      } catch (e) {
        return null;
      }
    },

    setMuted(m) {
      this.muted = !!m;
      if (this.muted) {
        this.stopDrumroll();
        this.stopSlotSpin();
      }
    },

    tick(freq = 1200) {
      if (this.muted) return;
      const ctx = this.get();
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.05);
      osc.connect(gain).connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.05);
    },

    drumroll(dur) {
      this.stopDrumroll();
      const handle = this.playSample('drumroll566', 0.65, { duration: dur });
      if (handle) {
        this.drumrollNode = handle;
        return;
      }
      this.tick(150);
    },

    stopDrumroll() {
      if (this.drumrollNode) {
        try { this.drumrollNode.src.stop(); } catch (e) {}
        this.drumrollNode = null;
      }
    },

    fanfare(place) {
      this.stopDrumroll();
      if (place === 1) {
        this.playSample('winnerBell', 0.85);
        this.playSample('applause', 0.7);
        this.playSample('podiumBrass', 0.9);
      } else {
        this.playSample('fanfareRunnerUp', 0.8);
        this.playSample('impact577', 0.6);
      }
    },

    podiumFanfare() {
      this.playSample('podiumBrass', 0.9);
      this.playSample('applause', 0.75);
    },

    fakeoutPsych() {
      this.playSample('psychFart', 0.9);
    },

    startSlotSpin() {
      this.stopSlotSpin();
      const handle = this.playSample('slotPayout', 0.7);
      if (handle) this.slotNode = handle;
    },

    stopSlotSpin() {
      if (this.slotNode) {
        try { this.slotNode.src.stop(); } catch (e) {}
        this.slotNode = null;
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
    if (type === 'mega' || type === 'big') {
      confetti({ particleCount: 120, spread: 100, origin: { y: 0.6 }, colors });
    } else {
      confetti({ particleCount: 70, spread: 60, origin: { y: 0.7 }, colors });
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
        lead: 'Aryan "Neo" Sharma',
        dept: 'Robotics & Artificial Intelligence',
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
        lead: 'Elena Vance',
        dept: 'Computer Science & Engineering',
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
        lead: 'Marcus Vance',
        dept: 'Electronics & Communication Engineering',
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
        lead: 'Zara Chen',
        dept: 'Electrical & Electronics Engineering',
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
        lead: 'Rohan Verma',
        dept: 'Mechatronics & Automation',
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
        lead: 'David Miller',
        dept: 'Information Science & Engineering',
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
        lead: 'Samantha Ray',
        dept: 'Aerospace & Embedded Systems',
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
        lead: 'Priya Sharma',
        dept: 'Computer Engineering',
        section: 'B',
        p1: 22.8,
        p2: 52.7,
        total: 75.5
      },
      {
        number: '02',
        name: 'TerraGuard IoT 🌍',
        abstract_title: 'Long-Range Forest Fire Early Warning Mesh Sensor Network',
        college: 'Terra Nova University, Hassan',
        lead: 'Lucas Scott',
        dept: 'Civil & Environmental Technology',
        section: 'A',
        p1: 21.6,
        p2: 50.4,
        total: 72.0
      },
      {
        number: '18',
        name: 'OmniShield Security 🛡️',
        abstract_title: 'Hardware-Enforced SCADA Air-Gap Anomaly Prevention Device',
        college: 'Neo Tokyo Institute of Cybernetics',
        lead: 'Kenji Sato',
        dept: 'Cyber Security & Forensics',
        section: 'B',
        p1: 20.5,
        p2: 48.0,
        total: 68.5
      },
      {
        number: '11',
        name: 'BioSensor Matrix 🧬',
        abstract_title: 'Wearable Real-Time Continuous Blood Lactate & Glucose Monitor',
        college: 'MedTech Advanced Institute, Manipal',
        lead: 'Ananya Deshmukh',
        dept: 'Biomedical Engineering',
        section: 'A',
        p1: 19.8,
        p2: 46.2,
        total: 66.0
      },
      {
        number: '24',
        name: 'Vortex Turbines 🌀',
        abstract_title: 'Bladeless Micro-Wind Energy Harvester with Piezoelectric Arrays',
        college: 'Renewable Power Institute, Kalaburagi',
        lead: 'Tariq Al-Mansoor',
        dept: 'Mechanical Engineering',
        section: 'B',
        p1: 19.0,
        p2: 44.0,
        total: 63.0
      }
    ],
    PROJECT_EXPO: [
      {
        number: 'HW-99',
        name: 'Titan Dynamics 🦾',
        abstract_title: 'Omni-Directional Industrial Exoskeleton with Neural Force Feedback',
        college: 'Titan Polytechnic Institute, Bengaluru',
        lead: 'Dr. Elena Rostova',
        dept: 'Mechatronics & Robotics',
        section: 'Hardware',
        total: 98.2
      },
      {
        number: 'SW-88',
        name: 'Synthetix Studio 🔮',
        abstract_title: 'Generative Holographic CAD Workbench with Real-Time Hand Tracking',
        college: 'Horizon State University, Mysuru',
        lead: 'Leo Sterling',
        dept: 'Computer Science & Design',
        section: 'Software',
        total: 95.4
      },
      {
        number: 'HW-77',
        name: 'HyperDrive Labs 🚄',
        abstract_title: 'Contactless MagLev Urban Rapid Transit Capsule Prototype',
        college: 'Silicon Valley Technical Campus',
        lead: 'Zainab Al-Hassan',
        dept: 'Automotive & Control Systems',
        section: 'Hardware',
        total: 91.8
      },
      {
        number: 'SW-66',
        name: 'ShieldOS CyberSec 🛡️',
        abstract_title: 'Zero-Trust Microkernel Sandboxing for Critical Infrastructure Firmware',
        college: 'CyberCore Research University, Mangaluru',
        lead: 'Natasha Roman',
        dept: 'Cyber Defense Systems',
        section: 'Software',
        total: 88.5
      },
      {
        number: 'HW-55',
        name: 'GreenMatrix BioPower 🌿',
        abstract_title: 'Microbial Fuel Cell Array for Autonomous Wetland Monitoring Sensors',
        college: 'EcoTech Global Institute, Hassan',
        lead: 'Carlos Morales',
        dept: 'Bio-Engineering & Green Tech',
        section: 'Hardware',
        total: 85.0
      },
      {
        number: 'SW-44',
        name: 'MediScan Vision 🩺',
        abstract_title: 'Multi-Modal Federated AI for Microscopic Blood Pathology Diagnosis',
        college: 'Cambridge Health Sciences Institute',
        lead: 'Dr. Sarah Jenkins',
        dept: 'Biomedical Informatics',
        section: 'Software',
        total: 81.5
      },
      {
        number: 'HW-33',
        name: 'AeroGlide Drone 🛩️',
        abstract_title: 'Solar-Assisted High-Altitude Pseudo-Satellite Surveillance Glider',
        college: 'Apex Aeronautical Academy',
        lead: 'Devraj Rao',
        dept: 'Aeronautical Engineering',
        section: 'Hardware',
        total: 78.0
      },
      {
        number: 'SW-22',
        name: 'Algoritmica DeFi 💎',
        abstract_title: 'Formal-Verifiable Decentralized Order Routing Protocol with MEV Immunity',
        college: 'FinTech Polytechnic',
        lead: 'Rachel Green',
        dept: 'Computer Science',
        section: 'Software',
        total: 74.2
      }
    ],
    PAPER: [
      {
        number: 'PP-01',
        name: 'Turing Scholars 📜',
        abstract_title: 'Transformers at the Edge: Ultra-Low-Bit Quantization for Sub-Milliwatt Microcontrollers',
        college: 'International AI Research Institute, Bengaluru',
        lead: 'Prof. Maya Chen',
        dept: 'Advanced Machine Learning',
        section: 'Paper',
        total: 98.6
      },
      {
        number: 'PP-02',
        name: 'CyberPulse Research 🔬',
        abstract_title: 'Formal Verification of Autonomous Flight Neural Controllers Against Adversarial Attacks',
        college: 'Cambridge Cybernetics Laboratory',
        lead: 'Liam O\'Connor',
        dept: 'Autonomous Aerospace Systems',
        section: 'Paper',
        total: 94.8
      },
      {
        number: 'PP-03',
        name: 'BioInformatics Alpha 🧬',
        abstract_title: 'In-Silico Protein-Ligand Affinity Acceleration via Geometric Graph Neural Operators',
        college: 'Stanford Genomic Computing Centre',
        lead: 'Dr. Priya Sengupta',
        dept: 'Computational Biology & AI',
        section: 'Paper',
        total: 91.2
      },
      {
        number: 'PP-04',
        name: 'Quantum Logic Group ⚛️',
        abstract_title: 'Fault-Tolerant Topological Surface Code Optimization for Noisy Intermediate-Scale Quantum Processors',
        college: 'Oxford Quantum Computing Institute',
        lead: 'Dr. Alexander Bohr',
        dept: 'Theoretical & Quantum Physics',
        section: 'Paper',
        total: 87.5
      },
      {
        number: 'PP-05',
        name: 'ZeroTrust Protocol Guild 🌐',
        abstract_title: 'Lattice-Based Post-Quantum Zero-Knowledge Authentication for Ultra-Constrained IoT Nodes',
        college: 'ETH Zurich Cryptography Center',
        lead: 'Karin Lindqvist',
        dept: 'Information Security & Privacy',
        section: 'Paper',
        total: 83.9
      },
      {
        number: 'PP-06',
        name: 'Neural Neuromorphic Team ⚡',
        abstract_title: 'Spike-Timing-Dependent Plasticity Emulation on Memristive Crossbar Networks',
        college: 'Tokyo Institute of Neuromorphic Engineering',
        lead: 'Hiroshi Tanaka',
        dept: 'Nanoelectronics',
        section: 'Paper',
        total: 80.4
      }
    ]
  };

  function generateMockStandings(category) {
    const cat = (category || 'OVERALL').toUpperCase();
    let pool = [];
    if (cat === 'PAPER') {
      pool = [...FAKE_DEMO_DATA.PAPER];
    } else if (cat === 'PROJECT_EXPO' || cat === 'HARDWARE' || cat === 'SOFTWARE') {
      if (cat === 'HARDWARE') {
        pool = FAKE_DEMO_DATA.PROJECT_EXPO.filter(t => t.section === 'Hardware');
      } else if (cat === 'SOFTWARE') {
        pool = FAKE_DEMO_DATA.PROJECT_EXPO.filter(t => t.section === 'Software');
      } else {
        pool = [...FAKE_DEMO_DATA.PROJECT_EXPO];
      }
    } else if (cat === 'A') {
      pool = FAKE_DEMO_DATA.EMBEDDATHON.filter(t => t.section === 'A');
    } else if (cat === 'B') {
      pool = FAKE_DEMO_DATA.EMBEDDATHON.filter(t => t.section === 'B');
    } else {
      pool = [...FAKE_DEMO_DATA.EMBEDDATHON];
    }
    if (!pool.length) return [];

    // Deterministic pseudo-shuffle with seed; seed=1 keeps curated top-3 order, shuffling rotates winners
    const ordered = state.shuffleSeed === 1
      ? pool
      : pool.map((v, idx) => {
          const charSum = (v.name || '').split('').reduce((a, c) => a + c.charCodeAt(0), 0);
          return { v, sort: Math.sin(state.shuffleSeed * 17.31 + charSum * 0.13 + (idx + 1) * 31.7) };
        })
        .sort((a, b) => a.sort - b.sort)
        .map(({ v }) => v);

    const isDual = (cat === 'OVERALL' || cat === 'EMBEDDATHON' || cat === 'A' || cat === 'B');
    const baseScores = [97.8, 94.2, 90.6, 87.1, 84.3, 81.0, 78.4, 75.2, 72.0, 68.5, 65.0, 62.0];

    return ordered.map((team, idx) => {
      const total = state.shuffleSeed === 1 && typeof team.total === 'number'
        ? team.total
        : (idx < baseScores.length ? baseScores[idx] : Math.max(50, 68 - idx * 1.5));
      const p1 = isDual
        ? (state.shuffleSeed === 1 && typeof team.p1 === 'number' ? team.p1 : Math.round((total * 0.3) * 10) / 10)
        : 0;
      const p2 = isDual
        ? (state.shuffleSeed === 1 && typeof team.p2 === 'number' ? team.p2 : Math.round((total - p1) * 10) / 10)
        : 0;

      return {
        team: {
          number: team.number || `0${idx + 1}`,
          name: team.name,
          section: team.section || (idx % 2 === 0 ? 'A' : 'B'),
          lead: team.lead || 'Demo Lead',
          college: team.college || 'Demo Engineering Institute',
          dept: team.dept || 'Engineering Innovation',
          abstract_title: team.abstract_title || `${team.name} Prototype`
        },
        total: Math.round(total * 10) / 10,
        p1,
        p2,
        judges: 3
      };
    }).sort((a, b) => b.total - a.total);
  }

  function categoryEventId(cat) {
    if (cat === 'PROJECT_EXPO' || cat === 'HARDWARE' || cat === 'SOFTWARE') return 'PROJECT_EXPO';
    if (cat === 'PAPER') return 'PAPER';
    return 'EMBEDDATHON';
  }

  function categoryMax(cat) {
    const e = EVENT_LIB.getEvent(categoryEventId(cat));
    return e && e.maxTotal ? e.maxTotal : 100;
  }

  function rowsForCategory(cat) {
    if (state.isMockMode) {
      return generateMockStandings(cat);
    }
    const all = state.eventRows[categoryEventId(cat)] || [];
    if (cat === 'A') return all.filter((r) => r.team.section === 'A');
    if (cat === 'B') return all.filter((r) => r.team.section === 'B');
    return all;
  }

  function renderModal() {
    if (!el.modalBody) return;
    const f = el.modalFilter ? el.modalFilter.value : 'ALL';
    const rows = state.locked.filter((r) => f === 'ALL' || r.team.section === f);
    const show = (v) => (state.hasScores ? v.toFixed(1) : '—');
    const event = EVENT_LIB.getEvent(categoryEventId(state.category));
    const isSingle = event.mode === 'SINGLE';

    const modalSub = $('standingsModalSub');
    if (modalSub) {
      const modeTag = state.isMockMode ? '🧪 SIMULATED DEMO DATA · ' : '';
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

  function applyLive(rows) {
    state.live = rows;
    if (state.step === STEP_WELCOME || !state.locked.length) {
      state.locked = rows;
      state.hasScores = rows.some((r) => r.total > 0);
    }
    renderModal();
    renderStage();
  }

  // =============================================================
  // Live Sync Data
  // =============================================================
  async function syncData() {
    if (state.isMockMode) {
      // In mock mode, don't overwrite with 0-score production evals
      applyLive(rowsForCategory(state.category));
      if (el.txtStageDataBadge) el.txtStageDataBadge.textContent = 'MOCK DEMO MODE';
      return;
    }

    try {
      const res = await fetch('/api/evaluations', { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const checksum = JSON.stringify(data);
      if (checksum === state.checksum) return;
      state.checksum = checksum;

      // Compute live rows
      const embedRows = (typeof TEAMS_DATA !== 'undefined' ? TEAMS_DATA : []).map(t => ({
        team: t,
        total: 0,
        p1: 0,
        p2: 0,
        judges: 0
      }));
      state.eventRows = { EMBEDDATHON: embedRows };
      applyLive(rowsForCategory(state.category));
      if (el.txtStageDataBadge) el.txtStageDataBadge.textContent = 'LIVE SYNC ACTIVE';
    } catch (e) {
      console.warn('Live sync fallback:', e);
    }
  }

  // =============================================================
  // Stage Rendering & Flow
  // =============================================================
  function shapeFor(sh) {
    return `<span class="k-shape k-shape--${sh}" aria-hidden="true"></span>`;
  }

  function shapeRow() {
    return `
      ${shapeFor('triangle')}
      ${shapeFor('diamond')}
      ${shapeFor('circle')}
      ${shapeFor('square')}
    `;
  }

  function slotMachineFakeout(targetRank, targetRow, onComplete) {
    audio.startSlotSpin();
    const candidateTeams = state.locked.slice(0, 10).map(r => r.team.name);
    let count = 0;
    const maxSpins = 14;

    const interval = setInterval(() => {
      count++;
      const randomName = candidateTeams[Math.floor(Math.random() * candidateTeams.length)];
      const nameEl = $('winnerTeamName');
      if (nameEl) nameEl.textContent = randomName;

      if (count >= maxSpins) {
        clearInterval(interval);
        audio.stopSlotSpin();
        audio.fanfare(1);
        if (nameEl) nameEl.textContent = targetRow.team.name;
        launchConfetti('mega');
        if (typeof onComplete === 'function') onComplete();
      }
    }, 90);
  }

  function renderStage() {
    clearTimers();
    const rows = state.locked;
    const rankInfo = RANKS.find(r => r.place === state.step);

    const demoPill = state.isMockMode
      ? `<div class="rv-demo-pill" style="display:inline-flex; align-items:center; gap:6px; background:rgba(234, 88, 12, 0.25); border:1px solid #ea580c; color:#fed7aa; font-size:11px; font-weight:800; padding:4px 14px; border-radius:999px; margin-bottom:12px; letter-spacing:0.06em; text-transform:uppercase;">🧪 FAKE REHEARSAL DATA · DEMO MODE</div>`
      : '';

    // Welcome Screen (Step 0)
    if (state.step === STEP_WELCOME) {
      if (el.indicator) el.indicator.textContent = 'Stage Ready · Grand Valedictory';
      if (el.nextLabel) el.nextLabel.textContent = 'Start the Reveal ▶';
      el.stage.innerHTML = `
        <section class="rv-welcome">
          <div class="rv-welcome-crest">
            <span class="rv-crest-chip rv-crest-chip--welcome">
              <img src="assets/pace_crest.png" alt="PACE Crest" onerror="this.style.display='none'">
            </span>
            <span class="rv-crest-chip rv-crest-chip--welcome-embers">
              <img src="assets/embers_logo.png" alt="EMBERS '26" onerror="this.style.display='none'">
            </span>
          </div>
          ${demoPill}
          <p class="rv-welcome-kicker">${esc(CATEGORY_TITLES[state.category])}</p>
          <h1 class="rv-welcome-title">GRAND RESULTS REVEAL</h1>
          <p class="rv-welcome-lead">
            Welcome, dignitaries, jury evaluators, and participants! The moment of truth has arrived.
          </p>
          <div class="rv-welcome-shapes">${shapeRow()}</div>
          <div class="rv-welcome-cta">
            <button type="button" class="rv-btn rv-btn--large" onclick="window.advanceReveal()">
              Begin Award Ceremony ▶
            </button>
          </div>
        </section>`;
      return;
    }

    // Grand Podium Screen (Step 4)
    if (state.step === STEP_PODIUM) {
      if (el.indicator) el.indicator.textContent = 'Stage Complete · Full Olympic Podium';
      if (el.nextLabel) el.nextLabel.textContent = 'Replay Ceremony ↺';

      const slot = (row, place, label) => {
        if (!row) return '';
        return `
          <div class="rv-podium-col rv-podium-col--${place}">
            <div class="rv-podium-card">
              ${place === 1 ? `<div class="rv-podium-crown">${CROWN_SVG}</div>` : ''}
              <span class="rv-podium-label">${label}</span>
              <span class="rv-podium-name">${esc(row.team.name)}</span>
              <span class="rv-podium-team">${esc(row.team.college || 'P.A. College of Engineering')}</span>
              <span class="rv-podium-score">
                ${row.total.toFixed(1)}<small>/ ${state.maxTotal}</small>
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
          <p class="rv-final-kicker">Official Honors · ${esc(CATEGORY_TITLES[state.category])}</p>
          <h1 class="rv-final-title">THE GRAND MERIT PODIUM</h1>
          <div class="rv-podium">
            ${slot(rows[1], 2, '1st Runner-Up')}
            ${slot(rows[0], 1, 'Grand Champion')}
            ${slot(rows[2], 3, '2nd Runner-Up')}
          </div>
          <div class="rv-final-shapes">${shapeRow()}</div>
        </section>`;

      audio.podiumFanfare();
      launchConfetti('mega');
      return;
    }

    // Individual Winner Reveal (Steps 3, 2, 1)
    if (rankInfo) {
      const row = rows[rankInfo.index];
      if (!row) {
        el.stage.innerHTML = `<div class="rv-welcome"><p>No team data available for this position.</p></div>`;
        return;
      }

      if (el.indicator) el.indicator.textContent = `Honoring ${rankInfo.label} (Rank #${rankInfo.place})`;
      if (el.nextLabel) el.nextLabel.textContent = `${rankInfo.next} ▶`;

      el.stage.innerHTML = `
        <section class="rv-reveal rv-reveal--${rankInfo.place}">
          <div class="rv-badge-pill" style="background:${rankInfo.color}; color:${rankInfo.ink}">
            <span>${rankInfo.shape === 'triangle' ? '▲' : (rankInfo.shape === 'circle' ? '●' : '◆')}</span>
            <span>${rankInfo.label.toUpperCase()} · PLACE ${rankInfo.place}</span>
          </div>

          <p class="rv-kicker">${rankInfo.kicker}</p>

          <div class="rv-winner-box">
            ${rankInfo.place === 1 ? `<div class="rv-winner-crown">${CROWN_SVG}</div>` : ''}
            <h2 id="winnerTeamName" class="rv-winner-name">${esc(row.team.name)}</h2>
            <p class="rv-winner-project">${esc(row.team.abstract_title || row.team.name + ' Prototype')}</p>
            <p class="rv-winner-college">${esc(row.team.college || 'P.A. College of Engineering')}</p>

            <div class="rv-score-pill">
              <span>FINAL SCORE:</span>
              <strong>${row.total.toFixed(1)} / ${state.maxTotal}</strong>
              ${row.p1 ? `<small>(Phase 1: ${row.p1} + Phase 2: ${row.p2})</small>` : ''}
            </div>
          </div>
        </section>`;

      // SFX trigger based on rank
      if (rankInfo.place === 1) {
        slotMachineFakeout(rankInfo.place, row);
      } else {
        audio.drumroll(1.8);
        later(() => {
          audio.fanfare(rankInfo.place);
          launchConfetti('standard');
        }, 1800);
      }
    }
  }

  function setStep(newStep) {
    if (newStep < STEP_WELCOME) newStep = STEP_WELCOME;
    if (newStep > STEP_PODIUM) newStep = STEP_PODIUM;
    state.step = newStep;
    audio.unlock();
    renderStage();
  }

  window.advanceReveal = function () {
    if (state.step === STEP_PODIUM) {
      setStep(STEP_WELCOME);
    } else {
      setStep(state.step === STEP_WELCOME ? 3 : (state.step === 3 ? 2 : (state.step === 2 ? 1 : STEP_PODIUM)));
    }
  };

  function prevStep() {
    if (state.step === STEP_WELCOME) return;
    if (state.step === 3) setStep(STEP_WELCOME);
    else if (state.step === 2) setStep(3);
    else if (state.step === 1) setStep(2);
    else if (state.step === STEP_PODIUM) setStep(1);
  }

  // =============================================================
  // Bind Events & Controls
  // =============================================================
  function bind() {
    if (el.next) el.next.addEventListener('click', window.advanceReveal);
    if (el.prev) el.prev.addEventListener('click', prevStep);

    if (el.confetti) {
      el.confetti.addEventListener('click', () => {
        audio.unlock();
        launchConfetti('standard');
      });
    }

    if (el.category) {
      el.category.addEventListener('change', (e) => {
        state.category = e.target.value;
        state.maxTotal = categoryMax(state.category);
        applyLive(rowsForCategory(state.category));
        setStep(STEP_WELCOME);
      });
    }

    if (el.audioBtn) {
      el.audioBtn.addEventListener('click', () => {
        state.muted = !state.muted;
        audio.setMuted(state.muted);
        if (el.audioIcon) el.audioIcon.textContent = state.muted ? '🔇' : '🔊';
        if (el.audioText) el.audioText.textContent = state.muted ? 'MUTED' : 'SOUND ON';
      });
    }

    if (el.fsBtn) {
      el.fsBtn.addEventListener('click', () => {
        if (!document.fullscreenElement) {
          document.documentElement.requestFullscreen().catch(() => {});
        } else {
          document.exitFullscreen().catch(() => {});
        }
      });
    }

    // Modal
    if (el.openModal) el.openModal.addEventListener('click', () => {
      if (el.modal) {
        el.modal.classList.add('is-open');
        el.modal.setAttribute('aria-hidden', 'false');
      }
    });
    if (el.closeModal) el.closeModal.addEventListener('click', () => {
      if (el.modal) {
        el.modal.classList.remove('is-open');
        el.modal.setAttribute('aria-hidden', 'true');
      }
    });
    if (el.modalFilter) {
      el.modalFilter.addEventListener('change', renderModal);
    }

    // -------------------------------------------------------------
    // Test Control Deck Event Handlers
    // -------------------------------------------------------------
    // Toggle Simulated Mock vs Live Sync
    if (el.btnToggleDataset) {
      el.btnToggleDataset.addEventListener('click', () => {
        state.isMockMode = !state.isMockMode;
        if (el.txtDatasetSource) {
          el.txtDatasetSource.textContent = state.isMockMode ? '✨ Mock Demo Scores' : '⚡ Live Scores';
        }
        if (el.btnToggleDataset) {
          el.btnToggleDataset.classList.toggle('rv-test-btn--active', state.isMockMode);
        }
        if (el.txtStageDataBadge) {
          el.txtStageDataBadge.textContent = state.isMockMode ? 'MOCK DEMO MODE' : 'LIVE SYNC ACTIVE';
        }
        applyLive(rowsForCategory(state.category));
      });
    }

    // Shuffle Winners
    if (el.btnShuffleDemo) {
      el.btnShuffleDemo.addEventListener('click', () => {
        state.shuffleSeed += 1.7;
        state.isMockMode = true;
        if (el.btnToggleDataset) el.btnToggleDataset.classList.add('rv-test-btn--active');
        if (el.txtDatasetSource) el.txtDatasetSource.textContent = '✨ Mock Demo Scores';
        applyLive(rowsForCategory(state.category));
        audio.tick(1400);
      });
    }

    // Quick Step Teleport Buttons
    document.querySelectorAll('.btn-teleport-step').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const step = parseInt(e.currentTarget.getAttribute('data-step'), 10);
        if (!isNaN(step)) setStep(step);
      });
    });

    // Independent SFX Test Buttons
    if (el.btnTestDrumroll) {
      el.btnTestDrumroll.addEventListener('click', () => {
        audio.unlock();
        audio.drumroll(2.5);
      });
    }
    if (el.btnTestFanfare) {
      el.btnTestFanfare.addEventListener('click', () => {
        audio.unlock();
        audio.fanfare(1);
      });
    }
    if (el.btnTestConfetti) {
      el.btnTestConfetti.addEventListener('click', () => {
        audio.unlock();
        launchConfetti('mega');
      });
    }
    if (el.btnTestApplause) {
      el.btnTestApplause.addEventListener('click', () => {
        audio.unlock();
        audio.playSample('applause', 0.85);
      });
    }

    // Toggle Deck Visibility
    if (el.btnToggleDeckVisibility) {
      el.btnToggleDeckVisibility.addEventListener('click', () => {
        if (el.testDeck) {
          el.testDeck.classList.toggle('is-minimized');
          const isMin = el.testDeck.classList.contains('is-minimized');
          if (el.txtToggleDeck) el.txtToggleDeck.textContent = isMin ? 'Show Deck ▼' : 'Hide Deck ▲';
          document.body.classList.toggle('has-test-deck', !isMin);
        }
      });
    }

    // Keyboard Shortcuts
    window.addEventListener('keydown', (e) => {
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes(e.target.tagName)) return;
      const key = e.key.toLowerCase();

      if (e.key === ' ' || e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === 'Enter') {
        e.preventDefault();
        window.advanceReveal();
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        prevStep();
      } else if (e.key === '0') {
        e.preventDefault();
        setStep(STEP_WELCOME);
      } else if (e.key === '3') {
        e.preventDefault();
        setStep(3);
      } else if (e.key === '2') {
        e.preventDefault();
        setStep(2);
      } else if (e.key === '1') {
        e.preventDefault();
        setStep(1);
      } else if (e.key === '4' || key === 'p') {
        e.preventDefault();
        setStep(STEP_PODIUM);
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
        if (el.audioBtn) el.audioBtn.click();
      } else if (key === 'f') {
        e.preventDefault();
        if (el.fsBtn) el.fsBtn.click();
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

  async function init() {
    document.body.classList.add('ceremony-brand');
    seedEmbers();
    void audio.preload();
    bind();

    // Initialize with mock demo data immediately
    state.isMockMode = true;
    applyLive(rowsForCategory(state.category));
    setStep(STEP_WELCOME);

    setInterval(syncData, POLL_MS);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
