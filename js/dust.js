// Three.js dust layer over the video: fine sand particles plus a few large
// out-of-focus motes. Scroll speed pushes them toward the camera, the mouse
// tilts the camera, and the transformation fires a radial burst.
import * as THREE from '../vendor/three.module.min.js';

function spriteTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.35, 'rgba(255,255,255,0.55)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad; g.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

const FAR = -70, NEAR = 2;

class Layer {
  constructor(n, size, opacity, color, spread) {
    this.n = n; this.spread = spread;
    this.pos = new Float32Array(n * 3);
    this.vel = new Float32Array(n * 3); // burst velocity
    this.seed = new Float32Array(n);
    for (let i = 0; i < n; i++) this.respawn(i, true);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    this.material = new THREE.PointsMaterial({
      size, map: spriteTexture(), color, transparent: true, opacity,
      depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true,
    });
    this.baseOpacity = opacity;
    this.points = new THREE.Points(geo, this.material);
  }
  respawn(i, anywhere = false) {
    const [sx, sy] = this.spread;
    this.pos[i * 3] = (Math.random() - 0.5) * sx;
    this.pos[i * 3 + 1] = (Math.random() - 0.35) * sy;
    this.pos[i * 3 + 2] = anywhere ? FAR + Math.random() * (NEAR - FAR) : FAR + Math.random() * 10;
    this.vel[i * 3] = this.vel[i * 3 + 1] = this.vel[i * 3 + 2] = 0;
    this.seed[i] = Math.random() * 100;
  }
  update(dt, forward, time) {
    const p = this.pos, v = this.vel;
    for (let i = 0; i < this.n; i++) {
      const k = i * 3, s = this.seed[i];
      p[k] += (Math.sin(time * 0.4 + s) * 0.15 + v[k]) * dt;
      p[k + 1] += (Math.cos(time * 0.3 + s) * 0.08 + v[k + 1]) * dt;
      p[k + 2] += (forward * (0.6 + (s % 1) * 0.8) + v[k + 2]) * dt;
      const damp = Math.exp(-2.2 * dt);
      v[k] *= damp; v[k + 1] *= damp; v[k + 2] *= damp;
      if (p[k + 2] > NEAR || Math.abs(p[k]) > this.spread[0]) this.respawn(i);
    }
    this.points.geometry.attributes.position.needsUpdate = true;
  }
  burst(strength) {
    const p = this.pos, v = this.vel;
    for (let i = 0; i < this.n; i++) {
      const k = i * 3;
      const dx = p[k], dy = p[k + 1] + 1;
      const d = Math.hypot(dx, dy) + 0.5;
      const f = strength * (0.6 + Math.random() * 0.8);
      v[k] += (dx / d) * f; v[k + 1] += (dy / d) * f * 0.7 + f * 0.25; v[k + 2] += f * 0.8;
    }
  }
}

export class Dust {
  constructor(canvas) {
    this.renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: false, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(60, 1, 0.1, 200);
    const small = window.innerWidth < 760;
    this.fine = new Layer(small ? 700 : 1600, 0.09, 0.75, 0xffd58a, [40, 22]);
    this.motes = new Layer(small ? 25 : 55, 0.9, 0.16, 0xffe2a8, [30, 16]);
    this.scene.add(this.fine.points, this.motes.points);
    this.tilt = { x: 0, y: 0 };
    this.time = 0;
    this.resize();
  }
  resize() {
    const c = this.renderer.domElement;
    this.renderer.setSize(c.clientWidth, c.clientHeight, false);
    this.camera.aspect = c.clientWidth / Math.max(1, c.clientHeight);
    this.camera.updateProjectionMatrix();
  }
  burst() { this.fine.burst(14); this.motes.burst(6); }
  /** speed 0..1, mouse -1..1, density 0..1 (overall visibility by stage) */
  update(dt, { speed, mouse, density }) {
    this.time += dt;
    const forward = 1.2 + speed * 55;
    this.fine.update(dt, forward, this.time);
    this.motes.update(dt, forward * 0.6, this.time);
    this.fine.material.opacity = this.fine.baseOpacity * density;
    this.motes.material.opacity = this.motes.baseOpacity * density;
    this.tilt.x += (mouse.y * 0.06 - this.tilt.x) * Math.min(1, dt * 3);
    this.tilt.y += (-mouse.x * 0.1 - this.tilt.y) * Math.min(1, dt * 3);
    this.camera.rotation.set(this.tilt.x, this.tilt.y, 0);
    this.renderer.render(this.scene, this.camera);
  }
}
