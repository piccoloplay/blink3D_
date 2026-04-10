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
    this.active = true;

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
      this.model.scale.set(0.5, 0.5, 0.5);
      this.model.position.set(0, 0.1, 0);
      this.model.rotation.set(0, 0, 0);
      this.root.add(this.model);

      // Stop all animations embedded in the GLB
      if (gltf.animations && gltf.animations.length > 0) {
        this.mixer = new THREE.AnimationMixer(this.model);
        gltf.animations.forEach(clip => {
          const action = this.mixer.clipAction(clip);
          action.play();
          action.paused = true;  // freeze at frame 0
        });
      }
      console.log('BLINK 3D model loaded');

    } catch (err) {
      console.error('Failed to load BLINK model:', err);
      const geo = new THREE.SphereGeometry(0.15, 32, 32);
      const mat = new THREE.MeshPhysicalMaterial({
        color: 0x00d9ff, emissive: 0x00d9ff,
        emissiveIntensity: 0.4, metalness: 0.3, roughness: 0.3, clearcoat: 0.5
      });
      const fallback = new THREE.Mesh(geo, mat);
      fallback.position.set(0, 0.15, 0);
      this.root.add(fallback);
      this.model = fallback;
    }

    this.engine.onUpdate((clock) => this.update(clock));
  }

  update(clock) {
    if (!this.model || !this.active) return;
    this.model.position.y = 0.1 + Math.sin(clock.time * 1) * 0.008;
    this.model.rotation.set(0, 0, 0);
  }

  stop() {
    this.active = false;
  }

  destroy() {
    this.active = false;
    if (this.model) {
      this.root.remove(this.model);
    }
  }
}
