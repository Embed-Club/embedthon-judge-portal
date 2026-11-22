// EMBEDTHON '26 · Grand Results Reveal Ceremony — v3 (five reveal styles + mix)
// Requires: teams.js (TEAMS_DATA), reveal-theme.css, and the /api/evaluations + /api/config endpoints.
// Styles: reel · stamp · envelope · elimination · decrypt. Default "mix" picks three different styles per ceremony.
// Presenter: keys 1–6 switch style, ?style=<name> in the URL sets it.

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

  const EVENT_DEFAULT_STYLE = {
    OVERALL: 'elimination',
    EMBEDTHON: 'decrypt',
    HARDWARE: 'stamp',
    SOFTWARE: 'reel',
    PAPER: 'envelope',
    A: 'mix',
    B: 'mix'
  };

  // Reveal order: 3rd → 2nd → 1st
  const RANKS = [
    { place: 3, index: 2, label: '3rd Place · 2nd Runner-Up', color: '#7a6a58', next: 'Reveal 1st Runner-Up' },
    { place: 2, index: 1, label: '2nd Place · 1st Runner-Up', color: '#4a5566', next: 'Reveal Grand Champion' },
    { place: 1, index: 0, label: '1st Place · Grand Champion', color: '#f0561d', next: 'Show Final Podium' }
  ];
  const STYLES = {
    mix: 'Mix · Different per rank',
    decrypt: 'Decrypt · Matrix Hacker (Embeddathon)',
    stamp: 'Countdown Stamp · 3-2-1 Slam (Hardware)',
    reel: 'Slot Reel · Flicker & Lock (Software)',
    envelope: 'Sealed Envelope · Wax Seal (Paper Presentation)',
    elimination: 'Elimination · Tile Drop (Grand Finale)'
  };
  const KEY_ORDER = ['mix', 'reel', 'stamp', 'envelope', 'elimination', 'decrypt'];
  const SINGLE_STYLES = ['reel', 'stamp', 'envelope', 'elimination', 'decrypt'];
  const STEP_WELCOME = 0;
  const STEP_PODIUM = 4;

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
    styleSelect: null
  };

  const urlStyle = new URLSearchParams(location.search).get('style');
  const state = {
    category: 'OVERALL',
    step: STEP_WELCOME,
    style: STYLES[urlStyle] ? urlStyle : 'mix',
    mixPlan: [],     // styles for [3rd, 2nd, 1st] when style is "mix"
    gate: null,      // pending presenter action (e.g. opening the envelope)
    live: [],
    locked: [],
    pending: false,
    hasScores: false,
    muted: false,
    timers: [],
    checksum: ''
  };

  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));

  const later = (fn, ms) => { state.timers.push(setTimeout(fn, ms)); };
  const clearTimers = () => { state.timers.forEach(clearTimeout); state.timers = []; };
  const shuffle = (arr) => {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };

  // =============================================================
  // Sound (procedural Web Audio, no asset files)
  // =============================================================
  const audio = {
    ctx: null,
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
    tone(freq, dur, vol, type = 'triangle', slide = 0) {
      const ctx = this.get(); if (!ctx) return;
      const t = ctx.currentTime;
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
    tick(freq = 2400) { this.tone(freq, 0.05, 0.3, 'triangle', 0.67); },
    click() { this.tone(900, 0.03, 0.22, 'triangle'); },
    // Final landing sound: a bell chime
    chime() {
      [[880, 0.22], [1760, 0.1], [2640, 0.04]].forEach(([f, v]) => this.tone(f, 1.2, v, 'sine'));
    },
    // Paper rustle for the envelope
    rustle() {
      const ctx = this.get(); if (!ctx) return;
      const t = ctx.currentTime, dur = 0.5;
      const src = this.noiseSource(ctx, dur, (i) => (Math.random() * 2 - 1) * Math.exp(-i / 5000));
      const f = ctx.createBiquadFilter();
      f.type = 'highpass'; f.frequency.value = 1500;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.35, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + dur);
      src.connect(f).connect(g).connect(ctx.destination);
      src.start(t); src.stop(t + dur);
    },
    // Build-up for the slot reel
    drumroll(dur) {
      const ctx = this.get(); if (!ctx) return;
      const t = ctx.currentTime;
      const src = this.noiseSource(ctx, dur, (i) => (Math.random() * 2 - 1) * (0.6 + 0.4 * Math.sin(i / 130)));
      const f = ctx.createBiquadFilter();
      f.type = 'bandpass'; f.Q.value = 2.4;
      f.frequency.setValueAtTime(600, t);
      f.frequency.linearRampToValueAtTime(1250, t + dur);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.06, t);
      g.gain.exponentialRampToValueAtTime(0.85, t + dur - 0.05);
      g.gain.linearRampToValueAtTime(0.001, t + dur);
      src.connect(f).connect(g).connect(ctx.destination);
      src.start(t); src.stop(t + dur);
    }
  };

  // =============================================================
  // Confetti
  // =============================================================
  function launchConfetti(type = 'standard') {
    if (typeof confetti !== 'function') return;
    const colors = ['#ea580c', '#f59e0b', '#fbbf24', '#ffffff', '#cbd5e1'];
    if (type === 'mega') {
      const end = Date.now() + 3500;
      (function frame() {
        confetti({ particleCount: 5, angle: 60, spread: 70, origin: { x: 0, y: 0.7 }, colors });
        confetti({ particleCount: 5, angle: 120, spread: 70, origin: { x: 1, y: 0.7 }, colors });
        if (Date.now() < end) requestAnimationFrame(frame);
      })();
    } else {
      confetti({ particleCount: 80, spread: 80, origin: { y: 0.65 }, colors });
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
    state.hasScores = rows.some((r) => r.judges > 0);
    if (state.step === STEP_WELCOME) {
      state.locked = rows;
      state.pending = false;
      render();
    } else {
      state.pending = sig(rows) !== sig(state.locked);
      updateSyncBadge();
    }
    renderModal();
  }

  function updateSyncBadge() {
    const label = el.syncBadge && el.syncBadge.lastElementChild;
    if (!label) return;
    label.textContent = state.pending ? 'NEW SCORES · HELD UNTIL REPLAY' : 'LIVE SYNC ACTIVE';
    el.syncBadge.classList.toggle('is-pending', state.pending);
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
    state.step = step;
    if (step === STEP_WELCOME) {
      state.locked = state.live;
      state.pending = false;
      state.mixPlan = shuffle(SINGLE_STYLES).slice(0, 3);
      updateSyncBadge();
    }
    render();
  }

  function next() {
    if (state.gate) {
      const g = state.gate;
      state.gate = null;
      g();
      return;
    }
    if (state.step < STEP_PODIUM) setStep(state.step + 1);
    else setStep(STEP_WELCOME);
  }

  const prev = () => { if (state.step > STEP_WELCOME) setStep(state.step - 1); };

  function setStyle(style) {
    state.style = style;
    if (el.styleSelect) el.styleSelect.value = style;
    setStep(STEP_WELCOME);
  }

  // =============================================================
  // Rendering
  // =============================================================
  function render() {
    if (!el.stage) return;
    el.prev.disabled = state.step === STEP_WELCOME;
    if (state.step === STEP_WELCOME) renderWelcome();
    else if (state.step === STEP_PODIUM) renderPodium();
    else renderRank(state.step - 1);
  }

  function renderWelcome() {
    el.indicator.textContent = 'Stage ready · Grand reveal';
    el.nextLabel.textContent = 'Begin Announcement ▶';
    const rehearsal = !state.hasScores;

    el.stage.innerHTML = `
      <section class="rv-welcome">
        <img class="rv-crest" src="assets/pace_crest.png" alt="" onerror="this.style.display='none'">
        <p class="rv-kicker">P.A. College of Engineering · Dept. of CSE</p>
        <h1 class="rv-title">EMBEDTHON '26</h1>
        <p class="rv-subtitle">&amp; EMBERS '26 · Grand Results Reveal</p>
        <div class="rv-pill">${esc(CATEGORY_TITLES[state.category])}</div>
        <p class="rv-status ${rehearsal ? 'is-warn' : 'is-ok'}">
          ${rehearsal ? 'Rehearsal mode · no evaluation scores saved yet' : 'Verified jury evaluations loaded · results locked for reveal'}
        </p>
        <p class="rv-meta">Reveal style · ${esc(STYLES[state.style])}</p>
        <p class="rv-hint">Press <kbd>Space</kbd> or <kbd>→</kbd> to begin · keys <kbd>1</kbd>–<kbd>6</kbd> change style</p>
      </section>`;
  }

  // The style for a given rank index (0 = 3rd, 1 = 2nd, 2 = 1st)
  function styleFor(i) {
    if (state.style === 'mix') return state.mixPlan[i] || 'reel';
    return state.style;
  }

  function cardHtml(row, rank, fx) {
    const members = row.team.members.map((m) =>
      `<span class="rv-chip ${m.is_lead ? 'is-lead' : ''}">${m.is_lead ? '★ ' : ''}${esc(m.name)}</span>`
    ).join('');

    const box = (label, max, value, hero) => `
      <div class="rv-score ${hero ? 'rv-score--hero' : ''}">
        <span class="rv-score-label">${label}</span>
        <span class="rv-score-value" data-count="${state.hasScores ? value : ''}">${state.hasScores ? '0.0' : '—'}</span>
        <span class="rv-score-max">/ ${max}</span>
      </div>`;

    return `
      <section class="rv-rank" style="--accent:${rank.color}">
        <div class="rv-rank-badge">${esc(rank.label)}</div>
        <div class="rv-card">
          ${fx.card}
          <div class="rv-team-no">TEAM ${esc(row.team.number)} · SECTION ${esc(row.team.section)}</div>
          <div class="rv-name-wrap">
            <h2 class="rv-name">${esc(row.team.name)}</h2>
            ${fx.name}
          </div>
          ${row.team.abstract_title ? `<p class="rv-project">“${esc(row.team.abstract_title)}”</p>` : ''}
          <div class="rv-members">${members}</div>
          <div class="rv-scores">
            ${box('Phase 1', 30, row.p1)}
            ${box('Phase 2', 70, row.p2)}
            ${box('Grand Total', 100, row.total, true)}
          </div>
          ${state.hasScores ? '' : '<p class="rv-note">Rehearsal data · scores not yet saved</p>'}
        </div>
      </section>`;
  }

  function renderRank(i) {
    const rank = RANKS[i];
    const row = pool()[rank.index];
    if (!row) return;
    const mode = styleFor(i);
    const fx = FX[mode] || FX.reel;

    el.indicator.textContent = rank.label;
    el.nextLabel.textContent = mode === 'envelope' ? 'Open envelope ▶' : rank.next + ' ▶';

    el.stage.innerHTML = cardHtml(row, rank, fx.markup);
    const root = el.stage.querySelector('.rv-rank');
    root.classList.add('mode-' + mode);

    const isChamp = rank.place === 1;
    const api = { land: () => land(root, isChamp) };
    fx.play(root, row, rank, api);
  }

  // Shared finish for every style: name appears, chime, confetti, scores count up
  function land(root, isChamp) {
    root.classList.add('is-revealed');
    audio.chime();
    launchConfetti(isChamp ? 'mega' : 'standard');
    later(() => {
      root.querySelectorAll('[data-count]').forEach((node) => {
        if (node.dataset.count !== '') countUp(node, parseFloat(node.dataset.count), 1400);
      });
    }, 250);
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
  // The five reveal styles. Each one builds its own markup and timeline.
  // =============================================================
  const FX = {

    // 1. Slot reel: names flash past, slow down with near misses, then land
    reel: {
      markup: { name: '<div class="rv-reel" aria-hidden="true"></div>', card: '' },
      play(root, row, rank, api) {
        const spinMs = rank.place === 1 ? 6500 : 4800;
        const reel = root.querySelector('.rv-reel');
        audio.drumroll(spinMs / 1000);
        spinReel(reel, row.team.name, spinMs, () => {
          reel.classList.add('is-landed');
          later(api.land, 1300);   // hold on the landed name
        });
      }
    },

    // 2. Countdown stamp: 3, 2, 1, then the name slams in
    stamp: {
      markup: { name: '<div class="rv-fx-count" aria-hidden="true"></div>', card: '' },
      play(root, row, rank, api) {
        const counter = root.querySelector('.rv-fx-count');
        ['3', '2', '1'].forEach((n, k) => later(() => {
          counter.textContent = n;
          audio.tick(1800 + k * 300);
        }, k * 900));
        later(() => {
          counter.textContent = '';
          root.classList.add('is-stamped');
          api.land();
        }, 2700);
      }
    },

    // 3. Sealed envelope: the presenter opens it with Next
    envelope: {
      markup: { name: '', card: '<div class="rv-seal" aria-hidden="true"><span>SEALED</span></div>' },
      play(root, row, rank, api) {
        state.gate = () => {
          root.querySelector('.rv-seal').classList.add('is-open');
          audio.rustle();
          el.nextLabel.textContent = rank.next + ' ▶';
          later(api.land, 700);
        };
      }
    },

    // 4. Elimination: all teams in the category, dropped one by one until the winner is left
    elimination: {
      markup: { name: '<div class="rv-grid" aria-hidden="true"></div>', card: '' },
      play(root, row, rank, api) {
        const grid = root.querySelector('.rv-grid');
        const teams = pool().map((r) => r.team);
        grid.innerHTML = teams.map((t) =>
          `<span class="rv-tile" data-no="${esc(t.number)}">${esc(t.name)}</span>`
        ).join('');

        const order = shuffle(teams.filter((t) => t.number !== row.team.number));
        const gap = Math.max(120, 4200 / Math.max(1, order.length));
        order.forEach((t, k) => later(() => {
          const tile = grid.querySelector(`[data-no="${t.number}"]`);
          if (tile) tile.classList.add('is-out');
          audio.tick(2200 - k * 15);
        }, 400 + k * gap));

        const endAt = 400 + order.length * gap + 300;
        later(() => {
          const win = grid.querySelector(`[data-no="${row.team.number}"]`);
          if (win) win.classList.add('is-winner');
          audio.tick(2600);
        }, endAt);
        later(api.land, endAt + 1000);
      }
    },

    // 5. Decrypt: random characters lock in one letter at a time
    decrypt: {
      markup: { name: '<div class="rv-reel rv-decrypt" aria-hidden="true"></div>', card: '' },
      play(root, row, rank, api) {
        const reel = root.querySelector('.rv-decrypt');
        const target = row.team.name.toUpperCase();
        const glyphs = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ#@$%&*';
        const totalMs = 2600;
        const start = performance.now();
        let lastLocked = -1;

        const frame = () => {
          const p = Math.min(1, (performance.now() - start) / totalMs);
          const locked = Math.floor(p * target.length);
          let out = '';
          for (let i = 0; i < target.length; i++) {
            out += (target[i] === ' ' || i < locked)
              ? target[i]
              : glyphs[Math.floor(Math.random() * glyphs.length)];
          }
          reel.textContent = out;
          if (locked !== lastLocked) { lastLocked = locked; audio.click(); }
          if (p < 1) state.timers.push(setTimeout(frame, 55));
          else { reel.textContent = target; later(api.land, 900); }
        };
        frame();
      }
    }
  };

  // Slot reel engine: fast flicker that slows steadily, decoys near the end, then stops
  function spinReel(reelEl, finalName, totalMs, onStop) {
    const list = pool().map((r) => r.team.name);
    if (!list.length) list.push(finalName);
    const winnerAt = list.indexOf(finalName);
    const decoy = () => {
      if (list.length < 2) return finalName;
      let i;
      do { i = Math.floor(Math.random() * list.length); } while (i === winnerAt);
      return list[i];
    };
    const start = performance.now();

    const step = () => {
      const p = (performance.now() - start) / totalMs;
      if (p >= 1) {
        reelEl.textContent = finalName;
        onStop();
        return;
      }
      reelEl.textContent = p > 0.86 ? decoy() : list[Math.floor(Math.random() * list.length)];
      audio.tick();
      state.timers.push(setTimeout(step, 50 + 520 * Math.pow(p, 2.6)));
    };
    step();
  }

  // =============================================================
  // Podium
  // =============================================================
  function renderPodium() {
    el.indicator.textContent = 'Ceremony complete · Final podium';
    el.nextLabel.textContent = 'Replay Ceremony';

    const [gold, silver, bronze] = [pool()[0], pool()[1], pool()[2]];
    const slot = (row, place) => {
      if (!row) return '';
      return `
        <div class="rv-slot rv-slot--${place}">
          <div class="rv-slot-card">
            <span class="rv-slot-no">${place === 1 ? 'CHAMPION' : place === 2 ? '2ND PLACE' : '3RD PLACE'}</span>
            <span class="rv-slot-team">${esc(row.team.name)}</span>
            <span class="rv-slot-no">TEAM ${esc(row.team.number)}</span>
            <span class="rv-slot-score">${state.hasScores ? row.total.toFixed(1) : '—'}<small> / 100</small></span>
          </div>
          <div class="rv-block rv-block--${place}">${place}</div>
        </div>`;
    };

    el.stage.innerHTML = `
      <section class="rv-podium-wrap">
        <p class="rv-kicker">Official final honors</p>
        <h1 class="rv-podium-title">${esc(CATEGORY_TITLES[state.category])}</h1>
        <div class="rv-podium">${slot(silver, 2)}${slot(gold, 1)}${slot(bronze, 3)}</div>
      </section>`;

    launchConfetti('mega');
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
      <tr class="${i === 0 ? 'bg-amber-50/70 font-semibold' : ''} hover:bg-[#f6f1e6]/60 transition">
        <td class="py-2 px-3 text-center font-bold">#${i + 1}</td>
        <td class="py-2 px-3 font-mono font-black text-[#ea580c]">T-${esc(r.team.number)}</td>
        <td class="py-2 px-3">
          <span class="font-bold text-[#0f172a] block">${esc(r.team.name)}</span>
          <span class="text-[10px] text-[#64748b] block">${esc(r.team.abstract_title || '')}</span>
        </td>
        <td class="py-2 px-2 text-center text-[10px] font-bold">Sec ${esc(r.team.section)}</td>
        <td class="py-2 px-2.5 text-center font-mono font-bold text-slate-700">${show(r.p1)}</td>
        <td class="py-2 px-2.5 text-center font-mono font-bold text-slate-700">${show(r.p2)}</td>
        <td class="py-2 px-3 text-right font-mono font-black text-sm text-[#ea580c]">${show(r.total)}</td>
      </tr>`).join('');
  }

  const openModal = () => { el.modal.classList.remove('hidden'); renderModal(); };
  const closeModal = () => el.modal.classList.add('hidden');

  // =============================================================
  // Controls
  // =============================================================
  function toggleFullscreen() {
    if (document.fullscreenElement) document.exitFullscreen();
    else document.documentElement.requestFullscreen().catch((e) => console.warn('Fullscreen error:', e));
  }

  function toggleAudio() {
    state.muted = !state.muted;
    el.audioIcon.textContent = state.muted ? '🔇' : '🔊';
    el.audioText.textContent = state.muted ? 'MUTED' : 'SOUND ON';
  }

  function buildStyleSelect() {
    const sel = document.createElement('select');
    sel.id = 'revealStyleSelect';
    sel.className = 'bg-[#f6f1e6] border border-[#e3dccd] text-xs font-black text-[#0f172a] rounded-xl px-2.5 sm:px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#ea580c] cursor-pointer shadow-xs';
    sel.title = 'Reveal animation style (keys 1–6)';
    sel.innerHTML = KEY_ORDER.map((k) => `<option value="${k}">${esc(STYLES[k])}</option>`).join('');
    sel.value = state.style;
    sel.addEventListener('change', (e) => setStyle(e.target.value));
    el.openModal.parentNode.insertBefore(sel, el.openModal);
    el.styleSelect = sel;
  }

  function bind() {
    // Blur buttons after click so Space/Enter don't double-fire them
    el.next.addEventListener('click', () => { next(); el.next.blur(); });
    el.prev.addEventListener('click', () => { prev(); el.prev.blur(); });
    el.confetti.addEventListener('click', () => { audio.tick(1800); launchConfetti('standard'); el.confetti.blur(); });
    el.audioBtn.addEventListener('click', toggleAudio);
    el.fsBtn.addEventListener('click', toggleFullscreen);
    document.addEventListener('fullscreenchange', () => {
      el.fsIcon.textContent = document.fullscreenElement ? '✕' : '⛶';
    });

    const updateBannerForCategory = () => {
      const bannerEvent = $('revealBannerEvent');
      const bannerSub = $('revealBannerSub');
      if (!bannerEvent || !bannerSub) return;
      const isEmbedthon = ['EMBEDTHON', 'A', 'B'].includes(state.category);
      if (isEmbedthon) {
        bannerEvent.textContent = "EMBEDTHON '26";
        bannerEvent.className = "font-black tracking-wider text-amber-400";
        bannerSub.textContent = "24-Hour Internal Hackathon Valedictory";
      } else {
        bannerEvent.textContent = "EMBERS '26";
        bannerEvent.className = "font-black tracking-wider text-orange-400";
        bannerSub.textContent = "National Level Technical Symposium Valedictory";
      }
    };

    el.category.addEventListener('change', (e) => {
      state.category = e.target.value;
      updateBannerForCategory();
      const targetStyle = EVENT_DEFAULT_STYLE[state.category];
      if (targetStyle) {
        setStyle(targetStyle);
      } else {
        setStep(STEP_WELCOME);
      }
    });

    el.openModal.addEventListener('click', openModal);
    el.closeModal.addEventListener('click', closeModal);
    el.modalFilter.addEventListener('change', renderModal);

    window.addEventListener('keydown', (e) => {
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes(e.target.tagName)) return;
      if (e.key === 'Escape') { closeModal(); return; }
      if (!el.modal.classList.contains('hidden')) return;

      const k = e.key.toLowerCase();
      if (/^[1-6]$/.test(e.key)) { e.preventDefault(); setStyle(KEY_ORDER[Number(e.key) - 1]); }
      else if (e.key === ' ' || e.key === 'ArrowRight' || e.key === 'Enter') { e.preventDefault(); next(); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); prev(); }
      else if (k === 'f') { e.preventDefault(); toggleFullscreen(); }
      else if (k === 'm') { e.preventDefault(); toggleAudio(); }
      else if (k === 'c') { e.preventDefault(); launchConfetti('standard'); }
    });
  }

  // =============================================================
  // Init
  // =============================================================
  async function init() {
    document.body.classList.add('ceremony-brand');
    buildStyleSelect();
    bind();
    state.mixPlan = shuffle(SINGLE_STYLES).slice(0, 3);
    applyLive(computeStandings({}));   // rehearsal view immediately, no fake scores
    await syncData();
    setInterval(syncData, POLL_MS);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
