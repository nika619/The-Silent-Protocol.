/**
 * SFXSystem — Procedurally generated UI sound effects using Web Audio API.
 * No external audio files needed — everything is synthesized.
 */

class SFXSystem {
  constructor() {
    /** @type {AudioContext} */
    this.ctx = null;

    /** @type {GainNode} */
    this.masterGain = null;

    /** @type {number} Current warmth value (0 = cold, 1 = warm) */
    this._warmth = 1.0;
  }

  /**
   * Initialize the SFX system.
   * @param {AudioContext} audioContext 
   * @param {GainNode} masterGain 
   */
  init(audioContext, masterGain) {
    this.ctx = audioContext;
    this.masterGain = masterGain;
  }

  /**
   * Set warmth for sound character.
   * @param {number} warmth — 0–1
   */
  setWarmth(warmth) {
    this._warmth = warmth;
  }

  /**
   * Card hover sound — soft glass tap.
   */
  playHover() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(800 + this._warmth * 400, now);
    osc.frequency.exponentialRampToValueAtTime(1200, now + 0.05);

    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.12);
  }

  /**
   * Card select / policy commit — heavy mechanical thud.
   */
  playCommit() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    // Low frequency thud
    const osc1 = this.ctx.createOscillator();
    const gain1 = this.ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(80, now);
    osc1.frequency.exponentialRampToValueAtTime(30, now + 0.3);
    gain1.gain.setValueAtTime(0.4, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
    osc1.connect(gain1);
    gain1.connect(this.masterGain);
    osc1.start(now);
    osc1.stop(now + 0.6);

    // Metallic click
    const osc2 = this.ctx.createOscillator();
    const gain2 = this.ctx.createGain();
    osc2.type = 'square';
    osc2.frequency.setValueAtTime(2000 - this._warmth * 800, now);
    osc2.frequency.exponentialRampToValueAtTime(100, now + 0.05);
    gain2.gain.setValueAtTime(0.15, now);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
    osc2.connect(gain2);
    gain2.connect(this.masterGain);
    osc2.start(now);
    osc2.stop(now + 0.1);

    // Noise burst (physical impact)
    const bufferSize = this.ctx.sampleRate * 0.1;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.1));
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.1, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

    // Low-pass filter for thud character
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(500, now);

    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(this.masterGain);
    noise.start(now);
  }

  /**
   * Cycle advance — mechanical tick.
   */
  playCycleAdvance() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    // Sharp click
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(3000, now);
    osc.frequency.exponentialRampToValueAtTime(800, now + 0.02);
    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.08);

    // Low resonant follow
    const osc2 = this.ctx.createOscillator();
    const gain2 = this.ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(200, now + 0.03);
    gain2.gain.setValueAtTime(0.06, now + 0.03);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
    osc2.connect(gain2);
    gain2.connect(this.masterGain);
    osc2.start(now + 0.03);
    osc2.stop(now + 0.35);
  }

  /**
   * Threshold event — low resonant warning tone.
   */
  playThreshold() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(120, now);
    osc.frequency.linearRampToValueAtTime(80, now + 0.8);
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.15, now + 0.1);
    gain.gain.linearRampToValueAtTime(0.15, now + 0.5);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 1.2);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 1.3);
  }

  /**
   * UI blip — soft notification.
   */
  playBlip() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(600 + this._warmth * 300, now);
    osc.frequency.setValueAtTime(800 + this._warmth * 200, now + 0.05);
    gain.gain.setValueAtTime(0.06, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.18);
  }

  /**
   * Final silence — system heartbeat then flatline.
   */
  playFlatline(duration = 4) {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    // Heartbeat beeps getting slower
    const beats = [0, 0.8, 1.8, 3.0];
    beats.forEach((time, i) => {
      if (now + time > now + duration) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, now + time);
      gain.gain.setValueAtTime(0.1 - i * 0.02, now + time);
      gain.gain.exponentialRampToValueAtTime(0.001, now + time + 0.15);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(now + time);
      osc.stop(now + time + 0.2);
    });

    // Final flatline tone
    const flat = this.ctx.createOscillator();
    const flatGain = this.ctx.createGain();
    flat.type = 'sine';
    flat.frequency.setValueAtTime(440, now + duration);
    flatGain.gain.setValueAtTime(0, now + duration);
    flatGain.gain.linearRampToValueAtTime(0.08, now + duration + 0.5);
    flatGain.gain.linearRampToValueAtTime(0.08, now + duration + 2);
    flatGain.gain.exponentialRampToValueAtTime(0.001, now + duration + 3);
    flat.connect(flatGain);
    flatGain.connect(this.masterGain);
    flat.start(now + duration);
    flat.stop(now + duration + 3.5);
  }
}

export const sfxSystem = new SFXSystem();
export default sfxSystem;
