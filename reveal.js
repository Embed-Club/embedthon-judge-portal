// EMBEDTHON '26 · Grand Results Reveal Ceremony — v2
// Requires: teams.js (TEAMS_DATA), reveal-theme.css, and the existing /api/evaluations + /api/config endpoints.

(function () {
  'use strict';

  const POLL_MS = 4000;
  const CATEGORY_TITLES = {
    OVERALL: 'Overall Champions (All 24 Teams)',
    A: 'Section A (Teams 01–11)',
    B: 'Section B (Teams 12–24)'
  };
  // Reveal order: 3rd → 2nd → 1st
  const RANKS = [
    { place: 3, index: 2, label: '3rd Place · 2nd Runner-Up', emoji: '🥉', color: '#d97706', drum: 1.8, next: 'Reveal 1st Runner-Up 🥈' },
    { place: 2, index: 1, label: '2nd Place · 1st Runner-Up', emoji: '🥈', color: '#cbd5e1', drum: 1.8, next: 'Reveal Grand Champion 👑' },
    { place: 1, index: 0, label: '1st Place · Grand Champion', emoji: '👑', color: '#fbbf24', drum: 2.6, next: 'Show Final Podium 🏆' }
  ];
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
    modalBody: $('standingsTableBody')
  };

  const state = {
    category: 'OVERALL',
    step: STEP_WELCOME,
    live: [],        // latest standings from server (all teams)
    locked: [],      // snapshot the ceremony runs on
    pending: false,  // live differs from locked
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

  // =============================================================
  // Sound (procedural Web Audio — no asset files needed)
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
    noiseBuffer(ctx, dur, fn) {
      const n = Math.floor(ctx.sampleRate * dur);
      const buf = ctx.createBuffer(1, n, ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < n; i++) d[i] = fn(i);
      const src = ctx.createBufferSource();
      src.buffer = buf;
      return src;
    },
    drumroll(dur) {
      const ctx = this.get(); if (!ctx) return;
      const t = ctx.currentTime;
      const src = this.noiseBuffer(ctx, dur, (i) => (Math.random() * 2 - 1) * (0.6 + 0.4 * Math.sin(i / 130)));
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
    },
    cymbal() {
      const ctx = this.get(); if (!ctx) return;
      const t = ctx.currentTime, dur = 2.5;
      const src = this.noiseBuffer(ctx, dur, () => Math.random() * 2 - 1);
      const f = ctx.createBiquadFilter();
      f.type = 'highpass'; f.frequency.value = 4500;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.9, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + dur);
      src.connect(f).connect(g).connect(ctx.destination);
      src.start(t); src.stop(t + dur);
    },
    cheer(dur = 3.5) {
      const ctx = this.get(); if (!ctx) return;
      const t = ctx.currentTime;
      const src = this.noiseBuffer(ctx, dur, (i) => (Math.random() * 2 - 1) * (0.8 + 0.2 * Math.sin(i / 800)));
      const f = ctx.createBiquadFilter();
      f.type = 'bandpass'; f.frequency.value = 1400; f.Q.value = 1.2;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.02, t);
      g.gain.linearRampToValueAtTime(0.45, t + 0.4);
      g.gain.setValueAtTime(0.4, t + dur - 0.8);
      g.gain.exponentialRampToValueAtTime(0.001, t + dur);
      src.connect(f).connect(g).connect(ctx.destination);
      src.start(t); src.stop(t + dur);
    },
    horn(ctx, freq, t, dur, vol) {
      const o1 = ctx.createOscillator(), o2 = ctx.createOscillator();
      const f = ctx.createBiquadFilter(), g = ctx.createGain();
      o1.type = 'sawtooth'; o1.frequency.value = freq;
      o2.type = 'triangle'; o2.frequency.value = freq * 1.003;
      f.type = 'lowpass';
      f.frequency.setValueAtTime(freq * 1.6, t);
      f.frequency.linearRampToValueAtTime(freq * 3.6, t + 0.08);
      g.gain.setValueAtTime(0.001, t);
      g.gain.linearRampToValueAtTime(vol, t + 0.04);
      g.gain.setValueAtTime(vol * 0.85, t + dur - 0.08);
      g.gain.exponentialRampToValueAtTime(0.001, t + dur);
      o1.connect(f); o2.connect(f); f.connect(g); g.connect(ctx.destination);
      [o1, o2].forEach((o) => { o.start(t); o.stop(t + dur + 0.05); });
    },
    fanfare(place) {
      const ctx = this.get(); if (!ctx) return;
      const t = ctx.currentTime;
      // [freq, start, duration, volume]
      const notes = place === 1
        ? [[261.63, 0, 0.16, 0.7], [261.63, 0.16, 0.16, 0.7], [261.63, 0.32, 0.16, 0.7], [349.23, 0.48, 0.45, 0.85],
           [440, 0.95, 0.22, 0.85], [523.25, 1.18, 2.2, 0.95], [659.25, 1.18, 2.2, 0.8], [783.99, 1.18, 2.2, 0.9]]
        : place === 2
          ? [[293.66, 0, 0.25, 0.5], [369.99, 0.14, 0.25, 0.55], [440, 0.28, 0.45, 0.7], [587.33, 0.42, 1.6, 0.85]]
          : [[261.63, 0, 0.35, 0.45], [329.63, 0.16, 0.35, 0.5], [392, 0.32, 0.7, 0.65], [523.25, 0.5, 1.4, 0.8]];
      notes.forEach(([f, s, d, v]) => this.horn(ctx, f, t + s, d, v));
      later(() => this.cymbal(), place === 1 ? 1150 : place === 2 ? 400 : 480);
      if (place === 1) later(() => this.cheer(4), 1200);
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

  // Ties: higher Phase 2 wins, then lower team number. Settle real ties on the day.
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

  function applyLive(rows) {
    state.live = rows;
    state.hasScores = rows.some((r) => r.judges > 0);

    if (state.step === STEP_WELCOME) {
      // Nothing revealed yet: the snapshot follows live data.
      state.locked = rows;
      state.pending = false;
      render();
    } else {
      const sig = (list) => JSON.stringify(list.map((r) => [r.team.number, r.total]));
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

  const pool = () => state.locked.filter((r) => state.category === 'OVERALL' || r.team.section === state.category);

  // =============================================================
  // Navigation
  // =============================================================
  function setStep(step) {
    clearTimers();
    state.step = step;
    if (step === STEP_WELCOME) {
      state.locked = state.live;
      state.pending = false;
      updateSyncBadge();
    }
    render();
  }

  const next = () => (state.step < STEP_PODIUM ? setStep(state.step + 1) : setStep(STEP_WELCOME));
  const prev = () => state.step > STEP_WELCOME && setStep(state.step - 1);

  // =============================================================
  // Rendering
  // =============================================================
  function render() {
    if (!el.stage) return;
    el.prev.disabled = state.step === STEP_WELCOME;
    if (state.step === STEP_WELCOME) renderWelcome();
    else if (state.step === STEP_PODIUM) renderPodium();
    else renderRank(RANKS[state.step - 1]);
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
        <p class="rv-hint">Press <kbd>Space</kbd> or <kbd>→</kbd> to begin</p>
      </section>`;
  }

  function renderRank(rank) {
    const row = pool()[rank.index];
    if (!row) return;
    const isChamp = rank.place === 1;
    el.indicator.textContent = rank.label;
    el.nextLabel.textContent = rank.next;

    const scoreBox = (label, max, value, hero) => `
      <div class="rv-score ${hero ? 'rv-score--hero' : ''}">
        <span class="rv-score-label">${label}</span>
        <span class="rv-score-value" data-count="${state.hasScores ? value : ''}">${state.hasScores ? '0.0' : '—'}</span>
        <span class="rv-score-max">/ ${max}</span>
      </div>`;

    const members = row.team.members.map((m) =>
      `<span class="rv-chip ${m.is_lead ? 'is-lead' : ''}">${m.is_lead ? '★ ' : ''}${esc(m.name)}</span>`
    ).join('');

    el.stage.innerHTML = `
      <section class="rv-rank" style="--accent:${rank.color}">
        <div class="rv-rank-badge">${rank.emoji} ${esc(rank.label)}</div>
        <div class="rv-card">
          <div class="rv-team-no">TEAM ${esc(row.team.number)} · SECTION ${esc(row.team.section)}</div>
          <div class="rv-name-wrap">
            <h2 class="rv-name">${esc(row.team.name)}</h2>
            <div class="rv-curtain" aria-hidden="true">? ? ?</div>
          </div>
          ${row.team.abstract_title ? `<p class="rv-project">“${esc(row.team.abstract_title)}”</p>` : ''}
          <div class="rv-members">${members}</div>
          <div class="rv-scores">
            ${scoreBox('Phase 1', 30, row.p1)}
            ${scoreBox('Phase 2', 70, row.p2)}
            ${scoreBox('Grand Total', 100, row.total, true)}
          </div>
          ${state.hasScores ? '' : '<p class="rv-note">Rehearsal data · scores not yet saved</p>'}
        </div>
      </section>`;

    const root = el.stage.querySelector('.rv-rank');
    audio.drumroll(rank.drum);

    // Suspense → reveal → score count-up
    later(() => {
      root.classList.add('is-revealed');
      audio.fanfare(rank.place);
      launchConfetti(isChamp ? 'mega' : 'standard');
    }, rank.drum * 1000);

    later(() => {
      root.querySelectorAll('[data-count]').forEach((node) => {
        if (node.dataset.count !== '') countUp(node, parseFloat(node.dataset.count), 1400);
      });
    }, rank.drum * 1000 + 900);
  }

  function renderPodium() {
    el.indicator.textContent = 'Ceremony complete · Final podium';
    el.nextLabel.textContent = 'Replay Ceremony 🔄';

    const [gold, silver, bronze] = [pool()[0], pool()[1], pool()[2]];
    const slot = (row, place) => {
      if (!row) return '';
      const emoji = place === 1 ? '👑' : place === 2 ? '🥈' : '🥉';
      return `
        <div class="rv-slot rv-slot--${place}">
          <div class="rv-slot-card">
            <span class="rv-slot-emoji">${emoji}</span>
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
  // Standings modal (always shows the locked snapshot, so the audience can't see ahead)
  // =============================================================
  function renderModal() {
    if (!el.modalBody) return;
    const f = el.modalFilter ? el.modalFilter.value : 'ALL';
    const rows = state.locked.filter((r) => f === 'ALL' || r.team.section === f);
    const medals = ['🥇', '🥈', '🥉'];
    const show = (v) => (state.hasScores ? v.toFixed(1) : '—');

    el.modalBody.innerHTML = rows.map((r, i) => `
      <tr class="${i === 0 ? 'bg-amber-50/70 font-semibold' : ''} hover:bg-[#f6f1e6]/60 transition">
        <td class="py-2 px-3 text-center font-bold">${medals[i] || '#' + (i + 1)}</td>
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
  // Controls & shortcuts
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

  function bind() {
    // Blur buttons after click so Space/Enter don't double-fire them.
    el.next.addEventListener('click', () => { next(); el.next.blur(); });
    el.prev.addEventListener('click', () => { prev(); el.prev.blur(); });
    el.confetti.addEventListener('click', () => { audio.cymbal(); launchConfetti('standard'); el.confetti.blur(); });
    el.audioBtn.addEventListener('click', toggleAudio);
    el.fsBtn.addEventListener('click', toggleFullscreen);
    document.addEventListener('fullscreenchange', () => {
      el.fsIcon.textContent = document.fullscreenElement ? '✕' : '⛶';
    });

    el.category.addEventListener('change', (e) => {
      state.category = e.target.value;
      setStep(STEP_WELCOME);
    });

    el.openModal.addEventListener('click', openModal);
    el.closeModal.addEventListener('click', closeModal);
    el.modalFilter.addEventListener('change', renderModal);

    window.addEventListener('keydown', (e) => {
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes(e.target.tagName)) return;
      if (e.key === 'Escape') { closeModal(); return; }
      if (!el.modal.classList.contains('hidden')) return;

      const k = e.key.toLowerCase();
      if (e.key === ' ' || e.key === 'ArrowRight' || e.key === 'Enter') { e.preventDefault(); next(); }
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
    document.body.classList.add('ceremony-dark');
    bind();
    applyLive(computeStandings({}));   // rehearsal view immediately, no fake scores
    await syncData();
    setInterval(syncData, POLL_MS);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
