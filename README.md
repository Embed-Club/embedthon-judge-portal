# EMBEDTHON '26 — Official Multi-Judge Evaluation Portal
**Department of Computer Science & Engineering · P.A. College of Engineering (PACE), Mangaluru**  
*Organized by Embed Club & IEEE CEDA Student Branch Chapter*

## Overview
A mobile-first web portal built specifically for judges evaluating **EMBEDTHON '26** project expo and paper presentation tracks from their smartphones.

## Key Features
- **Official Roster**: Full 24 teams pre-loaded (Section A 01–11, Section B 12–24) with team leads, USNs, phone numbers, and WhatsApp quick-connect buttons.
- **Rubric-First Scoring**:
  - 1. Working Prototype & Live Demo (35 pts)
  - 2. Technical Complexity & Architecture (25 pts)
  - 3. Innovation & Real-World Viability (20 pts)
  - 4. Presentation & Jury Defense (20 pts)
  - Auto-calculated Total (100 pts) and Phase 1 (60) / Phase 2 (40) mapping.
- **Multi-Judge Consensus**: Configurable number of judges (2–10). Each judge evaluates independently. Real-time dynamic updates aggregate jury average scores.
- **Unique Judge Login**:
  - Judge 1 (`J1`) | PIN: `1111`
  - Judge 2 (`J2`) | PIN: `2222`
  - Judge 3 (`J3`) | PIN: `3333`
  - Coordinator (`ADMIN`) | PIN: `2026`
- **Dynamic Leaderboard**: Live ranked table with individual judge marks, average scores, and CSV export.

## Results Reveal Stage
Open **`reveal.html`** (or use **Reveal Ceremony** on the leaderboard) for the projector ceremony.

- **EMBERS '26 fire theme**: charcoal/smoke arena, ember orange/red/gold lighting, flame watermark and rising sparks.
- Kahoot-inspired reveal: answer-tile shapes, chunky cards, drumroll suspense, confetti and crown drop.
- Sequence: **2nd Runner-Up → 1st Runner-Up → Grand Champion → Final Podium**.
- **Champion slot machine**: the final name spins through the field, fake-locks on a decoy team, holds it like the real winner for ~2 seconds, stamps **PSYCH!** with a comic womp, then snaps to the real winner at the last moment.
- **Podium finale**: the three winners get avatar "seats" on gold/silver/bronze blocks, with animated stage spotlights.
- **Auto-advance option** in the footer (Off / 6s / 10s / 15s / 20s / 30s). The countdown starts once the current winner is on screen, so it never skips a drumroll. It pauses while the standings modal is open.
- **Fullscreen presentation mode** removes the header, footer, hints and secondary text, leaving only the rank, winner name, score, crown or podium.
- Scores are held to the snapshot taken when the ceremony starts and count up on reveal. New live scores wait for a replay.
- Presenter keys: `Space` / `→` / `↓` next (or reveal immediately during a drumroll), `←` / `↑` back, `1`–`3` jump to a rank, `A` toggle auto-advance, `R` restart, `F` fullscreen, `M` mute, `C` confetti.
- `?category=OVERALL` (or `A`, `B`, `EMBEDTHON`, `HARDWARE`, `SOFTWARE`, `PAPER`) pre-selects the award category.
