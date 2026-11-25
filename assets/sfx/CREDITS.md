# Sound Effect Credits & License Audit

All audio assets in `assets/sfx/` have been normalized to `-16 LUFS`, `< -1.5 dBTP` target, `44.1 kHz` stereo, `192 kbps` MP3 (see `qa/audio_loudnorm_report.json`).

## Active Mixkit Samples (Confirmed Commercial License)
Used under the [Mixkit Sound Effects Free License](https://mixkit.co/license/#sfxFree): free for commercial and non-commercial projects, no attribution required, not redistributed as standalone assets.

| File | Mixkit Title | Mixkit SFX ID | Role in Ceremony |
| --- | --- | --- | --- |
| `whoosh-fast-1489.mp3` | Air woosh | 1489 | Step transitions & reveal accent |
| `whoosh-deep.mp3` | Cinematic whoosh deep impact | 1143 | Champion / podium transition |
| `drumroll-566.mp3` | Drum Roll | 566 | Suspense & reel bed |
| `impact-577.mp3` | Tension and suspense drum roll (5.2s slam) | 577 | Winner slam & restrained psych sting cut |
| `fanfare-horns.mp3` | Successful horns fanfare | 722 | Runner-up fanfare |
| `applause-crowd.mp3` | Medium size crowd applause | 485 | Champion & podium applause |

## Project-Supplied Files (Unconfirmed License — Flagged)
These files were supplied by the project owner without an attached commercial license certificate.

| File | Original Filename | Status |
| --- | --- | --- |
| `fake-build-riser.mp3` | `fronbondi_skegs-sfx-cinematic-reversed-snare-riser-sound-effect-503605.mp3` | **UNCONFIRMED LICENSE** — flagged in `AUDIT.md`; confirm Pixabay/Freesound license or replace before public broadcast. |
| `podium-brass.mp3` | `u_ss015dykrt-brass-fanfare-with-timpani-and-winchimes-reverberated-146260.mp3` | **UNCONFIRMED LICENSE** — flagged in `AUDIT.md`; confirm license or replace with `fanfare-horns.mp3`. |

## Retired / Removed from `SFX_URLS` (Cartoon / Game-Show / Unconfirmed)
Removed from `reveal.js` and `test-reveal.js` `SFX_URLS` and replaced with Mixkit samples + Web Audio API synthesis:
- `psych-fart.mp3` (`fart-with-reverb_NcgStsA.mp3`) — comedic/cartoon sound & unconfirmed license.
- `winner-bell.mp3` (`freesound_community-winner-bell-game-show-91932.mp3`) — game-show bell & unconfirmed license.
- `slot-payout.mp3` (`freesound_community-slot-machine-payout-81725.mp3`) — game-show payout & unconfirmed license.
- `slot-tick.mp3` (Mixkit `237` retro game click) — replaced by Web Audio triangle tick.
