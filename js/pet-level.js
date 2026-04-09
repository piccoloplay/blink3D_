// ══════════════════════════════════════
//  QUANTUM AR — pet-level.js
//  Shows BLINK 3D model anchored to marker
// ══════════════════════════════════════

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { AREngine } from './ar-engine.js';

export class PetLevel {
  constructor(engine) {
    this.engine = engine;
    this.root = engine.getAnchorGroup();
    this.model = null;
    this.mixer = null;

    this.load();
  }

  async load() {
    const loader = new GLTFLoader();

    try {
      const gltf = await new Promise((resolve, reject) => {
        loader.load(
          '../assets/models/blink3d.glb',
          resolve,
          undefined,
          reject
        );
      });

      this.model = gltf.scene;

      // Scale and position — adjust as needed
      this.model.scale.set(0.5, 0.5, 0.5);
      this.model.position.set(0, 0.1, 0);
      this.model.rotation.set(0, 0, 0);

      // Add to anchor group
      this.root.add(this.model);

      // If model has animations, set up mixer
      if (gltf.animations && gltf.animations.length > 0) {
        this.mixer = new THREE.AnimationMixer(this.model);
        const action = this.mixer.clipAction(gltf.animations[0]);
        action.play();
      }

      console.log('BLINK 3D model loaded');

    } catch (err) {
      console.error('Failed to load BLINK model:', err);
      // Fallback: cyan sphere
      const geo = new THREE.SphereGeometry(0.15, 32, 32);
      const mat = new THREE.MeshPhysicalMaterial({
        color: 0x00d9ff,
        emissive: 0x00d9ff,
        emissiveIntensity: 0.4,
        metalness: 0.3,
        roughness: 0.3,
        clearcoat: 0.5
      });
      const fallback = new THREE.Mesh(geo, mat);
      fallback.position.set(0, 0.15, 0);
      this.root.add(fallback);
      this.model = fallback;
    }

    // Register update
    this.engine.onUpdate((clock) => this.update(clock));
  }

  update(clock) {
    if (!this.model) return;

    // Idle floating animation
    this.model.position.y = 0.1 + Math.sin(clock.time * 1.5) * 0.03;

    // Gentle rotation
    this.model.rotation.y += 0.005;

    // Update animation mixer if exists
    if (this.mixer) {
      this.mixer.update(clock.delta);
    }
  }

  destroy() {
    if (this.model) {
      this.root.remove(this.model);
    }
  }
}
