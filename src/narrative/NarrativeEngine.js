/**
 * NarrativeEngine — Drives story progression through headlines, chat logs, system alerts,
 * and recurring citizen stories.
 */

import { eventBus } from '../core/EventBus.js';
import { gameState } from '../core/GameState.js';
import narrativesData from '../data/narratives.json';
import citizenStoriesData from '../data/citizen-stories.json';

class NarrativeEngine {
  constructor() {
    this.headlines = narrativesData.headlines;
    this.chatLogs = narrativesData.chatLogs;
    this.systemAlerts = narrativesData.systemAlerts;

    /** @type {Array} Recurring citizen story arcs */
    this.citizenStories = citizenStoriesData.citizens;

    /** @type {Set<string>} IDs of snippets already shown */
    this.shownSnippets = new Set();

    /** @type {Object} Current cycle's narrative content */
    this.currentContent = {
      headline: null,
      chatLog: null,
      systemAlert: null,
      citizenStories: [],  // FIX 4: Now an ARRAY of all matching stories
    };
  }

  /**
   * Initialize and listen for cycle events.
   */
  init() {
    eventBus.on('cycle:advanced', () => this._generateContent());
    eventBus.on('game:started', () => this._generateContent());
    eventBus.on('narrative:milestone', (data) => this._handleMilestone(data));
  }

  /**
   * Get current cycle's narrative content.
   */
  getCurrentContent() {
    return { ...this.currentContent };
  }

  /**
   * Generate narrative content for the current cycle.
   */
  _generateContent() {
    const metrics = gameState.metrics;
    const cycle = gameState.currentCycle;

    // Select headline
    this.currentContent.headline = this._selectSnippet(this.headlines, metrics, cycle);

    // Select system alert
    this.currentContent.systemAlert = this._selectSnippet(this.systemAlerts, metrics, cycle);

    // ─── FIX 4: Get ALL citizen stories for this cycle ────────────
    this.currentContent.citizenStories = this._getAllCitizenStoriesForCycle(cycle);

    // ─── FIX 4: Only show chat log if no citizen stories this cycle ─
    if (this.currentContent.citizenStories.length === 0) {
      this.currentContent.chatLog = this._selectSnippet(this.chatLogs, metrics, cycle);
    } else {
      this.currentContent.chatLog = null;
    }

    eventBus.emit('narrative:updated', this.currentContent);
  }

  /**
   * Get ALL citizen stories that match this cycle.
   * Returns messages from every citizen with an exact cycle match,
   * plus at most 1 fallback from the citizen with the nearest previous message.
   */
  _getAllCitizenStoriesForCycle(cycle) {
    const stories = [];

    const metrics = gameState.metrics;

    this.citizenStories.forEach(citizen => {
      // Filter out messages where current metrics don't meet conditions
      const eligibleMessages = citizen.messages.filter(m => {
        if (!m.conditions || Object.keys(m.conditions).length === 0) return true;
        const cond = m.conditions;
        if (cond.hope_min !== undefined && metrics.hope < cond.hope_min) return false;
        if (cond.hope_max !== undefined && metrics.hope > cond.hope_max) return false;
        if (cond.fear_min !== undefined && metrics.fear < cond.fear_min) return false;
        if (cond.fear_max !== undefined && metrics.fear > cond.fear_max) return false;
        if (cond.silence_min !== undefined && metrics.silence < cond.silence_min) return false;
        if (cond.silence_max !== undefined && metrics.silence > cond.silence_max) return false;
        if (cond.efficiency_min !== undefined && metrics.efficiency < cond.efficiency_min) return false;
        if (cond.efficiency_max !== undefined && metrics.efficiency > cond.efficiency_max) return false;
        if (cond.disorder_min !== undefined && metrics.disorder < cond.disorder_min) return false;
        if (cond.disorder_max !== undefined && metrics.disorder > cond.disorder_max) return false;
        return true;
      });

      // Find the best message for this cycle: exact match first, then nearest previous
      const exactMatch = eligibleMessages.find(m => m.cycle === cycle);
      const nearestPrevious = eligibleMessages
        .filter(m => m.cycle <= cycle)
        .sort((a, b) => b.cycle - a.cycle)[0];

      const message = exactMatch || nearestPrevious;
      if (message) {
        stories.push({
          citizenId: citizen.id,
          name: citizen.name,
          occupation: citizen.occupation,
          text: message.text,
          cycle: message.cycle,
          isExact: !!exactMatch,
          isStale: !exactMatch && message.cycle < cycle - 1, // More than 1 cycle old
        });
      }
    });

    // Sort: exact matches first, then by citizen order
    stories.sort((a, b) => {
      if (a.isExact && !b.isExact) return -1;
      if (!a.isExact && b.isExact) return 1;
      return 0;
    });

    // Show at most 2 stories to avoid crowding
    return stories.slice(0, 2);
  }

  /**
   * Select the most appropriate snippet from a pool based on conditions.
   */
  _selectSnippet(pool, metrics, cycle) {
    const eligible = pool.filter(snippet => {
      const cond = snippet.conditions;
      if (!cond) return true;

      if (cond.hope_min !== undefined && metrics.hope < cond.hope_min) return false;
      if (cond.hope_max !== undefined && metrics.hope > cond.hope_max) return false;
      if (cond.fear_min !== undefined && metrics.fear < cond.fear_min) return false;
      if (cond.fear_max !== undefined && metrics.fear > cond.fear_max) return false;
      if (cond.silence_min !== undefined && metrics.silence < cond.silence_min) return false;
      if (cond.silence_max !== undefined && metrics.silence > cond.silence_max) return false;
      if (cond.efficiency_min !== undefined && metrics.efficiency < cond.efficiency_min) return false;
      if (cond.efficiency_max !== undefined && metrics.efficiency > cond.efficiency_max) return false;
      if (cond.disorder_min !== undefined && metrics.disorder < cond.disorder_min) return false;
      if (cond.disorder_max !== undefined && metrics.disorder > cond.disorder_max) return false;
      if (cond.cycleMin !== undefined && cycle < cond.cycleMin) return false;
      if (cond.cycleMax !== undefined && cycle > cond.cycleMax) return false;

      return true;
    });

    if (eligible.length === 0) return null;

    const unshown = eligible.filter(s => !this.shownSnippets.has(s.id));
    const selection = unshown.length > 0 ? unshown : eligible;

    const chosen = selection[selection.length - 1];
    this.shownSnippets.add(chosen.id);
    return chosen;
  }

  /**
   * Handle milestone narrative events.
   */
  _handleMilestone(data) {
    if (data.threshold.narrativeId) {
      const allSnippets = [...this.headlines, ...this.chatLogs, ...this.systemAlerts];
      const snippet = allSnippets.find(s => s.id === data.threshold.narrativeId);
      if (snippet) {
        eventBus.emit('narrative:milestone:display', snippet);
      }
    }
  }

  /**
   * Reset the engine.
   */
  reset() {
    this.shownSnippets.clear();
    this.currentContent = { headline: null, chatLog: null, systemAlert: null, citizenStories: [] };
  }
}

export const narrativeEngine = new NarrativeEngine();
export default narrativeEngine;
