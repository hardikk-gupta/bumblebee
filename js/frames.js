// Loads the frame sequence and paints it to a canvas with:
//  - crossfade between neighbouring frames (smooth when the scroll is slowed)
//  - zoom blur driven by scroll speed
//  - a night overlay with a soft, cursor-aimed spotlight cut out of it

const pad = (n) => String(n).padStart(4, '0');

export class FrameSequence {
  constructor(canvas, { dir, count }) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false });
    this.dir = dir;
    this.count = count;
    this.images = new Array(count);
    this.loaded = new Uint8Array(count);
    this.loadedCount = 0;
    this.mask = document.createElement('canvas');
    this.maskCtx = this.mask.getContext('2d');
    this.resize();
  }

  // Coarse-to-fine order: every 16th frame first, then 8th, 4th, 2nd, rest.
  // Scrubbing works almost immediately and sharpens as frames arrive.
  loadOrder() {
    const seen = new Set(); const order = [];
    for (const step of [16, 8, 4, 2, 1]) {
      for (let i = 0; i < this.count; i += step) if (!seen.has(i)) { seen.add(i); order.push(i); }
    }
    if (!seen.has(this.count - 1)) order.push(this.count - 1);
    return order;
  }

  load(onProgress, concurrency = 6) {
    const queue = this.loadOrder();
    return new Promise((resolve) => {
      let active = 0;
      const next = () => {
        if (!queue.length) { if (!active) resolve(); return; }
        const i = queue.shift(); active++;
        const img = new Image();
        img.decoding = 'async';
        img.src = `${this.dir}/f_${pad(i + 1)}.webp`;
        const done = () => {
          active--;
          if (img.naturalWidth) { this.images[i] = img; this.loaded[i] = 1; }
          this.loadedCount++;
          onProgress?.(this.loadedCount / this.count);
          next();
        };
        (img.decode ? img.decode() : Promise.resolve()).then(done, done);
      };
      for (let k = 0; k < concurrency; k++) next();
    });
  }

  nearest(i) {
    if (this.loaded[i]) return this.images[i];
    for (let d = 1; d < this.count; d++) {
      if (i - d >= 0 && this.loaded[i - d]) return this.images[i - d];
      if (i + d < this.count && this.loaded[i + d]) return this.images[i + d];
    }
    return null;
  }

  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.round(this.canvas.clientWidth * dpr);
    const h = Math.round(this.canvas.clientHeight * dpr);
    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w; this.canvas.height = h;
      this.mask.width = w; this.mask.height = h;
    }
  }

  // Cover-fit rect for an image, with optional extra scale and shake offset.
  rect(img, scale = 1, ox = 0, oy = 0, fx = 0.5, fy = 0.5) {
    const cw = this.canvas.width, ch = this.canvas.height;
    const s = Math.max(cw / img.naturalWidth, ch / img.naturalHeight) * scale;
    const w = img.naturalWidth * s, h = img.naturalHeight * s;
    return [(cw - w) * fx + ox, (ch - h) * fy + oy, w, h];
  }

  /**
   * @param {number} f       fractional frame index
   * @param {object} o
   *   blur  0..1 zoom-blur strength (scroll speed)
   *   night 0..1 darkness of the night overlay
   *   light {x, y} headlight centre in CSS pixels
   *   shake {x, y} offset in CSS pixels
   */
  draw(f, { blur = 0, night = 0, light = null, shake = { x: 0, y: 0 } } = {}) {
    const ctx = this.ctx;
    const cw = this.canvas.width, ch = this.canvas.height;
    const dpr = cw / this.canvas.clientWidth || 1;
    const i = Math.max(0, Math.min(this.count - 1, Math.floor(f)));
    const t = f - i;
    const a = this.nearest(i);
    if (!a) return;
    const b = t > 0.02 && i + 1 < this.count && this.loaded[i + 1] ? this.images[i + 1] : null;

    // Slight overscan so shake never reveals an edge.
    const over = 1.03 + blur * 0.02;
    const sx = shake.x * dpr, sy = shake.y * dpr;

    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    ctx.drawImage(a, ...this.rect(a, over, sx, sy));
    if (b) { ctx.globalAlpha = t; ctx.drawImage(b, ...this.rect(b, over, sx, sy)); }

    // Zoom blur: stacked, slightly enlarged copies centred on the vanishing point.
    if (blur > 0.03) {
      const src = b && t > 0.5 ? b : a;
      const steps = 5;
      for (let k = 1; k <= steps; k++) {
        ctx.globalAlpha = 0.22 * blur * (1 - k / (steps + 2));
        ctx.drawImage(src, ...this.rect(src, over * (1 + k * 0.018 * blur), sx, sy, 0.5, 0.46));
      }
    }
    ctx.globalAlpha = 1;

    if (night > 0.01) this.drawNight(night, light, dpr);
  }

  drawNight(night, light, dpr) {
    const m = this.maskCtx, cw = this.mask.width, ch = this.mask.height;
    m.globalCompositeOperation = 'source-over';
    m.clearRect(0, 0, cw, ch);
    m.fillStyle = `rgba(3, 5, 12, ${night})`;
    m.fillRect(0, 0, cw, ch);

    if (light) {
      const x = light.x * dpr, y = light.y * dpr;
      const r = Math.min(cw, ch) * 0.34;
      m.globalCompositeOperation = 'destination-out';
      m.save();
      m.translate(x, y); m.scale(1.7, 1);
      const g = m.createRadialGradient(0, 0, 0, 0, 0, r);
      g.addColorStop(0, 'rgba(0,0,0,1)');
      g.addColorStop(0.45, 'rgba(0,0,0,0.85)');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      m.fillStyle = g;
      m.beginPath(); m.arc(0, 0, r, 0, Math.PI * 2); m.fill();
      m.restore();
    }

    this.ctx.drawImage(this.mask, 0, 0);
  }
}
