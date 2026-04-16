/**
 * CitizenSimulation — Simple agent state machine for citizen behavior.
 * Manages citizen states and provides data for rendering.
 */

import { eventBus } from '../core/EventBus.js';
import { gameState } from '../core/GameState.js';
import { RENDER_CONFIG, THRESHOLDS } from '../core/Constants.js';

/**
 * Citizen states enum.
 */
export const CITIZEN_STATES = {
  ACTIVE:   'active',
  ANXIOUS:  'anxious',
  RESIGNED: 'resigned',
  DEFIANT:  'defiant',
};

class CitizenSimulation {
  constructor() {
    /** @type {Array<Object>} All citizen agents */
    this.citizens = [];

    /** @type {number} Target count based on metrics */
    this.targetCount = RENDER_CONFIG.MAX_CITIZENS;

    /** @type {Object} Aggregate stats */
    this.stats = {
      total: 0,
      active: 0,
      anxious: 0,
      resigned: 0,
      defiant: 0,
      avgClusterSize: 0,
      movementSpeed: 1.0,
      interactionFrequency: 1.0,
    };
  }

  /**
   * Initialize the simulation.
   */
  init() {
    this._spawnInitialCitizens();
    eventBus.on('metrics:changed', () => this.update());
    eventBus.on('cycle:advanced', () => this.update());
  }

  /**
   * Spawn initial citizen pool.
   */
  _spawnInitialCitizens() {
    const count = RENDER_CONFIG.MAX_CITIZENS;
    this.citizens = [];

    for (let i = 0; i < count; i++) {
      this.citizens.push(this._createCitizen(i));
    }

    this.update();
  }

  /**
   * Create a single citizen agent.
   */
  _createCitizen(id) {
    return {
      id: `CIT-${String(id).padStart(4, '0')}`,
      numericId: id,
      name: this._randomName(),
      state: CITIZEN_STATES.ACTIVE,
      position: {
        x: (Math.random() - 0.5) * RENDER_CONFIG.CITY_WIDTH * 0.8,
        z: (Math.random() - 0.5) * RENDER_CONFIG.CITY_DEPTH * 0.8,
      },
      targetPosition: null,
      speed: RENDER_CONFIG.CITIZEN_SPEED * (0.8 + Math.random() * 0.4),
      visible: true,
      heartRate: 65 + Math.floor(Math.random() * 20),
      socialConnectivity: 0.7 + Math.random() * 0.3,
      complianceScore: 0.3 + Math.random() * 0.4,
      clusterId: null,
    };
  }

  /**
   * Update all citizen states based on current metrics.
   */
  update() {
    const { hope, fear, silence, disorder } = gameState.metrics;

    // Calculate target citizen count
    const silenceNorm = silence / 100;
    const hopeNorm = hope / 100;
    this.targetCount = Math.round(
      RENDER_CONFIG.MIN_CITIZENS +
      (RENDER_CONFIG.MAX_CITIZENS - RENDER_CONFIG.MIN_CITIZENS) * hopeNorm * (1 - silenceNorm * 0.7)
    );

    // Update visibility
    this.citizens.forEach((citizen, idx) => {
      citizen.visible = idx < this.targetCount;
    });

    // Update states for visible citizens
    this.citizens.filter(c => c.visible).forEach(citizen => {
      citizen.state = this._calculateState(citizen, hope, fear, silence);
      citizen.speed = this._calculateSpeed(citizen, fear, silence);
      citizen.heartRate = this._calculateHeartRate(hope, fear);
      citizen.socialConnectivity = Math.max(0.05, hopeNorm * (1 - silenceNorm));
      citizen.complianceScore = Math.min(0.99, silenceNorm * 0.8 + (1 - hopeNorm) * 0.2);

      // Update target position (random walk)
      if (!citizen.targetPosition || this._distanceTo(citizen) < 0.5) {
        citizen.targetPosition = this._randomWalkTarget(citizen, silence);
      }
    });

    // Calculate clustering
    this._updateClustering(hope, fear, silence);

    // Update stats
    this._updateStats();

    eventBus.emit('citizens:updated', {
      citizens: this.citizens.filter(c => c.visible),
      stats: { ...this.stats },
      targetCount: this.targetCount,
    });
  }

  /**
   * Get visible citizens for rendering.
   */
  getVisibleCitizens() {
    return this.citizens.filter(c => c.visible);
  }

  /**
   * Get citizen display info (for data tags).
   */
  getCitizenDisplayInfo(citizen) {
    const silence = gameState.metrics.silence;

    if (silence < 55) {
      return {
        label: citizen.name,
        heartRate: citizen.heartRate,
        status: `Social Connectivity: ${citizen.socialConnectivity > 0.5 ? 'High' : 'Low'}`,
      };
    } else {
      return {
        label: citizen.id,
        heartRate: null,
        status: `Status: ${citizen.state === CITIZEN_STATES.RESIGNED ? 'COMPLIANT' : 'MONITORED'}`,
      };
    }
  }

  // ─── Private Methods ───────────────────────────────────────────────

  _calculateState(citizen, hope, fear, silence) {
    const rand = Math.random();

    if (hope > THRESHOLDS.HOPE_CONCERNED) {
      return CITIZEN_STATES.ACTIVE;
    }

    if (fear > THRESHOLDS.FEAR_OPPRESSIVE && rand < 0.1) {
      return CITIZEN_STATES.DEFIANT;
    }

    if (silence > THRESHOLDS.SILENCE_HEAVY) {
      return rand < 0.8 ? CITIZEN_STATES.RESIGNED : CITIZEN_STATES.ANXIOUS;
    }

    if (fear > THRESHOLDS.FEAR_UNEASY) {
      return rand < 0.6 ? CITIZEN_STATES.ANXIOUS : CITIZEN_STATES.ACTIVE;
    }

    return CITIZEN_STATES.ACTIVE;
  }

  _calculateSpeed(citizen, fear, silence) {
    const baseSpeeed = RENDER_CONFIG.CITIZEN_SPEED;
    // Higher silence = slower, more rigid movement
    // Higher fear = slightly faster (nervous)
    const silenceFactor = 1.0 - (silence / 100) * 0.7;
    const fearFactor = 1.0 + (fear / 100) * 0.2;
    return baseSpeeed * silenceFactor * fearFactor * (0.8 + Math.random() * 0.4);
  }

  _calculateHeartRate(hope, fear) {
    const base = 70;
    const fearDelta = (fear / 100) * 30;
    const hopeDelta = -(hope / 100) * 10;
    return Math.round(base + fearDelta + hopeDelta + (Math.random() - 0.5) * 10);
  }

  _randomWalkTarget(citizen, silence) {
    const range = RENDER_CONFIG.CITY_WIDTH * 0.35 * (1 - silence / 100 * 0.6);
    return {
      x: citizen.position.x + (Math.random() - 0.5) * range,
      z: citizen.position.z + (Math.random() - 0.5) * range,
    };
  }

  _distanceTo(citizen) {
    if (!citizen.targetPosition) return Infinity;
    const dx = citizen.targetPosition.x - citizen.position.x;
    const dz = citizen.targetPosition.z - citizen.position.z;
    return Math.sqrt(dx * dx + dz * dz);
  }

  _updateClustering(hope, fear, silence) {
    // Higher hope = more clustering, higher fear = less
    const clusterChance = Math.max(0.05, (hope / 100) * 0.8 - (fear / 100) * 0.3);
    let clusterId = 0;
    const visible = this.citizens.filter(c => c.visible);

    visible.forEach(c => { c.clusterId = null; });

    for (let i = 0; i < visible.length; i++) {
      if (visible[i].clusterId !== null) continue;
      if (Math.random() > clusterChance) continue;

      visible[i].clusterId = clusterId;
      for (let j = i + 1; j < visible.length; j++) {
        if (visible[j].clusterId !== null) continue;
        const dx = visible[i].position.x - visible[j].position.x;
        const dz = visible[i].position.z - visible[j].position.z;
        const dist = Math.sqrt(dx * dx + dz * dz);
        if (dist < 3 && Math.random() < clusterChance) {
          visible[j].clusterId = clusterId;
        }
      }
      clusterId++;
    }
  }

  _updateStats() {
    const visible = this.citizens.filter(c => c.visible);
    this.stats.total = visible.length;
    this.stats.active = visible.filter(c => c.state === CITIZEN_STATES.ACTIVE).length;
    this.stats.anxious = visible.filter(c => c.state === CITIZEN_STATES.ANXIOUS).length;
    this.stats.resigned = visible.filter(c => c.state === CITIZEN_STATES.RESIGNED).length;
    this.stats.defiant = visible.filter(c => c.state === CITIZEN_STATES.DEFIANT).length;

    const clusters = new Set(visible.filter(c => c.clusterId !== null).map(c => c.clusterId));
    const clusteredCount = visible.filter(c => c.clusterId !== null).length;
    this.stats.avgClusterSize = clusters.size > 0 ? clusteredCount / clusters.size : 0;

    const silenceNorm = gameState.metrics.silence / 100;
    this.stats.movementSpeed = 1.0 - silenceNorm * 0.7;
    this.stats.interactionFrequency = Math.max(0.05, 1.0 - silenceNorm * 0.9);
  }

  _randomName() {
    const names = [
      'Maya', 'Ravi', 'Chen', 'Amara', 'Kai', 'Priya', 'Leo', 'Noor',
      'Zara', 'Amir', 'Isla', 'Dev', 'Luna', 'Yara', 'Felix', 'Mira',
      'Aiden', 'Nia', 'Oscar', 'Sana', 'Eli', 'Kira', 'Rohan', 'Ivy',
    ];
    return names[Math.floor(Math.random() * names.length)];
  }

  reset() {
    this.citizens = [];
    this.targetCount = RENDER_CONFIG.MAX_CITIZENS;
  }
}

export const citizenSimulation = new CitizenSimulation();
export default citizenSimulation;
