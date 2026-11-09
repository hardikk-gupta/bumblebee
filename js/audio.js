// All sound is synthesised with Web Audio: no audio files, nothing to license.
// Browsers only allow audio after a user gesture, so enable() is called from
// the sound button.

export class Sound {
  constructor() { this.on = false; this.ctx = null; }

  async enable() {
    if (!this.ctx) this.build();
    await this.ctx.resume();
    this.on = true;
    this.master.gain.setTargetAtTime(0.8, this.ctx.currentTime, 0.2);
  }

  disable() {
    if (!this.ctx) return;
    this.on = false;
    this.master.gain.setTargetAtTime(0, this.ctx.currentTime, 0.1);
  }

  build() {
    const ctx = this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14; comp.ratio.value = 4;
    this.master = ctx.createGain(); this.master.gain.value = 0;
    this.master.connect(comp).connect(ctx.destination);

    // Noise buffer shared by wind, clanks and static.
    const len = ctx.sampleRate * 2;
    this.noise = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = this.noise.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;

    // Engine: two detuned saws and a sub, through a lowpass that opens with speed.
    this.engineFilter = ctx.createBiquadFilter();
    this.engineFilter.type = 'lowpass'; this.engineFilter.Q.value = 6; this.engineFilter.frequency.value = 300;
    this.engineGain = ctx.createGain(); this.engineGain.gain.value = 0;
    this.engineFilter.connect(this.engineGain).connect(this.master);
    this.oscs = [['sawtooth', 0], ['sawtooth', 9], ['sine', -1200]].map(([type, detune]) => {
      const o = ctx.createOscillator(); o.type = type; o.detune.value = detune; o.frequency.value = 40;
      o.connect(this.engineFilter); o.start(); return o;
    });
    // A slow wobble on the filter gives the idle some lope.
    const lfo = ctx.createOscillator(); lfo.frequency.value = 7;
    const lfoAmt = ctx.createGain(); lfoAmt.gain.value = 60;
    lfo.connect(lfoAmt).connect(this.engineFilter.frequency); lfo.start();

    // Wind: looping noise through a bandpass.
    const wind = ctx.createBufferSource(); wind.buffer = this.noise; wind.loop = true;
    this.windFilter = ctx.createBiquadFilter(); this.windFilter.type = 'bandpass'; this.windFilter.Q.value = 0.7;
    this.windGain = ctx.createGain(); this.windGain.gain.value = 0;
    wind.connect(this.windFilter).connect(this.windGain).connect(this.master); wind.start();
  }

  /** speed 0..1, car 0..1 (1 = car engine, 0 = robot idle hum) */
  update(speed, car) {
    if (!this.ctx || !this.on) return;
    const t = this.ctx.currentTime;
    const duck = t < (this.duckUntil || 0) ? 0.35 : 1;
    const f = 32 + speed * 120 * (0.4 + car * 0.6);
    this.oscs[0].frequency.setTargetAtTime(f, t, 0.08);
    this.oscs[1].frequency.setTargetAtTime(f, t, 0.08);
    this.oscs[2].frequency.setTargetAtTime(f, t, 0.08);
    this.engineFilter.frequency.setTargetAtTime(220 + speed * 2400 * (0.3 + car * 0.7), t, 0.1);
    this.engineGain.gain.setTargetAtTime((0.05 + speed * 0.22) * (0.35 + car * 0.65) * duck, t, 0.1);
    this.windFilter.frequency.setTargetAtTime(500 + speed * 2500, t, 0.1);
    this.windGain.gain.setTargetAtTime(speed * 0.2 * duck, t, 0.1);
  }

  noiseHit(when, { freq, q = 8, dur = 0.12, gain = 0.5, type = 'bandpass' }) {
    const ctx = this.ctx;
    const src = ctx.createBufferSource(); src.buffer = this.noise;
    const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, when);
    g.gain.exponentialRampToValueAtTime(gain, when + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
    src.connect(f).connect(g).connect(this.master);
    src.start(when, Math.random()); src.stop(when + dur + 0.05);
    return f;
  }

  tone(when, { type = 'sine', from, to, dur, gain = 0.3, filter = 0 }) {
    const ctx = this.ctx;
    const o = ctx.createOscillator(); o.type = type;
    o.frequency.setValueAtTime(from, when);
    o.frequency.exponentialRampToValueAtTime(to, when + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, when);
    g.gain.exponentialRampToValueAtTime(gain, when + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
    let node = o;
    if (filter) { const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = filter; node = o.connect(f); }
    node.connect(g).connect(this.master);
    o.start(when); o.stop(when + dur + 0.05);
  }

  // The car breaks open: a whoosh, servo whines, a run of metal clanks.
  split() {
    if (!this.on) return;
    const t = this.ctx.currentTime + 0.02;
    const whoosh = this.noiseHit(t, { freq: 400, q: 1.2, dur: 1.1, gain: 0.35 });
    whoosh.frequency.exponentialRampToValueAtTime(3200, t + 0.9);
    [0, 0.25, 0.55].forEach((o, k) =>
      this.tone(t + o, { type: 'square', from: 260 + k * 90, to: 1100 + k * 200, dur: 0.35, gain: 0.07, filter: 2200 }));
    for (let k = 0; k < 14; k++) {
      const when = t + 0.05 + k * 0.065 + Math.random() * 0.03;
      this.noiseHit(when, { freq: 1800 + Math.random() * 4200, q: 18 + Math.random() * 20, dur: 0.09 + Math.random() * 0.12, gain: 0.5 });
      this.tone(when, { type: 'triangle', from: 900 + Math.random() * 1500, to: 600, dur: 0.12, gain: 0.05 });
    }
  }

  // The robot reaches full height: one heavy landing.
  land() {
    if (!this.on) return;
    const t = this.ctx.currentTime + 0.02;
    this.tone(t, { type: 'sine', from: 90, to: 28, dur: 0.8, gain: 0.95 });
    this.noiseHit(t, { freq: 180, q: 0.8, dur: 0.55, gain: 0.6, type: 'lowpass' });
    this.tone(t + 0.05, { type: 'square', from: 140, to: 60, dur: 0.25, gain: 0.08, filter: 600 });
  }

  // Tuning into a station: a whistle sweeping across the band, crackly
  // static through a narrow "AM speaker" filter, then a click as it locks.
  // The engine and wind duck underneath so it is not masked.
  radio() {
    if (!this.on || !this.ctx) return;
    const ctx = this.ctx;
    if (ctx.state !== 'running') ctx.resume();
    const t = ctx.currentTime + 0.01;
    const dur = 0.42;

    // Small speaker: everything goes through a band-pass and a little drive.
    const speaker = ctx.createBiquadFilter();
    speaker.type = 'bandpass'; speaker.frequency.value = 1700; speaker.Q.value = 0.9;
    const out = ctx.createGain(); out.gain.value = 1;
    speaker.connect(out).connect(this.master);

    // Static, chopped into crackles.
    const src = ctx.createBufferSource(); src.buffer = this.noise;
    const sg = ctx.createGain();
    sg.gain.setValueAtTime(0.0001, t);
    sg.gain.exponentialRampToValueAtTime(0.55, t + 0.015);
    for (let k = 0; k < 9; k++) sg.gain.setValueAtTime(0.15 + Math.random() * 0.5, t + 0.03 + k * 0.035);
    sg.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(sg).connect(speaker);
    src.start(t, Math.random()); src.stop(t + dur + 0.05);

    // Heterodyne whistle sliding down as the needle finds the station.
    const o = ctx.createOscillator(); o.type = 'sine';
    const from = 2600 + Math.random() * 1400;
    o.frequency.setValueAtTime(from, t);
    o.frequency.exponentialRampToValueAtTime(from * 0.18, t + dur * 0.8);
    const og = ctx.createGain();
    og.gain.setValueAtTime(0.0001, t);
    og.gain.exponentialRampToValueAtTime(0.16, t + 0.03);
    og.gain.exponentialRampToValueAtTime(0.0001, t + dur * 0.85);
    o.connect(og).connect(speaker);
    o.start(t); o.stop(t + dur);

    // Lock-on click.
    this.tone(t + dur * 0.8, { type: 'square', from: 1200, to: 900, dur: 0.04, gain: 0.08, filter: 3000 });

    // update() ducks the engine and wind until then.
    this.duckUntil = t + dur + 0.1;
  }
}
