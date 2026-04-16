/**
 * AmbienceSystem — Procedural city soundscape using Web Audio API.
 * Layered city sounds that thin out as silence increases.
 */

class AmbienceSystem {
  constructor() {
    /** @type {AudioContext} */
    this.ctx = null;

    /** @type {GainNode} */
    this.masterGain = null;

    /** @type {Object} Named ambient layers */
    this.layers = {};

    /** @type {boolean} */
    this._playing = false;
  }

  /**
   * Initialize the ambience system.
   * @param {AudioContext} audioContext 
   * @param {GainNode} masterGain 
   */
  init(audioContext, masterGain) {
    this.ctx = audioContext;
    this.masterGain = masterGain;
  }

  /**
   * Start all ambient layers.
   */
  start() {
    if (this._playing) return;
    this._playing = true;

    this._createLayer('traffic', this._generateTrafficNoise.bind(this), 0.12);
    this._createLayer('crowd', this._generateCrowdMurmur.bind(this), 0.10);
    this._createLayer('wind', this._generateWind.bind(this), 0.03);
    this._createLayer('mechanical', this._generateMechanicalHum.bind(this), 0.0);
    this._createLayer('electrical', this._generateElectricalBuzz.bind(this), 0.0);
  }

  /**
   * Update ambient layers based on metrics.
   * @param {number} silence — 0–100
   * @param {number} hope — 0–100
   */
  update(silence, hope) {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    // Traffic: fades as silence increases
    this._setLayerVolume('traffic', Math.max(0, 0.12 * (1 - silence / 60)));

    // Crowd murmur: fades earlier
    this._setLayerVolume('crowd', Math.max(0, 0.10 * (1 - silence / 45)));

    // Wind: increases as city empties
    this._setLayerVolume('wind', Math.min(0.08, 0.02 + silence / 300));

    // Mechanical hum: appears mid-game
    this._setLayerVolume('mechanical',
      silence > 40 ? Math.min(0.06, (silence - 40) / 800) : 0);

    // Electrical buzz: appears late-game
    this._setLayerVolume('electrical',
      silence > 65 ? Math.min(0.04, (silence - 65) / 700) : 0);
  }

  /**
   * Stop all ambience.
   */
  stop() {
    this._playing = false;
    for (const layer of Object.values(this.layers)) {
      layer.sources.forEach(s => {
        try { s.stop(); } catch (_) {}
      });
    }
    this.layers = {};
  }

  // ─── Layer Management ────────────────────────────────────────

  _createLayer(name, generatorFn, initialVolume) {
    const gain = this.ctx.createGain();
    gain.gain.value = initialVolume;
    gain.connect(this.masterGain);

    const sources = generatorFn(gain);

    this.layers[name] = { gain, sources: sources || [], volume: initialVolume };
  }

  _setLayerVolume(name, volume) {
    const layer = this.layers[name];
    if (!layer) return;
    const now = this.ctx.currentTime;
    layer.gain.gain.linearRampToValueAtTime(Math.max(0, volume), now + 0.5);
    layer.volume = volume;
  }

  // ─── Procedural Sound Generators ──────────────────────────────

  _generateTrafficNoise(destination) {
    // Low-frequency rumble filtered noise
    const bufferSize = this.ctx.sampleRate * 2;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 300;
    filter.Q.value = 0.5;

    source.connect(filter);
    filter.connect(destination);
    source.start();

    return [source];
  }

  _generateCrowdMurmur(destination) {
    // Multiple bandpassed noise layers to simulate voices
    const sources = [];

    [200, 400, 800].forEach(freq => {
      const bufferSize = this.ctx.sampleRate * 3;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      const source = this.ctx.createBufferSource();
      source.buffer = buffer;
      source.loop = true;

      const bandpass = this.ctx.createBiquadFilter();
      bandpass.type = 'bandpass';
      bandpass.frequency.value = freq;
      bandpass.Q.value = 3;

      // Slow amplitude modulation
      const lfo = this.ctx.createOscillator();
      lfo.frequency.value = 0.3 + Math.random() * 0.5;
      const lfoGain = this.ctx.createGain();
      lfoGain.gain.value = 0.3;

      const ampMod = this.ctx.createGain();
      ampMod.gain.value = 0.6;
      lfo.connect(lfoGain);
      lfoGain.connect(ampMod.gain);

      source.connect(bandpass);
      bandpass.connect(ampMod);
      ampMod.connect(destination);
      source.start();
      lfo.start();

      sources.push(source, lfo);
    });

    return sources;
  }

  _generateWind(destination) {
    // Filtered noise with slow modulation
    const bufferSize = this.ctx.sampleRate * 4;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;

    const bandpass = this.ctx.createBiquadFilter();
    bandpass.type = 'bandpass';
    bandpass.frequency.value = 600;
    bandpass.Q.value = 0.8;

    // Modulate frequency
    const lfo = this.ctx.createOscillator();
    lfo.frequency.value = 0.08;
    const lfoGain = this.ctx.createGain();
    lfoGain.gain.value = 300;
    lfo.connect(lfoGain);
    lfoGain.connect(bandpass.frequency);

    source.connect(bandpass);
    bandpass.connect(destination);
    source.start();
    lfo.start();

    return [source, lfo];
  }

  _generateMechanicalHum(destination) {
    // Low steady hum with harmonics
    const osc1 = this.ctx.createOscillator();
    osc1.type = 'sawtooth';
    osc1.frequency.value = 60;

    const osc2 = this.ctx.createOscillator();
    osc2.type = 'sine';
    osc2.frequency.value = 120;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 200;

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(destination);
    osc1.start();
    osc2.start();

    return [osc1, osc2];
  }

  _generateElectricalBuzz(destination) {
    // High-frequency buzz with 50Hz modulation
    const osc = this.ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.value = 4000;

    const modulator = this.ctx.createOscillator();
    modulator.frequency.value = 50;
    const modGain = this.ctx.createGain();
    modGain.gain.value = 2000;
    modulator.connect(modGain);
    modGain.connect(osc.frequency);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 3000;
    filter.Q.value = 5;

    osc.connect(filter);
    filter.connect(destination);
    osc.start();
    modulator.start();

    return [osc, modulator];
  }
}

export const ambienceSystem = new AmbienceSystem();
export default ambienceSystem;
