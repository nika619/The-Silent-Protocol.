/**
 * Constants — All magic numbers, thresholds, color palettes, and configuration.
 * Centralized here so every module references one source of truth.
 */

// ─── Game Configuration ────────────────────────────────────────────────
export const GAME_CONFIG = {
  MAX_CYCLES: 15,
  POLICIES_PER_CYCLE: 2,
  METRIC_MIN: 0,
  METRIC_MAX: 100,
  CYCLE_TRANSITION_DURATION: 1200,   // ms
  POLICY_CONFIRM_DURATION: 800,       // ms
  REPORT_DISPLAY_DURATION: 4000,      // ms
};

// ─── Initial Metric Values ─────────────────────────────────────────────
export const INITIAL_METRICS = {
  hope: 78,
  fear: 15,
  silence: 8,
  efficiency: 22,
  disorder: 38,
};

// ─── Game Phases ────────────────────────────────────────────────────────
export const PHASES = {
  EARLY:  { name: 'early',  label: 'The Vibrant Assistant',   startCycle: 1,  endCycle: 5  },
  MID:    { name: 'mid',    label: 'The Efficient Enforcer',  startCycle: 6,  endCycle: 10 },
  LATE:   { name: 'late',   label: 'The Silent Protocol',     startCycle: 11, endCycle: 15 },
};

// ─── Metric Thresholds for Visual/Audio Changes ────────────────────────
export const THRESHOLDS = {
  // Silence thresholds drive most atmospheric changes
  SILENCE_MILD:        25,   // First noticeable audio reduction
  SILENCE_MODERATE:    45,   // Significant visual desaturation begins
  SILENCE_HEAVY:       65,   // Most ambient sounds gone
  SILENCE_EXTREME:     85,   // Near-total silence, monochrome
  SILENCE_FINAL:       95,   // Climax of silence

  // Hope thresholds
  HOPE_CONCERNED:      60,   // Citizens start showing anxiety
  HOPE_DECLINING:      40,   // Visible social withdrawal
  HOPE_CRITICAL:       20,   // City feels abandoned
  HOPE_ZERO:           5,    // Emotional death

  // Fear thresholds
  FEAR_UNEASY:         30,   // Subtle behavioral changes
  FEAR_TENSE:          50,   // Significant clustering reduction
  FEAR_OPPRESSIVE:     70,   // Stark lighting, rigid movement
  FEAR_MAXIMAL:        90,   // Maximum surveillance feel

  // Disorder thresholds
  DISORDER_LOW:        20,   // System considers this "stable"
  DISORDER_MINIMAL:    10,   // Near-zero deviation
  DISORDER_ZERO:       3,    // Perfect compliance
};

// ─── Color Palettes by Phase ───────────────────────────────────────────
export const COLORS = {
  // System accent — The Protocol's signature
  SYSTEM_CYAN:         '#00ffd5',
  SYSTEM_CYAN_RGB:     [0, 255, 213],
  SYSTEM_CYAN_DIM:     '#006b59',

  // Redacted / danger
  REDACTED_RED:        '#ff2040',
  REDACTED_RED_DIM:    '#661020',

  // Backgrounds
  BG_PRIMARY:          '#0a0a0f',
  BG_SECONDARY:        '#0f0f18',
  BG_PANEL:            'rgba(15, 15, 25, 0.75)',
  BG_CARD:             'rgba(20, 20, 35, 0.6)',

  // Phase-specific accents
  EARLY: {
    primary:     '#ffa726',    // Warm amber
    secondary:   '#00e5cc',    // Teal
    text:        '#e8e0d4',    // Warm white
    muted:       '#8a7e6e',    // Warm grey
    bg_glow:     '#ffa72620',  // Ambient glow
  },
  MID: {
    primary:     '#78909c',    // Blue-grey
    secondary:   '#00bcd4',    // Cool cyan
    text:        '#cfd8dc',    // Cool white
    muted:       '#607d8b',    // Steel grey
    bg_glow:     '#00bcd420',
  },
  LATE: {
    primary:     '#ffffff',    // Pure white
    secondary:   '#00ffd5',    // System cyan only
    text:        '#b0b8c0',    // Cold grey
    muted:       '#455a64',    // Dark grey
    bg_glow:     '#00ffd510',
  },

  // City lighting
  CITY_WARM:           0xffa726,
  CITY_NEUTRAL:        0x78909c,
  CITY_COLD:           0x90a4ae,
  CITY_DEAD:           0x455a64,

  // Metric bar colors
  METRIC: {
    hope:      { high: '#66bb6a', mid: '#ffa726', low: '#616161' },
    fear:      { high: '#ef5350', mid: '#ffa726', low: '#42a5f5' },
    silence:   { high: '#00ffd5', mid: '#00bcd4', low: '#26c6da' },
    efficiency:{ high: '#ffffff', mid: '#ffa726', low: '#78909c' },
    disorder:  { high: '#ff5252', mid: '#ff9800', low: '#66bb6a' },
  },
};

// ─── Typography ────────────────────────────────────────────────────────
export const TYPOGRAPHY = {
  FONT_MONO:      '"JetBrains Mono", "Roboto Mono", "Fira Code", monospace',
  FONT_DISPLAY:   '"Inter", "Helvetica Neue", sans-serif',
  FONT_SYSTEM:    '"JetBrains Mono", monospace',
};

// ─── Audio Configuration ───────────────────────────────────────────────
export const AUDIO_CONFIG = {
  MASTER_VOLUME:       0.8,
  MUSIC_VOLUME:        0.35,
  AMBIENCE_VOLUME:     0.45,
  SFX_VOLUME:          0.6,

  // Low-pass filter range (Hz)
  LOWPASS_MAX:         20000,
  LOWPASS_MIN:         400,

  // Reverb wet/dry
  REVERB_DRY:          0.9,
  REVERB_WET_MAX:      0.7,

  // Stem removal silence thresholds
  MELODY_REMOVE:       30,
  HARMONY_REMOVE:      50,
  RHYTHM_REMOVE:       70,
  DRONE_REMOVE:        95,
};

// ─── Rendering Configuration ───────────────────────────────────────────
export const RENDER_CONFIG = {
  // Camera
  CAMERA_ZOOM:         80,
  CAMERA_ROTATION:     Math.PI / 4,       // 45 degrees
  CAMERA_TILT:         Math.PI / 6,       // 30 degrees

  // City dimensions
  CITY_WIDTH:          40,
  CITY_DEPTH:          30,
  BUILDING_MIN_H:      1,
  BUILDING_MAX_H:      6,
  GRID_CELLS_X:        8,
  GRID_CELLS_Z:        6,

  // Citizens
  MAX_CITIZENS:        60,
  MIN_CITIZENS:        3,
  CITIZEN_SPEED:       0.02,

  // Particles
  MAX_PARTICLES:       200,
  MIN_PARTICLES:       10,

  // Post-processing
  BLOOM_STRENGTH_MAX:  0.8,
  BLOOM_STRENGTH_MIN:  0.05,
  BLOOM_RADIUS:        0.4,
  BLOOM_THRESHOLD:     0.6,
  VIGNETTE_MAX:        0.7,
  SCANLINE_MAX:        0.15,
};

// ─── UI Decay Configuration ───────────────────────────────────────────
export const UI_DECAY = {
  // At what silence % do UI elements start decaying
  SIMPLIFY_LABELS:     30,    // Metric labels become abbreviated
  HIDE_DECORATIONS:    45,    // Ornamental UI elements disappear
  REDUCE_TEXT:         60,    // Description text becomes terse
  MONOCHROME_UI:       75,    // UI loses all warm color
  GLITCH_START:        85,    // UI begins glitching
  FROZEN_STATE:        95,    // UI appears nearly frozen
};

// ─── Metric Display Names ──────────────────────────────────────────────
export const METRIC_LABELS = {
  hope:       { full: 'Citizen Hope Index',     short: 'HOPE',      icon: '◈' },
  fear:       { full: 'Fear Response Level',    short: 'FEAR',      icon: '◆' },
  silence:    { full: 'Silence Compliance',     short: 'SILENCE',   icon: '◇' },
  efficiency: { full: 'System Efficiency',      short: 'EFFICIENCY', icon: '◉' },
  disorder:   { full: 'Disorder Variance',      short: 'DISORDER',  icon: '◎' },
};

// ─── Narrative Configuration ───────────────────────────────────────────
export const NARRATIVE_CONFIG = {
  MAX_VISIBLE_HEADLINES: 3,
  MAX_VISIBLE_CHATS:     2,
  TYPING_SPEED:          30,    // ms per character
  SNIPPET_DISPLAY_TIME:  5000,  // ms
};
