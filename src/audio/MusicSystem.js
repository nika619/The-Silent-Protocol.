/**
 * MusicSystem — Procedural layered music using Web Audio API.
 * Four stems: melody, harmony, rhythm, drone.
 * Each layer fades independently based on silence thresholds.
 */

import { AUDIO_CONFIG } from '../core/Constants.js';

class MusicSystem {
  constructor() {
    /** @type {AudioContext} */
    this.ctx = null;

    /** @type {GainNode} */
    this.masterGain = null;

    /** @type {Object} Stems with gain control */
    this.stems = {
      melody: { gain: null, sources: [], active: true },
      harmony: { gain: null, sources: [], active: true },
      rhythm: { gain: null, sources: [], active: true },
      drone: { gain: null, sources: [], active: true },
    };

    /** @type {boolean} */
    this._playing = false;

    /** @type {number} */
    this._tempo = 0.5; // Base tempo multiplier
  }

  /**
   * Initialize the music system.
   * @param {AudioContext} audioContext 
   * @param {GainNode} masterGain 
   */
  init(audioContext, masterGain) {
    this.ctx = audioContext;
    this.masterGain = masterGain;

    // Create gain nodes for each stem
    for (const [name, stem] of Object.entries(this.stems)) {
      stem.gain = this.ctx.createGain();
      stem.gain.connect(this.masterGain);
      stem.gain.gain.value = AUDIO_CONFIG.MUSIC_VOLUME;
    }
  }

  /**
   * Start playing all music layers.
   */
  start() {
    if (this._playing) return;
    this._playing = true;

    this._startDrone();
    this._startHarmony();
    this._startRhythm();
    this._startMelody();
  }

  /**
   * Update music based on silence level.
   * @param {number} silence — 0–100
   * @param {number} hope — 0–100
   */
  update(silence, hope) {
    const now = this.ctx?.currentTime || 0;

    // Melody removal (first to go)
    const melodyGain = silence < AUDIO_CONFIG.MELODY_REMOVE ? 1.0 :
      Math.max(0, 1.0 - (silence - AUDIO_CONFIG.MELODY_REMOVE) / 20);
    if (this.stems.melody.gain) {
      this.stems.melody.gain.gain.linearRampToValueAtTime(
        melodyGain * AUDIO_CONFIG.MUSIC_VOLUME, now + 1
      );
    }

    // Harmony removal (second)
    const harmonyGain = silence < AUDIO_CONFIG.HARMONY_REMOVE ? 1.0 :
      Math.max(0, 1.0 - (silence - AUDIO_CONFIG.HARMONY_REMOVE) / 20);
    if (this.stems.harmony.gain) {
      this.stems.harmony.gain.gain.linearRampToValueAtTime(
        harmonyGain * AUDIO_CONFIG.MUSIC_VOLUME, now + 1
      );
    }

    // Rhythm removal (third)
    const rhythmGain = silence < AUDIO_CONFIG.RHYTHM_REMOVE ? 1.0 :
      Math.max(0, 1.0 - (silence - AUDIO_CONFIG.RHYTHM_REMOVE) / 20);
    if (this.stems.rhythm.gain) {
      this.stems.rhythm.gain.gain.linearRampToValueAtTime(
        rhythmGain * AUDIO_CONFIG.MUSIC_VOLUME * 0.6, now + 1
      );
    }

    // Drone persists until near-end
    const droneGain = silence < AUDIO_CONFIG.DRONE_REMOVE ? 1.0 :
      Math.max(0, 1.0 - (silence - AUDIO_CONFIG.DRONE_REMOVE) / 5);
    if (this.stems.drone.gain) {
      this.stems.drone.gain.gain.linearRampToValueAtTime(
        droneGain * AUDIO_CONFIG.MUSIC_VOLUME * 0.4, now + 2
      );
    }

    // Tempo slows as silence increases
    this._tempo = Math.max(0.3, 1.0 - silence / 200);
  }

  /**
   * Stop all music.
   */
  stop() {
    this._playing = false;
    for (const stem of Object.values(this.stems)) {
      stem.sources.forEach(s => {
        try { s.stop(); } catch (_) {}
      });
      stem.sources = [];
    }
  }

  // ─── Procedural Music Generation ────────────────────────────────

  _startDrone() {
    // Low sustained drone with slow modulation
    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = 55; // A1 

    // Sub oscillator
    const sub = this.ctx.createOscillator();
    sub.type = 'sine';
    sub.frequency.value = 27.5; // A0

    // LFO for movement
    const lfo = this.ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.value = 0.05;
    const lfoGain = this.ctx.createGain();
    lfoGain.gain.value = 3;
    lfo.connect(lfoGain);
    lfoGain.connect(osc.frequency);

    // Filter for warmth
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 200;
    filter.Q.value = 2;

    osc.connect(filter);
    sub.connect(filter);
    filter.connect(this.stems.drone.gain);

    osc.start();
    sub.start();
    lfo.start();

    this.stems.drone.sources.push(osc, sub, lfo);
  }

  _startHarmony() {
    // Warm pad chords cycling through a simple progression
    const chords = [
      [220, 277, 330],      // Am
      [196, 247, 294],      // G
      [174, 220, 262],      // F
      [165, 208, 247],      // E
    ];

    let chordIndex = 0;

    const createPad = () => {
      if (!this._playing) return;
      const chord = chords[chordIndex % chords.length];
      const now = this.ctx.currentTime;

      chord.forEach(freq => {
        const osc = this.ctx.createOscillator();
        osc.type = 'triangle';
        osc.frequency.value = freq;

        const env = this.ctx.createGain();
        env.gain.setValueAtTime(0.001, now);
        env.gain.linearRampToValueAtTime(0.08, now + 1);
        env.gain.linearRampToValueAtTime(0.08, now + 3);
        env.gain.linearRampToValueAtTime(0.001, now + 4);

        osc.connect(env);
        env.connect(this.stems.harmony.gain);
        osc.start(now);
        osc.stop(now + 4.5);
      });

      chordIndex++;
      setTimeout(createPad, 4000 / this._tempo);
    };

    createPad();
  }

  _startRhythm() {
    // Subtle percussive clicks
    const playBeat = () => {
      if (!this._playing) return;
      const now = this.ctx.currentTime;

      // Hi-hat like click
      const bufferSize = this.ctx.sampleRate * 0.05;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.15));
      }

      const source = this.ctx.createBufferSource();
      source.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.value = 8000;

      const env = this.ctx.createGain();
      env.gain.setValueAtTime(0.04, now);
      env.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

      source.connect(filter);
      filter.connect(env);
      env.connect(this.stems.rhythm.gain);
      source.start();

      const interval = (60000 / (70 * this._tempo)); // ~70 BPM base
      setTimeout(playBeat, interval);
    };

    playBeat();
  }

  _startMelody() {
    // FIX 6: A recognizable, hummable 4-bar melody in A minor.
    // Pattern: A4-C5-E5-D5 | C5-A4-B4-rest | A4-G4-A4-C5 | B4-A4-rest-rest
    // When this disappears at silence 30, the player will FEEL the void.
    const melody = [
      // Bar 1: Rising hope
      { freq: 440, dur: 0.5 },     // A4
      { freq: 523, dur: 0.5 },     // C5
      { freq: 659, dur: 0.75 },    // E5 (lingers)
      { freq: 587, dur: 0.5 },     // D5
      // Bar 2: Gentle descent
      { freq: 523, dur: 0.5 },     // C5
      { freq: 440, dur: 0.75 },    // A4 (lingers)
      { freq: 494, dur: 0.5 },     // B4
      { freq: 0,   dur: 0.5 },     // rest
      // Bar 3: Restless search
      { freq: 440, dur: 0.5 },     // A4
      { freq: 392, dur: 0.5 },     // G4
      { freq: 440, dur: 0.75 },    // A4
      { freq: 523, dur: 0.5 },     // C5
      // Bar 4: Resignation
      { freq: 494, dur: 0.75 },    // B4 (lingers)
      { freq: 440, dur: 1.0 },     // A4 (long, final)
      { freq: 0,   dur: 1.0 },     // rest
      { freq: 0,   dur: 0.5 },     // rest
    ];

    let noteIndex = 0;
    let variation = 0; // 0 = normal, 1 = octave up (lighter), 2 = slower

    const playNote = () => {
      if (!this._playing) return;
      const now = this.ctx.currentTime;

      const note = melody[noteIndex % melody.length];
      const isNewLoop = noteIndex > 0 && noteIndex % melody.length === 0;

      if (isNewLoop) {
        variation = (variation + 1) % 3;
      }

      if (note.freq > 0) {
        const freq = variation === 1 ? note.freq * 2 : note.freq; // Octave variation
        const osc = this.ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.value = freq;

        // Warm detuned layer for thickness
        const osc2 = this.ctx.createOscillator();
        osc2.type = 'triangle';
        osc2.frequency.value = freq * 1.002; // Slight detune

        const env = this.ctx.createGain();
        const attackTime = 0.08;
        const releaseTime = note.dur * 0.4;
        env.gain.setValueAtTime(0.001, now);
        env.gain.linearRampToValueAtTime(0.05, now + attackTime);
        env.gain.linearRampToValueAtTime(0.04, now + note.dur - releaseTime);
        env.gain.exponentialRampToValueAtTime(0.001, now + note.dur);

        osc.connect(env);
        osc2.connect(env);
        env.connect(this.stems.melody.gain);
        osc.start(now);
        osc2.start(now);
        osc.stop(now + note.dur + 0.1);
        osc2.stop(now + note.dur + 0.1);
      }

      noteIndex++;
      const tempoMult = variation === 2 ? 1.3 : 1.0; // Slower variation
      const interval = (note.dur * 1000 * tempoMult) / this._tempo;
      setTimeout(playNote, interval);
    };

    setTimeout(playNote, 2000);
  }
}

export const musicSystem = new MusicSystem();
export default musicSystem;
