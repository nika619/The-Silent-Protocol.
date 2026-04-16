/**
 * PolicyManager — Handles policy card loading, filtering, and selection logic.
 * Serves appropriate policy cards each cycle based on prerequisites and metric conditions.
 */

import { eventBus } from '../core/EventBus.js';
import { gameState } from '../core/GameState.js';
import { GAME_CONFIG } from '../core/Constants.js';
import policiesData from '../data/policies.json';

class PolicyManager {
  constructor() {
    /** @type {Array} All available policies */
    this.allPolicies = policiesData.policies;

    /** @type {Set<string>} IDs of policies that have been enacted */
    this.enactedPolicies = new Set();

    /** @type {Array} Current cycle's available policies */
    this.currentOptions = [];
  }

  /**
   * Initialize and listen for events.
   */
  init() {
    eventBus.on('cycle:advanced', () => this._generateOptions());
    eventBus.on('game:started', () => this._generateOptions());
  }

  /**
   * Get the current policy options for this cycle.
   * @returns {Array}
   */
  getOptions() {
    return [...this.currentOptions];
  }

  /**
   * Select a policy by ID.
   * @param {string} policyId 
   */
  selectPolicy(policyId) {
    const chosen = this.currentOptions.find(p => p.id === policyId);
    if (!chosen) {
      console.error(`[PolicyManager] Policy "${policyId}" not in current options`);
      return;
    }

    const alternatives = this.currentOptions.filter(p => p.id !== policyId);

    // Enact the policy
    this.enactedPolicies.add(chosen.id);

    // Apply effects to game state
    gameState.applyEffects(chosen.effects);

    // Record in history
    gameState.recordPolicy(chosen, alternatives);

    // Clear current options
    this.currentOptions = [];
  }

  /**
   * Abort a policy selection before it finishes processing.
   */
  abortPolicy(policyId, metricsBefore, alternatives) {
    if (!this.enactedPolicies.has(policyId)) return;
    
    // Remove from enacted set
    this.enactedPolicies.delete(policyId);
    
    // Restore options for the current cycle
    const all = [this.allPolicies.find(p => p.id === policyId), ...alternatives];
    this.currentOptions = all.filter(Boolean);
    
    // Revert game state
    gameState.abortPolicy(this.currentOptions.find(p => p.id === policyId) || {id: policyId}, metricsBefore, alternatives);
    
    eventBus.emit('policies:updated', this.currentOptions);
  }

  /**
   * Check if a specific policy has been enacted.
   * @param {string} policyId 
   * @returns {boolean}
   */
  isEnacted(policyId) {
    return this.enactedPolicies.has(policyId);
  }

  /**
   * Get full policy history for recap.
   * @returns {Array}
   */
  getHistory() {
    return gameState.policyHistory;
  }

  // ─── Private Methods ───────────────────────────────────────────────

  /**
   * Generate available policy options for the current cycle.
   */
  _generateOptions() {
    const cycle = gameState.currentCycle;
    const metrics = gameState.metrics;

    // Filter policies by cycle range and prerequisites
    const eligible = this.allPolicies.filter(policy => {
      // Must not already be enacted
      if (this.enactedPolicies.has(policy.id)) return false;

      // Must be within cycle range
      if (cycle < policy.cycleRange[0] || cycle > policy.cycleRange[1]) return false;

      // All prerequisites must be enacted
      if (policy.requires && policy.requires.length > 0) {
        const prereqsMet = policy.requires.every(req => this.enactedPolicies.has(req));
        if (!prereqsMet) return false;
      }

      return true;
    });

    // Score policies by relevance to current state
    const scored = eligible.map(policy => ({
      policy,
      score: this._scorePolicyRelevance(policy, cycle, metrics),
    }));

    // Sort by score descending
    scored.sort((a, b) => b.score - a.score);

    // Pick top N
    const count = GAME_CONFIG.POLICIES_PER_CYCLE;
    this.currentOptions = scored.slice(0, count).map(s => s.policy);

    // Fallback: if not enough policies, fill from adjacent cycle ranges
    if (this.currentOptions.length < count) {
      const fallbacks = this.allPolicies.filter(p => {
        if (this.enactedPolicies.has(p.id)) return false;
        if (this.currentOptions.find(o => o.id === p.id)) return false;
        // Check prerequisites
        if (p.requires && p.requires.length > 0) {
          return p.requires.every(req => this.enactedPolicies.has(req));
        }
        return true;
      });

      while (this.currentOptions.length < count && fallbacks.length > 0) {
        this.currentOptions.push(fallbacks.shift());
      }
    }

    eventBus.emit('policies:updated', this.currentOptions);
  }

  /**
   * Score how relevant a policy is for the current game state.
   * Higher score = more likely to be offered.
   */
  _scorePolicyRelevance(policy, cycle, metrics) {
    let score = 0;

    // Prefer policies whose cycle range centers on current cycle
    const rangeMid = (policy.cycleRange[0] + policy.cycleRange[1]) / 2;
    score -= Math.abs(cycle - rangeMid) * 2;

    // Prefer policies that match the current phase tier
    const phase = gameState.getPhaseName();
    if (policy.tier === phase) score += 10;

    // Prefer policies with more dramatic effects in later game
    if (phase === 'late') {
      const totalEffect = Object.values(policy.effects).reduce(
        (sum, val) => sum + Math.abs(val), 0
      );
      score += totalEffect * 0.3;
    }

    // Add slight randomness to avoid deterministic feel
    score += Math.random() * 5;

    return score;
  }

  /**
   * Reset the manager.
   */
  reset() {
    this.enactedPolicies.clear();
    this.currentOptions = [];
  }
}

export const policyManager = new PolicyManager();
export default policyManager;
