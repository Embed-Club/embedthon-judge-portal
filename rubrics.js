// EMBERS / EMBEDTHON '26 — Shared Event & Rubric Definitions
// Used by the judge portal (browser global) and the serverless API (CommonJS).
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.EMBEDTHON_RUBRICS = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const EVENTS = {
    PAPER: {
      id: 'PAPER',
      track: 'TRACK_3',
      label: 'Paper Presentation',
      shortLabel: 'Paper',
      icon: '📄',
      accent: 'indigo',
      venue: 'Multipurpose Hall',
      mode: 'SINGLE',
      maxTotal: 50,
      description: 'Technical paper presentation and viva before the academic jury.',
      criteria: [
        {
          key: 'relevance',
          label: 'Relevance',
          max: 15,
          hint: 'Alignment with the theme, problem significance and research relevance.'
        },
        {
          key: 'presentation',
          label: 'Presentation',
          subtitle: 'Body gesture, confidence & delivery',
          max: 15,
          hint: 'Clarity, body language, confidence, slide quality and time control.'
        },
        {
          key: 'viva',
          label: 'Viva',
          max: 5,
          hint: 'Accuracy, depth and composure during the question-and-answer round.'
        },
        {
          key: 'innovation',
          label: 'Innovation',
          max: 15,
          hint: 'Originality of idea, technical novelty and contribution.'
        }
      ]
    },

    PROJECT_EXPO: {
      id: 'PROJECT_EXPO',
      track: 'TRACK_2',
      label: 'Project Expo',
      shortLabel: 'Project Expo',
      icon: '🛠️',
      accent: 'amber',
      venue: 'Edusat Hall',
      mode: 'SINGLE',
      maxTotal: 50,
      description: 'Working model demonstration and jury viva at the exhibition stalls.',
      criteria: [
        {
          key: 'working_model',
          label: 'Working Model',
          max: 10,
          hint: 'Functional prototype, live demo reliability and build finish.'
        },
        {
          key: 'relevance',
          label: 'Relevance',
          max: 10,
          hint: 'Problem relevance, practical applicability and real-world context.'
        },
        {
          key: 'presentation',
          label: 'Presentation',
          subtitle: 'Body gesture, confidence & delivery',
          max: 10,
          hint: 'Clarity, body language, confidence and stall presentation.'
        },
        {
          key: 'viva',
          label: 'Viva',
          max: 10,
          hint: 'Depth of understanding and accuracy during jury questions.'
        },
        {
          key: 'innovation',
          label: 'Innovation',
          max: 10,
          hint: 'Novelty, originality and differentiation from existing solutions.'
        }
      ]
    },

    EMBEDDATHON: {
      id: 'EMBEDDATHON',
      track: 'TRACK_1',
      label: 'Embeddathon',
      shortLabel: 'Embeddathon',
      icon: '⚡',
      accent: 'orange',
      venue: 'Computer Labs 1 & 2',
      mode: 'DUAL_PHASE',
      maxTotal: 100,
      description: '24-hour embedded systems hackathon with mentoring and final expo phases.',
      phases: {
        PHASE_1: {
          label: 'Mentoring',
          max: 30,
          criteria: [
            {
              key: 'p1_problem',
              label: 'Problem Understanding & Solution Scope',
              max: 10,
              hint: 'Clarity of use case and engineering requirement definition.'
            },
            {
              key: 'p1_progress',
              label: 'Implementation Progress & Technical Feasibility',
              max: 10,
              hint: 'Circuit sanity, milestone completion and component selection.'
            },
            {
              key: 'p1_teamwork',
              label: 'Team Engagement & Execution Discipline',
              max: 10,
              hint: 'Mentoring feedback adoption and workload split among members.'
            }
          ]
        },
        PHASE_2: {
          label: 'Final Expo',
          max: 70,
          criteria: [
            {
              key: 'p2_prototype',
              label: 'Working Prototype & Live Demo Stability',
              max: 25,
              hint: 'Operational reliability, live demo test and hardware accuracy.'
            },
            {
              key: 'p2_complexity',
              label: 'Technical Complexity & Architecture',
              max: 20,
              hint: 'Circuit design, firmware quality and integration depth.'
            },
            {
              key: 'p2_innovation',
              label: 'Innovation & Real-World Viability',
              max: 15,
              hint: 'Novelty, practical applicability and societal relevance.'
            },
            {
              key: 'p2_defense',
              label: 'Presentation Quality & Jury Defense',
              max: 10,
              hint: 'Chart/slide quality and precision during jury Q&A.'
            }
          ]
        }
      }
    }
  };

  const EVENT_ORDER = ['PAPER', 'PROJECT_EXPO', 'EMBEDDATHON'];

  const TRACK_TO_EVENT = {
    TRACK_1: 'EMBEDDATHON',
    TRACK_2: 'PROJECT_EXPO',
    TRACK_3: 'PAPER'
  };

  function getEvent(eventId) {
    return EVENTS[String(eventId || '').toUpperCase()] || EVENTS.EMBEDDATHON;
  }

  function getEventByTrack(track) {
    return EVENTS[TRACK_TO_EVENT[String(track || '').toUpperCase()]] || null;
  }

  function quickValues(max) {
    const m = Number(max) || 10;
    if (m <= 5) return [Math.ceil(m * 0.4), Math.ceil(m * 0.6), Math.ceil(m * 0.8), m];
    if (m <= 10) return [Math.round(m * 0.4), Math.round(m * 0.6), Math.round(m * 0.8), m];
    return [Math.round(m * 0.4), Math.round(m * 0.6), Math.round(m * 0.8), m];
  }

  function blankScores(eventId) {
    const event = getEvent(eventId);
    const out = {};
    (event.criteria || []).forEach(function (c) {
      out[c.key] = 0;
    });
    return out;
  }

  function scoreSingle(eventId, scores) {
    const event = getEvent(eventId);
    const clean = {};
    let total = 0;
    (event.criteria || []).forEach(function (c) {
      const raw = Number(scores && scores[c.key] !== undefined ? scores[c.key] : 0);
      const value = Math.min(c.max, Math.max(0, Number.isFinite(raw) ? raw : 0));
      clean[c.key] = Number(value.toFixed(1));
      total += clean[c.key];
    });
    return { scores: clean, total: Number(total.toFixed(1)) };
  }

  return {
    EVENTS: EVENTS,
    EVENT_ORDER: EVENT_ORDER,
    TRACK_TO_EVENT: TRACK_TO_EVENT,
    getEvent: getEvent,
    getEventByTrack: getEventByTrack,
    quickValues: quickValues,
    blankScores: blankScores,
    scoreSingle: scoreSingle
  };
});
