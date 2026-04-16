/**
 * EventBus — Lightweight pub/sub system for decoupled module communication.
 * All game modules communicate through this singleton to avoid tight coupling.
 * 
 * Events:
 *   'metrics:changed'     — Fired when any metric value changes
 *   'policy:selected'     — Fired when a player selects a policy card
 *   'cycle:advanced'      — Fired when the game advances to a new cycle
 *   'threshold:crossed'   — Fired when a metric crosses a milestone threshold
 *   'phase:changed'       — Fired when the game phase changes (early/mid/late)
 *   'game:started'        — Fired when the game begins after onboarding
 *   'game:over'           — Fired when the final cycle completes
 *   'narrative:display'   — Fired when a narrative snippet should be shown
 *   'ui:decay'            — Fired when UI should degrade its visual state
 *   'audio:update'        — Fired when audio layers should be recalculated
 *   'city:update'         — Fired when the city scene should reflect new metrics
 */

class EventBus {
  constructor() {
    /** @type {Map<string, Set<Function>>} */
    this._listeners = new Map();

    /** @type {Map<string, Array<{data: any, timestamp: number}>>} */
    this._history = new Map();

    /** @type {boolean} */
    this._debug = false;
  }

  /**
   * Subscribe to an event.
   * @param {string} event — Event name
   * @param {Function} callback — Handler function
   * @returns {Function} Unsubscribe function
   */
  on(event, callback) {
    if (!this._listeners.has(event)) {
      this._listeners.set(event, new Set());
    }
    this._listeners.get(event).add(callback);

    // Return unsubscribe function
    return () => this.off(event, callback);
  }

  /**
   * Subscribe to an event, but only fire once.
   * @param {string} event 
   * @param {Function} callback 
   */
  once(event, callback) {
    const wrapper = (data) => {
      this.off(event, wrapper);
      callback(data);
    };
    this.on(event, wrapper);
  }

  /**
   * Unsubscribe from an event.
   * @param {string} event 
   * @param {Function} callback 
   */
  off(event, callback) {
    const listeners = this._listeners.get(event);
    if (listeners) {
      listeners.delete(callback);
      if (listeners.size === 0) {
        this._listeners.delete(event);
      }
    }
  }

  /**
   * Emit an event to all subscribers.
   * @param {string} event 
   * @param {*} data 
   */
  emit(event, data = null) {
    if (this._debug) {
      console.log(`[EventBus] ${event}`, data);
    }

    // Store in history for debugging / recap
    if (!this._history.has(event)) {
      this._history.set(event, []);
    }
    this._history.get(event).push({
      data,
      timestamp: performance.now()
    });

    const listeners = this._listeners.get(event);
    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`[EventBus] Error in handler for "${event}":`, error);
        }
      });
    }
  }

  /**
   * Get event history for debugging or recap.
   * @param {string} event 
   * @returns {Array}
   */
  getHistory(event) {
    return this._history.get(event) || [];
  }

  /**
   * Clear all listeners and history.
   */
  reset() {
    this._listeners.clear();
    this._history.clear();
  }

  /**
   * Enable debug logging.
   */
  enableDebug() {
    this._debug = true;
  }
}

// Export singleton instance
export const eventBus = new EventBus();
export default eventBus;
