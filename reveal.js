// EMBEDTHON / EMBERS '26 · Grand Results Reveal Ceremony — Kahoot-style stage
// Requires: teams.js (TEAMS_DATA), reveal-theme.css, and the /api/evaluations + /api/config endpoints.
// Flow: 2nd runner-up → 1st runner-up → Grand Champion (slot-machine fake-out) → final podium.
// Presenter: Space / → / ↓ advances, Space during a drumroll reveals immediately,
// 1–3 jump straight to a rank, A toggles the auto-advance timer, R restarts,
// F fullscreen (all chrome hidden), M mute, C confetti.

(function () {
  'use strict';

  const POLL_MS = 4000;
  const CATEGORY_TITLES = {
    OVERALL: 'Overall Champions (All 24 Teams)',
    EMBEDTHON: 'Track 1 · Embeddathon',
    HARDWARE: 'Track 2 · Project Expo (Hardware)',
    SOFTWARE: 'Track 2 · Project Expo (Software)',
    PAPER: 'Track 3 · Technical Paper Competition',
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
    emberField: $('emberField')
  };

  const state = {
    category: 'OVERALL',
    step: STEP_WELCOME,
    gate: null,      // pending presenter action: skip the drumroll and reveal now
    live: [],
    locked: [],
    pending: false,
    hasScores: false,
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
  // Sound (procedural Web Audio, no asset files)
  // =============================================================
  const audio = {
    ctx: null,
    noise: null,
    get() {
      if (state.muted) return null;
      if (!this.ctx) {
        const C = window.AudioContext || window.webkitAudioContext;
        if (!C) return null;
        this.ctx = new C();
      }
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return this.ctx;
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
      o.connect(g).connect(ctx.destination);
      o.start(t); o.stop(t + dur + 0.02);
    },
    tick(freq = 2200, delay = 0) { this.tone(freq, 0.05, 0.2, 'triangle', 0.67, delay); },
    click() { this.tone(900, 0.03, 0.2, 'triangle'); },
    chime() {
      [[880, 0.2], [1320, 0.12], [1760, 0.07], [2640, 0.03]].forEach(([f, v], i) => {
        this.tone(f, 1.1, v, 'sine', 0, i * 0.04);
      });
    },
    // Landing hit: low thump + sparkle
    hit() {
      this.tone(120, 0.45, 0.5, 'sine', 0.5);
      this.tone(62, 0.6, 0.35, 'sine', 0.7);
      this.chime();
    },
    // Comedic "womp womp" for the champion fake-out
    womp() {
      [[392, 0.18], [370, 0.18], [349, 0.34]].forEach(([f, dur], i) => {
        this.tone(f, dur, 0.15, 'sawtooth', 0, i * 0.17);
      });
    },
    // Original victory fanfare (does not use any Kahoot music)
    fanfare() {
      [[523.25, 0.42], [659.25, 0.42], [783.99, 0.5], [1046.5, 0.7], [1318.5, 0.85]]
        .forEach(([f, dur], i) => this.tone(f, dur, 0.18, 'triangle', 0, i * 0.13));
      [1046.5, 1318.5, 1568].forEach((f, i) => this.tone(f, 1.5, 0.1, 'sine', 0, 0.62 + i * 0.02));
    },
    // Suspense drumroll
    drumroll(dur) {
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
      src.connect(f).connect(g).connect(ctx.destination);
      src.start(t); src.stop(t + dur);
      this.noise = src;
      src.onended = () => { if (this.noise === src) this.noise = null; };
    },
    stopDrumroll() {
      if (!this.noise) return;
      try { this.noise.stop(); } catch (e) { /* already stopped */ }
      this.noise = null;
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
  function computeStandings(evals) {
    const rows = (typeof TEAMS_DATA !== 'undefined' ? TEAMS_DATA : []).map((team) => {
      const judges = Object.values(evals[team.number] || {}).filter(Boolean);
      const p1 = avg(judges.map((j) => j.phase1).filter((v) => v > 0));
      const p2 = avg(judges.map((j) => j.phase2).filter((v) => v > 0));
      return { team, p1, p2, total: Math.round((p1 + p2) * 10) / 10, judges: judges.length };
    });
    rows.sort((a, b) => b.total - a.total || b.p2 - a.p2 || a.team.number.localeCompare(b.team.number));
    return rows;
  }

  async function syncData() {
    try {
      const [er, cr] = await Promise.all([
        fetch('/api/evaluations', { cache: 'no-store' }),
        fetch('/api/config', { cache: 'no-store' })
      ]);
      if (!er.ok || !cr.ok) return;
      const evals = await er.json();
      const cfg = await cr.json();
      const sum = JSON.stringify([evals, cfg]);
      if (sum === state.checksum) return;
      state.checksum = sum;
      applyLive(computeStandings(evals));
    } catch (err) {
      console.warn('Live sync unavailable, staying in rehearsal mode:', err);
    }
  }

  const sig = (rows) => JSON.stringify(rows.map((r) => [r.team.number, r.total]));

  function applyLive(rows) {
    state.live = rows;
    if (state.step === STEP_WELCOME) {
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
    if (state.category === 'OVERALL') return list;
    if (state.category === 'A' || state.category === 'B') {
      return list.filter((r) => r.team.section === state.category);
    }
    if (state.category === 'EMBEDTHON') {
      const match = list.filter((r) => r.team.section === 'A' || /embed|iot|micro|sensor|hardware|circuit|smart/i.test((r.team.abstract_title || '') + (r.team.abstract || '')));
      return match.length >= 3 ? match : list;
    }
    if (state.category === 'HARDWARE') {
      const match = list.filter((r) => /hardware|sensor|iot|circuit|robot|embed|arduino|esp32|grid|solar/i.test((r.team.abstract_title || '') + (r.team.abstract || '')) || r.team.section === 'A');
      return match.length >= 3 ? match : list;
    }
    if (state.category === 'SOFTWARE') {
      const match = list.filter((r) => /software|ai|ml|cloud|web|app|vision|detection|predict/i.test((r.team.abstract_title || '') + (r.team.abstract || '')) || r.team.section === 'B');
      return match.length >= 3 ? match : list;
    }
    if (state.category === 'PAPER') {
      const match = list.filter((r) => /paper|analysis|study|framework|optimization|model/i.test((r.team.abstract_title || '') + (r.team.abstract || '')) || r.team.section === 'B');
      return match.length >= 3 ? match : list;
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
    resetConfetti();
    clearAutoTimer();
    state.step = step;
    state.auto.hold = step > STEP_WELCOME && step < STEP_PODIUM;
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
            <p class="rv-welcome-sub">&amp; EMBERS '26 · Grand Results Reveal</p>
            <div class="rv-welcome-pill">
              <span class="k-shape k-shape--triangle" aria-hidden="true"></span>
              ${esc(CATEGORY_TITLES[state.category])}
            </div>
            <p class="rv-welcome-status ${rehearsal ? 'is-warn' : 'is-ok'}">
              ${rehearsal
                ? 'Rehearsal mode · no evaluation scores saved yet'
                : 'Verified jury evaluations loaded · results locked for reveal'}
            </p>
            <div class="rv-welcome-shapes">${shapeRow()}</div>
            <p class="rv-welcome-hint">
              <kbd>Space</kbd> / <kbd>→</kbd> begin · <kbd>1</kbd>–<kbd>3</kbd> jump ·
              <kbd>A</kbd> auto-advance · <kbd>F</kbd> fullscreen · <kbd>R</kbd> restart
            </p>
          </div>
        </div>
      </section>`;
    state.auto.hold = false;
    scheduleAuto();
  }

  function rankMarkup(row, rank) {
    const members = row.team.members.map((m) => `
      <span class="rv-player ${m.is_lead ? 'is-lead' : ''}">
        ${m.is_lead ? '<span class="rv-player-star">★</span>' : ''}${esc(m.name)}
      </span>`).join('');

    const show = (v) => (state.hasScores ? v.toFixed(1) : '—');
    const note = state.hasScores ? '' : '<p class="rv-note">Rehearsal data · scores not yet saved</p>';

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
          <div class="rv-suspense ${rank.place === 1 ? 'rv-suspense--slot' : ''}">
            <p class="rv-suspense-kicker">${rank.kicker}</p>
            ${rank.place === 1 ? `
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
              <p class="rv-slot-tag" id="slotTag">Drumroll · press Space to lock it in</p>
            ` : `
              <div class="rv-suspense-shapes" aria-hidden="true">
                <span class="k-shape k-shape--triangle"></span>
                <span class="k-shape k-shape--diamond"></span>
                <span class="k-shape k-shape--circle"></span>
                <span class="k-shape k-shape--square"></span>
              </div>
              <div class="rv-dots" aria-hidden="true"><span></span><span></span><span></span></div>
              <p class="rv-suspense-hint">Drumroll · press Space to reveal now</p>
            `}
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
              <div class="rv-members">${members}</div>
              <div class="rv-scoreboard">
                <div class="rv-total">
                  <span class="rv-total-label">Grand Total</span>
                  <span class="rv-total-value ${state.hasScores ? '' : 'is-empty'}" data-count="${state.hasScores ? row.total : ''}">${state.hasScores ? '0.0' : '—'}</span>
                  <span class="rv-total-max">/ 100</span>
                </div>
                <div class="rv-split">
                  <div><span>Phase 1</span><strong>${show(row.p1)}</strong><small>/ 30</small></div>
                  <div><span>Phase 2</span><strong>${show(row.p2)}</strong><small>/ 70</small></div>
                </div>
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
    const suspenseMs = rank.place === 2 ? 3500 : 2900;

    state.auto.hold = true;
    el.indicator.textContent = `${rank.label} · drumroll — press Space to reveal`;
    el.nextLabel.textContent = 'Reveal now ▶';
    audio.drumroll(rank.place === 1 ? 3.1 : suspenseMs / 1000);

    let landed = false;
    let slotCancelled = false;
    const reveal = () => {
      if (landed) return;
      landed = true;
      if (state.gate === reveal || state.gate === skipRank) state.gate = null;
      audio.stopDrumroll();
      act.classList.add('is-revealed');

      if (rank.place === 1) {
        audio.fanfare();
        launchConfetti('mega');
      } else if (rank.place === 2) {
        audio.hit();
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
    if (rank.place === 1) {
      runSlot(act, row, reveal, () => slotCancelled);
    } else {
      later(reveal, suspenseMs);
    }
  }

  // Champion-only slot machine: spin through the field, fake out on a decoy,
  // then snap to the real winner at the last moment.
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
      audio.tick(1600 + Math.random() * 900);

      if (p < 1) {
        later(step, 55 + 420 * Math.pow(p, 2.6));
        return;
      }

      // 1. Let the decoy name land and sit there like a real winner.
      reel.classList.remove('is-spinning');
      reel.textContent = decoy;
      reel.classList.add('is-decoy');
      machine.classList.add('is-decoy');
      tag.textContent = 'And the winner is…';
      audio.tick(900);

      // 2. Hold the fake winner for two full seconds before the prank.
      later(() => {
        if (isCancelled()) return;
        reel.classList.remove('is-decoy');
        reel.classList.add('is-fake');
        machine.classList.remove('is-decoy');
        machine.classList.add('is-fake');
        tag.textContent = 'PSYCH! · Just kidding…';
        audio.womp();

        // 3. Hold the PSYCH for a beat, then snap to the real winner.
        later(() => {
          if (isCancelled()) return;
          reel.classList.remove('is-fake');
          reel.classList.add('is-real');
          reel.textContent = row.team.name;
          machine.classList.remove('is-fake');
          machine.classList.add('is-real');
          tag.textContent = `WINNER · ${row.team.name}`;
          audio.hit();
          later(finish, 650);
        }, 1000);
      }, 2000);
    };

    reel.classList.add('is-spinning');
    step();
    later(finish, 9000);
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
              <span class="rv-podium-score">—<small>/ 100</small></span>
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
            <span class="rv-podium-team">TEAM ${esc(row.team.number)} · SEC ${esc(row.team.section)}</span>
            <span class="rv-podium-score">
              ${state.hasScores ? row.total.toFixed(1) : '—'}<small>/ 100</small>
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

    audio.fanfare();
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

    el.modalBody.innerHTML = rows.map((r, i) => `
      <tr class="${i === 0 ? 'is-leader' : ''}">
        <td class="is-center"><strong>#${i + 1}</strong></td>
        <td class="rv-table-num">T-${esc(r.team.number)}</td>
        <td>
          <span class="rv-table-team">${esc(r.team.name)}</span>
          <span class="rv-table-sub">${esc(r.team.abstract_title || '')}</span>
        </td>
        <td class="is-center"><span class="rv-table-sec">${esc(r.team.section)}</span></td>
        <td class="is-center">${show(r.p1)}</td>
        <td class="is-center">${show(r.p2)}</td>
        <td class="is-right"><span class="rv-table-total">${show(r.total)}</span></td>
      </tr>`).join('');
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
    if (state.muted) audio.stopDrumroll();
    el.audioIcon.textContent = state.muted ? '🔇' : '🔊';
    el.audioText.textContent = state.muted ? 'MUTED' : 'SOUND ON';
  }

  function updateBannerForCategory() {
    const bannerEvent = $('revealBannerEvent');
    const bannerSub = $('revealBannerSub');
    if (!bannerEvent || !bannerSub) return;
    const isEmbedthon = ['EMBEDTHON', 'A', 'B'].includes(state.category);
    if (isEmbedthon) {
      bannerEvent.textContent = "EMBEDTHON '26";
      bannerEvent.style.color = '';
      bannerSub.textContent = "24-Hour Internal Hackathon Valedictory";
    } else {
      bannerEvent.textContent = "EMBERS '26";
      bannerEvent.style.color = '#ff9f43';
      bannerSub.textContent = "National Level Technical Symposium Valedictory";
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
      updateBannerForCategory();
      setStep(STEP_WELCOME);
    });

    el.openModal.addEventListener('click', openModal);
    el.closeModal.addEventListener('click', closeModal);
    el.modalFilter.addEventListener('change', renderModal);
    el.modal.addEventListener('click', (e) => { if (e.target === el.modal) closeModal(); });

    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') { closeModal(); return; }
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes(e.target.tagName)) return;
      if (el.modal.classList.contains('is-open')) return;

      const key = e.key.toLowerCase();
      if (/^[1-3]$/.test(e.key)) {
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
    if (document.fullscreenElement) document.body.classList.add('is-fullscreen');

    const params = new URLSearchParams(location.search);
    const urlCategory = (params.get('category') || params.get('track') || '').toUpperCase();
    if (urlCategory && el.category) {
      const exists = Array.from(el.category.options).some((o) => o.value === urlCategory);
      if (exists) el.category.value = urlCategory;
    }
    if (el.category && el.category.value) state.category = el.category.value;

    bind();
    updateBannerForCategory();

    applyLive(computeStandings({}));  // rehearsal view immediately, no fake scores
    await syncData();
    setInterval(syncData, POLL_MS);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
