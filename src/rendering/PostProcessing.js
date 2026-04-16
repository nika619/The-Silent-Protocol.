/**
 * PostProcessing — EffectComposer pipeline with metric-driven shader parameters.
 * Controls bloom, desaturation, atmosphere, and surveillance overlay.
 */

import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

import { eventBus } from '../core/EventBus.js';
import { gameState } from '../core/GameState.js';
import { RENDER_CONFIG } from '../core/Constants.js';
import desaturateShader from './shaders/desaturate.js';
import atmosphereShader from './shaders/atmosphere.js';
import scanShader from './shaders/scan.js';

class PostProcessing {
  constructor() {
    /** @type {EffectComposer} */
    this.composer = null;

    /** @type {UnrealBloomPass} */
    this.bloomPass = null;

    /** @type {ShaderPass} */
    this.desatPass = null;

    /** @type {ShaderPass} */
    this.atmosPass = null;

    /** @type {ShaderPass} */
    this.scanPass = null;

    this._time = 0;
  }

  /**
   * Initialize the post-processing pipeline.
   * @param {THREE.WebGLRenderer} renderer 
   * @param {THREE.Scene} scene 
   * @param {THREE.Camera} camera 
   */
  init(renderer, scene, camera) {
    const size = renderer.getSize(new THREE.Vector2());

    this.composer = new EffectComposer(renderer);

    // 1. Render pass
    const renderPass = new RenderPass(scene, camera);
    this.composer.addPass(renderPass);

    // 2. Bloom pass
    this.bloomPass = new UnrealBloomPass(
      new THREE.Vector2(size.x, size.y),
      RENDER_CONFIG.BLOOM_STRENGTH_MAX,
      RENDER_CONFIG.BLOOM_RADIUS,
      RENDER_CONFIG.BLOOM_THRESHOLD
    );
    this.composer.addPass(this.bloomPass);

    // 3. Desaturation pass
    this.desatPass = new ShaderPass(desaturateShader);
    this.composer.addPass(this.desatPass);

    // 4. Atmosphere pass (fog + vignette)
    this.atmosPass = new ShaderPass(atmosphereShader);
    this.composer.addPass(this.atmosPass);

    // 5. Scan lines + chromatic aberration + glitch
    this.scanPass = new ShaderPass(scanShader);
    this.scanPass.uniforms.resolution.value = [size.x, size.y];
    this.composer.addPass(this.scanPass);

    // 6. Output pass
    const outputPass = new OutputPass();
    this.composer.addPass(outputPass);

    // Listen for metric changes
    eventBus.on('metrics:changed', () => this._updateFromMetrics());

    // Initial update
    this._updateFromMetrics();
  }

  /**
   * Update shader parameters from current game metrics.
   */
  _updateFromMetrics() {
    const atmos = gameState.getAtmosphere();

    // Bloom
    if (this.bloomPass) {
      this.bloomPass.strength = THREE.MathUtils.lerp(
        RENDER_CONFIG.BLOOM_STRENGTH_MIN,
        RENDER_CONFIG.BLOOM_STRENGTH_MAX,
        atmos.bloomStrength
      );
    }

    // Desaturation
    if (this.desatPass) {
      this.desatPass.uniforms.saturation.value = atmos.saturation;
      this.desatPass.uniforms.warmth.value = gameState.getNormalized('hope');
      // Add cyan tint as saturation drops
      this.desatPass.uniforms.tintStrength.value =
        Math.max(0, 1 - atmos.saturation) * 0.15;
    }

    // Atmosphere
    if (this.atmosPass) {
      this.atmosPass.uniforms.fogDensity.value = atmos.fogDensity;
      this.atmosPass.uniforms.vignetteStrength.value = atmos.vignetteStrength;
    }

    // Scan / glitch
    if (this.scanPass) {
      this.scanPass.uniforms.scanlineIntensity.value = atmos.scanlineIntensity;
      this.scanPass.uniforms.chromaticAberration.value = atmos.chromaticAberration;
      this.scanPass.uniforms.glitchIntensity.value = atmos.glitchIntensity;
    }
  }

  /**
   * Render the post-processing pipeline.
   * @param {number} deltaTime 
   */
  render(deltaTime) {
    this._time += deltaTime;

    // Update time-based uniforms
    if (this.atmosPass) {
      this.atmosPass.uniforms.time.value = this._time;
    }
    if (this.scanPass) {
      this.scanPass.uniforms.time.value = this._time;
    }

    this.composer.render(deltaTime);
  }

  /**
   * Handle window resize.
   */
  resize(width, height) {
    if (this.composer) {
      this.composer.setSize(width, height);
    }
    if (this.scanPass) {
      this.scanPass.uniforms.resolution.value = [width, height];
    }
  }
}

export const postProcessing = new PostProcessing();
export default postProcessing;
