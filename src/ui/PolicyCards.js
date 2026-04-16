/**
 * PolicyCards — Card selection UI with legal directive aesthetic.
 * Fix 1: Post-selection pause + cycle report + SAFETY VALVE
 * Fix 3: Consequence flash overlay
 */

import { gsap } from 'gsap';
import { eventBus } from '../core/EventBus.js';
import { gameState } from '../core/GameState.js';
import { policyManager } from '../systems/PolicyManager.js';
import { audioController } from '../audio/AudioController.js';

class PolicyCards {
  constructor() {
    /** @type {HTMLElement} */
    this.container = null;

    /** @type {boolean} */
    this._selecting = false;

    /** @type {boolean} */
    this._processing = false;

    /** @type {number} Policy counter for IDs */
    this._policyCounter = 0;

    /** @type {number} Safety valve timeout ID */
    this._safetyTimeout = null;
  }

  /**
   * Initialize the policy cards system.
   */
  init() {
    eventBus.on('policies:updated', (policies) => this._renderCards(policies));

    // Create consequence flash overlay (lives in city-view)
    this._createConsequenceOverlay();
  }

  /**
   * Set the container element.
   * @param {HTMLElement} container 
   */
  setContainer(container) {
    this.container = container;
  }

  /**
   * Create the consequence flash overlay that appears over the city view.
   */
  _createConsequenceOverlay() {
    const cityView = document.getElementById('city-view');
    if (!cityView) return;

    const overlay = document.createElement('div');
    overlay.id = 'consequence-overlay';
    overlay.className = 'consequence-overlay';
    overlay.innerHTML = `
      <div class="consequence-text" id="consequence-text"></div>
    `;
    cityView.appendChild(overlay);
  }

  /**
   * Render policy cards.
   * @param {Array} policies 
   */
  _renderCards(policies) {
    if (!this.container) return;

    // ─── SAFETY VALVE: Always reset state on new cards ────────────
    this._selecting = false;
    this._processing = false;
    if (this._safetyTimeout) clearTimeout(this._safetyTimeout);

    // Softlock protection: if no policies available, auto-advance
    if (policies.length === 0) {
      this.container.innerHTML = `
        <div class="policies-section">
          <div class="policies-header">Active Directives</div>
          <div class="policy-exhausted">
            <div style="color: var(--color-text-muted); font-size: var(--fs-sm); text-align: center; padding: var(--space-lg);">
              No directives available. System operating on existing protocols.
            </div>
          </div>
          <button class="continue-btn" id="continue-btn">
            Advance Cycle ▸
          </button>
        </div>
      `;
      const continueBtn = document.getElementById('continue-btn');
      if (continueBtn) {
        continueBtn.addEventListener('click', () => this._handleContinue());
      }
      return;
    }

    this.container.innerHTML = `
      <div class="policies-section">
        <div class="policies-header">Active Directives</div>
        <div id="policy-cards-list"></div>
        <button class="continue-btn" id="continue-btn" disabled style="display: none;">
          Advance Cycle ▸
        </button>
      </div>
    `;

    const list = document.getElementById('policy-cards-list');
    if (!list) return;

    policies.forEach((policy, index) => {
      this._policyCounter++;
      const card = this._createCardElement(policy, this._policyCounter, index);
      list.appendChild(card);

      // Staggered entrance animation
      gsap.from(card, {
        opacity: 0,
        y: 20,
        duration: 0.5,
        delay: index * 0.15,
        ease: 'power2.out',
      });
    });

    // Continue button handler
    const continueBtn = document.getElementById('continue-btn');
    if (continueBtn) {
      continueBtn.addEventListener('click', () => this._handleContinue());
    }
  }

  /**
   * Create a policy card DOM element.
   */
  _createCardElement(policy, counter, index) {
    const card = document.createElement('div');
    card.className = 'policy-card glass-card';
    card.dataset.policyId = policy.id;
    card.id = `policy-card-${index}`;

    // Build effect chips — show displayedEffects if available, else effects
    const displayEffects = policy.displayedEffects || policy.effects;
    const effectsHTML = Object.entries(displayEffects)
      .map(([key, val]) => {
        const chipClass = val > 0 ? 'positive' : 'negative';
        const arrow = val > 0 ? '▲' : '▼';
        return `
          <span class="effect-chip ${chipClass}">
            <span class="effect-arrow">${arrow}</span>
            <span class="effect-label">${key}</span>
            <span class="effect-value">${val > 0 ? '+' : ''}${val}</span>
          </span>
        `;
      })
      .join('');

    card.innerHTML = `
      <div class="policy-seal">◈</div>
      <div class="policy-id">DIRECTIVE ${String(counter).padStart(3, '0')}</div>
      <div class="policy-title">${policy.title}</div>
      <div class="policy-justification">"${policy.justification}"</div>
      <div class="policy-effects">${effectsHTML}</div>
      <div class="policy-auth-bar">
        <div class="policy-auth-fill"></div>
      </div>
    `;

    // Event listeners
    card.addEventListener('mouseenter', () => {
      if (this._selecting || this._processing) return;
      audioController.getSFX().playHover();
      eventBus.emit('policy:hover', { effects: policy.displayedEffects || policy.effects });
    });

    card.addEventListener('mouseleave', () => {
      if (this._selecting || this._processing) return;
      eventBus.emit('policy:leave');
    });

    card.addEventListener('click', () => {
      if (this._selecting || this._processing) return;
      this._selectCard(policy, card);
    });

    return card;
  }

  /**
   * Handle card selection — now with processing pause + safety valve.
   */
  _selectCard(policy, cardElement) {
    this._selecting = true;

    // Play commit sound
    audioController.getSFX().playCommit();

    // Screen shake
    document.getElementById('app')?.classList.add('shake');
    setTimeout(() => {
      document.getElementById('app')?.classList.remove('shake');
    }, 300);

    // Clear any active hovers
    eventBus.emit('policy:leave');

    // Visual feedback on selected card
    cardElement.classList.add('selected');

    // Action Confirmation "Stamping"
    const stamp = document.createElement('div');
    stamp.className = 'directive-stamp';
    stamp.textContent = '[ DIRECTIVE GRANTED ]';
    cardElement.appendChild(stamp);
    gsap.fromTo(stamp, 
      { scale: 5, opacity: 0, rotation: -10 }, 
      { scale: 1, opacity: 1, rotation: -3, duration: 0.3, ease: 'back.out(2)' }
    );

    // Reject other cards
    const allCards = this.container.querySelectorAll('.policy-card');
    allCards.forEach(c => {
      if (c !== cardElement) {
        gsap.to(c, {
          opacity: 0.2,
          scale: 0.95,
          duration: 0.4,
          ease: 'power2.in',
        });
        c.classList.add('rejected');
      }
    });

    // Animate selection
    gsap.to(cardElement, {
      y: -4,
      scale: 1.02,
      duration: 0.3,
      ease: 'back.out(1.7)',
    });

    // Snapshot metrics BEFORE applying
    const metricsBefore = { ...gameState.metrics };

    // Get rejected alternatives
    const currentOptions = policyManager.getOptions();
    const alternatives = currentOptions.filter(p => p.id !== policy.id);

    // Select the policy in the manager (applies effects)
    policyManager.selectPolicy(policy.id);

    // Snapshot metrics AFTER applying
    const metricsAfter = { ...gameState.metrics };

    // ─── Processing Pause ────────────────────────────────────────
    this._startProcessingPhase(policy, metricsBefore, metricsAfter, alternatives);
  }

  /**
   * Processing phase — forces player to watch the city react.
   */
  _startProcessingPhase(policy, metricsBefore, metricsAfter, alternatives) {
    this._processing = true;

    // ─── SAFETY VALVE: Force-reset after 6 seconds no matter what ──
    this._safetyTimeout = setTimeout(() => {
      if (this._processing) {
        this._processing = false;
        this._selecting = false;
        // Force show continue button if report hasn't rendered
        const continueBtn = document.getElementById('continue-btn');
        if (continueBtn) {
          continueBtn.style.display = 'block';
          continueBtn.disabled = false;
        }
      }
    }, 6000);

    // Replace cards with processing indicator
    const list = document.getElementById('policy-cards-list');
    if (list) {
      list.innerHTML = `
        <div class="processing-phase">
          <div class="processing-label">IMPLEMENTING DIRECTIVE...</div>
          <div class="processing-bar">
            <div class="processing-fill" id="processing-fill"></div>
          </div>
          <div class="processing-title">${policy.title}</div>
          <button id="abort-btn" class="abort-btn">[ ABORT DIRECTIVE ]</button>
        </div>
      `;

      // Animate progress bar
      gsap.to('#processing-fill', {
        width: '100%',
        duration: 2.5,
        ease: 'power1.inOut',
      });

      // Handle Abort
      const abortBtn = document.getElementById('abort-btn');
      if (abortBtn) {
        abortBtn.addEventListener('click', () => {
          clearTimeout(this._safetyTimeout);
          if (this._flashTimeout) clearTimeout(this._flashTimeout);
          if (this._reportTimeout) clearTimeout(this._reportTimeout);
          
          gsap.killTweensOf('#processing-fill');
          
          this._processing = false;
          this._selecting = false;
          
          const overlay = document.getElementById('consequence-overlay');
          if (overlay) overlay.classList.remove('visible');
          document.getElementById('app')?.classList.remove('shake');

          policyManager.abortPolicy(policy.id, metricsBefore, alternatives);
        });
      }
    }

    // Consequence flash — show recapText ghosted over the city view
    if (policy.recapText) {
      this._flashTimeout = setTimeout(() => {
        if (!this._processing) return; // double check early abort
        this._showConsequenceFlash(policy.recapText);
      }, 800);
    }

    // After processing, show cycle report
    this._reportTimeout = setTimeout(() => {
      if (!this._processing) return; // double check early abort
      this._showCycleReport(policy, metricsBefore, metricsAfter, alternatives);
    }, 3000);
  }

  /**
   * Show consequence flash overlay over city view.
   */
  _showConsequenceFlash(text) {
    const overlay = document.getElementById('consequence-overlay');
    const textEl = document.getElementById('consequence-text');
    if (!overlay || !textEl) return;

    textEl.textContent = text;
    overlay.classList.add('visible');

    // Flash in
    gsap.fromTo(overlay, 
      { opacity: 0 },
      { opacity: 1, duration: 0.8, ease: 'power2.out' }
    );

    // Hold, then fade out
    gsap.to(overlay, {
      opacity: 0,
      duration: 1.2,
      delay: 3,
      ease: 'power2.in',
      onComplete: () => {
        overlay.classList.remove('visible');
      },
    });
  }

  /**
   * Show cycle report with delta summary.
   */
  _showCycleReport(policy, metricsBefore, metricsAfter, alternatives) {
    const list = document.getElementById('policy-cards-list');
    if (!list) return;

    // Calculate deltas
    const metrics = ['hope', 'fear', 'silence', 'efficiency', 'disorder'];
    let deltaHTML = '';
    metrics.forEach(key => {
      const before = metricsBefore[key];
      const after = metricsAfter[key];
      const delta = after - before;
      if (delta === 0) return;
      const sign = delta > 0 ? '+' : '';
      const cls = (key === 'hope' && delta < 0) || (key === 'fear' && delta > 0) || (key === 'disorder' && delta > 0) ? 'negative' : 'positive';
      deltaHTML += `
        <div class="report-delta ${cls}">
          <span class="report-metric-name">${key.toUpperCase()}</span>
          <span class="report-metric-change">${before}% → ${after}%</span>
          <span class="report-metric-delta">(${sign}${delta})</span>
        </div>
      `;
    });

    // Show alternative outcome if exists
    let altHTML = '';
    if (alternatives.length > 0) {
      const alt = alternatives[0];
      if (alt.alternativeOutcome) {
        altHTML = `
          <div class="report-alternative">
            <div class="report-alt-label">WHAT YOU CHOSE NOT TO SAVE</div>
            <div class="report-alt-text redacted">${alt.alternativeOutcome}</div>
          </div>
        `;
      }
    }

    list.innerHTML = `
      <div class="cycle-report">
        <div class="report-header">CYCLE REPORT</div>
        <div class="report-implemented">
          <span class="report-check">✓</span> ${policy.title}
        </div>
        <div class="report-deltas">${deltaHTML}</div>
        ${altHTML}
      </div>
    `;

    // Animate in
    gsap.from('.cycle-report', {
      opacity: 0,
      y: 15,
      duration: 0.6,
      ease: 'power2.out',
    });

    // ─── CRITICAL: Show continue button with display:block FIRST ──
    const continueBtn = document.getElementById('continue-btn');
    if (continueBtn) {
      continueBtn.style.display = 'block';
      continueBtn.disabled = false;
      continueBtn.style.opacity = '0';
      gsap.to(continueBtn, {
        opacity: 1,
        y: 0,
        duration: 0.4,
        delay: 0.5,
      });
    }

    // Clear processing state
    this._processing = false;
    this._selecting = false;
    if (this._safetyTimeout) clearTimeout(this._safetyTimeout);
  }

  /**
   * Handle continue button click.
   */
  _handleContinue() {
    audioController.getSFX().playCycleAdvance();

    // Fade out cards
    gsap.to(this.container, {
      opacity: 0,
      duration: 0.3,
      onComplete: () => {
        this.container.style.opacity = 1;
        gameState.advanceCycle();
      },
    });
  }
}

export const policyCards = new PolicyCards();
export default policyCards;
