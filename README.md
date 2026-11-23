# EMBEDTHON '26 — Official Multi-Judge Evaluation Portal
**Department of Computer Science & Engineering · P.A. College of Engineering (PACE), Mangaluru**  
*Organized by Embed Club & IEEE CEDA Student Branch Chapter*

## Overview
A mobile-first web portal built specifically for judges evaluating **EMBERS '26 / EMBEDTHON '26** across three events: **Paper Presentation**, **Project Expo** and **Embeddathon** — with separate rubrics, venue/schedule deployment and live multi-judge consensus.

## Key Features
- **Official Roster**: Full 24 teams pre-loaded (Section A 01–11, Section B 12–24) with team leads, USNs, phone numbers, and WhatsApp quick-connect buttons.
- **Three Separate Event Rubrics** (switch inside the judge portal):
  - **📄 Paper Presentation — 50 pts**
    - Relevance (15)
    - Presentation — body gesture, confidence & delivery (15)
    - Viva (5)
    - Innovation (15)
  - **🛠️ Project Expo — 50 pts**
    - Working Model (10)
    - Relevance (10)
    - Presentation — body gesture, confidence & delivery (10)
    - Viva (10)
    - Innovation (10)
  - **⚡ Embeddathon — 100 pts** (existing dual-phase rubric)
    - Phase 1 Mentoring (30): Problem Understanding 10, Implementation Progress 10, Team Engagement 10
    - Phase 2 Final Expo (70): Working Prototype 25, Technical Complexity 20, Innovation & Viability 15, Presentation & Defense 10
- **Judge Deployment & Scheduling**: Admin console selects each judge's event/track, venue and EMBERS schedule slot. The assignment is shown on the judge's phone after login (event, venue and time), and the matching event rubric opens automatically.
- **Multi-Judge Consensus**: Configurable number of judges (2–10). Each judge evaluates independently. Real-time dynamic updates aggregate jury average scores per event.
- **Event-aware Leaderboards**: Rank teams separately for Paper, Project Expo and Embeddathon, with event-specific score columns, CSV export and WhatsApp summaries.
- **Unique Judge Login**:
  - Internal Embeddathon (`INT-1` Fizan) | PIN: `1111`
  - Internal Embeddathon (`INT-2` Rafan) | PIN: `2222`
  - External Embeddathon (`EXT-1` Muadh Bin Mohammed Ali) | PIN: `3333`
  - External Embeddathon (`EXT-2` Mohammed Nouman) | PIN: `4444`
  - Project Expo (`EXP-1` Suhail Afzal) | PIN: `5555`
  - Project Expo (`EXP-2` Dr. Mohammed Hafeez M.K.) | PIN: `6666`
  - Paper Presentation (`PPR-1` Dr. Saleem Malik) | PIN: `7777`
  - Paper Presentation (`PPR-2` ROULATH SANI MOIDEEN) | PIN: `8888`
  - Coordinator (`ADMIN`) | PIN: `5012`
- **Dynamic Leaderboard**: Live ranked table with individual judge marks, average scores, and CSV export.

## Rubric Source of Truth
All three rubrics live in [`rubrics.js`](rubrics.js) and are shared by the browser portal and the serverless API, so scoring weights cannot drift between client and server.

## Results Reveal Stage
Open **`reveal.html`** (or use **Reveal Ceremony** on the leaderboard) for the projector ceremony.

- **EMBERS '26 fire theme**: charcoal/smoke arena, ember orange/red/gold lighting, flame watermark and rising sparks.
- **Licensed sound design**: Mixkit whooshes, drumrolls, drum-slam impact, brass fanfare and crowd applause, plus project-supplied build-up/fake-out/winner-bell/slot-payout effects, with procedural fallbacks. See [`assets/sfx/CREDITS.md`](assets/sfx/CREDITS.md).
- Kahoot-inspired reveal: answer-tile shapes, chunky cards, drumroll suspense, confetti and crown drop.
- Sequence: **2nd Runner-Up → 1st Runner-Up → Grand Champion → Final Podium**.
- **Champion slot machine**: the final name spins through the field, fake-locks on a decoy team, holds it like the real winner for ~2 seconds, stamps **PSYCH!** with a comic womp, then snaps to the real winner at the last moment.
- **Podium finale**: the three winners get avatar "seats" on gold/silver/bronze blocks, with animated stage spotlights.
- **Auto-advance option** in the footer (Off / 6s / 10s / 15s / 20s / 30s). The countdown starts once the current winner is on screen, so it never skips a drumroll. It pauses while the standings modal is open.
- **Fullscreen presentation mode** removes the header, footer, hints and secondary text, leaving only the rank, winner name, score, crown or podium.
- Scores are held to the snapshot taken when the ceremony starts and count up on reveal. New live scores wait for a replay.
- Presenter keys: `Space` / `→` / `↓` next (or reveal immediately during a drumroll), `←` / `↑` back, `1`–`3` jump to a rank, `A` toggle auto-advance, `R` restart, `F` fullscreen, `M` mute, `C` confetti.
- `?category=OVERALL` (or `A`, `B`, `EMBEDDATHON`, `PROJECT_EXPO`, `PAPER`) pre-selects the award category. Per-event score totals (50/50/100) are applied automatically.

## Judge Deployment, Venue & Schedule
Open **`admin.html`** and use **Judge Deployment, Venue & Schedule Allocation**. For every internal/external judge select:

1. **Event / Track** — Paper Presentation, Project Expo or Embeddathon.
2. **Venue** — populated from the EMBERS schedule (e.g. Multipurpose Hall, Edusat Hall, Computer Labs 1 & 2).
3. **Schedule slot** — populated from the EMBERS master schedule (day, time and session title).

Save once and the assignment syncs to the judge's phone. On login the portal opens that judge's event rubric and displays the venue and time in the Evaluation Event card. The assignment is stored in `config.json` under `judgeAssignments`; evaluations are stored per event as `evaluations.json → EVENT_ID → team number → judge ID`.
