/**
 * UIController — Master UI orchestrator.
 * Manages screen states, wires all UI modules together.
 */

import { eventBus } from '../core/EventBus.js';
import { gameState } from '../core/GameState.js';
import { dashboard } from './Dashboard.js';
import { policyCards } from './PolicyCards.js';
import { narrativePanel } from './NarrativePanel.js';
import { onboarding } from './Onboarding.js';
import { recapScreen } from './RecapScreen.js';

class UIController {
  constructor() {
    /** @type {string} Current UI state */
    this.state = 'idle';
  }

  /**
   * Initialize all UI modules.
   */
  init() {
    const dashboardEl = document.getElementById('dashboard');
    const cityView = document.getElementById('city-view');

    // Add horizontal scan line to city view
    const scanLine = document.createElement('div');
    scanLine.className = 'h-scan-line';
    cityView.appendChild(scanLine);

    // Add ticker container
    const tickerContainer = document.createElement('div');
    tickerContainer.id = 'ticker-container';
    cityView.appendChild(tickerContainer);

    // Initialize dashboard
    dashboard.init(dashboardEl);

    // Initialize policy cards (inside dashboard's policies container)
    policyCards.init();

    // Wait for dashboard to render, then set card container
    requestAnimationFrame(() => {
      const policiesContainer = document.getElementById('policies-container');
      if (policiesContainer) {
        policyCards.setContainer(policiesContainer);
      }
    });

    // Initialize narrative panel
    const narrativeContainer = document.getElementById('narrative-container');
    narrativePanel.init(narrativeContainer, tickerContainer);

    // Initialize onboarding
    onboarding.init();

    // Initialize recap
    recapScreen.init();
  }

  /**
   * Start the UI flow — show onboarding, then transition to gameplay.
   * @returns {Promise}
   */
  async startFlow() {
    this.state = 'onboarding';

    // Show onboarding and wait for user to accept mandate
    await onboarding.show();

    // Transition to gameplay
    this.state = 'playing';
    gameState.start();
  }
}

export const uiController = new UIController();
export default uiController;
