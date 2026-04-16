/**
 * GameState — Central singleton managing all game state.
 * Every module reads from and writes to this state.
 * Changes are broadcast via EventBus for reactive updates.
 */

import { eventBus } from './EventBus.js';
import { INITIAL_METRICS, GAME_CONFIG, PHASES, THRESHOLDS } from './Constants.js';

class GameState {
  constructor() {
    this._initialized = false;
    this.reset();
  }

  /**
   * Reset all state to initial values.
   */
  reset() {
    // ─── Core Metrics ────────────────────────────────────
    this.metrics = { ...INITIAL_METRICS };

    // ─── Cycle Tracking ──────────────────────────────────
    this.currentCycle = 0;
    this.maxCycles = GAME_CONFIG.MAX_CYCLES;

    // ─── Phase Tracking ──────────────────────────────────
    this.currentPhase = PHASES.EARLY;

    // ─── Policy History (for recap) ──────────────────────
    this.policyHistory = [];          // { policy, cycle, metricsSnapshot }
    this.rejectedPolicies = [];       // { policy, cycle }

    // ─── Threshold Tracking ──────────────────────────────
    this.firedThresholds = new Set();

    // ─── Game Flow State ─────────────────────────────────
    this.state = 'idle';  // idle | onboarding | playing | report | selecting | recap
    this.isGameOver = false;

    // ─── Derived Values (cached) ─────────────────────────
    this._vitality = 1.0;            // 0–1, drives EKG heartbeat
    this._decayPercent = 0;          // 0–100, overall decay
    this._atmosphereParams = {};      // Cached for shaders

    this._recalculateDerived();
  }

  /**
   * Initialize the game state and emit the start event.
   */
  init() {
    if (this._initialized) return;
    this._initialized = true;
    this.reset();
    eventBus.emit('game:initialized', this.getSnapshot());
  }

  /**
   * Start the game (after onboarding).
   */
  start() {
    this.state = 'playing';
    this.currentCycle = 1;
    this._updatePhase();
    eventBus.emit('game:started', this.getSnapshot());
    eventBus.emit('cycle:advanced', { cycle: this.currentCycle, phase: this.currentPhase });
  }

  // ─── Metric Operations ─────────────────────────────────────────────

  /**
   * Apply metric changes from a policy.
   * @param {Object} effects — { hope: -5, fear: +10, ... }
   */
  applyEffects(effects) {
    const previous = { ...this.metrics };

    for (const [key, delta] of Object.entries(effects)) {
      if (key in this.metrics) {
        this.metrics[key] = this._clamp(this.metrics[key] + delta);
      }
    }

    this._recalculateDerived();

    eventBus.emit('metrics:changed', {
      current: { ...this.metrics },
      previous,
      deltas: effects,
      cycle: this.currentCycle,
    });

    // ─── FIX 5: Variable Ending Checks ─────────────────────────
    this._checkCriticalThresholds();
  }

  /**
   * Record a policy selection.
   * @param {Object} policy — The chosen policy object
   * @param {Array} alternatives — The rejected policy objects
   */
  recordPolicy(policy, alternatives = []) {
    this.policyHistory.push({
      policy: { ...policy },
      cycle: this.currentCycle,
      metricsSnapshot: { ...this.metrics },
    });

    alternatives.forEach(alt => {
      this.rejectedPolicies.push({
        policy: { ...alt },
        cycle: this.currentCycle,
      });
    });

    eventBus.emit('policy:selected', {
      policy,
      alternatives,
      cycle: this.currentCycle,
    });
  }

  /**
   * Abort a recently selected policy, restoring previous state.
   */
  abortPolicy(policy, metricsBefore, alternatives = []) {
    // Restore metrics
    this.metrics = { ...metricsBefore };
    this._recalculateDerived();

    // Remove from history
    this.policyHistory = this.policyHistory.filter(h => h.policy.id !== policy.id || h.cycle !== this.currentCycle);
    
    // Remove rejected alternatives
    const altIds = alternatives.map(a => a.id);
    this.rejectedPolicies = this.rejectedPolicies.filter(r => r.cycle !== this.currentCycle || !altIds.includes(r.policy.id));

    eventBus.emit('metrics:changed', {
      current: { ...this.metrics },
      previous: { ...this.metrics }, // no delta
      deltas: {},
      cycle: this.currentCycle,
      isUndo: true
    });
  }

  /**
   * Advance to the next cycle.
   */
  advanceCycle() {
    if (this.currentCycle >= this.maxCycles) {
      this.endGame();
      return;
    }

    this.currentCycle++;
    const previousPhase = this.currentPhase;
    this._updatePhase();

    if (previousPhase.name !== this.currentPhase.name) {
      eventBus.emit('phase:changed', {
        previous: previousPhase,
        current: this.currentPhase,
        cycle: this.currentCycle,
      });
    }

    this._applyCascadingEffects();

    eventBus.emit('cycle:advanced', {
      cycle: this.currentCycle,
      phase: this.currentPhase,
      metrics: { ...this.metrics },
    });
  }

  /**
   * Apply non-linear cascading penalties based on critical metric states.
   */
  _applyCascadingEffects() {
    let cascadeEffects = {};
    let active = false;

    // RIOT Cascade: Low Hope triggers immediate Disorder
    if (this.metrics.hope < 30) {
      cascadeEffects.disorder = 8;
      cascadeEffects.efficiency = -5;
      active = true;
    }
    
    // FEAR Cascade: High Fear destroys Hope and increases Silence
    if (this.metrics.fear > 70) {
      cascadeEffects.hope = -6;
      cascadeEffects.silence = 5;
      active = true;
    }

    // DESPAIR Cascade: High Silence causes Hope decay
    if (this.metrics.silence > 85) {
      cascadeEffects.hope = -10;
      active = true;
    }

    if (active) {
      // Apply the effects quietly
      for (const [key, delta] of Object.entries(cascadeEffects)) {
        if (key in this.metrics) {
          this.metrics[key] = this._clamp(this.metrics[key] + delta);
        }
      }
      this._recalculateDerived();
      
      // We don't emit a full metrics:changed here because cycle:advanced will carry the new metrics state,
      // but we could notify the UI that a cascade occurred.
      eventBus.emit('system:cascade_event', { effects: cascadeEffects });
    }
  }

  /**
   * End the game and trigger recap.
   */
  endGame(endingType = 'standard') {
    this.isGameOver = true;
    this.state = 'recap';

    eventBus.emit('game:over', {
      finalMetrics: { ...this.metrics },
      policyHistory: [...this.policyHistory],
      rejectedPolicies: [...this.rejectedPolicies],
      totalCycles: this.currentCycle,
      maxCycles: this.maxCycles,
      vitality: this._vitality,
      endingType,
    });
  }

  /**
   * FIX 5: Check for critical metric thresholds that trigger variable endings.
   */
  _checkCriticalThresholds() {
    if (this.isGameOver) return;

    // CITY COLLAPSE — hope is destroyed
    if (this.metrics.hope <= 5 && this.currentCycle >= 5) {
      this.endGame('collapse');
      return;
    }

    // PERFECT SILENCE — system achieves total control
    if (this.metrics.efficiency >= 95 && this.metrics.silence >= 90) {
      this.endGame('perfect_silence');
      return;
    }
  }

  // ─── Threshold Management ──────────────────────────────────────────

  /**
   * Check if a threshold has been crossed (for one-time events).
   * @param {string} thresholdId 
   * @returns {boolean}
   */
  hasThresholdFired(thresholdId) {
    return this.firedThresholds.has(thresholdId);
  }

  /**
   * Mark a threshold as fired.
   * @param {string} thresholdId 
   */
  fireThreshold(thresholdId) {
    this.firedThresholds.add(thresholdId);
  }

  // ─── State Queries ─────────────────────────────────────────────────

  /**
   * Get a complete snapshot of the current state.
   */
  getSnapshot() {
    return {
      metrics: { ...this.metrics },
      cycle: this.currentCycle,
      maxCycles: this.maxCycles,
      phase: { ...this.currentPhase },
      vitality: this._vitality,
      decayPercent: this._decayPercent,
      atmosphere: { ...this._atmosphereParams },
      state: this.state,
      isGameOver: this.isGameOver,
    };
  }

  /**
   * Get the current game phase name.
   * @returns {'early' | 'mid' | 'late'}
   */
  getPhaseName() {
    return this.currentPhase.name;
  }

  /**
   * Get normalized metric value (0–1).
   * @param {string} metric 
   */
  getNormalized(metric) {
    return this.metrics[metric] / GAME_CONFIG.METRIC_MAX;
  }

  /**
   * Get city vitality (0–1, high = alive, low = dead).
   */
  getVitality() {
    return this._vitality;
  }

  /**
   * Get atmosphere parameters for shader uniforms.
   */
  getAtmosphere() {
    return { ...this._atmosphereParams };
  }

  // ─── Private Methods ───────────────────────────────────────────────

  /**
   * Clamp a value to valid metric range.
   */
  _clamp(value) {
    return Math.max(GAME_CONFIG.METRIC_MIN, Math.min(GAME_CONFIG.METRIC_MAX, value));
  }

  /**
   * Update the current phase based on cycle number.
   */
  _updatePhase() {
    const cycle = this.currentCycle;
    if (cycle <= PHASES.EARLY.endCycle) {
      this.currentPhase = PHASES.EARLY;
    } else if (cycle <= PHASES.MID.endCycle) {
      this.currentPhase = PHASES.MID;
    } else {
      this.currentPhase = PHASES.LATE;
    }
  }

  /**
   * Recalculate all derived values from raw metrics.
   */
  _recalculateDerived() {
    const { hope, fear, silence, efficiency, disorder } = this.metrics;

    // Vitality: composite of hope and inverse of silence (0–1)
    // High hope + low silence = alive city
    this._vitality = Math.max(0, Math.min(1,
      (hope * 0.6 + (100 - silence) * 0.3 + disorder * 0.1) / 100
    ));

    // Decay percentage: how "dead" the city feels
    this._decayPercent = Math.max(0, Math.min(100,
      silence * 0.4 + (100 - hope) * 0.35 + fear * 0.15 + (100 - disorder) * 0.1
    ));

    // Atmosphere parameters for shaders
    this._atmosphereParams = {
      saturation: Math.max(0.05, 1.0 - (silence / 100) * 0.95),
      warmth: Math.max(0, hope / 100),
      fogDensity: Math.min(1, silence / 100 * 0.8),
      vignetteStrength: Math.min(0.7, fear / 100 * 0.7),
      bloomStrength: Math.max(0.05, (hope / 100) * 0.8),
      scanlineIntensity: Math.min(0.15, (silence / 100) * 0.15),
      chromaticAberration: Math.min(0.008, (silence / 100) * 0.008),
      glitchIntensity: silence > 85 ? (silence - 85) / 15 * 0.3 : 0,
    };
  }
}

// Export singleton
export const gameState = new GameState();
export default gameState;
