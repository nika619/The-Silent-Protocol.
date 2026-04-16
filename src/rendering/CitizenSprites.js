/**
 * CitizenSprites — Billboard sprite rendering for citizen agents.
 * Shows citizens as small figures with data tags.
 */

import * as THREE from 'three';
import { eventBus } from '../core/EventBus.js';
import { gameState } from '../core/GameState.js';
import { RENDER_CONFIG } from '../core/Constants.js';
import { CITIZEN_STATES } from '../systems/CitizenSimulation.js';

class CitizenSprites {
  constructor() {
    /** @type {THREE.Group} */
    this.group = new THREE.Group();

    /** @type {Map<number, THREE.Group>} */
    this.spriteMap = new Map();

    /** @type {THREE.Clock} */
    this.clock = new THREE.Clock();
  }

  /**
   * Initialize the sprite system.
   */
  init() {
    eventBus.on('citizens:updated', (data) => this._updateCitizens(data));
  }

  /**
   * Get the group containing all citizen sprites.
   */
  getGroup() {
    return this.group;
  }

  /**
   * Update citizen sprites from simulation data.
   */
  _updateCitizens(data) {
    const { citizens, stats } = data;
    const existingIds = new Set();

    citizens.forEach(citizen => {
      existingIds.add(citizen.numericId);

      let spriteGroup = this.spriteMap.get(citizen.numericId);

      if (!spriteGroup) {
        spriteGroup = this._createCitizenSprite(citizen);
        this.spriteMap.set(citizen.numericId, spriteGroup);
        this.group.add(spriteGroup);
      }

      this._updateSprite(spriteGroup, citizen);
    });

    // Remove citizens that are no longer visible
    for (const [id, sprite] of this.spriteMap) {
      if (!existingIds.has(id)) {
        this.group.remove(sprite);
        this.spriteMap.delete(id);
      }
    }
  }

  /**
   * Create a citizen sprite group.
   */
  _createCitizenSprite(citizen) {
    const group = new THREE.Group();

    // Body (simple capsule shape)
    const bodyGeo = new THREE.CapsuleGeometry(0.08, 0.25, 4, 8);
    const bodyColor = this._getStateColor(citizen.state);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: bodyColor,
      roughness: 0.7,
      metalness: 0.2,
    });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 0.2;
    group.add(body);

    // Head
    const headGeo = new THREE.SphereGeometry(0.07, 8, 6);
    const headMat = new THREE.MeshStandardMaterial({
      color: 0xd4a574,
      roughness: 0.6,
    });
    const head = new THREE.Mesh(headGeo, headMat);
    head.position.y = 0.45;
    group.add(head);

    // Data tag indicator (small dot above head)
    const tagGeo = new THREE.SphereGeometry(0.02, 4, 4);
    const tagMat = new THREE.MeshBasicMaterial({
      color: 0x00ffd5,
      transparent: true,
      opacity: 0.6,
    });
    const tag = new THREE.Mesh(tagGeo, tagMat);
    tag.position.y = 0.58;
    tag.name = 'dataTag';
    group.add(tag);

    group.userData = { citizenId: citizen.numericId };

    return group;
  }

  /**
   * Update a sprite's position, color, and state.
   */
  _updateSprite(spriteGroup, citizen) {
    const deltaTime = this.clock.getDelta();

    // Move towards target
    if (citizen.targetPosition) {
      const dx = citizen.targetPosition.x - citizen.position.x;
      const dz = citizen.targetPosition.z - citizen.position.z;
      const dist = Math.sqrt(dx * dx + dz * dz);

      if (dist > 0.1) {
        const speed = citizen.speed;
        citizen.position.x += (dx / dist) * speed;
        citizen.position.z += (dz / dist) * speed;
      }
    }

    // Update position
    spriteGroup.position.set(citizen.position.x, 0, citizen.position.z);

    // Update body color based on state
    const body = spriteGroup.children[0];
    if (body) {
      const targetColor = this._getStateColor(citizen.state);
      body.material.color.lerp(new THREE.Color(targetColor), 0.05);
    }

    // Subtle idle animation
    const bobAmount = citizen.state === CITIZEN_STATES.RESIGNED ? 0.002 : 0.01;
    spriteGroup.position.y = Math.sin(Date.now() * 0.003 + citizen.numericId) * bobAmount;

    // Update data tag visibility based on silence
    const tag = spriteGroup.getObjectByName('dataTag');
    if (tag) {
      tag.material.opacity = Math.max(0.1, 0.6 - gameState.metrics.silence / 200);
    }
  }

  /**
   * Get color for citizen state.
   */
  _getStateColor(state) {
    switch (state) {
      case CITIZEN_STATES.ACTIVE:   return 0x66bb6a;  // Warm green
      case CITIZEN_STATES.ANXIOUS:  return 0xffa726;  // Amber
      case CITIZEN_STATES.RESIGNED: return 0x78909c;  // Grey
      case CITIZEN_STATES.DEFIANT:  return 0xef5350;  // Red
      default:                       return 0x78909c;
    }
  }

  /**
   * Update animation frame.
   */
  update(deltaTime) {
    // Small rotations to face camera could be added here
  }

  /**
   * Reset all sprites.
   */
  reset() {
    this.spriteMap.forEach((sprite) => {
      this.group.remove(sprite);
    });
    this.spriteMap.clear();
  }
}

export const citizenSprites = new CitizenSprites();
export default citizenSprites;
