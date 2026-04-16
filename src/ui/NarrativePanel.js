/**
 * NarrativePanel — Displays headlines, chat logs, system alerts, and recurring citizen stories.
 * Fix 4: Shows ALL matching citizen stories per cycle, suppresses stale chat.
 */

import { gsap } from 'gsap';
import { eventBus } from '../core/EventBus.js';
import { gameState } from '../core/GameState.js';

class NarrativePanel {
  constructor() {
    /** @type {HTMLElement} */
    this.container = null;

    /** @type {HTMLElement} */
    this.tickerElement = null;
  }

  /**
   * Initialize the narrative panel.
   * @param {HTMLElement} container — narrative container inside dashboard
   * @param {HTMLElement} tickerContainer — ticker across city view
   */
  init(container, tickerContainer) {
    this.container = container;
    this.tickerElement = tickerContainer;

    eventBus.on('narrative:updated', (content) => this._renderContent(content));
  }

  /**
   * Render narrative content.
   */
  _renderContent(content) {
    if (!this.container) return;

    let html = '<div class="narrative-section">';

    // System alert
    if (content.systemAlert) {
      html += `
        <div class="system-alert fade-in-up">
          <span class="alert-prefix">SYS:</span>
          ${content.systemAlert.text}
        </div>
      `;
    }

    // ─── FIX 4: ALL Citizen Stories ────────────────────────────────
    const stories = content.citizenStories || [];
    stories.forEach(story => {
      const isLate = gameState.currentCycle >= 10;
      const isGone = story.text.startsWith('[');
      const isStale = story.isStale;
      
      html += `
        <div class="citizen-story fade-in-up ${isGone ? 'gone' : ''} ${isStale ? 'stale' : ''}">
          <div class="citizen-story-header">
            <span class="citizen-name ${isLate ? 'id-only' : ''}">${story.name}</span>
            <span class="citizen-occupation">${isGone ? '' : story.occupation}</span>
          </div>
          <div class="citizen-story-text ${isGone ? 'status-text' : ''}">${isGone ? story.text : `"${story.text}"`}</div>
        </div>
      `;
    });

    // Chat log — only shows when NO citizen stories are active
    if (content.chatLog && stories.length === 0) {
      html += `
        <div class="chat-entry fade-in-up">
          <span class="chat-sender">${content.chatLog.sender}</span>
          <span class="chat-message">"${content.chatLog.text}"</span>
        </div>
      `;
    }

    html += '</div>';
    this.container.innerHTML = html;

    // Animate entries
    const entries = this.container.querySelectorAll('.fade-in-up');
    entries.forEach((entry, i) => {
      gsap.from(entry, {
        opacity: 0,
        y: 10,
        duration: 0.5,
        delay: i * 0.2,
        ease: 'power2.out',
      });
    });

    // Update ticker
    if (this.tickerElement && content.headline) {
      this.tickerElement.innerHTML = `
        <div class="headline-ticker">
          <div class="headline-text">
            <span class="headline-prefix">▸ FEED:</span>
            ${content.headline.text}
          </div>
        </div>
      `;

      gsap.from(this.tickerElement.querySelector('.headline-text'), {
        opacity: 0,
        x: 20,
        duration: 0.6,
        ease: 'power2.out',
      });
    }
  }
}

export const narrativePanel = new NarrativePanel();
export default narrativePanel;
