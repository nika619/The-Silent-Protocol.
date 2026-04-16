/**
 * CityBuilder — Procedural isometric city generation using Three.js.
 * Creates buildings, streets, props, and toggleable environment elements.
 */

import * as THREE from 'three';
import { gsap } from 'gsap';
import { RENDER_CONFIG, COLORS } from '../core/Constants.js';
import { eventBus } from '../core/EventBus.js';
import { gameState } from '../core/GameState.js';

class CityBuilder {
  constructor() {
    /** @type {THREE.Group} Root city group */
    this.cityGroup = new THREE.Group();

    /** @type {THREE.Group} Buildings container */
    this.buildingsGroup = new THREE.Group();

    /** @type {THREE.Group} Props container (toggleable) */
    this.propsGroup = new THREE.Group();

    /** @type {THREE.Group} Street lights container */
    this.lightsGroup = new THREE.Group();

    /** @type {THREE.Group} Window lights */
    this.windowsGroup = new THREE.Group();

    /** @type {Array<THREE.Mesh>} All window light meshes */
    this.windowLights = [];

    /** @type {Array<THREE.Mesh>} All prop meshes */
    this.props = [];

    /** @type {Array<THREE.Mesh>} All building meshes */
    this.buildings = [];

    /** @type {THREE.Mesh} Ground plane */
    this.ground = null;

    /** @type {THREE.Group} Chaos particles container */
    this.chaosGroup = new THREE.Group();

    /** @type {THREE.Group} Cars container */
    this.carsGroup = new THREE.Group();

    /** @type {Array<THREE.Mesh>} All car meshes */
    this.cars = [];

    /** @type {Array<THREE.Object3D>} All chaos particles */
    this.chaosParticles = [];

    this.cityGroup.add(this.buildingsGroup);
    this.cityGroup.add(this.propsGroup);
    this.cityGroup.add(this.lightsGroup);
    this.cityGroup.add(this.windowsGroup);
    this.cityGroup.add(this.chaosGroup);
    this.cityGroup.add(this.carsGroup);
  }

  /**
   * Build the entire city.
   * @returns {THREE.Group}
   */
  build() {
    this._createGround();
    this._createRoads();
    this._createBuildings();
    this._createProps();
    this._createStreetLights();
    this._createVegetation();
    this._createCars();
    this._createChaosParticles();

    eventBus.on('metrics:changed', (data) => this._updateCity(data));

    return this.cityGroup;
  }

  /**
   * Get the city group.
   */
  getGroup() {
    return this.cityGroup;
  }

  // ─── City Generation ────────────────────────────────────────────

  _createGround() {
    const geo = new THREE.PlaneGeometry(
      RENDER_CONFIG.CITY_WIDTH * 1.5,
      RENDER_CONFIG.CITY_DEPTH * 1.5
    );
    const mat = new THREE.MeshStandardMaterial({
      color: 0x1a1a24,
      roughness: 0.9,
      metalness: 0.1,
    });
    this.ground = new THREE.Mesh(geo, mat);
    this.ground.rotation.x = -Math.PI / 2;
    this.ground.position.y = -0.01;
    this.ground.receiveShadow = true;
    this.cityGroup.add(this.ground);

    // Grid overlay
    const gridGeo = new THREE.PlaneGeometry(
      RENDER_CONFIG.CITY_WIDTH * 1.3,
      RENDER_CONFIG.CITY_DEPTH * 1.3
    );
    const gridMat = new THREE.MeshBasicMaterial({
      color: 0x00ffd5,
      wireframe: true,
      transparent: true,
      opacity: 0.03,
    });
    const grid = new THREE.Mesh(gridGeo, gridMat);
    grid.rotation.x = -Math.PI / 2;
    grid.position.y = 0.01;
    this.cityGroup.add(grid);
  }

  _createRoads() {
    const roadMat = new THREE.MeshStandardMaterial({
      color: 0x2a2a34,
      roughness: 0.8,
    });

    // Horizontal roads
    for (let i = 0; i < 3; i++) {
      const road = new THREE.Mesh(
        new THREE.PlaneGeometry(RENDER_CONFIG.CITY_WIDTH * 1.2, 1.5),
        roadMat
      );
      road.rotation.x = -Math.PI / 2;
      road.position.y = 0.02;
      road.position.z = (i - 1) * (RENDER_CONFIG.CITY_DEPTH / 3);
      this.cityGroup.add(road);

      // Road markings
      const markingMat = new THREE.MeshBasicMaterial({
        color: 0x555566,
        transparent: true,
        opacity: 0.5,
      });
      for (let j = -5; j <= 5; j++) {
        const marking = new THREE.Mesh(
          new THREE.PlaneGeometry(0.8, 0.1),
          markingMat
        );
        marking.rotation.x = -Math.PI / 2;
        marking.position.set(j * 3, 0.03, road.position.z);
        this.cityGroup.add(marking);
      }
    }

    // Vertical roads
    for (let i = 0; i < 4; i++) {
      const road = new THREE.Mesh(
        new THREE.PlaneGeometry(1.2, RENDER_CONFIG.CITY_DEPTH * 1.2),
        roadMat
      );
      road.rotation.x = -Math.PI / 2;
      road.position.y = 0.02;
      road.position.x = (i - 1.5) * (RENDER_CONFIG.CITY_WIDTH / 4);
      this.cityGroup.add(road);
    }
  }

  _createBuildings() {
    const buildingColors = [0x2d2d3f, 0x353548, 0x3d3d52, 0x28283a, 0x404058];
    const cellW = RENDER_CONFIG.CITY_WIDTH / RENDER_CONFIG.GRID_CELLS_X;
    const cellD = RENDER_CONFIG.CITY_DEPTH / RENDER_CONFIG.GRID_CELLS_Z;

    for (let gx = 0; gx < RENDER_CONFIG.GRID_CELLS_X; gx++) {
      for (let gz = 0; gz < RENDER_CONFIG.GRID_CELLS_Z; gz++) {
        // Skip road intersections
        if (gx % 2 === 0 && gz % 2 === 0) continue;

        const height = RENDER_CONFIG.BUILDING_MIN_H +
          Math.random() * (RENDER_CONFIG.BUILDING_MAX_H - RENDER_CONFIG.BUILDING_MIN_H);
        const width = cellW * (0.5 + Math.random() * 0.3);
        const depth = cellD * (0.5 + Math.random() * 0.3);

        const geo = new THREE.BoxGeometry(width, height, depth);
        const mat = new THREE.MeshStandardMaterial({
          color: buildingColors[Math.floor(Math.random() * buildingColors.length)],
          roughness: 0.7,
          metalness: 0.3,
        });

        const building = new THREE.Mesh(geo, mat);
        building.position.set(
          (gx - RENDER_CONFIG.GRID_CELLS_X / 2 + 0.5) * cellW,
          height / 2,
          (gz - RENDER_CONFIG.GRID_CELLS_Z / 2 + 0.5) * cellD
        );
        building.castShadow = true;
        building.receiveShadow = true;

        this.buildings.push(building);
        this.buildingsGroup.add(building);

        // Add window lights
        this._addWindowLights(building, width, height, depth);
      }
    }
  }

  _addWindowLights(building, width, height, depth) {
    const windowGeo = new THREE.PlaneGeometry(0.2, 0.3);

    for (let face = 0; face < 2; face++) {
      const rows = Math.floor(height / 0.8);
      const cols = Math.floor((face === 0 ? width : depth) / 0.6);

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          if (Math.random() < 0.3) continue; // Not every window is lit

          const isLit = Math.random() > 0.3;
          const warmth = 0.5 + Math.random() * 0.5;

          const windowMat = new THREE.MeshBasicMaterial({
            color: isLit
              ? new THREE.Color().setHSL(0.1 * warmth, 0.6, 0.6)
              : 0x111118,
            transparent: true,
            opacity: isLit ? 0.8 : 0.3,
          });

          const windowMesh = new THREE.Mesh(windowGeo, windowMat);

          if (face === 0) {
            windowMesh.position.set(
              building.position.x + (c - cols / 2) * 0.6,
              r * 0.8 + 0.5,
              building.position.z + depth / 2 + 0.01
            );
          } else {
            windowMesh.position.set(
              building.position.x + width / 2 + 0.01,
              r * 0.8 + 0.5,
              building.position.z + (c - cols / 2) * 0.6
            );
            windowMesh.rotation.y = Math.PI / 2;
          }

          windowMesh.userData = {
            isLit,
            originalColor: windowMat.color.clone(),
            warmth,
            building: building,
          };

          this.windowLights.push(windowMesh);
          this.windowsGroup.add(windowMesh);
        }
      }
    }
  }

  _createProps() {
    // Market stalls
    for (let i = 0; i < 6; i++) {
      const stall = this._createMarketStall();
      stall.position.set(
        (Math.random() - 0.5) * RENDER_CONFIG.CITY_WIDTH * 0.6,
        0,
        (Math.random() - 0.5) * RENDER_CONFIG.CITY_DEPTH * 0.4
      );
      stall.userData = { type: 'market', silenceHideThreshold: 8 + Math.random() * 10 };
      this.props.push(stall);
      this.propsGroup.add(stall);
    }

    // Benches
    for (let i = 0; i < 8; i++) {
      const bench = this._createBench();
      bench.position.set(
        (Math.random() - 0.5) * RENDER_CONFIG.CITY_WIDTH * 0.7,
        0,
        (Math.random() - 0.5) * RENDER_CONFIG.CITY_DEPTH * 0.5
      );
      bench.userData = { type: 'bench', silenceHideThreshold: 15 + Math.random() * 10 };
      this.props.push(bench);
      this.propsGroup.add(bench);
    }

    // Decorative signs
    for (let i = 0; i < 4; i++) {
      const sign = this._createSign();
      sign.position.set(
        (Math.random() - 0.5) * RENDER_CONFIG.CITY_WIDTH * 0.5,
        1.5,
        (Math.random() - 0.5) * RENDER_CONFIG.CITY_DEPTH * 0.4
      );
      sign.userData = { type: 'sign', silenceHideThreshold: 5 + Math.random() * 7 };
      this.props.push(sign);
      this.propsGroup.add(sign);
    }
  }

  _createMarketStall() {
    const group = new THREE.Group();

    // Canopy
    const canopyGeo = new THREE.BoxGeometry(1.2, 0.05, 0.8);
    const colors = [0xe57373, 0xffa726, 0x66bb6a, 0x42a5f5];
    const canopyMat = new THREE.MeshStandardMaterial({
      color: colors[Math.floor(Math.random() * colors.length)],
      roughness: 0.6,
    });
    const canopy = new THREE.Mesh(canopyGeo, canopyMat);
    canopy.position.y = 1.2;
    group.add(canopy);

    // Counter
    const counterGeo = new THREE.BoxGeometry(1.0, 0.7, 0.5);
    const counterMat = new THREE.MeshStandardMaterial({ color: 0x5d4037, roughness: 0.8 });
    const counter = new THREE.Mesh(counterGeo, counterMat);
    counter.position.y = 0.35;
    group.add(counter);

    // Poles
    for (let i = -1; i <= 1; i += 2) {
      const pole = new THREE.Mesh(
        new THREE.CylinderGeometry(0.03, 0.03, 1.2),
        new THREE.MeshStandardMaterial({ color: 0x888888 })
      );
      pole.position.set(i * 0.5, 0.6, 0.35);
      group.add(pole);
    }

    return group;
  }

  _createBench() {
    const group = new THREE.Group();
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x6d4c41, roughness: 0.9 });
    const metalMat = new THREE.MeshStandardMaterial({ color: 0x666666, metalness: 0.6 });

    // Seat
    const seat = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.05, 0.3), woodMat);
    seat.position.y = 0.35;
    group.add(seat);

    // Back
    const back = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.4, 0.04), woodMat);
    back.position.set(0, 0.55, -0.13);
    group.add(back);

    // Legs
    for (let x of [-0.4, 0.4]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.35, 0.04), metalMat);
      leg.position.set(x, 0.175, 0);
      group.add(leg);
    }

    return group;
  }

  _createSign() {
    const group = new THREE.Group();

    const signGeo = new THREE.BoxGeometry(0.8, 0.4, 0.05);
    const colors = [0x00e5cc, 0xffa726, 0xff7043, 0x7c4dff];
    const signMat = new THREE.MeshBasicMaterial({
      color: colors[Math.floor(Math.random() * colors.length)],
      transparent: true,
      opacity: 0.9,
    });
    const sign = new THREE.Mesh(signGeo, signMat);
    group.add(sign);

    // Pole
    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.02, 0.02, 1.5),
      new THREE.MeshStandardMaterial({ color: 0x666666 })
    );
    pole.position.y = -0.95;
    group.add(pole);

    return group;
  }

  _createStreetLights() {
    for (let i = 0; i < 12; i++) {
      const light = this._createStreetLight();
      light.position.set(
        (Math.random() - 0.5) * RENDER_CONFIG.CITY_WIDTH * 0.8,
        0,
        (Math.random() - 0.5) * RENDER_CONFIG.CITY_DEPTH * 0.6
      );
      this.lightsGroup.add(light);
    }
  }

  _createStreetLight() {
    const group = new THREE.Group();

    // Pole
    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.03, 0.04, 2.5),
      new THREE.MeshStandardMaterial({ color: 0x555555, metalness: 0.8 })
    );
    pole.position.y = 1.25;
    group.add(pole);

    // Fixture
    const fixture = new THREE.Mesh(
      new THREE.SphereGeometry(0.12, 8, 6),
      new THREE.MeshBasicMaterial({
        color: 0xffeedd,
        transparent: true,
        opacity: 0.9,
      })
    );
    fixture.position.y = 2.5;
    fixture.userData = { isLight: true };
    group.add(fixture);

    // Point light
    const pointLight = new THREE.PointLight(0xffeedd, 0.3, 5);
    pointLight.position.y = 2.5;
    group.add(pointLight);

    return group;
  }

  _createVegetation() {
    for (let i = 0; i < 10; i++) {
      const tree = this._createTree();
      tree.position.set(
        (Math.random() - 0.5) * RENDER_CONFIG.CITY_WIDTH * 0.7,
        0,
        (Math.random() - 0.5) * RENDER_CONFIG.CITY_DEPTH * 0.5
      );
      tree.userData = { type: 'tree', silenceHideThreshold: 40 + Math.random() * 20 };
      this.props.push(tree);
      this.propsGroup.add(tree);
    }
  }

  _createTree() {
    const group = new THREE.Group();

    // Trunk
    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.06, 0.08, 0.8),
      new THREE.MeshStandardMaterial({ color: 0x5d4037 })
    );
    trunk.position.y = 0.4;
    group.add(trunk);

    // Canopy
    const canopy = new THREE.Mesh(
      new THREE.SphereGeometry(0.5, 8, 6),
      new THREE.MeshStandardMaterial({
        color: 0x4caf50,
        roughness: 0.8,
      })
    );
    canopy.position.y = 1.1;
    canopy.userData = { originalColor: 0x4caf50 };
    group.add(canopy);

    return group;
  }

  _createEnforcementPylon() {
    const group = new THREE.Group();
    // Metal column
    const column = new THREE.Mesh(
      new THREE.BoxGeometry(0.3, 2.5, 0.3),
      new THREE.MeshStandardMaterial({ color: 0x111115, metalness: 0.8, roughness: 0.2 })
    );
    column.position.y = 1.25;
    group.add(column);

    // Glowing red eye
    const geo = new THREE.BoxGeometry(0.35, 0.5, 0.35);
    const mat = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    const eye = new THREE.Mesh(geo, mat);
    eye.position.y = 2.4;
    group.add(eye);

    // Light
    const pointLight = new THREE.PointLight(0xff0000, 0.8 * RENDER_CONFIG.LIGHT_INTENSITY, 4);
    pointLight.position.y = 2.4;
    group.add(pointLight);

    return group;
  }

  _createCars() {
    const carMat1 = new THREE.MeshBasicMaterial({ color: 0xffffff }); // Headlights
    const carMat2 = new THREE.MeshBasicMaterial({ color: 0xff2222 }); // Taillights

    for (let i = 0; i < 25; i++) {
      const carGroup = new THREE.Group();
      
      const headL = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 0.04), carMat1);
      headL.position.set(-0.06, 0.04, 0.2);
      const headR = headL.clone();
      headR.position.set(0.06, 0.04, 0.2);
      
      const tailL = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 0.04), carMat2);
      tailL.position.set(-0.06, 0.04, -0.2);
      const tailR = tailL.clone();
      tailR.position.set(0.06, 0.04, -0.2);

      carGroup.add(headL, headR, tailL, tailR);

      // Randomize position along roads
      const isHorizontal = Math.random() > 0.5;
      const speed = 3 + Math.random() * 4;
      const direction = Math.random() > 0.5 ? 1 : -1;
      
      carGroup.userData = {
        isHorizontal,
        speed: speed * direction,
        originalSpeed: speed,
        lane: (Math.random() - 0.5) * 0.8
      };

      if (isHorizontal) {
        carGroup.position.set((Math.random() - 0.5) * RENDER_CONFIG.CITY_WIDTH, 0.05, (Math.floor(Math.random() * 3) - 1) * (RENDER_CONFIG.CITY_DEPTH / 3) + carGroup.userData.lane);
        if (direction < 0) carGroup.rotation.y = Math.PI;
      } else {
        carGroup.position.set((Math.floor(Math.random() * 4) - 1.5) * (RENDER_CONFIG.CITY_WIDTH / 4) + carGroup.userData.lane, 0.05, (Math.random() - 0.5) * RENDER_CONFIG.CITY_DEPTH);
        carGroup.rotation.y = direction > 0 ? Math.PI / 2 : -Math.PI / 2;
      }

      this.cars.push(carGroup);
      this.carsGroup.add(carGroup);
    }
  }

  _createChaosParticles() {
    const mat = new THREE.MeshBasicMaterial({ color: 0xff3300, transparent: true, opacity: 0.8 });
    const geo = new THREE.BoxGeometry(0.15, 0.15, 0.15);

    for (let i = 0; i < 40; i++) {
        const particle = new THREE.Mesh(geo, mat);
        particle.position.set(
            (Math.random() - 0.5) * RENDER_CONFIG.CITY_WIDTH * 0.8,
            Math.random() * 5,
            (Math.random() - 0.5) * RENDER_CONFIG.CITY_DEPTH * 0.8
        );
        particle.userData = {
            baseY: particle.position.y,
            speed: 1 + Math.random() * 2,
            offset: Math.random() * Math.PI * 2
        };
        particle.visible = false;
        this.chaosParticles.push(particle);
        this.chaosGroup.add(particle);
    }
  }

  // ─── Dynamic Updates ────────────────────────────────────────────

  _updateCity(data) {
    const { current } = data;
    const silence = current.silence;
    const hope = current.hope;
    const lerpSpeed = 0.08; // Smooth interpolation speed

    // ─── Smooth Prop Fade/Shrink ─────────────────────────────────
    this.props.forEach(prop => {
      const threshold = prop.userData.silenceHideThreshold || 50;
      const targetScale = silence < threshold ? 1 : 0;
      const currentScale = prop.scale.x;

      // Lerp scale toward target
      const newScale = currentScale + (targetScale - currentScale) * lerpSpeed;

      if (newScale < 0.01) {
        prop.scale.set(0, 0, 0);
        prop.visible = false;
        
        // Spawn enforcement pylon when civilian props die
        if (!prop.userData.pylonSpawned && silence > prop.userData.silenceHideThreshold + 10) {
          prop.userData.pylonSpawned = true;
          const pylon = this._createEnforcementPylon();
          pylon.position.copy(prop.position);
          pylon.scale.set(0, 0, 0);
          this.propsGroup.add(pylon);
          gsap.to(pylon.scale, { x: 1, y: 1, z: 1, duration: 2, ease: 'elastic.out(1, 0.3)' });
        }
      } else {
        prop.visible = true;
        prop.scale.set(newScale, newScale, newScale);
      }
    });

    // ─── Deterministic Window Dimming ─────────────────────────────
    // Each window has a deterministic threshold based on its ID,
    // so lights turn off in a consistent, non-flickering order
    const litChance = Math.max(0.05, hope / 100);
    this.windowLights.forEach((w, index) => {
      if (!w.userData.isLit) return;

      const warmth = Math.max(0, hope / 100);
      // Each window has a fixed threshold based on its index
      const windowThreshold = (index * 0.618033) % 1; // golden ratio spread
      const isStillLit = litChance > windowThreshold || silence < 8;

      if (isStillLit) {
        // Lit — lerp toward warm target color
        const targetHue = 0.1 * warmth;
        const targetSat = 0.6 * warmth;
        const targetLight = 0.3 + warmth * 0.3;
        const targetOpacity = Math.max(0.2, litChance * 0.8 + 0.2);

        const currentHSL = {};
        w.material.color.getHSL(currentHSL);
        w.material.color.setHSL(
          currentHSL.h + (targetHue - currentHSL.h) * lerpSpeed,
          currentHSL.s + (targetSat - currentHSL.s) * lerpSpeed,
          currentHSL.l + (targetLight - currentHSL.l) * lerpSpeed
        );
        w.material.opacity += (targetOpacity - w.material.opacity) * lerpSpeed;
      } else {
        // Dark — lerp toward dark
        const currentHSL = {};
        w.material.color.getHSL(currentHSL);
        w.material.color.setHSL(
          currentHSL.h,
          currentHSL.s * (1 - lerpSpeed),
          currentHSL.l + (0.05 - currentHSL.l) * lerpSpeed
        );
        w.material.opacity += (0.15 - w.material.opacity) * lerpSpeed;
      }
    });

    // ─── Street Light Warmth (Smooth) ────────────────────────────
    this.lightsGroup.children.forEach(lightGroup => {
      lightGroup.children.forEach(child => {
        if (child.isPointLight) {
          const warmth = hope / 100;
          const targetIntensity = Math.max(0.05, warmth * 0.3);
          child.intensity += (targetIntensity - child.intensity) * lerpSpeed;
          child.color.setHSL(0.1 * warmth, 0.3 + warmth * 0.3, 0.7);
        }
        if (child.userData?.isLight) {
          const warmth = hope / 100;
          child.material.color.setHSL(0.1 * warmth, 0.2, 0.5 + warmth * 0.4);
        }
      });
    });

    // ─── Building Desaturation (Stored Original) ─────────────────
    const saturation = Math.max(0.1, hope / 100);
    this.buildings.forEach(b => {
      // Store original HSL on first update
      if (!b.userData.originalHSL) {
        const hsl = {};
        b.material.color.getHSL(hsl);
        b.userData.originalHSL = { ...hsl };
      }
      const orig = b.userData.originalHSL;
      const currentHSL = {};
      b.material.color.getHSL(currentHSL);

      const targetSat = orig.s * saturation;
      b.material.color.setHSL(
        orig.h,
        currentHSL.s + (targetSat - currentHSL.s) * lerpSpeed,
        orig.l
      );
    });

    // ─── Vegetation Desaturation (Smooth) ────────────────────────
    this.props.filter(p => p.userData.type === 'tree').forEach(tree => {
      const canopy = tree.children.find(c => c.userData?.originalColor);
      if (canopy) {
        const greenness = Math.max(0.1, hope / 100);
        const currentHSL = {};
        canopy.material.color.getHSL(currentHSL);

        const targetH = 0.3 * greenness;
        const targetS = 0.5 * greenness;
        const targetL = 0.3 + greenness * 0.2;

        canopy.material.color.setHSL(
          currentHSL.h + (targetH - currentHSL.h) * lerpSpeed,
          currentHSL.s + (targetS - currentHSL.s) * lerpSpeed,
          currentHSL.l + (targetL - currentHSL.l) * lerpSpeed
        );
      }
    });
  }

  update(delta, elapsed) {
    if (!gameState) return;
    const { silence, disorder } = gameState.metrics;

    // Cars logic: move along roads, fade out when silence > 50
    const carOpacityTarget = silence < 50 ? 1 - (silence / 50) : 0;
    this.carsGroup.visible = carOpacityTarget > 0.01;
    
    if (this.carsGroup.visible) {
      this.cars.forEach(car => {
        if (car.userData.isHorizontal) {
          car.position.x += car.userData.speed * delta;
          if (car.position.x > RENDER_CONFIG.CITY_WIDTH / 2) car.position.x = -RENDER_CONFIG.CITY_WIDTH / 2;
          if (car.position.x < -RENDER_CONFIG.CITY_WIDTH / 2) car.position.x = RENDER_CONFIG.CITY_WIDTH / 2;
        } else {
          car.position.z -= car.userData.speed * delta; // Note negative Z is forward in Three.js sometimes, depending on direction
          if (car.position.z > RENDER_CONFIG.CITY_DEPTH / 2) car.position.z = -RENDER_CONFIG.CITY_DEPTH / 2;
          if (car.position.z < -RENDER_CONFIG.CITY_DEPTH / 2) car.position.z = RENDER_CONFIG.CITY_DEPTH / 2;
        }
        
        // Scale car to match opacity target
        car.scale.setScalar(carOpacityTarget);
      });
    }

    // Chaos particles logic: spawn/animate when disorder > 70
    const showChaos = disorder > 70;
    this.chaosGroup.visible = showChaos;

    if (showChaos) {
      this.chaosParticles.forEach(p => {
        p.visible = true;
        p.position.y += p.userData.speed * delta;
        p.rotation.x += delta;
        p.rotation.y += delta;
        p.material.opacity = Math.max(0, 1 - (p.position.y / 10)); // fade out as they rise
        
        if (p.position.y > 10) {
          p.position.y = p.userData.baseY;
          p.material.opacity = 0.8;
        }
      });
    }
  }

  /**
   * Reset the city.
   */
  reset() {
    // Clean up
    while (this.cityGroup.children.length > 0) {
      const child = this.cityGroup.children[0];
      this.cityGroup.remove(child);
    }
    this.buildings = [];
    this.windowLights = [];
    this.props = [];
    this.buildingsGroup = new THREE.Group();
    this.propsGroup = new THREE.Group();
    this.lightsGroup = new THREE.Group();
    this.windowsGroup = new THREE.Group();
    this.chaosGroup = new THREE.Group();
    this.carsGroup = new THREE.Group();
    this.cars = [];
    this.chaosParticles = [];
    
    this.cityGroup.add(this.buildingsGroup);
    this.cityGroup.add(this.propsGroup);
    this.cityGroup.add(this.lightsGroup);
    this.cityGroup.add(this.windowsGroup);
    this.cityGroup.add(this.chaosGroup);
    this.cityGroup.add(this.carsGroup);
  }
}

export const cityBuilder = new CityBuilder();
export default cityBuilder;
