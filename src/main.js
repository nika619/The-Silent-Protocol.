/**
 * The Silent Protocol — Main Entry Point
 * Bootstraps all systems, wires them together, and starts the game.
 */

// ─── Styles ──────────────────────────────────────────────────────
import './styles/index.css';
import './styles/dashboard.css';
import './styles/cards.css';
import './styles/narrative.css';
import './styles/onboarding.css';
import './styles/animations.css';

// ─── Core ────────────────────────────────────────────────────────
import { eventBus } from './core/EventBus.js';
import { gameState } from './core/GameState.js';

// ─── Systems ─────────────────────────────────────────────────────
import { policyManager } from './systems/PolicyManager.js';
import { citizenSimulation } from './systems/CitizenSimulation.js';
import { thresholdManager } from './systems/ThresholdManager.js';

// ─── Narrative ───────────────────────────────────────────────────
import { narrativeEngine } from './narrative/NarrativeEngine.js';

// ─── Rendering ───────────────────────────────────────────────────
import { cityRenderer } from './rendering/CityRenderer.js';

// ─── Audio ───────────────────────────────────────────────────────
import { audioController } from './audio/AudioController.js';

// ─── UI ──────────────────────────────────────────────────────────
import { uiController } from './ui/UIController.js';

/**
 * Boot sequence — initializes all systems in dependency order.
 */
async function boot() {
  console.log('%c[THE SILENT PROTOCOL]%c Initializing...', 
    'color: #00ffd5; font-weight: bold;', 'color: inherit;');

  // 1. Initialize core game state
  gameState.init();

  // 2. Initialize game systems
  policyManager.init();
  thresholdManager.init();
  narrativeEngine.init();

  // 3. Initialize citizen simulation
  citizenSimulation.init();

  // 4. Initialize Three.js renderer
  const cityView = document.getElementById('city-view');
  if (cityView) {
    cityRenderer.init(cityView);
    cityRenderer.start();
  }

  // 5. Initialize UI
  uiController.init();

  console.log('%c[THE SILENT PROTOCOL]%c All systems online.', 
    'color: #00ffd5; font-weight: bold;', 'color: inherit;');

  // 6. Start the UI flow (onboarding → gameplay)
  await uiController.startFlow();

  // 7. Start audio after user interaction
  audioController.start();

  console.log('%c[THE SILENT PROTOCOL]%c Protocol active. City under observation.',
    'color: #00ffd5; font-weight: bold;', 'color: inherit;');
}

// ─── DOM Ready ───────────────────────────────────────────────────
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
