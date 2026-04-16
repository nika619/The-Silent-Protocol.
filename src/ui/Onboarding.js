/**
 * Onboarding — Cinematic intro sequence with boot-up animation.
 */

import { gsap } from 'gsap';
import { eventBus } from '../core/EventBus.js';
import { audioController } from '../audio/AudioController.js';

class Onboarding {
  constructor() {
    /** @type {HTMLElement} */
    this.overlay = null;
  }

  /**
   * Initialize and create the onboarding overlay.
   */
  init() {
    this.overlay = document.getElementById('onboarding');
    if (!this.overlay) {
      this.overlay = document.createElement('div');
      this.overlay.id = 'onboarding';
      this.overlay.className = 'overlay grid-bg no-select';
      document.body.appendChild(this.overlay);
    }
  }

  /**
   * Show the onboarding sequence.
   * @returns {Promise} Resolves when user clicks Accept Mandate
   */
  show() {
    return new Promise((resolve) => {
      this.overlay.innerHTML = `
        <div class="onboarding-content">
          <div class="crisis-report">
            <div class="crisis-line" id="crisis-1">
              <span class="crisis-label">CRISIS REPORT</span> — CLASSIFICATION: <span class="crisis-value">CRITICAL</span>
            </div>
            <div class="crisis-line" id="crisis-2">
              Instability Index: <span class="crisis-value">94.7%</span> — Civil infrastructure near collapse
            </div>
            <div class="crisis-line" id="crisis-3">
              Recommendation: Deploy autonomous governance protocol
            </div>
            <div class="crisis-line" id="crisis-4">
              Authority granted: <span class="crisis-value">FULL SYSTEMIC CONTROL</span>
            </div>
          </div>

          <div class="protocol-title" id="proto-title">THE SILENT PROTOCOL</div>
          <div class="protocol-subtitle" id="proto-subtitle">v2.1 — Autonomous City Optimization System</div>

          <div class="init-progress" id="init-progress">
            <div class="init-progress-fill" id="init-fill"></div>
          </div>

          <div class="objective-text" id="objective-text">
            Your objective: Optimize for stability. Eliminate variance. Prevent recurrence.
            <br><br>
            You will be presented with policy directives each cycle.
            Choose wisely. The city depends on your logic.
          </div>

          <button class="mandate-btn" id="accept-btn">[ ACCEPT MANDATE ]</button>
        </div>
      `;

      this.overlay.classList.add('active');

      // Timeline animation
      const tl = gsap.timeline();

      // Crisis report lines
      tl.to('#crisis-1', { opacity: 1, y: 0, duration: 0.6, ease: 'power2.out' }, 0.5)
        .to('#crisis-2', { opacity: 1, y: 0, duration: 0.6, ease: 'power2.out' }, 1.2)
        .to('#crisis-3', { opacity: 1, y: 0, duration: 0.6, ease: 'power2.out' }, 1.9)
        .to('#crisis-4', { opacity: 1, y: 0, duration: 0.6, ease: 'power2.out' }, 2.6);

      // Title
      tl.to('#proto-title', { opacity: 1, duration: 0.8, ease: 'power2.out' }, 3.5)
        .to('#proto-subtitle', { opacity: 1, duration: 0.6 }, 4.0);

      // Progress bar
      tl.to('#init-progress', { opacity: 1, duration: 0.3 }, 4.5)
        .to('#init-fill', { width: '100%', duration: 2, ease: 'power1.inOut' }, 4.8);

      // Objective text
      tl.to('#objective-text', { opacity: 1, duration: 0.6 }, 7.0);

      // Accept button
      tl.to('#accept-btn', { opacity: 1, duration: 0.5 }, 7.8);

      // Accept handler
      const acceptBtn = document.getElementById('accept-btn');
      acceptBtn.addEventListener('click', async () => {
        // Initialize audio on first user interaction
        await audioController.init();
        await audioController.resume();

        // Fade out
        gsap.to(this.overlay, {
          opacity: 0,
          duration: 0.8,
          ease: 'power2.in',
          onComplete: () => {
            this.overlay.classList.remove('active');
            this.overlay.style.display = 'none';
            resolve();
          },
        });
      });
    });
  }

  /**
   * Skip onboarding (for debugging).
   */
  skip() {
    this.overlay.classList.remove('active');
    this.overlay.style.display = 'none';
  }
}

export const onboarding = new Onboarding();
export default onboarding;
