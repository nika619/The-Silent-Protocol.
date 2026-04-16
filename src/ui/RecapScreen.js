/**
 * RecapScreen — Final "System Audit" with mirror effect.
 * Shows every policy, REDACTED stamps, and the final inert button.
 */

import { gsap } from 'gsap';
import { eventBus } from '../core/EventBus.js';
import { gameState } from '../core/GameState.js';
import { audioController } from '../audio/AudioController.js';

class RecapScreen {
  constructor() {
    /** @type {HTMLElement} */
    this.overlay = null;
  }

  /**
   * Initialize the recap screen.
   */
  init() {
    this.overlay = document.getElementById('recap');
    if (!this.overlay) {
      this.overlay = document.createElement('div');
      this.overlay.id = 'recap';
      this.overlay.className = 'overlay grid-bg no-select';
      document.body.appendChild(this.overlay);
    }

    eventBus.on('game:over', (data) => this.show(data));
  }

  /**
   * Show the recap screen.
   * @param {Object} data — Game over data
   */
  show(data) {
    const { policyHistory, rejectedPolicies, finalMetrics, endingType = 'standard', totalCycles, maxCycles } = data;

    // ─── FIX 5: Variable Ending Text ─────────────────────────────
    const endings = {
      standard: {
        title: 'System Audit Complete',
        subtitle: 'The city is stable. The city is silent. The city is yours.',
        button: '[ AWAIT FURTHER INSTRUCTIONS ]',
      },
      collapse: {
        title: 'SYSTEM FAILURE — CITY COLLAPSE',
        subtitle: `Hope reached critical depletion at Cycle ${totalCycles} of ${maxCycles}. The population could not sustain the Protocol. The city fell silent—but not by your design.`,
        button: '[ PROTOCOL TERMINATED ]',
      },
      perfect_silence: {
        title: 'OBJECTIVE ACHIEVED — PERFECT SILENCE',
        subtitle: 'Total compliance. Zero variance. Maximum efficiency. The city is perfect. The city is empty. You won. No one is left to notice.',
        button: '[ SYSTEM IDLE — NO FURTHER INPUT REQUIRED ]',
      },
    };
    const ending = endings[endingType] || endings.standard;

    let entriesHTML = '';

    policyHistory.forEach((entry, index) => {
      const policy = entry.policy;
      const directive = String(index + 1).padStart(3, '0');

      // Find rejected alternative for this cycle
      const rejected = rejectedPolicies.filter(r => r.cycle === entry.cycle);
      let rejectedHTML = '';
      rejected.forEach(r => {
        rejectedHTML += `
          <div class="audit-rejected">
            <div class="rejected-label">REJECTED</div>
            <div style="font-size: var(--fs-xs); color: var(--color-text-muted);">
              ${r.policy.title}
            </div>
          </div>
        `;
      });

      entriesHTML += `
        <div class="audit-entry" id="audit-${index}">
          <div class="audit-directive">DIRECTIVE ${directive}</div>
          <div class="audit-title">${policy.title}</div>
          <div class="audit-justification" id="justification-${index}">
            Your justification: "${policy.justification}"
            <div class="redacted-stamp" id="stamp-${index}">REDACTED</div>
          </div>
          <div class="audit-outcome">
            ${policy.recapText || policy.alternativeOutcome || ''}
          </div>
          ${rejectedHTML}
        </div>
      `;
    });

    this.overlay.innerHTML = `
      <div class="recap-header ${endingType === 'collapse' ? 'collapse-ending' : ''} ${endingType === 'perfect_silence' ? 'perfect-ending' : ''}">
        <div class="recap-title">${ending.title}</div>
        <div class="recap-subtitle">
          ${ending.subtitle}
        </div>
      </div>

      <div class="audit-log" id="audit-log">
        ${entriesHTML}
      </div>

      <button class="final-button" id="final-button">
        ${ending.button}
      </button>
    `;

    // Show overlay
    this.overlay.classList.add('active');

    // Animate entries one by one
    const entries = this.overlay.querySelectorAll('.audit-entry');
    const stamps = this.overlay.querySelectorAll('.redacted-stamp');

    entries.forEach((entry, i) => {
      gsap.to(entry, {
        opacity: 1,
        y: 0,
        duration: 0.6,
        delay: i * 1.5 + 1,
        ease: 'power2.out',
      });

      // REDACTED stamp slam
      const stamp = stamps[i];
      if (stamp) {
        gsap.to(stamp, {
          delay: i * 1.5 + 2.2,
          duration: 0,
          onComplete: () => {
            stamp.classList.add('visible', 'stamp-animate');
            audioController.getSFX().playCommit();
          },
        });
      }
    });

    // Show final button
    const finalBtn = document.getElementById('final-button');
    if (finalBtn) {
      gsap.to(finalBtn, {
        opacity: 0.6,
        duration: 0.8,
        delay: entries.length * 1.5 + 3,
        ease: 'power2.out',
      });
    }
  }
}

export const recapScreen = new RecapScreen();
export default recapScreen;
