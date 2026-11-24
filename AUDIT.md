# EMBERS '26 National Readiness Audit (`AUDIT.md`)

**Branch:** `fix/embers26-national-readiness` (created from `main` at `9056200`)  
**Rollback Commit (Last Known Good on `main`):** `9056200` (subproject `judge-portal`) / `5f6176a` (root `EmbedThon`)

---

## Task 0: Security & Privacy Audit (Blocking)

### 1. Hardcoded Secrets Inventory
All of the following secrets were found hardcoded in `main` (`9056200`):

| Severity | Secret / Default | File & Line(s) | Exposure Risk |
| :--- | :--- | :--- | :--- |
| **Critical** | Admin PIN `'5012'` | `api/config.js:5,71`, `api/login.js:5,78,84`, `api/embers.js:185`, `api/reset.js:21,28`, `admin.js:20,179,1284`, `app.js:36`, `embers.js:94,137,171` | Full admin/coordinator takeover, score reset, judge PIN modification |
| **Critical** | Fallback Admin PIN `'2026'` | `api/login.js:84` | Secondary hardcoded admin bypass |
| **Critical** | Judge PINs `'1111'`–`'8888'` (and `'3842'`, `'7195'`, etc.) | `api/config.js:7-16`, `api/login.js:7-16`, `app.js:38-45` | Impersonation of any internal/external judge; plaintext PINs also returned by `GET /api/config` |
| **Critical** | Webhook Token `'EMBERS_SYNC_2026'` | `api/embers.js:184`, `embers.js:167,174,182` | Unauthorized registration/schedule sync & modification |
| **High** | Default Gist ID `'2b29e588ffd6188fe866e10b0fffc6c7'` | `api/_gist.js:5` | Exposes cloud datastore identifier in repo |

### 2. Separate Auth PR (`fix/auth-env-secrets`, commit `7d99511`)
- **Status:** Pushed to `origin/fix/auth-env-secrets` — **NOT merged** (awaiting owner approval).
- **What changed in `fix/auth-env-secrets`:**
  - Added `api/_auth.js` with `requireEnv()` and `validateAuthEnv()` startup check (fails loudly with `[AUTH_STARTUP_ERROR]` if any required env var is missing; zero fallbacks).
  - Removed all hardcoded PINs and tokens from `api/_gist.js`, `api/config.js`, `api/login.js`, `api/embers.js`, `api/evaluations.js`, `api/reset.js`, `admin.js`, `app.js`, and `embers.js`.
  - Stripped `adminPin` and judge `pin` fields from `GET /api/config` (`stripSecretsFromConfig`).
  - Added HMAC-signed `sessionToken` (`SESSION_SECRET`) and sliding-window rate limiting on `POST /api/login` (`5` failed attempts per IP+judgeId per 15 min -> `HTTP 429`).
  - Protected `POST /api/evaluations` and `GET /api/embers` (redacts PII when unauthenticated).

#### Exact Vercel Environment Variables Required Before Merging Auth PR
1. `GITHUB_TOKEN` — Fine-grained GitHub PAT with `gist` write scope only.
2. `GIST_ID` — Target GitHub Gist ID (rotated to a fresh private Gist if needed).
3. `ADMIN_PIN` — New 8+ character alphanumeric/PIN coordinator secret (never `5012` or `2026`).
4. `EMBERS_WEBHOOK_TOKEN` — Random 32-byte hex/base64 secret for Google Sheet/form sync.
5. `JUDGE_PINS_JSON` — JSON object mapping judge IDs to newly rotated 6+ digit PINs, e.g. `{"INT-1":"...","INT-2":"...","EXT-1":"..."}`.
6. `SESSION_SECRET` — Random 64-byte hex secret (`openssl rand -hex 32`) for HMAC session tokens.

#### PIN Rotation Steps
1. Set all 6 Vercel env vars above in **Vercel Project Settings -> Environment Variables** (Production & Preview).
2. Update `config.json` in the backing GitHub Gist to remove old `1111`–`8888` / `5012` values or rotate them via the Admin Console after deploying `fix/auth-env-secrets`.
3. Distribute new per-judge PINs privately to each evaluator on event morning; invalidate any cached `localStorage`/`sessionStorage` sessions.

### 3. Student PII & Privacy Incident (`api/registrations.json`, `teams.js`, `GET /api/embers`)
- **Severity:** **Critical (Privacy Incident)**
- **Findings:**
  - `api/registrations.json` (5,316 lines) contains student full names, USNs, phone numbers, WhatsApp links (`wa.me`), and institutional email addresses (`@pace.edu.in`, etc.).
  - Direct `GET https://embers26.vercel.app/api/registrations.json` returned an error (`404` on Vercel serverless `api/` directory), **HOWEVER** `GET /api/embers` (`api/embers.js:23,171-176`) returns **HTTP 200 (165,167 bytes)** with the entire `registrations.json` PII payload unauthenticated!
  - `GET https://embers26.vercel.app/teams.js` returns **HTTP 200 (189,216 bytes)** publicly with team member names, phones, emails, and USNs.
- **DPDP Act 2023 (India) Obligations (Needs Owner Decision — Nothing Deleted):**
  - Under India's **Digital Personal Data Protection Act, 2023 (Sections 4, 5, 6, 8, 12)**:
    1. **Notice & Consent:** Student personal data (phone/email/USN) collected for event registration may only be processed for that stated purpose with clear notice; public exposure on an unauthenticated endpoint/static file violates **Section 8(5)** (reasonable security safeguards to prevent personal data breach).
    2. **Breach Notification (Section 8(6)):** If personal data was exposed publicly (e.g. if repo was public or unauthenticated `/api/embers` & `/teams.js` were crawled), the Data Fiduciary (PACE / Embed Club) must assess and notify the Data Protection Board of India and affected students as required.
    3. **Data Minimization & Erasure (Section 8(7) / Section 12):** Remove `phone`, `email`, `tel_link`, `wa_link`, and `email_link` from public `teams.js` and `api/registrations.json` (keep only non-PII team/project metadata for judging/reveal, or move PII strictly behind authenticated admin storage and delete after event retention window).
  - **Action awaiting approval:** Approve removing PII fields from `teams.js` and moving `api/registrations.json` out of git into private Gist/authenticated storage.

### 4. Unauthenticated Endpoints & Brute-Force Test Results
- `GET /api/config` -> **HTTP 200** unauthenticated — leaks `adminPin` and all judge PINs in plaintext (`api/config.js:60-65`).
- `GET /api/embers` -> **HTTP 200** unauthenticated — leaks all student PII (`api/embers.js:171-177`).
- `POST /api/evaluations` -> **HTTP 200** unauthenticated — **zero auth check** (`api/evaluations.js:129-173`); anyone can submit/overwrite judge scores.
- `POST /api/embers` (`action: 'spot_registration'`) -> intentionally unauthenticated for spot registration, but lacks rate limiting or input size caps.
- `POST /api/login` -> **zero rate limiting** (`api/login.js:30-161`); 4-digit PINs (`10,000` combinations) are trivially brute-forceable.
