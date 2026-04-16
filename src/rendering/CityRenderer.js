/**
 * CityRenderer — Master Three.js scene controller.
 * Orchestrates camera, lighting, city, citizens, particles, and post-processing.
 */

import * as THREE from 'three';
import { eventBus } from '../core/EventBus.js';
import { gameState } from '../core/GameState.js';
import { RENDER_CONFIG, COLORS } from '../core/Constants.js';
import { cityBuilder } from './CityBuilder.js';
import { citizenSprites } from './CitizenSprites.js';
import { particleSystem } from './ParticleSystem.js';
import { postProcessing } from './PostProcessing.js';

class CityRenderer {
  constructor() {
    /** @type {THREE.WebGLRenderer} */
    this.renderer = null;

    /** @type {THREE.Scene} */
    this.scene = null;

    /** @type {THREE.OrthographicCamera} */
    this.camera = null;

    /** @type {THREE.DirectionalLight} */
    this.dirLight = null;

    /** @type {THREE.AmbientLight} */
    this.ambientLight = null;

    /** @type {HTMLElement} */
    this.container = null;

    /** @type {number} */
    this._animFrameId = null;

    /** @type {THREE.Clock} */
    this.clock = new THREE.Clock();

    /** @type {boolean} */
    this._running = false;
  }

  /**
   * Initialize the renderer and scene.
   * @param {HTMLElement} container — DOM element to render into
   */
  init(container) {
    this.container = container;
    const rect = container.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const aspect = width / height;

    // ─── Renderer ────────────────────────────────────
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance',
    });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor(0x0a0a0f, 1);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;
    container.appendChild(this.renderer.domElement);

    // ─── Scene ───────────────────────────────────────
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x0a0a0f, 0.02);

    // ─── Camera (Isometric Orthographic) ─────────────
    const zoom = RENDER_CONFIG.CAMERA_ZOOM;
    this.camera = new THREE.OrthographicCamera(
      -width / zoom, width / zoom,
      height / zoom, -height / zoom,
      0.1, 100
    );

    // Position for isometric view
    const camDist = 25;
    this.camera.position.set(
      camDist * Math.cos(RENDER_CONFIG.CAMERA_ROTATION) * Math.cos(RENDER_CONFIG.CAMERA_TILT),
      camDist * Math.sin(RENDER_CONFIG.CAMERA_TILT),
      camDist * Math.sin(RENDER_CONFIG.CAMERA_ROTATION) * Math.cos(RENDER_CONFIG.CAMERA_TILT)
    );
    this.camera.lookAt(0, 0, 0);

    // ─── Lighting ────────────────────────────────────
    // Directional light (sun/main)
    this.dirLight = new THREE.DirectionalLight(0xffeedd, 1.0);
    this.dirLight.position.set(10, 15, 8);
    this.dirLight.castShadow = true;
    this.dirLight.shadow.mapSize.width = 2048;
    this.dirLight.shadow.mapSize.height = 2048;
    this.dirLight.shadow.camera.near = 0.1;
    this.dirLight.shadow.camera.far = 50;
    this.dirLight.shadow.camera.left = -20;
    this.dirLight.shadow.camera.right = 20;
    this.dirLight.shadow.camera.top = 20;
    this.dirLight.shadow.camera.bottom = -20;
    this.scene.add(this.dirLight);

    // Ambient light
    this.ambientLight = new THREE.AmbientLight(0x404058, 0.5);
    this.scene.add(this.ambientLight);

    // Hemisphere light (sky/ground)
    const hemiLight = new THREE.HemisphereLight(0x606080, 0x202030, 0.3);
    this.scene.add(hemiLight);

    // ─── Build City ──────────────────────────────────
    const cityGroup = cityBuilder.build();
    this.scene.add(cityGroup);

    // ─── Citizen Sprites ─────────────────────────────
    citizenSprites.init();
    this.scene.add(citizenSprites.getGroup());

    // ─── Particle System ─────────────────────────────
    particleSystem.init();
    this.scene.add(particleSystem.getGroup());

    // ─── Post-Processing ─────────────────────────────
    postProcessing.init(this.renderer, this.scene, this.camera);

    // ─── Event Listeners ─────────────────────────────
    window.addEventListener('resize', () => this._onResize());
    eventBus.on('metrics:changed', (data) => this._updateLighting(data));

    return this;
  }

  /**
   * Start the render loop.
   */
  start() {
    if (this._running) return;
    this._running = true;
    this.clock.start();
    this._animate();
  }

  /**
   * Stop the render loop.
   */
  stop() {
    this._running = false;
    if (this._animFrameId) {
      cancelAnimationFrame(this._animFrameId);
    }
  }

  // ─── Render Loop ───────────────────────────────────────────────

  _animate() {
    if (!this._running) return;
    this._animFrameId = requestAnimationFrame(() => this._animate());

    const delta = this.clock.getDelta();
    const elapsed = this.clock.getElapsedTime();

    // Update particles
    particleSystem.update(delta);

    // Update citizen sprites
    citizenSprites.update(delta);

    // Update city builder dynamics (cars, noise, etc)
    cityBuilder.update(delta, elapsed);

    // Subtle camera sway
    this.camera.position.x += Math.sin(elapsed * 0.1) * 0.002;

    // Render with post-processing
    postProcessing.render(delta);
  }

  // ─── Dynamic Lighting ──────────────────────────────────────────

  _updateLighting(data) {
    const { current } = data;
    const hope = current.hope / 100;
    const fear = current.fear / 100;
    const silence = current.silence / 100;

    // Directional light warmth transition
    if (this.dirLight) {
      // Fear turns the light colder and darker
      const fearFactor = Math.max(0, fear - 0.5) * 2; // Scales 0 to 1 as fear goes 50->100
      const warmth = Math.max(0, hope - fearFactor * 0.5);
      
      this.dirLight.color.setHSL(
        0.08 * warmth,           // Hue: warm → neutral
        0.2 + warmth * 0.4,     // Saturation: low → medium
        0.5 + warmth * 0.3 - fearFactor * 0.2 // Lightness drops with fear
      );
      this.dirLight.intensity = Math.max(0.1, 0.6 + warmth * 0.4 - fearFactor * 0.4);
    }

    // Ambient light - fear adds a sickly green/blue cast
    if (this.ambientLight) {
      const coldness = 1 - hope;
      const sickness = Math.max(0, fear - 0.7) * 3.3; // 0 to 1 as fear 70->100
      
      this.ambientLight.color.setHSL(
        0.6 + coldness * 0.1 - sickness * 0.15, // Shift towards sickly green-blue
        0.1 + coldness * 0.15 + sickness * 0.3, // High saturation for the sick color
        0.25 + hope * 0.15 - sickness * 0.1     // Darker
      );
      this.ambientLight.intensity = Math.max(0.1, 0.5 - silence * 0.25);
    }

    // Scene fog density
    if (this.scene.fog) {
      this.scene.fog.density = 0.015 + silence * 0.03;
    }
  }

  // ─── Resize Handler ────────────────────────────────────────────

  _onResize() {
    if (!this.container) return;
    const rect = this.container.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const zoom = RENDER_CONFIG.CAMERA_ZOOM;

    this.camera.left = -width / zoom;
    this.camera.right = width / zoom;
    this.camera.top = height / zoom;
    this.camera.bottom = -height / zoom;
    this.camera.updateProjectionMatrix();

    this.renderer.setSize(width, height);
    postProcessing.resize(width, height);
  }

  /**
   * Dispose of all resources.
   */
  dispose() {
    this.stop();
    if (this.renderer) {
      this.renderer.dispose();
      this.container?.removeChild(this.renderer.domElement);
    }
  }
}

export const cityRenderer = new CityRenderer();
export default cityRenderer;
