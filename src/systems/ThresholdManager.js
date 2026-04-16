/**
 * ThresholdManager — Monitors metrics and fires one-time milestone events.
 * Drives visual, audio, UI, and narrative transitions at specific metric values.
 */

import { eventBus } from '../core/EventBus.js';
import { gameState } from '../core/GameState.js';
import thresholdsData from '../data/thresholds.json';

class ThresholdManager {
  constructor() {
    /** @type {Array} All threshold definitions */
    this.thresholds = thresholdsData.thresholds;

    /** @type {Set<string>} IDs of thresholds already fired */
    this.firedThresholds = new Set();
  }

  /**
   * Initialize and start listening for metric changes.
   */
  init() {
    eventBus.on('metrics:changed', (data) => this.check(data));
  }

  /**
   * Check all thresholds against current metrics.
   * @param {Object} data — { current, previous, deltas }
   */
  check(data) {
    const metrics = data.current;
    const cycle = gameState.currentCycle;

    this.thresholds.forEach(threshold => {
      // Skip if already fired
      if (this.firedThresholds.has(threshold.id)) return;

      // Check cycle range if specified
      if (threshold.cycleMin && cycle < threshold.cycleMin) return;
      if (threshold.cycleMax && cycle > threshold.cycleMax) return;

      // Check metric condition
      const value = metrics[threshold.metric];
      if (value === undefined) return;

      let crossed = false;
      if (threshold.direction === 'above' && value >= threshold.value) {
        crossed = true;
      } else if (threshold.direction === 'below' && value <= threshold.value) {
        crossed = true;
      }

      if (crossed) {
        this._fireThreshold(threshold, metrics);
      }
    });
  }

  /**
   * Fire a threshold event.
   */
  _fireThreshold(threshold, metrics) {
    this.firedThresholds.add(threshold.id);
    gameState.fireThreshold(threshold.id);

    console.log(`[ThresholdManager] Crossed: ${threshold.id} — ${threshold.description}`);

    eventBus.emit('threshold:crossed', {
      threshold,
      metrics: { ...metrics },
      type: threshold.event,
    });

    // Emit type-specific events for targeted handling
    switch (threshold.event) {
      case 'visual':
        eventBus.emit('visual:shift', { threshold, metrics });
        break;
      case 'audio':
        eventBus.emit('audio:shift', { threshold, metrics });
        break;
      case 'ui':
        eventBus.emit('ui:decay', { threshold, metrics });
        break;
      case 'narrative':
        eventBus.emit('narrative:milestone', { threshold, metrics });
        break;
      case 'citizen':
        eventBus.emit('citizen:shift', { threshold, metrics });
        break;
    }
  }

  /**
   * Get all thresholds that have been fired.
   * @returns {Array}
   */
  getFiredThresholds() {
    return this.thresholds.filter(t => this.firedThresholds.has(t.id));
  }

  /**
   * Get progress through all thresholds (0–1).
   */
  getProgress() {
    return this.firedThresholds.size / this.thresholds.length;
  }

  /**
   * Reset all thresholds.
   */
  reset() {
    this.firedThresholds.clear();
  }
}

export const thresholdManager = new ThresholdManager();
export default thresholdManager;
