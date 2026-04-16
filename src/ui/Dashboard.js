/**
 * Dashboard — Metrics display, vitality EKG, cycle indicator.
 * Renders the right-side command panel metrics.
 */

import { gsap } from 'gsap';
import { eventBus } from '../core/EventBus.js';
import { gameState } from '../core/GameState.js';
import { METRIC_LABELS, COLORS, UI_DECAY } from '../core/Constants.js';

class Dashboard {
  constructor() {
    /** @type {HTMLElement} */
    this.container = null;

    /** @type {Object} Metric DOM elements */
    this.metricElements = {};

    /** @type {CanvasRenderingContext2D} */
    this.ekgCtx = null;

    /** @type {Array} EKG data points */
    this.ekgData = [];

    /** @type {number} EKG animation frame */
    this._ekgFrame = null;

    /** @type {Object} Previous metric values for delta display */
    this._previousMetrics = null;
  }

  /**
   * Initialize the dashboard.
   * @param {HTMLElement} container — The #dashboard element
   */
  init(container) {
    this.container = container;
    this._render();
    this._initEKG();

    eventBus.on('metrics:changed', (data) => this._updateMetrics(data));
    eventBus.on('cycle:advanced', (data) => this._updateCycle(data));
    eventBus.on('phase:changed', (data) => this._updatePhase(data));
    eventBus.on('ui:decay', () => this._applyDecay());

    // Fix 7: Dynamic Previews
    eventBus.on('policy:hover', (data) => this._showPreview(data));
    eventBus.on('policy:leave', () => this._hidePreview());
  }

  /**
   * Render the dashboard HTML.
   */
  _render() {
    this.container.innerHTML = `
      <div class="dashboard-header">
        <span class="protocol-label">PROTOCOL-OS v2.1</span>
        <span class="status-dot"></span>
      </div>

      <div class="vitality-section">
        <div class="vitality-label">City Vitality</div>
        <canvas class="vitality-canvas" id="ekg-canvas"></canvas>
      </div>

      <div class="cycle-section">
        <div>
          <div class="cycle-label">Active Cycle</div>
          <div class="cycle-value" id="cycle-display">01 / 15</div>
        </div>
        <span class="phase-badge early" id="phase-badge">CALIBRATING</span>
      </div>
      <div class="cycle-progress-bar">
        <div class="cycle-progress-fill" id="cycle-progress" style="width: 0%"></div>
      </div>

      <div class="metrics-section" id="metrics-container"></div>

      <div id="narrative-container"></div>
      <div id="policies-container"></div>
    `;

    // Render metric rows
    const metricsContainer = document.getElementById('metrics-container');
    const metricKeys = ['hope', 'fear', 'silence', 'efficiency', 'disorder'];

    metricKeys.forEach(key => {
      const info = METRIC_LABELS[key];
      const value = gameState.metrics[key];
      const colorMap = COLORS.METRIC[key];

      const row = document.createElement('div');
      row.className = 'metric-row';
      row.id = `metric-row-${key}`;
      row.innerHTML = `
        <div class="metric-header">
          <span class="metric-name">
            <span class="icon">${info.icon}</span>
            <span class="label-text" id="metric-label-${key}">${info.full}</span>
          </span>
          <div style="display: flex; align-items: center; gap: 6px;">
            <span class="metric-delta" id="metric-delta-${key}"></span>
            <span class="metric-value" id="metric-value-${key}">${value}%</span>
          </div>
        </div>
        <div class="metric-bar-container">
          <div class="metric-bar-fill" id="metric-bar-${key}"
               style="width: ${value}%; background-color: ${colorMap.high}"></div>
          <div class="metric-bar-preview" id="metric-bar-preview-${key}"></div>
        </div>
      `;

      metricsContainer.appendChild(row);
      this.metricElements[key] = {
        value: document.getElementById(`metric-value-${key}`),
        bar: document.getElementById(`metric-bar-${key}`),
        preview: document.getElementById(`metric-bar-preview-${key}`),
        delta: document.getElementById(`metric-delta-${key}`),
        label: document.getElementById(`metric-label-${key}`),
      };
    });
  }

  /**
   * Initialize the EKG canvas.
   */
  _initEKG() {
    const canvas = document.getElementById('ekg-canvas');
    if (!canvas) return;

    const rect = canvas.parentElement.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = 40;
    this.ekgCtx = canvas.getContext('2d');

    // Initialize EKG data
    this.ekgData = new Array(Math.round(canvas.width)).fill(0);
    this._animateEKG();
  }

  /**
   * Animate the EKG heartbeat line.
   */
  _animateEKG() {
    if (!this.ekgCtx) return;
    const ctx = this.ekgCtx;
    const canvas = ctx.canvas;
    const vitality = gameState.getVitality();

    // Shift data left
    this.ekgData.shift();

    // Generate new data point
    const t = Date.now() * 0.003;
    const heartbeatFreq = 0.5 + vitality * 2;
    const amplitude = vitality * 15;

    // Heartbeat simulation
    let val = 0;
    const phase = (t * heartbeatFreq) % 1;
    if (phase < 0.1) {
      val = Math.sin(phase * Math.PI / 0.1) * amplitude * 0.3;
    } else if (phase < 0.15) {
      val = -Math.sin((phase - 0.1) * Math.PI / 0.05) * amplitude * 0.2;
    } else if (phase < 0.25) {
      val = Math.sin((phase - 0.15) * Math.PI / 0.1) * amplitude;
    } else if (phase < 0.35) {
      val = -Math.sin((phase - 0.25) * Math.PI / 0.1) * amplitude * 0.4;
    } else {
      val = Math.sin((phase - 0.35) * Math.PI * 2 / 0.65) * amplitude * 0.02;
    }

    // Add noise
    val += (Math.random() - 0.5) * 2 * vitality;

    this.ekgData.push(val);

    // Draw
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const centerY = canvas.height / 2;

    // Background line
    ctx.strokeStyle = 'rgba(0, 255, 213, 0.08)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, centerY);
    ctx.lineTo(canvas.width, centerY);
    ctx.stroke();

    // EKG line
    const alpha = 0.3 + vitality * 0.7;
    ctx.strokeStyle = `rgba(0, 255, 213, ${alpha})`;
    ctx.lineWidth = 1.5;
    ctx.beginPath();

    for (let i = 0; i < this.ekgData.length; i++) {
      const x = i;
      const y = centerY - this.ekgData[i];
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.stroke();

    // Glow effect
    ctx.strokeStyle = `rgba(0, 255, 213, ${alpha * 0.3})`;
    ctx.lineWidth = 4;
    ctx.beginPath();
    for (let i = 0; i < this.ekgData.length; i++) {
      const x = i;
      const y = centerY - this.ekgData[i];
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Sweep line
    const sweepX = this.ekgData.length - 1;
    ctx.strokeStyle = `rgba(0, 255, 213, ${alpha})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(sweepX, 0);
    ctx.lineTo(sweepX, canvas.height);
    ctx.stroke();

    this._ekgFrame = requestAnimationFrame(() => this._animateEKG());
  }

  /**
   * Update metric displays.
   */
  _updateMetrics(data) {
    const { current, previous, deltas } = data;

    Object.keys(this.metricElements).forEach(key => {
      const el = this.metricElements[key];
      const value = current[key];
      const delta = deltas[key];
      const colorMap = COLORS.METRIC[key];

      // Animate value counter
      const currentDisplayed = parseInt(el.value.textContent);
      gsap.to({ val: currentDisplayed }, {
        val: value,
        duration: 0.8,
        ease: 'power2.out',
        onUpdate: function () {
          el.value.textContent = `${Math.round(this.targets()[0].val)}%`;
        },
      });

      // Animate bar width
      gsap.to(el.bar, {
        width: `${value}%`,
        duration: 0.8,
        ease: 'power2.out',
      });

      // Update bar color
      let color;
      if (value > 65) color = colorMap.high;
      else if (value > 35) color = colorMap.mid;
      else color = colorMap.low;
      el.bar.style.backgroundColor = color;

      // Show delta
      if (delta && delta !== 0) {
        el.delta.textContent = `${delta > 0 ? '+' : ''}${delta}`;
        el.delta.className = `metric-delta ${delta > 0 ? 'positive' : 'negative'} show`;
        setTimeout(() => {
          el.delta.classList.remove('show');
        }, 2000);
      }
    });

    this._previousMetrics = { ...current };
  }

  /**
   * Show preview numbers matching policy effects
   */
  _showPreview({ effects }) {
    Object.keys(this.metricElements).forEach(key => {
      const el = this.metricElements[key];
      const delta = effects[key] || 0;
      
      if (delta !== 0) {
        const currentVal = gameState.metrics[key];
        // Calculate new clamped width
        const newVal = Math.max(0, Math.min(100, currentVal + delta));

        // Show ghost bar up to the new length
        el.preview.style.width = `${newVal}%`;
        el.preview.classList.add('show');

        // Show temporary ghost delta next to the name
        el.delta.textContent = `${delta > 0 ? '+' : ''}${delta}`;
        el.delta.className = 'metric-delta preview show';

        // Highlight value
        el.value.classList.add('preview');
      }
    });
  }

  /**
   * Hide preview numbers when hover leaves 
   */
  _hidePreview() {
    Object.keys(this.metricElements).forEach(key => {
      const el = this.metricElements[key];
      
      el.preview.classList.remove('show');
      
      // If we aren't showing a committed delta right now, hide the delta
      if (el.delta.classList.contains('preview')) {
        el.delta.classList.remove('show', 'preview');
      }
      
      el.value.classList.remove('preview');
    });
  }

  /**
   * Update cycle display.
   */
  _updateCycle(data) {
    const cycleDisplay = document.getElementById('cycle-display');
    const progress = document.getElementById('cycle-progress');

    if (cycleDisplay) {
      cycleDisplay.textContent = `${String(data.cycle).padStart(2, '0')} / ${gameState.maxCycles}`;
    }
    if (progress) {
      progress.style.width = `${(data.cycle / gameState.maxCycles) * 100}%`;
    }
  }

  /**
   * Update phase badge.
   */
  _updatePhase(data) {
    const badge = document.getElementById('phase-badge');
    if (badge) {
      badge.className = `phase-badge ${data.current.name}`;
      badge.textContent = data.current.label;
    }
  }

  /**
   * Apply UI decay based on silence level.
   */
  _applyDecay() {
    const silence = gameState.metrics.silence;

    // Simplify labels at threshold
    if (silence >= UI_DECAY.SIMPLIFY_LABELS) {
      Object.keys(this.metricElements).forEach(key => {
        const label = this.metricElements[key].label;
        if (label) {
          label.textContent = METRIC_LABELS[key].short;
        }
      });
    }

    // Monochrome UI
    if (silence >= UI_DECAY.MONOCHROME_UI) {
      this.container.style.setProperty('--color-accent-warm', '#888');
      this.container.style.filter = `saturate(${Math.max(0.1, 1 - (silence - 75) / 25)})`;
    }

    // Glitch
    if (silence >= UI_DECAY.GLITCH_START) {
      if (!this._glitchInterval) {
        this._glitchInterval = setInterval(() => this._triggerDataGlitch(), 4000);
      }
    } else {
      if (this._glitchInterval) {
        clearInterval(this._glitchInterval);
        this._glitchInterval = null;
      }
    }
  }

  /**
   * Randomly scramble numeric outputs in the dashboard to simulate OS failure.
   */
  _triggerDataGlitch() {
    const chars = '!@#$%^&*()_+-=[]{}|;:,.<>?0123456789A-Z';
    Object.keys(this.metricElements).forEach(key => {
      if (Math.random() > 0.4) return; // Only 40% chance per metric

      const el = this.metricElements[key].value;
      const originalText = el.textContent;
      
      // Glitch visual class
      el.classList.add('text-glitch');
      
      // Scramble for 200ms
      let scrambleInt = setInterval(() => {
        let scrambled = '';
        for (let i = 0; i < originalText.length; i++) {
          if (originalText[i] === '%') scrambled += '%';
          else scrambled += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        el.textContent = scrambled;
      }, 40);

      // Restore
      setTimeout(() => {
        clearInterval(scrambleInt);
        el.textContent = originalText;
        el.classList.remove('text-glitch');
      }, 200);
    });
  }

  /**
   * Destroy the dashboard.
   */
  destroy() {
    if (this._ekgFrame) {
      cancelAnimationFrame(this._ekgFrame);
    }
  }
}

export const dashboard = new Dashboard();
export default dashboard;
