# EMBERS '26 National Readiness Audit (`AUDIT.md`)

**Branch:** `fix/embers26-national-readiness` (created from `main` at `9056200`)  
**Separate Auth PR Branch (Unmerged, Awaiting Approval):** `fix/auth-env-secrets` (`7d99511`)  
**Rollback Commit (Last Known Good on `main`):** `9056200` (`Embed-Club/embedthon-judge-portal`) / `5f6176a` (root `EmbedThon`)

---

## Task 0: Security & Privacy Audit (Blocking)

### 1. Hardcoded Secrets Inventory
| Severity | Secret / Default | Evidence (File & Line) | What Changed / Status |
| :--- | :--- | :--- | :--- |
| **Critical** | Admin PIN `'5012'` | `api/config.js:5,71`, `api/login.js:5,78,84`, `api/embers.js:185`, `api/reset.js:21,28`, `admin.js:20,179,1284`, `app.js:36`, `embers.js:94,137,171` | Removed from `fix/auth-env-secrets` (`7d99511`), replaced by `requireEnv('ADMIN_PIN')`. **Needs owner approval to merge.** |
| **Critical** | Fallback Admin PIN `'2026'` | `api/login.js:84` | Removed in `fix/auth-env-secrets` (`7d99511`). |
| **Critical** | Judge PINs `'1111'`–`'8888'` & client fallbacks (`'3842'`, `'7195'`, etc.) | `api/config.js:7-16`, `api/login.js:7-16`, `app.js:38-45` | Moved to `JUDGE_PINS_JSON` env var in `fix/auth-env-secrets`; stripped from `GET /api/config`. |
| **Critical** | Webhook Token `'EMBERS_SYNC_2026'` | `api/embers.js:184`, `embers.js:167,174,182` | Moved to `requireEnv('EMBERS_WEBHOOK_TOKEN')` in `fix/auth-env-secrets`. |
| **High** | Default Gist ID `'2b29e588ffd6188fe866e10b0fffc6c7'` | `api/_gist.js:5` | Moved to `requireEnv('GIST_ID')` with loud startup error (`validateAuthEnv()`) in `fix/auth-env-secrets`. |

### 2. Student PII & Privacy Incident (DPDP Act 2023)
| Severity | Finding | Evidence | Status / Decision Needed |
| :--- | :--- | :--- | :--- |
| **Critical** | Student names, USNs, phone numbers, WhatsApp links, and emails stored in git and served unauthenticated | `api/registrations.json:1-5316` (404 direct on Vercel `api/`, **but** served at `GET /api/embers` HTTP 200, 165,167 bytes); `teams.js` served publicly at `/teams.js` HTTP 200 (189,216 bytes) | **Nothing deleted.** Under India's **Digital Personal Data Protection Act, 2023 (Sections 4–6, 8(5)–(7), 12)**: (1) `GET /api/embers` PII is redacted when unauthenticated in `fix/auth-env-secrets`; (2) **Decision needed:** approve stripping `phone`/`email`/`tel_link`/`wa_link`/`email_link` from `teams.js` & moving `api/registrations.json` to private admin-only storage, and assess DPDP Section 8(6) breach notice if repo/URLs were public. |

### 3. Unauthenticated Endpoints & Login Brute-Force Exposure
| Severity | Finding | Evidence | Status |
| :--- | :--- | :--- | :--- |
| **Critical** | `POST /api/evaluations` had zero auth | `api/evaluations.js:129-173` | Fixed in `fix/auth-env-secrets` (`7d99511`): requires signed HMAC `sessionToken` or `ADMIN_PIN`. |
| **Critical** | `GET /api/config` leaked `adminPin` & all judge PINs | `api/config.js:60-65` | Fixed in `fix/auth-env-secrets`: `stripSecretsFromConfig()` strips all PINs. |
| **High** | `POST /api/login` had no rate limiting (4-digit PINs) | `api/login.js:30-161` | Fixed in `fix/auth-env-secrets`: sliding-window rate limiter (`5` failed attempts / 15 min -> `HTTP 429`). |

### 4. Mobile Session Persistence & `admin.html` Auth Bypass Review (`431c7f7` on `fix/auth-env-secrets`)
| Severity | Finding | Evidence (File & Line) | Remediation in `fix/auth-env-secrets` (`431c7f7`) |
| :--- | :--- | :--- | :--- |
| **Critical** | `admin.html` auto-unlocked from client `localStorage` (`embedthon_admin_auth`) with zero expiry, zero signature, and zero server check — leaving Chrome and returning bypassed the PIN gate indefinitely | `admin.js:111-121` | Removed `localStorage` auto-unlock; `admin.js` & `embers.js` now verify server-signed `HttpOnly; Secure; SameSite=Strict` cookie (`embers_session`, 30-min Admin TTL) via `GET /api/session`. |
| **Critical** | `admin.js` fetched config, evaluations, and student PII (`fetchEmbersLogistics()`) BEFORE checking authentication | `admin.js:100-108` | Moved all data fetches inside `unlockConsole()`, which runs only after `/api/session` or `/api/login` succeeds. |
| **High** | Mobile Chrome bfcache & background tab suspension kept unlocked admin DOM & `sessionStorage` alive when leaving Chrome and returning | `admin.js`, `embers.js`, `vercel.json` | Added `visibilitychange` (`>= 10s` background -> `lockConsole(true)` + `DELETE /api/session`), `pageshow` (`persisted` -> re-lock & re-verify), 10-min idle timeout, and `Cache-Control: no-store, no-cache, must-revalidate, private` + `X-Frame-Options: DENY` headers in `vercel.json`. |

---

## Task 1: Reveal Ceremony Analysis & Redesign

### Pre-Change Analysis (Baseline `5e7884b` -> `9056200`)
- **Unique per track previously:** Only the 1st-prize animation mode (`PAPER`=`decrypt`, `HARDWARE`=`elimination`, `SOFTWARE`=`stamp`, `EMBEDDATHON`=`slot`).
- **Repeated across tracks:** Same welcome screen copy/stripe palette, missing college name on winning cards (`reveal.js:826-850`), comedic `psych-fart.mp3` + `"PSYCH! Just kidding"` / `"NOPE! PSYCH!"` / `"CORRUPTED PACKET"` copy, and psych decoy firing on 3rd/2nd/1st across multiple tracks without a per-rank config flag.

### Changes Implemented (`03a3bac`)
- **4-Prize Running Order & Distinct Identities (`reveal.js`, `reveal.html`, `reveal-theme.css`):**
  1. **Paper Presentation (`PAPER`)** — Indigo (`#6366f1`) — Warm-up
  2. **Hardware Project (`HARDWARE`)** — Amber (`#f59e0b`) — Showcase
  3. **Software Project (`SOFTWARE`)** — Emerald (`#10b981`) — Escalation
  4. **Embeddathon (`EMBEDDATHON`)** — Ember/Gold (`#ea580c`) — Grand Finale
- **Psych Beat Controls:** `PSYCH_CONFIG` enables psych beat on **only 2 ranks** (`HARDWARE` 1st & `EMBEDDATHON` 1st), toggleable live via `#btnPsychToggle` (`PSYCH ON/OFF`). Decoys are drawn only from same-track finalists, display **team name only** for `600ms`, use one restrained `stingCut()`, and hard-cut cleanly to the real winner with zero decoy state retained.
- **Hall Legibility:** Added `.rv-college` to `.rv-card` and `.rv-podium-player`, plus `#btnProjectorToggle` (`1920x1080` large-text projector mode).
- **Production Separation:** `reveal.js` never loads fake/rehearsal data; `test-reveal.html` / `test-reveal.js` remain isolated and unlinked from public navigation.

---

## Task 2: Layout Verification (`3661508`)
- **Test Coverage:** `qa/verify_layouts.py` tested `360x800`, `768x1024`, `1280x720`, and `1920x1080` (with large-text projector mode) across all 4 prizes (`PAPER`, `HARDWARE`, `SOFTWARE`, `EMBEDDATHON`) x 4 steps (`3rd`, `2nd`, `1st`, `podium`) = **64 checks**, plus `M` mute and `End` skip shortcuts. Screenshots saved in `qa/screenshots/`.
- **Failure Found & Fixed:**
  - **Medium:** `[360x800 EMBEDDATHON 1st]` had `.rv-card` right-edge clipping (`cardClipped: true`) due to missing `box-sizing: border-box` and `calc(100vw - 24px)` cap (`reveal-theme.css:847-850`).
  - **Medium:** `body.is-fullscreen .rv-project { display: none !important; }` hid project titles in fullscreen (`reveal-theme.css:1897`).
- **Final Result:** **64/64 checks PASS**, `0` horizontal overflows, `0` clipped cards, `0` console/page errors.

---

## Task 3: Audio Audit & Normalization (`5f74c01`)
- **Removed Comedic / Game-Show / Unconfirmed Sounds from `SFX_URLS`:** Retired `psych-fart.mp3`, `winner-bell.mp3`, `slot-payout.mp3`, `slot-tick.mp3`, `fake-build-riser.mp3`, and `podium-brass.mp3` from `reveal.js` and `test-reveal.js`; 100% of active `SFX_URLS` now use Mixkit commercial-license SFX (`fanfare-horns.mp3`, `drumroll-566.mp3`, `impact-577.mp3`, `whoosh-fast-1489.mp3`, `whoosh-deep.mp3`, `applause-crowd.mp3`) + Web Audio API synthesis.
- **No `AudioContext` on Load:** `audio.preload()` decodes via `OfflineAudioContext`; live `AudioContext` initializes only on user gesture. Mute (`M` key & button) persists in `sessionStorage` (`embers_reveal_muted`) across `reveal.js`, `test-reveal.js`, and `app.js` (`CeremonyAudioEngine.toggleMute()` inversion bug fixed at `app.js:2584-2587`).
- **FFmpeg Loudnorm (`-16 LUFS`, `< -1.5 dBTP`, `44.1 kHz` stereo, `192 kbps`):**
  - `applause-crowd.mp3`: `-16.76 LUFS / -1.72 dBTP` -> `-16.45 LUFS / -1.44 dBTP`
  - `drumroll-566.mp3`: `-15.80 LUFS / -0.68 dBTP` -> `-16.00 LUFS / -1.26 dBTP`
  - `fake-build-riser.mp3`: `-16.25 LUFS / -2.15 dBTP` -> `-16.28 LUFS / -2.08 dBTP`
  - `fanfare-horns.mp3`: `-16.28 LUFS / -3.57 dBTP` -> `-16.25 LUFS / -3.48 dBTP`
  - `impact-577.mp3`: `-16.33 LUFS / -1.67 dBTP` -> `-16.34 LUFS / -2.12 dBTP`
  - `podium-brass.mp3`: `-16.38 LUFS / -2.76 dBTP` -> `-16.36 LUFS / -1.71 dBTP`
  - `whoosh-deep.mp3`: `-13.67 LUFS / -0.38 dBTP` -> `-14.63 LUFS / -1.76 dBTP`
  - `whoosh-fast-1489.mp3`: `-18.05 LUFS / -1.46 dBTP` -> `-18.35 LUFS / -1.87 dBTP`

---

## Task 4: Reliability Under Live Load (`8057a64`)
- **Idempotency & Concurrent Writes (`api/evaluations.js:145-190`):** Added `idempotencyKey` deduplication and a 2-attempt fresh-Gist merge-and-retry loop so concurrent judge submissions never overwrite each other or double-count.
- **Client Retry & Offline Queue (`app.js:630-678, 1743-1748`):** Added `postEvaluationWithRetry()` (3 attempts, exponential backoff) and `embers_pending_eval_queue` in `localStorage`, auto-flushing on `online` and `syncDataSilently()`.
- **Reveal Resilience (`reveal.js`):** Added network-offline fallback badge (`NETWORK OFFLINE · RETRYING SYNC`), `sessionStorage` ceremony step resume (`embers_reveal_state`), and `End` / `Shift+Enter` manual override to jump straight to the real result.

---

## Task 5: Accessibility & SEO
- Removed `maximum-scale=1.0, user-scalable=no` from `index.html` and `reveal.html` (WCAG 2.1 AA 1.4.4 zoom compliance).
- Added Open Graph (`og:*`) and `twitter:card` metadata to `index.html` and `reveal.html`.
- Added visible `:focus-visible` outlines (`3px solid #ffd166`) and `aria-label` / `aria-pressed` attributes on reveal controls (`reveal-theme.css`, `reveal.html`, `test-reveal.html`).
- Verified `0` JS errors and `0` broken static assets across `index.html`, `reveal.html`, `admin.html`, and `embers.html`.

---

## Ceremony Running Order (4 Prizes)
| Order | Prize Track | Accent | 3rd Place | 2nd Place | 1st Place Finale | Psych Beat | Max Intro |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| 1 | **Paper Presentation** (`PAPER`) | `#6366f1` | `stamp` (2.2s, chime) | `elimination` (2.7s, horns) | `decrypt` (2.5s, impact + applause) | **OFF** | 2.0s |
| 2 | **Hardware Project** (`HARDWARE`) | `#f59e0b` | `decrypt` (2.5s, chime) | `stamp` (2.2s, horns) | `elimination` (3.1s, `stingCut` + impact + applause) | **ON (1st only, 0.6s)** | 2.2s |
| 3 | **Software Project** (`SOFTWARE`) | `#10b981` | `elimination` (2.7s, chime) | `decrypt` (2.5s, horns) | `stamp` (2.6s, impact + applause) | **OFF** | 2.2s |
| 4 | **Embeddathon** (`EMBEDDATHON`) | `#ea580c` | `stamp` (2.2s, chime) | `elimination` (2.7s, horns) | `slot` (3.3s, `stingCut` + impact + applause) | **ON (1st only, 0.6s)** | 2.2s |

---

## Go-Live Checklist
1. **Review & Merge Auth PR:** Approve and merge `fix/auth-env-secrets` (`7d99511`) after setting all 6 Vercel env vars (`GITHUB_TOKEN`, `GIST_ID`, `ADMIN_PIN`, `EMBERS_WEBHOOK_TOKEN`, `JUDGE_PINS_JSON`, `SESSION_SECRET`).
2. **Rotate All PINs:** Replace `5012`, `2026`, `1111`–`8888`, and `EMBERS_SYNC_2026` in Vercel env vars and Gist `config.json`.
3. **Approve PII Cleanup:** Confirm stripping `phone`/`email`/`wa_link` from `teams.js` and moving `api/registrations.json` out of git.
4. **Confirm Audio Licenses:** Confirm commercial license for `fake-build-riser.mp3` & `podium-brass.mp3` (or swap to Mixkit `fanfare-horns.mp3`).
5. **Dry-Run Script (Test Data Only):**
   - Open `/test-reveal.html` (never `/reveal.html`) on projector (`1920x1080`).
   - Click `📺 Projector` and `⛶ Fullscreen`, verify `🔊 SOUND ON`, test `M` mute toggle.
   - Run through `PAPER` -> `HARDWARE` -> `SOFTWARE` -> `EMBEDDATHON` (`0 -> 1 -> 2 -> 3 -> 4`), verifying `⚡ PSYCH ON` and `⏸️ PSYCH OFF` toggle + `End` skip key.

## Rollback Plan
- If anything breaks on event day, revert `main` to last known good commit:
  - `judge-portal`: `git revert` or `git reset --hard 9056200`
  - Root `EmbedThon`: `5f6176a`
  - Re-run `npx vercel --prod --force --yes` in `judge-portal`.
