/**
 * AudioController — Master audio manager.
 * Coordinates music, ambience, and SFX systems.
 * Applies global filtering and effects based on game state.
 */

import { eventBus } from '../core/EventBus.js';
import { gameState } from '../core/GameState.js';
import { AUDIO_CONFIG } from '../core/Constants.js';
import { musicSystem } from './MusicSystem.js';
import { ambienceSystem } from './AmbienceSystem.js';
import { sfxSystem } from './SFXSystem.js';

class AudioController {
  constructor() {
    /** @type {AudioContext} */
    this.ctx = null;

    /** @type {GainNode} Master volume */
    this.masterGain = null;

    /** @type {GainNode} Music bus */
    this.musicBus = null;

    /** @type {GainNode} Ambience bus */
    this.ambienceBus = null;

    /** @type {GainNode} SFX bus */
    this.sfxBus = null;

    /** @type {BiquadFilterNode} Global low-pass */
    this.globalFilter = null;

    /** @type {boolean} */
    this._initialized = false;

    /** @type {boolean} */
    this._started = false;
  }

  /**
   * Initialize the audio context (must be called from user interaction).
   */
  async init() {
    if (this._initialized) return;

    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();

      // Resume context if suspended
      if (this.ctx.state === 'suspended') {
        await this.ctx.resume();
      }

      // ─── Routing Chain ──────────────────────────
      //   Sources → Bus Gains → Global Filter → Master Gain → Destination

      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = AUDIO_CONFIG.MASTER_VOLUME;

      // Global low-pass filter (muffles world as silence increases)
      this.globalFilter = this.ctx.createBiquadFilter();
      this.globalFilter.type = 'lowpass';
      this.globalFilter.frequency.value = AUDIO_CONFIG.LOWPASS_MAX;
      this.globalFilter.Q.value = 0.7;

      this.globalFilter.connect(this.masterGain);
      this.masterGain.connect(this.ctx.destination);

      // Music bus
      this.musicBus = this.ctx.createGain();
      this.musicBus.gain.value = 1.0;
      this.musicBus.connect(this.globalFilter);

      // Ambience bus
      this.ambienceBus = this.ctx.createGain();
      this.ambienceBus.gain.value = 1.0;
      this.ambienceBus.connect(this.globalFilter);

      // SFX bus (bypasses global filter for UI clarity)
      this.sfxBus = this.ctx.createGain();
      this.sfxBus.gain.value = AUDIO_CONFIG.SFX_VOLUME;
      this.sfxBus.connect(this.masterGain);

      // Initialize subsystems
      musicSystem.init(this.ctx, this.musicBus);
      ambienceSystem.init(this.ctx, this.ambienceBus);
      sfxSystem.init(this.ctx, this.sfxBus);

      // Listen for metric changes
      eventBus.on('metrics:changed', (data) => this._updateGlobalAudio(data));
      eventBus.on('game:over', () => this._handleGameOver());
      eventBus.on('threshold:crossed', () => sfxSystem.playThreshold());

      this._initialized = true;
      console.log('[AudioController] Initialized');
    } catch (e) {
      console.error('[AudioController] Failed to initialize:', e);
    }
  }

  /**
   * Start all audio playback.
   */
  start() {
    if (!this._initialized || this._started) return;
    this._started = true;

    musicSystem.start();
    ambienceSystem.start();
  }

  /**
   * Update global audio parameters from metrics.
   */
  _updateGlobalAudio(data) {
    const { current } = data;
    const silence = current.silence;
    const hope = current.hope;
    const fear = current.fear;

    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    // Global low-pass: muffles the world as silence increases
    const filterFreq = AUDIO_CONFIG.LOWPASS_MAX -
      (silence / 100) * (AUDIO_CONFIG.LOWPASS_MAX - AUDIO_CONFIG.LOWPASS_MIN);
    this.globalFilter.frequency.linearRampToValueAtTime(filterFreq, now + 1);

    // Update subsystems
    musicSystem.update(silence, hope);
    ambienceSystem.update(silence, hope);

    // Update SFX warmth
    sfxSystem.setWarmth(hope / 100);
  }

  /**
   * Handle game over — trigger flatline and fade all.
   */
  _handleGameOver() {
    musicSystem.stop();
    ambienceSystem.stop();
    sfxSystem.playFlatline(3);

    // Fade master to near-silence
    if (this.masterGain && this.ctx) {
      const now = this.ctx.currentTime;
      this.masterGain.gain.linearRampToValueAtTime(0.15, now + 4);
      this.masterGain.gain.linearRampToValueAtTime(0.0, now + 8);
    }
  }

  /**
   * Stop all audio.
   */
  stop() {
    musicSystem.stop();
    ambienceSystem.stop();
    this._started = false;
  }

  /**
   * Get the SFX system for direct UI calls.
   */
  getSFX() {
    return sfxSystem;
  }

  /**
   * Resume audio context (for browsers that require user interaction).
   */
  async resume() {
    if (this.ctx && this.ctx.state === 'suspended') {
      await this.ctx.resume();
    }
  }
}

export const audioController = new AudioController();
export default audioController;
