/**
 * ParticleSystem — Atmospheric particles that decay with the city.
 * Warm fireflies → cold mechanical sparks → near-empty void.
 */

import * as THREE from 'three';
import { eventBus } from '../core/EventBus.js';
import { gameState } from '../core/GameState.js';
import { RENDER_CONFIG } from '../core/Constants.js';

class ParticleSystem {
  constructor() {
    /** @type {THREE.Points} Main particle system */
    this.particles = null;

    /** @type {THREE.BufferGeometry} */
    this.geometry = null;

    /** @type {Float32Array} Particle positions */
    this.positions = null;

    /** @type {Float32Array} Particle velocities */
    this.velocities = null;

    /** @type {Float32Array} Particle colors */
    this.colors = null;

    /** @type {Float32Array} Particle lifetimes */
    this.lifetimes = null;

    /** @type {number} Current active particle count */
    this.activeCount = RENDER_CONFIG.MAX_PARTICLES;

    /** @type {THREE.Group} */
    this.group = new THREE.Group();
  }

  /**
   * Initialize the particle system.
   */
  init() {
    const maxP = RENDER_CONFIG.MAX_PARTICLES;

    this.geometry = new THREE.BufferGeometry();
    this.positions = new Float32Array(maxP * 3);
    this.velocities = new Float32Array(maxP * 3);
    this.colors = new Float32Array(maxP * 3);
    this.lifetimes = new Float32Array(maxP);

    // Initialize particles
    for (let i = 0; i < maxP; i++) {
      this._resetParticle(i);
    }

    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    this.geometry.setAttribute('color', new THREE.BufferAttribute(this.colors, 3));

    const material = new THREE.PointsMaterial({
      size: 0.12,
      transparent: true,
      opacity: 0.6,
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
    });

    this.particles = new THREE.Points(this.geometry, material);
    this.group.add(this.particles);

    eventBus.on('metrics:changed', () => this._updateParticleCount());
  }

  /**
   * Get the particle group.
   */
  getGroup() {
    return this.group;
  }

  /**
   * Reset a single particle position.
   */
  _resetParticle(index) {
    const i3 = index * 3;
    const spread = RENDER_CONFIG.CITY_WIDTH * 0.6;
    const heightSpread = 6;

    this.positions[i3] = (Math.random() - 0.5) * spread;
    this.positions[i3 + 1] = Math.random() * heightSpread + 0.5;
    this.positions[i3 + 2] = (Math.random() - 0.5) * spread;

    this.velocities[i3] = (Math.random() - 0.5) * 0.005;
    this.velocities[i3 + 1] = (Math.random() - 0.5) * 0.003 + 0.002;
    this.velocities[i3 + 2] = (Math.random() - 0.5) * 0.005;

    this.lifetimes[index] = Math.random() * 200 + 100;

    // Color based on current state
    this._updateParticleColor(index);
  }

  /**
   * Update particle color based on game state.
   */
  _updateParticleColor(index) {
    const i3 = index * 3;
    const hope = gameState.metrics.hope / 100;
    const silence = gameState.metrics.silence / 100;

    if (hope > 0.5) {
      // Warm particles: amber/golden fireflies
      this.colors[i3] = 1.0;
      this.colors[i3 + 1] = 0.7 + Math.random() * 0.3;
      this.colors[i3 + 2] = 0.2 + Math.random() * 0.2;
    } else if (silence < 0.7) {
      // Cool particles: blue-ish
      this.colors[i3] = 0.3 + Math.random() * 0.2;
      this.colors[i3 + 1] = 0.5 + Math.random() * 0.3;
      this.colors[i3 + 2] = 0.7 + Math.random() * 0.3;
    } else {
      // Cold particles: cyan/white sparks
      this.colors[i3] = 0.0;
      this.colors[i3 + 1] = 0.8 + Math.random() * 0.2;
      this.colors[i3 + 2] = 0.7 + Math.random() * 0.3;
    }
  }

  /**
   * Update active particle count based on metrics.
   */
  _updateParticleCount() {
    const silence = gameState.metrics.silence / 100;
    const hope = gameState.metrics.hope / 100;

    this.activeCount = Math.round(
      RENDER_CONFIG.MIN_PARTICLES +
      (RENDER_CONFIG.MAX_PARTICLES - RENDER_CONFIG.MIN_PARTICLES) *
      (1 - silence * 0.8) * (0.3 + hope * 0.7)
    );

    // Update material opacity
    if (this.particles) {
      this.particles.material.opacity = Math.max(0.1, 0.6 * (1 - silence * 0.7));
      this.particles.material.size = Math.max(0.04, 0.12 * (0.3 + hope * 0.7));
    }
  }

  /**
   * Update particle animation.
   * @param {number} deltaTime 
   */
  update(deltaTime) {
    if (!this.positions) return;

    for (let i = 0; i < RENDER_CONFIG.MAX_PARTICLES; i++) {
      const i3 = i * 3;

      // Hide inactive particles
      if (i >= this.activeCount) {
        this.positions[i3 + 1] = -100;
        continue;
      }

      // Update lifetime
      this.lifetimes[i] -= 1;
      if (this.lifetimes[i] <= 0) {
        this._resetParticle(i);
        continue;
      }

      // Update position
      this.positions[i3] += this.velocities[i3];
      this.positions[i3 + 1] += this.velocities[i3 + 1];
      this.positions[i3 + 2] += this.velocities[i3 + 2];

      // Add subtle sine wave movement
      this.positions[i3] += Math.sin(Date.now() * 0.001 + i) * 0.002;

      // Wrap around
      const halfSpread = RENDER_CONFIG.CITY_WIDTH * 0.3;
      if (Math.abs(this.positions[i3]) > halfSpread) {
        this.positions[i3] *= -0.8;
      }
      if (this.positions[i3 + 1] > 7) {
        this.positions[i3 + 1] = 0.5;
      }
    }

    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.attributes.color.needsUpdate = true;
  }

  /**
   * Reset the particle system.
   */
  reset() {
    this.activeCount = RENDER_CONFIG.MAX_PARTICLES;
    for (let i = 0; i < RENDER_CONFIG.MAX_PARTICLES; i++) {
      this._resetParticle(i);
    }
  }
}

export const particleSystem = new ParticleSystem();
export default particleSystem;
